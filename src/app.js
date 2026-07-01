/**

 * QuestNote 主程式 — 初始化、資料載入、狀態管理

 */

import { openDB, clearAllData } from './db.js';

import { getAllTasks } from './taskService.js';

import { migrateTasks } from './taskMigration.js';

import { sortTasks, getTodayDateString, isCompletedToday } from './taskFilterService.js';

import { loadCategoriesCatalog } from './categoryService.js';

import {

  initWallet,

  getWallet,

  getAvailablePulls,

} from './rewardService.js';

import {

  initGachaStats,

  getGachaStats,

} from './gachaService.js';

import {

  syncWithPetDatabase,

  getCollectionProgress,

  getEnrichedCollection,

  getCompanion,

  migrateCollectionNicknames,

} from './collectionService.js';

import { getWelcomeCompanionLine } from './companionDialogueService.js';

import { initUserPreferences, getUserPreferences, applyThemeToDocument } from './preferencesService.js';

import {

  initAchievements,

  loadAchievementsCatalog,

  loadTitlesCatalog,

  checkAndUnlockAchievements,

  getAchievementSummary,

} from './achievementService.js';

import { mergeAllPetsWithLore } from './loreService.js';

import {

  loadExpeditionAreas,

  getActiveExpedition,

} from './expeditionService.js';

import { initHabits, getAllHabits, getHabitPageStats } from './habitService.js';
import { initDailyCheckIn, getDailyCheckIn, loadWheelRewards } from './dailyCheckInService.js';

import {
  initWorkshop,
  loadMaterials,
  loadCraftables,
  getInventory,
  getWorkshopStats,
  getEnabledCraftables,
  hasCraftableMaterials,
  hasBondItemsInInventory,
  companionLikesAnyGift,
  hasLowMaterials,
} from './workshopService.js';

import { initUI, renderAll, applyReduceMotionClass } from './ui.js';
import { runAppHealthCheck } from './healthCheckService.js';
import { getServiceWorkerRegisterUrl } from './version.js';



/** @type {object} 全域 App 狀態 */

const appState = {

  tasks: [],

  wallet: { stardust: 0, adventureEnergy: 0, materials: {} },

  gachaStats: { ssrPity: 0, urPity: 0, totalPulls: 0, tenPullCount: 0 },

  allPets: [],

  poolsData: { pools: [] },

  expeditionAreas: [],

  activeExpedition: null,

  collectionProgress: { owned: 0, total: 0 },

  enrichedCollection: [],

  companion: null,

  companionLine: '',

  todayCompleted: 0,

  availablePulls: 0,

  userPreferences: { reduceMotion: false, theme: 'default' },

  achievementSummary: null,

  categories: [],

  habits: [],

  habitStats: null,

  habitsLoadError: false,

  inventory: { items: {}, itemUsageLogs: {} },

  workshopStats: {
    craftCount: 0,
    giftCount: 0,
    favoriteGiftCount: 0,
  },

  materialsCatalog: [],

  craftablesCatalog: [],

  dailyCheckIn: null,

  onReset: resetAllData,

};



/** 上次已知日期，用於偵測跨日 */

let lastKnownDate = getTodayDateString();



async function loadGameData() {

  const [petsRes, poolsRes, loreRes, expeditionsRes] = await Promise.all([

    fetch('./data/pets.json'),

    fetch('./data/pools.json'),

    fetch('./data/pets-lore.json'),

    fetch('./data/expeditions.json'),

  ]);



  if (!petsRes.ok || !poolsRes.ok) {

    throw new Error('無法載入遊戲資料');

  }



  const petsData = await petsRes.json();

  const poolsData = await poolsRes.json();

  const loreData = loreRes.ok ? await loreRes.json() : { lore: [] };



  appState.allPets = mergeAllPetsWithLore(petsData.pets || [], loreData);

  appState.poolsData = poolsData;



  if (expeditionsRes.ok) {

    const expData = await expeditionsRes.json();

    appState.expeditionAreas = expData.areas || [];

  } else {

    appState.expeditionAreas = await loadExpeditionAreas().catch(() => []);

  }



  await syncWithPetDatabase(appState.allPets);

}



