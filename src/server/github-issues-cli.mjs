import process from "node:process";

import {
  GITHUB_ISSUES_INDEX_SCHEMA_VERSION,
  openGithubIssuesStore,
} from "./github-issues-store.mjs";
import {
  resolveGithubAccount,
  resolveGithubRepository,
} from "./github-issues-sync.mjs";
import {
  configuredGithubIssueRepositories,
  configuredGithubIssueRepositoryIds,
  loadGithubIssuesRepositoryConfig,
  requireConfiguredGithubIssueRepository,
  writeGithubIssuesRepositoryConfig,
} from "./github-issues-repositories.mjs";
import { runExternalCommand } from "./external-command.mjs";
import { syncGithubIssueRepositories } from "./github-issues-service.mjs";

const INDEX_SOURCE = "openglance-github-issues-local-index";

export async function runGithubIssuesCli(
  args,
  {
    cwd = process.cwd(),
    stdout = (line) => console.log(line),
    openStore = openGithubIssuesStore,
    commandRunner = runExternalCommand,
    now = () => new Date(),
    loadRepositoryConfig = loadGithubIssuesRepositoryConfig,
    writeRepositoryConfig = writeGithubIssuesRepositoryConfig,
  } = {},
) {
  const parsed = parseGithubIssuesArgs(args);
  if (parsed.command === "help") {
    stdout(githubIssuesUsage());
    return;
  }

  if (parsed.command === "configure") {
    const configured = await writeRepositoryConfig({ repositories: parsed.repositories });
    writeResult({
      json: parsed.json,
      stdout,
      payload: envelope("configure", {
        configuration: {
          source: configured.source,
          repositoryCount: configured.repositories.length,
          repositories: configured.repositories,
        },
      }, now),
      human: `Configured ${configured.repositories.length} GitHub Issues repositories: ${configured.repositories.join(", ")}.`,
    });
    return;
  }

  const repositoryConfig = await loadRepositoryConfig();
  const configuredRepositories = repositoryConfig.repositories;
  if (configuredRepositories.length === 0) {
    throw new Error(
      "No GitHub Issues repositories are configured. Run `openglance issues configure owner/repo ...`.",
    );
  }

  const store = await openStore();
  try {
    if (parsed.command === "sync") {
      const repositories = parsed.all
        ? configuredGithubIssueRepositoryIds(configuredRepositories)
        : [await resolveConfiguredRepository({
          configuredRepositories,
          repository: parsed.repository,
          cwd,
          commandRunner,
        })];
      const account = await resolveGithubAccount({ commandRunner, cwd });
      const result = await syncGithubIssueRepositories({
        store,
        cwd,
        account,
        repositories,
        full: parsed.full,
        isolateFailures: parsed.all,
        commandRunner,
        now,
      });
      writeResult({
        json: parsed.json,
        stdout,
        payload: envelope("sync", { sync: result }, now),
        human: syncHumanOutput(result),
      });
      return;
    }

    const account = parsed.account || store.defaultAccount();
    if (!account && parsed.command !== "status") {
      throw new Error(
        "No local GitHub Issues index exists yet. Run `openglance issues sync --all`.",
      );
    }

    if (parsed.command === "search") {
      const repository = parsed.all
        ? null
        : await resolveConfiguredRepository({
          configuredRepositories,
          repository: parsed.repository,
          cwd,
          commandRunner,
        });
      const statuses = configuredStatuses(store, {
        account,
        repository,
        configuredRepositories,
      });
      requireSnapshotCoverage(statuses, { account, repository });
      const issues = store.search({
        account,
        repository,
        repositories: repository
          ? undefined
          : configuredGithubIssueRepositoryIds(configuredRepositories),
        query: parsed.query,
        state: parsed.state,
        limit: parsed.limit,
      });
      writeResult({
        json: parsed.json,
        stdout,
        payload: envelope("search", {
          scope: scopePayload(account, repository, statuses),
          query: parsed.query,
          state: parsed.state,
          limit: parsed.limit,
          count: issues.length,
          issues,
        }, now),
        human: searchHumanOutput(issues, statuses),
      });
      return;
    }

    if (parsed.command === "show") {
      const reference = parseIssueReference(parsed.reference);
      const repository = reference.repository
        ? requireConfiguredGithubIssueRepository(
          configuredRepositories,
          reference.repository,
        ).repository
        : await resolveConfiguredRepository({
          configuredRepositories,
          repository: parsed.repository,
          cwd,
          commandRunner,
        });
      const statuses = configuredStatuses(store, {
        account,
        repository,
        configuredRepositories,
      });
      requireSnapshotCoverage(statuses, { account, repository });
      const issue = store.show({
        account,
        repository,
        number: reference.number,
      });
      if (!issue) {
        throw new Error(
          `${repository}#${reference.number} is not present in the local snapshot. GitHub remains authoritative; sync before treating it as absent.`,
        );
      }
      writeResult({
        json: parsed.json,
        stdout,
        payload: envelope("show", {
          scope: scopePayload(account, repository, statuses),
          issue,
        }, now),
        human: showHumanOutput(issue),
      });
      return;
    }

    const repository = parsed.all
      ? null
      : await resolveConfiguredRepository({
        configuredRepositories,
        repository: parsed.repository,
        cwd,
        commandRunner,
      });
    const statuses = configuredStatuses(store, {
      account,
      repository,
      configuredRepositories,
    });
    writeResult({
      json: parsed.json,
      stdout,
      payload: envelope("status", {
        scope: scopePayload(account, repository, statuses),
        repositories: statuses,
      }, now),
      human: statusHumanOutput(statuses),
    });
  } finally {
    store.close();
  }
}

