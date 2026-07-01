/**
 * 開發用 App 健康檢查 — 在 console 執行 runAppHealthCheck()
 */
import { openDB, dbGetAll, dbPut, dbDelete, STORES } from './db.js';
import { normalizeTask } from './taskMigration.js';
import { normalizeWallet, DEFAULT_MATERIALS } from './rewardService.js';
import { normalizeEntry, normalizeCollectionItem } from './collectionService.js';
import { normalizeHabit } from './habitService.js';
import { normalizeAchievementsState, loadAchievementsCatalog, loadTitlesCatalog } from './achievementService.js';
import { normalizeUserPreferences, normalizeTheme } from './preferencesService.js';
import { normalizeGachaStats } from './gachaService.js';
import { normalizeInventory, normalizeWorkshopStats } from './workshopService.js';
import { normalizeDailyCheckIn } from './dailyCheckInService.js';
import { normalizeExpedition } from './expeditionService.js';

const DATA_FILES = [
  { path: './data/pets.json', label: 'pets.json' },
  { path: './data/pools.json', label: 'pools.json' },
  { path: './data/expeditions.json', label: 'expeditions.json' },
  { path: './data/categories.json', label: 'categories.json' },
  { path: './data/achievements.json', label: 'achievements.json' },
  { path: './data/titles.json', label: 'titles.json' },
  { path: './data/pets-lore.json', label: 'pets-lore.json' },
  { path: './data/materials.json', label: 'materials.json' },
  { path: './data/craftables.json', label: 'craftables.json' },
  { path: './data/dailyWheelRewards.json', label: 'dailyWheelRewards.json' },
];

const PROBE_KEY = '_healthCheckProbe';
const INVENTORY_KEY = 'inventory';
const WORKSHOP_STATS_KEY = 'workshopStats';
const DAILY_CHECK_IN_KEY = 'dailyCheckIn';

const DAILY_CHECK_IN_FIELDS = [
  'lastCheckInDate',
  'lastCheckInAt',
  'streak',
  'bestStreak',
  'totalCheckIns',
  'lastWheelSpinDate',
  'lastWheelSpinAt',
  'totalWheelSpins',
  'history',
];

async function checkDataFiles() {
  const details = [];
  for (const { path, label } of DATA_FILES) {
    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.json();
      details.push(`${label}: ok`);
    } catch (err) {
      throw new Error(`${label}: ${err.message}`);
    }
  }
  return details;
}

async function checkIndexedDB() {
  await openDB();
  const probe = { key: PROBE_KEY, testedAt: new Date().toISOString() };
  await dbPut(STORES.META, probe);
  const read = await dbGetAll(STORES.META);
  if (!read.some((row) => row.key === PROBE_KEY)) {
    throw new Error('寫入後無法讀回探測資料');
  }
  await dbDelete(STORES.META, PROBE_KEY);
}

async function checkTasks() {
  const tasks = await dbGetAll(STORES.TASKS);
  for (const task of tasks) {
    const normalized = normalizeTask(task);
    if (!normalized?.id) throw new Error(`任務無法正規化: ${task?.id ?? '(無 id)'}`);
  }
  return tasks.length;
}

async function checkWallet() {
  const rows = await dbGetAll(STORES.META);
  const walletRow = rows.find((r) => r.key === 'wallet');
  const wallet = normalizeWallet(walletRow);
  if (typeof wallet.stardust !== 'number') throw new Error('stardust 無效');
  if (typeof wallet.adventureEnergy !== 'number') throw new Error('adventureEnergy 無效');
  if (!wallet.materials || typeof wallet.materials !== 'object') {
    throw new Error('materials 無效');
  }
  for (const matId of Object.keys(DEFAULT_MATERIALS)) {
    if (typeof wallet.materials[matId] !== 'number') {
      throw new Error(`wallet.materials.${matId} 缺少或型別錯誤（建議重新開啟 App 觸發 normalize）`);
    }
  }
}

async function checkCollection() {
  const items = await dbGetAll(STORES.COLLECTION);
  for (const item of items) {
    const normalized = normalizeCollectionItem(item);
    if (!normalized?.petId) throw new Error(`圖鑑項目無法正規化: ${item?.petId ?? '(無 petId)'}`);
    if (!('nickname' in normalized)) {
      throw new Error(`圖鑑 ${normalized.petId} 缺少 nickname 欄位（建議執行 migrateCollectionNicknames）`);
    }
    if (!('lastPettedAt' in normalized)) {
      throw new Error(`圖鑑 ${normalized.petId} 缺少 lastPettedAt 欄位`);
    }
  }
  return items.length;
}

