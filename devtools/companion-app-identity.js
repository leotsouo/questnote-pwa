import { initialAwakeningPortrait } from '../src/petAwakeningView.js';
import { installLocalIdentityRenderer, LOCAL_ART_PREVIEW } from '../src/localArtPreview.js';
import { openDB, dbGetAll, STORES } from '../src/db.js';
import { createCollectionEntry } from '../src/collectionService.js';
import { setTheme, applyThemeToDocument, setFontSize, applyFontSizeToDocument } from '../src/preferencesService.js';
if (!LOCAL_ART_PREVIEW) throw new Error('This viewer requires its local session server');
import { mergeAllPetsWithLore } from '../src/loreService.js';
import { RARITIES, MAX_DISPLAY_STARS, poolCandidates, identityLabel, basePetRate, seedDisplayCollection, publicIntro, normalGreeting, prepareDisplayBatch, tenPreviewPets, duplicateNote, setDisplayCompanion } from './companion-identity-model.js';
import { AWAKENING_PET_IDS } from '../src/petAwakeningCore.js';
import { normalizePoolDefinition } from '../src/poolContentContract.js';

let screen = document.getElementById('identity-screen');
let refreshApp = null;
let appActions = null;
const dialog = document.getElementById('identity-detail-dialog');
const reveal = document.getElementById('identity-reveal-dialog');
const escapeHtml = (text) => String(text ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const asset = (pet, size = 'card') => new URL('../' + (pet.imageVariants?.[size] || pet.image), import.meta.url).href;
const byId = (id) => pets.find((pet) => pet.id === id);
let pets = [];
let pools = [];
let poolId = 'lionheart_inverse_oath';
let collectionScope = 'all';
let view = 'pool';
let collection = seedDisplayCollection();
let filter = 'all';
let density = 'compact';
let query = '';
let recent = null;
let dialogOpener = null;
let revealOpener = null;
let revealFocusAction = '';
let detailReturnsToBatch = false;
let timers = [];
let activeResult = null;
let activeBatch = null;
let manual = false;
let displayBusy = false;
let trace = [];
const pool = () => pools.find((row) => row.id === poolId);
const candidates = () => poolCandidates(pets, pool(), document.getElementById('identity-expansion').checked);
const owned = (pet) => collection.has(pet.id);
const collectionCandidates = () => collectionScope === 'all' ? pets : poolCandidates(pets, pools.find((row) => row.id === collectionScope), document.getElementById('identity-expansion').checked);
const collectionScopeName = () => collectionScope === 'all' ? '全部系列' : pools.find((row) => row.id === collectionScope).name;
const presentation = () => document.getElementById('identity-expansion').checked && pool().unlockExpansion ? { ...pool().presentation, ...pool().unlockExpansion.presentation } : pool().presentation || {};
const featureIds = () => [presentation().heroPetId, ...(presentation().featuredPetIds || [])].filter(Boolean);
const reduced = () => document.getElementById('identity-reduce-motion').checked || matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  const isCollection = view === 'collection';
  const selected = isCollection ? collectionScope : poolId;
  return `<div class="pool-select"><label for="identity-pool-select-${view}">${isCollection ? '瀏覽系列' : '探索世界'}</label><select id="identity-pool-select-${view}">${isCollection ? '<option value="all">全部系列</option>' : ''}${pools.map((row) => `<option value="${row.id}" ${row.id === selected ? 'selected' : ''}>${escapeHtml(row.name)}</option>`).join('')}</select></div>`;
}

function companionPreview() {
  const pair = [...collection].find(([, entry]) => entry.isCompanion);
  if (!pair) return '<section class="companion-preview"><p class="eyebrow">今天的同行者</p><p class="subtle">在已相遇夥伴的手記中，選擇想一起同行的夥伴。</p></section>';
  const [id, entry] = pair;
  const pet = byId(id);
  return `<section class="companion-preview"><p class="eyebrow">今天的同行者 · 日常陪伴</p><button data-pet="${id}" aria-label="${escapeHtml([entry.nickname || pet.name, entry.nickname ? `原名：${pet.name}` : '', '目前陪伴夥伴'].filter(Boolean).join('，'))}">${imageHtml(pet)}<span><strong class="companion-name">${escapeHtml(entry.nickname || pet.name)}</strong>${entry.nickname ? `<span class="companion-original">原名：${escapeHtml(pet.name)}</span>` : ''}<span class="subtle">${pet.rarity} · 正在與你同行</span></span><span class="companion-link">認識牠</span></button></section>`;
}

