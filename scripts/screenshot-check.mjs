import { chromium } from "playwright";

const OUT_DIR = "C:/Users/ryoht/AppData/Local/Temp/site-screens";
await import("node:fs/promises").then((fs) => fs.mkdir(OUT_DIR, { recursive: true }));

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});

await page.goto("http://localhost:8787/index.html");
await page.waitForSelector(".event-card");
await page.screenshot({ path: `${OUT_DIR}/1-timeline.png` });

await page.click(".event-card >> nth=0");
await page.waitForSelector(".detail-title");
await page.screenshot({ path: `${OUT_DIR}/2-detail.png`, fullPage: true });

await page.click("#layout-image-button");
await page.waitForSelector("#image-overlay:not(.is-hidden)");
await page.screenshot({ path: `${OUT_DIR}/3-image-overlay.png` });

await page.click("#image-overlay");
await page.click("#back-button");
await page.waitForSelector(".event-card");

// 担当町フィルタの動作確認
await page.click('.filter-chip[data-town="寿町"]');
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT_DIR}/4-filter-kotobuki.png` });

console.log("console/page errors:", JSON.stringify(errors));
await browser.close();
