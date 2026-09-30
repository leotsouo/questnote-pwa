// Disposable loopback storage only. Insets simulate layout, not native iOS chrome.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.argv[2] || 'http://127.0.0.1:8773';
assert.equal(new URL(origin).hostname, '127.0.0.1');
const before = process.argv.includes('--before');
const phase = before ? 'before' : 'after';
const output = 'reports/twilight-safe-area';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const failures = [];
const results = [];

try {
  const context = await browser.newContext({ viewport: { width: 430, height: 932 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
  // Read the unchanged source baseline into memory; never reset the checkout.
  const baseline = before ? new Map(['src/preferencesService.js', 'src/twilight-theme.css'].map((file) => [
    `/${file}`, execFileSync('git', ['show', `origin/main:${file}`], { encoding: 'utf8' }),
  ])) : new Map();
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (baseline.has(url.pathname)) return route.fulfill({
      contentType: url.pathname.endsWith('.css') ? 'text/css' : 'text/javascript', body: baseline.get(url.pathname),
    });
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => failures.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') failures.push(message.text()); });
  await page.goto(`${origin}/index.html`);
  await page.locator('[data-onboarding-action="skip"]').click();
  await page.locator('#app-loader').waitFor({ state: 'hidden' });
  await page.evaluate(async () => {
    assertNoRelease();
    function assertNoRelease() {
      if (document.querySelector('meta[name="questnote-artifact"]') || navigator.serviceWorker.controller) {
        throw new Error('Use an uncontrolled source checkout, not a release or user origin.');
      }
    }
    await (await import('/src/ui.js')).applyTheme('twilight', { silent: true });
  });

  const settle = () => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const navigate = async (view) => {
    await page.evaluate(async (view) => {
      await (await import('/src/ui.js')).switchView(view);
      scrollTo(0, 0);
    }, view);
    await settle();
  };
  const insets = async (top, bottom) => {
    await page.evaluate(({ top, bottom }) => {
      document.documentElement.style.setProperty('--safe-top', `${top}px`);
      document.documentElement.style.setProperty('--safe-bottom', `${bottom}px`);
    }, { top, bottom });
    await settle();
  };
  const screenshot = async (name) => {
    await page.evaluate(async () => {
      await Promise.all([...document.querySelectorAll('.view.active img')].map((img) => img.decode().catch(() => {})));
    });
    return page.screenshot({ path: `${output}/${phase}-${name}.png` });
  };
  const pixel = async (x, y) => {
    const { data, info } = await sharp(await page.screenshot()).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const offset = (Math.floor(y) * info.width + Math.floor(x)) * info.channels;
    return [...data.subarray(offset, offset + 3)];
  };
  const isNight = (rgb) => rgb.every((value, i) => Math.abs(value - [23, 35, 48][i]) <= 3);
  const checkHomeSeam = async () => {
    const seam = await page.evaluate(() => {
      const home = document.getElementById('twilight-home');
      const heading = document.getElementById('twilight-chapter-heading');
      const hr = home.getBoundingClientRect(), cr = heading.getBoundingClientRect();
      const bond = document.querySelector('.twilight-bond').getBoundingClientRect();
      return { overlap: hr.bottom - cr.top, left: cr.left, right: cr.right, top: cr.top, radius: getComputedStyle(heading).borderTopLeftRadius, bondBottom: bond.bottom };
    });
    assert.equal(seam.radius, '28px');
    assert.equal(seam.overlap, 28, 'Entire paper radius overlaps the night scene');
    assert.ok(seam.bondBottom < seam.top, 'Bond stays clear of paper');
    if (seam.top + 1 < page.viewportSize().height - 110) {
      assert.ok(isNight(await pixel(seam.left + 1, seam.top + 1)), 'Left paper corner has night backing');
      assert.ok(isNight(await pixel(seam.right - 2, seam.top + 1)), 'Right paper corner has night backing');
    }
  };

  await insets(59, 34);
  await navigate('tasks');
  await page.locator('#twilight-home:not([hidden]) .twilight-masthead').waitFor();
  await page.locator('#task-view-content .empty-state').first().waitFor();
  await screenshot('home-empty');
  if (!before) {
    await checkHomeSeam();
    assert.ok(isNight(await pixel(215, 20)), 'Empty home has a dark top inset');
    results.push('430x932 safe-top=59 tasks-empty');
  }
  await page.evaluate(async () => {
    const collection = await import('/src/collectionService.js');
    await collection.addPetToCollection('pet_ur01');
    await collection.setCompanion('pet_ur01');
    await (await import('/src/taskService.js')).createTask({ content: '整理今天的冒險手帳', planToday: true });
  });
  await page.reload();
  await page.locator('#app-loader').waitFor({ state: 'hidden' });
  // Loader removal precedes catalog/data rendering: wait for the actual content.
  await page.locator('#twilight-home:not([hidden]) .twilight-masthead').waitFor();
  await page.locator('#task-view-content .twilight-task-card').waitFor();
  await insets(59, 34);
  await navigate('tasks');
  await screenshot('home-task');
  for (const view of ['settings', 'expedition']) {
    await navigate(view);
    await screenshot(view);
  }

  if (!before) {
    for (const viewport of [{ width: 430, height: 932 }, { width: 320, height: 740 }, { width: 1280, height: 900 }]) {
      await page.setViewportSize(viewport);
      for (const top of [59, 0]) {
        await insets(top, top ? 34 : 0);
        for (const view of ['tasks', 'settings', 'expedition', 'gacha', 'collection', 'more', 'habits', 'achievements', 'workshop', 'share', 'feedback', 'guide', 'handbook']) {
          await navigate(view);
          const geometry = await page.evaluate(() => {
            const app = document.getElementById('app');
            const active = document.querySelector('.view.active');
            const header = active.id === 'view-tasks' ? document.querySelector('.twilight-masthead') : active.querySelector('.page-header');
            const target = active.id === 'view-tasks' ? document.getElementById('btn-global-mailbox') : header.querySelector('.page-title');
            const rect = target.getBoundingClientRect();
            const layer = getComputedStyle(document.body, '::before');
            return {
              rootTheme: document.documentElement.dataset.theme,
              rootScheme: getComputedStyle(document.documentElement).colorScheme,
              bodyScheme: getComputedStyle(document.body).colorScheme,
              meta: document.querySelector('meta[name="theme-color"]').content,
              overflow: document.documentElement.scrollWidth > innerWidth,
              targetTop: rect.top,
              targetLeft: rect.left,
              targetRight: rect.right,
              appPadding: getComputedStyle(app).paddingTop,
              layer: { position: layer.position, top: layer.top, height: layer.height, pointerEvents: layer.pointerEvents },
              footer: getComputedStyle(document.querySelector('.bottom-nav')).backgroundColor,
            };
          });
          assert.equal(geometry.rootTheme, 'twilight');
          assert.equal(geometry.rootScheme, 'dark');
          assert.equal(geometry.bodyScheme, 'light');
          assert.equal(geometry.meta, '#172330');
          assert.equal(geometry.overflow, false, `${view} ${viewport.width}: horizontal overflow`);
          assert.equal(geometry.appPadding, `${top}px`, 'Safe inset is applied once');
          assert.ok(geometry.targetTop >= top, `${view}: controls below safe inset`);
          assert.ok(geometry.targetLeft >= 0 && geometry.targetRight <= viewport.width);
          assert.deepEqual(geometry.layer, { position: 'fixed', top: '0px', height: `${top}px`, pointerEvents: 'none' });
          assert.equal(geometry.footer, 'rgb(243, 239, 230)');
          if (top) assert.ok(isNight(await pixel(viewport.width / 2, 20)), `${view}: night-colored top inset`);
          if (view === 'tasks') await checkHomeSeam();
          await page.evaluate(() => scrollTo(0, 350));
          await settle();
          if (top) assert.ok(isNight(await pixel(viewport.width / 2, 20)), `${view}: inset stays dark while scrolled`);
          results.push(`${viewport.width}x${viewport.height} safe-top=${top} ${view}`);
        }
      }
    }
    await page.setViewportSize({ width: 430, height: 932 });
    await insets(59, 34);
    await navigate('tasks');
    for (const theme of ['sweet', 'default', 'twilight']) {
      await page.evaluate(async (theme) => (await import('/src/ui.js')).applyTheme(theme, { silent: true }), theme);
      await settle();
      assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), theme);
      const scheme = await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
      assert.equal(scheme, theme === 'twilight' ? 'dark' : 'normal', 'Root scheme restores with older themes');
      if (theme !== 'twilight') {
        assert.equal(await page.evaluate(() => getComputedStyle(document.body, '::before').zIndex), '0', 'Night inset cover is removed for older themes');
      }
    }
    await page.reload();
    await page.locator('#app-loader').waitFor({ state: 'hidden' });
    await page.locator('#twilight-home:not([hidden]) .twilight-masthead').waitFor();
    await page.locator('#task-view-content .twilight-task-card').waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'twilight', 'Theme persists across startup');
    assert.equal(await page.evaluate(async () => (await (await import('/src/taskService.js')).getAllTasks()).length), 1, 'Theme changes preserve tasks');
    await page.setViewportSize({ width: 320, height: 740 });
    await insets(59, 34);
    await navigate('tasks');
    await screenshot('home-narrow');
    await page.setViewportSize({ width: 1280, height: 900 });
    await insets(0, 0);
    await screenshot('home-desktop');
  }
  assert.deepEqual(failures, [], 'No uncaught app errors');
  await fs.writeFile(`${output}/${phase}-checks.json`, JSON.stringify({ phase, cases: results, pageErrors: failures, nativeIosStatusBar: 'Not tested; physical iPhone acceptance required.' }, null, 2) + '\n');
  console.log(`PASS ${phase}: ${results.length} layout cases; screenshots saved in ${output}`);
  await context.close();
} finally {
  await browser.close();
}
