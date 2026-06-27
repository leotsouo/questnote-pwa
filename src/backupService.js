/**
 * 備份與還原服務
 * 支援 v1.8 格式（含習慣追蹤等）
 */
import { exportTasks, importTasks } from './taskService.js';
import { getWallet, setStardust, normalizeWallet, DEFAULT_MATERIALS } from './rewardService.js';
import { dbPut, STORES } from './db.js';
import { exportCollection, importCollection } from './collectionService.js';
import { exportGachaStats, importGachaStats } from './gachaService.js';
import { exportExpeditions, importExpeditions } from './expeditionService.js';
import { exportAchievementsState, importAchievementsState } from './achievementService.js';
import { exportTaskStats, importTaskStats } from './taskStatsService.js';
import { exportHabits, importHabits } from './habitService.js';
import { getUserPreferences, normalizeUserPreferences } from './preferencesService.js';

const WALLET_KEY = 'wallet';
const APP_VERSION = '1.8.1';

/**
 * 匯出完整備份 JSON（v1.8 格式）
 * @returns {Promise<object>}
 */
export async function exportBackup() {
  const [tasks, wallet, collection, gachaStats, expeditions, achievements, taskStats, habits, userPreferences] = await Promise.all([
    exportTasks(),
    getWallet(),
    exportCollection(),
    exportGachaStats(),
    exportExpeditions(),
    exportAchievementsState(),
    exportTaskStats(),
    exportHabits(),
    getUserPreferences(),
  ]);

  return {
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    app: 'QuestNote',
    version: 2,
    tasks,
    wallet: {
      stardust: wallet.stardust ?? 0,
      adventureEnergy: wallet.adventureEnergy ?? 0,
      materials: wallet.materials ?? { ...DEFAULT_MATERIALS },
    },
    collection,
    gachaStats: {
      ssrPity: gachaStats.ssrPity ?? 0,
      urPity: gachaStats.urPity ?? 0,
      totalPulls: gachaStats.totalPulls ?? 0,
      tenPullCount: gachaStats.tenPullCount ?? 0,
    },
    expeditions,
    achievements,
    taskStats,
    userPreferences,
    habits,
    unlockedAchievementIds: achievements.unlockedAchievementIds ?? [],
    claimedAchievementIds: achievements.claimedAchievementIds ?? [],
    unlockedTitleIds: achievements.unlockedTitleIds ?? [],
    equippedTitleId: achievements.equippedTitleId ?? null,
    hasExportedBackup: achievements.hasExportedBackup ?? false,
    materials: wallet.materials ?? { ...DEFAULT_MATERIALS },
    adventureEnergy: wallet.adventureEnergy ?? 0,
    // 向下相容舊版匯入邏輯
    data: {
      tasks,
      wallet: {
        stardust: wallet.stardust ?? 0,
        adventureEnergy: wallet.adventureEnergy ?? 0,
        materials: wallet.materials ?? { ...DEFAULT_MATERIALS },
      },
      collection,
      gachaStats: {
        ssrPity: gachaStats.ssrPity ?? 0,
        urPity: gachaStats.urPity ?? 0,
        totalPulls: gachaStats.totalPulls ?? 0,
        tenPullCount: gachaStats.tenPullCount ?? 0,
      },
      expeditions,
      achievements,
      taskStats,
      userPreferences,
      habits,
      unlockedAchievementIds: achievements.unlockedAchievementIds ?? [],
      claimedAchievementIds: achievements.claimedAchievementIds ?? [],
      unlockedTitleIds: achievements.unlockedTitleIds ?? [],
      equippedTitleId: achievements.equippedTitleId ?? null,
      hasExportedBackup: achievements.hasExportedBackup ?? false,
      materials: wallet.materials ?? { ...DEFAULT_MATERIALS },
      adventureEnergy: wallet.adventureEnergy ?? 0,
    },
  };
}

/**
 * 觸發瀏覽器下載備份檔
 */
export async function downloadBackup() {
  const backup = await exportBackup();
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().split('T')[0];
  const filename = `questnote-backup-${date}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return backup;
}

/**
 * 從備份物件取出資料（支援新舊格式）
 */
function extractBackupData(backup) {
  if (backup?.data) {
    return backup.data;
  }
  return {
    tasks: backup.tasks,
    wallet: backup.wallet,
    collection: backup.collection,
    gachaStats: backup.gachaStats,
    expeditions: backup.expeditions,
    achievements: backup.achievements,
    habits: backup.habits,
    materials: backup.materials,
    adventureEnergy: backup.adventureEnergy,
  };
}

/**
 * 匯入備份（預留，第一版未在 UI 開放）
 * @param {object} backup
 */
export async function importBackup(backup) {
  const data = extractBackupData(backup);
  if (!data) throw new Error('無效的備份格式');

  const { tasks, wallet, collection, gachaStats, expeditions, achievements } = data;

  if (Array.isArray(tasks)) await importTasks(tasks);
  if (Array.isArray(collection)) await importCollection(collection);
  if (gachaStats) await importGachaStats(gachaStats);
  if (Array.isArray(expeditions)) await importExpeditions(expeditions);

  if (achievements) {
    await importAchievementsState(achievements);
  } else if (backup.unlockedAchievementIds || backup.equippedTitleId) {
    await importAchievementsState({
      unlockedAchievementIds: backup.unlockedAchievementIds ?? data.unlockedAchievementIds,
      claimedAchievementIds: backup.claimedAchievementIds ?? data.claimedAchievementIds,
      unlockedTitleIds: backup.unlockedTitleIds ?? data.unlockedTitleIds,
      equippedTitleId: backup.equippedTitleId ?? data.equippedTitleId,
      hasExportedBackup: backup.hasExportedBackup ?? data.hasExportedBackup,
    });
  }

  if (data.taskStats || backup.taskStats) {
    await importTaskStats(data.taskStats || backup.taskStats);
  }

  if (Array.isArray(data.habits || backup.habits)) {
    await importHabits(data.habits || backup.habits);
  }

  const prefs = data.userPreferences || backup.userPreferences;
  if (prefs) {
    await dbPut(STORES.META, normalizeUserPreferences({ ...prefs, key: 'userPreferences' }));
  }

  if (wallet || data.materials !== undefined || data.adventureEnergy !== undefined) {
    const normalized = normalizeWallet({
      key: WALLET_KEY,
      stardust: wallet?.stardust ?? 0,
      adventureEnergy: wallet?.adventureEnergy ?? data.adventureEnergy ?? 0,
      materials: wallet?.materials ?? data.materials ?? { ...DEFAULT_MATERIALS },
    });
    await dbPut(STORES.META, normalized);
  } else if (wallet) {
    await setStardust(wallet.stardust ?? 0);
  }
}

/**
 * 驗證備份格式
 */
export function validateBackup(data) {
  const payload = extractBackupData(data);
  return (
    data &&
    data.app === 'QuestNote' &&
    payload &&
    Array.isArray(payload.tasks) &&
    Array.isArray(payload.collection)
  );
}
