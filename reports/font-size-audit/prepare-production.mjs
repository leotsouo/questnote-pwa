// Prepare and verify a local deployment commit. This script has no push command.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { verifyReleaseArtifact } from '../../scripts/verify-release-artifact.mjs';

const sourceRoot = path.resolve(import.meta.dirname, '../..');
const deploymentRoot = path.resolve(sourceRoot, '../font-production-v3437');
const expectedBase = '9e815676db8ff3e203391894090a52b1d5090129';
const branch = 'codex/font-production-v3437';
const pins = JSON.parse(await fs.readFile(path.join(import.meta.dirname, 'release-pins.json')));
const production = pins.production;
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const git = (cwd, args, options = {}) => execFileSync('git', args, { cwd, maxBuffer: 512 * 1024 * 1024, ...options });
const gitText = (cwd, args) => git(cwd, args, { encoding: 'utf8' }).trim();

assert.equal(gitText(sourceRoot, ['rev-parse', 'origin/gh-pages']), expectedBase, 'Production baseline advanced: review before preparing');
await verifyReleaseArtifact({ artifactDir: production.root, ...production, profile: 'production' });
const manifest = JSON.parse(await fs.readFile(path.join(production.root, 'release-artifact.json')));
const files = { ...manifest.files, 'release-artifact.json': { sha256: production.manifestSha256 } };
const names = Object.keys(files).sort();
const parentRoot = path.resolve(sourceRoot, '..');
assert.equal(path.dirname(deploymentRoot), parentRoot);
try { await fs.lstat(deploymentRoot); throw new Error('Deployment checkout already exists; inspect it before retrying'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
git(sourceRoot, ['-c', 'core.autocrlf=false', 'worktree', 'add', '-b', branch, deploymentRoot, expectedBase]);
assert.equal(gitText(deploymentRoot, ['status', '--porcelain']), '');
const inside = (name) => {
  assert(!name.startsWith('/') && !name.includes('\\') && name.split('/').every((part) => part && part !== '..' && part !== '.'));
  const target = path.resolve(deploymentRoot, name);
  assert(target.startsWith(deploymentRoot + path.sep), 'Path must remain inside owned deployment checkout');
  return target;
};
const tracked = git(deploymentRoot, ['ls-files', '-z']).toString('utf8').split('\0').filter(Boolean);
const removed = [];
for (const name of tracked) {
  if (Object.hasOwn(files, name)) continue;
  const target = inside(name);
  assert((await fs.lstat(target)).isFile(), 'Delete only a known tracked regular file');
  await fs.unlink(target);
  removed.push(name);
}
for (const name of names) {
  const target = inside(name);
  const bytes = await fs.readFile(path.join(production.root, name));
  assert.equal(sha(bytes), files[name].sha256);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, bytes);
}
git(deploymentRoot, ['-c', 'core.autocrlf=false', 'add', '--all']);
function verifyGitBytes(ref) {
  const indexed = git(deploymentRoot, ref === 'index' ? ['ls-files', '-z'] : ['ls-tree', '-r', '--name-only', '-z', ref]).toString('utf8').split('\0').filter(Boolean).sort();
  assert.deepEqual(indexed, names, 'Git inventory must exactly equal the immutable artifact');
  const specs = names.map((name) => ref === 'index' ? ':' + name : ref + ':' + name);
  const output = git(deploymentRoot, ['cat-file', '--batch'], { input: specs.join('\n') + '\n' });
  let offset = 0;
  for (const name of names) {
    const end = output.indexOf(10, offset);
    const header = output.subarray(offset, end).toString('utf8');
    assert.match(header, /^[a-f0-9]+ blob \d+$/);
    const size = Number(header.split(' ')[2]);
    const bytes = output.subarray(end + 1, end + 1 + size);
    assert.equal(sha(bytes), files[name].sha256, 'Git normalized artifact bytes: ' + name);
    offset = end + 1 + size + 1;
  }
  assert.equal(offset, output.length);
  return names.length;
}
const stagedFileCount = verifyGitBytes('index');
git(deploymentRoot, ['commit', '-m', 'V3.4.37: publish approved font settings and layout fixes']);
const deploymentCommit = gitText(deploymentRoot, ['rev-parse', 'HEAD']);
const committedFileCount = verifyGitBytes('HEAD');
assert.equal(gitText(deploymentRoot, ['status', '--porcelain']), '');
const report = { preparedAt: new Date().toISOString(), branch, deploymentRoot, deploymentCommit, parentCommit: expectedBase,
  sourceCommit: pins.sourceCommit, candidateId: pins.candidateId, artifactId: production.artifactId,
  manifestSha256: production.manifestSha256, catalogSha256: production.catalogSha256,
  stagedFileCount, committedFileCount, everyGitBlobMatchesReviewedArtifact: true, removedSupersededArtifactFiles: removed,
  productionPushed: false, productionApproval: 'PENDING_USER_FINAL_GO_AHEAD',
  finalActionAfterApproval: 'Recheck origin/gh-pages and current HTTPS baseline, then fast-forward push the prepared commit to gh-pages; verify Pages build and HTTPS artifact bytes.',
  withdrawal: 'Keep all published 96 pet identities, Lore and assets. Disable this new pool in a reviewed forward release if necessary; do not restore the 84-pet catalog or reset player saves.',
};
await fs.writeFile(path.join(import.meta.dirname, 'deployment-preparation.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
