/**
 * 開發用 App 健康檢查 — 在 console 執行 runAppHealthCheck()
 */
import { openDB, dbGetAll, dbPut, dbDelete, STORES } from './db.js';
import { normalizeTask } from './taskMigration.js';
import { normalizeWallet } from './rewardService.js';
import { normalizeEntry, normalizeCollectionItem } from './collectionService.js';
import { normalizeHabit } from './habitService.js';
import { normalizeAchievementsState, loadAchievementsCatalog, loadTitlesCatalog } from './achievementService.js';
import { normalizeUserPreferences } from './preferencesService.js';
import { normalizeGachaStats } from './gachaService.js';

const DATA_FILES = [
  { path: './data/pets.json', label: 'pets.json' },
  { path: './data/pools.json', label: 'pools.json' },
  { path: './data/expeditions.json', label: 'expeditions.json' },
  { path: './data/categories.json', label: 'categories.json' },
  { path: './data/achievements.json', label: 'achievements.json' },
  { path: './data/titles.json', label: 'titles.json' },
  { path: './data/pets-lore.json', label: 'pets-lore.json' },
];

const PROBE_KEY = '_healthCheckProbe';

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
}

async function checkCollection() {
  const items = await dbGetAll(STORES.COLLECTION);
  for (const item of items) {
    const normalized = normalizeCollectionItem(item);
    if (!normalized?.petId) throw new Error(`圖鑑項目無法正規化: ${item?.petId ?? '(無 petId)'}`);
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
  normalizeUserPreferences(prefsRow);
}

async function checkServiceWorker() {
  if (!('serviceWorker' in navigator)) return 'unsupported';
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return 'not registered';
  return reg.active ? 'ok' : 'installing';
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
  } else {
    console.log('All checks passed.');
  }

  return { ok: errors.length === 0, results, errors };
}
