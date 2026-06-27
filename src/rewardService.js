/**
 * 星塵獎勵計算與發放
 */
import { dbGet, dbPut, STORES } from './db.js';
import { updateTask } from './taskService.js';
import { addBondExpToCompanion } from './collectionService.js';

const WALLET_KEY = 'wallet';

/** 預設材料 */
export const DEFAULT_MATERIALS = {
  forest_leaf: 0,
  lava_core: 0,
  machine_part: 0,
  star_shard: 0,
};

/** 各重要程度的冒險能量獎勵 */
const PRIORITY_ENERGY = {
  normal: 1,
  important: 2,
  urgent: 3,
};

/** 各重要程度的基礎獎勵 */
const PRIORITY_REWARDS = {
  normal: 20,
  important: 45,
  urgent: 80,
};

/** 抽卡單次消耗（供 UI 計算可抽次數） */
export const GACHA_COST = 100;

/** 各重要程度親密度獎勵 */
const PRIORITY_BOND = {
  normal: 5,
  important: 12,
  urgent: 20,
};

/**
 * 計算任務完成應得親密度
 */
export function calculateBondAmount(task) {
  return PRIORITY_BOND[task.priority] ?? PRIORITY_BOND.normal;
}

/**
 * 計算任務完成應得星塵
 */
export function calculateRewardAmount(task) {
  return PRIORITY_REWARDS[task.priority] ?? PRIORITY_REWARDS.normal;
}

/**
 * 判斷任務是否可領取獎勵
 */
export function canClaimReward(task) {
  if (task.type === 'one_time') {
    return !task.rewardClaimed;
  }

  // 可重複任務：每天最多領一次
  if (!task.lastRewardClaimedAt) return true;
  const lastDate = task.lastRewardClaimedAt.split('T')[0];
  const today = new Date().toISOString().split('T')[0];
  return lastDate !== today;
}

/**
 * 計算任務完成應得冒險能量
 */
export function calculateAdventureEnergyAmount(task) {
  return PRIORITY_ENERGY[task.priority] ?? PRIORITY_ENERGY.normal;
}

/**
 * 正規化錢包資料，補齊舊版缺少的欄位
 */
export function normalizeWallet(wallet) {
  if (!wallet) {
    return {
      key: WALLET_KEY,
      stardust: 0,
      adventureEnergy: 0,
      materials: { ...DEFAULT_MATERIALS },
    };
  }
  return {
    key: WALLET_KEY,
    stardust: wallet.stardust ?? 0,
    adventureEnergy: wallet.adventureEnergy ?? 0,
    materials: { ...DEFAULT_MATERIALS, ...(wallet.materials || {}) },
  };
}

/** 取得錢包資料 */
export async function getWallet() {
  const wallet = await dbGet(STORES.META, WALLET_KEY);
  return normalizeWallet(wallet);
}

/** 增加冒險能量 */
export async function addAdventureEnergy(amount) {
  if (amount <= 0) return getWallet();
  const wallet = await getWallet();
  wallet.adventureEnergy = (wallet.adventureEnergy || 0) + amount;
  await dbPut(STORES.META, wallet);
  return wallet;
}

/** 扣除冒險能量 */
export async function spendAdventureEnergy(amount) {
  const wallet = await getWallet();
  if ((wallet.adventureEnergy || 0) < amount) {
    throw new Error('冒險能量不足');
  }
  wallet.adventureEnergy -= amount;
  await dbPut(STORES.META, wallet);
  return wallet;
}

/** 增加材料 */
export async function addMaterial(materialId, amount) {
  if (amount <= 0) return getWallet();
  const wallet = await getWallet();
  wallet.materials[materialId] = (wallet.materials[materialId] || 0) + amount;
  await dbPut(STORES.META, wallet);
  return wallet;
}

/** 設定星塵數量 */
export async function setStardust(amount) {
  const wallet = await getWallet();
  wallet.stardust = Math.max(0, amount);
  await dbPut(STORES.META, wallet);
  return wallet;
}

/** 增加星塵 */
export async function addStardust(amount) {
  const wallet = await getWallet();
  wallet.stardust = (wallet.stardust || 0) + amount;
  await dbPut(STORES.META, wallet);
  return wallet;
}

/** 扣除星塵，餘額不足時拋錯 */
export async function spendStardust(amount) {
  const wallet = await getWallet();
  if ((wallet.stardust || 0) < amount) {
    throw new Error('星塵不足');
  }
  wallet.stardust -= amount;
  await dbPut(STORES.META, wallet);
  return wallet;
}

/**
 * 完成任務後領取獎勵（星塵 + 冒險能量 + 陪伴寵物親密度）
 * @returns {{ task: object, amount: number, energy: number, bond: object|null }}
 */
export async function claimTaskReward(task) {
  if (!canClaimReward(task)) {
    return { task, amount: 0, energy: 0, bond: null };
  }

  const amount = calculateRewardAmount(task);
  const energy = calculateAdventureEnergyAmount(task);

  await addStardust(amount);
  if (energy > 0) {
    await addAdventureEnergy(energy);
  }

  const now = new Date().toISOString();
  const updates = {
    rewardClaimed: task.type === 'one_time' ? true : task.rewardClaimed,
    lastRewardClaimedAt: now,
  };

  if (task.type === 'one_time') {
    updates.rewardClaimed = true;
  }

  const updatedTask = await updateTask(task.id, updates);

  // 陪伴寵物親密度（與星塵共用防刷規則）
  const bondAmount = calculateBondAmount(task);
  const bond = await addBondExpToCompanion(bondAmount);

  return { task: updatedTask, amount, energy, bond };
}

/** 計算目前可抽卡次數 */
export async function getAvailablePulls() {
  const wallet = await getWallet();
  return Math.floor((wallet.stardust || 0) / GACHA_COST);
}

/** 初始化錢包（首次使用或遷移舊資料） */
export async function initWallet() {
  const existing = await dbGet(STORES.META, WALLET_KEY);
  const wallet = normalizeWallet(existing);
  await dbPut(STORES.META, wallet);
}
