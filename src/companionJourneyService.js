/** Real task memories. Old tasks are never attributed to a companion retroactively. */
import { getBondLevelFromExp, getBondProgress } from './collectionService.js';

export function createTaskMemory(task, companion, now) {
  const count = companion ? (companion.journeyTaskCount || 0) + 1 : 0;
  const meaningful = task.worthRemembering === true;
  const milestone = count === 1 || [10, 25, 50].includes(count) || (count > 0 && count % 100 === 0);
  return {
    petId: companion?.petId || null,
    taskTitle: task.title,
    completedAt: now,
    ordinal: count,
    meaningful,
    milestone,
    bondBefore: companion?.bondExp || 0,
    bondAfter: companion?.bondExp || 0,
  };
}

export function getTaskMemories(tasks, petId = undefined) {
  return (tasks || []).filter((task) => task.completed && task.completionMemory
    && (petId === undefined || task.completionMemory.petId === petId))
    .map((task) => ({ ...task.completionMemory, taskId: task.id }))
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt) || a.taskId.localeCompare(b.taskId));
}

export function getMemoryHeading(memory) {
  if (memory.meaningful) return '你想記住的這件事，完成了';
  if (!memory.petId) return '你又往前了一步';
  if (memory.ordinal === 1) return '我們一起完成的第一件事';
  if (memory.milestone) return `一起走過 ${memory.ordinal} 件事`;
  if (getBondLevelFromExp(memory.bondAfter) > getBondLevelFromExp(memory.bondBefore)) return '我們又更靠近了一點';
  return '又一起往前了一步';
}

/** Prefer authored character dialogue; choose stably so refresh does not rewrite a memory. */
export function getCompletionLine(pet, memory) {
  if (!pet) return '這一步是你親自完成的，值得被記住。';
  const lines = pet.dialogues?.praise?.filter((line) => typeof line === 'string' && line.trim()
    && !/連續|不少|好多|多項|多個|很多/.test(line));
  if (lines?.length) return lines[Math.max(0, memory.ordinal - 1) % lines.length];
  const personality = (pet.personality || []).join(' ');
  if (/活潑|衝動|熱情|好動/.test(personality)) return '做到了！我陪你一起記住這一刻。';
  if (/冷靜|沉穩|寡言|謹慎/.test(personality)) return '這一步走得踏實。我記得你的努力。';
  return '我看見你完成了這件事。今天又多了一段共同的回憶。';
}

export function getMemoryProgress(memory) {
  const level = getBondLevelFromExp(memory.bondAfter);
  const progress = getBondProgress(memory.bondAfter, level);
  const unlocks = { 1: '親近台詞', 2: '羈絆徽章', 3: '首頁陪伴特效', 4: '羈絆外框與故事' };
  return {
    ...progress,
    level,
    gained: memory.bondAfter - memory.bondBefore,
    unlocked: level > getBondLevelFromExp(memory.bondBefore) ? `已解鎖${unlocks[level - 1]}，可以到夥伴詳情查看。` : '',
    next: level >= 5 ? '羈絆故事已解鎖，共同的旅程還在繼續。'
      : `再累積 ${Math.max(0, progress.max - progress.current)} 親密度，解鎖${unlocks[level]}。`,
  };
}
