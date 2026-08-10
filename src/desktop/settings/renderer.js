(() => {
  "use strict";

  const api = window.gitLeafSettings;
  const messages = Object.freeze({
    en: Object.freeze({
      documentTitle: "Git Leaf Settings & Help",
      backAria: "Back to Git Leaf",
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
      generalDescription: "Common preferences for Git Leaf.",
      appearanceKicker: "Appearance",
      appearanceTitle: "Appearance",
      appearanceDescription: "Personal preferences that shape your reading experience.",
      languageTitle: "Interface language",
      languageDescription: "Follow your system language or choose a language for Git Leaf.",
      languageAria: "Interface language",
      languageAuto: "Auto",
      languageSystem: "Follow system",
      colorModeTitle: "Color mode",
      colorModeDescription: "When following the system, Git Leaf switches with macOS or Windows.",
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
      gitRemoteCheckDescription: "Choose how often Git Leaf fetches and checks the Git remote.",
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
      shortcutsDescription: "Click an editable shortcut, then press a new key combination. Conflicting bindings are rejected.",
      shortcutResetAll: "Restore all defaults",
      shortcutReset: "Restore default",
      shortcutRecord: "Change shortcut",
      shortcutRecording: "Press shortcut…",
      shortcutUnassigned: "Unassigned",
      shortcutClearHint: "Backspace or Delete removes a binding; Escape cancels.",
      shortcutConflict: "This shortcut is already used by {action}.",
      statusKicker: "About & Status",
      statusTitle: "About & Status",
      statusDescription: "View version, environment, and current repository status.",
      updateActionsAria: "Update actions",
      checkForUpdates: "Check for updates",
      desktopOnly: "The settings center is available only in the Git Leaf desktop app.",
      readSettingsFailed: "Unable to read Git Leaf settings.",
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
      openLinkFailed: "Unable to open the link.",
      updateCurrent: "Git Leaf is up to date.",
      updateAvailable: "An update is available.",
      updateDownloading: "Downloading update…",
      updateError: "Update check failed.",
      updateStarted: "Update check started.",
    }),
    "zh-CN": Object.freeze({
      documentTitle: "Git Leaf 设置与帮助",
      backAria: "返回 Git Leaf",
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
      generalDescription: "Git Leaf 的常用设置。",
      appearanceKicker: "外观",
      appearanceTitle: "外观",
      appearanceDescription: "只保留会持续影响阅读体验的个人偏好。",
      languageTitle: "界面语言",
      languageDescription: "跟随系统语言，或为 Git Leaf 选择固定语言。",
      languageAria: "界面语言",
      languageAuto: "自动",
      languageSystem: "跟随系统",
      colorModeTitle: "明暗模式",
      colorModeDescription: "跟随系统时，Git Leaf 会随 macOS 或 Windows 的外观自动切换。",
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
      gitRemoteCheckDescription: "设置 Git Leaf 获取并检查 Git 远端变化的频率。",
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
      shortcutsDescription: "点击可编辑的快捷键后直接按下新组合键；发生冲突时不会保存。",
      shortcutResetAll: "全部恢复默认",
      shortcutReset: "恢复默认",
      shortcutRecord: "修改快捷键",
      shortcutRecording: "请按新快捷键…",
      shortcutUnassigned: "未设置",
      shortcutClearHint: "按退格键或 Delete 可取消绑定，按 Escape 退出录入。",
      shortcutConflict: "该快捷键已被“{action}”使用。",
      statusKicker: "关于与状态",
      statusTitle: "关于与状态",
      statusDescription: "查看版本、运行环境以及当前仓库状态。",
      updateActionsAria: "更新操作",
      checkForUpdates: "检查更新",
      desktopOnly: "设置中心只能在 Git Leaf 桌面版中使用。",
      readSettingsFailed: "无法读取 Git Leaf 设置。",
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
      openLinkFailed: "无法打开链接。",
      updateCurrent: "Git Leaf 已经是最新版本。",
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
  const shortcutResetAll = document.querySelector("#shortcut-reset-all");
  const appStatus = document.querySelector("#app-status");
  const environmentStatus = document.querySelector("#environment-status");
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
  let helpScrollFrame = 0;
  let shortcutModelGroups = [];
  let recordingShortcutId = "";

  navigation.addEventListener("click", handleNavigationClick);
  helpNavigation.addEventListener("click", handleHelpNavigationClick);
  content.addEventListener("scroll", handleHelpContentScroll, { passive: true });
  backButton.addEventListener("click", closeSettingsCenter);
  document.addEventListener("keydown", handleSettingsKeydown, true);
  document.addEventListener("change", handlePreferenceChange);
  document.addEventListener("click", handleExternalLinkClick);
  shortcutGroups.addEventListener("click", handleShortcutClick);
  shortcutResetAll?.addEventListener("click", resetAllShortcuts);
  fontSizeInput.addEventListener("input", updateFontSizeOutput);
  systemColorQuery.addEventListener?.("change", handleSystemColorChange);

  if (!api) {
    applyLanguage(browserLanguage());
    showError(t("desktopOnly"));
    revealSettings();
    return;
  }

  checkForUpdatesButton.addEventListener("click", checkForUpdates);
  api.onShortcutInput?.((input) => handleRecordedShortcutInput(input));
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
      shortcutModelGroups = Array.isArray(model.shortcutGroups)
        ? model.shortcutGroups.map((group) => ({
            ...group,
            shortcuts: Array.isArray(group?.shortcuts)
              ? group.shortcuts.map((shortcut) => ({ ...shortcut }))
              : [],
          }))
        : [];
      renderShortcuts(shortcutModelGroups);
      renderStatus(model.status);
      hideError();
    } finally {
      applyingModel = false;
      revealSettings();
    }
  }

  function showSection(value) {
    cancelShortcutRecording();
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
    if (recordingShortcutId) {
      handleRecordedShortcutInput(event);
      return;
    }
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
        const action = document.createElement("span");
        action.className = "shortcut-action";
        action.textContent = stringValue(shortcut?.action);

        if (shortcut?.customizable && shortcut?.id) {
          row.classList.add("is-customizable");
          const record = document.createElement("button");
          record.type = "button";
          record.className = "shortcut-binding";
          record.dataset.shortcutRecord = shortcut.id;
          record.textContent = recordingShortcutId === shortcut.id
            ? t("shortcutRecording")
            : stringValue(shortcut.keys, t("shortcutUnassigned"));
          record.setAttribute(
            "aria-label",
            `${t("shortcutRecord")}: ${action.textContent}. ${record.textContent}`,
          );
          if (recordingShortcutId === shortcut.id) {
            record.classList.add("is-recording");
            record.setAttribute("aria-describedby", "shortcut-capture-hint");
          }

          const reset = document.createElement("button");
          reset.type = "button";
          reset.className = "shortcut-reset";
          reset.dataset.shortcutReset = shortcut.id;
          reset.textContent = "↺";
          reset.title = t("shortcutReset");
          reset.setAttribute(
            "aria-label",
            `${t("shortcutReset")}: ${action.textContent}`,
          );
          reset.disabled = shortcut.binding === shortcut.defaultBinding;
          row.append(record, action, reset);
        } else {
          const keys = document.createElement("kbd");
          keys.textContent = stringValue(shortcut?.keys);
          const fixed = document.createElement("span");
          fixed.className = "shortcut-fixed-spacer";
          fixed.setAttribute("aria-hidden", "true");
          row.append(keys, action, fixed);
        }
        list.append(row);
      }
      section.append(list);
      shortcutGroups.append(section);
    }

    const hint = document.createElement("p");
    hint.id = "shortcut-capture-hint";
    hint.className = "shortcut-capture-hint";
    hint.textContent = t("shortcutClearHint");
    shortcutGroups.prepend(hint);
  }

  function handleShortcutClick(event) {
    const reset = event.target.closest?.("[data-shortcut-reset]");
    if (reset) {
      void updateShortcutBinding(reset.dataset.shortcutReset, undefined);
      return;
    }
    const record = event.target.closest?.("[data-shortcut-record]");
    if (!record) {
      return;
    }
    recordingShortcutId = record.dataset.shortcutRecord;
    void api.setShortcutCapture?.(true);
    hideError();
    renderShortcuts(shortcutModelGroups);
    window.requestAnimationFrame(() => {
      shortcutGroups.querySelector(
        `[data-shortcut-record="${cssEscape(recordingShortcutId)}"]`,
      )?.focus();
    });
  }

  function handleRecordedShortcutInput(event) {
    if (!recordingShortcutId || event.isComposing) {
      return;
    }
    event.preventDefault?.();
    event.stopPropagation?.();
    if (event.key === "Escape") {
      cancelShortcutRecording();
      return;
    }
    if (event.key === "Backspace" || event.key === "Delete") {
      void updateShortcutBinding(recordingShortcutId, null);
      return;
    }
    const binding = shortcutBindingFromInput(event);
    if (binding) {
      void updateShortcutBinding(recordingShortcutId, binding);
    }
  }

  async function updateShortcutBinding(id, binding) {
    const overrides = isRecord(currentPreferences.keyboardShortcuts)
      ? { ...currentPreferences.keyboardShortcuts }
      : {};
    if (binding === undefined) {
      delete overrides[id];
    } else {
      overrides[id] = binding;
    }
    const conflict = shortcutConflict(overrides, id);
    if (conflict) {
      showError(t("shortcutConflict").replace("{action}", conflict.action));
      cancelShortcutRecording({ rerender: false });
      renderShortcuts(shortcutModelGroups);
      return false;
    }
    cancelShortcutRecording({ rerender: false });
    currentPreferences = {
      ...currentPreferences,
      keyboardShortcuts: overrides,
    };
    renderShortcuts(shortcutModelGroups);
    await savePreferencePatch({ keyboardShortcuts: overrides });
    return true;
  }

  function resetAllShortcuts() {
    cancelShortcutRecording({ rerender: false });
    currentPreferences = {
      ...currentPreferences,
      keyboardShortcuts: {},
    };
    renderShortcuts(shortcutModelGroups);
    void savePreferencePatch({ keyboardShortcuts: {} });
  }

  function cancelShortcutRecording({ rerender = true } = {}) {
    if (!recordingShortcutId) {
      return;
    }
    recordingShortcutId = "";
    void api?.setShortcutCapture?.(false);
    if (rerender) {
      renderShortcuts(shortcutModelGroups);
    }
  }

  function shortcutConflict(overrides, targetId) {
    const bindings = new Map();
    for (const group of shortcutModelGroups) {
      for (const shortcut of group.shortcuts ?? []) {
        if (!shortcut?.customizable || !shortcut.id) {
          continue;
        }
        const binding = Object.hasOwn(overrides, shortcut.id)
          ? overrides[shortcut.id]
          : shortcut.defaultBinding;
        if (!binding) {
          continue;
        }
        const existing = bindings.get(binding);
        if (existing) {
          if (shortcut.id === targetId) {
            return existing;
          }
          if (existing.id === targetId) {
            return { id: shortcut.id, action: shortcut.action };
          }
        }
        bindings.set(binding, { id: shortcut.id, action: shortcut.action });
      }
    }
    return null;
  }

  function renderStatus(value) {
    const status = isRecord(value) ? value : {};
    updateActions.hidden = status.updatesEnabled !== true;
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
      repositoryStatus,
      t("repositoryStatus"),
      status.repository,
      t("noRepositoryStatus"),
    );
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

  function shortcutBindingFromInput(input) {
    const key = shortcutKeyFromInput(input);
    if (!key) {
      return "";
    }
    const isMac = /mac/i.test(navigator.platform || "");
    const meta = input.metaKey === true || input.meta === true;
    const control = input.ctrlKey === true || input.control === true;
    const modifiers = [];
    if (isMac ? meta : control) {
      modifiers.push("Mod");
    }
    if (isMac && control) {
      modifiers.push("Ctrl");
    }
    if (!isMac && meta) {
      modifiers.push("Meta");
    }
    if (input.altKey === true || input.alt === true) {
      modifiers.push("Alt");
    }
    if (input.shiftKey === true || input.shift === true) {
      modifiers.push("Shift");
    }
    if (!modifiers.some((modifier) => modifier !== "Shift")) {
      return "";
    }
    return [...modifiers, key].join("+");
  }

  function shortcutKeyFromInput(input) {
    const code = String(input.code || "");
    if (/^Key[A-Z]$/.test(code)) {
      return code.slice(3);
    }
    if (/^Digit[0-9]$/.test(code)) {
      return code.slice(5);
    }
    if (/^F(?:[1-9]|1[0-2])$/.test(code)) {
      return code;
    }
    const codeKeys = {
      Backslash: "\\",
      BracketLeft: "[",
      BracketRight: "]",
      Comma: ",",
      Equal: "=",
      Minus: "-",
      Period: ".",
      Quote: "'",
      Semicolon: ";",
      Slash: "/",
    };
    if (codeKeys[code]) {
      return codeKeys[code];
    }
    const key = String(input.key || "");
    if (/^[a-z]$/i.test(key)) {
      return key.toUpperCase();
    }
    if (/^[0-9]$/.test(key)) {
      return key;
    }
    const namedKeys = {
      ArrowLeft: "Left",
      ArrowRight: "Right",
      ArrowUp: "Up",
      ArrowDown: "Down",
      Enter: "Enter",
      Tab: "Tab",
      Home: "Home",
      End: "End",
      PageUp: "PageUp",
      PageDown: "PageDown",
    };
    return namedKeys[key] || "";
  }

  function cssEscape(value) {
    return globalThis.CSS?.escape?.(String(value ?? ""))
      ?? String(value ?? "").replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  function stringValue(value, fallback = "") {
    const string = String(value ?? "").trim();
    return string || fallback;
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
      updateCheckResult.textContent = "";
      checkForUpdatesButton.disabled = false;
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
