/** Read-only deployed production smoke with fresh browser storage. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const root = path.resolve(import.meta.dirname, '..');
const report = path.join(root, 'reports/swordwild-release');
const artifacts = JSON.parse(await fs.readFile(path.join(report, 'artifacts.json')));
const verified = JSON.parse(await fs.readFile(path.join(report, 'production-https.json')));
assert.equal(verified.status, 'passed');
assert.equal(verified.artifactId, artifacts.production.artifactId);
const { chromium } = createRequire(import.meta.url)(process.env.QUESTNOTE_PLAYWRIGHT_PACKAGE || 'playwright');
const base = 'https://leotsouo.github.io/questnote-pwa/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, reducedMotion: 'reduce' });
  const blocked = [];
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === new URL(base).origin && url.pathname.startsWith('/questnote-pwa/')) await route.continue();
    else { blocked.push(url.origin); await route.abort(); }
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#task-view-content')?.children.length && navigator.serviceWorker.controller, null, { timeout: 90000 });
  const skip = page.locator('.onboarding-dialog [data-onboarding-action="skip"]');
  if (await skip.isVisible()) await skip.click();
  const detail = await page.evaluate(async () => {
    const version = await import('./src/version.js');
    const db = await import('./src/db.js');
    const catalog = await import('./src/releaseCatalog.js').then((m) => m.loadCatalogBundle());
    const pets = catalog.petsData.pets.filter((p) => p.seriesId === 'swordwild_shanhe_v3');
    const images = await Promise.all(pets.map((p) => new Promise((resolve, reject) => {
      const image = new Image(); image.onload = () => resolve(p.id); image.onerror = () => reject(Error(p.id)); image.src = p.imageVariants.card;
    })));
    const food = await fetch('./data/craftables.json').then((r) => r.json());
    const regions = await fetch('./data/expeditions.json').then((r) => r.json());
    const stories = await fetch('./data/bond-stories.json').then((r) => r.json());
    await import('./src/ui.js').then((m) => m.openTeachingTarget({ view: 'gacha' }));
    return { version: version.APP_VERSION, database: (await db.openDB()).name, images: images.length,
      petCount: pets.length, urCount: pets.filter((p) => p.rarity === 'UR').length,
      food: JSON.stringify(food).includes('item_pine_trail_riceball'), region: JSON.stringify(regions).includes('cloudrest_trail'),
      chapters: stories.stories.filter((s) => pets.some((p) => p.id === s.petId)).reduce((total, s) => total + s.chapters.length, 0) };
  });
  assert.equal(detail.version, '3.5.3');
  assert.equal(detail.database, 'QuestNoteDB');
  assert.equal(detail.petCount, 20); assert.equal(detail.urCount, 3); assert.equal(detail.images, 20);
  assert.equal(detail.chapters, 80); assert.equal(detail.food, true); assert.equal(detail.region, true);
  assert.equal(await page.locator('#gacha-pool-select').inputValue(), 'standard', 'Latest formal default-standard behavior must remain');
  await page.locator('#gacha-pool-select').selectOption('swordwild_shanhe_v3');
  await page.locator('.dream-debut-skip').waitFor(); await page.locator('.dream-debut-skip').click();
  await page.locator('.dream-debut-overlay').waitFor({ state: 'detached' });
  await page.screenshot({ path: path.join(report, 'production-https-393.png'), fullPage: true });
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#task-view-content')?.children.length && navigator.serviceWorker.controller);
  assert.deepEqual(errors, []);
  const output = { status: 'passed', verifiedAt: new Date().toISOString(), httpsUrl: base, artifactId: artifacts.production.artifactId,
    detail, freshBrowserContext: true, defaultStandardPreserved: true, offlineReload: true, blockedExternalOrigins: [...new Set(blocked)], errors };
  await fs.writeFile(path.join(report, 'production-https-browser.json'), JSON.stringify(output, null, 2) + '\n');
  console.log(JSON.stringify(output, null, 2));
} finally { await browser.close(); }