async function checkHabits() {
  const habits = await dbGetAll(STORES.HABITS);
  for (const habit of habits) {
    const normalized = normalizeHabit(habit);
    if (!normalized?.id) throw new Error(`習慣無法正規化: ${habit?.id ?? '(無 id)'}`);
  }
  return habits.length;
}

async function checkAchievements() {
  const rows = await dbGetAll(STORES.META);
  const achRow = rows.find((r) => r.key === 'achievements');
  normalizeAchievementsState(achRow);
  const catalog = await loadAchievementsCatalog();
  const titles = await loadTitlesCatalog();
  if (!catalog?.length) throw new Error('achievements.json 為空或載入失敗');
  if (!titles?.length) throw new Error('titles.json 為空或載入失敗');
}

async function checkGachaStats() {
  const rows = await dbGetAll(STORES.META);
  const statsRow = rows.find((r) => r.key === 'gachaStats');
  normalizeGachaStats(statsRow);
}

async function checkUserPreferences() {
  const rows = await dbGetAll(STORES.META);
  const prefsRow = rows.find((r) => r.key === 'userPreferences');
  const prefs = normalizeUserPreferences(prefsRow);
  const theme = normalizeTheme(prefs.theme);
  if (theme !== 'default' && theme !== 'sweet') {
    throw new Error(`userPreferences.theme 無效: ${prefs.theme}`);
  }
  return theme;
}

async function checkInventory() {
  const rows = await dbGetAll(STORES.META);
  const invRow = rows.find((r) => r.key === INVENTORY_KEY);
  const inventory = normalizeInventory(invRow);
  if (!inventory || typeof inventory !== 'object') {
    throw new Error('inventory 不存在或無法正規化');
  }
  if (!inventory.items || typeof inventory.items !== 'object') {
    throw new Error('inventory.items 不存在或型別錯誤');
  }
  return Object.keys(inventory.items).length;
}

async function checkWorkshopStats() {
  const rows = await dbGetAll(STORES.META);
  const statsRow = rows.find((r) => r.key === WORKSHOP_STATS_KEY);
  normalizeWorkshopStats(statsRow);
}

async function checkDailyCheckIn() {
  const rows = await dbGetAll(STORES.META);
  const dailyRow = rows.find((r) => r.key === DAILY_CHECK_IN_KEY);
  const daily = normalizeDailyCheckIn(dailyRow);
  if (!daily || daily.key !== DAILY_CHECK_IN_KEY) {
    throw new Error('dailyCheckIn 不存在或 key 錯誤');
  }
  for (const field of DAILY_CHECK_IN_FIELDS) {
    if (!(field in daily)) {
      throw new Error(`dailyCheckIn 缺少欄位: ${field}`);
    }
  }
  if (!Array.isArray(daily.history)) {
    throw new Error('dailyCheckIn.history 必須為陣列');
  }
}

async function checkExpeditions() {
  const expeditions = await dbGetAll(STORES.EXPEDITIONS);
  if (!Array.isArray(expeditions)) {
    throw new Error('expeditions 必須為陣列');
  }
  for (const exp of expeditions) {
    const normalized = normalizeExpedition(exp);
    if (!normalized?.id) throw new Error(`探險紀錄無法正規化: ${exp?.id ?? '(無 id)'}`);
  }
  return expeditions.length;
}

async function checkServiceWorker() {
  if (!('serviceWorker' in navigator)) return 'unsupported';
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return 'not registered';
  return reg.active ? 'ok' : 'installing';
}

const ARCHIVED_MODULES = [
  'appStatsService.js',
  'quickAddService.js',
  'searchService.js',
  'tagService.js',
];

/**
 * 檢查孤兒模組是否已封存且未被執行路徑引用
 */
