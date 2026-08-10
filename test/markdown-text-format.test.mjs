import assert from "node:assert/strict";
import test from "node:test";

import {
  controlledMarkdownStyleSpansForLine,
  formatMarkdownTextSelection,
  markdownTextSelectionFormatState,
} from "../src/content/markdown-text-format.mjs";
import { renderMarkdown } from "../src/content/markdown.mjs";

test("a dragged Live text range receives Markdown formatting as one selection", () => {
  const source = "前缀 批量修改 后缀";
  const from = source.indexOf("批量修改");
  const result = formatMarkdownTextSelection(
    source,
    { anchor: from, head: from + "批量修改".length },
    { bold: true },
  );

  assert.equal(result?.source, "前缀 **批量修改** 后缀");
  assert.deepEqual(result?.selection, {
    anchor: from,
    head: from + "**批量修改**".length,
  });
  assert.equal(
    markdownTextSelectionFormatState(result.source, result.selection)?.bold,
    true,
  );
});

test("formatting an already styled selection updates its envelope without nesting duplicates", () => {
  const source = "这里有 **红字**。";
  const from = source.indexOf("红字");
  const colored = formatMarkdownTextSelection(
    source,
    { anchor: from, head: from + 2 },
    { color: "#dc2626" },
  );

  assert.equal(
    colored?.source,
    '这里有 <span style="color: #dc2626;">**红字**</span>。',
  );
  const italic = formatMarkdownTextSelection(
    colored.source,
    colored.selection,
    { italic: true },
  );
  assert.equal(
    italic?.source,
    '这里有 <span style="color: #dc2626;">**_红字_**</span>。',
  );
  assert.match(
    renderMarkdown(`${italic.source}后续文字`),
    /<span class="git-leaf-text-color" style="color:#dc2626"><strong><em>红字<\/em><\/strong><\/span>。后续文字/,
  );
  assert.doesNotMatch(renderMarkdown(italic.source), /\*\*/);
});

test("a multi-line Live selection formats readable text without changing block markers", () => {
  const source = "# 第一段\n\n第二段文字\n- 第三段";
  const from = source.indexOf("第一段");
  const result = formatMarkdownTextSelection(
    source,
    { anchor: from, head: source.length },
    { color: "#d97706" },
  );

  assert.equal(
    result?.source,
    [
      '# <span style="color: #d97706;">第一段</span>',
      "",
      '<span style="color: #d97706;">第二段文字</span>',
      '- <span style="color: #d97706;">第三段</span>',
    ].join("\n"),
  );
  assert.equal(result?.changes.length, 3);
});

test("ordinary text formatting skips native Markdown tables and fenced code", () => {
  const source = [
    "正文一",
    "",
    "| 项目 | 数值 |",
    "| --- | ---: |",
    "| Alpha | 1 |",
    "",
    "```text",
    "不要格式化",
    "```",
    "",
    "正文二",
  ].join("\n");
  const state = markdownTextSelectionFormatState(source, {
    anchor: 0,
    head: source.length,
  });

  assert.deepEqual(
    state?.segments.map((segment) => segment.source),
    ["正文一", "正文二"],
  );
});

test("controlled Live style spans expose only approved colors and content bounds", () => {
  const source =
    '前 <span style="color: #dc2626; background-color: #d9770633; text-decoration: underline;">重点</span> 后';
  assert.deepEqual(
    controlledMarkdownStyleSpansForLine(source),
    [
      {
        from: source.indexOf("<span"),
        to: source.indexOf("</span>") + "</span>".length,
        contentFrom: source.indexOf("重点"),
        contentTo: source.indexOf("重点") + "重点".length,
        color: "#dc2626",
        backgroundColor: "#d9770633",
        underline: true,
      },
    ],
  );
});
