import fs from 'node:fs/promises';
import path from 'node:path';

let server = await fs.readFile(path.resolve(import.meta.dirname, '../../devtools/release-artifact-browser-server.mjs'), 'utf8');
const route = "    if (url.pathname === '/test/') {";
if (!server.includes(route)) throw new Error('Native server route changed');
server = server.replace(route, `    if (url.pathname === '/review/') {
      response.setHeader('Content-Type', MIME['.html']);
      response.end('<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><title>蜜光糖庭 · 隔離 App 預覽</title><h1>蜜光糖庭 · 隔離 App 預覽</h1><p>核准的真實 12 隻卡池；只在全新本機 preview profile 建立一次測試玩家資料，不改正式站或個人存檔。</p><button id="seed">建立隔離審核資料</button><p id="status"></p><script type="module" src="./seed.js"></script></html>'); return;
    }
    if (url.pathname === '/review/seed.js') {
      response.setHeader('Content-Type', MIME['.js']); response.end(await fs.readFile(new URL('./preview-seed.js', import.meta.url))); return;
    }
` + route);
server = server.replace("new URL('./release-artifact-browser-test.js', import.meta.url)", "new URL('../../devtools/release-artifact-browser-test.js', import.meta.url)");
server = server.replace('Assembled artifact tests:', 'Manual isolated preview:');
await fs.writeFile(path.join(import.meta.dirname, 'manual-preview-server.mjs'), server);
