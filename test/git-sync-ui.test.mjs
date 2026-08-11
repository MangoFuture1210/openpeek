import assert from "node:assert/strict";
import test from "node:test";

import {
  AUTOMATIC_REMOTE_MERGE_ALLOW_LOCAL_CHANGES,
  automaticRemoteMergeDelayMs,
  automaticRemoteMergeFailureIsBlocking,
  automaticRemoteMergeShouldWaitForEditor,
  REMOTE_SYNC_INTERVAL_MS,
  hasGitChangesChanged,
  remoteSyncCheckDue,
  remoteSyncDecision,
  remoteSyncIntervalMs,
} from "../public/git-sync-ui.js";

test("automatic remote merging never writes through a dirty workspace", () => {
  assert.equal(AUTOMATIC_REMOTE_MERGE_ALLOW_LOCAL_CHANGES, false);
});

test("identical background git status does not invalidate the file tree", () => {
  const changes = [
    { path: "docs/changed.md", status: "modified", rawStatus: " M" },
    {
      path: "docs/new-name.md",
      oldPath: "docs/old-name.md",
      status: "renamed",
      rawStatus: "R ",
    },
  ];

  assert.equal(hasGitChangesChanged(changes, structuredClone(changes)), false);
  assert.equal(hasGitChangesChanged(changes, [
    ...changes.slice(0, 1),
    { ...changes[1], status: "copied", rawStatus: "C " },
  ]), true);
  assert.equal(hasGitChangesChanged(changes, changes.slice(0, 1)), true);
});

test("remote sync uses the selected bounded cadence and defaults to ten minutes", () => {
  assert.equal(REMOTE_SYNC_INTERVAL_MS, 600_000);
  assert.equal(remoteSyncIntervalMs(1), 60_000);
  assert.equal(remoteSyncIntervalMs(2), 120_000);
  assert.equal(remoteSyncIntervalMs(5), 300_000);
  assert.equal(remoteSyncIntervalMs(10), 600_000);
  assert.equal(remoteSyncIntervalMs(30), 1_800_000);
  assert.equal(remoteSyncIntervalMs(60), 3_600_000);
  assert.equal(remoteSyncIntervalMs(120), 7_200_000);
  assert.equal(remoteSyncIntervalMs(15), 600_000);
});

test("a visible window checks against the selected interval", () => {
  assert.equal(remoteSyncCheckDue({
    intervalMinutes: 30,
    lastAttemptAt: 1_000,
    now: 1_800_999,
  }), false);
  assert.equal(remoteSyncCheckDue({
    intervalMinutes: 30,
    lastAttemptAt: 1_000,
    now: 1_801_000,
  }), true);
});

test("automatic merging waits only for the remainder of the active editing pause", () => {
  assert.equal(automaticRemoteMergeDelayMs({
    editing: true,
    lastEditAt: 1_000,
    now: 1_400,
    idleMs: 1_000,
  }), 600);
  assert.equal(automaticRemoteMergeDelayMs({
    editing: true,
    lastEditAt: 1_000,
    now: 2_100,
    idleMs: 1_000,
  }), 0);
  assert.equal(automaticRemoteMergeDelayMs({
    editing: false,
    lastEditAt: 1_000,
    now: 1_100,
    idleMs: 1_000,
  }), 0);
});

test("an affected focused editor keeps a prepared automatic merge pending", () => {
  assert.equal(automaticRemoteMergeShouldWaitForEditor({
    editing: true,
    currentDocumentAffected: true,
    editorFocused: true,
  }), true);
  assert.equal(automaticRemoteMergeShouldWaitForEditor({
    editing: true,
    currentDocumentAffected: false,
    editorFocused: true,
  }), false);
  assert.equal(automaticRemoteMergeShouldWaitForEditor({
    editing: true,
    currentDocumentAffected: true,
    editorFocused: false,
  }), false);
  assert.equal(automaticRemoteMergeShouldWaitForEditor({
    editing: true,
    currentDocumentAffected: true,
    editorFocused: false,
    applicationFocused: false,
  }), true);
});

test("incoming changes trigger preparation for clean or dirty local workspaces", () => {
  const remote = { ok: true, behind: 2 };

  assert.deepEqual(remoteSyncDecision({
    remote,
    localChangeCount: 0,
    canEdit: true,
  }), {
    shouldAutoMerge: true,
    showMergeRemote: false,
    canMergeRemote: false,
    canRunPrimary: true,
    primaryAction: "check",
    badge: "↓",
  });

  assert.deepEqual(remoteSyncDecision({
    remote,
    localChangeCount: 3,
    canEdit: true,
  }), {
    shouldAutoMerge: true,
    showMergeRemote: false,
    canMergeRemote: false,
    canRunPrimary: true,
    primaryAction: "publish",
    badge: "3",
  });
});

test("a failed automatic merge exposes a manual retry without retrying a blocked result", () => {
  assert.deepEqual(remoteSyncDecision({
    remote: { ok: true, behind: 1 },
    localChangeCount: 1,
    canEdit: true,
    autoMergeFailed: true,
    autoMergeBlocked: true,
  }), {
    shouldAutoMerge: false,
    showMergeRemote: true,
    canMergeRemote: true,
    canRunPrimary: true,
    primaryAction: "publish",
    badge: "1",
  });
  assert.equal(automaticRemoteMergeFailureIsBlocking({
    ok: false,
    code: "conflict",
  }), true);
  assert.equal(automaticRemoteMergeFailureIsBlocking({
    ok: false,
    code: "workspace_changed",
  }), false);
  assert.equal(automaticRemoteMergeFailureIsBlocking({
    ok: false,
    code: "remote_changed",
  }), false);
  assert.equal(automaticRemoteMergeFailureIsBlocking({
    ok: false,
    code: "preparation_expired",
  }), false);
  assert.equal(automaticRemoteMergeFailureIsBlocking({
    code: "invalid_response",
  }), true);
});

test("a prepared merge waiting for the focused editor keeps a manual action available", () => {
  assert.deepEqual(remoteSyncDecision({
    remote: { ok: true, behind: 1 },
    localChangeCount: 1,
    canEdit: true,
    autoMergeDeferred: true,
  }), {
    shouldAutoMerge: true,
    showMergeRemote: true,
    canMergeRemote: true,
    canRunPrimary: true,
    primaryAction: "publish",
    badge: "1",
  });
});

test("remote sync actions remain disabled while another sync operation is running", () => {
  assert.deepEqual(remoteSyncDecision({
    remote: { ok: true, behind: 1 },
    localChangeCount: 1,
    canEdit: true,
    operation: "merge",
    autoMergeFailed: true,
    autoMergeBlocked: true,
  }), {
    shouldAutoMerge: false,
    showMergeRemote: true,
    canMergeRemote: false,
    canRunPrimary: false,
    primaryAction: "publish",
    badge: "1",
  });
});
