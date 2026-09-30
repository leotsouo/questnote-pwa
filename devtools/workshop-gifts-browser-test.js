/** Native IndexedDB + actual UI on the existing dedicated synthetic-only server. */
const frame = document.getElementById('preview');
const output = document.getElementById('results');
const results = [];
let marker;
let services;
let ui;
let pets;
const win = () => frame.contentWindow;
const doc = () => frame.contentDocument;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const get = (selector) => { const element = doc().querySelector(selector); assert(element, `Missing ${selector}`); return element; };
async function until(predicate, message) {
  for (let attempt = 0; attempt < 200; attempt += 1) { if (await predicate()) return; await wait(50); }
  throw new Error(`Timed out: ${message}`);
}
async function click(selector) {
  const target = get(selector);
  assert(!target.disabled && target.getClientRects().length, `Hidden or disabled ${selector}`);
  target.scrollIntoView({ block: 'center' });
  target.click();
  await wait(180);
}
async function check(name, run) {
  const result = { name, ok: false };
  try { result.detail = await run(); result.ok = true; } catch (error) { result.error = error.stack; }
  results.push(result);
  output.textContent = JSON.stringify({ status: 'running', database: marker.databaseName, results }, null, 2);
  assert(result.ok, name);
}
async function loadApp() {
  win().__questNoteOnboardingTest?.close();
  const loaded = new Promise((resolve) => { frame.onload = resolve; });
  frame.src = `/index.html?workshop-acceptance=${marker.instance}&reload=${Date.now()}`;
  await loaded;
  assert(win().__questNoteOnboardingTest?.databaseName === marker.databaseName, 'Test DB guard missing');
  await until(() => doc().querySelector('#task-view-content')?.children.length
    && !doc().querySelector('#app-loader')?.getClientRects().length, 'app ready');
  await until(() => doc().querySelector('#guide-tutorial-status')?.textContent, 'startup teaching initialized');
  const welcomeSkip = doc().querySelector('.onboarding-dialog [data-onboarding-action="skip"]');
  if (welcomeSkip) {
    welcomeSkip.click();
    await until(() => !doc().querySelector('.onboarding-dialog'), 'welcome dismissed');
  }
  services = Object.fromEntries(await Promise.all(['db', 'workshopService', 'collectionService', 'rewardService', 'preferencesService'].map(async (name) =>
    [name, await win().eval(`import('${location.origin}/src/${name}.js')`)])));
  ui = await win().eval(`import('${location.origin}/src/ui.js')`);
}
async function giftTab() { await ui.openTeachingTarget({ view: 'workshop', tab: 'gift' }); await wait(80); }
const selectItem = (id) => click(`[data-action="select-gift-item"][data-item-id="${id}"]`);
const selectPet = (id) => click(`[data-action="select-gift-pet"][data-pet-id="${id}"]`);
const stock = async (id) => (await services.workshopService.getInventory()).items[id] || 0;
async function setItems(items, itemUsageLogs = {}) {
  await services.workshopService.importInventory({ key: 'inventory', items, itemUsageLogs });
  await loadApp();
  await giftTab();
}

