import assert from "node:assert/strict";
import test from "node:test";

import {
  alignMarkdownTableColumns,
  applyMarkdownTableHighlightColor,
  applyMarkdownTableTextStyle,
  applyMarkdownTableTextColor,
  clearMarkdownTableTextFormatting,
  colorMarkdownTableCellContent,
  controlledTableStyleSpanAt,
  controlledTextColorSpanAt,
  deleteMarkdownTableColumns,
  deleteMarkdownTableColumnWidths,
  deleteMarkdownTableRows,
  formatMarkdownTableCellContent,
  insertMarkdownTableColumn,
  insertMarkdownTableColumnWidth,
  insertMarkdownTableRow,
  markdownTableBlockAtLines,
  markdownTableSelectionFormatState,
  parseMarkdownTableColumnWidthsLine,
  normalizeMarkdownTableSelection,
  parseMarkdownTable,
  parseMarkdownTableCellFormat,
  parseMarkdownTableRow,
  reorderMarkdownTableColumn,
  reorderMarkdownTableColumnWidths,
  replaceMarkdownTableCell,
  serializeMarkdownTableColumnWidths,
} from "../src/content/markdown-table.mjs";

const tableSource = [
  "| 渠道 | 收入与变化 | 状态 |",
  "| :--- | ---: | :---: |",
  "| 自然流量 | 128.4（↑ 12.4%） | 健康 |",
  "| 付费投放 | 96.7（↓ 8.7%） | 风险 |",
].join("\n");

test("parseMarkdownTable maps visual rows while preserving source cell text", () => {
  const table = parseMarkdownTable(tableSource);

  assert.equal(table?.columnCount, 3);
  assert.equal(table?.rowCount, 3);
  assert.deepEqual(table?.alignments, ["left", "right", "center"]);
  assert.equal(table?.visualRows[0].lineIndex, 0);
  assert.equal(table?.visualRows[1].lineIndex, 2);
  assert.equal(table?.visualRows[2].cells[1].content, "96.7（↓ 8.7%）");
});

test("parseMarkdownTableRow ignores escaped and inline-code pipes", () => {
  const row = parseMarkdownTableRow("| Alpha \\| Beta | `a|b` | Ready |");

  assert.deepEqual(
    row?.cells.map((cell) => cell.content),
    ["Alpha \\| Beta", "`a|b`", "Ready"],
  );
});

test("markdownTableBlockAtLines stops before a non-table line", () => {
  const lines = [
    ...tableSource.split("\n"),
    "",
    "After the table.",
  ];

  const block = markdownTableBlockAtLines(lines, 0);
  assert.equal(block?.endIndex, 3);
  assert.equal(block?.table.rowCount, 3);
});

test("Markdown table column widths round-trip through adjacent hidden metadata", () => {
  const metadata = serializeMarkdownTableColumnWidths([128, 244, 96]);
  const lines = [metadata, ...tableSource.split("\n")];
  const block = markdownTableBlockAtLines(lines, 1);

  assert.equal(metadata, '[git-leaf-table-widths]: # "128,244,96"');
  assert.deepEqual(parseMarkdownTableColumnWidthsLine(metadata, 3), [128, 244, 96]);
  assert.equal(block?.metadataIndex, 0);
  assert.deepEqual(block?.columnWidths, [128, 244, 96]);
  assert.equal(parseMarkdownTableColumnWidthsLine(metadata, 2), null);
});

test("reordering a Markdown table column reorders its persisted width", () => {
  assert.deepEqual(
    reorderMarkdownTableColumnWidths([128, 244, 96], 0, 2),
    [244, 96, 128],
  );
});

