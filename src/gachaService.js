/**
 * 抽卡邏輯 — 機率、保底、消耗星塵
 * 寵物與卡池資料從 JSON 讀取，不寫死在此檔
 */
import { dbGet, dbPut, STORES } from './db.js';
import { spendStardust, getWallet, GACHA_COST, GACHA_TEN_COST } from './rewardService.js';
import {
  addPetToCollection,
  addFragments,
  getPetCollection,
  FRAGMENT_BY_RARITY,
  getCollection,
} from './collectionService.js';

const GACHA_STATS_KEY = 'gachaStats';

/** 預設保底設定（可被 pools.json 覆蓋） */
const DEFAULT_PITY = { ssr: 30, ur: 100 };

const RARITY_RANK = { N: 0, R: 1, SR: 2, SSR: 3, UR: 4 };

/**
 * 取得抽卡統計（保底計數）
 */
export function normalizeGachaStats(stats) {
  if (!stats) {
    return {
      key: GACHA_STATS_KEY,
      ssrPity: 0,
      urPity: 0,
      totalPulls: 0,
      tenPullCount: 0,
    };
  }
  return {
    key: GACHA_STATS_KEY,
    ssrPity: stats.ssrPity ?? 0,
    urPity: stats.urPity ?? 0,
    totalPulls: stats.totalPulls ?? 0,
    tenPullCount: stats.tenPullCount ?? 0,
  };
}

export async function getGachaStats() {
  const stats = await dbGet(STORES.META, GACHA_STATS_KEY);
  return normalizeGachaStats(stats);
}

/** 儲存抽卡統計 */
async function saveGachaStats(stats) {
  await dbPut(STORES.META, stats);
}

/** 初始化抽卡統計 */
export async function initGachaStats() {
  const existing = await dbGet(STORES.META, GACHA_STATS_KEY);
  const stats = normalizeGachaStats(existing);
  await saveGachaStats(stats);
}

/**
 * 從 pools.json 取得目前 active 卡池
 */
export function getActivePool(poolsData) {
  return poolsData.pools.find((p) => p.active) ?? poolsData.pools[0];
}

/**
 * 依卡池設定篩選可用寵物
 */
export function getPoolPets(allPets, pool) {
  const tags = pool.petFilter?.poolTags ?? [];
  if (tags.length === 0) return allPets;
  return allPets.filter((pet) =>
    pet.poolTags.some((tag) => tags.includes(tag))
  );
}

/**
 * 依稀有度從卡池寵物中隨機選一隻
 */
