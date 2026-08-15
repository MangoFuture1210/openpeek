import assert from "node:assert/strict";
import test from "node:test";

import {
  renderTableColgroup,
  tableLayoutAttributes,
  tableScrollAttributeString,
} from "../src/content/table-layout.mjs";

test("tableLayoutAttributes gives narrow tables a comfortable width", () => {
  const layout = tableLayoutAttributes({
    columnNames: ["Name", "Status"],
    cellsByColumn: [
      ["Name", "Alpha", "Beta"],
      ["Status", "Ready", "Done"],
    ],
  });

  assert.equal(layout.mode, "fit");
  assert.equal(layout.preferredWidth >= 320, true);
  assert.equal(layout.preferredWidth <= 420, true);
  assert.match(tableScrollAttributeString(layout), /data-table-layout="fit"/);
  assert.doesNotMatch(tableScrollAttributeString(layout), /--table-anchor-width/);
});

test("tableLayoutAttributes avoids cramped sparse three-column tables", () => {
  const layout = tableLayoutAttributes({
    columnNames: ["项目", "金额", "占比"],
    cellsByColumn: [
      ["项目", "VIP", "在线陪练毛利", "魔钢 VIP", "视频充值"],
      ["金额", "102.5 万", "13.4 万", "7.6 万", "2.8 万"],
      ["占比", "81%", "10.6%", "6%", "2.2%"],
    ],
  });

  assert.equal(layout.mode, "fit");
  assert.equal(layout.preferredWidth >= 480, true);
  assert.equal(layout.preferredWidth <= 560, true);
  assert.equal(layout.columns.reduce((sum, column) => sum + column.width, 0), layout.preferredWidth);
});

test("tableLayoutAttributes sizes mixed metric tables from content rather than column count", () => {
  const layout = tableLayoutAttributes({
    columnNames: ["指标", "数值", "口径", "状态"],
    cellsByColumn: [
      ["指标", "总收入", "总支出", "本月盈亏", "现金余额", "月初可提现"],
      ["数值", "126.6 万", "126.1 万", "-0.5 万", "346.2 万", "35.5 万"],
      ["口径", "收入总计源表 + 芒果同学接入口径", "支出统计合并表", "总收入 - 总支出", "当前现金余额快照", "当前现金余额表"],
      ["状态", "verified", "verified", "calculated", "verified", "verified"],
    ],
  });

  assert.equal(layout.mode, "wrap");
  assert.equal(layout.preferredWidth >= 660, true);
  assert.equal(layout.preferredWidth <= 780, true);
  assert.equal(layout.columns[2].width >= 280, true);
  assert.equal(layout.columns[3].width <= 120, true);
  assert.equal(layout.columns[2].width > layout.columns[0].width * 1.8, true);
  assert.equal(layout.columns[1].width < layout.columns[2].width, true);
  assert.equal(layout.columns[3].width < layout.columns[2].width, true);
});

test("tableLayoutAttributes gives formula columns room before numeric columns", () => {
  const layout = tableLayoutAttributes({
    columnNames: ["产品", "收入", "广告费", "投产比", "口径"],
    cellsByColumn: [
      ["产品", "一起练琴APP", "魔法钢琴APP", "芒果同学APP"],
      ["收入", "105.3 万", "7.6 万", "0.3 万"],
      ["广告费", "6.1 万", "7.3 万", "0.7 万"],
      ["投产比", "17.2 倍", "1.0 倍", "0.4 倍"],
      ["口径", "收入 = 一起练琴 VIP + 视频充值", "收入 = 魔法钢琴 VIP", "收入 = 芒果同学 VIP + 课程净毛利"],
    ],
  });

  assert.equal(layout.mode, "wrap");
  assert.equal(layout.preferredWidth >= 700, true);
  assert.equal(layout.preferredWidth <= 820, true);
  assert.equal(layout.columns[4].width >= 300, true);
  assert.equal(layout.columns[4].width > layout.columns[1].width * 2, true);
  assert.equal(layout.columns[1].width <= 120, true);
  assert.equal(layout.columns[2].width <= 120, true);
  assert.equal(layout.columns[3].width <= 120, true);
});

