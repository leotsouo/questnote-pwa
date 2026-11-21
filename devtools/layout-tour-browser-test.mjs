// Layout tour: every main screen (docs/feature-map.md「主要畫面與進入方式」) at phone width must not overflow
// the viewport or log errors. Matrix: each theme × width 375/320 × font standard/extra-large, one fresh
// context per cell on a synthetic-only loopback origin (throwaway IndexedDB, external requests aborted).
// Collects every violation, then fails once. Evidence: <evidenceDir>/<cell>/<screen>.png and results.json.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { startTestOrigin, evidenceDir, skipGuidedTour } from './browser-test-origin.mjs';
import { SUPPORTED_THEMES } from '../src/themeRegistry.js';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = await startTestOrigin();
const { origin } = server;
const output = evidenceDir('layout-tour');
await fs.mkdir(output, { recursive: true });
const started = Date.now();

const tab = (view) => ({ name: view, root: `#view-${view}`, open: (page) => page.locator(`.nav-item[data-view="${view}"]`).click() });
const more = (goto, support = false) => ({ name: goto, root: `#view-${goto}`, open: async (page) => {
  await page.locator('.nav-item[data-view="more"]').click();
  if (support && !(await page.locator('.more-support').evaluate((d) => d.open))) await page.locator('.more-support summary').click();
  await page.locator(goto === 'feedback' ? '#view-more [data-feedback-open]' : `.more-menu-item[data-goto="${goto}"]`).click();
} });
const dialog = (name, root, opener) => ({ name, root, dialog: true, open: async (page) => {
  await page.locator('.nav-item[data-view="tasks"]').click();
  await page.locator(opener).click();
} });
const SCREENS = [
  tab('tasks'), tab('gacha'), tab('collection'), tab('expedition'), tab('more'),
  more('habits'), more('achievements'), more('workshop'), more('handbook'), more('weekly-review'), more('settings'),
  more('guide', true), more('feedback', true), more('share', true),
  dialog('mailbox', '#global-mailbox-modal', '#btn-global-mailbox'),
  dialog('add-task', '#modal-overlay #task-form', '#view-tasks .twilight-add-task'),
  dialog('daily-race', '#daily-race-panel', '.page-header--tasks [data-action="daily-open-race"]'),
];

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const themes = [...SUPPORTED_THEMES];
const CELLS = themes.flatMap((theme) => [375, 320].flatMap((width) => ['standard', 'extra-large'].map((fontSize) => ({
  theme, width, height: width === 375 ? 812 : 700, fontSize,
}))));

const violations = [];
const results = [];

/** Runs in the page: offending elements inside the screen root whose right edge passes the viewport. */
function measure(rootSelector) {
  const vw = document.documentElement.clientWidth;
  const root = document.querySelector(rootSelector);
  const page = { scrollWidth: document.documentElement.scrollWidth, clientWidth: vw };
  if (!root) return { page, missing: true, offenders: [] };
  const offenders = [];
  for (const el of root.querySelectorAll('*')) {
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0 || rect.right <= vw + 1) continue;
    const style = getComputedStyle(el);
    if (style.visibility !== 'visible' || Number(style.opacity) === 0) continue;
    // Deliberate bleed: a fixed decoration layer that cannot be interacted with.
    if (style.position === 'fixed' && style.pointerEvents === 'none') continue;
    // Contained by a scroll/clip box inside this screen (strips, ellipsis). Page-level clips
    // (the root and above, e.g. body overflow-x:hidden) do not excuse cut-off content.
    let contained = false;
    for (let a = el.parentElement; a && a !== root; a = a.parentElement) {
      if (getComputedStyle(a).overflowX !== 'visible') { contained = true; break; }
    }
    if (contained) continue;
    const cls = typeof el.className === 'string' && el.className.trim() ? `.${el.className.trim().split(/\s+/).join('.')}` : '';
    offenders.push({
      element: `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${cls}`,
      text: (el.innerText || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 30),
      overflowPx: Math.round((rect.right - vw) * 10) / 10,
    });
  }
  return { page, offenders };
}

const settle = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

async function dismissFirstVisit(page, screen) {
  // First gacha visit plays the pool debut after a short delay; wait for it, then skip.
  const debut = page.locator('.dream-debut-skip');
  if (screen === 'gacha' && await debut.waitFor({ timeout: 2000 }).then(() => true, () => false)) {
    await debut.click();
    await page.locator('.dream-debut-overlay').waitFor({ state: 'hidden' });
  }
  const hint = page.locator('[data-guided-hint-dismiss]');
  if (await hint.isVisible()) await hint.click();
}

