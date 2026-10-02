/** Read-only UI review of the pinned HTTPS build in fresh browser storage. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const root = path.resolve(import.meta.dirname, '..');
const report = path.join(root, 'reports/awakening-guide');
const pins = JSON.parse(await fs.readFile(path.join(report, 'artifacts.json'))).preview;
const verified = JSON.parse(await fs.readFile(path.join(report, 'preview-https.json')));
assert.equal(verified.status, 'passed'); assert.equal(verified.artifactId, pins.artifactId);
const { chromium } = createRequire(import.meta.url)(process.env.QUESTNOTE_PLAYWRIGHT_PACKAGE || 'playwright');
const base = 'https://leotsouo.github.io/questnote-pwa-preview/v359-review/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
  const blocked = [];
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === new URL(base).origin && url.pathname.startsWith('/questnote-pwa-preview/')) await route.continue();
    else { blocked.push(url.origin); await route.abort(); }
  });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base + `?guide-review=${pins.artifactId.slice(0, 12)}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#task-view-content')?.children.length, null, { timeout: 90000 });
  const skip = page.locator('.onboarding-dialog [data-onboarding-action="skip"]');
  if (await skip.isVisible()) await skip.click();
  await page.locator('.onboarding-scrim').waitFor({ state: 'detached', timeout: 15000 }).catch(async () => {
    if (await page.locator('.onboarding-dialog [data-onboarding-action="skip"]').isVisible()) await page.locator('.onboarding-dialog [data-onboarding-action="skip"]').click();
  });
  assert.equal(await page.locator('.onboarding-scrim').isVisible().catch(() => false), false, 'Synthetic onboarding should be dismissible before product review');
  const data = await page.evaluate(async () => {
    const { loadAwakeningCatalog } = await import('./src/petAwakeningCatalog.js');
    const catalog = await loadAwakeningCatalog();
    const images = await Promise.all(catalog.pets.map((entry) => new Promise((resolve, reject) => {
      const image = new Image(); image.onload = () => resolve([entry.petId, image.naturalWidth, image.naturalHeight]);
      image.onerror = () => reject(Error(`initial artwork failed: ${entry.petId}`)); image.src = entry.initialImage.card;
    })));
    return { version: (await import('./src/version.js')).APP_VERSION, artifactId: document.querySelector('meta[name="questnote-artifact"]').content,
      initialImages: images, serviceWorker: navigator.serviceWorker.controller?.scriptURL };
  });
  assert.equal(data.version, '3.5.9'); assert.equal(data.artifactId, pins.artifactId); assert.equal(data.initialImages.length, 20);
  await page.getByRole('button', { name: '召喚', exact: true }).click();
  const standardCarousel = page.locator('#gacha-standard-ur');
  await standardCarousel.waitFor({ state: 'visible' });
  const carouselCount = standardCarousel.locator('[data-carousel-count]');
  const firstStandardUr = await carouselCount.innerText();
  await standardCarousel.locator('button').click();
  const secondStandardUr = await carouselCount.innerText();
  assert.notEqual(secondStandardUr, firstStandardUr, 'The current-main standard UR carousel must remain interactive');
  await page.locator('#gacha-pool-select').selectOption('swordwild_shanhe_v3');
  const debut = page.locator('.dream-debut-overlay');
  await debut.waitFor({ state: 'visible' });
  const skipDebut = page.locator('.dream-debut-overlay [data-role="skip"]');
  await skipDebut.waitFor({ state: 'visible' }); await skipDebut.click();
  await page.locator('#gacha-pet-awakening-toggle').waitFor({ state: 'visible' });
  await debut.waitFor({ state: 'detached' });
  assert.equal(await page.locator('#gacha-pet-awakening-toggle').getAttribute('aria-expanded'), 'false');
  assert.equal(await page.locator('#gacha-pet-awakening-guide').isVisible(), false);
  await page.screenshot({ path: path.join(report, 'preview-https-collapsed.png'), fullPage: true });
  await page.locator('#gacha-pet-awakening-toggle').click();
  await page.locator('#gacha-pet-awakening-guide').waitFor({ state: 'visible' });
  assert.match(await page.locator('#gacha-pet-awakening-guide').innerText(), /Lv.5[\s\S]*接下後出發[\s\S]*松香行旅糰一份/);
  await page.screenshot({ path: path.join(report, 'preview-https-393.png'), fullPage: true });
  const before = await page.evaluate(async () => (await (await import('./src/gachaService.js')).getGachaStats()).totalPulls);
  assert.deepEqual(errors, []);
  await context.setOffline(true); await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#task-view-content')?.children.length && navigator.serviceWorker.controller);
  assert.deepEqual(errors, []);
  const offlineReload = await page.evaluate(() => Boolean(navigator.serviceWorker.controller));
  const output = { status: 'passed', verifiedAt: new Date().toISOString(), artifactId: pins.artifactId, previewUrl: base,
    detail: { version: data.version, initialImages: data.initialImages.length, serviceWorker: data.serviceWorker,
      standardCarousel: true,
      collapsedAndExpanded: true, guideText: true, freshBrowserStorage: true, gachaTotalPullsUnchanged: await page.evaluate(async (n) => (await (await import('./src/gachaService.js')).getGachaStats()).totalPulls === n, before), offlineReload },
    blockedExternalOrigins: [...new Set(blocked)], errors };
  assert.equal(output.detail.gachaTotalPullsUnchanged, true); await fs.writeFile(path.join(report, 'preview-browser.json'), JSON.stringify(output, null, 2) + '\n');
  console.log(JSON.stringify(output, null, 2)); await context.close();
} finally { await browser.close(); }
