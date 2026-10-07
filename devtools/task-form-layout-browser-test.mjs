// Use browser-test-server.mjs on an isolated loopback origin.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.argv[2] || 'http://127.0.0.1:8879';
assert.equal(new URL(origin).hostname, '127.0.0.1');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await context.route('**/*', (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  await page.goto(origin + '/index.html');
  await page.locator('#onboarding-root [data-onboarding-action="skip"]').click();
  await page.evaluate(async () => (await import('/src/ui.js')).switchView('tasks'));
  await page.locator('[data-action="empty-add-task"]:visible').first().click();
  await page.locator('#task-form').waitFor();
  await page.locator('#task-content').fill('測試任務\n' + '很長的任務內容'.repeat(30));
  for (let i = 0; i < 4; i += 1) await page.locator('.task-wizard__next').click();
  await page.locator('#subtask-new-input').fill('子任務'.repeat(40));
  await page.locator('#subtask-add-btn').click();
  for (const width of [320, 360, 390, 430, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const theme of ['default', 'sweet', 'twilight']) {
      for (const fontSize of [16, 24, 32]) {
        await page.evaluate(({ theme, fontSize }) => {
          document.body.dataset.theme = theme;
          document.documentElement.style.fontSize = `${fontSize}px`;
          document.querySelector('#modal-body').scrollTop = 0;
        }, { theme, fontSize });
        const result = await page.evaluate(() => {
          const body = document.querySelector('#modal-body');
          const form = document.querySelector('#task-form');
          const bounds = body.getBoundingClientRect();
          const overflow = [...form.querySelectorAll('input:not([type="hidden"]), textarea, select, button, .settings-toggle__text')]
            .filter((el) => {
              const rect = el.getBoundingClientRect();
              return rect.width > 0 && (rect.left < bounds.left - 1 || rect.right > bounds.right + 1);
            }).map((el) => el.id || el.className);
          return { width: body.clientWidth, scrollWidth: body.scrollWidth, overflow,
            scrollable: body.scrollHeight > body.clientHeight, touchAction: getComputedStyle(body).touchAction };
        });
        assert.ok(result.scrollWidth <= result.width + 1, `${width}/${theme}/${fontSize}: horizontal overflow ${JSON.stringify(result)}`);
        assert.deepEqual(result.overflow, [], 'All form controls fit without clipping');
        assert.equal(result.touchAction, 'pan-y pinch-zoom');
        const bounds = await page.locator('#modal-body').boundingBox();
        if (result.scrollable) {
          await page.mouse.move(bounds.x + 4, bounds.y + 80);
          await page.mouse.wheel(500, 3000);
          await page.waitForTimeout(100);
          const scroll = await page.locator('#modal-body').evaluate((el) => ({ x: el.scrollLeft, y: el.scrollTop }));
          assert.equal(scroll.x, 0, 'Diagonal scrolling cannot move the form horizontally');
          assert.ok(scroll.y > 0, 'Vertical wheel scrolling works when content exceeds the viewport');
        }
        await page.locator('.task-wizard__next').scrollIntoViewIfNeeded();
        await assert.doesNotReject(() => page.locator('.task-wizard__next').click({ trial: true }), 'Next remains reachable');
        console.log(`PASS ${width}px ${theme} ${fontSize}px`);
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    document.body.dataset.theme = 'sweet';
    document.documentElement.style.fontSize = '16px';
    document.querySelector('#modal-body').scrollTop = 0;
  });
  await fs.mkdir('reports/task-form-layout', { recursive: true });
  await page.screenshot({ path: 'reports/task-form-layout/after.png' });
  await context.close();
} finally { await browser.close(); }
