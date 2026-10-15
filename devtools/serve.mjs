#!/usr/bin/env node
/**
 * Zero-dependency local static server for the source checkout.
 * Fixed to http://127.0.0.1:8000/ so every document and session uses one address.
 * `--root <dir>` serves another directory (for example an assembled artifact).
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HOST = '127.0.0.1';
const PORT = 8000;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8', '.mp4': 'video/mp4', '.webm': 'video/webm',
};

const args = process.argv.slice(2);
const rootIndex = args.indexOf('--root');
const root = path.resolve(rootIndex >= 0 && args[rootIndex + 1]
  ? args[rootIndex + 1]
  : path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));

const server = http.createServer((request, response) => {
  const send = (status, body, headers = {}) => {
    response.writeHead(status, { 'Cache-Control': 'no-store', ...headers });
    response.end(body);
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') return send(405, 'Method Not Allowed');
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, `http://${HOST}`).pathname); }
  catch { return send(400, 'Bad Request'); }
  const target = path.resolve(root, `.${pathname}`);
  if (target !== root && !target.startsWith(root + path.sep)) return send(403, 'Forbidden');
  fs.stat(target, (statError, stat) => {
    if (statError) return send(404, 'Not Found');
    if (stat.isDirectory()) {
      if (!pathname.endsWith('/')) return send(301, '', { Location: `${pathname}/` });
      return serveFile(path.join(target, 'index.html'));
    }
    return serveFile(target);
  });
  function serveFile(file) {
    fs.stat(file, (error, stat) => {
      if (error || !stat.isFile()) return send(404, 'Not Found');
      response.writeHead(200, {
        'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Content-Length': stat.size,
        'Cache-Control': 'no-store',
      });
      if (request.method === 'HEAD') return response.end();
      return fs.createReadStream(file).on('error', () => response.destroy()).pipe(response);
    });
  }
});

server.on('error', (error) => {
  console.error(error.code === 'EADDRINUSE'
    ? `Port ${PORT} is already in use. Stop the other server first; this project only uses ${PORT}.`
    : error.message);
  process.exit(1);
});
server.listen(PORT, HOST, () => {
  console.log(`QuestNote source server: http://${HOST}:${PORT}/  (root: ${root})`);
  console.log('Press Ctrl+C to stop.');
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
