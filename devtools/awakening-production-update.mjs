import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(process.env.QUESTNOTE_PLAYWRIGHT_PACKAGE || 'playwright');
const root = path.resolve(import.meta.dirname, '..');
const report = path.join(root, 'reports/awakening-implementation');
const baseline = JSON.parse(await fs.readFile(path.join(report, 'formal-baseline.json')));
const previous = baseline.artifactDir;
const oldManifest = JSON.parse(await fs.readFile(path.join(previous, 'release-artifact.json')));
const pins = JSON.parse(await fs.readFile(path.join(report, 'artifacts.json'))).production;
const https = JSON.parse(await fs.readFile(path.join(report, 'production-https.json')));
assert.equal(https.artifactId, pins.artifactId); assert.equal(https.status, 'passed');
assert.equal(oldManifest.artifactId, baseline.artifactId);
for (const [file, record] of Object.entries(oldManifest.files)) {
  const bytes = await fs.readFile(path.join(previous, file));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), record.sha256, `Previous artifact: ${file}`);
}
const base = 'https://leotsouo.github.io/questnote-pwa/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
try {
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, reducedMotion: 'reduce' });
  let old = true;
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(base).origin || !url.pathname.startsWith('/questnote-pwa/')) { await route.abort(); return; }
    if (!old) { await route.continue(); return; }
    const file = decodeURIComponent(url.pathname.slice('/questnote-pwa/'.length)) || 'index.html';
    if (!oldManifest.files[file] && file !== 'release-artifact.json') { await route.fulfill({ status: 404, body: 'Not in previous artifact' }); return; }
    await route.fulfill({ status: 200, body: await fs.readFile(path.join(previous, file)), contentType: mime[path.extname(file)] || 'application/octet-stream', headers: { 'Cache-Control': 'no-store' } });
  });
  const page = await context.newPage();
  await page.goto(base);
  await page.waitForFunction(() => document.querySelector('#task-view-content')?.children.length && navigator.serviceWorker.controller, null, { timeout: 90000 });
  const skip = page.locator('.onboarding-dialog [data-onboarding-action="skip"]');
  if (await skip.isVisible()) await skip.click();
  assert.equal(await page.evaluate(async () => (await import('./src/version.js')).APP_VERSION), '3.5.4');
  await page.evaluate(async () => {
    const { openDB } = await import('./src/db.js'); const db = await openDB();
    await new Promise((resolve, reject) => { const tx = db.transaction('meta', 'readwrite'); tx.objectStore('meta').put({ key: 'releaseUpgradeProbe', value: 'isolated-v354-save-preserved' }); tx.oncomplete = resolve; tx.onerror = tx.onabort = () => reject(tx.error); });
  });
  old = false;
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  await page.locator('#update-banner [data-app-update="apply"]').waitFor({ timeout: 90000 });
  await Promise.all([page.waitForEvent('framenavigated', { predicate: (frame) => frame === page.mainFrame(), timeout: 90000 }), page.locator('#update-banner [data-app-update="apply"]').click()]);
  await page.waitForFunction(async (expected) => {
    if (!document.querySelector('#task-view-content')?.children.length) return false;
    return document.querySelector('meta[name="questnote-artifact"]')?.content === expected
      && (await import('./src/releaseProfile.js')).RELEASE_PROFILE.artifactId === expected
      && (await import('./src/version.js')).APP_VERSION === '3.5.5';
  }, pins.artifactId, { timeout: 90000 });
  const state = await page.evaluate(async () => {
    const db = await import('./src/db.js').then((m) => m.openDB());
    const value = await new Promise((resolve, reject) => { const request = db.transaction('meta').objectStore('meta').get('releaseUpgradeProbe'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const profile = (await import('./src/releaseProfile.js')).RELEASE_PROFILE;
    const catalog = await import('./src/releaseCatalog.js').then((m) => m.loadCatalogBundle());
    const reg = await navigator.serviceWorker.getRegistration();
    return { probe: value.value, artifactId: profile.artifactId, petCount: catalog.petsData.pets.length, db: db.name, caches: await caches.keys(),
      marker: document.querySelector('meta[name="questnote-artifact"]')?.content, version: (await import('./src/version.js')).APP_VERSION,
      activeWorker: reg.active?.scriptURL, waitingWorker: reg.waiting?.scriptURL,
      uiText: document.body.innerText.slice(0, 1400) };
  });
  await fs.writeFile(path.join(report, 'production-update-diagnostic.json'), JSON.stringify(state, null, 2) + '\n');
  await page.screenshot({ path: path.join(report, 'production-update-diagnostic.png'), fullPage: true });
  assert.equal(state.probe, 'isolated-v354-save-preserved'); assert.equal(state.artifactId, pins.artifactId);
  assert.equal(state.petCount, 116); assert.equal(state.db, 'QuestNoteDB');
  assert.equal(state.caches.some((key) => key.includes(pins.artifactId)), true);
  assert.equal(state.caches.some((key) => key.includes(oldManifest.artifactId)), false);
  await context.setOffline(true); await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#task-view-content')?.children.length && navigator.serviceWorker.controller);
  await page.screenshot({ path: path.join(report, 'production-update-offline.png'), fullPage: true });
  await fs.writeFile(path.join(report, 'production-update.json'), JSON.stringify({ status: 'passed', from: '3.5.4', to: '3.5.5', previousArtifactId: oldManifest.artifactId, artifactId: pins.artifactId,
    previousArtifactRouteFixture: true, currentArtifactFetchedFromFormalHttps: true, isolatedFreshBrowserContext: true,
    explicitUpdateButton: true, storedProbePreserved: true, oldAppCacheRetired: true, offlineReload: true, state, verifiedAt: new Date().toISOString() }, null, 2) + '\n');
  console.log('Actual formal HTTPS update from a pinned V3.5.4 fixture preserved save and reloaded offline');
} catch (error) { console.error(error); throw error; }
finally { await browser.close(); }

