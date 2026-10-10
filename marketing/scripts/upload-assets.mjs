// One-use Pages asset permission is supplied on stdin, never persisted or logged.
// Deployment itself remains a separate Cloudflare API operation.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
if (process.stdin.isTTY) process.stdin.setRawMode(true);
console.log('Ready for one-use Pages asset upload permission on stdin (echo disabled).');
let input = '';
for await (const chunk of process.stdin) {
  input += chunk;
  if (input.includes('\n')) break;
}
const jwt = input.trim();
if (process.stdin.isTTY) process.stdin.setRawMode(false);
if (!jwt || jwt.split('.').length !== 3) throw new Error('Missing scoped upload permission');
const manifest = {};
const payload = [];
const special = {};
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.txt': 'text/plain', '.xml': 'application/xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
async function collect(dir) {
  for (const item of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) await collect(file);
    else {
      const relative = path.relative(dist, file).replaceAll('\\', '/');
      const bytes = await fs.readFile(file);
      if (relative === '_headers' || relative === '_redirects') { special[relative] = bytes.toString('utf8'); continue; }
      if (relative.startsWith('_worker') || relative.startsWith('functions/')) throw new Error('Only static assets are authorized');
      const key = createHash('md5').update(bytes).digest('hex');
      manifest['/' + relative] = key;
      payload.push({ base64: true, key, metadata: { contentType: types[path.extname(file)] || 'application/octet-stream' }, value: bytes.toString('base64') });
    }
  }
}
await collect(dist);
async function request(endpoint, body) {
  const response = await fetch('https://api.cloudflare.com/client/v4/pages/assets/' + endpoint, {
    method: 'POST', headers: { Authorization: 'Bearer ' + jwt, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000),
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(`Pages asset ${endpoint} failed (${response.status}): ${JSON.stringify(result.errors)}`);
  return result.result;
}
const hashes = payload.map(asset => asset.key);
const missing = await request('check-missing', { hashes });
const toUpload = payload.filter(asset => missing.includes(asset.key));
if (toUpload.length) await request('upload', toUpload);
await request('upsert-hashes', { hashes });
await fs.writeFile(path.resolve(root, '../reports/marketing/upload-manifest.json'), JSON.stringify({ manifest, special }, null, 2));
console.log(JSON.stringify({ uploaded: toUpload.length, total: payload.length, staticOnly: true }));
