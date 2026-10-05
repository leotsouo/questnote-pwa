/** Real UI acceptance; only the existing dedicated synthetic server is allowed. */
const frame = document.getElementById('preview');
const output = document.getElementById('results');
const results = [];
let marker;
let services;
const win = () => frame.contentWindow;
const doc = () => frame.contentDocument;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (value, message) => { if (!value) throw new Error(message); };
const get = (selector) => { const element = doc().querySelector(selector); assert(element, `Missing ${selector}`); return element; };
const visible = (element) => Boolean(element?.getClientRects().length) && win().getComputedStyle(element).visibility !== 'hidden';
async function until(predicate, label, timeout = 25000) {
  const started = performance.now();
  while (performance.now() - started < timeout) { if (await predicate()) return; await wait(50); }
  throw new Error(`Timeout: ${label}`);
}
async function click(selector) {
  const element = typeof selector === 'string' ? get(selector) : selector;
  assert(visible(element) && !element.disabled, `Hidden/disabled ${selector}`);
  element.scrollIntoView({ block: 'center', behavior: 'instant' }); element.click(); await wait(180);
}
function input(selector, value) {
  const element = get(selector); element.value = value; element.dispatchEvent(new (win().Event)('input', { bubbles: true }));
}
async function check(name, callback) {
  const result = { name, ok: false };
  try { result.detail = await callback(); result.ok = true; } catch (error) { result.error = error.stack; }
  results.push(result); show('running'); assert(result.ok, name);
}
function show(status, error) { output.textContent = JSON.stringify({ status, database: marker?.databaseName, results, error }, null, 2); }
async function guard() {
  assert(['localhost', '127.0.0.1'].includes(location.hostname), 'Loopback only');
  const response = await fetch('/__onboarding_test_guard__', { cache: 'no-store' });
  assert(response.ok, 'Dedicated synthetic server required');
  marker = await response.json();
  assert(marker.purpose === 'questnote-onboarding-synthetic-only' && /^QuestNoteTest-Onboarding-[a-f0-9-]{36}$/.test(marker.databaseName), 'Invalid DB guard');
  assert(!navigator.serviceWorker.controller && !(await navigator.serviceWorker.getRegistrations()).length, 'No service workers allowed');
  assert((await indexedDB.databases()).every((db) => db.name === marker.databaseName), 'Unknown database: refusing writes');
}
function faultHook(startup) {
  // This runs after server-owned DB isolation and before the original app modules.
  window.__flowFault = { mode: null, fired: [], restoreCommitted: false };
  const fault = window.__flowFault;
  const nativeTransaction = IDBDatabase.prototype.transaction;
  IDBDatabase.prototype.transaction = function (stores, mode, options) {
    if (this.name !== window.__questNoteOnboardingTest.databaseName) throw new Error('Fault hook refuses non-synthetic DB');
    const names = typeof stores === 'string' ? [stores] : Array.from(stores);
    const habitWrite = mode === 'readwrite' && names.includes('habits');
    const restoreWrite = mode === 'readwrite' && names.length === 5;
    if ((fault.mode === 'habit-fail' && habitWrite) || (fault.mode === 'restore-before' && restoreWrite)
      || (fault.mode === 'refresh-fail' && mode === 'readonly')) {
      fault.fired.push(fault.mode); fault.mode = null; throw new DOMException('Synthetic acceptance failure', 'UnknownError');
    }
    const tx = nativeTransaction.call(this, stores, mode, options);
    if (fault.mode === 'habit-delay' && habitWrite) {
      fault.mode = null; fault.fired.push('habit-delay');
      Object.defineProperty(tx, 'oncomplete', { configurable: true, set(callback) {
        tx.addEventListener('complete', (event) => setTimeout(() => callback.call(tx, event), 700));
      } });
    }
    if (fault.mode === 'restore-after' && restoreWrite) {
      tx.addEventListener('complete', () => { fault.restoreCommitted = true; fault.mode = 'refresh-fail'; });
    }
    return tx;
  };
  if (startup && !sessionStorage.getItem('__flowStartupFaultConsumed')) {
    sessionStorage.setItem('__flowStartupFaultConsumed', 'yes');
    const nativeOpen = indexedDB.open.bind(indexedDB);
    indexedDB.open = (...args) => { indexedDB.open = nativeOpen; fault.fired.push('startup'); throw new DOMException('Synthetic startup failure', 'UnknownError'); };
  }
}
async function loadApp(startup = false) {
  await guard();
  win().__questNoteOnboardingTest?.close();
  if (startup) sessionStorage.removeItem('__flowStartupFaultConsumed');
  const response = await fetch(`/index.html?flow=${marker.instance}`, { cache: 'no-store' });
  let html = await response.text();
  assert(html.includes('/__onboarding_db_guard__.js'), 'Server isolation script missing');
  html = html.replace('<head>', `<head><base href="${location.origin}/">`);
  html = html.replace('<script src="/__onboarding_db_guard__.js"></script>',
    `<script src="/__onboarding_db_guard__.js"></script><script>(${faultHook.toString()})(${startup});</script>`);
  const loaded = new Promise((resolve) => { frame.onload = resolve; }); frame.srcdoc = html; await loaded;
  assert(win().__questNoteOnboardingTest?.databaseName === marker.databaseName, 'Frame guard missing');
  if (!startup) await ready();
}
async function ready() {
  await until(() => doc().querySelector('#task-view-content')?.children.length && !visible(doc().querySelector('#app-loader')), 'App ready');
  services = Object.fromEntries(await Promise.all(['db', 'backupService', 'taskService'].map(async (name) => [name, await win().eval(`import('/src/${name}.js')`)])));
  assert((await services.db.openDB()).name === marker.databaseName, 'Services isolated');
}
async function skip() {
  const guidedSkip = doc().querySelector('[data-guided-action="skip"]');
  if (guidedSkip && visible(guidedSkip)) {
    await click(guidedSkip); await click('[data-guided-action="confirm-skip"]');
    await until(() => !doc().querySelector('.guided-coach'), 'Skip confirmation persisted');
  }
  const skipButton = doc().querySelector('[data-onboarding-action="skip"]'); if (skipButton && visible(skipButton)) await click(skipButton);
}
async function more(destination) { await click('.bottom-nav [data-view="more"]'); await click(`#view-more [data-goto="${destination}"]`); }
async function taskEntry() {
  await until(() => visible(doc().querySelector('.twilight-add-task')) || visible(doc().querySelector('#btn-add-task')), 'Visible task entry');
  return visible(doc().querySelector('.twilight-add-task')) ? get('.twilight-add-task') : get('#btn-add-task');
}
async function openHabit() { await more('habits'); await click('#btn-add-habit'); }
const submitHabit = () => get('#habit-form').dispatchEvent(new (win().Event)('submit', { bubbles: true, cancelable: true }));
async function habits() {
  await loadApp(); await skip();
  await check('I01 repeated submit during native transaction completion delay creates one habit', async () => {
    await openHabit(); const name = `flow-habit-${Date.now()}`; input('#habit-name', name);
    win().__flowFault.mode = 'habit-delay'; submitHabit(); submitHabit();
    assert(get('#habit-form button[type="submit"]').disabled, 'Submit not disabled');
    await until(() => !visible(doc().querySelector('#modal-overlay')), 'Habit success');
    const rows = (await services.db.dbGetAll('habits')).filter((row) => row.name === name);
    assert(rows.length === 1, 'Duplicate habit'); assert(win().__flowFault.fired.includes('habit-delay'), 'Delay not exercised');
    return { name, count: rows.length };
  });
  await check('I01 failed write retains input, visible error, unlocks and retry saves once', async () => {
    await openHabit(); const name = `flow-retry-${Date.now()}`; input('#habit-name', name);
    win().__flowFault.mode = 'habit-fail'; submitHabit();
    await until(() => visible(doc().querySelector('#habit-form-error')), 'Habit visible error');
    assert(get('#habit-name').value === name && !get('#habit-form button[type="submit"]').disabled, 'Input/lock recovery');
    assert(!(await services.db.dbGetAll('habits')).some((row) => row.name === name), 'Failed write persisted');
    submitHabit(); await until(() => !visible(doc().querySelector('#modal-overlay')), 'Retry success');
    assert((await services.db.dbGetAll('habits')).filter((row) => row.name === name).length === 1, 'Retry duplicate');
    return { name, failures: win().__flowFault.fired };
  });
}
async function scenarios() {
  await loadApp();
  await check('A first-time: real guided practice including interrupted editor; existing users keep guide access', async () => {
    const guided = await services.db.dbGet('meta', 'guidedOnboarding');
    const initialWelcome = guided?.status === 'active' && guided.step === 'WELCOME';
    const step = async (expected) => {
      await until(async () => (await services.db.dbGet('meta', 'guidedOnboarding'))?.step === expected, expected);
      await wait(650);
    };
    const ack = () => click('[data-guided-action="acknowledge"]');
    if (initialWelcome) {
      await until(() => visible(doc().querySelector('[data-guided-action="acknowledge"]')), 'Welcome CTA');
      assert(get('#guided-instruction').textContent.trim(), 'Welcome explanation missing');
      await ack(); await step('MEET_COMPANION'); await ack(); await step('HOME_INTRO');
      await ack(); await step('OPEN_CREATE_QUEST'); await click('.twilight-add-task'); await step('CREATE_TUTORIAL_QUEST');
      assert(get('#task-content').value.startsWith('完成我的第一個 Quest'), 'Practice not prefilled');
      await loadApp(); await step('CREATE_TUTORIAL_QUEST');
      assert(get('#task-content').value.startsWith('完成我的第一個 Quest'), 'Interrupted practice lost');
      await click('#task-form button[type="submit"]'); await step('RETURN_HOME');
      await ack(); await step('COMPLETE_TUTORIAL_QUEST'); await click('.task-card [data-action="toggle"]');
      await step('REWARD_REVEAL'); await ack(); await step('COMPANION_REACTION'); await ack(); await step('FINISH');
      await click('[data-guided-action="finish-home"]');
      await until(async () => (await services.db.dbGet('meta', 'guidedOnboarding'))?.status === 'completed', 'Practice completed');
    } else await skip();
    await more('guide'); assert(get('#view-guide').classList.contains('active'), 'Guide unavailable');
    return { initialWelcome, realPracticeCompleted: initialWelcome, note: 'Existing synthetic profile is retained; fresh server exercises practice.' };
  });
  await check('B returning / E cancel: direct task entry, cancel creates no task, navigation returns', async () => {
    await click('.bottom-nav [data-view="tasks"]'); const before = (await services.db.dbGetAll('tasks')).length;
    await click(await taskEntry()); input('#task-content', '此筆應取消'); await click('#form-cancel');
    assert((await services.db.dbGetAll('tasks')).length === before, 'Cancel wrote task');
    await more('habits'); await click('.bottom-nav [data-view="tasks"]'); assert(visible(await taskEntry()), 'Return blocked');
  });
  const task = await services.taskService.createTask({ content: `flow-subtask-${Date.now()}`, planToday: true,
    subtasks: [{ id: `flow-sub-${Date.now()}`, text: '整理書桌', completed: false }] });
  await loadApp(); await skip();
  await check('F I06 accessible action and state; complete and undo stay on tasks', async () => {
    const card = get(`.task-card[data-id="${task.id}"]`);
    const expand = card.querySelector('[data-action="toggle-expand"]'); if (expand) await click(expand);
    const selector = `.task-card[data-id="${task.id}"] [data-action="toggle-subtask"]`;
    assert(get(selector).getAttribute('aria-pressed') === 'false' && get(selector).getAttribute('aria-label').includes('整理書桌'), 'Initial semantics');
    await click(selector); await until(() => doc().querySelector(selector)?.getAttribute('aria-pressed') === 'true', 'Completed semantics');
    assert(get(selector).getAttribute('aria-label').includes('取消完成'), 'Undo action unclear');
    await click(selector); await until(() => doc().querySelector(selector)?.getAttribute('aria-pressed') === 'false', 'Undo semantics');
  });
  await check('C interrupted: persisted task and subtask restore; no forced welcome on reload', async () => {
    await loadApp(); assert(!doc().querySelector('.guided-coach'), 'Welcome repeated');
    const saved = await services.db.dbGet('tasks', task.id); assert(saved?.subtasks?.[0]?.completed === false, 'Saved state lost');
    assert(doc().querySelector(`.task-card[data-id="${task.id}"]`), 'Task not rendered');
  });
  await check('D invalid input: required task content prevents writes; cancel remains available', async () => {
    await click(await taskEntry()); const before = (await services.db.dbGetAll('tasks')).length;
    assert(!get('#task-form').checkValidity(), 'Empty form valid'); get('#task-form').requestSubmit(); await wait(150);
    assert((await services.db.dbGetAll('tasks')).length === before, 'Invalid submit persisted'); await click('#form-cancel');
  });
}
async function restore(mode) {
  await loadApp(); await skip();
  const backup = await services.backupService.exportBackup();
  const taskIds = backup.data.tasks.map((task) => task.id);
  await more('settings');
  const transfer = new (win().DataTransfer)(); transfer.items.add(new (win().File)([JSON.stringify(backup)], 'synthetic-flow-backup.json', { type: 'application/json' }));
  get('#import-file-input').files = transfer.files; get('#import-file-input').dispatchEvent(new (win().Event)('change', { bubbles: true }));
  await until(() => visible(doc().querySelector('#import-preview')), 'Backup preview');
  await click('#btn-import-restore'); await click('#confirm-ok');
  await until(() => doc().querySelector('#confirm-ok')?.textContent.includes('確認恢復'), 'Final confirmation');
  win().__flowFault.mode = mode; await click('#confirm-ok');
  await until(() => visible(doc().querySelector('#import-error-hint')), 'Restore error');
  await check(`I07 ${mode}: neutral recovery text and preserved native DB task rows`, async () => {
    const message = get('#import-error-hint').textContent;
    assert(!message.includes('未完整寫入') && !message.includes('檔是否正確') && message.includes('重新整理'), 'Misleading restore text');
    assert(win().__flowFault.fired.length > 0, 'Fault not triggered');
    if (mode === 'restore-after') assert(win().__flowFault.restoreCommitted, 'Commit not observed');
    const rows = await services.db.dbGetAll('tasks'); assert(taskIds.every((id) => rows.some((row) => row.id === id)), 'Existing data lost');
    return { message, committed: win().__flowFault.restoreCommitted, faults: win().__flowFault.fired, tasks: rows.length };
  });
}
document.querySelectorAll('[data-run]').forEach((button) => button.addEventListener('click', async () => {
  document.querySelectorAll('[data-run]').forEach((control) => { control.disabled = true; });
  try {
    const action = button.dataset.run;
    if (action === 'habits') await habits();
    else if (action === 'habit-error') {
      await loadApp(); await skip(); await openHabit(); input('#habit-name', `flow-visible-retry-${Date.now()}`);
      win().__flowFault.mode = 'habit-fail'; submitHabit();
      await check('I01 visible retryable error for manual screenshot and actual CTA retry', async () => {
        await until(() => visible(doc().querySelector('#habit-form-error')), 'Visible error');
        assert(!get('#habit-form button[type="submit"]').disabled && get('#habit-name').value, 'Not retryable');
        return { message: get('#habit-form-error').textContent, retainedName: get('#habit-name').value };
      });
    }
    else if (action === 'scenarios') await scenarios();
    else if (action.startsWith('restore-')) await restore(action);
    else if (action === 'startup') {
      await loadApp(true); await check('I03 startup error is visible with reload action', async () => {
        await until(() => visible(doc().querySelector('#app-loader')) && doc().querySelector('#app-loader button'), 'Visible startup error CTA');
        return { text: get('#app-loader').textContent, fault: win().__flowFault.fired };
      });
    } else if (action === 'retry') {
      await ready(); await check('I03 real reload after one-shot fault returns to app', async () => {
        assert(!visible(doc().querySelector('#app-loader')), 'Loader persists'); return { tasks: (await services.db.dbGetAll('tasks')).length };
      });
    }
    if (action !== 'startup') assert(!win().__questNoteOnboardingTest.errors.length, win().__questNoteOnboardingTest.errors.join('\n'));
    show('passed');
  } catch (error) { show('failed', error.stack); }
  finally { document.querySelectorAll('[data-run]').forEach((control) => { control.disabled = false; }); }
}));
