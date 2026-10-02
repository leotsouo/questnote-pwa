/** Native old-formal -> proposed-production update on a private synthetic origin. */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const root = path.resolve(import.meta.dirname, '..');
const reports = path.join(root, 'reports/awakening-implementation');
const pins = JSON.parse(await fs.readFile(path.join(reports, 'artifacts.json'))).production;
const baseline = JSON.parse(await fs.readFile(path.join(reports, 'formal-baseline.json')));
const previous = baseline.artifactDir;
const oldManifest = JSON.parse(await fs.readFile(path.join(previous, 'release-artifact.json')));
assert.equal(oldManifest.artifactId, baseline.artifactId);
for (const [file, entry] of Object.entries(oldManifest.files)) assert.equal(createHash('sha256').update(await fs.readFile(path.join(previous, file))).digest('hex'), entry.sha256);
let usingOld = true;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const server = http.createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const uri = new URL(req.url, 'http://127.0.0.1').pathname;
    if (req.method !== 'GET' || !uri.startsWith(pins.scopePath)) { res.writeHead(403).end(); return; }
    const relative = uri.slice(pins.scopePath.length) || 'index.html';
    if (relative.includes('..') || relative.includes('\\') || relative.startsWith('.')) { res.writeHead(403).end(); return; }
    const bytes = await fs.readFile(path.join(usingOld ? previous : pins.artifactDir, relative));
    res.writeHead(200, { 'Content-Type': types[path.extname(relative)] || 'application/octet-stream' }).end(bytes);
  } catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}${pins.scopePath}`;
const { chromium } = createRequire(import.meta.url)(process.env.QUESTNOTE_PLAYWRIGHT_PACKAGE || 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
let context;
try {
  context = await browser.newContext({ viewport: { width: 393, height: 852 }, reducedMotion: 'reduce' });
  await context.route('**/*', (r) => new URL(r.request().url()).origin === new URL(base).origin ? r.continue() : r.abort());
  const page = await context.newPage();
  await page.goto(base); await page.waitForFunction(() => document.querySelector('#guide-tutorial-status')?.textContent && navigator.serviceWorker.controller, null, { timeout: 90000 });
  const skip = page.locator('.onboarding-dialog [data-onboarding-action="skip"]'); if (await skip.isVisible()) await skip.click();
  const before = await page.evaluate(async () => {
    const db = await import('./src/db.js'); const c = await import('./src/collectionService.js');
    await c.addPetToCollection('pet_ur17'); const p = await c.getPetCollection('pet_ur17'); await db.dbPut('collection', { ...p, bondLevel: 5, bondExp: 500 }); await c.setCompanion('pet_ur17');
    const bond = (await import('./src/bondJourneyCore.js')).createBondJourney(); const at = new Date(Date.now() - 10000).toISOString();
    bond.byPet.pet_ur17 = { chapters: Object.fromEntries([2,3,4,5].map((lv) => [lv, { choiceId: 'gentle', readAt: at, completedAt: at, claimedAt: at }])) }; await db.dbPut('meta', bond);
    await db.dbPut('meta', { key: 'inventory', items: { item_pine_trail_riceball: 2 }, itemUsageLogs: {} });
    return { pet: await c.getPetCollection('pet_ur17'), journey: bond, version: (await import('./src/version.js')).APP_VERSION };
  }); assert.equal(before.version, '3.5.4');
  usingOld = false; await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  await page.locator('#update-banner [data-app-update="apply"]').waitFor({ timeout: 90000 });
  await Promise.all([page.waitForEvent('framenavigated', { predicate: (f) => f === page.mainFrame(), timeout: 90000 }), page.locator('#update-banner [data-app-update="apply"]').click()]);
  await page.waitForFunction((id) => document.querySelector('meta[name="questnote-artifact"]')?.content === id && document.querySelector('#guide-tutorial-status')?.textContent, pins.artifactId, { timeout: 90000 });
  const upgraded = await page.evaluate(async () => {
    const db = await import('./src/db.js'); const a = await import('./src/petAwakeningService.js');
    return { pet: await (await import('./src/collectionService.js')).getPetCollection('pet_ur17'), journey: await db.dbGet('meta', 'bondJourney'),
      awakening: await a.getPetAwakening(), database: (await db.openDB()).name, caches: await caches.keys(), version: (await import('./src/version.js')).APP_VERSION };
  });
  assert.deepEqual(upgraded.pet, before.pet); assert.deepEqual(upgraded.journey, before.journey); assert.deepEqual(upgraded.awakening.byPet, {});
  assert.equal(upgraded.version, '3.5.5'); assert.equal(upgraded.database, 'QuestNoteDB'); assert.ok(upgraded.caches.some((k) => k.includes(pins.artifactId))); assert.ok(!upgraded.caches.some((k) => k.includes(oldManifest.artifactId)));
  const prepared = await page.evaluate(async () => {
    const service = await import('./src/petAwakeningService.js'); await service.startPetAwakening('pet_ur17');
    const core = await import('./src/petAwakeningCore.js'); const db = await import('./src/db.js');
    const s = await service.getPetAwakening(); const p = s.byPet.pet_ur17; const now = new Date().toISOString();
    p.status = 'ready'; p.eventKeys = ['task:synthetic-a', 'task:synthetic-b', 'habit:synthetic:2026-10-02']; p.expeditionKey = 'expedition:synthetic'; p.tokenGrantedAt = now; s.activePetId = null; s.usedEventKeys = [...p.eventKeys, p.expeditionKey];
    if (core.validatePetAwakening(s).length) throw Error('Invalid synthetic completed trial'); await db.dbPut('meta', s); await service.awakenPet('pet_ur17');
    const catalog = await (await import('./src/petAwakeningCatalog.js')).loadAwakeningCatalog(); const entry = catalog.pets.find((p) => p.petId === 'pet_ur17');
    const pets = (await (await import('./src/releaseCatalog.js')).loadCatalogBundle()).petsData.pets;
    const scene = await import('./src/petAwakeningScene.js'); await scene.preloadAwakeningForms(entry, pets.find((p) => p.id === 'pet_ur17'));
    await fetch('./assets/expeditions/cloudrest_trail.webp').then((r) => { if (!r.ok) throw Error('Map missing'); });
    await service.setAwakeningForm('pet_ur17', 'initial'); return service.getPetAwakening();
  });
  await context.setOffline(true); await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#guide-tutorial-status')?.textContent, null, { timeout: 30000 });
  const offline = await page.evaluate(async () => {
    const service = await import('./src/petAwakeningService.js'); const catalog = await (await import('./src/petAwakeningCatalog.js')).loadAwakeningCatalog(); const entry = catalog.pets.find((p) => p.petId === 'pet_ur17');
    const pets = (await (await import('./src/releaseCatalog.js')).loadCatalogBundle()).petsData.pets; const pet = pets.find((p) => p.id === 'pet_ur17');
    const images = [];
    for (const src of [entry.initialImage.card, entry.initialImage.stage, entry.awakenedImage.card, entry.awakenedImage.stage, './assets/expeditions/cloudrest_trail.webp']) await new Promise((resolve, reject) => { const i = new Image(); i.onload = () => { images.push({ src, width: i.naturalWidth, height: i.naturalHeight }); resolve(); }; i.onerror = () => reject(Error(src)); i.src = src; });
    await (await import('./src/petAwakeningScene.js')).playAwakeningScene(entry, pet, { reducedMotion: true });
    await service.setAwakeningForm('pet_ur17', 'awakened'); await service.setAwakeningForm('pet_ur17', 'initial');
    const backup = await (await import('./src/backupService.js')).exportBackup(); return { state: await service.getPetAwakening(), images, backupVersion: backup.appVersion };
  }); assert.deepEqual(offline.state, prepared); assert.equal(offline.backupVersion, '3.5.5'); assert.deepEqual([offline.images.at(-1).width, offline.images.at(-1).height], [960, 540]);
  await page.screenshot({ path: path.join(reports, 'update-offline-mobile.png'), fullPage: true });
  await fs.writeFile(path.join(reports, 'update-offline.json'), JSON.stringify({ status: 'passed', testedAt: new Date().toISOString(), from: before.version, to: upgraded.version, previousArtifactId: baseline.artifactId, artifactId: pins.artifactId, savedPetAndStoryPreserved: true, isolatedDatabase: upgraded.database, oldCacheRemoved: true, offline }, null, 2) + '\n');
  console.log('PASS formal V3.5.4 -> proposed V3.5.5 save/cache upgrade, double forms, map, replay and backup offline');
} finally { await context?.close(); await browser.close(); await new Promise((r) => server.close(r)); }
