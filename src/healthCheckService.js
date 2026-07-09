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
import {
  getQuestProgress,
  getTodayKey,
  getWeekKey,
  DAILY_QUEST_DEFS,
  WEEKLY_QUEST_DEFS,
} from './questService.js';
import {
  getExplorationProgress,
  EXPLORATION_AREA_IDS,
} from './explorationService.js';

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
 * 版本資訊顯示與 DOM 結構檢查
 */
async function checkVersionInfo() {
  const [versionRes, indexRes, uiRes, cssRes] = await Promise.all([
    fetch('./src/version.js'),
    fetch('./index.html'),
    fetch('./src/ui.js'),
    fetch('./src/styles.css'),
  ]);

  if (!versionRes.ok || !indexRes.ok || !uiRes.ok || !cssRes.ok) {
    throw new Error('無法讀取 version / index / ui / styles');
  }

  const versionText = await versionRes.text();
  const indexText = await indexRes.text();
  const uiText = await uiRes.text();
  const cssText = await cssRes.text();
  const notes = [];
  const stats = [];

  if (!versionText.includes('export const APP_VERSION')) {
    throw new Error('APP_VERSION 不存在');
  }
  if (!versionText.includes('export const CACHE_NAME')) {
    throw new Error('CACHE_NAME 不存在');
  }
  if (!versionText.includes('export const BUILD_TIME')) {
    throw new Error('BUILD_TIME 不存在');
  }
  if (!versionText.includes('export function formatDisplayVersion')) {
    throw new Error('formatDisplayVersion 不存在');
  }

  const versionMatch = versionText.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
  if (versionMatch) stats.push(`APP_VERSION=${versionMatch[1]}`);

  const cacheMatch = versionText.match(/CACHE_NAME\s*=\s*['"]([^'"]+)['"]/);
  if (cacheMatch) stats.push(`CACHE_NAME=${cacheMatch[1]}`);

  if (!indexText.includes('data-version-info')) {
    throw new Error('index.html 缺少 data-version-info container');
  }

  const versionInfoIdCount = (indexText.match(/id="versionInfo"/g) || []).length;
  if (versionInfoIdCount > 0) {
    notes.push(`發現 id="versionInfo" x${versionInfoIdCount}（建議改用 data-version-info）`);
  }

  if (!uiText.includes('export function renderVersionInfo')) {
    throw new Error('renderVersionInfo 不存在');
  }
  if (!/updateServiceWorkerStatusDisplay[\s\S]{0,800}catch/.test(uiText)) {
    notes.push('service worker status check 可能缺少 try/catch');
  }
  if (!uiText.includes('檢查中')) {
    notes.push('版本資訊可能未先同步顯示 Service Worker 檢查中');
  }

  if (!cssText.includes('.version-info-card')) {
    notes.push('CSS 缺少 .version-info-card');
  }

  const domContainers = typeof document !== 'undefined'
    ? document.querySelectorAll('[data-version-info]').length
    : 0;
  stats.push(`data-version-info containers=${domContainers}`);

  const summary = stats.join(' | ');
  if (notes.length) {
    return `ok with notes: ${notes.join('; ')} | ${summary}`;
  }
  return summary;
}

/**
 * Sweet 主題 toast 對比度與類型檢查
 */
async function checkSweetToastContrast() {
  const [cssRes, uiRes] = await Promise.all([
    fetch('./src/styles.css'),
    fetch('./src/ui.js'),
  ]);

  if (!cssRes.ok || !uiRes.ok) {
    throw new Error('無法讀取 styles / ui');
  }

  const cssText = await cssRes.text();
  const uiText = await uiRes.text();
  const notes = [];
  const stats = [];

  const requiredPairs = [
    ['sweet toast success bg', 'body[data-theme="sweet"] .toast--success', '#E7F6F1'],
    ['sweet toast success text', 'body[data-theme="sweet"] .toast--success', '#1F5C4D'],
    ['sweet toast reward bg', 'body[data-theme="sweet"] .toast--reward', '#FFF1D8'],
    ['sweet toast reward text', 'body[data-theme="sweet"] .toast--reward', '#8A4F10'],
    ['sweet toast info bg', 'body[data-theme="sweet"] .toast--info', '#EEE9FF'],
    ['sweet toast info text', 'body[data-theme="sweet"] .toast--info', '#4E3BA8'],
    ['sweet toast warning bg', 'body[data-theme="sweet"] .toast--warning', '#FFF3E6'],
    ['sweet toast warning text', 'body[data-theme="sweet"] .toast--warning', '#8A4F10'],
    ['sweet toast error bg', 'body[data-theme="sweet"] .toast--error', '#FFE3EA'],
    ['sweet toast error text', 'body[data-theme="sweet"] .toast--error', '#9F263F'],
    ['sweet reward-toast bg', 'body[data-theme="sweet"] .reward-toast', '#FFF1D8'],
    ['sweet reward-toast text', 'body[data-theme="sweet"] .reward-toast', '#8A4F10'],
  ];

  for (const [label, selector, color] of requiredPairs) {
    const idx = cssText.indexOf(selector);
    if (idx === -1) {
      throw new Error(`缺少 ${selector}`);
    }
    const block = cssText.slice(idx, idx + 400);
    if (!block.includes(color)) {
      throw new Error(`${label} 未使用 ${color}`);
    }
    stats.push(`${label}=ok`);
  }

  if (!cssText.includes('V2.3.7') && !cssText.includes('Sweet 主題 Toast 可讀性修正')) {
    notes.push('styles.css 可能缺少 V2.3.7 sweet toast 區塊標記');
  }

  if (!uiText.includes("reward: '✨'") && !uiText.includes('reward: \'✨\'')) {
    notes.push('showToast 可能未支援 reward type');
  }

  if (!uiText.includes('reward-toast--reward')) {
    throw new Error('showRewardToast 未使用 reward-toast--reward class');
  }

  const globalToastGradient = /\.toast--success\s*\{[^}]*linear-gradient/s.test(cssText);
  const scopedDefaultToast = cssText.includes('body[data-theme="default"] .toast--success');
  if (globalToastGradient && !scopedDefaultToast) {
    notes.push('全域 .toast--success 漸層可能覆蓋 sweet 主題');
  } else if (scopedDefaultToast) {
    stats.push('default-only toast gradient=ok');
  }

  if (!uiText.includes("showToast('任務已完成', 'success')")) {
    notes.push('任務完成 fallback toast 可能已變更');
  } else {
    stats.push('task-complete toast type=success');
  }

  if (typeof window !== 'undefined' && window.testSweetToasts) {
    stats.push('testSweetToasts=available');
  }

  const summary = stats.join(' | ');
  if (notes.length) {
    return `ok with notes: ${notes.join('; ')} | ${summary}`;
  }
  return summary;
}

/**
 * V2.3.8 — 召喚頁星塵同步檢查（靜態分析 ui.js）
 */