test("tableLayoutAttributes keeps medium statistic tables readable without full-width anchoring", () => {
  const layout = tableLayoutAttributes({
    columnNames: ["项目", "金额", "环比", "变化", "占比"],
    cellsByColumn: [
      ["项目", "薪资（正式职工）", "市场", "办公费", "运维", "税费"],
      ["金额", "63.4 万", "15.4 万", "14.3 万", "9.8 万", "5.4 万"],
      ["环比", "-1.8%", "-5.3%", "4.9%", "1.3%", "-20.1%"],
      ["变化", "-1.2 万", "-0.9 万", "+0.7 万", "+0.1 万", "-1.4 万"],
      ["占比", "50.3%", "12.2%", "11.3%", "7.8%", "4.3%"],
    ],
  });

  assert.equal(layout.mode, "wrap");
  assert.equal(layout.preferredWidth >= 640, true);
  assert.equal(layout.preferredWidth <= 760, true);
});

test("tableLayoutAttributes gives long text columns more width before scrolling", () => {
  const layout = tableLayoutAttributes({
    columnNames: ["Item", "Description", "Status"],
    cellsByColumn: [
      ["Item", "A", "B"],
      [
        "Description",
        "这是一段比较长的说明文字，需要在两到三行内保持可读，而不是立刻让整张表横向滚动。",
        "另一段说明文字也比较长，但仍然适合通过自动换行阅读。",
      ],
      ["Status", "Ready", "Done"],
    ],
  });

  assert.notEqual(layout.mode, "scroll");
  assert.equal(layout.columns[1].width > layout.columns[0].width * 1.5, true);
  assert.equal(layout.columns[1].width >= 280, true);
  assert.match(renderTableColgroup(layout), /<colgroup><col style="width: [\d.]+%"><col style="width: [\d.]+%"><col style="width: [\d.]+%"><\/colgroup>/);
});

test("wrapping tables keep proportional columns within their responsive container", () => {
  const layout = tableLayoutAttributes({
    columnNames: ["参与者", "主要界面", "与仓库的关系"],
    cellsByColumn: [
      [
        "参与者",
        "阅读或做范围明确修改的团队成员",
        "开发者和仓库维护者",
      ],
      ["主要界面", "OpenGlance", "IDE、终端和 Git 工具"],
      [
        "与仓库的关系",
        "通过面向文档的桌面界面阅读、检查并做范围明确的修改，不需要直接操作 Git 或 Markdown。",
        "通过 IDE、终端和 Git 工具控制分支、diff、冲突、代码和自动化，并保留完整的技术维护能力。",
      ],
    ],
  });

  assert.equal(layout.mode, "wrap");
  const colgroup = renderTableColgroup(layout);
  const relativeWidths = Array.from(
    colgroup.matchAll(/width: ([\d.]+)%/g),
    (match) => Number(match[1]),
  );

  assert.equal(relativeWidths.length, 3);
  assert.equal(Math.abs(relativeWidths.reduce((sum, width) => sum + width, 0) - 100) < 0.01, true);
  assert.doesNotMatch(colgroup, /width: \d+px/);
});

test("tableLayoutAttributes scrolls wide tables with many columns", () => {
  const layout = tableLayoutAttributes({
    columnNames: Array.from({ length: 9 }, (_, index) => `Column ${index + 1}`),
    cellsByColumn: Array.from({ length: 9 }, (_, index) => [`Column ${index + 1}`, `Value ${index + 1}`]),
  });

  assert.equal(layout.mode, "scroll");
  assert.match(renderTableColgroup(layout), /<col style="width: \d+px">/);
});

test("explicit table column widths are authoritative and sum to the table width", () => {
  const layout = tableLayoutAttributes({
    columnNames: ["Item", "Details", "Status"],
    cellsByColumn: [["A"], ["Long details"], ["Ready"]],
    columnWidths: [120, 280, 96],
  });

  assert.equal(layout.mode, "manual");
  assert.equal(layout.preferredWidth, 496);
  assert.deepEqual(layout.columns.map(({ width }) => width), [120, 280, 96]);
  assert.equal(
    renderTableColgroup(layout),
    '<colgroup><col style="width: 120px"><col style="width: 280px"><col style="width: 96px"></colgroup>',
  );
});
