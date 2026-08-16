import { chmod, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { assertGithubIssuesPrivatePathOutsideWorktree } from "./github-issues-paths.mjs";
import { canonicalGithubRepositoryIdentity } from "./repositories.mjs";

export const GITHUB_ISSUES_REPOSITORIES_ENV = "OPENGLANCE_GITHUB_ISSUES_REPOSITORIES";
export const GITHUB_ISSUES_REPOSITORIES_FILE_ENV = "OPENGLANCE_GITHUB_ISSUES_REPOSITORIES_FILE";
export const MAX_GITHUB_ISSUES_REPOSITORIES = 50;
const GITHUB_REPOSITORY_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38})\/[a-z0-9._-]{1,100}$/iu;

export function defaultGithubIssuesRepositoryConfigPath({
  env = process.env,
  homeDir = os.homedir(),
  platform = process.platform,
} = {}) {
  const override = String(env[GITHUB_ISSUES_REPOSITORIES_FILE_ENV] ?? "").trim();
  if (override) {
    if (!path.isAbsolute(override)) {
      throw new Error(`${GITHUB_ISSUES_REPOSITORIES_FILE_ENV} must be an absolute path.`);
    }
    return path.normalize(override);
  }
  if (platform === "darwin") {
    return path.join(
      homeDir,
      "Library",
      "Application Support",
      "OpenGlance",
      "github-issues-repositories.json",
    );
  }
  if (platform === "win32") {
    const appData = String(env.APPDATA ?? "").trim()
      || path.join(homeDir, "AppData", "Roaming");
    return path.join(appData, "OpenGlance", "github-issues-repositories.json");
  }
  const configRoot = String(env.XDG_CONFIG_HOME ?? "").trim()
    || path.join(homeDir, ".config");
  return path.join(configRoot, "openglance", "github-issues-repositories.json");
}

export async function loadGithubIssuesRepositoryConfig({
  env = process.env,
  configPath,
} = {}) {
  const environmentValue = String(env[GITHUB_ISSUES_REPOSITORIES_ENV] ?? "").trim();
  if (environmentValue) {
    return {
      source: "environment",
      configPath: null,
      repositories: normalizeRepositoryList(environmentValue.split(/[\s,]+/u)),
    };
  }

  const requestedPath = configPath
    ? path.resolve(configPath)
    : defaultGithubIssuesRepositoryConfigPath({ env });
  const resolvedPath = await assertGithubIssuesPrivatePathOutsideWorktree(requestedPath);
  let payload;
  try {
    payload = JSON.parse(await readFile(resolvedPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return { source: "missing", configPath: resolvedPath, repositories: [] };
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid GitHub Issues repository config JSON: ${resolvedPath}`, {
        cause: error,
      });
    }
    throw error;
  }
  if (payload?.schemaVersion !== 1 || !Array.isArray(payload.repositories)) {
    throw new Error(`Invalid GitHub Issues repository config schema: ${resolvedPath}`);
  }
  return {
    source: "file",
    configPath: resolvedPath,
    repositories: normalizeRepositoryList(payload.repositories),
  };
}

export async function writeGithubIssuesRepositoryConfig({
  repositories,
  configPath,
  env = process.env,
} = {}) {
  if (String(env[GITHUB_ISSUES_REPOSITORIES_ENV] ?? "").trim()) {
    throw new Error(
      `${GITHUB_ISSUES_REPOSITORIES_ENV} is active; remove it before writing the local repository config.`,
    );
  }
  const normalizedRepositories = normalizeRepositoryList(repositories);
  if (normalizedRepositories.length === 0) {
    throw new Error("Configure at least one GitHub Issues repository.");
  }
  const requestedPath = configPath
    ? path.resolve(configPath)
    : defaultGithubIssuesRepositoryConfigPath({ env });
  const resolvedPath = await assertGithubIssuesPrivatePathOutsideWorktree(requestedPath);
  const directory = path.dirname(resolvedPath);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const temporaryPath = `${resolvedPath}.tmp-${process.pid}-${Date.now()}`;
  const contents = `${JSON.stringify({
    schemaVersion: 1,
    repositories: normalizedRepositories,
  }, null, 2)}\n`;
  try {
    await writeFile(temporaryPath, contents, { encoding: "utf8", mode: 0o600, flag: "wx" });
    await rename(temporaryPath, resolvedPath);
    await chmod(resolvedPath, 0o600).catch((error) => {
      if (process.platform !== "win32") {
        throw error;
      }
    });
  } finally {
    await unlink(temporaryPath).catch((error) => {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    });
  }
  return {
    source: "file",
    configPath: resolvedPath,
    repositories: normalizedRepositories,
  };
}

export function configuredGithubIssueRepositories(repositories) {
  return normalizeRepositoryList(repositories).map((repository) => {
    const name = repository.split("/")[1];
    return Object.freeze({ key: name, name, repository });
  });
}

export function configuredGithubIssueRepository(repositories, value) {
  const entries = configuredGithubIssueRepositories(repositories);
  const candidate = String(value ?? "").trim().toLowerCase();
  if (!candidate) {
    return null;
  }
  const identity = normalizeGithubRepository(candidate, { throwOnInvalid: false });
  if (identity) {
    return entries.find((entry) => entry.repository === identity) ?? null;
  }
  const matches = entries.filter((entry) => entry.key.toLowerCase() === candidate);
  return matches.length === 1 ? matches[0] : null;
}

export function requireConfiguredGithubIssueRepository(repositories, value) {
  const configured = configuredGithubIssueRepository(repositories, value);
  if (!configured) {
    throw new Error(
      `Repository ${value || "(unknown)"} is outside the configured GitHub Issues scope. `
      + `Configured repositories: ${configuredRepositoryNames(repositories) || "none"}.`,
    );
  }
  return configured;
}

export function configuredGithubIssueRepositoryIds(repositories) {
  return configuredGithubIssueRepositories(repositories).map((entry) => entry.repository);
}

export function configuredRepositoryNames(repositories) {
  return configuredGithubIssueRepositories(repositories).map((entry) => entry.name).join(", ");
}

function normalizeRepositoryList(repositories) {
  if (!Array.isArray(repositories)) {
    throw new Error("GitHub Issues repositories must be an array.");
  }
  const normalized = repositories.map((repository) => normalizeGithubRepository(repository));
  const unique = [...new Set(normalized)];
  if (unique.length > MAX_GITHUB_ISSUES_REPOSITORIES) {
    throw new Error(
      `GitHub Issues repository scope supports at most ${MAX_GITHUB_ISSUES_REPOSITORIES} repositories.`,
    );
  }
  return unique;
}

function normalizeGithubRepository(value, { throwOnInvalid = true } = {}) {
  const repository = canonicalGithubRepositoryIdentity(value);
  if (GITHUB_REPOSITORY_PATTERN.test(repository)) {
    return repository;
  }
  if (!throwOnInvalid) {
    return "";
  }
  throw new Error(`Invalid GitHub repository: ${value}. Use owner/name.`);
}
