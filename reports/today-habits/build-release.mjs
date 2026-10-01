import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { prepareReleaseArtifact } from '../../scripts/releaseArtifact.mjs';
import { verifyReleaseArtifact } from '../../scripts/verify-release-artifact.mjs';

const projectRoot = path.resolve(import.meta.dirname, '../..');
const outputRoot = process.argv[2];
const candidateDir = process.argv[3];
assert.ok(outputRoot, 'Provide an artifact output directory outside the source repository');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const base = 'https://leotsouo.github.io/questnote-pwa/';
const liveBytes = async (relative) => {
  const response = await fetch(base + relative + '?today-habits=' + Date.now());
  assert.ok(response.ok, `${relative}: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
};
const baseline = JSON.parse(await liveBytes('release-artifact.json'));
const baselineFiles = {};
for (const relative of ['data/global-mailbox.json', 'data/craftables.json', 'data/gift-affinities.json',
  'data/materials.json', 'data/expeditions.json']) {
  const bytes = await liveBytes(relative);
  assert.equal(hash(await fs.readFile(path.join(projectRoot, relative))), hash(bytes), `${relative}: source must preserve live content`);
  baselineFiles[relative] = hash(bytes);
}
const pins = { baseline: { artifactId: baseline.artifactId, contentBundleSha256: baseline.profile.contentBundleSha256, files: baselineFiles } };
for (const [profile, scopePath] of [['production', '/questnote-pwa/'], ['preview', '/questnote-pwa-preview/']]) {
  const built = await prepareReleaseArtifact({ projectRoot, outputRoot, profile, scopePath, candidateDir });
  assert.equal(built.descriptor.contentBundleSha256, baseline.profile.contentBundleSha256, 'App-only release must preserve the live approved catalog');
  const manifestSha256 = hash(await fs.readFile(built.manifestPath));
  const verification = await verifyReleaseArtifact({ artifactDir: built.artifactDir, artifactId: built.artifactId, manifestSha256, profile, scopePath });
  pins[profile] = { root: built.artifactDir, artifactId: built.artifactId, manifestSha256, profile, scopePath, verification };
}
await fs.writeFile(path.join(import.meta.dirname, 'release-pins.json'), JSON.stringify(pins, null, 2) + '\n');
console.log(JSON.stringify(pins, null, 2));
