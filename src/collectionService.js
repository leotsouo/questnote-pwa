/**
 * 寵物圖鑑、碎片、升星、陪伴與親密度管理
 */
import { dbGetAll, dbGet, dbPut, STORES } from './db.js';

/** 重複寵物轉換碎片數量 */
export const FRAGMENT_BY_RARITY = {
  N: 1,
  R: 2,
  SR: 5,
  SSR: 10,
  UR: 20,
};

/** 升星所需碎片 */
export const STAR_UPGRADE_COST = {
  2: 5,
  3: 15,
  4: 30,
  5: 50,
};

/** 親密度等級門檻（累積 EXP） */
export const BOND_LEVEL_THRESHOLDS = [0, 50, 150, 300, 500];

/** 暱稱長度上限（中文算 2 單位、英文算 1 單位，最多 24 單位 = 12 中文或 24 英文） */
export const NICKNAME_MAX_UNITS = 24;

function isCjkChar(ch) {
  return /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(ch);
}

/** 計算暱稱字元單位數 */
export function getNicknameCharUnits(text) {
  if (!text) return 0;
  let units = 0;
  for (const ch of text) {
    units += isCjkChar(ch) ? 2 : 1;
  }
  return units;
}

/**
 * 正規化暱稱輸入（trim、移除換行）
 * @returns {string|null}
 */
export function normalizePetNickname(nickname) {
  if (nickname == null) return null;
  if (typeof nickname !== 'string') return null;
  const trimmed = nickname.trim().replace(/[\r\n]+/g, '');
  return trimmed || null;
}

/**
 * 驗證暱稱
 * @returns {{ valid: boolean, nickname?: string|null, error?: string }}
 */
export function validatePetNickname(nickname) {
  const normalized = normalizePetNickname(nickname);
  if (!normalized) {
    return { valid: true, nickname: null };
  }
  const units = getNicknameCharUnits(normalized);
  if (units > NICKNAME_MAX_UNITS) {
    return {
      valid: false,
      error: '暱稱太長，請控制在 12 個中文字以內。',
    };
  }
  return { valid: true, nickname: normalized };
}

/** 儲存用暱稱 sanitize（匯入時過長可截斷） */
function sanitizeStoredNickname(nickname) {
  if (nickname == null) return null;
  if (typeof nickname !== 'string') return null;
  const trimmed = nickname.trim().replace(/[\r\n]+/g, '');
  if (!trimmed) return null;

  const validation = validatePetNickname(trimmed);
  if (validation.valid) return validation.nickname;

  let result = '';
  let units = 0;
  for (const ch of trimmed) {
    const chUnits = isCjkChar(ch) ? 2 : 1;
    if (units + chUnits > NICKNAME_MAX_UNITS) break;
    result += ch;
    units += chUnits;
  }
  if (result) {
    console.warn('[QuestNote] 暱稱過長已截斷:', nickname);
    return result;
  }
  return null;
}

/** 取得寵物顯示名稱（暱稱優先） */
export function getPetDisplayName(pet, collectionItem) {
  if (!pet) return '';
  const nickname = collectionItem?.nickname ?? pet?.nickname ?? null;
  if (typeof nickname === 'string' && nickname.trim()) {
    return nickname.trim();
  }
  return pet.name || '';
}

/** 取得寵物原始名稱 */
export function getPetOriginalName(pet) {
  return pet?.name || '';
}

/**
 * 設定寵物暱稱
 * @returns {Promise<{ success: boolean, message?: string, entry?: object, cleared?: boolean }>}
 */
export async function setPetNickname(petId, nickname) {
  const entry = await getPetCollection(petId);
  if (!entry) {
    return { success: false, message: '尚未獲得的寵物無法設定暱稱。' };
  }

  const validation = validatePetNickname(nickname);
  if (!validation.valid) {
    return { success: false, message: validation.error || '暱稱太長，請重新輸入。' };
  }

  try {
    const normalized = normalizeEntry(entry);
    normalized.nickname = validation.nickname;
    await dbPut(STORES.COLLECTION, normalized);
    return { success: true, entry: normalized, cleared: validation.nickname === null };
  } catch (err) {
    console.error('[QuestNote] 暱稱儲存失敗:', err);
    return { success: false, message: '暱稱儲存失敗，請稍後再試。' };
  }
}

/**
 * 清除寵物暱稱
 */
