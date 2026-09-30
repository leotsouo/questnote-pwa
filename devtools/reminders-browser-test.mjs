/** Isolated source UI acceptance. Push transport is mocked; no production API is contacted. */
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { createECDH, randomBytes } from 'node:crypto';
import webpush from 'web-push';
import worker from '../backend/reminders/worker.js';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve('.');
const db = new DatabaseSync(':memory:'); db.exec(await fs.readFile('backend/reminders/schema.sql', 'utf8'));
const binding = { prepare(sql) { return { bind(...args) { return { first: async () => db.prepare(sql).get(...args) || null, run: async () => db.prepare(sql).run(...args) }; } }; } };
const keys = webpush.generateVAPIDKeys(); const ec = createECDH('prime256v1'); ec.generateKeys();
const subscription = { endpoint: 'https://web.push.apple.com/isolated-test', keys: { p256dh: ec.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') } };
let origin; let rejectSync = false;
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, origin);
    if (url.pathname.startsWith('/reminder-api')) {
      if (rejectSync && req.method === 'PUT') { res.writeHead(503, { 'Content-Type': 'application/json' }).end('{"error":"isolated offline test"}'); return; }
      if (url.pathname.endsWith('/test')) { res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"accepted":true}'); return; }
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const headers = new Headers(req.headers); headers.set('Origin', origin);
      const request = new Request(origin + url.pathname.replace('/reminder-api', ''), { method: req.method, headers, ...(['GET', 'HEAD'].includes(req.method) ? {} : { body: Buffer.concat(chunks) }) });
      const response = await worker.fetch(request, { DB: binding, ALLOWED_ORIGINS: origin, VAPID_PUBLIC_KEY: keys.publicKey });
      res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer())); return;
    }
    const file = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp' };
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }); res.end(await fs.readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve)); origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, timezoneId: 'Asia/Taipei' });
  await context.route('**/*', (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await context.addInitScript(({ subscription, publicKey }) => {
    let subscribed = false;
    const sub = { toJSON: () => subscription, options: { applicationServerKey: Uint8Array.from(atob(publicKey.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)).buffer }, unsubscribe: async () => { subscribed = false; return true; } };
    const reg = { active: {}, pushManager: { getSubscription: async () => subscribed ? sub : null, subscribe: async () => { subscribed = true; return sub; } }, update: async () => {} };
    const sw = new EventTarget(); sw.ready = Promise.resolve(reg); sw.register = async () => reg; sw.getRegistration = async () => reg; sw.controller = null;
    Object.defineProperty(navigator, 'serviceWorker', { value: sw });
    Object.defineProperty(window, 'Notification', { value: class { static permission = 'granted'; static requestPermission = async () => 'granted'; } });
    if (!window.PushManager) window.PushManager = class {};
  }, { subscription, publicKey: keys.publicKey });
  const page = await context.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(origin); await page.getByRole('button', { name: '略過教學', exact: true }).click();
  await page.locator('#btn-add-task').click(); await page.locator('#task-content').fill('明天要繳電費\nPRIVATE LONG TEXT');
  await page.locator('[data-plan-date="tomorrow"]').click();
  const tomorrow = await page.locator('#task-plan-date').inputValue();
  await page.locator('#task-form button[type="submit"]').click();
  await page.getByRole('heading', { name: /明日計畫/ }).waitFor();
  console.log('PASS: tomorrow date picker saves a future plan and displays the tomorrow section');
  await page.evaluate(async () => (await import('/src/ui.js')).switchView('settings'));
  await page.locator('#reminder-enable').click(); assert.match(await page.locator('#reminder-result').innerText(), /勾選/);
  await page.locator('#reminder-consent').check(); await page.locator('#reminder-enable').click();
  await page.waitForFunction(() => document.getElementById('reminder-status').textContent === '每日提醒已啟用');
  let row = db.prepare('SELECT * FROM installations').get();
  assert.equal(JSON.parse(row.state_json).tasks[0].plannedDate, tomorrow); assert.ok(!row.state_json.includes('PRIVATE'));
  console.log('PASS: permission + consent + subscription + projection sync enables the reminder without private task text');
  await page.locator('#reminder-time').fill('07:30'); await page.locator('#reminder-titles').check(); await page.locator('#reminder-save').click();
  await page.waitForFunction(() => document.getElementById('reminder-result').textContent === '提醒設定已儲存。');
  row = db.prepare('SELECT * FROM installations').get(); assert.equal(JSON.parse(row.state_json).settings.time, '07:30'); assert.ok(row.state_json.includes('明天要繳電費')); assert.ok(!row.state_json.includes('PRIVATE'));
  console.log('PASS: changing reminder time reschedules; title opt-in sends only the first line');
  const revision = row.revision;
  await page.evaluate(async () => {
    const { getAllTasks, updateTask } = await import('/src/taskService.js'); const [task] = await getAllTasks(); await updateTask(task.id, { completed: true });
  });
  await page.waitForFunction(() => document.getElementById('reminder-status').textContent === '每日提醒已啟用');
  await new Promise((r) => setTimeout(r, 1000));
  row = db.prepare('SELECT * FROM installations').get(); assert.ok(row.revision > revision); assert.equal(JSON.parse(row.state_json).tasks.length, 0);
  console.log('PASS: task completion atomically marks a new reminder revision and removes completed tasks from the server');
  rejectSync = true;
  await page.evaluate(async () => { const { createTask } = await import('/src/taskService.js'); await createTask({ content: '離線修改', plannedDate: '2026-10-01' }); });
  await page.waitForFunction(() => document.getElementById('reminder-status').textContent.includes('待同步'));
  rejectSync = false; await page.locator('#reminder-sync').click();
  await page.waitForFunction(() => document.getElementById('reminder-result').textContent === '提醒資料已同步。');
  console.log('PASS: failed sync preserves local tasks and dirty state; retry repairs the server projection');
  const beforeRestore = await page.evaluate(async () => (await import('/src/reminderService.js')).getReminderState());
  await page.evaluate(async () => {
    const { readAllStoresSnapshot, replaceAllStores } = await import('/src/db.js'); const s = await readAllStoresSnapshot();
    await replaceAllStores({ tasks: s.tasks, habits: s.habits });
  });
  const afterRestore = await page.evaluate(async () => (await import('/src/reminderService.js')).getReminderState());
  assert.equal(afterRestore.token, beforeRestore.token); assert.ok(afterRestore.revision > beforeRestore.revision);
  console.log('PASS: restore preserves this installation credential and increments reminder revision');
  await page.locator('#reminder-test').click(); await page.waitForFunction(() => document.getElementById('reminder-result').textContent.includes('接受測試通知'));
  await fs.mkdir('.dev-backups/reminders/screenshots', { recursive: true });
  await page.setViewportSize({ width: 393, height: 1800 });
  await page.locator('.settings-reminders').screenshot({ path: '.dev-backups/reminders/screenshots/settings-393.png', style: '.toast-container { visibility: hidden; }' });
  for (const theme of ['twilight', 'sweet', 'default']) {
    await page.evaluate(async (theme) => { await (await import('/src/ui.js')).applyTheme(theme, { silent: true }); }, theme);
    for (const width of [320, 393, 430, 768]) {
      await page.setViewportSize({ width, height: 1800 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${theme} ${width}px overflow`);
      assert.equal(await page.locator('#reminder-enable').isVisible(), false, 'enabled settings have one primary action');
      assert.equal(await page.getByRole('switch', { name: /今日任務/ }).isChecked(), true);
      await page.locator('.settings-reminders').screenshot({ path: `.dev-backups/reminders/screenshots/${theme}-${width}.png`, style: '.toast-container { visibility: hidden; }' });
    }
  }
  await page.getByRole('switch', { name: /顯示項目名稱/ }).uncheck();
  assert.ok(!(await page.locator('#reminder-preview-body').innerText()).includes('閱讀'));
  await page.getByRole('switch', { name: /顯示項目名稱/ }).focus();
  await page.keyboard.press('Space');
  assert.ok((await page.locator('#reminder-preview-body').innerText()).includes('閱讀'));
  console.log('PASS: three themes at 320/393/430/768px, labeled keyboard switches and live privacy preview');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.locator('#reminder-disable').click(); await page.waitForFunction(() => document.getElementById('reminder-result').textContent.includes('雲端提醒資料已刪除'));
  assert.equal(db.prepare('SELECT count(*) n FROM installations').get().n, 0);
  assert.deepEqual(errors, []);
  console.log('PASS: test feedback, readable mobile controls, and disable deletes this installation; no page errors');
  await context.close();
} finally { await browser.close(); server.close(); db.close(); }
