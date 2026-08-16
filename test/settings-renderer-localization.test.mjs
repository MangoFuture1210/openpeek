import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const ROOT = path.join(import.meta.dirname, "..");
const SETTINGS_HTML_PATH = path.join(ROOT, "src", "desktop", "settings", "index.html");
const SETTINGS_RENDERER_PATH = path.join(ROOT, "src", "desktop", "settings", "renderer.js");
const SETTINGS_STYLES_PATH = path.join(ROOT, "src", "desktop", "settings", "styles.css");

test("settings page exposes bounded language and Git check choices and stays hidden until localized", async () => {
  const [html, styles] = await Promise.all([
    readFile(SETTINGS_HTML_PATH, "utf8"),
    readFile(SETTINGS_STYLES_PATH, "utf8"),
  ]);

  const languageValues = [...html.matchAll(/name="language"\s+value="([^"]+)"/g)]
    .map((match) => match[1]);
  const remoteCheckValues = [
    ...html.matchAll(/<option value="([^"]+)" data-i18n="gitRemoteCheckEvery/g),
  ].map((match) => Number(match[1]));
  const documentTitleValues = [
    ...html.matchAll(/name="showDocumentTitles"\s+value="([^"]+)"/g),
  ].map((match) => match[1]);
  assert.deepEqual(languageValues, ["system", "en", "zh-CN"]);
  assert.deepEqual(remoteCheckValues, [1, 2, 5, 10, 30, 60, 120]);
  assert.deepEqual(documentTitleValues, ["true", "false"]);
  assert.match(html, /<html lang="en" data-settings-ready="false">/);
  assert.equal(
    [...html.matchAll(/class="section-kicker"\s+data-i18n="([^"]+)"/g)].length,
    6,
  );
  assert.match(html, /data-section="general" aria-current="page"/);
  assert.match(
    html,
    /class="language-sample" aria-hidden="true" data-i18n="languageAuto">Auto<\/span>/,
  );
  assert.match(html, /id="github-issues-repositories"/);
  assert.match(html, /id="save-github-issues-repositories"/);
  assert.match(html, /data-i18n-placeholder="githubIssuesRepositoriesPlaceholder"/);
  assert.match(styles, /:root\[data-settings-ready="false"\] body\s*\{\s*visibility: hidden;/);
});

test("settings renderer persists a selected Git remote check interval as minutes", async () => {
  const source = await readFile(SETTINGS_RENDERER_PATH, "utf8");
  const initialModel = settingsModel({
    language: "en",
    resolvedLanguage: "en",
    helpTitle: "Repository files",
  });
  const harness = createRendererHarness({
    initialModel,
    saveResponse: {
      ok: true,
      preferences: {
        ...initialModel.preferences,
        gitRemoteCheckIntervalMinutes: 30,
      },
    },
  });

  vm.runInNewContext(source, harness.context, {
    filename: SETTINGS_RENDERER_PATH,
  });
  await settle();

  assert.equal(harness.remoteCheckInterval.value, "10");
  harness.remoteCheckInterval.value = "30";
  harness.document.dispatch("change", { target: harness.remoteCheckInterval });
  await settle();

  assert.equal(harness.savedPatches.length, 1);
  assert.equal(harness.savedPatches[0].gitRemoteCheckIntervalMinutes, 30);
});

test("settings renderer persists the document-title toggle as a boolean", async () => {
  const source = await readFile(SETTINGS_RENDERER_PATH, "utf8");
  const initialModel = settingsModel({
    language: "en",
    resolvedLanguage: "en",
    helpTitle: "Repository files",
  });
  const harness = createRendererHarness({
    initialModel,
    saveResponse: {
      ok: true,
      preferences: {
        ...initialModel.preferences,
        showDocumentTitles: false,
      },
    },
  });

  vm.runInNewContext(source, harness.context, {
    filename: SETTINGS_RENDERER_PATH,
  });
  await settle();

  assert.equal(harness.radio("showDocumentTitles", "true").checked, true);
  const hiddenInput = harness.radio("showDocumentTitles", "false");
  hiddenInput.checked = true;
  harness.document.dispatch("change", { target: hiddenInput });
  await settle();

  assert.equal(harness.savedPatches.length, 1);
  assert.equal(harness.savedPatches[0].showDocumentTitles, false);
});

