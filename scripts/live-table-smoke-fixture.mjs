import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export const LIVE_TABLE_SMOKE_FILE = "live-table-editing.md";
export const LIVE_TABLE_SMOKE_HEADERS = [
  "渠道",
  "收入与变化",
  "颜色语义",
  "状态",
];

export const LIVE_TABLE_SMOKE_ACCEPTANCE = [
  "Live 模式始终显示渲染后的原生 Markdown 表格；",
  "单击一个单元格时，只在该单元格内显示并编辑源码；",
  "从正在编辑的单元格拖入相邻单元格，仍可形成多单元格选区；",
  "横向、纵向或斜向拖动都选择起点与终点围成的完整矩形；",
  "格式工具栏固定在表格顶部，可为整个选区设置粗体、斜体、删除线、前景色和文字高亮；",
  "对齐作用于选区涉及的整列，清除文字格式不改变列对齐；",
  "前景色与高亮色板按需展开，工具栏可通过关闭按钮或 Esc 关闭；",
  "同一列纵向选中至少两个单元格后，顶部把手可左右拖动整列；",
  "每条列分割线只调整左侧一列，最右侧分割线只调整最后一列；",
  "表格总宽度等于各列宽度之和，切换文件或重新打开后仍保留；",
  "Preview 保持只读，写回内容仍是 Obsidian 可编辑的原生管道表格、Markdown 标记和受控样式 span。",
].join("");

export function liveTableSmokeSource() {
  return [
    "# Live Markdown table interaction smoke",
    "",
    "## 数据分析表：选择、格式、对齐与列移动",
    "",
    "| 渠道 | 收入与变化 | 颜色语义 | 状态 |",
    "| :--- | ---: | :--- | :---: |",
    '| 自然流量 | **128.4（↑ 12.4%）** | 绿色＝正向 | <span style="color: #16a34a; background-color: #16a34a33;">健康</span> |',
    '| 付费投放 | ~~96.7（↓ 8.7%）~~ | 红色＝风险 | <span style="color: #dc2626; background-color: #dc262633;">风险</span> |',
    "| 转介绍 | _74.2（↑ 2.1%）_ | 橙色＝提醒 | 观察 |",
    "| 企业合作 | 52.8（→ 0.0%） | 蓝色＝信息 | 稳定 |",
    "",
    "## 基础格式与解析边界",
    "",
    "| 语义 | 预期视觉 | 基础 Markdown 写法 |",
    "| --- | :---: | ---: |",
    "| 正向 | **加粗**，但不是绿色 | `**加粗**` |",
    "| 字面管道 | Alpha \\| Beta | `Alpha \\| Beta` |",
    "| 行内代码 | `a\\|b` | `` `a\\|b` `` |",
    "",
    "## 验收",
    "",
    LIVE_TABLE_SMOKE_ACCEPTANCE,
    "",
  ].join("\n");
}

export function createLiveTableSmokeFixture({
  temporaryRoot = tmpdir(),
  runGit = runGitCommand,
} = {}) {
  const repoRoot = mkdtempSync(
    path.join(path.resolve(temporaryRoot), "git-leaf-live-table-smoke-"),
  );
  try {
    writeFileSync(
      path.join(repoRoot, LIVE_TABLE_SMOKE_FILE),
      liveTableSmokeSource(),
      "utf8",
    );
    runGit(["init", "--quiet", "--initial-branch=main"], repoRoot);
    runGit(["add", LIVE_TABLE_SMOKE_FILE], repoRoot);
    runGit([
      "-c",
      "user.name=OpenGlance Smoke",
      "-c",
      "user.email=smoke@gitleaf.local",
      "commit",
      "--quiet",
      "-m",
      "Add Live table smoke document",
    ], repoRoot);
    return {
      repoRoot,
      file: LIVE_TABLE_SMOKE_FILE,
      acceptance: LIVE_TABLE_SMOKE_ACCEPTANCE,
    };
  } catch (error) {
    rmSync(repoRoot, { recursive: true, force: true });
    throw error;
  }
}

export function readLiveTableSmokeDocument(fixture) {
  return readFileSync(
    path.join(path.resolve(fixture.repoRoot), fixture.file),
    "utf8",
  );
}

export function containsNativeLiveTableSmokeTable(source) {
  return String(source ?? "")
    .split(/\r?\n/)
    .some((line) => {
      const trimmed = line.trim();
      return (
        trimmed.startsWith("|") &&
        trimmed.endsWith("|") &&
        LIVE_TABLE_SMOKE_HEADERS.every((header) => (
          trimmed.includes(` ${header} `)
        ))
      );
    });
}

export function cleanupLiveTableSmokeFixture(fixture) {
  const repoRoot = path.resolve(fixture?.repoRoot || "");
  const temporaryRoot = path.resolve(tmpdir());
  const relative = path.relative(temporaryRoot, repoRoot);
  if (
    relative.startsWith("..") ||
    path.isAbsolute(relative) ||
    !path.basename(repoRoot).startsWith("git-leaf-live-table-smoke-")
  ) {
    throw new Error(`Refusing to clean an unexpected Live table fixture: ${repoRoot}`);
  }
  rmSync(repoRoot, { recursive: true, force: true });
}

function runGitCommand(args, cwd) {
  const result = spawnSync("git", args, {
    cwd,
    stdio: "pipe",
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || `git ${args.join(" ")} failed`);
  }
}
