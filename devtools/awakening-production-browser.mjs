/** Fresh browser storage for the exact deployed feature artifact; no player data. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { APP_VERSION } from '../src/version.js';
const root = path.resolve(import.meta.dirname, '..');
const report = path.join(root, 'reports/awakening-implementation');
const pins = JSON.parse(await fs.readFile(path.join(report, 'artifacts.json'))).production;
const verified = JSON.parse(await fs.readFile(path.join(report, 'production-https.json')));
assert.equal(verified.status, 'passed'); assert.equal(verified.artifactId, pins.artifactId);
const { chromium } = createRequire(import.meta.url)(process.env.QUESTNOTE_PLAYWRIGHT_PACKAGE || 'playwright');
const base = 'https://leotsouo.github.io/questnote-pwa/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, reducedMotion: 'reduce' });
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return url.origin === new URL(base).origin && url.pathname.startsWith(new URL(base).pathname) ? route.continue() : route.abort();
  });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#task-view-content')?.children.length && navigator.serviceWorker.controller, null, { timeout: 90000 });
  const skip = page.locator('.onboarding-dialog [data-onboarding-action="skip"]'); if (await skip.isVisible()) await skip.click();
  const detail = await page.evaluate(async () => {
    const catalog = await (await import('./src/petAwakeningCatalog.js')).loadAwakeningCatalog();
    const bundle = await (await import('./src/releaseCatalog.js')).loadCatalogBundle();
    const dimensions = [];
    for (const entry of catalog.pets) {
      const pet = bundle.petsData.pets.find((p) => p.id === entry.petId);
      for (const src of [entry.initialImage.card, entry.initialImage.stage, entry.awakenedImage?.card || pet.imageVariants.card, entry.awakenedImage?.stage || pet.imageVariants.stage]) {
        dimensions.push(await new Promise((resolve, reject) => {
          const image = new Image(); image.onload = () => resolve([image.naturalWidth, image.naturalHeight]); image.onerror = () => reject(Error(src)); image.src = src;
        }));
      }
    }
    const map = await new Promise((resolve, reject) => {
      const image = new Image(); image.onload = () => resolve([image.naturalWidth, image.naturalHeight]); image.onerror = reject; image.src = './assets/expeditions/cloudrest_trail.webp';
    });
    const toad = catalog.pets.find((p) => p.petId === 'pet_ur17');
    await (await import('./src/petAwakeningScene.js')).playAwakeningScene(toad, bundle.petsData.pets.find((p) => p.id === toad.petId), { reducedMotion: true });
    return { version: (await import('./src/version.js')).APP_VERSION, database: (await (await import('./src/db.js')).openDB()).name,
      artifactId: document.querySelector('meta[name="questnote-artifact"]').content, awakeningCount: catalog.pets.length,
      imageCount: dimensions.length, map, toadArt: toad.awakenedImage.original,
      todayHabitsPresent: Boolean(document.querySelector('.today-habits')) };
  });
  assert.equal(detail.version, APP_VERSION); assert.equal(detail.database, 'QuestNoteDB'); assert.equal(detail.artifactId, pins.artifactId);
  assert.equal(detail.awakeningCount, 20); assert.equal(detail.imageCount, 80); assert.deepEqual(detail.map, [960, 540]);
  assert.ok(detail.toadArt.includes('2bf6ab94c0a0')); assert.equal(detail.todayHabitsPresent, true);
  await page.screenshot({ path: path.join(report, 'production-https-393.png'), fullPage: true });
  await context.setOffline(true); await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#task-view-content')?.children.length && navigator.serviceWorker.controller);
  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(report, 'production-https-browser.json'), JSON.stringify({ status: 'passed', verifiedAt: new Date().toISOString(),
    artifactId: pins.artifactId, previewUrl: base, freshBrowserStorage: true, offlineReload: true, detail, pageErrors: errors }, null, 2) + '\n');
  console.log('PASS exact HTTPS artifact, twenty pairs, open-mouth toad, map, Today habits, replay and offline reload');
} finally { await browser.close(); }
