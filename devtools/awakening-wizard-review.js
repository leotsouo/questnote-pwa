/** Design-only wizard. No storage, app controller, wallet or draw APIs. */
import { playAwakeningScene } from '../src/petAwakeningScene.js';

const app = document.querySelector('#app');
const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let entry;
let pet;
let state;
let inside = false;
let destination = null;
let busy = false;
let announcement = '';
const [catalog, pets] = await Promise.all(['data/pet-awakening.json', 'data/pets.json'].map(async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw Error(`無法載入 ${url}`);
  return response.json();
}));
const selector = document.querySelector('#character');
selector.innerHTML = catalog.pets.map((p) => `<option value="${p.petId}"${p.petId === 'pet_ur18' ? ' selected' : ''}>${escape(p.name)} · ${p.rarity}</option>`).join('');

function reset() {
  if (busy) return;
  entry = catalog.pets.find((p) => p.petId === selector.value);
  pet = pets.pets.find((p) => p.id === entry.petId);
  const preset = document.querySelector('#scenario').value;
  state = { owned: true, level: 5, story: true, started: false, daily: 0, expedition: false, token: false, food: 1, paused: false, other: false, awakened: false, form: 'awakened' };
  if (preset === 'fresh') Object.assign(state, { owned: false, level: 3, story: false });
  if (['active', 'paused', 'food', 'ready', 'awakened'].includes(preset)) state.started = true;
  if (['active', 'paused'].includes(preset)) state.daily = 1;
  if (preset === 'paused') state.paused = true;
  if (preset === 'conflict') state.other = true;
  if (['food', 'ready', 'awakened'].includes(preset)) Object.assign(state, { daily: 3, expedition: true, token: true });
  if (preset === 'food') state.food = 0;
  if (preset === 'awakened') Object.assign(state, { awakened: true, food: 0, token: false });
  inside = false; destination = null; announcement = ''; render();
}

function step() {
  if (state.awakened) return 'done';
  if (!state.owned) return 'owned';
  if (state.level < 5) return 'bond';
  if (!state.story) return 'story';
  if (state.paused) return 'paused';
  if (!state.started) return state.other ? 'conflict' : 'start';
  if (state.daily < 3) return 'daily';
  if (!state.expedition) return 'expedition';
  if (!state.token) return 'token';
  if (state.food < 1) return 'food';
  return 'ritual';
}

function eligible() {
  return state.owned && state.level >= 5 && state.story && state.started && !state.paused
    && state.daily === 3 && state.expedition && state.token && state.food >= 1 && !state.awakened;
}

const button = (action, label, primary = false) => `<button type="button" data-action="${action}" class="${primary ? 'primary' : ''}">${label}</button>`;
function conditions() {
  const rows = [
    [state.owned, '已收藏這位夥伴'], [state.level >= 5, '親密度 Lv.5'], [state.story, '已領取 Lv.5 同行故事獎勵'],
    [state.started, `已接下試煉${state.paused ? '（暫停中）' : ''}`], [state.daily === 3, `接下後的新任務／習慣 ${state.daily}/3`],
    [state.expedition, '接下後出發的雲棧古道參隊派遣，已領獎'], [state.token || state.awakened, `${escape(entry.tokenName)} ${state.awakened ? '已使用' : state.token ? '1 枚' : '尚未取得'}`],
    [state.food >= 1 || state.awakened, `松香行旅糰 ${state.awakened ? '儀式已使用 1 份' : `${state.food}/1 份`}`],
  ];
  return `<details class="conditions"><summary>查看全部條件與目前進度</summary><ul>${rows.map(([ok, text]) => `<li>${ok ? '✓' : '○'} ${text}</li>`).join('')}</ul><p>日常與派遣可並行；只計入進行期間的新完成。重複事件不計入，暫停不清空進度。</p></details>`;
}

