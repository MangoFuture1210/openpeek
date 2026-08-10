import assert from "node:assert/strict";
import test from "node:test";

import {
  KEYBOARD_SHORTCUT_GROUPS,
  documentTabShortcutFromEvent,
  getKeyboardShortcutGroups,
  isKeyboardShortcutsHelpShortcut,
  keyboardShortcutBinding,
  keyboardShortcutConflicts,
  keyboardShortcutFromEvent,
  keyboardShortcutMatches,
  keyboardShortcutsPlainText,
  normalizeKeyboardShortcut,
  normalizeKeyboardShortcutOverrides,
} from "../public/keyboard-shortcuts.js";

test("document tab shortcuts never intercept unmodified number input", () => {
  assert.equal(
    documentTabShortcutFromEvent(
      { key: "1", code: "Digit1", type: "keyDown" },
      { platform: "darwin" },
    ),
    null,
  );
  assert.equal(
    documentTabShortcutFromEvent(
      { key: "4", code: "Numpad4", type: "keyDown" },
      { platform: "darwin" },
    ),
    null,
  );
  assert.deepEqual(
    documentTabShortcutFromEvent(
      { key: "1", code: "Digit1", meta: true, type: "keyDown" },
      { platform: "darwin" },
    ),
    { command: "switch-tab-at-index", index: 0 },
  );
  assert.deepEqual(
    documentTabShortcutFromEvent(
      { key: "9", code: "Digit9", control: true, type: "keyDown" },
      { platform: "win32" },
    ),
    { command: "switch-last-tab" },
  );
  assert.equal(
    documentTabShortcutFromEvent(
      { key: "2", code: "Digit2", meta: true, shift: true, type: "keyDown" },
      { platform: "darwin" },
    ),
    null,
  );
});

test("Command-question-mark and Ctrl-question-mark open keyboard shortcut help", () => {
  assert.equal(
    isKeyboardShortcutsHelpShortcut(
      { key: "?", metaKey: true, shiftKey: true },
      { platform: "darwin" },
    ),
    true,
  );
  assert.equal(
    isKeyboardShortcutsHelpShortcut(
      { code: "Slash", ctrlKey: true, shiftKey: true },
      { platform: "win32" },
    ),
    true,
  );
  assert.equal(isKeyboardShortcutsHelpShortcut({ key: "/", metaKey: true }), false);
  assert.equal(isKeyboardShortcutsHelpShortcut({ key: "?", metaKey: true }), false);
  assert.equal(
    isKeyboardShortcutsHelpShortcut({ key: "?", metaKey: true, shiftKey: true, altKey: true }),
    false,
  );
  assert.equal(
    isKeyboardShortcutsHelpShortcut({ key: "?", metaKey: true, shiftKey: true, isComposing: true }),
    false,
  );
});

