export const MARKDOWN_TABLE_TEXT_COLORS = Object.freeze([
  Object.freeze({ name: "green", value: "#16a34a" }),
  Object.freeze({ name: "red", value: "#dc2626" }),
  Object.freeze({ name: "orange", value: "#d97706" }),
  Object.freeze({ name: "blue", value: "#2563eb" }),
  Object.freeze({ name: "gray", value: "#64748b" }),
]);

export const MARKDOWN_TABLE_HIGHLIGHT_COLORS = Object.freeze([
  Object.freeze({ name: "green", value: "#16a34a33" }),
  Object.freeze({ name: "red", value: "#dc262633" }),
  Object.freeze({ name: "orange", value: "#d9770633" }),
  Object.freeze({ name: "blue", value: "#2563eb33" }),
  Object.freeze({ name: "gray", value: "#64748b33" }),
]);

const MARKDOWN_TABLE_TEXT_COLOR_VALUES = new Set(
  MARKDOWN_TABLE_TEXT_COLORS.map(({ value }) => value),
);
const MARKDOWN_TABLE_HIGHLIGHT_COLOR_VALUES = new Set(
  MARKDOWN_TABLE_HIGHLIGHT_COLORS.map(({ value }) => value),
);
const TABLE_SEPARATOR_CELL = /^:?-{3,}:?$/;
const TABLE_COLUMN_WIDTHS_LINE =
  /^\s*\[git-leaf-table-widths\]:\s*#\s*(?:"([^"]+)"|'([^']+)'|\(([^)]+)\))\s*$/i;
