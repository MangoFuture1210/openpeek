import assert from "node:assert/strict";
import test from "node:test";

import { EditorState } from "@codemirror/state";

import {
  createLiveTableInteraction,
  isVerticalTableColumnSelection,
} from "../src/client/source-editor.mjs";
import {
  markdownTableBlockAtLines,
  parseMarkdownTable,
} from "../src/content/markdown-table.mjs";

const tableSource = [
  "| A | B | C |",
  "| --- | --- | --- |",
  "| A1 | B1 | C1 |",
  "| A2 | B2 | C2 |",
  "| A3 | B3 | C3 |",
].join("\n");

test("editing a cell preserves native input clicks and upgrades a cross-cell drag to table selection", async () => {
  const fixture = liveTableFixture();
  const origin = fixture.cell(1, 1);

  fixture.interaction.handlePointerDown(pointerEvent(origin, {
    pointerId: 1,
    clientX: 280,
    clientY: 260,
  }));
  fixture.interaction.handlePointerUp(pointerEvent(origin, {
    pointerId: 1,
    clientX: 280,
    clientY: 260,
  }));

  const input = origin.querySelector(".cm-live-table-cell-editor");
  assert.ok(input);
  input.value = "B1 edited";

  const nativeDown = pointerEvent(input, {
    pointerId: 2,
    clientX: 280,
    clientY: 260,
  });
  fixture.interaction.handlePointerDown(nativeDown);
  const nativeUp = pointerEvent(input, {
    pointerId: 2,
    clientX: 300,
    clientY: 260,
  });
  fixture.interaction.handlePointerUp(nativeUp);
  assert.equal(nativeDown.defaultPrevented, false);
  assert.equal(nativeUp.defaultPrevented, false);
  assert.equal(origin.querySelector(".cm-live-table-cell-editor"), input);

  fixture.interaction.handlePointerDown(pointerEvent(input, {
    pointerId: 3,
    clientX: 280,
    clientY: 260,
  }));
  fixture.document.pointTarget = fixture.cell(2, 1);
  const firstDragMove = pointerEvent(input, {
    pointerId: 3,
    clientX: 280,
    clientY: 300,
  });
  fixture.interaction.handlePointerMove(firstDragMove);
  fixture.document.pointTarget = fixture.cell(3, 2);
  const finalDragMove = pointerEvent(fixture.cell(3, 2), {
    pointerId: 3,
    clientX: 400,
    clientY: 340,
  });
  fixture.interaction.handlePointerMove(finalDragMove);
  fixture.interaction.handlePointerUp(pointerEvent(fixture.cell(3, 2), {
    pointerId: 3,
    clientX: 400,
    clientY: 340,
  }));

  assert.equal(firstDragMove.defaultPrevented, true);
  assert.equal(finalDragMove.defaultPrevented, true);
  assert.deepEqual(fixture.selectedCoordinates(), [
    [1, 1],
    [1, 2],
    [2, 1],
    [2, 2],
    [3, 1],
    [3, 2],
  ]);
  assert.match(fixture.view.state.doc.toString(), /\| A1 \| B1 edited \| C1 \|/);
  await nextTask();
});

test("releasing an editor-originated pointer outside the editor ends the pending table gesture", async () => {
  const fixture = liveTableFixture();
  const origin = fixture.cell(1, 1);

  fixture.interaction.handlePointerDown(pointerEvent(origin, {
    pointerId: 9,
    clientX: 280,
    clientY: 260,
  }));
  fixture.interaction.handlePointerUp(pointerEvent(origin, {
    pointerId: 9,
    clientX: 280,
    clientY: 260,
  }));
  const input = origin.querySelector(".cm-live-table-cell-editor");
  assert.ok(input);

  fixture.interaction.handlePointerDown(pointerEvent(input, {
    pointerId: 10,
    clientX: 280,
    clientY: 260,
  }));
  const outside = fixture.document.createElement("div");
  fixture.interaction.handleDocumentPointerUp(pointerEvent(outside, {
    type: "pointerup",
    pointerId: 10,
    clientX: 500,
    clientY: 500,
  }));

  fixture.document.pointTarget = fixture.cell(2, 2);
  const reusedPointerMove = pointerEvent(fixture.cell(2, 2), {
    type: "pointermove",
    pointerId: 10,
    clientX: 400,
    clientY: 300,
  });
  fixture.interaction.handlePointerMove(reusedPointerMove);

  assert.equal(reusedPointerMove.defaultPrevented, false);
  assert.deepEqual(fixture.selectedCoordinates(), [[1, 1]]);
  assert.equal(origin.querySelector(".cm-live-table-cell-editor"), input);
  await nextTask();
});

