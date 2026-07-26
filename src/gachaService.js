/**
 * 抽卡邏輯 — 機率、保底、消耗星塵
 * 寵物與卡池資料從 JSON 讀取，不寫死在此檔
 * V3.2.0：支援多 active 卡池選擇與保底分池（首次使用該池時建立）
 * V3.4.0：解鎖擴充 lifetimeDraws；十連凍結候選 snapshot；交易結束後才解鎖
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
import {
  matchesPetPoolFilter,
  getEligiblePetsForPool,
} from './petPoolFilter.js';
import {
  getPoolUnlockEntry,
  normalizeUnlockExpansion,
  processPoolDrawProgress,
  resolveEffectivePool,
} from './poolUnlockService.js';

export { matchesPetPoolFilter, getEligiblePetsForPool };

const GACHA_STATS_KEY = 'gachaStats';

/** 預設保底設定（可被 pools.json 覆蓋） */
const DEFAULT_PITY = { ssr: 30, ur: 100 };

const RARITY_RANK = { N: 0, R: 1, SR: 2, SSR: 3, UR: 4 };

function emptyPoolPity() {
  return { ssrPity: 0, urPity: 0 };
}

/**
 * 取得抽卡統計（保底計數）
 * - 頂層 ssrPity／urPity 保留為 standard 池鏡像，相容舊備份與成就讀取
 * - poolPity[poolId] 於首次使用該池時建立；standard 由舊欄位一次性種子化
 */
export function normalizeGachaStats(stats) {
  if (!stats) {
    return {
      key: GACHA_STATS_KEY,
      ssrPity: 0,
      urPity: 0,
      totalPulls: 0,
      tenPullCount: 0,
      selectedPoolId: null,
      poolPity: {
        standard: emptyPoolPity(),
      },
    };
  }

  const ssrPity = stats.ssrPity ?? 0;
  const urPity = stats.urPity ?? 0;
  const poolPity = { ...(stats.poolPity && typeof stats.poolPity === 'object' ? stats.poolPity : {}) };

  if (!poolPity.standard) {
    poolPity.standard = { ssrPity, urPity };
  } else {
    poolPity.standard = {
      ssrPity: poolPity.standard.ssrPity ?? ssrPity,
      urPity: poolPity.standard.urPity ?? urPity,
    };
  }

  return {
    key: GACHA_STATS_KEY,
    ssrPity: poolPity.standard.ssrPity,
    urPity: poolPity.standard.urPity,
    totalPulls: stats.totalPulls ?? 0,
    tenPullCount: stats.tenPullCount ?? 0,
    selectedPoolId: typeof stats.selectedPoolId === 'string' ? stats.selectedPoolId : null,
    poolPity,
  };
}

/** 確保指定卡池有保底資料（首次使用時建立，不重設其他池） */
export function ensurePoolPity(stats, poolId) {
  const normalized = normalizeGachaStats(stats);
  const id = poolId || 'standard';
  if (!normalized.poolPity[id]) {
    if (id === 'standard') {
      normalized.poolPity.standard = {
        ssrPity: normalized.ssrPity ?? 0,
        urPity: normalized.urPity ?? 0,
      };
    } else {
      normalized.poolPity[id] = emptyPoolPity();
    }
  }
  return normalized;
}

export function getPoolPityCounters(stats, poolId) {
  const ensured = ensurePoolPity(stats, poolId);
  return ensured.poolPity[poolId || 'standard'];
}

export async function getGachaStats() {
  const stats = await dbGet(STORES.META, GACHA_STATS_KEY);
  return normalizeGachaStats(stats);
}

/** 儲存抽卡統計 */
async function saveGachaStats(stats) {
  await dbPut(STORES.META, normalizeGachaStats(stats));
}

/** 初始化抽卡統計 */
export async function initGachaStats() {
  const existing = await dbGet(STORES.META, GACHA_STATS_KEY);
  const stats = normalizeGachaStats(existing);
  await saveGachaStats(stats);
}

/** 所有 active 卡池 */
export function getActivePools(poolsData) {
  const pools = poolsData?.pools || [];
  return pools.filter((p) => p.active);
}

/**
 * 從 pools.json 取得目前選中的 active 卡池
 * @param {object} poolsData
 * @param {string} [selectedPoolId]
 */
export function getActivePool(poolsData, selectedPoolId) {
  const active = getActivePools(poolsData);
  if (active.length === 0) {
    return poolsData?.pools?.[0] || null;
  }
  if (selectedPoolId) {
    const found = active.find((p) => p.id === selectedPoolId);
    if (found) return found;
  }
  return active[0];
}

/** 解析實際應使用的 selectedPoolId（校正失效選擇） */
export function resolveSelectedPoolId(poolsData, selectedPoolId) {
  const pool = getActivePool(poolsData, selectedPoolId);
  return pool?.id || null;
}

/** 切換抽卡池（只寫 preference，不重設任何保底） */
export async function setSelectedPoolId(poolId) {
  const stats = await getGachaStats();
  stats.selectedPoolId = poolId || null;
  await saveGachaStats(stats);
  return normalizeGachaStats(stats);
}

/**
 * 依解鎖狀態取得候選（未解鎖不含 awakened tags）。
 * @param {Array} allPets
 * @param {object} pool
 * @param {object|null} [unlockEntry] 若省略則視為未解鎖（同步安全預設）
 */