test("inserting and deleting Markdown table columns keeps width metadata aligned", () => {
  assert.deepEqual(
    insertMarkdownTableColumnWidth([128, 244, 96], 1),
    [128, 244, 244, 96],
  );
  assert.deepEqual(
    insertMarkdownTableColumnWidth([128, 244, 96], 3),
    [128, 244, 96, 96],
  );
  assert.deepEqual(
    deleteMarkdownTableColumnWidths([128, 244, 96], 1, 1),
    [128, 96],
  );
  assert.equal(
    deleteMarkdownTableColumnWidths([128, 244, 96], 0, 2),
    null,
  );
});

test("Markdown table rows can be inserted around and deleted from a selection", () => {
  const selection = {
    anchorRow: 1,
    anchorColumn: 0,
    focusRow: 1,
    focusColumn: 2,
  };
  const inserted = insertMarkdownTableRow(tableSource, selection, "below");
  const insertedTable = parseMarkdownTable(inserted?.source);
  assert.equal(insertedTable?.rowCount, 4);
  assert.deepEqual(
    insertedTable?.visualRows[2].cells.map((cell) => cell.content),
    ["", "", ""],
  );
  assert.deepEqual(inserted?.selection, {
    anchorRow: 2,
    anchorColumn: 0,
    focusRow: 2,
    focusColumn: 2,
  });

  const deleted = deleteMarkdownTableRows(inserted.source, {
    anchorRow: 1,
    anchorColumn: 0,
    focusRow: 2,
    focusColumn: 2,
  });
  assert.equal(parseMarkdownTable(deleted?.source)?.rowCount, 2);
  assert.equal(
    parseMarkdownTable(deleted?.source)?.visualRows[1].cells[0].content,
    "付费投放",
  );
  assert.equal(deleteMarkdownTableRows(tableSource, {
    anchorRow: 0,
    anchorColumn: 0,
    focusRow: 0,
    focusColumn: 2,
  }), null);
});

test("Markdown table columns can be inserted beside and deleted across a selection", () => {
  const inserted = insertMarkdownTableColumn(tableSource, {
    anchorRow: 0,
    anchorColumn: 0,
    focusRow: 2,
    focusColumn: 0,
  }, "right");
  const insertedTable = parseMarkdownTable(inserted?.source);
  assert.equal(insertedTable?.columnCount, 4);
  assert.deepEqual(
    insertedTable?.visualRows.map((row) => row.cells[1].content),
    ["", "", ""],
  );
  assert.equal(insertedTable?.alignments[1], "left");
  assert.deepEqual(inserted?.selection, {
    anchorRow: 0,
    anchorColumn: 1,
    focusRow: 2,
    focusColumn: 1,
  });

  const deleted = deleteMarkdownTableColumns(inserted.source, {
    anchorRow: 0,
    anchorColumn: 1,
    focusRow: 2,
    focusColumn: 2,
  });
  const deletedTable = parseMarkdownTable(deleted?.source);
  assert.equal(deletedTable?.columnCount, 2);
  assert.deepEqual(
    deletedTable?.visualRows[0].cells.map((cell) => cell.content),
    ["渠道", "状态"],
  );
  assert.equal(deleteMarkdownTableColumns(tableSource, {
    anchorRow: 0,
    anchorColumn: 0,
    focusRow: 2,
    focusColumn: 2,
  }), null);
});

test("normalizeMarkdownTableSelection turns diagonal dragging into a rectangle", () => {
  const table = parseMarkdownTable(tableSource);

  assert.deepEqual(
    normalizeMarkdownTableSelection(
      {
        anchorRow: 2,
        anchorColumn: 2,
        focusRow: 0,
        focusColumn: 0,
      },
      table,
    ),
    {
      anchorRow: 2,
      anchorColumn: 2,
      focusRow: 0,
      focusColumn: 0,
      minRow: 0,
      maxRow: 2,
      minColumn: 0,
      maxColumn: 2,
    },
  );
});

