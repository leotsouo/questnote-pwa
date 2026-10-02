/** Full App on a fresh loopback origin with an in-memory DB module substitution. */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 4193;
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const allowedTools = new Set(['companion-app-bootstrap.js', 'companion-app-identity.js', 'companion-app-identity.css', 'companion-identity-model.js']);
const server = http.createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; worker-src 'none'; object-src 'none'; base-uri 'self'");
  try {
    if (req.headers.host !== `127.0.0.1:${port}` || !['GET', 'HEAD'].includes(req.method)) { res.writeHead(403); res.end(); return; }
    let name = decodeURIComponent(new URL(req.url, `http://127.0.0.1:${port}`).pathname).slice(1);
    if (!name || name === 'index.html') {
      const [source, controls] = await Promise.all([fs.readFile(path.join(root, 'index.html'), 'utf8'), fs.readFile(path.join(root, 'devtools/companion-app-controls.html'), 'utf8')]);
      const html = source.replace('<title>QuestNote</title>', '<title>QuestNote · 完整 App 美術測試</title>')
        .replace('</head>', '<meta name="questnote-local-review" content="companion-art-session"><link rel="stylesheet" href="devtools/companion-app-identity.css"></head>')
        .replace('<body data-theme="default">', '<body data-theme="default" data-local-art-review>' + controls)
        .replace('src="src/bootstrap.js"', 'src="devtools/companion-app-bootstrap.js"');
      res.writeHead(200, { 'Content-Type': mime['.html'] });
      res.end(req.method === 'HEAD' ? undefined : html);
      return;
    }
    if (name === 'src/db.js') name = 'devtools/companion-session-db.js';
    else if (name.startsWith('devtools/') && !allowedTools.has(name.slice(9))) { res.writeHead(404); res.end(); return; }
    else if (!/^(src|assets|data|devtools)\//.test(name) && !/^reports\/companion-app-test\/(index\.html|screenshots\/[a-z0-9-]+\.jpg)$/.test(name) && name !== 'manifest.webmanifest') { res.writeHead(404); res.end(); return; }
    const absolute = path.resolve(root, name);
    if (!absolute.startsWith(root) || name.split('/').some((part) => part.startsWith('.'))) { res.writeHead(404); res.end(); return; }
    const bytes = await fs.readFile(absolute);
    res.writeHead(200, { 'Content-Type': mime[path.extname(name)] || 'application/octet-stream' });
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch (error) {
    res.writeHead(error.code === 'ENOENT' ? 404 : 500);
    res.end('Local art review resource unavailable');
  }
});
server.listen(port, '127.0.0.1', () => console.log(`QuestNote full App art review: http://127.0.0.1:${port}/ (memory only)`));