test("a partial vertical range exposes the column handle and reorders the whole column", async () => {
  const fixture = liveTableFixture();
  const first = fixture.cell(1, 0);
  const last = fixture.cell(3, 0);

  fixture.interaction.handlePointerDown(pointerEvent(first, {
    pointerId: 4,
    clientX: 160,
    clientY: 260,
  }));
  fixture.document.pointTarget = last;
  fixture.interaction.handlePointerMove(pointerEvent(last, {
    pointerId: 4,
    clientX: 160,
    clientY: 340,
  }));
  fixture.interaction.handlePointerUp(pointerEvent(last, {
    pointerId: 4,
    clientX: 160,
    clientY: 340,
  }));

  assert.equal(fixture.handle.hidden, false);
  assert.equal(fixture.handle.dataset.liveTableColumn, "0");
  assert.equal(fixture.toolbar.style.top, "148px");

  fixture.interaction.handlePointerDown(pointerEvent(fixture.handle, {
    pointerId: 5,
    clientX: 160,
    clientY: 190,
  }));
  fixture.interaction.handlePointerMove(pointerEvent(fixture.handle, {
    pointerId: 5,
    clientX: 400,
    clientY: 190,
  }));
  fixture.interaction.handlePointerUp(pointerEvent(fixture.handle, {
    pointerId: 5,
    clientX: 400,
    clientY: 190,
  }));
  await nextTask();

  const reordered = parseMarkdownTable(fixture.view.state.doc.toString());
  assert.deepEqual(
    reordered?.visualRows.map((row) => row.cells.map((cell) => cell.content)),
    [
      ["B", "C", "A"],
      ["B1", "C1", "A1"],
      ["B2", "C2", "A2"],
      ["B3", "C3", "A3"],
    ],
  );
  assert.deepEqual(fixture.selectedCoordinates(), [
    [1, 2],
    [2, 2],
    [3, 2],
  ]);
  assert.equal(fixture.handle.hidden, false);
});

test("dragging a column divider persists only that column width", async () => {
  const fixture = liveTableFixture();
  await nextTask();

  fixture.interaction.handlePointerDown(pointerEvent(fixture.resizeHandles[1], {
    pointerId: 51,
    clientX: 340,
    clientY: 250,
  }));
  fixture.interaction.handlePointerMove(pointerEvent(fixture.resizeHandles[1], {
    type: "pointermove",
    pointerId: 51,
    clientX: 400,
    clientY: 250,
  }));

  assert.equal(fixture.columns[0].style.width, "120px");
  assert.equal(fixture.columns[1].style.width, "180px");
  assert.equal(fixture.columns[2].style.width, "120px");
  assert.equal(fixture.table.style.width, "420px");

  fixture.interaction.handlePointerUp(pointerEvent(fixture.resizeHandles[1], {
    type: "pointerup",
    pointerId: 51,
    clientX: 400,
    clientY: 250,
  }));
  await nextTask();

  const lines = fixture.view.state.doc.toString().split("\n");
  assert.equal(lines[0], '[git-leaf-table-widths]: # "120,180,120"');
  assert.deepEqual(
    markdownTableBlockAtLines(lines, 1)?.columnWidths,
    [120, 180, 120],
  );
});

test("the far-right divider resizes only the final column", async () => {
  const fixture = liveTableFixture();
  await nextTask();

  fixture.interaction.handlePointerDown(pointerEvent(fixture.resizeHandles[2], {
    pointerId: 52,
    clientX: 460,
    clientY: 250,
  }));
  fixture.interaction.handlePointerMove(pointerEvent(fixture.resizeHandles[2], {
    type: "pointermove",
    pointerId: 52,
    clientX: 540,
    clientY: 250,
  }));
  fixture.interaction.handlePointerUp(pointerEvent(fixture.resizeHandles[2], {
    type: "pointerup",
    pointerId: 52,
    clientX: 540,
    clientY: 250,
  }));
  await nextTask();

  const lines = fixture.view.state.doc.toString().split("\n");
  assert.deepEqual(
    markdownTableBlockAtLines(lines, 1)?.columnWidths,
    [120, 120, 200],
  );
});