export async function clearPetNickname(petId) {
  const entry = await getPetCollection(petId);
  if (!entry) {
    return { success: false, message: '找不到這隻寵物資料。' };
  }

  try {
    const normalized = normalizeEntry(entry);
    normalized.nickname = null;
    await dbPut(STORES.COLLECTION, normalized);
    return { success: true, entry: normalized };
  } catch (err) {
    console.error('[QuestNote] 暱稱清除失敗:', err);
    return { success: false, message: '暱稱儲存失敗，請稍後再試。' };
  }
}

/** 啟動時 migration：補齊 nickname 欄位 */
export async function migrateCollectionNicknames() {
  const items = await dbGetAll(STORES.COLLECTION);
  for (const item of items) {
    const normalized = normalizeEntry(item);
    const changed =
      !('nickname' in item) ||
      item.nickname !== normalized.nickname;
    if (changed) {
      await dbPut(STORES.COLLECTION, normalized);
    }
  }
}

/** 依累積 EXP 計算親密度等級 */
export function getBondLevelFromExp(exp) {
  if (exp >= 500) return 5;
  if (exp >= 300) return 4;
  if (exp >= 150) return 3;
  if (exp >= 50) return 2;
  return 1;
}

/**
 * 計算當前等級的親密度進度
 * @returns {{ current: number, max: number, percent: number }}
 */
export function getBondProgress(bondExp, bondLevel) {
  if (bondLevel >= 5) {
    return { current: bondExp - 500, max: 0, percent: 100 };
  }
  const currentThreshold = BOND_LEVEL_THRESHOLDS[bondLevel - 1];
  const nextThreshold = BOND_LEVEL_THRESHOLDS[bondLevel];
  const current = bondExp - currentThreshold;
  const max = nextThreshold - currentThreshold;
  return {
    current,
    max,
    percent: Math.min(100, Math.round((current / max) * 100)),
  };
}

/** 正規化收藏紀錄，補齊舊資料缺少的欄位 */
export function normalizeCollectionItem(entry) {
  return normalizeEntry(entry);
}

export function normalizeEntry(entry) {
  if (!entry) return entry;
  const bondExp = entry.bondExp ?? 0;
  return {
    ...entry,
    stars: entry.stars ?? 1,
    fragments: entry.fragments ?? 0,
    bondExp,
    bondLevel: entry.bondLevel ?? getBondLevelFromExp(bondExp),
    isCompanion: entry.isCompanion ?? false,
    nickname: sanitizeStoredNickname(entry.nickname),
  };
}

/** 取得全部收藏紀錄（已正規化） */
export async function getCollection() {
  const items = await dbGetAll(STORES.COLLECTION);
  return items.map(normalizeEntry);
}

/** 取得單一寵物收藏（已正規化） */
export async function getPetCollection(petId) {
  const entry = await dbGet(STORES.COLLECTION, petId);
  return entry ? normalizeEntry(entry) : null;
}

/**
 * 新增寵物到圖鑑（首次獲得）
 */
export async function addPetToCollection(petId) {
  const existing = await getPetCollection(petId);
  if (existing) return existing;

  const entry = normalizeEntry({
    petId,
    stars: 1,
    fragments: 0,
    bondExp: 0,
    bondLevel: 1,
    isCompanion: false,
    nickname: null,
    obtainedAt: new Date().toISOString(),
  });
  await dbPut(STORES.COLLECTION, entry);
  return entry;
}

/**
 * 增加碎片（重複抽到的寵物）
 */
export async function addFragments(petId, amount) {
  let entry = await getPetCollection(petId);
  if (!entry) {
    entry = await addPetToCollection(petId);
  }
  entry.fragments = (entry.fragments || 0) + amount;
  await dbPut(STORES.COLLECTION, entry);
  return entry;
}

/**
 * 升星
 */
export async function upgradeStar(petId) {
  const entry = await getPetCollection(petId);
  if (!entry) return { success: false, message: '尚未獲得此寵物' };

  const currentStars = entry.stars || 1;
  if (currentStars >= 5) return { success: false, message: '已達最高星級' };

  const nextStar = currentStars + 1;
  const cost = STAR_UPGRADE_COST[nextStar];
  if ((entry.fragments || 0) < cost) {
    return { success: false, message: `碎片不足，需要 ${cost} 碎片` };
  }

  entry.fragments -= cost;
  entry.stars = nextStar;
  await dbPut(STORES.COLLECTION, entry);
  return { success: true, entry };
}