export function githubIssuesUsage() {
  return `Usage: openglance issues <command> [options]

Commands:
  configure <repo...>     Replace the local repository allowlist
  sync                    Sync one configured repository from GitHub into the local index
  search [query]          Search the local index (defaults to open Issues)
  show <number|repo#num>  Show one Issue from the local index
  status                  Show indexed repositories and snapshot freshness

Common options:
  --repo name|owner/name  Select one configured repository
  --account login         Query a previously indexed GitHub account
  --json                  Emit one machine-readable JSON object

Sync options:
  --all                   Sync every configured repository sequentially
  --full                  Re-fetch all Issues and prune deleted/transferred entries

Search options:
  --state open|closed|all Filter by state (default: open)
  --limit 1..100          Limit results (default: 20)
  --all                   Search every configured repository for the account

Status options:
  --all                   Show every configured repository for the account

Examples:
  openglance issues configure example/docs example/app
  openglance issues sync --all
  openglance issues sync --repo docs --json
  openglance issues search "network retry" --json
  openglance issues search --all --state all --limit 50 --json
  openglance issues show 123 --json

GitHub is authoritative. Search, show, and status are offline snapshot reads;
only explicit sync calls GitHub. The local allowlist is the complete sync and
query boundary.`;
}

export function parseGithubIssuesArgs(args = []) {
  const values = [...args];
  const commandValue = String(values.shift() ?? "").trim().toLowerCase();
  if (!commandValue || ["help", "--help", "-h"].includes(commandValue)) {
    return { command: "help" };
  }
  if (!["configure", "sync", "search", "show", "status"].includes(commandValue)) {
    throw new Error(`Unknown GitHub Issues command: ${commandValue}.\n\n${githubIssuesUsage()}`);
  }

  const options = {
    command: commandValue,
    repository: "",
    account: "",
    json: false,
    full: false,
    all: false,
    state: "open",
    limit: 20,
    positionals: [],
  };
  let positionalOnly = false;
  for (let index = 0; index < values.length; index += 1) {
    const argument = values[index];
    if (positionalOnly) {
      options.positionals.push(argument);
      continue;
    }
    if (argument === "--") {
      positionalOnly = true;
      continue;
    }
    if (argument === "--json") {
      options.json = true;
      continue;
    }
    if (argument === "--full") {
      options.full = true;
      continue;
    }
    if (argument === "--all") {
      options.all = true;
      continue;
    }
    const inline = inlineOption(argument);
    const name = inline?.name ?? argument;
    if (["--repo", "--account", "--state", "--limit"].includes(name)) {
      const value = inline?.value ?? values[++index];
      if (value === undefined || value === "") {
        throw new Error(`${name} requires a value.`);
      }
      if (name === "--repo") {
        options.repository = String(value).trim();
      } else if (name === "--account") {
        options.account = normalizeAccount(value);
      } else if (name === "--state") {
        options.state = normalizeState(value);
      } else {
        options.limit = normalizeLimit(value);
      }
      continue;
    }
    if (argument.startsWith("-")) {
      throw new Error(`Unknown option: ${argument}`);
    }
    options.positionals.push(argument);
  }

  validateCommandOptions(options);
  if (options.command === "configure") {
    options.repositories = [...options.positionals];
  } else if (options.command === "search") {
    options.query = options.positionals.join(" ").trim();
  } else if (options.command === "show") {
    options.reference = options.positionals[0];
  }
  delete options.positionals;
  return options;
}

