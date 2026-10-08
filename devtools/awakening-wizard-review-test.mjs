/** Browser acceptance of the design prototype; never launches the app. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)(process.env.QUESTNOTE_PLAYWRIGHT_PACKAGE || 'playwright');
const base = process.argv[2];
const output = process.argv[3];
if (!base || !output) throw Error('Usage: node awakening-wizard-review-test.mjs <loopback base> <new output dir>');
assert.equal(new URL(base).hostname, '127.0.0.1');
if (output !== '-') await fs.mkdir(output, { recursive: true });
const screenshot = async (name, fullPage = true) => { if (output !== '-') await page.screenshot({ path: path.join(output, name), fullPage }); };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1024, height: 900 } });
await context.addInitScript(() => {
  window.prototypeStorageCalls = 0;
  indexedDB.open = () => { window.prototypeStorageCalls += 1; throw Error('Prototype must not open IndexedDB'); };
});
await context.route('**/*', (route) => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const checks = [];
const act = (name) => page.locator(`[data-action="${name}"]`).click();
const question = async (text) => assert.ok((await page.locator('#question').textContent()).includes(text));
const preset = async (scenario, character = 'pet_ur18') => {
  await page.locator('.review-bar summary').click({ trial: true }).catch(() => {});
  await page.locator('.review-bar details').evaluate((el) => { el.open = true; });
  await page.locator('#character').selectOption(character);
  await page.locator('#scenario').selectOption(scenario);
  await page.locator('#reset').click();
  await act('open');
};
const visit = async (where) => { await act(`visit-${where}`); await act('return'); };
try {
  await page.goto(`${base}/devtools/awakening-wizard-review.html`);
  await page.locator('[data-action="open"]').waitFor();
  await screenshot('entry-desktop.png');
  await preset('fresh');
  await question('相遇'); assert.equal(await page.locator('[data-action="awaken"]').count(), 0);
  await visit('summon'); await question('熟悉');
  await visit('bond'); await question('同行故事');
  await visit('story'); await question('接下');
  await act('start'); await question('小事');
  await visit('expedition'); await question('小事');
  await visit('daily'); await act('close'); await act('open'); await question('小事');
  assert.ok((await page.locator('.stage').textContent()).includes('1/3'));
  await act('pause'); await question('繼續'); await act('close'); await act('open'); await question('繼續');
  await act('resume'); await visit('daily'); await visit('daily'); await question('共赴');
  await screenshot('ready-desktop.png');
  await act('awaken'); await page.locator('.awakening-scene').waitFor();
  const after = await page.locator('.awakening-after').getAttribute('src');
  await page.locator('.awakening-scene__skip').click();
  await page.locator('[data-action="form"]').waitFor();
  const awakenedCard = await page.locator('.portrait').getAttribute('src');
  assert.ok(!awakenedCard.includes('initial'));
  await act('form'); assert.ok((await page.locator('.portrait').getAttribute('src')).includes('initial'));
  await act('form'); assert.equal(await page.locator('.portrait').getAttribute('src'), awakenedCard);
  await act('replay'); await page.locator('.awakening-scene').waitFor(); await page.locator('.awakening-scene__skip').click();
  await page.locator('[data-action="form"]').waitFor();
  await page.locator('.conditions summary').click();
  assert.ok((await page.locator('.conditions').textContent()).includes('已使用'));
  assert.equal(await page.locator('[data-action="awaken"]').count(), 0);
  checks.push('Full journey: ownership, Lv.5, claimed story, trial, parallel expedition, daily 3/3, token, ritual, real animation, dual forms; leaving and pause preserve progress; replay cannot consume again');
  await preset('food'); await question('行旅糰');
  assert.equal(await page.locator('[data-action="awaken"]').count(), 0);
  await visit('food'); await question('共赴'); checks.push('Missing food blocks ritual and resumes after crafting');
  // Use a fresh context so already decoded images cannot satisfy the failure case.
  const failedContext = await browser.newContext();
  let blockImages = true;
  await failedContext.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return url.origin !== base || (blockImages && url.pathname.startsWith('/assets/pets/')) ? route.abort() : route.continue();
  });
  const failedPage = await failedContext.newPage();
  await failedPage.goto(`${base}/devtools/awakening-wizard-review.html`);
  await failedPage.locator('.review-bar details').evaluate((el) => { el.open = true; });
  await failedPage.locator('#scenario').selectOption('awakened');
  await failedPage.locator('#reset').click();
  await failedPage.locator('[data-action="open"]').click();
  await failedPage.locator('[data-action="retry-image"]').waitFor();
  assert.ok((await failedPage.locator('.portrait-caption').textContent()).includes('圖片暫時無法載入'));
  blockImages = false;
  await failedPage.locator('[data-action="retry-image"]').click();
  await failedPage.waitForFunction(() => { const img = document.querySelector('.portrait'); return img.complete && img.naturalWidth > 0; });
  assert.equal(await failedPage.locator('[data-action="retry-image"]').count(), 0);
  assert.ok((await failedPage.locator('.stage').textContent()).includes('覺醒完成'));
  await failedContext.close();
  checks.push('Failed images offer retry; retry restores awakened artwork without losing wizard state');
  await preset('conflict'); await question('暫停'); await act('switch'); await question('小事');
  checks.push('Another active trial requires explicit pause and switch');
  for (const width of [320, 393, 736, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    for (const scenario of ['fresh', 'eligible', 'active', 'paused', 'conflict', 'food', 'ready', 'awakened']) {
      await preset(scenario);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}/${scenario} overflow`);
      assert.equal(await page.locator('.stage .primary').count(), 1);
    }
    await preset('active');
    await screenshot(`wizard-${width}.png`);
  }
  checks.push('320 / 393 / 736 / 1024px: all eight scenarios fit and have one primary action');
  const ids = await page.locator('#character option').evaluateAll((els) => els.map((el) => el.value));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const id of ids) {
    await preset('ready', id);
    await page.waitForFunction(() => { const img = document.querySelector('.portrait'); return img.complete && img.naturalWidth > 0; });
    await act('awaken');
    await page.locator('[data-action="form"]').waitFor();
    await page.waitForFunction(() => { const img = document.querySelector('.portrait'); return img.complete && img.naturalWidth > 0; });
  }
  checks.push('All 20 characters load both card forms and finish the existing reduced-motion animation');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await preset('ready', 'pet_n36'); await act('awaken'); await page.locator('.awakening-scene').waitFor();
  await page.locator('.awakening-scene').waitFor({ state: 'detached', timeout: 10000 });
  await preset('ready', 'pet_ur18'); await act('awaken'); await page.locator('.awakening-scene').waitFor();
  await screenshot('existing-animation.png', false);
  await page.locator('.awakening-scene').waitFor({ state: 'detached', timeout: 10000 });
  checks.push('Normal N and UR animation complete naturally; skip and replay also checked');
  await preset('eligible'); await page.locator('[data-action="start"]').focus(); await page.keyboard.press('Enter'); await question('小事');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'question');
  assert.equal(await page.evaluate(() => window.prototypeStorageCalls), 0);
  assert.deepEqual(errors, []);
  checks.push('Keyboard action advances and focuses question; zero IndexedDB opens; zero browser errors');
  if (output !== '-') await fs.writeFile(path.join(output, 'result.json'), JSON.stringify({ passed: true, checks, animationStage: after }, null, 2));
  console.log(JSON.stringify({ passed: true, checks }, null, 2));
} finally { await browser.close(); }
