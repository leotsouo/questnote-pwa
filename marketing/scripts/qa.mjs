import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const output = path.resolve(process.env.QA_REPORT_ROOT || path.resolve(root, '../reports/marketing'));
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:8031';
const hosted = base.startsWith('https:');
const prefix = new URL(base).hostname === 'questnote.taste-compare.com' ? 'production' : hosted ? 'preview' : 'local';
await fs.mkdir(path.join(output, prefix), { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.QA_BROWSER_CHANNEL || 'msedge' });
const checks = [];
const errors = [];
const badResponses = [];
const report = (name, detail = {}) => { checks.push({ name, pass: true, ...detail }); console.log('PASS ' + name); };
async function assetsReady(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].filter(img => img.getBoundingClientRect().bottom > 0 && img.getBoundingClientRect().top < innerHeight).map(img => img.decode().catch(() => {})));
  });
}
try {
  for (const width of [320, 375, 393, 430, 768, 1440]) {
    const height = width >= 960 ? 1000 : 852;
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: width < 600, hasTouch: width < 600 });
    await context.addInitScript(() => {
      window.qaEvents = [];
      window.addEventListener('questnote:analytics', event => window.qaEvents.push(event.detail));
      window.qaCls = 0;
      new PerformanceObserver(list => { for (const item of list.getEntries()) if (!item.hadRecentInput) window.qaCls += item.value; }).observe({ type: 'layout-shift', buffered: true });
      window.qaLcp = 0;
      new PerformanceObserver(list => { window.qaLcp = list.getEntries().at(-1).startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push({ width, error: error.message }));
    page.on('response', response => { if (response.url().startsWith(base) && response.status() >= 400) badResponses.push({ width, url: response.url(), status: response.status() }); });
    await page.goto(base + '/?utm_source=threads&utm_medium=social&utm_campaign=beta', { waitUntil: 'networkidle' });
    await assetsReady(page);
    if (width === 393) {
      const metrics = await page.evaluate(() => ({ cls: window.qaCls, lcpMs: window.qaLcp, transferredBytes: performance.getEntriesByType('resource').reduce((sum, item) => sum + item.transferSize, 0), jsBytes: performance.getEntriesByType('resource').filter(item => /\.js/.test(item.name)).reduce((sum, item) => sum + item.decodedBodySize, 0) }));
      report('initial browser performance observations (unthrottled, not field Core Web Vitals)', metrics);
      assert.equal(await page.locator('#complete-quest').evaluate(el => el.getBoundingClientRect().bottom <= innerHeight), true, '393 × 852 must expose the whole demo action');
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${width}px overflow`);
    assert.equal(await page.locator('h1').count(), 1);
    assert.match(await page.locator('h1').innerText(), /待辦[\s\S]*你們[\s\S]*冒險/);
    assert.match(await page.locator('.hero-description').innerText(), /生活任務[\s\S]*夥伴一起成長/);
    await page.screenshot({ path: path.join(output, prefix, `hero-${width}.png`) });
    const initialCta = await page.locator('[data-distribution="hero"]').getAttribute('href');
    assert.match(initialCta, /utm_source=threads/);
    report(`responsive ${width}px, clear first-screen story, UTM`);
    await page.locator('#complete-quest').click();
    assert.equal(await page.locator('#progress-count').innerText(), '3 / 5');
    assert.equal(await page.locator('#bond-count').innerText(), '15 / 50');
    assert.equal(await page.locator('#complete-quest').isDisabled(), true);
    assert.match(await page.locator('#demo-reward').innerText(), /20 星塵/);
    assert.equal(await page.locator('#demo-status').evaluate(el => el.getBoundingClientRect().height < 50), true, 'Completion copy must remain horizontal');
    assert.equal(await page.locator('#daily-progress').getAttribute('aria-valuenow'), '3');
    assert.equal((await page.evaluate(() => window.qaEvents)).filter(item => item.name === 'quest_completed').length, 1);
    await page.locator('#quest-demo').screenshot({ path: path.join(output, prefix, `demo-completed-${width}.png`) });
    await page.locator('#reset-quest').click();
    assert.equal(await page.locator('#progress-count').innerText(), '2 / 5');
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('#progress-count').innerText(), '2 / 5');
    assert.equal((await page.evaluate(() => indexedDB.databases())).length, 0);
    assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
    report(`demo ${width}px: once-only rewards, reset, reload, no persistence`);
    for (const [tab, panel] of [['home', 'home'], ['collection', 'collection'], ['gacha', 'gacha'], ['expedition', 'expedition']]) {
      await page.locator('#tab-' + tab).click();
      assert.equal(await page.locator('#panel-' + panel).isVisible(), true);
      await assetsReady(page);
      assert.equal(await page.locator('#panel-' + panel + ' img').evaluate(img => img.complete && img.naturalWidth > 0), true);
    }
    await page.locator('#tab-home').click();
    await page.locator('#tab-home').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#tab-collection').getAttribute('aria-selected'), 'true');
    await page.keyboard.press('End');
    assert.equal(await page.locator('#tab-expedition').getAttribute('aria-selected'), 'true');
    await page.keyboard.press('Home');
    assert.equal(await page.locator('#tab-home').getAttribute('aria-selected'), 'true');
    report(`product tabs and keyboard ${width}px`);
    if (width === 393 || width === 1440) {
      for (const [name, selector] of [['companion', '#companion'], ['product', '#product'], ['final', '#start'], ['demo', '#quest-demo']]) {
        await page.locator(selector).scrollIntoViewIfNeeded();
        await assetsReady(page);
        await page.waitForTimeout(100);
        await page.screenshot({ path: path.join(output, prefix, `${name}-${width}.png`) });
        await page.locator(selector).screenshot({ path: path.join(output, prefix, `${name}-section-${width}.png`) });
      }
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise(resolve => setTimeout(resolve, 50)); }
        window.scrollTo(0, 0);
        await Promise.all([...document.images].map(img => img.decode().catch(() => {})));
      });
      await page.screenshot({ path: path.join(output, prefix, `full-home-${width}.png`), fullPage: true });
    }
    if (width === 393) {
      await page.locator('#companion').scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
      assert.equal(await page.locator('#mobile-cta').isVisible(), true);
      await page.locator('#start').scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
      assert.equal(await page.locator('#mobile-cta').isVisible(), false);
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(150);
      assert.equal(await page.locator('#mobile-cta').isVisible(), false);
      await page.evaluate(await fs.readFile(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8'));
      const axe = await page.evaluate(() => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
      await fs.writeFile(path.join(output, prefix, 'axe.json'), JSON.stringify(axe.violations, null, 2));
      assert.deepEqual(axe.violations.map(item => ({ id: item.id, nodes: item.nodes.length })), []);
      report('393px accessibility: axe WCAG A/AA, sticky CTA visibility');
    }
    await context.close();
  }
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.textContent), '跳到主要內容');
  await page.locator('#complete-quest').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#progress-count').innerText(), '3 / 5');
  assert.equal(await page.evaluate(() => document.getAnimations().filter(item => item.playState === 'running').length), 0);
  await page.screenshot({ path: path.join(output, prefix, 'reduced-motion-393.png') });
  await page.locator('.brand').first().evaluate(element => { element.style.visibility = 'hidden'; });
  await page.screenshot({ path: path.join(output, prefix, 'no-logo-393.png') });
  report('reduced motion, keyboard completion, no-logo campaign stress screenshot');
  const localUrls = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href],link[href],img[src],script[src]')].map(el => el.getAttribute('href') || el.getAttribute('src')).filter(url => url.startsWith('/')))]);
  for (const url of localUrls) {
    const response = await context.request.get(base + url);
    assert.equal(response.status(), 200, url);
  }
  for (const slug of ['privacy', 'terms', 'support']) {
    const response = await context.request.get(base + '/' + slug);
    assert.equal(response.status(), 200);
    if (slug !== 'support') {
      const html = await response.text();
      assert.match(html, /版本 1\.0/);
      assert.doesNotMatch(html, /OWNER REVIEW REQUIRED/);
    }
  }
  const missing = await context.request.get(base + '/this-route-does-not-exist');
  assert.equal(missing.status(), 404);
  report('internal routes, assets, published policy version, custom 404');
  await page.goto(base, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('meta[property="og:image:width"]').getAttribute('content'), '1200');
  assert.equal(await page.locator('meta[property="og:image:height"]').getAttribute('content'), '630');
  assert.equal(await page.locator('meta[name="twitter:card"]').getAttribute('content'), 'summary_large_image');
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://questnote.taste-compare.com/');
  const ogPath = new URL(await page.locator('meta[property="og:image"]').getAttribute('content')).pathname;
  const og = await context.request.get(base + ogPath);
  const dimensions = await sharp(await og.body()).metadata();
  assert.equal(dimensions.width, 1200); assert.equal(dimensions.height, 630);
  const anchors = await page.locator('a[href^="#"]').evaluateAll(items => items.map(item => item.getAttribute('href').slice(1)));
  for (const id of anchors) assert.equal(await page.locator(`[id="${id}"]`).count(), 1, id);
  report('SEO, canonical, OG/X metadata, 1200×630 pixels, anchor links');
  await page.context().close();
  const noJs = await browser.newContext({ viewport: { width: 393, height: 852 }, javaScriptEnabled: false });
  const staticPage = await noJs.newPage();
  await staticPage.goto(base);
  assert.equal(await staticPage.locator('h1').isVisible(), true);
  assert.match(await staticPage.locator('[data-distribution="hero"]').getAttribute('href'), /^https:/);
  await staticPage.screenshot({ path: path.join(output, prefix, 'no-js-393.png') });
  report('no JavaScript: story and actual distribution remain available');
  await noJs.close();
  assert.deepEqual(errors, []); assert.deepEqual(badResponses, []);
  report('no browser runtime errors or broken requested assets');
} finally {
  await browser.close();
  await fs.writeFile(path.join(output, prefix, 'qa-results.json'), JSON.stringify({ base, checks, errors, badResponses, testedAt: new Date().toISOString() }, null, 2));
}