test("settings renderer applies resolved language and rehydrates a full model after saving", async () => {
  const source = await readFile(SETTINGS_RENDERER_PATH, "utf8");
  const initialModel = settingsModel({
    language: "system",
    resolvedLanguage: "zh-CN",
    helpTitle: "仓库文件",
  });
  const englishModel = settingsModel({
    language: "en",
    resolvedLanguage: "en",
    helpTitle: "Repository files",
  });
  const harness = createRendererHarness({
    initialModel,
    saveResponse: {
      ok: true,
      preferences: englishModel.preferences,
      model: englishModel,
    },
  });

  vm.runInNewContext(source, harness.context, {
    filename: SETTINGS_RENDERER_PATH,
  });
  await settle();

  assert.equal(harness.document.documentElement.lang, "zh-CN");
  assert.equal(harness.document.documentElement.dataset.settingsReady, "true");
  assert.equal(harness.localizedHeading.textContent, "外观");
  assert.equal(harness.radio("language", "system").checked, true);

  const englishInput = harness.radio("language", "en");
  harness.radio("language", "system").checked = false;
  englishInput.checked = true;
  harness.document.dispatch("change", { target: englishInput });
  await settle();

  assert.equal(harness.savedPatches.length, 1);
  assert.equal(harness.savedPatches[0].language, "en");
  assert.equal(harness.document.documentElement.lang, "en");
  assert.equal(harness.localizedHeading.textContent, "Appearance");
  assert.equal(harness.radio("language", "en").checked, true);
  assert.equal(harness.appStatus.children[0].textContent, "Application");
});

test("settings renderer serializes saves so a language model is not lost behind a later preference", async () => {
  const source = await readFile(SETTINGS_RENDERER_PATH, "utf8");
  const initialModel = settingsModel({
    language: "system",
    resolvedLanguage: "zh-CN",
    helpTitle: "仓库文件",
  });
  const englishModel = settingsModel({
    language: "en",
    resolvedLanguage: "en",
    helpTitle: "Repository files",
  });
  let releaseLanguageSave;
  const languageSave = new Promise((resolve) => {
    releaseLanguageSave = resolve;
  });
  const harness = createRendererHarness({
    initialModel,
    async updatePreferences(patch) {
      if (patch.language === "en") {
        return languageSave;
      }
      return {
        ok: true,
        preferences: {
          ...englishModel.preferences,
          ...patch,
        },
      };
    },
  });

  vm.runInNewContext(source, harness.context, {
    filename: SETTINGS_RENDERER_PATH,
  });
  await settle();

  const englishInput = harness.radio("language", "en");
  englishInput.checked = true;
  harness.document.dispatch("change", { target: englishInput });
  const darkInput = harness.radio("colorMode", "dark");
  darkInput.checked = true;
  harness.document.dispatch("change", { target: darkInput });
  await settle();

  assert.equal(harness.savedPatches.length, 1);
  assert.equal(harness.savedPatches[0].language, "en");
  releaseLanguageSave({
    ok: true,
    preferences: englishModel.preferences,
    model: englishModel,
  });
  await settle();
  await settle();

  assert.equal(harness.savedPatches.length, 2);
  assert.equal(harness.savedPatches[0].language, "en");
  assert.equal(harness.savedPatches[1].colorMode, "dark");
  assert.equal(harness.document.documentElement.lang, "en");
  assert.equal(harness.localizedHeading.textContent, "Appearance");
  assert.equal(harness.radio("colorMode", "dark").checked, true);
});

test("settings renderer clears an update result when the interface language changes", async () => {
  const source = await readFile(SETTINGS_RENDERER_PATH, "utf8");
  const initialModel = settingsModel({
    language: "system",
    resolvedLanguage: "zh-CN",
    helpTitle: "仓库文件",
  });
  const englishModel = settingsModel({
    language: "en",
    resolvedLanguage: "en",
    helpTitle: "Repository files",
  });
  const harness = createRendererHarness({
    initialModel,
    saveResponse: {
      ok: true,
      preferences: englishModel.preferences,
      model: englishModel,
    },
    checkForUpdates: async () => ({
      result: {
        state: "current",
        message: "OpenGlance 已经是最新版本。",
      },
    }),
  });

  vm.runInNewContext(source, harness.context, {
    filename: SETTINGS_RENDERER_PATH,
  });
  await settle();
  harness.checkForUpdatesButton.dispatch("click", {});
  await settle();
  assert.equal(harness.updateCheckResult.textContent, "OpenGlance 已经是最新版本。");

  const englishInput = harness.radio("language", "en");
  englishInput.checked = true;
  harness.document.dispatch("change", { target: englishInput });
  await settle();

  assert.equal(harness.document.documentElement.lang, "en");
  assert.equal(harness.updateCheckResult.textContent, "");
});

