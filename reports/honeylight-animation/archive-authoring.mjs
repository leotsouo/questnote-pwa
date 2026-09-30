import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = path.resolve(import.meta.dirname, '../..');
const original = path.join(root, '.dev-backups/honeylight-authoring');
const staging = JSON.parse(await fs.readFile(new URL('./staging-final.json', import.meta.url)));
const destination = `C:/Users/User/.codex/visualizations/2026/09/22/01a0ca22-627f-7f11-898a-8e5d89734c1d/honeylight-animation/authoring-${staging.built.candidateId}`;
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function list(dir, relative = '') {
  const out = {};
  for (const entry of await fs.readdir(path.join(dir, relative), { withFileTypes: true })) {
    assert(!entry.isSymbolicLink());
    const name = path.posix.join(relative, entry.name);
    if (entry.isDirectory()) Object.assign(out, await list(dir, name));
    else out[name] = sha(await fs.readFile(path.join(dir, name)));
  }
  return out;
}
const files = await list(original);
await fs.mkdir(path.dirname(destination), { recursive: true });
await fs.cp(original, destination, { recursive: true, force: false, errorOnExist: true });
assert.deepEqual(await list(destination), files);
await fs.writeFile(new URL('./authoring-backup.json', import.meta.url), JSON.stringify({ backedUpAt: new Date().toISOString(),
  original, destination, candidateId: staging.built.candidateId, fileCount: Object.keys(files).length, everyFileVerified: true, files }, null, 2) + '\n');
console.log(`Authoring backup: ${Object.keys(files).length} exact files`);
