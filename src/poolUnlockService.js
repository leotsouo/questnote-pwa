/**
 * 卡池解鎖擴充狀態 — V3.4.0 晨醒花庭
 * 使用既有 STORES.META，不升級 DB_VERSION。
 * unlocked / rewardClaimed / animationSeen 三者不可合併。
 */
import { dbGet, dbPut, STORES } from './db.js';
import {
  addPetToCollection,
  addFragments,
  getPetCollection,
  FRAGMENT_BY_RARITY,
} from './collectionService.js';

export const POOL_UNLOCK_META_KEY = 'poolUnlockState';
export const IDEMPOTENT_GRANTS_META_KEY = 'idempotentGrants';

export const MORNING_GARDEN_GRANT_ID = 'awakening_reward:eternal_slumber_bloom:20';
export const MORNING_GARDEN_REWARD_SOURCE = 'morning_garden_unlock_reward';

const ALLOWED_EXTRA_POOL_TAGS = new Set([
  'eternal_slumber_bloom_awakened',
]);

const ALLOWED_ANIMATION_KEYS = new Set([
  'morning_garden_unlock',
]);

/**
 * @param {unknown} value
 * @returns {string}
 */
function asSafeText(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

/**
 * 正規化 pools[].unlockExpansion；缺省或無效回傳 null。
 * @param {object|null|undefined} pool
 */
export function normalizeUnlockExpansion(pool) {
  const raw = pool?.unlockExpansion;
  if (!raw || typeof raw !== 'object') return null;

  const key = asSafeText(raw.key);
  const title = asSafeText(raw.title);
  const unlockMessage = asSafeText(raw.unlockMessage);
  const rewardPetId = asSafeText(raw.rewardPetId);
  const animationKey = asSafeText(raw.animationKey);
  const progressScope = asSafeText(raw.progressScope) || 'lifetime_pool_draws';
  const threshold = Number(raw.threshold);

  if (!key || !Number.isFinite(threshold) || threshold <= 0) return null;
  if (!/^pet_[a-z0-9]+$/i.test(rewardPetId)) return null;
  if (!ALLOWED_ANIMATION_KEYS.has(animationKey)) return null;

  const extraPoolTags = (Array.isArray(raw.extraPoolTags) ? raw.extraPoolTags : [])
    .map((t) => asSafeText(t))
    .filter((t) => ALLOWED_EXTRA_POOL_TAGS.has(t));

  if (extraPoolTags.length === 0) return null;

  return {
    key,
    threshold: Math.floor(threshold),
    progressScope,
    extraPoolTags,
    rewardPetId,
    animationKey,
    title: title || '晨醒花庭',
    unlockMessage: unlockMessage || '沉眠有歸，甦醒有時。',
  };
}

/**
 * @param {object|null|undefined} raw
 */
export function normalizePoolUnlockState(raw) {
  const byPool = {};
  const source = raw?.byPool && typeof raw.byPool === 'object' ? raw.byPool : {};
  for (const [poolId, entry] of Object.entries(source)) {
    if (typeof poolId !== 'string' || !poolId.trim()) continue;
    byPool[poolId] = normalizePoolUnlockEntry(poolId, entry);
  }
  return {
    key: POOL_UNLOCK_META_KEY,
    schemaVersion: 1,
    byPool,
    /**
     * 舊玩家補判定狀態：
     * 現有系統未保存含 poolId 的抽卡歷史，無法可靠回填。
     */
    legacyBackfill: {
      attempted: !!raw?.legacyBackfill?.attempted,
      status: asSafeText(raw?.legacyBackfill?.status) || 'unavailable_no_pool_history',
      note: asSafeText(raw?.legacyBackfill?.note)
        || '抽卡歷史未保存 poolId，已停止舊玩家自動補判定；lifetimeDraws 僅自 V3.4.0 起累積。',
    },
  };
}

function normalizePoolUnlockEntry(poolId, entry) {
  const lifetimeDraws = Math.max(0, Math.floor(Number(entry?.lifetimeDraws) || 0));
  return {
    schemaVersion: 1,
    poolId,
    lifetimeDraws,
    unlocked: !!entry?.unlocked,
    rewardClaimed: !!entry?.rewardClaimed,
    animationSeen: !!entry?.animationSeen,
    unlockedAt: typeof entry?.unlockedAt === 'string' ? entry.unlockedAt : null,
  };
}

export function emptyPoolUnlockEntry(poolId) {
  return normalizePoolUnlockEntry(poolId, {});
}

export async function getPoolUnlockState() {
  const raw = await dbGet(STORES.META, POOL_UNLOCK_META_KEY);
  return normalizePoolUnlockState(raw);
}

export async function savePoolUnlockState(state) {
  const normalized = normalizePoolUnlockState(state);
  await dbPut(STORES.META, normalized);
  return normalized;
}

export async function getPoolUnlockEntry(poolId) {
  if (!poolId) return emptyPoolUnlockEntry('');
  const state = await getPoolUnlockState();
  return state.byPool[poolId] || emptyPoolUnlockEntry(poolId);
}

/**
 * 首次載入：標記舊玩家補判定不可用（無 poolId 歷史），不猜測抽數。
 */
export async function ensurePoolUnlockLegacyBackfillMarked() {
  const state = await getPoolUnlockState();
  if (state.legacyBackfill?.attempted) return state;
  state.legacyBackfill = {
    attempted: true,
    status: 'unavailable_no_pool_history',
    note: '抽卡歷史未保存 poolId，已停止舊玩家自動補判定；lifetimeDraws 僅自 V3.4.0 起累積。不得使用 pity 或全池 totalPulls 猜測。',
  };
  return savePoolUnlockState(state);
}

/**
 * 單調更新 lifetimeDraws（只增不減）。
 * @param {string} poolId
 * @param {number} delta
 */
export async function addLifetimeDraws(poolId, delta) {
  if (!poolId) return emptyPoolUnlockEntry('');
  const add = Math.max(0, Math.floor(Number(delta) || 0));
  const state = await getPoolUnlockState();
  const entry = state.byPool[poolId] || emptyPoolUnlockEntry(poolId);
  const next = entry.lifetimeDraws + add;
  // 防禦：不得因異常輸入使數字下降
  entry.lifetimeDraws = next >= entry.lifetimeDraws ? next : entry.lifetimeDraws;
  state.byPool[poolId] = entry;
  await savePoolUnlockState(state);
  return entry;
}

/**
 * 合併 lifetimeDraws（備份恢復／補判定）：取較大值，永不下降。
 */
export function mergeLifetimeDraws(current, incoming) {
  const a = Math.max(0, Math.floor(Number(current) || 0));
  const b = Math.max(0, Math.floor(Number(incoming) || 0));
  return Math.max(a, b);
}

/**
 * 若跨過門檻則設 unlocked（不負責發獎／動畫）。
 * @returns {{ entry: object, justUnlocked: boolean }}
 */
export async function evaluateUnlockThreshold(poolId, expansion) {
  const entry = await getPoolUnlockEntry(poolId);
  if (!expansion) return { entry, justUnlocked: false };
  if (entry.unlocked) return { entry, justUnlocked: false };
  if (entry.lifetimeDraws < expansion.threshold) return { entry, justUnlocked: false };

  const state = await getPoolUnlockState();
  const next = state.byPool[poolId] || emptyPoolUnlockEntry(poolId);
  next.unlocked = true;
  next.unlockedAt = next.unlockedAt || new Date().toISOString();
  state.byPool[poolId] = next;
  await savePoolUnlockState(state);
  return { entry: next, justUnlocked: true };
}

export function normalizeIdempotentGrants(raw) {
  const claimed = Array.isArray(raw?.claimedIds)
    ? raw.claimedIds.filter((id) => typeof id === 'string' && id.trim())
    : [];
  return {
    key: IDEMPOTENT_GRANTS_META_KEY,
    claimedIds: [...new Set(claimed)],
  };
}

export async function getIdempotentGrants() {
  const raw = await dbGet(STORES.META, IDEMPOTENT_GRANTS_META_KEY);
  return normalizeIdempotentGrants(raw);
}

export async function hasClaimedGrant(grantId) {
  if (!grantId) return false;
  const data = await getIdempotentGrants();
  return data.claimedIds.includes(grantId);
}

/**
 * 冪等寫入 grant id（先標記再發獎也可；失敗時可依 claimed 恢復）。
 */
export async function markGrantClaimed(grantId) {
  if (!grantId) return getIdempotentGrants();
  const data = await getIdempotentGrants();
  if (!data.claimedIds.includes(grantId)) {
    data.claimedIds.push(grantId);
    await dbPut(STORES.META, data);
  }
  return data;
}

/**
 * 固定贈送解鎖獎勵（不扣星塵、不計抽數、不影響 pity）。
 * @returns {Promise<{
 *   ok: boolean,
 *   alreadyClaimed?: boolean,
 *   isNew?: boolean,
 *   fragmentsGained?: number,
 *   petId?: string,
 *   entry?: object,
 *   error?: string,
 * }>}
 */
export async function grantUnlockReward(poolId, expansion) {
  if (!poolId || !expansion?.rewardPetId) {
    return { ok: false, error: '缺少解鎖獎勵設定' };
  }

  const grantId = MORNING_GARDEN_GRANT_ID;
  const petId = expansion.rewardPetId;
  const state = await getPoolUnlockState();
  const entry = state.byPool[poolId] || emptyPoolUnlockEntry(poolId);

  if (entry.rewardClaimed || (await hasClaimedGrant(grantId))) {
    // 恢復：grant 已標記但收藏可能尚未寫入
    const existing = await getPetCollection(petId);
    if (!existing) {
      const created = await addPetToCollection(petId);
      created.obtainedSource = MORNING_GARDEN_REWARD_SOURCE;
      created.obtainedAt = created.obtainedAt || new Date().toISOString();
      await dbPut(STORES.COLLECTION, created);
    }
    entry.rewardClaimed = true;
    if (!entry.unlocked) entry.unlocked = true;
    state.byPool[poolId] = entry;
    await savePoolUnlockState(state);
    return { ok: true, alreadyClaimed: true, petId, entry };
  }

  // 先寫入冪等標記，防止連點／重整重複發放
  await markGrantClaimed(grantId);

  const existing = await getPetCollection(petId);
  let isNew = false;
  let fragmentsGained = 0;

  if (!existing) {
    const created = await addPetToCollection(petId);
    created.obtainedSource = MORNING_GARDEN_REWARD_SOURCE;
    created.obtainedAt = created.obtainedAt || new Date().toISOString();
    await dbPut(STORES.COLLECTION, created);
    isNew = true;
  } else {
    // 已擁有：沿用既有重複補償規則一次
    const rarity = 'R';
    fragmentsGained = FRAGMENT_BY_RARITY[rarity] ?? 2;
    await addFragments(petId, fragmentsGained);
  }

  entry.unlocked = true;
  entry.rewardClaimed = true;
  entry.unlockedAt = entry.unlockedAt || new Date().toISOString();
  state.byPool[poolId] = entry;
  await savePoolUnlockState(state);

  return {
    ok: true,
    alreadyClaimed: false,
    isNew,
    fragmentsGained,
    petId,
    entry,
  };
}

/**
 * 啟動／進入卡池時：若已解鎖但未發獎，安全重試。
 */
export async function ensureUnlockRewardClaimed(poolId, expansion) {
  const entry = await getPoolUnlockEntry(poolId);
  if (!expansion) return { ok: true, skipped: true, entry };
  if (!entry.unlocked) return { ok: true, skipped: true, entry };
  if (entry.rewardClaimed && (await hasClaimedGrant(MORNING_GARDEN_GRANT_ID))) {
    return { ok: true, alreadyClaimed: true, entry };
  }
  return grantUnlockReward(poolId, expansion);
}

export async function markUnlockAnimationSeen(poolId) {
  if (!poolId) return emptyPoolUnlockEntry('');
  const state = await getPoolUnlockState();
  const entry = state.byPool[poolId] || emptyPoolUnlockEntry(poolId);
  entry.animationSeen = true;
  state.byPool[poolId] = entry;
  await savePoolUnlockState(state);
  return entry;
}

/**
 * 抽卡交易成功後處理：累積抽數 → 解鎖 → 發獎。
 * 必須在本次 draw 完成後呼叫；不得影響本次候選。
 * @returns {Promise<{
 *   entry: object,
 *   justUnlocked: boolean,
 *   reward?: object|null,
 * }>}
 */
export async function processPoolDrawProgress(poolId, drawCount, expansion) {
  const entryAfterDraw = await addLifetimeDraws(poolId, drawCount);
  if (!expansion) {
    return { entry: entryAfterDraw, justUnlocked: false, reward: null };
  }

  const { entry, justUnlocked } = await evaluateUnlockThreshold(poolId, expansion);
  let reward = null;
  if (entry.unlocked && !entry.rewardClaimed) {
    reward = await grantUnlockReward(poolId, expansion);
  }
  const latest = await getPoolUnlockEntry(poolId);
  return { entry: latest, justUnlocked, reward };
}

/**
 * 依解鎖狀態建立有效 petFilter（不修改原 pool）。
 * @param {object} pool
 * @param {object|null} unlockEntry
 */
export function resolveEffectivePool(pool, unlockEntry) {
  if (!pool) return pool;
  const expansion = normalizeUnlockExpansion(pool);
  if (!expansion || !unlockEntry?.unlocked) {
    return pool;
  }
  const baseTags = Array.isArray(pool.petFilter?.poolTags) ? [...pool.petFilter.poolTags] : [];
  const merged = [...new Set([...baseTags, ...expansion.extraPoolTags])];
  return {
    ...pool,
    petFilter: {
      ...(pool.petFilter || {}),
      poolTags: merged,
    },
  };
}

export async function exportPoolUnlockState() {
  return getPoolUnlockState();
}

export async function exportIdempotentGrants() {
  return getIdempotentGrants();
}
