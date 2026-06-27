/**
 * 使用者偏好設定 — 自動補齊舊資料預設值
 */
import { dbGet, dbPut, STORES } from './db.js';

const PREFS_KEY = 'userPreferences';

const DEFAULT_PREFS = {
  key: PREFS_KEY,
  reduceMotion: false,
};

/**
 * 正規化偏好設定
 * @param {object|null} prefs
 */
export function normalizeUserPreferences(prefs) {
  if (!prefs) return { ...DEFAULT_PREFS };
  return {
    key: PREFS_KEY,
    reduceMotion: prefs.reduceMotion ?? false,
  };
}

/** 取得使用者偏好 */
export async function getUserPreferences() {
  const prefs = await dbGet(STORES.META, PREFS_KEY);
  return normalizeUserPreferences(prefs);
}

/** 初始化偏好（首次使用或遷移舊資料） */
export async function initUserPreferences() {
  const prefs = await getUserPreferences();
  await dbPut(STORES.META, prefs);
  return prefs;
}

/** 設定減少動畫 */
export async function setReduceMotion(enabled) {
  const prefs = await getUserPreferences();
  prefs.reduceMotion = !!enabled;
  await dbPut(STORES.META, prefs);
  return prefs;
}