async function checkGachaSync() {
  const uiRes = await fetch('./src/ui.js');
  if (!uiRes.ok) throw new Error('無法讀取 ui.js');
  const uiText = await uiRes.text();
  const notes = [];
  const stats = [];

  if (!uiText.includes('export function updateGachaAffordability')) {
    throw new Error('缺少 updateGachaAffordability 函式');
  }
  stats.push('updateGachaAffordability=exists');

  if (!/function renderSharedUI[\s\S]{0,1200}updateGachaAffordability\s*\(/.test(uiText)) {
    throw new Error('renderSharedUI 未呼叫 updateGachaAffordability');
  }
  stats.push('renderSharedUI→updateGachaAffordability=ok');

  // 召喚頁切換時重新 render
  if (!/viewName === 'gacha'[\s\S]{0,80}renderGachaView\s*\(/.test(uiText)) {
    notes.push('switchView(gacha) 可能未重新 renderGachaView');
  } else {
    stats.push('switchView(gacha)→renderGachaView=ok');
  }

  // 單抽 / 十連 click handler 依最新 state.wallet 判斷
  if (!/function handlePull[\s\S]{0,200}state\.wallet\.stardust/.test(uiText)) {
    throw new Error('handlePull 未依最新 state.wallet 判斷');
  }
  if (!/function handleTenPull[\s\S]{0,200}state\.wallet\.stardust/.test(uiText)) {
    throw new Error('handleTenPull 未依最新 state.wallet 判斷');
  }
  stats.push('pull handlers 讀最新 wallet=ok');

  // updateGachaAffordability 依最新 state.wallet 計算按鈕狀態
  if (!/function updateGachaAffordability[\s\S]{0,600}state\.wallet\.stardust/.test(uiText)) {
    throw new Error('updateGachaAffordability 未讀最新 state.wallet');
  }
  if (!/function updateGachaAffordability[\s\S]{0,900}btn-pull['"]/.test(uiText)
    || !/function updateGachaAffordability[\s\S]{0,900}btn-pull-ten/.test(uiText)) {
    notes.push('updateGachaAffordability 可能未同時更新單抽與十連按鈕');
  } else {
    stats.push('單抽/十連 disabled 依最新 wallet=ok');
  }

  // DOM 缺失安全 return
  if (!/function updateGachaAffordability[\s\S]{0,400}if\s*\(!btnSingle\s*&&\s*!btnTen\)\s*return/.test(uiText)) {
    notes.push('updateGachaAffordability 可能缺少 DOM 缺失 safe return');
  } else {
    stats.push('DOM 缺失 safe return=ok');
  }

  const summary = stats.join(' | ');
  if (notes.length) {
    return `ok with notes: ${notes.join('; ')} | ${summary}`;
  }
  return summary;
}

/**
 * V2.3.8 — Sweet 可讀性檢查（召喚機率 + 探險歸來 modal）
 */
async function checkSweetContrast() {
  const cssRes = await fetch('./src/styles.css');
  if (!cssRes.ok) throw new Error('無法讀取 styles.css');
  const cssText = await cssRes.text();
  const stats = [];
  const notes = [];

  const requiredPairs = [
    ['sweet rate SR text', 'body[data-theme="sweet"] .rate-tag.rate-SR', '#4E3BA8'],
    ['sweet rate SSR text', 'body[data-theme="sweet"] .rate-tag.rate-SSR', '#8A4F10'],
    ['sweet rate UR text', 'body[data-theme="sweet"] .rate-tag.rate-UR', '#9F2F67'],
    ['sweet expedition title', 'body[data-theme="sweet"] .expedition-reward-modal__title', '#B83274'],
    ['sweet expedition reward stardust', 'body[data-theme="sweet"] .expedition-reward-item[data-reward-type="stardust"]', '#8A4F10'],
    ['sweet expedition reward material', 'body[data-theme="sweet"] .expedition-reward-item[data-reward-type="material"]', '#1F5C4D'],
    ['sweet expedition reward bond', 'body[data-theme="sweet"] .expedition-reward-item[data-reward-type="bond"]', '#4E3BA8'],
    ['sweet expedition confirm button', 'body[data-theme="sweet"] .expedition-confirm-button', '#C73578'],
  ];

  for (const [label, selector, color] of requiredPairs) {
    const idx = cssText.indexOf(selector);
    if (idx === -1) {
      throw new Error(`缺少 ${selector}`);
    }
    const block = cssText.slice(idx, idx + 400);
    if (!block.includes(color)) {
      throw new Error(`${label} 未使用 ${color}`);
    }
    stats.push(`${label}=ok`);
  }

  // 淺底白字 / 淡粉字配粉底風險檢查（限 sweet 機率與探險 modal 區塊）
  const sweetContrastIdx = cssText.indexOf('V2.3.8 — Sweet 顯示可讀性與召喚星塵同步修正');
  if (sweetContrastIdx === -1) {
    notes.push('styles.css 缺少 V2.3.8 sweet contrast 區塊標記');
  } else {
    const block = cssText.slice(sweetContrastIdx);
    if (/\.rate-tag[\s\S]{0,120}color:\s*#FFF/i.test(block)) {
      notes.push('sweet 機率區塊疑似淺底白字');
    }
    stats.push('sweet contrast 區塊=ok');
  }

  const summary = stats.join(' | ');
  if (notes.length) {
    return `ok with notes: ${notes.join('; ')} | ${summary}`;
  }
  return summary;
}

/**
 * V2.4.0 — SSR / UR 抽卡演出特效檢查（靜態分析）
 * 只檢查與回報，不會自動修改資料。
 */
async function checkSummonReveal() {
  const [svcRes, uiRes, cssRes, devRes, swRes, indexRes] = await Promise.all([
    fetch('./src/summonRevealService.js'),
    fetch('./src/ui.js'),
    fetch('./src/styles.css'),
    fetch('./src/devService.js'),
    fetch('./service-worker.js'),
    fetch('./index.html'),
  ]);

  if (!svcRes.ok) throw new Error('無法讀取 summonRevealService.js');
  if (!uiRes.ok || !cssRes.ok || !devRes.ok || !swRes.ok || !indexRes.ok) {
    throw new Error('無法讀取 ui / styles / devService / service-worker / index');
  }

  const svcText = await svcRes.text();
  const uiText = await uiRes.text();
  const cssText = await cssRes.text();
  const devText = await devRes.text();
  const swText = await swRes.text();
  const indexText = await indexRes.text();
  const notes = [];
  const stats = [];

  // 1. playSummonReveal / SSR / UR / 狀態 API 是否存在
  const requiredApis = [
    'export async function playSummonReveal',
    'export function playSSRReveal',
    'export function playURReveal',
    'export function isSummonRevealPlaying',
    'export function skipSummonReveal',
    'export function getHighestRarity',
    'export function getRevealPetFromResults',
    'export function shouldPlayReveal',
    'export function createSummonRevealOverlay',
    'export function removeSummonRevealOverlay',
    'export function pickDebugPetByRarity',
  ];
  for (const sig of requiredApis) {
    if (!svcText.includes(sig)) throw new Error(`summonRevealService 缺少 ${sig}`);
  }
  stats.push('summonReveal API=ok');

  // 2. SSR / UR class
  if (!cssText.includes('.summon-reveal-overlay.is-ssr')) throw new Error('缺少 SSR class');
  if (!cssText.includes('.summon-reveal-overlay.is-ur')) throw new Error('缺少 UR class');
  stats.push('SSR/UR class=ok');

  // 3. skip button
  if (!svcText.includes('summon-reveal-skip') || !cssText.includes('.summon-reveal-skip')) {
    throw new Error('缺少跳過按鈕 (skip)');
  }
  if (!/min-height:\s*44px/.test(cssText.slice(cssText.indexOf('.summon-reveal-skip'), cssText.indexOf('.summon-reveal-skip') + 400))) {
    notes.push('skip button 高度可能不足 44px');
  }
  stats.push('skip button=ok');

  // 4. overlay 結束後會移除
  if (!/removeSummonRevealOverlay[\s\S]{0,300}removeChild/.test(svcText)
    && !svcText.includes("querySelectorAll('.summon-reveal-overlay')")) {
    notes.push('overlay 可能未確保移除');
  } else {
    stats.push('overlay remove=ok');
  }
  if (!/finally\s*\{[\s\S]{0,200}removeSummonRevealOverlay/.test(svcText)) {
    notes.push('playSummonReveal finally 可能未移除 overlay');
  }

  // 5. Debug mode 判斷
  if (!devText.includes('export function isDebugMode')) throw new Error('缺少 isDebugMode');
  if (!devText.includes("params.get('debug')") || !devText.includes('questnote_debug')) {
    notes.push('isDebugMode 可能未支援 ?debug=1 / localStorage');
  }
  stats.push('isDebugMode=ok');

  // 6. Debug 測試按鈕放在設定頁開發測試區，且只在 dev / debug mode 顯示
  if (!indexText.includes('id="btn-test-ssr-reveal"') || !indexText.includes('id="btn-test-ur-reveal"')) {
    throw new Error('設定頁缺少 SSR / UR 演出測試按鈕');
  }
  if (!indexText.includes('id="dev-reveal-tests"')) {
    throw new Error('設定頁缺少 dev-reveal-tests 群組');
  }
  if (!/dev-reveal-tests['"]\)[\s\S]{0,120}hidden\s*=\s*!debugOn/.test(uiText)) {
    notes.push('dev-reveal-tests 顯示可能未以 debugOn 控制');
  }
  if (!/btn-test-ssr-reveal[\s\S]{0,120}testSummonReveal\('SSR'\)/.test(uiText)
    || !/btn-test-ur-reveal[\s\S]{0,120}testSummonReveal\('UR'\)/.test(uiText)) {
    throw new Error('演出測試按鈕未綁定 testSummonReveal');
  }
  stats.push('設定頁演出測試按鈕受 dev/debug 控制=ok');

  // 7. 測試按鈕不呼叫正式抽卡 / 寫入資料 function
  const testFnIdx = uiText.indexOf('async function testSummonReveal');
  if (testFnIdx === -1) throw new Error('缺少 testSummonReveal');
  const testFnBlock = uiText.slice(testFnIdx, testFnIdx + 600);
  const forbidden = ['pullOnce', 'performTenPull', 'addPetToCollection', 'addFragments', 'updateGachaStats', 'spendStardust'];
  for (const fn of forbidden) {
    if (testFnBlock.includes(fn)) {
      throw new Error(`testSummonReveal 不應呼叫 ${fn}`);
    }
  }
  stats.push('測試按鈕不觸碰正式抽卡=ok');

  // 8. Reduce Motion 支援
  if (!svcText.includes('prefers-reduced-motion') && !svcText.includes('reduceMotion')) {
    throw new Error('summonRevealService 未支援 reduce motion');
  }
  if (!cssText.includes('@media (prefers-reduced-motion: reduce)')
    || !cssText.includes('.summon-reveal-overlay.is-reduced')) {
    notes.push('CSS reduce motion 支援可能不完整');
  }
  stats.push('reduce motion=ok');

  // 9. 單抽 / 十連整合
  if (!/shouldPlayReveal\(result\.rarity\)[\s\S]{0,200}playSummonReveal/.test(uiText)) {
    notes.push('單抽演出整合可能缺失');
  }
  if (!/getHighestRarity\(result\.results\)[\s\S]{0,300}playSummonReveal/.test(uiText)) {
    notes.push('十連演出整合可能缺失');
  }

  // 10. SW 是否 precache 新檔
  if (!swText.includes('src/summonRevealService.js')) {
    notes.push('service-worker 未 precache summonRevealService.js');
  } else {
    stats.push('SW precache=ok');
  }

  const summary = stats.join(' | ');
  if (notes.length) {
    return `ok with notes: ${notes.join('; ')} | ${summary}`;
  }
  return summary;
}

/**
 * V2.5.0 — 每日 / 每週任務系統檢查（靜態 + 執行期）
 * 只檢查與回報，不會自動清除資料。
 */
async function checkQuestSystem() {
  const [svcRes, uiRes, indexRes, backupRes, swRes] = await Promise.all([
    fetch('./src/questService.js'),
    fetch('./src/ui.js'),
    fetch('./index.html'),
    fetch('./src/backupService.js'),
    fetch('./service-worker.js'),
  ]);
  if (!svcRes.ok) throw new Error('無法讀取 questService.js');
  if (!uiRes.ok || !indexRes.ok || !backupRes.ok || !swRes.ok) {
    throw new Error('無法讀取 ui / index / backup / service-worker');
  }

  const svcText = await svcRes.text();
  const uiText = await uiRes.text();
  const indexText = await indexRes.text();
  const backupText = await backupRes.text();
  const swText = await swRes.text();
  const notes = [];
  const stats = [];

  // 1. 必要 API 存在
  const requiredApis = [
    'export function normalizeQuestProgress',
    'export function initQuestProgress',
    'export function getTodayKey',
    'export function getWeekKey',
    'export function rolloverQuestProgress',
    'export async function updateQuestProgress',
    'export async function claimQuestReward',
    'export async function getQuestSummary',
  ];
  for (const sig of requiredApis) {
    if (!svcText.includes(sig)) throw new Error(`questService 缺少 ${sig}`);
  }
  stats.push('quest API=ok');

  // 8/9. claimQuestReward / updateQuestProgress 是否被 UI 使用
  if (!uiText.includes('claimQuestReward')) throw new Error('ui.js 未使用 claimQuestReward');
  if (!uiText.includes('updateQuestProgress')) throw new Error('ui.js 未使用 updateQuestProgress');
  stats.push('ui 事件接入=ok');

  // 12. quest UI 渲染容器
  if (!indexText.includes('id="quest-panel"')) throw new Error('index.html 缺少 quest-panel 容器');
  if (!uiText.includes('function renderQuestPanel')) throw new Error('ui.js 缺少 renderQuestPanel');
  stats.push('quest UI 容器=ok');

  // 10/11. backup 是否包含 questProgress 且 migration 支援
  if (!backupText.includes('questProgress')) throw new Error('backupService 未包含 questProgress');
  if (!backupText.includes('normalizeQuestProgress')) throw new Error('backupService 未使用 normalizeQuestProgress');
  stats.push('backup questProgress=ok');

  if (!swText.includes('src/questService.js')) {
    notes.push('service-worker 未 precache questService.js');
  } else {
    stats.push('SW precache=ok');
  }

  // 執行期：questProgress 結構、rollover、資料合理性
  const qp = await getQuestProgress();
  if (!qp || typeof qp !== 'object') throw new Error('questProgress 不存在');
  if (qp.daily?.dateKey !== getTodayKey()) {
    throw new Error(`daily.dateKey 非今天（${qp.daily?.dateKey} != ${getTodayKey()}）`);
  }
  if (qp.weekly?.weekKey !== getWeekKey()) {
    throw new Error(`weekly.weekKey 非本週（${qp.weekly?.weekKey} != ${getWeekKey()}）`);
  }

  const dailyQuests = qp.daily?.quests || {};
  const weeklyQuests = qp.weekly?.quests || {};
  if (Object.keys(dailyQuests).length < DAILY_QUEST_DEFS.length) {
    throw new Error('daily quests 數量不足');
  }
  if (Object.keys(weeklyQuests).length < WEEKLY_QUEST_DEFS.length) {
    throw new Error('weekly quests 數量不足');
  }

  for (const quest of [...Object.values(dailyQuests), ...Object.values(weeklyQuests)]) {
    if (typeof quest.current !== 'number' || typeof quest.target !== 'number') {
      throw new Error(`quest ${quest.id} current/target 型別錯誤`);
    }
    if (quest.target <= 0 || quest.current < 0 || quest.current > quest.target) {
      throw new Error(`quest ${quest.id} current/target 不合理（${quest.current}/${quest.target}）`);
    }
    if (typeof quest.claimed !== 'boolean' || typeof quest.completed !== 'boolean') {
      throw new Error(`quest ${quest.id} claimed/completed 非 boolean`);
    }
  }
  stats.push(`daily=${Object.keys(dailyQuests).length} weekly=${Object.keys(weeklyQuests).length}`);

  if (typeof qp.stats?.totalDailyQuestsClaimed !== 'number'
    || typeof qp.stats?.totalWeeklyQuestsClaimed !== 'number') {
    notes.push('stats 領取次數型別可能錯誤');
  }

  const summary = stats.join(' | ');
  if (notes.length) return `ok with notes: ${notes.join('; ')} | ${summary}`;
  return summary;
}

/**
 * V2.5.0 — 冒險任務可讀性檢查（sweet / default 對比度）
 */
async function checkQuestContrast() {
  const cssRes = await fetch('./src/styles.css');
  if (!cssRes.ok) throw new Error('無法讀取 styles.css');
  const cssText = await cssRes.text();
  const stats = [];
  const notes = [];

  const requiredPairs = [
    ['sweet quest-card bg', 'body[data-theme="sweet"] .quest-card {', 'rgba(255, 255, 255, 0.84)'],
    ['sweet quest-card title', 'body[data-theme="sweet"] .quest-card__title {', '#3D2633'],
    ['sweet reward chip stardust bg', 'body[data-theme="sweet"] .quest-reward-chip[data-reward-type="stardust"]', '#FFF1D8'],
    ['sweet reward chip stardust text', 'body[data-theme="sweet"] .quest-reward-chip[data-reward-type="stardust"]', '#8A4F10'],
    ['sweet claim button bg', 'body[data-theme="sweet"] .quest-claim-button {', '#C73578'],
    ['sweet claim button text', 'body[data-theme="sweet"] .quest-claim-button {', '#FFFFFF'],
    ['sweet active tab bg', 'body[data-theme="sweet"] .quest-tab.is-active {', '#C73578'],
    ['sweet active tab text', 'body[data-theme="sweet"] .quest-tab.is-active {', '#FFFFFF'],
    ['default quest-card bg', 'body[data-theme="default"] .quest-card {', 'rgba(20, 26, 46, 0.78)'],
    ['default quest-card title', 'body[data-theme="default"] .quest-card__title {', '#F4F7FF'],
    ['default reward chip stardust text', 'body[data-theme="default"] .quest-reward-chip[data-reward-type="stardust"]', '#FDE68A'],
  ];

  for (const [label, selector, color] of requiredPairs) {
    const idx = cssText.indexOf(selector);
    if (idx === -1) throw new Error(`缺少 ${selector}`);
    const block = cssText.slice(idx, idx + 220);
    if (!block.includes(color)) throw new Error(`${label} 未使用 ${color}`);
    stats.push(`${label}=ok`);
  }

  // 淺底白字 / 粉底淡粉字風險（限 V2.5.0 quest 區塊）
  const blockIdx = cssText.indexOf('V2.5.0 — 冒險任務');
  if (blockIdx === -1) {
    notes.push('styles.css 缺少 V2.5.0 冒險任務區塊標記');
  } else {
    const questBlock = cssText.slice(blockIdx);
    if (/body\[data-theme="sweet"\] \.quest-card__title \{[^}]*#FFF/i.test(questBlock)) {
      notes.push('sweet quest 卡片標題疑似白字（淺底風險）');
    }
    if (/body\[data-theme="sweet"\] \.quest-card__description \{[^}]*#FFC/i.test(questBlock)) {
      notes.push('sweet quest 描述疑似淡色（粉底風險）');
    }
    stats.push('sweet quest contrast 區塊=ok');
  }

  const summary = stats.join(' | ');
  if (notes.length) return `ok with notes: ${notes.join('; ')} | ${summary}`;
  return summary;
}

/**
 * V2.7.1 — 冒險任務容器視覺統一檢查（參考每日祝福卡片設計語言）
 * 只檢查與回報，不會自動改資料。
 */
async function checkQuestPanelVisual() {
  const [cssRes, indexRes, uiRes] = await Promise.all([
    fetch('./src/styles.css'),
    fetch('./index.html'),
    fetch('./src/ui.js'),
  ]);
  if (!cssRes.ok || !indexRes.ok || !uiRes.ok) {
    throw new Error('無法讀取 styles.css / index.html / ui.js');
  }
  const cssText = await cssRes.text();
  const indexText = await indexRes.text();
  const uiText = await uiRes.text();
  const stats = [];
  const notes = [];

  // 1. quest-panel 容器存在
  if (!indexText.includes('id="quest-panel"')) throw new Error('index.html 缺少 quest-panel 容器');
  stats.push('quest-panel 容器=ok');

  // 新結構 class 是否已在 ui.js 產出
  const requiredClasses = [
    'quest-panel__eyebrow',
    'quest-panel__subtitle',
    'quest-panel__status-badge',
    'quest-panel__summary',
    'quest-panel__footer-hint',
  ];
  for (const cls of requiredClasses) {
    if (!uiText.includes(cls)) throw new Error(`ui.js 缺少 ${cls}`);
  }
  stats.push('quest-panel 新結構 class=ok');

  // 區塊定位輔助
  const slice = (selector, len = 260) => {
    const idx = cssText.indexOf(selector);
    if (idx === -1) throw new Error(`缺少 ${selector}`);
    return cssText.slice(idx, idx + len);
  };

  // 2. sweet quest-panel 外層卡：漸層光暈 + 圓角 + 深色文字
  const sweetPanel = slice('body[data-theme="sweet"] .quest-panel__inner {', 420);
  if (!sweetPanel.includes('radial-gradient')) throw new Error('sweet quest-panel 缺少漸層光暈');
  if (!sweetPanel.includes('26px')) throw new Error('sweet quest-panel 缺少圓角 26px');
  if (!sweetPanel.includes('#3D2633')) throw new Error('sweet quest-panel 缺少深色文字 #3D2633');
  stats.push('sweet 外層卡漸層/圓角/文字=ok');

  // 3. sweet summary 小卡背景 / 數字強調
  const sweetSummary = slice('body[data-theme="sweet"] .quest-panel__summary-value {', 120);
  if (!sweetSummary.includes('#B83274')) throw new Error('sweet summary 數字未強調 #B83274');
  stats.push('sweet summary 數字強調=ok');

  // 4. sweet disabled 領取按鈕仍可辨識（深字非白字）
  const sweetDisabled = slice('body[data-theme="sweet"] .quest-claim-button:disabled {', 160);
  if (!sweetDisabled.includes('#616977')) throw new Error('sweet disabled 按鈕文字不可辨識');
  stats.push('sweet disabled 按鈕=ok');

  // 5. default quest-panel 外層卡：漸層光暈 + 圓角 + 淺色文字
  const defaultPanel = slice('body[data-theme="default"] .quest-panel__inner {', 480);
  if (!defaultPanel.includes('radial-gradient')) throw new Error('default quest-panel 缺少漸層光暈');
  if (!defaultPanel.includes('24px')) throw new Error('default quest-panel 缺少圓角 24px');
  if (!defaultPanel.includes('#F4F7FF')) throw new Error('default quest-panel 缺少文字 #F4F7FF');
  stats.push('default 外層卡漸層/圓角/文字=ok');

  // 6. 與每日祝福圓角一致性（daily-blessing-card 24px；quest 26/24px 屬同一區間）
  const dbCard = slice('.daily-blessing-card {', 120);
  if (!dbCard.includes('border-radius')) {
    notes.push('daily-blessing-card 未偵測到 border-radius，無法比對圓角一致性');
  } else {
    stats.push('與每日祝福圓角一致性=ok');
  }

  // 7. 白字放淺底風險（quest 區塊內）
  const blockIdx = cssText.indexOf('V2.5.0 — 冒險任務');
  if (blockIdx !== -1) {
    const questBlock = cssText.slice(blockIdx);
    if (/body\[data-theme="sweet"\] \.quest-panel__title \{[^}]*#FFF/i.test(questBlock)) {
      notes.push('sweet quest-panel 標題疑似白字（淺底風險）');
    }
    if (/body\[data-theme="sweet"\] \.quest-panel__subtitle \{[^}]*#F[0-9A-F]C/i.test(questBlock)) {
      notes.push('sweet quest-panel 副標疑似淡粉字（粉底風險）');
    }
  }

  const summary = stats.join(' | ');
  if (notes.length) return `ok with notes: ${notes.join('; ')} | ${summary}`;
  return summary;
}

/**
 * V2.6.0 — 寵物羈絆解放系統檢查（靜態 + 執行期）
 * 只檢查與回報，不會自動清除資料。
 */
async function checkBondSystem() {
  const [collectionRes, dialogueRes, uiRes, backupRes] = await Promise.all([
    fetch('./src/collectionService.js'),
    fetch('./src/companionDialogueService.js'),
    fetch('./src/ui.js'),
    fetch('./src/backupService.js'),
  ]);
  if (!collectionRes.ok || !dialogueRes.ok || !uiRes.ok || !backupRes.ok) {
    throw new Error('無法讀取 collection / dialogue / ui / backup');
  }

  const collectionText = await collectionRes.text();
  const dialogueText = await dialogueRes.text();
  const uiText = await uiRes.text();
  const backupText = await backupRes.text();
  const notes = [];
  const stats = [];

  // 3/4/8. 必要 API 存在
  const requiredApis = [
    'export function normalizeBondUnlocks',
    'export async function updatePetBondUnlocks',
    'export async function getPetBondUnlockStatus',
    'export function getBondUnlocksByLevel',
    'export async function hasBondLiberated',
  ];
  for (const sig of requiredApis) {
    if (!collectionText.includes(sig)) throw new Error(`collectionService 缺少 ${sig}`);
  }
  stats.push('bond API=ok');

  // normalizeEntry 是否整合 bondUnlocks（migration 支援）
  if (!/normalizeEntry[\s\S]{0,600}bondUnlocks:\s*normalizeBondUnlocks/.test(collectionText)) {
    throw new Error('normalizeEntry 未整合 normalizeBondUnlocks（舊資料 migration 可能失效）');
  }
  stats.push('normalizeEntry 補 bondUnlocks=ok');

  // 9. companion dialogue 是否支援 bond lines
  if (!dialogueText.includes('BOND_DIALOGUES') || !dialogueText.includes('getBondDialogueLine')) {
    throw new Error('companionDialogueService 缺少羈絆台詞（BOND_DIALOGUES / getBondDialogueLine）');
  }
  stats.push('bond dialogue=ok');

  // 10. UI 是否有 bond-section 容器與徽章
  if (!uiText.includes('bond-section')) throw new Error('ui.js 缺少 bond-section 容器');
  if (!uiText.includes('bond-badge')) throw new Error('ui.js 缺少 bond-badge');
  if (!uiText.includes('updatePetBondUnlocks')) throw new Error('ui.js 未使用 updatePetBondUnlocks');
  stats.push('bond UI=ok');

  // 7. backup 是否包含 bondUnlocks（collection 走 normalizeCollectionItem→normalizeEntry）
  if (!backupText.includes('normalizeCollectionItem')) {
    throw new Error('backupService 未使用 normalizeCollectionItem');
  }
  stats.push('backup bondUnlocks=ok');

  // 執行期：collection item bondUnlocks 完整性、與 bondLevel 一致性、Lv.5 解放
  const items = await dbGetAll(STORES.COLLECTION);
  const requiredFields = ['dialogueLv2', 'badgeLv3', 'homeEffectLv4', 'bondFrameLv5', 'bondStoryLv5', 'bondLiberated', 'notifiedLevels'];
  let liberatedCount = 0;
  let inconsistent = 0;
  for (const raw of items) {
    const item = normalizeCollectionItem(raw);
    const bu = item.bondUnlocks;
    if (!bu || typeof bu !== 'object') {
      throw new Error(`圖鑑 ${item.petId} 缺少 bondUnlocks`);
    }
    for (const field of requiredFields) {
      if (!(field in bu)) {
        throw new Error(`圖鑑 ${item.petId} bondUnlocks 缺少欄位 ${field}`);
      }
    }
    if (!Array.isArray(bu.notifiedLevels)) {
      throw new Error(`圖鑑 ${item.petId} notifiedLevels 必須為陣列`);
    }
    const lv = item.bondLevel ?? 1;
    // 6. bondLevel 與 bondUnlocks 一致
    const expect = {
      dialogueLv2: lv >= 2,
      badgeLv3: lv >= 3,
      homeEffectLv4: lv >= 4,
      bondFrameLv5: lv >= 5,
      bondStoryLv5: lv >= 5,
      bondLiberated: lv >= 5,
    };
    for (const [k, v] of Object.entries(expect)) {
      if (bu[k] !== v) inconsistent += 1;
    }
    // 5. Lv.5 標示
    if (lv >= 5) {
      liberatedCount += 1;
      if (!bu.bondLiberated) {
        throw new Error(`圖鑑 ${item.petId} 已達 Lv.5 但未標示 bondLiberated`);
      }
    }
  }
  if (inconsistent > 0) {
    notes.push(`${inconsistent} 個旗標與 bondLevel 不一致（重新開啟 App 會 normalize 修正）`);
  }
  stats.push(`collection=${items.length} 已解放=${liberatedCount}`);

  const summary = stats.join(' | ');
  if (notes.length) return `ok with notes: ${notes.join('; ')} | ${summary}`;
  return summary;
}

/**
 * V2.6.0 — 羈絆 UI 可讀性檢查（sweet / default 對比度）
 */
async function checkBondContrast() {
  const cssRes = await fetch('./src/styles.css');
  if (!cssRes.ok) throw new Error('無法讀取 styles.css');
  const cssText = await cssRes.text();
  const stats = [];
  const notes = [];

  const requiredPairs = [
    ['sweet bond badge bg', 'body[data-theme="sweet"] .bond-badge {', '#EEE9FF'],
    ['sweet bond badge text', 'body[data-theme="sweet"] .bond-badge {', '#4E3BA8'],
    ['sweet bond story bg', 'body[data-theme="sweet"] .bond-story {', '#FFF8FC'],
    ['sweet bond story text', 'body[data-theme="sweet"] .bond-story {', '#3D2633'],
    ['sweet bond liberated label', 'body[data-theme="sweet"] .bond-liberated-label {', '#FFF1D8'],
    ['sweet bond liberated text', 'body[data-theme="sweet"] .bond-liberated-label {', '#8A4F10'],
    ['default bond badge text', 'body[data-theme="default"] .bond-badge {', '#DDD6FE'],
    ['default bond story text', 'body[data-theme="default"] .bond-story {', '#F4F7FF'],
  ];

  for (const [label, selector, color] of requiredPairs) {
    const idx = cssText.indexOf(selector);
    if (idx === -1) throw new Error(`缺少 ${selector}`);
    const block = cssText.slice(idx, idx + 260);
    if (!block.includes(color)) throw new Error(`${label} 未使用 ${color}`);
    stats.push(`${label}=ok`);
  }

  // 淺底白字 / 粉底淡粉字風險（限 V2.6.0 羈絆區塊）
  const blockIdx = cssText.indexOf('V2.6.0 — 寵物羈絆解放系統');
  if (blockIdx === -1) {
    notes.push('styles.css 缺少 V2.6.0 羈絆區塊標記');
  } else {
    const bondBlock = cssText.slice(blockIdx);
    if (/body\[data-theme="sweet"\] \.bond-badge \{[^}]*color:\s*#FFF/i.test(bondBlock)) {
      notes.push('sweet 羈絆徽章疑似白字（淺底風險）');
    }
    if (/body\[data-theme="sweet"\] \.bond-story \{[^}]*color:\s*#FFC/i.test(bondBlock)) {
      notes.push('sweet 羈絆故事疑似淡色（粉底風險）');
    }
    stats.push('sweet bond contrast 區塊=ok');
  }

  const summary = stats.join(' | ');
  if (notes.length) return `ok with notes: ${notes.join('; ')} | ${summary}`;
  return summary;
}

/**
 * V2.6.1 — 寵物原圖放大檢視器檢查（靜態）
 * 檢查 openPetImageViewer / closePetImageViewer / 三處入口 / 關閉方式 / z-index。
 */
async function checkPetImageViewer() {
  const [uiRes, swRes] = await Promise.all([
    fetch('./src/ui.js'),
    fetch('./service-worker.js'),
  ]);
  if (!uiRes.ok) throw new Error('無法讀取 ui.js');
  const uiText = await uiRes.text();
  const stats = [];
  const notes = [];

  // 1/2/4/5. 核心 API
  const requiredApis = [
    'export function openPetImageViewer',
    'export function openPetImageViewerBySrc',
    'export function closePetImageViewer',
  ];
  for (const sig of requiredApis) {
    if (!uiText.includes(sig)) throw new Error(`ui.js 缺少 ${sig}`);
  }
  stats.push('viewer API=ok');

  // 直接點圖片開原圖（撫摸頁面 / 陪伴預覽）
  if (!uiText.includes('openPetImageViewer(companion.id)')) {
    throw new Error('撫摸頁面圖片缺少開啟原圖入口（openPetImageViewer(companion.id)）');
  }
  // 詳情頁點圖片入口
  if (!uiText.includes('detail-view-image')) {
    throw new Error('寵物詳情頁缺少開啟原圖入口（detail-view-image）');
  }
  stats.push('點圖片入口（撫摸頁 / 詳情頁）=ok');

  // 6. 關閉按鈕 7. 背景關閉
  if (!uiText.includes('pet-image-viewer__close')) throw new Error('viewer 缺少關閉按鈕');
  if (!uiText.includes('data-viewer-close')) throw new Error('viewer 缺少背景/關閉點擊機制');
  // 8. Escape 關閉
  if (!uiText.includes('handlePetImageViewerKeydown')) {
    throw new Error('viewer 缺少 Escape 關閉支援');
  }
  stats.push('關閉方式（X/背景/Escape）=ok');

  // 9. z-index 高於一般 modal（透過 SW 版本 + CSS 檢查於 contrast 檢查中補充）
  if (swRes.ok) {
    const swText = await swRes.text();
    if (!swText.includes('v261')) notes.push('service-worker CACHE_NAME 可能未更新為 v261');
  }

  const summary = stats.join(' | ');
  if (notes.length) return `ok with notes: ${notes.join('; ')} | ${summary}`;
  return summary;
}

/**
 * V2.6.1 — 原圖檢視器可讀性與 z-index 檢查（sweet / default）
 */
async function checkPetImageViewerContrast() {
  const cssRes = await fetch('./src/styles.css');
  if (!cssRes.ok) throw new Error('無法讀取 styles.css');
  const cssText = await cssRes.text();
  const stats = [];
  const notes = [];

  // 9. z-index 高於一般 modal（modal-overlay = 200）
  const zIdx = cssText.match(/\.pet-image-viewer\s*\{[^}]*z-index:\s*(\d+)/);
  if (!zIdx) throw new Error('缺少 .pet-image-viewer z-index');
  if (Number(zIdx[1]) <= 200) throw new Error(`viewer z-index (${zIdx[1]}) 未高於一般 modal(200)`);
  stats.push(`z-index=${zIdx[1]}`);

  // 10/11. sweet / default viewer 有明確 background + color
  const requiredPairs = [
    ['sweet viewer content bg', 'body[data-theme="sweet"] .pet-image-viewer__content {', '#FFFFFF'],
    ['sweet viewer content text', 'body[data-theme="sweet"] .pet-image-viewer__content {', '#3D2633'],
    ['sweet viewer close text', 'body[data-theme="sweet"] .pet-image-viewer__close {', '#B83274'],
    ['default viewer content bg', 'body[data-theme="default"] .pet-image-viewer__content {', '#141A2E'],
    ['default viewer content text', 'body[data-theme="default"] .pet-image-viewer__content {', '#F4F7FF'],
  ];
  for (const [label, selector, color] of requiredPairs) {
    const idx = cssText.indexOf(selector);
    if (idx === -1) throw new Error(`缺少 ${selector}`);
    const block = cssText.slice(idx, idx + 220);
    if (!block.includes(color)) throw new Error(`${label} 未使用 ${color}`);
    stats.push(`${label}=ok`);
  }

  // 12/13. 淺底白字 / 粉底淡粉字風險（限 V2.6.1 viewer 區塊）
  const blockIdx = cssText.indexOf('V2.6.1 — 寵物原圖放大檢視器');
  if (blockIdx === -1) {
    notes.push('styles.css 缺少 V2.6.1 viewer 區塊標記');
  } else {
    const vb = cssText.slice(blockIdx);
    if (/body\[data-theme="sweet"\] \.pet-image-viewer__content \{[^}]*color:\s*#FFF/i.test(vb)) {
      notes.push('sweet viewer 內容疑似白字（淺底風險）');
    }
    if (/body\[data-theme="sweet"\] \.pet-image-viewer__hint \{[^}]*color:\s*#FFC/i.test(vb)) {
      notes.push('sweet viewer 提示疑似淡色（粉底風險）');
    }
  }

  const summary = stats.join(' | ');
  if (notes.length) return `ok with notes: ${notes.join('; ')} | ${summary}`;
  return summary;
}

/**
 * V2.7.2 — 探險派遣流程直覺化檢查（靜態）
 * 只檢查與回報，不會自動改資料。
 */
async function checkExpeditionDispatchUX() {
  const [uiRes, cssRes] = await Promise.all([
    fetch('./src/ui.js'),
    fetch('./src/styles.css'),
  ]);
  if (!uiRes.ok || !cssRes.ok) throw new Error('無法讀取 ui.js / styles.css');
  const uiText = await uiRes.text();
  const cssText = await cssRes.text();
  const stats = [];
  const notes = [];

  // 1-3. 三個核心函式存在
  for (const fn of [
    'function openExpeditionDispatchModal',
    'function closeExpeditionDispatchModal',
    'async function confirmExpeditionDispatch',
  ]) {
    if (!uiText.includes(fn)) throw new Error(`ui.js 缺少 ${fn}`);
  }
  stats.push('dispatch 函式=ok');

  // 4. 地區卡片有派遣按鈕
  if (!uiText.includes('expedition-dispatch-button') || !uiText.includes("data-action=\"open-dispatch\"")) {
    throw new Error('地區卡片缺少派遣按鈕（open-dispatch）');
  }
  stats.push('派遣按鈕=ok');

  // 5. Modal 能取得 areaId
  if (!uiText.includes('dispatchAreaId')) throw new Error('派遣 Modal 未追蹤 areaId');
  stats.push('areaId=ok');

  // 6. 只顯示已擁有寵物
  if (!uiText.includes('getDispatchablePetsSorted') || !uiText.includes('getOwnedPets')) {
    throw new Error('派遣 Modal 未從已擁有寵物篩選');
  }
  stats.push('已擁有寵物=ok');

  // 7-9. 確認派遣時的檢查
  const confirmIdx = uiText.indexOf('async function confirmExpeditionDispatch');
  const confirmBody = confirmIdx === -1 ? '' : uiText.slice(confirmIdx, confirmIdx + 1400);
  if (!confirmBody.includes('請先選擇出發寵物')) throw new Error('confirm 未檢查 petId');
  if (!confirmBody.includes('冒險能量不足')) throw new Error('confirm 未檢查冒險能量');
  if (!confirmBody.includes('目前已有探險進行中')) throw new Error('confirm 未檢查進行中探險');
  stats.push('confirm 檢查=ok');

  // 10. 仍使用原本 startExpedition
  if (!confirmBody.includes('startExpedition(petId, areaId')) {
    throw new Error('confirm 未使用原本 startExpedition 邏輯');
  }
  stats.push('startExpedition=ok');

  // 11. 更新 daily / weekly quest progress
  if (!confirmBody.includes("trackQuest('start_expedition')")) {
    throw new Error('派遣成功未更新每日任務進度');
  }
  if (!uiText.includes("trackQuest('complete_expedition')")) {
    throw new Error('探險完成未更新每週任務進度');
  }
  stats.push('quest 進度=ok');

  // 12. 探險完成後仍更新探索度
  if (!uiText.includes('applyExplorationOnClaim')) {
    throw new Error('探險完成後未更新探索度');
  }
  stats.push('探索度整合=ok');

  // 13-14. Modal 主題背景 / 文字
  const sweetModal = (() => {
    const i = cssText.indexOf('body[data-theme="sweet"] .expedition-dispatch-modal__content {');
    return i === -1 ? '' : cssText.slice(i, i + 200);
  })();
  if (!sweetModal.includes('#FFFFFF') || !sweetModal.includes('#3D2633')) {
    throw new Error('sweet dispatch modal 缺少明確 background / color');
  }
  const defaultModal = (() => {
    const i = cssText.indexOf('body[data-theme="default"] .expedition-dispatch-modal__content {');
    return i === -1 ? '' : cssText.slice(i, i + 220);
  })();
  if (!defaultModal.includes('#141A2E') || !defaultModal.includes('#F4F7FF')) {
    throw new Error('default dispatch modal 缺少明確 background / color');
  }
  stats.push('modal 主題色=ok');

  // 15-16. 白字放淺底 / 淡粉字放粉底風險（限 V2.7.2 區塊）
  const blockIdx = cssText.indexOf('V2.7.2 — 探險派遣流程直覺化');
  if (blockIdx !== -1) {
    const block = cssText.slice(blockIdx);
    if (/body\[data-theme="sweet"\] \.expedition-pet-option__name \{[^}]*#FFF/i.test(block)) {
      notes.push('sweet 寵物名稱疑似白字（淺底風險）');
    }
    if (/body\[data-theme="sweet"\] \.expedition-dispatch-area__name \{[^}]*#F[0-9A-F]C/i.test(block)) {
      notes.push('sweet 地區名稱疑似淡粉字（粉底風險）');
    }
  }

  const summary = stats.join(' | ');
  if (notes.length) return `ok with notes: ${notes.join('; ')} | ${summary}`;
  return summary;
}

/**
 * V2.7.0 — 探險地圖探索度系統檢查（靜態 + 執行期）
 * 只檢查與回報，不會自動清除資料。
 */
async function checkExplorationSystem() {
  const [svcRes, uiRes, indexRes, backupRes, achRes, swRes] = await Promise.all([
    fetch('./src/explorationService.js'),
    fetch('./src/ui.js'),
    fetch('./index.html'),
    fetch('./src/backupService.js'),
    fetch('./data/achievements.json'),
    fetch('./service-worker.js'),
  ]);
  if (!svcRes.ok) throw new Error('無法讀取 explorationService.js');
  if (!uiRes.ok || !indexRes.ok || !backupRes.ok || !achRes.ok || !swRes.ok) {
    throw new Error('無法讀取 ui / index / backup / achievements / service-worker');
  }

  const svcText = await svcRes.text();
  const uiText = await uiRes.text();
  const indexText = await indexRes.text();
  const backupText = await backupRes.text();
  const achievements = await achRes.json();
  const swText = await swRes.text();
  const notes = [];
  const stats = [];

  // 6/7. 必要 API 存在
  const requiredApis = [
    'export function normalizeExplorationProgress',
    'export async function initExplorationProgress',
    'export async function getAreaExploration',
    'export function getExplorationMilestones',
    'export async function getUnlockedAreaStories',
    'export async function updateAreaExplorationProgress',
    'export async function claimExplorationMilestone',
    'export async function isAreaFullyExplored',
  ];
  for (const sig of requiredApis) {
    if (!svcText.includes(sig)) throw new Error(`explorationService 缺少 ${sig}`);
  }
  stats.push('exploration API=ok');

  // 8. 探險完成領獎是否會更新 explorationProgress
  if (!uiText.includes('applyExplorationOnClaim') || !uiText.includes('updateAreaExplorationProgress')) {
    throw new Error('ui.js 探險領獎未接入探索度更新');
  }
  if (!/claim-expedition[\s\S]{0,600}applyExplorationOnClaim/.test(uiText)) {
    notes.push('claim-expedition 流程可能未呼叫 applyExplorationOnClaim');
  }
  if (!uiText.includes('claimExplorationMilestone')) {
    throw new Error('ui.js 未使用 claimExplorationMilestone');
  }
  stats.push('ui 領獎接入探索度=ok');

  // 11. 探險頁 exploration-panel 容器
  if (!indexText.includes('id="exploration-panel"')) {
    throw new Error('index.html 缺少 exploration-panel 容器');
  }
  if (!uiText.includes('function renderExplorationPanel')) {
    throw new Error('ui.js 缺少 renderExplorationPanel');
  }
  stats.push('exploration UI 容器=ok');

  // 9/10. backup 是否包含 explorationProgress 且 migration 支援
  if (!backupText.includes('explorationProgress')) {
    throw new Error('backupService 未包含 explorationProgress');
  }
  if (!backupText.includes('normalizeExplorationProgress')) {
    throw new Error('backupService 未使用 normalizeExplorationProgress');
  }
  stats.push('backup explorationProgress=ok');

  // 12. 成就是否支援探索成就
  const explorationAch = achievements.filter((a) =>
    typeof a.conditionType === 'string' && a.conditionType.startsWith('exploration_')
  );
  if (explorationAch.length < 5) {
    throw new Error(`探索成就數量不足（${explorationAch.length}/5）`);
  }
  stats.push(`探索成就=${explorationAch.length}`);

  if (!swText.includes('src/explorationService.js')) {
    notes.push('service-worker 未 precache explorationService.js');
  } else {
    stats.push('SW precache=ok');
  }

  // 執行期：explorationProgress 結構與資料合理性
  const ep = await getExplorationProgress();
  if (!ep || typeof ep !== 'object') throw new Error('explorationProgress 不存在');
  // 1/2. explorationProgress 與四個 area 是否存在
  for (const areaId of EXPLORATION_AREA_IDS) {
    const area = ep.areas?.[areaId];
    if (!area) throw new Error(`探索地區缺少: ${areaId}`);
    // 3. progress 0～100
    if (typeof area.progress !== 'number' || area.progress < 0 || area.progress > 100) {
      throw new Error(`${areaId} progress 不合理: ${area.progress}`);
    }
    // 4. completedRuns 數字
    if (typeof area.completedRuns !== 'number') {
      throw new Error(`${areaId} completedRuns 型別錯誤`);
    }
    // 5. claimedMilestones array
    if (!Array.isArray(area.claimedMilestones)) {
      throw new Error(`${areaId} claimedMilestones 必須為陣列`);
    }
  }
  if (typeof ep.stats?.totalExplorationRuns !== 'number'
    || typeof ep.stats?.totalMilestonesClaimed !== 'number') {
    notes.push('exploration stats 型別可能錯誤');
  }
  stats.push(`areas=${EXPLORATION_AREA_IDS.length}`);

  const summary = stats.join(' | ');
  if (notes.length) return `ok with notes: ${notes.join('; ')} | ${summary}`;
  return summary;
}

/**
 * V2.7.0 — 探索度 UI 可讀性檢查（sweet / default 對比度）
 */
async function checkExplorationContrast() {
  const cssRes = await fetch('./src/styles.css');
  if (!cssRes.ok) throw new Error('無法讀取 styles.css');
  const cssText = await cssRes.text();
  const stats = [];
  const notes = [];

  const requiredPairs = [
    // 1. sweet area card 明確 background / color
    ['sweet exploration area card bg', 'body[data-theme="sweet"] .exploration-area-card {', '#FFFFFF'],
    ['sweet exploration area card text', 'body[data-theme="sweet"] .exploration-area-card {', '#3D2633'],
    // 2. sweet milestone 明確 background / color
    ['sweet exploration milestone bg', 'body[data-theme="sweet"] .exploration-milestone-card {', '#FFF8FC'],
    ['sweet exploration milestone text', 'body[data-theme="sweet"] .exploration-milestone-card {', '#3D2633'],
    // 3. sweet reward chip 明確 background / color
    ['sweet exploration chip stardust bg', 'body[data-theme="sweet"] .exploration-reward-chip[data-reward-type="stardust"]', '#FFF1D8'],
    ['sweet exploration chip stardust text', 'body[data-theme="sweet"] .exploration-reward-chip[data-reward-type="stardust"]', '#8A4F10'],
    // 4. sweet claim button 白字配深色背景
    ['sweet exploration claim button bg', 'body[data-theme="sweet"] .exploration-claim-button {', '#C73578'],
    ['sweet exploration claim button text', 'body[data-theme="sweet"] .exploration-claim-button {', '#FFFFFF'],
    // 8. sweet 進度條文字對比
    ['sweet exploration progress bar text', 'body[data-theme="sweet"] .exploration-progress-bar__text {', '#3D2633'],
    // 5. default exploration card 清楚
    ['default exploration area card bg', 'body[data-theme="default"] .exploration-area-card {', '#141A2E'],
    ['default exploration area card text', 'body[data-theme="default"] .exploration-area-card {', '#F4F7FF'],
    ['default exploration chip stardust text', 'body[data-theme="default"] .exploration-reward-chip[data-reward-type="stardust"]', '#FDE68A'],
    ['default exploration progress bar text', 'body[data-theme="default"] .exploration-progress-bar__text {', '#F4F7FF'],
  ];

  for (const [label, selector, color] of requiredPairs) {
    const idx = cssText.indexOf(selector);
    if (idx === -1) throw new Error(`缺少 ${selector}`);
    const block = cssText.slice(idx, idx + 240);
    if (!block.includes(color)) throw new Error(`${label} 未使用 ${color}`);
    stats.push(`${label}=ok`);
  }

  // 6/7. 淺底白字 / 粉底淡粉字風險（限 V2.7.0 探索度區塊）
  const blockIdx = cssText.indexOf('V2.7.0 — 探險地圖探索度系統');
  if (blockIdx === -1) {
    notes.push('styles.css 缺少 V2.7.0 探索度區塊標記');
  } else {
    const block = cssText.slice(blockIdx);
    if (/body\[data-theme="sweet"\] \.exploration-area-card \{[^}]*color:\s*#FFF/i.test(block)) {
      notes.push('sweet 探索地區卡片疑似白字（淺底風險）');
    }
    if (/body\[data-theme="sweet"\] \.exploration-milestone-card__title \{[^}]*color:\s*#FFC/i.test(block)) {
      notes.push('sweet 里程碑標題疑似淡粉字（粉底風險）');
    }
    stats.push('sweet exploration contrast 區塊=ok');
  }

  const summary = stats.join(' | ');
  if (notes.length) return `ok with notes: ${notes.join('; ')} | ${summary}`;
  return summary;
}

/**
 * V2.7.3 — 全站字體大小與排版比例統一檢查（靜態分析 styles.css）
 * 只檢查與回報，不會自動清除或修改任何資料。
 */
async function checkTypographyScale() {
  const cssRes = await fetch('./src/styles.css');
  if (!cssRes.ok) throw new Error('無法讀取 styles.css');
  const cssText = await cssRes.text();
  const notes = [];
  const stats = [];

  // 1. 是否定義 typography tokens
  const requiredTokens = [
    '--font-size-xs', '--font-size-sm', '--font-size-md', '--font-size-base',
    '--font-size-lg', '--font-size-xl', '--font-size-2xl', '--font-size-3xl',
    '--line-height-tight', '--line-height-snug', '--line-height-normal', '--line-height-relaxed',
    '--font-weight-regular', '--font-weight-medium', '--font-weight-bold',
    '--font-weight-heavy', '--font-weight-black',
  ];
  for (const token of requiredTokens) {
    if (!cssText.includes(token)) throw new Error(`typography token 缺少 ${token}`);
  }
  stats.push(`tokens=${requiredTokens.length}`);

  // xs token 不得小於 0.7rem（手機可讀性下限）
  const xsMatch = cssText.match(/--font-size-xs:\s*([0-9.]+)rem/);
  if (xsMatch && Number(xsMatch[1]) < 0.7) {
    throw new Error(`--font-size-xs (${xsMatch[1]}rem) 小於 0.7rem`);
  }
  if (xsMatch) stats.push(`xs=${xsMatch[1]}rem`);

  // 2. V2.7.3 統一區塊標記
  const blockIdx = cssText.indexOf('V2.7.3 — 全站字體大小與排版比例統一');
  if (blockIdx === -1) throw new Error('styles.css 缺少 V2.7.3 typography 區塊標記');
  const block = cssText.slice(blockIdx);
  stats.push('V2.7.3 typography 區塊=ok');

  // 區塊內定位輔助
  const blockSlice = (selector, len = 240) => {
    const i = block.indexOf(selector);
    if (i === -1) throw new Error(`V2.7.3 區塊缺少 ${selector}`);
    return block.slice(i, i + len);
  };

  // 4. 按鈕文字使用 token（不小於 0.88rem → 使用 --font-size-md=0.92rem）
  const btnBlock = blockSlice('.btn {');
  if (!btnBlock.includes('var(--font-size-md)')) {
    throw new Error('按鈕文字未使用 --font-size-md');
  }
  stats.push('button=md');

  // 5. badge / chip 不小於 0.72rem（使用 0.76rem）
  const badgeBlock = blockSlice('.badge,', 900);
  const badgeSizeMatch = badgeBlock.match(/font-size:\s*([0-9.]+)rem/);
  if (!badgeSizeMatch || Number(badgeSizeMatch[1]) < 0.72) {
    throw new Error('badge / chip font-size 小於 0.72rem');
  }
  stats.push(`badge=${badgeSizeMatch[1]}rem`);

  // 6. toast 文字不小於 0.82rem（md=0.92rem）
  const toastBlock = blockSlice('.toast,');
  if (!toastBlock.includes('var(--font-size-md)')) {
    notes.push('toast 可能未使用 --font-size-md');
  } else {
    stats.push('toast=md');
  }

  // 7. modal 標題使用 xl；modal 內文使用 md
  const modalTitleBlock = blockSlice('.modal-title,');
  if (!modalTitleBlock.includes('var(--font-size-xl)')) {
    notes.push('modal 標題可能未使用 --font-size-xl');
  } else {
    stats.push('modal-title=xl');
  }
  const modalBodyBlock = blockSlice('.modal-body {');
  if (!modalBodyBlock.includes('var(--font-size-md)')) {
    notes.push('modal 內文可能未使用 --font-size-md');
  } else {
    stats.push('modal-body=md');
  }

  // 8. bottom nav label 不過小（xs=0.72rem ≥ 0.68rem）
  const navBlock = blockSlice('.nav-label {');
  if (!navBlock.includes('var(--font-size-xs)')) {
    notes.push('底部導航 label 可能未使用 --font-size-xs');
  } else {
    stats.push('nav-label=xs');
  }

  // 頁面 / 卡片標題層級
  const pageTitleBlock = blockSlice('.page-title {');
  if (!pageTitleBlock.includes('var(--font-size-2xl)')) {
    notes.push('頁面標題可能未使用 --font-size-2xl');
  } else {
    stats.push('page-title=2xl');
  }

  // 3. 是否仍存在 font-size < 0.7rem 或 9/10/11px 的過小字（全域掃描 → 回報）
  const sizeRegex = /font-size:\s*([0-9.]+)(px|rem)/g;
  let m;
  let tinyPx = 0;
  let tinyRem = 0;
  const tinySamples = [];
  while ((m = sizeRegex.exec(cssText)) !== null) {
    const value = Number(m[1]);
    const unit = m[2];
    if (unit === 'px' && value <= 11) {
      tinyPx += 1;
      if (tinySamples.length < 6) tinySamples.push(`${value}px`);
    } else if (unit === 'rem' && value < 0.7) {
      tinyRem += 1;
      if (tinySamples.length < 6) tinySamples.push(`${value}rem`);
    }
  }
  stats.push(`剩餘 ≤11px=${tinyPx} / <0.7rem=${tinyRem}`);
  if (tinyPx + tinyRem > 0) {
    notes.push(`仍有過小字 ${tinyPx + tinyRem} 處（例: ${tinySamples.join(', ')}）— 多為裝飾/轉盤標籤，請確認未承載重要資訊`);
  }

  // 9/10. sweet / default 主題主要文字對比色仍存在
  if (!cssText.includes('#3D2633')) {
    throw new Error('sweet 主題主文字色 #3D2633 缺失（低對比風險）');
  }
  if (!cssText.includes('#F4F7FF')) {
    throw new Error('default 主題主文字色 #F4F7FF 缺失（低對比風險）');
  }
  stats.push('sweet #3D2633 / default #F4F7FF=ok');

  // 11. reward chip 是否有清楚 font-size / color（沿用既有 quest / exploration reward chip）
  if (!cssText.includes('.quest-reward-chip') || !cssText.includes('.exploration-reward-chip')) {
    notes.push('reward chip selector 可能缺失');
  } else {
    stats.push('reward chip=ok');
  }

  // 12. disabled 狀態文字顏色（sweet 保留可辨識深字 #616977）
  if (!cssText.includes('#616977') && !cssText.includes('#777F8D')) {
    notes.push('sweet disabled 文字可辨識色可能缺失');
  } else {
    stats.push('disabled 可辨識=ok');
  }

  const summary = stats.join(' | ');
  if (notes.length) return `ok with notes: ${notes.join('; ')} | ${summary}`;
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
  await runCheck('version info', checkVersionInfo);
  await runCheck('sweet toast contrast', checkSweetToastContrast);
  await runCheck('gacha sync', checkGachaSync);
  await runCheck('sweet contrast', checkSweetContrast);
  await runCheck('summon reveal', checkSummonReveal);
  await runCheck('quest system', checkQuestSystem);
  await runCheck('quest contrast', checkQuestContrast);
  await runCheck('quest panel visual', checkQuestPanelVisual);
  await runCheck('bond system', checkBondSystem);
  await runCheck('bond contrast', checkBondContrast);
  await runCheck('pet image viewer', checkPetImageViewer);
  await runCheck('pet image viewer contrast', checkPetImageViewerContrast);
  await runCheck('exploration system', checkExplorationSystem);
  await runCheck('exploration contrast', checkExplorationContrast);
  await runCheck('expedition dispatch UX', checkExpeditionDispatchUX);
  await runCheck('typography scale', checkTypographyScale);
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
