/** Real presentation and draw UI on a UUID-isolated synthetic origin. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const root = path.resolve(import.meta.dirname, '..');
const report = path.join(root, 'reports/awakening-guide');
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
const selectPool = async (poolId) => {
  const selector = app.locator('#gacha-pool-select');
  const previousPool = await selector.inputValue();
  await selector.selectOption(poolId);
  if (previousPool === poolId) return;
  const debut = app.locator('.dream-debut-overlay');
  await debut.waitFor({ state: 'visible' });
  await debut.locator('[data-role="skip"]').click();
  await debut.waitFor({ state: 'detached' });
};
try {
  await page.goto(`${base}/devtools/awakening-guide-review.html`);
  await page.locator('#preview').waitFor();
  await app.locator('#app-loader').waitFor({ state: 'hidden' });
  const frame = page.frames().find((f) => f.url().endsWith('/index.html'));
  await frame.waitForFunction(() => document.querySelector('#guide-tutorial-status')?.textContent);
  if (await app.locator('[data-onboarding-action="skip"]').isVisible()) await app.locator('[data-onboarding-action="skip"]').click();
  await frame.evaluate(async () => {
    if (!window.__questNoteOnboardingTest) throw Error('Synthetic guard missing');
    window.guideTest = Object.fromEntries(await Promise.all(['db', 'gachaService', 'petAwakeningService', 'petAwakeningCatalog', 'releaseCatalog', 'ui'].map(async (name) => [name, await import(`/src/${name}.js`)])));
  });
  const catalog = await frame.evaluate(() => window.guideTest.petAwakeningCatalog.loadAwakeningCatalog());
  await app.locator('.bottom-nav [data-view="gacha"]').click();
  await selectPool('swordwild_shanhe_v3');
  await app.locator('#gacha-pet-awakening-toggle').waitFor({ state: 'visible' });
  await app.locator('.dream-debut-overlay').waitFor({ state: 'detached' });
  assert.equal(await app.locator('#gacha-pet-awakening-toggle').getAttribute('aria-expanded'), 'false');
  assert.equal(await app.locator('#gacha-pet-awakening-guide').isVisible(), false);
  await app.locator('#gacha-pet-awakening-toggle').click();
  assert.equal(await app.locator('#gacha-pet-awakening-toggle').getAttribute('aria-expanded'), 'true');
  await app.locator('#gacha-pet-awakening-guide').waitFor({ state: 'visible' });
  await app.locator('#gacha-pet-awakening-toggle').click();
  assert.equal(await app.locator('#gacha-pet-awakening-toggle').getAttribute('aria-expanded'), 'false');
  assert.equal(await app.locator('#gacha-pet-awakening-guide').isVisible(), false);
  await app.locator('#gacha-pet-awakening-toggle').press('Enter');
  await app.locator('#gacha-pet-awakening-guide').waitFor({ state: 'visible' });
  assert.match(await app.locator('#gacha-pet-awakening-guide').textContent(), /Lv.5[\s\S]*接下後出發[\s\S]*松香行旅糰一份/);
  for (const src of await app.locator('#gacha-theme-stage img').evaluateAll((imgs) => imgs.map((i) => i.getAttribute('src')).filter(Boolean))) assert.ok(src.includes('-initial-'), src);
  await app.locator('#gacha-pet-awakening-guide').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(report, 'mobile-pool-guide.png') });
  await app.locator('[data-action="show-awakening-guide"]').click();
  await app.locator('#view-guide.active').waitFor();
  assert.match(await app.locator('#guide-pet-awakening').textContent(), /暫停[\s\S]*進度保留/);
  await frame.waitForFunction(() => document.activeElement.id === 'guide-pet-awakening');
  await page.screenshot({ path: path.join(report, 'mobile-full-guide.png') });
  checks.push('pool explains requirements and navigates/focuses full tutorial');
  await app.locator('#guide-pet-awakening [data-goto="collection"]').click();
  for (const entry of catalog.pets) {
    const card = app.locator(`.collection-card[data-pet-id="${entry.petId}"]`);
    assert.equal(await card.locator('img.pet-img').getAttribute('src'), entry.initialImage.card);
  }
  await app.locator('.collection-card[data-pet-id="pet_ur16"] [data-action="view-detail"]').click();
  await app.locator('#modal-overlay [data-awake-open="pet_ur16"]').click();
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
  await page.reload();
  await page.locator('#preview').waitFor();
  await app.locator('#guide-tutorial-status').waitFor({ state: 'attached' });
  await app.locator('#app-loader').waitFor({ state: 'hidden' });
  const reloadFrame = page.frames().find((f) => f.url().endsWith('/index.html'));
  await reloadFrame.waitForFunction(() => document.querySelector('#guide-tutorial-status')?.textContent);
  await app.locator('.bottom-nav [data-view="collection"]').click();
  assert.ok((await app.locator('.collection-card[data-pet-id="pet_ur17"] img.pet-img').getAttribute('src')).includes('-initial-'));
  assert.ok(!(await app.locator('.collection-card[data-pet-id="pet_ur16"] img.pet-img').getAttribute('src')).includes('-initial-'));
  checks.push('twenty initial portraits load; ritual reveals new art; existing/new form choices persist');
  await reloadFrame.evaluate(async () => {
    if (!window.__questNoteOnboardingTest) throw Error('Synthetic guard missing');
    window.guideTest = Object.fromEntries(await Promise.all(['db', 'gachaService', 'ui'].map(async (name) => [name, await import(`/src/${name}.js`)])));
    const stats = await window.guideTest.gachaService.getGachaStats();
    stats.poolPity.swordwild_shanhe_v3 = { ssrPity: 29, urPity: 99 };
    await window.guideTest.gachaService.importGachaStats(stats);
  });
  await app.locator('.bottom-nav [data-view="gacha"]').click();
  await selectPool('swordwild_shanhe_v3');
  for (const [button, count] of [['#btn-pull', 1], ['#btn-pull-ten', 10]]) {
    const previous = await reloadFrame.evaluate(() => window.guideTest.gachaService.getGachaStats());
    await app.locator(button).click();
    await app.locator('.dream-bloom-overlay').waitFor();
    await app.locator('.dream-bloom-overlay [data-action="skip"]').click();
    await Promise.race([
      app.locator('.summon-reveal-overlay').waitFor({ state: 'visible' }),
      app.locator('.dream-bloom-overlay [data-action="close"]').waitFor({ state: 'visible' })
    ]);
    if (await app.locator('.summon-reveal-overlay').isVisible()) {
      for (const src of await app.locator('.summon-reveal-overlay img').evaluateAll((imgs) => imgs.map((i) => i.getAttribute('src')).filter(Boolean))) assert.ok(src.includes('-initial-'), src);
      await page.keyboard.press('Escape');
    }
    await app.locator('.dream-bloom-overlay [data-action="close"]').waitFor({ state: 'visible' });
    const sources = await app.locator('.dream-bloom-overlay img').evaluateAll((imgs) => imgs.map((i) => i.getAttribute('src')).filter(Boolean));
    assert.ok(sources.length >= count);
    for (const src of sources) assert.ok(src.includes('-initial-'), src);
    await app.locator('.dream-bloom-overlay [data-action="close"]').click();
    await app.locator('.dream-bloom-overlay').waitFor({ state: 'detached' });
    const after = await reloadFrame.evaluate(() => window.guideTest.gachaService.getGachaStats());
    assert.equal(after.totalPulls - previous.totalPulls, count);
  }
  assert.equal(Number(await app.locator('#gacha-stardust').textContent()), 8900);
  checks.push('real guaranteed-UR single and ten pulls use initial art, skip works and charges exactly once');
  await app.locator('#gacha-pool-select').selectOption('standard');
  await app.locator('#gacha-pet-awakening-guide').waitFor({ state: 'hidden' });
  checks.push('other pools hide this tutorial');
  await selectPool('swordwild_shanhe_v3');
  for (const width of [320, 393, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await reloadFrame.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  }
  assert.deepEqual(errors, []);
  checks.push('320/393/1280px no overflow and no uncaught errors');
  console.log(JSON.stringify({ status: 'passed', checks }, null, 2));
  await fs.writeFile(path.join(report, 'browser-checks.json'), JSON.stringify({ status: 'passed', at: new Date().toISOString(), checks, errors }, null, 2) + '\n');
} catch (error) {
  await page.screenshot({ path: path.join(report, 'failure.png'), fullPage: true }).catch(() => {});
  throw error;
} finally { await context.close(); await browser.close(); server.kill(); }
