/**
 * QuestNote Service Worker
 * 快取 App Shell 與靜態資源，支援離線使用
 */
const CACHE_NAME = 'questnote-v10';

/** 需要預快取的資源（相對於 SW 所在目錄） */
const PRECACHE_URLS = [
  'index.html',
  'manifest.webmanifest',
  'src/styles.css',
  'src/app.js',
  'src/db.js',
  'src/taskService.js',
  'src/rewardService.js',
  'src/gachaService.js',
  'src/collectionService.js',
  'src/backupService.js',
  'src/companionService.js',
  'src/loreService.js',
  'src/devService.js',
  'src/expeditionService.js',
  'src/ui.js',
  'data/pets.json',
  'data/pools.json',
  'data/pets-lore.json',
  'data/expeditions.json',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
];

/** 將相對路徑轉為完整 URL */
function resolveUrl(path) {
  return new URL(path, self.location.href).href;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // 逐個快取，避免單一失敗導致全部安裝失敗
      await Promise.all(
        PRECACHE_URLS.map(async (path) => {
          try {
            await cache.add(resolveUrl(path));
          } catch (err) {
            console.warn('[QuestNote SW] 預快取失敗:', path, err);
          }
        })
      );
    })()
  );
  // 不在 install 時 skipWaiting，等使用者確認後再更新
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // 頁面導航：離線時 fallback 到 index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(resolveUrl('index.html')))
    );
    return;
  }

  event.respondWith(
    (async () => {
      // 優先從快取讀取（離線時靠這個）
      const cached = await caches.match(request);
      if (cached) return cached;

      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
        }
        return response;
      } catch {
        // 離線且快取沒有時，導航類請求回 index
        if (request.destination === 'document') {
          return caches.match(resolveUrl('index.html'));
        }
        return new Response('', { status: 503, statusText: 'Offline' });
      }
    })()
  );
});
