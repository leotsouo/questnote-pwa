/** Synthetic only; intentionally no static imports that could open an app database before guard. */
const frame = document.getElementById('preview');
const output = document.getElementById('results');
const sessionKey = 'questnote-ui-polish-test-session';
const urgentTitle = 'UI 測試：先完成今天最重要的一件事';
let session;
let ui;
let preferences;
let taskSemanticsBaseline;
const log = (line) => { output.textContent += `${line}\n`; };
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const doc = () => frame.contentDocument;
const win = () => frame.contentWindow;
const css = (element) => win().getComputedStyle(element);
const visible = (element) => !!element && element.getClientRects().length > 0
  && css(element).visibility !== 'hidden' && css(element).display !== 'none';
const rect = (element) => element.getBoundingClientRect();

async function guard() {
  if (!['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) throw new Error('Only localhost is permitted.');
  const response = await fetch('/__ui-polish_test_guard__', { cache: 'no-store' });
  if (!response.ok) throw new Error('Dedicated test server marker is missing.');
  const marker = await response.json();
  if (marker.purpose !== 'questnote-ui-polish-synthetic-only' || !marker.instance) throw new Error('Invalid server marker.');
  if (navigator.serviceWorker?.controller) throw new Error('Origin is controlled by a service worker. Use a new ephemeral port.');
  if ((await navigator.serviceWorker?.getRegistrations())?.length) throw new Error('Service worker registration exists. Use a new origin.');
  if (typeof indexedDB.databases !== 'function') throw new Error('Browser cannot enumerate existing databases safely.');
  const existing = await indexedDB.databases();
  let saved;
  try { saved = JSON.parse(sessionStorage.getItem(sessionKey)); } catch { saved = null; }
  if (saved?.instance !== marker.instance && existing.length) throw new Error('Existing IndexedDB data found. Refusing fixture writes; start a fresh port.');
  session = saved?.instance === marker.instance ? saved : { instance: marker.instance, seeded: false, empty: {} };
  sessionStorage.setItem(sessionKey, JSON.stringify(session));
}

async function loadApp() {
  await guard();
  frame.src = `/index.html?ui-polish-test=${encodeURIComponent(session.instance)}&t=${Date.now()}`;
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('App iframe load timed out.')), 15000);
    frame.onload = () => { clearTimeout(timer); resolve(); };
  });
  for (let attempt = 0; attempt < 160; attempt += 1) {
    if (doc().querySelector('#task-view-content')?.children.length && !visible(doc().querySelector('#app-loader'))) break;
    if (attempt === 159) throw new Error('App did not become ready; inspect its visible error and console.');
    await wait(100);
  }
  if (win().navigator.serviceWorker?.controller) throw new Error('Iframe unexpectedly controlled by SW.');
  // Import into the iframe realm so UI functions use its document and existing module state.
  ui = await win().eval('import("/src/ui.js")');
  await settle();
}

async function settle() {
  await new Promise((resolve) => win().requestAnimationFrame(() => win().requestAnimationFrame(resolve)));
  await wait(180);
}

async function settleDialog(element) {
  await settle();
  if (!element) throw new Error('Dialog missing before transition wait.');
  // Geometry and focus must be measured after entrance transitions, including the
  // mobile sheet transform. Do not wait for decorative infinite pet animations.
  const surfaces = '.modal, .modal-overlay, .pet-image-viewer, .pet-image-viewer__content, '
    + '.global-mailbox-modal, .global-mailbox-modal__sheet, .expedition-dispatch-modal, .expedition-dispatch-modal__content';
  const animations = element.getAnimations({ subtree: true }).filter((animation) => {
    const effect = animation.effect;
    return effect?.target?.matches(surfaces) && Number.isFinite(effect.getComputedTiming().endTime)
      && animation.playState !== 'finished';
  });
  await Promise.allSettled(animations.map((animation) => animation.finished));
  await new Promise((resolve) => win().requestAnimationFrame(() => win().requestAnimationFrame(resolve)));
}

