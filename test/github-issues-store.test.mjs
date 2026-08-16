import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  defaultGithubIssuesDatabasePath,
  openGithubIssuesStore,
} from "../src/server/github-issues-store.mjs";

test("defaultGithubIssuesDatabasePath uses a discardable per-user cache location", () => {
  assert.equal(
    defaultGithubIssuesDatabasePath({
      platform: "darwin",
      homeDir: "/Users/example",
      env: {},
    }),
    "/Users/example/Library/Caches/OpenGlance/github-issues.sqlite",
  );
  assert.equal(
    defaultGithubIssuesDatabasePath({
      platform: "linux",
      homeDir: "/home/example",
      env: { XDG_CACHE_HOME: "/cache/example" },
    }),
    "/cache/example/openglance/github-issues.sqlite",
  );
  assert.throws(
    () => defaultGithubIssuesDatabasePath({ env: { OPENGLANCE_GITHUB_ISSUES_DB: "relative.db" } }),
    /must be an absolute path/u,
  );
});

test("openGithubIssuesStore refuses to create private cache data inside a Git worktree", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "openglance-issues-worktree-"));
  try {
    await mkdir(path.join(root, ".git"));
    await assert.rejects(
      () => openGithubIssuesStore({ databasePath: path.join(root, "cache", "issues.sqlite") }),
      (error) => error.code === "GITHUB_ISSUES_PATH_IN_WORKTREE",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("GithubIssuesStore searches Chinese and English metadata without a network dependency", async () => {
  const fixture = await storeFixture();
  try {
    fixture.store.syncRepository({
      account: "Alice",
      repository: "ExampleOrg/Docs",
      syncedAt: "2026-08-16T01:00:00Z",
      syncCursor: "2026-08-16T01:00:00Z",
      full: true,
      apiPages: 1,
      issues: [
        issue({
          number: 11,
          title: "修复网络连接摩擦",
          body: "Agent 应该优先读取 local issue index。",
          labels: ["agent", "性能"],
          assignees: ["alice"],
        }),
        issue({
          number: 12,
          title: "Document the offline query contract",
          body: "A local miss is not authoritative.",
          state: "closed",
          updatedAt: "2026-08-15T08:00:00Z",
        }),
      ],
      comments: [
        {
          githubId: "9001",
          nodeId: "IC_9001",
          issueNumber: 11,
          url: "https://github.com/exampleorg/docs/issues/11#issuecomment-9001",
          author: "reviewer",
          body: "数据库锁可以避免多个 Agent 重复同步。",
          createdAt: "2026-08-16T00:40:00Z",
          updatedAt: "2026-08-16T00:40:00Z",
        },
      ],
    });

    assert.deepEqual(
      fixture.store.search({
        account: "alice",
        repository: "exampleorg/docs",
        query: "网络",
      }).map((candidate) => candidate.number),
      [11],
    );
    assert.deepEqual(
      fixture.store.search({
        account: "alice",
        repository: "exampleorg/docs",
        query: "数据库",
      }).map((candidate) => candidate.number),
      [11],
    );
    assert.deepEqual(
      fixture.store.search({
        account: "alice",
        repository: "exampleorg/docs",
        query: "网络连",
      }).map((candidate) => candidate.number),
      [11],
    );
    assert.deepEqual(
      fixture.store.search({
        account: "alice",
        repository: "exampleorg/docs",
        query: "offline contract",
        state: "all",
      }).map((candidate) => candidate.number),
      [12],
    );
    assert.deepEqual(
      fixture.store.search({
        account: "alice",
        repository: "exampleorg/docs",
        query: "#11",
        state: "all",
      }).map((candidate) => candidate.number),
      [11],
    );

    const detail = fixture.store.show({
      account: "alice",
      repository: "exampleorg/docs",
      number: 11,
    });
    assert.equal(detail.body, "Agent 应该优先读取 local issue index。");
    assert.deepEqual(detail.labels, ["agent", "性能"]);
    assert.equal(detail.indexedCommentsCount, 1);
    assert.equal(detail.comments[0].body, "数据库锁可以避免多个 Agent 重复同步。");
    assert.equal(detail.syncedAt, "2026-08-16T01:00:00Z");
  } finally {
    await fixture.close();
  }
});

test("GithubIssuesStore isolates accounts and full sync prunes stale Issues", async () => {
  const fixture = await storeFixture();
  try {
    fixture.store.syncRepository({
      account: "alice",
      repository: "example/docs",
      syncedAt: "2026-08-16T01:00:00Z",
      syncCursor: "2026-08-16T01:00:00Z",
      full: true,
      apiPages: 2,
      issues: [issue({ number: 1 }), issue({ number: 2 })],
    });
    fixture.store.syncRepository({
      account: "bob",
      repository: "example/docs",
      syncedAt: "2026-08-16T01:30:00Z",
      syncCursor: "2026-08-16T01:30:00Z",
      full: true,
      issues: [issue({ number: 3 })],
    });
    const result = fixture.store.syncRepository({
      account: "alice",
      repository: "example/docs",
      syncedAt: "2026-08-16T02:00:00Z",
      syncCursor: "2026-08-16T02:00:00Z",
      full: true,
      apiPages: 1,
      issues: [issue({ number: 2, title: "Updated Issue" })],
    });

    assert.deepEqual(result, {
      stored: 1,
      storedComments: 0,
      removed: 1,
      issueCount: 1,
      commentCount: 0,
    });
    assert.deepEqual(
      fixture.store.search({ account: "alice", repository: "example/docs", state: "all" })
        .map((candidate) => candidate.number),
      [2],
    );
    assert.deepEqual(
      fixture.store.search({ account: "bob", repository: "example/docs", state: "all" })
        .map((candidate) => candidate.number),
      [3],
    );
    assert.equal(
      fixture.store.repositoryStatus({ account: "alice", repository: "example/docs" })
        .lastFullSyncAt,
      "2026-08-16T02:00:00Z",
    );
  } finally {
    await fixture.close();
  }
});

test("GithubIssuesStore sync leases suppress duplicate writers and expire safely", async () => {
  const store = await openGithubIssuesStore({ databasePath: ":memory:" });
  try {
    const first = store.acquireSyncLease({
      account: "alice",
      repository: "example/docs",
      acquiredAt: "2026-08-16T01:00:00Z",
      ttlMs: 60_000,
    });
    assert.equal(Boolean(first?.token), true);
    assert.equal(store.acquireSyncLease({
      account: "alice",
      repository: "example/docs",
      acquiredAt: "2026-08-16T01:00:30Z",
      ttlMs: 60_000,
    }), null);

    const afterExpiration = store.acquireSyncLease({
      account: "alice",
      repository: "example/docs",
      acquiredAt: "2026-08-16T01:01:01Z",
      ttlMs: 60_000,
    });
    assert.equal(Boolean(afterExpiration?.token), true);
    assert.equal(store.releaseSyncLease({
      account: "alice",
      repository: "example/docs",
      token: afterExpiration.token,
    }), true);
  } finally {
    store.close();
  }
});

test("GithubIssuesStore coordinates all repositories for one account and purges inaccessible data", async () => {
  const store = await openGithubIssuesStore({ databasePath: ":memory:" });
  try {
    store.syncRepository({
      account: "alice",
      repository: "example/docs",
      syncedAt: "2026-08-16T01:00:00Z",
      syncCursor: "2026-08-16T01:00:00Z",
      full: true,
      apiPages: 3,
      commentApiPages: 2,
      issues: [issue({ number: 7 })],
    });
    const first = store.acquireSyncCoordinatorLease({
      account: "alice",
      acquiredAt: "2026-08-16T01:01:00Z",
      ttlMs: 60_000,
    });
    assert.equal(Boolean(first?.token), true);
    assert.equal(store.acquireSyncCoordinatorLease({
      account: "alice",
      acquiredAt: "2026-08-16T01:01:30Z",
      ttlMs: 60_000,
    }), null);
    const renewed = store.renewSyncCoordinatorLease({
      account: "alice",
      token: first.token,
      renewedAt: "2026-08-16T01:02:00Z",
      ttlMs: 60_000,
    });
    assert.equal(renewed.expiresAt, "2026-08-16T01:03:00.000Z");
    assert.equal(store.renewSyncCoordinatorLease({
      account: "alice",
      token: "not-the-owner",
      renewedAt: "2026-08-16T01:02:30Z",
      ttlMs: 60_000,
    }), null);
    assert.equal(Boolean(store.acquireSyncCoordinatorLease({
      account: "bob",
      acquiredAt: "2026-08-16T01:01:30Z",
      ttlMs: 60_000,
    })?.token), true);
    assert.equal(store.releaseSyncCoordinatorLease({
      account: "alice",
      token: first.token,
    }), true);

    assert.deepEqual(store.purgeRepository({
      account: "alice",
      repository: "example/docs",
    }), { removedIssues: 1 });
    assert.equal(store.repositoryStatus({
      account: "alice",
      repository: "example/docs",
    }), null);
    assert.deepEqual(store.search({
      account: "alice",
      repository: "example/docs",
      state: "all",
    }), []);
  } finally {
    store.close();
  }
});

test("GithubIssuesStore migrates schema 1 snapshots without losing repository health", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "openglance-issues-schema-v1-"));
  const databasePath = path.join(root, "issues.sqlite");
  const { DatabaseSync } = await import("node:sqlite");
  const database = new DatabaseSync(databasePath);
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
      last_sync_attempt_at TEXT,
      last_sync_error_at TEXT,
      last_sync_error_code TEXT,
      last_sync_error_message TEXT,
      PRIMARY KEY (host, account_login, repository)
    ) STRICT;
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
      last_comment_api_pages
    ) VALUES (
      'github.com',
      'alice',
      'example/docs',
      'https://github.com/example/docs',
      '2026-08-16T01:00:00.000Z',
      '2026-08-16T01:00:00.000Z',
      '2026-08-16T01:00:00.000Z',
      9,
      4,
      2,
      1
    );
    PRAGMA user_version = 1;
  `);
  database.close();

  const store = await openGithubIssuesStore({ databasePath });
  try {
    const status = store.repositoryStatus({
      account: "alice",
      repository: "example/docs",
    });
    assert.equal(status.issueCount, 9);
    assert.equal(status.commentCount, 4);
    assert.equal(status.lastFullApiPages, 0);
    assert.equal(Boolean(store.acquireSyncCoordinatorLease({
      account: "alice",
      acquiredAt: "2026-08-16T02:00:00Z",
    })?.token), true);
  } finally {
    store.close();
    await rm(root, { recursive: true, force: true });
  }
});

function issue({
  number,
  title = `Issue ${number}`,
  body = "Body",
  state = "open",
  labels = [],
  assignees = [],
  updatedAt = "2026-08-16T00:30:00Z",
} = {}) {
  return {
    number,
    githubId: String(10_000 + number),
    nodeId: `I_${number}`,
    url: `https://github.com/example/docs/issues/${number}`,
    state,
    title,
    body,
    author: "reporter",
    createdAt: "2026-08-15T00:00:00Z",
    updatedAt,
    labels,
    assignees,
    commentsCount: 2,
  };
}

async function storeFixture() {
  const root = await mkdtemp(path.join(tmpdir(), "openglance-issues-store-"));
  const store = await openGithubIssuesStore({
    databasePath: path.join(root, "issues.sqlite"),
  });
  return {
    store,
    async close() {
      store.close();
      await rm(root, { recursive: true, force: true });
    },
  };
}
