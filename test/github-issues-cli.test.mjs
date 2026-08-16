import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import {
  parseGithubIssuesArgs,
  runGithubIssuesCli,
} from "../src/server/github-issues-cli.mjs";
import { openGithubIssuesStore } from "../src/server/github-issues-store.mjs";
import { syncGithubIssueRepositories } from "../src/server/github-issues-service.mjs";

const execFileAsync = promisify(execFile);
const TEST_REPOSITORIES = ["example/docs", "example/app", "example/service"];

test("parseGithubIssuesArgs supports a configured multi-repository sync", () => {
  assert.deepEqual(
    parseGithubIssuesArgs(["sync", "--all", "--full", "--json"]),
    {
      command: "sync",
      repository: "",
      account: "",
      json: true,
      full: true,
      all: true,
      state: "open",
      limit: 20,
    },
  );
  assert.throws(
    () => parseGithubIssuesArgs(["sync", "--all", "--repo", "docs"]),
    /either --repo or --all/u,
  );
});

test("runGithubIssuesCli searches only configured local snapshots and reports partial coverage", async () => {
  const fixture = await databaseFixture();
  try {
    await seedRepository(fixture.databasePath, "example/docs", 31, {
      title: "Agent 本地索引",
      comment: "网络查询摩擦应该被消除。",
    });
    await seedRepository(fixture.databasePath, "example/app", 32, {
      title: "Unrelated task",
    });
    const lines = [];
    await runGithubIssuesCli(
      ["search", "网络查询", "--all", "--account", "alice", "--json"],
      {
        openStore: () => openGithubIssuesStore({ databasePath: fixture.databasePath }),
        loadRepositoryConfig: configuredTestRepositories,
        commandRunner: async () => {
          throw new Error("Offline search must not invoke git or gh.");
        },
        stdout: (line) => lines.push(line),
        now: () => new Date("2026-08-16T03:00:00Z"),
      },
    );

    const payload = JSON.parse(lines[0]);
    assert.equal(payload.command, "search");
    assert.equal(payload.authority.system, "github");
    assert.equal(payload.authority.localMissIsAuthoritative, false);
    assert.equal(payload.scope.coverage, "partial");
    assert.equal(payload.scope.expectedRepositoryCount, 3);
    assert.equal(payload.scope.snapshotRepositoryCount, 2);
    assert.deepEqual(payload.issues.map((issue) => issue.number), [31]);
    assert.equal(payload.issues[0].indexedCommentsCount, 1);
  } finally {
    await fixture.close();
  }
});

test("runGithubIssuesCli rejects repositories outside the configured scope", async () => {
  const fixture = await databaseFixture();
  try {
    await seedRepository(fixture.databasePath, "example/docs", 1);
    await assert.rejects(
      () => runGithubIssuesCli(
        ["search", "task", "--repo", "someone/other", "--account", "alice", "--json"],
        {
          openStore: () => openGithubIssuesStore({ databasePath: fixture.databasePath }),
          loadRepositoryConfig: configuredTestRepositories,
          stdout: () => {},
        },
      ),
      /outside the configured GitHub Issues scope/u,
    );
  } finally {
    await fixture.close();
  }
});

test("runGithubIssuesCli isolates one repository failure during sync --all", async () => {
  const store = await openGithubIssuesStore({ databasePath: ":memory:" });
  const lines = [];
  const commandRunner = async (command, args) => {
    if (command === "gh" && args[0] === "auth") {
      return {
        stdout: JSON.stringify({
          hosts: { "github.com": [{ active: true, state: "success", login: "alice" }] },
        }),
        stderr: "",
      };
    }
    if (command === "gh" && args.includes("rate_limit")) {
      return {
        stdout: JSON.stringify({
          resources: {
            core: { limit: 5000, used: 50, remaining: 4950, reset: 1_786_838_400 },
          },
        }),
        stderr: "",
      };
    }
    const route = args.find((argument) => String(argument).startsWith("repos/"));
    if (route?.includes("example/service") && route.endsWith("/issues")) {
      const error = new Error("network unavailable");
      error.externalCommandState = "network_unavailable";
      throw error;
    }
    if (route?.endsWith("/issues/comments")) {
      return { stdout: "[[]]", stderr: "" };
    }
    if (route?.endsWith("/issues")) {
      const repository = route.slice("repos/".length, -"/issues".length);
      return {
        stdout: JSON.stringify([[apiIssue(repository, 1)]]),
        stderr: "",
      };
    }
    throw new Error(`Unexpected command: ${command} ${args.join(" ")}`);
  };

  await runGithubIssuesCli(["sync", "--all", "--json"], {
    openStore: async () => store,
    loadRepositoryConfig: configuredTestRepositories,
    commandRunner,
    stdout: (line) => lines.push(line),
    now: () => new Date("2026-08-16T04:00:00Z"),
  });

  const payload = JSON.parse(lines[0]);
  assert.equal(payload.sync.status, "partial");
  assert.equal(payload.sync.completedRepositories, 2);
  assert.equal(payload.sync.failedRepositories, 1);
  assert.equal(payload.sync.repositories[2].repository, "example/service");
  assert.equal(payload.sync.repositories[2].failed, true);
});