async function navigate(view) {
  ui.switchView(view);
  await settle();
  win().scrollTo(0, 0);
  const active = doc().querySelector('.view.active');
  if (active) active.scrollTop = 0;
  await settle();
}

async function theme(value) {
  await preferences.setTheme(value);
  await ui.applyTheme(value, { silent: true });
  document.getElementById('theme').value = value;
  await settle();
}

async function initialize() {
  output.textContent = '';
  await guard();
  log(`PASS · 專用 synthetic origin ${location.origin}，沒有未知資料或 SW。`);
  preferences = await import('../src/preferencesService.js');
  await loadApp();
  if (!session.seeded) {
    // Measure the real first-run empty state before the fixture has any pets.
    for (const value of ['default', 'sweet']) {
      await theme(value);
      await navigate('collection');
      const grid = doc().querySelector('#collection-grid');
      const empty = grid.querySelector('.empty-state');
      session.empty[value] = { width: empty ? rect(empty).width : 0, gridWidth: rect(grid).width };
    }
    const { createTask, getAllTasks } = await import('../src/taskService.js');
    const tasks = await getAllTasks();
    if (!tasks.some((task) => task.title === urgentTitle)) await createTask({ content: urgentTitle, priority: 'urgent', planToday: true });
    if (!tasks.some((task) => task.title === 'UI 測試：整理冒險手帳')) await createTask({
      content: 'UI 測試：整理冒險手帳\n把下一步寫清楚，保留必要細節而不重複標題。\n確認明日需要攜帶的物品。',
      priority: 'important', planToday: true,
      subtasks: [{ text: '收集資料' }, { text: '整理筆記' }],
    });
    const { unlockDevTestPets } = await import('../src/devService.js');
    const { setCompanion } = await import('../src/collectionService.js');
    await unlockDevTestPets();
    await setCompanion('pet_ur01');
    await preferences.setTheme('default');
    session.seeded = true;
    sessionStorage.setItem(sessionKey, JSON.stringify(session));
    await loadApp();
  }
  await theme('default');
  await navigate('tasks');
  document.querySelectorAll('button, select').forEach((element) => { element.disabled = false; });
  log('READY · 今日緊急單行任務、多行及子任務、8 隻測試寵物與 UR 陪伴。可選 VP 分組驗收。');
}

function check(name, passed, details = '') {
  log(`${passed ? 'PASS' : 'FAIL'} · ${name}${details ? ` · ${details}` : ''}`);
  return passed;
}

function colorValues(value) { return value.match(/[\d.]+/g)?.slice(0, 3).map(Number) || [0, 0, 0]; }
function luminance(value) {
  const channels = colorValues(value).map((part) => part / 255).map((part) => part <= .04045 ? part / 12.92 : ((part + .055) / 1.055) ** 2.4);
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}
function contrast(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
}

async function vp01(value) {
  await navigate('tasks');
  const card = [...doc().querySelectorAll('.task-card')].find((element) => element.textContent.includes(urgentTitle));
  check('單行任務不重複標題', !!card && !card.querySelector('.task-card__preview'));
  const border = card ? parseFloat(css(card).borderLeftWidth) : 0;
  const borderColor = card ? css(card).borderLeftColor : '';
  check('緊急任務 3px priority border（縮放容差 >= 2.5）', border >= 2.5 && !['transparent', 'rgba(0, 0, 0, 0)'].includes(borderColor), `${border}px; ${borderColor}`);
  const empty = session.empty[value];
  check('首次圖鑑空狀態全欄', !!empty && empty.width >= empty.gridWidth - 2 && empty.width > 300, JSON.stringify(empty));
  await navigate('settings');
  check('未 restore 不顯示成功狀態', !visible(doc().querySelector('#import-success-panel')));
  await navigate('collection');
  const ur = doc().querySelector('.collection-card.rarity-UR:not(.collection-card--locked)');
  if (value === 'sweet') {
    const name = ur?.querySelector('.collection-card__name');
    const background = ur ? css(ur).backgroundColor : 'rgb(0,0,0)';
    const foreground = name ? css(name).color : 'rgb(0,0,0)';
    const ratio = contrast(foreground, background);
    check('Sweet UR 淺色 surface', !!ur && luminance(background) > .5, background);
    check('Sweet UR 名稱對比 >= 4.5（solid base）', !!name && ratio >= 4.5, `${ratio.toFixed(2)}:1; 漸層另需視覺確認`);
  }
}

