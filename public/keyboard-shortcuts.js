import { createTranslator } from "./i18n.js";
import { WORKBENCH_MESSAGES } from "./workbench-locales.js";

const SHORTCUT_GROUPS = Object.freeze([
  {
    titleKey: "shortcuts.repository",
    shortcuts: [
      ["Command+O", "shortcut.openRepository"],
      ["Command+1..9", "shortcut.switchVisibleRepository"],
      ["Command+0", "shortcut.openAnotherRepository"],
      ["Command+Option+1..9", "shortcut.switchRepositoryNumber"],
      ["Command+Option+Left", "shortcut.previousRepository"],
      ["Command+Option+Right", "shortcut.nextRepository"],
    ],
  },
  {
    titleKey: "shortcuts.documents",
    shortcuts: [
      ["Command+1..8", "shortcut.switchTabNumber"],
      ["Command+9", "shortcut.switchLastTab"],
      ["Command+Shift+[", "shortcut.previousTab"],
      ["Command+Shift+]", "shortcut.nextTab"],
      ["Ctrl+Shift+Tab", "shortcut.previousTabWindows"],
      ["Ctrl+Tab", "shortcut.nextTabWindows"],
      ["Command+T", "shortcut.newTab"],
      ["Command+W", "shortcut.closeTab"],
      ["Command+F", "shortcut.findDocument"],
      ["Command+D", "shortcut.toggleFavorite"],
      ["Command+Shift+C", "shortcut.copyDocumentPath"],
      ["Command+Shift+L", "shortcut.copyShareLink"],
      ["Command+Shift+G", "shortcut.openGitHub"],
      ["Command+Shift+O", "shortcut.openSource"],
      ["Command+Shift+R", "shortcut.revealFile"],
      ["Command+Click", "shortcut.activeTab"],
      ["Command+Enter", "shortcut.activeTab"],
    ],
  },
  {
    titleKey: "shortcuts.viewModes",
    shortcuts: [
      ["Command+P", "shortcut.preview"],
      ["Command+S", "shortcut.source"],
      ["Command+L", "shortcut.live"],
    ],
  },
  {
    titleKey: "shortcuts.navigation",
    shortcuts: [
      ["Command+B", "shortcut.toggleSidebar"],
      ["Option+1", "shortcut.showAllView"],
      ["Option+2", "shortcut.showFavoritesView"],
      ["Option+3", "shortcut.showSyncView"],
      ["Command+Shift+B", "shortcut.toggleOutline"],
      ["Command+[", "shortcut.back"],
      ["Command+]", "shortcut.forward"],
      ["Command+K", "shortcut.focusSearch"],
      ["Command+Shift+E", "shortcut.focusTree"],
      ["Escape", "shortcut.focusTreeFromSearch"],
      ["ArrowUp/Down", "shortcut.moveTree"],
      ["ArrowLeft/Right", "shortcut.toggleFolder"],
      ["Enter", "shortcut.openSelected"],
    ],
  },
  {
    titleKey: "shortcuts.help",
    shortcuts: [
      ["Command+,", "shortcut.openSettings"],
      ["Command+?", "shortcut.openShortcuts"],
    ],
  },
]);

export function isKeyboardShortcutsHelpShortcut({
  key = "",
  code = "",
  metaKey = false,
  ctrlKey = false,
  shiftKey = false,
  altKey = false,
  isComposing = false,
} = {}) {
  return (
    !isComposing &&
    (metaKey || ctrlKey) &&
    shiftKey &&
    !altKey &&
    (String(key) === "?" || String(code) === "Slash")
  );
}

export function getKeyboardShortcutGroups(locale = "en") {
  const t = createTranslator(WORKBENCH_MESSAGES, locale);
  return SHORTCUT_GROUPS.map((group) => ({
    title: t(group.titleKey),
    shortcuts: group.shortcuts.map(([keys, actionKey]) => ({
      keys,
      action: t(actionKey),
    })),
  }));
}

// Preserve the original English export for existing consumers.
export const KEYBOARD_SHORTCUT_GROUPS = getKeyboardShortcutGroups("en");

export function keyboardShortcutsPlainText(locale = "en") {
  const t = createTranslator(WORKBENCH_MESSAGES, locale);
  const rows = [t("shortcuts.title"), ""];
  for (const group of getKeyboardShortcutGroups(locale)) {
    rows.push(group.title);
    for (const shortcut of group.shortcuts) {
      const gap = " ".repeat(Math.max(2, 20 - shortcut.keys.length));
      rows.push(`${shortcut.keys}${gap}${shortcut.action}`);
    }
    rows.push("");
  }
  rows.push(t("help.shortcutsNote"));
  return rows.join("\n").trim();
}
