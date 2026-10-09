/** Real prior formal artifact -> new artifact, on an isolated loopback origin. */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { verifyReleaseArtifact } from '../scripts/verify-release-artifact.mjs';
const report = path.resolve(process.argv[2]);
const previousPins = JSON.parse(await fs.readFile(process.argv[3])).production;
const pins = JSON.parse(await fs.readFile(path.join(report, 'artifacts.json'))).production;
for (const pin of [previousPins, pins]) await verifyReleaseArtifact({ ...pin, profile: 'production' });
let usingOld = true;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json' };
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const relative = pathname.slice(pins.scopePath.length) || 'index.html';
    if (request.method !== 'GET' || !pathname.startsWith(pins.scopePath) || relative.split('/').some((part) => part === '..' || part === '.') || relative.includes('\\')) { response.writeHead(403).end(); return; }
    const bytes = await fs.readFile(path.join(usingOld ? previousPins.artifactDir : pins.artifactDir, relative));
    response.writeHead(200, { 'Content-Type': types[path.extname(relative)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(bytes);
  } catch { response.writeHead(404).end(); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const { chromium } = createRequire(import.meta.url)(process.env.QUESTNOTE_PLAYWRIGHT_PACKAGE || 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
const context = await browser.newContext({ viewport: { width: 393, height: 852 }, reducedMotion: 'reduce' });
try {
  await context.route('**/*', (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  await page.goto(origin + pins.scopePath);
  await page.waitForFunction(() => document.querySelector('#guide-tutorial-status')?.textContent && navigator.serviceWorker.controller, null, { timeout: 90000 });
  if (await page.locator('[data-onboarding-action="skip"]').isVisible()) await page.locator('[data-onboarding-action="skip"]').click();
  await page.waitForFunction(() => document.body.classList.contains('guided-learned') || document.querySelector('[data-guided-action="skip"]'));
  if (await page.locator('[data-guided-action="skip"]').isVisible()) {
    await page.locator('[data-guided-action="skip"]').click(); await page.locator('[data-guided-action="confirm-skip"]').click();
    await page.locator('.guided-coach').waitFor({ state: 'detached' });
  }
  const before = await page.evaluate(async () => {
    const db = await import('./src/db.js'); const collection = await import('./src/collectionService.js');
    await collection.addPetToCollection('pet_ur17');
    await db.dbPut('collection', { ...await collection.getPetCollection('pet_ur17'), bondLevel: 5, bondExp: 500 });
    const journey = (await import('./src/bondJourneyCore.js')).createBondJourney();
    const at = new Date(Date.now() - 10000).toISOString();
    journey.byPet.pet_ur17 = { chapters: Object.fromEntries([2, 3, 4, 5].map((level) => [level, { choiceId: 'gentle', readAt: at, completedAt: at, claimedAt: at }])) };
    await db.dbPut('meta', journey);
    return { pet: await collection.getPetCollection('pet_ur17'), journey, version: (await import('./src/version.js')).APP_VERSION };
  });
  assert.equal(before.version, '3.9.5');
  usingOld = false;
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  await page.locator('#update-banner [data-app-update="apply"]').waitFor({ timeout: 90000 });
  await Promise.all([page.waitForEvent('framenavigated', { predicate: (frame) => frame === page.mainFrame(), timeout: 90000 }), page.locator('#update-banner [data-app-update="apply"]').click()]);
  await page.waitForFunction((id) => document.querySelector('meta[name="questnote-artifact"]')?.content === id && document.querySelector('#guide-tutorial-status')?.textContent, pins.artifactId, { timeout: 90000 });
  const after = await page.evaluate(async () => {
    const db = await import('./src/db.js');
    return { pet: await (await import('./src/collectionService.js')).getPetCollection('pet_ur17'), journey: await db.dbGet('meta', 'bondJourney'), version: (await import('./src/version.js')).APP_VERSION, database: (await db.openDB()).name, caches: await caches.keys() };
  });
  assert.deepEqual(after.pet, before.pet); assert.deepEqual(after.journey, before.journey);
  assert.equal(after.version, '3.9.8'); assert.equal(after.database, 'QuestNoteDB');
  assert.ok(after.caches.some((name) => name.includes(pins.artifactId)));
  assert.ok(!after.caches.some((name) => name.includes(previousPins.artifactId)));
  async function allForms() {
    return page.evaluate(async () => {
      const preview = await import('./src/poolAwakeningPreview.js');
      const catalog = await (await import('./src/petAwakeningCatalog.js')).loadAwakeningCatalog();
      const pets = (await (await import('./src/releaseCatalog.js')).loadCatalogBundle()).petsData.pets;
      const host = document.createElement('div'); document.body.append(host);
      let count = 0;
      try {
        for (const entry of catalog.pets) {
          const pet = pets.find((row) => row.id === entry.petId);
          host.innerHTML = preview.renderPoolAwakeningPreview(pet, catalog);
          const card = host.firstElementChild; preview.bindPoolAwakeningPreview(card, { reduceMotion: () => true });
          await host.querySelector('[data-preview-face="initial"] img').decode();
          const button = host.querySelector('button'); button.click();
          await new Promise((resolve, reject) => {
            const started = Date.now();
            const tick = () => button.getAttribute('aria-pressed') === 'true' ? resolve() : Date.now() - started > 15000 ? reject(Error('Flip failed ' + entry.petId)) : setTimeout(tick, 20);
            tick();
          });
          const image = host.querySelector('[data-preview-face="awakened"] img');
          if (!image.naturalWidth || getComputedStyle(image).filter !== 'none') throw Error('Invalid full-color image');
          button.click(); if (button.getAttribute('aria-pressed') !== 'false') throw Error('Reverse failed');
          count++;
        }
      } finally { host.remove(); }
      return count;
    });
  }
  assert.equal(await allForms(), 31);
  await page.waitForTimeout(500);
  await context.setOffline(true); await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#guide-tutorial-status')?.textContent);
  assert.equal(await allForms(), 31);
  const backupVersion = await page.evaluate(async () => (await (await import('./src/backupService.js')).exportBackup()).appVersion);
  assert.equal(backupVersion, '3.9.8');
  await fs.writeFile(path.join(report, 'update-offline.json'), JSON.stringify({ ok: true, testedAt: new Date().toISOString(), from: before.version, to: after.version, previousArtifactId: previousPins.artifactId, artifactId: pins.artifactId, savedPetAndStoryPreserved: true, oldCacheRemoved: true, offlineForms: 31, backupVersion, environment: 'fresh synthetic loopback; no player storage accessed' }, null, 2) + '\n');
  console.log('PASS V3.9.5 -> V3.9.8 native update, save preservation, all 31 forms online/offline and backup');
} finally { await context.close(); await browser.close(); await new Promise((resolve) => server.close(resolve)); }