async function checkTaskViewport(label = '') {
  await navigate('tasks');
  const card = doc().querySelector('.task-card:not(.task-card--done)');
  const title = card?.querySelector('.task-card__title');
  const complete = card?.querySelector('.task-card__complete-btn');
  const nav = doc().querySelector('.bottom-nav');
  const limit = Math.min(844, rect(nav).top);
  check(`${label}首個今日任務標題在 nav 上方`, visible(title) && rect(title).top >= 0 && rect(title).bottom <= limit, title ? `bottom=${rect(title).bottom.toFixed(1)}; limit=${limit.toFixed(1)}` : 'missing');
  check(`${label}首個完成操作在 nav 上方`, visible(complete) && rect(complete).top >= 0 && rect(complete).bottom <= limit, complete ? `bottom=${rect(complete).bottom.toFixed(1)}` : 'missing');
  check(`${label}390 viewport 無橫溢`, doc().documentElement.scrollWidth <= 390, `scrollWidth=${doc().documentElement.scrollWidth}`);
}

async function until(predicate, description) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await predicate()) { await settle(); return; }
    await wait(100);
  }
  throw new Error(`Timed out: ${description}`);
}

const taskCard = (id) => doc().querySelector(`.task-card[data-id="${CSS.escape(id)}"]`);
const petCard = (id) => doc().querySelector(`.collection-card[data-pet-id="${CSS.escape(id)}"]`);
const pressEscape = () => doc().activeElement.dispatchEvent(new (win().KeyboardEvent)('keydown', {
  key: 'Escape', bubbles: true, cancelable: true,
}));
async function taskTab(view) {
  const button = doc().querySelector(`#task-view-tabs [data-task-view="${view}"]`);
  button.click();
  await settle();
  return button;
}

