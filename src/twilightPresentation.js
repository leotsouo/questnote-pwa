/**
 * Twilight's presentation layer: no persistence, rewards or ownership changes.
 * Uses the same tasks, companion and progression helpers as the app.
 */
import { getTodayDateString, isInTodayPlan, isCompletedToday } from './taskFilterService.js';
import { getBondProgress, canPetCompanion, getPetCooldownRemaining, formatCooldown } from './collectionService.js';
import { getPetImageSrc } from './imagePreloadService.js';
import { getEligiblePetsForPool } from './petPoolFilter.js';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));
const ICONS = {
  book: '<path d="M3 4c4-1 7 0 9 2 2-2 5-3 9-2v15c-4-1-7 0-9 2-2-2-5-3-9-2V4Zm9 2v15M6 8h3m-3 4h3"/>',
  spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM20 2v4m-2-2h4"/>',
  cards: '<rect x="8" y="3" width="13" height="17" rx="2"/><path d="M8 6 4 5a2 2 0 0 0-2 2l1 14a2 2 0 0 0 2 2l12-1M14.5 7l1.2 2.8 2.8 1.2-2.8 1.2-1.2 2.8-1.2-2.8-2.8-1.2 2.8-1.2 1.2-2.8Z"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6 6-2Z"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>',
  heart: '<path d="M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1C0 9 4 14 12 20c8-6 12-11 8-15Z"/>',
  energy: '<path d="m14 2-9 12h6l-1 8 9-12h-6l1-8Z"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16"/>',
  award: '<circle cx="12" cy="8" r="5"/><path d="m8 12-2 9 6-3 6 3-2-9"/>',
  habit: '<path d="M20 7a9 9 0 0 0-16-1M4 3v4h4M4 17a9 9 0 0 0 16 1m0 3v-4h-4"/><path d="m9 12 2 2 4-4"/>',
  workshop: '<path d="m14 3 7 7-3 3-7-7 3-3ZM12 8 3 17l4 4 9-9"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 2-2c0-2-2-2-2-4 0-1 1-2 3-2h2c3 0 2-10-7-10Z"/><circle cx="7" cy="9" r="1"/><circle cx="10" cy="6" r="1"/><circle cx="15" cy="7" r="1"/>',
  share: '<path d="M12 16V3m-4 4 4-4 4 4M5 12v8h14v-8"/>',
  feedback: '<path d="M4 4h16v12H9l-5 5V4Zm4 5h8m-8 3h5"/>',
};

export function twilightIcon(name) {
  return `<span class="twilight-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${ICONS[name] || ICONS.spark}</svg></span>`;
}

export function getTwilightJourney(tasks, today = getTodayDateString()) {
  const pending = tasks.filter((task) => !task.completed && isInTodayPlan(task, today)).length;
  const done = tasks.filter((task) => isInTodayPlan(task, today) && isCompletedToday(task, today)).length;
  const total = pending + done;
  return { pending, done, total, percent: total ? Math.round(done / total * 100) : 0 };
}

/** Keep original emoji nodes so switching back restores both older themes. */
export function initTwilightChrome() {
  const add = (element, name) => {
    if (element && !element.querySelector('.twilight-icon')) element.insertAdjacentHTML('beforeend', twilightIcon(name));
  };
  const navIcons = { tasks: 'book', gacha: 'spark', collection: 'cards', expedition: 'compass', more: 'more' };
  document.querySelectorAll('.nav-item').forEach((button) => add(button, navIcons[button.dataset.view]));
  const moreIcons = { share: 'share', guide: 'book', handbook: 'book', tasks: 'sun', achievements: 'award', habits: 'habit', workshop: 'workshop', settings: 'settings' };
  document.querySelectorAll('.more-menu-item').forEach((button) => {
    add(button.querySelector('.more-menu-icon'), button.hasAttribute('data-style-settings') ? 'palette' : button.hasAttribute('data-feedback-open') ? 'feedback' : moreIcons[button.dataset.goto]);
  });
  document.querySelectorAll('.home-hub__icon').forEach((button) => add(button.querySelector('.home-hub__emoji'), { blessing: 'sun', quest: 'map', titles: 'award' }[button.dataset.hub]));
  add(document.querySelector('.mailbox-entry-btn__icon'), 'mail');
}

