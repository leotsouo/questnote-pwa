/** Real DOM regression flows on a server-owned synthetic database only. */
const frame = document.getElementById('preview');
const output = document.getElementById('results');
const runButton = document.getElementById('run');
const cleanupButton = document.getElementById('cleanup');
const results = [];
let marker;
let services;
let owned = false;
const win = () => frame.contentWindow;
const doc = () => frame.contentDocument;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (value, message) => { if (!value) throw new Error(message); };
const get = (selector) => { const element = doc().querySelector(selector); assert(element, `Missing: ${selector}`); return element; };
const record = () => services.db.dbGet('meta', 'onboardingV1');
const visible = (element) => Boolean(element?.getClientRects().length) && win().getComputedStyle(element).visibility !== 'hidden';
async function until(predicate, label, timeout = 12000) {
  const start = performance.now();
  while (performance.now() - start < timeout) { if (await predicate()) return; await wait(50); }
  throw new Error(`Timed out: ${label}`);
}
async function click(selector) {
  const target = typeof selector === 'string' ? get(selector) : selector;
  assert(visible(target) && !target.disabled, `Hidden or disabled: ${selector}`);
  target.scrollIntoView({ block: 'center', behavior: 'instant' });
  target.click();
  await wait(160);
}
const action = (name) => click(`[data-onboarding-action="${name}"]`);
async function check(name, run) {
  const result = { name, ok: false };
  try { result.detail = await run(); result.ok = true; } catch (error) { result.error = error.stack; }
  results.push(result);
  output.textContent = JSON.stringify({ status: 'running', database: marker.databaseName, results }, null, 2);
  assert(result.ok, `Failed: ${name}`);
}
async function guard() {
  assert(['localhost', '127.0.0.1'].includes(location.hostname), 'Localhost only');
  const response = await fetch('/__onboarding_test_guard__', { cache: 'no-store' });
  assert(response.ok, 'Start the dedicated onboarding-browser-server.mjs');
  const current = await response.json();
  assert(current.purpose === 'questnote-onboarding-synthetic-only'
    && /^QuestNoteTest-Onboarding-[a-f0-9-]{36}$/.test(current.databaseName), 'Invalid isolation marker');
  assert(!navigator.serviceWorker.controller && !(await navigator.serviceWorker.getRegistrations()).length, 'Fresh origin without SW required');
  const databases = await indexedDB.databases();
  assert(!databases.length || (owned && marker?.instance === current.instance
    && databases.every((db) => db.name === current.databaseName)), 'Unknown database: refusing to write');
  marker = current;
}
async function loadApp() {
  await guard();
  if (win().__questNoteOnboardingTest) {
    assert(!win().__questNoteOnboardingTest.errors.length, 'App runtime error: ' + win().__questNoteOnboardingTest.errors.join('\n'));
    win().__questNoteOnboardingTest.close();
  }
  const loaded = new Promise((resolve) => { frame.onload = resolve; });
  frame.src = `/index.html?acceptance=${marker.instance}&reload=${Date.now()}`;
  await loaded;
  assert(win().__questNoteOnboardingTest?.databaseName === marker.databaseName, 'DB guard must precede app');
  owned = true;
  cleanupButton.disabled = false;
  await until(() => doc().querySelector('#task-view-content')?.children.length && !visible(doc().querySelector('#app-loader')), 'App ready', 25000);
  services = Object.fromEntries(await Promise.all(['db', 'collectionService', 'rewardService', 'workshopService',
    'expeditionService', 'backupService'].map(async (name) => [name, await win().eval(`import('/src/${name}.js')`)])));
  assert((await services.db.openDB()).name === marker.databaseName, 'Only synthetic DB allowed');
  await wait(100);
}
async function guide() {
  await click('.bottom-nav [data-view="more"]');
  await click('#view-more [data-goto="guide"]');
}
async function chapter(id, step = 0) {
  await guide();
  await action(`lesson:${id}`);
  for (let index = 0; index < step; index++) await action('lesson-next');
}
async function closeSummary() { await action('lesson-close'); }
async function businessState() {
  const { tasks, collection, expeditions, habits, meta } = await services.db.readAllStoresSnapshot();
  return JSON.stringify({ tasks, collection, expeditions, habits,
    meta: meta.filter((item) => ['wallet', 'inventory', 'gachaStats', 'workshopStats'].includes(item.key)) });
}
function geometry() {
  const width = doc().documentElement.clientWidth;
  assert(doc().documentElement.scrollWidth <= width + 1, 'Horizontal overflow');
  const coach = doc().querySelector('.onboarding-dock');
  if (coach) {
    const box = coach.getBoundingClientRect();
    assert(box.left >= 0 && box.right <= win().innerWidth && box.top >= 0, 'Coach outside viewport');
    assert(box.bottom <= get('.bottom-nav').getBoundingClientRect().top, 'Coach covers navigation');
  }
  return { width: win().innerWidth, height: win().innerHeight };
}
runButton.addEventListener('click', async () => {
  runButton.disabled = true;
  try {
    await loadApp();
    await check('fresh profile shows welcome; skip persists and creates no tasks/rewards', async () => {
      assert(visible(get('[data-onboarding-action="start"]')), 'Welcome missing');
      const before = await businessState();
      await action('skip');
      assert(await businessState() === before, 'Skip changed business state');
      await loadApp();
      assert(!doc().querySelector('[data-onboarding-action="start"]'), 'Welcome repeated');
    });
    await check('resource-free reading completes as understood without rewards or resource changes', async () => {
      const before = await businessState();
      for (const id of ['stars', 'bond', 'expedition', 'workshop']) {
        await chapter(id);
        for (let step = 0; step < 3; step++) {
          await action('lesson-locate'); geometry();
          await action('lesson-next');
        }
        assert((await record()).lessons[id].status === 'understood', `Wrong status: ${id}`);
        await closeSummary();
      }
      assert(await businessState() === before, 'Reading changed currency, tasks or pets');
    });
    await check('pause, reload and resume keep chapter position and collapse is keyboard reachable', async () => {
      await chapter('workshop', 1);
      await action('collapse');
      assert(get('[data-onboarding-action="collapse"]').getAttribute('aria-expanded') === 'false', 'Collapse failed');
      await action('lesson-pause');
      await loadApp();
      assert(!doc().querySelector('.onboarding-dock'), 'Paused coach reopened');
      await chapter('workshop');
      assert((await record()).lessons.workshop.step === 'craft', 'Resume lost step');
      await action('lesson-pause');
    });
    // Synthetic prerequisites are seeded only after the isolated DB guard passed.
    const pets = (await (await fetch('/data/pets.json')).json()).pets;
    const pet = pets.find((item) => item.rarity === 'N');
    await services.collectionService.addPetToCollection(pet.id);
    await services.collectionService.addFragments(pet.id, 5);
    await services.collectionService.setCompanion(pet.id);
    await services.rewardService.addAdventureEnergy(3);
    await services.rewardService.addMaterial('forest_leaf', 2);
    await loadApp();
    await check('star upgrade confirms cost, cancel spends nothing, success records actual practice', async () => {
      await chapter('stars', 2); await action('lesson-locate');
      const selector = `.collection-card[data-pet-id="${pet.id}"] [data-action="upgrade"]`;
      await click(selector);
      assert(get('#confirm-ok').textContent.includes('5'), 'Upgrade cost missing');
      await click('#confirm-cancel');
      assert((await services.collectionService.getPetCollection(pet.id)).fragments === 5, 'Cancel spent fragments');
      await click(selector); await click('#confirm-ok');
      await until(async () => (await record()).lessons.stars.status === 'practiced', 'Star evidence');
      const entry = await services.collectionService.getPetCollection(pet.id);
      assert(entry.stars === 2 && entry.fragments === 0, 'Wrong star debit');
      await closeSummary();
    });
    await check('petting advances to unlock explanation and respects the real cooldown', async () => {
      await chapter('bond', 1); await action('lesson-locate');
      await click('[data-action="companion-pet"]');
      await until(async () => (await record()).lessons.bond.step === 'unlocks', 'Pet evidence');
      assert((await services.collectionService.getPetCollection(pet.id)).bondExp === 5, 'Wrong pet reward');
      assert(get('[data-action="companion-pet"]').disabled, 'Cooldown missing');
      await action('lesson-next');
      assert((await record()).lessons.bond.status === 'practiced', 'Bond chapter incomplete');
      await closeSummary();
    });
    await check('dispatch waits for real claim; reload keeps claim step and completed reward advances', async () => {
      await chapter('expedition', 1); await action('lesson-locate');
      await click('[data-area-id="mist_forest"] [data-action="open-dispatch"]');
      await click(`[data-action="dispatch-select-pet"][data-pet-id="${pet.id}"]`);
      await click('[data-action="dispatch-confirm"]');
      await until(async () => (await record()).lessons.expedition.step === 'claim', 'Dispatch evidence');
      assert((await services.rewardService.getWallet()).adventureEnergy === 0, 'Wrong dispatch energy');
      assert(!doc().querySelector('[data-action="claim-expedition"]'), 'Early claim allowed');
      await loadApp();
      assert((await record()).lessons.expedition.step === 'claim', 'Reload lost claim step');
      await services.expeditionService.forceCompleteActiveExpedition();
      await loadApp(); await action('lesson-locate');
      await click('[data-action="claim-expedition"]');
      await until(async () => (await record()).lessons.expedition.status === 'practiced', 'Claim evidence');
      if (get('#modal-overlay').classList.contains('open')) await click('#modal-close');
      assert(!(await services.expeditionService.getActiveExpedition()), 'Reward not claimed');
      await closeSummary();
    });
    await check('crafting spends recipe once; gifting consumes one item and completes workshop', async () => {
      // Resume the earlier craft step.
      await chapter('workshop'); await action('lesson-locate');
      const before = (await services.rewardService.getWallet()).materials.forest_leaf;
      await click('[data-action="craft-item"][data-item-id="item_small_spirit_food"][data-qty="1"]');
      await until(async () => (await record()).lessons.workshop.step === 'gift', 'Craft evidence');
      assert((await services.rewardService.getWallet()).materials.forest_leaf === before - 2, 'Wrong material debit');
      await action('lesson-locate');
      const bondBefore = (await services.collectionService.getPetCollection(pet.id)).bondExp;
      await click('[data-action="gift-item"]');
      await until(async () => (await record()).lessons.workshop.status === 'practiced', 'Gift evidence');
      assert((await services.workshopService.getInventory()).items.item_small_spirit_food === 0, 'Gift consumed wrong quantity');
      assert((await services.collectionService.getPetCollection(pet.id)).bondExp === bondBefore + 10, 'Gift bond missing');
      await closeSummary();
    });
    await check('favorite preview and daily gift cap remain accurate during tutorial navigation', async () => {
      const items = await services.workshopService.loadCraftables();
      const favorite = items.find((item) => item.id === 'item_fire_meat');
      const favoritePet = pets.find((item) => services.workshopService.getFavoriteBonus(favorite, item).isFavorite);
      assert(favoritePet, 'Favorite fixture unavailable');
      await services.collectionService.addPetToCollection(favoritePet.id);
      await services.rewardService.addInventoryItem(favorite.id, 6);
      await loadApp();
      await chapter('workshop', 2); await action('lesson-locate');
      await click(`[data-action="select-gift-pet"][data-pet-id="${favoritePet.id}"]`);
      await click(`[data-action="select-gift-item"][data-item-id="${favorite.id}"]`);
      assert(get('.workshop-gift-preview').textContent.includes('喜好加成'), 'Favorite preview missing');
      for (let index = 0; index < 5; index++) {
        await click('[data-action="gift-item"]');
        if (doc().querySelector('[data-onboarding-action="lesson-close"]')) await closeSummary();
      }
      assert(get('[data-action="gift-item"]').disabled, 'Daily gift cap not enforced');
      assert((await services.workshopService.getInventory()).items[favorite.id] === 1, 'Cap consumed extra stock');
    });
    await check('quick references open real pages; mobile and desktop layouts stay within viewport', async () => {
      await guide();
      for (const size of [[390, 844], [1280, 900], [320, 640]]) {
        frame.style.width = size[0] + 'px'; frame.style.height = size[1] + 'px'; await wait(120); geometry();
      }
      frame.style.width = '390px'; frame.style.height = '844px';
      const details = get('[data-onboarding-action="quick:habits"]').closest('details'); details.open = true;
      await action('quick:habits');
      assert(get('#view-habits').classList.contains('active'), 'Quick link did not navigate');
    });
    await check('backup excludes local lesson state; restore dismisses welcome and reset offers it again', async () => {
      const backup = await services.backupService.exportBackup();
      assert(!JSON.stringify(backup).includes('onboardingV1'), 'Teaching leaked into portable backup');
      await services.backupService.importBackup(backup);
      const controller = await win().eval("import('/src/onboardingController.js')");
      await controller.dismissOnboardingAfterRestore();
      await loadApp();
      assert(!doc().querySelector('[data-onboarding-action="start"]'), 'Restore reopened welcome');
      await click('.bottom-nav [data-view="more"]'); await click('#view-more [data-goto="settings"]');
      await click('#btn-reset'); await click('#confirm-ok'); await click('#confirm-ok');
      await until(() => doc().querySelector('[data-onboarding-action="start"]'), 'Reset welcome');
      const stored = await record();
      assert(stored.status === 'new' && Object.values(stored.lessons).every((lesson) => lesson.status === 'new'), 'Reset retained lesson progress');
      assert((await services.db.dbGetAll('tasks')).length === 0, 'Tutorial created tasks');
    });
    assert(!win().__questNoteOnboardingTest.errors.length, win().__questNoteOnboardingTest.errors.join('\n'));
    output.textContent = JSON.stringify({ status: 'passed', database: marker.databaseName, results,
      limitations: 'DOM events; trusted keyboard and visual review are separate. SW/offline are checked by the assembled release suite.' }, null, 2);
  } catch (error) {
    output.textContent = JSON.stringify({ status: 'failed', results, error: error.stack }, null, 2);
  }
});
cleanupButton.addEventListener('click', async () => {
  await guard();
  win().__questNoteOnboardingTest.close();
  const blank = new Promise((resolve) => { frame.onload = resolve; }); frame.src = 'about:blank'; await blank;
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(marker.databaseName);
    request.onsuccess = resolve; request.onerror = () => reject(request.error); request.onblocked = () => reject(new Error('Close test frame first'));
  });
  owned = false; cleanupButton.disabled = true;
  output.textContent += '\n已清除此 UUID 測試資料。';
});
