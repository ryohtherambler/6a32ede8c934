import ExcelJS from "exceljs";

const path = process.argv[2];
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(path);

for (const sheet of wb.worksheets) {
  console.log(`\n===== シート: ${sheet.name} (行数:${sheet.rowCount} 列数:${sheet.columnCount}) =====`);
  const maxRows = Math.min(sheet.rowCount, 15);
  for (let r = 1; r <= maxRows; r++) {
    const row = sheet.getRow(r);
    const values = row.values.slice(1).map((v) => {
      if (v && typeof v === "object" && "richText" in v) {
        return v.richText.map((t) => t.text).join("");
      }
      if (v && typeof v === "object" && "result" in v) {
        return v.result;
      }
      return v;
    });
    console.log(r, JSON.stringify(values));
  }
}
