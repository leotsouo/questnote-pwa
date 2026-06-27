/**
 * 任務 CRUD 與完成邏輯
 */
import { dbGetAll, dbPut, dbDelete, STORES } from './db.js';
import { claimTaskReward } from './rewardService.js';

/** 從 content 第一行擷取標題 */
export function extractTitle(content) {
  const firstLine = (content || '').split('\n')[0].trim();
  return firstLine || '未命名任務';
}

/** 產生唯一 ID */
function generateId() {
  return crypto.randomUUID();
}

/** 取得所有任務 */
export async function getAllTasks() {
  return dbGetAll(STORES.TASKS);
}

/** 依 ID 取得任務 */
export async function getTaskById(id) {
  const tasks = await getAllTasks();
  return tasks.find((t) => t.id === id) ?? null;
}

/**
 * 新增任務
 * @param {{ content: string, priority: string, type: string }} data
 */
export async function createTask(data) {
  const now = new Date().toISOString();
  const task = {
    id: generateId(),
    content: data.content.trim(),
    title: extractTitle(data.content),
    priority: data.priority || 'normal',
    type: data.type || 'one_time',
    completed: false,
    rewardClaimed: false,
    lastRewardClaimedAt: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
  await dbPut(STORES.TASKS, task);
  return task;
}

/**
 * 更新任務
 */
export async function updateTask(id, updates) {
  const task = await getTaskById(id);
  if (!task) throw new Error('任務不存在');

  const now = new Date().toISOString();
  const updated = {
    ...task,
    ...updates,
    updatedAt: now,
  };

  if (updates.content !== undefined) {
    updated.content = updates.content.trim();
    updated.title = extractTitle(updated.content);
  }

  await dbPut(STORES.TASKS, updated);
  return updated;
}

/** 刪除任務 */
export async function deleteTask(id) {
  await dbDelete(STORES.TASKS, id);
}

/**
 * 切換任務完成狀態，完成時自動發放獎勵
 * @returns {{ task: object, reward: object|null }}
 */
export async function toggleTaskComplete(id) {
  const task = await getTaskById(id);
  if (!task) throw new Error('任務不存在');

  const now = new Date().toISOString();

  if (task.completed) {
    // 改回未完成 — 不重置 rewardClaimed
    const updated = await updateTask(id, {
      completed: false,
      completedAt: null,
    });
    return { task: updated, reward: null };
  }

  // 標記完成
  const updated = await updateTask(id, {
    completed: true,
    completedAt: now,
  });

  // 自動發放獎勵
  const reward = await claimTaskReward(updated);
  return { task: reward.task, reward: reward.amount > 0 ? reward : null };
}

/** 今日完成的任務數 */
export async function getTodayCompletedCount() {
  const tasks = await getAllTasks();
  const today = new Date().toISOString().split('T')[0];
  return tasks.filter(
    (t) => t.completed && t.completedAt && t.completedAt.startsWith(today)
  ).length;
}

/** 匯出所有任務（備份用） */
export async function exportTasks() {
  return getAllTasks();
}

/** 匯入任務（備份還原用，預留） */
export async function importTasks(tasks) {
  for (const task of tasks) {
    await dbPut(STORES.TASKS, task);
  }
}