test("reordering a persisted column keeps its width attached to that column", async () => {
  const source = [
    '[git-leaf-table-widths]: # "100,150,110"',
    tableSource,
  ].join("\n");
  const fixture = liveTableFixture({
    source,
    startLine: 2,
    columnWidths: [100, 150, 110],
  });
  const first = fixture.cell(1, 0);
  const last = fixture.cell(3, 0);

  fixture.interaction.handlePointerDown(pointerEvent(first, {
    pointerId: 53,
    clientX: 150,
    clientY: 260,
  }));
  fixture.document.pointTarget = last;
  fixture.interaction.handlePointerMove(pointerEvent(last, {
    type: "pointermove",
    pointerId: 53,
    clientX: 150,
    clientY: 340,
  }));
  fixture.interaction.handlePointerUp(pointerEvent(last, {
    type: "pointerup",
    pointerId: 53,
    clientX: 150,
    clientY: 340,
  }));

  fixture.interaction.handlePointerDown(pointerEvent(fixture.handle, {
    pointerId: 54,
    clientX: 150,
    clientY: 190,
  }));
  fixture.interaction.handlePointerMove(pointerEvent(fixture.handle, {
    type: "pointermove",
    pointerId: 54,
    clientX: 405,
    clientY: 190,
  }));
  fixture.interaction.handlePointerUp(pointerEvent(fixture.handle, {
    type: "pointerup",
    pointerId: 54,
    clientX: 405,
    clientY: 190,
  }));
  await nextTask();

  const lines = fixture.view.state.doc.toString().split("\n");
  const block = markdownTableBlockAtLines(lines, 1);
  assert.deepEqual(block?.columnWidths, [150, 110, 100]);
  assert.deepEqual(
    block?.table.visualRows[0].cells.map((cell) => cell.content),
    ["B", "C", "A"],
  );
});

test("the table-top toolbar closes through its close button and Escape", async () => {
  const fixture = liveTableFixture();
  const lowerCell = fixture.cell(3, 1);

  fixture.interaction.handlePointerDown(pointerEvent(lowerCell, {
    pointerId: 6,
    clientX: 280,
    clientY: 340,
  }));
  fixture.interaction.handlePointerUp(pointerEvent(lowerCell, {
    pointerId: 6,
    clientX: 280,
    clientY: 340,
  }));

  assert.equal(fixture.toolbar.hidden, false);
  assert.equal(fixture.toolbar.style.top, "148px");

  fixture.table.rect = rect(100, 20, 360, 1200);
  fixture.interaction.refreshPositions();
  await nextTask();
  assert.equal(fixture.toolbar.style.top, "8px");

  const closeEvent = pointerEvent(fixture.closeButton, {
    pointerId: 7,
    clientX: 350,
    clientY: 170,
  });
  fixture.interaction.handlePointerDown(closeEvent);
  await nextTask();
  assert.equal(closeEvent.defaultPrevented, true);
  assert.deepEqual(fixture.selectedCoordinates(), []);
  assert.equal(fixture.toolbar.hidden, true);

  const cell = fixture.cell(1, 1);
  fixture.interaction.handlePointerDown(pointerEvent(cell, {
    pointerId: 8,
    clientX: 280,
    clientY: 260,
  }));
  fixture.interaction.handlePointerUp(pointerEvent(cell, {
    pointerId: 8,
    clientX: 280,
    clientY: 260,
  }));
  const input = cell.querySelector(".cm-live-table-cell-editor");
  assert.ok(input);

  const escapeEvent = keyEvent("Escape");
  input.dispatchEvent(escapeEvent);
  await nextTask();
  assert.equal(escapeEvent.defaultPrevented, true);
  assert.deepEqual(fixture.selectedCoordinates(), []);
  assert.equal(fixture.toolbar.hidden, true);
  assert.equal(cell.querySelector(".cm-live-table-cell-editor"), null);
});

