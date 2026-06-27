/**
 * Quick Add 快速新增解析
 */
import { dedupeTags, normalizeTag } from './tagService.js';
import { getTodayDateString } from './taskFilterService.js';

const PRIORITY_MAP = {
  普通: 'normal',
  重要: 'important',
  緊急: 'urgent',
};

/** 從輸入擷取 #標籤 */
export function extractTags(input) {
  const tags = [];
  const regex = /#([^\s#!,，、]+)/g;
  let match;
  while ((match = regex.exec(input)) !== null) {
    const tag = normalizeTag(match[1]);
    if (tag) tags.push(tag);
  }
  return dedupeTags(tags);
}

/** 從輸入擷取優先級 !普通/!重要/!緊急 */
export function extractPriority(input) {
  const match = input.match(/!(普通|重要|緊急)/);
  if (!match) return 'normal';
  return PRIORITY_MAP[match[1]] || 'normal';
}

/** 日期加天數 */
function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const ny = dt.getFullYear();
  const nm = String(dt.getMonth() + 1).padStart(2, '0');
  const nd = String(dt.getDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

/** 從輸入擷取截止日 */
export function extractDate(input, today = getTodayDateString()) {
  const isoMatch = input.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  const mdMatch = input.match(/\b(\d{1,2})\/(\d{1,2})\b/);
  if (mdMatch) {
    const year = new Date().getFullYear();
    const m = String(Number(mdMatch[1])).padStart(2, '0');
    const d = String(Number(mdMatch[2])).padStart(2, '0');
    return `${year}-${m}-${d}`;
  }

  if (/今天/.test(input) && !/今天做/.test(input)) {
    return today;
  }
  if (/明天/.test(input)) return addDays(today, 1);
  if (/後天/.test(input)) return addDays(today, 2);

  return null;
}

/** 是否加入今日計畫 */
export function extractPlannedToday(input) {
  return /加入今日|今天做/.test(input);
}

/** 清理任務內容，移除已解析的 token */
export function cleanTaskContent(input, parsedTokens = {}) {
  let text = input;

  text = text.replace(/#([^\s#!,，、]+)/g, '');
  text = text.replace(/!(普通|重要|緊急)/g, '');
  text = text.replace(/\b\d{4}-\d{2}-\d{2}\b/g, '');
  text = text.replace(/\b\d{1,2}\/\d{1,2}\b/g, '');
  text = text.replace(/加入今日|今天做/g, '');

  const dateWords = ['今天', '明天', '後天'];
  for (const word of dateWords) {
    if (parsedTokens.removeDateWords !== false) {
      text = text.replace(new RegExp(word, 'g'), '');
    }
  }

  text = text.replace(/[，,]+/g, ' ');
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

/** 解析 Quick Add 輸入 */
export function parseQuickAddInput(input, today = getTodayDateString()) {
  const raw = (input || '').trim();
  const tags = extractTags(raw);
  const priority = extractPriority(raw);
  const dueDate = extractDate(raw, today);
  const isPlannedToday = extractPlannedToday(raw);
  const content = cleanTaskContent(raw, { removeDateWords: true });

  return {
    content,
    priority,
    tags,
    dueDate,
    isPlannedToday,
    plannedDate: isPlannedToday ? today : null,
  };
}

/** 從解析結果建立任務 payload */
export function buildTaskFromQuickAdd(parsedResult) {
  const today = getTodayDateString();
  return {
    content: parsedResult.content,
    priority: parsedResult.priority || 'normal',
    type: 'one_time',
    categoryId: 'general',
    tags: parsedResult.tags || [],
    dueDate: parsedResult.dueDate || null,
    startDate: null,
    planToday: !!parsedResult.isPlannedToday,
    isPlannedToday: !!parsedResult.isPlannedToday,
    plannedDate: parsedResult.isPlannedToday ? today : null,
    subtasks: [],
  };
}

/** 產生解析預覽文字（供 UI 顯示） */
export function getQuickAddPreview(parsed, today = getTodayDateString()) {
  const parts = [];
  if (parsed.dueDate) {
    let label = parsed.dueDate;
    if (parsed.dueDate === today) label = '今天';
    else if (parsed.dueDate === addDays(today, 1)) label = '明天';
    else if (parsed.dueDate === addDays(today, 2)) label = '後天';
    parts.push({ key: 'dueDate', label: `截止日：${label}` });
  }
  if (parsed.priority && parsed.priority !== 'normal') {
    const labels = { important: '重要', urgent: '緊急' };
    parts.push({ key: 'priority', label: `優先級：${labels[parsed.priority] || parsed.priority}` });
  }
  if (parsed.tags?.length) {
    parts.push({ key: 'tags', label: `標籤：${parsed.tags.map((t) => `#${t}`).join(' ')}` });
  }
  if (parsed.isPlannedToday) {
    parts.push({ key: 'plan', label: '加入今日計畫' });
  }
  return parts;
}
