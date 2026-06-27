/**
 * 寵物圖鑑、碎片、升星管理
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

/** 取得全部收藏紀錄 */
export async function getCollection() {
  return dbGetAll(STORES.COLLECTION);
}

/** 取得單一寵物收藏 */
export async function getPetCollection(petId) {
  return dbGet(STORES.COLLECTION, petId);
}

/**
 * 新增寵物到圖鑑（首次獲得）
 */
export async function addPetToCollection(petId) {
  const existing = await getPetCollection(petId);
  if (existing) return existing;

  const entry = {
    petId,
    stars: 1,
    fragments: 0,
    obtainedAt: new Date().toISOString(),
  };
  await dbPut(STORES.COLLECTION, entry);
  return entry;
}

/**
 * 增加碎片（重複抽到的寵物）
 */
export async function addFragments(petId, amount) {
  let entry = await getPetCollection(petId);
  if (!entry) {
    // 理論上不應發生，但防禦性處理
    entry = await addPetToCollection(petId);
  }
  entry.fragments = (entry.fragments || 0) + amount;
  await dbPut(STORES.COLLECTION, entry);
  return entry;
}

/**
 * 升星
 * @returns {{ success: boolean, entry?: object, message?: string }}
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
 * 同步寵物資料庫 — 新寵物自動顯示為未獲得，不影響既有收藏
 * @param {Array} allPets - pets.json 中的全部寵物
 */
export async function syncWithPetDatabase(allPets) {
  // 僅確保 IndexedDB 中已有的收藏不被清除
  // 新寵物在 UI 層以「未獲得」顯示，無需寫入 DB
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

  return allPets.map((pet) => ({
    ...pet,
    owned: map.has(pet.id),
    stars: map.get(pet.id)?.stars ?? 0,
    fragments: map.get(pet.id)?.fragments ?? 0,
    obtainedAt: map.get(pet.id)?.obtainedAt ?? null,
  }));
}

/** 匯出收藏（備份用） */
export async function exportCollection() {
  return getCollection();
}

/** 匯入收藏（備份還原用，預留） */
export async function importCollection(items) {
  for (const item of items) {
    await dbPut(STORES.COLLECTION, item);
  }
}
