(() => {
  "use strict";

  const api = window.openGlanceSettings;
  const messages = Object.freeze({
    en: Object.freeze({
      documentTitle: "OpenGlance Settings & Help",
      backAria: "Back to OpenGlance",
      back: "Back",
      sidebarAria: "Settings and help sections",
      settingsAndHelp: "Settings & Help",
      navGeneral: "General",
      navAppearance: "Appearance",
      navFiles: "Files & Folders",
      navHelp: "Help",
      navShortcuts: "Keyboard Shortcuts",
      navStatus: "About & Status",
      helpNavigationAria: "Help sections",
      generalKicker: "Settings",
      generalTitle: "General",
      generalDescription: "Common preferences for OpenGlance.",
      appearanceKicker: "Appearance",
      appearanceTitle: "Appearance",
      appearanceDescription: "Personal preferences that shape your reading experience.",
      languageTitle: "Interface language",
      languageDescription: "Follow your system language or choose a language for OpenGlance.",
      languageAria: "Interface language",
      languageAuto: "Auto",
      languageSystem: "Follow system",
      colorModeTitle: "Color mode",
      colorModeDescription: "When following the system, OpenGlance switches with macOS or Windows.",
      colorModeAria: "Color mode",
      colorModeSystem: "Follow system",
      colorModeLight: "Light",
      colorModeDark: "Dark",
      documentFontTitle: "Document font",
      documentFontDescription: "Applies to Preview and Live body text; Source always uses a monospace font.",
      documentFontAria: "Document font",
      documentFontSans: "System sans serif",
      documentFontSerif: "Reading serif",
      textSizeTitle: "Text size",
      textSizeDescription: "Adjust body text, Live, Source, and line-number scale together.",
      filesKicker: "Files",
      filesTitle: "Files & Folders",
      filesDescription: "Choose the file tree scope and document-title density.",
      fileTreeTitle: "File tree scope",
      fileTreeDescription: "Hide development configuration noise while reading, or show the complete repository.",
      fileTreeAria: "File tree scope",
      fileTreeContent: "Content files (recommended)",
      fileTreeContentDescription: "Focus on Markdown / MDX, HTML, images, and PDF; show other files when needed.",
      fileTreeAll: "All repository files",
      fileTreeAllDescription: "Show every Git-tracked and non-ignored file.",
      fileTreeBoundary: "This setting changes only the file tree display, not Git change discovery, sync, or commit scope.",
      documentTitlesTitle: "Document titles in the file tree",
      documentTitlesDescription: "Markdown / MDX files with names written without Chinese characters can show their document title on a second line.",
      documentTitlesAria: "Document titles in the file tree",
      documentTitlesShow: "Show document titles (default)",
      documentTitlesShowDescription: "Keep the filename on the first line and show the title beneath it with equal visual weight.",
      documentTitlesHide: "Show filenames only",
      documentTitlesHideDescription: "Use a more compact, single-line file tree.",
      gitRemoteCheckTitle: "Remote update checks",
      gitRemoteCheckDescription: "Choose how often OpenGlance fetches and checks the Git remote.",
      gitRemoteCheckEvery1: "Every minute",
      gitRemoteCheckEvery2: "Every 2 minutes",
      gitRemoteCheckEvery5: "Every 5 minutes",
      gitRemoteCheckEvery10: "Every 10 minutes (default)",
      gitRemoteCheckEvery30: "Every 30 minutes",
      gitRemoteCheckEvery60: "Every 60 minutes",
      gitRemoteCheckEvery120: "Every 120 minutes",
      gitRemoteCheckBoundary: "A clean worktree may fast-forward automatically. This schedule never commits or pushes local changes.",
      helpKicker: "Help",
      helpTitle: "Help",
      helpDescription: "Guidance for files, filters, worktrees, sharing, and privacy.",
      shortcutsKicker: "Keyboard",
      shortcutsTitle: "Keyboard Shortcuts",
      shortcutsDescription: "System menu commands and current OpenGlance keyboard actions.",
      statusKicker: "About & Status",
      statusTitle: "About & Status",
      statusDescription: "View version, environment, and current repository status.",
      updateActionsAria: "Update actions",
      checkForUpdates: "Check for updates",
      desktopOnly: "The settings center is available only in the OpenGlance desktop app.",
      readSettingsFailed: "Unable to read OpenGlance settings.",
      returnFailed: "Unable to return to the workspace.",
      checkingUpdates: "Checking for updates…",
      checkUpdatesFailedShort: "Update check failed",
      checkUpdatesFailed: "Unable to check for updates.",
      saving: "Saving…",
      notSaved: "Not saved",
      saved: "Saved",
      saveFailedShort: "Save failed",
      saveFailed: "Unable to save settings.",
      noHelp: "No help content is available.",
      helpFallback: "Help",
      fileType: "File type",
      contentMode: "Content mode",
      openBehavior: "Open behavior",
      noShortcuts: "No keyboard shortcuts are available.",
      shortcutsFallback: "Keyboard Shortcuts",
      appStatus: "Application",
      noAppStatus: "No application version information is available.",
      environmentStatus: "Environment",
      noEnvironmentStatus: "No environment check information is available.",
      repositoryStatus: "Current repository",
      noRepositoryStatus: "No repository is currently open.",
      githubIssuesStatus: "GitHub Issues local index",
      noGithubIssuesStatus: "No GitHub Issues repositories are configured.",
      githubIssuesScopeTitle: "GitHub Issues repository scope",
      githubIssuesScopeDescription: "Only these repositories are synchronized into the private local index. Enter one owner/name per line.",
      githubIssuesRepositoriesLabel: "Repositories",
      githubIssuesRepositoriesPlaceholder: "owner/repository",
      saveGithubIssuesRepositories: "Save repository scope",
      savingGithubIssuesRepositories: "Saving repository scope…",
      githubIssuesRepositoriesSaved: "Repository scope saved.",
      githubIssuesRepositoriesRequired: "Enter at least one repository as owner/name.",
      githubIssuesRepositoriesEnvironment: "This scope is managed by OPENGLANCE_GITHUB_ISSUES_REPOSITORIES and is read-only in the App.",
      githubIssuesRepositoriesInvalid: "The local repository scope is invalid. Repair it with the OpenGlance CLI before editing it in the App.",
      githubIssuesRepositoriesSaveFailedShort: "Repository scope was not saved",
      githubIssuesRepositoriesSaveFailed: "Unable to save the GitHub Issues repository scope.",
      githubIssuesActionsAria: "GitHub Issues actions",
      syncGithubIssues: "Sync GitHub Issues",
      syncingGithubIssues: "Syncing GitHub Issues…",
      githubIssuesSyncComplete: "Synced {completed}/{requested} repositories using {requests} API pages.",
      githubIssuesSyncInProgress: "Another process is already syncing {count} repositories; existing snapshots remain available.",
      githubIssuesSyncBudgetPaused: "Sync paused before using the reserved GitHub API budget: {completed}/{requested} complete, {deferred} deferred.",
      githubIssuesSyncRateLimited: "GitHub rate limiting stopped sync: {completed}/{requested} complete, {deferred} deferred.",
      githubIssuesSyncPartial: "Sync finished with {failed} repository failures.",
      githubIssuesSyncFailedShort: "Issue sync failed",
      githubIssuesSyncFailed: "Unable to sync the GitHub Issues local index.",
      openLinkFailed: "Unable to open the link.",
      updateCurrent: "OpenGlance is up to date.",
      updateAvailable: "An update is available.",
      updateDownloading: "Downloading update…",
      updateError: "Update check failed.",
      updateStarted: "Update check started.",
    }),
    "zh-CN": Object.freeze({
      documentTitle: "OpenGlance 设置与帮助",
      backAria: "返回 OpenGlance",
      back: "返回",
      sidebarAria: "设置与帮助栏目",
      settingsAndHelp: "设置与帮助",
      navGeneral: "常规",
      navAppearance: "外观",
      navFiles: "文件与目录",
      navHelp: "使用帮助",
      navShortcuts: "快捷键",
      navStatus: "关于与状态",
      helpNavigationAria: "使用帮助章节",
      generalKicker: "设置",
      generalTitle: "常规",
      generalDescription: "OpenGlance 的常用设置。",
      appearanceKicker: "外观",
      appearanceTitle: "外观",
      appearanceDescription: "只保留会持续影响阅读体验的个人偏好。",
      languageTitle: "界面语言",
      languageDescription: "跟随系统语言，或为 OpenGlance 选择固定语言。",
      languageAria: "界面语言",
      languageAuto: "自动",
      languageSystem: "跟随系统",
      colorModeTitle: "明暗模式",
      colorModeDescription: "跟随系统时，OpenGlance 会随 macOS 或 Windows 的外观自动切换。",
      colorModeAria: "明暗模式",
      colorModeSystem: "跟随系统",
      colorModeLight: "浅色",
      colorModeDark: "深色",
      documentFontTitle: "文档字体",
      documentFontDescription: "影响 Preview 和 Live 的正文；Source 始终使用等宽字体。",
      documentFontAria: "文档字体",
      documentFontSans: "系统无衬线",
      documentFontSerif: "阅读衬线",
      textSizeTitle: "文字大小",
      textSizeDescription: "统一调整文档正文、Live、Source 和行号的排版比例。",
      filesKicker: "文件",
      filesTitle: "文件与目录",
      filesDescription: "设置左侧目录树的文件范围与文档标题密度。",
      fileTreeTitle: "目录树显示范围",
      fileTreeDescription: "面向阅读者时可以隐藏开发配置噪音，需要时仍可查看完整仓库。",
      fileTreeAria: "目录树显示范围",
      fileTreeContent: "内容文件（推荐）",
      fileTreeContentDescription: "聚焦 Markdown / MDX、HTML、图片和 PDF；其他文件按需显示。",
      fileTreeAll: "全部仓库文件",
      fileTreeAllDescription: "显示 Git 已跟踪和未被忽略的所有文件。",
      fileTreeBoundary: "此设置只改变目录树显示，不改变 Git 改动发现、同步或提交范围。",
      documentTitlesTitle: "目录树文档标题",
      documentTitlesDescription: "Markdown／MDX 使用不含汉字的文件名时，可在第二行显示文档标题。",
      documentTitlesAria: "目录树文档标题",
      documentTitlesShow: "显示文档标题（默认）",
      documentTitlesShowDescription: "第一行保留文件名，第二行以同等视觉层级显示文档标题。",
      documentTitlesHide: "仅显示文件名",
      documentTitlesHideDescription: "使用更紧凑的单行目录。",
      gitRemoteCheckTitle: "远端更新检查",
      gitRemoteCheckDescription: "设置 OpenGlance 获取并检查 Git 远端变化的频率。",
      gitRemoteCheckEvery1: "每 1 分钟",
      gitRemoteCheckEvery2: "每 2 分钟",
      gitRemoteCheckEvery5: "每 5 分钟",
      gitRemoteCheckEvery10: "每 10 分钟（默认）",
      gitRemoteCheckEvery30: "每 30 分钟",
      gitRemoteCheckEvery60: "每 60 分钟",
      gitRemoteCheckEvery120: "每 120 分钟",
      gitRemoteCheckBoundary: "工作区干净时可以自动快进；这个定时检查绝不会自动提交或推送本地修改。",
      helpKicker: "帮助",
      helpTitle: "使用帮助",
      helpDescription: "文件、筛选、worktree、分享和隐私说明集中在这里。",
      shortcutsKicker: "键盘",
      shortcutsTitle: "快捷键",
      shortcutsDescription: "保留系统菜单入口和 OpenGlance 当前键盘操作。",
      statusKicker: "关于与状态",
      statusTitle: "关于与状态",
      statusDescription: "查看版本、运行环境以及当前仓库状态。",
      updateActionsAria: "更新操作",
      checkForUpdates: "检查更新",
      desktopOnly: "设置中心只能在 OpenGlance 桌面版中使用。",
      readSettingsFailed: "无法读取 OpenGlance 设置。",
      returnFailed: "无法返回工作台。",
      checkingUpdates: "正在检查更新…",
      checkUpdatesFailedShort: "检查更新失败",
      checkUpdatesFailed: "检查更新失败。",
      saving: "正在保存…",
      notSaved: "未保存",
      saved: "已保存",
      saveFailedShort: "保存失败",
      saveFailed: "设置保存失败。",
      noHelp: "暂无帮助内容。",
      helpFallback: "帮助",
      fileType: "文件类型",
      contentMode: "内容模式",
      openBehavior: "打开方式",
      noShortcuts: "暂无快捷键内容。",
      shortcutsFallback: "快捷键",
      appStatus: "应用",
      noAppStatus: "暂无应用版本信息。",
      environmentStatus: "运行环境",
      noEnvironmentStatus: "暂无环境检查信息。",
      repositoryStatus: "当前仓库",
      noRepositoryStatus: "当前没有打开仓库。",
      githubIssuesStatus: "GitHub Issues 本地索引",
      noGithubIssuesStatus: "尚未配置 GitHub Issues 仓库。",
      githubIssuesScopeTitle: "GitHub Issues 仓库范围",
      githubIssuesScopeDescription: "只有这里列出的仓库会同步到本机私有索引。每行填写一个 owner/name。",
      githubIssuesRepositoriesLabel: "仓库",
      githubIssuesRepositoriesPlaceholder: "owner/repository",
      saveGithubIssuesRepositories: "保存仓库范围",
      savingGithubIssuesRepositories: "正在保存仓库范围…",
      githubIssuesRepositoriesSaved: "仓库范围已保存。",
      githubIssuesRepositoriesRequired: "请至少填写一个 owner/name 格式的仓库。",
      githubIssuesRepositoriesEnvironment: "当前范围由 OPENGLANCE_GITHUB_ISSUES_REPOSITORIES 管理，App 内只读。",
      githubIssuesRepositoriesInvalid: "本地仓库范围配置无效；请先用 OpenGlance CLI 修复，再在 App 中维护。",
      githubIssuesRepositoriesSaveFailedShort: "仓库范围未保存",
      githubIssuesRepositoriesSaveFailed: "无法保存 GitHub Issues 仓库范围。",
      githubIssuesActionsAria: "GitHub Issues 操作",
      syncGithubIssues: "同步 GitHub Issues",
      syncingGithubIssues: "正在同步 GitHub Issues…",
      githubIssuesSyncComplete: "已同步 {completed}/{requested} 个仓库，共使用 {requests} 个 API 分页请求。",
      githubIssuesSyncInProgress: "另一个进程正在同步 {count} 个仓库；现有快照仍可查询。",
      githubIssuesSyncBudgetPaused: "为保留 GitHub API 安全预算，同步已暂停：完成 {completed}/{requested} 个，延后 {deferred} 个。",
      githubIssuesSyncRateLimited: "GitHub 限流已中止同步：完成 {completed}/{requested} 个，延后 {deferred} 个。",
      githubIssuesSyncPartial: "同步完成，但有 {failed} 个仓库失败。",
      githubIssuesSyncFailedShort: "Issue 同步失败",
      githubIssuesSyncFailed: "无法同步 GitHub Issues 本地索引。",
      openLinkFailed: "无法打开链接。",
      updateCurrent: "OpenGlance 已经是最新版本。",
      updateAvailable: "发现可用更新。",
      updateDownloading: "正在下载更新…",
      updateError: "检查更新失败。",
      updateStarted: "检查已开始。",
    }),
  });
  const sections = new Set(["general", "appearance", "files", "help", "shortcuts", "status"]);
  const navigation = document.querySelector("#settings-navigation");
  const helpNavigation = document.querySelector("#help-navigation");
  const content = document.querySelector("#settings-content");
  const backButton = document.querySelector("#settings-back");
  const fontSizeInput = document.querySelector("#document-font-size");
  const fontSizeOutput = document.querySelector("#document-font-size-value");
  const gitRemoteCheckInterval = document.querySelector("#git-remote-check-interval");
  const helpSections = document.querySelector("#help-sections");
  const shortcutGroups = document.querySelector("#shortcut-groups");
  const appStatus = document.querySelector("#app-status");
  const environmentStatus = document.querySelector("#environment-status");
  const githubIssuesStatus = document.querySelector("#github-issues-status");
  const githubIssuesConfiguration = document.querySelector("#github-issues-configuration");
  const githubIssuesRepositories = document.querySelector("#github-issues-repositories");
  const githubIssuesConfigurationNote = document.querySelector("#github-issues-configuration-note");
  const saveGithubIssuesRepositoriesButton = document.querySelector("#save-github-issues-repositories");
  const githubIssuesConfigurationResult = document.querySelector("#github-issues-configuration-result");
  const githubIssuesActions = document.querySelector("#github-issues-actions");
  const syncGithubIssuesButton = document.querySelector("#sync-github-issues");
  const githubIssuesSyncResult = document.querySelector("#github-issues-sync-result");
  const repositoryStatus = document.querySelector("#repository-status");
  const updateActions = document.querySelector(".status-actions");
  const checkForUpdatesButton = document.querySelector("#check-for-updates");
  const updateCheckResult = document.querySelector("#update-check-result");
  const errorBox = document.querySelector("#settings-error");
  const saveStatus = document.querySelector("#settings-save-status");
  const systemColorQuery = window.matchMedia("(prefers-color-scheme: dark)");
  let currentSection = "general";
  let currentPreferences = {};
  let currentLanguage = "en";
  let applyingModel = false;
  let saveGeneration = 0;
  let saveQueue = Promise.resolve();
  let updateCheckGeneration = 0;
  let githubIssuesSyncGeneration = 0;
  let githubIssuesConfigurationGeneration = 0;
  let helpScrollFrame = 0;

  navigation.addEventListener("click", handleNavigationClick);
  helpNavigation.addEventListener("click", handleHelpNavigationClick);
  content.addEventListener("scroll", handleHelpContentScroll, { passive: true });
  backButton.addEventListener("click", closeSettingsCenter);
  document.addEventListener("keydown", handleSettingsKeydown, true);
  document.addEventListener("change", handlePreferenceChange);
  document.addEventListener("click", handleExternalLinkClick);
  fontSizeInput.addEventListener("input", updateFontSizeOutput);
  systemColorQuery.addEventListener?.("change", handleSystemColorChange);

  if (!api) {
    applyLanguage(browserLanguage());
    showError(t("desktopOnly"));
    revealSettings();
    return;
  }

  checkForUpdatesButton.addEventListener("click", checkForUpdates);
  syncGithubIssuesButton.addEventListener("click", syncGithubIssues);
  saveGithubIssuesRepositoriesButton.addEventListener("click", configureGithubIssues);
  api.onShow((payload) => {
    if (payload?.model) {
      applyModel(payload.model);
    }
    if (payload?.status) {
      renderStatus(payload.status);
    }
    if (payload?.section) {
      showSection(payload.section);
    }
  });

  async function loadModel() {
    try {
      applyModel(await api.getModel());
    } catch (error) {
      showError(errorMessage(error, t("readSettingsFailed")));
      revealSettings();
    }
  }

  function applyModel(model = {}) {
    applyingModel = true;
    try {
      applyLanguage(model.resolvedLanguage);
      currentPreferences = isRecord(model.preferences) ? { ...model.preferences } : {};
      setRadioValue("language", currentPreferences.language || "system");
      setRadioValue("colorMode", currentPreferences.colorMode || "system");
      setRadioValue("documentFont", currentPreferences.documentFont || "system-sans");
      setRadioValue("fileTreeMode", currentPreferences.fileTreeMode || "content");
      setRadioValue(
        "showDocumentTitles",
        currentPreferences.showDocumentTitles === false ? "false" : "true",
      );
      gitRemoteCheckInterval.value = String(
        remoteCheckInterval(currentPreferences.gitRemoteCheckIntervalMinutes),
      );
      const fontSize = integerInRange(currentPreferences.documentFontSize, 14, 22, 16);
      fontSizeInput.value = String(fontSize);
      updateFontSizeOutput();
      applyAppearance(currentPreferences);
      renderHelp(model.helpSections);
      renderShortcuts(model.shortcutGroups);
      renderStatus(model.status);
      hideError();
    } finally {
      applyingModel = false;
      revealSettings();
    }
  }

  function showSection(value) {
    currentSection = sections.has(value) ? value : "general";
    for (const button of navigation.querySelectorAll("[data-section]")) {
      if (button.dataset.section === currentSection) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    }
    for (const panel of document.querySelectorAll("[data-section-panel]")) {
      panel.hidden = panel.dataset.sectionPanel !== currentSection;
    }
    helpNavigation.hidden = currentSection !== "help";
    content.scrollTop = 0;
    window.requestAnimationFrame(() => {
      document.querySelector(`[data-section-panel="${currentSection}"] h1`)?.focus?.({
        preventScroll: true,
      });
      content.focus({ preventScroll: true });
      updateActiveHelpNavigation();
    });
  }

  function handleNavigationClick(event) {
    const button = event.target.closest?.("[data-section]");
    if (button) {
      showSection(button.dataset.section);
    }
  }

  function handleSettingsKeydown(event) {
    if (event.isComposing || event.altKey) {
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeSettingsCenter();
      return;
    }

    const primary = event.metaKey || event.ctrlKey;
    if (!primary) {
      return;
    }
    if (!event.shiftKey && event.key === ",") {
      event.preventDefault();
      event.stopPropagation();
      showSection("general");
      return;
    }
    if (
      event.shiftKey &&
      (event.code === "Slash" || event.key === "?")
    ) {
      event.preventDefault();
      event.stopPropagation();
      showSection("shortcuts");
    }
  }

  function closeSettingsCenter() {
    void api.close().catch((error) => {
      showError(errorMessage(error, t("returnFailed")));
    });
  }

  async function checkForUpdates() {
    const generation = ++updateCheckGeneration;
    checkForUpdatesButton.disabled = true;
    updateCheckResult.textContent = t("checkingUpdates");
    try {
      const response = await api.checkForUpdates();
      if (generation !== updateCheckGeneration) {
        return;
      }
      updateCheckResult.textContent = updateResultMessage(response?.result);
    } catch (error) {
      if (generation !== updateCheckGeneration) {
        return;
      }
      updateCheckResult.textContent = t("checkUpdatesFailedShort");
      showError(errorMessage(error, t("checkUpdatesFailed")));
    } finally {
      if (generation === updateCheckGeneration) {
        checkForUpdatesButton.disabled = false;
      }
    }
  }

  async function syncGithubIssues() {
    const generation = ++githubIssuesSyncGeneration;
    syncGithubIssuesButton.disabled = true;
    githubIssuesSyncResult.textContent = t("syncingGithubIssues");
    try {
      const response = await api.syncGithubIssues();
      if (generation !== githubIssuesSyncGeneration) {
        return;
      }
      githubIssuesSyncResult.textContent = githubIssuesSyncMessage(response?.result);
    } catch (error) {
      if (generation !== githubIssuesSyncGeneration) {
        return;
      }
      githubIssuesSyncResult.textContent = t("githubIssuesSyncFailedShort");
      showError(errorMessage(error, t("githubIssuesSyncFailed")));
    } finally {
      if (generation === githubIssuesSyncGeneration) {
        syncGithubIssuesButton.disabled = false;
      }
    }
  }

  async function configureGithubIssues() {
    const repositories = githubIssuesRepositories.value
      .split(/[\s,]+/u)
      .map((repository) => repository.trim())
      .filter(Boolean);
    if (repositories.length === 0) {
      githubIssuesConfigurationResult.textContent = t("githubIssuesRepositoriesRequired");
      return;
    }
    const generation = ++githubIssuesConfigurationGeneration;
    saveGithubIssuesRepositoriesButton.disabled = true;
    githubIssuesConfigurationResult.textContent = t("savingGithubIssuesRepositories");
    try {
      const response = await api.configureGithubIssues(repositories);
      if (generation !== githubIssuesConfigurationGeneration) {
        return;
      }
      if (Array.isArray(response?.result?.repositories)) {
        githubIssuesRepositories.value = response.result.repositories.join("\n");
      }
      githubIssuesConfigurationResult.textContent = t("githubIssuesRepositoriesSaved");
      hideError();
    } catch (error) {
      if (generation !== githubIssuesConfigurationGeneration) {
        return;
      }
      githubIssuesConfigurationResult.textContent = t("githubIssuesRepositoriesSaveFailedShort");
      showError(errorMessage(error, t("githubIssuesRepositoriesSaveFailed")));
    } finally {
      if (generation === githubIssuesConfigurationGeneration) {
        saveGithubIssuesRepositoriesButton.disabled = false;
      }
    }
  }

  function handlePreferenceChange(event) {
    if (applyingModel) {
      return;
    }
    const input = event.target;
    if (
      !(input instanceof HTMLInputElement)
      && !(input instanceof HTMLSelectElement)
    ) {
      return;
    }

    let patch = null;
    if (
      input instanceof HTMLInputElement &&
      input.type === "radio"
      && [
        "language",
        "colorMode",
        "documentFont",
        "fileTreeMode",
        "showDocumentTitles",
      ].includes(input.name)
    ) {
      patch = input.name === "showDocumentTitles"
        ? { showDocumentTitles: input.value !== "false" }
        : { [input.name]: input.value };
    } else if (
      input instanceof HTMLInputElement
      && input.id === "document-font-size"
    ) {
      patch = { documentFontSize: Number.parseInt(input.value, 10) };
    } else if (input.id === "git-remote-check-interval") {
      patch = {
        gitRemoteCheckIntervalMinutes: remoteCheckInterval(input.value),
      };
    }
    if (!patch) {
      return;
    }

    currentPreferences = { ...currentPreferences, ...patch };
    applyAppearance(currentPreferences);
    void savePreferencePatch(patch);
  }

  function savePreferencePatch(patch) {
    const queuedSave = saveQueue.then(() => persistPreferencePatch(patch));
    saveQueue = queuedSave.catch(() => {});
    return queuedSave;
  }

  async function persistPreferencePatch(patch) {
    const generation = ++saveGeneration;
    saveStatus.textContent = t("saving");
    try {
      const result = await api.updatePreferences(patch);
      if (isRecord(result?.model)) {
        const modelPreferences = isRecord(result.model.preferences)
          ? result.model.preferences
          : {};
        if (
          !Object.hasOwn(modelPreferences, "language")
          || modelPreferences.language === currentPreferences.language
        ) {
          applyModel({
            ...result.model,
            preferences: {
              ...modelPreferences,
              ...currentPreferences,
            },
          });
        }
      } else if (isRecord(result?.preferences)) {
        currentPreferences = {
          ...result.preferences,
          ...currentPreferences,
        };
      }
      if (generation !== saveGeneration) {
        return;
      }
      saveStatus.textContent = result?.ok === false ? t("notSaved") : t("saved");
      window.setTimeout(() => {
        if (generation === saveGeneration) {
          saveStatus.textContent = "";
        }
      }, 1200);
    } catch (error) {
      if (generation !== saveGeneration) {
        return;
      }
      saveStatus.textContent = t("saveFailedShort");
      showError(errorMessage(error, t("saveFailed")));
      await loadModel();
    }
  }

  function applyAppearance(preferences) {
    const colorMode = preferences.colorMode || "system";
    const effectiveTheme = colorMode === "system"
      ? systemColorQuery.matches ? "dark" : "light"
      : colorMode;
    document.documentElement.dataset.theme = effectiveTheme;
    document.documentElement.dataset.colorMode = colorMode;
    document.documentElement.dataset.documentFont = preferences.documentFont || "system-sans";
  }

  function handleSystemColorChange() {
    if ((currentPreferences.colorMode || "system") === "system") {
      applyAppearance(currentPreferences);
    }
  }

  function updateFontSizeOutput() {
    fontSizeOutput.textContent = `${fontSizeInput.value} px`;
  }

  function renderHelp(value) {
    helpSections.replaceChildren();
    const sectionsToRender = Array.isArray(value) ? value : [];
    renderHelpNavigation(sectionsToRender);
    if (sectionsToRender.length === 0) {
      helpSections.append(emptyCard(t("noHelp")));
      return;
    }

    sectionsToRender.forEach((section, index) => {
      const articleSection = document.createElement("section");
      articleSection.className = "help-document-section";
      articleSection.id = helpSectionTarget(section, index);
      const title = document.createElement("h2");
      title.textContent = stringValue(section?.title, t("helpFallback"));
      articleSection.append(title);
      const paragraphs = Array.isArray(section?.body) ? section.body : [];
      for (const paragraphValue of paragraphs) {
        const paragraph = document.createElement("p");
        paragraph.textContent = stringValue(paragraphValue);
        articleSection.append(paragraph);
      }
      if (Array.isArray(section?.fileTypes)) {
        articleSection.append(renderHelpFileTable(section.fileTypes));
      }
      appendLinks(articleSection, section?.links);
      helpSections.append(articleSection);
    });
    window.requestAnimationFrame(updateActiveHelpNavigation);
  }

  function renderHelpNavigation(value) {
    helpNavigation.replaceChildren();
    const sectionsToRender = Array.isArray(value) ? value : [];
    sectionsToRender.forEach((section, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.helpTarget = helpSectionTarget(section, index);
      button.textContent = stringValue(section?.title, t("helpFallback"));
      helpNavigation.append(button);
    });
  }

  function handleHelpNavigationClick(event) {
    const button = event.target.closest?.("[data-help-target]");
    if (!button) {
      return;
    }
    const target = document.getElementById(button.dataset.helpTarget);
    if (!target) {
      return;
    }
    setActiveHelpNavigation(button.dataset.helpTarget);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleHelpContentScroll() {
    if (currentSection !== "help" || helpScrollFrame) {
      return;
    }
    helpScrollFrame = window.requestAnimationFrame(() => {
      helpScrollFrame = 0;
      updateActiveHelpNavigation();
    });
  }

  function updateActiveHelpNavigation() {
    if (currentSection !== "help") {
      return;
    }
    const buttons = [...helpNavigation.querySelectorAll("[data-help-target]")];
    if (buttons.length === 0) {
      return;
    }
    const remainingScroll = content.scrollHeight - content.scrollTop - content.clientHeight;
    if (remainingScroll <= 2) {
      setActiveHelpNavigation(buttons.at(-1).dataset.helpTarget);
      return;
    }
    const threshold = content.getBoundingClientRect().top + 88;
    let activeTarget = buttons[0].dataset.helpTarget;
    for (const button of buttons) {
      const section = document.getElementById(button.dataset.helpTarget);
      if (section && section.getBoundingClientRect().top <= threshold) {
        activeTarget = button.dataset.helpTarget;
      }
    }
    setActiveHelpNavigation(activeTarget);
  }

  function setActiveHelpNavigation(target) {
    for (const button of helpNavigation.querySelectorAll("[data-help-target]")) {
      if (button.dataset.helpTarget === target) {
        button.setAttribute("aria-current", "location");
      } else {
        button.removeAttribute("aria-current");
      }
    }
  }

  function renderHelpFileTable(rowsValue) {
    const wrapper = document.createElement("div");
    wrapper.className = "help-file-table-wrap";
    const table = document.createElement("table");
    table.className = "help-file-table";
    const head = document.createElement("thead");
    const headingRow = document.createElement("tr");
    for (const heading of [t("fileType"), t("contentMode"), t("openBehavior")]) {
      const cell = document.createElement("th");
      cell.scope = "col";
      cell.textContent = heading;
      headingRow.append(cell);
    }
    head.append(headingRow);
    const body = document.createElement("tbody");
    for (const rowValue of Array.isArray(rowsValue) ? rowsValue : []) {
      const row = document.createElement("tr");
      for (const value of [rowValue?.files, rowValue?.visibility, rowValue?.behavior]) {
        const cell = document.createElement("td");
        cell.textContent = stringValue(value);
        row.append(cell);
      }
      body.append(row);
    }
    table.append(head, body);
    wrapper.append(table);
    return wrapper;
  }

  function helpSectionTarget(section, index) {
    const explicitId = stringValue(section?.id)
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `help-${explicitId || index + 1}`;
  }

  function renderShortcuts(value) {
    shortcutGroups.replaceChildren();
    const groups = Array.isArray(value) ? value : [];
    if (groups.length === 0) {
      shortcutGroups.append(emptyCard(t("noShortcuts")));
      return;
    }

    for (const group of groups) {
      const section = document.createElement("section");
      section.className = "shortcut-group";
      const title = document.createElement("h2");
      title.textContent = stringValue(group?.title, t("shortcutsFallback"));
      section.append(title);
      const list = document.createElement("div");
      list.className = "shortcut-list";
      for (const shortcut of Array.isArray(group?.shortcuts) ? group.shortcuts : []) {
        const row = document.createElement("div");
        row.className = "shortcut-row";
        const keys = document.createElement("kbd");
        keys.textContent = stringValue(shortcut?.keys);
        const action = document.createElement("span");
        action.textContent = stringValue(shortcut?.action);
        row.append(keys, action);
        list.append(row);
      }
      section.append(list);
      shortcutGroups.append(section);
    }
  }

  function renderStatus(value) {
    const status = isRecord(value) ? value : {};
    updateActions.hidden = status.updatesEnabled !== true;
    githubIssuesActions.hidden = status.githubIssuesConfigured !== true;
    renderGithubIssuesConfiguration(status.githubIssuesConfiguration);
    renderStatusBlock(
      appStatus,
      t("appStatus"),
      status.app || status.application,
      t("noAppStatus"),
    );
    renderStatusBlock(
      environmentStatus,
      t("environmentStatus"),
      status.environment || status.checks,
      t("noEnvironmentStatus"),
    );
    renderStatusBlock(
      githubIssuesStatus,
      t("githubIssuesStatus"),
      status.githubIssues,
      t("noGithubIssuesStatus"),
    );
    renderStatusBlock(
      repositoryStatus,
      t("repositoryStatus"),
      status.repository,
      t("noRepositoryStatus"),
    );
  }

  function renderGithubIssuesConfiguration(value) {
    const configuration = isRecord(value) ? value : null;
    githubIssuesConfiguration.hidden = !configuration;
    if (!configuration) {
      return;
    }
    const repositories = Array.isArray(configuration.repositories)
      ? configuration.repositories.filter((repository) => typeof repository === "string")
      : [];
    githubIssuesRepositories.value = repositories.join("\n");
    const writable = configuration.writable === true;
    githubIssuesRepositories.disabled = !writable;
    saveGithubIssuesRepositoriesButton.hidden = !writable;
    githubIssuesConfigurationNote.hidden = writable;
    githubIssuesConfigurationNote.textContent = writable
      ? ""
      : configuration.source === "environment"
        ? t("githubIssuesRepositoriesEnvironment")
        : t("githubIssuesRepositoriesInvalid");
  }

  function githubIssuesSyncMessage(value) {
    if (!isRecord(value)) {
      return t("githubIssuesSyncFailedShort");
    }
    if (value.status === "complete") {
      return interpolate(t("githubIssuesSyncComplete"), {
        completed: value.completedRepositories,
        requested: value.requestedRepositories,
        requests: value.apiRequests,
      });
    }
    if (value.status === "sync_in_progress") {
      return interpolate(t("githubIssuesSyncInProgress"), {
        count: value.inProgressRepositories,
      });
    }
    if (value.status === "partial_rate_budget") {
      return interpolate(t("githubIssuesSyncBudgetPaused"), {
        completed: value.completedRepositories,
        requested: value.requestedRepositories,
        deferred: value.deferredRepositories,
      });
    }
    if (value.status === "rate_limited") {
      return interpolate(t("githubIssuesSyncRateLimited"), {
        completed: value.completedRepositories,
        requested: value.requestedRepositories,
        deferred: value.deferredRepositories,
      });
    }
    return interpolate(t("githubIssuesSyncPartial"), {
      failed: value.failedRepositories,
    });
  }

  function renderStatusBlock(container, titleValue, value, emptyMessage) {
    container.replaceChildren();
    const title = document.createElement("h2");
    title.textContent = titleValue;
    container.append(title);
    const rows = statusRows(value);
    if (rows.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-card";
      empty.textContent = emptyMessage;
      container.append(empty);
      return;
    }

    const list = document.createElement("dl");
    list.className = "status-list";
    for (const rowValue of rows) {
      const row = document.createElement("div");
      row.className = "status-row";
      const label = document.createElement("dt");
      label.textContent = rowValue.label;
      const detail = document.createElement("dd");
      detail.className = "status-value";
      if (rowValue.status) {
        detail.dataset.status = rowValue.status;
      }
      if (rowValue.url) {
        const link = document.createElement("a");
        link.className = "status-link";
        link.href = rowValue.url;
        link.textContent = rowValue.value;
        detail.append(link);
      } else {
        detail.textContent = rowValue.value;
      }
      row.append(label, detail);
      list.append(row);
    }
    container.append(list);
  }

  function statusRows(value) {
    if (Array.isArray(value)) {
      return value.map((item, index) => statusRow(item, String(index + 1))).filter(Boolean);
    }
    if (!isRecord(value)) {
      return [];
    }
    return Object.entries(value).map(([key, item]) => statusRow(item, key)).filter(Boolean);
  }

  function statusRow(value, fallbackLabel) {
    if (isRecord(value)) {
      const label = stringValue(value.label || value.title || value.name || fallbackLabel);
      const detail = stringValue(value.message || value.value || value.detail || value.status);
      if (!label || !detail) {
        return null;
      }
      return {
        label,
        value: detail,
        status: normalizedStatus(value.status),
        url: externalUrl(value.url),
      };
    }
    const detail = stringValue(value);
    return detail ? { label: humanizeKey(fallbackLabel), value: detail, status: "", url: "" } : null;
  }

  function appendLinks(container, value) {
    for (const linkValue of Array.isArray(value) ? value : []) {
      const url = externalUrl(linkValue?.url);
      if (!url) {
        continue;
      }
      const paragraph = document.createElement("p");
      const link = document.createElement("a");
      link.className = "status-link";
      link.href = url;
      link.textContent = stringValue(linkValue?.label, url);
      paragraph.append(link);
      container.append(paragraph);
    }
  }

  function handleExternalLinkClick(event) {
    const link = event.target.closest?.("a[href]");
    if (!link) {
      return;
    }
    const url = externalUrl(link.href);
    event.preventDefault();
    if (!url) {
      return;
    }
    void api.openExternal(url).catch((error) => {
      showError(errorMessage(error, t("openLinkFailed")));
    });
  }

  function setRadioValue(name, value) {
    const input = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (input) {
      input.checked = true;
    }
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function hideError() {
    errorBox.hidden = true;
    errorBox.textContent = "";
  }

  function emptyCard(message) {
    const element = document.createElement("div");
    element.className = "empty-card";
    element.textContent = message;
    return element;
  }

  function normalizedStatus(value) {
    const status = String(value ?? "").trim().toLowerCase();
    if (["ok", "success", "ready"].includes(status)) {
      return "ok";
    }
    if (["warn", "warning"].includes(status)) {
      return "warning";
    }
    if (["error", "failed", "blocked"].includes(status)) {
      return "error";
    }
    return "";
  }

  function externalUrl(value) {
    try {
      const url = new URL(String(value ?? ""));
      return ["https:", "http:", "mailto:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function humanizeKey(value) {
    return String(value ?? "")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[-_]+/g, " ")
      .replace(/^./, (character) => character.toUpperCase());
  }

  function integerInRange(value, min, max, fallback) {
    const number = Number(value);
    return Number.isInteger(number) && number >= min && number <= max ? number : fallback;
  }

  function remoteCheckInterval(value) {
    const number = Number(value);
    return [1, 2, 5, 10, 30, 60, 120].includes(number) ? number : 10;
  }

  function stringValue(value, fallback = "") {
    const string = String(value ?? "").trim();
    return string || fallback;
  }

  function interpolate(template, values) {
    return String(template).replace(/\{([^}]+)\}/gu, (_match, key) => String(values[key] ?? ""));
  }

  function errorMessage(_error, fallback) {
    return fallback;
  }

  function updateResultMessage(value) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (isRecord(value) && typeof value.message === "string" && value.message.trim()) {
      return value.message.trim();
    }
    const state = isRecord(value) ? String(value.state ?? "").trim().toLowerCase() : "";
    switch (state) {
      case "current":
        return t("updateCurrent");
      case "available":
        return t("updateAvailable");
      case "downloading":
        return t("updateDownloading");
      case "error":
        return t("updateError");
      default:
        return t("updateStarted");
    }
  }

  function applyLanguage(value) {
    const nextLanguage = normalizedLanguage(value);
    const languageChanged = nextLanguage !== currentLanguage;
    currentLanguage = nextLanguage;
    if (languageChanged) {
      updateCheckGeneration += 1;
      githubIssuesSyncGeneration += 1;
      githubIssuesConfigurationGeneration += 1;
      updateCheckResult.textContent = "";
      githubIssuesSyncResult.textContent = "";
      githubIssuesConfigurationResult.textContent = "";
      checkForUpdatesButton.disabled = false;
      syncGithubIssuesButton.disabled = false;
      saveGithubIssuesRepositoriesButton.disabled = false;
    }
    document.documentElement.lang = currentLanguage;
    document.documentElement.dataset.language = currentLanguage;
    document.title = t("documentTitle");
    for (const element of document.querySelectorAll("[data-i18n]")) {
      element.textContent = t(element.dataset.i18n);
    }
    for (const element of document.querySelectorAll("[data-i18n-aria-label]")) {
      element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
    }
    for (const element of document.querySelectorAll("[data-i18n-placeholder]")) {
      element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
    }
  }

  function normalizedLanguage(value) {
    return String(value ?? "").trim().toLowerCase().startsWith("zh") ? "zh-CN" : "en";
  }

  function browserLanguage() {
    return navigator.language || "en";
  }

  function t(key) {
    return messages[currentLanguage]?.[key] || messages.en[key] || key;
  }

  function revealSettings() {
    document.documentElement.dataset.settingsReady = "true";
  }

  function isRecord(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }
})();