test("selecting another Live object closes the table toolbar", async () => {
  const fixture = liveTableFixture();
  const cell = fixture.cell(1, 1);
  fixture.interaction.handlePointerDown(pointerEvent(cell, {
    pointerId: 20,
    clientX: 280,
    clientY: 260,
  }));
  fixture.interaction.handlePointerUp(pointerEvent(cell, {
    pointerId: 20,
    clientX: 280,
    clientY: 260,
  }));
  assert.equal(fixture.toolbar.hidden, false);

  const image = fixture.document.createElement("img");
  fixture.root.append(image);
  fixture.interaction.handlePointerDown(pointerEvent(image, {
    pointerId: 21,
    clientX: 500,
    clientY: 420,
  }));
  await nextTask();

  assert.deepEqual(fixture.selectedCoordinates(), []);
  assert.equal(fixture.toolbar.hidden, true);
});

test("the Live table toolbar formats a rectangular range and aligns its columns", async () => {
  const fixture = liveTableFixture();
  const first = fixture.cell(1, 1);
  const last = fixture.cell(2, 2);

  fixture.interaction.handlePointerDown(pointerEvent(first, {
    pointerId: 20,
    clientX: 280,
    clientY: 260,
  }));
  fixture.document.pointTarget = last;
  fixture.interaction.handlePointerMove(pointerEvent(last, {
    pointerId: 20,
    clientX: 400,
    clientY: 300,
  }));
  fixture.interaction.handlePointerUp(pointerEvent(last, {
    pointerId: 20,
    clientX: 400,
    clientY: 300,
  }));

  fixture.interaction.handlePointerDown(pointerEvent(fixture.boldButton));
  await nextTask();
  assert.equal(fixture.boldButton.getAttribute("aria-pressed"), "true");

  fixture.interaction.handlePointerDown(pointerEvent(fixture.colorTrigger));
  assert.equal(fixture.colorMenu.hidden, false);
  assert.equal(fixture.colorTrigger.getAttribute("aria-expanded"), "true");
  assert.equal(fixture.colorMenu.classList.contains("opens-below"), true);
  fixture.interaction.handlePointerDown(pointerEvent(fixture.greenButton));
  await nextTask();
  assert.equal(fixture.colorMenu.hidden, true);

  fixture.interaction.handlePointerDown(pointerEvent(fixture.highlightButton));
  fixture.interaction.handlePointerDown(pointerEvent(fixture.alignRightButton));
  await nextTask();

  let parsed = parseMarkdownTable(fixture.view.state.doc.toString());
  assert.equal(
    parsed?.visualRows[1].cells[1].content,
    '**<span style="color: #16a34a; background-color: #d9770633;">B1</span>**',
  );
  assert.equal(
    parsed?.visualRows[2].cells[2].content,
    '**<span style="color: #16a34a; background-color: #d9770633;">C2</span>**',
  );
  assert.deepEqual(parsed?.alignments, ["left", "right", "right"]);

  fixture.interaction.handlePointerDown(pointerEvent(fixture.clearFormatButton));
  await nextTask();
  parsed = parseMarkdownTable(fixture.view.state.doc.toString());
  assert.equal(parsed?.visualRows[1].cells[1].content, "B1");
  assert.equal(parsed?.visualRows[2].cells[2].content, "C2");
  assert.deepEqual(parsed?.alignments, ["left", "right", "right"]);
  assert.equal(fixture.boldButton.getAttribute("aria-pressed"), "false");
});

test("the Live table structure menu inserts and deletes selected rows", async () => {
  const insertedFixture = liveTableFixture();
  const selectedCell = insertedFixture.cell(1, 1);
  insertedFixture.interaction.handlePointerDown(pointerEvent(selectedCell, {
    pointerId: 81,
    clientX: 280,
    clientY: 260,
  }));
  insertedFixture.interaction.handlePointerUp(pointerEvent(selectedCell, {
    type: "pointerup",
    pointerId: 81,
    clientX: 280,
    clientY: 260,
  }));
  insertedFixture.interaction.handlePointerDown(pointerEvent(
    insertedFixture.structureButtons["insert-row-below"],
  ));
  await nextTask();

  let parsed = parseMarkdownTable(insertedFixture.view.state.doc.toString());
  assert.equal(parsed?.rowCount, 5);
  assert.deepEqual(
    parsed?.visualRows[2].cells.map((cell) => cell.content),
    ["", "", ""],
  );

  const deletedFixture = liveTableFixture();
  const first = deletedFixture.cell(1, 0);
  const last = deletedFixture.cell(2, 2);
  deletedFixture.interaction.handlePointerDown(pointerEvent(first, {
    pointerId: 82,
    clientX: 160,
    clientY: 260,
  }));
  deletedFixture.document.pointTarget = last;
  deletedFixture.interaction.handlePointerMove(pointerEvent(last, {
    type: "pointermove",
    pointerId: 82,
    clientX: 400,
    clientY: 300,
  }));
  deletedFixture.interaction.handlePointerUp(pointerEvent(last, {
    type: "pointerup",
    pointerId: 82,
    clientX: 400,
    clientY: 300,
  }));
  deletedFixture.interaction.handlePointerDown(pointerEvent(
    deletedFixture.structureButtons["delete-rows"],
  ));
  await nextTask();

  parsed = parseMarkdownTable(deletedFixture.view.state.doc.toString());
  assert.equal(parsed?.rowCount, 2);
  assert.equal(parsed?.visualRows[1].cells[0].content, "A3");
});

