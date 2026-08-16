import process from "node:process";

import { runExternalCommand } from "./external-command.mjs";
import { syncGithubIssues } from "./github-issues-sync.mjs";

const GITHUB_HOST = "github.com";

export async function syncGithubIssueRepositories({
  store,
  cwd = process.cwd(),
  account,
  repositories,
  full = false,
  isolateFailures = true,
  commandRunner = runExternalCommand,
  now = () => new Date(),
} = {}) {
  if (!Array.isArray(repositories) || repositories.length === 0) {
    throw new Error("At least one configured GitHub Issues repository is required for sync.");
  }
  const acquiredAt = isoTimestamp(now(), "sync coordinator");
  const coordinatorLease = store.acquireSyncCoordinatorLease({
    host: GITHUB_HOST,
    account,
    acquiredAt,
  });
  if (!coordinatorLease) {
    return summarizeSync({
      account,
      repositories: repositories.map((repository) => ({
        host: GITHUB_HOST,
        account,
        repository,
        skipped: true,
        reason: "sync_in_progress",
      })),
      forcedStatus: "sync_in_progress",
    });
  }

  const results = [];
  let forcedStatus = "";
  try {
    for (const [index, repository] of repositories.entries()) {
      const renewed = store.renewSyncCoordinatorLease({
        host: GITHUB_HOST,
        account,
        token: coordinatorLease.token,
        renewedAt: isoTimestamp(now(), "sync coordinator renewal"),
      });
      if (!renewed) {
        forcedStatus = "sync_in_progress";
        for (const deferredRepository of repositories.slice(index)) {
          results.push({
            host: GITHUB_HOST,
            account,
            repository: deferredRepository,
            skipped: true,
            reason: "sync_in_progress",
          });
        }
        break;
      }
      try {
        results.push(await syncGithubIssues({
          store,
          cwd,
          account,
          repository,
          full,
          commandRunner,
          now,
        }));
      } catch (error) {
        if (!isolateFailures) {
          throw error;
        }
        const code = String(error?.code ?? "sync_failed").toLowerCase();
        results.push({
          host: GITHUB_HOST,
          account,
          repository,
          skipped: false,
          failed: true,
          error: {
            code,
            message: error instanceof Error ? error.message : "GitHub Issues sync failed.",
          },
        });
        forcedStatus = terminalRateStatus(code);
        if (forcedStatus) {
          for (const deferredRepository of repositories.slice(index + 1)) {
            results.push({
              host: GITHUB_HOST,
              account,
              repository: deferredRepository,
              skipped: true,
              reason: forcedStatus,
            });
          }
          break;
        }
      }
    }
    return summarizeSync({ account, repositories: results, forcedStatus });
  } finally {
    store.releaseSyncCoordinatorLease({
      host: GITHUB_HOST,
      account,
      token: coordinatorLease.token,
    });
  }
}

function summarizeSync({ account, repositories, forcedStatus = "" }) {
  const failed = repositories.filter((result) => result.failed);
  const inProgress = repositories.filter((result) => result.reason === "sync_in_progress");
  const deferred = repositories.filter((result) => (
    result.reason === "partial_rate_budget" || result.reason === "rate_limited"
  ));
  const completed = repositories.filter((result) => !result.failed && !result.skipped);
  return {
    status: forcedStatus || (failed.length > 0
      ? "partial"
      : inProgress.length > 0
        ? "sync_in_progress"
        : "complete"),
    account,
    requestedRepositories: repositories.length,
    completedRepositories: completed.length,
    failedRepositories: failed.length,
    inProgressRepositories: inProgress.length,
    deferredRepositories: deferred.length,
    apiRequests: completed.reduce((sum, result) => sum + Number(result.apiRequests ?? 0), 0),
    repositories,
  };
}

function terminalRateStatus(code) {
  if (code === "github_rate_budget_low") {
    return "partial_rate_budget";
  }
  if (code === "github_rate_limited") {
    return "rate_limited";
  }
  return "";
}

function isoTimestamp(value, label) {
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(String(value ?? ""));
  if (Number.isNaN(timestamp)) {
    throw new Error(`Invalid ${label} timestamp.`);
  }
  return new Date(timestamp).toISOString();
}