function pickPetByRarity(poolPets, rarity) {
  const candidates = poolPets.filter((p) => p.rarity === rarity);
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * 一般機率抽稀有度
 */
function rollRarity(rates) {
  const roll = Math.random();
  let cumulative = 0;
  const order = ['N', 'R', 'SR', 'SSR', 'UR'];

  for (const rarity of order) {
    cumulative += rates[rarity] ?? 0;
    if (roll < cumulative) return rarity;
  }
  return 'N';
}

/**
 * SSR 保底時抽 SSR 或 UR（依原始比例）
 */
function rollSSRPlus(rates, poolPets) {
  const ssrRate = rates.SSR ?? 0.03;
  const urRate = rates.UR ?? 0.02;
  const total = ssrRate + urRate;
  const roll = Math.random();

  if (roll < urRate / total && poolPets.some((p) => p.rarity === 'UR')) {
    return 'UR';
  }
  if (poolPets.some((p) => p.rarity === 'SSR')) return 'SSR';
  if (poolPets.some((p) => p.rarity === 'UR')) return 'UR';
  return 'SSR';
}

/**
 * 決定本次抽卡的稀有度（含保底）
 * @returns {{ rarity: string, triggeredPity: boolean }}
 */
function determineRarity(stats, pool, poolPets) {
  const pity = { ...DEFAULT_PITY, ...pool.pity };
  const rates = pool.rates;

  // UR 保底：第 100 抽必定 UR
  if (stats.urPity >= pity.ur - 1) {
    return { rarity: 'UR', triggeredPity: true };
  }

  // SSR 保底：第 30 抽必定 SSR 以上
  if (stats.ssrPity >= pity.ssr - 1) {
    return { rarity: rollSSRPlus(rates, poolPets), triggeredPity: true };
  }

  return { rarity: rollRarity(rates), triggeredPity: false };
}

/**
 * 更新保底計數
 */
function updatePityCounters(stats, rarity) {
  if (rarity === 'UR') {
    stats.ssrPity = 0;
    stats.urPity = 0;
  } else if (rarity === 'SSR') {
    stats.ssrPity = 0;
    stats.urPity += 1;
  } else {
    stats.ssrPity += 1;
    stats.urPity += 1;
  }
  stats.totalPulls += 1;
}

/**
 * 從卡池依稀有度選寵物（含降級 fallback）
 */
function resolvePetFromRarity(poolPets, rarity) {
  let pet = pickPetByRarity(poolPets, rarity);

  if (!pet) {
    const fallbackOrder = ['UR', 'SSR', 'SR', 'R', 'N'];
    for (const r of fallbackOrder) {
      pet = pickPetByRarity(poolPets, r);
      if (pet) break;
    }
  }

  return pet;
}

/**
 * 執行一次抽卡核心邏輯（不扣星塵）
 * 每一抽獨立更新保底、收藏與碎片
 */
async function rollSinglePull(allPets, poolsData) {
  const pool = getActivePool(poolsData);
  const poolPets = getPoolPets(allPets, pool);

  if (poolPets.length === 0) {
    throw new Error('卡池中沒有可用寵物');
  }

  const stats = await getGachaStats();
  const { rarity, triggeredPity } = determineRarity(stats, pool, poolPets);

  const pet = resolvePetFromRarity(poolPets, rarity);
  if (!pet) {
    throw new Error('無法從卡池抽取寵物');
  }

  updatePityCounters(stats, pet.rarity);
  await saveGachaStats(stats);

  const existing = await getPetCollection(pet.id);
  let isNew = false;
  let fragmentsGained = 0;

  if (!existing) {
    await addPetToCollection(pet.id);
    isNew = true;
  } else {
    fragmentsGained = FRAGMENT_BY_RARITY[pet.rarity] ?? 1;
    await addFragments(pet.id, fragmentsGained);
  }

  return {
    pet,
    rarity: pet.rarity,
    isNew,
    fragmentsGained,
    triggeredPity,
    stats: await getGachaStats(),
  };
}

/**
 * 執行單次抽卡
 */
export async function pullOnce(allPets, poolsData) {
  const pool = getActivePool(poolsData);
  const cost = pool.cost ?? GACHA_COST;

  const wallet = await getWallet();
  if ((wallet.stardust ?? 0) < cost) {
    throw new Error('星塵不足');
  }

  await spendStardust(cost);
  const result = await rollSinglePull(allPets, poolsData);

  return {
    ...result,
    pool,
  };
}

/**
 * 執行 10 連抽 — 連續 10 次單抽邏輯，一次扣除 1000 星塵
 */
export async function performTenPull(allPets, poolsData) {
  const wallet = await getWallet();
  if ((wallet.stardust ?? 0) < GACHA_TEN_COST) {
    return {
      success: false,
      error: '星塵不足，10 連抽需要 1000 星塵',
    };
  }

  await spendStardust(GACHA_TEN_COST);

  const results = [];
  for (let i = 0; i < 10; i++) {
    const pull = await rollSinglePull(allPets, poolsData);
    results.push({
      petId: pull.pet.id,
      pet: pull.pet,
      rarity: pull.rarity,
      isNew: pull.isNew,
      duplicateFragments: pull.fragmentsGained,
      triggeredPity: pull.triggeredPity,
    });
  }

  const newCount = results.filter((r) => r.isNew).length;
  const duplicateCount = results.length - newCount;
  const totalFragments = results.reduce((sum, r) => sum + r.duplicateFragments, 0);
  const highestRarity = results.reduce(
    (best, r) => (RARITY_RANK[r.rarity] > RARITY_RANK[best] ? r.rarity : best),
    'N'
  );

  const stats = await getGachaStats();
  stats.tenPullCount = (stats.tenPullCount || 0) + 1;
  await saveGachaStats(stats);

  return {
    success: true,
    cost: GACHA_TEN_COST,
    results,
    summary: {
      newCount,
      duplicateCount,
      totalFragments,
      highestRarity,
    },
    updatedWallet: await getWallet(),
    updatedCollection: await getCollection(),
    updatedGachaStats: await getGachaStats(),
  };
}

/** 匯出抽卡統計（備份用） */
export async function exportGachaStats() {
  return getGachaStats();
}

/** 匯入抽卡統計（備份還原用，預留） */
export async function importGachaStats(data) {
  await saveGachaStats(normalizeGachaStats({ key: GACHA_STATS_KEY, ...data }));
}
