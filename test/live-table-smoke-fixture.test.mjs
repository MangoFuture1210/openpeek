import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  LIVE_TABLE_SMOKE_ACCEPTANCE,
  LIVE_TABLE_SMOKE_FILE,
  cleanupLiveTableSmokeFixture,
  containsNativeLiveTableSmokeTable,
  createLiveTableSmokeFixture,
  readLiveTableSmokeDocument,
} from "../scripts/live-table-smoke-fixture.mjs";
import {
  markdownTableBlockAtLines,
  parseMarkdownTable,
} from "../src/content/markdown-table.mjs";

test("Live table smoke fixture provides native editable table scenarios", () => {
  const temporaryRoot = mkdtempSync(
    path.join(tmpdir(), "git-leaf-live-table-fixture-test-"),
  );
  const fixture = createLiveTableSmokeFixture({ temporaryRoot });
  try {
    assert.equal(fixture.file, LIVE_TABLE_SMOKE_FILE);
    assert.match(LIVE_TABLE_SMOKE_ACCEPTANCE, /斜向拖动/);
    assert.match(LIVE_TABLE_SMOKE_ACCEPTANCE, /正在编辑的单元格/);
    assert.match(LIVE_TABLE_SMOKE_ACCEPTANCE, /固定在表格顶部/);
    assert.match(LIVE_TABLE_SMOKE_ACCEPTANCE, /至少两个单元格/);
    assert.match(LIVE_TABLE_SMOKE_ACCEPTANCE, /最右侧分割线只调整最后一列/);
    assert.match(LIVE_TABLE_SMOKE_ACCEPTANCE, /重新打开后仍保留/);
    assert.match(LIVE_TABLE_SMOKE_ACCEPTANCE, /Esc 关闭/);
    assert.match(LIVE_TABLE_SMOKE_ACCEPTANCE, /粗体、斜体、删除线/);
    assert.match(LIVE_TABLE_SMOKE_ACCEPTANCE, /清除文字格式不改变列对齐/);
    assert.match(LIVE_TABLE_SMOKE_ACCEPTANCE, /Preview 保持只读/);

    const source = readLiveTableSmokeDocument(fixture);
    const lines = source.split("\n");
    const firstTableLine = lines.findIndex((line) => line.startsWith("| 渠道 |"));
    const block = markdownTableBlockAtLines(lines, firstTableLine);
    assert.equal(block?.table.columnCount, 4);
    assert.equal(block?.table.rowCount, 5);
    assert.ok(parseMarkdownTable(block?.source));
    assert.match(
      source,
      /style="color: #16a34a; background-color: #16a34a33;"/,
    );
    assert.match(source, /\*\*128\.4（↑ 12\.4%）\*\*/);
    assert.match(source, /~~96\.7（↓ 8\.7%）~~/);
    assert.equal(containsNativeLiveTableSmokeTable(source), true);
    assert.equal(
      containsNativeLiveTableSmokeTable(source.replace(
        "| 渠道 | 收入与变化 | 颜色语义 | 状态 |",
        "| 收入与变化 | 颜色语义 | 渠道 | 状态 |",
      )),
      true,
    );
  } finally {
    cleanupLiveTableSmokeFixture(fixture);
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
