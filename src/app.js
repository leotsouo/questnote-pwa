/**
 * QuestNote 主程式 — 初始化、資料載入、狀態管理
 */
import { openDB, clearAllData } from './db.js';
import { getAllTasks, getTodayCompletedCount } from './taskService.js';
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
} from './collectionService.js';
import { initUI, renderAll } from './ui.js';

/** @type {object} 全域 App 狀態 */
const appState = {
  tasks: [],
  wallet: { stardust: 0 },
  gachaStats: { ssrPity: 0, urPity: 0, totalPulls: 0 },
  allPets: [],
  poolsData: { pools: [] },
  collectionProgress: { owned: 0, total: 0 },
  enrichedCollection: [],
  todayCompleted: 0,
  availablePulls: 0,
  onReset: resetAllData,
};

/**
 * 從 JSON 載入寵物與卡池資料（每次啟動讀取最新版）
 */
async function loadGameData() {
  const [petsRes, poolsRes] = await Promise.all([
    fetch('./data/pets.json'),
    fetch('./data/pools.json'),
  ]);

  if (!petsRes.ok || !poolsRes.ok) {
    throw new Error('無法載入遊戲資料');
  }

  const petsData = await petsRes.json();
  const poolsData = await poolsRes.json();

  appState.allPets = petsData.pets || [];
  appState.poolsData = poolsData;

  // 同步圖鑑 — 新寵物自動顯示未獲得
  await syncWithPetDatabase(appState.allPets);
}

/**
 * 刷新所有狀態並重新渲染 UI
 */
async function refreshState() {
  const [tasks, wallet, gachaStats, todayCompleted, availablePulls] =
    await Promise.all([
      getAllTasks(),
      getWallet(),
      getGachaStats(),
      getTodayCompletedCount(),
      getAvailablePulls(),
    ]);

  appState.tasks = tasks.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });
  appState.wallet = wallet;
  appState.gachaStats = gachaStats;
  appState.todayCompleted = todayCompleted;
  appState.availablePulls = availablePulls;
  appState.collectionProgress = await getCollectionProgress(appState.allPets);
  appState.enrichedCollection = await getEnrichedCollection(appState.allPets);

  await renderAll();
}

/** 重置所有使用者資料 */
async function resetAllData() {
  await clearAllData();
  await initWallet();
  await initGachaStats();
}

/**
 * 註冊 Service Worker
 */
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.register('./service-worker.js');
    console.log('[QuestNote] SW registered:', reg.scope);
  } catch (err) {
    console.warn('[QuestNote] SW registration failed:', err);
  }
}

/**
 * App 啟動
 */
async function initApp() {
  const loader = document.getElementById('app-loader');

  try {
    await openDB();
    await initWallet();
    await initGachaStats();
    await loadGameData();

    initUI(appState, refreshState);
    await refreshState();

    await registerServiceWorker();
  } catch (err) {
    console.error('[QuestNote] Init failed:', err);
    if (loader) {
      loader.innerHTML = `<p class="error-msg">載入失敗：${err.message}</p>`;
    }
    return;
  }

  if (loader) loader.remove();
}

document.addEventListener('DOMContentLoaded', initApp);
