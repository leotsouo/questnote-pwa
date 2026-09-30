/** Runs only on the dedicated fresh ephemeral server. No production access. */
const output = document.getElementById('results');
const results = [];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (value, message) => { if (!value) throw Error(message); };
const publish = (running = true) => { output.textContent = JSON.stringify({ running, results }, null, 2); };
async function until(check, label) {
  const end = Date.now() + 45000;
  while (Date.now() < end) { if (await check()) return; await wait(100); }
  throw Error('Timed out: ' + label);
}
let config;
let frame;
async function open(name) {
  frame = document.createElement('iframe'); frame.style.cssText = 'width:393px;height:852px';
  frame.src = config.profiles[name].scopePath; document.getElementById('clients').append(frame);
  await until(() => frame.contentWindow?.runAppHealthCheck && !frame.contentDocument.getElementById('app-loader'), name + ' boot');
  assert(frame.contentWindow.navigator.serviceWorker.controller.scriptURL.includes(config.profiles[name].artifactId), 'Wrong active worker');
  frame.contentDocument.querySelector('[data-onboarding-action="skip"]')?.click();
  await wait(500);
  results.push({ name: name + ' actual controlled app boot', ok: true, artifact: config.profiles[name].artifactId }); publish();
}
async function snapshot() {
  const db = await frame.contentWindow.eval('import("/questnote-pwa/src/db.js")');
  const state = await db.readAllStoresSnapshot();
  // Every startup polls the unchanged network-first mailbox. Its fetch timestamp
  // is expected to advance; keep read/claimed IDs and every other field exact.
  for (const row of state.meta) if (row.key === 'globalMailboxState') delete row.lastFetchedAt;
  // Compare all persistent rows, including reminders, rewards, pets and preferences.
  const stable = (value) => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])])) : value;
  return JSON.stringify(stable(state));
}
async function transition(name) {
  const response = await fetch('./switch', { method: 'POST', headers: { 'X-Test-Token': config.token }, body: name });
  assert(response.ok, 'Server generation switch failed');
  const desired = config.profiles[name];
  const registration = await navigator.serviceWorker.register(desired.scopePath + 'service-worker.js?artifact=' + desired.artifactId, { scope: desired.scopePath, updateViaCache: 'none' });
  await until(() => registration.waiting?.state === 'installed', name + ' verified waiting worker');
  assert(frame.contentWindow.navigator.serviceWorker.controller.scriptURL !== registration.waiting.scriptURL, 'Active client was interrupted');
  frame.remove(); frame = null;
  await until(() => registration.active?.scriptURL.includes(desired.artifactId) && registration.active.state === 'activated', name + ' natural activation');
  await open(name);
}
try {
  assert(location.hostname === '127.0.0.1' && location.pathname === '/test/', 'Dedicated loopback required');
  assert((await indexedDB.databases()).length === 0 && (await navigator.serviceWorker.getRegistrations()).length === 0 && (await caches.keys()).length === 0, 'Unknown storage: refusing fixture writes');
  config = await (await fetch('./config')).json(); assert(config.origin === location.origin, 'Wrong test marker');
  await open('old');
  const db = await frame.contentWindow.eval('import("/questnote-pwa/src/db.js")');
  const task = await frame.contentWindow.eval('import("/questnote-pwa/src/taskService.js")');
  const habit = await frame.contentWindow.eval('import("/questnote-pwa/src/habitService.js")');
  const collection = await frame.contentWindow.eval('import("/questnote-pwa/src/collectionService.js")');
  const prefs = await frame.contentWindow.eval('import("/questnote-pwa/src/preferencesService.js")');
  const created = await task.createTask({ content: 'UI 退版測試：保留任務與完成獎勵旗標' });
  await task.toggleTaskComplete(created.id);
  await habit.createHabit({ name: 'UI 退版測試', description: '晚上帶 🐕 散步', frequency: 'daily' });
  await collection.addPetToCollection('pet_n01'); await collection.setCompanion('pet_n01');
  await prefs.setTheme('twilight');
  await db.dbPut(db.STORES.META, { key: 'dailyReminder', enabled: false, revision: 4, settings: { time: '19:30', timeZone: 'Asia/Taipei', tasks: true, habits: true, weekly: true, overdue: false, showTitles: false }, dirty: false });
  await db.dbPut(db.STORES.META, { key: 'designRollbackProbe', wallet: { stardust: 123, adventureEnergy: 7 }, completedRewardClaimed: true });
  // Reopen the baseline so comparison includes normal initialization after seeding.
  frame.remove(); await open('old');
  const baseline = await snapshot();
  await transition('new');
  const upgraded = await snapshot();
  if (upgraded !== baseline) {
    const before = JSON.parse(baseline); const after = JSON.parse(upgraded);
    results.push({ name: 'store diff', before, after });
  }
  assert(upgraded === baseline, 'Upgrade altered persistent rows');
  assert(frame.contentDocument.body.dataset.theme === 'twilight', 'Upgrade lost theme preference');
  assert(frame.contentDocument.querySelector('.qn-brand-mark'), 'New design missing');
  results.push({ name: 'V3.4.29 → V3.4.30 preserves all persistent data and theme (only mailbox fetch time excluded)', ok: true }); publish();
  await transition('old');
  assert(await snapshot() === baseline, 'Rollback altered persistent rows');
  assert(frame.contentDocument.body.dataset.theme === 'twilight', 'Rollback lost theme preference');
  assert(!frame.contentDocument.querySelector('.qn-brand-mark'), 'Old presentation was not restored');
  results.push({ name: 'V3.4.30 → V3.4.29 restores old design and preserves all persistent data (only mailbox fetch time excluded)', ok: true });
} catch (error) { results.push({ name: 'acceptance', ok: false, error: error.stack || error.message }); }
publish(false);
document.title = results.every((result) => result.ok) ? 'PASS — Design rollback' : 'FAIL — Design rollback';
