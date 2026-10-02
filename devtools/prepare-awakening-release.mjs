/** Produce/verify matching immutable preview + production; never deploy or approve. */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { prepareReleaseArtifact } from '../scripts/releaseArtifact.mjs';
import { verifyReleaseArtifact } from '../scripts/verify-release-artifact.mjs';
const root = path.resolve(import.meta.dirname, '..');
const artifacts = {};
for (const profile of ['preview', 'production']) {
  const scopePath = `/questnote-pwa${profile === 'preview' ? '-preview' : ''}/`;
  // Feature release: retain source catalogs; old pool candidate pins pre-awakening runtime.
  const result = await prepareReleaseArtifact({ projectRoot: root,
    outputRoot: path.join(os.tmpdir(), 'questnote-awakening-releases'), profile, scopePath });
  const manifestBytes = await fs.readFile(result.manifestPath);
  const manifestSha256 = createHash('sha256').update(manifestBytes).digest('hex');
  artifacts[profile] = { artifactDir: result.artifactDir, artifactId: result.artifactId, manifestSha256, scopePath };
  await verifyReleaseArtifact({ ...artifacts[profile], profile });
}
const reports = path.join(root, 'reports/awakening-implementation');
await fs.mkdir(reports, { recursive: true });
await fs.writeFile(path.join(reports, 'artifacts.json'), JSON.stringify(artifacts, null, 2) + '\n');
console.log(JSON.stringify(artifacts, null, 2));
