import {
  DEFAULT_USER_PREFERENCES,
  normalizeGitRemoteCheckIntervalMinutes,
} from "./settings-preferences.js";

// Background sync may fetch and fast-forward, but it must never merge through
// real local edits without an explicit user action.
export const AUTOMATIC_REMOTE_MERGE_ALLOW_LOCAL_CHANGES = false;

export function remoteSyncIntervalMs(
  intervalMinutes = DEFAULT_USER_PREFERENCES.gitRemoteCheckIntervalMinutes,
) {
  return normalizeGitRemoteCheckIntervalMinutes(intervalMinutes) * 60 * 1000;
}

export const REMOTE_SYNC_INTERVAL_MS = remoteSyncIntervalMs();

export function remoteSyncCheckDue({
  intervalMinutes,
  lastAttemptAt = 0,
  now = Date.now(),
} = {}) {
  const normalizedNow = Number(now);
  const normalizedLastAttemptAt = Number(lastAttemptAt);
  return Number.isFinite(normalizedNow)
    && Number.isFinite(normalizedLastAttemptAt)
    && normalizedNow - normalizedLastAttemptAt >= remoteSyncIntervalMs(intervalMinutes);
}

export function hasGitChangesChanged(previousChanges, nextChanges) {
  const previous = Array.isArray(previousChanges) ? previousChanges : [];
  const next = Array.isArray(nextChanges) ? nextChanges : [];
  if (previous.length !== next.length) {
    return true;
  }

  return previous.some((change, index) => {
    const nextChange = next[index];
    return change?.path !== nextChange?.path
      || change?.oldPath !== nextChange?.oldPath
      || change?.status !== nextChange?.status
      || change?.rawStatus !== nextChange?.rawStatus;
  });
}

export function remoteSyncDecision({
  remote,
  localChangeCount = 0,
  canEdit = false,
  operation = "",
  autoMergeFailed = false,
  autoMergeBlocked = false,
  autoMergeDeferred = false,
} = {}) {
  const localChanges = Math.max(0, Number(localChangeCount) || 0);
  const behind = Math.max(0, Number(remote?.behind) || 0);
  const remoteAvailable = remote?.ok === true;
  const busy = Boolean(operation);
  const remoteIncoming = remoteAvailable && behind > 0;
  const showMergeRemote = remoteIncoming
    && (autoMergeFailed || autoMergeBlocked || autoMergeDeferred);
  return {
    shouldAutoMerge: canEdit && !busy && remoteIncoming && !autoMergeBlocked,
    showMergeRemote,
    canMergeRemote: canEdit && !busy && showMergeRemote,
    canRunPrimary: canEdit && !busy,
    primaryAction: localChanges > 0 ? "publish" : "check",
    badge: localChanges > 0 ? String(localChanges) : behind > 0 ? "↓" : "",
  };
}

export function automaticRemoteMergeFailureIsBlocking(payload = {}) {
  return payload?.ok !== true
    && !["preparation_expired", "remote_changed", "workspace_changed"].includes(payload?.code);
}

export function automaticRemoteMergeDelayMs({
  editing = false,
  lastEditAt = 0,
  now = Date.now(),
  idleMs = 1000,
} = {}) {
  if (!editing || !Number.isFinite(lastEditAt) || lastEditAt <= 0) {
    return 0;
  }
  return Math.max(0, Math.max(0, Number(idleMs) || 0) - (Number(now) - lastEditAt));
}

export function automaticRemoteMergeShouldWaitForEditor({
  editing = false,
  currentDocumentAffected = false,
  editorFocused = false,
  applicationFocused = true,
} = {}) {
  return Boolean(
    editing
    && currentDocumentAffected
    && (editorFocused || !applicationFocused)
  );
}