test("the Live table structure menu keeps persisted widths aligned with columns", async () => {
  const source = [
    '[git-leaf-table-widths]: # "100,150,110"',
    tableSource,
  ].join("\n");
  const insertedFixture = liveTableFixture({
    source,
    startLine: 2,
    columnWidths: [100, 150, 110],
  });
  const selectedCell = insertedFixture.cell(1, 1);
  insertedFixture.interaction.handlePointerDown(pointerEvent(selectedCell, {
    pointerId: 83,
    clientX: 280,
    clientY: 260,
  }));
  insertedFixture.interaction.handlePointerUp(pointerEvent(selectedCell, {
    type: "pointerup",
    pointerId: 83,
    clientX: 280,
    clientY: 260,
  }));
  insertedFixture.interaction.handlePointerDown(pointerEvent(
    insertedFixture.structureButtons["insert-column-right"],
  ));
  await nextTask();

  let lines = insertedFixture.view.state.doc.toString().split("\n");
  let block = markdownTableBlockAtLines(lines, 1);
  assert.equal(block?.table.columnCount, 4);
  assert.deepEqual(block?.columnWidths, [100, 150, 150, 110]);

  const deletedFixture = liveTableFixture({
    source,
    startLine: 2,
    columnWidths: [100, 150, 110],
  });
  const deleteCell = deletedFixture.cell(2, 1);
  deletedFixture.interaction.handlePointerDown(pointerEvent(deleteCell, {
    pointerId: 84,
    clientX: 280,
    clientY: 300,
  }));
  deletedFixture.interaction.handlePointerUp(pointerEvent(deleteCell, {
    type: "pointerup",
    pointerId: 84,
    clientX: 280,
    clientY: 300,
  }));
  deletedFixture.interaction.handlePointerDown(pointerEvent(
    deletedFixture.structureButtons["delete-columns"],
  ));
  await nextTask();

  lines = deletedFixture.view.state.doc.toString().split("\n");
  block = markdownTableBlockAtLines(lines, 1);
  assert.equal(block?.table.columnCount, 2);
  assert.deepEqual(block?.columnWidths, [100, 110]);
});

test("the Live table structure menu deletes the table and its width metadata", async () => {
  const source = [
    "Before",
    '[git-leaf-table-widths]: # "100,150,110"',
    tableSource,
    "After",
  ].join("\n");
  const fixture = liveTableFixture({
    source,
    startLine: 3,
    columnWidths: [100, 150, 110],
  });
  const selectedCell = fixture.cell(1, 1);
  fixture.interaction.handlePointerDown(pointerEvent(selectedCell, {
    pointerId: 85,
    clientX: 280,
    clientY: 260,
  }));
  fixture.interaction.handlePointerUp(pointerEvent(selectedCell, {
    type: "pointerup",
    pointerId: 85,
    clientX: 280,
    clientY: 260,
  }));
  fixture.interaction.handlePointerDown(pointerEvent(
    fixture.structureButtons["delete-table"],
  ));
  await nextTask();

  assert.equal(fixture.view.state.doc.toString(), "Before\nAfter");
  assert.equal(fixture.interaction.hasSelection(), false);
});

