import process from "node:process";

import {
  EXTERNAL_COMMAND_STATES,
  ExternalCommandOutputError,
  externalCommandOutput,
  externalCommandState,
  runExternalCommand,
} from "./external-command.mjs";
import {
  canonicalGithubRepositoryIdentity,
  githubRepositoryIdentityFromRemote,
} from "./repositories.mjs";

const GITHUB_HOST = "github.com";
const INCREMENTAL_OVERLAP_MS = 5 * 60 * 1_000;
const GITHUB_API_TIMEOUT_MS = 2 * 60 * 1_000;
const GITHUB_API_MAX_BUFFER = 64 * 1024 * 1024;
const RATE_LIMIT_RESERVE_RATIO = 0.2;
const INITIAL_FULL_SYNC_REQUEST_ESTIMATE = 100;

export class GithubRateBudgetError extends Error {
  constructor(rateLimit) {
    super(
      `GitHub REST API budget cannot cover the estimated ${rateLimit.requiredRequests} sync requests plus the OpenGlance reserve (${rateLimit.remaining}/${rateLimit.limit} remaining). Try again after ${rateLimit.resetAt}.`,
    );
    this.name = "GithubRateBudgetError";
    this.code = "GITHUB_RATE_BUDGET_LOW";
    this.rateLimit = rateLimit;
  }
}

export async function syncGithubIssues({
  store,
  cwd = process.cwd(),
  repository,
  account,
  full = false,
  checkRateLimit = true,
  commandRunner = runExternalCommand,
  now = () => new Date(),
} = {}) {
  if (!store) {
    throw new Error("A GitHub Issues store is required for sync.");
  }

  const resolvedRepository = await resolveGithubRepository({
    repository,
    cwd,
    commandRunner,
  });
  const resolvedAccount = account || await resolveGithubAccount({ commandRunner, cwd });
  const startedAt = toIsoTimestamp(now(), "sync start");
  store.ensureRepository({
    host: GITHUB_HOST,
    account: resolvedAccount,
    repository: resolvedRepository,
  });
  const previous = store.repositoryStatus({
    host: GITHUB_HOST,
    account: resolvedAccount,
    repository: resolvedRepository,
  });
  const isFullSync = Boolean(full) || !previous?.hasSnapshot;
  const since = isFullSync
    ? null
    : overlapTimestamp(previous.syncCursor, INCREMENTAL_OVERLAP_MS);
  const estimatedApiRequests = estimatedGithubIssueSyncRequests(previous, {
    full: isFullSync,
  });
  const lease = store.acquireSyncLease({
    host: GITHUB_HOST,
    account: resolvedAccount,
    repository: resolvedRepository,
    acquiredAt: startedAt,
  });
  if (!lease) {
    return {
      host: GITHUB_HOST,
      account: resolvedAccount,
      repository: resolvedRepository,
      skipped: true,
      reason: "sync_in_progress",
      full: isFullSync,
      since,
      status: previous,
      lastSyncedAt: previous?.lastSyncedAt ?? null,
    };
  }

  store.recordSyncAttempt({
    host: GITHUB_HOST,
    account: resolvedAccount,
    repository: resolvedRepository,
    attemptedAt: startedAt,
  });
  try {
    const rateLimit = checkRateLimit
      ? await readGithubRateLimit({
        cwd,
        commandRunner,
        requiredRequests: estimatedApiRequests,
      })
      : null;
    if (rateLimit && !rateLimit.allowed) {
      throw new GithubRateBudgetError(rateLimit);
    }
    const fetched = await fetchGithubIssues({
      repository: resolvedRepository,
      since,
      cwd,
      commandRunner,
    });
    const fetchedComments = await fetchGithubIssueComments({
      repository: resolvedRepository,
      since,
      cwd,
      commandRunner,
    });
    const stored = store.syncRepository({
      host: GITHUB_HOST,
      account: resolvedAccount,
      repository: resolvedRepository,
      issues: fetched.issues,
      comments: fetchedComments.comments,
      syncedAt: startedAt,
      syncCursor: startedAt,
      full: isFullSync,
      apiPages: fetched.apiPages,
      commentApiPages: fetchedComments.apiPages,
    });

    return {
      host: GITHUB_HOST,
      account: resolvedAccount,
      repository: resolvedRepository,
      skipped: false,
      full: isFullSync,
      since,
      fetched: fetched.issues.length,
      fetchedComments: fetchedComments.comments.length,
      apiPages: fetched.apiPages,
      commentApiPages: fetchedComments.apiPages,
      apiRequests: fetched.apiPages + fetchedComments.apiPages,
      rateLimitBefore: rateLimit,
      ...stored,
      lastSyncedAt: startedAt,
    };
  } catch (error) {
    if (error?.code === "GITHUB_REPOSITORY_INACCESSIBLE") {
      store.purgeRepository({
        host: GITHUB_HOST,
        account: resolvedAccount,
        repository: resolvedRepository,
      });
    }
    store.recordSyncFailure({
      host: GITHUB_HOST,
      account: resolvedAccount,
      repository: resolvedRepository,
      failedAt: startedAt,
      code: syncErrorCode(error),
      message: error instanceof Error ? error.message : "GitHub Issues sync failed.",
    });
    throw error;
  } finally {
    store.releaseSyncLease({
      host: GITHUB_HOST,
      account: resolvedAccount,
      repository: resolvedRepository,
      token: lease.token,
    });
  }
}

