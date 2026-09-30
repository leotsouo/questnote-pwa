import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const projectRoot = path.resolve(import.meta.dirname, '../..');
const git = (...args) => execFileSync('git', args, { cwd: projectRoot, encoding: 'utf8' }).trim();
const manifest = JSON.parse(git('show', 'origin/gh-pages:release-artifact.json'));
const previous = JSON.parse(await fs.readFile(path.resolve(import.meta.dirname, '../honeylight-sugar-garden/baseline-evidence.json')));
if (manifest.profile.contentBundleSha256 !== previous.bundleSha256) throw new Error('Published content baseline changed; reconcile before release');
const names = ['release-artifact.json', manifest.profile.contentBundleUrl, 'src/releaseProfile.js', 'src/version.js', 'src/bootstrap.js', 'service-worker.js', 'data/global-mailbox.json'];
const checks = [];
for (const name of names) {
  const expected = execFileSync('git', ['show', `origin/gh-pages:${name}`], { cwd: projectRoot });
  const response = await fetch(new URL(name, 'https://leotsouo.github.io/questnote-pwa/'), { cache: 'no-store' });
  if (!response.ok) throw new Error(`Live baseline HTTP ${response.status}: ${name}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const sha = (data) => createHash('sha256').update(data).digest('hex');
  checks.push({ path: name, sha256: sha(bytes), expectedSha256: sha(expected), matches: bytes.equals(expected) });
  if (!bytes.equals(expected)) throw new Error('Live baseline changed: ' + name);
}
await fs.writeFile(path.join(import.meta.dirname, 'live-baseline.json'), JSON.stringify({ checkedAt: new Date().toISOString(), sourceMain: git('rev-parse', 'origin/main'), ghPagesCommit: git('rev-parse', 'origin/gh-pages'), artifactId: manifest.artifactId, contentBundleSha256: manifest.profile.contentBundleSha256, unchanged84PetBaseline: true, checks }, null, 2) + '\n');
console.log(JSON.stringify({ artifactId: manifest.artifactId, checkedFiles: checks.length, matches: true }));
