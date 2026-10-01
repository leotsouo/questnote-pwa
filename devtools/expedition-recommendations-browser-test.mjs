/** Real dispatch UI, only on the server-owned synthetic database. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.argv[2];
assert.equal(new URL(origin).hostname, '127.0.0.1');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const output = 'reports/expedition-recommendations';
await fs.mkdir(output, { recursive: true });
try {
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
  await context.route('**/*', (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const marker = await (await context.request.get(`${origin}/__onboarding_test_guard__`)).json();
  assert.equal(marker.purpose, 'questnote-onboarding-synthetic-only');
  await page.goto(`${origin}/index.html`);
  await page.locator('[data-onboarding-action="skip"]').click();
  assert.equal(await page.evaluate(() => window.__questNoteOnboardingTest?.databaseName), marker.databaseName);
  const seed = await page.evaluate(async () => {
    const pets = (await (await fetch('/data/pets.json')).json()).pets;
    const gameplay = await import('/src/expeditionGameplay.js');
    const groups = Object.fromEntries(['scout', 'gatherer', 'companion', 'guardian'].map((role) =>
      [role, pets.filter((pet) => gameplay.getPetSpecialty(pet).role === role).slice(0, role === 'scout' ? 4 : 1)]));
    const collection = await import('/src/collectionService.js');
    await collection.addPetToCollection(groups.gatherer[0].id);
    await (await import('/src/rewardService.js')).addAdventureEnergy(10);
    return Object.fromEntries(Object.entries(groups).map(([role, list]) => [role, list.map((pet) => pet.id)]));
  });
  const navigate = async () => {
    await page.reload();
    await page.locator('.nav-item[data-view="expedition"]').click();
    await page.locator('[data-area-id="mist_forest"] [data-action="open-dispatch"]').click();
  };
  await navigate();
  assert.match(await page.locator('.expedition-recommendation__summary').innerText(), /沒有可派遣的探路/);
  assert.equal(await page.locator('[data-action="dispatch-recommend"]').isDisabled(), true);
  assert.equal(await page.locator('[data-action="dispatch-confirm"]').isDisabled(), true);
  await page.locator(`.expedition-pet-option[data-pet-id="${seed.gatherer[0]}"]`).click();
  assert.equal(await page.locator('[data-action="dispatch-confirm"]').isEnabled(), true, 'other specialties still permit manual dispatch');
  await page.locator('[data-objective="gather"]').click();
  await page.locator('[data-action="dispatch-recommend"]').click();
  assert.deepEqual(await page.locator('.expedition-pet-option.is-selected').evaluateAll((elements) => elements.map((element) => element.dataset.petId)), seed.gatherer);
  await page.locator('[data-action="dispatch-close"]').first().click();
  await page.evaluate(async (groups) => {
    const collection = await import('/src/collectionService.js');
    const db = await import('/src/db.js');
    for (const id of Object.values(groups).flat()) await collection.addPetToCollection(id);
    for (const [index, id] of groups.scout.entries()) {
      const pet = await collection.getPetCollection(id);
      await db.dbPut(db.STORES.COLLECTION, { ...pet, stars: index + 1 });
    }
    await collection.setCompanion(groups.guardian[0]);
  }, seed);
  await navigate();
  await page.locator('#dispatch-objective-title').evaluate((title) => title.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: `${output}/goal-first.png` });
  const snapshot = () => page.evaluate(async () => {
    const db = await import('/src/db.js');
    const data = await db.readAllStoresSnapshot();
    return JSON.stringify({ wallet: data.meta.find((row) => row.key === 'wallet'), expeditions: data.expeditions, collection: data.collection });
  });
  const before = await snapshot();
  const expectedScouts = [...seed.scout].reverse().slice(0, 3);
  for (const [objective, ids] of [['explore', expectedScouts], ['gather', seed.gatherer], ['bond', seed.companion]]) {
    await page.locator(`[data-objective="${objective}"]`).click();
    assert.equal(await page.locator(`[data-objective="${objective}"]`).evaluate((button) => button === document.activeElement), true);
    const first = await page.locator('.expedition-pet-option').first().getAttribute('data-pet-id');
    assert.equal(first, ids[0], 'specialty outranks nonmatching active companion');
    await page.locator('[data-action="dispatch-recommend"]').click();
    assert.deepEqual(await page.locator('.expedition-pet-option.is-selected').evaluateAll((elements) => elements.map((element) => element.dataset.petId)), ids);
    assert.equal(await page.locator('[data-action="dispatch-recommend"]').evaluate((button) => button === document.activeElement), true);
  }
  await page.locator('[data-objective="explore"]').click();
  assert.equal(await page.locator(`.expedition-pet-option[data-pet-id="${seed.companion[0]}"]`).getAttribute('aria-pressed'), 'true', 'goal changes preserve manual selection');
  await page.locator('[data-action="dispatch-recommend"]').click();
  await page.locator(`.expedition-pet-option[data-pet-id="${expectedScouts[0]}"]`).click();
  await page.locator(`.expedition-pet-option[data-pet-id="${seed.guardian[0]}"]`).click();
  assert.equal(await page.locator('.expedition-pet-option.is-selected').count(), 3, 'recommended squad can be adjusted');
  await page.locator(`.expedition-pet-option[data-pet-id="${seed.scout[0]}"]`).click();
  assert.equal(await page.locator('.expedition-pet-option.is-selected').count(), 3, 'manual adjustment respects the team limit');
  assert.equal(await snapshot(), before, 'planning must not persist or consume energy');
  assert.equal(await page.evaluate(() => Boolean(document.querySelector('[data-objective="explore"]').compareDocumentPosition(document.querySelector('.expedition-recommendation')) & Node.DOCUMENT_POSITION_FOLLOWING)), true);
  const layout = [];
  for (const width of [320, 393, 1440]) {
    await page.setViewportSize({ width, height: 852 });
    for (const theme of ['default', 'sweet', 'twilight']) {
      await page.evaluate(async (theme) => (await import('/src/ui.js')).applyTheme(theme, { silent: true, skipSave: true }), theme);
      for (const font of [16, 24]) {
        await page.evaluate((font) => document.documentElement.style.fontSize = `${font}px`, font);
        const dimensions = await page.locator('.expedition-dispatch-modal__body').evaluate((body) => ({ scroll: body.scrollWidth, client: body.clientWidth }));
        assert.ok(dimensions.scroll <= dimensions.client + 1, `${width}/${theme}/${font} modal overflow`);
        await page.locator('[data-action="dispatch-recommend"]').scrollIntoViewIfNeeded();
        assert.equal(await page.locator('[data-action="dispatch-recommend"]').isVisible(), true);
        layout.push({ width, theme, font, overflow: false });
        if ((width === 393 && font === 16) || (width === 320 && font === 24)) {
          await page.screenshot({ path: `${output}/${width}-${theme}-${font}.png` });
        }
      }
    }
  }
  await page.setViewportSize({ width: 393, height: 852 });
  await page.evaluate(() => document.documentElement.style.fontSize = '16px');
  await page.locator('[data-objective="gather"]').click();
  await page.locator('[data-action="dispatch-recommend"]').click();
  await page.locator('[data-action="dispatch-confirm"]').click();
  await page.locator('#expedition-dispatch-modal').waitFor({ state: 'detached' });
  const active = await page.evaluate(async () => ({
    expedition: await (await import('/src/expeditionService.js')).getActiveExpedition(),
    energy: (await (await import('/src/rewardService.js')).getWallet()).adventureEnergy,
  }));
  assert.deepEqual(active.expedition.petIds, seed.gatherer);
  assert.equal(active.expedition.objective, 'gather');
  assert.equal(active.energy, 9, 'only confirmation consumes first-journey energy');
  await page.locator('[data-area-id="mist_forest"] [data-action="open-dispatch"]').click();
  await page.locator('[data-objective="gather"]').click();
  assert.equal(await page.locator('[data-action="dispatch-recommend"]').isDisabled(), true, 'busy specialty excluded');
  assert.equal(await page.locator(`.expedition-pet-option[data-pet-id="${seed.gatherer[0]}"]`).isDisabled(), true);
  assert.equal(await page.locator('[data-action="dispatch-confirm"]').isDisabled(), true);
  await page.keyboard.press('Escape');
  await page.locator('#expedition-dispatch-modal').waitFor({ state: 'detached' });
  assert.deepEqual(errors, []);
  await fs.writeFile(`${output}/browser-results.json`, JSON.stringify({ database: marker.databaseName,
    layout, objectives: ['explore', 'gather', 'bond'], confirmed: active.expedition.petIds, errors }, null, 2));
  console.log('PASS: all objectives, no matches, specialty ranking, squad adjustment, focus, 18 layouts, confirmation and busy exclusion');
  await context.close();
} finally { await browser.close(); }
