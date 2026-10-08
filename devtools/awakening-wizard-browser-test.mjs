/** Real wizard navigation and IndexedDB on a UUID-isolated origin. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const { chromium } = createRequire(import.meta.url)(process.env.QUESTNOTE_PLAYWRIGHT_PACKAGE || 'playwright');
const output = process.env.QUESTNOTE_WIZARD_REPORT_DIR;
if (output) await fs.mkdir(output, { recursive: true });
const child = spawn(process.execPath, ['devtools/onboarding-browser-server.mjs', '0'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
const base = await new Promise((resolve, reject) => { let text = ''; child.stdout.on('data', (b) => { text += b; const match = text.match(/http:\/\/127\.0\.0\.1:\d+/); if (match) resolve(match[0]); }); child.once('error', reject); });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
await context.route('**/*', (r) => new URL(r.request().url()).origin === base ? r.continue() : r.abort());
const page = await context.newPage(); page.setDefaultTimeout(20000);
const errors = []; page.on('pageerror', (error) => errors.push(error.message));
const checks = [];
const act = (action) => page.locator(`[data-awake-action="${action}"]`).click();
const step = (name) => page.locator(`.awakening-reader[data-awakening-step="${name}"]`).waitFor();
const read = () => page.evaluate(() => window.wizardTest.petAwakeningService.getPetAwakening());
async function load() {
  await page.goto(base + '/index.html');
  await page.locator('#app-loader').waitFor({ state: 'hidden' });
  await page.waitForFunction(() => document.querySelector('#guide-tutorial-status')?.textContent);
  if (await page.locator('[data-onboarding-action="skip"]').isVisible()) await page.locator('[data-onboarding-action="skip"]').click();
  await page.waitForFunction(() => document.body.classList.contains('guided-learned') || document.querySelector('[data-guided-action="skip"]'));
  if (await page.locator('[data-guided-action="skip"]').isVisible()) {
    await page.locator('[data-guided-action="skip"]').click();
    await page.locator('[data-guided-action="confirm-skip"]').click();
    await page.locator('.guided-coach').waitFor({ state: 'detached' });
  }
  await page.evaluate(async () => {
    if (!window.__questNoteOnboardingTest) throw Error('Synthetic origin guard required');
    window.wizardTest = Object.fromEntries(await Promise.all(['db', 'ui', 'collectionService', 'petAwakeningService', 'petAwakeningCore', 'bondJourneyCore', 'taskService', 'expeditionService', 'rewardService', 'releaseCatalog'].map(async (name) => [name, await import(`/src/${name}.js`)])));
  });
}
async function open(id = 'pet_ur18') {
  await load();
  await page.locator('.bottom-nav [data-view="collection"]').click();
  await page.locator(`[data-pet="${id}"]`).click();
  await page.locator('[data-identity-action="app-pet-detail"]').click();
  await page.locator(`[data-awake-open="${id}"]`).click();
}
try {
  await load();
  await page.evaluate(async () => {
    const s = window.wizardTest;
    const at = new Date(Date.now() - 3600000).toISOString();
    for (const id of ['pet_ur18', 'pet_ur17']) {
      await s.collectionService.addPetToCollection(id);
      const pet = await s.collectionService.getPetCollection(id);
      await s.db.dbPut('collection', { ...pet, bondExp: 500, bondLevel: 5 });
    }
    const journey = s.bondJourneyCore.createBondJourney();
    journey.byPet.pet_ur18 = { chapters: Object.fromEntries([2, 3, 4, 5].map((lv) => [lv, { choiceId: 'gentle', readAt: at, completedAt: at, claimedAt: at }])) };
    await s.db.dbPut('meta', journey);
    const wallet = await s.rewardService.getWallet();
    const recipes = await fetch('/data/craftables.json').then((r) => r.json());
    const ingredients = Object.keys(recipes.find((c) => c.id === 'item_pine_trail_riceball').recipe);
    await s.db.dbPut('meta', { ...wallet, adventureEnergy: 100, materials: { ...wallet.materials, ...Object.fromEntries(ingredients.map((id) => [id, 100])) } });
  });
  await open('pet_ur17'); await step('story'); await act('story');
  await page.locator('.bond-reader').waitFor();
  await page.locator('[data-bond-action="close"]').click(); await act('return'); await step('story');
  checks.push('Missing story opens the actual character story; returning does not falsely pass eligibility');
  await act('close');
  await open(); await step('start'); await act('start'); await step('daily');
  await act('daily'); await page.locator('#view-tasks.active #awakening-return').waitFor();
  for (let i = 0; i < 3; i += 1) await page.evaluate(async (i) => {
    const s = window.wizardTest;
    await new Promise((resolve) => setTimeout(resolve, 10));
    const task = await s.taskService.createTask({ content: `Wizard daily ${i}`, priority: 'normal', planToday: true });
    await s.taskService.toggleTaskComplete(task.id);
  }, i);
  await act('return'); await step('expedition');
  assert.equal((await read()).byPet.pet_ur18.eventKeys.length, 3);
  checks.push('Start, actual new task completion and navigation return advance exactly to expedition');
  await act('expedition'); await page.locator('#expedition-dispatch-modal').waitFor();
  const selected = await page.locator('[data-action="dispatch-select-pet"][data-pet-id="pet_ur18"]').getAttribute('class');
  assert.ok(selected.includes('selected'));
  await page.keyboard.press('Escape');
  await page.evaluate(async () => {
    const s = window.wizardTest;
    const areas = await s.expeditionService.loadExpeditionAreas();
    const pets = (await s.releaseCatalog.loadCatalogBundle()).petsData.pets;
    const run = await s.expeditionService.startExpedition(['pet_ur18'], 'cloudrest_trail', areas, pets);
    await s.expeditionService.forceCompleteActiveExpedition();
    await s.expeditionService.claimExpeditionRewards(run.id, areas, pets);
  });
  await act('return'); await step('food');
  assert.equal(await page.locator('[data-awake-action="awaken"]').count(), 0);
  await act('workshop'); await page.locator('#view-workshop.active #awakening-return').waitFor();
  assert.equal(await page.locator('[data-workshop-tab="craft"]').getAttribute('aria-selected'), 'true');
  const craft = page.locator('[data-action="craft-item"][data-item-id="item_pine_trail_riceball"][data-qty="1"]');
  await craft.waitFor();
  await craft.click();
  await page.waitForFunction(async () => ((await window.wizardTest.db.dbGet('meta', 'inventory'))?.items.item_pine_trail_riceball || 0) >= 1);
  await act('return'); await step('ritual');
  checks.push('Real new participant expedition claim grants token; missing food navigates to crafting and returns after real crafting');
  for (const theme of ['default', 'sweet', 'twilight']) {
    await page.evaluate((theme) => { document.body.dataset.theme = theme; }, theme);
    for (const width of [320, 393, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${theme}/${width}`);
      assert.equal(await page.locator('.awakening-wizard__stage .btn--primary').count(), 1);
    }
  }
  if (output) await page.screenshot({ path: path.join(output, 'ritual-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 393, height: 852 });
  const beforeFood = await page.evaluate(async () => (await window.wizardTest.db.dbGet('meta', 'inventory')).items.item_pine_trail_riceball);
  await act('awaken'); await page.locator('.awakening-scene').waitFor();
  assert.equal((await read()).byPet.pet_ur18.status, 'awakened', 'Commit precedes animation');
  await page.keyboard.press('Escape'); await step('done');
  await page.waitForFunction(() => { const img = document.querySelector('.awakening-reader img'); return img?.complete && img.naturalWidth > 0; });
  assert.ok(!(await page.locator('.awakening-reader img').getAttribute('src')).includes('initial'));
  await act('initial'); await step('done');
  await act('replay'); await page.locator('.awakening-scene').waitFor(); await page.keyboard.press('Escape'); await step('done');
  assert.equal(await page.evaluate(async () => (await window.wizardTest.db.dbGet('meta', 'inventory')).items.item_pine_trail_riceball), beforeFood - 1);
  if (output) await page.screenshot({ path: path.join(output, 'done-mobile.png'), fullPage: true });
  await load(); await open(); await step('done');
  assert.ok((await page.locator('.awakening-reader').textContent()).includes('目前：初遇相'));
  checks.push('Atomic ritual precedes existing animation, real artwork loads, replay consumes nothing, form survives reload');
  await act('close');
  await page.evaluate(async () => {
    const s = window.wizardTest;
    const pet = await s.collectionService.getPetCollection('pet_ur17');
    await s.db.dbPut('collection', { ...pet, bondExp: 0, bondLevel: 1 });
  });
  await open('pet_ur17'); await step('bond'); await act('bond');
  await page.locator('#modal-body').filter({ hasText: '餵食' }).waitFor();
  await page.keyboard.press('Escape'); await act('return'); await step('bond');
  checks.push('Low intimacy routes to the actual character feeding modal without bypassing qualification');
  assert.deepEqual(errors, []);
  const result = { passed: true, checks, storage: 'UUID-isolated native IndexedDB', version: await page.evaluate(async () => (await import('/src/version.js')).APP_VERSION) };
  if (output) await fs.writeFile(path.join(output, 'wizard-result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally { await browser.close(); child.kill(); }
