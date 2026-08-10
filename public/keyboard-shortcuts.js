import { createTranslator } from "./i18n.js";
import { WORKBENCH_MESSAGES } from "./workbench-locales.js";

const SHORTCUT_ACTION_DEFINITIONS = Object.freeze({
  "repository.open": shortcutDefinition("Mod+O", "shortcut.openRepository"),
  "repository.previous": shortcutDefinition(
    "Mod+Alt+Left",
    "shortcut.previousRepository",
  ),
  "repository.next": shortcutDefinition(
    "Mod+Alt+Right",
    "shortcut.nextRepository",
  ),
  "document.close-tab": shortcutDefinition("Mod+W", "shortcut.closeTab"),
  "document.find": shortcutDefinition("Mod+F", "shortcut.findDocument"),
  "document.favorite": shortcutDefinition("Mod+D", "shortcut.toggleFavorite"),
  "document.copy-path": shortcutDefinition(
    "Mod+Shift+C",
    "shortcut.copyDocumentPath",
  ),
  "document.copy-share": shortcutDefinition(
    "Mod+Shift+L",
    "shortcut.copyShareLink",
  ),
  "document.open-github": shortcutDefinition(
    "Mod+Shift+G",
    "shortcut.openGitHub",
  ),
  "document.open-source": shortcutDefinition(
    "Mod+Shift+O",
    "shortcut.openSource",
  ),
  "document.reveal": shortcutDefinition(
    "Mod+Shift+R",
    "shortcut.revealFile",
  ),
  "view.preview": shortcutDefinition("Mod+P", "shortcut.preview"),
  "view.source": shortcutDefinition("Mod+S", "shortcut.source"),
  "view.live": shortcutDefinition("Mod+L", "shortcut.live"),
  "navigation.toggle-sidebar": shortcutDefinition(
    "Mod+\\",
    "shortcut.toggleSidebar",
  ),
  "navigation.toggle-outline": shortcutDefinition(
    "Mod+Shift+B",
    "shortcut.toggleOutline",
  ),
  "navigation.back": shortcutDefinition("Mod+[", "shortcut.back"),
  "navigation.forward": shortcutDefinition("Mod+]", "shortcut.forward"),
  "navigation.focus-search": shortcutDefinition("Mod+K", "shortcut.focusSearch"),
  "navigation.focus-tree": shortcutDefinition(
    "Mod+Shift+E",
    "shortcut.focusTree",
  ),
  "help.settings": shortcutDefinition("Mod+,", "shortcut.openSettings"),
  "help.shortcuts": shortcutDefinition("Mod+Shift+/", "shortcut.openShortcuts"),
  "editor.bold": shortcutDefinition("Mod+B", "shortcut.bold"),
  "editor.italic": shortcutDefinition("Mod+I", "shortcut.italic"),
  "editor.underline": shortcutDefinition("Mod+U", "shortcut.underline"),
  "editor.strikethrough": shortcutDefinition(
    "Mod+Shift+X",
    "shortcut.strikethrough",
  ),
});