async function checkArchivedModules() {
  const warnings = [];

  const readmeRes = await fetch('./src/_archive/README.md');
  if (!readmeRes.ok) {
    throw new Error('src/_archive/README.md 不存在');
  }

  for (const file of ARCHIVED_MODULES) {
    const archivedRes = await fetch(`./src/_archive/${file}`);
    if (!archivedRes.ok) {
      throw new Error(`${file} 未封存於 src/_archive/`);
    }

    const legacyRes = await fetch(`./src/${file}`);
    if (legacyRes.ok) {
      warnings.push(`src/${file} 仍存在於原路徑`);
    }
  }

  const [appRes, uiRes, swRes] = await Promise.all([
    fetch('./src/app.js'),
    fetch('./src/ui.js'),
    fetch('./service-worker.js'),
  ]);

  if (!appRes.ok || !uiRes.ok || !swRes.ok) {
    throw new Error('無法讀取執行路徑檔案以檢查封存狀態');
  }

  const appText = await appRes.text();
  const uiText = await uiRes.text();
  const swText = await swRes.text();

  for (const file of ARCHIVED_MODULES) {
    const moduleId = file.replace('.js', '');
    const importPattern = new RegExp(`from\\s+['"].*${moduleId}\\.js['"]`);
    if (importPattern.test(appText) || importPattern.test(uiText)) {
      throw new Error(`${file} 仍被執行路徑 import`);
    }
    if (swText.includes(`src/${file}`) || swText.includes(`_archive/${file}`)) {
      warnings.push(`service-worker 仍快取 ${file}`);
    }
  }

  if (warnings.length) {
    return `ok with warnings: ${warnings.join('; ')}`;
  }
  return '4 modules archived';
}

/** 預期保留 renderAll 的呼叫情境（靜態分析用） */
const EXPECTED_RENDER_ALL_CONTEXTS = [
  { file: 'ui.js', pattern: 'export async function renderAll', reason: 'fallback 函式定義' },
  { file: 'ui.js', pattern: 'await renderAll()', reason: '主題切換後全頁刷新' },
  { file: 'ui.js', pattern: 'renderAll();', reason: '未知 view fallback' },
  { file: 'app.js', pattern: "renderMode: 'full'", reason: '初始化、跨日與資料大範圍恢復' },
];

/**
 * 檢查局部渲染 API 與 renderAll 使用風險
 */