function validateCommandOptions(options) {
  if (options.repository && options.all) {
    throw new Error("Use either --repo or --all, not both.");
  }
  if (options.command === "configure") {
    if (
      options.repository
      || options.account
      || options.full
      || options.all
      || options.state !== "open"
      || options.limit !== 20
    ) {
      throw new Error("configure accepts repository arguments and --json only.");
    }
    if (options.positionals.length === 0) {
      throw new Error("configure requires at least one owner/repo argument.");
    }
    return;
  }
  if (options.command === "sync") {
    if (options.account || options.state !== "open" || options.limit !== 20) {
      throw new Error("sync supports --repo, --all, --full, and --json only.");
    }
    if (options.positionals.length > 0) {
      throw new Error("sync does not accept positional arguments.");
    }
    return;
  }
  if (options.full) {
    throw new Error("--full is only valid with sync.");
  }
  if (options.command === "search") {
    return;
  }
  if (options.state !== "open" || options.limit !== 20) {
    throw new Error("--state and --limit are only valid with search.");
  }
  if (options.command === "show") {
    if (options.all) {
      throw new Error("--all is not valid with show.");
    }
    if (options.positionals.length !== 1) {
      throw new Error("show requires exactly one Issue number or owner/repo#number.");
    }
    return;
  }
  if (options.positionals.length > 0) {
    throw new Error("status does not accept positional arguments.");
  }
}

