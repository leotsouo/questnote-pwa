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
  setCompanion,
  STAR_UPGRADE_COST,
  getBondProgress,
} from './collectionService.js';
import { getRandomDialogue, getBondUpLine } from './companionService.js';
import { getBondUnlockText } from './loreService.js';
import { downloadBackup } from './backupService.js';
import { isDevMode, unlockDevTestPets, grantDevStardust, devForceCompleteExpedition } from './devService.js';
import {
  startExpedition,
  claimExpeditionRewards,
  checkAreaUnlock,
  isExpeditionTimeComplete,
  getRemainingMs,
  formatRemainingTime,
  isPetOnExpedition,
  MATERIAL_LABELS,
} from './expeditionService.js';

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
let expeditionTimer = null;
let selectedExpeditionAreaId = null;
let selectedExpeditionPetId = null;

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
      const cardEl = target.closest('.task-card');
      if (cardEl && !cardEl.classList.contains('task-card--done')) {
        cardEl.classList.add('task-card--completing');
      }
      const result = await toggleTaskComplete(id);
      await onRefresh();
      if (result.reward) {
        showRewardToast(result.reward.amount, result.reward.energy);
        if (result.reward.bond?.leveledUp) {
          const bondLine = getBondUpLine(state.companion);
          showBondLevelUpToast(result.reward.bond.newLevel, bondLine);
        }
      }
    } else if (action === 'companion-talk') {
      showCompanionDialogue();
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
    const detailBtn = e.target.closest('[data-action="view-detail"]');
    if (detailBtn) {
      const card = detailBtn.closest('.collection-card');
      openPetDetailModal(card?.dataset.petId);
      return;
    }

    const setBtn = e.target.closest('[data-action="set-companion"]');
    if (setBtn) {
      const card = setBtn.closest('.collection-card');
      const petId = card?.dataset.petId;
      if (petId) {
        await setCompanion(petId);
        await onRefresh();
      }
      return;
    }

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

  document.getElementById('btn-dev-unlock')?.addEventListener('click', handleDevUnlock);

  document.getElementById('btn-dev-stardust')?.addEventListener('click', handleDevStardust);

  document.getElementById('btn-dev-expedition')?.addEventListener('click', handleDevExpedition);

  document.getElementById('view-expedition')?.addEventListener('click', handleExpeditionClick);
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

  if (viewName === 'expedition') {
    startExpeditionTimer();
  } else {
    stopExpeditionTimer();
  }
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

/** 寵物圖片含 fallback；preview 模式顯示模糊黑白預覽（未獲得） */
export function petImageHtml(pet, options = {}) {
  const { size = 'md', preview = false } = options;
  const cls = `pet-img pet-img--${size}`;
  const placeholder = `<div class="${cls} pet-img--placeholder"><span>?</span></div>`;

  if (!pet?.image) return placeholder;

  const onError = `this.onerror=null;this.replaceWith(Object.assign(document.createElement('div'),{className:'${cls} pet-img--placeholder',innerHTML:'<span>?</span>'}))`;

  if (preview) {
    return `<div class="pet-img-wrap pet-img-wrap--preview pet-img-wrap--${size}">
      <img class="${cls} pet-img--preview" src="${pet.image}" alt="" loading="lazy" onerror="${onError}" />
    </div>`;
  }

  return `<img class="${cls}" src="${pet.image}" alt="${escapeHtml(pet.name)}" onerror="${onError}" />`;
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
  renderExpeditionView();
  renderSettingsView();
}

/* ─── 任務頁 ─── */

function renderTasksView() {
  const { tasks, wallet, todayCompleted, collectionProgress, availablePulls, companion, companionLine } = state;

  setText('stat-stardust', wallet.stardust ?? 0);
  setText('stat-energy', wallet.adventureEnergy ?? 0);
  setText('stat-today', todayCompleted);
  setText('stat-collection', `${collectionProgress.owned}/${collectionProgress.total}`);
  setText('stat-pulls', availablePulls);

  renderCompanionSection(companion, companionLine);

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

/** 渲染陪伴寵物區塊 */
function renderCompanionSection(companion, defaultLine) {
  const section = document.getElementById('companion-section');
  if (!section) return;

  if (!companion) {
    section.innerHTML = `
      <div class="companion-empty card">
        <span class="companion-empty__icon">🐾</span>
        <p>尚未選擇陪伴寵物，去圖鑑選一隻陪你完成任務吧。</p>
      </div>`;
    return;
  }

  const progress = getBondProgress(companion.bondExp ?? 0, companion.bondLevel ?? 1);
  const rarityClass = `rarity-${companion.rarity}`;

  section.innerHTML = `
    <article class="companion-card card ${rarityClass}" data-action="companion-talk" role="button" tabindex="0">
      <div class="companion-card__glow"></div>
      <div class="companion-card__image">${petImageHtml(companion, { size: 'lg' })}</div>
      <div class="companion-card__body">
        <div class="companion-card__header">
          <h2 class="companion-card__name">${escapeHtml(companion.name)}</h2>
          <span class="badge badge--rarity ${rarityClass}">${companion.rarity}</span>
        </div>
        ${renderStars(companion.stars ?? 1)}
        <div class="companion-bond">
          <div class="companion-bond__label">
            <span>親密度 Lv.${companion.bondLevel ?? 1}</span>
            <span>${progress.current}/${progress.max || 'MAX'}</span>
          </div>
          <div class="progress-bar progress-bar--bond">
            <div class="progress-bar__fill" style="width:${progress.percent}%"></div>
          </div>
        </div>
        <p class="companion-card__line" id="companion-line">${escapeHtml(defaultLine)}</p>
        <p class="companion-card__hint">點擊與夥伴互動</p>
      </div>
    </article>`;
}

function showCompanionDialogue() {
  const lineEl = document.getElementById('companion-line');
  const card = document.querySelector('.companion-card');
  if (!lineEl || !state.companion) return;

  const line = getRandomDialogue(state.tasks, state.todayCompleted, state.companion);
  lineEl.textContent = line;
  card?.classList.add('companion-card--pulse');
  setTimeout(() => card?.classList.remove('companion-card--pulse'), 600);
}

function showBondLevelUpToast(level, customLine = null) {
  const toast = document.createElement('div');
  toast.className = 'reward-toast reward-toast--bond';
  const msg = customLine
    ? escapeHtml(customLine)
    : `你的夥伴提升到親密度 <strong>Lv.${level}</strong>！`;
  toast.innerHTML = `<span class="reward-toast__icon">💜</span><span>${msg}</span>`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function renderTaskCard(task) {
  const priorityClass = `priority-${task.priority}`;
  return `
    <article class="task-card ${priorityClass} ${task.completed ? 'task-card--done' : ''}" data-id="${task.id}">
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

function showRewardToast(amount, energy = 0) {
  const toast = document.createElement('div');
  toast.className = 'reward-toast';
  let text = `<span class="reward-toast__icon">✨</span><span>獲得 <strong>${amount}</strong> 星塵！</span>`;
  if (energy > 0) {
    text += `<span class="reward-toast__energy">＋${energy} 冒險能量</span>`;
  }
  toast.innerHTML = text;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, energy > 0 ? 3000 : 2500);
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

  const ssrBar = document.getElementById('gacha-ssr-bar');
  const urBar = document.getElementById('gacha-ur-bar');
  if (ssrBar) ssrBar.style.width = `${Math.min(100, (stats.ssrPity / pity.ssr) * 100)}%`;
  if (urBar) urBar.style.width = `${Math.min(100, (stats.urPity / pity.ur) * 100)}%`;

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
    <div class="pull-result pull-result--animate ${rarityClass}">
      <div class="pull-result__flash"></div>
      <div class="pull-result__glow pull-result__glow--${rarity}"></div>
      <p class="pull-result__label">${isNew ? '🎉 新夥伴加入！' : '💫 重複獲得'}</p>
      ${pet.summonLine ? `<p class="pull-result__summon">「${escapeHtml(pet.summonLine)}」</p>` : ''}
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
  const rarityClass = `rarity-${pet.rarity}`;
  return `
    <article class="collection-card ${owned ? '' : 'collection-card--locked'} ${rarityClass}" data-pet-id="${pet.id}">
      <button class="collection-card__tap" data-action="view-detail" aria-label="查看詳情">
        <div class="collection-card__image">
          ${owned ? petImageHtml(pet, { size: 'md' }) : petImageHtml(pet, { size: 'md', preview: true })}
        </div>
        <div class="collection-card__info">
          <h3 class="collection-card__name">${owned ? escapeHtml(pet.name) : '???'}</h3>
          ${owned && pet.title ? `<p class="collection-card__title">${escapeHtml(pet.title)}</p>` : ''}
          <span class="badge badge--rarity ${rarityClass}">${pet.rarity}</span>
          ${
            owned
              ? `${renderStars(pet.stars)}<span class="fragments">碎片 ${pet.fragments}</span>${pet.isCompanion ? '<span class="companion-badge">陪伴中</span>' : ''}`
              : '<span class="locked-label">未獲得 · 點擊預覽</span>'
          }
        </div>
      </button>
      ${
        owned && !pet.isCompanion
          ? `<button class="btn btn--sm btn--companion" data-action="set-companion">設為陪伴</button>`
          : ''
      }
      ${
        owned && pet.stars < 5
          ? `<button class="btn btn--sm btn--upgrade" data-action="upgrade">升星</button>`
          : ''
      }
    </article>`;
}

/** 圖鑑詳情彈窗 */
function openPetDetailModal(petId) {
  const pet = state.enrichedCollection.find((p) => p.id === petId);
  if (!pet) return;

  const owned = pet.owned;
  const rarityClass = `rarity-${pet.rarity}`;
  const bondLevel = pet.bondLevel ?? 0;

  let bondSection = '';
  if (owned && pet.bondUnlocks && Object.keys(pet.bondUnlocks).length > 0) {
    const levels = [2, 3, 4, 5];
    bondSection = `
      <section class="pet-detail__bond">
        <h3 class="pet-detail__subtitle">親密度解鎖</h3>
        <ul class="bond-unlock-list">
          ${levels
            .map((lv) => {
              const text = getBondUnlockText(pet, lv);
              if (!text) return '';
              const unlocked = bondLevel >= lv;
              return `<li class="bond-unlock ${unlocked ? 'bond-unlock--open' : ''}">
                <span class="bond-unlock__lv">Lv.${lv}</span>
                <span class="bond-unlock__text">${unlocked ? escapeHtml(text) : '???'}</span>
              </li>`;
            })
            .join('')}
        </ul>
      </section>`;
  }

  const personalityTags =
    pet.personality?.length > 0
      ? pet.personality.map((p) => `<span class="tag">${escapeHtml(p)}</span>`).join('')
      : '';

  openModal(`
    <div class="pet-detail ${rarityClass}">
      <div class="pet-detail__hero">
        ${owned ? petImageHtml(pet, { size: 'lg' }) : petImageHtml(pet, { size: 'lg', preview: true })}
      </div>
      <h2 class="pet-detail__name">${owned ? escapeHtml(pet.name) : '???'}</h2>
      ${owned && pet.title ? `<p class="pet-detail__title">${escapeHtml(pet.title)}</p>` : ''}
      <div class="pet-detail__badges">
        <span class="badge badge--rarity ${rarityClass}">${pet.rarity}</span>
        ${pet.element ? `<span class="badge badge--element">${escapeHtml(pet.element)}</span>` : ''}
      </div>
      ${personalityTags ? `<div class="pet-detail__tags">${personalityTags}</div>` : ''}
      ${owned ? renderStars(pet.stars) : ''}
      ${owned ? `<p class="pet-detail__bond-lv">親密度 Lv.${bondLevel || 1}</p>` : ''}
      <p class="pet-detail__desc">${escapeHtml(pet.description)}</p>
      ${owned && pet.lore ? `<p class="pet-detail__lore">${escapeHtml(pet.lore)}</p>` : ''}
      ${!owned ? '<p class="pet-detail__locked">召喚解鎖後，可閱讀完整背景與親密度故事。</p>' : ''}
      ${bondSection}
      ${
        owned && !pet.isCompanion
          ? `<button class="btn btn--companion btn--block" data-action="set-companion-detail" data-pet-id="${pet.id}">設為陪伴</button>`
          : ''
      }
      ${owned && pet.isCompanion ? '<p class="companion-badge companion-badge--detail">目前陪伴中</p>' : ''}
    </div>
  `);

  document.querySelector('[data-action="set-companion-detail"]')?.addEventListener('click', async (e) => {
    const id = e.target.dataset.petId;
    if (id) {
      await setCompanion(id);
      closeModal();
      await onRefresh();
    }
  });
}

/* ─── 探險頁 ─── */

function getOwnedPets() {
  return (state.enrichedCollection || []).filter((p) => p.owned);
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDuration(minutes) {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h} 小時 ${m} 分` : `${h} 小時`;
  }
  return `${minutes} 分鐘`;
}

function renderExpeditionView() {
  if (!state) return;

  const { wallet, expeditionAreas, activeExpedition } = state;
  const ownedPets = getOwnedPets();
  const hasActive = !!activeExpedition;
  const isComplete = activeExpedition && isExpeditionTimeComplete(activeExpedition);

  // 冒險能量卡片
  const energyEl = document.getElementById('expedition-energy');
  if (energyEl) {
    energyEl.innerHTML = `
      <div class="expedition-energy__header">
        <span class="expedition-energy__icon">⚡</span>
        <div>
          <p class="expedition-energy__label">冒險能量</p>
          <p class="expedition-energy__value">${wallet.adventureEnergy ?? 0}</p>
        </div>
      </div>
      <p class="expedition-energy__hint">完成任務可以獲得冒險能量</p>`;
  }

  // 進行中探險
  const activeEl = document.getElementById('expedition-active');
  if (activeEl) {
    if (!activeExpedition) {
      activeEl.innerHTML = '';
    } else {
      const pet = state.enrichedCollection.find((p) => p.id === activeExpedition.petId);
      const area = expeditionAreas.find((a) => a.id === activeExpedition.areaId);
      const remaining = getRemainingMs(activeExpedition);
      const complete = isExpeditionTimeComplete(activeExpedition);

      activeEl.innerHTML = `
        <article class="expedition-active-card card ${complete ? 'expedition-active-card--ready' : 'expedition-active-card--glow'}">
          <h2 class="section-title">進行中探險</h2>
          <div class="expedition-active-card__body">
            <div class="expedition-active-card__pet">
              ${pet ? petImageHtml(pet, { size: 'md' }) : ''}
              <div>
                <p class="expedition-active-card__name">${pet ? escapeHtml(pet.name) : '未知寵物'}</p>
                <p class="expedition-active-card__area">${area ? escapeHtml(area.name) : ''}</p>
              </div>
            </div>
            <dl class="expedition-active-card__times">
              <div><dt>開始</dt><dd>${formatDateTime(activeExpedition.startedAt)}</dd></div>
              <div><dt>結束</dt><dd>${formatDateTime(activeExpedition.endsAt)}</dd></div>
            </dl>
            ${
              complete
                ? `<button class="btn btn--primary btn--block expedition-claim-btn" data-action="claim-expedition" data-id="${activeExpedition.id}">領取獎勵</button>`
                : `<p class="expedition-countdown" id="expedition-countdown">${formatRemainingTime(remaining)}</p>
                   <p class="expedition-countdown__label">剩餘時間</p>`
            }
          </div>
        </article>`;
    }
  }

  // 探險地區
  const areasEl = document.getElementById('expedition-areas');
  if (areasEl) {
    areasEl.innerHTML = `
      <h2 class="section-title">探險地區</h2>
      <div class="expedition-area-list">
        ${expeditionAreas
          .map((area) => {
            const { unlocked, hint } = checkAreaUnlock(area, ownedPets);
            const selected = selectedExpeditionAreaId === area.id;
            const mat = area.rewards.material;
            const locked = !unlocked;
            const disabled = hasActive || locked;

            return `
              <article class="expedition-area-card card ${locked ? 'expedition-area-card--locked' : ''} ${selected ? 'expedition-area-card--selected' : ''}" data-area-id="${area.id}">
                <div class="expedition-area-card__header">
                  <h3>${escapeHtml(area.name)}</h3>
                  ${locked ? '<span class="expedition-lock">🔒</span>' : ''}
                </div>
                <p class="expedition-area-card__desc">${escapeHtml(area.description)}</p>
                <div class="expedition-area-card__meta">
                  <span>⚡ ${area.energyCost}</span>
                  <span>⏱ ${formatDuration(area.durationMinutes)}</span>
                </div>
                <p class="expedition-area-card__rewards">
                  星塵 ${area.rewards.stardust.min}～${area.rewards.stardust.max}
                  · ${escapeHtml(mat.name || MATERIAL_LABELS[mat.id] || mat.id)} ${mat.min}～${mat.max}
                  · 親密度 +${area.rewards.bondExp}
                </p>
                ${locked ? `<p class="expedition-area-card__unlock">${escapeHtml(hint)}</p>` : ''}
                <button
                  class="btn btn--secondary btn--sm btn--block"
                  data-action="select-area"
                  data-area-id="${area.id}"
                  ${disabled ? 'disabled' : ''}
                >${selected ? '已選擇' : locked ? '未解鎖' : '選擇地區'}</button>
              </article>`;
          })
          .join('')}
      </div>`;
  }

  // 寵物選擇
  const petsEl = document.getElementById('expedition-pets');
  if (petsEl) {
    if (ownedPets.length === 0) {
      petsEl.innerHTML = `
        <h2 class="section-title">派遣寵物</h2>
        <p class="empty-hint">尚未獲得寵物，先去召喚吧！</p>`;
    } else {
      petsEl.innerHTML = `
        <h2 class="section-title">派遣寵物</h2>
        <div class="expedition-pet-grid">
          ${ownedPets
            .map((pet) => {
              const onExp = isPetOnExpedition(pet.id, activeExpedition);
              const selected = selectedExpeditionPetId === pet.id;
              const rarityClass = `rarity-${pet.rarity}`;
              return `
                <button
                  class="expedition-pet-card ${rarityClass} ${selected ? 'expedition-pet-card--selected' : ''} ${onExp ? 'expedition-pet-card--busy' : ''}"
                  data-action="select-pet"
                  data-pet-id="${pet.id}"
                  ${hasActive || onExp ? 'disabled' : ''}
                >
                  ${petImageHtml(pet, { size: 'sm' })}
                  <span class="expedition-pet-card__name">${escapeHtml(pet.name)}</span>
                  <span class="badge badge--rarity ${rarityClass}">${pet.rarity}</span>
                  <span class="expedition-pet-card__bond">Lv.${pet.bondLevel || 1}</span>
                  ${onExp ? '<span class="expedition-pet-card__status">探險中</span>' : ''}
                </button>`;
            })
            .join('')}
        </div>
        ${
          !hasActive
            ? `<button
                class="btn btn--primary btn--block expedition-start-btn"
                data-action="start-expedition"
                ${!selectedExpeditionAreaId || !selectedExpeditionPetId ? 'disabled' : ''}
              >開始探險</button>`
            : ''
        }`;
    }
  }
}

function startExpeditionTimer() {
  stopExpeditionTimer();
  expeditionTimer = setInterval(() => {
    const active = state?.activeExpedition;
    if (!active || isExpeditionTimeComplete(active)) {
      if (active && isExpeditionTimeComplete(active)) {
        renderExpeditionView();
      }
      return;
    }
    const el = document.getElementById('expedition-countdown');
    if (el) {
      el.textContent = formatRemainingTime(getRemainingMs(active));
    }
  }, 1000);
}

function stopExpeditionTimer() {
  if (expeditionTimer) {
    clearInterval(expeditionTimer);
    expeditionTimer = null;
  }
}

async function handleExpeditionClick(e) {
  const target = e.target.closest('[data-action]');
  if (!target) return;

  const action = target.dataset.action;

  if (action === 'select-area') {
    selectedExpeditionAreaId = target.dataset.areaId;
    renderExpeditionView();
    return;
  }

  if (action === 'select-pet') {
    selectedExpeditionPetId = target.dataset.petId;
    renderExpeditionView();
    return;
  }

  if (action === 'start-expedition') {
    if (!selectedExpeditionAreaId || !selectedExpeditionPetId) {
      alert('請先選擇探險地區與寵物');
      return;
    }
    try {
      await startExpedition(
        selectedExpeditionPetId,
        selectedExpeditionAreaId,
        state.expeditionAreas,
        state.allPets
      );
      selectedExpeditionAreaId = null;
      selectedExpeditionPetId = null;
      await onRefresh();
      startExpeditionTimer();
    } catch (err) {
      alert(err.message || '無法開始探險');
    }
    return;
  }

  if (action === 'claim-expedition') {
    const expId = target.dataset.id;
    try {
      const result = await claimExpeditionRewards(
        expId,
        state.expeditionAreas,
        state.allPets
      );
      await onRefresh();
      showExpeditionRewardModal(result);
    } catch (err) {
      alert(err.message || '領取失敗');
    }
  }
}

function showExpeditionRewardModal(result) {
  const { rewards, pet, bond } = result;
  const matEntries = Object.entries(rewards.materials || {});
  const rarityPct = Math.round((rewards.rarityBonus || 0) * 100);
  const bondPct = Math.round((rewards.bondBonus || 0) * 100);

  openModal(`
    <div class="expedition-reward-modal expedition-reward-modal--animate">
      <h2 class="modal-title">探險歸來！</h2>
      <div class="expedition-reward-modal__pet">
        ${petImageHtml(pet, { size: 'md' })}
        <p>${escapeHtml(pet.name)}</p>
      </div>
      <ul class="expedition-reward-list">
        <li>✦ 星塵 <strong>+${rewards.stardust}</strong>
          ${rewards.bonusStardust > 0 ? `<span class="expedition-bonus">（基礎 ${rewards.baseStardust} + 加成 ${rewards.bonusStardust}）</span>` : ''}
        </li>
        ${matEntries.map(([id, amt]) => `<li>📦 ${escapeHtml(MATERIAL_LABELS[id] || id)} <strong>+${amt}</strong></li>`).join('')}
        <li>💜 親密度 <strong>+${rewards.bondExp}</strong></li>
        ${rewards.fragmentGained > 0 ? `<li>💫 寵物碎片 <strong>+${rewards.fragmentGained}</strong></li>` : ''}
      </ul>
      ${
        rewards.bonusStardust > 0
          ? `<p class="expedition-bonus-detail">加成：稀有度 +${rarityPct}% · 親密度 Lv.${bond?.oldLevel ?? pet.bondLevel ?? 1} +${bondPct}%</p>`
          : ''
      }
      ${bond?.leveledUp ? `<p class="expedition-levelup">親密度提升至 Lv.${bond.newLevel}！</p>` : ''}
      <button class="btn btn--primary btn--block" id="expedition-reward-close">確認</button>
    </div>
  `);

  document.getElementById('expedition-reward-close')?.addEventListener('click', closeModal);
}

/* ─── 設定頁 ─── */

function renderSettingsView() {
  const { tasks, wallet, collectionProgress, gachaStats } = state;

  setText('settings-task-count', tasks.length);
  setText('settings-stardust', wallet.stardust ?? 0);
  setText('settings-energy', wallet.adventureEnergy ?? 0);
  setText('settings-collection', `${collectionProgress.owned}/${collectionProgress.total}`);
  setText('settings-total-pulls', gachaStats.totalPulls ?? 0);

  const devSection = document.getElementById('dev-tools-section');
  if (devSection) devSection.hidden = !isDevMode();
}

async function handleDevUnlock() {
  if (!isDevMode()) return;
  if (!confirm('【開發測試】將 8 隻高稀有寵物加入圖鑑，確定？')) return;

  const added = await unlockDevTestPets();
  await onRefresh();
  switchView('collection');
  alert(added > 0 ? `已解鎖 ${added} 隻新寵物（共 8 隻測試寵物已就緒）` : '8 隻測試寵物皆已在圖鑑中');
}

async function handleDevStardust() {
  if (!isDevMode()) return;

  const total = await grantDevStardust();
  await onRefresh();
  alert(`已獲得 100,000 星塵！目前共 ${total.toLocaleString()} 星塵`);
}

async function handleDevExpedition() {
  if (!isDevMode()) return;

  try {
    await devForceCompleteExpedition();
    await onRefresh();
    switchView('expedition');
    alert('探險已立即結束，可前往探險頁領取獎勵。');
  } catch (err) {
    alert(err.message || '沒有進行中的探險');
  }
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