async function vp02(value) {
  await navigate('tasks');
  await taskTab('today');
  await checkTaskViewport('有陪伴：');
  const taskService = await import('../src/taskService.js');
  const collection = await import('../src/collectionService.js');
  const rewards = await import('../src/rewardService.js');
  const tasks = await taskService.getAllTasks();
  const urgent = tasks.find((task) => task.title === urgentTitle);
  const multiline = tasks.find((task) => task.title === 'UI 測試：整理冒險手帳');
  if (!urgent || !multiline) throw new Error('Original task fixtures missing; no replacement fixtures will be created by checks.');

  taskCard(multiline.id).querySelector('[data-action="edit"]').click();
  await settle();
  check('編輯按鈕開啟原內容', doc().querySelector('#modal-overlay').classList.contains('open')
    && doc().querySelector('#task-content')?.value === multiline.content);
  doc().querySelector('#form-cancel').click();
  await settle();
  check('取消編輯不變更任務內容', !doc().querySelector('#modal-overlay').classList.contains('open')
    && (await taskService.getTaskById(multiline.id)).content === multiline.content);

  const initiallyExpanded = !!taskCard(multiline.id).querySelector('.subtask-list');
  taskCard(multiline.id).querySelector('[data-action="toggle-expand"]').click();
  await settle();
  check('子任務切換展開狀態', !!taskCard(multiline.id).querySelector('.subtask-list') !== initiallyExpanded);
  taskCard(multiline.id).querySelector('[data-action="toggle-expand"]').click();
  await settle();
  check('子任務再次切換回原狀態', !!taskCard(multiline.id).querySelector('.subtask-list') === initiallyExpanded);

  for (const view of ['all', 'smart', 'today']) {
    const tab = await taskTab(view);
    const contentMatches = view === 'smart'
      ? !!doc().querySelector('#task-view-content .smart-list-card')
      : !!taskCard(urgent.id);
    check(`任務 ${view} tab 切換`, tab.getAttribute('aria-selected') === 'true'
      && doc().querySelectorAll('#task-view-tabs [aria-selected="true"]').length === 1 && contentMatches);
  }

  const originalCompanion = await collection.getCompanionPet();
  if (!originalCompanion) throw new Error('Expected original fixture companion; no-companion check cannot restore an unknown original.');
  try {
    // There is no clearCompanion API. Use the existing import service on this one synthetic entry.
    await collection.importCollection([{ ...originalCompanion, isCompanion: false }]);
    await loadApp();
    await taskTab('today');
    check('無陪伴 fixture 實際生效', (await collection.getCompanionPet()) === null);
    await checkTaskViewport('無陪伴：');
  } finally {
    await collection.setCompanion(originalCompanion.petId);
    await loadApp();
    await taskTab('today');
  }
  check('原陪伴已透過 service 恢復', (await collection.getCompanionPet())?.petId === originalCompanion.petId);

  // Exercise actual DOM completion / undo twice; retain reward flags and history, never refund or reset rewards.
  if (urgent.completed) throw new Error('Urgent fixture is already completed. Checks will not silently undo a changed starting state.');
  const walletBefore = await rewards.getWallet();
  let walletAfterFirst;
  const clickCompletion = async (completed) => {
    const card = taskCard(urgent.id);
    if (card?.closest('.completed-section.collapsed')) {
      card.closest('.completed-section').querySelector('[data-action="toggle-completed-section"]').click();
      await settle();
    }
    const button = completed ? taskCard(urgent.id)?.querySelector('.task-card__complete-btn')
      : taskCard(urgent.id)?.querySelector('.task-check');
    if (!visible(button)) throw new Error(`Task ${completed ? 'complete' : 'undo'} button is not visible.`);
    button.click();
    await until(async () => (await taskService.getTaskById(urgent.id)).completed === completed
      && (!!taskCard(urgent.id)?.querySelector('.task-card__done-info') === completed), 'task completion refresh');
  };
  try {
    await clickCompletion(true);
    check('完成後顯示已完成狀態', taskCard(urgent.id).classList.contains('task-card--done')
      && taskCard(urgent.id).querySelector('.task-card__done-info').textContent.includes('已完成'));
    walletAfterFirst = await rewards.getWallet();
    const expectedDust = urgent.rewardClaimed ? 0 : rewards.calculateRewardAmount(urgent);
    const expectedEnergy = urgent.rewardClaimed ? 0 : rewards.calculateAdventureEnergyAmount(urgent);
    check('首次完成只發放應得獎勵', walletAfterFirst.stardust - walletBefore.stardust === expectedDust
      && walletAfterFirst.adventureEnergy - walletBefore.adventureEnergy === expectedEnergy,
    `stardust +${walletAfterFirst.stardust - walletBefore.stardust}; energy +${walletAfterFirst.adventureEnergy - walletBefore.adventureEnergy}; alreadyClaimed=${urgent.rewardClaimed}`);
    await clickCompletion(false);
    check('可由勾選按鈕取消完成', !(await taskService.getTaskById(urgent.id)).completed
      && visible(taskCard(urgent.id).querySelector('.task-card__complete-btn')));
    const bondBeforeRepeat = (await collection.getCompanionPet()).bondExp;
    await clickCompletion(true);
    const walletAfterRepeat = await rewards.getWallet();
    check('再次完成不重複發星塵／能量／親密度', walletAfterRepeat.stardust === walletAfterFirst.stardust
      && walletAfterRepeat.adventureEnergy === walletAfterFirst.adventureEnergy
      && (await collection.getCompanionPet()).bondExp === bondBeforeRepeat);
  } finally {
    if ((await taskService.getTaskById(urgent.id)).completed) await clickCompletion(false);
  }
  await navigate('tasks');
  check('保留未完成 fixture 與已領獎防刷狀態', !(await taskService.getTaskById(urgent.id)).completed
    && (await taskService.getTaskById(urgent.id)).rewardClaimed);
  const semantics = JSON.stringify({
    tabs: [...doc().querySelectorAll('#task-view-tabs button')].map((button) => [button.dataset.taskView, button.getAttribute('role'), button.textContent.trim()]),
    actions: [...taskCard(urgent.id).querySelectorAll('[data-action]')].map((button) => [button.dataset.action, button.getAttribute('aria-label'), button.textContent.trim()]),
    formOpener: doc().querySelector('#btn-add-task').getAttribute('aria-label'),
  });
  if (value === 'default') taskSemanticsBaseline = semantics;
  else {
    const equal = taskSemanticsBaseline === semantics;
    check('Sweet 與 default 使用相同任務 interaction semantics', equal);
    if (!equal) {
      log(`Default semantics: ${taskSemanticsBaseline ?? '(missing baseline)'}`);
      log(`Sweet semantics: ${semantics}`);
    }
  }
}

