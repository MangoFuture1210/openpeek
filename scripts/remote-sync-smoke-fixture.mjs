import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export const REMOTE_SYNC_SMOKE_FILE = "document.md";
export const REMOTE_SYNC_SMOKE_LOCAL_CONTENT = [
  "# Remote merge smoke",
  "",
  "The open document stays stable while repository files update.",
  "",
].join("\n");
export const REMOTE_SYNC_SMOKE_OLD_DIRECTORY = "growth/reports/old-month";
export const REMOTE_SYNC_SMOKE_INTERMEDIATE_DIRECTORY = "growth/reports/middle-month";
export const REMOTE_SYNC_SMOKE_FINAL_DIRECTORY = "growth/reports/final-month";
export const REMOTE_SYNC_SMOKE_REPORT = "report.md";
export const REMOTE_SYNC_SMOKE_IMAGE = "chart.png";
export const REMOTE_SYNC_SMOKE_IMAGE_BYTES = Buffer.from([9, 7, 5, 3, 1]);
export const REMOTE_SYNC_SMOKE_FINAL_REPORT_CONTENT = [
  "# Remote monthly report",
  "",
  "Intermediate metadata.",
  "",
  "Final metadata.",
  "",
].join("\n");
export const REMOTE_SYNC_SMOKE_ACCEPTANCE = [
  "Git Leaf automatically fast-forwards consecutive remote directory moves without a click.",
  "A byte-identical untracked final image is adopted safely; HEAD, index, and working tree",
  "end at the final remote tree with no intermediate files or local changes.",
].join(" ");

export function createRemoteSyncSmokeFixture({
  temporaryRoot = tmpdir(),
  runGit = runGitCommand,
  remoteAhead = true,
} = {}) {
  const root = mkdtempSync(path.join(path.resolve(temporaryRoot), "git-leaf-remote-sync-smoke-"));
  const bare = path.join(root, "remote.git");
  const repoRoot = path.join(root, "repo");
  const coworker = path.join(root, "coworker");
  try {
    mkdirSync(bare, { recursive: true });
    runGit(["init", "--bare", "--initial-branch=main"], bare);
    runGit(["clone", bare, repoRoot], root);
    configureIdentity(repoRoot, runGit);
    writeFileSync(path.join(repoRoot, REMOTE_SYNC_SMOKE_FILE), REMOTE_SYNC_SMOKE_LOCAL_CONTENT, "utf8");
    const oldDirectory = path.join(repoRoot, REMOTE_SYNC_SMOKE_OLD_DIRECTORY);
    mkdirSync(oldDirectory, { recursive: true });
    writeFileSync(path.join(oldDirectory, REMOTE_SYNC_SMOKE_REPORT), "# Remote monthly report\n", "utf8");
    writeFileSync(path.join(oldDirectory, REMOTE_SYNC_SMOKE_IMAGE), REMOTE_SYNC_SMOKE_IMAGE_BYTES);
    runGit(["add", "-A"], repoRoot);
    runGit(["commit", "-m", "Initial smoke fixture"], repoRoot);
    runGit(["push", "-u", "origin", "main"], repoRoot);

    runGit(["clone", bare, coworker], root);
    configureIdentity(coworker, runGit);
    if (remoteAhead) {
      publishRemoteSyncSmokeUpdate({ coworker }, { runGit });
      const localFinalDirectory = path.join(repoRoot, REMOTE_SYNC_SMOKE_FINAL_DIRECTORY);
      mkdirSync(localFinalDirectory, { recursive: true });
      writeFileSync(
        path.join(localFinalDirectory, REMOTE_SYNC_SMOKE_IMAGE),
        REMOTE_SYNC_SMOKE_IMAGE_BYTES,
      );
    }
    return {
      root,
      bare,
      repoRoot,
      coworker,
      file: REMOTE_SYNC_SMOKE_FILE,
      acceptance: REMOTE_SYNC_SMOKE_ACCEPTANCE,
    };
  } catch (error) {
    rmSync(root, { recursive: true, force: true });
    throw error;
  }
}

