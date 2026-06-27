/**
 * 開發測試工具 — 僅 localhost 環境使用，正式部署可整檔移除
 */
import { addPetToCollection, getPetCollection } from './collectionService.js';
import { addStardust, getWallet } from './rewardService.js';
import { forceCompleteActiveExpedition } from './expeditionService.js';

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
