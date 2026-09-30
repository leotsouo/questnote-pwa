import { loadPresentation } from './snapshot.js';
import { calculateRewardAmount, calculateAdventureEnergyAmount, calculateBondAmount, GACHA_COST } from '../../src/rewardService.js';
import { getBondLevelFromExp, getBondProgress } from '../../src/collectionService.js';
import { getDefaultCompanionLine } from '../../src/companionService.js';
import { sortTasks, isInTodayPlan, isCompletedToday } from '../../src/taskFilterService.js';
import { normalizeTask } from '../../src/taskMigration.js';

const ICONS = {
  mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  heart: '<path d="M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1C0 9 4 14 12 20c8-6 12-11 8-15Z"/>',
  energy: '<path d="m14 2-9 12h6l-1 8 9-12h-6l1-8Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16"/>',
  book: '<path d="M3 4c4-1 7 0 9 2 2-2 5-3 9-2v15c-4-1-7 0-9 2-2-2-5-3-9-2V4Zm9 2v15M6 8h3m-3 4h3"/>',
  spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM20 2v4m-2-2h4"/>',
  cards: '<rect x="8" y="3" width="13" height="17" rx="2"/><path d="M8 6 4 5a2 2 0 0 0-2 2l1 14a2 2 0 0 0 2 2l12-1M14.5 7l1.2 2.8 2.8 1.2-2.8 1.2-1.2 2.8-1.2-2.8-2.8-1.2 2.8-1.2 1.2-2.8Z"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6 6-2Z"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const text = (id, value) => { document.getElementById(id).textContent = value; };
const dialog = document.getElementById('detail-dialog');
const taskDialog = document.getElementById('task-dialog');
let state;
let filter = 'today';
let lastUndo = null;
let feedbackTimer;
let reactionTimer;
let pendingCompletion = false;

document.querySelectorAll('[data-icon]').forEach((element) => { element.innerHTML = icon(element.dataset.icon); });

function todayTasks() {
  return state.tasks.filter((task) => isInTodayPlan(task, state.today) || isCompletedToday(task, state.today));
}

function updateGrowth() {
  const planned = todayTasks();
  const done = planned.filter((task) => task.completed).length;
  const percent = planned.length ? Math.round(done / planned.length * 100) : 0;
  text('journey-done', done);
  text('journey-total', planned.length);
  const track = document.getElementById('journey-track');
  track.style.setProperty('--progress', `${percent}%`);
  track.setAttribute('aria-valuenow', percent);
  track.setAttribute('aria-valuetext', `${done} / ${planned.length} 件完成`);
  const level = getBondLevelFromExp(state.companion.bondExp || 0);
  const progress = getBondProgress(state.companion.bondExp || 0, level);
  text('bond-level', `Lv.${level}`);
  text('bond-progress', progress.max ? `${progress.current} / ${progress.max} EXP` : '羈絆解放');
  text('stardust', state.wallet.stardust.toLocaleString('zh-TW'));
  text('energy', state.wallet.adventureEnergy);
  text('pulls-label', `${Math.floor(state.wallet.stardust / GACHA_COST)} 次召喚`);
  text('pending-count', `${todayTasks().filter((task) => !task.completed).length} 件待完成`);
}

function category(task) {
  return state.categories.find((entry) => entry.id === task.categoryId)?.name || '一般';
}

function renderTask(task, completed = false) {
  const priority = task.priority === 'urgent' ? '緊急' : task.priority === 'important' ? '重要' : '';
  const description = task.content?.split('\n').slice(1).join('\n').trim();
  const subtasks = task.subtasks || [];
  const reward = `<span>✦ ${calculateRewardAmount(task)}</span><span>${icon('energy')}${calculateAdventureEnergyAmount(task)}</span><span class="bond-reward">${icon('heart')}+${calculateBondAmount(task)}</span>`;
  return `<article class="quest-row${completed ? ' is-completed' : ''}" data-task-row="${escapeHtml(task.id)}">
    <button class="quest-check" type="button" data-complete="${escapeHtml(task.id)}" aria-label="${completed ? '已完成' : '完成'} ${escapeHtml(task.title)}" aria-pressed="${completed}" ${completed ? 'disabled' : ''}><span>${icon('check')}</span></button>
    <div><div class="quest-meta"><span>${escapeHtml(category(task))}</span>${priority ? `<span class="priority-label ${escapeHtml(task.priority)}">${priority}</span>` : ''}${task.dueDate ? `<span>${escapeHtml(task.dueDate.slice(5).replace('-', '/'))} 截止</span>` : ''}</div>
      <h3>${escapeHtml(task.title)}</h3>${description && !completed ? `<p class="quest-description">${escapeHtml(description)}</p>` : ''}
      <div class="quest-rewards" role="group" aria-label="${completed ? '任務已完成' : `完成獲得 ${calculateRewardAmount(task)} 星塵、${calculateAdventureEnergyAmount(task)} 能量、${calculateBondAmount(task)} 親密度`}">${completed ? '<span>已完成 · 已領取獎勵</span>' : reward}</div>
      ${subtasks.length && !completed ? `<p class="quest-description">${subtasks.filter((entry) => entry.completed).length} / ${subtasks.length} 個小步驟</p>` : ''}
    </div><button class="quest-menu" type="button" data-task-detail="${escapeHtml(task.id)}" aria-label="查看 ${escapeHtml(task.title)} 詳情">${icon('more')}</button></article>`;
}

function emptyHtml() {
  const isDone = todayTasks().length > 0 && todayTasks().every((task) => task.completed);
  return `<div class="empty-quests"><h3>${isDone ? '今天的冒險，已經很精彩。' : '從一件小事開始。'}</h3><p>${isDone ? `${escapeHtml(state.companion.displayName)}陪你走完了今日計畫。讓自己休息一下吧。` : '挑一件今天真正想完成的事，讓夥伴陪你一起前進。'}</p>${isDone ? '' : '<button type="button" class="primary-button" data-add-inline>記下今日任務</button>'}</div>`;
}

function renderTasks() {
  const pending = sortTasks(state.tasks.filter((task) => !task.completed && (filter !== 'today' || isInTodayPlan(task, state.today))), state.today);
  if (filter === 'smart' && pending.length) {
    const urgent = pending.filter((task) => task.priority === 'urgent');
    const important = pending.filter((task) => task.priority === 'important');
    const normal = pending.filter((task) => !['important', 'urgent'].includes(task.priority));
    document.getElementById('quest-list').innerHTML = `<div class="smart-groups">${[[urgent, '先處理緊急事項'], [important, '值得優先的事'], [normal, '按自己的節奏']].filter(([tasks]) => tasks.length).map(([tasks, label]) => `<h3>${label}</h3>${tasks.map((task) => renderTask(task)).join('')}`).join('')}</div>`;
  } else {
    document.getElementById('quest-list').innerHTML = pending.map((task) => renderTask(task)).join('') || emptyHtml();
  }
  const completed = state.tasks.filter((task) => isCompletedToday(task, state.today));
  document.getElementById('completed-quests').hidden = !completed.length;
  text('completed-label', `今日已完成 · ${completed.length}`);
  document.getElementById('completed-list').innerHTML = completed.map((task) => renderTask(task, true)).join('');
  updateGrowth();
}

function react(line) {
  text('companion-line', line);
  clearTimeout(reactionTimer);
  document.querySelector('.night').classList.remove('is-reacting');
  requestAnimationFrame(() => document.querySelector('.night').classList.add('is-reacting'));
  reactionTimer = setTimeout(() => document.querySelector('.night').classList.remove('is-reacting'), 850);
}

function showFeedback(title, detail, undo = false) {
  clearTimeout(feedbackTimer);
  const feedback = document.getElementById('reward-feedback');
  feedback.innerHTML = `<strong>${escapeHtml(title)}</strong><p>${escapeHtml(detail)}</p>${undo ? '<button type="button" data-undo>復原這次完成</button>' : ''}`;
  feedback.classList.add('is-visible');
  feedbackTimer = setTimeout(() => feedback.classList.remove('is-visible'), undo ? 9000 : 3500);
}

function openPanel(title, content) {
  text('dialog-title', title);
  document.getElementById('dialog-content').innerHTML = content;
  dialog.showModal();
}

function taskDetails(id) {
  const task = state.tasks.find((entry) => entry.id === id);
  if (!task) return;
  openPanel(task.title, `<p class="dialog-kicker">${escapeHtml(category(task))} · ${task.priority === 'urgent' ? '緊急' : task.priority === 'important' ? '重要' : '普通'}</p><p>${escapeHtml(task.content || task.title).replace(/\n/g, '<br>')}</p>${task.subtasks?.length ? `<div class="dialog-growth">${task.subtasks.map((entry) => `<label><input type="checkbox" data-subtask="${escapeHtml(entry.id)}" data-task="${escapeHtml(task.id)}" ${entry.completed ? 'checked' : ''} ${task.completed ? 'disabled' : ''}> ${escapeHtml(entry.text)}</label>`).join('')}</div>` : ''}<p class="dialog-growth">完成獲得 ${calculateRewardAmount(task)} 星塵、${calculateAdventureEnergyAmount(task)} 點能量，與 ${calculateBondAmount(task)} 點親密度。</p><p class="dialog-footnote">本次互動為視覺預覽，原有任務與存檔不會改變。</p>`);
}

async function completeTask(id) {
  if (pendingCompletion) return;
  const task = state.tasks.find((entry) => entry.id === id);
  if (!task || task.completed) return;
  pendingCompletion = true;
  lastUndo = structuredClone(state);
  const reward = task.rewardClaimed ? 0 : calculateRewardAmount(task);
  const energy = task.rewardClaimed ? 0 : calculateAdventureEnergyAmount(task);
  const bond = task.rewardClaimed ? 0 : calculateBondAmount(task);
  task.completed = true;
  task.rewardClaimed = true;
  task.completedAt = new Date().toISOString();
  state.wallet.stardust += reward;
  state.wallet.adventureEnergy += energy;
  state.companion.bondExp = (state.companion.bondExp || 0) + bond;
  state.todayCompleted = state.tasks.filter((entry) => isCompletedToday(entry, state.today)).length;
  const row = [...document.querySelectorAll('[data-task-row]')].find((entry) => entry.dataset.taskRow === id);
  row?.classList.add('is-completing');
  const button = row?.querySelector('[data-complete]');
  if (button) { button.setAttribute('aria-pressed', 'true'); button.disabled = true; }
  updateGrowth();
  react(state.companion.dialogues?.praise?.[0] || getDefaultCompanionLine(state.tasks, state.todayCompleted, state.companion));
  showFeedback('又向前走了一步。', `✦ +${reward} 星塵  ·  +${energy} 能量  ·  ${state.companion.displayName}親密度 +${bond}`, true);
  document.querySelector('.bond-line').classList.add('is-updated');
  setTimeout(() => {
    const retainedFocus = document.activeElement === button;
    renderTasks();
    pendingCompletion = false;
    document.querySelector('.bond-line').classList.remove('is-updated');
    if (retainedFocus) (document.querySelector('#quest-list [data-complete]') || document.getElementById('add-quest')).focus({ preventScroll: true });
  }, document.documentElement.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 650);
}

async function panel(name) {
  if (name === 'companion' || name === 'collection') {
    const pet = state.companion;
    openPanel(pet.displayName, `<img class="dialog-art" src="/${escapeHtml(pet.imageVariants?.stage || pet.image)}" alt="${escapeHtml(pet.name)}"><p class="dialog-kicker">${escapeHtml(pet.rarity)} · ${escapeHtml(pet.title)} · ${escapeHtml(pet.personality?.join('、'))}</p><p>${escapeHtml(pet.lore || pet.description)}</p><p class="dialog-growth">今日任務讓我們一起成長。親密度 Lv.${getBondLevelFromExp(pet.bondExp || 0)} · ${pet.bondExp || 0} EXP</p><p class="dialog-footnote">${pet.owned ? '使用目前本機陪伴夥伴。' : '使用 QuestNote 既有圖鑑素材作展示，未新增寵物或變更收藏。'}</p>`);
  } else if (name === 'gacha') {
    const pulls = Math.floor(state.wallet.stardust / GACHA_COST);
    openPanel('下一次相遇', `<p class="dialog-kicker">星塵讓冒險有新的可能</p><p>目前有 ${state.wallet.stardust} 星塵，可召喚 ${pulls} 次夥伴。每次召喚消耗 ${GACHA_COST} 星塵。</p><p class="dialog-growth">${pulls ? '每一件完成的任務，都是下一次相遇的起點。' : `再累積 ${GACHA_COST - state.wallet.stardust} 星塵，就能開始一次召喚。`}</p><p class="dialog-footnote">這一輪只 redesign 任務首頁。召喚畫面保留目前設計；此處不消耗星塵。</p>`);
  } else if (name === 'mailbox') {
    const response = await fetch('/data/global-mailbox.json');
    const mailbox = await response.json();
    const messages = mailbox.messages.filter((entry) => entry.enabled).slice(0, 3);
    openPanel('旅人的信箱', `<p class="dialog-kicker">QUESTNOTE 的既有公告</p>${messages.map((entry) => `<p style="margin-top:14px"><strong>${escapeHtml(entry.title)}</strong></p>`).join('')}<p class="dialog-footnote">此處只預覽公告標題，不標示未讀狀態，也不領取獎勵。</p>`);
  } else {
    const names = { expedition: '帶著夥伴去探險', blessing: '每日祝福', quests: '冒險任務', more: '更多旅人日常' };
    const copy = { expedition: '完成任務獲得冒險能量，再與夥伴組隊探索迷霧森林等地區。', blessing: '既有的每日簽到與幸運轉盤，是旅人的每日補給。', quests: 'QuestNote 的冒險任務與成就，見證你在現實生活裡累積的進步。', more: '習慣、工坊、成就、教學與設定，仍保留目前版本。' };
    openPanel(names[name] || '旅人日常', `<p>${copy[name] || ''}</p><p class="dialog-footnote">這一輪只 redesign 任務首頁；其餘畫面等待你評價設計方向後再展開。</p>`);
  }
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.complete) void completeTask(button.dataset.complete);
  if (button.dataset.taskDetail) taskDetails(button.dataset.taskDetail);
  if (button.dataset.panel) void panel(button.dataset.panel).catch(() => showFeedback('暫時無法開啟', '請稍後重試。'));
  if (button.hasAttribute('data-filter')) {
    filter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach((tab) => { tab.setAttribute('aria-selected', String(tab === button)); tab.tabIndex = tab === button ? 0 : -1; });
    renderTasks();
  }
  if (button.id === 'companion-touch') react(state.companion.dialogues?.normal?.[1] || getDefaultCompanionLine(state.tasks, state.todayCompleted, state.companion));
  if (button.id === 'add-quest' || button.hasAttribute('data-add-inline')) taskDialog.showModal();
  if (button.id === 'dialog-close') dialog.close();
  if (button.id === 'task-dialog-close') taskDialog.close();
  if (button.hasAttribute('data-undo') && lastUndo) {
    state = structuredClone(lastUndo);
    lastUndo = null;
    renderTasks();
    react(getDefaultCompanionLine(state.tasks, state.todayCompleted, state.companion));
    showFeedback('已復原這一步', '任務、星塵、能量與親密度一併回到完成前。');
  }
  if (button.dataset.nav === 'tasks') document.getElementById('quest-heading').scrollIntoView({ behavior: document.documentElement.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
});

document.querySelector('.task-tabs').addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const tabs = [...document.querySelectorAll('[data-filter]')];
  const index = tabs.indexOf(document.activeElement);
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  tabs[next].focus();
  tabs[next].click();
});

