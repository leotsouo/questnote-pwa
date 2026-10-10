import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..', 'dist');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.xml': 'application/xml', '.txt': 'text/plain' };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    const target = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (target !== root && !target.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    const info = await fs.stat(target).catch(() => null);
    const file = info?.isDirectory() ? path.join(target, 'index.html') : target;
    const bytes = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(bytes);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html' }).end(await fs.readFile(path.join(root, '404.html')));
  }
});
server.listen(Number(process.env.PORT || 8031), '127.0.0.1', () => console.log('Marketing: http://127.0.0.1:' + server.address().port));
