import {
  controlledTableStyleSpanAt,
  formatMarkdownTableCellContent,
  markdownTableBlockAtLines,
  parseMarkdownTableCellFormat,
} from "./markdown-table.mjs";

const MARKDOWN_FORMAT_ENVELOPES = Object.freeze([
  Object.freeze({ open: "**", close: "**" }),
  Object.freeze({ open: "__", close: "__" }),
  Object.freeze({ open: "~~", close: "~~" }),
  Object.freeze({ open: "_", close: "_" }),
  Object.freeze({ open: "*", close: "*" }),
]);
const CONTROLLED_STYLE_OPEN = /<span\s+style=(["'])([^"'\n]*)\1\s*>$/i;

export function markdownTextSelectionFormatState(source, selection) {
  const normalized = normalizeTextSelection(source, selection);
  if (!normalized) {
    return null;
  }
  const segments = markdownTextSelectionSegments(source, normalized);
  if (segments.length === 0) {
    return null;
  }
  const formats = segments.map((segment) => (
    parseMarkdownTableCellFormat(segment.source)
  ));
  return {
    bold: uniformValue(formats.map((format) => format.bold)),
    italic: uniformValue(formats.map((format) => format.italic)),
    underline: uniformValue(formats.map((format) => format.underline)),
    strikethrough: uniformValue(
      formats.map((format) => format.strikethrough),
    ),
    color: uniformValue(formats.map((format) => format.color)),
    backgroundColor: uniformValue(
      formats.map((format) => format.backgroundColor),
    ),
    selection: normalized,
    segments,
  };
}

export function formatMarkdownTextSelection(source, selection, patch) {
  const text = String(source ?? "");
  const state = markdownTextSelectionFormatState(text, selection);
  if (!state) {
    return null;
  }

  const changes = [];
  for (const segment of state.segments) {
    const insert = formatMarkdownTextSegmentContent(segment.source, patch);
    if (insert === null) {
      return null;
    }
    changes.push({
      from: segment.from,
      to: segment.to,
      insert,
    });
  }

  let delta = 0;
  const mappedChanges = changes.map((change) => {
    const from = change.from + delta;
    const to = from + change.insert.length;
    delta += change.insert.length - (change.to - change.from);
    return { from, to };
  });
  const nextFrom = mappedChanges[0].from;
  const nextTo = mappedChanges.at(-1).to;
  const reversed = state.selection.anchor > state.selection.head;
  const nextSelection = reversed
    ? { anchor: nextTo, head: nextFrom }
    : { anchor: nextFrom, head: nextTo };
  const nextSource = applySourceChanges(text, changes);

  return {
    source: nextSource,
    changed: nextSource !== text,
    changes,
    selection: nextSelection,
  };
}

export function controlledMarkdownStyleSpansForLine(source) {
  const text = String(source ?? "");
  const spans = [];
  let cursor = 0;
  while (cursor < text.length) {
    const from = text.indexOf("<span", cursor);
    if (from < 0) {
      break;
    }
    const span = controlledTableStyleSpanAt(text.slice(from));
    if (!span) {
      cursor = from + 5;
      continue;
    }
    const openEnd = text.indexOf(">", from) + 1;
    const to = from + span.length;
    const closeStart = to - "</span>".length;
    if (openEnd <= from || closeStart < openEnd) {
      cursor = from + 5;
      continue;
    }
    spans.push({
      from,
      to,
      contentFrom: openEnd,
      contentTo: closeStart,
      color: span.color,
      backgroundColor: span.backgroundColor,
      underline: span.underline,
    });
    cursor = to;
  }
  return spans;
}

function formatMarkdownTextSegmentContent(source, patch) {
  const canonical = formatMarkdownTableCellContent(source, patch);
  if (canonical === null) {
    return null;
  }
  const format = parseMarkdownTableCellFormat(canonical);
  let content = format.content;
  if (!content) {
    return content;
  }
  if (format.strikethrough) {
    content = `~~${content}~~`;
  }
  if (format.italic) {
    content = `_${content}_`;
  }
  if (format.bold) {
    content = `**${content}**`;
  }

  const declarations = [
    format.color ? `color: ${format.color}` : "",
    format.backgroundColor
      ? `background-color: ${format.backgroundColor}`
      : "",
    format.underline ? "text-decoration: underline" : "",
  ].filter(Boolean);
  return declarations.length > 0
    ? `<span style="${declarations.join("; ")};">${content}</span>`
    : content;
}

function markdownTextSelectionSegments(source, selection) {
  const lines = sourceLines(source);
  const blockedLines = blockedMarkdownTextLines(lines);
  const segments = [];

  for (const line of lines) {
    if (
      line.to < selection.from ||
      line.from > selection.to ||
      blockedLines.has(line.index)
    ) {
      continue;
    }
    const content = readableLineContentRange(line.text);
    if (!content) {
      continue;
    }
    let from = Math.max(selection.from, line.from + content.from);
    let to = Math.min(selection.to, line.from + content.to);
    while (from < to && /\s/.test(source[from])) {
      from += 1;
    }
    while (to > from && /\s/.test(source[to - 1])) {
      to -= 1;
    }
    if (to <= from) {
      continue;
    }
    const expanded = expandMarkdownTextSegment(
      line.text,
      from - line.from,
      to - line.from,
      content,
    );
    segments.push({
      from: line.from + expanded.from,
      to: line.from + expanded.to,
      source: line.text.slice(expanded.from, expanded.to),
      line: line.index + 1,
    });
  }
  return segments;
}

function normalizeTextSelection(source, selection) {
  const length = String(source ?? "").length;
  const anchor = Number(selection?.anchor ?? selection?.from);
  const head = Number(selection?.head ?? selection?.to);
  if (
    !Number.isInteger(anchor) ||
    !Number.isInteger(head) ||
    anchor < 0 ||
    head < 0 ||
    anchor > length ||
    head > length ||
    anchor === head
  ) {
    return null;
  }
  return {
    anchor,
    head,
    from: Math.min(anchor, head),
    to: Math.max(anchor, head),
  };
}

function sourceLines(source) {
  const text = String(source ?? "");
  const lines = [];
  let from = 0;
  let index = 0;
  for (const match of text.matchAll(/\r?\n/g)) {
    lines.push({
      index,
      from,
      to: match.index,
      text: text.slice(from, match.index),
    });
    from = match.index + match[0].length;
    index += 1;
  }
  lines.push({
    index,
    from,
    to: text.length,
    text: text.slice(from),
  });
  return lines;
}

function blockedMarkdownTextLines(lines) {
  const blocked = new Set();
  const texts = lines.map((line) => line.text);
  let inFrontmatter = false;
  let inFence = false;

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].text.trim();
    if (index === 0 && trimmed === "---") {
      inFrontmatter = true;
      blocked.add(index);
      continue;
    }
    if (inFrontmatter) {
      blocked.add(index);
      if (trimmed === "---") {
        inFrontmatter = false;
      }
      continue;
    }
    if (/^(?:`{3,}|~{3,})/.test(trimmed)) {
      blocked.add(index);
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      blocked.add(index);
      continue;
    }
    const table = markdownTableBlockAtLines(texts, index);
    if (table) {
      for (let tableLine = index; tableLine <= table.endIndex; tableLine += 1) {
        blocked.add(tableLine);
      }
      index = table.endIndex;
      continue;
    }
    if (
      /^<img\b/i.test(trimmed) ||
      /^<\/?[A-Z][A-Za-z0-9]*(?:\s|>|\/)/.test(trimmed)
    ) {
      blocked.add(index);
    }
  }
  return blocked;
}

function readableLineContentRange(source) {
  const text = String(source ?? "");
  if (!text.trim() || /^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/.test(text)) {
    return null;
  }

  let from = 0;
  const blockquote = /^(\s*>+\s?)/.exec(text.slice(from));
  if (blockquote) {
    from += blockquote[1].length;
  }
  const list = /^(\s*(?:[-*+]|\d+\.)\s+)/.exec(text.slice(from));
  if (list) {
    from += list[1].length;
  }
  const heading = /^(#{1,6}\s+)/.exec(text.slice(from));
  if (heading) {
    from += heading[1].length;
  }
  return from < text.length ? { from, to: text.length } : null;
}

function expandMarkdownTextSegment(text, initialFrom, initialTo, bounds) {
  let from = initialFrom;
  let to = initialTo;
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const envelope of MARKDOWN_FORMAT_ENVELOPES) {
      const nextFrom = from - envelope.open.length;
      const nextTo = to + envelope.close.length;
      if (
        nextFrom >= bounds.from &&
        nextTo <= bounds.to &&
        text.slice(nextFrom, from) === envelope.open &&
        text.slice(to, nextTo) === envelope.close
      ) {
        from = nextFrom;
        to = nextTo;
        expanded = true;
        break;
      }
    }
    if (expanded) {
      continue;
    }

    const prefix = text.slice(bounds.from, from);
    const open = CONTROLLED_STYLE_OPEN.exec(prefix);
    if (!open || !text.startsWith("</span>", to)) {
      continue;
    }
    const nextFrom = bounds.from + open.index;
    const nextTo = to + "</span>".length;
    const span = controlledTableStyleSpanAt(text.slice(nextFrom, nextTo));
    if (span?.length === nextTo - nextFrom) {
      from = nextFrom;
      to = nextTo;
      expanded = true;
    }
  }
  return { from, to };
}

function applySourceChanges(source, changes) {
  let nextSource = source;
  for (const change of [...changes].reverse()) {
    nextSource = [
      nextSource.slice(0, change.from),
      change.insert,
      nextSource.slice(change.to),
    ].join("");
  }
  return nextSource;
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