test("sync --all has one account-wide writer across repositories", async () => {
  const store = await openGithubIssuesStore({ databasePath: ":memory:" });
  const lease = store.acquireSyncCoordinatorLease({
    account: "alice",
    acquiredAt: "2026-08-16T03:59:00Z",
  });
  let apiCalls = 0;
  try {
    const result = await syncGithubIssueRepositories({
      store,
      account: "alice",
      repositories: TEST_REPOSITORIES,
      commandRunner: async () => {
        apiCalls += 1;
        throw new Error("A competing sync must not reach GitHub.");
      },
      now: () => new Date("2026-08-16T04:00:00Z"),
    });
    assert.equal(result.status, "sync_in_progress");
    assert.equal(result.inProgressRepositories, 3);
    assert.equal(result.apiRequests, 0);
    assert.equal(apiCalls, 0);
  } finally {
    store.releaseSyncCoordinatorLease({ account: "alice", token: lease.token });
    store.close();
  }
});

test("sync --all stops before GitHub when its coordinator lease is lost", async () => {
  const store = await openGithubIssuesStore({ databasePath: ":memory:" });
  store.renewSyncCoordinatorLease = () => null;
  let apiCalls = 0;
  try {
    const result = await syncGithubIssueRepositories({
      store,
      account: "alice",
      repositories: TEST_REPOSITORIES,
      commandRunner: async () => {
        apiCalls += 1;
        throw new Error("A process without the coordinator lease must not reach GitHub.");
      },
      now: () => new Date("2026-08-16T04:00:00Z"),
    });
    assert.equal(result.status, "sync_in_progress");
    assert.equal(result.completedRepositories, 0);
    assert.equal(result.inProgressRepositories, 3);
    assert.equal(apiCalls, 0);
  } finally {
    store.close();
  }
});

test("sync --all stops the batch when estimated cost would consume the safety reserve", async () => {
  const store = await openGithubIssuesStore({ databasePath: ":memory:" });
  const lines = [];
  let rateChecks = 0;
  const commandRunner = async (_command, args) => {
    if (args[0] === "auth") {
      return {
        stdout: JSON.stringify({
          hosts: { "github.com": [{ active: true, state: "success", login: "alice" }] },
        }),
        stderr: "",
      };
    }
    if (args.includes("rate_limit")) {
      rateChecks += 1;
      return {
        stdout: JSON.stringify({
          resources: {
            core: { limit: 5000, used: 3950, remaining: 1050, reset: 1_786_838_400 },
          },
        }),
        stderr: "",
      };
    }
    throw new Error("Repository pages must not be requested below the estimated budget gate.");
  };

  await runGithubIssuesCli(["sync", "--all", "--json"], {
    openStore: async () => store,
    loadRepositoryConfig: configuredTestRepositories,
    commandRunner,
    stdout: (line) => lines.push(line),
    now: () => new Date("2026-08-16T04:00:00Z"),
  });
  const payload = JSON.parse(lines[0]);
  assert.equal(payload.sync.status, "partial_rate_budget");
  assert.equal(payload.sync.failedRepositories, 1);
  assert.equal(payload.sync.deferredRepositories, 2);
  assert.equal(payload.sync.apiRequests, 0);
  assert.equal(rateChecks, 1);
});