export async function resolveGithubRepository({
  repository,
  cwd = process.cwd(),
  commandRunner = runExternalCommand,
} = {}) {
  if (repository) {
    return normalizeGithubRepository(repository);
  }

  let result;
  try {
    result = await commandRunner("git", ["remote", "get-url", "origin"], { cwd });
  } catch (error) {
    throw githubRepositoryContextError(error);
  }
  const identity = githubRepositoryIdentityFromRemote(result.stdout);
  if (!identity) {
    throw new Error(
      "The current repository origin is not a github.com repository. Pass --repo owner/name.",
    );
  }
  return normalizeGithubRepository(identity);
}

export async function resolveGithubAccount({
  commandRunner = runExternalCommand,
  cwd = process.cwd(),
} = {}) {
  let result;
  try {
    result = await commandRunner(
      "gh",
      ["auth", "status", "--active", "--hostname", GITHUB_HOST, "--json", "hosts"],
      githubCommandOptions(cwd, { timeout: 15_000 }),
    );
  } catch (error) {
    if (externalCommandState(error) === EXTERNAL_COMMAND_STATES.UNAVAILABLE) {
      throw new Error(
        "GitHub Issues sync requires GitHub CLI (`gh`). Install it and run `gh auth login`.",
        { cause: error },
      );
    }
    throw new Error(
      "GitHub CLI is not authenticated for github.com. Run `gh auth login` and try again.",
      { cause: error },
    );
  }

  const payload = parseJsonOutput("gh", ["auth", "status"], result.stdout);
  const accounts = Array.isArray(payload?.hosts?.[GITHUB_HOST])
    ? payload.hosts[GITHUB_HOST]
    : [];
  const active = accounts.find((candidate) => (
    candidate?.active === true
      && candidate?.state === "success"
      && String(candidate?.login ?? "").trim()
  ));
  if (!active) {
    throw new Error(
      "GitHub CLI has no active authenticated account for github.com. Run `gh auth login`.",
    );
  }
  return String(active.login).trim().toLowerCase();
}

export async function fetchGithubIssues({
  repository,
  since = null,
  cwd = process.cwd(),
  commandRunner = runExternalCommand,
} = {}) {
  const normalizedRepository = normalizeGithubRepository(repository);
  const args = [
    "api",
    "--hostname",
    GITHUB_HOST,
    "--method",
    "GET",
    "--paginate",
    "--slurp",
    `repos/${normalizedRepository}/issues`,
    "-f",
    "state=all",
    "-f",
    "sort=updated",
    "-f",
    "direction=asc",
    "-F",
    "per_page=100",
  ];
  if (since) {
    args.push("-f", `since=${toIsoTimestamp(since, "incremental cursor")}`);
  }

  let result;
  try {
    result = await commandRunner("gh", args, githubCommandOptions(cwd));
  } catch (error) {
    throw githubApiError(error, normalizedRepository);
  }
  const payload = parseJsonOutput("gh", args, result.stdout);
  const pages = normalizePages(payload);
  const issues = pages
    .flatMap((page) => page)
    .filter((issue) => issue && typeof issue === "object" && !issue.pull_request)
    .map(normalizeGithubApiIssue);
  return { issues, apiPages: pages.length };
}

export async function fetchGithubIssueComments({
  repository,
  since = null,
  cwd = process.cwd(),
  commandRunner = runExternalCommand,
} = {}) {
  const normalizedRepository = normalizeGithubRepository(repository);
  const args = [
    "api",
    "--hostname",
    GITHUB_HOST,
    "--method",
    "GET",
    "--paginate",
    "--slurp",
    `repos/${normalizedRepository}/issues/comments`,
    "-f",
    "sort=updated",
    "-f",
    "direction=asc",
    "-F",
    "per_page=100",
  ];
  if (since) {
    args.push("-f", `since=${toIsoTimestamp(since, "incremental comment cursor")}`);
  }

  let result;
  try {
    result = await commandRunner("gh", args, githubCommandOptions(cwd));
  } catch (error) {
    throw githubApiError(error, normalizedRepository);
  }
  const payload = parseJsonOutput("gh", args, result.stdout);
  const pages = normalizePages(payload);
  const comments = pages
    .flatMap((page) => page)
    .filter((comment) => comment && typeof comment === "object")
    .map(normalizeGithubApiComment);
  return { comments, apiPages: pages.length };
}

