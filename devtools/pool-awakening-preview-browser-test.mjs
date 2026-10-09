/** Actual pool renderer on a guarded loopback origin; all gameplay writes rejected. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const output = path.resolve(root, process.env.QUESTNOTE_POOL_PREVIEW_REPORT_DIR || '.dev-backups/test-runs/pool-awakening-preview');
const { chromium } = createRequire(import.meta.url)(process.env.QUESTNOTE_PLAYWRIGHT_PACKAGE || 'playwright');
const server = spawn(process.execPath, ['devtools/onboarding-browser-server.mjs', '0'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
const base = await new Promise((resolve, reject) => {
  let text = '';
  server.stdout.on('data', (chunk) => { text += chunk; const match = text.match(/http:\/\/127\.0\.0\.1:\d+/); if (match) resolve(match[0]); });
  server.once('error', reject);
  server.once('exit', (code) => reject(new Error(`Test server exited: ${code}`)));
});
await fs.mkdir(output, { recursive: true });
const results = [];
const errors = [];
let browser;
let context;
let page;
const modal = '#identity-detail-dialog';
const flip = `${modal} .pool-form-preview__button`;
async function check(name, run) {
  try { await run(); results.push({ name, ok: true }); console.log('PASS ' + name); }
  catch (error) { results.push({ name, ok: false, error: error.stack }); await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }); throw error; }
}
async function select(poolId) {
  if (await page.locator(modal).evaluate((el) => el.open)) await page.locator(`${modal} [data-identity-action="close-dialog"]`).click();
  await page.evaluate((id) => window.poolPreviewTest.selectPool(id), poolId);
}
async function openPet(petId) {
  if (await page.locator(modal).evaluate((el) => el.open)) await page.keyboard.press('Escape');
  await page.locator('#view-gacha [data-identity-action="preview"]').click();
  await page.locator(`${modal} [data-pet="${petId}"]`).click();
}
async function assertForm(form) {
  await page.waitForFunction((form) => document.querySelector('.pool-form-preview__button')?.getAttribute('aria-pressed') === String(form === 'awakened'), form);
  await page.waitForFunction((form) => { const image = document.querySelector(`[data-preview-face="${form}"] img`); return image?.complete && image.naturalWidth > 0; }, form);
  const details = await page.locator('[data-pool-form-preview]').evaluate((host, form) => {
    const face = host.querySelector(`[data-preview-face="${form}"]`);
    const image = face.querySelector('img');
    return { hidden: face.getAttribute('aria-hidden'), loaded: image.complete && image.naturalWidth > 0, filter: getComputedStyle(image).filter, src: image.src };
  }, form);
  assert.equal(details.hidden, 'false');
  assert.equal(details.loaded, true);
  assert.equal(details.filter, 'none');
  return details;
}

try {
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
  context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.route('**/*', (route) => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
  page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
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
  // After startup, use display fixtures with the real renderer, then reject every
  // IndexedDB mutation and every gameplay action throughout all preview checks.
  await page.evaluate(async () => {
    if (!window.__questNoteOnboardingTest) throw new Error('Synthetic database guard missing');
    const [{ loadCatalogBundle }, { loadAwakeningCatalog }, { renderEncounterView }, { AWAKENING_PROFILES }] = await Promise.all([
      import('/src/releaseCatalog.js'), import('/src/petAwakeningCatalog.js'), import('/src/encounterView.js'), import('/src/petAwakeningProfiles.js'),
    ]);
    const [bundle, catalog] = await Promise.all([loadCatalogBundle(), loadAwakeningCatalog()]);
    const state = { allPets: bundle.petsData.pets, poolsData: bundle.poolsData, awakeningCatalog: catalog,
      enrichedCollection: [], petAwakening: { byPet: {} }, wallet: { stardust: 0 }, gachaStats: {},
      encounterEconomy: { balance: 0 }, userPreferences: {}, poolUnlockState: { byPool: {} } };
    const writes = [];
    for (const name of ['put', 'add', 'delete', 'clear']) IDBObjectStore.prototype[name] = function () { writes.push(name); throw new Error('Unexpected preview database write: ' + name); };
    const reject = () => { writes.push('gameplay'); throw new Error('Unexpected preview gameplay action'); };
    const actions = { isBusy: () => false, isExpanded: () => false, draw: reject, invite: reject, setCompanion: reject, openPetDetail: reject, openNickname: reject,
      selectPool(id) { state.gachaStats.selectedPoolId = id; render(); } };
    function render() { renderEncounterView('gacha', state, reject, actions); }
    function selectPool(id) {
      document.querySelectorAll('.view').forEach((el) => el.classList.remove('active'));
      document.getElementById('view-gacha').classList.add('active');
      actions.selectPool(id);
    }
    window.poolPreviewTest = { state, catalog, profiles: AWAKENING_PROFILES, writes, selectPool, render };
    selectPool(AWAKENING_PROFILES[0].poolId);
  });
  await check('all 31 unowned partners in three pools show correct full-color forms and flip back', async () => {
    const profiles = await page.evaluate(() => window.poolPreviewTest.profiles);
    for (const profile of profiles) {
      await select(profile.poolId);
      await page.locator('#view-gacha [data-identity-action="preview"]').click();
      assert.equal(await page.locator(`${modal} .pool-form-preview-cue`).count(), profile.petIds.length);
      await page.keyboard.press('Escape');
      for (const id of profile.petIds) {
        await openPet(id);
        const initial = await assertForm('initial');
        await page.locator(flip).click();
        const awakened = await assertForm('awakened');
        const expected = await page.evaluate((id) => {
          const entry = window.poolPreviewTest.catalog.pets.find((row) => row.petId === id);
          const pet = window.poolPreviewTest.state.allPets.find((row) => row.id === id);
          return new URL(entry.awakenedImage?.stage || pet.imageVariants.stage, location.origin).href;
        }, id);
        assert.equal(awakened.src, expected);
        assert.notEqual(initial.src, awakened.src);
        await page.locator(flip).click();
        await assertForm('initial');
      }
    }
  });
  await check('desktop flip, fast reversal, reopen reset, and keyboard focus', async () => {
    await select('darkcrown_court_release');
    await openPet('pet_ur28');
    await page.locator(flip).click(); await assertForm('awakened');
    await page.waitForTimeout(250);
    await page.locator(modal).screenshot({ path: path.join(output, 'desktop-awakened.png') });
    await page.locator(flip).click(); await page.locator(flip).click(); await page.locator(flip).click();
    await assertForm('initial');
    await page.keyboard.press('Escape');
    await openPet('pet_ur28'); await assertForm('initial');
    await page.locator(flip).focus(); await page.keyboard.press('Enter'); await assertForm('awakened');
    assert.equal(await page.locator(flip).evaluate((button) => button === document.activeElement), true);
    assert.equal(await page.locator('.pool-form-preview__card').evaluate((el) => getComputedStyle(el).transitionDuration), '0s');
    await page.keyboard.press('Space'); await assertForm('initial');
  });
  await check('phone card fits and reduced motion works for OS, app preference, and senior mode', async () => {
    await page.setViewportSize({ width: 375, height: 812 });
    await select('aurora_fairy_feast'); await openPet('pet_ur31');
    assert.equal(await page.locator(modal).evaluate((el) => el.scrollTop), 0);
    await page.locator(flip).click(); await assertForm('awakened'); await page.waitForTimeout(250);
    assert.equal(await page.locator(modal).evaluate((el) => el.scrollTop), 0);
    assert.ok(await page.locator(modal).evaluate((el) => el.scrollWidth <= el.clientWidth + 1));
    await page.locator(modal).screenshot({ path: path.join(output, 'mobile-awakened.png') });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator(flip).click(); await assertForm('initial');
    assert.equal(await page.locator('.pool-form-preview__card').evaluate((el) => getComputedStyle(el).transitionDuration), '0s');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    for (const mode of ['preference', 'senior']) {
      await page.evaluate((mode) => { window.poolPreviewTest.state.userPreferences.reduceMotion = mode === 'preference'; document.body.dataset.readingMode = mode === 'senior' ? 'senior' : 'normal'; }, mode);
      await page.locator(flip).click();
      assert.equal(await page.locator('.pool-form-preview__card').evaluate((el) => getComputedStyle(el).transitionDuration), '0s');
    }
    await page.evaluate(() => { window.poolPreviewTest.state.userPreferences.reduceMotion = false; document.body.dataset.readingMode = 'normal'; });
  });
  await check('image failure retains initial art, retries, and original fallback works', async () => {
    await openPet('pet_ur32');
    const urls = await page.locator('[data-preview-src]').evaluate((img) => [img.dataset.previewSrc, img.dataset.previewFallback]);
    for (const url of urls) await page.route(url, (route) => route.abort());
    await page.locator(flip).click();
    await page.waitForFunction(() => document.querySelector('.pool-form-preview__hint')?.textContent.includes('重試'));
    await assertForm('initial');
    await page.unroute(urls[1]);
    await page.locator(flip).click();
    assert.equal((await assertForm('awakened')).src, urls[1]);
    await page.unroute(urls[0]);
  });
  await check('ordinary pools have no preview controls and preview never writes progress or rewards', async () => {
    await select('standard');
    assert.equal(await page.locator('#view-gacha .pool-form-preview-cue').count(), 0);
    const id = await page.locator('#view-gacha .hero-card').getAttribute('data-pet');
    await openPet(id);
    assert.equal(await page.locator(flip).count(), 0);
    const state = await page.evaluate(() => ({ writes: window.poolPreviewTest.writes, progress: window.poolPreviewTest.state.petAwakening, collection: window.poolPreviewTest.state.enrichedCollection, wallet: window.poolPreviewTest.state.wallet }));
    assert.deepEqual(state, { writes: [], progress: { byPet: {} }, collection: [], wallet: { stardust: 0 } });
  });
  await check('interactive review page uses the real component and all 31 partners without database access', async () => {
    const demo = await context.newPage();
    await demo.addInitScript(() => { indexedDB.open = () => { throw new Error('Review page must not open a database'); }; });
    demo.on('pageerror', (error) => errors.push(error.message));
    await demo.goto(base + '/devtools/pool-awakening-flip-preview.html');
    await demo.locator('.pool-form-preview__button').waitFor();
    assert.equal(await demo.locator('#preview-pet option').count(), 31);
    await demo.locator('#preview-pet').selectOption('pet_ur31');
    await demo.locator('.pool-form-preview__button').click();
    await demo.waitForFunction(() => document.querySelector('.pool-form-preview__button')?.getAttribute('aria-pressed') === 'true');
    await demo.waitForTimeout(250);
    await demo.screenshot({ path: path.join(output, 'interactive-review.png'), fullPage: true });
    await demo.close();
  });
  assert.deepEqual(errors, []);
} finally {
  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ testedAt: new Date().toISOString(), sourceBase: 'fa5a13e', results, pageErrors: errors }, null, 2) + '\n');
  await context?.close(); await browser?.close(); server.kill();
}