test("Escape is scoped to the editor that owns the table selection", async () => {
  const fixture = liveTableFixture();
  const cell = fixture.cell(2, 1);

  fixture.interaction.handlePointerDown(pointerEvent(cell, {
    pointerId: 11,
    clientX: 280,
    clientY: 300,
  }));
  fixture.interaction.handlePointerMove(pointerEvent(cell, {
    type: "pointermove",
    pointerId: 11,
    clientX: 286,
    clientY: 306,
  }));
  fixture.interaction.handlePointerUp(pointerEvent(cell, {
    type: "pointerup",
    pointerId: 11,
    clientX: 286,
    clientY: 306,
  }));

  const outside = fixture.document.createElement("button");
  fixture.document.activeElement = outside;
  const outsideEscape = keyEvent("Escape", outside);
  assert.equal(fixture.interaction.handleKeyDown(outsideEscape), false);
  assert.equal(outsideEscape.defaultPrevented, false);
  assert.deepEqual(fixture.selectedCoordinates(), [[2, 1]]);

  fixture.document.activeElement = fixture.root;
  const editorEscape = keyEvent("Escape", fixture.root);
  assert.equal(fixture.interaction.handleKeyDown(editorEscape), true);
  await nextTask();
  assert.equal(editorEscape.defaultPrevented, true);
  assert.deepEqual(fixture.selectedCoordinates(), []);
  assert.equal(fixture.toolbar.hidden, true);
});

test("only a vertical multi-cell range qualifies for column reordering", () => {
  assert.equal(isVerticalTableColumnSelection({
    minRow: 1,
    maxRow: 2,
    minColumn: 1,
    maxColumn: 1,
  }), true);
  assert.equal(isVerticalTableColumnSelection({
    minRow: 1,
    maxRow: 1,
    minColumn: 1,
    maxColumn: 1,
  }), false);
  assert.equal(isVerticalTableColumnSelection({
    minRow: 1,
    maxRow: 2,
    minColumn: 1,
    maxColumn: 2,
  }), false);
});