test("settings renderer keeps localized Chinese error summaries ahead of technical errors", async () => {
  const source = await readFile(SETTINGS_RENDERER_PATH, "utf8");
  const initialModel = settingsModel({
    language: "zh-CN",
    resolvedLanguage: "zh-CN",
    helpTitle: "仓库文件",
  });
  const harness = createRendererHarness({
    initialModel,
    checkForUpdates: async () => {
      throw new Error("Error invoking remote method 'git-leaf-settings:action'");
    },
  });

  vm.runInNewContext(source, harness.context, {
    filename: SETTINGS_RENDERER_PATH,
  });
  await settle();
  harness.checkForUpdatesButton.dispatch("click", {});
  await settle();

  assert.equal(harness.errorBox.textContent, "检查更新失败。");
  assert.doesNotMatch(harness.errorBox.textContent, /Error invoking remote method/);
});

test("settings renderer exposes configured Issue sync and reports API pages", async () => {
  const source = await readFile(SETTINGS_RENDERER_PATH, "utf8");
  const initialModel = settingsModel({
    language: "zh-CN",
    resolvedLanguage: "zh-CN",
    helpTitle: "仓库文件",
    status: {
      githubIssuesConfigured: true,
      githubIssues: [{ label: "docs", value: "12 条 Issue", status: "ok" }],
    },
  });
  const harness = createRendererHarness({
    initialModel,
    syncGithubIssues: async () => ({
      result: {
        status: "complete",
        completedRepositories: 2,
        requestedRepositories: 2,
        apiRequests: 4,
      },
    }),
  });

  vm.runInNewContext(source, harness.context, {
    filename: SETTINGS_RENDERER_PATH,
  });
  await settle();

  assert.equal(harness.githubIssuesActions.hidden, false);
  harness.syncGithubIssuesButton.dispatch("click", {});
  assert.equal(harness.syncGithubIssuesButton.disabled, true);
  await settle();

  assert.equal(harness.issueSyncs, 1);
  assert.equal(harness.syncGithubIssuesButton.disabled, false);
  assert.equal(
    harness.githubIssuesSyncResult.textContent,
    "已同步 2/2 个仓库，共使用 4 个 API 分页请求。",
  );
});

test("settings renderer saves a bounded GitHub Issues repository scope", async () => {
  const source = await readFile(SETTINGS_RENDERER_PATH, "utf8");
  const initialModel = settingsModel({
    language: "zh-CN",
    resolvedLanguage: "zh-CN",
    helpTitle: "仓库文件",
    status: {
      githubIssuesConfiguration: {
        source: "file",
        writable: true,
        repositories: ["example/docs"],
      },
    },
  });
  const harness = createRendererHarness({
    initialModel,
    configureGithubIssues: async (repositories) => ({
      result: { source: "file", repositories },
    }),
  });

  vm.runInNewContext(source, harness.context, {
    filename: SETTINGS_RENDERER_PATH,
  });
  await settle();

  assert.equal(harness.githubIssuesConfiguration.hidden, false);
  assert.equal(harness.githubIssuesRepositories.value, "example/docs");
  harness.githubIssuesRepositories.value = "Example/Docs\nExample/App.git";
  harness.saveGithubIssuesRepositoriesButton.dispatch("click", {});
  assert.equal(harness.saveGithubIssuesRepositoriesButton.disabled, true);
  await settle();

  assert.deepEqual(harness.issueConfigurations, [["Example/Docs", "Example/App.git"]]);
  assert.equal(harness.githubIssuesRepositories.value, "Example/Docs\nExample/App.git");
  assert.equal(harness.githubIssuesConfigurationResult.textContent, "仓库范围已保存。");
  assert.equal(harness.saveGithubIssuesRepositoriesButton.disabled, false);
});

