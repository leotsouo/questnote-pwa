/**
 * 備份與恢復服務 — QuestNote V2.1.4
 * 支援匯出、驗證、正規化與安全覆蓋恢復
 */
import { exportTasks } from './taskService.js';
import { getWallet, normalizeWallet, DEFAULT_MATERIALS } from './rewardService.js';
import { replaceAllStores } from './db.js';
import { exportCollection, normalizeCollectionItem } from './collectionService.js';
import { exportGachaStats, normalizeGachaStats } from './gachaService.js';
import { exportExpeditions, normalizeExpedition } from './expeditionService.js';
import {
  exportAchievementsState,
  normalizeAchievementsState,
} from './achievementService.js';
import { exportTaskStats, normalizeTaskStats } from './taskStatsService.js';
import { exportHabits, normalizeHabit } from './habitService.js';
import { getUserPreferences, normalizeUserPreferences } from './preferencesService.js';
import {
  exportInventory,
  exportWorkshopStats,
  normalizeInventory,
  normalizeWorkshopStats,
} from './workshopService.js';
import { normalizeTask, migrateTasks } from './taskMigration.js';
import { getTodayDateString } from './taskFilterService.js';

export const APP_VERSION = '2.1.4';
const APP_NAME = 'QuestNote';
const SUPPORTED_VERSIONS = ['1.8', '1.8.1', '1.8.2', '2.0', '2.0.0', '2.1', '2.1.1', '2.1.2', '2.1.4'];
const WALLET_KEY = 'wallet';
const GACHA_STATS_KEY = 'gachaStats';
const ACHIEVEMENTS_KEY = 'achievements';
const TASK_STATS_KEY = 'taskStats';
const PREFS_KEY = 'userPreferences';

const DATA_KEYS = [
  'tasks',
  'wallet',
  'collection',
  'gachaStats',
  'expeditions',
  'materials',
  'achievements',
  'titles',
  'habits',
  'userPreferences',
  'settings',
  'taskStats',
  'inventory',
  'workshopStats',
];

/**
 * 解析版本字串為可比較的數字陣列
 * @param {string|null|undefined} version
 * @returns {number[]|null}
 */
function parseVersion(version) {
  if (!version || typeof version !== 'string') return null;
  const parts = version.trim().split('.').map((p) => parseInt(p, 10));
  if (parts.some((n) => Number.isNaN(n))) return null;
  return parts;
}

/**
 * 比較兩個版本
 * @returns {-1|0|1}
 */
function compareVersions(a, b) {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  if (!va && !vb) return 0;
  if (!va) return -1;
  if (!vb) return 1;
  const len = Math.max(va.length, vb.length);
  for (let i = 0; i < len; i += 1) {
    const diff = (va[i] ?? 0) - (vb[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

/**
 * 組裝匯出用 data 區塊
 */
function buildDataPayload({
  tasks,
  wallet,
  collection,
  gachaStats,
  expeditions,
  achievements,
  taskStats,
  habits,
  userPreferences,
  inventory,
  workshopStats,
}) {
  const walletData = {
    stardust: wallet.stardust ?? 0,
    adventureEnergy: wallet.adventureEnergy ?? 0,
    materials: wallet.materials ?? { ...DEFAULT_MATERIALS },
  };

  const gachaData = {
    ssrPity: gachaStats.ssrPity ?? 0,
    urPity: gachaStats.urPity ?? 0,
    totalPulls: gachaStats.totalPulls ?? 0,
    tenPullCount: gachaStats.tenPullCount ?? 0,
  };

  const titles = {
    unlockedTitleIds: achievements.unlockedTitleIds ?? [],
    equippedTitleId: achievements.equippedTitleId ?? null,
  };

  return {
    tasks,
    wallet: walletData,
    collection,
    gachaStats: gachaData,
    expeditions,
    materials: walletData.materials,
    achievements,
    titles,
    habits,
    userPreferences,
    settings: { ...userPreferences },
    taskStats,
    unlockedAchievementIds: achievements.unlockedAchievementIds ?? [],
    claimedAchievementIds: achievements.claimedAchievementIds ?? [],
    unlockedTitleIds: achievements.unlockedTitleIds ?? [],
    equippedTitleId: achievements.equippedTitleId ?? null,
    hasExportedBackup: achievements.hasExportedBackup ?? false,
    adventureEnergy: walletData.adventureEnergy,
    inventory,
    workshopStats,
  };
}

/**
 * 匯出完整備份 JSON
 * @returns {Promise<object>}
 */
export async function exportBackup() {
  const [
    tasks,
    wallet,
    collection,
    gachaStats,
    expeditions,
    achievements,
    taskStats,
    habits,
    userPreferences,
    inventory,
    workshopStats,
  ] = await Promise.all([
    exportTasks(),
    getWallet(),
    exportCollection(),
    exportGachaStats(),
    exportExpeditions(),
    exportAchievementsState(),
    exportTaskStats(),
    exportHabits(),
    getUserPreferences(),
    exportInventory(),
    exportWorkshopStats(),
  ]);

  const data = buildDataPayload({
    tasks,
    wallet,
    collection,
    gachaStats,
    expeditions,
    achievements,
    taskStats,
    habits,
    userPreferences,
    inventory,
    workshopStats,
  });

  return {
    appName: APP_NAME,
    app: APP_NAME,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    version: 2,
    ...data,
    data,
  };
}

/**
 * 下載 JSON 備份檔
 * @param {object} backup
 * @param {string} [filename]
 */
export function downloadBackupFile(backup, filename) {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 觸發瀏覽器下載備份檔（手動匯出）
 */
export async function downloadBackup() {
  const backup = await exportBackup();
  const date = new Date().toISOString().split('T')[0];
  downloadBackupFile(backup, `questnote-backup-${date}.json`);
  return backup;
}

/**
 * 讀取使用者選擇的 JSON 檔案
 * @param {File} file
 * @returns {Promise<object>}
 */
export function readBackupFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('未選擇檔案'));
      return;
    }

    const name = (file.name || '').toLowerCase();
    if (!name.endsWith('.json')) {
      reject(new Error('請選擇 .json 格式的備份檔'));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const text = reader.result;
        if (typeof text !== 'string' || !text.trim()) {
          reject(new Error('備份檔是空的'));
          return;
        }
        const parsed = JSON.parse(text);
        resolve(parsed);
      } catch {
        reject(new Error('JSON 格式錯誤，無法解析備份檔'));
      }
    };

    reader.onerror = () => reject(new Error('讀取備份檔失敗'));
    reader.readAsText(file);
  });
}