async function refreshState() {

  const today = getTodayDateString();

  if (today !== lastKnownDate) {

    lastKnownDate = today;

  }



  let habitsLoadError = false;

  const [tasks, wallet, gachaStats, availablePulls, habits, inventory, workshopStats, dailyCheckIn] =

    await Promise.all([

      getAllTasks(),

      getWallet(),

      getGachaStats(),

      getAvailablePulls(),

      getAllHabits().catch((err) => {

        console.error('[QuestNote] 習慣載入失敗:', err);

        habitsLoadError = true;

        return [];

      }),

      getInventory().catch((err) => {

        console.error('[QuestNote] 工坊庫存載入失敗:', err);

        return { items: {}, itemUsageLogs: {} };

      }),

      getWorkshopStats().catch((err) => {

        console.error('[QuestNote] 工坊統計載入失敗:', err);

        return { craftCount: 0, giftCount: 0, favoriteGiftCount: 0 };

      }),

      getDailyCheckIn().catch((err) => {

        console.error('[QuestNote] 每日祝福載入失敗:', err);

        return null;

      }),

    ]);



  const todayCompleted = tasks.filter((t) => isCompletedToday(t, today)).length;



  appState.habitsLoadError = habitsLoadError;

  appState.habits = habits;

  appState.habitStats = getHabitPageStats(habits, today);

  appState.inventory = inventory;

  appState.workshopStats = workshopStats;

  appState.dailyCheckIn = dailyCheckIn;

  appState.tasks = sortTasks(tasks);

  appState.wallet = wallet;

  appState.gachaStats = gachaStats;

  appState.todayCompleted = todayCompleted;

  appState.availablePulls = availablePulls;

  appState.collectionProgress = await getCollectionProgress(appState.allPets);

  appState.enrichedCollection = await getEnrichedCollection(appState.allPets);

  appState.companion = await getCompanion(appState.allPets);

  appState.activeExpedition = await getActiveExpedition();

  appState.userPreferences = await getUserPreferences();

  appState.companionLine = getWelcomeCompanionLine({

    tasks: appState.tasks,

    todayCompleted: appState.todayCompleted,

    companion: appState.companion,

    wallet: appState.wallet,

    activeExpedition: appState.activeExpedition,

    expeditionAreas: appState.expeditionAreas,

    habits: appState.habits,

    inventory: appState.inventory,

    dailyCheckIn: appState.dailyCheckIn,

    craftables: appState.craftablesCatalog,

    workshopHelpers: {
      hasCraftableMaterials,
      hasBondItemsInInventory,
      companionLikesAnyGift,
      hasLowMaterials,
    },

    isWelcome: true,

  });



  appState.achievementSummary = await getAchievementSummary(appState.allPets);



  await renderAll();

}



async function resetAllData() {

  await clearAllData();

  await initWallet();

  await initGachaStats();

  await initUserPreferences();

  await initAchievements();

  await initDailyCheckIn();

  await initWorkshop();

}



export async function runAchievementCheck() {

  const result = await checkAndUnlockAchievements(appState.allPets);

  if (result.newlyUnlocked.length > 0) {

    appState.achievementSummary = await getAchievementSummary(appState.allPets);

  }

  return result;

}



let swRefreshing = false;



async function registerServiceWorker() {

  if (!('serviceWorker' in navigator)) return;



  try {

    const reg = await navigator.serviceWorker.register(getServiceWorkerRegisterUrl());

    console.log('[QuestNote] SW registered:', reg.scope);



    if (reg.waiting) {

      showUpdateBanner(reg);

    }



    reg.addEventListener('updatefound', () => {

      const newWorker = reg.installing;

      if (!newWorker) return;



      newWorker.addEventListener('statechange', () => {

        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {

          showUpdateBanner(reg);

        }

      });

    });



    document.addEventListener('visibilitychange', () => {

      if (document.visibilityState === 'visible') {

        reg.update().catch(() => {});

        const today = getTodayDateString();

        if (today !== lastKnownDate) {

          lastKnownDate = today;

          refreshState().catch((err) => console.warn('[QuestNote] 跨日刷新失敗:', err));

        }

      }

    });



    navigator.serviceWorker.addEventListener('controllerchange', () => {

      if (swRefreshing) return;

      swRefreshing = true;

      window.location.reload();

    });

  } catch (err) {

    console.warn('[QuestNote] SW registration failed:', err);

  }

}