document.getElementById('run').addEventListener('click', async (event) => {
  event.target.disabled = true;
  try {
    assert(['localhost', '127.0.0.1'].includes(location.hostname), 'Localhost only');
    marker = await (await fetch('/__onboarding_test_guard__')).json();
    assert(marker.purpose === 'questnote-onboarding-synthetic-only', 'Dedicated server required');
    assert(!navigator.serviceWorker.controller && !(await navigator.serviceWorker.getRegistrations()).length, 'Fresh origin required');
    assert(!(await indexedDB.databases()).length, 'Existing databases: refusing fixture writes');
    await loadApp();
    pets = (await (await fetch('/data/pets.json')).json()).pets;
    for (const id of ['pet_n04', 'pet_r02', 'pet_sr04', 'pet_sp06']) await services.collectionService.addPetToCollection(id);
    await services.db.dbPut('meta', { key: 'wallet', stardust: 1000, energy: 50,
      materials: { forest_leaf: 100, lava_core: 20, machine_part: 20, star_shard: 10, aurora_ice: 20, harvest_charm: 20 } });
    await check('old inventory import preserves quantities, unknown IDs and logs while adding new defaults', async () => {
      const log = { '2026-09-30': { pet_n04: { bondItemsUsed: 2 } } };
      await services.workshopService.importInventory({ items: { item_fire_meat: 2, item_machine_biscuit: 2, legacy_unknown: 7 }, itemUsageLogs: log });
      const inventory = await services.workshopService.getInventory();
      assert(inventory.items.item_fire_meat === 2 && inventory.items.legacy_unknown === 7, 'Old inventory changed');
      assert(inventory.items.item_leaf_dumpling === 0 && inventory.itemUsageLogs['2026-09-30'].pet_n04.bondItemsUsed === 2, 'Defaults/logs lost');
    });
    await loadApp();
    await check('gift tab starts with items only; theme recommendation appears after choosing a gift', async () => {
      await giftTab();
      assert(!doc().querySelector('[data-action="select-gift-pet"]'), 'Recipient shown before choosing item');
      await selectItem('item_fire_meat');
      assert(get('[data-pet-id="pet_n04"].workshop-gift-pet').textContent.includes('喜歡火系禮物'), 'Fire recommendation missing');
      assert(get('.workshop-gift-others').textContent.includes('機械獵犬X'), 'Other recipients unavailable');
      assert(!doc().querySelector('[data-action="gift-item"]'), 'Recipient preselected');
    });
    await check('changing items clears recipient; choosing and previewing never consumes stock', async () => {
      await selectPet('pet_n04');
      assert(get('.workshop-gift-preview').textContent.includes('+150'), 'Favorite preview incorrect');
      assert(await stock('item_fire_meat') === 2, 'Preview consumed stock');
      await selectItem('item_machine_biscuit');
      assert(!doc().querySelector('[data-action="gift-item"]'), 'Previous recipient retained');
      assert(get('.workshop-gift-pet-list').textContent.includes('伊芙星靈'), 'Multi-affinity recommendation missing');
    });
    await check('actual favorite gift agrees with preview and rapid UI clicks consume one portion', async () => {
      await selectItem('item_fire_meat'); await selectPet('pet_n04');
      const before = (await services.collectionService.getPetCollection('pet_n04')).bondExp;
      const button = get('[data-action="gift-item"]'); button.click(); button.click();
      await until(async () => await stock('item_fire_meat') === 1, 'gift committed');
      await until(() => !doc().querySelector('[aria-busy="true"]'), 'gift finished');
      assert((await services.collectionService.getPetCollection('pet_n04')).bondExp === before + 150, 'Favorite effect disagrees');
      assert(get('.workshop-gift-status').textContent.includes('+150'), 'Success status missing');
    });
    await check('nonfavorite dog receives basic +75; last portion resets both selections with success retained', async () => {
      get('.workshop-gift-others').open = true;
      await selectPet('pet_sr04');
      assert(get('.workshop-gift-preview').textContent.includes('+75'), 'Dog incorrectly treated as fire favorite');
      const before = (await services.collectionService.getPetCollection('pet_sr04')).bondExp;
      await click('[data-action="gift-item"]');
      await until(async () => await stock('item_fire_meat') === 0, 'last portion consumed');
      await until(() => !doc().querySelector('[data-action="select-gift-pet"]'), 'back to item selection');
      assert((await services.collectionService.getPetCollection('pet_sr04')).bondExp === before + 75, 'Basic gain incorrect');
      assert(get('.workshop-gift-status').textContent.includes('+75'), 'Last success lost');
    });
    await check('crafting new gifts deducts the exact recipe and creates inventory', async () => {
      const before = await services.rewardService.getWallet();
      const crafted = await services.workshopService.craftItem('item_aurora_cream');
      const after = await services.rewardService.getWallet();
      assert(crafted.success && await stock('item_aurora_cream') === 1, 'Craft failed');
      assert(before.materials.aurora_ice - after.materials.aurora_ice === 3 && before.materials.forest_leaf - after.materials.forest_leaf === 2, 'Recipe deduction incorrect');
    });
    await check('no favorite partners gives an actionable other-partner list; generic honey has no favorite claims', async () => {
      await loadApp(); await giftTab(); await selectItem('item_aurora_cream');
      assert(get('#workshop-content').textContent.includes('尚未擁有喜歡這份禮物'), 'No-match message missing');
      await setItems({ item_astral_honey: 1 }); await selectItem('item_astral_honey');
      assert(!doc().querySelector('.workshop-gift-others') && !get('#workshop-content').textContent.includes('推薦夥伴'), 'Universal gift incorrectly marked favorite');
      await selectPet('pet_sp06');
      assert(get('.workshop-gift-preview').textContent.includes('+100'), 'Honey gain changed');
    });
    await check('daily-limit recipient is disabled and actual service rechecks the limit', async () => {
      const today = new Intl.DateTimeFormat('sv-SE').format(new Date());
      await setItems({ item_fire_meat: 1 }, { [today]: { pet_n04: { bondItemsUsed: 5 } } });
      await selectItem('item_fire_meat');
      assert(get('.workshop-gift-pet[data-pet-id="pet_n04"]').disabled, 'Daily limit not disabled');
      const result = await services.workshopService.useBondItem('item_fire_meat', 'pet_n04', pets);
      assert(!result.success && await stock('item_fire_meat') === 1, 'Service bypassed daily cap');
    });
    await check('service locks before awaits; unowned/empty stock rejected; highest level can still receive gifts', async () => {
      await services.workshopService.importInventory({ key: 'inventory', items: { item_fire_meat: 2 }, itemUsageLogs: {} });
      const entry = await services.collectionService.getPetCollection('pet_n04');
      await services.db.dbPut('collection', { ...entry, bondExp: 500, bondLevel: 5 });
      const preview = await services.workshopService.getGiftPreview('item_fire_meat', 'pet_n04', pets);
      const concurrent = await Promise.all([services.workshopService.useBondItem('item_fire_meat', 'pet_n04', pets),
        services.workshopService.useBondItem('item_fire_meat', 'pet_n04', pets)]);
      assert(concurrent.filter((row) => row.success).length === 1 && await stock('item_fire_meat') === 1, 'Concurrent gift consumed twice');
      assert(preview.bondExp === concurrent.find((row) => row.success).bondExp, 'Preview/actual disagree');
      assert((await services.collectionService.getPetCollection('pet_n04')).bondExp === 650, 'Max-level gain lost');
      assert(!(await services.workshopService.useBondItem('item_fire_meat', 'pet_n01', pets)).success, 'Unowned recipient accepted');
      assert(!(await services.workshopService.useBondItem('item_small_spirit_food', 'pet_n04', pets)).success, 'Empty stock accepted');
    });
    await check('393/320px layouts fit across all three themes; max level, sources and owned counts are readable', async () => {
      await loadApp(); await giftTab(); await selectItem('item_fire_meat'); await selectPet('pet_n04');
      assert(get('.workshop-gift-preview').textContent.includes('已達最高等級'), 'Max-level warning missing');
      const details = [];
      for (const theme of ['default', 'sweet', 'twilight']) {
        await ui.applyTheme(theme, { silent: true });
        for (const width of [393, 320]) {
          frame.style.width = `${width}px`; await wait(160);
          const section = get('#workshop-content');
          assert(section.scrollWidth <= section.clientWidth + 2, `Overflow at ${theme}/${width}`);
          const typeRoles = [
            ['.page-title', 24], ['.page-subtitle', 15], ['.section-title', 17],
            ['.segmented-control__btn', 15], ['.workshop-gift-item__name', 17],
            ['.workshop-gift-item__effect', 15], ['.workshop-gift-pet__name', 17],
            ['.workshop-gift-pet__reason', 15], ['.workshop-gift-pet__meta', 13],
            ['.workshop-gift-preview__list', 15], ['.workshop-gift-preview .btn', 15],
          ];
          const family = win().getComputedStyle(get('#view-workshop')).fontFamily;
          for (const [selector, size] of typeRoles) {
            const style = win().getComputedStyle(get(`#view-workshop ${selector}`));
            assert(parseFloat(style.fontSize) === size, `Unexpected type size ${selector} at ${theme}/${width}: ${style.fontSize}`);
            assert(style.fontFamily === family, `Mixed font family ${selector} at ${theme}/${width}`);
          }
          await click('[data-workshop-tab="materials"]');
          assert(parseFloat(win().getComputedStyle(get('.workshop-material-card h3')).fontSize) === 17, 'Material title type mismatch');
          assert(parseFloat(win().getComputedStyle(get('.workshop-material-card__desc')).fontSize) === 15, 'Material body type mismatch');
          await click('[data-workshop-tab="craft"]');
          assert(parseFloat(win().getComputedStyle(get('.workshop-craft-card h3')).fontSize) === 17, 'Recipe title type mismatch');
          assert(parseFloat(win().getComputedStyle(get('.workshop-craft-card__desc')).fontSize) === 15, 'Recipe body type mismatch');
          assert(parseFloat(win().getComputedStyle(get('.workshop-craft-card__affinity')).fontSize) === 13, 'Recipe affinity type mismatch');
          assert(get('#workshop-content').scrollWidth <= get('#workshop-content').clientWidth + 2, `Recipe overflow at ${theme}/${width}`);
          await giftTab(); await selectItem('item_fire_meat'); await selectPet('pet_n04');
          details.push({ theme, width, scrollWidth: section.scrollWidth, clientWidth: section.clientWidth });
        }
      }
      frame.style.width = '393px';
      await click('[data-workshop-tab="craft"]');
      assert(get('#workshop-content').textContent.includes('材料來源：極北冰岸、迷霧森林'), 'Source missing');
      assert(get('#workshop-content').textContent.includes('位喜歡它的夥伴'), 'Owned counts missing');
      return details;
    });
    await check('no-stock flow stays actionable and app has no uncaught runtime errors', async () => {
      await setItems({});
      assert(get('#workshop-content').textContent.includes('目前沒有可贈送的道具'), 'Empty state missing');
      assert(!win().__questNoteOnboardingTest.errors.length, win().__questNoteOnboardingTest.errors.join('\n'));
      // Leave an illustrative gift and recommendation visible for visual review.
      await setItems({ item_fire_meat: 2, item_machine_biscuit: 1, item_star_crisp: 1 });
      await selectItem('item_fire_meat'); await selectPet('pet_r02');
    });
    output.textContent = JSON.stringify({ status: 'PASS', database: marker.databaseName, results }, null, 2);
  } catch (error) {
    output.textContent = JSON.stringify({ status: 'FAIL', error: error.stack, results }, null, 2);
  }
});
