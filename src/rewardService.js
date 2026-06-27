/**
 * 星塵獎勵計算與發放
 */
import { dbGet, dbPut, STORES } from './db.js';
import { updateTask } from './taskService.js';

const WALLET_KEY = 'wallet';

/** 各重要程度的基礎獎勵 */
const PRIORITY_REWARDS = {
  normal: 20,
  important: 45,
  urgent: 80,
};

/** 內容過短時的最低獎勵 */
const MIN_CONTENT_REWARD = 5;

/** 抽卡單次消耗（供 UI 計算可抽次數） */
export const GACHA_COST = 100;

/**
 * 計算任務內容的有效字元數
 * 少於 5 個中文字或 5 個非空白字元時視為內容過短
 */
export function isContentTooShort(content) {
  const text = (content || '').trim();
  const chineseCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const nonWhitespace = text.replace(/\s/g, '').length;
  return chineseCount < 5 && nonWhitespace < 5;
}

/**
 * 計算任務完成應得星塵
 */
export function calculateRewardAmount(task) {
  if (isContentTooShort(task.content)) {
    return MIN_CONTENT_REWARD;
  }
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

/** 取得錢包資料 */
export async function getWallet() {
  const wallet = await dbGet(STORES.META, WALLET_KEY);
  return wallet ?? { key: WALLET_KEY, stardust: 0 };
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
 * 完成任務後領取獎勵
 * @returns {{ task: object, amount: number }}
 */
export async function claimTaskReward(task) {
  if (!canClaimReward(task)) {
    return { task, amount: 0 };
  }

  const amount = calculateRewardAmount(task);
  await addStardust(amount);

  const now = new Date().toISOString();
  const updates = {
    rewardClaimed: task.type === 'one_time' ? true : task.rewardClaimed,
    lastRewardClaimedAt: now,
  };

  if (task.type === 'one_time') {
    updates.rewardClaimed = true;
  }

  const updatedTask = await updateTask(task.id, updates);
  return { task: updatedTask, amount };
}

/** 計算目前可抽卡次數 */
export async function getAvailablePulls() {
  const wallet = await getWallet();
  return Math.floor((wallet.stardust || 0) / GACHA_COST);
}

/** 初始化錢包（首次使用） */
export async function initWallet() {
  const existing = await dbGet(STORES.META, WALLET_KEY);
  if (!existing) {
    await dbPut(STORES.META, { key: WALLET_KEY, stardust: 0 });
  }
}
