// Local review entry. The actual App runs against a separate synthetic save.
if (!['127.0.0.1', 'localhost'].includes(location.hostname)) throw new Error('完整 App 示範只開放本機檢視。');
if (navigator.serviceWorker?.controller) throw new Error('請使用獨立本機預覽埠，避免與離線版本混用。');

const storageKey = 'questnote-encounter-app-review-v361';
let databaseName = sessionStorage.getItem(storageKey);
if (!/^QuestNoteTest-AppEncounter-[a-f0-9-]{36}$/.test(databaseName || '')) {
  databaseName = `QuestNoteTest-AppEncounter-${crypto.randomUUID()}`;
  sessionStorage.setItem(storageKey, databaseName);
}
const nativeOpen = indexedDB.open.bind(indexedDB);
indexedDB.open = (name, version) => {
  if (!['QuestNoteDB', 'QuestNotePreviewDB'].includes(name)) throw new Error('預覽拒絕未知資料庫。');
  return nativeOpen(databaseName, version);
};
// This document reviews changing source bytes and never installs an App worker.
if (navigator.serviceWorker) navigator.serviceWorker.register = async () => { throw new DOMException('本機來源檢視不安裝離線版本。', 'NotSupportedError'); };
const nativeFetch = window.fetch.bind(window);
window.fetch = (input, options) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, location.href);
  const method = options?.method || input?.method || 'GET';
  if (url.origin !== location.origin || !['GET', 'HEAD'].includes(method.toUpperCase())) return Promise.reject(new TypeError('本機測試版不送出遠端資料。'));
  return nativeFetch(input, options);
};

try {
  const db = await import('../src/db.js');
  const { createCollectionEntry } = await import('../src/collectionService.js');
  if ((await db.openDB()).name !== databaseName) throw new Error('示範存檔隔離失敗。');
  if (!await db.dbGet(db.STORES.META, 'encounterAppReview')) {
    const collection = ['pet_n01', 'pet_n02', 'pet_r01', 'pet_sr01', 'pet_ssr01', 'pet_ur01'].map((id) => createCollectionEntry(id));
    collection[0].isCompanion = true;
    const pools = await (await fetch('../data/pools.json')).json();
    for (const entry of collection) await db.dbPut(db.STORES.COLLECTION, entry);
    const meta = [
      { key:'wallet', stardust:2450, adventureEnergy:14, materials:{} },
      { key:'encounterEconomy', schemaVersion:1, migrationVersion:1, balance:242, migrationReceipt:null },
      { key:'onboardingV1', schemaVersion:2, status:'dismissed', step:'task', lessons:{} },
      { key:'poolDebutSeen', seenPoolIds:pools.pools.filter((pool) => pool.active).map((pool) => pool.id) },
      { key:'encounterAppReview', version:1 },
    ];
    for (const entry of meta) await db.dbPut(db.STORES.META, entry);
  }
  const markup = await (await fetch('../index.html')).text();
  const notice = '<aside aria-label="測試版本" style="padding:5px 12px;text-align:center;font:12px/1.5 system-ui;color:var(--color-text-muted);background:var(--color-bg-main)">本機測試 · 示範存檔 · 邀請與收藏可操作</aside>';
  document.open();
  document.write(markup.replace('<head>', '<head><base href="../">').replace('<title>QuestNote</title>', '<title>QuestNote · 完整 App 測試</title>').replace('<div id="app"', notice + '<div id="app"'));
  document.close();
  // Use the same visible navigation action a player uses after rendering.
  if (new URLSearchParams(location.search).get('view') !== 'tasks') {
    const observer = new MutationObserver(() => {
      const entry = document.querySelector('#view-gacha [data-identity-action="invitation"]');
      const navigation = document.querySelector('.nav-item[data-view="gacha"]');
      if (entry && navigation && !document.getElementById('app-loader')) {
        observer.disconnect(); queueMicrotask(() => navigation.click());
      }
    });
    observer.observe(document.body, { childList:true, subtree:true });
  }
} catch (error) {
  document.body.textContent = `完整 App 測試版尚未載入：${error.message}`;
}