const SHORTCUT_GROUPS = Object.freeze([
  Object.freeze({
    titleKey: "shortcuts.repository",
    shortcuts: Object.freeze([
      actionShortcut("repository.open"),
      fixedShortcut("Command+1..9", "shortcut.switchVisibleRepository"),
      fixedShortcut("Command+0", "shortcut.openAnotherRepository"),
      fixedShortcut("Command+Option+1..9", "shortcut.switchRepositoryNumber"),
      actionShortcut("repository.previous"),
      actionShortcut("repository.next"),
    ]),
  }),
  Object.freeze({
    titleKey: "shortcuts.documents",
    shortcuts: Object.freeze([
      fixedShortcut("Command+1..8", "shortcut.switchTabNumber"),
      fixedShortcut("Command+9", "shortcut.switchLastTab"),
      fixedShortcut("Command+Shift+[", "shortcut.previousTab"),
      fixedShortcut("Command+Shift+]", "shortcut.nextTab"),
      fixedShortcut("Ctrl+Shift+Tab", "shortcut.previousTabWindows"),
      fixedShortcut("Ctrl+Tab", "shortcut.nextTabWindows"),
      actionShortcut("document.close-tab"),
      actionShortcut("document.find"),
      actionShortcut("document.favorite"),
      actionShortcut("document.copy-path"),
      actionShortcut("document.copy-share"),
      actionShortcut("document.open-github"),
      actionShortcut("document.open-source"),
      actionShortcut("document.reveal"),
      fixedShortcut("Command+Click", "shortcut.activeTab"),
      fixedShortcut("Command+Enter", "shortcut.activeTab"),
    ]),
  }),
  Object.freeze({
    titleKey: "shortcuts.editing",
    shortcuts: Object.freeze([
      actionShortcut("editor.bold"),
      actionShortcut("editor.italic"),
      actionShortcut("editor.underline"),
      actionShortcut("editor.strikethrough"),
    ]),
  }),
  Object.freeze({
    titleKey: "shortcuts.viewModes",
    shortcuts: Object.freeze([
      actionShortcut("view.preview"),
      actionShortcut("view.source"),
      actionShortcut("view.live"),
    ]),
  }),
  Object.freeze({
    titleKey: "shortcuts.navigation",
    shortcuts: Object.freeze([
      actionShortcut("navigation.toggle-sidebar"),
      fixedShortcut("Option+1", "shortcut.showAllView"),
      fixedShortcut("Option+2", "shortcut.showFavoritesView"),
      fixedShortcut("Option+3", "shortcut.showSyncView"),
      actionShortcut("navigation.toggle-outline"),
      actionShortcut("navigation.back"),
      actionShortcut("navigation.forward"),
      actionShortcut("navigation.focus-search"),
      actionShortcut("navigation.focus-tree"),
      fixedShortcut("Escape", "shortcut.focusTreeFromSearch"),
      fixedShortcut("ArrowUp/Down", "shortcut.moveTree"),
      fixedShortcut("ArrowLeft/Right", "shortcut.toggleFolder"),
      fixedShortcut("Enter", "shortcut.openSelected"),
    ]),
  }),
  Object.freeze({
    titleKey: "shortcuts.help",
    shortcuts: Object.freeze([
      actionShortcut("help.settings"),
      actionShortcut("help.shortcuts"),
    ]),
  }),
]);

const SHORTCUT_MODIFIER_ORDER = Object.freeze([
  "Mod",
  "Ctrl",
  "Meta",
  "Alt",
  "Shift",
]);
const SHORTCUT_KEY_ALIASES = Object.freeze({
  "?": "/",
  arrowleft: "Left",
  arrowright: "Right",
  arrowup: "Up",
  arrowdown: "Down",
  backspace: "Backspace",
  delete: "Delete",
  end: "End",
  enter: "Enter",
  escape: "Escape",
  home: "Home",
  left: "Left",
  pagedown: "PageDown",
  pageup: "PageUp",
  right: "Right",
  space: "Space",
  tab: "Tab",
  up: "Up",
  down: "Down",
});
const CODE_KEYS = Object.freeze({
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
});
const SHORTCUT_PUNCTUATION = new Set(["\\", "[", "]", ",", ".", "/", ";", "'", "-", "="]);

export const KEYBOARD_SHORTCUT_ACTION_IDS = Object.freeze(
  Object.keys(SHORTCUT_ACTION_DEFINITIONS),
);

export function normalizeKeyboardShortcut(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "";
  }
  const parts = raw.split("+").map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) {
    return "";
  }
  const rawKey = parts.pop();
  const modifiers = new Set();
  for (const part of parts) {
    const modifier = normalizeShortcutModifier(part);
    if (!modifier || modifiers.has(modifier)) {
      return "";
    }
    modifiers.add(modifier);
  }
  if (
    !modifiers.has("Mod")
    && !modifiers.has("Ctrl")
    && !modifiers.has("Meta")
    && !modifiers.has("Alt")
  ) {
    return "";
  }
  const key = normalizeShortcutKey(rawKey);
  if (!key) {
    return "";
  }
  return [
    ...SHORTCUT_MODIFIER_ORDER.filter((modifier) => modifiers.has(modifier)),
    key,
  ].join("+");
}

