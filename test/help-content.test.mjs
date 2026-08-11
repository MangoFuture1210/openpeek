import assert from "node:assert/strict";
import test from "node:test";

import {
  GIT_LEAF_HELP_SECTIONS,
  FILE_TYPE_HELP_ROWS,
  getFileTypeHelpRows,
  getGitLeafHelpSections,
  gitLeafHelpPlainText,
} from "../public/help-content.js";

test("Git Leaf help explains stable filtering and all repository files", () => {
  const text = gitLeafHelpPlainText();

  assert.match(text, /docs\/frontmatter-rules\.json/);
  assert.match(text, /筛选按钮/);
  assert.match(text, /ai_snippet/);
  assert.match(text, /仓库中全部已跟踪文件/);
  assert.match(text, /\.md \.mdx\s+默认显示\s+Markdown \/ MDX 预览，可编辑/);
  assert.match(text, /\.json\s+按需显示\s+格式化 JSON 树/);
  assert.match(text, /\.ndjson \.jsonl\s+按需显示\s+每行一棵可折叠 JSON 树/);
  assert.match(text, /\.html \.htm\s+默认显示\s+浏览器 HTML 效果预览/);
  assert.match(text, /当前打开的文件、搜索结果/);
  assert.match(text, /切换文档不会因为引用关系改变目录内容/);
  assert.match(text, /文本代码 \/ 配置/);
  assert.match(text, /其他文件（例如 \.pptx）/);
  assert.match(text, /工作树与分支/);
  assert.match(text, /多个 worktree/);
  assert.match(text, /正常分支都可以使用 Preview、Source 和 Live/);
  assert.match(text, /无分支/);
  assert.match(text, /自动创建保护分支/);
  assert.match(text, /默认每隔 10 分钟/);
  assert.match(text, /逐字节相同/);
  assert.match(text, /后台自动更新会暂停/);
  assert.match(text, /合并远端修改/);
  assert.match(text, /全部本地编辑保持未提交/);
  assert.match(text, /同步并发布/);
  assert.match(text, /只有万不得已才使用.*AI Agent 提示词/);
  assert.match(text, /分享文档/);
  assert.match(text, /复制分享链接/);
  assert.match(text, /主工作区 main/);
  assert.match(text, /飞书等聊天工具/);
  assert.match(text, /卡片只使用已发布版本的文档标题/);
  assert.match(text, /尚未打开对应仓库时/);
  assert.match(text, /核对 GitHub origin/);
  assert.match(text, /基础使用统计/);
  assert.match(text, /不会发送仓库名、仓库路径/);
  assert.match(text, /设备名称只出现在低频安装观察日志/);
  assert.equal(GIT_LEAF_HELP_SECTIONS.length, 6);
  assert.deepEqual(
    GIT_LEAF_HELP_SECTIONS.map((section) => section.id),
    ["repository-files", "filters", "worktrees", "sync", "sharing", "telemetry"],
  );
  assert.deepEqual(
    FILE_TYPE_HELP_ROWS.map((row) => row.files),
    [
      ".md .mdx",
      ".avif .bmp .png .jpg .jpeg .gif .webp .svg",
      ".pdf",
      ".html .htm",
      ".csv",
      ".json",
      ".ndjson .jsonl",
      ".yaml .yml .txt",
      ".js .ts .py .css .toml 等文本代码 / 配置",
      "其他文件（例如 .pptx）",
    ],
  );
  assert.deepEqual(
    FILE_TYPE_HELP_ROWS.map((row) => row.visibility),
    [
      "默认显示",
      "默认显示",
      "默认显示",
      "默认显示",
      "按需显示",
      "按需显示",
      "按需显示",
      "按需显示",
      "按需显示",
      "按需显示",
    ],
  );
});

test("Git Leaf help is available in English and Simplified Chinese", () => {
  const english = gitLeafHelpPlainText("en");
  const chinese = gitLeafHelpPlainText("zh-CN");

  assert.match(english, /Repository files/);
  assert.match(english, /Share documents/);
  assert.match(english, /Basic usage analytics/);
  assert.match(chinese, /仓库文件/);
  assert.equal(getGitLeafHelpSections("en").length, getGitLeafHelpSections("zh-CN").length);
  assert.equal(getFileTypeHelpRows("en")[0].visibility, "Shown by default");
});