test("the top-level openglance CLI routes offline Issues status without starting a server", async () => {
  const fixture = await databaseFixture();
  try {
    await seedRepository(fixture.databasePath, "example/docs", 44);
    const { stdout } = await execFileAsync(
      process.execPath,
      ["src/cli.mjs", "issues", "status", "--all", "--account", "alice", "--json"],
      {
        cwd: path.resolve("."),
        env: {
          ...process.env,
          OPENGLANCE_GITHUB_ISSUES_DB: fixture.databasePath,
          OPENGLANCE_GITHUB_ISSUES_REPOSITORIES: TEST_REPOSITORIES.join(","),
        },
      },
    );
    const payload = JSON.parse(stdout);
    assert.equal(payload.command, "status");
    assert.equal(payload.repositories.length, 3);
    assert.equal(payload.repositories[0].hasSnapshot, true);
  } finally {
    await fixture.close();
  }
});

test("a Unix npm-style bin symlink executes the top-level Issues CLI", {
  skip: process.platform === "win32",
}, async () => {
  const fixture = await databaseFixture();
  try {
    await seedRepository(fixture.databasePath, "example/docs", 45);
    const linkedCli = path.join(fixture.root, "openglance");
    await symlink(path.resolve("src/cli.mjs"), linkedCli);
    const { stdout } = await execFileAsync(
      linkedCli,
      ["issues", "status", "--all", "--account", "alice", "--json"],
      {
        cwd: path.resolve("."),
        env: {
          ...process.env,
          OPENGLANCE_GITHUB_ISSUES_DB: fixture.databasePath,
          OPENGLANCE_GITHUB_ISSUES_REPOSITORIES: TEST_REPOSITORIES.join(","),
        },
      },
    );
    const payload = JSON.parse(stdout);
    assert.equal(payload.command, "status");
    assert.equal(payload.repositories[0].issueCount, 1);
  } finally {
    await fixture.close();
  }
});

async function seedRepository(databasePath, repository, number, {
  title = `Issue ${number}`,
  comment = "",
} = {}) {
  const store = await openGithubIssuesStore({ databasePath });
  try {
    store.syncRepository({
      account: "alice",
      repository,
      syncedAt: "2026-08-16T02:00:00Z",
      syncCursor: "2026-08-16T02:00:00Z",
      full: true,
      apiPages: 1,
      commentApiPages: comment ? 1 : 0,
      issues: [{
        number,
        githubId: String(1000 + number),
        nodeId: `I_${number}`,
        url: `https://github.com/${repository}/issues/${number}`,
        state: "open",
        title,
        body: "Issue body",
        author: "reporter",
        createdAt: "2026-08-15T00:00:00Z",
        updatedAt: "2026-08-16T01:00:00Z",
        labels: ["agent"],
        assignees: [],
        commentsCount: comment ? 1 : 0,
      }],
      comments: comment ? [{
        githubId: String(9000 + number),
        nodeId: `IC_${number}`,
        issueNumber: number,
        url: `https://github.com/${repository}/issues/${number}#issuecomment-${9000 + number}`,
        author: "reviewer",
        body: comment,
        createdAt: "2026-08-16T01:10:00Z",
        updatedAt: "2026-08-16T01:10:00Z",
      }] : [],
    });
  } finally {
    store.close();
  }
}

async function configuredTestRepositories() {
  return {
    source: "test",
    configPath: null,
    repositories: [...TEST_REPOSITORIES],
  };
}

function apiIssue(repository, number) {
  return {
    id: 1000 + number,
    node_id: `I_${number}`,
    html_url: `https://github.com/${repository}/issues/${number}`,
    number,
    state: "open",
    title: `Issue ${number}`,
    body: "Body",
    user: { login: "reporter" },
    labels: [],
    assignees: [],
    comments: 0,
    locked: false,
    created_at: "2026-08-15T00:00:00Z",
    updated_at: "2026-08-16T01:00:00Z",
    closed_at: null,
  };
}

async function databaseFixture() {
  const root = await mkdtemp(path.join(tmpdir(), "openglance-issues-cli-"));
  const databasePath = path.join(root, "issues.sqlite");
  return {
    root,
    databasePath,
    async close() {
      await rm(root, { recursive: true, force: true });
    },
  };
}
