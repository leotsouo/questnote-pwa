/**
 * 全域搜尋邏輯 — 本機離線搜尋
 */
import { getTaskTags } from './tagService.js';
import { escapeHtml } from './uiHelpers.js';
import { getTodayDateString, daysBetween } from './taskFilterService.js';

const MAX_RESULTS = 50;

/** 正規化搜尋文字 */
export function normalizeSearchText(text) {
  if (!text) return '';
  return String(text).trim().toLowerCase();
}

/** 判斷文字是否包含 query */
function textMatches(text, query) {
  if (!text || !query) return false;
  return normalizeSearchText(text).includes(query);
}

/** 計算任務搜尋相關性分數（越小越優先） */
export function rankTaskResult(task, query, categoryName = '') {
  const q = normalizeSearchText(query);
  let score = 500;

  const title = normalizeSearchText(task.title || '');
  const content = normalizeSearchText(task.content || '');

  if (title === q) score = 10;
  else if (title.includes(q)) score = 50;
  else if (getTaskTags(task).some((t) => normalizeSearchText(t).includes(q))) score = 100;
  else if (textMatches(categoryName, q)) score = 120;
  else if (content.includes(q)) score = 200;
  else if ((task.subtasks || []).some((s) => textMatches(s.text, q))) score = 300;

  if (task.completed) score += 1000;

  if (task.dueDate) {
    const today = getTodayDateString();
    const diff = daysBetween(task.dueDate, today);
    if (diff !== null) score += Math.min(Math.abs(diff), 365);
  } else {
    score += 50;
  }

  return score;
}

/** 搜尋任務 */
export function searchTasks(tasks, query, categories = []) {
  const q = normalizeSearchText(query);
  if (!q) return [];

  const catMap = new Map((categories || []).map((c) => [c.id, c.name || '']));

  const matched = tasks.filter((task) => {
    if (textMatches(task.title, q)) return true;
    if (textMatches(task.content, q)) return true;
    if (getTaskTags(task).some((t) => textMatches(t, q))) return true;
    const catName = catMap.get(task.categoryId || 'general') || '';
    if (textMatches(catName, q)) return true;
    if ((task.subtasks || []).some((s) => textMatches(s.text, q))) return true;
    return false;
  });

  return matched
    .map((task) => ({
      task,
      score: rankTaskResult(task, q, catMap.get(task.categoryId || 'general') || ''),
    }))
    .sort((a, b) => a.score - b.score || (a.task.completed ? 1 : 0) - (b.task.completed ? 1 : 0))
    .map((r) => r.task);
}

/** 搜尋習慣 */
export function searchHabits(habits, query) {
  const q = normalizeSearchText(query);
  if (!q) return [];

  return (habits || []).filter((h) => {
    if (h.archived) return false;
    if (textMatches(h.name, q)) return true;
    if (textMatches(h.description, q)) return true;
    return false;
  });
}

/**
 * 搜尋全部
 * @returns {{ incompleteTasks, completedTasks, habits, truncated, totalCount }}
 */
export function searchAll({ tasks, habits, categories }, query) {
  const q = normalizeSearchText(query);
  if (!q) {
    return { incompleteTasks: [], completedTasks: [], habits: [], truncated: false, totalCount: 0 };
  }

  const taskResults = searchTasks(tasks || [], q, categories);
  const habitResults = searchHabits(habits || [], q);
  const incompleteTasks = taskResults.filter((t) => !t.completed);
  const completedTasks = taskResults.filter((t) => t.completed);
  const totalCount = incompleteTasks.length + completedTasks.length + habitResults.length;
  const truncated = totalCount > MAX_RESULTS;

  let remaining = MAX_RESULTS;
  const inc = incompleteTasks.slice(0, remaining);
  remaining -= inc.length;
  const comp = completedTasks.slice(0, remaining);
  remaining -= comp.length;
  const hab = habitResults.slice(0, remaining);

  return {
    incompleteTasks: inc,
    completedTasks: comp,
    habits: hab,
    truncated,
    totalCount,
  };
}

/**
 * 安全高亮匹配文字（防 XSS）
 * @returns {string} 已 escape 的 HTML，匹配處包 <mark>
 */
export function highlightMatchedText(text, query) {
  const raw = text || '';
  const q = normalizeSearchText(query);
  if (!q || !raw) return escapeHtml(raw);

  const lower = raw.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return escapeHtml(raw);

  const before = raw.slice(0, idx);
  const match = raw.slice(idx, idx + q.length);
  const after = raw.slice(idx + q.length);

  return `${escapeHtml(before)}<mark class="search-highlight">${escapeHtml(match)}</mark>${highlightMatchedText(after, query)}`;
}

export { MAX_RESULTS };
