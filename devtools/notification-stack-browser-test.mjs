import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  for (const width of [320, 393, 768]) {
    for (const theme of ['default', 'sweet']) {
      const context = await browser.newContext({ viewport: { width, height: 852 }, serviceWorkers: 'block' });
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin !== 'http://127.0.0.1:8772') return route.abort();
        if (url.pathname === '/src/ui.js') {
          const body = await fs.readFile('src/ui.js', 'utf8');
          return route.fulfill({ contentType: 'text/javascript', body: body + '\nexport { showAchievementUnlockNotifications };' });
        }
        return route.continue();
      });
      const page = await context.newPage();
      page.on('pageerror', e => console.log('ERROR', e.message));
      await page.goto('http://127.0.0.1:8772/index.html');
      await page.waitForTimeout(1500);
      await page.getByRole('button', { name: '略過教學', exact: true }).click();
      await page.evaluate(async theme => {
        document.body.dataset.theme = theme;
        const ui = await import('/src/ui.js');
        ui.showRewardToast(100, 5);
        ui.showAchievementUnlockNotifications({ newlyUnlocked: [{ name: '完成第一個任務並開始持續累積每日努力的成就' }], newTitles: [{ name: '冒險新手' }] });
      }, theme);
      await page.waitForTimeout(1200);
      const boxes = await page.locator('#toast-container > .show').evaluateAll(nodes => nodes.map(node => {
        const r = node.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, text: node.textContent };
      }));
      assert.equal(boxes.length, 3, 'Reward, achievement and title all appear');
      for (let i = 0; i < boxes.length; i++) {
        assert.ok(boxes[i].left >= 0 && boxes[i].right <= width, 'Notification stays inside viewport');
        if (i) assert.ok(boxes[i].top >= boxes[i - 1].bottom + 7, 'Notifications never overlap');
      }
      await fs.mkdir('reports/notification-stack', { recursive: true });
      await page.screenshot({ path: `reports/notification-stack/${theme}-${width}.png` });
      await page.waitForTimeout(3300);
      assert.equal(await page.locator('#toast-container > *').count(), 0, 'Expired notifications are removed');
      console.log(`PASS ${theme} ${width}px: three readable notifications, no overlap, clean expiry`);
      await context.close();
    }
  }
} finally { await browser.close(); }