export async function readGithubRateLimit({
  cwd = process.cwd(),
  commandRunner = runExternalCommand,
  reserveRatio = RATE_LIMIT_RESERVE_RATIO,
  requiredRequests = 0,
} = {}) {
  const args = ["api", "--hostname", GITHUB_HOST, "--method", "GET", "rate_limit"];
  let result;
  try {
    result = await commandRunner("gh", args, githubCommandOptions(cwd, { timeout: 30_000 }));
  } catch (error) {
    throw githubApiError(error, "rate-limit status", { repositoryRead: false });
  }
  const payload = parseJsonOutput("gh", args, result.stdout);
  const core = payload?.resources?.core;
  const limit = Number(core?.limit);
  const remaining = Number(core?.remaining);
  const used = Number(core?.used);
  const reset = Number(core?.reset);
  if (![limit, remaining, used, reset].every(Number.isFinite) || limit <= 0) {
    throw new ExternalCommandOutputError("gh", args, "invalid REST rate-limit data");
  }
  const normalizedReserveRatio = Math.min(0.5, Math.max(0, Number(reserveRatio) || 0));
  const reserve = Math.ceil(limit * normalizedReserveRatio);
  const normalizedRequiredRequests = Math.max(0, Math.ceil(Number(requiredRequests) || 0));
  return {
    limit,
    used,
    remaining,
    reserve,
    requiredRequests: normalizedRequiredRequests,
    resetAt: new Date(reset * 1_000).toISOString(),
    allowed: remaining >= reserve + normalizedRequiredRequests,
  };
}

export function estimatedGithubIssueSyncRequests(status, { full = false } = {}) {
  if (full) {
    const previousFullPages = Number(status?.lastFullApiPages ?? 0)
      + Number(status?.lastFullCommentApiPages ?? 0);
    return Math.max(2, previousFullPages || INITIAL_FULL_SYNC_REQUEST_ESTIMATE);
  }
  return Math.max(
    2,
    Number(status?.lastApiPages ?? 0) + Number(status?.lastCommentApiPages ?? 0),
  );
}

export function normalizeGithubRepository(value) {
  const repository = canonicalGithubRepositoryIdentity(value);
  if (!/^[^/\s]+\/[^/\s]+$/u.test(repository)) {
    throw new Error(`Invalid GitHub repository: ${value}. Use owner/name.`);
  }
  return repository;
}

function normalizeGithubApiIssue(issue) {
  const number = Number(issue.number);
  const title = String(issue.title ?? "").trim();
  const url = String(issue.html_url ?? "").trim();
  const createdAt = toIsoTimestamp(issue.created_at, `Issue #${number} created_at`);
  const updatedAt = toIsoTimestamp(issue.updated_at, `Issue #${number} updated_at`);
  if (!Number.isInteger(number) || number <= 0 || !title || !url) {
    throw new Error("GitHub returned an Issue with missing required fields.");
  }
  return {
    number,
    githubId: String(issue.id ?? ""),
    nodeId: String(issue.node_id ?? ""),
    url,
    state: issue.state === "closed" ? "closed" : "open",
    stateReason: optionalString(issue.state_reason),
    title,
    body: String(issue.body ?? ""),
    author: String(issue.user?.login ?? ""),
    createdAt,
    updatedAt,
    closedAt: issue.closed_at
      ? toIsoTimestamp(issue.closed_at, `Issue #${number} closed_at`)
      : null,
    labels: Array.isArray(issue.labels)
      ? issue.labels.map((label) => (
        typeof label === "string" ? label : String(label?.name ?? "")
      )).filter(Boolean)
      : [],
    assignees: Array.isArray(issue.assignees)
      ? issue.assignees.map((assignee) => String(assignee?.login ?? "")).filter(Boolean)
      : [],
    milestone: optionalString(issue.milestone?.title),
    commentsCount: Math.max(0, Number(issue.comments) || 0),
    locked: Boolean(issue.locked),
  };
}

