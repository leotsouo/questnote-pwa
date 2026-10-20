/**
 * Runs the App's built-in health check (設定 → 執行健康檢查) against the source tree under Node.
 * The static source checks must all pass; only the checks that need a real browser (IndexedDB,
 * Service Worker) are allowed to fail here. V3.12.1 shipped with 2 of 43 failing in the App because
 * two checks scanned a fixed character window that the ui.js split had outgrown.
 *
 * `HEALTH_CHECK_MODULE` points the harness at another copy of the service (used to prove a regression).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const BROWSER_ONLY = /indexedDB is not defined|reading 'getRegistration'/;

function installBrowserStubs() {
  globalThis.fetch = async (url) => {
    const rel = String(url).replace(/^\.\//, '').split('?')[0];
    try {
      const buf = await fs.readFile(path.join(root, rel));
      const text = buf.toString('utf8');
      return { ok: true, status: 200, text: async () => text, json: async () => JSON.parse(text), headers: new Map() };
    } catch {
      return { ok: false, status: 404, text: async () => '', json: async () => { throw new Error('404'); } };
    }
  };
  globalThis.window = globalThis;
  globalThis.location = { href: 'http://127.0.0.1:8000/', origin: 'http://127.0.0.1:8000', pathname: '/', hostname: '127.0.0.1' };
  Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node', serviceWorker: undefined }, configurable: true });
  const noop = () => {};
  const classList = { contains: () => false, add: noop, remove: noop };
  globalThis.document = {
    documentElement: { dataset: {}, classList, style: {} },
    body: { classList, dataset: {} },
    head: { appendChild: noop },
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    createElement: () => ({ style: {}, classList, setAttribute: noop, appendChild: noop, remove: noop }),
  };
  globalThis.localStorage = { getItem: () => null, setItem: noop, removeItem: noop };
  globalThis.matchMedia = () => ({ matches: false, addEventListener: noop });
}

test('every source-level App health check passes under Node', async () => {
  installBrowserStubs();
  const modulePath = process.env.HEALTH_CHECK_MODULE || 'src/healthCheckService.js';
  const { runAppHealthCheck } = await import(pathToFileURL(path.join(root, modulePath)).href);
  const originalLog = console.log;
  console.log = () => {};
  let report;
  try { report = await runAppHealthCheck(); } finally { console.log = originalLog; }
  const sourceFailures = (report.errors || []).filter((message) => !BROWSER_ONLY.test(message));
  assert.deepEqual(sourceFailures, []);
  const passed = Object.values(report.results).filter((status) => status.startsWith('ok')).length;
  assert.ok(passed >= 25, `only ${passed} checks passed`);
});