test("settings renderer keeps an environment-managed Issue scope read-only", async () => {
  const source = await readFile(SETTINGS_RENDERER_PATH, "utf8");
  const initialModel = settingsModel({
    language: "en",
    resolvedLanguage: "en",
    helpTitle: "Repository files",
    status: {
      githubIssuesConfiguration: {
        source: "environment",
        writable: false,
        repositories: ["example/docs"],
      },
    },
  });
  const harness = createRendererHarness({ initialModel });

  vm.runInNewContext(source, harness.context, {
    filename: SETTINGS_RENDERER_PATH,
  });
  await settle();

  assert.equal(harness.githubIssuesRepositories.disabled, true);
  assert.equal(harness.saveGithubIssuesRepositoriesButton.hidden, true);
  assert.equal(harness.githubIssuesConfigurationNote.hidden, false);
  assert.match(harness.githubIssuesConfigurationNote.textContent, /managed by OPENGLANCE/);
});

test("settings renderer explains a GitHub API reserve-budget stop", async () => {
  const source = await readFile(SETTINGS_RENDERER_PATH, "utf8");
  const initialModel = settingsModel({
    language: "en",
    resolvedLanguage: "en",
    helpTitle: "Repository files",
    status: {
      githubIssuesConfigured: true,
      githubIssues: [{ label: "docs", value: "12 Issues", status: "ok" }],
    },
  });
  const harness = createRendererHarness({
    initialModel,
    syncGithubIssues: async () => ({
      result: {
        status: "partial_rate_budget",
        completedRepositories: 1,
        requestedRepositories: 3,
        deferredRepositories: 1,
      },
    }),
  });

  vm.runInNewContext(source, harness.context, {
    filename: SETTINGS_RENDERER_PATH,
  });
  await settle();
  harness.syncGithubIssuesButton.dispatch("click", {});
  await settle();

  assert.match(harness.githubIssuesSyncResult.textContent, /reserved GitHub API budget/);
  assert.match(harness.githubIssuesSyncResult.textContent, /1\/3 complete/);
});

function settingsModel({ language, resolvedLanguage, helpTitle, status = {} }) {
  return {
    preferences: {
      language,
      colorMode: "system",
      documentFont: "system-sans",
      documentFontSize: 16,
      fileTreeMode: "content",
      showDocumentTitles: true,
      gitRemoteCheckIntervalMinutes: 10,
    },
    resolvedLanguage,
    helpSections: [{ id: "repository-files", title: helpTitle, body: [] }],
    shortcutGroups: [],
    status,
  };
}

