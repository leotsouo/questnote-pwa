/** Real UI/IDB/SW, isolated temporary origin and synthetic data only. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { RACE_SCENE_MS } from '../src/dailyRaceScene.js';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.QUESTNOTE_PLAYWRIGHT_PACKAGE || 'playwright');
const output = path.resolve(process.argv[2]);
await fs.mkdir(output, { recursive: true });
const server = spawn(process.execPath, ['devtools/onboarding-browser-server.mjs', '0', '--workshop-offline'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let browser;
let page;
const results = [];
try {
  const base = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server startup timeout')), 15000);
    server.stdout.on('data', bytes => { const url = String(bytes).match(/http:\/\/127\.0\.0\.1:\d+/); if (url) { clearTimeout(timer); resolve(url[0]); } });
    server.once('error', reject);
  });
  browser = await chromium.launch({ channel: process.env.QUESTNOTE_BROWSER_CHANNEL || 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.stack || error.message));
  const guard = await (await context.request.get(`${base}/__onboarding_test_guard__`)).json();
  assert.equal(guard.purpose, 'questnote-onboarding-synthetic-only');
  async function load() {
    await page.goto(`${base}/index.html`);
    await page.locator('#app-loader').waitFor({ state: 'hidden' });
    await page.waitForFunction(() => !!document.querySelector('#guide-tutorial-status')?.textContent);
    const skip = page.locator('.onboarding-dialog [data-onboarding-action="skip"]');
    if (await skip.isVisible()) await skip.click();
    const guidedSkip = page.locator('[data-guided-action="skip"]');
    if (await guidedSkip.isVisible()) {
      await guidedSkip.click();
      await page.locator('[data-guided-action="confirm-skip"]').click();
    }
    await page.evaluate(async () => {
      window.raceTest = Object.fromEntries(await Promise.all(['db', 'dailyRaceService', 'rewardService', 'backupService', 'ui'].map(async name => [name, await import(`/src/${name}.js`)])));
      if (!(await window.raceTest.db.openDB()).name.startsWith('QuestNoteTest-Onboarding-')) throw new Error('Unsafe database');
    });
  }
  async function open() {
    await page.evaluate(() => window.raceTest.ui.closeModal());
    await page.locator('.bottom-nav [data-view="tasks"]').click();
    const entry = page.locator('.page-header--tasks [data-action="daily-open-race"]');
    if (!await entry.isVisible()) await page.locator('[data-hub="blessing"]').click();
    await entry.click();
    await page.locator('.race-rounds').waitFor();
  }
  const snapshot = () => page.evaluate(async () => ({ state: await window.raceTest.db.dbGet('meta', 'dailyRace'), wallet: await window.raceTest.rewardService.getWallet() }));
  async function choose(stake = '100') {
    await page.locator('input[name="race-pet"]').first().check();
    await page.locator('#race-stake').fill(stake);
    await page.locator('#race-bet-form button[type="submit"]').click();
    await page.locator('[data-race-play="bet"]').waitFor();
  }
  await load();
  await page.evaluate(() => window.raceTest.rewardService.setStardust(2000));
  await load();
  await open();
  assert.equal(await page.locator('.casino-coin-rain > span').count(), 24);
  assert.equal(await page.locator('#homeDailyBlessingContainer [data-action="daily-open-race"]').count(), 0);
  assert.equal(await page.locator('#btn-global-mailbox').evaluate(el => !!el.parentElement.querySelector('.casino-entry-btn')), true);
  results.push('Casino icon shares mailbox row, old blessing entry removed, decorative coin rain appears');
  // Inline handlers have document.URL (a string) in their scope chain.
  // Exercise both image fallbacks instead of relying on a random offline miss.
  await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.id = 'race-image-fallback-check';
    probe.hidden = true;
    const pet = { id: 'pet_test', name: 'Fallback test', image: '/assets/pets/missing-original.png', imageVariants: { card: '/assets/pets/missing-card.webp' } };
    probe.innerHTML = window.raceTest.ui.petImageHtml(pet, { eager: true }) + window.raceTest.ui.petImageHtml(pet, { eager: true, framed: false });
    document.body.append(probe);
  });
  await page.locator('#race-image-fallback-check .pet-image-frame.is-error').waitFor({ state: 'attached' });
  await page.locator('#race-image-fallback-check .pet-img--placeholder').waitFor({ state: 'attached' });
  assert.equal(await page.locator('#race-image-fallback-check .pet-image-frame__fallback').innerText(), '?');
  await page.locator('#race-image-fallback-check').evaluate(el => el.remove());
  results.push('Missing card and original images reach framed and legacy fallbacks without errors');
  for (const theme of ['default', 'sweet', 'twilight']) {
    await page.evaluate(theme => window.raceTest.ui.applyTheme(theme, { silent: true }), theme);
    await page.locator('.race-entrant img').evaluateAll(images => Promise.all(images.map(img => img.decode().catch(() => {}))));
    await page.screenshot({ path: path.join(output, `mobile-${theme}.png`), fullPage: false, animations: 'disabled' });
    assert.equal(await page.locator('#modal-body').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, `${theme} overflows`);
  }
  await page.evaluate(() => window.raceTest.ui.applyTheme('default', { silent: true }));
  await choose();
  assert.match(await page.locator('#daily-race-panel').innerText(), /1,500/);
  assert.match(await page.locator('#daily-race-panel').innerText(), /380/);
  await page.locator('[data-race-play="bet"]').click();
  await page.locator('.race-show__arena').waitFor();
  assert.equal(await page.locator('.race-show h2').innerText(), '比賽進行中');
  assert.doesNotMatch(await page.locator('.race-show').innerText(), /劇本|正常賽跑|領先太多|全部跑反|今天不想上班/);
  const committed = await snapshot();
  const r = committed.state.day.rounds[0].result;
  assert.equal(committed.wallet.stardust, 2000 - 100 + r.payout);
  await page.screenshot({ path: path.join(output, 'mobile-running.png'), fullPage: false });
  await page.locator('.race-receipt').waitFor({ timeout: RACE_SCENE_MS + 15000 });
  results.push('Real entry, confirmation, 20-second animation and receipt match committed balance');
  await page.locator('[data-race-round="1"]').click();
  await page.locator('[data-race-action="watch"]').click();
  await page.locator('[data-race-play="watch"]').click();
  await page.locator('[data-scene-skip]').click();
  await page.locator('.race-receipt').waitFor();
  assert.equal((await snapshot()).wallet.stardust, committed.wallet.stardust);
  results.push('Free watch consumes one round without currency; skip reveals saved outcome');
  await page.locator('[data-race-round="2"]').click();
  await choose('5');
  await page.locator('[data-race-play="bet"]').click();
  await page.locator('.race-show__arena').waitFor();
  const interrupted = await snapshot();
  await page.evaluate(() => window.raceTest.ui.closeModal());
  await load(); await open();
  assert.deepEqual(await snapshot(), interrupted);
  assert.equal(await page.locator('#race-bet-form').count(), 0);
  assert.match(await page.locator('.race-day-done').innerText(), /三段旅程/);
  results.push('Closing during animation and reloading preserves all three settled rounds');

  // Fresh synthetic round for competing tabs and native transaction-abort checks.
  const request = await page.evaluate(async () => {
    const t = window.raceTest;
    const state = await t.db.dbGet('meta', 'dailyRace');
    state.day.rounds.forEach(r => { r.result = null; });
    await t.db.dbPut('meta', state);
    await t.rewardService.setStardust(1000);
    return { date: state.day.date, round: 0, mode: 'bet', stake: 500, selectedId: state.day.rounds[0].petIds[0] };
  });
  const other = await context.newPage();
  await other.goto(`${base}/index.html`);
  await other.locator('#app-loader').waitFor({ state: 'hidden' });
  const concurrent = await Promise.all([
    page.evaluate(request => window.raceTest.dailyRaceService.playDailyRace(request), request),
    other.evaluate(async request => (await import('/src/dailyRaceService.js')).playDailyRace(request), request),
  ]);
  assert.equal(concurrent.filter(r => r.duplicate).length, 1);
  assert.deepEqual(concurrent[0].result, concurrent[1].result);
  assert.equal((await snapshot()).wallet.stardust, 1000 - 500 + concurrent[0].result.payout);
  await other.close();
  results.push('Native IDB serializes two tabs: exactly one bet/settlement');
  const abort = await page.evaluate(async () => {
    const t = window.raceTest, before = await t.db.dbGet('meta', 'dailyRace'), wallet = await t.rewardService.getWallet();
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function(value, ...args) { if (value.key === 'wallet') throw new Error('Synthetic write failure'); return original.call(this, value, ...args); };
    let rejected = false;
    try { await t.dailyRaceService.playDailyRace({ date: before.day.date, round: 1, mode: 'bet', stake: 5, selectedId: before.day.rounds[1].petIds[0] }); }
    catch { rejected = true; } finally { IDBObjectStore.prototype.put = original; }
    return { rejected, sameState: JSON.stringify(before) === JSON.stringify(await t.db.dbGet('meta', 'dailyRace')), sameWallet: JSON.stringify(wallet) === JSON.stringify(await t.rewardService.getWallet()) };
  });
  assert.deepEqual(abort, { rejected: true, sameState: true, sameWallet: true });
  results.push('Aborted wallet write rolls back the race receipt as well');
  const backup = await page.evaluate(async () => {
    const t = window.raceTest, saved = await t.backupService.exportBackup();
    const before = JSON.stringify(saved.data.dailyRace);
    await t.db.dbDelete('meta', 'dailyRace');
    await t.backupService.restoreBackup(t.backupService.normalizeBackupPayload(saved));
    return { same: before === JSON.stringify(await t.db.dbGet('meta', 'dailyRace')), version: saved.appVersion };
  });
  assert.equal(backup.same, true);
  results.push('Real backup export/import restores race data and wallet atomically');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open();
  await page.locator('[data-race-round="1"]').click();
  await page.locator('[data-race-action="watch"]').click();
  await page.locator('[data-race-play="watch"]').click();
  await page.locator('.race-receipt').waitFor();
  assert.equal(await page.locator('.race-show__arena').count(), 0);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: path.join(output, 'desktop-receipt.png'), fullPage: false });
  results.push('Reduced motion reveals directly; desktop receipt and mobile layouts render');
  await page.evaluate(() => Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => setTimeout(() => reject(new Error('SW not ready')), 45000))]));
  await load();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await load(); await open();
  await page.locator('[data-race-round="2"]').click();
  await page.locator('[data-race-action="watch"]').click();
  await page.locator('[data-race-play="watch"]').click();
  await page.locator('.race-receipt').waitFor();
  await page.screenshot({ path: path.join(output, 'offline-receipt.png'), fullPage: false });
  results.push('Native service worker reload and a new race complete fully offline');
  assert.deepEqual(errors, []);
  console.log(results.join('\n'));
  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ results, errors }, null, 2));
} catch (error) {
  await page?.screenshot({ path: path.join(output, 'failure.png'), fullPage: false }).catch(() => {});
  await fs.writeFile(path.join(output, 'partial-results.json'), JSON.stringify(results, null, 2));
  throw error;
} finally {
  await browser?.close();
  server.kill();
}