document.addEventListener('change', (event) => {
  if (!event.target.dataset.subtask) return;
  const task = state.tasks.find((entry) => entry.id === event.target.dataset.task);
  const subtask = task?.subtasks?.find((entry) => entry.id === event.target.dataset.subtask);
  if (subtask) { subtask.completed = event.target.checked; renderTasks(); }
});

document.getElementById('task-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  const content = String(form.get('title') || '').trim();
  if (!content) return;
  const now = new Date().toISOString();
  state.tasks.push(normalizeTask({ id: crypto.randomUUID(), content, title: content.split('\n')[0], priority: form.get('priority'), categoryId: 'general', type: 'one_time', completed: false, rewardClaimed: false, createdAt: now, updatedAt: now, isPlannedToday: true, plannedDate: state.today, subtasks: [] }, state.today));
  filter = 'today';
  document.querySelectorAll('[data-filter]').forEach((tab) => { const selected = tab.dataset.filter === 'today'; tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1; });
  taskDialog.close();
  event.target.reset();
  renderTasks();
  showFeedback('新的小冒險已寫下', '今日計畫已更新，僅保留在這次預覽。');
});

window.addEventListener('message', (event) => {
  if (event.origin !== location.origin) return;
  if (event.data?.type === 'questnote-study-motion') document.documentElement.classList.toggle('reduce-motion', !!event.data.reduced);
});