/**
 * 從備份物件取出原始資料（支援新舊格式）
 * @param {object} rawBackup
 */
function extractRawData(rawBackup) {
  if (!rawBackup || typeof rawBackup !== 'object') return null;

  if (rawBackup.data && typeof rawBackup.data === 'object') {
    return { ...rawBackup.data };
  }

  const flat = {};
  for (const key of DATA_KEYS) {
    if (rawBackup[key] !== undefined) {
      flat[key] = rawBackup[key];
    }
  }

  if (rawBackup.unlockedAchievementIds !== undefined && !flat.achievements) {
    flat.achievements = {
      unlockedAchievementIds: rawBackup.unlockedAchievementIds,
      claimedAchievementIds: rawBackup.claimedAchievementIds,
      unlockedTitleIds: rawBackup.unlockedTitleIds,
      equippedTitleId: rawBackup.equippedTitleId,
      hasExportedBackup: rawBackup.hasExportedBackup,
    };
  }

  return flat;
}

/**
 * 判斷是否像 QuestNote 備份
 * @param {object} rawBackup
 */
function looksLikeQuestNoteBackup(rawBackup) {
  if (!rawBackup || typeof rawBackup !== 'object') return false;

  const appName = rawBackup.appName || rawBackup.app;
  if (appName === APP_NAME) return true;
  if (rawBackup.appVersion || rawBackup.version) return true;
  if (rawBackup.data && typeof rawBackup.data === 'object') return true;

  const data = extractRawData(rawBackup);
  if (!data) return false;

  return DATA_KEYS.some((key) => data[key] !== undefined);
}

/**
 * 是否包含至少一種核心資料
 * @param {object} data
 */
function hasCoreData(data) {
  if (!data) return false;
  if (Array.isArray(data.tasks) && data.tasks.length >= 0) return true;
  if (data.wallet && typeof data.wallet === 'object') return true;
  if (Array.isArray(data.collection)) return true;
  if (Array.isArray(data.habits)) return true;
  if (data.achievements && typeof data.achievements === 'object') return true;
  if (Array.isArray(data.unlockedAchievementIds)) return true;
  if (data.materials && typeof data.materials === 'object') return true;
  if (typeof data.adventureEnergy === 'number') return true;
  return false;
}

/**
 * 驗證備份格式
 * @param {object} rawBackup
 * @returns {{ valid: boolean, error?: string, warnings?: string[] }}
 */
