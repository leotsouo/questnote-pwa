// Native app and IndexedDB on an isolated loopback origin; synthetic dates never touch player data.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const { chromium } = process.env.QUESTNOTE_PLAYWRIGHT_PACKAGE
  ? createRequire(import.meta.url)(process.env.QUESTNOTE_PLAYWRIGHT_PACKAGE)
  : await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../',import.meta.url));
const output = path.resolve(process.argv[2] || '.dev-backups/test-runs/daily-encounter-browser');
assert.ok(output.startsWith(path.join(root,'.dev-backups','test-runs') + path.sep));
await fs.mkdir(output,{recursive:true});
const types = {'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'};
const server = http.createServer(async (req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    const file = path.resolve(root,'.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    const bytes = await fs.readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-store'});
    res.end(bytes);
  } catch { if (!res.headersSent) res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({channel:'msedge',headless:true});
const errors = []; const evidence = []; let diagnosticPage;
try {
  const context = await browser.newContext({viewport:{width:393,height:852},timezoneId:'Asia/Taipei',reducedMotion:'reduce'});
  await context.route('**/*',route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage(); diagnosticPage = page;
  page.on('pageerror',error => errors.push(error.message));
  await page.clock.setFixedTime(new Date('2026-10-12T12:00:00+08:00'));
  const loaded = async () => { await page.locator('#app-loader').waitFor({state:'hidden'}); };
  await page.goto(origin + '/index.html'); await loaded();
  if (await page.locator('[data-guided-action="skip"]').isVisible()) {
    await page.locator('[data-guided-action="skip"]').click();
    await page.locator('[data-guided-action="confirm-skip"]').click();
  }
  const dismissHint = async () => {
    const hint = page.getByRole('button',{name:'我知道了',exact:true});
    if (await hint.isVisible()) await hint.click();
  };
  await dismissHint();
  const readEconomy = () => page.evaluate(async () => {
    const db = await import('/src/db.js'); return db.dbGet(db.STORES.META,'encounterEconomy');
  });
  const baseline = (await readEconomy())?.balance || 0;
  const taskId = await page.evaluate(async () => {
    const service = await import('/src/taskService.js');
    const row = await service.createTask({content:'每日相遇驗證任務',planToday:true}); return row.id;
  });
  await page.reload(); await loaded(); await dismissHint();
  await page.locator('.bottom-nav [data-view="tasks"]').click();
  await page.locator(`.task-card[data-id="${taskId}"] [data-action="toggle"]`).first().click();
  await page.waitForFunction(async balance => {
    const db = await import('/src/db.js'); return (await db.dbGet(db.STORES.META,'encounterEconomy'))?.balance === balance;
  },baseline + 10);
  assert.equal((await readEconomy()).dailyReceipt.date,'2026-10-12');
  const sameDay = await page.evaluate(async taskId => {
    const tasks = await import('/src/taskService.js'); const habits = await import('/src/habitService.js');
    await tasks.toggleTaskComplete(taskId); await tasks.toggleTaskComplete(taskId);
    const {habit} = await habits.createHabit({name:'每日相遇驗證習慣',frequency:'daily'});
    const first = await habits.completeHabitToday(habit.id);
    await habits.uncompleteHabitToday(habit.id); await habits.completeHabitToday(habit.id);
    const second = await tasks.createTask({content:'同日第二個任務'}); await tasks.toggleTaskComplete(second.id);
    return {habitId:habit.id,firstSuccess:first.success};
  },taskId);
  assert.equal(sameDay.firstSuccess,true);
  assert.equal((await readEconomy()).balance,baseline + 10);
  evidence.push('Native task completion grants 10; same-day task/habit completion and cancel/redo do not duplicate fragments');
  await page.clock.setFixedTime(new Date('2026-10-13T12:00:00+08:00'));
  await page.evaluate(async () => {
    const tasks = await import('/src/taskService.js'); const row = await tasks.createTask({content:'翌日相遇驗證任務'});
    await tasks.toggleTaskComplete(row.id);
  });
  assert.equal((await readEconomy()).balance,baseline + 20);
  assert.equal((await readEconomy()).dailyReceipt.date,'2026-10-13');
  await page.clock.setFixedTime(new Date('2026-10-12T18:00:00+08:00'));
  await page.evaluate(async () => {
    const tasks = await import('/src/taskService.js'); const row = await tasks.createTask({content:'回撥日期驗證任務'});
    await tasks.toggleTaskComplete(row.id);
  });
  assert.equal((await readEconomy()).balance,baseline + 20);
  evidence.push('Advancing the local day earns the next 10; clock rollback does not grant another award');
  const backupResult = await page.evaluate(async () => {
    const backup = await import('/src/backupService.js');
    const exported = await backup.exportBackup();
    const restored = backup.migrateImportedData(backup.normalizeBackupPayload(JSON.parse(JSON.stringify(exported))));
    return {valid:backup.validateBackup(exported).valid,exported:exported.data.encounterEconomy,restored:restored.encounterEconomy};
  });
  assert.equal(backupResult.valid,true);
  assert.deepEqual(backupResult.restored,backupResult.exported);
  assert.deepEqual(backupResult.restored,await readEconomy());
  evidence.push('Real export and import normalization retain balance and the advancing-day receipt');
  await page.clock.setFixedTime(new Date('2026-10-13T12:01:00+08:00'));
  await page.reload(); await loaded();
  const settle = async () => {
    const end = Date.now() + 20000;
    while (Date.now() < end) {
      const skip = page.locator('.dream-debut-overlay [data-role="skip"]');
      if (await skip.isVisible()) await skip.click({timeout:500}).catch(() => {});
      if (await page.evaluate(() => !document.querySelector('.dream-debut-overlay') &&
        document.querySelector('[data-identity-action="series-directory"]') &&
        !document.querySelector('[data-identity-action="series-directory"]').disabled)) return;
      await page.waitForTimeout(50);
    }
    throw new Error('Pool entry did not settle');
  };
  await page.locator('.bottom-nav [data-view="gacha"]').click(); await settle(); await dismissHint();
  assert.match(await page.locator('.invitation-entry .daily-encounter-note').innerText(),/已存下.*10/);
  const saved = await readEconomy();
  for (const width of [393,1280]) {
    await page.setViewportSize({width,height:width === 393 ? 852 : 900});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({path:path.join(output,`summon-daily-${width}.png`),fullPage:true});
    await page.locator('[data-identity-action="invitation"]').click();
    const dialog = page.locator('#specified-invitation-dialog');
    await dialog.waitFor({state:'visible'});
    assert.match(await dialog.locator('.daily-encounter-note').innerText(),/已存下.*10/);
    assert.ok(await dialog.locator('[data-invitation-pet]').count() > 0);
    assert.equal(await dialog.locator('[data-invitation-query]').isVisible(),false);
    assert.ok(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth + 1));
    await page.screenshot({path:path.join(output,`invitation-daily-${width}.png`)});
    await dialog.locator('[data-invitation-pet]').first().click();
    assert.ok(await dialog.locator('.invitation-identity').isVisible());
    await dialog.locator('[data-invitation-action="close"]').first().click();
  }
  assert.deepEqual(await readEconomy(),saved);
  evidence.push('393px and 1280px native summon/invitation screens show saved daily progress; gallery is selectable without typing and without spending');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true); await page.reload(); await loaded();
  await page.locator('.bottom-nav [data-view="gacha"]').click(); await settle();
  assert.deepEqual(await readEconomy(),saved);
  assert.match(await page.locator('.invitation-entry .daily-encounter-note').innerText(),/已存下.*10/);
  evidence.push('Offline reload retains receipt, fragments and truthful daily progress');
  assert.deepEqual(errors,[]);
  await context.close();
  await fs.writeFile(path.join(output,'result.json'),JSON.stringify({ok:true,fixtureOnly:true,evidence,pageErrors:errors},null,2));
  console.log(evidence.map(row => 'PASS ' + row).join('\n'));
} catch (error) {
  await fs.writeFile(path.join(output,'failure.txt'),error.stack || String(error));
  if (diagnosticPage) {
    await diagnosticPage.screenshot({path:path.join(output,'failure.png')});
    await fs.writeFile(path.join(output,'failure-state.json'),JSON.stringify({errors,text:await diagnosticPage.locator('body').innerText()},null,2));
  }
  throw error;
} finally {
  await browser.close(); await new Promise(resolve => server.close(resolve));
}