try {
  state = await loadPresentation();
  const art = document.getElementById('companion-art');
  art.src = `/${state.companion.imageVariants?.stage || state.companion.image}`;
  art.alt = `${state.companion.name}，${state.companion.title || '今天的陪伴夥伴'}`;
  art.addEventListener('error', () => { art.hidden = true; document.getElementById('companion-touch').hidden = true; showFeedback('立繪暫時無法載入', '任務與成長資訊仍可查看。'); }, { once: true });
  text('date-label', new Intl.DateTimeFormat('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date(`${state.today}T12:00:00+08:00`)));
  text('pet-name', state.companion.displayName);
  text('pet-rarity', state.companion.rarity);
  text('pet-title', state.companion.title);
  document.getElementById('companion-touch').setAttribute('aria-label', `和${state.companion.displayName}打個招呼`);
  text('companion-line', getDefaultCompanionLine(state.tasks, state.todayCompleted, state.companion));
  document.querySelectorAll('[data-filter]').forEach((tab) => { tab.tabIndex = tab.dataset.filter === 'today' ? 0 : -1; });
  renderTasks();
  document.body.dataset.ready = 'true';
} catch (error) {
  document.getElementById('home').innerHTML = `<section class="notebook"><h1>無法開啟設計預覽</h1><p>${escapeHtml(error.message)}</p></section>`;
}
