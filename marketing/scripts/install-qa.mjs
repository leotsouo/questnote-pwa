import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';

const base = process.env.QA_BASE_URL || 'http://127.0.0.1:8031';
const phase = process.env.QA_PHASE || 'local';
const output = path.resolve('../reports/marketing/install-guide', phase);
await fs.mkdir(output, { recursive: true });
const ios = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1';
const android = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36';
const cases = [
  ...[320, 375, 393, 430].flatMap(width => [
    { name: 'safari', width, ua: ios, embedded: false },
    { name: 'line', width, ua: ios + ' Line/14.0.0', embedded: true },
  ]),
  { name: 'chrome', width: 393, ua: android, embedded: false },
  { name: 'android-webview', width: 393, ua: android.replace('Android 14)', 'Android 14; wv)'), embedded: true },
  { name: 'ipad', width: 768, ua: ios.replace('iPhone', 'iPad'), embedded: false },
  { name: 'line-short', width: 393, height: 640, ua: ios + ' Line/14.0.0', embedded: true },
  { name: 'safari-short', width: 393, height: 640, ua: ios, embedded: false },
];
const browser = await chromium.launch({ channel: process.env.QA_BROWSER_CHANNEL || 'msedge' });
const results = [];
try {
  for (const item of cases) {
    const context = await browser.newContext({ viewport: { width: item.width, height: item.height || 852 }, userAgent: item.ua, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
    await context.addInitScript(() => {
      window.copiedLinks = [];
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async value => {
        if (window.denyCopy) throw new Error('Denied');
        window.copiedLinks.push(value);
      } } });
    });
    const page = await context.newPage();
    await page.goto(base + '/?utm_source=line&utm_medium=social&utm_campaign=home', { waitUntil: 'networkidle' });
    const trigger = page.locator('[data-distribution="hero"]');
    await trigger.click();
    const dialog = page.locator('#install-guide');
    await assert.equal(await dialog.evaluate(el => el.open), true);
    assert.equal(await page.locator('#install-open').isVisible(), !item.embedded);
    assert.match(await page.locator('#install-open').getAttribute('href'), /^https:\/\/leotsouo.github.io\/questnote-pwa\//);
    assert.equal(await page.locator('#install-steps li').count(), 3);
    assert.equal(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth), true, 'dialog must have no horizontal overflow');
    await page.locator('#install-copy').click();
    const copied = await page.evaluate(() => window.copiedLinks.at(-1));
    assert.equal(new URL(copied).pathname, '/questnote-pwa/');
    assert.equal(new URL(copied).searchParams.get('utm_source'), 'line');
    assert.match(await page.locator('#install-status').innerText(), /已複製/);
    await dialog.evaluate(el => { el.scrollTop = el.scrollHeight; });
    const closeBox = await page.locator('[data-close-install]').boundingBox();
    const dialogBox = await dialog.boundingBox();
    assert.ok(closeBox.y >= dialogBox.y && closeBox.y + closeBox.height <= dialogBox.y + dialogBox.height, 'close remains visible in a scrolled short dialog');
    await dialog.evaluate(el => { el.scrollTop = 0; });
    await page.addScriptTag({ path: path.resolve('node_modules/axe-core/axe.min.js') });
    const accessibility = await page.evaluate(async () => window.axe.run(document.querySelector('#install-guide'), { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] }));
    assert.deepEqual(accessibility.violations.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) })), []);
    await page.locator('.install-existing summary').click();
    assert.match(await page.locator('.install-existing p').innerText(), /回到手機主畫面/);
    await page.locator('.install-existing summary').click();
    await page.screenshot({ path: `${output}/${item.name}-${item.width}.png` });
    await page.keyboard.press('Escape');
    assert.equal(await dialog.evaluate(el => el.open), false);
    assert.equal(await trigger.evaluate(el => document.activeElement === el), true);
    await trigger.click();
    await page.evaluate(() => { window.denyCopy = true; });
    await page.locator('#install-copy').click();
    assert.match(await page.locator('#install-status').innerText(), /長按/);
    assert.equal(await page.locator('#install-link').evaluate(el => document.activeElement === el), true);
    await page.locator('[data-close-install]').click();
    assert.equal(await dialog.evaluate(el => el.open), false);
    await trigger.click();
    await page.locator('#install-browser-switch').click();
    assert.equal(await page.locator('#install-open').isVisible(), item.embedded, 'manual browser selection corrects advisory user-agent detection');
    await page.locator('[data-close-install]').click();
    results.push({ ...item, pass: true, clipboardFallback: true, keyboard: true, axe: true });
    await context.close();
  }
  const desktop = await browser.newContext();
  const page = await desktop.newPage();
  await page.goto(base);
  await page.locator('[data-distribution="hero"]').evaluate(el => el.addEventListener('click', event => {
    window.intercepted = event.defaultPrevented;
    event.preventDefault();
  }));
  await page.locator('[data-distribution="hero"]').click();
  assert.equal(await page.evaluate(() => window.intercepted), false);
  assert.equal(await page.locator('#install-guide').evaluate(el => el.open), false);
  results.push({ name: 'desktop-direct', pass: true });
  await fs.writeFile(`${output}/qa-results.json`, JSON.stringify({ base, phase, cases: results, platform: 'Browser user-agent emulation, not physical iPhone or native installation' }, null, 2));
  console.log(`${results.length} installation guidance cases passed, including keyboard, copy fallback and axe.`);
} finally { await browser.close(); }