export function validateBackup(rawBackup) {
  const warnings = [];

  if (!rawBackup || typeof rawBackup !== 'object') {
    return { valid: false, error: '這不是有效的 QuestNote 備份檔。' };
  }

  if (!looksLikeQuestNoteBackup(rawBackup)) {
    return { valid: false, error: '這不是有效的 QuestNote 備份檔。' };
  }

  const data = extractRawData(rawBackup);
  if (!hasCoreData(data)) {
    return { valid: false, error: '這不是有效的 QuestNote 備份檔。' };
  }

  const appVersion = rawBackup.appVersion ?? null;
  if (!appVersion) {
    warnings.push('此備份沒有版本資訊，系統會嘗試以相容模式匯入。');
  } else if (compareVersions(appVersion, APP_VERSION) > 0) {
    warnings.push('此備份來自較新的版本，可能無法完全相容。');
  } else if (compareVersions(appVersion, APP_VERSION) < 0) {
    warnings.push('此備份版本較舊，系統會自動補齊缺少欄位。');
  }

  if (appVersion && !SUPPORTED_VERSIONS.includes(appVersion) && compareVersions(appVersion, APP_VERSION) <= 0) {
    warnings.push(`備份版本 ${appVersion} 不在已知清單中，將嘗試相容匯入。`);
  }

  return { valid: true, warnings };
}

/**
 * 合併成就與稱號資料
 */
function mergeAchievementsData(data, rawBackup) {
  const base = data.achievements && typeof data.achievements === 'object' ? { ...data.achievements } : {};

  if (data.titles && typeof data.titles === 'object') {
    base.unlockedTitleIds = data.titles.unlockedTitleIds ?? base.unlockedTitleIds;
    base.equippedTitleId = data.titles.equippedTitleId ?? base.equippedTitleId;
  }

  if (Array.isArray(data.unlockedAchievementIds)) {
    base.unlockedAchievementIds = data.unlockedAchievementIds;
  }
  if (Array.isArray(data.claimedAchievementIds)) {
    base.claimedAchievementIds = data.claimedAchievementIds;
  }
  if (Array.isArray(data.unlockedTitleIds)) {
    base.unlockedTitleIds = data.unlockedTitleIds;
  }
  if (data.equippedTitleId !== undefined) {
    base.equippedTitleId = data.equippedTitleId;
  }
  if (data.hasExportedBackup !== undefined) {
    base.hasExportedBackup = data.hasExportedBackup;
  }

  if (rawBackup?.unlockedAchievementIds && !base.unlockedAchievementIds) {
    base.unlockedAchievementIds = rawBackup.unlockedAchievementIds;
  }

  return base;
}

/**
 * 正規化 wallet 資料
 */
function resolveWallet(data) {
  const walletSource = data.wallet && typeof data.wallet === 'object' ? data.wallet : {};
  return normalizeWallet({
    key: WALLET_KEY,
    stardust: walletSource.stardust ?? 0,
    adventureEnergy: walletSource.adventureEnergy ?? data.adventureEnergy ?? 0,
    materials: walletSource.materials ?? data.materials ?? { ...DEFAULT_MATERIALS },
  });
}

/**
 * 將不同版本格式轉成統一內部格式
 * @param {object} rawBackup
 */
export function normalizeBackupPayload(rawBackup) {
  const data = extractRawData(rawBackup) || {};
  const achievements = mergeAchievementsData(data, rawBackup);
  const wallet = resolveWallet(data);
  const userPreferences = normalizeUserPreferences({
    ...(data.settings && typeof data.settings === 'object' ? data.settings : {}),
    ...(data.userPreferences && typeof data.userPreferences === 'object' ? data.userPreferences : {}),
    key: PREFS_KEY,
  });

  return {
    appVersion: rawBackup.appVersion ?? null,
    exportedAt: rawBackup.exportedAt ?? null,
    tasks: Array.isArray(data.tasks) ? data.tasks : [],
    wallet,
    collection: Array.isArray(data.collection) ? data.collection : [],
    gachaStats: data.gachaStats ?? {},
    expeditions: Array.isArray(data.expeditions) ? data.expeditions : [],
    materials: wallet.materials,
    achievements,
    titles: {
      unlockedTitleIds: achievements.unlockedTitleIds ?? [],
      equippedTitleId: achievements.equippedTitleId ?? null,
    },
    habits: Array.isArray(data.habits) ? data.habits : [],
    userPreferences,
    settings: {
      reduceMotion: userPreferences.reduceMotion,
      theme: userPreferences.theme,
    },
    taskStats: data.taskStats ?? {},
    inventory: normalizeInventory(data.inventory),
    workshopStats: normalizeWorkshopStats(data.workshopStats),
  };
}

/**
 * 正規化匯入資料（migration / normalize）
 * @param {object} normalizedBackup
 */
