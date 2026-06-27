/**
 * 任務標籤邏輯
 */

const MAX_TAG_LENGTH = 20;
const MAX_TAGS_PER_TASK = 8;

/** 正規化單一標籤 */
export function normalizeTag(tag) {
  if (tag == null) return '';
  let s = String(tag).trim();
  if (s.startsWith('#')) s = s.slice(1).trim();
  s = s.replace(/\s+/g, ' ').trim();
  if (!s || s.length > MAX_TAG_LENGTH) return s.length > MAX_TAG_LENGTH ? s.slice(0, MAX_TAG_LENGTH) : '';
  return s;
}

/** 比對標籤（不區分大小寫） */
export function tagsEqual(a, b) {
  return normalizeTag(a).toLowerCase() === normalizeTag(b).toLowerCase();
}

/** 解析逗號分隔或 # 前綴的標籤輸入 */
export function parseTagsInput(input) {
  if (!input || typeof input !== 'string') return [];
  const parts = input.split(/[,，]/).map((p) => normalizeTag(p)).filter(Boolean);
  return dedupeTags(parts);
}

/** 去重標籤（保留首次出現的大小寫） */
export function dedupeTags(tags) {
  const seen = new Set();
  const result = [];
  for (const tag of tags) {
    const normalized = normalizeTag(tag);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result.slice(0, MAX_TAGS_PER_TASK);
}

/** 顯示用：加上 # */
export function formatTag(tag) {
  const n = normalizeTag(tag);
  return n ? `#${n}` : '';
}

/** 取得任務標籤陣列 */
export function getTaskTags(task) {
  if (!task || !Array.isArray(task.tags)) return [];
  return dedupeTags(task.tags);
}

/** 新增標籤到任務（回傳新 tags 陣列） */
export function addTagToTask(task, tag) {
  const current = getTaskTags(task);
  const normalized = normalizeTag(tag);
  if (!normalized) return current;
  if (current.some((t) => tagsEqual(t, normalized))) return current;
  if (current.length >= MAX_TAGS_PER_TASK) return current;
  return [...current, normalized];
}

/** 從任務移除標籤 */
export function removeTagFromTask(task, tag) {
  const current = getTaskTags(task);
  return current.filter((t) => !tagsEqual(t, tag));
}

/** 統計常用標籤（依出現次數，回傳前 N 個） */
export function getPopularTags(tasks, limit = 10) {
  const counts = new Map();
  const displayNames = new Map();

  for (const task of tasks) {
    if (task.deleted) continue;
    for (const tag of getTaskTags(task)) {
      const key = tag.toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
      if (!displayNames.has(key)) displayNames.set(key, tag);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hant'))
    .slice(0, limit)
    .map(([key, count]) => ({ tag: displayNames.get(key), count }));
}

/** 依標籤篩選任務 */
export function filterTasksByTag(tasks, tag) {
  if (!tag) return tasks;
  return tasks.filter((t) => getTaskTags(t).some((tg) => tagsEqual(tg, tag)));
}

/** 驗證並正規化標籤陣列，超過上限回傳 { tags, truncated: true } */
export function validateTags(tags) {
  const parsed = dedupeTags(Array.isArray(tags) ? tags.map(normalizeTag).filter(Boolean) : parseTagsInput(tags));
  const truncated = Array.isArray(tags) && tags.filter((t) => normalizeTag(t)).length > MAX_TAGS_PER_TASK;
  return { tags: parsed, truncated, max: MAX_TAGS_PER_TASK };
}

export { MAX_TAG_LENGTH, MAX_TAGS_PER_TASK };
