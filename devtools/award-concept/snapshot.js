/** Presentation-only adapter. Catalogs + readonly local save; no game writes. */
import { normalizeTask } from '../../src/taskMigration.js';
import { getTodayDateString, isCompletedToday, isInTodayPlan } from '../../src/taskFilterService.js';
import { mergeAllPetsWithLore } from '../../src/loreService.js';
import { createCollectionEntry, getBondLevelFromExp } from '../../src/collectionService.js';
import { normalizeWallet } from '../../src/rewardService.js';

const PREVIEW_KEY = 'questnote-award-baseline-v2';

export async function readLocalSave() {
  if (typeof indexedDB.databases !== 'function') return null;
  const databases = await indexedDB.databases();
  const existing = databases.find((entry) => entry.name === 'QuestNoteDB');
  if (!existing) return null; // Never create a database for a visual preview.
  const database = await new Promise((resolve, reject) => {
    const request = indexedDB.open(existing.name);
    request.onupgradeneeded = () => request.transaction.abort();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    const names = ['tasks', 'meta', 'collection'].filter((name) => database.objectStoreNames.contains(name));
    const transaction = database.transaction(names, 'readonly');
    const entries = await Promise.all(names.map((name) => new Promise((resolve, reject) => {
      const request = transaction.objectStore(name).getAll();
      request.onsuccess = () => resolve([name, request.result]);
      request.onerror = () => reject(request.error);
    })));
    return Object.fromEntries(entries);
  } finally {
    database.close();
  }
}

function briefTasks(today) {
  // These are the user's actual requested next actions, not invented sample tasks.
  return [
    ['award-direction', '製作 QuestNote 首頁視覺實驗', 'important', '專題'],
    ['award-compare', '比較目前版本與新版', 'normal', '專題'],
  ].map(([id, title, priority]) => normalizeTask({
    id, title, content: title, priority, categoryId: 'project',
    completed: false, rewardClaimed: false, type: 'one_time',
    isPlannedToday: true, plannedDate: today, subtasks: [],
    createdAt: `${today}T00:00:00+08:00`, updatedAt: `${today}T00:00:00+08:00`,
  }, today));
}

export async function loadPresentation({ fresh = false } = {}) {
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname)) {
    throw new Error('This design study is available only on the local development origin.');
  }
  const today = getTodayDateString();
  if (!fresh) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(PREVIEW_KEY));
      if (saved?.today === today) return structuredClone(saved);
    } catch { /* An unavailable session store does not block readonly rendering. */ }
  }
  const [petsData, loreData, categoriesData, achievements, titlesData, save] = await Promise.all([
    fetch('/data/pets.json').then((response) => response.json()),
    fetch('/data/pets-lore.json').then((response) => response.json()),
    fetch('/data/categories.json').then((response) => response.json()),
    fetch('/data/achievements.json').then((response) => response.json()),
    fetch('/data/titles.json').then((response) => response.json()),
    readLocalSave(),
  ]);
  const allPets = mergeAllPetsWithLore(petsData.pets, loreData);
  const actualTasks = (save?.tasks || []).map((task) => normalizeTask(task, today));
  const hasPending = actualTasks.some((task) => !task.completed && isInTodayPlan(task, today));
  const tasks = hasPending ? actualTasks : [...actualTasks, ...briefTasks(today)];
  const meta = Object.fromEntries((save?.meta || []).map((entry) => [entry.key, entry]));
  const companionEntry = save?.collection?.find((entry) => entry.isCompanion);
  const catalogPet = allPets.find((pet) => pet.id === companionEntry?.petId) || allPets.find((pet) => pet.id === 'pet_n01');
  const companion = {
    ...(companionEntry || createCollectionEntry(catalogPet.id)), ...catalogPet,
    owned: !!companionEntry, displayName: companionEntry?.nickname || catalogPet.name,
    bondLevel: getBondLevelFromExp(companionEntry?.bondExp || 0),
  };
  const presentation = {
    today, tasks, companion, allPets, wallet: normalizeWallet(meta.wallet),
    categories: categoriesData.categories || categoriesData,
    todayCompleted: actualTasks.filter((task) => isCompletedToday(task, today)).length,
    collection: save?.collection || [],
    achievementSummary: {
      catalogLoaded: true,
      claimable: (meta.achievements?.unlockedAchievementIds || []).filter((id) => !(meta.achievements?.claimedAchievementIds || []).includes(id)).length,
      equippedTitle: titlesData.titles.find((title) => title.id === meta.achievements?.equippedTitleId) || null,
      recentUnlocked: (meta.achievements?.unlockedAchievementIds || []).slice(-3).reverse().map((id) => achievements.find((entry) => entry.id === id)).filter(Boolean),
    },
    source: {
      tasks: hasPending ? '此本機 origin 的今日任務' : '本次委託的真實工作內容；已有本機任務也一併保留',
      pet: companionEntry ? '此本機 origin 的陪伴夥伴' : '既有圖鑑的灰影幼狼；展示用途，未加入收藏',
      wallet: save ? '此本機 origin 的實際資源' : '沒有存檔，資源從 0 開始',
    },
  };
  try { sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(presentation)); } catch { /* Optional. */ }
  return structuredClone(presentation);
}

export function resetBaseline() {
  try { sessionStorage.removeItem(PREVIEW_KEY); } catch { /* Optional. */ }
}
