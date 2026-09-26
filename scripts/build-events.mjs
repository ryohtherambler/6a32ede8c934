// Excel（審判要項）から種目データ(events.json)を生成するスクリプト
// 使い方: node scripts/build-events.mjs
//
// 元データ（Excel）の担当者名・時刻等を直したら、このスクリプトを再実行すれば
// site/data/events.json に反映される。

import ExcelJS from "exceljs";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EXCEL_PATH = path.join(ROOT, "docs", "260926", "審判要項作成中_260926_8.xlsm");
const OUT_PATH = path.join(ROOT, "site", "data", "events.json");

// シート名の順番 = 種目番号の順番。配置図PNG（01.png〜13.png）もこの順番に対応させる。
const SHEET_NAMES = [
  "①綱引き大人 ",
  "②わんぱく坊s",
  "③ナイスショット",
  "④障害物競走",
  "⑤旗取り",
  "⑥綱引き小学生",
  "⑦第70回メモリアルリレー",
  "⑧各種団体パレード・リレー",
  "⑨大なわとび",
  "⑩おたまでハッスル",
  "⑪小学生対抗リレー",
  "⑫各町オールスターリレー",
  "⑬大玉リレー",
];

function cellText(cell) {
  const v = cell.value;
  if (v === null || v === undefined) return null;
  if (typeof v === "object" && "richText" in v) {
    return v.richText.map((t) => t.text).join("");
  }
  if (typeof v === "object" && "result" in v) {
    return v.result;
  }
  if (v instanceof Date) {
    // Excelのシリアル日付はUTC0時起点で読み込まれるため、時:分をそのまま取り出す
    const hh = String(v.getUTCHours()).padStart(2, "0");
    const mm = String(v.getUTCMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }
  if (typeof v === "string") return v.trim();
  return v;
}

function get(sheet, row, col) {
  return cellText(sheet.getRow(row).getCell(col));
}

function toCountNumber(v) {
  if (typeof v === "number") return v;
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === "-" || s === "－" || s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// ①〜⑤の見出し行を探し、次の見出しまでの「・」箇条書きを集める
function extractSection(sheet, markerCol1, headerText) {
  let startRow = null;
  for (let r = 1; r <= sheet.rowCount; r++) {
    const c1 = get(sheet, r, 1);
    const c2 = get(sheet, r, 2);
    if (c1 === markerCol1 && c2 === headerText) {
      startRow = r;
      break;
    }
  }
  if (startRow === null) return { headerRow: null, items: [] };

  const items = [];
  for (let r = startRow + 1; r <= sheet.rowCount; r++) {
    const c1 = get(sheet, r, 1);
    // 次のセクション見出し（①〜⑤の丸数字）に到達したら終了
    if (c1 && /^[①②③④⑤]$/.test(c1)) break;
    if (c1 === "・") {
      const text = get(sheet, r, 2);
      if (text) items.push(text);
    }
  }
  return { headerRow: startRow, items };
}

// ⑤コース・チーム構成の表を抽出する
// 行58: 列9,13,17,21,25,29にブロック見出し（赤組/白組, Aブロック等）
// 行59以降: 列1に行ラベル（前半戦/後半戦, 1/2/3, A/B等）、各ブロック列に町名
function extractCourseGroups(sheet, sectionHeaderRow) {
  if (sectionHeaderRow === null) return null;
  const blockStartRow = sectionHeaderRow + 1; // 「グループ名」の行
  const groupNameLabel = get(sheet, blockStartRow, 1);
  if (groupNameLabel !== "グループ名") return null;

  const blockCols = [9, 13, 17, 21, 25, 29];
  const blocks = blockCols
    .map((c) => ({ col: c, label: get(sheet, blockStartRow, c) }))
    .filter((b) => b.label);

  if (blocks.length === 0) return null;

  const rows = [];
  for (let r = blockStartRow + 1; r <= sheet.rowCount; r++) {
    const rowLabelRaw = get(sheet, r, 1);
    if (rowLabelRaw === null || rowLabelRaw === undefined) break;
    const rowLabel = String(rowLabelRaw);
    if (rowLabel.startsWith("※")) break;
    const values = blocks.map((b) => get(sheet, r, b.col)).filter((v) => v !== null);
    if (values.length === 0) break;
    rows.push({ label: rowLabel, values: blocks.map((b) => get(sheet, r, b.col)) });
  }

  return {
    blockLabels: blocks.map((b) => b.label),
    rows,
  };
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);

  const events = SHEET_NAMES.map((sheetName, idx) => {
    const sheet = wb.getWorksheet(sheetName);
    if (!sheet) {
      throw new Error(`シートが見つかりません: ${sheetName}`);
    }
    const id = idx + 1;
    const name = get(sheet, 1, 20) ?? sheetName.trim().replace(/^[①-⑬]/, "");

    const method = extractSection(sheet, "②", "競技方法");
    const referee = extractSection(sheet, "③", "審判");
    const scoring = extractSection(sheet, "④", "得点");
    const course = extractSection(sheet, "⑤", "コース・チーム構成");

    return {
      id,
      name,
      timeStart: get(sheet, 1, 28),
      timeEnd: get(sheet, 1, 31),
      target: get(sheet, 4, 5),
      totalCount: toCountNumber(get(sheet, 5, 5)),
      meetingPlace: get(sheet, 5, 13),
      entryMethod: get(sheet, 5, 21),
      bibs: get(sheet, 5, 29),
      scorecard: get(sheet, 6, 5),
      flag: get(sheet, 6, 13),
      otherNote: get(sheet, 6, 21),
      method: method.items,
      referee: referee.items,
      scoring: scoring.items,
      courseGroups: extractCourseGroups(sheet, course.headerRow),
      layoutImage: `images/layout/${String(id).padStart(2, "0")}.png`,
    };
  });

  await mkdir(path.dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(events, null, 2) + "\n", "utf-8");
  console.log(`書き出しました: ${OUT_PATH}`);
  console.log(`種目数: ${events.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
