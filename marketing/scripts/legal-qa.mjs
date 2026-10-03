import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:8031';
const host = new URL(base).hostname;
const environment = host === 'questnote.taste-compare.com' ? 'production' : host === '127.0.0.1' ? 'local' : 'preview';
const root = path.resolve(import.meta.dirname, '..');
const output = path.resolve(root, '../reports/marketing/legal-v1', environment);
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.QA_BROWSER_CHANNEL || 'msedge' });
const receipt = { base, testedAt: new Date().toISOString(), checks: [], browserErrors: [], verifiedFiles: 0 };
try {
  for (const width of [320, 393, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 1000 : 852 }, reducedMotion: 'reduce' });
    await context.addInitScript(() => Object.defineProperty(navigator, 'doNotTrack', { get: () => '1' }));
    const page = await context.newPage();
    page.on('pageerror', error => receipt.browserErrors.push(error.message));
    for (const slug of ['privacy', 'terms', 'support']) {
      const response = await page.goto(base + '/' + slug, { waitUntil: 'networkidle' });
      assert.equal(response.status(), 200);
      assert.equal(await page.locator('h1').count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://questnote.taste-compare.com/' + slug);
      const body = await page.locator('main').innerText();
      assert.doesNotMatch(body, /OWNER REVIEW REQUIRED|待確認草稿|非已核定/);
      if (slug !== 'support') assert.match(body, /版本 1\.0[\s\S]*2026-10-01/);
      if (slug === 'privacy') {
        for (const text of ['本機', '30 天', 'AI', '刪除', '未成年人', 'Global Privacy Control']) assert.ok(body.includes(text), text);
      }
      if (slug === 'terms') assert.match(body, /不得排除[\s\S]*責任/);
      for (const href of await page.locator('a[href^="/"]').evaluateAll(items => [...new Set(items.map(el => el.getAttribute('href')))])) {
        assert.equal((await context.request.get(base + href)).status(), 200);
      }
      await page.evaluate(await fs.readFile(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8'));
      const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(item => item.id));
      assert.deepEqual(violations, []);
      if (width !== 320) {
        await page.screenshot({ path: path.join(output, `${slug}-${width}.png`) });
        await page.screenshot({ path: path.join(output, `${slug}-full-${width}.png`), fullPage: true });
      }
      receipt.checks.push({ slug, width, status: 200, overflow: false, axeViolations: violations });
      console.log(`PASS ${slug} ${width}px, publication, routes, WCAG A/AA`);
    }
    await page.goto(base);
    await page.locator('#complete-quest').click();
    assert.equal(await page.locator('#progress-count').innerText(), '3 / 5');
    await context.close();
  }
  const manifest = JSON.parse(await fs.readFile(path.resolve(root, '../reports/marketing/build-manifest.json'), 'utf8'));
  for (const item of manifest.files.filter(item => !item.path.startsWith('_'))) {
    const response = await fetch(base + '/' + item.path);
    assert.equal(response.status, 200, item.path);
    const hash = createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');
    assert.equal(hash, item.sha256, item.path);
    receipt.verifiedFiles++;
  }
  assert.deepEqual(receipt.browserErrors, []);
  console.log(`PASS ${receipt.verifiedFiles} hosted hashes; homepage demo unchanged`);
} finally {
  await browser.close();
  await fs.writeFile(path.join(output, 'qa.json'), JSON.stringify(receipt, null, 2));
}