test("replaceMarkdownTableCell changes only the selected cell content", () => {
  const result = replaceMarkdownTableCell(tableSource, 1, 2, "重点观察");

  assert.equal(
    result?.source,
    [
      "| 渠道 | 收入与变化 | 状态 |",
      "| :--- | ---: | :---: |",
      "| 自然流量 | 128.4（↑ 12.4%） | 重点观察 |",
      "| 付费投放 | 96.7（↓ 8.7%） | 风险 |",
    ].join("\n"),
  );
});

test("table text colors wrap, replace, and clear only controlled palette spans", () => {
  assert.equal(
    colorMarkdownTableCellContent("健康", "#16A34A"),
    '<span style="color: #16a34a;">健康</span>',
  );
  assert.equal(
    colorMarkdownTableCellContent(
      '<span style="color: #16a34a;">健康</span>',
      "#dc2626",
    ),
    '<span style="color: #dc2626;">健康</span>',
  );
  assert.equal(
    colorMarkdownTableCellContent(
      '<span style="color: #dc2626;">健康</span>',
      null,
    ),
    "健康",
  );
  assert.equal(colorMarkdownTableCellContent("健康", "#ffffff"), null);
  assert.equal(
    controlledTextColorSpanAt('<span style="font-size: 40px;">健康</span>'),
    null,
  );
});

test("table cell formats combine standard Markdown with controlled colors", () => {
  const formatted = formatMarkdownTableCellContent("健康", {
    bold: true,
    italic: true,
    strikethrough: true,
    color: "#16A34A",
    backgroundColor: "#16A34A33",
  });

  assert.equal(
    formatted,
    '**_~~<span style="color: #16a34a; background-color: #16a34a33;">健康</span>~~_**',
  );
  assert.deepEqual(parseMarkdownTableCellFormat(formatted), {
    content: "健康",
    bold: true,
    italic: true,
    strikethrough: true,
    color: "#16a34a",
    backgroundColor: "#16a34a33",
  });
  assert.equal(
    formatMarkdownTableCellContent("查看 **局部强调**", { italic: true }),
    "_查看 **局部强调**_",
  );
});

test("controlled table style spans reject arbitrary or duplicate declarations", () => {
  assert.deepEqual(
    controlledTableStyleSpanAt(
      '<span style="background-color: #dc262633; color: #2563eb;">风险</span>',
    ),
    {
      color: "#2563eb",
      backgroundColor: "#dc262633",
      content: "风险",
      length: 68,
      source:
        '<span style="background-color: #dc262633; color: #2563eb;">风险</span>',
    },
  );
  assert.equal(
    controlledTableStyleSpanAt(
      '<span style="background-color: #ffffff;">不受控</span>',
    ),
    null,
  );
  assert.equal(
    controlledTableStyleSpanAt(
      '<span style="color: #16a34a; color: #dc2626;">重复</span>',
    ),
    null,
  );
  assert.equal(
    controlledTableStyleSpanAt(
      '<span style="font-size: 24px; color: #16a34a;">过大</span>',
    ),
    null,
  );
});

test("applyMarkdownTableTextColor colors every cell in a rectangular selection", () => {
  const result = applyMarkdownTableTextColor(
    tableSource,
    {
      anchorRow: 1,
      anchorColumn: 1,
      focusRow: 2,
      focusColumn: 2,
    },
    "#d97706",
  );

  assert.match(
    result?.source ?? "",
    /\| 自然流量 \| <span style="color: #d97706;">128\.4（↑ 12\.4%）<\/span> \| <span style="color: #d97706;">健康<\/span> \|/,
  );
  assert.match(
    result?.source ?? "",
    /\| 付费投放 \| <span style="color: #d97706;">96\.7（↓ 8\.7%）<\/span> \| <span style="color: #d97706;">风险<\/span> \|/,
  );
  assert.doesNotMatch(
    result?.source ?? "",
    /<span[^>]*>自然流量<\/span>/,
  );
});

