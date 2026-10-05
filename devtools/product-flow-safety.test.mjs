/** Focused actual-source orchestration checks. DOM and persistence boundaries are
 * in memory; native IndexedDB, complete boot and UX require browser verification.
 * Run: node devtools/product-flow-safety.test.mjs [I01|I06|I03|I07]
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { escapeHtml } from '../src/uiHelpers.js';

const ui = fs.readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const requested = process.argv[2];
if (requested && !['I01', 'I06', 'I03', 'I07'].includes(requested)) {
  throw new Error('Subset must be a positional I01, I06, I03 or I07; omit it to run all checks.');
}
const quietConsole = { error() {}, warn() {}, log() {} };
let checks = 0;
function check(label, fn) {
  return Promise.resolve().then(fn).then(() => {
    checks++;
    console.log(`PASS ${label}`);
  });
}
function sourceFunction(source, name) {
  const expression = new RegExp(`^(?:export )?(?:async )?function ${name}\\(`, 'm');
  const start = source.search(expression);
  assert.notEqual(start, -1, `Actual ${name} declaration exists`);
  const remaining = source.slice(start);
  const end = remaining.indexOf('\n}');
  assert.notEqual(end, -1, `${name} has top-level closing brace`);
  return remaining.slice(0, end + 2).replace(/^export /, '');
}
function node(value = '') {
  const listeners = new Map();
  return {
    value, hidden: false, disabled: false, textContent: '', innerHTML: '', dataset: {},
    children: [], isConnected: true, focused: false, attributes: {}, listeners,
    addEventListener(type, fn) { listeners.set(type, fn); },
    setAttribute(key, val) { this.attributes[key] = String(val); },
    removeAttribute(key) { delete this.attributes[key]; },
    appendChild(child) { this.children.push(child); child.isConnected = true; return child; },
    append(...children) { children.forEach((child) => this.appendChild(child)); },
    replaceChildren(...children) { this.children = []; this.append(...children); },
    remove() { this.isConnected = false; },
    focus() { this.focused = true; },
    click() { return listeners.get('click')?.({ preventDefault() {} }); },
  };
}
function habitHarness({ edit = false, save, refresh = async () => {} } = {}) {
  const ids = {
    'habit-name': node('讀書'), 'habit-desc': node('三頁'),
    'habit-category': node('general'), 'habit-frequency': node('daily'),
    'habit-target': node('3'), 'habit-target-wrap': node(),
    'habit-form-error': Object.assign(node(), { hidden: true }),
    'habit-form-cancel': node(), 'habit-form': node(),
  };
  const submit = node();
  submit.textContent = edit ? '儲存' : '建立';
  ids['habit-form'].querySelector = (selector) => selector.includes('submit') ? submit : null;
  let writes = 0;
  let closeCount = 0;
  let lastPayload;
  const toasts = [];
  const ctx = vm.createContext({ console: quietConsole,
    state: { categories: [{ id: 'general', name: '一般' }],
      habits: edit ? [{ id: 'existing', name: '讀書', frequency: 'daily' }] : [] },
    document: { getElementById: (id) => ids[id] },
    escapeHtml, openModal() {},
    trackUpdateActivity: (fn) => fn,
    createHabit: async (payload) => { assert.equal(edit, false); writes++; lastPayload = payload; return save?.(payload) ?? { success: true }; },
    updateHabit: async (id, payload) => { assert.equal(id, 'existing'); writes++; lastPayload = payload; return save?.(payload) ?? { success: true }; },
    closeModal: () => { closeCount++; }, onRefresh: refresh, renderHabitsView() {},
    showToast: (message, type) => toasts.push({ message, type }),
    handleAchievementCheckAfterAction: async () => {},
  });
  vm.runInContext(sourceFunction(ui, 'openHabitForm'), ctx);
  ctx.openHabitForm(edit ? 'existing' : null);
  const handler = ids['habit-form'].listeners.get('submit');
  assert.equal(typeof handler, 'function');
  const send = () => handler({ preventDefault() {}, currentTarget: ids['habit-form'] });
  return { ids, submit, send, toasts, writes: () => writes,
    closes: () => closeCount, payload: () => lastPayload };
}

if (!requested || requested === 'I01') {
  await check('I01 delayed double submit writes once and Cancel cannot dismiss pending save', async () => {
    let resolve;
    const saving = new Promise((done) => { resolve = done; });
    const h = habitHarness({ save: () => saving });
    const first = h.send();
    assert.equal(h.submit.disabled, true);
    assert.equal(h.ids['habit-form-cancel'].disabled, true);
    await h.send();
    await h.ids['habit-form-cancel'].click();
    assert.equal(h.writes(), 1);
    assert.equal(h.closes(), 0);
    resolve({ success: true });
    await first;
    assert.equal(h.closes(), 1);
  });
  await check('I01 rejected write preserves input and permits one corrected retry', async () => {
    let failed = true;
    const h = habitHarness({ save: async () => {
      if (failed) throw new Error('Injected storage failure');
      return { success: true };
    } });
    await h.send();
    assert.equal(h.closes(), 0);
    assert.equal(h.ids['habit-name'].value, '讀書');
    assert.equal(h.ids['habit-desc'].value, '三頁');
    assert.equal(h.ids['habit-form-error'].hidden, false);
    assert.ok(h.ids['habit-form-error'].textContent.length > 0);
    assert.equal(h.submit.disabled, false);
    assert.equal(h.ids['habit-form-cancel'].disabled, false);
    failed = false;
    await h.send();
    assert.equal(h.writes(), 2);
    assert.equal(h.closes(), 1);
  });
  await check('I01 service validation failure stays editable and editing uses existing identity', async () => {
    let valid = false;
    const h = habitHarness({ edit: true, save: async () => valid
      ? { success: true } : { success: false, error: '請輸入習慣名稱' } });
    await h.send();
    assert.equal(h.closes(), 0);
    assert.equal(h.ids['habit-form-error'].textContent, '請輸入習慣名稱');
    assert.equal(h.submit.disabled, false);
    h.ids['habit-name'].value = '  改名  ';
    valid = true;
    await h.send();
    assert.equal(h.payload().name, '改名');
    assert.equal(h.closes(), 1);
  });
  await check('I01 refresh failure after committed save gives honest feedback and cannot recreate', async () => {
    const h = habitHarness({ refresh: async () => { throw new Error('Injected refresh failure'); } });
    await h.send();
    assert.equal(h.writes(), 1);
    assert.equal(h.closes(), 1);
    assert.ok(h.toasts.some(({ message }) => /已.*(儲存|保存|建立|更新)/.test(message)));
    assert.ok(h.toasts.some(({ message }) => /重新整理|重新載入/.test(message)));
    await h.send();
    assert.equal(h.writes(), 1);
  });
  await check('I01 Cancel outside pending state remains a single-step exit', async () => {
    const h = habitHarness();
    await h.ids['habit-form-cancel'].click();
    assert.equal(h.closes(), 1);
    assert.equal(h.writes(), 0);
  });
  await check('I01 modal Close, backdrop and Escape respect pending habit save without changing task protection', () => {
    const overlay = node();
    const close = node();
    const keyboard = new Map();
    const forms = {
      'habit-form': { dataset: { saving: 'true' } },
      'task-form': { dataset: { saving: 'false' } },
    };
    overlay.querySelector = (selector) => {
      for (const part of selector.split(',')) {
        const match = part.trim().match(/^#([\w-]+)\[data-([\w-]+)="([^"]+)"\]$/);
        if (match && forms[match[1]]?.dataset[match[2]] === match[3]) return forms[match[1]];
      }
      return null;
    };
    let exits = 0;
    const ctx = vm.createContext({ document: {
      getElementById: (id) => id === 'modal-overlay' ? overlay : id === 'modal-close' ? close : null,
      addEventListener: (event, handler) => keyboard.set(event, handler),
    }, bindDialogFocus() {}, isTopDialog: () => true, isSeniorMode: () => false,
    closeModal: () => { exits++; },
    });
    vm.runInContext(`${sourceFunction(ui, 'dismissModal')}\n${sourceFunction(ui, 'bindModals')}`, ctx);
    ctx.bindModals();
    const escape = () => keyboard.get('keydown')({ key: 'Escape', preventDefault() {}, stopImmediatePropagation() {} });
    close.click();
    overlay.listeners.get('click')({ target: { id: 'modal-overlay' } });
    escape();
    assert.equal(exits, 0);
    forms['habit-form'].dataset.saving = 'false';
    forms['task-form'].dataset.saving = 'true';
    escape();
    assert.equal(exits, 0);
    forms['task-form'].dataset.saving = 'false';
    escape();
    assert.equal(exits, 1);
  });
}

if (!requested || requested === 'I06') {
  await check('I06 actual rendered subtask control communicates next action, state and escaped identity', () => {
    const ctx = vm.createContext({ state: { categories: [] },
      expandedTaskIds: new Set(['task']), recentlyCompletedTaskIds: new Set(),
      getTodayDateString: () => '2026-10-05', calculateRewardAmount: () => 1,
      calculateAdventureEnergyAmount: () => 1, getCategoryById: () => ({}),
      getDateBadgeClass: () => '', formatDateBadgeText: () => '',
      isInTodayPlan: () => true, getSubtaskProgress: (task) => ({ total: task.subtasks.length,
        done: task.subtasks.filter((s) => s.completed).length, percent: 0 }),
      escapeHtml,
      twilightIcon: () => '', isSeniorMode: () => false, formatCategoryLabel: () => '一般',
      PRIORITY_LABELS: {},
    });
    vm.runInContext(sourceFunction(ui, 'renderTaskCard'), ctx);
    const task = { id: 'task', priority: 'normal', content: '讀書', title: '讀書',
      subtasks: [{ id: 'subtask', text: '閱讀 "A" <B>', completed: false }] };
    const html = () => ctx.renderTaskCard(task);
    const control = (markup) => markup.match(/<button[^>]*data-action="toggle-subtask"[^>]*>/)?.[0];
    assert.match(control(html()), /aria-pressed="false"/);
    assert.match(control(html()), /aria-label="完成[^\"]*閱讀 &quot;A&quot; &lt;B&gt;/);
    task.subtasks[0].completed = true;
    assert.match(control(html()), /aria-pressed="true"/);
    assert.match(control(html()), /aria-label="取消完成[^\"]*閱讀 &quot;A&quot; &lt;B&gt;/);
    task.subtasks = [];
    assert.equal(control(html()), undefined);
    ctx.isSeniorMode = () => true;
    task.subtasks = [{ id: 'subtask', text: '閱讀', completed: true }];
    assert.match(control(html()), /aria-pressed="true"/);
  });
}

if (!requested || requested === 'I03') {
  await check('I03 startup failure remains visible even when fallback UI initialization also fails', async () => {
    const loader = node();
    const body = node();
    let reloads = 0;
    const ctx = vm.createContext({ console: quietConsole, appState: {},
      document: { getElementById: (id) => id === 'app-loader' ? loader : null,
        body, createElement: () => node() },
      window: { location: { reload: () => { reloads++; } } },
      location: { reload: () => { reloads++; } },
      openDB: async () => { throw new Error('Injected private internal failure'); },
      initUI: () => { throw new Error('Injected fallback failure'); },
      refreshState() {}, runAchievementCheck() {},
    });
    vm.runInContext(sourceFunction(app, 'initApp'), ctx);
    await ctx.initApp();
    assert.equal(loader.isConnected, true);
    assert.equal(loader.attributes.role, 'alert');
    const text = [loader.textContent, loader.innerHTML,
      ...loader.children.map((child) => child.textContent)].join(' ');
    assert.match(text, /載入.*(失敗|未完成)/);
    assert.doesNotMatch(text, /private internal failure/);
    const retry = loader.children.find((child) => child.listeners.has('click'));
    assert.ok(retry, 'Visible retry is connected to a reload action');
    assert.equal(retry.type, 'button');
    assert.equal(retry.focused, true, 'Keyboard focus exposes the recovery action');
    await retry.click();
    assert.equal(reloads, 1);
  });
  await check('I03 success path still removes its loader using actual hideLoader closure', () => {
    const loader = node();
    const declaration = app.match(/const hideLoader = [^;]+;/)?.[0];
    assert.ok(declaration);
    vm.runInNewContext(`${declaration}\nhideLoader();`, { loader });
    assert.equal(loader.isConnected, false);
  });
}

if (!requested || requested === 'I07') {
  for (const failAt of ['restore', 'refresh']) {
    await check(`I07 ${failAt} failure reports neutral consistent recovery instructions`, async () => {
      const errors = [];
      const toasts = [];
      const visibility = new Map();
      let writes = 0;
      const ctx = vm.createContext({ console: quietConsole, pendingImportBackup: { marker: 'fixture' }, state: {},
        setImportElementHidden: (id, hidden) => visibility.set(id, hidden),
        restoreBackup: async () => { if (failAt === 'restore') throw new Error('Injected precommit failure'); writes++; },
        dismissOnboardingAfterRestore: async () => {},
        onRefresh: async () => { if (failAt === 'refresh') throw new Error('Injected postcommit failure'); },
        applyTheme: async () => {}, applyReduceMotionClass() {},
        handleAchievementCheckAfterAction: async () => {},
        showImportError: (message) => errors.push(message),
        showToast: (message, type) => toasts.push({ message, type }),
      });
      vm.runInContext(sourceFunction(ui, 'executeRestoreBackup'), ctx);
      await ctx.executeRestoreBackup();
      assert.equal(writes, failAt === 'restore' ? 0 : 1);
      assert.equal(errors.length, 1);
      const toast = toasts.find((item) => item.type === 'error');
      assert.equal(errors[0], toast.message);
      assert.match(errors[0], /重新整理|重新載入/);
      assert.match(errors[0], /檢查|確認/);
      assert.doesNotMatch(errors[0], /未完整寫入|檔.*(錯誤|正確)/);
      assert.equal(visibility.get('import-restoring-hint'), true);
      assert.equal(visibility.get('btn-import-select'), false);
    });
  }
  await check('I07 successful restore still shows success panel and does not show error', async () => {
    const errors = [];
    const visibility = new Map();
    const ctx = vm.createContext({ console: quietConsole, pendingImportBackup: {}, state: {},
      setImportElementHidden: (id, hidden) => visibility.set(id, hidden),
      restoreBackup: async () => {}, dismissOnboardingAfterRestore: async () => {},
      onRefresh: async () => {}, applyTheme: async () => {}, applyReduceMotionClass() {},
      handleAchievementCheckAfterAction: async () => {}, showImportError: (message) => errors.push(message), showToast() {},
    });
    vm.runInContext(sourceFunction(ui, 'executeRestoreBackup'), ctx);
    await ctx.executeRestoreBackup();
    assert.equal(visibility.get('import-success-panel'), false);
    assert.equal(visibility.get('import-restoring-hint'), true);
    assert.equal(errors.length, 0);
  });
}
console.log(`RESULT ${checks} focused checks passed. Boundaries use mocks; browser scenarios verify native flow.`);