export function normalizeKeyboardShortcutOverrides(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const overrides = {};
  for (const id of KEYBOARD_SHORTCUT_ACTION_IDS) {
    if (!Object.hasOwn(value, id)) {
      continue;
    }
    if (value[id] === null || value[id] === "") {
      overrides[id] = null;
      continue;
    }
    const shortcut = normalizeKeyboardShortcut(value[id]);
    if (shortcut) {
      overrides[id] = shortcut;
    }
  }
  return overrides;
}

export function keyboardShortcutBinding(id, overrides = {}) {
  const definition = SHORTCUT_ACTION_DEFINITIONS[id];
  if (!definition) {
    return null;
  }
  const normalized = normalizeKeyboardShortcutOverrides(overrides);
  return Object.hasOwn(normalized, id)
    ? normalized[id]
    : definition.defaultBinding;
}

export function keyboardShortcutDefaultBinding(id) {
  return SHORTCUT_ACTION_DEFINITIONS[id]?.defaultBinding ?? null;
}

export function keyboardShortcutFromEvent(event = {}, { platform } = {}) {
  if (event.isComposing) {
    return "";
  }
  const key = shortcutKeyFromEvent(event);
  if (!key) {
    return "";
  }
  const resolvedPlatform = normalizeShortcutPlatform(platform);
  const meta = event.metaKey === true || event.meta === true;
  const ctrl = event.ctrlKey === true || event.control === true;
  const modifiers = [];
  if (resolvedPlatform === "darwin" ? meta : ctrl) {
    modifiers.push("Mod");
  }
  if (ctrl && resolvedPlatform === "darwin") {
    modifiers.push("Ctrl");
  }
  if (meta && resolvedPlatform !== "darwin") {
    modifiers.push("Meta");
  }
  if (event.altKey === true || event.alt === true) {
    modifiers.push("Alt");
  }
  if (event.shiftKey === true || event.shift === true) {
    modifiers.push("Shift");
  }
  return normalizeKeyboardShortcut([...modifiers, key].join("+"));
}

export function keyboardShortcutMatches(
  event,
  id,
  overrides = {},
  options = {},
) {
  const binding = keyboardShortcutBinding(id, overrides);
  return Boolean(binding) && keyboardShortcutFromEvent(event, options) === binding;
}

export function keyboardShortcutDisplay(binding, { platform } = {}) {
  const shortcut = normalizeKeyboardShortcut(binding);
  if (!shortcut) {
    return "";
  }
  const resolvedPlatform = normalizeShortcutPlatform(platform);
  return shortcut.split("+").map((part) => {
    if (part === "Mod") {
      return resolvedPlatform === "darwin" ? "Command" : "Ctrl";
    }
    if (part === "Alt") {
      return resolvedPlatform === "darwin" ? "Option" : "Alt";
    }
    return part;
  }).join("+");
}

export function keyboardShortcutAccelerator(binding) {
  const shortcut = normalizeKeyboardShortcut(binding);
  if (!shortcut) {
    return undefined;
  }
  return shortcut.split("+").map((part) => {
    if (part === "Mod") {
      return "CmdOrCtrl";
    }
    return part;
  }).join("+");
}

export function keyboardShortcutConflicts(overrides = {}) {
  const bindings = new Map();
  for (const id of KEYBOARD_SHORTCUT_ACTION_IDS) {
    const binding = keyboardShortcutBinding(id, overrides);
    if (!binding) {
      continue;
    }
    const ids = bindings.get(binding) ?? [];
    ids.push(id);
    bindings.set(binding, ids);
  }
  return [...bindings.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([binding, actionIds]) => ({ binding, actionIds }));
}

export function isKeyboardShortcutsHelpShortcut(event = {}, options = {}) {
  return keyboardShortcutMatches(event, "help.shortcuts", {}, options);
}

