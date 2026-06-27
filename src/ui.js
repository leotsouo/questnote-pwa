/**
 * UI 渲染與互動邏輯
 */
import {
  createTask,
  updateTask,
  deleteTask,
  toggleTaskComplete,
} from './taskService.js';
import { GACHA_COST } from './rewardService.js';
import { pullOnce, getActivePool } from './gachaService.js';
import {
  upgradeStar,
  STAR_UPGRADE_COST,
} from './collectionService.js';
import { downloadBackup } from './backupService.js';

/** 稀有度中文與色彩 */
export const RARITY_LABELS = {
  N: 'N',
  R: 'R',
  SR: 'SR',
  SSR: 'SSR',
  UR: 'UR',
};

export const PRIORITY_LABELS = {
  normal: '普通',
  important: '重要',
  urgent: '緊急',
};

export const TYPE_LABELS = {
  one_time: '一次性',
  repeatable: '可重複',
};

/** App 狀態參考（由 app.js 注入） */
let state = null;
let onRefresh = null;

export function initUI(appState, refreshCallback) {
  state = appState;
  onRefresh = refreshCallback;
  bindNavigation();
  bindModals();
  bindDelegatedEvents();

  document.getElementById('collection-filters')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    collectionFilter = btn.dataset.filter;
    renderCollectionView();
  });
}

/** 使用事件委派，避免重複渲染後按鈕失效 */
function bindDelegatedEvents() {
  document.getElementById('view-tasks')?.addEventListener('click', async (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const card = target.closest('.task-card');
    const id = card?.dataset.id;
    const action = target.dataset.action;

    if (action === 'toggle' && id) {
      const result = await toggleTaskComplete(id);
      await onRefresh();
      if (result.reward) showRewardToast(result.reward.amount);
    } else if (action === 'edit' && id) {
      openTaskForm(id);
    } else if (action === 'delete' && id) {
      if (confirm('確定要刪除此任務嗎？')) {
        await deleteTask(id);
        await onRefresh();
      }
    }
  });

  document.getElementById('btn-add-task')?.addEventListener('click', () => openTaskForm());

  document.getElementById('toggle-completed')?.addEventListener('click', () => {
    const section = document.getElementById('completed-section');
    section?.classList.toggle('collapsed');
    const btn = document.getElementById('toggle-completed');
    const count = document.getElementById('completed-count')?.textContent || '0';
    if (btn) {
      const arrow = section?.classList.contains('collapsed') ? '▶' : '▼';
      btn.innerHTML = `${arrow} 已完成 <span id="completed-count">${count}</span>`;
    }
  });

  document.getElementById('btn-pull')?.addEventListener('click', handlePull);

  document.getElementById('view-collection')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="upgrade"]');
    if (!btn) return;
    const card = btn.closest('.collection-card');
    const petId = card?.dataset.petId;
    if (!petId) return;

    const pet = state.enrichedCollection.find((p) => p.id === petId);
    const nextStar = (pet?.stars || 1) + 1;
    const cost = STAR_UPGRADE_COST[nextStar];

    const result = await upgradeStar(petId);
    if (result.success) {
      await onRefresh();
      alert(`${pet.name} 升級至 ${result.entry.stars} 星！`);
    } else {
      alert(result.message || `升星需要 ${cost} 碎片`);
    }
  });

  document.getElementById('btn-export')?.addEventListener('click', async () => {
    try {
      await downloadBackup();
      alert('備份已下載！');
    } catch {
      alert('匯出失敗，請稍後再試');
    }
  });

  document.getElementById('btn-reset')?.addEventListener('click', handleReset);
}

function bindNavigation() {
  document.querySelectorAll('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      switchView(view);
    });
  });
}

export function switchView(viewName) {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));

  const view = document.getElementById(`view-${viewName}`);
  const nav = document.querySelector(`.nav-item[data-view="${viewName}"]`);
  if (view) view.classList.add('active');
  if (nav) nav.classList.add('active');
}

function bindModals() {
  document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
  });
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
}

export function openModal(contentHtml) {
  const overlay = document.getElementById('modal-overlay');
  const body = document.getElementById('modal-body');
  if (body) body.innerHTML = contentHtml;
  overlay?.classList.add('open');
}

export function closeModal() {
  document.getElementById('modal-overlay')?.classList.remove('open');
}

/** 寵物圖片含 fallback placeholder */
export function petImageHtml(pet, options = {}) {
  const { size = 'md', silhouette = false } = options;
  const cls = `pet-img pet-img--${size}${silhouette ? ' pet-img--silhouette' : ''}`;
  const placeholder = `<div class="${cls} pet-img--placeholder"><span>?</span></div>`;

  if (silhouette || !pet?.image) return placeholder;

  return `<img class="${cls}" src="${pet.image}" alt="${pet.name}"
    onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'${cls} pet-img--placeholder',innerHTML:'<span>?</span>'}))" />`;
}