function createRendererHarness({
  initialModel,
  saveResponse,
  updatePreferences,
  checkForUpdates,
  syncGithubIssues,
  configureGithubIssues,
}) {
  const listeners = new Map();
  const savedPatches = [];
  let issueSyncs = 0;
  const issueConfigurations = [];
  const elements = new Map();
  const radios = new Map();
  const documentElement = new FakeElement();
  documentElement.dataset.settingsReady = "false";
  documentElement.style = { setProperty() {} };

  for (const selector of [
    "#settings-navigation",
    "#help-navigation",
    "#settings-content",
    "#settings-back",
    "#document-font-size-value",
    "#git-remote-check-interval",
    "#help-sections",
    "#shortcut-groups",
    "#app-status",
    "#environment-status",
    "#github-issues-status",
    "#github-issues-configuration",
    "#github-issues-repositories",
    "#github-issues-configuration-note",
    "#save-github-issues-repositories",
    "#github-issues-configuration-result",
    "#github-issues-actions",
    "#sync-github-issues",
    "#github-issues-sync-result",
    "#repository-status",
    ".status-actions",
    "#check-for-updates",
    "#update-check-result",
    "#settings-error",
    "#settings-save-status",
  ]) {
    elements.set(selector, new FakeElement());
  }
  const fontSizeInput = new FakeInputElement({
    id: "document-font-size",
    type: "range",
    value: "16",
  });
  elements.set("#document-font-size", fontSizeInput);
  const remoteCheckInterval = new FakeSelectElement({
    id: "git-remote-check-interval",
    value: "10",
  });
  elements.set("#git-remote-check-interval", remoteCheckInterval);

  for (const [name, values] of Object.entries({
    language: ["system", "en", "zh-CN"],
    colorMode: ["system", "light", "dark"],
    documentFont: ["system-sans", "reading-serif"],
    fileTreeMode: ["content", "all"],
    showDocumentTitles: ["true", "false"],
  })) {
    for (const value of values) {
      radios.set(`${name}:${value}`, new FakeInputElement({
        name,
        type: "radio",
        value,
      }));
    }
  }

  const localizedHeading = new FakeElement({
    dataset: { i18n: "appearanceTitle" },
  });
  const localizedAria = new FakeElement({
    dataset: { i18nAriaLabel: "sidebarAria" },
  });

  const document = {
    documentElement,
    title: "",
    querySelector(selector) {
      const radioMatch = selector.match(
        /^input\[name="([^"]+)"\]\[value="([^"]+)"\]$/,
      );
      if (radioMatch) {
        return radios.get(`${radioMatch[1]}:${radioMatch[2]}`) ?? null;
      }
      return elements.get(selector) ?? null;
    },
    querySelectorAll(selector) {
      if (selector === "[data-i18n]") {
        return [localizedHeading];
      }
      if (selector === "[data-i18n-aria-label]") {
        return [localizedAria];
      }
      if (selector === "[data-section-panel]") {
        return [];
      }
      return [];
    },
    createElement() {
      return new FakeElement();
    },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    dispatch(type, event) {
      listeners.get(type)?.(event);
    },
  };

  const api = {
    async getModel() {
      return initialModel;
    },
    async updatePreferences(patch) {
      savedPatches.push(patch);
      return typeof updatePreferences === "function"
        ? updatePreferences(patch)
        : saveResponse;
    },
    async close() {},
    async checkForUpdates() {
      return typeof checkForUpdates === "function"
        ? checkForUpdates()
        : {};
    },
    async syncGithubIssues() {
      issueSyncs += 1;
      return typeof syncGithubIssues === "function"
        ? syncGithubIssues()
        : {};
    },
    async configureGithubIssues(repositories) {
      issueConfigurations.push([...repositories]);
      return typeof configureGithubIssues === "function"
        ? configureGithubIssues(repositories)
        : {};
    },
    async openExternal() {},
    onShow(listener) {
      Promise.resolve().then(() => listener({ model: initialModel }));
      return () => {};
    },
  };
  const window = {
    openGlanceSettings: api,
    matchMedia() {
      return {
        matches: false,
        addEventListener() {},
      };
    },
    requestAnimationFrame(callback) {
      callback();
      return 1;
    },
    setTimeout() {
      return 1;
    },
  };

  return {
    context: {
      console,
      document,
      window,
      navigator: { language: "en-US" },
      HTMLInputElement: FakeInputElement,
      HTMLSelectElement: FakeSelectElement,
      URL,
    },
    document,
    localizedHeading,
    appStatus: elements.get("#app-status"),
    checkForUpdatesButton: elements.get("#check-for-updates"),
    updateCheckResult: elements.get("#update-check-result"),
    githubIssuesActions: elements.get("#github-issues-actions"),
    githubIssuesConfiguration: elements.get("#github-issues-configuration"),
    githubIssuesRepositories: elements.get("#github-issues-repositories"),
    githubIssuesConfigurationNote: elements.get("#github-issues-configuration-note"),
    saveGithubIssuesRepositoriesButton: elements.get("#save-github-issues-repositories"),
    githubIssuesConfigurationResult: elements.get("#github-issues-configuration-result"),
    syncGithubIssuesButton: elements.get("#sync-github-issues"),
    githubIssuesSyncResult: elements.get("#github-issues-sync-result"),
    errorBox: elements.get("#settings-error"),
    remoteCheckInterval,
    savedPatches,
    issueConfigurations,
    get issueSyncs() {
      return issueSyncs;
    },
    radio(name, value) {
      return radios.get(`${name}:${value}`);
    },
  };
}

class FakeElement {
  constructor({
    id = "",
    dataset = {},
    name = "",
    type = "",
    value = "",
  } = {}) {
    this.id = id;
    this.dataset = { ...dataset };
    this.name = name;
    this.type = type;
    this.value = value;
    this.checked = false;
    this.hidden = false;
    this.textContent = "";
    this.children = [];
    this.attributes = new Map();
    this.scrollHeight = 0;
    this.scrollTop = 0;
    this.clientHeight = 0;
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  dispatch(type, event) {
    this.listeners.get(type)?.(event);
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = [...children];
  }

  querySelectorAll() {
    return [];
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  focus() {}

  scrollIntoView() {}

  getBoundingClientRect() {
    return { top: 0 };
  }
}

class FakeInputElement extends FakeElement {}

class FakeSelectElement extends FakeElement {}

async function settle() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}
