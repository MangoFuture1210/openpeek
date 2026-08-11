import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { publishGitLeafShareLink } from "../src/server/git-share-publish.mjs";
import { runGitSnapshotCommand } from "../src/server/git-immutable-snapshot.mjs";
import {
  applyPreparedRemoteChanges,
  createRemoteMergePreparationStore,
  inspectRemoteSync,
  mergeRemoteChanges,
  prepareRemoteChanges,
} from "../src/server/git-remote-sync.mjs";
import { syncSelectedFiles } from "../src/server/git-sync.mjs";

test("real one-click sync commits and pushes every changed file type", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "git-leaf-real-sync-"));
  const bare = path.join(root, "remote.git");
  const repoRoot = path.join(root, "repo");
  try {
    await mkdir(bare, { recursive: true });
    await git(bare, ["init", "--bare", "--initial-branch=main"]);
    await git(root, ["clone", bare, repoRoot]);
    await configureIdentity(repoRoot);
    await writeFile(path.join(repoRoot, "document.md"), "before\n");
    await writeFile(path.join(repoRoot, "remove.txt"), "remove\n");
    await writeFile(path.join(repoRoot, "rename.txt"), "rename\n");
    await git(repoRoot, ["add", "-A"]);
    await git(repoRoot, ["commit", "-m", "Initial"]);
    await git(repoRoot, ["push", "-u", "origin", "main"]);

    await writeFile(path.join(repoRoot, "document.md"), "after\n");
    await writeFile(path.join(repoRoot, "attachment.bin"), Buffer.from([0, 7, 255]));
    await unlink(path.join(repoRoot, "remove.txt"));
    await rename(path.join(repoRoot, "rename.txt"), path.join(repoRoot, "renamed.txt"));

    const result = await syncSelectedFiles({
      repo: { id: "fixture", root: repoRoot, branch: "main" },
      allChanges: true,
    });

    assert.equal(result.ok, true, result.error);
    assert.equal(result.retryCount, 0);
    assert.equal(result.driftKind, "none");
    assert.equal(result.remainingChanges, false);
    assert.equal((await git(repoRoot, ["status", "--porcelain"])).stdout, "");
    assert.equal((await git(repoRoot, ["rev-parse", "HEAD"])).stdout.trim(), (await git(bare, ["rev-parse", "main"])).stdout.trim());
    assert.equal((await git(bare, ["show", "main:document.md"])).stdout, "after\n");
    assert.deepEqual(
      Buffer.from((await git(bare, ["show", "main:attachment.bin"], { encoding: "buffer" })).stdout),
      Buffer.from([0, 7, 255]),
    );
    await assert.rejects(git(bare, ["cat-file", "-e", "main:remove.txt"]));
    assert.equal((await git(bare, ["show", "main:renamed.txt"])).stdout, "rename\n");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("real first sync can publish an explicit commit object and establish upstream", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "git-leaf-first-sync-"));
  const bare = path.join(root, "remote.git");
  const repoRoot = path.join(root, "repo");
  try {
    await mkdir(repoRoot, { recursive: true });
    await mkdir(bare, { recursive: true });
    await git(repoRoot, ["init", "-b", "main"]);
    await configureIdentity(repoRoot);
    await git(bare, ["init", "--bare", "--initial-branch=main"]);
    await git(repoRoot, ["remote", "add", "origin", bare]);
    await writeFile(path.join(repoRoot, "README.md"), "initial\n");
    await git(repoRoot, ["add", "-A"]);
    await git(repoRoot, ["commit", "-m", "Initial"]);
    await writeFile(path.join(repoRoot, "README.md"), "ready to publish\n");

    const result = await syncSelectedFiles({
      repo: { id: "fixture", root: repoRoot, branch: "main" },
      allChanges: true,
    });

    assert.equal(result.ok, true, result.error);
    assert.equal((await git(repoRoot, ["rev-parse", "--abbrev-ref", "@{upstream}"])).stdout.trim(), "origin/main");
    assert.equal(await readFile(path.join(repoRoot, "README.md"), "utf8"), "ready to publish\n");
    assert.equal((await git(bare, ["show", "main:README.md"])).stdout, "ready to publish\n");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("remote status finds incoming commits and a clean worktree fast-forwards without publishing", async () => {
  const fixture = await createRemoteMergeFixture("git-leaf-clean-remote-merge-");
  try {
    await writeFile(path.join(fixture.coworker, "remote.md"), "remote after\n");
    await commitAndPush(fixture.coworker, "Remote update");

    const status = await inspectRemoteSync({ repo: fixture.repo });
    assert.equal(status.ok, true, status.error);
    assert.equal(status.state, "remote_ahead");
    assert.equal(status.ahead, 0);
    assert.equal(status.behind, 1);
    assert.deepEqual(status.incomingFiles, ["remote.md"]);

    const result = await mergeRemoteChanges({
      repo: fixture.repo,
      allowLocalChanges: false,
    });

    assert.equal(result.ok, true, result.error);
    assert.equal(result.applied, true);
    assert.equal(result.mode, "fast_forward");
    assert.equal(result.localChangeCount, 0);
    assert.equal((await git(fixture.repoRoot, ["status", "--porcelain"])).stdout, "");
    assert.equal(
      (await git(fixture.repoRoot, ["rev-parse", "HEAD"])).stdout.trim(),
      (await git(fixture.bare, ["rev-parse", "main"])).stdout.trim(),
    );
    assert.equal(
      normalizeCheckoutLineEndings(
        await readFile(path.join(fixture.repoRoot, "remote.md"), "utf8"),
      ),
      "remote after\n",
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("automatic remote sync collapses consecutive directory moves into the final clean tree", async () => {
  const fixture = await createRemoteMergeFixture("git-leaf-consecutive-remote-merge-");
  try {
    const oldDirectory = path.join(fixture.repoRoot, "growth", "reports", "old-month");
    const coworkerOldDirectory = path.join(fixture.coworker, "growth", "reports", "old-month");
    await mkdir(oldDirectory, { recursive: true });
    await writeFile(path.join(oldDirectory, "report.md"), "# Monthly report\n");
    await writeFile(path.join(oldDirectory, "chart.png"), Buffer.from([1, 2, 3, 4]));
    await git(fixture.repoRoot, ["add", "-A"]);
    await git(fixture.repoRoot, ["commit", "-m", "Add old monthly report"]);
    await git(fixture.repoRoot, ["push", "origin", "main"]);
    await git(fixture.coworker, ["pull", "--ff-only"]);

    const middleDirectory = path.join(fixture.coworker, "growth", "reports", "middle-month");
    await rename(coworkerOldDirectory, middleDirectory);
    await commitAndPush(fixture.coworker, "Move report to intermediate month");
    await writeFile(
      path.join(middleDirectory, "report.md"),
      "# Monthly report\n\nIntermediate metadata\n",
    );
    await commitAndPush(fixture.coworker, "Update intermediate report metadata");

    const finalDirectory = path.join(fixture.coworker, "growth", "reports", "final-month");
    await rename(middleDirectory, finalDirectory);
    await writeFile(
      path.join(finalDirectory, "report.md"),
      "# Monthly report\n\nIntermediate metadata\n\nFinal metadata\n",
    );
    await commitAndPush(fixture.coworker, "Move report to final month");
    const remoteHead = (await git(fixture.bare, ["rev-parse", "main"])).stdout.trim();

    const result = await mergeRemoteChanges({
      repo: fixture.repo,
      allowLocalChanges: false,
    });

    assert.equal(result.ok, true, result.error);
    assert.equal(result.mode, "fast_forward");
    assert.equal((await git(fixture.repoRoot, ["rev-parse", "HEAD"])).stdout.trim(), remoteHead);
    assert.equal(
      (await git(fixture.repoRoot, ["write-tree"])).stdout.trim(),
      (await git(fixture.repoRoot, ["rev-parse", "HEAD^{tree}"])).stdout.trim(),
    );
    assert.equal((await git(fixture.repoRoot, ["status", "--porcelain"])).stdout, "");
    await assert.rejects(readFile(path.join(oldDirectory, "report.md"), "utf8"));
    await assert.rejects(readFile(
      path.join(fixture.repoRoot, "growth", "reports", "middle-month", "report.md"),
      "utf8",
    ));
    assert.equal(
      normalizeCheckoutLineEndings(await readFile(
        path.join(fixture.repoRoot, "growth", "reports", "final-month", "report.md"),
        "utf8",
      )),
      "# Monthly report\n\nIntermediate metadata\n\nFinal metadata\n",
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("automatic remote sync adopts byte-identical untracked files before fast-forwarding", async () => {
  const fixture = await createRemoteMergeFixture("git-leaf-identical-untracked-merge-");
  try {
    const relativePath = "growth/reports/final/chart.png";
    const bytes = Buffer.from([9, 7, 5, 3, 1]);
    await mkdir(path.dirname(path.join(fixture.coworker, relativePath)), { recursive: true });
    await writeFile(path.join(fixture.coworker, relativePath), bytes);
    await commitAndPush(fixture.coworker, "Add final chart");
    const localHead = (await git(fixture.repoRoot, ["rev-parse", "HEAD"])).stdout.trim();
    const remoteHead = (await git(fixture.bare, ["rev-parse", "main"])).stdout.trim();
    await mkdir(path.dirname(path.join(fixture.repoRoot, relativePath)), { recursive: true });
    await writeFile(path.join(fixture.repoRoot, relativePath), bytes);

    const result = await mergeRemoteChanges({
      repo: fixture.repo,
      allowLocalChanges: false,
    });

    assert.notEqual(localHead, remoteHead);
    assert.equal(result.ok, true, result.error);
    assert.equal(result.mode, "fast_forward");
    assert.equal((await git(fixture.repoRoot, ["rev-parse", "HEAD"])).stdout.trim(), remoteHead);
    assert.equal((await git(fixture.repoRoot, ["status", "--porcelain"])).stdout, "");
    assert.deepEqual(await readFile(path.join(fixture.repoRoot, relativePath)), bytes);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("automatic remote sync resumes after an identical file was staged before interruption", async () => {
  const fixture = await createRemoteMergeFixture("git-leaf-staged-identical-merge-");
  try {
    const relativePath = "growth/reports/final/chart.png";
    const bytes = Buffer.from([2, 4, 6, 8]);
    await mkdir(path.dirname(path.join(fixture.coworker, relativePath)), { recursive: true });
    await writeFile(path.join(fixture.coworker, relativePath), bytes);
    await commitAndPush(fixture.coworker, "Add final chart");
    await git(fixture.repoRoot, ["fetch", "origin"]);
    const remoteBlob = (await git(fixture.repoRoot, [
      "rev-parse",
      `origin/main:${relativePath}`,
    ])).stdout.trim();
    await mkdir(path.dirname(path.join(fixture.repoRoot, relativePath)), { recursive: true });
    await writeFile(path.join(fixture.repoRoot, relativePath), bytes);
    await git(fixture.repoRoot, [
      "update-index",
      "--add",
      "--cacheinfo",
      `100644,${remoteBlob},${relativePath}`,
    ]);
    assert.equal(
      (await git(fixture.repoRoot, ["status", "--porcelain", "--", relativePath])).stdout,
      `A  ${relativePath}\n`,
    );

    const result = await mergeRemoteChanges({
      repo: fixture.repo,
      allowLocalChanges: false,
      refresh: false,
    });

    assert.equal(result.ok, true, result.error);
    assert.equal((await git(fixture.repoRoot, ["status", "--porcelain"])).stdout, "");
    assert.equal(
      (await git(fixture.repoRoot, ["rev-parse", "HEAD"])).stdout.trim(),
      (await git(fixture.bare, ["rev-parse", "main"])).stdout.trim(),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("automatic remote sync preserves a different untracked file and stops before fast-forward", async () => {
  const fixture = await createRemoteMergeFixture("git-leaf-different-untracked-merge-");
  try {
    const relativePath = "growth/reports/final/report.md";
    await mkdir(path.dirname(path.join(fixture.coworker, relativePath)), { recursive: true });
    await writeFile(path.join(fixture.coworker, relativePath), "remote final\n");
    await commitAndPush(fixture.coworker, "Add final report");
    const localHead = (await git(fixture.repoRoot, ["rev-parse", "HEAD"])).stdout.trim();
    await mkdir(path.dirname(path.join(fixture.repoRoot, relativePath)), { recursive: true });
    await writeFile(path.join(fixture.repoRoot, relativePath), "real local draft\n");

    const result = await mergeRemoteChanges({
      repo: fixture.repo,
      allowLocalChanges: false,
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, "local_changes_require_confirmation");
    assert.equal((await git(fixture.repoRoot, ["rev-parse", "HEAD"])).stdout.trim(), localHead);
    assert.equal(await readFile(path.join(fixture.repoRoot, relativePath), "utf8"), "real local draft\n");
    assert.equal(
      (await git(fixture.repoRoot, ["status", "--porcelain", "--", relativePath])).stdout,
      `?? ${relativePath}\n`,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("dirty sparse checkout stops before snapshotting and preserves skip-worktree entries", async () => {
  const fixture = await createRemoteMergeFixture("git-leaf-sparse-dirty-merge-");
  try {
    await mkdir(path.join(fixture.repoRoot, "visible"), { recursive: true });
    await mkdir(path.join(fixture.repoRoot, "archive"), { recursive: true });
    await writeFile(path.join(fixture.repoRoot, "visible", "draft.md"), "visible before\n");
    await writeFile(path.join(fixture.repoRoot, "archive", "hidden.md"), "hidden before\n");
    await git(fixture.repoRoot, ["add", "-A"]);
    await git(fixture.repoRoot, ["commit", "-m", "Add sparse fixture"]);
    await git(fixture.repoRoot, ["push", "origin", "main"]);
    await git(fixture.coworker, ["pull", "--ff-only"]);
    await git(fixture.repoRoot, ["sparse-checkout", "init", "--cone"]);
    await git(fixture.repoRoot, ["sparse-checkout", "set", "visible"]);
    await writeFile(path.join(fixture.repoRoot, "visible", "draft.md"), "local visible draft\n");
    await writeFile(path.join(fixture.coworker, "archive", "hidden.md"), "hidden remote\n");
    await commitAndPush(fixture.coworker, "Update hidden report");
    const localHead = (await git(fixture.repoRoot, ["rev-parse", "HEAD"])).stdout.trim();

    const result = await mergeRemoteChanges({
      repo: fixture.repo,
      allowLocalChanges: true,
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, "sparse_checkout_local_changes");
    assert.equal((await git(fixture.repoRoot, ["rev-parse", "HEAD"])).stdout.trim(), localHead);
    assert.equal(
      await readFile(path.join(fixture.repoRoot, "visible", "draft.md"), "utf8"),
      "local visible draft\n",
    );
    await assert.rejects(readFile(path.join(fixture.repoRoot, "archive", "hidden.md"), "utf8"));
    assert.match(
      (await git(fixture.repoRoot, ["ls-files", "-v", "--", "archive/hidden.md"])).stdout,
      /^S archive\/hidden\.md/,
    );
    assert.equal(
      (await git(fixture.repoRoot, ["status", "--porcelain"])).stdout,
      " M visible/draft.md\n",
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("sparse checkout configuration blocks a dirty merge after a skip-worktree bit is lost", async () => {
  const fixture = await createRemoteMergeFixture("git-leaf-sparse-missing-bit-merge-");
  try {
    await mkdir(path.join(fixture.repoRoot, "visible"), { recursive: true });
    await mkdir(path.join(fixture.repoRoot, "archive"), { recursive: true });
    await writeFile(path.join(fixture.repoRoot, "visible", "draft.md"), "visible before\n");
    await writeFile(path.join(fixture.repoRoot, "archive", "hidden.md"), "hidden before\n");
    await git(fixture.repoRoot, ["add", "-A"]);
    await git(fixture.repoRoot, ["commit", "-m", "Add sparse fixture"]);
    await git(fixture.repoRoot, ["push", "origin", "main"]);
    await git(fixture.coworker, ["pull", "--ff-only"]);
    await git(fixture.repoRoot, ["sparse-checkout", "init", "--cone"]);
    await git(fixture.repoRoot, ["sparse-checkout", "set", "visible"]);
    await git(fixture.repoRoot, [
      "update-index",
      "--no-skip-worktree",
      "archive/hidden.md",
    ]);
    await writeFile(path.join(fixture.coworker, "remote.md"), "remote after\n");
    await commitAndPush(fixture.coworker, "Update remote document");
    const localHead = (await git(fixture.repoRoot, ["rev-parse", "HEAD"])).stdout.trim();
    assert.equal(
      (await git(fixture.repoRoot, ["status", "--porcelain"])).stdout,
      " D archive/hidden.md\n",
    );

    const result = await mergeRemoteChanges({
      repo: fixture.repo,
      allowLocalChanges: true,
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, "sparse_checkout_local_changes");
    assert.equal((await git(fixture.repoRoot, ["rev-parse", "HEAD"])).stdout.trim(), localHead);
    assert.equal(
      (await git(fixture.repoRoot, ["status", "--porcelain"])).stdout,
      " D archive/hidden.md\n",
    );
    assert.equal(await readFile(path.join(fixture.repoRoot, "remote.md"), "utf8"), "remote before\n");
    await assert.rejects(readFile(path.join(fixture.repoRoot, "archive", "hidden.md"), "utf8"));
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("explicit remote merge preserves dirty local files as uncommitted changes", async () => {
  const fixture = await createRemoteMergeFixture("git-leaf-dirty-remote-merge-");
  try {
    await writeFile(path.join(fixture.repoRoot, "document.md"), "local draft\n");
    await writeFile(path.join(fixture.repoRoot, "asset.bin"), Buffer.from([9, 8, 7]));
    await writeFile(path.join(fixture.repoRoot, "new.pdf"), "%PDF-local\n");
    await unlink(path.join(fixture.repoRoot, "remove.txt"));
    await rename(
      path.join(fixture.repoRoot, "rename.txt"),
      path.join(fixture.repoRoot, "renamed.txt"),
    );
    await writeFile(path.join(fixture.coworker, "remote.md"), "remote after\n");
    await commitAndPush(fixture.coworker, "Remote update");
    const remoteHead = (await git(fixture.bare, ["rev-parse", "main"])).stdout.trim();

    const result = await mergeRemoteChanges({
      repo: fixture.repo,
      allowLocalChanges: true,
    });

    assert.equal(result.ok, true, result.error);
    assert.equal(result.applied, true);
    assert.equal(result.mode, "preserve_local_changes");
    assert.equal((await git(fixture.repoRoot, ["rev-parse", "HEAD"])).stdout.trim(), remoteHead);
    assert.equal(await readFile(path.join(fixture.repoRoot, "document.md"), "utf8"), "local draft\n");
    assert.equal(
      normalizeCheckoutLineEndings(
        await readFile(path.join(fixture.repoRoot, "remote.md"), "utf8"),
      ),
      "remote after\n",
    );
    assert.equal((await git(fixture.repoRoot, ["show", "HEAD:document.md"])).stdout, "before\n");
    const localStatus = (await git(fixture.repoRoot, ["status", "--porcelain"])).stdout;
    assert.match(localStatus, / M asset\.bin/);
    assert.match(localStatus, / M document\.md/);
    assert.match(localStatus, /\?\? new\.pdf/);
    assert.match(localStatus, / D remove\.txt/);
    assert.match(localStatus, / D rename\.txt/);
    assert.match(localStatus, /\?\? renamed\.txt/);
    assert.equal((await git(fixture.bare, ["show", "main:document.md"])).stdout, "before\n");
    assert.deepEqual(
      Buffer.from((await git(fixture.repoRoot, ["show", "HEAD:asset.bin"], { encoding: "buffer" })).stdout),
      Buffer.from([0, 1, 2]),
    );
    assert.deepEqual(await readFile(path.join(fixture.repoRoot, "asset.bin")), Buffer.from([9, 8, 7]));
    assert.equal(await readFile(path.join(fixture.repoRoot, "new.pdf"), "utf8"), "%PDF-local\n");
    await assert.rejects(git(fixture.repoRoot, ["cat-file", "-e", "HEAD:new.pdf"]));
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("dirty remote merge detects a new edit anywhere in the workspace before applying", async () => {
  const fixture = await createRemoteMergeFixture("git-leaf-drifting-remote-merge-");
  try {
    await writeFile(path.join(fixture.repoRoot, "document.md"), "local draft\n");
    await writeFile(path.join(fixture.coworker, "remote.md"), "remote after\n");
    await commitAndPush(fixture.coworker, "Remote update");
    const localHead = (await git(fixture.repoRoot, ["rev-parse", "HEAD"])).stdout.trim();
    let injectedDrift = false;

    const result = await mergeRemoteChanges({
      repo: fixture.repo,
      allowLocalChanges: true,
      snapshotCommandRunner: async (cwd, args, options) => {
        const commandResult = await runGitSnapshotCommand(cwd, args, options);
        if (!injectedDrift && args[0] === "diff" && args.includes("--binary")) {
          injectedDrift = true;
          await writeFile(path.join(fixture.repoRoot, "late-edit.md"), "still typing\n");
        }
        return commandResult;
      },
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, "workspace_changed");
    assert.equal(result.agentPrompt, "");
    assert.equal((await git(fixture.repoRoot, ["rev-parse", "HEAD"])).stdout.trim(), localHead);
    assert.equal(await readFile(path.join(fixture.repoRoot, "document.md"), "utf8"), "local draft\n");
    assert.equal(await readFile(path.join(fixture.repoRoot, "remote.md"), "utf8"), "remote before\n");
    assert.equal(await readFile(path.join(fixture.repoRoot, "late-edit.md"), "utf8"), "still typing\n");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("explicit remote merge combines non-overlapping edits in one file and leaves them uncommitted", async () => {
  const fixture = await createRemoteMergeFixture("git-leaf-disjoint-remote-merge-", {
    document: "first\nmiddle\nlast\n",
  });
  try {
    await writeFile(path.join(fixture.repoRoot, "document.md"), "local first\nmiddle\nlast\n");
    await writeFile(path.join(fixture.coworker, "document.md"), "first\nmiddle\nremote last\n");
    await commitAndPush(fixture.coworker, "Remote document update");
    const status = await inspectRemoteSync({ repo: fixture.repo });
    assert.equal(status.behind, 1);

    const result = await mergeRemoteChanges({
      repo: fixture.repo,
      allowLocalChanges: true,
      refresh: false,
    });

    assert.equal(result.ok, true, result.error);
    assert.equal(
      normalizeCheckoutLineEndings(
        await readFile(path.join(fixture.repoRoot, "document.md"), "utf8"),
      ),
      "local first\nmiddle\nremote last\n",
    );
    assert.equal(
      (await git(fixture.repoRoot, ["show", "HEAD:document.md"])).stdout,
      "first\nmiddle\nremote last\n",
    );
    assert.equal((await git(fixture.repoRoot, ["status", "--porcelain"])).stdout, " M document.md\n");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("a prepared dirty remote merge leaves the workspace editable until it is applied", async () => {
  const fixture = await createRemoteMergeFixture("git-leaf-prepared-remote-merge-", {
    document: "first\nmiddle\nlast\n",
  });
  const preparationStore = createRemoteMergePreparationStore();
  try {
    await writeFile(path.join(fixture.repoRoot, "document.md"), "local first\nmiddle\nlast\n");
    await writeFile(path.join(fixture.coworker, "document.md"), "first\nmiddle\nremote last\n");
    await commitAndPush(fixture.coworker, "Remote document update");
    const localHead = (await git(fixture.repoRoot, ["rev-parse", "HEAD"])).stdout.trim();

    const prepared = await prepareRemoteChanges({
      repo: fixture.repo,
      allowLocalChanges: true,
      preparationStore,
    });

    assert.equal(prepared.ok, true, prepared.error);
    assert.equal(prepared.prepared, true);
    assert.ok(prepared.preparationToken);
    assert.equal((await git(fixture.repoRoot, ["rev-parse", "HEAD"])).stdout.trim(), localHead);
    assert.equal(
      await readFile(path.join(fixture.repoRoot, "document.md"), "utf8"),
      "local first\nmiddle\nlast\n",
    );

    const applied = await applyPreparedRemoteChanges({
      repo: fixture.repo,
      preparationToken: prepared.preparationToken,
      preparationStore,
    });

    assert.equal(applied.ok, true, applied.error);
    assert.equal(applied.applied, true);
    assert.equal(
      normalizeCheckoutLineEndings(
        await readFile(path.join(fixture.repoRoot, "document.md"), "utf8"),
      ),
      "local first\nmiddle\nremote last\n",
    );
  } finally {
    await preparationStore.dispose();
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("a prepared remote merge is discarded when editing resumes before apply", async () => {
  const fixture = await createRemoteMergeFixture("git-leaf-prepared-merge-drift-");
  const preparationStore = createRemoteMergePreparationStore();
  try {
    await writeFile(path.join(fixture.repoRoot, "document.md"), "local draft\n");
    await writeFile(path.join(fixture.coworker, "remote.md"), "remote after\n");
    await commitAndPush(fixture.coworker, "Remote update");
    const localHead = (await git(fixture.repoRoot, ["rev-parse", "HEAD"])).stdout.trim();

    const prepared = await prepareRemoteChanges({
      repo: fixture.repo,
      allowLocalChanges: true,
      preparationStore,
    });
    assert.equal(prepared.ok, true, prepared.error);
    assert.equal(prepared.prepared, true);

    await writeFile(path.join(fixture.repoRoot, "document.md"), "local draft continues\n");
    const applied = await applyPreparedRemoteChanges({
      repo: fixture.repo,
      preparationToken: prepared.preparationToken,
      preparationStore,
    });

    assert.equal(applied.ok, false);
    assert.equal(applied.code, "workspace_changed");
    assert.equal((await git(fixture.repoRoot, ["rev-parse", "HEAD"])).stdout.trim(), localHead);
    assert.equal(
      await readFile(path.join(fixture.repoRoot, "document.md"), "utf8"),
      "local draft continues\n",
    );
    assert.equal(await readFile(path.join(fixture.repoRoot, "remote.md"), "utf8"), "remote before\n");
  } finally {
    await preparationStore.dispose();
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("concurrent prepared remote merges serialize before mutating one repository", async () => {
  const fixture = await createRemoteMergeFixture("git-leaf-concurrent-remote-merge-");
  const preparationStore = createRemoteMergePreparationStore();
  try {
    await writeFile(path.join(fixture.coworker, "remote.md"), "remote after\n");
    await commitAndPush(fixture.coworker, "Remote update");
    const first = await prepareRemoteChanges({
      repo: fixture.repo,
      preparationStore,
    });
    const second = await prepareRemoteChanges({
      repo: fixture.repo,
      preparationStore,
      refresh: false,
    });
    assert.equal(first.prepared, true, first.error);
    assert.equal(second.prepared, true, second.error);

    let activeMerges = 0;
    let maximumActiveMerges = 0;
    const delayedMergeRunner = async (cwd, args) => {
      if (args[0] !== "merge") {
        return git(cwd, args);
      }
      activeMerges += 1;
      maximumActiveMerges = Math.max(maximumActiveMerges, activeMerges);
      await new Promise((resolve) => setTimeout(resolve, 100));
      try {
        return await git(cwd, args);
      } finally {
        activeMerges -= 1;
      }
    };

    const results = await Promise.all([
      applyPreparedRemoteChanges({
        repo: fixture.repo,
        preparationToken: first.preparationToken,
        preparationStore,
        gitRunner: delayedMergeRunner,
      }),
      applyPreparedRemoteChanges({
        repo: fixture.repo,
        preparationToken: second.preparationToken,
        preparationStore,
        gitRunner: delayedMergeRunner,
      }),
    ]);

    assert.equal(maximumActiveMerges, 1);
    assert.equal(results.filter((result) => result.ok).length, 1);
    assert.equal(results.find((result) => !result.ok)?.code, "workspace_changed");
    assert.equal((await git(fixture.repoRoot, ["status", "--porcelain"])).stdout, "");
    assert.equal(
      (await git(fixture.repoRoot, ["rev-parse", "HEAD"])).stdout.trim(),
      (await git(fixture.bare, ["rev-parse", "main"])).stdout.trim(),
    );
  } finally {
    await preparationStore.dispose();
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("automatic remote merge rejects a tracking ref newer than the inspected version", async () => {
  const fixture = await createRemoteMergeFixture("git-leaf-moving-remote-merge-");
  try {
    await writeFile(path.join(fixture.repoRoot, "document.md"), "local draft\n");
    await writeFile(path.join(fixture.coworker, "remote.md"), "remote first\n");
    await commitAndPush(fixture.coworker, "First remote update");
    const inspected = await inspectRemoteSync({ repo: fixture.repo });
    const localHead = inspected.head;

    await writeFile(path.join(fixture.coworker, "remote.md"), "remote second\n");
    await commitAndPush(fixture.coworker, "Second remote update");
    const current = await inspectRemoteSync({ repo: fixture.repo });
    assert.notEqual(current.remoteCommit, inspected.remoteCommit);

    const result = await mergeRemoteChanges({
      repo: fixture.repo,
      allowLocalChanges: true,
      refresh: false,
      expectedHead: localHead,
      expectedRemoteCommit: inspected.remoteCommit,
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, "remote_changed");
    assert.equal(result.agentPrompt, "");
    assert.equal((await git(fixture.repoRoot, ["rev-parse", "HEAD"])).stdout.trim(), localHead);
    assert.equal(await readFile(path.join(fixture.repoRoot, "document.md"), "utf8"), "local draft\n");
    assert.equal(await readFile(path.join(fixture.repoRoot, "remote.md"), "utf8"), "remote before\n");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("remote merge conflict leaves the real branch and dirty file unchanged", async () => {
  const fixture = await createRemoteMergeFixture("git-leaf-conflicting-remote-merge-");
  try {
    await writeFile(path.join(fixture.repoRoot, "document.md"), "local line\n");
    const localHead = (await git(fixture.repoRoot, ["rev-parse", "HEAD"])).stdout.trim();
    await writeFile(path.join(fixture.coworker, "document.md"), "remote line\n");
    await commitAndPush(fixture.coworker, "Conflicting remote update");

    const result = await mergeRemoteChanges({
      repo: fixture.repo,
      allowLocalChanges: true,
      locale: "zh-CN",
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, "conflict");
    assert.equal(result.remoteOk, true);
    assert.equal(result.state, "remote_ahead");
    assert.match(result.error, /没有把冲突应用到真实工作区/);
    assert.match(result.agentPrompt, /最终结果保持未提交，不要推送/);
    assert.equal((await git(fixture.repoRoot, ["rev-parse", "HEAD"])).stdout.trim(), localHead);
    assert.equal(await readFile(path.join(fixture.repoRoot, "document.md"), "utf8"), "local line\n");
    assert.equal((await git(fixture.repoRoot, ["status", "--porcelain"])).stdout, " M document.md\n");
    assert.doesNotMatch(await readFile(path.join(fixture.repoRoot, "document.md"), "utf8"), /<<<<<<<|>>>>>>>/);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("remote merge refuses diverged commit history without rewriting either side", async () => {
  const fixture = await createRemoteMergeFixture("git-leaf-diverged-remote-merge-");
  try {
    await writeFile(path.join(fixture.repoRoot, "local-only.md"), "local commit\n");
    await git(fixture.repoRoot, ["add", "-A"]);
    await git(fixture.repoRoot, ["commit", "-m", "Local commit"]);
    const localHead = (await git(fixture.repoRoot, ["rev-parse", "HEAD"])).stdout.trim();
    await writeFile(path.join(fixture.coworker, "remote.md"), "remote after\n");
    await commitAndPush(fixture.coworker, "Remote commit");
    const remoteHead = (await git(fixture.bare, ["rev-parse", "main"])).stdout.trim();

    const result = await mergeRemoteChanges({
      repo: fixture.repo,
      allowLocalChanges: true,
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, "diverged");
    assert.equal(result.remoteOk, true);
    assert.equal(result.state, "diverged");
    assert.equal((await git(fixture.repoRoot, ["rev-parse", "HEAD"])).stdout.trim(), localHead);
    assert.equal((await git(fixture.bare, ["rev-parse", "main"])).stdout.trim(), remoteHead);
    assert.equal(await readFile(path.join(fixture.repoRoot, "remote.md"), "utf8"), "remote before\n");
    assert.equal((await git(fixture.repoRoot, ["status", "--porcelain"])).stdout, "");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("automatic remote merge stops when local changes appear and does not show an Agent fallback", async () => {
  const fixture = await createRemoteMergeFixture("git-leaf-confirm-remote-merge-");
  try {
    await writeFile(path.join(fixture.repoRoot, "document.md"), "local draft\n");
    await writeFile(path.join(fixture.coworker, "remote.md"), "remote after\n");
    await commitAndPush(fixture.coworker, "Remote update");
    const localHead = (await git(fixture.repoRoot, ["rev-parse", "HEAD"])).stdout.trim();

    const result = await mergeRemoteChanges({
      repo: fixture.repo,
      allowLocalChanges: false,
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, "local_changes_require_confirmation");
    assert.equal(result.remoteOk, true);
    assert.equal(result.agentPrompt, "");
    assert.equal((await git(fixture.repoRoot, ["rev-parse", "HEAD"])).stdout.trim(), localHead);
    assert.equal(await readFile(path.join(fixture.repoRoot, "remote.md"), "utf8"), "remote before\n");
    assert.equal(await readFile(path.join(fixture.repoRoot, "document.md"), "utf8"), "local draft\n");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("real share publication commits a new document, verifies remote main, and returns its link", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "git-leaf-real-share-publish-"));
  const bare = path.join(root, "remote.git");
  const repoRoot = path.join(root, "repo");
  try {
    await mkdir(bare, { recursive: true });
    await git(bare, ["init", "--bare", "--initial-branch=main"]);
    await git(root, ["clone", bare, repoRoot]);
    await configureIdentity(repoRoot);
    await writeFile(path.join(repoRoot, "README.md"), "# Initial\n");
    await git(repoRoot, ["add", "README.md"]);
    await git(repoRoot, ["commit", "-m", "Initial"]);
    await git(repoRoot, ["push", "-u", "origin", "main"]);
    await writeFile(path.join(repoRoot, "share-me.md"), "# Ready to share\n");

    const result = await publishGitLeafShareLink({
      repo: { id: "fixture", root: repoRoot, branch: "main" },
      file: "share-me.md",
      gitRunner: async (cwd, args) => {
        if (args.join(" ") === "remote get-url origin") {
          return { stdout: "git@github.com:ExampleOrg/docs-repo.git\n", stderr: "" };
        }
        return git(cwd, args);
      },
    });

    assert.equal(result.ok, true, result.error);
    assert.equal(result.published, true);
    const shareUrl = new URL(result.url);
    assert.equal(shareUrl.searchParams.get("repo"), "exampleorg/docs-repo");
    assert.equal(shareUrl.searchParams.get("path"), "share-me.md");
    const remoteHead = (await git(bare, ["rev-parse", "main"])).stdout.trim();
    assert.equal(shareUrl.searchParams.get("rev"), remoteHead);
    assert.equal((await git(bare, ["show", "main:share-me.md"])).stdout, "# Ready to share\n");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function configureIdentity(repoRoot) {
  await git(repoRoot, ["config", "user.name", "Git Leaf Tests"]);
  await git(repoRoot, ["config", "user.email", "git-leaf@example.test"]);
}

async function createRemoteMergeFixture(prefix, { document = "before\n" } = {}) {
  const root = await mkdtemp(path.join(tmpdir(), prefix));
  const bare = path.join(root, "remote.git");
  const repoRoot = path.join(root, "repo");
  const coworker = path.join(root, "coworker");
  await mkdir(bare, { recursive: true });
  await git(bare, ["init", "--bare", "--initial-branch=main"]);
  await git(root, ["clone", bare, repoRoot]);
  await configureIdentity(repoRoot);
  await writeFile(path.join(repoRoot, "document.md"), document);
  await writeFile(path.join(repoRoot, "remote.md"), "remote before\n");
  await writeFile(path.join(repoRoot, "remove.txt"), "remove\n");
  await writeFile(path.join(repoRoot, "rename.txt"), "rename\n");
  await writeFile(path.join(repoRoot, "asset.bin"), Buffer.from([0, 1, 2]));
  await git(repoRoot, ["add", "-A"]);
  await git(repoRoot, ["commit", "-m", "Initial"]);
  await git(repoRoot, ["push", "-u", "origin", "main"]);
  await git(root, ["clone", bare, coworker]);
  await configureIdentity(coworker);
  return {
    root,
    bare,
    repoRoot,
    coworker,
    repo: {
      id: "fixture",
      root: repoRoot,
      branch: "main",
      detached: false,
    },
  };
}

async function commitAndPush(repoRoot, message) {
  await git(repoRoot, ["add", "-A"]);
  await git(repoRoot, ["commit", "-m", message]);
  await git(repoRoot, ["push", "origin", "main"]);
}

function git(cwd, args, { encoding = "utf8" } = {}) {
  return new Promise((resolve, reject) => {
    execFile("git", args, { cwd, encoding }, (error, stdout, stderr) => {
      if (!error) {
        resolve({ stdout, stderr });
        return;
      }
      error.stdout = stdout;
      error.stderr = stderr;
      reject(error);
    });
  });
}

function normalizeCheckoutLineEndings(value) {
  return value.replaceAll("\r\n", "\n");
}