/** 星級顯示 */
export function renderStars(count, max = 5) {
  let html = '<span class="stars">';
  for (let i = 1; i <= max; i++) {
    html += `<span class="star ${i <= count ? 'star--filled' : ''}">★</span>`;
  }
  html += '</span>';
  return html;
}

/** 渲染全部畫面 */
export async function renderAll() {
  if (!state) return;
  renderTasksView();
  renderGachaView();
  renderCollectionView();
  renderSettingsView();
}

/* ─── 任務頁 ─── */

function renderTasksView() {
  const { tasks, wallet, todayCompleted, collectionProgress, availablePulls } = state;

  setText('stat-stardust', wallet.stardust ?? 0);
  setText('stat-today', todayCompleted);
  setText('stat-collection', `${collectionProgress.owned}/${collectionProgress.total}`);
  setText('stat-pulls', availablePulls);

  const incomplete = tasks.filter((t) => !t.completed);
  const complete = tasks.filter((t) => t.completed);

  const listEl = document.getElementById('task-list-incomplete');
  const doneEl = document.getElementById('task-list-complete');
  const doneCount = document.getElementById('completed-count');

  if (listEl) {
    listEl.innerHTML =
      incomplete.length === 0
        ? '<p class="empty-hint">尚無未完成任務，點下方按鈕新增吧！</p>'
        : incomplete.map(renderTaskCard).join('');
  }

  if (doneEl) {
    doneEl.innerHTML = complete.map(renderTaskCard).join('');
  }
  if (doneCount) doneCount.textContent = complete.length;
}

function renderTaskCard(task) {
  const priorityClass = `priority-${task.priority}`;
  return `
    <article class="task-card ${task.completed ? 'task-card--done' : ''}" data-id="${task.id}">
      <div class="task-card__header">
        <button class="task-check ${task.completed ? 'checked' : ''}" data-action="toggle" aria-label="完成任務">
          ${task.completed ? '✓' : ''}
        </button>
        <div class="task-card__meta">
          <span class="badge ${priorityClass}">${PRIORITY_LABELS[task.priority]}</span>
          <span class="badge badge--type">${TYPE_LABELS[task.type]}</span>
        </div>
      </div>
      <h3 class="task-card__title">${escapeHtml(task.title)}</h3>
      <p class="task-card__preview">${escapeHtml(task.content.split('\n').slice(0, 2).join(' '))}</p>
      <div class="task-card__actions">
        <button class="btn btn--ghost btn--sm" data-action="edit">編輯</button>
        <button class="btn btn--ghost btn--sm btn--danger" data-action="delete">刪除</button>
      </div>
    </article>`;
}

function openTaskForm(taskId = null) {
  const task = taskId ? state.tasks.find((t) => t.id === taskId) : null;
  const isEdit = !!task;

  openModal(`
    <h2 class="modal-title">${isEdit ? '編輯任務' : '新增任務'}</h2>
    <form id="task-form" class="form">
      <label class="form-label">任務內容</label>
      <textarea id="task-content" class="form-textarea" rows="5" placeholder="第一行將自動成為標題…" required>${task ? escapeHtml(task.content) : ''}</textarea>
      <label class="form-label">重要程度</label>
      <select id="task-priority" class="form-select">
        <option value="normal" ${task?.priority === 'normal' ? 'selected' : ''}>普通</option>
        <option value="important" ${task?.priority === 'important' ? 'selected' : ''}>重要</option>
        <option value="urgent" ${task?.priority === 'urgent' ? 'selected' : ''}>緊急</option>
      </select>
      <label class="form-label">任務類型</label>
      <select id="task-type" class="form-select">
        <option value="one_time" ${task?.type === 'one_time' ? 'selected' : ''}>一次性</option>
        <option value="repeatable" ${task?.type === 'repeatable' ? 'selected' : ''}>可重複</option>
      </select>
      <div class="form-actions">
        <button type="button" class="btn btn--ghost" id="form-cancel">取消</button>
        <button type="submit" class="btn btn--primary">${isEdit ? '儲存' : '新增'}</button>
      </div>
    </form>
  `);

  document.getElementById('form-cancel')?.addEventListener('click', closeModal);
  document.getElementById('task-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = document.getElementById('task-content').value;
    const priority = document.getElementById('task-priority').value;
    const type = document.getElementById('task-type').value;

    if (isEdit) {
      await updateTask(taskId, { content, priority, type });
    } else {
      await createTask({ content, priority, type });
    }
    closeModal();
    await onRefresh();
  });
}