function renderPool() {
  const selected = pool();
  const list = candidates();
  const hero = byId(presentation().heroPetId) || list.find((pet) => pet.rarity === 'UR') || list[0];
  const support = (presentation().featuredPetIds || list.filter((pet) => pet.rarity === 'UR' && pet.id !== hero.id).slice(0, 3).map((pet) => pet.id)).map(byId).filter((pet) => pet && list.some((row) => row.id === pet.id));
  screen.innerHTML = `<div class="page-intro pool-heading"><h1>下一位同行者。</h1></div>
    ${poolSelector()}<div class="pool-layout">
    <div class="pool-stage"><button class="hero-card rank-${hero.rarity}" data-pet="${hero.id}" aria-label="預覽 ${escapeHtml(identityLabel(hero, owned(hero)))}">
      <span class="art-label">焦點夥伴 · 點擊認識</span>${imageHtml(hero, 'stage', false, 'hero-art')}
      <span class="hero-caption"><span class="pet-name">${escapeHtml(hero.name)}</span><span class="pet-title">${escapeHtml(hero.title)}</span>${cues(hero)}</span>
    </button><div class="summon-dock"><p>單次召喚 ${selected.cost} 星塵 · 此處不消耗</p><div class="summon-buttons"><button class="primary" data-identity-action="summon" data-pet-id="${hero.id}">體驗一次相遇</button><button data-identity-action="summon-ten">體驗十連</button></div></div></div>
    <div class="pool-copy"><p class="eyebrow">${escapeHtml(selected.presentation?.badge || '持續開放的相遇')}</p><h2>${escapeHtml(selected.name)}</h2>
      <p class="pool-lore">${escapeHtml(selected.presentation?.tagline || '循著星光，認識願意與你一起前進的夥伴。')}</p>
      <p class="subtle">${list.length} 位可相遇的夥伴 · 焦點展示不加成機率</p>
      ${selected.unlockExpansion ? `<p class="subtle">${document.getElementById('identity-expansion').checked ? '晨醒花庭已解鎖，候選名單已擴充。' : `此系列在累積 ${selected.unlockExpansion.threshold} 次召喚後開啟晨醒花庭；此處顯示初始名單。`}</p>` : ''}
      <div><button class="text-button" data-identity-action="preview">查看全部夥伴</button><br><button class="text-button" data-identity-action="probability">機率與卡池規則</button></div>
    </div></div>
    <div class="section-heading"><h2>也在這裡等你</h2><span class="subtle">焦點展示</span></div>
    <div class="support-grid">${support.slice(0, 3).map((pet) => `<button class="mini-card" data-pet="${pet.id}" aria-label="${escapeHtml(identityLabel(pet, owned(pet)))}">${imageHtml(pet)}<span class="pet-name">${escapeHtml(pet.name)}</span>${cues(pet)}</button>`).join('')}</div>
    <p class="subtle">演出為指定角色的設計預覽；不會抽取、扣款或改變你的存檔。</p>
    ${companionPreview()}
    ${recent ? `<section class="recent"><p class="eyebrow">最近的相遇 · 展示紀錄</p><button data-pet="${recent.pet.id}">${imageHtml(recent.pet)}<span><span class="pet-name">${escapeHtml(recent.pet.name)}</span><span class="pet-title">${recent.isNew ? '新夥伴已加入手帳' : `再次相遇 · ${recent.pet.rarity} 碎片 +${recent.fragmentsGained}`}</span></span></button></section>` : ''}`;
}

