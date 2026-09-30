import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { prepareReleaseArtifact } from '../../scripts/releaseArtifact.mjs';
import { verifyReleaseArtifact } from '../../scripts/verify-release-artifact.mjs';
const projectRoot = path.resolve(import.meta.dirname, '../..');
const outputRoot = 'C:/Users/User/.codex/visualizations/2026/09/30/01a0f3e1-f329-7d30-a1a2-28698238c259/font-release-artifacts';
const candidateDir = path.join(projectRoot, 'content/pet-series/honeylight_sugar_garden_v2/staging/73f205a59d5b2cccd37fcf82aef2fa705bf19d1164bf493d5d1f9a267e87a0a0');
const pins = {};
for (const [profile, scopePath] of [['production', '/questnote-pwa/'], ['preview', '/questnote-pwa-preview/']]) {
  const built = await prepareReleaseArtifact({ projectRoot, outputRoot, profile, scopePath, candidateDir });
  const manifestSha256 = createHash('sha256').update(await fs.readFile(built.manifestPath)).digest('hex');
  assert.equal(built.descriptor.contentBundleSha256, 'f00f02ed3dc6414a7bdc41b1032d1f021e6a19edd1b1f5792f27725ec07abc45');
  const verification = await verifyReleaseArtifact({ artifactDir: built.artifactDir, artifactId: built.artifactId, manifestSha256, profile, scopePath });
  pins[profile] = { root: built.artifactDir, artifactId: built.artifactId, manifestSha256, profile, scopePath, verification };
}
await fs.writeFile(path.join(import.meta.dirname, 'release-pins.json'), JSON.stringify(pins, null, 2));
console.log(JSON.stringify(pins, null, 2));
