import { chromium } from "playwright";
import fs from "node:fs/promises";

const OUT_DIR = "C:/Users/ryoht/AppData/Local/Temp/site-screens";
await fs.mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch();

// --- テスト1: 現在時刻の自動ハイライト（10:15 = ③ナイスショットの時間帯を装う） ---
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => {
    const fakeNow = new Date();
    fakeNow.setHours(10, 15, 0, 0);
    const RealDate = Date;
    // eslint-disable-next-line no-global-assign
    Date = class extends RealDate {
      constructor(...args) {
        if (args.length === 0) return new RealDate(fakeNow);
        return new RealDate(...args);
      }
      static now() {
        return fakeNow.getTime();
      }
    };
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:8787/index.html");
  await page.waitForSelector(".event-card");
  await page.screenshot({ path: `${OUT_DIR}/5-now-highlight.png` });
  const nowCount = await page.locator(".event-card.is-now").count();
  const doneCount = await page.locator(".event-card.is-done").count();
  console.log(`[現在時刻テスト] is-now件数=${nowCount} is-done件数=${doneCount}`);
  await context.close();
}

// --- テスト2: オフライン動作（Service Workerがキャッシュしたあと、通信を切って再読込） ---
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:8787/index.html");
  await page.waitForSelector(".event-card");
  // Service Workerの登録・キャッシュ完了を待つ
  await page.waitForFunction(() => navigator.serviceWorker.ready.then(() => true));
  await page.waitForTimeout(1500); // install内のcache.addAll完了待ち

  await context.setOffline(true);
  await page.reload();
  const offlineOk = await page
    .waitForSelector(".event-card", { timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  await page.screenshot({ path: `${OUT_DIR}/6-offline.png` });
  console.log(`[オフラインテスト] 一覧が表示された=${offlineOk}`);

  // 詳細画面・画像もオフラインで開けるか
  if (offlineOk) {
    await page.click(".event-card >> nth=0");
    const detailOk = await page
      .waitForSelector(".detail-title", { timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    const imgVisible = await page.locator(".layout-image-button img").isVisible().catch(() => false);
    console.log(`[オフラインテスト] 詳細画面=${detailOk} 配置図画像表示=${imgVisible}`);
    await page.screenshot({ path: `${OUT_DIR}/7-offline-detail.png` });
  }

  await context.setOffline(false);
  await context.close();
}

await browser.close();