export const MARKDOWN_TABLE_MIN_COLUMN_WIDTH = 64;
export const MARKDOWN_TABLE_MAX_COLUMN_WIDTH = 1600;
const CONTROLLED_TABLE_STYLE_SPAN =
  /^<span\s+style=(["'])([^"'\n]*)\1\s*>([^\n]*?)<\/span>/i;
const MARKDOWN_TABLE_TEXT_STYLES = new Set([
  "bold",
  "italic",
  "strikethrough",
]);

export function normalizeMarkdownTableTextColor(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return MARKDOWN_TABLE_TEXT_COLOR_VALUES.has(normalized) ? normalized : null;
}

export function normalizeMarkdownTableHighlightColor(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return MARKDOWN_TABLE_HIGHLIGHT_COLOR_VALUES.has(normalized)
    ? normalized
    : null;
}

export function normalizeMarkdownTableColumnWidths(widths, columnCount = null) {
  if (!Array.isArray(widths)) {
    return null;
  }
  if (
    Number.isInteger(columnCount) &&
    columnCount > 0 &&
    widths.length !== columnCount
  ) {
    return null;
  }
  if (widths.length === 0) {
    return null;
  }

  const normalized = widths.map((value) => Math.round(Number(value)));
  if (normalized.some((value) => (
    !Number.isFinite(value) ||
    value < MARKDOWN_TABLE_MIN_COLUMN_WIDTH ||
    value > MARKDOWN_TABLE_MAX_COLUMN_WIDTH
  ))) {
    return null;
  }
  return normalized;
}

export function parseMarkdownTableColumnWidthsLine(line, columnCount = null) {
  const match = TABLE_COLUMN_WIDTHS_LINE.exec(String(line ?? ""));
  if (!match) {
    return null;
  }
  const values = (match[1] ?? match[2] ?? match[3] ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return normalizeMarkdownTableColumnWidths(values, columnCount);
}

export function serializeMarkdownTableColumnWidths(widths) {
  const normalized = normalizeMarkdownTableColumnWidths(widths);
  return normalized
    ? `[git-leaf-table-widths]: # "${normalized.join(",")}"`
    : null;
}

export function reorderMarkdownTableColumnWidths(widths, fromColumn, toColumn) {
  const normalized = normalizeMarkdownTableColumnWidths(widths);
  if (
    !normalized ||
    !Number.isInteger(fromColumn) ||
    !Number.isInteger(toColumn) ||
    fromColumn < 0 ||
    toColumn < 0 ||
    fromColumn >= normalized.length ||
    toColumn >= normalized.length
  ) {
    return null;
  }
  return moveArrayItem(normalized, fromColumn, toColumn);
}

export function insertMarkdownTableColumnWidth(
  widths,
  column,
  referenceColumn = Math.min(column, widths?.length - 1),
) {
  const normalized = normalizeMarkdownTableColumnWidths(widths);
  if (
    !normalized ||
    !Number.isInteger(column) ||
    !Number.isInteger(referenceColumn) ||
    column < 0 ||
    column > normalized.length ||
    referenceColumn < 0 ||
    referenceColumn >= normalized.length
  ) {
    return null;
  }

  const neighbor = normalized[referenceColumn];
  const next = [...normalized];
  next.splice(column, 0, neighbor);
  return next;
}

export function deleteMarkdownTableColumnWidths(
  widths,
  fromColumn,
  toColumn = fromColumn,
) {
  const normalized = normalizeMarkdownTableColumnWidths(widths);
  if (
    !normalized ||
    !Number.isInteger(fromColumn) ||
    !Number.isInteger(toColumn) ||
    fromColumn < 0 ||
    toColumn < fromColumn ||
    toColumn >= normalized.length ||
    toColumn - fromColumn + 1 >= normalized.length
  ) {
    return null;
  }

  const next = [...normalized];
  next.splice(fromColumn, toColumn - fromColumn + 1);
  return next;
}

export function controlledTableStyleSpanAt(source) {
  const match = CONTROLLED_TABLE_STYLE_SPAN.exec(String(source ?? ""));
  if (!match) {
    return null;
  }

  const declarations = match[2]
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean);
  if (declarations.length === 0 || declarations.length > 2) {
    return null;
  }

  let color = null;
  let backgroundColor = null;
  for (const declaration of declarations) {
    const property = declaration.match(
      /^(color|background-color)\s*:\s*(#[0-9a-fA-F]{6,8})$/i,
    );
    if (!property) {
      return null;
    }
    if (property[1].toLowerCase() === "color") {
      if (color) {
        return null;
      }
      color = normalizeMarkdownTableTextColor(property[2]);
      if (!color) {
        return null;
      }
      continue;
    }
    if (backgroundColor) {
      return null;
    }
    backgroundColor = normalizeMarkdownTableHighlightColor(property[2]);
    if (!backgroundColor) {
      return null;
    }
  }

  if (!color && !backgroundColor) {
    return null;
  }
  return {
    color,
    backgroundColor,
    content: match[3],
    length: match[0].length,
    source: match[0],
  };
}

export function controlledTextColorSpanAt(source) {
  const span = controlledTableStyleSpanAt(source);
  if (!span?.color) {
    return null;
  }
  return {
    ...span,
    color: span.color,
  };
}

export function parseMarkdownTableRow(line) {
  const source = String(line ?? "");
  const firstContentIndex = source.search(/\S/);
  if (firstContentIndex < 0) {
    return null;
  }

  let lastContentIndex = source.length - 1;
  while (lastContentIndex >= firstContentIndex && /\s/.test(source[lastContentIndex])) {
    lastContentIndex -= 1;
  }

  const pipePositions = topLevelPipePositions(
    source,
    firstContentIndex,
    lastContentIndex + 1,
  );
  if (pipePositions.length === 0) {
    return null;
  }

  const leadingPipe = pipePositions[0] === firstContentIndex;
  const trailingPipe =
    pipePositions[pipePositions.length - 1] === lastContentIndex &&
    (!leadingPipe || pipePositions.length > 1);
  const contentStart = leadingPipe ? firstContentIndex + 1 : firstContentIndex;
  const contentEnd = trailingPipe ? lastContentIndex : lastContentIndex + 1;
  const delimiters = pipePositions.filter(
    (position) => position >= contentStart && position < contentEnd,
  );
  const boundaries = [contentStart, ...delimiters, contentEnd];
  const cells = [];

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const from = boundaries[index] + (index > 0 ? 1 : 0);
    const to = boundaries[index + 1];
    const raw = source.slice(from, to);
    const leadingWhitespace = raw.match(/^[ \t]*/)?.[0] ?? "";
    const trailingWhitespace = raw.match(/[ \t]*$/)?.[0] ?? "";
    const content = raw.trim();
    cells.push({
      column: index,
      from,
      to,
      raw,
      content,
      leadingWhitespace,
      trailingWhitespace,
    });
  }

  if (cells.length === 0) {
    return null;
  }

  return {
    source,
    prefix: source.slice(0, contentStart),
    suffix: source.slice(contentEnd),
    leadingPipe,
    trailingPipe,
    cells,
  };
}

export function parseMarkdownTable(source) {
  const text = String(source ?? "");
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);
  if (lines.length < 2 || lines.at(-1) === "") {
    return null;
  }

  const sourceRows = lines.map((line, lineIndex) => {
    const row = parseMarkdownTableRow(line);
    return row ? { ...row, lineIndex } : null;
  });
  const header = sourceRows[0];
  const separator = sourceRows[1];
  if (!header || !separator || header.cells.length !== separator.cells.length) {
    return null;
  }
  if (
    separator.cells.length === 0 ||
    !separator.cells.every((cell) => TABLE_SEPARATOR_CELL.test(cell.content))
  ) {
    return null;
  }

  const columnCount = separator.cells.length;
  if (
    sourceRows.slice(2).some(
      (row) => !row || row.cells.length !== columnCount,
    )
  ) {
    return null;
  }

  const visualRows = [
    { ...header, row: 0, kind: "header" },
    ...sourceRows.slice(2).map((row, index) => ({
      ...row,
      row: index + 1,
      kind: "body",
    })),
  ];

  return {
    source: text,
    newline,
    lines,
    sourceRows,
    separator,
    visualRows,
    columnCount,
    rowCount: visualRows.length,
    alignments: separator.cells.map((cell) => separatorAlignment(cell.content)),
  };
}

export function markdownTableBlockAtLines(lines, index) {
  if (!Array.isArray(lines) || !Number.isInteger(index) || index < 0) {
    return null;
  }

  const header = parseMarkdownTableRow(lines[index]);
  const separator = parseMarkdownTableRow(lines[index + 1]);
  if (
    !header ||
    !separator ||
    header.cells.length !== separator.cells.length ||
    !separator.cells.every((cell) => TABLE_SEPARATOR_CELL.test(cell.content))
  ) {
    return null;
  }

  const columnCount = separator.cells.length;
  let endIndex = index + 1;
  while (endIndex + 1 < lines.length) {
    const nextRow = parseMarkdownTableRow(lines[endIndex + 1]);
    if (!nextRow || nextRow.cells.length !== columnCount) {
      break;
    }
    endIndex += 1;
  }

  const source = lines.slice(index, endIndex + 1).join("\n");
  const table = parseMarkdownTable(source);
  if (!table) {
    return null;
  }
  const metadataIndex = index > 0 && parseMarkdownTableColumnWidthsLine(
    lines[index - 1],
  )
    ? index - 1
    : null;
  const columnWidths = metadataIndex === null
    ? null
    : parseMarkdownTableColumnWidthsLine(
      lines[metadataIndex],
      table.columnCount,
    );
  return {
    endIndex,
    source,
    table,
    metadataIndex,
    columnWidths,
  };
}

export function normalizeMarkdownTableSelection(selection, table) {
  if (!selection || !table) {
    return null;
  }

  const values = [
    selection.anchorRow,
    selection.anchorColumn,
    selection.focusRow,
    selection.focusColumn,
  ];
  if (values.some((value) => !Number.isInteger(value))) {
    return null;
  }

  const minRow = Math.min(selection.anchorRow, selection.focusRow);
  const maxRow = Math.max(selection.anchorRow, selection.focusRow);
  const minColumn = Math.min(selection.anchorColumn, selection.focusColumn);
  const maxColumn = Math.max(selection.anchorColumn, selection.focusColumn);
  if (
    minRow < 0 ||
    minColumn < 0 ||
    maxRow >= table.rowCount ||
    maxColumn >= table.columnCount
  ) {
    return null;
  }

  return {
    anchorRow: selection.anchorRow,
    anchorColumn: selection.anchorColumn,
    focusRow: selection.focusRow,
    focusColumn: selection.focusColumn,
    minRow,
    maxRow,
    minColumn,
    maxColumn,
  };
}

export function colorMarkdownTableCellContent(content, color) {
  return formatMarkdownTableCellContent(content, {
    color: color ?? null,
  });
}

export function parseMarkdownTableCellFormat(content) {
  let inner = String(content ?? "");
  const format = {
    content: inner,
    bold: false,
    italic: false,
    strikethrough: false,
    color: null,
    backgroundColor: null,
  };

  let changed = true;
  while (changed && inner) {
    changed = false;

    const span = controlledTableStyleSpanAt(inner);
    if (span?.length === inner.length && span.content) {
      if (span.color) {
        format.color = span.color;
      }
      if (span.backgroundColor) {
        format.backgroundColor = span.backgroundColor;
      }
      inner = span.content;
      changed = true;
      continue;
    }

    const envelopes = [
      { property: "bold", open: "**", close: "**" },
      { property: "bold", open: "__", close: "__" },
      { property: "strikethrough", open: "~~", close: "~~" },
      { property: "italic", open: "_", close: "_" },
      { property: "italic", open: "*", close: "*" },
    ];
    for (const envelope of envelopes) {
      const unwrapped = unwrapMarkdownFormatEnvelope(
        inner,
        envelope.open,
        envelope.close,
      );
      if (unwrapped === null) {
        continue;
      }
      format[envelope.property] = true;
      inner = unwrapped;
      changed = true;
      break;
    }
  }

  return {
    ...format,
    content: inner,
  };
}

export function serializeMarkdownTableCellFormat(format) {
  const normalized = normalizeMarkdownTableCellFormat(format);
  if (!normalized) {
    return null;
  }

  let content = normalized.content;
  if (!content) {
    return content;
  }

  const declarations = [
    normalized.color ? `color: ${normalized.color}` : "",
    normalized.backgroundColor
      ? `background-color: ${normalized.backgroundColor}`
      : "",
  ].filter(Boolean);
  if (declarations.length > 0) {
    content = `<span style="${declarations.join("; ")};">${content}</span>`;
  }
  if (normalized.strikethrough) {
    content = `~~${content}~~`;
  }
  if (normalized.italic) {
    content = `_${content}_`;
  }
  if (normalized.bold) {
    content = `**${content}**`;
  }
  return content;
}

export function formatMarkdownTableCellContent(content, patch) {
  const normalizedPatch = normalizeMarkdownTableFormatPatch(patch);
  if (!normalizedPatch) {
    return null;
  }

  const current = parseMarkdownTableCellFormat(content);
  return serializeMarkdownTableCellFormat({
    ...current,
    ...normalizedPatch,
  });
}

export function replaceMarkdownTableCell(source, row, column, content) {
  const table = parseMarkdownTable(source);
  if (
    !table ||
    !Number.isInteger(row) ||
    !Number.isInteger(column) ||
    row < 0 ||
    row >= table.rowCount ||
    column < 0 ||
    column >= table.columnCount ||
    /[\r\n]/.test(String(content ?? ""))
  ) {
    return null;
  }

  const nextLines = [...table.lines];
  const targetRow = table.visualRows[row];
  const nextCells = targetRow.cells.map((cell) => cell.raw);
  nextCells[column] = cellRawWithContent(targetRow.cells[column], String(content ?? ""));
  nextLines[targetRow.lineIndex] = serializeMarkdownTableRow(targetRow, nextCells);
  const nextSource = nextLines.join(table.newline);
  return {
    source: nextSource,
    changed: nextSource !== table.source,
    row,
    column,
  };
}

export function insertMarkdownTableRow(source, selection, placement = "below") {
  const table = parseMarkdownTable(source);
  const normalizedSelection = normalizeMarkdownTableSelection(selection, table);
  if (
    !table ||
    !normalizedSelection ||
    !["above", "below"].includes(placement)
  ) {
    return null;
  }

  const insertionRow = placement === "above"
    ? Math.max(1, normalizedSelection.minRow)
    : Math.max(1, normalizedSelection.maxRow + 1);
  const insertionLine = insertionRow >= table.rowCount
    ? table.lines.length
    : table.visualRows[insertionRow].lineIndex;
  const templateRow = table.rowCount > 1
    ? table.visualRows[Math.min(insertionRow, table.rowCount - 1)]
    : table.visualRows[0];
  const emptyCells = templateRow.cells.map((cell) =>
    cellRawWithContent(cell, ""));
  const nextLines = [...table.lines];
  nextLines.splice(
    insertionLine,
    0,
    serializeMarkdownTableRow(templateRow, emptyCells),
  );

  return {
    source: nextLines.join(table.newline),
    changed: true,
    insertedRow: insertionRow,
    selection: {
      anchorRow: insertionRow,
      anchorColumn: normalizedSelection.minColumn,
      focusRow: insertionRow,
      focusColumn: normalizedSelection.maxColumn,
    },
  };
}

export function deleteMarkdownTableRows(source, selection) {
  const table = parseMarkdownTable(source);
  const normalizedSelection = normalizeMarkdownTableSelection(selection, table);
  if (!table || !normalizedSelection) {
    return null;
  }

  const firstRow = Math.max(1, normalizedSelection.minRow);
  const lastRow = normalizedSelection.maxRow;
  if (lastRow < firstRow) {
    return null;
  }

  const nextLines = [...table.lines];
  const lineIndexes = table.visualRows
    .slice(firstRow, lastRow + 1)
    .map((row) => row.lineIndex)
    .sort((left, right) => right - left);
  for (const lineIndex of lineIndexes) {
    nextLines.splice(lineIndex, 1);
  }
  const nextSource = nextLines.join(table.newline);
  const nextTable = parseMarkdownTable(nextSource);
  if (!nextTable) {
    return null;
  }
  const nextRow = nextTable.rowCount > 1
    ? Math.min(firstRow, nextTable.rowCount - 1)
    : 0;

  return {
    source: nextSource,
    changed: true,
    deletedRows: { from: firstRow, to: lastRow },
    selection: {
      anchorRow: nextRow,
      anchorColumn: normalizedSelection.minColumn,
      focusRow: nextRow,
      focusColumn: normalizedSelection.maxColumn,
    },
  };
}

export function insertMarkdownTableColumn(
  source,
  selection,
  placement = "right",
) {
  const table = parseMarkdownTable(source);
  const normalizedSelection = normalizeMarkdownTableSelection(selection, table);
  if (
    !table ||
    !normalizedSelection ||
    !["left", "right"].includes(placement)
  ) {
    return null;
  }

  const insertionColumn = placement === "left"
    ? normalizedSelection.minColumn
    : normalizedSelection.maxColumn + 1;
  const templateColumn = Math.min(insertionColumn, table.columnCount - 1);
  const nextLines = [...table.lines];
  for (const row of table.sourceRows) {
    const nextCells = row.cells.map((cell) => cell.raw);
    const content = row === table.separator ? "---" : "";
    nextCells.splice(
      insertionColumn,
      0,
      cellRawWithContent(row.cells[templateColumn], content),
    );
    nextLines[row.lineIndex] = serializeMarkdownTableRow(row, nextCells);
  }

  return {
    source: nextLines.join(table.newline),
    changed: true,
    insertedColumn: insertionColumn,
    referenceColumn: placement === "left"
      ? normalizedSelection.minColumn
      : normalizedSelection.maxColumn,
    selection: {
      anchorRow: normalizedSelection.minRow,
      anchorColumn: insertionColumn,
      focusRow: normalizedSelection.maxRow,
      focusColumn: insertionColumn,
    },
  };
}

export function deleteMarkdownTableColumns(source, selection) {
  const table = parseMarkdownTable(source);
  const normalizedSelection = normalizeMarkdownTableSelection(selection, table);
  if (!table || !normalizedSelection) {
    return null;
  }

  const deletedColumnCount =
    normalizedSelection.maxColumn - normalizedSelection.minColumn + 1;
  if (deletedColumnCount >= table.columnCount) {
    return null;
  }

  const nextLines = [...table.lines];
  for (const row of table.sourceRows) {
    const nextCells = row.cells.map((cell) => cell.raw);
    nextCells.splice(normalizedSelection.minColumn, deletedColumnCount);
    nextLines[row.lineIndex] = serializeMarkdownTableRow(row, nextCells);
  }
  const nextColumn = Math.min(
    normalizedSelection.minColumn,
    table.columnCount - deletedColumnCount - 1,
  );

  return {
    source: nextLines.join(table.newline),
    changed: true,
    deletedColumns: {
      from: normalizedSelection.minColumn,
      to: normalizedSelection.maxColumn,
    },
    selection: {
      anchorRow: normalizedSelection.minRow,
      anchorColumn: nextColumn,
      focusRow: normalizedSelection.maxRow,
      focusColumn: nextColumn,
    },
  };
}

export function applyMarkdownTableTextColor(source, selection, color) {
  return applyMarkdownTableCellFormat(source, selection, {
    color: color ?? null,
  });
}

export function applyMarkdownTableHighlightColor(
  source,
  selection,
  backgroundColor,
) {
  return applyMarkdownTableCellFormat(source, selection, {
    backgroundColor: backgroundColor ?? null,
  });
}

export function applyMarkdownTableTextStyle(
  source,
  selection,
  style,
  enabled,
) {
  if (
    !MARKDOWN_TABLE_TEXT_STYLES.has(style) ||
    typeof enabled !== "boolean"
  ) {
    return null;
  }
  return applyMarkdownTableCellFormat(source, selection, {
    [style]: enabled,
  });
}

export function clearMarkdownTableTextFormatting(source, selection) {
  return applyMarkdownTableCellFormat(source, selection, {
    bold: false,
    italic: false,
    strikethrough: false,
    color: null,
    backgroundColor: null,
  });
}

export function applyMarkdownTableCellFormat(source, selection, patch) {
  const table = parseMarkdownTable(source);
  const normalizedSelection = normalizeMarkdownTableSelection(selection, table);
  const normalizedPatch = normalizeMarkdownTableFormatPatch(patch);
  if (!table || !normalizedSelection || !normalizedPatch) {
    return null;
  }

  const nextLines = [...table.lines];
  for (
    let rowIndex = normalizedSelection.minRow;
    rowIndex <= normalizedSelection.maxRow;
    rowIndex += 1
  ) {
    const row = table.visualRows[rowIndex];
    const nextCells = row.cells.map((cell) => cell.raw);
    for (
      let columnIndex = normalizedSelection.minColumn;
      columnIndex <= normalizedSelection.maxColumn;
      columnIndex += 1
    ) {
      const nextContent = formatMarkdownTableCellContent(
        row.cells[columnIndex].content,
        normalizedPatch,
      );
      if (nextContent === null) {
        return null;
      }
      nextCells[columnIndex] = cellRawWithContent(
        row.cells[columnIndex],
        nextContent,
      );
    }
    nextLines[row.lineIndex] = serializeMarkdownTableRow(row, nextCells);
  }

  const nextSource = nextLines.join(table.newline);
  return {
    source: nextSource,
    changed: nextSource !== table.source,
    selection: normalizedSelection,
  };
}

export function markdownTableSelectionFormatState(source, selection) {
  const table = parseMarkdownTable(source);
  const normalizedSelection = normalizeMarkdownTableSelection(selection, table);
  if (!table || !normalizedSelection) {
    return null;
  }

  const formats = [];
  for (
    let rowIndex = normalizedSelection.minRow;
    rowIndex <= normalizedSelection.maxRow;
    rowIndex += 1
  ) {
    for (
      let columnIndex = normalizedSelection.minColumn;
      columnIndex <= normalizedSelection.maxColumn;
      columnIndex += 1
    ) {
      formats.push(
        parseMarkdownTableCellFormat(
          table.visualRows[rowIndex].cells[columnIndex].content,
        ),
      );
    }
  }

  const alignments = table.alignments.slice(
    normalizedSelection.minColumn,
    normalizedSelection.maxColumn + 1,
  );
  return {
    bold: uniformValue(formats.map((format) => format.bold)),
    italic: uniformValue(formats.map((format) => format.italic)),
    strikethrough: uniformValue(
      formats.map((format) => format.strikethrough),
    ),
    color: uniformValue(formats.map((format) => format.color)),
    backgroundColor: uniformValue(
      formats.map((format) => format.backgroundColor),
    ),
    alignment: uniformValue(alignments),
    alignments: [...new Set(alignments)],
    selection: normalizedSelection,
  };
}

export function alignMarkdownTableColumns(source, selection, alignment) {
  if (!["left", "center", "right"].includes(alignment)) {
    return null;
  }

  const table = parseMarkdownTable(source);
  const normalizedSelection = normalizeMarkdownTableSelection(selection, table);
  if (!table || !normalizedSelection) {
    return null;
  }

  const separator = table.separator;
  const nextCells = separator.cells.map((cell) => cell.raw);
  for (
    let columnIndex = normalizedSelection.minColumn;
    columnIndex <= normalizedSelection.maxColumn;
    columnIndex += 1
  ) {
    const cell = separator.cells[columnIndex];
    const nextContent = separatorContentForAlignment(cell.content, alignment);
    nextCells[columnIndex] = cellRawWithContent(cell, nextContent);
  }

  const nextLines = [...table.lines];
  nextLines[separator.lineIndex] = serializeMarkdownTableRow(
    separator,
    nextCells,
  );
  const nextSource = nextLines.join(table.newline);
  return {
    source: nextSource,
    changed: nextSource !== table.source,
    alignment,
    selection: normalizedSelection,
  };
}

export function separatorContentForAlignment(content, alignment) {
  const source = String(content ?? "");
  if (
    !TABLE_SEPARATOR_CELL.test(source) ||
    !["left", "center", "right"].includes(alignment)
  ) {
    return null;
  }
  if (separatorAlignment(source) === alignment) {
    return source;
  }

  const hyphens = "-".repeat(source.replaceAll(":", "").length);
  if (alignment === "center") {
    return `:${hyphens}:`;
  }
  if (alignment === "right") {
    return `${hyphens}:`;
  }
  return `:${hyphens}`;
}

export function reorderMarkdownTableColumn(source, fromColumn, toColumn) {
  const table = parseMarkdownTable(source);
  if (
    !table ||
    !Number.isInteger(fromColumn) ||
    !Number.isInteger(toColumn) ||
    fromColumn < 0 ||
    toColumn < 0 ||
    fromColumn >= table.columnCount ||
    toColumn >= table.columnCount
  ) {
    return null;
  }
  if (fromColumn === toColumn) {
    return {
      source: table.source,
      changed: false,
      fromColumn,
      toColumn,
    };
  }

  const nextLines = [...table.lines];
  for (const row of table.sourceRows) {
    const nextCells = moveArrayItem(row.cells.map((cell) => cell.raw), fromColumn, toColumn);
    nextLines[row.lineIndex] = serializeMarkdownTableRow(row, nextCells);
  }
  const nextSource = nextLines.join(table.newline);
  return {
    source: nextSource,
    changed: nextSource !== table.source,
    fromColumn,
    toColumn,
  };
}

function topLevelPipePositions(source, from, to) {
  const positions = [];
  let codeDelimiterLength = 0;

  for (let index = from; index < to; index += 1) {
    const character = source[index];
    if (character === "\\") {
      index += 1;
      continue;
    }
    if (character === "`") {
      let runLength = 1;
      while (source[index + runLength] === "`") {
        runLength += 1;
      }
      if (codeDelimiterLength === 0) {
        codeDelimiterLength = runLength;
      } else if (codeDelimiterLength === runLength) {
        codeDelimiterLength = 0;
      }
      index += runLength - 1;
      continue;
    }
    if (character === "|" && codeDelimiterLength === 0) {
      positions.push(index);
    }
  }

  return positions;
}

function separatorAlignment(content) {
  const left = content.startsWith(":");
  const right = content.endsWith(":");
  if (left && right) {
    return "center";
  }
  if (right) {
    return "right";
  }
  return "left";
}

function normalizeMarkdownTableCellFormat(format) {
  if (!format || typeof format !== "object") {
    return null;
  }
  const content = String(format.content ?? "");
  if (/[\r\n]/.test(content)) {
    return null;
  }

  const booleans = ["bold", "italic", "strikethrough"];
  if (booleans.some((property) => typeof format[property] !== "boolean")) {
    return null;
  }

  const color = format.color
    ? normalizeMarkdownTableTextColor(format.color)
    : null;
  const backgroundColor = format.backgroundColor
    ? normalizeMarkdownTableHighlightColor(format.backgroundColor)
    : null;
  if (
    (format.color && !color) ||
    (format.backgroundColor && !backgroundColor)
  ) {
    return null;
  }

  return {
    content,
    bold: format.bold,
    italic: format.italic,
    strikethrough: format.strikethrough,
    color,
    backgroundColor,
  };
}

function normalizeMarkdownTableFormatPatch(patch) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    return null;
  }

  const allowedProperties = new Set([
    "bold",
    "italic",
    "strikethrough",
    "color",
    "backgroundColor",
  ]);
  const properties = Object.keys(patch);
  if (
    properties.length === 0 ||
    properties.some((property) => !allowedProperties.has(property))
  ) {
    return null;
  }

  const normalized = {};
  for (const property of properties) {
    const value = patch[property];
    if (MARKDOWN_TABLE_TEXT_STYLES.has(property)) {
      if (typeof value !== "boolean") {
        return null;
      }
      normalized[property] = value;
      continue;
    }

    if (value === null || value === undefined || value === "") {
      normalized[property] = null;
      continue;
    }
    const nextValue = property === "color"
      ? normalizeMarkdownTableTextColor(value)
      : normalizeMarkdownTableHighlightColor(value);
    if (!nextValue) {
      return null;
    }
    normalized[property] = nextValue;
  }
  return normalized;
}

function unwrapMarkdownFormatEnvelope(source, open, close) {
  if (
    !source.startsWith(open) ||
    !source.endsWith(close) ||
    source.length <= open.length + close.length
  ) {
    return null;
  }
  const inner = source.slice(open.length, -close.length);
  if (!inner || /^\s|\s$/.test(inner)) {
    return null;
  }
  return inner;
}

function uniformValue(values) {
  if (values.length === 0) {
    return null;
  }
  const [first] = values;
  return values.every((value) => Object.is(value, first))
    ? first
    : "mixed";
}

function cellRawWithContent(cell, content) {
  if (!cell.content) {
    return cell.raw
      ? ` ${content} `
      : content;
  }
  return `${cell.leadingWhitespace}${content}${cell.trailingWhitespace}`;
}

function serializeMarkdownTableRow(row, rawCells) {
  return `${row.prefix}${rawCells.join("|")}${row.suffix}`;
}

function moveArrayItem(values, fromIndex, toIndex) {
  const next = [...values];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}
