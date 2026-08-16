import { lstat, realpath } from "node:fs/promises";
import path from "node:path";

export async function assertGithubIssuesPrivatePathOutsideWorktree(
  filePath,
  {
    lstatPath = lstat,
    realpathPath = realpath,
  } = {},
) {
  const resolvedPath = await resolvePotentialPath(filePath, { realpathPath });
  let directory = path.dirname(resolvedPath);
  while (true) {
    try {
      await lstatPath(path.join(directory, ".git"));
      const error = new Error(
        `GitHub Issues private data must stay outside Git worktrees: ${filePath}`,
      );
      error.code = "GITHUB_ISSUES_PATH_IN_WORKTREE";
      throw error;
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
    const parent = path.dirname(directory);
    if (parent === directory) {
      return path.resolve(filePath);
    }
    directory = parent;
  }
}

async function resolvePotentialPath(filePath, { realpathPath }) {
  const absolutePath = path.resolve(filePath);
  const missingSegments = [];
  let candidate = absolutePath;
  while (true) {
    try {
      const existingPath = await realpathPath(candidate);
      return path.join(existingPath, ...missingSegments.reverse());
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
    const parent = path.dirname(candidate);
    if (parent === candidate) {
      return absolutePath;
    }
    missingSegments.push(path.basename(candidate));
    candidate = parent;
  }
}
