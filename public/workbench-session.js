const MAX_WORKBENCH_SESSIONS = 50;
const MAX_SESSION_TABS = 20;

export function normalizeWorkbenchSessions(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const sessions = {};
  for (const [repoId, session] of Object.entries(value).slice(0, MAX_WORKBENCH_SESSIONS)) {
    if (typeof repoId !== "string" || !repoId) {
      continue;
    }

    const normalized = normalizeWorkbenchSession(session);
    if (normalized) {
      sessions[repoId] = normalized;
    }
  }
  return sessions;
}

export function workbenchSessionForRepo(sessions, repoId) {
  const normalizedSessions = normalizeWorkbenchSessions(sessions);
  return normalizedSessions[repoId] ?? null;
}

export function workbenchSessionForLaunch(sessions, repoId, requestedFile = "") {
  const session = workbenchSessionForRepo(sessions, repoId);
  const requestedPath = safeRelativePath(requestedFile);
  if (!requestedPath) {
    return session;
  }

  const sessionTabs = session?.tabs ?? [];
  const activeTab = sessionTabs.find((tab) => tab.id === session?.activeTabId);
  const requestedTab = activeTab?.path === requestedPath
    ? activeTab
    : sessionTabs.find((tab) => tab.path === requestedPath);
  const tabs = requestedTab
    ? sessionTabs
    : [...sessionTabs, { path: requestedPath }].slice(-MAX_SESSION_TABS);
  const { activeTabId: _ignoredActiveTabId, ...sessionWithoutActiveTabId } = session ?? {};
  return {
    ...sessionWithoutActiveTabId,
    tabs,
    ...(requestedTab?.id ? { activeTabId: requestedTab.id } : {}),
    activeTabPath: requestedPath,
  };
}

export function serializeWorkbenchSession({
  tabs = [],
  activeTabId = "",
  activeTabPath = "",
  treeScrollTop = null,
  treeFocus = null,
} = {}) {
  return normalizeWorkbenchSession({
    tabs,
    activeTabId,
    activeTabPath,
    treeScrollTop,
    treeFocus,
  }) ?? {
    tabs: [],
    activeTabPath: "",
  };
}

function normalizeWorkbenchSession(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const hasExplicitTabs = Array.isArray(value.tabs);
  const tabs = normalizeSessionTabs(value.tabs);
  const activeTabId = activeSessionTabId({
    tabs,
    activeTabId: normalizeTabId(value.activeTabId),
    activeTabPath: safeRelativePath(value.activeTabPath),
  });
  const activeTabPath = activeSessionPath({ tabs, activeTabId, activeTabPath: safeRelativePath(value.activeTabPath) });
  const treeScrollTop = nonNegativeInteger(value.treeScrollTop);
  const treeFocus = normalizeTreeFocus(value.treeFocus);

  if (!hasExplicitTabs && treeScrollTop === null && !treeFocus) {
    return null;
  }

  return {
    ...(hasExplicitTabs ? { tabs } : {}),
    ...(activeTabId ? { activeTabId } : {}),
    activeTabPath,
    ...(treeScrollTop === null ? {} : { treeScrollTop }),
    ...(treeFocus ? { treeFocus } : {}),
  };
}

function normalizeSessionTabs(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seenLegacyPaths = new Set();
  const seenIds = new Set();
  const tabs = [];
  for (const item of value) {
    const path = safeRelativePath(typeof item === "string" ? item : item?.path);
    const id = normalizeTabId(typeof item === "string" ? "" : item?.id);
    const blank = typeof item === "object" && item?.blank === true && !path;
    if (blank) {
      if (id && seenIds.has(id)) {
        continue;
      }
      if (id) {
        seenIds.add(id);
      }
      tabs.push({
        ...(id ? { id } : {}),
        path: "",
        blank: true,
      });
      if (tabs.length >= MAX_SESSION_TABS) {
        break;
      }
      continue;
    }
    if (!path || (id ? seenIds.has(id) : seenLegacyPaths.has(path))) {
      continue;
    }
    const history = id ? normalizeSessionHistory(item?.history, path) : null;
    const currentPath = history?.entries[history.index]?.path || path;
    if (id) {
      seenIds.add(id);
    } else {
      seenLegacyPaths.add(path);
    }
    tabs.push({
      ...(id ? { id } : {}),
      path: currentPath,
      ...(history ? { history } : {}),
    });
    if (tabs.length >= MAX_SESSION_TABS) {
      break;
    }
  }
  return tabs;
}

function activeSessionTabId({ tabs, activeTabId, activeTabPath }) {
  if (!activeTabId || !tabs.some((tab) => tab.id === activeTabId)) {
    return tabs.find((tab) => tab.path === activeTabPath && tab.id)?.id || "";
  }
  return activeTabId;
}

function activeSessionPath({ tabs, activeTabId, activeTabPath }) {
  if (tabs.length === 0) {
    return "";
  }
  if (activeTabId) {
    const activeTab = tabs.find((tab) => tab.id === activeTabId);
    return activeTab ? activeTab.path : tabs[0].path;
  }
  return tabs.some((tab) => tab.path === activeTabPath) ? activeTabPath : tabs[0].path;
}

function normalizeSessionHistory(value, fallbackPath) {
  if (!value || typeof value !== "object" || Array.isArray(value) || !Array.isArray(value.entries)) {
    return null;
  }

  const allEntries = value.entries
    .map((entry) => normalizeSessionLocation(entry))
    .filter(Boolean);
  const requestedIndex = Number.isInteger(value.index) ? value.index : allEntries.length - 1;
  const boundedIndex = Math.max(0, Math.min(allEntries.length - 1, requestedIndex));
  const start = allEntries.length > 50
    ? Math.min(Math.max(0, boundedIndex - 49), allEntries.length - 50)
    : 0;
  const entries = allEntries.slice(start, start + 50);
  if (entries.length === 0) {
    const initial = normalizeSessionLocation({ path: fallbackPath });
    return initial ? { entries: [initial], index: 0 } : null;
  }

  return {
    entries,
    index: Math.max(0, Math.min(entries.length - 1, boundedIndex - start)),
  };
}

function normalizeSessionLocation(value) {
  const path = safeRelativePath(value?.path);
  if (!path) {
    return null;
  }
  const hash = String(value?.hash || "").trim();
  return {
    path,
    hash: hash ? (hash.startsWith("#") ? hash.slice(0, 512) : `#${hash.slice(0, 511)}`) : "",
    scrollTop: nonNegativeInteger(value?.scrollTop) ?? 0,
  };
}

function normalizeTabId(value) {
  const id = String(value || "").trim();
  return id && id.length <= 128 ? id : "";
}

function normalizeTreeFocus(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const path = safeRelativePath(value.path);
  const itemType = value.itemType === "directory" ? "directory" : value.itemType === "file" ? "file" : "";
  return path && itemType ? { itemType, path } : null;
}

function nonNegativeInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
}

function safeRelativePath(value) {
  const path = String(value || "").replace(/\\/g, "/").trim();
  if (
    !path ||
    path.startsWith("/") ||
    path.startsWith("../") ||
    path === ".." ||
    path.includes("/../") ||
    /^[a-zA-Z]:/.test(path)
  ) {
    return "";
  }
  return path;
}