function parseIssueReference(value) {
  const reference = String(value ?? "").trim();
  const qualified = reference.match(/^([^/\s]+\/[^#\s]+)#(\d+)$/u);
  if (qualified) {
    return {
      repository: qualified[1],
      number: normalizeIssueNumber(qualified[2]),
    };
  }
  return {
    repository: "",
    number: normalizeIssueNumber(reference.replace(/^#/u, "")),
  };
}

async function resolveConfiguredRepository({
  configuredRepositories,
  repository,
  cwd,
  commandRunner,
}) {
  const direct = repository
    ? requireConfiguredGithubIssueRepository(configuredRepositories, repository).repository
    : await resolveGithubRepository({ cwd, commandRunner });
  return requireConfiguredGithubIssueRepository(configuredRepositories, direct).repository;
}

function configuredStatuses(store, { account, repository, configuredRepositories }) {
  const entries = repository
    ? [requireConfiguredGithubIssueRepository(configuredRepositories, repository)]
    : configuredGithubIssueRepositories(configuredRepositories);
  return entries.map((entry) => {
    const status = account
      ? store.repositoryStatus({ account, repository: entry.repository })
      : null;
    return status ?? emptyRepositoryStatus(entry.repository, account);
  });
}

function emptyRepositoryStatus(repository, account) {
  return {
    host: "github.com",
    account: account || null,
    repository,
    repositoryUrl: `https://github.com/${repository}`,
    hasSnapshot: false,
    lastSyncedAt: null,
    syncCursor: null,
    lastFullSyncAt: null,
    issueCount: 0,
    commentCount: 0,
    lastApiPages: 0,
    lastCommentApiPages: 0,
    lastFullApiPages: 0,
    lastFullCommentApiPages: 0,
    lastSyncAttemptAt: null,
    lastSyncErrorAt: null,
    lastSyncErrorCode: null,
    lastSyncErrorMessage: null,
  };
}

function requireSnapshotCoverage(statuses, { account, repository }) {
  if (!statuses.some((status) => status.hasSnapshot)) {
    const scope = repository ? ` for ${repository}` : "";
    throw new Error(
      `No successful local GitHub Issues sync exists${scope} under account ${account}. Run \`openglance issues sync${repository ? ` --repo ${repository}` : " --all"}\`.`,
    );
  }
}

function scopePayload(account, repository, statuses) {
  const snapshotCount = statuses.filter((status) => status.hasSnapshot).length;
  return {
    account: account || null,
    repository: repository || null,
    coverage: snapshotCount === statuses.length ? "complete" : "partial",
    expectedRepositoryCount: statuses.length,
    snapshotRepositoryCount: snapshotCount,
    snapshots: statuses.map((status) => ({
      repository: status.repository,
      hasSnapshot: status.hasSnapshot,
      issueCount: status.issueCount,
      commentCount: status.commentCount,
      lastSyncedAt: status.lastSyncedAt,
      lastFullSyncAt: status.lastFullSyncAt,
      lastSyncErrorCode: status.lastSyncErrorCode,
    })),
  };
}

function envelope(command, data, now) {
  return {
    schemaVersion: GITHUB_ISSUES_INDEX_SCHEMA_VERSION,
    source: INDEX_SOURCE,
    command,
    generatedAt: toIsoTimestamp(now()),
    authority: {
      system: "github",
      localSnapshot: true,
      localMissIsAuthoritative: false,
    },
    ...data,
  };
}

function syncHumanOutput(result) {
  const lines = [
    `GitHub Issues sync ${result.status} for ${result.account}: ${result.completedRepositories}/${result.requestedRepositories} repositories completed.`,
  ];
  for (const repository of result.repositories) {
    if (repository.failed) {
      lines.push(`${repository.repository}: failed (${repository.error.code}) ${repository.error.message}`);
      continue;
    }
    if (repository.reason === "sync_in_progress") {
      lines.push(`${repository.repository}: another process is already syncing; existing snapshot kept.`);
      continue;
    }
    if (repository.reason === "partial_rate_budget") {
      lines.push(`${repository.repository}: deferred to preserve the GitHub REST API safety reserve.`);
      continue;
    }
    if (repository.reason === "rate_limited") {
      lines.push(`${repository.repository}: deferred after GitHub rate limiting.`);
      continue;
    }
    lines.push(
      `${repository.repository}: ${repository.full ? "full" : "incremental"}; ${repository.issueCount} Issues and ${repository.commentCount} comments indexed; ${repository.apiRequests} API pages.`,
    );
  }
  lines.push(`Total GitHub Issue/comment API pages: ${result.apiRequests}.`);
  return lines.join("\n");
}

function searchHumanOutput(issues, statuses) {
  const header = `${issues.length} local result${issues.length === 1 ? "" : "s"}; GitHub remains authoritative. Snapshot: ${freshnessSummary(statuses)}.`;
  if (issues.length === 0) {
    return `${header}\nNo matching Issues in this local snapshot.`;
  }
  return [
    header,
    ...issues.map((issue) => (
      `${issue.repository}#${issue.number} [${issue.state}] ${issue.title} (${issue.updatedAt})`
    )),
  ].join("\n");
}

function showHumanOutput(issue) {
  const labels = issue.labels.length > 0 ? issue.labels.join(", ") : "none";
  const lines = [
    `${issue.repository}#${issue.number}: ${issue.title}`,
    `State: ${issue.state}; labels: ${labels}; updated: ${issue.updatedAt}`,
    issue.url,
    "",
    issue.body || "(No Issue body in the local snapshot.)",
  ];
  if (issue.comments.length > 0) {
    lines.push("", `Comments (${issue.comments.length} indexed):`);
    for (const comment of issue.comments) {
      lines.push("", `@${comment.author} · ${comment.updatedAt}`, comment.body || "(Empty comment.)");
    }
  }
  lines.push("", `Local snapshot synced: ${issue.syncedAt}. GitHub remains authoritative.`);
  return lines.join("\n");
}

function statusHumanOutput(statuses) {
  return [
    "Local GitHub Issues snapshots (GitHub remains authoritative):",
    ...statuses.map((status) => (
      status.hasSnapshot
        ? `${status.repository}: ${status.issueCount} Issues and ${status.commentCount} comments; synced ${status.lastSyncedAt}; last full ${status.lastFullSyncAt ?? "never"}; last API pages ${status.lastApiPages + status.lastCommentApiPages}${status.lastSyncErrorCode ? `; latest attempt failed (${status.lastSyncErrorCode})` : ""}`
        : `${status.repository}: not indexed${status.lastSyncErrorCode ? `; latest attempt failed (${status.lastSyncErrorCode})` : ""}`
    )),
  ].join("\n");
}

function freshnessSummary(statuses) {
  return statuses
    .map((status) => `${status.repository} @ ${status.lastSyncedAt ?? "not indexed"}`)
    .join(", ");
}

function writeResult({ json, stdout, payload, human }) {
  stdout(json ? JSON.stringify(payload) : human);
}

function inlineOption(argument) {
  const match = String(argument).match(/^(--[^=]+)=(.*)$/u);
  return match ? { name: match[1], value: match[2] } : null;
}

function normalizeAccount(value) {
  const account = String(value ?? "").trim().toLowerCase();
  if (!account || /\s/u.test(account)) {
    throw new Error(`Invalid GitHub account: ${value}`);
  }
  return account;
}

function normalizeState(value) {
  const state = String(value ?? "").trim().toLowerCase();
  if (!["open", "closed", "all"].includes(state)) {
    throw new Error("--state must be open, closed, or all.");
  }
  return state;
}

function normalizeLimit(value) {
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("--limit must be an integer from 1 to 100.");
  }
  return limit;
}

function normalizeIssueNumber(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`Invalid GitHub Issue number: ${value}`);
  }
  return number;
}

function toIsoTimestamp(value) {
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(String(value ?? ""));
  if (Number.isNaN(timestamp)) {
    throw new Error("Invalid generatedAt timestamp.");
  }
  return new Date(timestamp).toISOString();
}
