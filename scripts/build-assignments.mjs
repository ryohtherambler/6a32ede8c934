// Excel（審判要項・配置管理表シート）から
// 「種目ごとの担当スタッフ・担当町」データ(assignments.json)を生成するスクリプト
// 使い方: node scripts/build-assignments.mjs

import ExcelJS from "exceljs";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EXCEL_PATH = path.join(ROOT, "docs", "260926", "審判要項作成中_260926_8.xlsm");
const OUT_PATH = path.join(ROOT, "site", "data", "assignments.json");

// 町名の略称→フル表記（漢字2文字ルール）
const TOWN_FULL_NAME = { 新: "新和", 元: "元町", 春: "春町", 寿: "寿町" };

// 配置管理表シートの列位置（各役職・スタッフの○印がある列）
// 氏名行(6行目)から実名を毎回読み取るため、担当者が変わってもこのスクリプトの修正は不要
// label: お手伝いスタッフ（ABC表記）の配置図と同じ短縮ラベル。執行部・体育部長はnull
// leaderTown: 体育部長の場合、担当町のフル表記
const STAFF_COLUMNS = [
  { col: 10, label: null, leaderTown: null },
  { col: 12, label: null, leaderTown: null },
  { col: 14, label: null, leaderTown: null },
  { col: 16, label: null, leaderTown: "新和" },
  { col: 18, label: null, leaderTown: "元町" },
  { col: 20, label: null, leaderTown: "春町" },
  { col: 22, label: null, leaderTown: "寿町" },
  { col: 24, label: "新A", town: "新和" },
  { col: 26, label: "新B", town: "新和" },
  { col: 28, label: "新C", town: "新和" },
  { col: 30, label: "元A", town: "元町" },
  { col: 32, label: "元B", town: "元町" },
  { col: 34, label: "元C", town: "元町" },
  { col: 36, label: "春A", town: "春町" },
  { col: 38, label: "春B", town: "春町" },
  { col: 40, label: "春C", town: "春町" },
  { col: 42, label: "寿A", town: "寿町" },
  { col: 44, label: "寿B", town: "寿町" },
  { col: 46, label: "寿C", town: "寿町" },
];

// Excel本体（管理票シート）の氏名がまだ古いままで、正誤表（PDF等）だけが
// 別途届いている場合の暫定的な氏名補正。Excel本体が修正されたら該当行を削除すること
// 260926: 春A担当は「高口」ではなく「高石」が正しい（docs/260926/管理用名前修正.pdf）
const NAME_CORRECTIONS = {
  高口: "高石",
};

// 氏名行のセル値を取り出す（結合セルはマスターセルの値がそのまま返る）
function nameAt(sheet, col) {
  const v = sheet.getRow(6).getCell(col).value;
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === "" || s === "-" || s === "－") return null; // 空席（未配置）
  return NAME_CORRECTIONS[s] ?? s;
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);
  const sheet = wb.getWorksheet("管理票");
  if (!sheet) throw new Error("シートが見つかりません: 管理票");

  // 種目の行は7行目〜19行目（13種目、events.jsonと同じ順番）
  const assignments = [];
  for (let i = 0; i < 13; i++) {
    const row = 7 + i;
    const eventId = i + 1;
    const staff = [];
    const towns = new Set();
    for (const col of STAFF_COLUMNS) {
      const v = sheet.getRow(row).getCell(col.col).value;
      // ○:フィールド ◎:タイム計測 ●:ゴールテープ　いずれも担当スタッフとして扱う
      if (v !== "○" && v !== "◎" && v !== "●") continue;
      const name = nameAt(sheet, col.col);
      if (!name) continue; // 空席の欄は担当スタッフに含めない
      staff.push({ name, label: col.label ?? null });
      if (col.town) towns.add(col.town);
      if (col.leaderTown) towns.add(col.leaderTown);
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