function liveTableFixture({
  source = tableSource,
  startLine = 1,
  columnWidths = [120, 120, 120],
} = {}) {
  const document = new FakeDocument();
  const root = document.createElement("div");
  const container = document.createElement("div");
  container.className = "cm-live-block-preview-table";
  container.dataset.liveBlockStart = String(startLine);
  root.append(container);

  const card = document.createElement("div");
  card.className = "table-card";
  card.dataset.tableLayout = "fit";
  container.append(card);
  const scroll = document.createElement("div");
  scroll.className = "table-scroll";
  scroll.dataset.tableLayout = "fit";
  card.append(scroll);

  const table = document.createElement("table");
  table.className = "cm-live-table";
  const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0);
  table.rect = rect(100, 200, tableWidth, 160);
  scroll.rect = { ...table.rect };
  scroll.append(table);

  const colgroup = document.createElement("colgroup");
  const columns = Array.from({ length: 3 }, (_, index) => {
    const column = document.createElement("col");
    column.style.width = `${columnWidths[index]}px`;
    colgroup.append(column);
    return column;
  });
  table.append(colgroup);

  const cells = [];
  const columnLefts = columnWidths.map((_, index) => (
    100 + columnWidths.slice(0, index).reduce((sum, width) => sum + width, 0)
  ));
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      const cell = document.createElement(row === 0 ? "th" : "td");
      cell.dataset.liveTableCell = "true";
      cell.dataset.liveTableRow = String(row);
      cell.dataset.liveTableColumn = String(column);
      cell.innerHTML = `${String.fromCharCode(65 + column)}${row || ""}`;
      cell.rect = rect(
        columnLefts[column],
        200 + row * 40,
        columnWidths[column],
        40,
      );
      table.append(cell);
      cells.push(cell);
    }
  }

  const toolbar = document.createElement("div");
  toolbar.className =
    "cm-live-table-format-toolbar cm-live-table-color-toolbar";
  toolbar.hidden = true;
  toolbar.rect = rect(0, 0, 250, 38);
  const boldButton = document.createElement("button");
  boldButton.dataset.liveTableFormatAction = "bold";
  boldButton.setAttribute("aria-pressed", "false");
  toolbar.append(boldButton);

  const colorTrigger = document.createElement("button");
  colorTrigger.dataset.liveTableMenuToggle = "text-color";
  colorTrigger.setAttribute("aria-expanded", "false");
  toolbar.append(colorTrigger);
  const colorMenu = document.createElement("span");
  colorMenu.dataset.liveTablePalette = "text-color";
  colorMenu.hidden = true;
  const greenButton = document.createElement("button");
  greenButton.className = "cm-live-table-swatch-button";
  greenButton.dataset.liveTableColorAction = "#16a34a";
  greenButton.setAttribute("aria-checked", "false");
  colorMenu.append(greenButton);
  const resetButton = document.createElement("button");
  resetButton.className = "cm-live-table-swatch-button";
  resetButton.dataset.liveTableColorAction = "clear";
  resetButton.setAttribute("aria-checked", "true");
  colorMenu.append(resetButton);
  toolbar.append(colorMenu);

  const highlightButton = document.createElement("button");
  highlightButton.dataset.liveTableHighlightAction = "#d9770633";
  toolbar.append(highlightButton);
  const alignRightButton = document.createElement("button");
  alignRightButton.dataset.liveTableAlignAction = "right";
  alignRightButton.setAttribute("aria-pressed", "false");
  toolbar.append(alignRightButton);
  const clearFormatButton = document.createElement("button");
  clearFormatButton.dataset.liveTableFormatAction = "clear";
  toolbar.append(clearFormatButton);
  const structureMenu = document.createElement("span");
  structureMenu.dataset.liveTablePalette = "structure";
  structureMenu.hidden = true;
  const structureButtons = {};
  for (const action of [
    "insert-row-above",
    "insert-row-below",
    "insert-column-left",
    "insert-column-right",
    "delete-rows",
    "delete-columns",
    "delete-table",
  ]) {
    const button = document.createElement("button");
    button.dataset.liveTableStructureAction = action;
    structureMenu.append(button);
    structureButtons[action] = button;
  }
  toolbar.append(structureMenu);
  const closeButton = document.createElement("button");
  closeButton.dataset.liveTableToolbarClose = "true";
  toolbar.append(closeButton);
  container.append(toolbar);

  const handle = document.createElement("button");
  handle.className = "cm-live-table-column-handle";
  handle.dataset.liveTableColumnHandle = "true";
  handle.hidden = true;
  handle.rect = rect(0, 0, 30, 22);
  container.append(handle);

  const resizeHandles = Array.from({ length: 3 }, (_, column) => {
    const resizeHandle = document.createElement("button");
    resizeHandle.className = "cm-live-table-resize-handle";
    resizeHandle.dataset.liveTableResizeHandle = "true";
    resizeHandle.dataset.liveTableResizeColumn = String(column);
    resizeHandle.hidden = true;
    container.append(resizeHandle);
    return resizeHandle;
  });

  const view = {
    dom: root,
    state: EditorState.create({ doc: source }),
    dispatch(spec) {
      this.state = this.state.update(spec).state;
    },
    focus() {
      document.activeElement = root;
    },
  };
  const interaction = createLiveTableInteraction({
    getView: () => view,
    getMode: () => "live",
    isEditable: () => true,
    locale: "en",
    documentRoot: document,
  });
  interaction.refreshPositions();

  return {
    document,
    root,
    table,
    columns,
    view,
    interaction,
    toolbar,
    boldButton,
    colorTrigger,
    colorMenu,
    greenButton,
    highlightButton,
    alignRightButton,
    clearFormatButton,
    structureButtons,
    closeButton,
    handle,
    resizeHandles,
    cell(row, column) {
      return cells.find((candidate) => (
        Number(candidate.dataset.liveTableRow) === row &&
        Number(candidate.dataset.liveTableColumn) === column
      ));
    },
    selectedCoordinates() {
      return cells
        .filter((cell) => cell.classList.contains("is-selected"))
        .map((cell) => [
          Number(cell.dataset.liveTableRow),
          Number(cell.dataset.liveTableColumn),
        ]);
    },
  };
}

class FakeDocument {
  constructor() {
    this.documentElement = {
      clientWidth: 1200,
      clientHeight: 800,
    };
    this.activeElement = null;
    this.pointTarget = null;
  }

  createElement(tagName) {
    return new FakeElement(tagName, this);
  }

  elementFromPoint() {
    return this.pointTarget;
  }
}

class FakeElement {
  constructor(tagName, ownerDocument) {
    this.tagName = String(tagName).toUpperCase();
    this.ownerDocument = ownerDocument;
    this.parentElement = null;
    this.children = [];
    this.dataset = {};
    this.attributes = new Map();
    this.classList = new FakeClassList();
    this.style = {
      setProperty(name, value) {
        this[name] = value;
      },
      removeProperty(name) {
        delete this[name];
      },
    };
    this.hidden = false;
    this.rect = rect(0, 0, 0, 0);
    this._innerHTML = "";
    this.textContent = "";
    this.value = "";
    this.listeners = new Map();
    this.isConnected = true;
  }

