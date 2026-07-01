/**

 * QuestNote Service Worker — V2.2 daily blessing collapse
 * 快取 App Shell 與靜態資源，支援離線使用
 */

const CACHE_NAME = 'questnote-cache-v22-daily-blessing-collapse';



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

  'src/collectionService.js',

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

  'src/workshopService.js',

  'src/ui.js',

  'src/uiHelpers.js',

  'src/healthCheckService.js',

  'src/dailyCheckInService.js',

  'data/dailyWheelRewards.json',

  'data/pets.json',

  'data/pools.json',

  'data/pets-lore.json',

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



/** 快取比對（忽略 URL query，避免 ?v= 導致離線載入失敗） */

async function matchCached(request) {

  const direct = await caches.match(request);

  if (direct) return direct;



  const url = new URL(request.url);

  if (!url.search) return null;



  const cache = await caches.open(CACHE_NAME);

  const requests = await cache.keys();

  for (const req of requests) {

    if (new URL(req.url).pathname === url.pathname) {

      return cache.match(req);

    }

  }

  return null;

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

        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))

      );

      await self.clients.claim();

    })()

  );

});



self.addEventListener('fetch', (event) => {

  const { request } = event;

  if (request.method !== 'GET') return;



  if (request.mode === 'navigate') {

    event.respondWith(

      fetch(request).catch(() => caches.match(resolveUrl('index.html')))

    );

    return;

  }



  event.respondWith(

    (async () => {

      const cached = await matchCached(request);

      if (cached) return cached;



      try {

        const response = await fetch(request);

        if (response.ok) {

          const cache = await caches.open(CACHE_NAME);

          cache.put(request, response.clone());

        }

        return response;

      } catch {

        if (request.destination === 'document') {

          return caches.match(resolveUrl('index.html'));

        }

        return new Response('', { status: 503, statusText: 'Offline' });

      }

    })()

  );

});