test("table text styles and highlights apply to a rectangular selection", () => {
  const selected = {
    anchorRow: 1,
    anchorColumn: 1,
    focusRow: 2,
    focusColumn: 2,
  };
  const highlighted = applyMarkdownTableHighlightColor(
    tableSource,
    selected,
    "#d9770633",
  );
  const bold = applyMarkdownTableTextStyle(
    highlighted?.source,
    selected,
    "bold",
    true,
  );

  assert.match(
    bold?.source ?? "",
    /\| 自然流量 \| \*\*<span style="background-color: #d9770633;">128\.4（↑ 12\.4%）<\/span>\*\* \|/,
  );
  assert.match(
    bold?.source ?? "",
    /\*\*<span style="background-color: #d9770633;">风险<\/span>\*\*/,
  );
  assert.equal(
    applyMarkdownTableTextStyle(tableSource, selected, "underline", true),
    null,
  );
});

test("table selection format state reports uniform and mixed values", () => {
  const selected = {
    anchorRow: 1,
    anchorColumn: 2,
    focusRow: 2,
    focusColumn: 2,
  };
  const oneColored = applyMarkdownTableTextColor(
    tableSource,
    {
      anchorRow: 1,
      anchorColumn: 2,
      focusRow: 1,
      focusColumn: 2,
    },
    "#16a34a",
  );

  assert.deepEqual(
    markdownTableSelectionFormatState(oneColored?.source, selected),
    {
      bold: false,
      italic: false,
      strikethrough: false,
      color: "mixed",
      backgroundColor: null,
      alignment: "center",
      alignments: ["center"],
      selection: {
        ...selected,
        minRow: 1,
        maxRow: 2,
        minColumn: 2,
        maxColumn: 2,
      },
    },
  );
});

test("clearing table text formatting preserves cell content and alignment", () => {
  const source = [
    "| 状态 |",
    "| ---: |",
    '| **_~~<span style="color: #dc2626; background-color: #d9770633;">[风险](risk.md)</span>~~_** |',
  ].join("\n");
  const result = clearMarkdownTableTextFormatting(source, {
    anchorRow: 1,
    anchorColumn: 0,
    focusRow: 1,
    focusColumn: 0,
  });

  assert.equal(
    result?.source,
    [
      "| 状态 |",
      "| ---: |",
      "| [风险](risk.md) |",
    ].join("\n"),
  );
});

test("alignMarkdownTableColumns updates only intersecting separator cells", () => {
  const centered = alignMarkdownTableColumns(
    tableSource,
    {
      anchorRow: 1,
      anchorColumn: 0,
      focusRow: 2,
      focusColumn: 1,
    },
    "center",
  );

  assert.equal(
    centered?.source,
    [
      "| 渠道 | 收入与变化 | 状态 |",
      "| :---: | :---: | :---: |",
      "| 自然流量 | 128.4（↑ 12.4%） | 健康 |",
      "| 付费投放 | 96.7（↓ 8.7%） | 风险 |",
    ].join("\n"),
  );
  const leftAgain = alignMarkdownTableColumns(
    centered?.source,
    {
      anchorRow: 0,
      anchorColumn: 1,
      focusRow: 0,
      focusColumn: 1,
    },
    "left",
  );
  assert.match(leftAgain?.source ?? "", /^\| :---: \| :--- \| :---: \|$/m);
  assert.equal(
    alignMarkdownTableColumns(tableSource, {
      anchorRow: 0,
      anchorColumn: 0,
      focusRow: 0,
      focusColumn: 0,
    }, "justify"),
    null,
  );
});

test("reorderMarkdownTableColumn moves header, alignment, and every body cell together", () => {
  const result = reorderMarkdownTableColumn(tableSource, 2, 0);

  assert.equal(
    result?.source,
    [
      "| 状态 | 渠道 | 收入与变化 |",
      "| :---: | :--- | ---: |",
      "| 健康 | 自然流量 | 128.4（↑ 12.4%） |",
      "| 风险 | 付费投放 | 96.7（↓ 8.7%） |",
    ].join("\n"),
  );
});
