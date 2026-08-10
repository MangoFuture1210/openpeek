import assert from "node:assert/strict";
import test from "node:test";

import {
  KEYBOARD_SHORTCUT_GROUPS,
  getKeyboardShortcutGroups,
  isKeyboardShortcutsHelpShortcut,
  keyboardShortcutsPlainText,
} from "../public/keyboard-shortcuts.js";

test("Command-question-mark and Ctrl-question-mark open keyboard shortcut help", () => {
  assert.equal(isKeyboardShortcutsHelpShortcut({ key: "?", metaKey: true, shiftKey: true }), true);
  assert.equal(
    isKeyboardShortcutsHelpShortcut({ code: "Slash", ctrlKey: true, shiftKey: true }),
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
  const text = keyboardShortcutsPlainText();

  assert.match(text, /Command\+O\s+Open Repository Panel/);
  assert.match(text, /Command\+1\.\.9\s+Switch to Visible Repository 1\.\.9 \(panel open\)/);
  assert.match(text, /Command\+0\s+Open Another Repository \(panel open\)/);
  assert.match(text, /Command\+Option\+1\.\.9\s+Switch to Repository 1\.\.9/);
  assert.match(text, /Command\+Option\+Left\s+Previous Repository/);
  assert.match(text, /Command\+Option\+Right\s+Next Repository/);
  assert.match(text, /Command\+W\s+Close Current Tab/);
  assert.match(text, /Command\+T\s+New Tab/);
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
  assert.match(text, /Command\+B\s+Toggle Sidebar/);
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
  assert.match(text, /Command\+\?\s+Open Keyboard Shortcuts/);
});

test("keyboard shortcut help localizes labels without changing key bindings", () => {
  const english = getKeyboardShortcutGroups("en");
  const chinese = getKeyboardShortcutGroups("zh-CN");

  assert.deepEqual(
    english.flatMap((group) => group.shortcuts.map((shortcut) => shortcut.keys)),
    chinese.flatMap((group) => group.shortcuts.map((shortcut) => shortcut.keys)),
  );
  assert.equal(chinese[0].title, "仓库");
  assert.match(keyboardShortcutsPlainText("zh-CN"), /键盘快捷键/);
  assert.match(keyboardShortcutsPlainText("zh-CN"), /打开仓库面板/);
});

test("keyboard shortcut help does not assign a shortcut to closing the repository", () => {
  const flatShortcuts = KEYBOARD_SHORTCUT_GROUPS.flatMap((group) => group.shortcuts);

  assert.equal(
    flatShortcuts.some((shortcut) => shortcut.action === "Close Repository"),
    false,
  );
});
