import assert from "node:assert/strict";
import test from "node:test";

import { openGithubIssuesStore } from "../src/server/github-issues-store.mjs";
import {
  fetchGithubIssueComments,
  fetchGithubIssues,
  estimatedGithubIssueSyncRequests,
  normalizeGithubRepository,
  readGithubRateLimit,
  resolveGithubRepository,
  syncGithubIssues,
} from "../src/server/github-issues-sync.mjs";

test("resolveGithubRepository uses an explicit repository or the local Git origin", async () => {
  assert.equal(normalizeGithubRepository("ExampleOrg/Docs.git"), "exampleorg/docs");
  assert.equal(
    await resolveGithubRepository({
      cwd: "/repo",
      commandRunner: async (command, args, options) => {
        assert.equal(command, "git");
        assert.deepEqual(args, ["remote", "get-url", "origin"]);
        assert.equal(options.cwd, "/repo");
        return { stdout: "git@github.com:ExampleOrg/Docs.git\n", stderr: "" };
      },
    }),
    "exampleorg/docs",
  );
});

test("fetchGithubIssues paginates Issue metadata and excludes pull requests", async () => {
  const calls = [];
  const result = await fetchGithubIssues({
    repository: "example/docs",
    since: "2026-08-16T00:00:00Z",
    commandRunner: async (command, args, options) => {
      calls.push({ command, args, options });
      return {
        stdout: JSON.stringify([[apiIssue({ number: 7 }), {
          ...apiIssue({ number: 8 }),
          pull_request: { url: "https://api.github.com/repos/example/docs/pulls/8" },
        }], [apiIssue({ number: 9, state: "closed" })]]),
        stderr: "",
      };
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, "gh");
  assert.equal(calls[0].args.includes("--paginate"), true);
  assert.equal(calls[0].args.includes("--slurp"), true);
  assert.equal(calls[0].args.includes("since=2026-08-16T00:00:00.000Z"), true);
  assert.equal(calls[0].options.env.GH_PROMPT_DISABLED, "1");
  assert.equal(result.apiPages, 2);
  assert.deepEqual(result.issues.map((issue) => issue.number), [7, 9]);
  assert.equal(result.issues[1].state, "closed");
});

test("fetchGithubIssueComments uses the repository-wide incremental endpoint", async () => {
  const result = await fetchGithubIssueComments({
    repository: "example/docs",
    since: "2026-08-16T00:00:00Z",
    commandRunner: async (_command, args) => {
      assert.equal(args.includes("repos/example/docs/issues/comments"), true);
      assert.equal(args.includes("since=2026-08-16T00:00:00.000Z"), true);
      return {
        stdout: JSON.stringify([[apiComment({ id: 51, issueNumber: 7 })]]),
        stderr: "",
      };
    },
  });
  assert.equal(result.apiPages, 1);
  assert.equal(result.comments[0].issueNumber, 7);
  assert.equal(result.comments[0].body, "Comment body");
});

test("readGithubRateLimit derives a percentage reserve from GitHub's current limit", async () => {
  const result = await readGithubRateLimit({
    commandRunner: async () => ({
      stdout: JSON.stringify({
        resources: { core: { limit: 5000, used: 100, remaining: 4900, reset: 1_786_838_400 } },
      }),
      stderr: "",
    }),
  });
  assert.equal(result.reserve, 1000);
  assert.equal(result.requiredRequests, 0);
  assert.equal(result.allowed, true);

  const insufficient = await readGithubRateLimit({
    requiredRequests: 3901,
    commandRunner: async () => ({
      stdout: JSON.stringify({
        resources: { core: { limit: 5000, used: 100, remaining: 4900, reset: 1_786_838_400 } },
      }),
      stderr: "",
    }),
  });
  assert.equal(insufficient.allowed, false);
});

test("estimatedGithubIssueSyncRequests uses measured pages and a conservative first-full baseline", () => {
  assert.equal(estimatedGithubIssueSyncRequests(null, { full: true }), 100);
  assert.equal(estimatedGithubIssueSyncRequests({
    lastApiPages: 2,
    lastCommentApiPages: 3,
  }), 5);
  assert.equal(estimatedGithubIssueSyncRequests({
    lastFullApiPages: 8,
    lastFullCommentApiPages: 12,
  }, { full: true }), 20);
});

test("syncGithubIssues performs a first full sync then an overlapped incremental sync", async () => {
  const store = await openGithubIssuesStore({ databasePath: ":memory:" });
  const calls = [];
  let apiResponse = [[apiIssue({ number: 21, title: "Initial title" })]];
  let commentResponse = [[apiComment({ id: 91, issueNumber: 21 })]];
  const commandRunner = async (command, args) => {
    calls.push({ command, args });
    if (command === "gh" && args[0] === "auth") {
      return {
        stdout: JSON.stringify({
          hosts: {
            "github.com": [
              { active: true, state: "success", login: "Alice" },
            ],
          },
        }),
        stderr: "",
      };
    }
    if (command === "gh" && args[0] === "api") {
      if (args.includes("rate_limit")) {
        return {
          stdout: JSON.stringify({
            resources: {
              core: { limit: 5000, used: 200, remaining: 4800, reset: 1_786_838_400 },
            },
          }),
          stderr: "",
        };
      }
      if (args.includes("repos/example/docs/issues/comments")) {
        return { stdout: JSON.stringify(commentResponse), stderr: "" };
      }
      return { stdout: JSON.stringify(apiResponse), stderr: "" };
    }
    throw new Error(`Unexpected command: ${command} ${args.join(" ")}`);
  };

  try {
    const first = await syncGithubIssues({
      store,
      repository: "example/docs",
      commandRunner,
      now: () => new Date("2026-08-16T01:00:00Z"),
    });
    assert.equal(first.full, true);
    assert.equal(first.since, null);
    assert.equal(first.issueCount, 1);
    assert.equal(first.commentCount, 1);
    assert.equal(first.account, "alice");
    assert.equal(first.rateLimitBefore.requiredRequests, 100);

    apiResponse = [[apiIssue({
      number: 21,
      title: "Updated title",
      updatedAt: "2026-08-16T01:30:00Z",
    })]];
    commentResponse = [[]];
    const second = await syncGithubIssues({
      store,
      repository: "example/docs",
      commandRunner,
      now: () => new Date("2026-08-16T02:00:00Z"),
    });
    assert.equal(second.full, false);
    assert.equal(second.since, "2026-08-16T00:55:00.000Z");
    assert.equal(second.rateLimitBefore.requiredRequests, 2);
    assert.equal(
      store.show({ account: "alice", repository: "example/docs", number: 21 }).title,
      "Updated title",
    );

    const apiCalls = calls.filter((call) => (
      call.command === "gh"
        && call.args[0] === "api"
        && call.args.includes("repos/example/docs/issues")
    ));
    assert.equal(apiCalls.length, 2);
    assert.equal(apiCalls[0].args.some((argument) => argument.startsWith("since=")), false);
    assert.equal(
      apiCalls[1].args.includes("since=2026-08-16T00:55:00.000Z"),
      true,
    );
  } finally {
    store.close();
  }
});

test("syncGithubIssues clears a private snapshot when GitHub no longer confirms repository access", async () => {
  const store = await openGithubIssuesStore({ databasePath: ":memory:" });
  store.syncRepository({
    account: "alice",
    repository: "example/docs",
    syncedAt: "2026-08-16T00:00:00Z",
    syncCursor: "2026-08-16T00:00:00Z",
    full: true,
    apiPages: 1,
    issues: [{
      number: 9,
      githubId: "1009",
      nodeId: "I_9",
      url: "https://github.com/example/docs/issues/9",
      state: "open",
      title: "Private Issue",
      body: "Sensitive body",
      author: "reporter",
      createdAt: "2026-08-15T00:00:00Z",
      updatedAt: "2026-08-16T00:00:00Z",
    }],
  });
  const commandRunner = async (_command, args) => {
    if (args.includes("rate_limit")) {
      return {
        stdout: JSON.stringify({
          resources: {
            core: { limit: 5000, used: 100, remaining: 4900, reset: 1_786_838_400 },
          },
        }),
        stderr: "",
      };
    }
    const error = new Error("gh api failed");
    error.stderr = "gh: Not Found (HTTP 404)";
    error.code = 1;
    throw error;
  };

  try {
    await assert.rejects(
      () => syncGithubIssues({
        store,
        repository: "example/docs",
        account: "alice",
        commandRunner,
        now: () => new Date("2026-08-16T01:00:00Z"),
      }),
      (error) => error.code === "GITHUB_REPOSITORY_INACCESSIBLE",
    );
    assert.equal(store.show({
      account: "alice",
      repository: "example/docs",
      number: 9,
    }), null);
    const status = store.repositoryStatus({
      account: "alice",
      repository: "example/docs",
    });
    assert.equal(status.hasSnapshot, false);
    assert.equal(status.lastSyncErrorCode, "github_repository_inaccessible");
  } finally {
    store.close();
  }
});

test("a forbidden rate-status preflight never masquerades as repository revocation", async () => {
  const store = await openGithubIssuesStore({ databasePath: ":memory:" });
  store.syncRepository({
    account: "alice",
    repository: "example/docs",
    syncedAt: "2026-08-16T00:00:00Z",
    syncCursor: "2026-08-16T00:00:00Z",
    full: true,
    apiPages: 1,
    issues: [{
      number: 9,
      githubId: "1009",
      nodeId: "I_9",
      url: "https://github.com/example/docs/issues/9",
      state: "open",
      title: "Private Issue",
      body: "Sensitive body",
      author: "reporter",
      createdAt: "2026-08-15T00:00:00Z",
      updatedAt: "2026-08-16T00:00:00Z",
    }],
  });
  const commandRunner = async (_command, args) => {
    assert.equal(args.includes("rate_limit"), true);
    const error = new Error("gh api failed");
    error.stderr = "gh: Forbidden (HTTP 403)";
    error.code = 1;
    throw error;
  };

  try {
    await assert.rejects(
      () => syncGithubIssues({
        store,
        repository: "example/docs",
        account: "alice",
        commandRunner,
        now: () => new Date("2026-08-16T01:00:00Z"),
      }),
      (error) => error.code !== "GITHUB_REPOSITORY_INACCESSIBLE",
    );
    assert.equal(store.show({
      account: "alice",
      repository: "example/docs",
      number: 9,
    }).title, "Private Issue");
    const status = store.repositoryStatus({ account: "alice", repository: "example/docs" });
    assert.equal(status.hasSnapshot, true);
    assert.equal(status.lastSyncErrorCode, "sync_failed");
  } finally {
    store.close();
  }
});

test("syncGithubIssues stops before repository reads when the live rate budget is below reserve", async () => {
  const store = await openGithubIssuesStore({ databasePath: ":memory:" });
  let repositoryRead = false;
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
            core: { limit: 5000, used: 4550, remaining: 450, reset: 1_786_838_400 },
          },
        }),
        stderr: "",
      };
    }
    repositoryRead = true;
    throw new Error(`Unexpected command: ${command} ${args.join(" ")}`);
  };

  try {
    await assert.rejects(
      () => syncGithubIssues({
        store,
        repository: "example/docs",
        commandRunner,
        now: () => new Date("2026-08-16T01:00:00Z"),
      }),
      (error) => error.code === "GITHUB_RATE_BUDGET_LOW",
    );
    assert.equal(repositoryRead, false);
    const status = store.repositoryStatus({ account: "alice", repository: "example/docs" });
    assert.equal(status.hasSnapshot, false);
    assert.equal(status.lastSyncErrorCode, "github_rate_budget_low");
  } finally {
    store.close();
  }
});

function apiIssue({
  number,
  title = `Issue ${number}`,
  state = "open",
  updatedAt = "2026-08-16T00:30:00Z",
} = {}) {
  return {
    id: 1000 + number,
    node_id: `I_${number}`,
    html_url: `https://github.com/example/docs/issues/${number}`,
    number,
    state,
    state_reason: state === "closed" ? "completed" : null,
    title,
    body: "Issue body",
    user: { login: "reporter" },
    labels: [{ name: "agent" }],
    assignees: [{ login: "alice" }],
    milestone: { title: "V0" },
    comments: 3,
    locked: false,
    created_at: "2026-08-15T00:00:00Z",
    updated_at: updatedAt,
    closed_at: state === "closed" ? "2026-08-16T00:40:00Z" : null,
  };
}

function apiComment({ id, issueNumber }) {
  return {
    id,
    node_id: `IC_${id}`,
    issue_url: `https://api.github.com/repos/example/docs/issues/${issueNumber}`,
    html_url: `https://github.com/example/docs/issues/${issueNumber}#issuecomment-${id}`,
    user: { login: "reviewer" },
    body: "Comment body",
    created_at: "2026-08-16T00:10:00Z",
    updated_at: "2026-08-16T00:20:00Z",
  };
}
