// Excel（審判要項・配置管理表シート）から
// 「種目ごとの担当スタッフ・担当町」データ(assignments.json)を生成するスクリプト
// 使い方: node scripts/build-assignments.mjs

import ExcelJS from "exceljs";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EXCEL_PATH = path.join(ROOT, "docs", "審判要項作成中_260912_スマホアプリ資料用.xlsm");
const OUT_PATH = path.join(ROOT, "site", "data", "assignments.json");

// 配置管理表シートの列位置（各スタッフの○印がある列。ラベルは結合セルの左側の列）
// 町名の略称→フル表記（漢字2文字ルール）
const TOWN_FULL_NAME = { 新: "新和", 元: "元町", 春: "春町", 寿: "寿町" };

// 4町の体育部長がどの町の代表か（担当町フィルタで、部長の出番もその町の出番として数える）
const TOWN_LEADER_TOWN = { 長尾: "新和", 田郷: "元町", 小嶋: "春町", 田中: "寿町" };

const STAFF_COLUMNS = [
  { col: 10, key: "黒田" },
  { col: 12, key: "羽根" },
  { col: 14, key: "吉田" },
  { col: 16, key: "長尾" },
  { col: 18, key: "田郷" },
  { col: 20, key: "小嶋" },
  { col: 22, key: "田中" },
  { col: 24, key: "新A" },
  { col: 26, key: "新B" },
  { col: 28, key: "新C" },
  { col: 30, key: "元A" },
  { col: 32, key: "元B" },
  { col: 34, key: "元C" },
  { col: 36, key: "春A" },
  { col: 38, key: "春B" },
  { col: 40, key: "春C" },
  { col: 42, key: "寿A" },
  { col: 44, key: "寿B" },
  { col: 46, key: "寿C" },
];

function expandStaffName(abbrev) {
  const m = abbrev.match(/^([新元春寿])([ABC])$/);
  if (!m) return abbrev; // 黒田・羽根・吉田・長尾・田郷・小嶋・田中 はそのまま
  return `${TOWN_FULL_NAME[m[1]]}${m[2]}`;
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);
  const sheet = wb.getWorksheet("管理票");
  if (!sheet) throw new Error("シートが見つかりません: 管理票");

  // 種目の行は6行目〜18行目（13種目、events.jsonと同じ順番）
  const assignments = [];
  for (let i = 0; i < 13; i++) {
    const row = 6 + i;
    const eventId = i + 1;
    const staff = [];
    for (const { col, key } of STAFF_COLUMNS) {
      const v = sheet.getRow(row).getCell(col).value;
      if (v === "○") staff.push(expandStaffName(key));
    }
    const towns = new Set();
    for (const abbrev of Object.keys(TOWN_FULL_NAME)) {
      const full = TOWN_FULL_NAME[abbrev];
      if (staff.some((s) => s.startsWith(full))) towns.add(full);
    }
    for (const [leader, town] of Object.entries(TOWN_LEADER_TOWN)) {
      if (staff.includes(leader)) towns.add(town);
    }
    assignments.push({ eventId, staff, towns: [...towns] });
  }

  await mkdir(path.dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(assignments, null, 2) + "\n", "utf-8");
  console.log(`書き出しました: ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
