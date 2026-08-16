import { chmod, mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { assertGithubIssuesPrivatePathOutsideWorktree } from "./github-issues-paths.mjs";

export const GITHUB_ISSUES_INDEX_SCHEMA_VERSION = 2;
export const GITHUB_ISSUES_DATABASE_ENV = "OPENGLANCE_GITHUB_ISSUES_DB";

let sqliteModulePromise;

export function defaultGithubIssuesDatabasePath({
  env = process.env,
  homeDir = os.homedir(),
  platform = process.platform,
} = {}) {
  const override = String(env[GITHUB_ISSUES_DATABASE_ENV] ?? "").trim();
  if (override) {
    if (!path.isAbsolute(override)) {
      throw new Error(`${GITHUB_ISSUES_DATABASE_ENV} must be an absolute path.`);
    }
    return path.normalize(override);
  }

  if (platform === "darwin") {
    return path.join(homeDir, "Library", "Caches", "OpenGlance", "github-issues.sqlite");
  }

  if (platform === "win32") {
    const localAppData = String(env.LOCALAPPDATA ?? "").trim()
      || path.join(homeDir, "AppData", "Local");
    return path.join(localAppData, "OpenGlance", "Cache", "github-issues.sqlite");
  }

  const cacheRoot = String(env.XDG_CACHE_HOME ?? "").trim()
    || path.join(homeDir, ".cache");
  return path.join(cacheRoot, "openglance", "github-issues.sqlite");
}

export async function openGithubIssuesStore({ databasePath, readOnly = false } = {}) {
  const requestedPath = databasePath === ":memory:"
    ? ":memory:"
    : databasePath
      ? path.resolve(databasePath)
    : defaultGithubIssuesDatabasePath();
  const resolvedPath = requestedPath === ":memory:"
    ? ":memory:"
    : await assertGithubIssuesPrivatePathOutsideWorktree(requestedPath);
  const { DatabaseSync } = await loadSqliteModule();

  if (resolvedPath !== ":memory:" && !readOnly) {
    await mkdir(path.dirname(resolvedPath), { recursive: true, mode: 0o700 });
  }

  const database = new DatabaseSync(resolvedPath, { readOnly });
  try {
    initializeDatabase(database, { readOnly });
    if (resolvedPath !== ":memory:" && !readOnly) {
      await chmod(resolvedPath, 0o600).catch((error) => {
        if (process.platform !== "win32") {
          throw error;
        }
      });
    }
    return new GithubIssuesStore(database, resolvedPath);
  } catch (error) {
    database.close();
    throw error;
  }
}

export class GithubIssuesStore {
  constructor(database, databasePath) {
    this.database = database;
    this.databasePath = databasePath;
  }

  close() {
    this.database.close();
  }

  defaultAccount(host = "github.com") {
    const row = this.database.prepare(`
      SELECT account_login
      FROM repositories
      WHERE host = $host
      ORDER BY last_synced_at DESC NULLS LAST, account_login ASC
      LIMIT 1
    `).get({ $host: normalizeHost(host) });
    return String(row?.account_login ?? "");
  }

  repositoryStatus({ host = "github.com", account, repository }) {
    const row = this.database.prepare(`
      SELECT
        host,
        account_login,
        repository,
        repository_url,
        last_synced_at,
        sync_cursor,
        last_full_sync_at,
        issue_count,
        comment_count,
        last_api_pages,
        last_comment_api_pages,
        last_full_api_pages,
        last_full_comment_api_pages,
        last_sync_attempt_at,
        last_sync_error_at,
        last_sync_error_code,
        last_sync_error_message
      FROM repositories
      WHERE host = $host
        AND account_login = $account
        AND repository = $repository
    `).get({
      $host: normalizeHost(host),
      $account: normalizeAccount(account),
      $repository: normalizeRepository(repository),
    });
    return row ? repositoryRow(row) : null;
  }

  listRepositoryStatus({ host = "github.com", account, repository } = {}) {
    const parameters = {
      $host: normalizeHost(host),
      $account: normalizeAccount(account),
    };
    const repositoryClause = repository
      ? "AND repository = $repository"
      : "";
    if (repository) {
      parameters.$repository = normalizeRepository(repository);
    }
    const rows = this.database.prepare(`
      SELECT
        host,
        account_login,
        repository,
        repository_url,
        last_synced_at,
        sync_cursor,
        last_full_sync_at,
        issue_count,
        comment_count,
        last_api_pages,
        last_comment_api_pages,
        last_full_api_pages,
        last_full_comment_api_pages,
        last_sync_attempt_at,
        last_sync_error_at,
        last_sync_error_code,
        last_sync_error_message
      FROM repositories
      WHERE host = $host
        AND account_login = $account
        ${repositoryClause}
      ORDER BY repository ASC
    `).all(parameters);
    return rows.map(repositoryRow);
  }

  ensureRepository({ host = "github.com", account, repository }) {
    const normalizedHost = normalizeHost(host);
    const normalizedAccount = normalizeAccount(account);
    const normalizedRepository = normalizeRepository(repository);
    this.database.prepare(`
      INSERT INTO repositories (
        host,
        account_login,
        repository,
        repository_url
      ) VALUES (
        $host,
        $account,
        $repository,
        $repositoryUrl
      )
      ON CONFLICT (host, account_login, repository) DO NOTHING
    `).run({
      $host: normalizedHost,
      $account: normalizedAccount,
      $repository: normalizedRepository,
      $repositoryUrl: `https://${normalizedHost}/${normalizedRepository}`,
    });
    return this.repositoryStatus({
      host: normalizedHost,
      account: normalizedAccount,
      repository: normalizedRepository,
    });
  }

  acquireSyncLease({
    host = "github.com",
    account,
    repository,
    acquiredAt,
    ttlMs = 15 * 60 * 1_000,
  }) {
    const normalizedHost = normalizeHost(host);
    const normalizedAccount = normalizeAccount(account);
    const normalizedRepository = normalizeRepository(repository);
    const acquiredTimestamp = requiredIsoTimestamp(acquiredAt, "acquiredAt", "sync lease");
    const expiresAt = new Date(Date.parse(acquiredTimestamp) + ttlMs).toISOString();
    const token = randomUUID();
    this.database.exec("BEGIN IMMEDIATE");
    try {
      this.database.prepare(`
        DELETE FROM sync_leases
        WHERE expires_at <= $acquiredAt
      `).run({ $acquiredAt: acquiredTimestamp });
      const result = this.database.prepare(`
        INSERT INTO sync_leases (
          host,
          account_login,
          repository,
          lease_token,
          acquired_at,
          expires_at
        ) VALUES (
          $host,
          $account,
          $repository,
          $token,
          $acquiredAt,
          $expiresAt
        )
        ON CONFLICT (host, account_login, repository) DO NOTHING
      `).run({
        $host: normalizedHost,
        $account: normalizedAccount,
        $repository: normalizedRepository,
        $token: token,
        $acquiredAt: acquiredTimestamp,
        $expiresAt: expiresAt,
      });
      this.database.exec("COMMIT");
      return Number(result.changes) > 0
        ? { token, acquiredAt: acquiredTimestamp, expiresAt }
        : null;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  releaseSyncLease({ host = "github.com", account, repository, token }) {
    const result = this.database.prepare(`
      DELETE FROM sync_leases
      WHERE host = $host
        AND account_login = $account
        AND repository = $repository
        AND lease_token = $token
    `).run({
      $host: normalizeHost(host),
      $account: normalizeAccount(account),
      $repository: normalizeRepository(repository),
      $token: String(token ?? ""),
    });
    return Number(result.changes) > 0;
  }

  acquireSyncCoordinatorLease({
    host = "github.com",
    account,
    acquiredAt,
    ttlMs = 30 * 60 * 1_000,
  }) {
    const normalizedHost = normalizeHost(host);
    const normalizedAccount = normalizeAccount(account);
    const acquiredTimestamp = requiredIsoTimestamp(
      acquiredAt,
      "acquiredAt",
      "sync coordinator lease",
    );
    const expiresAt = new Date(Date.parse(acquiredTimestamp) + ttlMs).toISOString();
    const token = randomUUID();
    this.database.exec("BEGIN IMMEDIATE");
    try {
      this.database.prepare(`
        DELETE FROM sync_coordinator_leases
        WHERE expires_at <= $acquiredAt
      `).run({ $acquiredAt: acquiredTimestamp });
      const result = this.database.prepare(`
        INSERT INTO sync_coordinator_leases (
          host,
          account_login,
          lease_token,
          acquired_at,
          expires_at
        ) VALUES (
          $host,
          $account,
          $token,
          $acquiredAt,
          $expiresAt
        )
        ON CONFLICT (host, account_login) DO NOTHING
      `).run({
        $host: normalizedHost,
        $account: normalizedAccount,
        $token: token,
        $acquiredAt: acquiredTimestamp,
        $expiresAt: expiresAt,
      });
      this.database.exec("COMMIT");
      return Number(result.changes) > 0
        ? { token, acquiredAt: acquiredTimestamp, expiresAt }
        : null;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  releaseSyncCoordinatorLease({ host = "github.com", account, token }) {
    const result = this.database.prepare(`
      DELETE FROM sync_coordinator_leases
      WHERE host = $host
        AND account_login = $account
        AND lease_token = $token
    `).run({
      $host: normalizeHost(host),
      $account: normalizeAccount(account),
      $token: String(token ?? ""),
    });
    return Number(result.changes) > 0;
  }

  renewSyncCoordinatorLease({
    host = "github.com",
    account,
    token,
    renewedAt,
    ttlMs = 30 * 60 * 1_000,
  }) {
    const renewedTimestamp = requiredIsoTimestamp(
      renewedAt,
      "renewedAt",
      "sync coordinator lease",
    );
    const expiresAt = new Date(Date.parse(renewedTimestamp) + ttlMs).toISOString();
    const result = this.database.prepare(`
      UPDATE sync_coordinator_leases
      SET expires_at = $expiresAt
      WHERE host = $host
        AND account_login = $account
        AND lease_token = $token
    `).run({
      $host: normalizeHost(host),
      $account: normalizeAccount(account),
      $token: String(token ?? ""),
      $expiresAt: expiresAt,
    });
    return Number(result.changes) > 0 ? { token, expiresAt } : null;
  }

  purgeRepository({ host = "github.com", account, repository }) {
    const parameters = {
      $host: normalizeHost(host),
      $account: normalizeAccount(account),
      $repository: normalizeRepository(repository),
    };
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const issueResult = this.database.prepare(`
        DELETE FROM issues
        WHERE host = $host
          AND account_login = $account
          AND repository = $repository
      `).run(parameters);
      this.database.prepare(`
        DELETE FROM repositories
        WHERE host = $host
          AND account_login = $account
          AND repository = $repository
      `).run(parameters);
      this.database.prepare(`
        DELETE FROM sync_leases
        WHERE host = $host
          AND account_login = $account
          AND repository = $repository
      `).run(parameters);
      this.database.exec("COMMIT");
      return { removedIssues: Number(issueResult.changes) };
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  recordSyncAttempt({ host = "github.com", account, repository, attemptedAt }) {
    this.ensureRepository({ host, account, repository });
    this.database.prepare(`
      UPDATE repositories
      SET last_sync_attempt_at = $attemptedAt
      WHERE host = $host
        AND account_login = $account
        AND repository = $repository
    `).run({
      $host: normalizeHost(host),
      $account: normalizeAccount(account),
      $repository: normalizeRepository(repository),
      $attemptedAt: requiredIsoTimestamp(attemptedAt, "attemptedAt", "sync"),
    });
  }

  recordSyncFailure({
    host = "github.com",
    account,
    repository,
    failedAt,
    code = "sync_failed",
    message = "GitHub Issues sync failed.",
  }) {
    this.ensureRepository({ host, account, repository });
    this.database.prepare(`
      UPDATE repositories
      SET
        last_sync_attempt_at = $failedAt,
        last_sync_error_at = $failedAt,
        last_sync_error_code = $code,
        last_sync_error_message = $message
      WHERE host = $host
        AND account_login = $account
        AND repository = $repository
    `).run({
      $host: normalizeHost(host),
      $account: normalizeAccount(account),
      $repository: normalizeRepository(repository),
      $failedAt: requiredIsoTimestamp(failedAt, "failedAt", "sync"),
      $code: String(code ?? "sync_failed").slice(0, 80),
      $message: String(message ?? "GitHub Issues sync failed.").slice(0, 500),
    });
  }

  syncRepository({
    host = "github.com",
    account,
    repository,
    issues,
    comments = [],
    syncedAt,
    syncCursor,
    full = false,
    apiPages = 0,
    commentApiPages = 0,
  }) {
    const normalizedHost = normalizeHost(host);
    const normalizedAccount = normalizeAccount(account);
    const normalizedRepository = normalizeRepository(repository);
    const repositoryUrl = `https://${normalizedHost}/${normalizedRepository}`;
    const normalizedIssues = issues.map((issue) => normalizeIssue(issue));
    const normalizedComments = comments.map((comment) => normalizeComment(comment));
    const seenNumbers = new Set(normalizedIssues.map((issue) => issue.number));

    this.database.exec("BEGIN IMMEDIATE");
    try {
      const previous = this.repositoryStatus({
        host: normalizedHost,
        account: normalizedAccount,
        repository: normalizedRepository,
      });
      const upsert = this.database.prepare(`
        INSERT INTO issues (
          host,
          account_login,
          repository,
          number,
          github_id,
          node_id,
          url,
          state,
          state_reason,
          title,
          body,
          author,
          created_at,
          updated_at,
          closed_at,
          labels_json,
          labels_text,
          assignees_json,
          assignees_text,
          milestone,
          comments_count,
          locked,
          search_text,
          synced_at
        ) VALUES (
          $host,
          $account,
          $repository,
          $number,
          $githubId,
          $nodeId,
          $url,
          $state,
          $stateReason,
          $title,
          $body,
          $author,
          $createdAt,
          $updatedAt,
          $closedAt,
          $labelsJson,
          $labelsText,
          $assigneesJson,
          $assigneesText,
          $milestone,
          $commentsCount,
          $locked,
          $searchText,
          $syncedAt
        )
        ON CONFLICT (host, account_login, repository, number) DO UPDATE SET
          github_id = excluded.github_id,
          node_id = excluded.node_id,
          url = excluded.url,
          state = excluded.state,
          state_reason = excluded.state_reason,
          title = excluded.title,
          body = excluded.body,
          author = excluded.author,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at,
          closed_at = excluded.closed_at,
          labels_json = excluded.labels_json,
          labels_text = excluded.labels_text,
          assignees_json = excluded.assignees_json,
          assignees_text = excluded.assignees_text,
          milestone = excluded.milestone,
          comments_count = excluded.comments_count,
          locked = excluded.locked,
          search_text = excluded.search_text,
          synced_at = excluded.synced_at
      `);

      for (const issue of normalizedIssues) {
        upsert.run({
          $host: normalizedHost,
          $account: normalizedAccount,
          $repository: normalizedRepository,
          $number: issue.number,
          $githubId: issue.githubId,
          $nodeId: issue.nodeId,
          $url: issue.url,
          $state: issue.state,
          $stateReason: issue.stateReason,
          $title: issue.title,
          $body: issue.body,
          $author: issue.author,
          $createdAt: issue.createdAt,
          $updatedAt: issue.updatedAt,
          $closedAt: issue.closedAt,
          $labelsJson: JSON.stringify(issue.labels),
          $labelsText: issue.labels.join(" "),
          $assigneesJson: JSON.stringify(issue.assignees),
          $assigneesText: issue.assignees.join(" "),
          $milestone: issue.milestone,
          $commentsCount: issue.commentsCount,
          $locked: issue.locked ? 1 : 0,
          $searchText: issueSearchText(issue),
          $syncedAt: syncedAt,
        });
      }

      const availableIssueNumbers = new Set(this.database.prepare(`
        SELECT number
        FROM issues
        WHERE host = $host
          AND account_login = $account
          AND repository = $repository
      `).all({
        $host: normalizedHost,
        $account: normalizedAccount,
        $repository: normalizedRepository,
      }).map((row) => Number(row.number)));
      const storedComments = normalizedComments.filter((comment) => (
        availableIssueNumbers.has(comment.issueNumber)
      ));
      const seenCommentIds = new Set(storedComments.map((comment) => comment.githubId));
      const upsertComment = this.database.prepare(`
        INSERT INTO comments (
          host,
          account_login,
          repository,
          github_id,
          node_id,
          issue_number,
          url,
          author,
          body,
          created_at,
          updated_at,
          synced_at
        ) VALUES (
          $host,
          $account,
          $repository,
          $githubId,
          $nodeId,
          $issueNumber,
          $url,
          $author,
          $body,
          $createdAt,
          $updatedAt,
          $syncedAt
        )
        ON CONFLICT (host, account_login, repository, github_id) DO UPDATE SET
          node_id = excluded.node_id,
          issue_number = excluded.issue_number,
          url = excluded.url,
          author = excluded.author,
          body = excluded.body,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at,
          synced_at = excluded.synced_at
      `);
      for (const comment of storedComments) {
        upsertComment.run({
          $host: normalizedHost,
          $account: normalizedAccount,
          $repository: normalizedRepository,
          $githubId: comment.githubId,
          $nodeId: comment.nodeId,
          $issueNumber: comment.issueNumber,
          $url: comment.url,
          $author: comment.author,
          $body: comment.body,
          $createdAt: comment.createdAt,
          $updatedAt: comment.updatedAt,
          $syncedAt: syncedAt,
        });
      }

      let removed = 0;
      if (full) {
        const existing = this.database.prepare(`
          SELECT number
          FROM issues
          WHERE host = $host
            AND account_login = $account
            AND repository = $repository
        `).all({
          $host: normalizedHost,
          $account: normalizedAccount,
          $repository: normalizedRepository,
        });
        const remove = this.database.prepare(`
          DELETE FROM issues
          WHERE host = $host
            AND account_login = $account
            AND repository = $repository
            AND number = $number
        `);
        for (const row of existing) {
          const number = Number(row.number);
          if (seenNumbers.has(number)) {
            continue;
          }
          remove.run({
            $host: normalizedHost,
            $account: normalizedAccount,
            $repository: normalizedRepository,
            $number: number,
          });
          removed += 1;
        }

        const existingComments = this.database.prepare(`
          SELECT github_id
          FROM comments
          WHERE host = $host
            AND account_login = $account
            AND repository = $repository
        `).all({
          $host: normalizedHost,
          $account: normalizedAccount,
          $repository: normalizedRepository,
        });
        const removeComment = this.database.prepare(`
          DELETE FROM comments
          WHERE host = $host
            AND account_login = $account
            AND repository = $repository
            AND github_id = $githubId
        `);
        for (const row of existingComments) {
          const githubId = String(row.github_id);
          if (seenCommentIds.has(githubId)) {
            continue;
          }
          removeComment.run({
            $host: normalizedHost,
            $account: normalizedAccount,
            $repository: normalizedRepository,
            $githubId: githubId,
          });
        }
      }

      const countRow = this.database.prepare(`
        SELECT COUNT(*) AS issue_count
        FROM issues
        WHERE host = $host
          AND account_login = $account
          AND repository = $repository
      `).get({
        $host: normalizedHost,
        $account: normalizedAccount,
        $repository: normalizedRepository,
      });
      const issueCount = Number(countRow?.issue_count ?? 0);
      const commentCountRow = this.database.prepare(`
        SELECT COUNT(*) AS comment_count
        FROM comments
        WHERE host = $host
          AND account_login = $account
          AND repository = $repository
      `).get({
        $host: normalizedHost,
        $account: normalizedAccount,
        $repository: normalizedRepository,
      });
      const commentCount = Number(commentCountRow?.comment_count ?? 0);
      this.database.prepare(`
        INSERT INTO repositories (
          host,
          account_login,
          repository,
          repository_url,
          last_synced_at,
          sync_cursor,
          last_full_sync_at,
          issue_count,
          comment_count,
          last_api_pages,
          last_comment_api_pages,
          last_full_api_pages,
          last_full_comment_api_pages,
          last_sync_attempt_at,
          last_sync_error_at,
          last_sync_error_code,
          last_sync_error_message
        ) VALUES (
          $host,
          $account,
          $repository,
          $repositoryUrl,
          $syncedAt,
          $syncCursor,
          $lastFullSyncAt,
          $issueCount,
          $commentCount,
          $apiPages,
          $commentApiPages,
          $lastFullApiPages,
          $lastFullCommentApiPages,
          $syncedAt,
          NULL,
          NULL,
          NULL
        )
        ON CONFLICT (host, account_login, repository) DO UPDATE SET
          repository_url = excluded.repository_url,
          last_synced_at = excluded.last_synced_at,
          sync_cursor = excluded.sync_cursor,
          last_full_sync_at = excluded.last_full_sync_at,
          issue_count = excluded.issue_count,
          comment_count = excluded.comment_count,
          last_api_pages = excluded.last_api_pages,
          last_comment_api_pages = excluded.last_comment_api_pages,
          last_full_api_pages = excluded.last_full_api_pages,
          last_full_comment_api_pages = excluded.last_full_comment_api_pages,
          last_sync_attempt_at = excluded.last_sync_attempt_at,
          last_sync_error_at = NULL,
          last_sync_error_code = NULL,
          last_sync_error_message = NULL
      `).run({
        $host: normalizedHost,
        $account: normalizedAccount,
        $repository: normalizedRepository,
        $repositoryUrl: repositoryUrl,
        $syncedAt: syncedAt,
        $syncCursor: syncCursor,
        $lastFullSyncAt: full ? syncedAt : previous?.lastFullSyncAt ?? null,
        $issueCount: issueCount,
        $commentCount: commentCount,
        $apiPages: Math.max(0, Number(apiPages) || 0),
        $commentApiPages: Math.max(0, Number(commentApiPages) || 0),
        $lastFullApiPages: full
          ? Math.max(0, Number(apiPages) || 0)
          : previous?.lastFullApiPages ?? 0,
        $lastFullCommentApiPages: full
          ? Math.max(0, Number(commentApiPages) || 0)
          : previous?.lastFullCommentApiPages ?? 0,
      });

      this.database.exec("COMMIT");
      return {
        stored: normalizedIssues.length,
        storedComments: storedComments.length,
        removed,
        issueCount,
        commentCount,
      };
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  search({
    host = "github.com",
    account,
    repository,
    repositories,
    query = "",
    state = "open",
    limit = 20,
  } = {}) {
    const normalizedState = normalizeStateFilter(state);
    const normalizedLimit = normalizeLimit(limit);
    const normalizedQuery = String(query ?? "").trim();
    const { number, terms } = parseSearchTerms(normalizedQuery);
    const parameters = {
      $host: normalizeHost(host),
      $account: normalizeAccount(account),
      $limit: normalizedLimit,
    };
    const clauses = [
      "i.host = $host",
      "i.account_login = $account",
    ];
    if (repository) {
      clauses.push("i.repository = $repository");
      parameters.$repository = normalizeRepository(repository);
    } else if (Array.isArray(repositories) && repositories.length > 0) {
      const placeholders = repositories.map((candidate, index) => {
        const parameter = `$repository${index}`;
        parameters[parameter] = normalizeRepository(candidate);
        return parameter;
      });
      clauses.push(`i.repository IN (${placeholders.join(", ")})`);
    }
    if (normalizedState !== "all") {
      clauses.push("i.state = $state");
      parameters.$state = normalizedState;
    }
    if (number) {
      clauses.push("i.number = $number");
      parameters.$number = number;
    }

    const useFts = terms.length > 0 && terms.every((term) => [...term].length >= 3);
    let rows;
    if (useFts) {
      const quotedTerms = terms.map((term) => `"${term.replaceAll('"', '""')}"`);
      const searchStatement = this.database.prepare(`
        WITH matches AS (
          SELECT
            host,
            account_login,
            repository,
            CAST(number AS INTEGER) AS issue_number,
            bm25(issue_search) AS rank
          FROM issue_search
          WHERE issue_search MATCH $match
          UNION ALL
          SELECT
            host,
            account_login,
            repository,
            CAST(issue_number AS INTEGER) AS issue_number,
            bm25(comment_search) AS rank
          FROM comment_search
          WHERE comment_search MATCH $match
        ), ranked AS (
          SELECT
            host,
            account_login,
            repository,
            issue_number,
            MIN(rank) AS search_rank
          FROM matches
          GROUP BY host, account_login, repository, issue_number
        )
        SELECT
          i.*,
          ranked.search_rank,
          (
            SELECT COUNT(*)
            FROM comments AS indexed_comment
            WHERE indexed_comment.host = i.host
              AND indexed_comment.account_login = i.account_login
              AND indexed_comment.repository = i.repository
              AND indexed_comment.issue_number = i.number
          ) AS indexed_comments_count
        FROM ranked
        JOIN issues AS i
          ON i.host = ranked.host
         AND i.account_login = ranked.account_login
         AND i.repository = ranked.repository
         AND i.number = ranked.issue_number
        WHERE ${clauses.join("\n          AND ")}
        ORDER BY
          CASE i.state WHEN 'open' THEN 0 ELSE 1 END,
          search_rank ASC,
          i.updated_at DESC,
          i.repository ASC,
          i.number DESC
        LIMIT $limit
      `);
      parameters.$match = quotedTerms.join(" AND ");
      rows = searchStatement.all(parameters);
      if (rows.length === 0 && quotedTerms.length > 1) {
        parameters.$match = quotedTerms.join(" OR ");
        rows = searchStatement.all(parameters);
      }
    } else {
      const strictClauses = [...clauses];
      for (const [index, term] of terms.entries()) {
        const parameter = `$term${index}`;
        strictClauses.push(`(
          i.search_text LIKE ${parameter} ESCAPE '\\'
          OR EXISTS (
            SELECT 1
            FROM comments AS matching_comment
            WHERE matching_comment.host = i.host
              AND matching_comment.account_login = i.account_login
              AND matching_comment.repository = i.repository
              AND matching_comment.issue_number = i.number
              AND (
                matching_comment.body LIKE ${parameter} ESCAPE '\\'
                OR matching_comment.author LIKE ${parameter} ESCAPE '\\'
              )
          )
        )`);
        parameters[parameter] = `%${escapeLike(term)}%`;
      }
      rows = this.database.prepare(`
        SELECT
          i.*,
          NULL AS search_rank,
          (
            SELECT COUNT(*)
            FROM comments AS indexed_comment
            WHERE indexed_comment.host = i.host
              AND indexed_comment.account_login = i.account_login
              AND indexed_comment.repository = i.repository
              AND indexed_comment.issue_number = i.number
          ) AS indexed_comments_count
        FROM issues AS i
        WHERE ${strictClauses.join("\n          AND ")}
        ORDER BY
          CASE i.state WHEN 'open' THEN 0 ELSE 1 END,
          i.updated_at DESC,
          i.repository ASC,
          i.number DESC
        LIMIT $limit
      `).all(parameters);
    }

    if (rows.length === 0 && terms.length > 0) {
      rows = fuzzySearchRows(this.database, { clauses, parameters, terms });
    }

    return rows.map(issueSummaryRow);
  }

  show({ host = "github.com", account, repository, number }) {
    const parameters = {
      $host: normalizeHost(host),
      $account: normalizeAccount(account),
      $repository: normalizeRepository(repository),
      $number: normalizeIssueNumber(number),
    };
    const row = this.database.prepare(`
      SELECT
        i.*,
        (
          SELECT COUNT(*)
          FROM comments AS indexed_comment
          WHERE indexed_comment.host = i.host
            AND indexed_comment.account_login = i.account_login
            AND indexed_comment.repository = i.repository
            AND indexed_comment.issue_number = i.number
        ) AS indexed_comments_count
      FROM issues AS i
      WHERE i.host = $host
        AND i.account_login = $account
        AND i.repository = $repository
        AND i.number = $number
    `).get(parameters);
    if (!row) {
      return null;
    }
    const comments = this.database.prepare(`
      SELECT
        github_id,
        node_id,
        url,
        author,
        body,
        created_at,
        updated_at
      FROM comments
      WHERE host = $host
        AND account_login = $account
        AND repository = $repository
        AND issue_number = $number
      ORDER BY created_at ASC, github_id ASC
    `).all(parameters).map(commentRow);
    return { ...issueDetailRow(row), comments };
  }
}

async function loadSqliteModule() {
  sqliteModulePromise ??= import("node:sqlite").catch((error) => {
    throw new Error(
      "The GitHub Issues index requires Node.js 22.13 or newer with node:sqlite support.",
      { cause: error },
    );
  });
  return sqliteModulePromise;
}

function initializeDatabase(database, { readOnly = false } = {}) {
  database.exec("PRAGMA foreign_keys = ON;");
  database.exec("PRAGMA busy_timeout = 5000;");
  if (!readOnly) {
    database.exec("PRAGMA journal_mode = WAL;");
  }
  const versionRow = database.prepare("PRAGMA user_version").get();
  const version = Number(versionRow?.user_version ?? 0);
  if (version > GITHUB_ISSUES_INDEX_SCHEMA_VERSION) {
    throw new Error(
      `GitHub Issues index schema ${version} is newer than supported schema ${GITHUB_ISSUES_INDEX_SCHEMA_VERSION}.`,
    );
  }
  if (version === GITHUB_ISSUES_INDEX_SCHEMA_VERSION) {
    return;
  }
  if (readOnly) {
    throw new Error(
      `GitHub Issues index schema ${version} requires a writable sync before it can be queried.`,
    );
  }
  if (version === 1) {
    migrateGithubIssuesSchemaV1ToV2(database);
    return;
  }
  if (version !== 0) {
    throw new Error(`Unsupported GitHub Issues index schema migration from ${version}.`);
  }

  database.exec(`
    CREATE TABLE repositories (
      host TEXT NOT NULL,
      account_login TEXT NOT NULL,
      repository TEXT NOT NULL,
      repository_url TEXT NOT NULL,
      last_synced_at TEXT,
      sync_cursor TEXT,
      last_full_sync_at TEXT,
      issue_count INTEGER NOT NULL DEFAULT 0,
      comment_count INTEGER NOT NULL DEFAULT 0,
      last_api_pages INTEGER NOT NULL DEFAULT 0,
      last_comment_api_pages INTEGER NOT NULL DEFAULT 0,
      last_full_api_pages INTEGER NOT NULL DEFAULT 0,
      last_full_comment_api_pages INTEGER NOT NULL DEFAULT 0,
      last_sync_attempt_at TEXT,
      last_sync_error_at TEXT,
      last_sync_error_code TEXT,
      last_sync_error_message TEXT,
      PRIMARY KEY (host, account_login, repository)
    ) STRICT;

    CREATE TABLE issues (
      host TEXT NOT NULL,
      account_login TEXT NOT NULL,
      repository TEXT NOT NULL,
      number INTEGER NOT NULL CHECK (number > 0),
      github_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
      url TEXT NOT NULL,
      state TEXT NOT NULL CHECK (state IN ('open', 'closed')),
      state_reason TEXT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      author TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      closed_at TEXT,
      labels_json TEXT NOT NULL,
      labels_text TEXT NOT NULL,
      assignees_json TEXT NOT NULL,
      assignees_text TEXT NOT NULL,
      milestone TEXT,
      comments_count INTEGER NOT NULL DEFAULT 0,
      locked INTEGER NOT NULL DEFAULT 0 CHECK (locked IN (0, 1)),
      search_text TEXT NOT NULL,
      synced_at TEXT NOT NULL,
      PRIMARY KEY (host, account_login, repository, number)
    ) STRICT;

    CREATE TABLE comments (
      host TEXT NOT NULL,
      account_login TEXT NOT NULL,
      repository TEXT NOT NULL,
      github_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
      issue_number INTEGER NOT NULL CHECK (issue_number > 0),
      url TEXT NOT NULL,
      author TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      synced_at TEXT NOT NULL,
      PRIMARY KEY (host, account_login, repository, github_id),
      FOREIGN KEY (host, account_login, repository, issue_number)
        REFERENCES issues (host, account_login, repository, number)
        ON DELETE CASCADE
    ) STRICT;

    CREATE TABLE sync_leases (
      host TEXT NOT NULL,
      account_login TEXT NOT NULL,
      repository TEXT NOT NULL,
      lease_token TEXT NOT NULL,
      acquired_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      PRIMARY KEY (host, account_login, repository)
    ) STRICT;

    CREATE TABLE sync_coordinator_leases (
      host TEXT NOT NULL,
      account_login TEXT NOT NULL,
      lease_token TEXT NOT NULL,
      acquired_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      PRIMARY KEY (host, account_login)
    ) STRICT;

    CREATE INDEX issues_scope_updated
      ON issues (host, account_login, repository, state, updated_at DESC);

    CREATE INDEX comments_issue_created
      ON comments (host, account_login, repository, issue_number, created_at ASC);

    CREATE INDEX sync_leases_expiration
      ON sync_leases (expires_at);

    CREATE INDEX sync_coordinator_leases_expiration
      ON sync_coordinator_leases (expires_at);

    CREATE VIRTUAL TABLE issue_search USING fts5(
      host UNINDEXED,
      account_login UNINDEXED,
      repository UNINDEXED,
      number UNINDEXED,
      title,
      body,
      labels,
      assignees,
      author,
      tokenize = 'trigram case_sensitive 0 remove_diacritics 1'
    );

    CREATE VIRTUAL TABLE comment_search USING fts5(
      host UNINDEXED,
      account_login UNINDEXED,
      repository UNINDEXED,
      issue_number UNINDEXED,
      github_id UNINDEXED,
      body,
      author,
      tokenize = 'trigram case_sensitive 0 remove_diacritics 1'
    );

    CREATE TRIGGER issues_search_insert
    AFTER INSERT ON issues
    BEGIN
      INSERT INTO issue_search (
        host,
        account_login,
        repository,
        number,
        title,
        body,
        labels,
        assignees,
        author
      ) VALUES (
        new.host,
        new.account_login,
        new.repository,
        new.number,
        new.title,
        new.body,
        new.labels_text,
        new.assignees_text,
        new.author
      );
    END;

    CREATE TRIGGER issues_search_update
    AFTER UPDATE ON issues
    BEGIN
      DELETE FROM issue_search
      WHERE host = old.host
        AND account_login = old.account_login
        AND repository = old.repository
        AND number = old.number;
      INSERT INTO issue_search (
        host,
        account_login,
        repository,
        number,
        title,
        body,
        labels,
        assignees,
        author
      ) VALUES (
        new.host,
        new.account_login,
        new.repository,
        new.number,
        new.title,
        new.body,
        new.labels_text,
        new.assignees_text,
        new.author
      );
    END;

    CREATE TRIGGER issues_search_delete
    AFTER DELETE ON issues
    BEGIN
      DELETE FROM issue_search
      WHERE host = old.host
        AND account_login = old.account_login
        AND repository = old.repository
        AND number = old.number;
    END;

    CREATE TRIGGER comments_search_insert
    AFTER INSERT ON comments
    BEGIN
      INSERT INTO comment_search (
        host,
        account_login,
        repository,
        issue_number,
        github_id,
        body,
        author
      ) VALUES (
        new.host,
        new.account_login,
        new.repository,
        new.issue_number,
        new.github_id,
        new.body,
        new.author
      );
    END;

    CREATE TRIGGER comments_search_update
    AFTER UPDATE ON comments
    BEGIN
      DELETE FROM comment_search
      WHERE host = old.host
        AND account_login = old.account_login
        AND repository = old.repository
        AND github_id = old.github_id;
      INSERT INTO comment_search (
        host,
        account_login,
        repository,
        issue_number,
        github_id,
        body,
        author
      ) VALUES (
        new.host,
        new.account_login,
        new.repository,
        new.issue_number,
        new.github_id,
        new.body,
        new.author
      );
    END;

    CREATE TRIGGER comments_search_delete
    AFTER DELETE ON comments
    BEGIN
      DELETE FROM comment_search
      WHERE host = old.host
        AND account_login = old.account_login
        AND repository = old.repository
        AND github_id = old.github_id;
    END;

    PRAGMA user_version = 2;
  `);
}

function migrateGithubIssuesSchemaV1ToV2(database) {
  database.exec("BEGIN IMMEDIATE");
  try {
    database.exec(`
      ALTER TABLE repositories
        ADD COLUMN last_full_api_pages INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE repositories
        ADD COLUMN last_full_comment_api_pages INTEGER NOT NULL DEFAULT 0;
      CREATE TABLE sync_coordinator_leases (
        host TEXT NOT NULL,
        account_login TEXT NOT NULL,
        lease_token TEXT NOT NULL,
        acquired_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        PRIMARY KEY (host, account_login)
      ) STRICT;
      CREATE INDEX sync_coordinator_leases_expiration
        ON sync_coordinator_leases (expires_at);
      PRAGMA user_version = 2;
    `);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function normalizeIssue(issue) {
  const number = normalizeIssueNumber(issue.number);
  const state = issue.state === "closed" ? "closed" : "open";
  const title = String(issue.title ?? "").trim();
  const url = String(issue.url ?? "").trim();
  const createdAt = requiredIsoTimestamp(issue.createdAt, "createdAt", number);
  const updatedAt = requiredIsoTimestamp(issue.updatedAt, "updatedAt", number);
  if (!title || !url) {
    throw new Error(`GitHub Issue #${number} is missing a title or URL.`);
  }
  return {
    number,
    githubId: String(issue.githubId ?? ""),
    nodeId: String(issue.nodeId ?? ""),
    url,
    state,
    stateReason: optionalString(issue.stateReason),
    title,
    body: String(issue.body ?? ""),
    author: String(issue.author ?? ""),
    createdAt,
    updatedAt,
    closedAt: issue.closedAt ? requiredIsoTimestamp(issue.closedAt, "closedAt", number) : null,
    labels: normalizeStringArray(issue.labels),
    assignees: normalizeStringArray(issue.assignees),
    milestone: optionalString(issue.milestone),
    commentsCount: Math.max(0, Number(issue.commentsCount) || 0),
    locked: Boolean(issue.locked),
  };
}

function normalizeComment(comment) {
  const githubId = String(comment.githubId ?? "").trim();
  const issueNumber = normalizeIssueNumber(comment.issueNumber);
  const url = String(comment.url ?? "").trim();
  if (!githubId || !url) {
    throw new Error(`GitHub Issue comment for #${issueNumber} is missing an ID or URL.`);
  }
  return {
    githubId,
    nodeId: String(comment.nodeId ?? ""),
    issueNumber,
    url,
    author: String(comment.author ?? ""),
    body: String(comment.body ?? ""),
    createdAt: requiredIsoTimestamp(comment.createdAt, "createdAt", `comment ${githubId}`),
    updatedAt: requiredIsoTimestamp(comment.updatedAt, "updatedAt", `comment ${githubId}`),
  };
}

function issueSearchText(issue) {
  return [
    issue.title,
    issue.body,
    issue.author,
    issue.labels.join(" "),
    issue.assignees.join(" "),
    issue.milestone ?? "",
  ].join("\n");
}

function issueSummaryRow(row) {
  return {
    repository: String(row.repository),
    number: Number(row.number),
    title: String(row.title),
    state: String(row.state),
    stateReason: optionalString(row.state_reason),
    labels: parseStringArray(row.labels_json),
    assignees: parseStringArray(row.assignees_json),
    author: String(row.author),
    commentsCount: Number(row.comments_count ?? 0),
    indexedCommentsCount: Number(row.indexed_comments_count ?? 0),
    updatedAt: String(row.updated_at),
    url: String(row.url),
    excerpt: bodyExcerpt(row.body),
  };
}

function commentRow(row) {
  return {
    githubId: String(row.github_id),
    nodeId: String(row.node_id),
    url: String(row.url),
    author: String(row.author),
    body: String(row.body),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function issueDetailRow(row) {
  return {
    ...issueSummaryRow(row),
    githubId: String(row.github_id),
    nodeId: String(row.node_id),
    body: String(row.body),
    createdAt: String(row.created_at),
    closedAt: optionalString(row.closed_at),
    milestone: optionalString(row.milestone),
    locked: Boolean(row.locked),
    syncedAt: String(row.synced_at),
  };
}

function repositoryRow(row) {
  return {
    host: String(row.host),
    account: String(row.account_login),
    repository: String(row.repository),
    repositoryUrl: String(row.repository_url),
    hasSnapshot: Boolean(row.last_synced_at),
    lastSyncedAt: optionalString(row.last_synced_at),
    syncCursor: optionalString(row.sync_cursor),
    lastFullSyncAt: optionalString(row.last_full_sync_at),
    issueCount: Number(row.issue_count ?? 0),
    commentCount: Number(row.comment_count ?? 0),
    lastApiPages: Number(row.last_api_pages ?? 0),
    lastCommentApiPages: Number(row.last_comment_api_pages ?? 0),
    lastFullApiPages: Number(row.last_full_api_pages ?? 0),
    lastFullCommentApiPages: Number(row.last_full_comment_api_pages ?? 0),
    lastSyncAttemptAt: optionalString(row.last_sync_attempt_at),
    lastSyncErrorAt: optionalString(row.last_sync_error_at),
    lastSyncErrorCode: optionalString(row.last_sync_error_code),
    lastSyncErrorMessage: optionalString(row.last_sync_error_message),
  };
}

function parseSearchTerms(query) {
  const rawTerms = String(query ?? "").split(/\s+/u).filter(Boolean);
  let number = null;
  const terms = [];
  for (const term of rawTerms) {
    const match = term.match(/^#(\d+)$/u);
    if (match && number === null) {
      number = normalizeIssueNumber(match[1]);
      continue;
    }
    terms.push(term);
  }
  if (rawTerms.length === 1 && /^\d+$/u.test(rawTerms[0])) {
    return { number: normalizeIssueNumber(rawTerms[0]), terms: [] };
  }
  return { number, terms };
}

function fuzzySearchRows(database, { clauses, parameters, terms }) {
  const fragments = fuzzySearchFragments(terms);
  if (fragments.length === 0) {
    return [];
  }
  const fuzzyParameters = Object.fromEntries(
    Object.entries(parameters).filter(([parameter]) => !/^\$(?:match|term\d+)$/u.test(parameter)),
  );
  const matches = fragments.map((fragment, index) => {
    const parameter = `$fuzzy${index}`;
    fuzzyParameters[parameter] = `%${escapeLike(fragment)}%`;
    return `(
      i.search_text LIKE ${parameter} ESCAPE '\\'
      OR EXISTS (
        SELECT 1
        FROM comments AS matching_comment
        WHERE matching_comment.host = i.host
          AND matching_comment.account_login = i.account_login
          AND matching_comment.repository = i.repository
          AND matching_comment.issue_number = i.number
          AND (
            matching_comment.body LIKE ${parameter} ESCAPE '\\'
            OR matching_comment.author LIKE ${parameter} ESCAPE '\\'
          )
      )
    )`;
  });
  const matchScore = matches.map((match) => `CASE WHEN ${match} THEN 1 ELSE 0 END`).join(" + ");
  return database.prepare(`
    SELECT
      i.*,
      (${matchScore}) AS search_rank,
      (
        SELECT COUNT(*)
        FROM comments AS indexed_comment
        WHERE indexed_comment.host = i.host
          AND indexed_comment.account_login = i.account_login
          AND indexed_comment.repository = i.repository
          AND indexed_comment.issue_number = i.number
      ) AS indexed_comments_count
    FROM issues AS i
    WHERE ${clauses.join("\n      AND ")}
      AND (${matches.join(" OR ")})
    ORDER BY
      search_rank DESC,
      CASE i.state WHEN 'open' THEN 0 ELSE 1 END,
      i.updated_at DESC,
      i.repository ASC,
      i.number DESC
    LIMIT $limit
  `).all(fuzzyParameters);
}

function fuzzySearchFragments(terms, maximum = 24) {
  const fragments = [];
  const add = (fragment) => {
    if (fragment && !fragments.includes(fragment) && fragments.length < maximum) {
      fragments.push(fragment);
    }
  };
  for (const term of terms) {
    for (const hanRun of String(term).match(/\p{Script=Han}+/gu) ?? []) {
      const characters = [...hanRun];
      if (characters.length <= 2) {
        add(hanRun);
        continue;
      }
      for (let index = 0; index < characters.length - 1; index += 1) {
        add(`${characters[index]}${characters[index + 1]}`);
      }
    }
    const nonHan = String(term).replace(/\p{Script=Han}+/gu, " ");
    for (const token of nonHan.match(/[\p{L}\p{N}]+/gu) ?? []) {
      if ([...token].length >= 2 || /^\d+$/u.test(token)) {
        add(token);
      }
    }
  }
  return fragments;
}

function bodyExcerpt(value, maxLength = 240) {
  const normalized = String(value ?? "").replace(/\s+/gu, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1)}…`;
}

function normalizeHost(value) {
  const host = String(value ?? "github.com").trim().toLowerCase();
  if (!host || /[\s/]/u.test(host)) {
    throw new Error(`Invalid GitHub host: ${value}`);
  }
  return host;
}

function normalizeAccount(value) {
  const account = String(value ?? "").trim();
  if (!account) {
    throw new Error("A GitHub account is required for the local Issues index.");
  }
  return account.toLowerCase();
}

function normalizeRepository(value) {
  const repository = String(value ?? "").trim().replace(/\.git$/iu, "").toLowerCase();
  if (!/^[^/\s]+\/[^/\s]+$/u.test(repository)) {
    throw new Error(`Invalid GitHub repository: ${value}`);
  }
  return repository;
}

function normalizeStateFilter(value) {
  const state = String(value ?? "open").trim().toLowerCase();
  if (!["open", "closed", "all"].includes(state)) {
    throw new Error(`Invalid Issue state: ${value}. Use open, closed, or all.`);
  }
  return state;
}

function normalizeLimit(value) {
  const limit = Number(value ?? 20);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Issue search limit must be an integer from 1 to 100.");
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

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return [...new Set(value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean))];
}

function parseStringArray(value) {
  try {
    return normalizeStringArray(JSON.parse(String(value ?? "[]")));
  } catch {
    return [];
  }
}

function requiredIsoTimestamp(value, field, subject) {
  const timestamp = String(value ?? "").trim();
  if (!timestamp || Number.isNaN(Date.parse(timestamp))) {
    const label = typeof subject === "number" ? `GitHub Issue #${subject}` : String(subject);
    throw new Error(`${label} has an invalid ${field} timestamp.`);
  }
  return new Date(timestamp).toISOString();
}

function optionalString(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function escapeLike(value) {
  return String(value).replace(/[\\%_]/gu, (character) => `\\${character}`);
}