export function getPoolPets(allPets, pool, unlockEntry = null) {
  const effective = resolveEffectivePool(pool, unlockEntry);
  return getEligiblePetsForPool(allPets, effective);
}

/** 非同步：讀取 META 解鎖狀態後取得候選 */
export async function getPoolPetsAsync(allPets, pool) {
  if (!pool?.id) return getPoolPets(allPets, pool, null);
  const entry = await getPoolUnlockEntry(pool.id);
  return getPoolPets(allPets, pool, entry);
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
function determineRarity(poolPityCounters, pool, poolPets) {
  const pity = { ...DEFAULT_PITY, ...pool.pity };
  const rates = pool.rates;

  if (poolPityCounters.urPity >= pity.ur - 1) {
    return { rarity: 'UR', triggeredPity: true };
  }

  if (poolPityCounters.ssrPity >= pity.ssr - 1) {
    return { rarity: rollSSRPlus(rates, poolPets), triggeredPity: true };
  }

  return { rarity: rollRarity(rates), triggeredPity: false };
}

/**
 * 更新指定卡池保底計數，並同步 standard 鏡像欄位
 */
function updatePityCounters(stats, poolId, rarity) {
  const ensured = ensurePoolPity(stats, poolId);
  const counters = ensured.poolPity[poolId];

  if (rarity === 'UR') {
    counters.ssrPity = 0;
    counters.urPity = 0;
  } else if (rarity === 'SSR') {
    counters.ssrPity = 0;
    counters.urPity += 1;
  } else {
    counters.ssrPity += 1;
    counters.urPity += 1;
  }

  ensured.totalPulls += 1;

  if (poolId === 'standard') {
    ensured.ssrPity = counters.ssrPity;
    ensured.urPity = counters.urPity;
  }

  return ensured;
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
 * @param {Array} [eligiblePetsSnapshot] 若提供則整趟共用，避免十連中途候選變更
 */
async function rollSinglePull(allPets, poolsData, selectedPoolId, eligiblePetsSnapshot = null) {
  const pool = getActivePool(poolsData, selectedPoolId);
  const poolPets = Array.isArray(eligiblePetsSnapshot)
    ? eligiblePetsSnapshot
    : await getPoolPetsAsync(allPets, pool);

  if (poolPets.length === 0) {
    throw new Error('卡池中沒有可用寵物');
  }

  let stats = ensurePoolPity(await getGachaStats(), pool.id);
  const poolCounters = getPoolPityCounters(stats, pool.id);
  const { rarity, triggeredPity } = determineRarity(poolCounters, pool, poolPets);

  const pet = resolvePetFromRarity(poolPets, rarity);
  if (!pet) {
    throw new Error('無法從卡池抽取寵物');
  }

  stats = updatePityCounters(stats, pool.id, pet.rarity);
  stats.selectedPoolId = pool.id;
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
    pool,
    stats: await getGachaStats(),
  };
}

/**
 * 執行單次抽卡
 */
export async function pullOnce(allPets, poolsData, selectedPoolId) {
  const stats = await getGachaStats();
  const poolId = selectedPoolId ?? resolveSelectedPoolId(poolsData, stats.selectedPoolId);
  const pool = getActivePool(poolsData, poolId);
  const cost = pool.cost ?? GACHA_COST;

  const wallet = await getWallet();
  if ((wallet.stardust ?? 0) < cost) {
    throw new Error('星塵不足');
  }

  // 抽卡前凍結候選 snapshot（解鎖只會在交易結束後發生）
  const eligibleSnapshot = await getPoolPetsAsync(allPets, pool);

  await spendStardust(cost);
  const result = await rollSinglePull(allPets, poolsData, poolId, eligibleSnapshot);

  const expansion = normalizeUnlockExpansion(pool);
  const unlockProgress = await processPoolDrawProgress(poolId, 1, expansion);

  return {
    ...result,
    pool: result.pool,
    unlockProgress,
  };
}

/**
 * 執行 10 連抽 — 連續 10 次單抽邏輯，一次扣除 1000 星塵
 * 整趟使用抽卡前候選 snapshot；解鎖僅在 10 抽全部完成後處理。
 */
export async function performTenPull(allPets, poolsData, selectedPoolId) {
  const wallet = await getWallet();
  if ((wallet.stardust ?? 0) < GACHA_TEN_COST) {
    return {
      success: false,
      error: '星塵不足，10 連抽需要 1000 星塵',
    };
  }

  const statsBefore = await getGachaStats();
  const poolId = selectedPoolId ?? resolveSelectedPoolId(poolsData, statsBefore.selectedPoolId);
  const pool = getActivePool(poolsData, poolId);

  // 凍結候選：十連中途不得切換 poolTags
  const eligibleSnapshot = await getPoolPetsAsync(allPets, pool);

  await spendStardust(GACHA_TEN_COST);

  const results = [];
  for (let i = 0; i < 10; i++) {
    const pull = await rollSinglePull(allPets, poolsData, poolId, eligibleSnapshot);
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

  // 依 results.length 累積（十連 = 10），交易完成後才解鎖
  const expansion = normalizeUnlockExpansion(pool);
  const unlockProgress = await processPoolDrawProgress(poolId, results.length, expansion);

  return {
    success: true,
    cost: GACHA_TEN_COST,
    pool,
    results,
    summary: {
      newCount,
      duplicateCount,
      totalFragments,
      highestRarity,
    },
    unlockProgress,
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