/**
 * 設為陪伴寵物（同一時間僅一隻）
 */
export async function setCompanion(petId) {
  const owned = await getPetCollection(petId);
  if (!owned) throw new Error('尚未獲得此寵物');

  const collection = await getCollection();
  for (const entry of collection) {
    const normalized = normalizeEntry(entry);
    normalized.isCompanion = normalized.petId === petId;
    await dbPut(STORES.COLLECTION, normalized);
  }
  return getPetCollection(petId);
}

/**
 * 取得目前陪伴寵物（合併 pets 資料）
 */
export async function getCompanion(allPets) {
  const collection = await getCollection();
  const companionEntry = collection.find((c) => c.isCompanion);
  if (!companionEntry) return null;

  const pet = allPets.find((p) => p.id === companionEntry.petId);
  if (!pet) return null;

  return {
    ...pet,
    ...companionEntry,
    owned: true,
    nickname: companionEntry.nickname ?? null,
    displayName: getPetDisplayName(pet, companionEntry),
    originalName: pet.name,
  };
}

/**
 * 為指定寵物增加親密度（探險獎勵用）
 * @returns {{ expGained: number, leveledUp: boolean, newLevel: number, oldLevel: number } | null}
 */
export async function addBondExpToPet(petId, amount) {
  if (amount <= 0) return null;

  const entry = await getPetCollection(petId);
  if (!entry) return null;

  const normalized = normalizeEntry(entry);
  const oldLevel = normalized.bondLevel;
  normalized.bondExp = (normalized.bondExp || 0) + amount;
  normalized.bondLevel = getBondLevelFromExp(normalized.bondExp);
  await dbPut(STORES.COLLECTION, normalized);

  return {
    expGained: amount,
    leveledUp: normalized.bondLevel > oldLevel,
    newLevel: normalized.bondLevel,
    oldLevel,
  };
}

/**
 * 為陪伴寵物增加親密度
 * @returns {{ expGained: number, leveledUp: boolean, newLevel: number, oldLevel: number } | null}
 */
export async function addBondExpToCompanion(amount) {
  if (amount <= 0) return null;

  const collection = await getCollection();
  const companion = collection.find((c) => c.isCompanion);
  if (!companion) return null;

  const entry = normalizeEntry(companion);
  const oldLevel = entry.bondLevel;
  entry.bondExp = (entry.bondExp || 0) + amount;
  entry.bondLevel = getBondLevelFromExp(entry.bondExp);
  await dbPut(STORES.COLLECTION, entry);

  return {
    expGained: amount,
    leveledUp: entry.bondLevel > oldLevel,
    newLevel: entry.bondLevel,
    oldLevel,
  };
}

/** 同步寵物資料庫 */
export async function syncWithPetDatabase(allPets) {
  return getCollection();
}

/** 圖鑑收集進度 */
export async function getCollectionProgress(allPets) {
  const collection = await getCollection();
  const ownedIds = new Set(collection.map((c) => c.petId));
  const total = allPets.length;
  const owned = allPets.filter((p) => ownedIds.has(p.id)).length;
  return { owned, total };
}

/** 合併寵物資料與收藏狀態 */
export async function getEnrichedCollection(allPets) {
  const collection = await getCollection();
  const map = new Map(collection.map((c) => [c.petId, c]));

  return allPets.map((pet) => {
    const entry = map.get(pet.id);
    const normalized = entry ? normalizeEntry(entry) : null;
    return {
      ...pet,
      owned: !!normalized,
      stars: normalized?.stars ?? 0,
      fragments: normalized?.fragments ?? 0,
      bondExp: normalized?.bondExp ?? 0,
      bondLevel: normalized?.bondLevel ?? 0,
      isCompanion: normalized?.isCompanion ?? false,
      obtainedAt: normalized?.obtainedAt ?? null,
      nickname: normalized?.nickname ?? null,
      displayName: normalized ? getPetDisplayName(pet, normalized) : pet.name,
      originalName: pet.name,
    };
  });
}

export async function exportCollection() {
  return getCollection();
}

export async function importCollection(items) {
  for (const item of items) {
    await dbPut(STORES.COLLECTION, normalizeEntry(item));
  }
}