function renderCollection() {
  screen = document.querySelector('#view-collection .identity-surface') || screen;
  const list = collectionCandidates();
  const count = list.filter(owned).length;
  screen.innerHTML = `<div class="page-intro"><div><p class="eyebrow">OUR ADVENTURE JOURNAL</p><h1>相遇，寫成旅程。</h1><p class="page-description">熟悉的夥伴，和還未寫下的故事。</p></div></div>${poolSelector()}
    <section class="collection-progress"><p><strong>${count} / ${list.length}</strong> <span class="subtle">位夥伴已相遇</span></p><p class="subtle">每次相遇，都留下一頁自己的記錄。</p><progress max="${list.length}" value="${count}" aria-label="${escapeHtml(collectionScopeName())}，${count} 位已相遇，共 ${list.length} 位"></progress></section>
    <div class="filters" aria-label="收藏狀態">${[['all','全部夥伴'],['owned','已相遇'],['unowned','尚未相遇']].map(([key,label]) => `<button data-filter="${key}" aria-pressed="${filter === key}">${label}</button>`).join('')}</div>
    <div class="filters" aria-label="卡片密度"><button data-density="compact" aria-pressed="${density === 'compact'}">精簡卡片</button><button data-density="expanded" aria-pressed="${density === 'expanded'}">展開卡片</button></div>
    <label class="search-label">尋找名字或稱號<input id="identity-collection-search" type="search" value="${escapeHtml(query)}" placeholder="輸入你記得的名字…"></label>
    <div id="identity-collection-results"></div>`;
  renderCollectionCards();
}

function renderCollectionCards() {
  const list = collectionCandidates().filter((pet) => (filter === 'all' || (filter === 'owned' ? owned(pet) : !owned(pet))) && `${pet.name} ${pet.title || ''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  document.getElementById('identity-collection-results').innerHTML = list.length ? `<p class="subtle" role="status" style="margin-top:16px">${list.length} 位夥伴 · 未相遇角色保留灰階預覽與名字</p><div class="collection-grid ${density === 'expanded' ? 'expanded' : ''}">${list.map((pet) => miniCard(pet, { grayscale: true, title: density === 'expanded' })).join('')}</div>` : `<section class="empty-state"><h2 role="status">這一頁還是空白。</h2><p class="subtle">試試其他名字或篩選，讓故事慢慢展開。</p><button data-identity-action="clear-filter">顯示全部夥伴</button></section>`;
}

function render() {
  screen = document.querySelector(`#view-${view === 'pool' ? 'gacha' : 'collection'} .identity-surface`);
  if (!screen) return;
  view === 'pool' ? renderPool() : renderCollection();

  updateDemoSelect();
}

function updateDemoSelect() {
  const select = document.getElementById('identity-demo-pet');
  const selected = select.value;
  select.innerHTML = [...candidates()].sort((a,b) => RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity)).map((pet) => `<option value="${pet.id}">${pet.name} · ${pet.rarity}</option>`).join('');
  if (candidates().some((pet) => pet.id === selected)) select.value = selected;
}

