import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const source = path.resolve(import.meta.dirname, '..');
const root = process.argv[2] ? path.resolve(process.argv[2]) : source;
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
http.createServer(async (req, res) => {
  try {
    let file = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname).slice(1);
    if (req.method !== 'GET' || file.includes('\\') || file.split('/').some((s) => s === '..' || s.startsWith('.'))) throw Error('Not a public preview resource');
    if (file === 'awakening-review/' || file === 'awakening-review') {
      res.setHeader('Content-Type', mime['.html']); res.setHeader('Cache-Control', 'no-store');
      res.end(await fs.readFile(path.join(source, 'devtools/pet-awakening-review.html'))); return;
    }
    file ||= 'index.html';
    if (!/^(src\/|assets\/|data\/|index\.html$|service-worker\.js$|manifest\.webmanifest$|release-artifact\.json$)/.test(file)) throw Error('Not a public resource');
    const resolved = await fs.realpath(path.resolve(root, file));
    if (!resolved.startsWith(root + path.sep)) throw Error('Unsafe path');
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); res.setHeader('Cache-Control', 'no-store');
    res.end(await fs.readFile(resolved));
  } catch { res.writeHead(404).end('Preview resource not found'); }
}).listen(0, '127.0.0.1', function () { console.log(`http://127.0.0.1:${this.address().port}/awakening-review/`); });
