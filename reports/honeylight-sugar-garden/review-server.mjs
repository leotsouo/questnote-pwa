import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { workspace } from './author-content.mjs';

const types = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp' };
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    const relative = url.pathname === '/' ? 'IMAGE-REVIEW.html' : decodeURIComponent(url.pathname.slice(1));
    if (!/^(?:IMAGE-REVIEW\.html|images\/pet_[a-z]+\d+\.png|review\/(?:contact-sheet\.png|thumbs\/pet_[a-z]+\d+\.webp))$/.test(relative)) {
      response.writeHead(404); response.end('Not found'); return;
    }
    const file = path.resolve(workspace, relative);
    if (!file.startsWith(workspace + path.sep)) throw new Error('Outside review');
    const bytes = await fs.readFile(file);
    response.writeHead(200, { 'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self'; img-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; object-src 'none'" });
    response.end(bytes);
  } catch { response.writeHead(404); response.end('Not found'); }
});
server.listen(0, '127.0.0.1', async () => {
  const url = `http://127.0.0.1:${server.address().port}/`;
  await fs.writeFile(path.join(workspace, 'review-server.json'), JSON.stringify({ url, pid: process.pid, purpose: 'Isolated art review; no App, IndexedDB, SW or external API' }, null, 2) + '\n');
  console.log(url);
});
