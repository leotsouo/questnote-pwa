const { chromium } = require(process.env.QUESTNOTE_NODE_MODULES + '/playwright');
const fs = require('node:fs/promises');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
  await context.route('https://**/*', route => route.abort());
  const harness = await context.newPage();
  await harness.goto('http://127.0.0.1:8021/devtools/ui-polish-test.html');
  await harness.locator('#initialize').click();
  await harness.waitForFunction(() => document.querySelector('#results').textContent.includes('READY'), { timeout: 40000 });
  await harness.locator('#gray-companion').click();
  await harness.waitForFunction(() => document.querySelector('#results').textContent.includes('真實灰影幼狼素材'));
  const app = await context.newPage();
  await app.goto('http://127.0.0.1:8021/index.html');
  await app.waitForSelector('.task-card');
  await app.evaluate(async () => {
    const tasks = await import('/src/taskService.js');
    const onboarding = await import('/src/onboardingService.js');
    await onboarding.saveOnboardingState({ status: 'dismissed' });
    const existing = await tasks.getAllTasks();
    for (const item of existing) await tasks.deleteTask(item.id);
    for (const content of ['讀書 30 分鐘', '出門走走', '整理書桌', '寫下明天的計畫', '把報告寄出去']) {
      await tasks.createTask({ content, priority: 'normal', planToday: true });
    }
    const list = await tasks.getAllTasks();
    await tasks.toggleTaskComplete(list[1].id);
    await tasks.toggleTaskComplete(list[2].id);
  });
  await app.reload();
  await app.waitForSelector('.task-card');
  await fs.mkdir('marketing/assets/product', { recursive: true });
  await fs.mkdir('reports/marketing/product-audit', { recursive: true });
  for (const theme of ['default', 'sweet', 'twilight']) {
    for (const view of ['tasks', 'collection', 'gacha', 'expedition']) {
      await app.evaluate(async ({ theme, view }) => {
        const ui = await import('/src/ui.js');
        await ui.applyTheme(theme, { silent: true, skipSave: true });
        ui.switchView(view);
        window.scrollTo(0, 0);
        const active = document.querySelector('.view.active');
        if (active) active.scrollTop = 0;
      }, { theme, view });
      await app.waitForTimeout(900);
      await app.screenshot({ path: `reports/marketing/product-audit/${theme}-${view}.png` });
      if (theme === 'twilight') await app.screenshot({ path: `marketing/assets/product/${view}.png` });
    }
  }
  const evidence = { source: 'origin/main 23d8cdc / V3.4.34', viewport: '393 × 852', state: 'Disposable loopback demo profile; five realistic sample quests, two completed, catalog pets seeded by maintained guarded harness, gray wolf companion. Actual app rendering, not a mockup.', themes: ['default', 'sweet', 'twilight'], views: ['tasks', 'collection', 'gacha', 'expedition'], externalRequestsBlocked: true };
  await fs.writeFile('reports/marketing/product-audit/provenance.json', JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
  await browser.close();
})().catch(error => { console.error(error); process.exitCode = 1; });
