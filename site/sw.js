// オフラインでも開けるようにするためのキャッシュ設定
// ファイルを追加・変更したら CACHE_NAME の数字を1つ増やすこと（更新が反映されるようになる）
const CACHE_NAME = "shinpan-yoko-cache-v4";

const PRECACHE_URLS = [
  "./",
  "index.html",
  "css/style.css",
  "js/app.js",
  "manifest.webmanifest",
  "data/events.json",
  "data/assignments.json",
  "data/roster.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  ...Array.from({ length: 13 }, (_, i) => `images/layout/${String(i + 1).padStart(2, "0")}.png`),
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