async function vp04() {
  await navigate('collection');
  doc().querySelector('#collection-filters [data-filter="owned"]').click();
  await settle();
  const cards = [...doc().querySelectorAll('.collection-card:not(.collection-card--locked)')];
  const sizes = cards.map((card) => card.querySelector('.collection-card__image img')).filter(Boolean).map((element) => rect(element).width);
  check('8 隻收藏 fixture', cards.length === 8, `${cards.length} cards`);
  check('390 寵物圖片至少 100px', sizes.length === 8 && sizes.every((size) => size >= 100), sizes.map((size) => size.toFixed(1)).join(', '));
  const rows = new Map();
  for (const card of cards) {
    const key = Math.round(rect(card).top);
    if (!rows.has(key)) rows.set(key, []);
    const buttons = [...card.querySelectorAll('[data-action="upgrade"], [data-action="set-companion"]')];
    if (buttons.length) rows.get(key).push(Math.max(...buttons.map((button) => rect(button).bottom)));
  }
  const pairs = [...rows.values()].filter((row) => row.length > 1);
  check('同列卡片操作底部對齊 <= 2px', pairs.length > 0 && pairs.every((row) => Math.max(...row) - Math.min(...row) <= 2), JSON.stringify(pairs));
  check('圖鑑無橫溢', doc().documentElement.scrollWidth <= 390);

  const petId = cards[0]?.dataset.petId;
  if (!petId) throw new Error('No owned collection card to exercise.');
  const name = petCard(petId).querySelector('.collection-card__name');
  const expectedName = name.textContent.trim();
  petCard(petId).querySelector('[data-action="view-detail"]').focus();
  name.click();
  await settle();
  check('點角色名稱開啟該角色詳情', doc().querySelector('#modal-overlay').classList.contains('open')
    && doc().querySelector('.pet-detail__name')?.textContent.trim() === expectedName);
  doc().querySelector('#modal-close').click();
  await settle();
  const imageButton = petCard(petId).querySelector('[data-action="view-pet-image"]');
  imageButton.focus();
  imageButton.click();
  await settle();
  check('點卡片圖片開原圖且不另開詳情', !!doc().querySelector('#pet-image-viewer')
    && doc().querySelector('.pet-image-viewer__title')?.textContent.trim() === expectedName
    && !doc().querySelector('#modal-overlay').classList.contains('open'));
  doc().querySelector('.pet-image-viewer__close')?.click();
  await settle();
  check('原圖關閉返回圖片按鈕', !doc().querySelector('#pet-image-viewer') && doc().activeElement === imageButton);

  const collection = await import('../src/collectionService.js');
  const original = await collection.getCompanionPet();
  const alternate = cards.find((card) => card.dataset.petId !== original?.petId)?.dataset.petId;
  if (!original || !alternate) throw new Error('Companion fixture required to verify change and restoration.');
  try {
    petCard(alternate).querySelector('[data-action="set-companion"]').click();
    await until(async () => (await collection.getCompanionPet())?.petId === alternate
      && !petCard(alternate)?.querySelector('[data-action="set-companion"]'), 'collection companion refresh');
    check('設為陪伴更新資料與卡片狀態', (await collection.getCompanionPet()).petId === alternate
      && petCard(alternate).textContent.includes('陪伴中'));
  } finally {
    // Restore through the existing card action, which already refreshes app state.
    // A reload is only needed if that interaction fails and service recovery is necessary.
    try {
      if ((await collection.getCompanionPet())?.petId !== original.petId) {
        const restoreButton = petCard(original.petId)?.querySelector('[data-action="set-companion"]');
        if (!restoreButton) throw new Error('Original companion action missing.');
        restoreButton.click();
        await until(async () => (await collection.getCompanionPet())?.petId === original.petId
          && !petCard(original.petId)?.querySelector('[data-action="set-companion"]'), 'restore original companion through UI');
      }
    } catch (error) {
      check('透過卡片操作恢復原陪伴', false, error.message);
      await collection.setCompanion(original.petId);
      await loadApp();
      await navigate('collection');
      doc().querySelector('#collection-filters [data-filter="owned"]').click();
      await settle();
    }
  }
  check('原陪伴 fixture 已恢復', (await collection.getCompanionPet()).petId === original.petId);
}