test("keyboard shortcut help keeps the agreed Git Leaf shortcuts", () => {
  const text = keyboardShortcutsPlainText("en", { platform: "darwin" });

  assert.match(text, /Command\+O\s+Open Repository Panel/);
  assert.match(text, /Command\+1\.\.9\s+Switch to Visible Repository 1\.\.9 \(panel open\)/);
  assert.match(text, /Command\+0\s+Open Another Repository \(panel open\)/);
  assert.match(text, /Command\+Option\+1\.\.9\s+Switch to Repository 1\.\.9/);
  assert.match(text, /Command\+Option\+Left\s+Previous Repository/);
  assert.match(text, /Command\+Option\+Right\s+Next Repository/);
  assert.match(text, /Command\+W\s+Close Current Tab/);
  assert.match(text, /Command\+F\s+Find in Current Document/);
  assert.match(text, /Command\+D\s+Add or Remove Favorite/);
  assert.match(text, /Command\+1\.\.8\s+Switch to Tab 1\.\.8/);
  assert.match(text, /Command\+9\s+Switch to Last Tab/);
  assert.match(text, /Command\+Shift\+\[\s+Previous Tab/);
  assert.match(text, /Command\+Shift\+\]\s+Next Tab/);
  assert.match(text, /Ctrl\+Shift\+Tab\s+Previous Tab on Windows/);
  assert.match(text, /Ctrl\+Tab\s+Next Tab on Windows/);
  assert.match(text, /Command\+P\s+Preview/);
  assert.match(text, /Command\+S\s+Source/);
  assert.match(text, /Command\+L\s+Live/);
  assert.match(text, /Command\+Shift\+C\s+Copy Document Path/);
  assert.match(text, /Command\+Shift\+L\s+Copy Share Link/);
  assert.match(text, /Command\+Shift\+G\s+Open GitHub Link/);
  assert.match(text, /Command\+Shift\+O\s+Open Source File/);
  assert.match(text, /Command\+Shift\+R\s+Reveal in File Manager/);
  assert.match(text, /Command\+Click\s+Open File in New Active Tab/);
  assert.match(text, /Command\+Enter\s+Open File in New Active Tab/);
  assert.match(text, /Command\+B\s+Bold Selected Text/);
  assert.match(text, /Command\+I\s+Italicize Selected Text/);
  assert.match(text, /Command\+U\s+Underline Selected Text/);
  assert.match(text, /Command\+\\\s+Toggle Sidebar/);
  assert.match(text, /Option\+1\s+Switch to All View/);
  assert.match(text, /Option\+2\s+Switch to Favorites View/);
  assert.match(text, /Option\+3\s+Switch to Sync View/);
  assert.match(text, /Command\+Shift\+B\s+Toggle Document Navigation/);
  assert.match(text, /Command\+\[\s+Back/);
  assert.match(text, /Command\+\]\s+Forward/);
  assert.match(text, /Command\+K\s+Focus File Search/);
  assert.match(text, /Command\+Shift\+E\s+Focus File Tree/);
  assert.match(text, /Escape\s+Focus File Tree from Search/);
  assert.match(text, /ArrowUp\/Down\s+Move in File Tree/);
  assert.match(text, /ArrowLeft\/Right\s+Collapse or Expand Folder/);
  assert.match(text, /Enter\s+Open Selected File/);
  assert.match(text, /Command\+,\s+Open Settings/);
  assert.match(text, /Command\+Shift\+\/\s+Open Keyboard Shortcuts/);
});

test("keyboard shortcut help localizes labels without changing key bindings", () => {
  const english = getKeyboardShortcutGroups("en");
  const chinese = getKeyboardShortcutGroups("zh-CN");

  assert.deepEqual(
    english.flatMap((group) => group.shortcuts.map((shortcut) => shortcut.binding)),
    chinese.flatMap((group) => group.shortcuts.map((shortcut) => shortcut.binding)),
  );
  assert.equal(chinese[0].title, "仓库");
  assert.match(keyboardShortcutsPlainText("zh-CN"), /键盘快捷键/);
  assert.match(keyboardShortcutsPlainText("zh-CN"), /打开仓库面板/);
});

test("configurable shortcuts normalize, match both platforms, disable, and reject conflicts", () => {
  assert.equal(normalizeKeyboardShortcut("cmd+option+arrowleft"), "Mod+Alt+Left");
  assert.equal(normalizeKeyboardShortcut("Ctrl+Shift+u"), "Ctrl+Shift+U");
  assert.equal(normalizeKeyboardShortcut("Shift+B"), "");
  assert.equal(
    keyboardShortcutFromEvent(
      { code: "KeyB", metaKey: true },
      { platform: "darwin" },
    ),
    "Mod+B",
  );
  assert.equal(
    keyboardShortcutFromEvent(
      { code: "KeyB", ctrlKey: true },
      { platform: "win32" },
    ),
    "Mod+B",
  );

  const overrides = normalizeKeyboardShortcutOverrides({
    "editor.bold": "Mod+Alt+B",
    "editor.italic": null,
    arbitrary: "Mod+Q",
  });
  assert.deepEqual(overrides, {
    "editor.bold": "Mod+Alt+B",
    "editor.italic": null,
  });
  assert.equal(keyboardShortcutBinding("editor.italic", overrides), null);
  assert.equal(
    keyboardShortcutMatches(
      { code: "KeyB", metaKey: true, altKey: true },
      "editor.bold",
      overrides,
      { platform: "darwin" },
    ),
    true,
  );
  assert.deepEqual(
    keyboardShortcutConflicts({ "editor.bold": "Mod+I" }),
    [{ binding: "Mod+I", actionIds: ["editor.bold", "editor.italic"] }],
  );
});

test("keyboard shortcut help does not assign a shortcut to closing the repository", () => {
  const flatShortcuts = KEYBOARD_SHORTCUT_GROUPS.flatMap((group) => group.shortcuts);

  assert.equal(
    flatShortcuts.some((shortcut) => shortcut.action === "Close Repository"),
    false,
  );
});
