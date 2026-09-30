import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.argv[2] || 'https://questnote.taste-compare.com';
const canonical = new URL(base).hostname === 'questnote.taste-compare.com';
const browser = await chromium.launch({ headless: true, channel: process.env.QA_BROWSER_CHANNEL || 'msedge' });
const receipt = { url: base, checkedAt: new Date().toISOString(), checks: [] };
try {
  for (const preference of ['normal', 'dnt', 'gpc']) {
    const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
    await context.addInitScript(preference => {
      if (preference === 'dnt') Object.defineProperty(navigator, 'doNotTrack', { get: () => '1' });
      if (preference === 'gpc') Object.defineProperty(navigator, 'globalPrivacyControl', { get: () => true });
      window.qaEvents = [];
      window.addEventListener('questnote:analytics', event => window.qaEvents.push(event.detail.name));
    }, preference);
    const page = await context.newPage();
    const analyticsResponses = [];
    const errors = [];
    page.on('response', response => {
      if (response.url().includes('cloudflareinsights.com')) {
        analyticsResponses.push({ url: response.url(), method: response.request().method(), status: response.status() });
      }
    });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.locator('#complete-quest').click();
    assert.equal(await page.locator('#progress-count').innerText(), '3 / 5');
    const events = await page.evaluate(() => window.qaEvents);
    if (preference === 'normal' && canonical) {
      await page.waitForResponse(response => response.url().includes('/cdn-cgi/rum') && response.status() === 204, { timeout: 10000 }).catch(() => {});
      assert.ok(analyticsResponses.some(item => item.method === 'POST' && item.status === 204), 'Cloudflare page-view beacon accepted');
      assert.ok(events.includes('page_view') && events.includes('quest_completed'));
    } else if (preference !== 'normal') {
      assert.deepEqual(analyticsResponses, [], 'Respect privacy preference before loading beacon');
      assert.deepEqual(events, [], 'Respect privacy preference for custom instrumentation');
    } else assert.deepEqual(analyticsResponses, [], 'Preview must not load an analytics beacon');
    assert.deepEqual(await context.cookies(), []);
    assert.deepEqual(errors, []);
    receipt.checks.push({ preference, demo: '3 / 5', events, analyticsResponses, cookies: 0, browserErrors: errors });
    await context.close();
  }
  console.log('PASS HTTPS demo, canonical-only beacon, DNT/GPC, no cookies');
} finally {
  await browser.close();
  await fs.writeFile(path.resolve(import.meta.dirname, `../../reports/marketing/${canonical ? 'production' : 'preview'}-analytics.json`), JSON.stringify(receipt, null, 2));
}