async function runCell(cell) {
  const label = `${cell.theme}-${cell.width}-${cell.fontSize}`;
  const dir = path.join(output, label);
  await fs.mkdir(dir, { recursive: true });
  const context = await browser.newContext({ viewport: { width: cell.width, height: cell.height }, serviceWorkers: 'block', reducedMotion: 'reduce' });
  const blocked = [];
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (new URL(url).origin === origin) return route.continue();
    blocked.push(url);
    return route.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000); // a broken selector should fail fast, not stall the whole matrix
  let current = 'startup';
  const fail = (screen, problem) => violations.push({ theme: cell.theme, width: cell.width, fontSize: cell.fontSize, screen, ...problem });
  page.on('pageerror', (error) => fail(current, { kind: 'uncaught', message: error.message }));
  page.on('console', (message) => { if (message.type() === 'error') fail(current, { kind: 'console', message: message.text() }); });
  try {
    await page.goto(`${origin}/index.html`);
    await skipGuidedTour(page);
    await page.evaluate(async ({ theme, fontSize }) => {
      const prefs = await import('/src/preferencesService.js');
      await prefs.setTheme(theme);
      await prefs.setFontSize(fontSize);
    }, cell);
    await page.reload();
    await page.locator('#app-loader').waitFor({ state: 'hidden' });
    assert.deepEqual(await page.evaluate(() => [document.documentElement.dataset.theme, document.documentElement.dataset.fontSize]), [cell.theme, cell.fontSize]);
    for (const screen of SCREENS) {
      current = screen.name;
      const result = { cell: label, screen: screen.name, ok: true };
      try {
        await screen.open(page);
        await page.locator(screen.dialog ? screen.root : `${screen.root}.active`).waitFor({ state: 'visible', timeout: 5000 });
        await dismissFirstVisit(page, screen.name);
        if (!screen.dialog) await page.evaluate(() => scrollTo(0, 0));
        await settle(page);
        await page.screenshot({ path: path.join(dir, `${screen.name}.png`) });
        const { page: doc, offenders } = await page.evaluate(measure, screen.root);
        if (doc.scrollWidth > doc.clientWidth) {
          fail(screen.name, { kind: 'page-scroll', message: `scrollWidth ${doc.scrollWidth} > clientWidth ${doc.clientWidth}` });
          result.ok = false;
        }
        for (const offender of offenders) fail(screen.name, { kind: 'overflow', ...offender });
        if (offenders.length) result.ok = false;
        result.offenders = offenders.length;
        if (screen.dialog) {
          await page.keyboard.press('Escape');
          await page.locator(screen.root).waitFor({ state: 'hidden', timeout: 5000 });
        }
      } catch (error) {
        result.ok = false;
        const lines = error.message.split('\n');
        fail(screen.name, { kind: 'navigation', message: [lines[0], lines.findLast((line) => /intercepts|waiting for/.test(line))].filter(Boolean).join(' / ') });
        await page.screenshot({ path: path.join(dir, `${screen.name}-failed.png`) }).catch(() => {});
        await page.keyboard.press('Escape').catch(() => {});
      }
      results.push(result);
    }
    current = 'recent-errors';
    await SCREENS.find((screen) => screen.name === 'settings').open(page);
    await page.locator('#view-settings.active').waitFor();
    const recent = await page.locator('[data-version-recent-errors]').allInnerTexts();
    if (recent.length) fail('settings', { kind: 'recent-errors', message: recent.join(' | ').slice(0, 300) });
    if (blocked.length) fail('network', { kind: 'external-request', message: [...new Set(blocked)].join(', ') });
  } finally {
    await context.close();
  }
}

try {
  for (const cell of CELLS) await runCell(cell);
} finally {
  await browser.close();
  server.close();
}

const seconds = Math.round((Date.now() - started) / 1000);
await fs.writeFile(path.join(output, 'results.json'), `${JSON.stringify({ themes, cells: CELLS.length, screens: SCREENS.length, seconds, results, violations }, null, 2)}\n`);
for (const v of violations) {
  const where = `${v.theme}/${v.width}/${v.fontSize}/${v.screen}`;
  console.log(v.kind === 'overflow' ? `FAIL ${where}: ${v.element} "${v.text}" overflows by ${v.overflowPx}px` : `FAIL ${where}: ${v.kind} ${v.message}`);
}
console.log(`${violations.length ? 'FAIL' : 'PASS'} layout tour: ${CELLS.length} cells × ${SCREENS.length} screens in ${seconds}s, ${violations.length} violations; evidence in ${output}`);
assert.equal(violations.length, 0, 'Layout tour found violations');
