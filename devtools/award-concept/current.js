import { loadPresentation } from './snapshot.js';
import { initUI, renderView, showToast } from '../../src/ui.js';
import { getDefaultCompanionLine } from '../../src/companionService.js';

try {
  const baseline = await loadPresentation();
  const poolsData = await fetch('/data/pools.json').then((response) => response.json());
  const transaction = IDBDatabase.prototype.transaction;
  IDBDatabase.prototype.transaction = function (stores, mode, ...options) {
    if (mode === 'readwrite') throw new Error('The current comparison frame is readonly.');
    return transaction.call(this, stores, mode, ...options);
  };
  // Capturing before the existing handlers prevents all game writes in this frame.
  document.addEventListener('click', (event) => {
    if (!event.target.closest('#app')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    showToast('CURRENT 為唯讀比較；切換 AWARD CONCEPT 可體驗新版互動。', 'info');
  }, true);
  document.addEventListener('submit', (event) => { event.preventDefault(); event.stopImmediatePropagation(); }, true);
  document.addEventListener('keydown', (event) => {
    if (event.target.closest('#app') && ['Enter', ' '].includes(event.key)) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
  const state = {
    ...baseline, poolsData,
    companionLine: getDefaultCompanionLine(baseline.tasks, baseline.todayCompleted, baseline.companion),
    availablePulls: Math.floor(baseline.wallet.stardust / 100),
    gachaStats: { ssrPity: 0, urPity: 0, totalPulls: 0 },
    poolUnlockState: { byPool: {} },
    userPreferences: { theme: 'default', reduceMotion: false },
    habitStats: null, habits: [], questSummary: null,
    dailyCheckIn: null, enrichedCollection: [], collectionMilestoneSummary: null,
    activeExpedition: null, expeditionAreas: [], inventory: { items: {} },
    craftablesCatalog: [], materialsCatalog: [],
  };
  initUI(state, async () => {}, async () => {});
  renderView('tasks');
  document.getElementById('app-loader')?.remove();
  document.body.dataset.ready = 'true';
} catch (error) {
  document.body.textContent = `無法載入目前首頁：${error.message}`;
}