function content(current) {
  const stages = {
    owned: ['先和這位夥伴相遇，好嗎？', '收藏之後，這段守諾旅程才屬於你們。', '目前尚未收藏。', 'visit-summon', '前往劍隱山河召喚'],
    bond: ['先讓你們更熟悉彼此，好嗎？', '等牠願意把最後一段同行故事交給你。', `親密度 Lv.${state.level} / Lv.5`, 'visit-bond', '前往親密度養成'],
    story: ['聽聽牠最後一段同行故事，好嗎？', '讀完故事並領取 Lv.5 獎勵，才能接下新的約定。', '親密度已達 Lv.5；最後一章尚未領獎。', 'visit-story', '開啟 Lv.5 同行故事'],
    conflict: ['要把目前的約定先暫停嗎？', '一次只陪一位夥伴完成試煉。另一位的既有進度會保留。', '另一位夥伴正在試煉。', 'switch', '暫停另一位，接下此約'],
    paused: ['要繼續你們的約定嗎？', '上次留下的腳步還在，從這裡繼續就好。', `日常 ${state.daily}/3 · 古道同行 ${state.expedition ? '已完成' : '尚未完成'}。暫停期間不計入。`, 'resume', '恢復試煉'],
    start: ['願意和牠接下這個約定嗎？', entry.invitation, '接下後完成三筆新任務／習慣，及一次牠參隊的新古道派遣領獎。日常與派遣可以並行。', 'start', '接下守諾試煉'],
    daily: ['今天，先一起完成一件小事？', '每一筆新完成，都讓你們更靠近這個約定。', `接下後的新任務／習慣 ${state.daily}/3；還差 ${3 - state.daily} 筆。`, 'visit-daily', '前往今日任務／習慣'],
    expedition: ['一起走一趟雲棧古道，好嗎？', '讓牠加入隊伍，帶著你們的約定出發。', '必須接下試煉後出發；牠當隊長或隊員皆可，領取派遣獎勵才算完成。', 'visit-expedition', '前往雲棧古道'],
    token: ['收下你們的信物，好嗎？', '三筆日常和一次古道同行，留下了這份證明。', '試煉完成時，系統自動給予信物，不需額外收集。', 'sync', '重新核對試煉'],
    food: ['準備一份行旅糰，好嗎？', '信物已經在你手中，儀式還差最後一份心意。', `${entry.tokenName} 1 枚已保留 · 松香行旅糰 0/1 份。`, 'visit-food', '前往工坊製作'],
    ritual: ['準備與牠共赴此約了嗎？', '你們走過的每一步，都已成為彼此的承諾。', `全部條件已核對。儀式會使用「${entry.tokenName} 1 枚＋松香行旅糰 1 份」。`, 'awaken', '完成覺醒 · 使用信物與行旅糰'],
  };
  if (current === 'done') return `<p class="badge">✓ 覺醒完成 · ${escape(entry.title)}</p><h2 id="question">牠以新的姿態，繼續與你同行。</h2><p>${escape(entry.story[0])}</p><p class="fact">覺醒篇章、專屬陪伴回應與稱號已開放；稱號可至稱號管理自行裝備。</p><div class="actions">${button('form', state.form === 'awakened' ? '切換初遇相' : '切換覺醒相', true)}${button('replay', '重播覺醒演出')}</div><p class="fact">目前：${state.form === 'awakened' ? '覺醒相' : '初遇相'}。形態選擇會按角色保留。</p>`;
  const [question, words, fact, action, label] = stages[current];
  return `<h2 id="question">${escape(question)}</h2><p class="message">${escape(words)}</p><p class="fact">${escape(fact)}</p>${current === 'daily' ? `<div class="progress-dots" aria-label="日常完成 ${state.daily}/3">${[0, 1, 2].map((i) => `<span class="${i < state.daily ? 'passed' : ''}"></span>`).join('')}</div>` : ''}${current === 'ritual' ? '<p>完成後揭曉覺醒卡面，開放雙形態、覺醒篇章、稱號與專屬陪伴回應。</p>' : ''}<div class="actions">${button(action, label, true)}</div>${current === 'daily' ? `<div class="meta-actions">${state.expedition ? '<span class="fact">✓ 古道同行已完成</span>' : button('visit-expedition', '也可以先去古道同行')}</div>` : ''}`;
}

