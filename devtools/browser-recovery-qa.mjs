import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const dependencies = process.env.QUESTNOTE_NODE_MODULES;
const { chromium } = await import(pathToFileURL(path.resolve(dependencies, 'playwright/index.mjs')));
const base = process.env.QA_BASE_URL;
assert.ok(base);
const output = process.env.QA_REPORT_ROOT || 'reports/browser-recovery/local';
await fs.mkdir(output, { recursive: true });
const ios = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Line/14.0';
const android = 'Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36';
const cases = [
  ...[320, 375, 393, 430, 1440].map(width => ({ width, name: 'missing', ua: ios })),
  { width: 393, name: 'getter', ua: ios },
  { width: 393, name: 'security', ua: android },
  { width: 393, name: 'app-bound', ua: ios },
  { width: 393, name: 'storage', ua: ios },
  { width: 393, name: 'network', ua: ios },
  { width: 393, height: 640, name: 'short', ua: ios },
];
const browser = await chromium.launch({ channel: 'msedge' });
const results = [];
try {
  for (const item of cases) {
    const context = await browser.newContext({ viewport: { width: item.width, height: item.height || 852 }, userAgent: item.ua, reducedMotion: 'reduce' });
    await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
    await context.addInitScript(mode => {
      window.recoveryCopies = [];
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async value => {
        if (window.rejectCopy) throw new Error('Denied');
        window.recoveryCopies.push(value);
      } } });
      Object.defineProperty(navigator, 'serviceWorker', { get: () => {
        if (mode === 'getter') throw new DOMException('Denied', 'SecurityError');
        if (['security', 'app-bound', 'network', 'storage'].includes(mode)) return { controller: null, register: async () => {
          if (mode === 'security') throw new DOMException('Unavailable', 'SecurityError');
          if (mode === 'app-bound') throw new TypeError('Job rejected for non app-bound domain');
          throw new Error('503');
        } };
        return undefined;
      } });
      if (mode === 'storage') Object.defineProperty(window, 'sessionStorage', { get: () => { throw new DOMException('Blocked', 'SecurityError'); } });
    }, item.name);
    const page = await context.newPage();
    const requests = [];
    page.on('request', request => requests.push(request.url()));
    await page.goto(base + 'index.html', { waitUntil: 'networkidle' });
    await page.locator('.boot-recovery').waitFor();
    assert.equal(requests.some(url => /\/src\/app\.js/.test(url)), false, 'no product module loaded');
    assert.equal(await page.evaluate(async () => (await indexedDB.databases()).length), 0, 'no product DB opened');
    assert.equal(await page.locator('#app').evaluate(el => el.inert), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    if (item.name !== 'network') {
      assert.equal(await page.locator('.boot-recovery-action').innerText(), '複製 App 連結');
      assert.match(await page.locator('.boot-recovery-title').innerText(), /換個瀏覽器/);
      assert.equal(await page.locator('.boot-recovery-link').inputValue(), new URL(base).href);
      await page.locator('.boot-recovery-action').click();
      assert.equal(await page.evaluate(() => window.recoveryCopies.at(-1)), new URL(base).href);
      await page.evaluate(() => { window.rejectCopy = true; });
      await page.locator('.boot-recovery-action').click();
      assert.match(await page.locator('.boot-recovery-status').innerText(), /長按/);
      assert.equal(await page.locator('.boot-recovery-link').evaluate(el => document.activeElement === el), true);
    } else {
      assert.equal(await page.locator('.boot-recovery-action').innerText(), '重新載入');
      assert.equal(await page.locator('.boot-recovery-link').count(), 0);
    }
    await page.addScriptTag({ path: path.resolve(dependencies, 'axe-core/axe.min.js') });
    const violations = await page.evaluate(async () => (await window.axe.run(document.querySelector('.boot-recovery'), { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) })));
    assert.deepEqual(violations, []);
    await page.locator('.boot-recovery-title').focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('.boot-recovery-action').evaluate(el => document.activeElement === el), true);
    await page.evaluate(() => { window.scrollTo(0, 0); document.querySelector('#app-loader').scrollTop = 0; });
    await page.screenshot({ path: `${output}/${item.name}-${item.width}.png` });
    results.push({ ...item, pass: true, noProductModule: true, noDatabase: true, keyboard: true, accessibility: true });
    await context.close();
  }
  const context = await browser.newContext();
  await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
  const page = await context.newPage();
  await page.goto(base + 'index.html');
  await page.locator('#app-loader').waitFor({ state: 'hidden', timeout: 90000 });
  assert.equal(await page.locator('.boot-recovery').count(), 0);
  assert.ok(await page.evaluate(() => !!navigator.serviceWorker.controller));
  results.push({ name: 'supported-browser', pass: true });
  await context.close();
  await fs.writeFile(`${output}/qa-results.json`, JSON.stringify({ base, results, platform: 'Desktop browser with WebView failure emulation; not a physical iPhone' }, null, 2));
  console.log(`${results.length} recovery / supported-browser cases passed.`);
} finally { await browser.close(); }
