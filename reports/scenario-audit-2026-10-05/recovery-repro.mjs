/** Read-only controlled orchestration audit. No browser or live IndexedDB.
 * Actual current source functions are evaluated with in-memory API boundaries.
 * Delayed puts model a still-pending write; consecutive Date.now IDs model two
 * distinct milliseconds, rather than asserting all double clicks collide.
 * Injected failures establish conditional outcomes, not production frequency.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const ui = fs.readFileSync(new URL('../../src/ui.js', import.meta.url), 'utf8');
const habitSource = fs.readFileSync(new URL('../../src/habitService.js', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
assert.ok(!/^import /m.test(habitSource), 'Import stripping must cover the current service');
const start = ui.indexOf("  document.getElementById('habit-form')?.addEventListener('submit'");
assert.ok(start >= 0, 'Expected habit submit registration must exist');
const end = ui.indexOf('\n}', start);
assert.ok(end > start, 'Expected openHabitForm boundary must exist');
const registration = ui.slice(start, end);
assert.match(registration, /await createHabit\(payload\)/);
assert.ok(registration.trimEnd().endsWith('}));'), 'Extract precisely the submit registration');

const rows = new Map();
let clock = 1791158400000;
class TestDate extends Date { static now() { return clock++; } }
const ctx = vm.createContext({ Date: TestDate, console, STORES: { HABITS: 'habits' },
  putWithAwakeningProgress: async (_store, row) => {
    await new Promise((resolve) => setTimeout(resolve, 20));
    rows.set(row.id, structuredClone(row));
  } });
vm.runInContext(habitSource, ctx);
let handler;
let errorFeedback = 0;
const nodes = {
  'habit-name': { value: '每天讀書' }, 'habit-desc': { value: '三頁' },
  'habit-category': { value: 'general' }, 'habit-frequency': { value: 'daily' },
  'habit-target': { value: '3' }, 'habit-form-error': { hidden: true },
  'habit-form': { addEventListener: (event, fn) => {
    assert.equal(event, 'submit'); handler = fn;
  } },
};
Object.assign(ctx, { document: { getElementById: (id) => nodes[id] },
  trackUpdateActivity: (fn) => fn, isEdit: false,
  closeModal: () => {}, onRefresh: async () => {}, renderHabitsView: () => {},
  showToast: (_message, type) => { if (type === 'error') errorFeedback++; },
  handleAchievementCheckAfterAction: async () => {} });
vm.runInContext(registration, ctx);
assert.equal(typeof handler, 'function');
const event = { preventDefault() {}, currentTarget: nodes['habit-form'] };
await Promise.all([handler(event), handler(event)]);
assert.equal(rows.size, 2);
assert.deepEqual([...rows.values()].map((row) => row.name), ['每天讀書', '每天讀書']);
console.log('PASS: actual habit submit callback + actual createHabit produce two distinct stored rows while the first write remains pending.', [...rows.keys()]);

ctx.putWithAwakeningProgress = async () => { throw new Error('Synthetic storage write failed'); };
await assert.rejects(handler(event), /Synthetic storage write failed/);
assert.equal(nodes['habit-form-error'].hidden, true);
assert.equal(errorFeedback, 0);
console.log('PASS: injected persistence rejection escapes actual habit handler without inline/toast error feedback.');

const workshop = fs.readFileSync(new URL('../../src/workshopService.js', import.meta.url), 'utf8')
  .replace(/import[\s\S]*?from '[^']+';\r?\n/g, '').replace(/^export /gm, '');
assert.ok(!/^import /m.test(workshop), 'Import stripping must cover multiline imports');
assert.match(workshop, /async function craftItem\(/);
assert.match(workshop, /await spendMaterials\(scaledRecipe\)/);
assert.match(workshop, /await saveInventory\(inventory\)/);
let materials = 4;
const inventory = { key: 'inventory', items: {}, itemUsageLogs: {} };
let debitCalls = 0;
let inventoryWrites = 0;
const craftContext = vm.createContext({ console, Date, STORES: { META: 'meta' },
  getWallet: async () => ({ materials: { leaf: materials } }),
  spendMaterials: async (recipe) => { debitCalls++; materials -= recipe.leaf; },
  dbGet: async (_store, key) => key === 'inventory' ? structuredClone(inventory) : null,
  dbPut: async (_store, row) => {
    if (row.key === 'inventory') {
      inventoryWrites++;
      throw new Error('Synthetic inventory persistence failure');
    }
  } });
vm.runInContext(workshop, craftContext);
vm.runInContext("craftableById = new Map([['synthetic_food', { id: 'synthetic_food', name: 'test food', enabled: true, recipe: { leaf: 2 } }]]);", craftContext);
await assert.rejects(vm.runInContext("craftItem('synthetic_food', 1)", craftContext), /Synthetic inventory persistence failure/);
assert.equal(debitCalls, 1);
assert.equal(inventoryWrites, 1);
assert.equal(materials, 2);
assert.equal(inventory.items.synthetic_food, undefined);
console.log('PASS: actual craftItem orchestration leaves completed material debit after injected inventory write rejection; initial materials 4, final 2, no stored food.');
console.log('LIMIT: API boundaries are stubs. No native storage failure, OS termination, browser interaction, live IndexedDB, or production occurrence rate was tested.');
