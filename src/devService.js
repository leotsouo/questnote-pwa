/**
 * 開發測試工具 — 僅 localhost 環境使用，正式部署可整檔移除
 */
import { addPetToCollection, getPetCollection } from './collectionService.js';
import { addStardust, getWallet } from './rewardService.js';
import { forceCompleteActiveExpedition } from './expeditionService.js';
import {
  getDailyCheckIn,
  getLocalDateKey,
  normalizeDailyCheckIn,
  releaseWheelSpinLock,
} from './dailyCheckInService.js';
import { dbPut, STORES } from './db.js';

/** 每次測試發放的星塵數量 */
export const DEV_STARDUST_GRANT = 100000;

/** 測試解鎖的高稀有寵物 ID */
export const DEV_TEST_PET_IDS = [
  'pet_ur01',
  'pet_ur02',
  'pet_ur03',
  'pet_ur04',
  'pet_ssr01',
  'pet_ssr02',
  'pet_sr01',
  'pet_sr02',
];

/** 是否為開發模式（Live Server / 本機） */
export function isDevMode() {
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
}

/**
 * 將測試寵物加入圖鑑（不影響抽卡邏輯）
 * @returns {Promise<number>} 本次新解鎖數量
 */
export async function unlockDevTestPets() {
  let newlyAdded = 0;
  for (const petId of DEV_TEST_PET_IDS) {
    const before = await getPetCollection(petId);
    await addPetToCollection(petId);
    if (!before) newlyAdded += 1;
  }
  return newlyAdded;
}

/**
 * 將全部寵物加入圖鑑（開發測試用）
 * @param {string[]} petIds
 * @returns {Promise<{ newlyAdded: number, total: number }>}
 */
export async function unlockAllDevPets(petIds) {
  let newlyAdded = 0;
  for (const petId of petIds) {
    const before = await getPetCollection(petId);
    await addPetToCollection(petId);
    if (!before) newlyAdded += 1;
  }
  return { newlyAdded, total: petIds.length };
}

/**
 * 開發測試：發放大量星塵
 * @returns {Promise<number>} 發放後的星塵總數
 */
export async function grantDevStardust() {
  await addStardust(DEV_STARDUST_GRANT);
  const wallet = await getWallet();
  return wallet.stardust ?? 0;
}

/**
 * 開發測試：立即結束進行中的探險
 */
export async function devForceCompleteExpedition() {
  return forceCompleteActiveExpedition();
}

/**
 * 開發測試：重置今日每日祝福（簽到與轉盤）
 * @returns {Promise<{ success: boolean, changed: boolean, message: string }>}
 */
export async function resetDevDailyBlessing() {
  const todayKey = getLocalDateKey();
  const daily = await getDailyCheckIn();
  const hadCheckIn = daily.lastCheckInDate === todayKey;
  const hadWheel = daily.lastWheelSpinDate === todayKey;

  if (!hadCheckIn && !hadWheel) {
    return { success: true, changed: false, message: '今日尚未完成簽到或轉盤，無需重置。' };
  }

  if (hadCheckIn) {
    const prevEntries = (daily.history || [])
      .filter((h) => h?.date !== todayKey && h?.checkedInAt)
      .sort((a, b) => a.date.localeCompare(b.date));
    const prev = prevEntries[prevEntries.length - 1];

    daily.lastCheckInDate = prev?.date ?? null;
    daily.lastCheckInAt = prev?.checkedInAt ?? null;
    daily.streak = Math.max(0, (daily.streak ?? 0) - 1);
    daily.totalCheckIns = Math.max(0, (daily.totalCheckIns ?? 0) - 1);
  }

  if (hadWheel) {
    daily.lastWheelSpinDate = null;
    daily.lastWheelSpinAt = null;
    daily.totalWheelSpins = Math.max(0, (daily.totalWheelSpins ?? 0) - 1);
  }

  daily.history = (daily.history || [])
    .map((h) => {
      if (h?.date !== todayKey) return h;
      const entry = { ...h };
      if (hadCheckIn) {
        delete entry.checkedInAt;
        delete entry.checkInReward;
      }
      if (hadWheel) delete entry.wheelReward;
      return entry.checkedInAt || entry.checkInReward || entry.wheelReward ? entry : null;
    })
    .filter(Boolean);

  releaseWheelSpinLock();
  await dbPut(STORES.META, normalizeDailyCheckIn(daily));

  return { success: true, changed: true, message: '已重置今日每日祝福，可重新簽到與轉盤。' };
}