export function getKeyboardShortcutGroups(locale = "en", options = {}) {
  const t = createTranslator(WORKBENCH_MESSAGES, locale);
  const overrides = normalizeKeyboardShortcutOverrides(options.bindings);
  const platform = normalizeShortcutPlatform(options.platform);
  return SHORTCUT_GROUPS.map((group) => ({
    title: t(group.titleKey),
    shortcuts: group.shortcuts.map((shortcut) => {
      if (!shortcut.actionId) {
        return {
          keys: fixedShortcutDisplay(shortcut.keys, platform),
          action: t(shortcut.actionKey),
          customizable: false,
        };
      }
      const definition = SHORTCUT_ACTION_DEFINITIONS[shortcut.actionId];
      const binding = keyboardShortcutBinding(shortcut.actionId, overrides);
      return {
        id: shortcut.actionId,
        binding,
        defaultBinding: definition.defaultBinding,
        keys: keyboardShortcutDisplay(binding, { platform }) || t("shortcut.unassigned"),
        defaultKeys: keyboardShortcutDisplay(definition.defaultBinding, { platform }),
        action: t(definition.actionKey),
        customizable: true,
      };
    }),
  }));
}

// Preserve the original English export for existing consumers.
export const KEYBOARD_SHORTCUT_GROUPS = getKeyboardShortcutGroups("en");

export function keyboardShortcutsPlainText(locale = "en", options = {}) {
  const t = createTranslator(WORKBENCH_MESSAGES, locale);
  const rows = [t("shortcuts.title"), ""];
  for (const group of getKeyboardShortcutGroups(locale, options)) {
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

function shortcutDefinition(defaultBinding, actionKey) {
  return Object.freeze({
    defaultBinding,
    actionKey,
  });
}

function actionShortcut(actionId) {
  return Object.freeze({ actionId });
}

function fixedShortcut(keys, actionKey) {
  return Object.freeze({ keys, actionKey });
}

function normalizeShortcutModifier(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["mod", "command", "cmd", "cmdorctrl", "ctrlorcmd"].includes(normalized)) {
    return "Mod";
  }
  if (["ctrl", "control"].includes(normalized)) {
    return "Ctrl";
  }
  if (["meta", "super"].includes(normalized)) {
    return "Meta";
  }
  if (["alt", "option", "opt"].includes(normalized)) {
    return "Alt";
  }
  if (normalized === "shift") {
    return "Shift";
  }
  return "";
}

function normalizeShortcutKey(value) {
  const raw = String(value ?? "").trim();
  if (/^[a-z]$/i.test(raw)) {
    return raw.toUpperCase();
  }
  if (/^[0-9]$/.test(raw) || SHORTCUT_PUNCTUATION.has(raw)) {
    return raw;
  }
  if (/^f(?:[1-9]|1[0-2])$/i.test(raw)) {
    return raw.toUpperCase();
  }
  return SHORTCUT_KEY_ALIASES[raw.toLowerCase()] ?? "";
}

function shortcutKeyFromEvent(event) {
  const code = String(event.code ?? "");
  if (/^Key[A-Z]$/.test(code)) {
    return code.slice(3);
  }
  if (/^Digit[0-9]$/.test(code)) {
    return code.slice(5);
  }
  if (/^F(?:[1-9]|1[0-2])$/.test(code)) {
    return code;
  }
  if (CODE_KEYS[code]) {
    return CODE_KEYS[code];
  }
  return normalizeShortcutKey(event.key);
}

function normalizeShortcutPlatform(value) {
  const explicit = String(value ?? "").toLowerCase();
  if (explicit === "darwin" || explicit.includes("mac")) {
    return "darwin";
  }
  if (explicit === "win32" || explicit.includes("win")) {
    return "win32";
  }
  if (explicit) {
    return explicit;
  }
  const detected = String(globalThis.navigator?.platform ?? "").toLowerCase();
  if (detected.includes("mac")) {
    return "darwin";
  }
  if (detected.includes("win")) {
    return "win32";
  }
  return detected || "darwin";
}

function fixedShortcutDisplay(keys, platform) {
  if (platform === "darwin") {
    return keys;
  }
  return String(keys).replaceAll("Command", "Ctrl").replaceAll("Option", "Alt");
}