async function checkRenderSystem() {
  const [uiRes, appRes] = await Promise.all([
    fetch('./src/ui.js'),
    fetch('./src/app.js'),
  ]);
  if (!uiRes.ok || !appRes.ok) {
    throw new Error('無法讀取 ui.js / app.js');
  }

  const uiText = await uiRes.text();
  const appText = await appRes.text();
  const notes = [];
  const stats = [];

  const requiredExports = [
    'export async function renderAll',
    'export function renderCurrentView',
    'export function renderView',
    'export function renderSharedUI',
    'export function renderViews',
    'export async function renderAfterRefresh',
  ];
  for (const sig of requiredExports) {
    if (!uiText.includes(sig)) {
      throw new Error(`ui.js 缺少 ${sig}`);
    }
  }

  if (!uiText.includes('isWheelSpinning()')) {
    throw new Error('render 路徑未檢查 isWheelSpinning');
  }

  const renderAllCallCount = (uiText.match(/\brenderAll\s*\(/g) || []).length;
  stats.push(`renderAll 呼叫點(ui.js): ${renderAllCallCount}`);

  const retained = EXPECTED_RENDER_ALL_CONTEXTS.filter(({ file, pattern }) => {
    const text = file === 'ui.js' ? uiText : appText;
    return text.includes(pattern);
  });
  const retainedReasons = retained.map((r) => `${r.file}: ${r.reason}`).join('; ');
  stats.push(`renderAll 保留原因: ${retainedReasons || 'applyTheme、renderView default、renderAfterRefresh(full)'}`);

  const refreshStateCalls = (appText.match(/\brefreshState\s*\(/g) || []).length;
  const refreshWithMode = (appText.match(/refreshState\s*\(\s*\{[^}]*renderMode/g) || []).length;
  const refreshDefault = refreshStateCalls - refreshWithMode;
  stats.push(`refreshState 呼叫點(app.js): ${refreshStateCalls}`);
  stats.push(`refreshState 含 renderMode: ${refreshWithMode}`);
  stats.push(`refreshState 預設 current: ${refreshDefault}`);

  const onRefreshWithMode = (uiText.match(/onRefresh\s*\(\s*\{[^}]*renderMode/g) || []).length;
  const onRefreshDefault = (uiText.match(/onRefresh\s*\(\s*\)/g) || []).length;
  stats.push(`onRefresh 含 renderMode(ui.js): ${onRefreshWithMode}`);
  stats.push(`onRefresh 預設 current(ui.js): ${onRefreshDefault}`);

  if (!/renderAll[\s\S]{0,400}isWheelSpinning/.test(uiText)) {
    notes.push('renderAll 可能缺少轉盤動畫 guard');
  }
  if (!/renderCurrentView[\s\S]{0,400}isWheelSpinning/.test(uiText)) {
    notes.push('renderCurrentView 可能缺少轉盤動畫 guard');
  }
  if (!/renderCurrentView[\s\S]{0,500}isModalOpen/.test(uiText)) {
    notes.push('renderCurrentView 可能缺少 Modal guard');
  }
  if (!/renderViews[\s\S]{0,500}isModalOpen/.test(uiText)) {
    notes.push('renderViews 可能缺少 Modal guard');
  }
  if (/function renderSharedUI[\s\S]{0,1200}renderAll\s*\(/.test(uiText)) {
    notes.push('renderSharedUI 可能呼叫 renderAll（不應發生）');
  }
  if (!/case\s+'more'[\s\S]{0,400}default[\s\S]{0,200}renderAll/.test(uiText)) {
    notes.push('renderView unknown fallback 可能缺失');
  }

  const appRenderAllCalls = (appText.match(/renderAll\s*\(/g) || []).length;
  if (appRenderAllCalls > 0) {
    notes.push(`app.js 仍有 ${appRenderAllCalls} 處直接 renderAll（預期 0）`);
  }

  if (!appText.includes("renderMode ?? 'current'") && !appText.includes('renderMode ?? "current"')) {
    notes.push('refreshState 預設可能未改為局部渲染');
  }

  if (!appText.includes("renderMode: 'full'")) {
    notes.push('缺少 full render 標記');
  }

  if (!appText.includes('跨日刷新') || !appText.includes("renderMode: 'full'")) {
    notes.push('跨日刷新可能未使用 full render');
  }

  const summary = stats.join(' | ');
  if (notes.length) {
    return `ok with notes: ${notes.join('; ')} | ${summary}`;
  }
  return summary;
}

/**
 * 寵物圖片路徑、SW runtime cache 與預載 API 檢查
 */
async function checkPetImageSystem() {
  const [petsRes, swRes, uiRes, preloadRes] = await Promise.all([
    fetch('./data/pets.json'),
    fetch('./service-worker.js'),
    fetch('./src/ui.js'),
    fetch('./src/imagePreloadService.js'),
  ]);

  if (!petsRes.ok) throw new Error('無法讀取 pets.json');
  if (!swRes.ok || !uiRes.ok || !preloadRes.ok) {
    throw new Error('無法讀取 SW / ui / imagePreloadService');
  }

  const petsData = await petsRes.json();
  const pets = petsData.pets || [];
  const swText = await swRes.text();
  const uiText = await uiRes.text();
  const preloadText = await preloadRes.text();
  const notes = [];
  const stats = [];

  const paths = [];
  const pathSet = new Set();
  let missingImage = 0;
  let invalidPrefix = 0;

  for (const pet of pets) {
    if (!pet.image) {
      missingImage += 1;
      continue;
    }
    if (!pet.image.startsWith('assets/pets/')) {
      invalidPrefix += 1;
    }
    paths.push(pet.image);
    if (pathSet.has(pet.image)) {
      notes.push(`重複 image path: ${pet.image}`);
    }
    pathSet.add(pet.image);
  }

  if (missingImage > 0) notes.push(`缺少 image 欄位: ${missingImage} 隻`);
  if (invalidPrefix > 0) notes.push(`非 assets/pets/ 路徑: ${invalidPrefix} 筆`);

  const missingFiles = [];
  const verifySample = [...new Set([...paths.slice(0, 5), ...paths.slice(-2)])];
  for (const path of verifySample) {
    try {
      const res = await fetch(`./${path}`, { method: 'HEAD' });
      if (!res.ok) missingFiles.push(path);
    } catch {
      try {
        const res = await fetch(`./${path}`);
        if (!res.ok) missingFiles.push(path);
      } catch {
        missingFiles.push(path);
      }
    }
  }
  if (missingFiles.length > 0) {
    notes.push(`取樣缺圖 ${missingFiles.length}/${verifySample.length}（例: ${missingFiles.slice(0, 2).join(', ')}）`);
  }

  const nonPng = paths.filter((p) => !/\.png$/i.test(p));
  if (nonPng.length > 0) {
    notes.push(`非 PNG 格式 ${nonPng.length} 筆，未來可評估 WebP`);
  } else {
    stats.push('格式: 全為 PNG，未來可評估 WebP');
  }

  const sampleForSize = paths.slice(0, 3);
  const sizeReports = [];
  for (const path of sampleForSize) {
    try {
      const dims = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight, ok: true });
        img.onerror = () => resolve({ ok: false });
        img.src = `./${path}`;
      });
      if (dims.ok) {
        const large = dims.w > 1024 || dims.h > 1024;
        sizeReports.push(`${path}: ${dims.w}x${dims.h}${large ? '(建議壓縮)' : ''}`);
      }
    } catch {
      /* 略過 */
    }
  }
  if (sizeReports.length) stats.push(`尺寸取樣: ${sizeReports.join('; ')}`);

  if (!swText.includes('PET_IMAGE_CACHE') || !swText.includes('questnote-pet-images-v235')) {
    throw new Error('service-worker 缺少 PET_IMAGE_CACHE');
  }
  if (!swText.includes('/assets/pets/') || !swText.includes('cachePetImage')) {
    throw new Error('service-worker 未處理 assets/pets/ runtime cache');
  }
  if (swText.includes('assets/pets/') && /PRECACHE_URLS[\s\S]*assets\/pets/.test(swText)) {
    notes.push('PRECACHE 含寵物圖（應避免全量 precache）');
  }

  const requiredPreload = [
    'preloadImage',
    'preloadImages',
    'preloadCompanionImage',
    'preloadGachaResultImages',
    'preloadOwnedPetImages',
    'getPetImageSrc',
    'warmPetImageCache',
  ];
  for (const fn of requiredPreload) {
    if (!preloadText.includes(`function ${fn}`) && !preloadText.includes(`export function ${fn}`)) {
      throw new Error(`imagePreloadService 缺少 ${fn}`);
    }
  }

  if (!uiText.includes('imagePreloadService')) {
    notes.push('ui.js 可能未整合 imagePreloadService');
  }
  if (!uiText.includes("loading: 'eager'") && !uiText.includes('loading: "eager"')) {
    notes.push('ui.js 可能缺少 eager 圖片載入');
  }
  if (!uiText.includes("loading: 'lazy'") && !uiText.includes('loading: "lazy"')) {
    notes.push('圖鑑 lazy loading 可能缺失');
  }

  let petCacheCount = 0;
  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open('questnote-pet-images-v235');
      const keys = await cache.keys();
      petCacheCount = keys.length;
    } catch {
      notes.push('無法讀取 PET_IMAGE_CACHE 狀態');
    }
  }
  stats.push(`pets.json: ${pets.length} 隻`);
  stats.push(`image paths: ${paths.length}`);
  stats.push(`PET_IMAGE_CACHE 項目: ${petCacheCount}`);

  const summary = stats.join(' | ');
  if (notes.length) {
    return `ok with notes: ${notes.join('; ')} | ${summary}`;
  }
  return summary;
}

