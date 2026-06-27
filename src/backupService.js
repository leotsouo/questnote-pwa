/**
 * 備份與還原服務
 * 第一版僅支援匯出，匯入架構預留供日後擴充
 */
import { exportTasks, importTasks } from './taskService.js';
import { getWallet, setStardust } from './rewardService.js';
import { exportCollection, importCollection } from './collectionService.js';
import { exportGachaStats, importGachaStats } from './gachaService.js';

/**
 * 匯出完整備份 JSON
 * @returns {Promise<object>}
 */
export async function exportBackup() {
  const [tasks, wallet, collection, gachaStats] = await Promise.all([
    exportTasks(),
    getWallet(),
    exportCollection(),
    exportGachaStats(),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    app: 'QuestNote',
    data: {
      tasks,
      wallet: { stardust: wallet.stardust ?? 0 },
      collection,
      gachaStats: {
        ssrPity: gachaStats.ssrPity ?? 0,
        urPity: gachaStats.urPity ?? 0,
        totalPulls: gachaStats.totalPulls ?? 0,
      },
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
 * 匯入備份（預留，第一版未在 UI 開放）
 * @param {object} backup
 */
export async function importBackup(backup) {
  if (!backup?.data) throw new Error('無效的備份格式');

  const { tasks, wallet, collection, gachaStats } = backup.data;

  if (Array.isArray(tasks)) await importTasks(tasks);
  if (wallet) await setStardust(wallet.stardust ?? 0);
  if (Array.isArray(collection)) await importCollection(collection);
  if (gachaStats) await importGachaStats(gachaStats);
}

/**
 * 驗證備份格式
 */
export function validateBackup(data) {
  return (
    data &&
    data.app === 'QuestNote' &&
    data.data &&
    Array.isArray(data.data.tasks) &&
    Array.isArray(data.data.collection)
  );
}
