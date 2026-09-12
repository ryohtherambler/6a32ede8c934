// 審判要項サイトのQRコードをこのPC内だけで生成する（外部サービスは使わない）
// 使い方: node scripts/generate-qrcode.mjs

import QRCode from "qrcode";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "qrcode");
const OUT_PATH = path.join(OUT_DIR, "shinpan-youkou-qrcode.png");

const URL = "https://ryohtherambler.github.io/6a32ede8c934/";

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  // 印刷後の汚れ・折れに強いよう誤り訂正レベルは最高(H)にする
  await QRCode.toFile(OUT_PATH, URL, {
    errorCorrectionLevel: "H",
    margin: 4,
    scale: 10,
  });
  console.log(`書き出しました: ${OUT_PATH}`);

  // 生成したQRコードを実際に読み取り、元のURLと一致するか検証する
  const buffer = await readFile(OUT_PATH);
  const png = PNG.sync.read(buffer);
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);

  if (!decoded) {
    throw new Error("QRコードの読み取り検証に失敗しました（デコードできませんでした）");
  }
  if (decoded.data !== URL) {
    throw new Error(`検証エラー: 読み取り結果がURLと一致しません\n期待値: ${URL}\n読み取り結果: ${decoded.data}`);
  }
  console.log("検証OK: 読み取り結果がURLと一致しました ->", decoded.data);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