export function buildTwilightHome(companion, hasOwnedPets = false) {
  const name = companion?.displayName || companion?.name || (hasOwnedPets ? '選擇同行夥伴' : '等待第一位夥伴');
  const emptyAction = hasOwnedPets ? 'empty-go-collection' : 'empty-go-gacha';
  const emptyHint = hasOwnedPets ? '到圖鑑選一位夥伴，陪你完成今天的旅程。' : '完成任務，讓第一次相遇更近一步。';
  const art = companion ? getPetImageSrc(companion, 'stage') : './assets/expeditions/mist_forest.webp';
  return `<header class="twilight-masthead"><span class="twilight-wordmark">${twilightIcon('book')}QuestNote<span>·</span></span></header>
    <div class="twilight-scene ${companion ? '' : 'twilight-scene--empty'}">
      ${art ? `<img class="twilight-companion-art" src="${escapeHtml(art)}" alt="${companion ? escapeHtml(name) : ''}" decoding="async" fetchpriority="high">` : ''}
      <div class="twilight-scene-shade" aria-hidden="true"></div>
      <div class="twilight-greeting"><p class="twilight-eyebrow" id="twilight-date"></p><h1>今天，也<br>一起前進<span>。</span></h1><p>每一件小事，都有人陪你完成。</p></div>
      ${companion ? `<button type="button" class="twilight-pet-touch" data-action="companion-pet" aria-label="撫摸 ${escapeHtml(name)}"><span id="twilight-pet-label">輕觸，打個招呼</span> ${twilightIcon('arrow')}</button>` : ''}
      <div class="twilight-companion-caption"><p class="twilight-eyebrow">${companion ? '今日同行' : '冒險的起點'}</p>
        <button type="button" class="twilight-pet-name" data-action="${companion ? 'companion-view-detail' : emptyAction}" ${companion ? `data-pet-id="${escapeHtml(companion.id)}"` : ''}>${escapeHtml(name)} ${companion ? `<span class="twilight-rarity">${escapeHtml(companion.rarity)}</span>` : ''}${twilightIcon('arrow')}</button>
        <p>${escapeHtml(companion?.title || emptyHint)}</p>
      </div>
    </div>
    <div class="twilight-voice"><span aria-hidden="true">“</span><p id="twilight-companion-line"></p></div>
    <div class="twilight-journey"><div class="twilight-journey-label"><span>今日旅程</span><strong><span id="twilight-done"></span> / <span id="twilight-total"></span> <small>件完成</small></strong></div>
      <div id="twilight-progress" class="twilight-journey-track" role="progressbar" aria-label="今日任務進度" aria-valuemin="0" aria-valuemax="100"><span></span><i aria-hidden="true">✦</i></div>
      <div class="twilight-bond">${companion ? `${twilightIcon('heart')}<span id="twilight-bond-level"></span><span id="twilight-bond-progress"></span>` : '<span>從一件小事，展開你的旅程。</span>'}</div>
    </div>`;
}