/**
 * 執行健康檢查並輸出結果至 console
 * @returns {Promise<{ ok: boolean, results: Record<string, string>, errors: string[] }>}
 */
export async function runAppHealthCheck() {
  const results = {};
  const errors = [];

  async function runCheck(key, fn) {
    try {
      const detail = await fn();
      results[key] = detail === undefined ? 'ok' : `ok (${detail})`;
    } catch (err) {
      results[key] = 'error';
      errors.push(`${key}: ${err.message || err}`);
    }
  }

  await runCheck('data files', async () => {
    const details = await checkDataFiles();
    return details.length + ' files';
  });
  await runCheck('indexedDB', checkIndexedDB);
  await runCheck('tasks', checkTasks);
  await runCheck('wallet', checkWallet);
  await runCheck('collection', checkCollection);
  await runCheck('habits', checkHabits);
  await runCheck('achievements', checkAchievements);
  await runCheck('gachaStats', checkGachaStats);
  await runCheck('userPreferences', checkUserPreferences);
  await runCheck('inventory', checkInventory);
  await runCheck('workshopStats', checkWorkshopStats);
  await runCheck('dailyCheckIn', checkDailyCheckIn);
  await runCheck('expeditions', checkExpeditions);
  await runCheck('archived modules', checkArchivedModules);
  await runCheck('render system', checkRenderSystem);
  await runCheck('pet images', checkPetImageSystem);
  await runCheck('service worker', checkServiceWorker);

  console.log('QuestNote Health Check:');
  for (const [key, status] of Object.entries(results)) {
    console.log(`- ${key}: ${status}`);
  }
  if (errors.length) {
    console.log('Errors:');
    for (const err of errors) {
      console.log(`  - ${err}`);
    }
    console.log('修復建議：重新整理 App；若持續失敗，請匯出備份後聯繫開發或等待下一版 migration。');
  } else {
    console.log('All checks passed.');
  }

  return { ok: errors.length === 0, results, errors };
}
