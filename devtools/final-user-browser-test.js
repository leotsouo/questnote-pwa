/** New cross-feature coverage only. No static service import before isolation guard. */
let frame = document.getElementById('preview');
const output = document.getElementById('results');
const runButton = document.getElementById('run');
const cleanupButton = document.getElementById('cleanup');
const results = [];
const diagnostics = [];
const ownershipKey = 'questnote-final-user-owned-origin';
const title = '驗收：完成今天的一小步';
const habitName = '驗收：每日閱讀十分鐘';
let marker;
let services;
let taskId;
let habitId;
let petId;
let owned = false;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const win = () => frame.contentWindow;
const doc = () => frame.contentDocument;
const visible = (element) => !!element?.getClientRects().length && win().getComputedStyle(element).visibility !== 'hidden';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const requireTrue = (value, message) => { if (!value) throw new Error(message); };
const find = (selector) => { const element = doc().querySelector(selector); requireTrue(element, `Missing DOM: ${selector}`); return element; };
const taskCard = () => doc().querySelector(`.task-card[data-id="${CSS.escape(taskId)}"]`);
const habitCard = () => doc().querySelector(`.habit-card[data-id="${CSS.escape(habitId)}"]`);
function render() {
  output.textContent = JSON.stringify({ status: runButton.disabled ? 'running' : 'finished', origin: location.origin,
    database: marker?.databaseName, results, diagnostics, cleanupPending: owned,
    limitations: ['Synthetic DOM events do not prove trusted keyboard or touch behavior.',
      'Export captures the real Blob; OS download persistence and file chooser are not exercised.',
      'System reduced-motion, safe-area and installation need device checks.',
      'SW is blocked on this origin. Dedicated release/PWA suites cover updates and offline behavior.'] }, null, 2);
}
async function check(name, run) {
  const result = { name, ok: false };
  try { const detail = await run(); result.ok = true; if (detail !== undefined) result.detail = detail; }
  catch (error) { result.error = error.stack || error.message; }
  results.push(result); render();
  requireTrue(result.ok, `Stopping dependent flows after failed check: ${name}`);
}
async function until(predicate, description, timeout = 15000) {
  const start = performance.now();
  while (performance.now() - start < timeout) {
    if (await predicate()) return;
    await wait(60);
  }
  throw new Error(`Timed out: ${description}`);
}
async function settle() {
  await new Promise((resolve) => win().requestAnimationFrame(() => win().requestAnimationFrame(resolve)));
  await wait(180);
}
async function click(target) {
  const element = typeof target === 'string' ? find(target) : target;
  requireTrue(visible(element) && !element.disabled, `Action must be visible/enabled: ${element?.id || element?.outerHTML || target}`);
  element.scrollIntoView({ block: 'center', behavior: 'instant' });
  element.focus({ preventScroll: true });
  element.click();
  await settle();
}
function enter(selector, value) {
  const input = find(selector);
  input.value = value;
  input.dispatchEvent(new (win().Event)('input', { bubbles: true }));
  input.dispatchEvent(new (win().Event)('change', { bubbles: true }));
}
async function guard({ requireEmpty = false } = {}) {
  requireTrue(['localhost', '127.0.0.1', '[::1]'].includes(location.hostname), 'Localhost only');
  const response = await fetch('/__final-user_test_guard__', { cache: 'no-store' });
  requireTrue(response.ok, 'Dedicated final-user test server required');
  const current = await response.json();
  requireTrue(current.purpose === 'questnote-final-user-synthetic-only'
    && /^QuestNoteTest-FinalUser-[a-f0-9-]{36}$/.test(current.databaseName), 'Invalid isolation marker');
  requireTrue(!navigator.serviceWorker?.controller && !(await navigator.serviceWorker?.getRegistrations())?.length,
    'Existing SW found. Start a fresh ephemeral port; no existing registrations will be removed.');
  requireTrue(typeof indexedDB.databases === 'function', 'Database enumeration is required before app startup');
  const databases = await indexedDB.databases();
  const saved = sessionStorage.getItem(ownershipKey);
  requireTrue(!databases.length || (!requireEmpty && saved === current.instance
    && databases.every((database) => database.name === current.databaseName)), 'Unknown or previous database exists; no overwrite permitted');
  marker = current;
  if (requireEmpty) sessionStorage.setItem(ownershipKey, marker.instance);
}
function collectErrors() {
  for (const error of win()?.__questNoteFinalTest?.errors || []) diagnostics.push(error);
}
async function loadApp({ reopen = false } = {}) {
  await guard();
  if (win()?.__questNoteFinalTest) { collectErrors(); win().__questNoteFinalTest.close(); }
  if (reopen) {
    const replacement = document.createElement('iframe');
    replacement.id = 'preview'; replacement.title = frame.title; replacement.src = 'about:blank';
    frame.replaceWith(replacement); frame = replacement;
  }
  const loaded = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('App load timeout')), 20000);
    frame.onload = () => { clearTimeout(timeout); resolve(); };
  });
  frame.src = `/index.html?acceptanceRun=${encodeURIComponent(marker.instance)}&load=${Date.now()}`;
  await loaded;
  requireTrue(win().__questNoteFinalTest?.databaseName === marker.databaseName, 'DB guard missing before app module');
  owned = true; cleanupButton.disabled = false;
  await until(() => doc().querySelector('#task-view-content')?.children.length && !visible(doc().querySelector('#app-loader')), 'app ready', 20000);
  services = Object.fromEntries(await Promise.all(['db', 'taskService', 'taskFilterService', 'habitService', 'rewardService',
    'collectionService', 'preferencesService', 'backupService'].map(async (name) => [name, await win().eval(`import('/src/${name}.js')`)])));
  requireTrue((await services.db.openDB()).name === marker.databaseName, 'App opened a non-test DB');
  requireTrue(!win().navigator.serviceWorker?.controller, 'Unexpected iframe SW');
  await settle();
}
async function navigate(view) {
  const direct = doc().querySelector(`.bottom-nav [data-view="${view}"]`);
  if (direct) await click(direct);
  else { await click('.bottom-nav [data-view="more"]'); await click(`#view-more [data-goto="${view}"]`); }
  await until(() => doc().querySelector(`#view-${view}`)?.classList.contains('active'), `${view} navigation`);
  win().scrollTo(0, 0); find(`#view-${view}`).scrollTop = 0;
  await settle();
}
async function setTheme(value) {
  await navigate('settings');
  await click(`[data-action="select-theme"][data-theme="${value}"]`);
  await until(async () => doc().body.dataset.theme === value && (await services.preferencesService.getUserPreferences()).theme === value, `${value} theme persisted`);
}
async function todayTab() {
  await navigate('tasks');
  await click('#task-view-tabs [data-task-view="today"]');
}
function geometry() {
  const width = doc().documentElement.clientWidth;
  const nav = find('.bottom-nav').getBoundingClientRect();
  // A desktop scrollbar can reduce document.clientWidth to 375 inside a 390px viewport.
  requireTrue(win().innerWidth === 390 && win().innerHeight === 844,
    `Expected 390 × 844 iframe; got ${win().innerWidth} × ${win().innerHeight}, content ${width}`);
  requireTrue(doc().documentElement.scrollWidth <= width + 1, `Horizontal overflow: ${doc().documentElement.scrollWidth}`);
  requireTrue(nav.left >= -1 && nav.right <= width + 1 && nav.bottom <= 845 && nav.top >= 0, 'Bottom navigation outside viewport');
  return { width, height: win().innerHeight, scrollWidth: doc().documentElement.scrollWidth, navTop: nav.top };
}
async function revealCompletedTask() {
  await todayTab();
  const section = taskCard()?.closest('.completed-section');
  if (section?.classList.contains('collapsed')) await click(section.querySelector('[data-action="toggle-completed-section"]'));
  requireTrue(visible(taskCard()), 'Completed task is unavailable from Today');
}
async function createTask(content, subtasks = []) {
  await todayTab();
  await click('#btn-add-task');
  await until(() => !!doc().querySelector('#task-form'), 'task form');
  enter('#task-content', content);
  if (!find('#task-plan-today').checked) await click('#task-plan-today');
  for (const text of subtasks) { enter('#subtask-new-input', text); await click('#subtask-add-btn'); }
  await click('#task-form [type="submit"]');
  await until(async () => !(find('#modal-overlay').classList.contains('open'))
    && (await services.taskService.getAllTasks()).some((task) => task.title === content.split('\n')[0]), 'task created');
  return (await services.taskService.getAllTasks()).find((task) => task.title === content.split('\n')[0]);
}
async function injectBackupFile(payload, name) {
  const transfer = new (win().DataTransfer)();
  transfer.items.add(new (win().File)([JSON.stringify(payload)], name, { type: 'application/json' }));
  const input = find('#import-file-input');
  input.files = transfer.files;
  input.dispatchEvent(new (win().Event)('change', { bubbles: true }));
  await settle();
}
async function persistentAssertions(expectedTheme = 'sweet') {
  const task = await services.taskService.getTaskById(taskId);
  const habit = await services.habitService.getHabitById(habitId);
  requireTrue(task?.completed && task.rewardClaimed && task.subtasks.length === 2 && task.subtasks.every((item) => item.completed), 'Task or subtask persistence changed');
  requireTrue(services.habitService.isCompletedToday(habit), 'Daily habit completion missing');
  requireTrue((await services.collectionService.getCompanionPet())?.petId === petId, 'Companion selection missing');
  const prefs = await services.preferencesService.getUserPreferences();
  requireTrue(prefs.theme === expectedTheme && !prefs.reduceMotion && !doc().body.classList.contains('reduce-motion'), 'Theme or retired animation preference changed');
}
async function cleanup() {
  if (!owned && sessionStorage.getItem(ownershipKey) !== marker?.instance) return;
  await guard();
  collectErrors();
  win()?.__questNoteFinalTest?.close();
  const blank = new Promise((resolve) => { frame.onload = resolve; });
  frame.src = 'about:blank'; await blank;
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(marker.databaseName);
    request.onsuccess = resolve; request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Test DB deletion blocked; close its other test frames then retry cleanup'));
  });
  requireTrue(!(await indexedDB.databases()).some((database) => database.name === marker.databaseName), 'UUID database remains');
  owned = false; cleanupButton.disabled = true;
  sessionStorage.removeItem(ownershipKey);
  results.push({ name: 'Cleanup deletes only the owned UUID database and leaves no app frame', ok: true });
  render();
}

