import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { authoringRoot } from './revise.mjs';

const destination = 'C:/Users/User/.codex/visualizations/2026/09/22/01a0ca22-627f-7f11-898a-8e5d89734c1d/honeylight-release/authoring-backup-v3434';
await fs.cp(authoringRoot, destination, { recursive: true, force: false, errorOnExist: true });
const hashes = {};
async function visit(relative = '') {
  for (const entry of await fs.readdir(path.join(authoringRoot, relative), { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error('Unexpected authoring link');
    const name = relative ? relative + '/' + entry.name : entry.name;
    if (entry.isDirectory()) await visit(name);
    else {
      const bytes = await fs.readFile(path.join(authoringRoot, name));
      if (!bytes.equals(await fs.readFile(path.join(destination, name)))) throw new Error('Archive mismatch: ' + name);
      hashes[name] = createHash('sha256').update(bytes).digest('hex');
    }
  }
}
await visit();
const manifest = path.join(path.dirname(destination), 'authoring-backup-v3434-manifest.json');
await fs.writeFile(manifest, JSON.stringify({ archivedAt: new Date().toISOString(), archive: destination, fileCount: Object.keys(hashes).length, verifiedEveryFile: true, hashes }, null, 2) + '\n');
await fs.copyFile(path.join(import.meta.dirname, 'authoring-backup.json'), path.join(import.meta.dirname, 'authoring-backup-before-concurrent-update.json'), fs.constants.COPYFILE_EXCL);
await fs.writeFile(path.join(import.meta.dirname, 'authoring-backup.json'), JSON.stringify({ archive: destination, manifest, fileCount: Object.keys(hashes).length, verifiedEveryFile: true, previousArchivePreserved: true }, null, 2) + '\n');
for (const file of ['release-pins.json', 'artifact-browser.json', 'actual-update-browser.json']) {
  await fs.copyFile(path.join(import.meta.dirname, file), path.join(import.meta.dirname, 'before-concurrent-update-' + file), fs.constants.COPYFILE_EXCL);
}
console.log(JSON.stringify({ fileCount: Object.keys(hashes).length, verifiedEveryFile: true }));
