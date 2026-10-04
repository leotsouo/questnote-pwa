/** Real combined presentation acceptance on the guarded, synthetic loopback DB. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
const reports = path.join(root, 'reports/senior-production');
await fs.mkdir(reports, { recursive: true });
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.QUESTNOTE_PLAYWRIGHT_PACKAGE || 'C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const results = [];
const errors = [];
const server = spawn(process.execPath, ['devtools/onboarding-browser-server.mjs', '0'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let browser;
let page;
try {
  const base = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('Synthetic server timeout')), 15000);
    server.stdout.on('data', (bytes) => {
      output += bytes;
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
    server.once('error', reject);
  });
  const guard = await (await fetch(`${base}/__onboarding_test_guard__`)).json();
  assert.equal(guard.purpose, 'questnote-onboarding-synthetic-only');
  assert.match(guard.databaseName, /^QuestNoteTest-Onboarding-/);
  browser = await chromium.launch({ channel: process.env.QUESTNOTE_BROWSER_CHANNEL || 'chrome', headless: true,
    args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
  const context = await browser.newContext({ viewport: { width: 430, height: 932 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.route('**/*', (route) => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
  page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', (error) => errors.push(error.message));
  async function load() {
    await page.goto(`${base}/index.html`);
    await page.locator('#app-loader').waitFor({ state: 'hidden' });
    await page.waitForFunction(() => document.querySelector('#guide-tutorial-status')?.textContent);
    await page.evaluate(async () => {
      window.combined = Object.fromEntries(await Promise.all(['db', 'preferencesService', 'guidedOnboardingCore', 'guidedOnboardingService', 'rewardService'].map(async (name) => [name, await import(`/src/${name}.js`)])));
      if (!(await window.combined.db.openDB()).name.startsWith('QuestNoteTest-Onboarding-')) throw new Error('Unsafe DB');
    });
    await page.waitForTimeout(450);
  }
  async function step(expected) {
    await page.waitForFunction(async (value) => (await window.combined.db.dbGet('meta', 'guidedOnboarding'))?.step === value, expected);
    await page.waitForTimeout(550);
  }
  async function click(selector) {
    const node = page.locator(selector).first();
    assert.equal(await node.evaluate((element) => Boolean(element.closest('[inert]'))), false, `${selector} inert`);
    await node.click();
    await page.waitForTimeout(400);
  }
  const action = (name) => click(`[data-guided-action="${name}"]`);
  async function walk(name) {
    const result = { name, ok: false };
    try {
      await step('WELCOME');
      const seed = await page.evaluate(() => window.combined.db.dbGet('meta', 'guidedOnboarding'));
      assert.equal(seed.mode, name.includes('first') ? 'first' : 'replay');
      assert.equal(await page.locator('#senior-practice').isVisible(), false, 'Competing senior guide during guided onboarding');
      await action('acknowledge'); await step('MEET_COMPANION');
      await action('acknowledge'); await step('HOME_INTRO');
      await action('acknowledge'); await step('OPEN_CREATE_QUEST');
      await click('.twilight-add-task'); await step('CREATE_TUTORIAL_QUEST');
      assert.equal(await page.locator('#task-form details').count(), 1, 'One shared advanced disclosure');
      await page.screenshot({ path: path.join(reports, `combined-${name}-editor.png`), fullPage: true });
      await click('#task-form button[type="submit"]'); await step('RETURN_HOME');
      await action('acknowledge'); await step('COMPLETE_TUTORIAL_QUEST');
      assert.equal(await page.locator('#app').evaluate((element) => element.inert), false, 'Tutorial completion app unlocked');
      await click('.task-card [data-action="toggle"]'); await step('REWARD_REVEAL');
      await action('acknowledge'); await step('COMPANION_REACTION');
      await action('acknowledge'); await step('FINISH');
      await action('finish-home');
      await page.waitForFunction(() => !document.body.classList.contains('guided-active'));
      assert.equal(await page.locator('#app').evaluate((element) => element.inert), false, 'Finished app unlocked');
      await page.screenshot({ path: path.join(reports, `combined-${name}-finished.png`), fullPage: true });
      result.detail = await page.evaluate(async () => ({ wallet: await window.combined.rewardService.getWallet(),
        guided: await window.combined.db.dbGet('meta', 'guidedOnboarding'),
        overflow: document.documentElement.scrollWidth > innerWidth + 1 }));
      assert.equal(result.detail.overflow, false, 'Horizontal overflow');
      result.ok = true;
    } catch (error) {
      result.error = error.stack;
      await page.screenshot({ path: path.join(reports, `combined-${name}-failure.png`), fullPage: true });
    }
    results.push(result);
    console.log(`${result.ok ? 'PASS' : 'FAIL'} ${name}${result.error ? '\n' + result.error : ''}`);
    assert.ok(result.ok, name);
  }
  await load();
  await action('skip'); await action('confirm-skip');
  await page.waitForFunction(async () => (await window.combined.db.dbGet('meta', 'guidedOnboarding'))?.status === 'skipped');
  await page.evaluate(() => window.combined.preferencesService.setReadingMode('senior'));
  await load();
  await click('.bottom-nav [data-view="more"]');
  await click('.more-support > summary');
  await click('[data-goto="guide"]');
  await click('#guide-tutorial-button');
  await walk('senior-replay');
  assert.equal(results[0].detail.wallet.stardust, 0, 'Replay must not pay');
  await page.evaluate(async () => {
    await window.combined.db.clearAllData();
    await window.combined.preferencesService.setReadingMode('senior');
    await window.combined.db.dbPut('meta', window.combined.guidedOnboardingCore.normalizeGuidedState({ status: 'active', step: 'WELCOME' }));
  });
  await page.setViewportSize({ width: 320, height: 740 });
  await load();
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await walk('senior-first-320-large');
  assert.equal(results[1].detail.wallet.stardust, 20, 'First tutorial pays once');
  await page.setViewportSize({ width: 430, height: 932 });
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  await click('.bottom-nav [data-view="more"]');
  await click('.more-support > summary');
  await click('[data-goto="guide"]');
  await click('#guide-tutorial-button');
  await step('WELCOME');
  await action('acknowledge'); await action('acknowledge'); await action('acknowledge');
  await step('OPEN_CREATE_QUEST');
  await click('.twilight-add-task'); await step('CREATE_TUTORIAL_QUEST');
  await action('skip'); await action('confirm-skip');
  await page.waitForFunction(() => !document.body.classList.contains('guided-active'));
  assert.equal(await page.locator('#app').evaluate((element) => element.inert), false, 'Skipped editor app unlocked');
  assert.equal(await page.locator('#modal-overlay').evaluate((element) => element.classList.contains('open')), false);
  results.push({ name: 'senior-replay-skip-from-editor', ok: true });
  console.log('PASS senior-replay-skip-from-editor');
  assert.deepEqual(errors, [], 'No runtime errors');
} catch (error) {
  console.error(error.stack);
  if (page) {
    console.error(await page.evaluate(async () => ({ guided: await window.combined?.db.dbGet('meta', 'guidedOnboarding'), active: document.querySelector('.view.active')?.id, inert: document.querySelector('#app')?.inert })));
    await page.screenshot({ path: path.join(reports, 'combined-setup-failure.png'), fullPage: true }).catch(() => {});
  }
  process.exitCode = 1;
} finally {
  await fs.writeFile(path.join(reports, 'combined-browser.json'), JSON.stringify({ results, errors }, null, 2));
  await browser?.close();
  server.kill();
}
