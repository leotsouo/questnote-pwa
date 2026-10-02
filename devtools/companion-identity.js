import { mergeAllPetsWithLore } from '../src/loreService.js';
import { RARITIES, poolCandidates, identityLabel, basePetRate, displayResult, applyDisplayResult } from './companion-identity-model.js';
import { AWAKENING_PET_IDS } from '../src/petAwakeningCore.js';
import { normalizePoolDefinition } from '../src/poolContentContract.js';

const screen = document.getElementById('screen');
const dialog = document.getElementById('detail-dialog');
const reveal = document.getElementById('reveal-dialog');
const escapeHtml = (text) => String(text ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const asset = (pet, size = 'card') => new URL('../' + (pet.imageVariants?.[size] || pet.image), import.meta.url).href;
const byId = (id) => pets.find((pet) => pet.id === id);
const seedCollection = () => new Map(['pet_n01', 'pet_n09', 'pet_n39', 'pet_r41', 'pet_ssr25', 'pet_ur20'].map((id) => [id, { stars: 1, bondLevel: 1, fragments: 0 }]));
let pets = [];
let pools = [];
let poolId = 'lionheart_inverse_oath';
let view = 'pool';
let collection = seedCollection();
let filter = 'all';
let density = 'compact';
let query = '';
let recent = null;
let opener = null;
let timers = [];
let activeResult = null;
let applied = false;
let manual = false;
let trace = [];
const pool = () => pools.find((row) => row.id === poolId);
const candidates = () => poolCandidates(pets, pool(), document.getElementById('expansion').checked);
const owned = (pet) => collection.has(pet.id);
const presentation = () => document.getElementById('expansion').checked && pool().unlockExpansion ? { ...pool().presentation, ...pool().unlockExpansion.presentation } : pool().presentation || {};
const featureIds = () => [presentation().heroPetId, ...(presentation().featuredPetIds || [])].filter(Boolean);
const reduced = () => document.getElementById('reduce-motion').checked || matchMedia('(prefers-reduced-motion: reduce)').matches;

function imageHtml(pet, size = 'card', lazy = true, className = '') {
  return `<img class="${className}" src="${asset(pet, size)}" alt="" ${lazy ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async" data-fallback="${new URL('../' + pet.image, import.meta.url).href}">`;
}

function cues(pet, includeOwned = true) {
  return `<span class="identity-cue"><span class="rarity">${pet.rarity}</span>${includeOwned ? `<span>${owned(pet) ? '已擁有' : '尚未相遇'}</span>` : ''}</span>`;
}

function miniCard(pet, { showFeatured = false, grayscale = false, title = false } = {}) {
  return `<article class="collection-card ${grayscale && !owned(pet) ? 'unowned' : ''}"><button data-pet="${pet.id}" aria-label="${escapeHtml(identityLabel(pet, owned(pet)))}">
    ${imageHtml(pet)}<span class="pet-name">${escapeHtml(pet.name)}</span>${cues(pet)}
    ${title && pet.title ? `<span class="pet-title">${escapeHtml(pet.title)}</span>` : ''}
    ${showFeatured && featureIds().includes(pet.id) ? '<span class="subtle">焦點展示</span>' : ''}
  </button></article>`;
}

function poolSelector() {
  return `<div class="pool-select"><label for="pool-select">探索世界</label><select id="pool-select">${pools.map((row) => `<option value="${row.id}" ${row.id === poolId ? 'selected' : ''}>${escapeHtml(row.name)}</option>`).join('')}</select></div>`;
}

function renderPool() {
  const selected = pool();
  const list = candidates();
  const hero = byId(presentation().heroPetId) || list.find((pet) => pet.rarity === 'UR') || list[0];
  const support = (presentation().featuredPetIds || list.filter((pet) => pet.rarity === 'UR' && pet.id !== hero.id).slice(0, 3).map((pet) => pet.id)).map(byId).filter((pet) => pet && list.some((row) => row.id === pet.id));
  screen.innerHTML = `<div class="page-intro"><div><p class="eyebrow">COMPANION DISCOVERY</p><h1>下一位同行者。</h1><p class="page-description">每一件完成的小事，都讓相遇更近。</p></div></div>
    ${poolSelector()}<div class="pool-layout">
    <button class="hero-card rank-${hero.rarity}" data-pet="${hero.id}" aria-label="預覽 ${escapeHtml(identityLabel(hero, owned(hero)))}">
      <span class="art-label">焦點夥伴 · 點擊認識</span>${imageHtml(hero, 'stage', false, 'hero-art')}
      <span class="hero-caption"><span class="pet-name">${escapeHtml(hero.name)}</span><span class="pet-title">${escapeHtml(hero.title)}</span>${cues(hero)}</span>
    </button><div class="pool-copy"><p class="eyebrow">${escapeHtml(selected.presentation?.badge || '持續開放的相遇')}</p><h2>${escapeHtml(selected.name)}</h2>
      <p class="pool-lore">${escapeHtml(selected.presentation?.tagline || '循著星光，認識願意與你一起前進的夥伴。')}</p>
      <p class="subtle">${list.length} 位可相遇的夥伴 · 焦點展示不加成機率</p>
      ${selected.unlockExpansion ? `<p class="subtle">${document.getElementById('expansion').checked ? '晨醒花庭已解鎖，候選名單已擴充。' : `此系列在累積 ${selected.unlockExpansion.threshold} 次召喚後開啟晨醒花庭；此處顯示初始名單。`}</p>` : ''}
      <div><button class="text-button" data-action="preview">查看全部夥伴</button><br><button class="text-button" data-action="probability">機率與卡池規則</button></div>
    </div></div>
    <div class="section-heading"><h2>也在這裡等你</h2><span class="subtle">焦點展示</span></div>
    <div class="support-grid">${support.slice(0, 3).map((pet) => `<button class="mini-card" data-pet="${pet.id}" aria-label="${escapeHtml(identityLabel(pet, owned(pet)))}">${imageHtml(pet)}<span class="pet-name">${escapeHtml(pet.name)}</span>${cues(pet)}</button>`).join('')}</div>
    <div class="summon-dock"><div><p>單次召喚 ${selected.cost} 星塵</p><p>完成任務，累積下一次相遇。</p></div><button class="primary" data-action="summon" data-pet-id="${hero.id}">體驗一次相遇</button></div>
    <p class="subtle">演出為指定角色的設計預覽；不會抽取、扣款或改變你的存檔。</p>
    ${recent ? `<section class="recent"><p class="eyebrow">最近的相遇 · 展示紀錄</p><button data-pet="${recent.pet.id}">${imageHtml(recent.pet)}<span><span class="pet-name">${escapeHtml(recent.pet.name)}</span><span class="pet-title">${recent.isNew ? '新夥伴已加入手帳' : `再次相遇 · ${recent.pet.rarity} 碎片 +${recent.fragmentsGained}`}</span></span></button></section>` : ''}`;
}

function renderCollection() {
  const list = candidates();
  const count = list.filter(owned).length;
  screen.innerHTML = `<div class="page-intro"><div><p class="eyebrow">OUR ADVENTURE JOURNAL</p><h1>相遇，寫成旅程。</h1><p class="page-description">熟悉的夥伴，和還未寫下的故事。</p></div></div>${poolSelector()}
    <section class="collection-progress"><p><strong>${count} / ${list.length}</strong> <span class="subtle">位夥伴已相遇</span></p><p class="subtle">每次相遇，都留下一頁自己的記錄。</p><progress max="${list.length}" value="${count}" aria-label="${escapeHtml(pool().name)}，${count} 位已相遇，共 ${list.length} 位"></progress></section>
    <div class="filters" aria-label="收藏狀態">${[['all','全部夥伴'],['owned','已相遇'],['unowned','尚未相遇']].map(([key,label]) => `<button data-filter="${key}" aria-pressed="${filter === key}">${label}</button>`).join('')}</div>
    <div class="filters" aria-label="卡片密度"><button data-density="compact" aria-pressed="${density === 'compact'}">精簡卡片</button><button data-density="expanded" aria-pressed="${density === 'expanded'}">展開卡片</button></div>
    <label class="search-label">尋找名字或稱號<input id="collection-search" type="search" value="${escapeHtml(query)}" placeholder="輸入你記得的名字…"></label>
    <div id="collection-results"></div>`;
  renderCollectionCards();
}

function renderCollectionCards() {
  const list = candidates().filter((pet) => (filter === 'all' || (filter === 'owned' ? owned(pet) : !owned(pet))) && `${pet.name} ${pet.title || ''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  document.getElementById('collection-results').innerHTML = list.length ? `<p class="subtle" role="status" style="margin-top:16px">${list.length} 位夥伴 · 未相遇角色保留灰階預覽與名字</p><div class="collection-grid ${density === 'expanded' ? 'expanded' : ''}">${list.map((pet) => miniCard(pet, { grayscale: true, title: density === 'expanded' })).join('')}</div>` : `<section class="empty-state"><h2 role="status">這一頁還是空白。</h2><p class="subtle">試試其他名字或篩選，讓故事慢慢展開。</p><button data-action="clear-filter">顯示全部夥伴</button></section>`;
}

function render() {
  view === 'pool' ? renderPool() : renderCollection();
  document.querySelectorAll('[data-view]').forEach((button) => button.dataset.view === view ? button.setAttribute('aria-current', 'page') : button.removeAttribute('aria-current'));
  updateDemoSelect();
}

function updateDemoSelect() {
  const select = document.getElementById('demo-pet');
  const selected = select.value;
  select.innerHTML = [...candidates()].sort((a,b) => RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity)).map((pet) => `<option value="${pet.id}">${pet.name} · ${pet.rarity}</option>`).join('');
  if (candidates().some((pet) => pet.id === selected)) select.value = selected;
}

function showDialog(heading, html) {
  if (!dialog.open) opener = document.activeElement;
  document.getElementById('dialog-content').innerHTML = `<div class="dialog-header"><h2 id="dialog-heading">${escapeHtml(heading)}</h2><button data-action="close-dialog">關閉</button></div><div class="dialog-body">${html}</div>`;
  if (!dialog.open) dialog.showModal();
  dialog.querySelector('[data-action="close-dialog"]').focus();
}

function keepDialogFocus(event) {
  if (event.key !== 'Tab') return;
  const modal = event.currentTarget;
  const controls = [...modal.querySelectorAll('button, a[href], input, select, textarea, summary, [tabindex]')].filter((control) => !control.disabled && control.tabIndex >= 0 && control.getClientRects().length && getComputedStyle(control).visibility !== 'hidden');
  const first = controls[0];
  const last = controls.at(-1);
  if (!first) return;
  if (event.shiftKey && (document.activeElement === first || document.activeElement === modal)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === modal)) {
    event.preventDefault();
    first.focus();
  }
}

function petDetail(pet) {
  const entry = collection.get(pet.id);
  const isOwned = !!entry;
  // description may contain the entire long story in recent pools: only the
  // first two sentences are public. Bond chapters never enter an unowned DOM.
  const publicIntro = (pet.description || '').split(/(?<=[。！？])/).slice(0,2).join('');
  const species = { griffin:'格里芬', biomechanical_chimera:'生體機械奇美拉' }[pet.speciesType] || '';
  showDialog(isOwned ? '夥伴手記' : '初識夥伴', `${imageHtml(pet,'stage',false,'detail-art')}
    <div class="detail-identity"><h3 class="pet-name">${escapeHtml(pet.name)}</h3><p class="pet-title">${escapeHtml(pet.title)}</p>${cues(pet)}<p class="subtle" style="margin-top:10px">${escapeHtml([pet.element ? `${pet.element}屬性` : '',species].filter(Boolean).join(' · '))}</p></div>
    ${AWAKENING_PET_IDS.includes(pet.id) ? '<p class="subtle">目前預覽：初始形態 · 覺醒後仍是同一位夥伴</p>' : ''}
    <p class="detail-copy">${escapeHtml(isOwned ? pet.lore : publicIntro)}</p>
    ${isOwned ? `<dl class="detail-stats"><div><dt>升星</dt><dd>${entry.stars} 星</dd></div><div><dt>親密度</dt><dd>Lv.${entry.bondLevel}</dd></div><div><dt>此夥伴碎片</dt><dd>${entry.fragments}</dd></div></dl>` : ''}
    ${isOwned && pet.personality?.length ? `<section class="detail-section"><h3>認識牠的個性</h3><p>${escapeHtml(pet.personality.join(' · '))}</p><blockquote>${escapeHtml(pet.dialogues?.normal?.[0] || '')}</blockquote></section>` : ''}
    <section class="detail-section"><h3>相處，才會揭開的故事</h3>${isOwned ? [2,3,4,5].map((level) => `<p>親密度 Lv.${level} · ${entry.bondLevel >= level ? escapeHtml(pet.bondUnlocks?.[level] || '已解鎖') : '故事尚未解鎖'}</p>`).join('') : '<p>相遇後可閱讀完整背景；專屬對話與羈絆章節隨親密度逐步揭開。</p>'}</section>
    ${isOwned ? `<section class="detail-section"><h3>一起走下去</h3><p>升星、餵食與約定保留在正式 App。此處查看角色與收藏狀態。</p>${entry.nickname ? `<p>你的暱稱：${escapeHtml(entry.nickname)} · 原名永遠保留在主標。</p>` : ''}</section>` : `<section class="detail-section"><p>你可以先記住牠的名字，讓下一次相遇更熟悉。</p></section>`}<button class="text-button" data-action="preview">返回本池夥伴</button>`);
}

function poolPreview() {
  showDialog('這裡可以遇見誰', `<p class="subtle">${escapeHtml(pool().name)} · ${candidates().length} 位夥伴</p><p class="subtle">焦點只是介紹，不代表機率加成。</p><button class="text-button" data-action="probability">查看機率與規則</button><div class="preview-grid">${candidates().map((pet) => miniCard(pet, {showFeatured:true})).join('')}</div>`);
}

function probability() {
  const selected = pool();
  const list = candidates();
  showDialog('機率與卡池規則', `<p class="subtle">${escapeHtml(selected.name)} · 既有規則</p><table class="rate-table"><caption>一般召喚基礎機率（保底未觸發時）</caption><thead><tr><th scope="col">稀有度</th><th scope="col">機率</th><th scope="col">角色數</th></tr></thead><tbody>${RARITIES.map((rarity) => `<tr><th scope="row">${rarity}</th><td>${(selected.rates[rarity] * 100).toFixed(0)}%</td><td>${list.filter((pet) => pet.rarity === rarity).length}</td></tr>`).join('')}</tbody></table>
    <p class="probability-note">先選稀有度，再於同稀有度候選中等機率選取。焦點夥伴沒有另加權；不是 Rate-Up。</p>
    <p class="probability-note">SSR 或 UR 保底上限 ${selected.pity.ssr} 抽：若前 ${selected.pity.ssr - 1} 抽都未得到 SSR 或 UR，第 ${selected.pity.ssr} 抽必為 SSR 或 UR（依兩者基礎比例分配）。UR 保底上限 ${selected.pity.ur} 抽：若前 ${selected.pity.ur - 1} 抽都未得到 UR，第 ${selected.pity.ur} 抽必為 UR。各池獨立計數。得到 UR 時兩種計數歸零；SSR 只重設 SSR 計數。</p>
    <p class="probability-note">單次 ${selected.cost} 星塵；十次 ${selected.cost * 10} 星塵。Prototype 不執行任何抽取。</p>
    ${selected.unlockExpansion ? `<p class="probability-note">原有花庭擴充：${selected.unlockExpansion.threshold} 次召喚後解鎖，候選名單與贈寵依正式規則；此處僅切換名單預覽，不授予獎勵。</p>` : ''}
    <details style="margin-top:18px"><summary>每隻夥伴的基礎機率</summary><table class="rate-table"><thead><tr><th scope="col">名字</th><th scope="col">機率</th></tr></thead><tbody>${list.map((pet) => `<tr><th scope="row">${escapeHtml(pet.name)}</th><td>${(basePetRate(pet,list,selected)*100).toLocaleString('en',{maximumFractionDigits:4})}%</td></tr>`).join('')}</tbody></table></details>`);
}

function clearTimers() { timers.forEach(clearTimeout); timers = []; }

function phase(name) {
  const shell = document.querySelector('.reveal-shell');
  if (!shell) return;
  shell.dataset.phase = name;
  trace.push({ phase: name, at: Math.round(performance.now() - Number(shell.dataset.start)) });
  shell.dataset.trace = JSON.stringify(trace);
  // The dialog's accessible name follows the same recognition order as its art.
  reveal.removeAttribute('aria-labelledby');
  reveal.setAttribute('aria-label', name === 'name' ? `${activeResult.pet.name}，${activeResult.pet.rarity}` : ['title','result'].includes(name) ? identityLabel(activeResult.pet, name === 'result') : '夥伴相遇演出');
  shell.querySelector('.pet-name').setAttribute('aria-hidden', !['name','title','result'].includes(name));
  shell.querySelector('.pet-title').setAttribute('aria-hidden', !['title','result'].includes(name));
  shell.querySelector('.reveal-stage-label').textContent = {begin:'循著星光，等待相遇',cue:`${activeResult.pet.rarity} · 相遇的微光`,silhouette:'一位夥伴正在靠近',art:'牠已經來到你面前',name:'記住這位同行者',title:'名字背後，是牠的故事',result:activeResult.isNew?'新的旅程，從這裡開始':'熟悉的夥伴，再次相遇'}[name];
  if (name === 'name' && !reduced() && document.getElementById('haptics').checked && navigator.vibrate) {
    navigator.vibrate({N:8,R:12,SR:16,SSR:18,UR:[20,30,12]}[activeResult.pet.rarity]);
  }
  if (name === 'result') {
    clearTimers();
    if (!applied) { collection = applyDisplayResult(collection,activeResult); recent = activeResult; applied = true; }
    shell.querySelector('[data-action="skip-reveal"]').textContent = '關閉';
    document.getElementById('announcement').textContent = `${activeResult.pet.name}，${activeResult.pet.title || ''}，${activeResult.pet.rarity}。${activeResult.isNew ? '新夥伴已加入展示圖鑑。' : `再次相遇，${activeResult.pet.name}碎片增加${activeResult.fragmentsGained}。`}`;
    shell.querySelector('.reveal-actions').removeAttribute('aria-hidden');
    shell.querySelector('.obtained').removeAttribute('aria-hidden');
  }
}

function startReveal(pet, duplicate = owned(pet), stepByStep = false) {
  clearTimers();
  if (dialog.open) dialog.close();
  opener = document.activeElement;
  activeResult = displayResult(pet,duplicate);
  applied = false;
  manual = stepByStep;
  trace = [];
  document.getElementById('reveal-content').innerHTML = `<section class="reveal-shell rank-${pet.rarity}" data-phase="begin" data-start="${performance.now()}">
    <div class="reveal-top"><p class="eyebrow reveal-stage-label">循著星光，等待相遇</p><button data-action="skip-reveal">略過演出</button></div>
    ${imageHtml(pet,'stage',false,'reveal-image')}<div class="reveal-identity"><h2 id="reveal-name" class="pet-name" aria-hidden="true">${escapeHtml(pet.name)}</h2><p class="pet-title" aria-hidden="true">${escapeHtml(pet.title)}</p>${cues(pet,false)}</div>
    <div class="obtained" aria-hidden="true">${duplicate ? `再次相遇 · ${escapeHtml(pet.name)}碎片 +${activeResult.fragmentsGained}<p>碎片會幫助這位夥伴升星。</p>` : '新夥伴，已加入你的旅程。<p>從相遇開始，讓故事慢慢變熟悉。</p>'}</div>
    <div class="reveal-actions" aria-hidden="true"><button class="primary" data-action="reveal-detail">認識這位夥伴</button><button data-action="reveal-collection">收入旅程手帳</button></div>
    ${manual ? `<div class="filters" aria-label="逐步檢視演出">${['begin','cue','silhouette','art','name','title','result'].map((key,index) => `<button data-phase-step="${key}">${index+1} ${['開始','稀有線索','輪廓','插畫','名字','稱號','結果'][index]}</button>`).join('')}</div>` : ''}
  </section>`;
  reveal.showModal();
  phase(reduced() ? 'result' : 'begin');
  if (!reduced() && !manual) {
    [['cue',300],['silhouette',550],['art',850],['name',1200],['title',1450],['result',1800]].forEach(([key,delay]) => timers.push(setTimeout(() => phase(key),delay)));
  }
}

function closeReveal() { clearTimers(); reveal.close(); render(); }

function stress() {
  const examples = [pets.find((pet) => pet.name.length === 2), pets.find((pet) => pet.name.length === 3), byId('pet_n01'), byId('pet_n40'), byId('pet_ur19')].filter(Boolean);
  showDialog('名字與稱號的閱讀測試', `<p class="subtle">真實角色維持原名。英文與極長句僅為排版測試字串，不會寫入角色資料。</p>${examples.map((pet) => `<section class="stress-sample">${imageHtml(pet)}<p class="pet-name">${escapeHtml(pet.name)}</p><p class="pet-title">${escapeHtml(pet.title)}</p>${cues(pet)}</section>`).join('')}
    <section class="stress-sample" lang="en"><p class="subtle">Typography sample · not a character</p><p class="pet-name">The Companion Beyond the Mist</p><p class="pet-title">A Keeper of Quiet Promises Beneath the Very Last Starlight</p></section>
    <section class="stress-sample"><p class="subtle">排版測試字串 · 非角色</p><p class="pet-name">與你同行於暮色森林的長名字測試</p><p class="pet-title">在漫長旅途裡守護每一個小小承諾與日常成長的稱號測試</p></section>`);
}

document.addEventListener('error', (event) => {
  const img = event.target;
  if (img instanceof HTMLImageElement && img.dataset.fallback && img.src !== img.dataset.fallback) img.src = img.dataset.fallback;
},true);

document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.view) { view = button.dataset.view; render(); window.scrollTo(0,0); return; }
  if (button.dataset.pet) { petDetail(byId(button.dataset.pet)); return; }
  if (button.dataset.filter) { filter = button.dataset.filter; renderCollection(); return; }
  if (button.dataset.density) { density = button.dataset.density; renderCollection(); return; }
  if (button.dataset.phaseStep) { phase(button.dataset.phaseStep); return; }
  const action = button.dataset.action;
  if (action === 'preview') poolPreview();
  if (action === 'probability') probability();
  if (action === 'close-dialog') dialog.close();
  if (action === 'summon') startReveal(byId(button.dataset.petId));
  if (action === 'skip-reveal') document.querySelector('.reveal-shell').dataset.phase === 'result' ? closeReveal() : phase('result');
  if (action === 'reveal-detail') { const pet = activeResult.pet; closeReveal(); petDetail(pet); }
  if (action === 'reveal-collection') { view = 'collection'; closeReveal(); screen.focus(); }
  if (action === 'clear-filter') { filter = 'all'; query = ''; renderCollection(); }
});

document.addEventListener('change', (event) => {
  if (event.target.id === 'pool-select') { poolId = event.target.value; query = ''; render(); }
});
document.addEventListener('input', (event) => {
  if (event.target.id === 'collection-search') { query = event.target.value; renderCollectionCards(); }
});
document.getElementById('theme').addEventListener('change', (event) => { document.body.dataset.theme = event.target.value; });
document.getElementById('type-scale').addEventListener('change', (event) => { document.documentElement.style.fontSize = `${16 * Number(event.target.value)}px`; });
document.getElementById('reduce-motion').addEventListener('change', (event) => {
  document.body.dataset.reduceMotion = String(event.target.checked);
  if (reveal.open && reduced()) phase('result');
});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => { if (reveal.open && reduced()) phase('result'); });
document.getElementById('expansion').addEventListener('change',render);
document.getElementById('review-toggle').addEventListener('click', (event) => {
  const panel = document.getElementById('review-panel'); panel.hidden = !panel.hidden; event.currentTarget.setAttribute('aria-expanded', String(!panel.hidden));
});
document.getElementById('demo-new').addEventListener('click', () => startReveal(byId(document.getElementById('demo-pet').value),false));
document.getElementById('demo-duplicate').addEventListener('click', () => startReveal(byId(document.getElementById('demo-pet').value),true));
document.getElementById('stress').addEventListener('click',stress);
document.getElementById('reset-demo').addEventListener('click', () => { collection = seedCollection(); recent = null; render(); });
const stepButton = document.createElement('button');
stepButton.id = 'demo-steps'; stepButton.textContent = '逐步檢視 Reveal';
document.querySelector('.review-actions').append(stepButton);
stepButton.addEventListener('click', () => startReveal(byId(document.getElementById('demo-pet').value),false,true));
dialog.addEventListener('close', () => { if (opener?.isConnected) opener.focus(); });
dialog.addEventListener('keydown', keepDialogFocus);
reveal.addEventListener('keydown', keepDialogFocus);
reveal.addEventListener('cancel', (event) => {
  event.preventDefault();
  document.querySelector('.reveal-shell').dataset.phase === 'result' ? closeReveal() : phase('result');
});
reveal.addEventListener('close', () => { clearTimers(); if (opener?.isConnected) opener.focus(); else screen.focus(); });
document.getElementById('haptic-support').textContent = typeof navigator.vibrate === 'function' ? '此瀏覽器提供震動 API；實際觸覺仍須裝置檢查。' : '此瀏覽器不提供震動 API；演出保留完整視覺與文字回饋。';

try {
  const read = async (file) => { const response = await fetch(new URL('../data/' + file,import.meta.url)); if (!response.ok) throw Error(file + ' 無法載入'); return response.json(); };
  const [petData,loreData,poolData] = await Promise.all([read('pets.json'),read('pets-lore.json'),read('pools.json')]);
  pets = mergeAllPetsWithLore(petData.pets,loreData);
  pools = poolData.pools.filter((row) => row.active).map(normalizePoolDefinition);
  render();
} catch (error) {
  screen.innerHTML = `<section class="empty-state"><h1>夥伴手帳還沒準備好。</h1><p>${escapeHtml(error.message)}</p><p>請從本機 HTTP 預覽重新開啟。</p></section>`;
}