async function vp05() {
  await navigate('tasks');
  const opener = doc().querySelector('#btn-add-task');
  opener.focus();
  opener.click();
  const overlay = doc().querySelector('#modal-overlay');
  await settleDialog(overlay);
  check('Modal 開啟 focus 在 dialog 內', overlay.classList.contains('open') && overlay.contains(doc().activeElement));
  check('Modal 不阻止觸控捲動', css(doc().body).touchAction !== 'none', css(doc().body).touchAction);
  const focusables = [...overlay.querySelectorAll('button, input:not([type="hidden"]), select, textarea, a[href], [tabindex]:not([tabindex="-1"])')].filter((element) => !element.disabled && visible(element));
  const first = focusables[0];
  const last = focusables.at(-1);
  last?.focus();
  const tab = new (win().KeyboardEvent)('keydown', { key: 'Tab', bubbles: true, cancelable: true });
  last?.dispatchEvent(tab);
  check('Tab 尾端返回首項（handler）', tab.defaultPrevented && doc().activeElement === first);
  first?.focus();
  const backTab = new (win().KeyboardEvent)('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
  first?.dispatchEvent(backTab);
  check('Shift+Tab 首端返回尾項（handler）', backTab.defaultPrevented && doc().activeElement === last);
  const date = doc().querySelector('#task-start-date');
  const select = doc().querySelector('#task-category');
  check('日期沿用表單 border / radius', !!date && css(date).borderTopStyle !== 'none' && css(date).borderRadius === css(select).borderRadius,
    date ? `date=${css(date).borderRadius}; select=${css(select).borderRadius}` : 'missing');
  const modal = doc().querySelector('.modal');
  check('Modal 界限在 844 viewport', !!modal && rect(modal).top >= -1 && rect(modal).bottom <= 845, modal ? `${rect(modal).top.toFixed(1)}..${rect(modal).bottom.toFixed(1)}` : 'missing');
  doc().activeElement.dispatchEvent(new (win().KeyboardEvent)('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  await settle();
  check('Escape 關閉', !overlay.classList.contains('open'));
  check('關閉後 focus 返回開啟按鈕', doc().activeElement === opener);

  await navigate('collection');
  const card = doc().querySelector('.collection-card:not(.collection-card--locked)');
  if (!card) throw new Error('Owned pet fixture missing for nested modal test.');
  const detailTrigger = card.querySelector('[data-action="view-detail"]');
  detailTrigger.focus();
  detailTrigger.click();
  await settleDialog(overlay);
  const originalDetail = doc().querySelector('.pet-detail');
  const nestedTrigger = originalDetail.querySelector('[data-action="detail-view-image"]');
  nestedTrigger.focus();
  nestedTrigger.click();
  await settleDialog(doc().querySelector('#pet-image-viewer'));
  check('詳情內原圖形成兩層 dialog', !!doc().querySelector('#pet-image-viewer') && overlay.classList.contains('open'));
  check('原圖不阻止觸控捲動', css(doc().body).touchAction !== 'none', css(doc().body).touchAction);
  pressEscape();
  await settle();
  check('第一次 Escape 只關閉原圖、保留詳情 DOM', !doc().querySelector('#pet-image-viewer')
    && overlay.classList.contains('open') && doc().querySelector('.pet-detail') === originalDetail);
  check('巢狀原圖返回詳情中的原開啟按鈕', doc().activeElement === nestedTrigger,
    `${doc().activeElement.tagName}.${doc().activeElement.className}`);
  pressEscape();
  await settle();
  check('第二次 Escape 關閉詳情並返回卡片', !overlay.classList.contains('open') && doc().activeElement === detailTrigger);

  await navigate('tasks');
  await taskTab('today');
  const taskService = await import('../src/taskService.js');
  const task = (await taskService.getAllTasks()).find((item) => item.title === urgentTitle);
  const beforeCancel = JSON.stringify(await taskService.getTaskById(task.id));
  const deleteTrigger = taskCard(task.id).querySelector('[data-action="delete"]');
  deleteTrigger.focus();
  deleteTrigger.click();
  await settleDialog(overlay);
  check('刪除開啟既有 generic confirm', !!doc().querySelector('.confirm-modal')
    && doc().querySelector('#confirm-ok')?.textContent.trim() === '刪除');
  doc().querySelector('#confirm-cancel').click();
  await settle();
  check('取消不執行刪除 callback、任務內容完全保留', !overlay.classList.contains('open')
    && JSON.stringify(await taskService.getTaskById(task.id)) === beforeCancel);
  check('取消確認返回原按鈕', doc().activeElement === deleteTrigger);

  const mailboxTrigger = doc().querySelector('#btn-global-mailbox');
  mailboxTrigger.focus();
  mailboxTrigger.click();
  await until(() => doc().querySelector('#global-mailbox-modal')?.classList.contains('open'), 'mailbox open');
  const mailbox = doc().querySelector('#global-mailbox-modal');
  await settleDialog(mailbox);
  const mailboxButtons = [...mailbox.querySelectorAll('.global-mailbox-modal__icon-btn')];
  check('信箱標頭按鈕 44px 點擊區（縮放容差 0.5）', mailboxButtons.length >= 2
    && mailboxButtons.every((button) => rect(button).width >= 43.5 && rect(button).height >= 43.5),
  mailboxButtons.map((button) => `${rect(button).width.toFixed(2)}×${rect(button).height.toFixed(2)}`).join(', '));
  check('信箱不阻止觸控捲動', css(doc().body).touchAction !== 'none', css(doc().body).touchAction);
  check('信箱開啟 focus 在信箱內', mailbox.contains(doc().activeElement));
  pressEscape();
  await settle();
  check('Escape 關閉信箱並返回入口', !mailbox.classList.contains('open') && doc().activeElement === mailboxTrigger);

  await navigate('expedition');
  const expeditionTrigger = doc().querySelector('[data-action="open-dispatch"]:not(:disabled)');
  if (!expeditionTrigger) {
    log('SKIP · 派遣互動：目前沒有可用派遣入口。請先執行 VP02 取得任務能量，且不應有進行中的探險；測試不會增加資源或完成探險。');
  } else {
    const expeditions = await import('../src/expeditionService.js');
    const rewards = await import('../src/rewardService.js');
    const expeditionsBefore = JSON.stringify(await expeditions.getAllExpeditions());
    const walletBefore = JSON.stringify(await rewards.getWallet());
    expeditionTrigger.focus();
    expeditionTrigger.click();
    let dispatch = doc().querySelector('#expedition-dispatch-modal');
    await settleDialog(dispatch);
    check('由探險入口開派遣 dialog 並移入 focus', !!dispatch && dispatch.contains(doc().activeElement));
    check('派遣不阻止觸控捲動', css(doc().body).touchAction !== 'none', css(doc().body).touchAction);
    if (!dispatch) throw new Error('Dispatch dialog did not open.');
    try {
      const options = [...dispatch.querySelectorAll('[data-action="dispatch-select-pet"]:not(:disabled)')];
      const choice = options.filter((option) => option.getAttribute('aria-pressed') !== 'true').at(-1);
      if (!choice) throw new Error('At least two selectable fixture pets are required.');
      const petId = choice.dataset.petId;
      const petName = choice.querySelector('.expedition-pet-option__name').textContent;
      choice.scrollIntoView({ block: 'center', behavior: 'instant' });
      choice.focus({ preventScroll: true });
      const scrollBefore = dispatch.querySelector('.expedition-dispatch-modal__body').scrollTop;
      choice.click();
      await settle();
      dispatch = doc().querySelector('#expedition-dispatch-modal');
      const selected = dispatch.querySelector(`[data-action="dispatch-select-pet"][data-pet-id="${CSS.escape(petId)}"]`);
      const scrollAfter = dispatch.querySelector('.expedition-dispatch-modal__body').scrollTop;
      check('選寵物後保持 selected focus 與唯一 aria-pressed', doc().activeElement === selected
        && selected.getAttribute('aria-pressed') === 'true'
        && dispatch.querySelectorAll('[data-action="dispatch-select-pet"][aria-pressed="true"]').length === 1);
      check('派遣選擇重繪保留實際捲動位置', scrollBefore > 0 && Math.abs(scrollBefore - scrollAfter) <= 2,
        `${scrollBefore.toFixed(2)} → ${scrollAfter.toFixed(2)}`);
      check('派遣預覽反映所選角色', dispatch.querySelector('.expedition-dispatch-modal__preview').textContent.includes(petName));
      pressEscape();
      await settle();
      check('Escape 關閉派遣並回原入口', !doc().querySelector('#expedition-dispatch-modal') && doc().activeElement === expeditionTrigger);
    } finally {
      // Closing the dialog is the only action after selection; never click dispatch-confirm.
      doc().querySelector('#expedition-dispatch-modal [data-action="dispatch-close"]')?.click();
    }
    check('選擇及關閉不建立探險或消耗能量', JSON.stringify(await expeditions.getAllExpeditions()) === expeditionsBefore
      && JSON.stringify(await rewards.getWallet()) === walletBefore);
  }
  await navigate('tasks');

  log('SKIP · 十連 repeat-confirm DOM/resolver：ui.js 沒有既有 export 或公開展示測試入口；此 harness 不抽卡、不改寫私有模組。');
  log('SKIP · generic confirm 自訂 onCancel callback：唯一產品路徑會下載備份；此處只驗證取消不執行刪除 callback。');
}

async function run() {
  await guard();
  const group = document.getElementById('group').value;
  taskSemanticsBaseline = undefined;
  output.textContent = `${group} · 真實 App 390 × 844 · ${new Date().toISOString()}\n`;
  for (const value of ['default', 'sweet']) {
    await theme(value);
    log(`\n[${value}]`);
    if (group === 'VP-01') await vp01(value);
    if (group === 'VP-02') await vp02(value);
    if (group === 'VP-04') await vp04();
    if (group === 'VP-05') await vp05();
  }
  log('\n檢查結束。FAIL 不視為通過；仍需人工視覺、原生鍵盤、捲動與點擊驗收。');
}

async function action(work) {
  document.querySelectorAll('button, select').forEach((element) => { element.disabled = true; });
  try { await work(); } catch (error) { log(`ERROR · ${error.message}`); }
  finally {
    document.getElementById('initialize').disabled = false;
    document.getElementById('group').disabled = false;
    if (ui && preferences && session?.seeded) document.querySelectorAll('button, select').forEach((element) => { element.disabled = false; });
  }
}
document.getElementById('initialize').onclick = () => action(initialize);
document.getElementById('reload').onclick = () => action(loadApp);
document.getElementById('theme').onchange = (event) => action(() => theme(event.target.value));
document.getElementById('run').onclick = () => action(run);
document.querySelectorAll('[data-view]').forEach((button) => { button.onclick = () => action(() => navigate(button.dataset.view)); });
