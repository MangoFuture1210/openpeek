import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";

import {
  configuredGithubIssueRepository,
  defaultGithubIssuesRepositoryConfigPath,
  loadGithubIssuesRepositoryConfig,
  requireConfiguredGithubIssueRepository,
  writeGithubIssuesRepositoryConfig,
} from "../src/server/github-issues-repositories.mjs";

test("defaultGithubIssuesRepositoryConfigPath stays outside Git repositories", () => {
  assert.equal(
    defaultGithubIssuesRepositoryConfigPath({
      platform: "darwin",
      homeDir: "/Users/example",
      env: {},
    }),
    "/Users/example/Library/Application Support/OpenGlance/github-issues-repositories.json",
  );
  assert.throws(
    () => defaultGithubIssuesRepositoryConfigPath({
      env: { OPENGLANCE_GITHUB_ISSUES_REPOSITORIES_FILE: "relative.json" },
    }),
    /must be an absolute path/u,
  );
});

test("repository config supports a read-only environment allowlist", async () => {
  const config = await loadGithubIssuesRepositoryConfig({
    env: {
      OPENGLANCE_GITHUB_ISSUES_REPOSITORIES: "Example/Docs, example/App example/docs",
    },
  });
  assert.equal(config.source, "environment");
  assert.deepEqual(config.repositories, ["example/docs", "example/app"]);
});

test("repository config writes atomically with private file permissions", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "openglance-issues-repositories-"));
  const configPath = path.join(root, "nested", "repositories.json");
  try {
    const written = await writeGithubIssuesRepositoryConfig({
      repositories: ["Example/Docs", "Example/App"],
      configPath,
      env: {},
    });
    assert.deepEqual(written.repositories, ["example/docs", "example/app"]);
    assert.deepEqual(
      await loadGithubIssuesRepositoryConfig({ configPath, env: {} }),
      {
        source: "file",
        configPath,
        repositories: ["example/docs", "example/app"],
      },
    );
    if (process.platform !== "win32") {
      assert.equal((await stat(configPath)).mode & 0o777, 0o600);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("repository config cannot be read from or written into a Git worktree", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "openglance-issues-config-worktree-"));
  const configPath = path.join(root, "private", "repositories.json");
  try {
    await mkdir(path.join(root, ".git"));
    await assert.rejects(
      () => writeGithubIssuesRepositoryConfig({
        repositories: ["example/docs"],
        configPath,
        env: {},
      }),
      (error) => error.code === "GITHUB_ISSUES_PATH_IN_WORKTREE",
    );
    await assert.rejects(
      () => loadGithubIssuesRepositoryConfig({ configPath, env: {} }),
      (error) => error.code === "GITHUB_ISSUES_PATH_IN_WORKTREE",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("repository selection accepts a unique short name and rejects anything outside scope", () => {
  const repositories = ["example/docs", "example/app"];
  assert.equal(configuredGithubIssueRepository(repositories, "docs").repository, "example/docs");
  assert.equal(
    requireConfiguredGithubIssueRepository(repositories, "Example/App").repository,
    "example/app",
  );
  assert.throws(
    () => requireConfiguredGithubIssueRepository(repositories, "someone/other"),
    /outside the configured GitHub Issues scope/u,
  );
});

test("repository scope rejects malformed identities and more than fifty repositories", async () => {
  await assert.rejects(
    () => loadGithubIssuesRepositoryConfig({
      env: { OPENGLANCE_GITHUB_ISSUES_REPOSITORIES: "example/docs someone/repo?command=1" },
    }),
    /Invalid GitHub repository/u,
  );
  await assert.rejects(
    () => loadGithubIssuesRepositoryConfig({
      env: {
        OPENGLANCE_GITHUB_ISSUES_REPOSITORIES: Array.from(
          { length: 51 },
          (_, index) => `example/repo-${index}`,
        ).join(","),
      },
    }),
    /at most 50 repositories/u,
  );
});