export function publishRemoteSyncSmokeUpdate(fixture, { runGit = runGitCommand } = {}) {
  const oldDirectory = path.join(fixture.coworker, REMOTE_SYNC_SMOKE_OLD_DIRECTORY);
  const intermediateDirectory = path.join(
    fixture.coworker,
    REMOTE_SYNC_SMOKE_INTERMEDIATE_DIRECTORY,
  );
  const finalDirectory = path.join(fixture.coworker, REMOTE_SYNC_SMOKE_FINAL_DIRECTORY);
  renameSync(oldDirectory, intermediateDirectory);
  runGit(["add", "-A"], fixture.coworker);
  runGit(["commit", "-m", "Move report to intermediate directory"], fixture.coworker);
  runGit(["push", "origin", "main"], fixture.coworker);

  writeFileSync(
    path.join(intermediateDirectory, REMOTE_SYNC_SMOKE_REPORT),
    "# Remote monthly report\n\nIntermediate metadata.\n",
    "utf8",
  );
  runGit(["add", "-A"], fixture.coworker);
  runGit(["commit", "-m", "Update intermediate report metadata"], fixture.coworker);
  runGit(["push", "origin", "main"], fixture.coworker);

  renameSync(intermediateDirectory, finalDirectory);
  writeFileSync(
    path.join(finalDirectory, REMOTE_SYNC_SMOKE_REPORT),
    REMOTE_SYNC_SMOKE_FINAL_REPORT_CONTENT,
    "utf8",
  );
  runGit(["add", "-A"], fixture.coworker);
  runGit(["commit", "-m", "Move report to final directory"], fixture.coworker);
  runGit(["push", "origin", "main"], fixture.coworker);
}

export function verifyRemoteSyncSmokeFixture(fixture) {
  const content = readFileSync(path.join(fixture.repoRoot, REMOTE_SYNC_SMOKE_FILE), "utf8");
  const status = runGitCommand(["status", "--porcelain"], fixture.repoRoot).stdout;
  const localHead = runGitCommand(["rev-parse", "HEAD"], fixture.repoRoot).stdout.trim();
  const remoteHead = runGitCommand(["rev-parse", "main"], fixture.bare).stdout.trim();
  const localIndexTree = runGitCommand(["write-tree"], fixture.repoRoot).stdout.trim();
  const remoteTree = runGitCommand(["rev-parse", "main^{tree}"], fixture.bare).stdout.trim();
  const finalDirectory = path.join(fixture.repoRoot, REMOTE_SYNC_SMOKE_FINAL_DIRECTORY);
  if (content !== REMOTE_SYNC_SMOKE_LOCAL_CONTENT) {
    throw new Error("Remote sync smoke unexpectedly changed the open document.");
  }
  if (status !== "") {
    throw new Error(`Remote sync smoke left an unexpected Git status: ${status || "<clean>"}`);
  }
  if (localHead !== remoteHead) {
    throw new Error("Remote sync smoke did not advance the local branch to the remote commit.");
  }
  if (localIndexTree !== remoteTree) {
    throw new Error("Remote sync smoke left the index different from the final remote tree.");
  }
  if (
    existsSync(path.join(fixture.repoRoot, REMOTE_SYNC_SMOKE_OLD_DIRECTORY))
    || existsSync(path.join(fixture.repoRoot, REMOTE_SYNC_SMOKE_INTERMEDIATE_DIRECTORY))
  ) {
    throw new Error("Remote sync smoke left an old or intermediate directory behind.");
  }
  if (
    readFileSync(path.join(finalDirectory, REMOTE_SYNC_SMOKE_REPORT), "utf8")
    !== REMOTE_SYNC_SMOKE_FINAL_REPORT_CONTENT
  ) {
    throw new Error("Remote sync smoke did not check out the final report version.");
  }
  if (
    !readFileSync(path.join(finalDirectory, REMOTE_SYNC_SMOKE_IMAGE))
      .equals(REMOTE_SYNC_SMOKE_IMAGE_BYTES)
  ) {
    throw new Error("Remote sync smoke changed the byte-identical final image.");
  }
}

export function cleanupRemoteSyncSmokeFixture(fixture) {
  const root = path.resolve(fixture?.root || "");
  const temporaryRoot = path.resolve(tmpdir());
  const relative = path.relative(temporaryRoot, root);
  if (
    relative.startsWith("..")
    || path.isAbsolute(relative)
    || !path.basename(root).startsWith("git-leaf-remote-sync-smoke-")
  ) {
    throw new Error(`Refusing to clean an unexpected remote sync smoke fixture: ${root}`);
  }
  rmSync(root, { recursive: true, force: true });
}

function configureIdentity(repoRoot, runGit) {
  runGit(["config", "user.name", "Git Leaf Smoke"], repoRoot);
  runGit(["config", "user.email", "smoke@git-leaf.invalid"], repoRoot);
}

function runGitCommand(args, cwd) {
  const result = spawnSync("git", args, { cwd, stdio: "pipe", encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || `git ${args.join(" ")} failed`);
  }
  return result;
}
