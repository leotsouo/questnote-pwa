import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const root = path.resolve(import.meta.dirname, '..');
const base = process.argv[2];
if (!base?.startsWith('https://')) throw new Error('Pass an HTTPS deployment URL');
const label = new URL(base).hostname.startsWith('questnote.taste-compare') ? 'production' : 'preview';
const manifest = JSON.parse(await fs.readFile(path.resolve(root, '../reports/marketing/build-manifest.json'), 'utf8'));
const checks = [];
for (const item of manifest.files) {
  if (item.path.startsWith('_')) continue;
  const response = await fetch(base + '/' + item.path, { signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, item.path);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256, item.path);
  checks.push(item.path);
}
const response = await fetch(base);
assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
const browser = await chromium.launch({ headless: true, channel: process.env.QA_BROWSER_CHANNEL || 'msedge' });
const context = await browser.newContext({ viewport: { width: 393, height: 852 }, serviceWorkers: 'block' });
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1_600_000 / 8, uploadThroughput: 750_000 / 8 });
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await page.addInitScript(() => {
  window.qaLcp = 0; window.qaCls = 0;
  new PerformanceObserver(list => { window.qaLcp = list.getEntries().at(-1).startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver(list => { for (const item of list.getEntries()) if (!item.hadRecentInput) window.qaCls += item.value; }).observe({ type: 'layout-shift', buffered: true });
});
await page.goto(base, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
const rawCold = await page.evaluate(() => ({ lcpMs: window.qaLcp, cls: window.qaCls, navigation: performance.getEntriesByType('navigation')[0].toJSON(), resources: performance.getEntriesByType('resource').map(item => ({ url: item.name, transfer: item.transferSize, decoded: item.decodedBodySize })) }));
// Keep the raw measurement. Re-test transfer/render after warming DNS/TLS only,
// clearing the HTTP cache so an environment resolver stall is not hidden as speed.
await page.goto('about:blank');
await cdp.send('Network.clearBrowserCache');
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
await page.goto(base, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
const metrics = await page.evaluate(() => ({ lcpMs: window.qaLcp, cls: window.qaCls, navigation: performance.getEntriesByType('navigation')[0].toJSON(), resources: performance.getEntriesByType('resource').map(item => ({ url: item.name, transfer: item.transferSize, decoded: item.decodedBodySize })) }));
const result = { url: base, verifiedFiles: checks.length, sourceAssetBytes: manifest.totalBytes, headers: Object.fromEntries(response.headers), labProfile: '393 × 852, 1.6Mbps / 150ms, CPU ×4, cold HTTP cache after DNS/TLS warm-up; raw cold navigation also retained. Simulated Chromium, not field Core Web Vitals.', rawCold, metrics, checkedAt: new Date().toISOString() };
await fs.writeFile(path.resolve(root, `../reports/marketing/${label}-verification.json`), JSON.stringify(result, null, 2));
await browser.close();
console.log(JSON.stringify({ url: base, verifiedFiles: checks.length, rawColdLcpMs: rawCold.lcpMs, rawDnsMs: rawCold.navigation.domainLookupEnd - rawCold.navigation.domainLookupStart, coldHttpCacheLcpMs: metrics.lcpMs, cls: metrics.cls }));
assert.ok(metrics.lcpMs < 3500, 'Lab LCP budget under 3.5s at 1.6Mbps / 150ms / CPU4');
assert.ok(metrics.cls <= 0.1, 'CLS budget');