function render(focus = false) {
  const current = step();
  const phases = ['owned', 'bond', 'story', 'start', 'daily', 'expedition', 'food', 'ritual', 'done'];
  const rank = current === 'paused' ? 4 : current === 'conflict' ? 3 : Math.max(0, phases.indexOf(current));
  const image = state.awakened && state.form === 'awakened' ? entry.awakenedImage?.card || pet.imageVariants.card : entry.initialImage.card;
  app.setAttribute('aria-busy', 'false');
  app.innerHTML = `<div class="crumb">圖鑑 / 劍隱山河 / ${escape(entry.name)}${inside ? ' / 羈絆覺醒' : ''}</div><div class="layout"><aside class="identity"><div class="art"><img class="portrait" src="${image}" alt="${escape(entry.name)}${state.awakened && state.form === 'awakened' ? '覺醒相' : '初遇相'}"><p class="portrait-caption">${state.awakened && state.form === 'awakened' ? '覺醒相' : '初遇相'}</p></div><div><p class="eyebrow">${entry.rarity} · 劍隱山河</p><h1>${escape(entry.name)}</h1><p class="subtle">${state.owned ? `已收藏 · 親密度 Lv.${state.level}` : '尚未收藏'}</p><p class="story subtle">${escape(entry.signature)}</p></div></aside><section>${inside ? `<p class="eyebrow">一諾同行 · 羈絆覺醒</p><p class="fact">${escape(entry.trialTitle)}${state.paused ? ' · 已暫停' : ''}</p><div class="stepper" aria-hidden="true">${Array.from({ length: 8 }, (_, i) => `<span class="${i < rank ? 'passed' : ''}"></span>`).join('')}</div><p class="fact">${rank < 3 ? '準備資格' : rank === 3 ? '接下約定' : rank < 6 ? '守諾試煉' : rank === 6 ? '準備材料' : rank === 7 ? '完成儀式' : '新的同行'}</p><section class="stage" aria-labelledby="question">${content(current)}${destination ? destinationHtml() : ''}<p class="status" role="status" aria-live="polite">${escape(announcement)}</p></section>${conditions()}<div class="meta-actions">${button('close', '稍後繼續 · 返回角色詳情')}${state.started && !state.paused && !state.token && !state.awakened ? button('pause', '暫停試煉') : ''}</div><p class="phase-note">離開會保留已完成的步驟，試煉仍繼續計入；只有「暫停試煉」停止計入。覺醒是可選養成，不扣親密度、星塵或碎片，不改稀有度或派遣收益。</p>` : `<p class="eyebrow">角色手記</p><h2>每一次同行，都留下新的故事。</h2><p>與${escape(entry.name)}培養親密度，閱讀同行篇章，記錄你們走過的山河。</p><div class="entry"><h3>羈絆覺醒</h3><p>${state.awakened ? '你們已完成約定，查看新的姿態與故事。' : state.paused ? '試煉已暫停，已完成的進度保留。' : state.started ? `日常 ${state.daily}/3 · 古道同行 ${state.expedition ? '已完成' : '尚未完成'}。接著走完你們的約定。` : '一次一個步驟，陪牠完成守諾旅程。'}</p>${button('open', state.awakened ? '查看覺醒與形態' : state.started ? '繼續覺醒旅程' : '開始覺醒旅程', true)}</div><p class="phase-note">設計選定此處為唯一操作入口。卡池頁保留簡短介紹，引導到圖鑑角色詳情。</p>`}</section></div>`;
  app.querySelector('.portrait').addEventListener('error', (event) => {
    const img = event.currentTarget;
    if (!img.dataset.fallback) { img.dataset.fallback = 'true'; img.src = state.awakened && state.form === 'awakened' ? pet.image : entry.initialImage.original; }
  });
  if (focus) { const target = app.querySelector('#question') || app.querySelector('h2'); target.tabIndex = -1; target.focus(); }
}

