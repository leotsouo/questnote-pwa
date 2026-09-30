/** Native SW install, cached full-app reload, and gift writes on a random test DB. */
const frame = document.getElementById('preview');
const output = document.getElementById('results');
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const win = () => frame.contentWindow;
const doc = () => frame.contentDocument;
let marker;
let services;
let ui;
async function until(predicate, message) {
  for (let attempt = 0; attempt < 300; attempt += 1) { if (await predicate()) return; await wait(100); }
  throw new Error(`Timed out: ${message}`);
}
async function loadApp() {
  win().__questNoteOnboardingTest?.close();
  const loaded = new Promise((resolve) => { frame.onload = resolve; });
  frame.src = `/index.html?workshop-offline=${marker.instance}&t=${Date.now()}`;
  await loaded;
  assert(win().__questNoteOnboardingTest?.databaseName === marker.databaseName, 'DB isolation missing');
  await until(() => doc().querySelector('#task-view-content')?.children.length
    && !doc().querySelector('#app-loader')?.getClientRects().length, 'app ready');
  await until(() => doc().querySelector('#guide-tutorial-status')?.textContent, 'startup teaching initialized');
  const skip = doc().querySelector('.onboarding-dialog [data-onboarding-action="skip"]');
  if (skip) { skip.click(); await until(() => !doc().querySelector('.onboarding-dialog'), 'welcome dismissed'); }
  services = Object.fromEntries(await Promise.all(['workshopService', 'collectionService'].map(async (name) =>
    [name, await win().eval(`import('${location.origin}/src/${name}.js')`)])));
  ui = await win().eval(`import('${location.origin}/src/ui.js')`);
}
document.getElementById('run').addEventListener('click', async (event) => {
  event.target.disabled = true;
  try {
    assert(['127.0.0.1', 'localhost'].includes(location.hostname), 'Localhost only');
    marker = await (await fetch('/__onboarding_test_guard__')).json();
    assert(marker.purpose === 'questnote-onboarding-synthetic-only', 'Dedicated test server required');
    assert(!(await indexedDB.databases()).length && !(await caches.keys()).length
      && !(await navigator.serviceWorker.getRegistrations()).length, 'Fresh origin required');
    output.textContent = 'Installing actual service worker and seeding isolated fixtures…';
    await loadApp();
    await services.collectionService.addPetToCollection('pet_n04');
    await services.workshopService.importInventory({ items: { item_fire_meat: 1 }, itemUsageLogs: {} });
    output.textContent = 'Fixture seeded; waiting for native worker activation…';
    const registration = await Promise.race([(async () => {
      await navigator.serviceWorker.register('/service-worker.js?v=3433', { updateViaCache: 'none' });
      return navigator.serviceWorker.ready;
    })(), wait(30000).then(() => { throw new Error('Native worker registration/activation timed out'); })]);
    assert(registration.active, 'No active worker');
    const { CACHE_NAME } = await win().eval(`import('${location.origin}/src/version.js')`);
    const cache = await caches.open(CACHE_NAME);
    for (const path of ['src/workshopGiftView.js', 'src/workshopService.js', 'data/gift-affinities.json', 'data/craftables.json']) {
      assert((await cache.match(new URL(path, location.origin + '/')))?.ok, `Offline asset missing: ${path}`);
    }
    await loadApp();
    assert(win().navigator.serviceWorker.controller, 'Reload must be worker-controlled');
    const control = await fetch('/__workshop_offline_control__', { method: 'POST' });
    assert(control.ok, 'Offline control failed; start server with --workshop-offline');
    output.textContent = 'Origin now returns 503 for app files. Reloading full application from cache…';
    await loadApp();
    assert(win().navigator.serviceWorker.controller, 'Offline app lost its worker');
    await ui.openTeachingTarget({ view: 'workshop', tab: 'gift' });
    doc().querySelector('[data-action="select-gift-item"][data-item-id="item_fire_meat"]').click();
    const partner = doc().querySelector('[data-action="select-gift-pet"][data-pet-id="pet_n04"]');
    assert(partner?.textContent.includes('喜歡火系禮物'), 'Offline affinity recommendation missing');
    partner.click();
    assert(doc().querySelector('.workshop-gift-preview')?.textContent.includes('+150'), 'Offline preview wrong');
    doc().querySelector('[data-action="gift-item"]').click();
    await until(async () => (await services.workshopService.getInventory()).items.item_fire_meat === 0, 'offline gift committed');
    await until(() => doc().querySelector('.workshop-gift-status')?.textContent.includes('+150'), 'offline UI refreshed');
    assert((await services.collectionService.getPetCollection('pet_n04')).bondExp === 150, 'Offline gain wrong');
    assert(!win().__questNoteOnboardingTest.errors.length, win().__questNoteOnboardingTest.errors.join('\n'));
    output.textContent = JSON.stringify({ status: 'PASS', database: marker.databaseName,
      actualWorker: registration.active.scriptURL, cache: CACHE_NAME,
      checks: ['required gift assets precached', 'full app reload with origin unavailable',
        'affinity recommendation and +150 preview offline', 'offline gift persisted once', 'last-stock success retained'] }, null, 2);
  } catch (error) { output.textContent = JSON.stringify({ status: 'FAIL', error: error.stack }, null, 2); }
});