function showRewardToast(amount) {
  const toast = document.createElement('div');
  toast.className = 'reward-toast';
  toast.innerHTML = `<span class="reward-toast__icon">✨</span><span>獲得 <strong>${amount}</strong> 星塵！</span>`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

/* ─── 召喚頁 ─── */

function renderGachaView() {
  const pool = getActivePool(state.poolsData);
  const stats = state.gachaStats;
  const pity = pool.pity || { ssr: 30, ur: 100 };

  setText('gacha-pool-name', pool.name);
  setText('gacha-stardust', state.wallet.stardust ?? 0);
  setText('gacha-cost', pool.cost ?? GACHA_COST);
  setText('gacha-ssr-pity', `${stats.ssrPity}/${pity.ssr}`);
  setText('gacha-ur-pity', `${stats.urPity}/${pity.ur}`);

  const ratesEl = document.getElementById('gacha-rates');
  if (ratesEl && pool.rates) {
    ratesEl.innerHTML = Object.entries(pool.rates)
      .map(
        ([r, rate]) =>
          `<span class="rate-tag rate-${r}">${RARITY_LABELS[r]} ${(rate * 100).toFixed(0)}%</span>`
      )
      .join('');
  }

}

async function handlePull() {
  const pool = getActivePool(state.poolsData);
  const cost = pool.cost ?? GACHA_COST;

  if ((state.wallet.stardust ?? 0) < cost) {
    alert('星塵不足，完成更多任務來獲得星塵吧！');
    return;
  }

  const btn = document.getElementById('btn-pull');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '召喚中…';
  }

  try {
    const result = await pullOnce(state.allPets, state.poolsData);
    await onRefresh();
    showPullResult(result);
  } catch (err) {
    alert(err.message || '召喚失敗');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '召喚 1 次';
    }
  }
}

function showPullResult(result) {
  const { pet, isNew, fragmentsGained, rarity } = result;
  const rarityClass = `rarity-${rarity}`;

  openModal(`
    <div class="pull-result ${rarityClass}">
      <div class="pull-result__flash"></div>
      <p class="pull-result__label">${isNew ? '🎉 新夥伴加入！' : '💫 重複獲得'}</p>
      <div class="pull-result__image">${petImageHtml(pet, { size: 'lg' })}</div>
      <h2 class="pull-result__name">${escapeHtml(pet.name)}</h2>
      <span class="badge badge--rarity ${rarityClass}">${rarity}</span>
      ${
        isNew
          ? '<p class="pull-result__desc">已加入圖鑑</p>'
          : `<p class="pull-result__desc">獲得 ${fragmentsGained} 碎片</p>`
      }
      <p class="pull-result__detail">${escapeHtml(pet.description)}</p>
      <button class="btn btn--primary btn--block" id="pull-close">確認</button>
    </div>
  `);

  document.getElementById('pull-close')?.addEventListener('click', closeModal);
}

/* ─── 圖鑑頁 ─── */

let collectionFilter = 'all';

function renderCollectionView() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.filter === collectionFilter);
  });

  const enriched = state.enrichedCollection || [];
  const filtered =
    collectionFilter === 'all'
      ? enriched
      : enriched.filter((p) => p.rarity === collectionFilter);

  setText('collection-count', `${state.collectionProgress.owned}/${state.collectionProgress.total}`);

  const grid = document.getElementById('collection-grid');
  if (grid) {
    grid.innerHTML = filtered.map(renderCollectionCard).join('');
  }

}

function renderCollectionCard(pet) {
  const owned = pet.owned;
  return `
    <article class="collection-card ${owned ? '' : 'collection-card--locked'}" data-pet-id="${pet.id}">
      <div class="collection-card__image">
        ${owned ? petImageHtml(pet, { size: 'md' }) : petImageHtml(pet, { size: 'md', silhouette: true })}
      </div>
      <div class="collection-card__info">
        <h3 class="collection-card__name">${owned ? escapeHtml(pet.name) : '???'}</h3>
        <span class="badge badge--rarity rarity-${pet.rarity}">${pet.rarity}</span>
        ${
          owned
            ? `${renderStars(pet.stars)}<span class="fragments">碎片 ${pet.fragments}</span>`
            : '<span class="locked-label">未獲得</span>'
        }
      </div>
      ${
        owned && pet.stars < 5
          ? `<button class="btn btn--sm btn--upgrade" data-action="upgrade">升星</button>`
          : ''
      }
    </article>`;
}

/* ─── 設定頁 ─── */

function renderSettingsView() {
  const { tasks, wallet, collectionProgress, gachaStats } = state;

  setText('settings-task-count', tasks.length);
  setText('settings-stardust', wallet.stardust ?? 0);
  setText('settings-collection', `${collectionProgress.owned}/${collectionProgress.total}`);
  setText('settings-total-pulls', gachaStats.totalPulls ?? 0);

}

async function handleReset() {
  if (!confirm('⚠️ 確定要重置所有資料嗎？此操作無法復原！')) return;
  if (!confirm('再次確認：所有任務、星塵、圖鑑、抽卡紀錄都將被清除。確定繼續？')) return;

  if (typeof state.onReset === 'function') {
    await state.onReset();
    await onRefresh();
    alert('資料已重置');
  }
}

/* ─── 工具函式 ─── */

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

export { showRewardToast };