export function migrateImportedData(normalizedBackup) {
  const today = getTodayDateString();

  const tasks = (normalizedBackup.tasks || [])
    .map((task) => normalizeTask(task, today))
    .filter(Boolean);

  const collection = (normalizedBackup.collection || [])
    .map((item) => {
      const petId = item?.petId || item?.id;
      if (!petId) return null;
      return normalizeCollectionItem({
        ...item,
        petId,
        owned: item.owned ?? true,
      });
    })
    .filter(Boolean);

  const habits = (normalizedBackup.habits || [])
    .map((habit) => normalizeHabit(habit))
    .filter(Boolean);

  const expeditions = (normalizedBackup.expeditions || [])
    .map((exp) => normalizeExpedition(exp))
    .filter(Boolean);

  const wallet = normalizeWallet({
    ...normalizedBackup.wallet,
    key: WALLET_KEY,
  });

  const gachaStats = normalizeGachaStats({
    ...normalizedBackup.gachaStats,
    key: GACHA_STATS_KEY,
  });

  const achievements = normalizeAchievementsState({
    ...normalizedBackup.achievements,
    key: ACHIEVEMENTS_KEY,
  });

  const taskStats = normalizeTaskStats({
    ...normalizedBackup.taskStats,
    key: TASK_STATS_KEY,
  });

  const userPreferences = normalizeUserPreferences({
    ...normalizedBackup.userPreferences,
    key: PREFS_KEY,
  });

  const inventory = normalizeInventory(normalizedBackup.inventory);
  const workshopStats = normalizeWorkshopStats(normalizedBackup.workshopStats);

  return {
    ...normalizedBackup,
    tasks,
    collection,
    habits,
    expeditions,
    wallet,
    gachaStats,
    achievements,
    taskStats,
    userPreferences,
    materials: wallet.materials,
    inventory,
    workshopStats,
  };
}

/**
 * 產生 UI 預覽資料
 * @param {object} normalizedBackup
 * @param {{ fileName?: string, totalPets?: number }} [options]
 */
export function previewBackup(normalizedBackup, options = {}) {
  const tasks = normalizedBackup.tasks || [];
  const habits = normalizedBackup.habits || [];
  const collection = normalizedBackup.collection || [];
  const achievements = normalizedBackup.achievements || {};
  const wallet = normalizedBackup.wallet || {};
  const expeditions = normalizedBackup.expeditions || [];
  const titles = normalizedBackup.titles || {};

  const ownedPets = collection.filter((item) => item.owned !== false).length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const unlockedAchievements = Array.isArray(achievements.unlockedAchievementIds)
    ? achievements.unlockedAchievementIds.length
    : 0;
  const unlockedTitles = Array.isArray(titles.unlockedTitleIds)
    ? titles.unlockedTitleIds.length
    : Array.isArray(achievements.unlockedTitleIds)
      ? achievements.unlockedTitleIds.length
      : 0;

  return {
    fileName: options.fileName || '未知檔案',
    appVersion: normalizedBackup.appVersion || '無版本資訊',
    exportedAt: normalizedBackup.exportedAt || null,
    taskCount: tasks.length,
    completedTaskCount: completedTasks,
    habitCount: habits.length,
    collectionCount: ownedPets,
    totalPets: options.totalPets ?? null,
    stardust: wallet.stardust ?? 0,
    adventureEnergy: wallet.adventureEnergy ?? 0,
    expeditionCount: expeditions.length,
    unlockedAchievementCount: unlockedAchievements,
    unlockedTitleCount: unlockedTitles,
  };
}

/**
 * 產生自動備份檔名
 */
function buildAutoBackupFilename() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `questnote_auto_backup_before_import_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.json`;
}

/**
 * 匯入前自動下載目前資料
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function createAutoBackupBeforeImport() {
  try {
    const backup = await exportBackup();
    downloadBackupFile(backup, buildAutoBackupFilename());
    return { success: true };
  } catch (err) {
    console.error('[QuestNote] 自動備份失敗:', err);
    return { success: false, error: err?.message || '自動備份失敗' };
  }
}

/**
 * 安全覆蓋 IndexedDB 全部資料（單一 transaction）
 * @param {object} migratedData
 */
export async function safeReplaceAllData(migratedData) {
  await replaceAllStores({
    tasks: migratedData.tasks || [],
    collection: migratedData.collection || [],
    expeditions: migratedData.expeditions || [],
    habits: migratedData.habits || [],
    wallet: migratedData.wallet,
    gachaStats: migratedData.gachaStats,
    achievements: migratedData.achievements,
    taskStats: migratedData.taskStats,
    userPreferences: migratedData.userPreferences,
    inventory: migratedData.inventory,
    workshopStats: migratedData.workshopStats,
  });
}

/**
 * 覆蓋恢復備份到 IndexedDB
 * @param {object} normalizedBackup
 */
export async function restoreBackup(normalizedBackup) {
  const migrated = migrateImportedData(normalizedBackup);
  await safeReplaceAllData(migrated);
  await migrateTasks();
  return migrated;
}

/**
 * 舊版 API 相容
 * @deprecated 請使用 restoreBackup
 */
export async function importBackup(backup) {
  const normalized = normalizeBackupPayload(backup);
  return restoreBackup(normalized);
}