function showUpdateBanner(reg) {

  if (document.getElementById('update-banner')) return;



  const banner = document.createElement('div');

  banner.id = 'update-banner';

  banner.className = 'update-banner';

  banner.innerHTML = `

    <p class="update-banner__text">有新版本可用</p>

    <button type="button" class="btn btn--primary btn--sm" id="btn-update-reload">立即更新</button>

  `;

  document.body.appendChild(banner);

  requestAnimationFrame(() => banner.classList.add('show'));



  document.getElementById('btn-update-reload')?.addEventListener('click', () => {

    if (reg.waiting) {

      reg.waiting.postMessage({ type: 'SKIP_WAITING' });

    } else {

      window.location.reload();

    }

  });

}



async function initApp() {

  const loader = document.getElementById('app-loader');

  const hideLoader = () => loader?.remove();



  try {

    await openDB();

    await initUserPreferences();
    appState.userPreferences = await getUserPreferences();
    applyThemeToDocument(appState.userPreferences.theme);
    applyReduceMotionClass(appState.userPreferences?.reduceMotion ?? false);

    // 儘早綁定 UI，確保畫面可互動
    initUI(appState, refreshState, runAchievementCheck);
    hideLoader();



    const migrationResult = await migrateTasks();

    if (migrationResult.error) {

      console.error('[QuestNote] 任務遷移錯誤:', migrationResult.error);

    }



    const habitInit = await initHabits();

    if (!habitInit.success) {

      console.error('[QuestNote] 習慣初始化錯誤:', habitInit.error);

    }



    await initWallet();

    await initGachaStats();

  await initAchievements();

  await initDailyCheckIn();

  try {
    await loadWheelRewards();
  } catch (err) {
    console.warn('[QuestNote] 轉盤獎勵預載失敗:', err);
  }

  try {

      await initWorkshop();

      appState.materialsCatalog = await loadMaterials();

      appState.craftablesCatalog = await loadCraftables();

    } catch (err) {

      console.error('[QuestNote] 工坊初始化錯誤:', err);

      const { showToast } = await import('./ui.js');

      showToast('工坊資料初始化時發生問題，請稍後再試。', 'error');

    }

    try {

      await migrateCollectionNicknames();

    } catch (err) {

      console.error('[QuestNote] 暱稱 migration 錯誤:', err);

    }

    appState.userPreferences = await getUserPreferences();
    applyThemeToDocument(appState.userPreferences.theme);
    applyReduceMotionClass(appState.userPreferences?.reduceMotion ?? false);

    await loadAchievementsCatalog();

    await loadTitlesCatalog();



    try {

      await loadGameData();

    } catch (err) {

      console.error('[QuestNote] 遊戲資料載入失敗:', err);

      const { showToast } = await import('./ui.js');

      showToast('遊戲資料載入失敗，部分功能可能受影響', 'error');

    }



    try {

      appState.categories = await loadCategoriesCatalog();

    } catch (err) {

      console.error('[QuestNote] 分類載入失敗:', err);

      appState.categories = [];

    }



    if (migrationResult?.error) {

      const { showToast } = await import('./ui.js');

      showToast('任務資料升級時發生錯誤，部分功能可能受影響', 'error');

    }



    if (!habitInit?.success) {

      const { showToast } = await import('./ui.js');

      showToast('習慣資料初始化時發生錯誤，部分功能可能受影響', 'error');

    }



    await refreshState();



    const startupAchievements = await checkAndUnlockAchievements(appState.allPets);

    if (startupAchievements.newlyUnlocked.length > 0) {

      appState.achievementSummary = await getAchievementSummary(appState.allPets);

      await renderAll();

    }



    registerServiceWorker().catch((err) => {

      console.warn('[QuestNote] SW registration failed:', err);

    });

  } catch (err) {

    console.error('[QuestNote] Init failed:', err);

    hideLoader();

    try {

      initUI(appState, refreshState, runAchievementCheck);

    } catch (uiErr) {

      console.error('[QuestNote] UI init failed:', uiErr);

    }

    if (loader) {

      loader.innerHTML = `<p class="error-msg">載入失敗：${err.message}</p>`;

    }

  }

}



document.addEventListener('DOMContentLoaded', initApp);

if (typeof window !== 'undefined') {
  window.runAppHealthCheck = runAppHealthCheck;
}


