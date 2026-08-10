import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeWorkbenchSessions,
  serializeWorkbenchSession,
  workbenchSessionForLaunch,
  workbenchSessionForRepo,
} from "../public/workbench-session.js";

test("workbench sessions normalize tabs, active path, tree viewport, and focus", () => {
  assert.deepEqual(
    normalizeWorkbenchSessions({
      "docs-repo": {
        tabs: [
          { path: "AGENTS.md" },
          { path: "docs/repo-structure.md" },
          { path: "AGENTS.md" },
          { path: "/absolute.md" },
          { path: "../outside.md" },
        ],
        activeTabPath: "missing.md",
        treeScrollTop: 42.7,
        treeFocus: {
          itemType: "directory",
          path: "docs",
        },
      },
      empty: {
        tabs: [],
      },
      invalid: {
        tabs: "AGENTS.md",
      },
    }),
    {
      "docs-repo": {
        tabs: [
          { path: "AGENTS.md" },
          { path: "docs/repo-structure.md" },
        ],
        activeTabPath: "AGENTS.md",
        treeScrollTop: 43,
        treeFocus: {
          itemType: "directory",
          path: "docs",
        },
      },
      empty: {
        tabs: [],
        activeTabPath: "",
      },
    },
  );
});

test("serializeWorkbenchSession keeps an explicit empty tab set", () => {
  assert.deepEqual(
    serializeWorkbenchSession({
      tabs: [],
      activeTabPath: "",
      treeScrollTop: 0,
      treeFocus: null,
    }),
    {
      tabs: [],
      activeTabPath: "",
      treeScrollTop: 0,
    },
  );
});

test("workbench sessions preserve an active blank tab across restarts", () => {
  assert.deepEqual(
    serializeWorkbenchSession({
      tabs: [
        { id: "tab-file", path: "README.md" },
        {
          id: "tab-blank",
          path: "",
          blank: true,
          history: { entries: [], index: -1 },
        },
      ],
      activeTabId: "tab-blank",
      activeTabPath: "",
    }),
    {
      tabs: [
        { id: "tab-file", path: "README.md" },
        { id: "tab-blank", path: "", blank: true },
      ],
      activeTabId: "tab-blank",
      activeTabPath: "",
      treeScrollTop: 0,
    },
  );
});

test("workbenchSessionForRepo returns a normalized repo session", () => {
  const sessions = normalizeWorkbenchSessions({
    "content-repo": {
      tabs: [{ path: "README.md" }],
      activeTabPath: "README.md",
    },
  });

  assert.deepEqual(workbenchSessionForRepo(sessions, "content-repo"), {
    tabs: [{ path: "README.md" }],
    activeTabPath: "README.md",
  });
  assert.equal(workbenchSessionForRepo(sessions, "docs-repo"), null);
});

test("an explicitly requested launch document overrides the restored active tab", () => {
  const sessions = normalizeWorkbenchSessions({
    "company-docs": {
      tabs: [{ path: "company/report.md" }, { path: "README.md" }],
      activeTabPath: "company/report.md",
    },
  });

  assert.deepEqual(
    workbenchSessionForLaunch(sessions, "company-docs", "AGENTS.md"),
    {
      tabs: [
        { path: "company/report.md" },
        { path: "README.md" },
        { path: "AGENTS.md" },
      ],
      activeTabPath: "AGENTS.md",
    },
  );
});

test("an explicitly requested existing tab becomes active without duplication", () => {
  const sessions = normalizeWorkbenchSessions({
    "company-docs": {
      tabs: [{ path: "AGENTS.md" }, { path: "README.md" }],
      activeTabPath: "README.md",
    },
  });

  assert.deepEqual(
    workbenchSessionForLaunch(sessions, "company-docs", "AGENTS.md"),
    {
      tabs: [{ path: "AGENTS.md" }, { path: "README.md" }],
      activeTabPath: "AGENTS.md",
    },
  );
});

test("a requested path retains the active duplicate tab identity", () => {
  const sessions = normalizeWorkbenchSessions({
    "company-docs": {
      tabs: [
        { id: "tab-a", path: "README.md" },
        { id: "tab-b", path: "README.md" },
      ],
      activeTabId: "tab-b",
      activeTabPath: "README.md",
    },
  });

  assert.deepEqual(
    workbenchSessionForLaunch(sessions, "company-docs", "README.md"),
    {
      tabs: [
        { id: "tab-a", path: "README.md" },
        { id: "tab-b", path: "README.md" },
      ],
      activeTabId: "tab-b",
      activeTabPath: "README.md",
    },
  );
});

test("workbench sessions preserve stable tab identities and bounded per-tab history", () => {
  const sessions = normalizeWorkbenchSessions({
    "company-docs": {
      tabs: [
        {
          id: "tab-a",
          path: "README.md",
          history: {
            entries: [
              { path: "AGENTS.md", hash: "#L2", scrollTop: 80 },
              { path: "README.md", hash: "", scrollTop: 240 },
            ],
            index: 1,
          },
        },
      ],
      activeTabId: "tab-a",
      activeTabPath: "README.md",
    },
  });

  assert.deepEqual(sessions, {
    "company-docs": {
      tabs: [
        {
          id: "tab-a",
          path: "README.md",
          history: {
            entries: [
              { path: "AGENTS.md", hash: "#L2", scrollTop: 80 },
              { path: "README.md", hash: "", scrollTop: 240 },
            ],
            index: 1,
          },
        },
      ],
      activeTabId: "tab-a",
      activeTabPath: "README.md",
    },
  });
});

test("a requested launch document never reuses another tab's active identity", () => {
  const sessions = normalizeWorkbenchSessions({
    "company-docs": {
      tabs: [{ id: "tab-a", path: "README.md" }],
      activeTabId: "tab-a",
      activeTabPath: "README.md",
    },
  });

  assert.deepEqual(
    workbenchSessionForLaunch(sessions, "company-docs", "AGENTS.md"),
    {
      tabs: [
        { id: "tab-a", path: "README.md" },
        { path: "AGENTS.md" },
      ],
      activeTabPath: "AGENTS.md",
    },
  );
});

test("repository-keyed workbench sessions keep per-tab histories separate", () => {
  const sessions = normalizeWorkbenchSessions({
    "repo-a": {
      tabs: [{
        id: "tab-a",
        path: "README.md",
        history: { entries: [{ path: "AGENTS.md" }, { path: "README.md" }], index: 1 },
      }],
      activeTabId: "tab-a",
      activeTabPath: "README.md",
    },
    "repo-b": {
      tabs: [{ id: "tab-b", path: "CONTRIBUTING.md" }],
      activeTabId: "tab-b",
      activeTabPath: "CONTRIBUTING.md",
    },
  });

  assert.deepEqual(
    workbenchSessionForRepo(sessions, "repo-a")?.tabs[0].history.entries.map((entry) => entry.path),
    ["AGENTS.md", "README.md"],
  );
  assert.equal(workbenchSessionForRepo(sessions, "repo-b")?.tabs[0].path, "CONTRIBUTING.md");
});
