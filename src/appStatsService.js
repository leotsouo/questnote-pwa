/**
 * App 使用統計 — Quick Add、搜尋、標籤任務數
 */
import { dbGet, dbPut, STORES } from './db.js';
import { getTaskTags } from './tagService.js';

const APP_STATS_KEY = 'appStats';

const DEFAULT_STATS = {
  key: APP_STATS_KEY,
  quickAddCount: 0,
  searchCount: 0,
  taggedTaskCount: 0,
  firstQuickAddAt: null,
  firstSearchAt: null,
};

export function normalizeAppStats(data) {
  if (!data) return { ...DEFAULT_STATS };
  return {
    key: APP_STATS_KEY,
    quickAddCount: data.quickAddCount ?? 0,
    searchCount: data.searchCount ?? 0,
    taggedTaskCount: data.taggedTaskCount ?? 0,
    firstQuickAddAt: data.firstQuickAddAt ?? null,
    firstSearchAt: data.firstSearchAt ?? null,
  };
}

export async function getAppStats() {
  const data = await dbGet(STORES.META, APP_STATS_KEY);
  return normalizeAppStats(data);
}

async function saveAppStats(stats) {
  await dbPut(STORES.META, stats);
  return stats;
}

export async function initAppStats() {
  const stats = await getAppStats();
  await saveAppStats(stats);
  return stats;
}

/** Quick Add 成功後記錄 */
export async function recordQuickAdd() {
  const stats = await getAppStats();
  const now = new Date().toISOString();
  stats.quickAddCount = (stats.quickAddCount ?? 0) + 1;
  if (!stats.firstQuickAddAt) stats.firstQuickAddAt = now;
  return saveAppStats(stats);
}

let lastCountedSearchQuery = '';

/** 有效搜尋後記錄（同一 query 不重複計數） */
export async function recordSearch(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return getAppStats();
  if (q === lastCountedSearchQuery) return getAppStats();

  lastCountedSearchQuery = q;
  const stats = await getAppStats();
  const now = new Date().toISOString();
  stats.searchCount = (stats.searchCount ?? 0) + 1;
  if (!stats.firstSearchAt) stats.firstSearchAt = now;
  return saveAppStats(stats);
}

/** 重算含標籤任務數 */
export async function recalculateTaggedTaskCount(tasks) {
  const count = (tasks || []).filter((t) => getTaskTags(t).length > 0).length;
  const stats = await getAppStats();
  stats.taggedTaskCount = count;
  return saveAppStats(stats);
}

export async function exportAppStats() {
  return getAppStats();
}

export async function importAppStats(data) {
  const stats = normalizeAppStats(data);
  return saveAppStats(stats);
}