function destinationHtml() {
  const descriptions = {
    summon: ['召喚頁', '正式實作會前往劍隱山河召喚；收藏後，返回即可接續。', '示範：已收藏，返回旅程'],
    bond: ['親密度養成', '正式實作會打開這位夥伴的養成；達 Lv.5 後接續。', '示範：達到 Lv.5，返回旅程'],
    story: ['Lv.5 同行故事', '正式實作會開啟角色故事；必須領取獎勵才通過。', '示範：已領取故事獎勵，返回'],
    daily: ['今日任務／習慣', '正式實作會前往日常清單；只計入接下試煉後的新完成。', '示範：完成一筆日常，返回'],
    expedition: ['雲棧古道派遣', '正式實作會預選雲棧古道與這位夥伴；等待派遣結束並領獎。', '示範：新派遣已參隊並領獎，返回'],
    food: ['工坊 · 松香行旅糰', '正式實作會預選配方；製作後重新讀取背包。', '示範：製作一份，返回旅程'],
  };
  const [title, description, label] = descriptions[destination];
  return `<section class="destination"><h3>${title}</h3><p class="fact">${description}</p><div class="actions">${button('return', label)}${button('cancel-destination', '先返回，不完成')}</div></section>`;
}

function updateToken() {
  if (state.started && state.daily === 3 && state.expedition && !state.awakened) {
    state.token = true; announcement = `試煉已完成，已自動取得${entry.tokenName} 1 枚。`;
  }
}

app.addEventListener('click', async (event) => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action || busy) return;
  announcement = '';
  if (action === 'open') inside = true;
  else if (action === 'close') { inside = false; destination = null; }
  else if (action === 'start' || action === 'switch') { state.started = true; state.other = false; }
  else if (action === 'pause') { state.paused = true; announcement = '已暫停；已完成進度保留。'; }
  else if (action === 'resume') { state.paused = false; announcement = '已恢復，只計入恢復後的新完成。'; }
  else if (action.startsWith('visit-')) destination = action.slice(6);
  else if (action === 'cancel-destination') destination = null;
  else if (action === 'return') {
    if (destination === 'summon') state.owned = true;
    if (destination === 'bond') state.level = 5;
    if (destination === 'story') state.story = true;
    if (destination === 'daily' && state.started && !state.paused) state.daily = Math.min(3, state.daily + 1);
    if (destination === 'expedition' && state.started && !state.paused) state.expedition = true;
    if (destination === 'food') state.food += 1;
    destination = null; announcement = '已核對完成紀錄，接著走下一步。'; updateToken();
  } else if (action === 'sync') updateToken();
  else if (action === 'form' && state.awakened) state.form = state.form === 'awakened' ? 'initial' : 'awakened';
  else if (action === 'awaken' || action === 'replay') {
    if (action === 'awaken') {
      if (!eligible()) { announcement = '條件尚未齊全，請先完成目前步驟。'; render(true); return; }
      // Mirrors product ordering: successful atomic commit precedes visual playback.
      state.food -= 1; state.token = false; state.awakened = true; state.form = 'awakened';
    } else if (!state.awakened) return;
    busy = true;
    document.querySelectorAll('.review-controls button, .review-controls select').forEach((el) => { el.disabled = true; });
    try { await playAwakeningScene(entry, pet); }
    finally { busy = false; document.querySelectorAll('.review-controls button, .review-controls select').forEach((el) => { el.disabled = false; }); }
    announcement = action === 'awaken' ? '覺醒已完成，新的卡面已開放。' : '演出重播完畢，未再次使用材料。';
  }
  render(!action.startsWith('visit-'));
});
document.querySelector('#reset').addEventListener('click', reset);
reset();