  get className() {
    return [...this.classList.values].join(" ");
  }

  set className(value) {
    this.classList.values = new Set(String(value).split(/\s+/).filter(Boolean));
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(value) {
    for (const child of this.children) {
      child.parentElement = null;
      child.isConnected = false;
    }
    this.children = [];
    this._innerHTML = String(value);
  }

  append(...children) {
    for (const child of children) {
      child.parentElement = this;
      child.isConnected = this.isConnected;
      this.children.push(child);
    }
  }

  replaceChildren(...children) {
    for (const child of this.children) {
      child.parentElement = null;
      child.isConnected = false;
    }
    this.children = [];
    this._innerHTML = "";
    this.append(...children);
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector) {
    const parts = selector.trim().split(/\s+/);
    return descendants(this).filter((candidate) => {
      if (!matchesSimpleSelector(candidate, parts.at(-1))) {
        return false;
      }
      let ancestor = candidate.parentElement;
      for (let index = parts.length - 2; index >= 0; index -= 1) {
        while (ancestor && !matchesSimpleSelector(ancestor, parts[index])) {
          ancestor = ancestor.parentElement;
        }
        if (!ancestor) {
          return false;
        }
        ancestor = ancestor.parentElement;
      }
      return true;
    });
  }

  closest(selector) {
    let current = this;
    while (current) {
      if (matchesSimpleSelector(current, selector)) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  contains(candidate) {
    return this === candidate || descendants(this).includes(candidate);
  }

  setAttribute(name, value) {
    this.attributes.set(String(name), String(value));
  }

  getAttribute(name) {
    return this.attributes.get(String(name)) ?? null;
  }

  getBoundingClientRect() {
    return { ...this.rect };
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  dispatchEvent(event) {
    event.target ??= this;
    for (const listener of this.listeners.get(event.type) ?? []) {
      listener(event);
    }
  }

  focus() {
    this.ownerDocument.activeElement = this;
  }

  setSelectionRange(start, end) {
    this.selectionStart = start;
    this.selectionEnd = end;
  }

  setPointerCapture() {}
}

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  add(...names) {
    for (const name of names) {
      this.values.add(name);
    }
  }

  remove(...names) {
    for (const name of names) {
      this.values.delete(name);
    }
  }

  contains(name) {
    return this.values.has(name);
  }

  toggle(name, force) {
    const enabled = force === undefined ? !this.values.has(name) : Boolean(force);
    if (enabled) {
      this.values.add(name);
    } else {
      this.values.delete(name);
    }
    return enabled;
  }
}

function matchesSimpleSelector(element, selector) {
  const tag = selector.match(/^[a-z][\w-]*/i)?.[0];
  if (tag && element.tagName !== tag.toUpperCase()) {
    return false;
  }
  for (const match of selector.matchAll(/\.([\w-]+)/g)) {
    if (!element.classList.contains(match[1])) {
      return false;
    }
  }
  for (const match of selector.matchAll(
    /\[([\w-]+)(?:="([^"]*)")?\]/g,
  )) {
    const [, name, expected] = match;
    const actual = dataAttributeValue(element, name);
    if (actual === undefined || (expected !== undefined && actual !== expected)) {
      return false;
    }
  }
  return true;
}

function dataAttributeValue(element, name) {
  if (!name.startsWith("data-")) {
    return element.getAttribute(name) ?? undefined;
  }
  const key = name
    .slice(5)
    .replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
  return element.dataset[key];
}

function descendants(element) {
  return element.children.flatMap((child) => [child, ...descendants(child)]);
}

function rect(x, y, width, height) {
  return {
    x,
    y,
    left: x,
    top: y,
    right: x + width,
    bottom: y + height,
    width,
    height,
  };
}

function pointerEvent(target, overrides = {}) {
  return {
    type: overrides.type ?? "pointerdown",
    target,
    button: 0,
    pointerId: 1,
    clientX: 0,
    clientY: 0,
    defaultPrevented: false,
    propagationStopped: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopPropagation() {
      this.propagationStopped = true;
    },
    ...overrides,
  };
}

function keyEvent(key, target) {
  return {
    type: "keydown",
    key,
    target,
    defaultPrevented: false,
    propagationStopped: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopPropagation() {
      this.propagationStopped = true;
    },
  };
}

function nextTask() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
