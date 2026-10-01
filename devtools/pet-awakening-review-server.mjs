import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const source = path.resolve(import.meta.dirname, '..');
const root = process.argv[2] ? path.resolve(process.argv[2]) : source;
const manifest = JSON.parse(await fs.readFile(path.join(root, 'release-artifact.json'), 'utf8').catch((error) => { if (error.code === 'ENOENT') return 'null'; throw error; }));
const scope = manifest?.profile.scopePath || '/';
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
http.createServer(async (req, res) => {
  try {
    let file = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname).slice(1);
    if (scope !== '/') {
      if (file === 'awakening-review/' || file === 'awakening-review' || file === '') {
        res.writeHead(302, { Location: scope + (file ? 'awakening-review/' : 'index.html') }).end(); return;
      }
      if (!file.startsWith(scope.slice(1))) throw Error('Outside pinned artifact scope');
      file = file.slice(scope.length - 1);
    }
    if (req.method !== 'GET' || file.includes('\\') || file.split('/').some((s) => s === '..' || s.startsWith('.'))) throw Error('Not a public preview resource');
    if (['awakening-review/', 'awakening-review', 'awakening-demo/', 'awakening-demo'].includes(file)) {
      res.setHeader('Content-Type', mime['.html']); res.setHeader('Cache-Control', 'no-store');
      const page = file.startsWith('awakening-demo') ? 'pet-awakening-demo.html' : 'pet-awakening-review.html';
      res.end((await fs.readFile(path.join(source, `devtools/${page}`), 'utf8')).replace('<base href="/">', `<base href="${scope}">`)); return;
    }
    file ||= 'index.html';
    if (!/^(src\/|assets\/|data\/|index\.html$|service-worker\.js$|manifest\.webmanifest$|release-artifact\.json$)/.test(file)) throw Error('Not a public resource');
    const resolved = await fs.realpath(path.resolve(root, file));
    if (!resolved.startsWith(root + path.sep)) throw Error('Unsafe path');
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); res.setHeader('Cache-Control', 'no-store');
    res.end(await fs.readFile(resolved));
  } catch { res.writeHead(404).end('Preview resource not found'); }
}).listen(0, '127.0.0.1', function () { console.log(`http://127.0.0.1:${this.address().port}${scope}awakening-review/`); });
