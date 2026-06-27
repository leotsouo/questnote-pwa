/**
 * 抽卡邏輯 — 機率、保底、消耗星塵
 * 寵物與卡池資料從 JSON 讀取，不寫死在此檔
 */
import { dbGet, dbPut, STORES } from './db.js';
import { spendStardust, GACHA_COST } from './rewardService.js';
import {
  addPetToCollection,
  addFragments,
  getPetCollection,
  FRAGMENT_BY_RARITY,
} from './collectionService.js';

const GACHA_STATS_KEY = 'gachaStats';

/** 預設保底設定（可被 pools.json 覆蓋） */
const DEFAULT_PITY = { ssr: 30, ur: 100 };

/**
 * 取得抽卡統計（保底計數）
 */
export async function getGachaStats() {
  const stats = await dbGet(STORES.META, GACHA_STATS_KEY);
  return (
    stats ?? {
      key: GACHA_STATS_KEY,
      ssrPity: 0,
      urPity: 0,
      totalPulls: 0,
    }
  );
}

/** 儲存抽卡統計 */
async function saveGachaStats(stats) {
  await dbPut(STORES.META, stats);
}

/** 初始化抽卡統計 */
export async function initGachaStats() {
  const existing = await dbGet(STORES.META, GACHA_STATS_KEY);
  if (!existing) {
    await saveGachaStats({
      key: GACHA_STATS_KEY,
      ssrPity: 0,
      urPity: 0,
      totalPulls: 0,
    });
  }
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
 */
function determineRarity(stats, pool, poolPets) {
  const pity = { ...DEFAULT_PITY, ...pool.pity };
  const rates = pool.rates;

  // UR 保底：第 100 抽必定 UR
  if (stats.urPity >= pity.ur - 1) {
    return 'UR';
  }

  // SSR 保底：第 30 抽必定 SSR 以上
  if (stats.ssrPity >= pity.ssr - 1) {
    return rollSSRPlus(rates, poolPets);
  }

  return rollRarity(rates);
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
 * 執行單次抽卡
 * @returns {Promise<{
 *   pet: object,
 *   rarity: string,
 *   isNew: boolean,
 *   fragmentsGained: number,
 *   stats: object
 * }>}
 */
export async function pullOnce(allPets, poolsData) {
  const pool = getActivePool(poolsData);
  const cost = pool.cost ?? GACHA_COST;
  const poolPets = getPoolPets(allPets, pool);

  if (poolPets.length === 0) {
    throw new Error('卡池中沒有可用寵物');
  }

  await spendStardust(cost);

  const stats = await getGachaStats();
  const rarity = determineRarity(stats, pool, poolPets);

  let pet = pickPetByRarity(poolPets, rarity);

  // 若該稀有度無寵物，降級尋找
  if (!pet) {
    const fallbackOrder = ['UR', 'SSR', 'SR', 'R', 'N'];
    for (const r of fallbackOrder) {
      pet = pickPetByRarity(poolPets, r);
      if (pet) break;
    }
  }

  if (!pet) {
    throw new Error('無法從卡池抽取寵物');
  }

  updatePityCounters(stats, pet.rarity);
  await saveGachaStats(stats);

  // 處理收藏
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
    stats: await getGachaStats(),
    pool,
  };
}

/** 匯出抽卡統計（備份用） */
export async function exportGachaStats() {
  return getGachaStats();
}

/** 匯入抽卡統計（備份還原用，預留） */
export async function importGachaStats(data) {
  await saveGachaStats({ key: GACHA_STATS_KEY, ...data });
}