function normalizeGithubApiComment(comment) {
  const githubId = String(comment.id ?? "").trim();
  const issueNumberMatch = String(comment.issue_url ?? "").match(/\/issues\/(\d+)\/?$/u);
  const issueNumber = Number(issueNumberMatch?.[1]);
  const url = String(comment.html_url ?? "").trim();
  if (!githubId || !Number.isInteger(issueNumber) || issueNumber <= 0 || !url) {
    throw new Error("GitHub returned an Issue comment with missing required fields.");
  }
  return {
    githubId,
    nodeId: String(comment.node_id ?? ""),
    issueNumber,
    url,
    author: String(comment.user?.login ?? ""),
    body: String(comment.body ?? ""),
    createdAt: toIsoTimestamp(comment.created_at, `Issue comment ${githubId} created_at`),
    updatedAt: toIsoTimestamp(comment.updated_at, `Issue comment ${githubId} updated_at`),
  };
}

function normalizePages(payload) {
  if (!Array.isArray(payload)) {
    throw new Error("GitHub returned an invalid paginated response.");
  }
  if (payload.length === 0) {
    return [[]];
  }
  if (payload.every(Array.isArray)) {
    return payload;
  }
  if (payload.every((item) => item && typeof item === "object" && !Array.isArray(item))) {
    return [payload];
  }
  throw new Error("GitHub returned an invalid paginated response.");
}

function overlapTimestamp(value, overlapMs) {
  const timestamp = Date.parse(String(value ?? ""));
  if (Number.isNaN(timestamp)) {
    throw new Error("The local GitHub Issues sync cursor is invalid. Run sync with --full.");
  }
  return new Date(timestamp - overlapMs).toISOString();
}

function parseJsonOutput(command, args, stdout) {
  try {
    return JSON.parse(String(stdout ?? ""));
  } catch (error) {
    throw new ExternalCommandOutputError(command, args, "invalid JSON", { cause: error });
  }
}

function toIsoTimestamp(value, label) {
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(String(value ?? ""));
  if (Number.isNaN(timestamp)) {
    throw new Error(`Invalid ${label} timestamp.`);
  }
  return new Date(timestamp).toISOString();
}

function optionalString(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function githubCommandOptions(cwd, overrides = {}) {
  return {
    cwd,
    env: {
      ...process.env,
      GH_PAGER: "cat",
      GH_PROMPT_DISABLED: "1",
    },
    maxBuffer: GITHUB_API_MAX_BUFFER,
    timeout: GITHUB_API_TIMEOUT_MS,
    ...overrides,
  };
}

function githubRepositoryContextError(error) {
  const state = externalCommandState(error);
  if (state === EXTERNAL_COMMAND_STATES.UNAVAILABLE) {
    return new Error("Git is required to detect the current GitHub repository.", { cause: error });
  }
  if (state === EXTERNAL_COMMAND_STATES.INVALID_CONTEXT) {
    return new Error(
      "The current directory is not a Git repository. Pass --repo owner/name.",
      { cause: error },
    );
  }
  return new Error(
    "Could not read the current repository origin. Pass --repo owner/name.",
    { cause: error },
  );
}

function githubApiError(error, repository, { repositoryRead = true } = {}) {
  const state = externalCommandState(error);
  const output = externalCommandOutput(error);
  if (/rate limit|secondary rate|abuse detection|too many requests/iu.test(output)) {
    const rateError = new Error(
      `GitHub rate limiting interrupted Issues sync for ${repository}. Existing local snapshots were kept unchanged.`,
      { cause: error },
    );
    rateError.code = "GITHUB_RATE_LIMITED";
    return rateError;
  }
  if (state === EXTERNAL_COMMAND_STATES.NETWORK_UNAVAILABLE) {
    const networkError = new Error(
      `GitHub is unreachable while syncing ${repository}.`,
      { cause: error },
    );
    networkError.code = "GITHUB_NETWORK_UNAVAILABLE";
    return networkError;
  }
  if (state === EXTERNAL_COMMAND_STATES.AUTHENTICATION_REQUIRED) {
    const authenticationError = new Error(
      `GitHub authentication is required to sync ${repository}. Run \`gh auth login\`.`,
      { cause: error },
    );
    authenticationError.code = "GITHUB_AUTHENTICATION_REQUIRED";
    return authenticationError;
  }
  if (
    repositoryRead
    && /(?:HTTP|status(?: code)?)\s*(?:403|404)|not found|resource not accessible|forbidden/iu.test(output)
  ) {
    const permissionError = new Error(
      `GitHub no longer confirms access to ${repository}; its local Issue snapshot was cleared.`,
      { cause: error },
    );
    permissionError.code = "GITHUB_REPOSITORY_INACCESSIBLE";
    return permissionError;
  }
  return new Error(`GitHub Issues sync failed for ${repository}.`, { cause: error });
}

function syncErrorCode(error) {
  const explicit = String(error?.code ?? "").trim();
  if (explicit) {
    return explicit.toLowerCase();
  }
  const state = externalCommandState(error?.cause ?? error);
  return state === EXTERNAL_COMMAND_STATES.FAILED ? "sync_failed" : state;
}
