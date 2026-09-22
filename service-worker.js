/**
 * QuestNote Service Worker — V3.4.4 永眠花海卡池入場動畫優化
 * 快取 App Shell 與靜態資源，支援離線使用
 * data/global-mailbox.json 使用動態 Network First，不進 App Shell precache
 * 作者本機工具（mailbox publisher／pet series builder／summon preview）原始碼不得加入 App Shell precache
 * 寵物圖片不得加入 App Shell precache
 */

const CACHE_NAME = 'questnote-preview-cache-v345-data-recovery';
const PET_IMAGE_CACHE = 'questnote-preview-pet-images-v235';
const MAILBOX_RUNTIME_CACHE = 'questnote-preview-mailbox-runtime-v1';
const MAILBOX_FETCH_TIMEOUT_MS = 7000;

/** 需要預快取的資源（相對於 SW 所在目錄） */
const PRECACHE_URLS = [
  'index.html',
  'manifest.webmanifest',
  'src/styles.css',
  'src/app.js',
  'src/db.js',
  'src/taskService.js',
  'src/taskMigration.js',
  'src/taskFilterService.js',
  'src/taskStatsService.js',
  'src/categoryService.js',
  'src/rewardService.js',
  'src/gachaService.js',
  'src/petPoolFilter.js',
  'src/summonRevealService.js',
  'src/poolPresentation.js',
  'src/poolDebutService.js',
  'src/poolUnlockService.js',
  'src/poolAwakeningController.js',
  'src/themedSummonController.js',
  'src/collectionService.js',
  'src/collectionMilestoneService.js',
  'src/backupService.js',
  'src/companionService.js',
  'src/companionDialogueService.js',
  'src/expeditionStatusService.js',
  'src/preferencesService.js',
  'src/achievementService.js',
  'src/habitService.js',
  'src/loreService.js',
  'src/devService.js',
  'src/expeditionService.js',
  'src/explorationService.js',
  'src/workshopService.js',
  'src/ui.js',
  'src/version.js',
  'src/uiHelpers.js',
  'src/healthCheckService.js',
  'src/dailyCheckInService.js',
  'src/questService.js',
  'src/adventureHandbookService.js',
  'src/mailboxService.js',
  'src/mailboxSchema.js',
  'src/petDataSchema.js',
  'src/backupSchema.js',
  'src/imagePreloadService.js',
  'src/deferredRenderGate.js',
  'src/perfDiagnostics.js',
  'data/dailyWheelRewards.json',
  'data/pets.json',
  'data/pools.json',
  'data/pets-lore.json',
  'data/pet-series.json',
  'data/expeditions.json',
  'data/achievements.json',
  'data/titles.json',
  'data/categories.json',
  'data/materials.json',
  'data/craftables.json',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
];

function resolveUrl(path) {
  return new URL(path, self.location.href).href;
}

function isGlobalMailboxRequest(url) {
  return url.pathname.endsWith('/data/global-mailbox.json')
    || url.pathname.endsWith('data/global-mailbox.json');
}

function getMailboxCacheRequest() {
  return new Request(resolveUrl('data/global-mailbox.json'));
}

/** 快取比對（忽略 URL query，避免 ?v= 導致離線載入失敗） */
async function matchCached(request, cacheName = CACHE_NAME) {
  const cache = await caches.open(cacheName);
  const direct = await cache.match(request);
  if (direct) return direct;

  const url = new URL(request.url);
  if (!url.search) return null;

  const requests = await cache.keys();
  for (const req of requests) {
    if (new URL(req.url).pathname === url.pathname) {
      return cache.match(req);
    }
  }
  return null;
}

function isMutableAppAsset(pathname) {
  return /\.(js|css|json)$/i.test(pathname)
    || pathname.endsWith('/manifest.webmanifest');
}

function isPetImagePath(pathname) {
  return pathname.includes('/assets/pets/');
}

function isImageAsset(pathname) {
  return /\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(pathname)
    || pathname.includes('/assets/');
}

async function fetchWithTimeout(request, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(request, { signal: controller.signal, cache: 'no-store' });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 全域信箱 JSON：Network First + timeout + runtime cache fallback
 * 寫入時使用固定 URL key，避免 ?t= 造成無限 cache key
 */
async function networkFirstMailbox(request) {
  const cache = await caches.open(MAILBOX_RUNTIME_CACHE);
  const cacheKey = getMailboxCacheRequest();

  try {
    const response = await fetchWithTimeout(request, MAILBOX_FETCH_TIMEOUT_MS);
    if (response.ok) {
      cache.put(cacheKey, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(cacheKey)
      || await matchCached(request, MAILBOX_RUNTIME_CACHE)
      || await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({
      schemaVersion: 1,
      generatedAt: null,
      messages: [],
    }), {
      status: 503,
      statusText: 'Mailbox Offline',
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/** 有網路時優先取新版，離線時 fallback 快取 */
async function networkFirstWithCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await matchCached(request, CACHE_NAME);
    if (cached) return cached;
    if (request.destination === 'document') {
      return caches.match(resolveUrl('index.html'));
    }
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}

/** 寵物圖片：runtime cache-first，離線仍可顯示曾看過的圖 */
async function cachePetImage(request) {
  const cache = await caches.open(PET_IMAGE_CACHE);
  const cached = await matchCached(request, PET_IMAGE_CACHE);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const fallback = await cache.match(request);
    if (fallback) return fallback;
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}

/** 其他圖片：快取優先，離線仍可顯示 */
async function cacheFirst(request) {
  const cached = await matchCached(request, CACHE_NAME);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(
        PRECACHE_URLS.map(async (path) => {
          try {
            await cache.add(resolveUrl(path));
          } catch (err) {
            console.warn('[QuestNote SW] 預快取失敗:', path, err);
          }
        })
      );
      await self.skipWaiting();
    })()
  );
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
        keys
          .filter((key) => (
            key.startsWith('questnote-preview-')
            && key !== CACHE_NAME
            && key !== PET_IMAGE_CACHE
            && key !== MAILBOX_RUNTIME_CACHE
          ))
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (isGlobalMailboxRequest(url)) {
    event.respondWith(networkFirstMailbox(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithCache(request));
    return;
  }

  if (isMutableAppAsset(url.pathname)) {
    event.respondWith(networkFirstWithCache(request));
    return;
  }

  if (isPetImagePath(url.pathname)) {
    event.respondWith(cachePetImage(request));
    return;
  }

  if (isImageAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirstWithCache(request));
});