function showDialog(heading, html) {
  if (!dialog.open) dialogOpener = document.activeElement;
  document.getElementById('identity-dialog-content').innerHTML = `<div class="dialog-header"><h2 id="identity-dialog-heading">${escapeHtml(heading)}</h2><button data-identity-action="close-dialog">關閉</button></div><div class="dialog-body">${html}</div>`;
  if (!dialog.open) dialog.showModal();
  dialog.querySelector('[data-identity-action="close-dialog"]').focus();
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

function petDetail(pet, returnToBatch = false) {
  detailReturnsToBatch = returnToBatch;
  const entry = collection.get(pet.id);
  const isOwned = !!entry;
  const species = { griffin:'格里芬', biomechanical_chimera:'生體機械奇美拉' }[pet.speciesType] || '';
  showDialog(isOwned ? '夥伴手記' : '初識夥伴', `${imageHtml(pet,'stage',false,'detail-art')}
    <div class="detail-identity"><h3 class="pet-name">${escapeHtml(pet.name)}</h3><p class="pet-title">${escapeHtml(pet.title)}</p>${cues(pet)}<p class="subtle" style="margin-top:10px">${escapeHtml([pet.element ? `${pet.element}屬性` : '',species].filter(Boolean).join(' · '))}</p></div>
    ${isOwned ? `<div class="companion-actions">${entry.nickname ? `<p class="subtle">你的稱呼：${escapeHtml(entry.nickname)} · 日常陪伴使用暱稱</p>` : ''}<button class="${entry.isCompanion ? '' : 'primary'}" data-identity-action="set-companion" data-pet-id="${pet.id}" ${entry.isCompanion ? 'disabled' : ''}>${entry.isCompanion ? '正在與你同行' : '設為陪伴'}</button><p class="subtle">切換後，首頁會顯示這位同行者；重新整理可重設。</p></div>` : ''}
    ${AWAKENING_PET_IDS.includes(pet.id) ? '<p class="subtle">目前預覽：初始形態 · 覺醒後仍是同一位夥伴</p>' : ''}
    <p class="detail-copy">${escapeHtml(isOwned ? pet.lore : publicIntro(pet))}</p>
    ${isOwned ? `<dl class="detail-stats"><div><dt>升星</dt><dd>${entry.stars} 星</dd></div><div><dt>親密度</dt><dd>Lv.${entry.bondLevel}</dd></div><div><dt>此夥伴碎片</dt><dd>${entry.fragments}</dd></div></dl>` : ''}
    ${isOwned && pet.personality?.length ? `<section class="detail-section"><h3>認識牠的個性</h3><p>${escapeHtml(pet.personality.join(' · '))}</p>${normalGreeting(pet) ? `<blockquote>${escapeHtml(normalGreeting(pet))}</blockquote>` : ''}</section>` : ''}
    <section class="detail-section"><h3>相處，才會揭開的故事</h3>${isOwned ? [2,3,4,5].map((level) => `<p>親密度 Lv.${level} · ${entry.bondLevel >= level ? escapeHtml(pet.bondUnlocks?.[level] || '已解鎖') : '故事尚未解鎖'}</p>`).join('') : '<p>相遇後可閱讀完整背景；專屬對話與羈絆章節隨親密度逐步揭開。</p>'}</section>
    ${isOwned ? `<section class="detail-section"><h3>一起走下去</h3><button data-identity-action="app-pet-detail" data-pet-id="${pet.id}">養成與餵食</button><button data-identity-action="app-nickname" data-pet-id="${pet.id}">修改暱稱</button><p>在完整 App 的養成頁，可以修改暱稱、餵食、升星與閱讀已解鎖故事。</p></section>` : `<section class="detail-section"><p>你可以先記住牠的名字，讓下一次相遇更熟悉。</p></section>`}<button class="text-button" data-identity-action="${returnToBatch ? 'return-batch' : view === 'collection' ? 'close-dialog' : 'preview'}">${returnToBatch ? '返回本次相遇' : view === 'collection' ? '返回圖鑑' : '返回本池夥伴'}</button>`);
}

function poolPreview() {
  showDialog('這裡可以遇見誰', `<p class="subtle">${escapeHtml(pool().name)} · ${candidates().length} 位夥伴</p><p class="subtle">焦點只是介紹，不代表機率加成。</p><button class="text-button" data-identity-action="probability">查看機率與規則</button><div class="preview-grid">${candidates().map((pet) => miniCard(pet, {showFeatured:true})).join('')}</div>`);
}

function probability() {
  const selected = pool();
  const list = candidates();
  showDialog('機率與卡池規則', `<p class="subtle">${escapeHtml(selected.name)} · 既有規則</p><table class="rate-table"><caption>一般召喚基礎機率（保底未觸發時）</caption><thead><tr><th scope="col">稀有度</th><th scope="col">機率</th><th scope="col">角色數</th></tr></thead><tbody>${RARITIES.map((rarity) => `<tr><th scope="row">${rarity}</th><td>${(selected.rates[rarity] * 100).toFixed(0)}%</td><td>${list.filter((pet) => pet.rarity === rarity).length}</td></tr>`).join('')}</tbody></table>
    <p class="probability-note">先選稀有度，再於同稀有度候選中等機率選取。焦點夥伴沒有另加權；不是 Rate-Up。</p>
    <p class="probability-note">SSR 或 UR 保底上限 ${selected.pity.ssr} 抽：若前 ${selected.pity.ssr - 1} 抽都未得到 SSR 或 UR，第 ${selected.pity.ssr} 抽必為 SSR 或 UR（依兩者基礎比例分配）。UR 保底上限 ${selected.pity.ur} 抽：若前 ${selected.pity.ur - 1} 抽都未得到 UR，第 ${selected.pity.ur} 抽必為 UR。各池獨立計數。得到 UR 時兩種計數歸零；SSR 只重設 SSR 計數。</p>
    <p class="probability-note">單次 ${selected.cost} 星塵；十次 ${selected.cost * 10} 星塵。此測試版使用固定展示結果，不消耗星塵。</p>
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
  reveal.setAttribute('aria-label', name === 'name' ? `${activeResult.pet.name}，${activeResult.pet.rarity}` : name === 'title' ? [activeResult.pet.name, activeResult.pet.title, activeResult.pet.rarity].filter(Boolean).join('，') : name === 'result' ? identityLabel(activeResult.pet, true) : '夥伴相遇演出');
  shell.querySelector('.pet-name').setAttribute('aria-hidden', !['name','title','result'].includes(name));
  shell.querySelector('.pet-title').setAttribute('aria-hidden', !['title','result'].includes(name));
  shell.querySelector('.reveal-actions').setAttribute('aria-hidden', name !== 'result');
  shell.querySelector('.obtained').setAttribute('aria-hidden', name !== 'result');
  const greeting = shell.querySelector('.reveal-greeting');
  if (greeting) greeting.hidden = name !== 'result';
  shell.querySelector('.reveal-stage-label').textContent = {begin:'循著星光，等待相遇',cue:`${activeResult.pet.rarity} · 相遇的微光`,silhouette:'一位夥伴正在靠近',art:'牠已經來到你面前',name:'記住這位同行者',title:'名字背後，是牠的故事',result:activeResult.isNew?'新的旅程，從這裡開始':'熟悉的夥伴，再次相遇'}[name];
  if (name === 'name' && !reduced() && document.getElementById('identity-haptics').checked && navigator.vibrate) {
    navigator.vibrate({N:8,R:12,SR:16,SSR:18,UR:[20,30,12]}[activeResult.pet.rarity]);
  }
  if (name === 'result') {
    clearTimers();
    shell.querySelector('[data-identity-action="skip-reveal"]').textContent = activeBatch ? '略過全部' : '關閉';
    document.getElementById('identity-announcement').textContent = `${activeResult.pet.name}，${activeResult.pet.title || ''}，${activeResult.pet.rarity}。${activeResult.isNew ? '新夥伴已加入展示圖鑑。' : `再次相遇，${activeResult.pet.name}碎片增加${activeResult.fragmentsGained}。`}`;
    shell.querySelector('.reveal-actions').removeAttribute('aria-hidden');
    shell.querySelector('.obtained').removeAttribute('aria-hidden');
  }
}

function rememberRevealOpener() {
  revealOpener = document.activeElement;
  revealFocusAction = revealOpener?.dataset?.identityAction || '';
  if (dialog.open) dialog.close();
}

function presentResult(result, stepByStep = false) {
  clearTimers();
  activeResult = result;
  const pet = result.pet;
  manual = stepByStep;
  trace = [];
  document.getElementById('identity-reveal-content').innerHTML = `<section class="reveal-shell rank-${pet.rarity}" data-phase="begin" data-start="${performance.now()}">
    <div class="reveal-top"><p class="eyebrow reveal-stage-label">循著星光，等待相遇</p><button data-identity-action="skip-reveal">${activeBatch ? '略過全部' : '略過演出'}</button></div>
    ${activeBatch ? `<p class="queue-progress">本次相遇 · 角色揭露 ${activeBatch.index + 1} / ${activeBatch.queue.length}</p>` : ''}
    ${imageHtml(pet,'stage',false,'reveal-image')}<div class="reveal-identity"><h2 id="identity-reveal-name" class="pet-name" aria-hidden="true">${escapeHtml(pet.name)}</h2><p class="pet-title" aria-hidden="true">${escapeHtml(pet.title)}</p>${cues(pet,false)}</div>
    ${result.isNew && normalGreeting(pet) ? `<blockquote class="reveal-greeting" hidden>「${escapeHtml(normalGreeting(pet))}」</blockquote>` : ''}
    <div class="obtained" aria-hidden="true">${result.isNew ? '初次相遇，已加入圖鑑。<p>從相遇開始，讓故事慢慢變熟悉。</p>' : `再次相遇 · ${escapeHtml(pet.name)}碎片 +${result.fragmentsGained}<p>${duplicateNote(result)}</p>`}</div>
    <div class="reveal-actions" aria-hidden="true">${activeBatch ? `<button class="primary" data-identity-action="next-result">${activeBatch.index + 1 === activeBatch.queue.length ? '查看本次相遇' : '下一位夥伴'}</button><button data-identity-action="batch-summary">查看全部結果</button>` : '<button class="primary" data-identity-action="reveal-detail">認識這位夥伴</button><button data-identity-action="reveal-collection">查看圖鑑</button>'}</div>
    ${manual ? `<div class="filters" aria-label="逐步檢視演出">${['begin','cue','silhouette','art','name','title','result'].map((key,index) => `<button data-phase-step="${key}">${index+1} ${['開始','稀有線索','輪廓','插畫','名字','稱號','結果'][index]}</button>`).join('')}</div>` : ''}
  </section>`;
  if (!reveal.open) reveal.showModal();
  reveal.scrollTop = 0;
  reveal.querySelector('[data-identity-action="skip-reveal"]').focus();
  phase(reduced() ? 'result' : 'begin');
  if (!reduced() && !manual) {
    [['cue',300],['silhouette',550],['art',850],['name',1200],['title',1450],['result',1800]].forEach(([key,delay]) => timers.push(setTimeout(() => phase(key),delay)));
  }
}

async function startReveal(pet, stepByStep = false) {
  if (reveal.open || displayBusy) return;
  displayBusy = true;
  rememberRevealOpener();
  activeBatch = null;
  const batch = prepareDisplayBatch(collection, [pet]);
  collection = batch.collection;
  recent = batch.results[0];
  try { await commitCollection(); presentResult(recent, stepByStep); } finally { displayBusy = false; }
}

async function startScenario(kind, stepByStep = false) {
  if (reveal.open || displayBusy) return;
  const pet = byId(document.getElementById('identity-demo-pet').value);
  collection = new Map(collection);
  if (kind === 'new') collection.delete(pet.id);
  else collection.set(pet.id, { stars: 1, bondLevel: 1, fragments: 0, ...collection.get(pet.id), ...(kind === 'max-star' ? { stars: MAX_DISPLAY_STARS } : {}) });
  await startReveal(pet, stepByStep);
}

async function startTen() {
  if (reveal.open || displayBusy) return;
  displayBusy = true;
  rememberRevealOpener();
  const batch = prepareDisplayBatch(collection, tenPreviewPets(candidates()));
  collection = batch.collection;
  recent = batch.results.at(-1);
  try {
    await commitCollection();
    activeBatch = { results: batch.results, queue: batch.results.filter((result) => ['SSR', 'UR'].includes(result.pet.rarity)), index: 0, summary: false };
    if (reduced() || !activeBatch.queue.length) showBatchSummary();
    else presentResult(activeBatch.queue[0]);
  } finally { displayBusy = false; }
}

function showBatchSummary() {
  if (!activeBatch) return;
  clearTimers();
  activeBatch.summary = true;
  const count = activeBatch.results.filter((result) => result.isNew).length;
  document.getElementById('identity-reveal-content').innerHTML = `<section class="batch-summary"><div class="dialog-header"><h2 id="identity-batch-heading">本次相遇</h2><button data-identity-action="close-reveal">關閉</button></div><div class="dialog-body"><p class="batch-lead">${count} 位初次相遇 · 10 次旅程記錄</p><p class="subtle">固定候選展示 · 點擊任一夥伴，認識牠的故事。</p><div class="batch-grid">${activeBatch.results.map((result, index) => `<article class="batch-card ${result.isNew ? 'first-encounter' : ''}"><button data-result-pet="${result.pet.id}" aria-label="第 ${index + 1} 位，${escapeHtml(identityLabel(result.pet, true))}，${result.isNew ? '初次相遇' : `再次相遇，碎片增加 ${result.fragmentsGained}`}，${!result.isNew && result.starsAtEncounter >= MAX_DISPLAY_STARS ? '已達最高星級' : ''}"><span class="encounter-index">${String(index + 1).padStart(2, '0')}</span>${imageHtml(result.pet)}<span class="pet-name">${escapeHtml(result.pet.name)}</span><span class="identity-cue"><span class="rarity">${result.pet.rarity}</span></span><span class="encounter-state">${result.isNew ? '初次相遇' : '再次相遇'}</span>${result.isNew ? '' : `<span class="fragment-gain">${escapeHtml(result.pet.name)}碎片 +${result.fragmentsGained}</span>${result.starsAtEncounter >= MAX_DISPLAY_STARS ? '<span class="subtle">已滿星 · 碎片繼續累積</span>' : ''}`}</button></article>`).join('')}</div><div class="batch-actions"><button class="primary" data-identity-action="reveal-collection">查看圖鑑</button><button data-identity-action="close-reveal">返回卡池</button></div></div></section>`;
  reveal.removeAttribute('aria-label');
  reveal.setAttribute('aria-labelledby', 'identity-batch-heading');
  if (!reveal.open) reveal.showModal();
  reveal.scrollTop = 0;
  reveal.querySelector('[data-identity-action="close-reveal"]').focus();
  document.getElementById('identity-announcement').textContent = `十連展示完成，共 10 位結果，${count} 位初次相遇。所有結果已加入展示圖鑑。`;
}

function finishPresentation() {
  if (activeBatch) showBatchSummary();
  else phase('result');
}

function closeReveal() { clearTimers(); reveal.close(); activeBatch = null; render(); }

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

document.addEventListener('click', async (event) => {
  if (!event.target.closest('.identity-surface, .identity-dialog, .identity-review')) return;
  const button = event.target.closest('button');
  if (!button) return;

  if (button.dataset.pet) { petDetail(byId(button.dataset.pet)); return; }
  if (button.dataset.resultPet) { petDetail(byId(button.dataset.resultPet), true); return; }
  if (button.dataset.filter) { filter = button.dataset.filter; renderCollection(); return; }
  if (button.dataset.density) { density = button.dataset.density; renderCollection(); return; }
  if (button.dataset.phaseStep) { phase(button.dataset.phaseStep); return; }
  const action = button.dataset.identityAction;
  if (action === 'app-pet-detail' || action === 'app-nickname') { dialog.close(); if (reveal.open) closeReveal(); action === 'app-pet-detail' ? appActions.openPetDetail(button.dataset.petId) : appActions.openNickname(button.dataset.petId); return; }
  if (action === 'preview') poolPreview();
  if (action === 'probability') probability();
  if (action === 'close-dialog') dialog.close();
  if (action === 'summon') startReveal(byId(button.dataset.petId));
  if (action === 'summon-ten') startTen();
  if (action === 'skip-reveal') activeBatch ? showBatchSummary() : document.querySelector('.reveal-shell').dataset.phase === 'result' ? closeReveal() : phase('result');
  if (action === 'batch-summary') showBatchSummary();
  if (action === 'next-result' && activeBatch) {
    activeBatch.index += 1;
    activeBatch.index < activeBatch.queue.length ? presentResult(activeBatch.queue[activeBatch.index]) : showBatchSummary();
  }
  if (action === 'close-reveal') closeReveal();
  if (action === 'return-batch') dialog.close();
  if (action === 'set-companion') {
    collection = setDisplayCompanion(collection, button.dataset.petId);
    await commitCollection();
    render();
    petDetail(byId(button.dataset.petId), detailReturnsToBatch);
    document.getElementById('identity-announcement').textContent = `${byId(button.dataset.petId).name}已設為展示陪伴夥伴。`;
  }
  if (action === 'reveal-detail') { const pet = activeResult.pet; closeReveal(); petDetail(pet); }
  if (action === 'reveal-collection') { filter = 'all'; query = ''; closeReveal(); appActions.switchView('collection'); screen.focus(); }
  if (action === 'clear-filter') { filter = 'all'; query = ''; renderCollection(); }
});

document.addEventListener('change', (event) => {
  if (event.target.id.startsWith('identity-pool-select-')) { if (view === 'collection') collectionScope = event.target.value; else poolId = event.target.value; query = ''; render(); }
});
document.addEventListener('input', (event) => {
  if (event.target.id === 'identity-collection-search') { query = event.target.value; renderCollectionCards(); }
});
document.getElementById('identity-theme').addEventListener('change', async (event) => { await setTheme(event.target.value); applyThemeToDocument(event.target.value); await refreshApp?.({ renderMode: 'full' }); });
document.getElementById('identity-type-scale').addEventListener('change', async (event) => { const value = event.target.value === '1' ? 'standard' : event.target.value === '1.25' ? 'large' : 'extra-large'; await setFontSize(value); applyFontSizeToDocument(value); document.documentElement.style.fontSize = event.target.value === '2' ? '32px' : ''; await refreshApp?.({ renderMode: 'full' }); });
document.getElementById('identity-reduce-motion').addEventListener('change', (event) => {
  document.body.dataset.reduceMotion = String(event.target.checked);
  if (reveal.open && reduced()) finishPresentation();
});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => { if (reveal.open && reduced()) finishPresentation(); });
document.getElementById('identity-expansion').addEventListener('change',render);
document.getElementById('identity-review-toggle').addEventListener('click', (event) => {
  const panel = document.getElementById('identity-review-panel'); panel.hidden = !panel.hidden; event.currentTarget.setAttribute('aria-expanded', String(!panel.hidden));
});
document.getElementById('identity-demo-new').addEventListener('click', () => startScenario('new'));
document.getElementById('identity-demo-duplicate').addEventListener('click', () => startScenario('duplicate'));
document.getElementById('identity-demo-max-star').addEventListener('click', () => startScenario('max-star'));
document.getElementById('identity-demo-ten').addEventListener('click', startTen);
document.getElementById('identity-stress').addEventListener('click',stress);
document.getElementById('identity-reset-demo').addEventListener('click', () => location.reload());
const stepButton = document.createElement('button');
stepButton.id = 'identity-demo-steps'; stepButton.disabled = true; stepButton.textContent = '逐步檢視 Reveal';
document.querySelector('.review-actions').append(stepButton);
stepButton.addEventListener('click', () => startScenario('new', true));
dialog.addEventListener('close', () => {
  if (reveal.open && !activeBatch?.summary) return;
  if (dialogOpener?.isConnected) dialogOpener.focus();
  else if (reveal.open) reveal.querySelector('button').focus();
  else screen.focus();
});
dialog.addEventListener('keydown', keepDialogFocus);
reveal.addEventListener('keydown', keepDialogFocus);
reveal.addEventListener('cancel', (event) => {
  event.preventDefault();
  if (activeBatch) activeBatch.summary ? closeReveal() : showBatchSummary();
  else document.querySelector('.reveal-shell').dataset.phase === 'result' ? closeReveal() : phase('result');
});
reveal.addEventListener('close', () => {
  clearTimers();
  if (dialog.open) return;
  const target = revealOpener?.isConnected ? revealOpener : revealFocusAction ? screen.querySelector(`[data-identity-action="${revealFocusAction}"]`) : null;
  (target || screen).focus();
});
document.getElementById('identity-haptic-support').textContent = typeof navigator.vibrate === 'function' ? '此瀏覽器提供震動 API；實際觸覺仍須裝置檢查。' : '此瀏覽器不提供震動 API；演出保留完整視覺與文字回饋。';


async function commitCollection() {
  const rawEntries = new Map((await dbGetAll(STORES.COLLECTION)).map((entry) => [entry.petId, entry]));
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.COLLECTION, 'readwrite');
    tx.oncomplete = resolve;
    tx.onabort = () => reject(tx.error);
    const store = tx.objectStore(STORES.COLLECTION);
    store.clear();
    for (const [petId, entry] of collection) store.put({ ...createCollectionEntry(petId), ...rawEntries.get(petId), ...Object.fromEntries(Object.entries(entry).filter(([, value]) => value !== undefined)), petId });
  });
  await refreshApp?.({ renderMode: 'full' });
}

installLocalIdentityRenderer((name, state, refresh, actions) => {
  refreshApp = refresh;
  appActions = actions;
  pets = state.allPets.map((pet) => initialAwakeningPortrait(pet, state.awakeningCatalog));
  pools = state.poolsData.pools.filter((row) => row.active).map(normalizePoolDefinition);
  collection = new Map(state.enrichedCollection.filter((pet) => pet.owned).map((pet) => [pet.id, {
    petId: pet.id, stars: pet.stars, fragments: pet.fragments, bondExp: pet.bondExp, bondLevel: pet.bondLevel,
    isCompanion: pet.isCompanion, nickname: pet.nickname, obtainedAt: pet.obtainedAt, lastPettedAt: pet.lastPettedAt,
  }]));
  const host = document.getElementById('view-' + name);
  let target = host.querySelector('.identity-surface');
  if (!target) {
    [...host.children].forEach((child) => { child.hidden = true; });
    target = document.createElement('section');
    target.className = 'identity-surface';
    target.tabIndex = -1;
    host.append(target);
  }
  screen = target;
  const nextView = name === 'gacha' ? 'pool' : 'collection';
  const current = view;
  view = nextView;
  nextView === 'pool' ? renderPool() : renderCollection();
  updateDemoSelect();
  document.getElementById('identity-theme').value = state.userPreferences.theme;
  for (const id of ['demo-new', 'demo-duplicate', 'demo-max-star', 'demo-ten', 'stress', 'demo-steps']) document.getElementById('identity-' + id).disabled = false;
  view = document.getElementById('view-' + name).classList.contains('active') ? nextView : current;
  screen = document.querySelector('#view-' + (view === 'pool' ? 'gacha' : 'collection') + ' .identity-surface') || target;
});
