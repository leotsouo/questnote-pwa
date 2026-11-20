/** Real presentation and draw UI on a UUID-isolated synthetic origin. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { closeMigrationNotice } from './browser-test-origin.mjs';
const root = path.resolve(import.meta.dirname, '..');
const report = process.env.QUESTNOTE_BROWSER_EVIDENCE_DIR || path.join(root, '.dev-backups/evidence/browser/awakening-guide');
await fs.mkdir(report, { recursive: true });
const { chromium } = createRequire(import.meta.url)(process.env.QUESTNOTE_PLAYWRIGHT_PACKAGE || 'playwright');
const server = spawn(process.execPath, ['devtools/onboarding-browser-server.mjs', '0'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
const base = await new Promise((resolve, reject) => { let output = ''; server.stdout.on('data', (b) => { output += b; const match = output.match(/http:\/\/127\.0\.0\.1:\d+/); if (match) resolve(match[0]); }); server.once('error', reject); });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
await context.route('**/*', (r) => new URL(r.request().url()).origin === base ? r.continue() : r.abort());
const page = await context.newPage(); page.setDefaultTimeout(25000);
const app = page.frameLocator('#preview');
const errors = []; const checks = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await page.goto(`${base}/devtools/awakening-guide-review.html`);
  await page.locator('#preview').waitFor();
  await app.locator('#app-loader').waitFor({ state: 'hidden' });
  const frame = page.frames().find((f) => f.url().endsWith('/index.html'));
  await frame.waitForFunction(() => document.querySelector('#guide-tutorial-status')?.textContent);
  if (await app.locator('[data-onboarding-action="skip"]').isVisible()) await app.locator('[data-onboarding-action="skip"]').click();
  await closeMigrationNotice(app);
  await frame.evaluate(async () => {
    if (!window.__questNoteOnboardingTest) throw Error('Synthetic guard missing');
    window.guideTest = Object.fromEntries(await Promise.all(['db', 'gachaService', 'petAwakeningService', 'petAwakeningCatalog', 'releaseCatalog', 'ui'].map(async (name) => [name, await import(`/src/${name}.js`)])));
  });
  const catalog = await frame.evaluate(() => window.guideTest.petAwakeningCatalog.loadAwakeningCatalog());
  // V3.5.20 (6fb9615) replaced the legacy gacha view (and its hidden #gacha-pet-awakening-toggle) with the
  // encounter surface; V3.9.8 (091e9d3) moved the pool-side explanation into card flip previews. The full
  // tutorial still lives in the guide view.
  await frame.evaluate(() => window.guideTest.ui.switchView('guide'));
  await app.locator('#view-guide.active').waitFor();
  await app.locator('#guide-pet-awakening').scrollIntoViewIfNeeded();
  assert.match(await app.locator('#guide-pet-awakening').textContent(), /暫停[\s\S]*進度保留/);
  await page.screenshot({ path: path.join(report, 'mobile-full-guide.png') });
  checks.push('full awakening tutorial explains pause and kept progress');
  await app.locator('.bottom-nav [data-view="collection"]').click();
  for (const entry of catalog.pets) {
    const src = await app.locator(`#view-collection [data-pet="${entry.petId}"] img`).getAttribute('src');
    assert.ok(src.endsWith(entry.initialImage.card), `${entry.petId} initial portrait`);
  }
  const openReader = async (id) => {
    await app.locator('.bottom-nav [data-view="collection"]').click();
    await app.locator(`#view-collection [data-pet="${id}"]`).click();
    await app.locator('[data-identity-action="app-pet-detail"]').click();
    await app.locator(`[data-awake-open="${id}"]`).click();
    await app.locator('.awakening-reader').waitFor();
  };
  await openReader('pet_ur16');
  const before = await app.locator('.awakening-reader img').first().getAttribute('src');
  assert.ok(before.includes('-initial-'));
  await app.locator('[data-awake-action="awaken"]').click();
  await app.locator('.awakening-scene').waitFor();
  assert.ok(!(await app.locator('.awakening-after').getAttribute('src')).includes('-initial-'));
  await app.locator('.awakening-scene__skip').click();
  await app.locator('.awakening-scene').waitFor({ state: 'detached' });
  await frame.waitForFunction(() => document.querySelector('.awakening-reader')?.textContent.includes('目前：覺醒相'));
  assert.ok(!(await app.locator('.awakening-reader img').first().getAttribute('src')).includes('-initial-'));
  await app.locator('[data-awake-action="close"]').click();
  await app.locator('#modal-close').click();
  await page.reload();
  await page.locator('#preview').waitFor();
  await app.locator('#guide-tutorial-status').waitFor({ state: 'attached' });
  await app.locator('#app-loader').waitFor({ state: 'hidden' });
  const reloadFrame = page.frames().find((f) => f.url().endsWith('/index.html'));
  await reloadFrame.waitForFunction(() => document.querySelector('#guide-tutorial-status')?.textContent);
  await closeMigrationNotice(app);
  await openReader('pet_ur16');
  assert.ok(!(await app.locator('.awakening-reader img').first().getAttribute('src')).includes('-initial-'), 'awakened form persists');
  await app.locator('[data-awake-action="close"]').click();
  await app.locator('#modal-close').click();
  await openReader('pet_ur17');
  assert.ok((await app.locator('.awakening-reader img').first().getAttribute('src')).includes('-initial-'), 'chosen initial form persists');
  await app.locator('[data-awake-action="close"]').click();
  await app.locator('#modal-close').click();
  checks.push('twenty initial portraits load; ritual reveals new art; existing/new form choices persist');
  await reloadFrame.evaluate(async () => {
    if (!window.__questNoteOnboardingTest) throw Error('Synthetic guard missing');
    window.guideTest = Object.fromEntries(await Promise.all(['db', 'gachaService', 'rewardService', 'ui'].map(async (name) => [name, await import(`/src/${name}.js`)])));
    const stats = await window.guideTest.gachaService.getGachaStats();
    stats.poolPity.swordwild_shanhe_v3 = { ssrPity: 29, urPity: 99 };
    await window.guideTest.gachaService.importGachaStats(stats);
  });
  await page.reload();
  await page.locator('#preview').waitFor();
  await app.locator('#app-loader').waitFor({ state: 'hidden' });
  const drawFrame = page.frames().find((f) => f.url().endsWith('/index.html'));
  await drawFrame.waitForFunction(() => document.querySelector('#guide-tutorial-status')?.textContent);
  await drawFrame.evaluate(async () => {
    window.guideTest = Object.fromEntries(await Promise.all(['gachaService', 'rewardService'].map(async (name) => [name, await import(`/src/${name}.js`)])));
  });
  await app.locator('.bottom-nav [data-view="gacha"]').click();
  // First visit to a themed pool plays its debut once; skip it like a user would.
  const debutSkip = app.locator('.dream-debut-overlay [data-role="skip"]');
  if (await debutSkip.waitFor({ timeout: 5000 }).then(() => true, () => false)) await debutSkip.click();
  await app.locator('.dream-debut-overlay').waitFor({ state: 'detached' });
  await drawFrame.waitForFunction(() => document.querySelector('.summon-sanctuary')?.dataset.poolId === 'swordwild_shanhe_v3'
    && !document.querySelector('[data-identity-action="summon"]')?.disabled);
  const read = () => drawFrame.evaluate(async () => ({ stats: await window.guideTest.gachaService.getGachaStats(), wallet: await window.guideTest.rewardService.getWallet() }));
  for (const [button, count] of [['summon', 1], ['summon-ten', 10]]) {
    const previous = await read();
    await app.locator(`[data-identity-action="${button}"]`).click();
    // Skip the ceremony overlays until the committed result (single) or batch summary (ten) is shown.
    const done = app.locator(count === 1 ? '#identity-reveal-dialog .reveal-shell[data-phase="result"]' : '#identity-reveal-dialog .batch-summary');
    for (let i = 0; i < 80 && !(await done.isVisible()); i += 1) {
      const skip = app.locator('[data-identity-action="skip-reveal"]:visible, .dream-bloom-overlay [data-action="skip"]:visible');
      if (await skip.count()) await skip.first().click().catch(() => {});
      else await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
    }
    await done.waitFor();
    const sources = await app.locator('#identity-reveal-dialog img').evaluateAll((imgs) => imgs.map((img) => img.getAttribute('src')).filter(Boolean));
    assert.ok(sources.length >= count, `${button} shows results`);
    for (const src of sources.filter((value) => value.includes('swordwild'))) assert.ok(src.includes('-initial-'), src);
    await app.locator(count === 1 ? '[data-identity-action="skip-reveal"]' : '.batch-summary [data-identity-action="close-reveal"]').first().click();
    await app.locator('#identity-reveal-dialog').waitFor({ state: 'hidden' });
    const after = await read();
    assert.equal(after.stats.totalPulls - previous.stats.totalPulls, count);
    assert.ok(after.wallet.stardust < previous.wallet.stardust, 'draw is charged');
  }
  checks.push('real guaranteed-UR single and ten pulls use initial art, skip works and charges exactly once');
  for (const width of [320, 393, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await drawFrame.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  }
  assert.deepEqual(errors, []);
  checks.push('320/393/1280px no overflow and no uncaught errors');
  console.log(JSON.stringify({ status: 'passed', checks }, null, 2));
  await fs.writeFile(path.join(report, 'browser-checks.json'), JSON.stringify({ status: 'passed', at: new Date().toISOString(), checks, errors }, null, 2) + '\n');
} catch (error) {
  await page.screenshot({ path: path.join(report, 'failure.png'), fullPage: true }).catch(() => {});
  throw error;
} finally { await context.close(); await browser.close(); server.kill(); }
