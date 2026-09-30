import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp' };
const server = http.createServer(async (request, response) => {
  try {
    const relative = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname).slice(1);
    if (!relative || relative.includes('\\') || relative.split('/').some((part) => !part || part === '.' || part === '..')
      || !/^(src\/|data\/|assets\/|devtools\/honeylight-animation-preview\.(html|js)$)/.test(relative)) throw new Error('Not served');
    const target = await fs.realpath(path.join(root, relative));
    if (!target.startsWith(root + path.sep)) throw new Error('Outside preview');
    const bytes = await fs.readFile(target);
    response.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(bytes);
  } catch { response.writeHead(404); response.end('Not found'); }
});
server.listen(0, '127.0.0.1', () => console.log(`http://127.0.0.1:${server.address().port}/devtools/honeylight-animation-preview.html`));