async function run() {
  runButton.disabled = true; results.length = 0; diagnostics.length = 0; render();
  try {
    await check('Fresh isolated origin and app boot use only a UUID database', async () => {
      await guard({ requireEmpty: true }); await loadApp();
      requireTrue((await services.taskService.getAllTasks()).length === 0, 'Expected empty tasks');
      requireTrue((await services.habitService.getAllHabits()).length === 0, 'Expected empty habits');
      requireTrue((await services.collectionService.getCollection()).length === 0, 'Expected empty collection');
      return { database: marker.databaseName, osReducedMotion: win().matchMedia('(prefers-reduced-motion: reduce)').matches };
    });
    await check('Both themes show the first-run empty collection at 390 × 844', async () => {
      const evidence = {};
      for (const theme of ['default', 'sweet']) {
        await setTheme(theme); await navigate('collection'); await click('#collection-filters [data-filter="owned"]');
        const empty = find('#collection-grid .empty-state');
        requireTrue(visible(empty) && !doc().querySelector('.collection-card:not(.collection-card--locked)'), 'Owned empty state incorrect');
        evidence[theme] = geometry();
      }
      await setTheme('default'); return evidence;
    });
    await check('Actual task form creates today task and two subtasks, then DOM completion persists', async () => {
      const task = await createTask(`${title}\n把大型目標拆成可完成的小步驟。`, ['準備資料', '整理筆記']);
      taskId = task.id;
      requireTrue(task.subtasks.length === 2 && services.taskFilterService.isInTodayPlan(task), 'Task form lost subtasks or today plan');
      const wallet = await services.rewardService.getWallet();
      await click(taskCard().querySelector('[data-action="toggle-expand"]'));
      for (const subtask of task.subtasks) {
        await click(taskCard().querySelector(`[data-subtask-id="${CSS.escape(subtask.id)}"]`));
        await until(async () => (await services.taskService.getTaskById(taskId)).subtasks.find((item) => item.id === subtask.id).completed, 'subtask commit');
      }
      requireTrue(!(await services.taskService.getTaskById(taskId)).completed, 'Subtask completion unexpectedly completed parent');
      await click(taskCard().querySelector('.task-card__complete-btn'));
      await until(async () => (await services.taskService.getTaskById(taskId)).rewardClaimed && !!taskCard()?.querySelector('.task-card__done-info'), 'parent completion');
      const after = await services.rewardService.getWallet();
      requireTrue(after.stardust - wallet.stardust === services.rewardService.calculateRewardAmount(task), 'Task reward delta differs');
      requireTrue(after.adventureEnergy - wallet.adventureEnergy === services.rewardService.calculateAdventureEnergyAmount(task), 'Task energy delta differs');
      return { taskId, subtaskIds: task.subtasks.map((item) => item.id) };
    });
    await check('Daily habit form, normal completion and edit preserve the same daily log', async () => {
      await navigate('habits'); await click('#btn-add-habit');
      enter('#habit-name', habitName); enter('#habit-desc', '從一頁開始。'); enter('#habit-frequency', 'daily');
      await click('#habit-form [type="submit"]');
      await until(async () => (await services.habitService.getAllHabits()).some((habit) => habit.name === habitName), 'habit creation');
      const habit = (await services.habitService.getAllHabits()).find((item) => item.name === habitName); habitId = habit.id;
      const before = await services.rewardService.getWallet();
      await click(habitCard().querySelector('[data-action="habit-complete"]'));
      await until(async () => services.habitService.isCompletedToday(await services.habitService.getHabitById(habitId))
        && habitCard()?.classList.contains('habit-card--done'), 'daily habit commit');
      const completed = await services.habitService.getHabitById(habitId);
      requireTrue((await services.rewardService.getWallet()).stardust - before.stardust === services.habitService.DAILY_STARDUST_REWARD, 'Daily habit reward differs');
      requireTrue(!habitCard().querySelector('[data-action="habit-complete"]'), 'Completed daily habit still offers complete');
      await click(habitCard().querySelector('[data-action="habit-edit"]'));
      enter('#habit-desc', '驗收：每天保留十分鐘，已完成紀錄不應消失。');
      await click('#habit-form [type="submit"]');
      await until(() => !find('#modal-overlay').classList.contains('open'), 'habit edit saved');
      requireTrue(same((await services.habitService.getHabitById(habitId)).logs, completed.logs), 'Editing habit changed daily log');
      await navigate('tasks'); await navigate('habits');
      requireTrue(habitCard().textContent.includes('今日已完成'), 'Habit lost completion after navigation');
      return { habitId, logs: completed.logs };
    });
    await check('One service-prepared owned pet opens actual collection detail and selects companion through DOM', async () => {
      const catalog = await (await fetch('/data/pets.json', { cache: 'no-store' })).json();
      petId = catalog.pets.find((pet) => pet.rarity === 'N').id;
      await services.collectionService.addPetToCollection(petId); // Only fixture preparation; no resources or dev unlock flags.
      await loadApp(); await navigate('collection'); await click('#collection-filters [data-filter="owned"]');
      const card = find(`.collection-card[data-pet-id="${CSS.escape(petId)}"]`);
      requireTrue(doc().querySelectorAll('.collection-card:not(.collection-card--locked)').length === 1, 'Owned fixture not isolated');
      await click(card.querySelector('[data-action="view-detail"]'));
      requireTrue(find('#modal-overlay').classList.contains('open') && visible(find('.pet-detail__name')), 'Pet detail did not open');
      requireTrue(find('.pet-detail__name').textContent.includes(catalog.pets.find((pet) => pet.id === petId).name), 'Wrong pet detail');
      await click('#modal-close'); await click(card.querySelector('[data-action="set-companion"]'));
      await until(async () => (await services.collectionService.getCompanionPet())?.petId === petId, 'companion saved');
      return { petId };
    });
    await check('390 × 844 geometry and modal focus handlers work in both themes', async () => {
      const evidence = {};
      for (const theme of ['default', 'sweet']) {
        await setTheme(theme);
        requireTrue(!doc().querySelector('#toggle-reduce-motion') && !doc().body.classList.contains('reduce-motion'), 'Retired animation toggle remains active');
        evidence[theme] = {};
        for (const view of ['tasks', 'habits', 'collection', 'settings']) { await navigate(view); evidence[theme][view] = geometry(); }
        await revealCompletedTask();
        const opener = find('#btn-add-task'); await click(opener);
        const overlay = find('#modal-overlay'); const modal = find('#modal-overlay .modal');
        await until(() => overlay.contains(doc().activeElement), 'modal focus after entrance animation');
        await Promise.allSettled(modal.getAnimations().filter((animation) =>
          Number.isFinite(animation.effect?.getComputedTiming().endTime)).map((animation) => animation.finished));
        requireTrue(overlay.contains(doc().activeElement), 'Modal did not receive focus');
        const box = modal.getBoundingClientRect();
        requireTrue(box.left >= -1 && box.right <= 391 && box.top >= -1 && box.bottom <= 845, 'Modal exceeds phone viewport');
        const focusable = [...overlay.querySelectorAll('button,input:not([type="hidden"]),textarea,select,[tabindex]:not([tabindex="-1"])')].filter((element) => visible(element) && !element.disabled);
        const first = focusable[0], last = focusable.at(-1);
        last.focus(); const tab = new (win().KeyboardEvent)('keydown', { key: 'Tab', bubbles: true, cancelable: true }); last.dispatchEvent(tab);
        requireTrue(tab.defaultPrevented && doc().activeElement === first, 'Forward Tab boundary failed');
        first.focus(); const back = new (win().KeyboardEvent)('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }); first.dispatchEvent(back);
        requireTrue(back.defaultPrevented && doc().activeElement === last, 'Reverse Tab boundary failed');
        last.dispatchEvent(new (win().KeyboardEvent)('keydown', { key: 'Escape', bubbles: true, cancelable: true })); await settle();
        requireTrue(!overlay.classList.contains('open') && doc().activeElement === opener, 'Escape/focus return failed');
      }
      return evidence;
    });
    await check('Reload and a reopened browsing context retain task, habit, companion and theme', async () => {
      await loadApp(); await persistentAssertions();
      await loadApp({ reopen: true }); await persistentAssertions();
      await revealCompletedTask(); requireTrue(taskCard().textContent.includes('已完成'), 'Persisted task not rendered');
      await navigate('habits'); requireTrue(habitCard().classList.contains('habit-card--done'), 'Persisted habit not rendered');
    });
    await check('UI export Blob, invalid-file rejection and two-confirm UI restore survive reopen', async () => {
      await navigate('settings');
      const capture = win().__questNoteFinalTest;
      await click('#btn-export');
      await until(() => capture.downloads.length === 1 && find('#toast-container').textContent.includes('JSON 備份已下載'), 'actual export finished');
      const backup = JSON.parse(await capture.downloads[0].blob.text());
      requireTrue(services.backupService.validateBackup(backup).valid && capture.downloads[0].filename.endsWith('.json'), 'Export did not produce a valid actual Blob');
      const before = await services.db.readAllStoresSnapshot();
      await injectBackupFile({ app: 'QuestNote', version: 2, tasks: [] }, 'invalid-partial.json');
      await until(() => visible(doc().querySelector('#import-error-hint')), 'invalid backup rejected');
      requireTrue(!visible(doc().querySelector('#import-preview')) && !visible(doc().querySelector('#import-success-panel')), 'Invalid backup exposes restore/success UI');
      requireTrue(same(before, await services.db.readAllStoresSnapshot()), 'Invalid file changed persistent state');
      const extra = await createTask('驗收：備份後暫存、恢復後必須移除');
      await navigate('settings'); await injectBackupFile(backup, 'captured-valid-backup.json');
      await until(() => visible(doc().querySelector('#import-preview')), 'valid backup preview');
      requireTrue(Number(find('#import-preview-tasks').textContent) === backup.tasks.length, 'Preview task count differs');
      await click('#btn-import-restore');
      await until(() => doc().querySelector('#confirm-ok')?.textContent === '繼續', 'first restore confirmation');
      await click('#confirm-ok');
      await until(() => doc().querySelector('#confirm-ok')?.textContent === '確認恢復', 'second restore confirmation');
      requireTrue(capture.downloads.length === 2, 'Automatic pre-restore backup download was not initiated');
      const automatic = JSON.parse(await capture.downloads[1].blob.text());
      requireTrue(services.backupService.validateBackup(automatic).valid && automatic.tasks.some((task) => task.id === extra.id), 'Pre-restore Blob does not contain latest data');
      await click('#confirm-ok');
      await until(() => visible(doc().querySelector('#import-success-panel')), 'restore success', 20000);
      requireTrue(!await services.taskService.getTaskById(extra.id), 'Restore merged instead of replacing task snapshot');
      const restored = await services.backupService.exportBackup();
      for (const key of ['tasks', 'habits', 'collection', 'wallet', 'userPreferences']) requireTrue(same(restored.data[key], backup.data[key]), `Restore differs in ${key}`);
      await loadApp({ reopen: true }); await persistentAssertions();
      requireTrue(!await services.taskService.getTaskById(extra.id), 'Deleted post-backup task reappeared after reopen');
      return { exportedFilename: capture.downloads[0].filename, autoBackupFilename: capture.downloads[1].filename,
        scope: 'Actual app Blob → native File/FileReader → production preview/confirm/restore handlers; OS disk persistence not tested' };
    });
    await check('No unexpected page errors or non-test databases were created', async () => {
      collectErrors();
      requireTrue(!diagnostics.length, diagnostics.join('\n'));
      const names = (await indexedDB.databases()).map((database) => database.name);
      requireTrue(names.length === 1 && names[0] === marker.databaseName, `Unexpected database names: ${names}`);
      return names;
    });
  } catch (error) {
    if (!results.some((result) => !result.ok)) results.push({ name: 'Harness infrastructure', ok: false, error: error.stack || error.message });
  } finally {
    if (!document.getElementById('keep-preview').checked && owned) {
      try { await cleanup(); } catch (error) { results.push({ name: 'Cleanup', ok: false, error: error.message }); }
    }
    runButton.disabled = false; render();
  }
}
runButton.onclick = run;
cleanupButton.onclick = async () => {
  try { await cleanup(); } catch (error) { results.push({ name: 'Cleanup', ok: false, error: error.message }); }
  render();
};
