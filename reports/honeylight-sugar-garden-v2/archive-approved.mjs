import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { authoringRoot, workspace, seriesId } from './revise.mjs';

export const releaseRoot = 'C:/Users/User/.codex/visualizations/2026/09/22/01a0ca22-627f-7f11-898a-8e5d89734c1d/honeylight-release';
const projectRoot = path.resolve(import.meta.dirname, '../..');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function files(root, relative = '') {
  const result = [];
  for (const entry of await fs.readdir(path.join(root, relative), { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error('Archive cannot contain links');
    const file = relative ? relative + '/' + entry.name : entry.name;
    if (entry.isDirectory()) result.push(...await files(root, file));
    else if (entry.isFile()) result.push(file);
    else throw new Error('Unsupported file type');
  }
  return result.sort();
}
const backup = path.join(projectRoot, 'content/pet-series', seriesId);
for (const file of await files(workspace)) {
  const bytes = await fs.readFile(path.join(workspace, file));
  const destination = path.join(backup, file);
  if (file.startsWith('approvals/') || file.startsWith('staging/')) {
    try { if (!(await fs.readFile(destination)).equals(bytes)) throw new Error('Immutable backup changed: ' + file); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, bytes);
}
const staging = JSON.parse(await fs.readFile(path.join(import.meta.dirname, 'staging-final.json')));
await fs.writeFile(path.join(backup, 'AUTHORING-LOCATION.md'), `# Active approved Honeylight workspace\n\nCanonical native root: ${authoringRoot}\n\nAll five stages are approved. Active final candidate: ${staging.built.candidateId}. The earlier same-series candidate ${staging.supersededCandidate} is superseded by release-version and default-presentation completion. The old honeylight_sugar_garden series is superseded; do not publish it or both versions.\n\nSource data now contains the promoted 96-pet catalog. Native authoring status must use --root with the preserved canonical 84-pet baseline; do not rewrite pipeline baseline hashes. Original human image approval is preserved; release-content-review.json confirms identical PNG files were carried forward when upstream metadata changed. Formal production push remains pending the user's final go-ahead.\n`);
await fs.mkdir(releaseRoot, { recursive: true });
const archive = path.join(releaseRoot, 'authoring-backup');
await fs.cp(authoringRoot, archive, { recursive: true, force: false, errorOnExist: true });
const hashes = {};
for (const file of await files(authoringRoot)) {
  const expected = sha(await fs.readFile(path.join(authoringRoot, file)));
  if (sha(await fs.readFile(path.join(archive, file))) !== expected) throw new Error('Full archive mismatch: ' + file);
  hashes[file] = expected;
}
const report = { archivedAt: new Date().toISOString(), archive, fileCount: Object.keys(hashes).length, hashes, verifiedEveryFile: true, includes: ['84-pet baseline with original/variant assets', 'Original superseded draft and generation/revision logs', 'Revised draft with all ten approval receipts and original PNGs', 'Both immutable candidates; only staging-final.json names the active release input'] };
await fs.writeFile(path.join(releaseRoot, 'authoring-backup-manifest.json'), JSON.stringify(report, null, 2) + '\n');
await fs.writeFile(path.join(import.meta.dirname, 'authoring-backup.json'), JSON.stringify({ archive, manifest: path.join(releaseRoot, 'authoring-backup-manifest.json'), fileCount: report.fileCount, verifiedEveryFile: true }, null, 2) + '\n');
console.log(JSON.stringify({ archive, fileCount: report.fileCount, verified: true }));
