import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  REMOTE_SYNC_SMOKE_FINAL_DIRECTORY,
  REMOTE_SYNC_SMOKE_FILE,
  REMOTE_SYNC_SMOKE_IMAGE,
  REMOTE_SYNC_SMOKE_IMAGE_BYTES,
  REMOTE_SYNC_SMOKE_LOCAL_CONTENT,
  cleanupRemoteSyncSmokeFixture,
  createRemoteSyncSmokeFixture,
  publishRemoteSyncSmokeUpdate,
} from "../scripts/remote-sync-smoke-fixture.mjs";

test("remote sync smoke fixture starts behind with a byte-identical final artifact", async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "git-leaf-remote-smoke-test-"));
  const fixture = createRemoteSyncSmokeFixture({ temporaryRoot });
  try {
    assert.equal(fixture.file, REMOTE_SYNC_SMOKE_FILE);
    assert.equal(
      await readFile(path.join(fixture.repoRoot, fixture.file), "utf8"),
      REMOTE_SYNC_SMOKE_LOCAL_CONTENT,
    );
    assert.deepEqual(
      await readFile(path.join(
        fixture.repoRoot,
        REMOTE_SYNC_SMOKE_FINAL_DIRECTORY,
        REMOTE_SYNC_SMOKE_IMAGE,
      )),
      REMOTE_SYNC_SMOKE_IMAGE_BYTES,
    );
    assert.match(fixture.acceptance, /byte-identical/);
  } finally {
    cleanupRemoteSyncSmokeFixture(fixture);
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("remote sync fixture can publish consecutive moves after the repository opens", async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "git-leaf-remote-smoke-test-"));
  const fixture = createRemoteSyncSmokeFixture({
    temporaryRoot,
    remoteAhead: false,
  });
  try {
    publishRemoteSyncSmokeUpdate(fixture);
    assert.equal(
      await readFile(path.join(fixture.repoRoot, fixture.file), "utf8"),
      REMOTE_SYNC_SMOKE_LOCAL_CONTENT,
    );
  } finally {
    cleanupRemoteSyncSmokeFixture(fixture);
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
