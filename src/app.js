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
  getCompanion,
} from './collectionService.js';
import { getDefaultCompanionLine } from './companionService.js';
import { mergeAllPetsWithLore } from './loreService.js';
import {
  loadExpeditionAreas,
  getActiveExpedition,
} from './expeditionService.js';
import { initUI, renderAll } from './ui.js';

/** @type {object} 全域 App 狀態 */
const appState = {
  tasks: [],
  wallet: { stardust: 0, adventureEnergy: 0, materials: {} },
  gachaStats: { ssrPity: 0, urPity: 0, totalPulls: 0 },
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
  onReset: resetAllData,
};

/**
 * 從 JSON 載入寵物與卡池資料（每次啟動讀取最新版）
 */
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
  appState.companion = await getCompanion(appState.allPets);
  appState.companionLine = getDefaultCompanionLine(
    appState.tasks,
    appState.todayCompleted,
    appState.companion
  );
  appState.activeExpedition = await getActiveExpedition();

  await renderAll();
}

/** 重置所有使用者資料 */
async function resetAllData() {
  await clearAllData();
  await initWallet();
  await initGachaStats();
}

/**
 * 註冊 Service Worker，並監聽新版本提示使用者重新載入
 */
let swRefreshing = false;

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.register('./service-worker.js');
    console.log('[QuestNote] SW registered:', reg.scope);

    // 已有等待中的新版 SW
    if (reg.waiting) {
      showUpdateBanner(reg);
    }

    // 偵測背景下載完成的新版 SW
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBanner(reg);
        }
      });
    });

    // App 回到前景時檢查更新
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        reg.update().catch(() => {});
      }
    });

    // 新版 SW 接手後自動重新載入
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (swRefreshing) return;
      swRefreshing = true;
      window.location.reload();
    });
  } catch (err) {
    console.warn('[QuestNote] SW registration failed:', err);
  }
}

/** 顯示更新提示橫幅 */
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