export function syncTwilightHome(state) {
  const container = document.getElementById('twilight-home');
  const heading = document.getElementById('twilight-chapter-heading');
  if (!container || !heading) return;
  const active = state.userPreferences?.theme === 'twilight';
  container.hidden = !active;
  heading.hidden = !active;
  if (!active) return;
  const companion = state.companion;
  const hasOwnedPets = (state.collectionProgress?.owned ?? 0) > 0;
  const key = JSON.stringify([companion?.id, companion?.displayName, companion?.name, getPetImageSrc(companion, 'stage'), hasOwnedPets]);
  if (container.dataset.companionKey !== key) {
    container.innerHTML = buildTwilightHome(companion, hasOwnedPets);
    container.dataset.companionKey = key;
    const image = container.querySelector('.twilight-companion-art');
    image?.addEventListener('error', () => {
      const original = getPetImageSrc(companion);
      if (original && image.getAttribute('src') !== original) image.src = original;
      else image.hidden = true;
    });
  }
  const set = (id, value) => { const element = document.getElementById(id); if (element) element.textContent = value; };
  const today = getTodayDateString();
  const journey = getTwilightJourney(state.tasks || [], today);
  set('twilight-date', new Intl.DateTimeFormat('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date(`${today}T12:00:00`)));
  set('twilight-done', journey.done);
  set('twilight-total', journey.total);
  set('twilight-pending', `${journey.pending} 件待完成`);
  const track = document.getElementById('twilight-progress');
  track.style.setProperty('--journey-progress', `${journey.percent}%`);
  track.setAttribute('aria-valuenow', journey.percent);
  track.setAttribute('aria-valuetext', `${journey.done} / ${journey.total} 件完成`);
  const existingLine = document.getElementById('companion-bubble-text')?.textContent;
  set('twilight-companion-line', companion ? existingLine || state.companionLine : hasOwnedPets ? '夥伴已經在圖鑑等你，選一位一起出發吧。' : '每一次完成，都在為新的相遇累積星塵。');
  if (companion) {
    const progress = getBondProgress(companion.bondExp ?? 0, companion.bondLevel ?? 1);
    set('twilight-bond-level', `親密度 Lv.${companion.bondLevel ?? 1}`);
    set('twilight-bond-progress', progress.max ? `${progress.current} / ${progress.max} EXP` : '羈絆解放');
    const touch = container.querySelector('.twilight-pet-touch');
    touch.disabled = !canPetCompanion(companion);
    const remaining = getPetCooldownRemaining(companion);
    set('twilight-pet-label', touch.disabled ? `撫摸冷卻 · ${formatCooldown(remaining)}` : '輕觸，打個招呼');
  }
}

export function setTwilightCompanionLine(line) {
  const target = document.getElementById('twilight-companion-line');
  if (target && !document.getElementById('twilight-home')?.hidden) target.textContent = line;
}

let reactionTimer;
export function reactTwilightCompanion(line) {
  const scene = document.getElementById('twilight-home');
  if (!scene || scene.hidden) return;
  if (line) setTwilightCompanionLine(line);
  clearTimeout(reactionTimer);
  scene.classList.remove('twilight-is-reacting');
  requestAnimationFrame(() => scene.classList.add('twilight-is-reacting'));
  reactionTimer = setTimeout(() => scene.classList.remove('twilight-is-reacting'), 750);
}

export function syncTwilightGacha(state, pool) {
  const container = document.getElementById('twilight-gacha-scene');
  if (!container) return;
  // Authored pool scenes retain their distinct identity and reveal contracts.
  const active = state.userPreferences?.theme === 'twilight' && pool && !pool.presentation;
  container.hidden = !active;
  document.getElementById('gacha-panel')?.classList.toggle('twilight-has-gacha-scene', !!active);
  if (!active) return;
  const eligible = getEligiblePetsForPool(state.allPets, pool);
  const pet = eligible.find((entry) => entry.id === state.companion?.id) || eligible.find((entry) => entry.id === 'pet_n01') || eligible[0];
  const src = getPetImageSrc(pet, 'stage');
  const key = JSON.stringify([pool.id, pet?.id, src, pet?.name]);
  if (container.dataset.sceneKey === key) return;
  container.dataset.sceneKey = key;
  container.innerHTML = `<div class="twilight-gacha-art">${src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(pet.name)}，卡池夥伴" decoding="async">` : ''}<div></div></div><p class="twilight-eyebrow">THE NEXT ENCOUNTER</p><h2>下一次相遇<span>。</span></h2><p>每一件完成的任務，<br>都是新夥伴靠近的起點。</p>${pet ? `<span class="twilight-gacha-caption">卡池夥伴 · ${escapeHtml(pet.name)}</span>` : ''}`;
  const image = container.querySelector('img');
  image?.addEventListener('error', () => {
    const original = getPetImageSrc(pet);
    if (original && image.getAttribute('src') !== original) image.src = original;
    else image.hidden = true;
  });
}
