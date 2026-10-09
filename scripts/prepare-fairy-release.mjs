/** Prepare held immutable local artifacts; no merge, push, deployment or approval. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { prepareReleaseArtifact } from './releaseArtifact.mjs';
import { verifyReleaseArtifact } from './verify-release-artifact.mjs';
const root = path.resolve(import.meta.dirname, '..');
const outputRoot = path.resolve(process.argv[2]);
const candidateDir = path.join(root, 'content/pet-series/aurora_fairy_feast/staging/2ccbb39bc330f69224010b6af9fd95df85fcabfd64e04ed46cd786f1285f4c03');
const artifacts = {};
for (const profile of ['preview', 'production']) {
  const scopePath = profile === 'preview' ? '/questnote-pwa-preview/' : '/questnote-pwa/';
  const result = await prepareReleaseArtifact({ projectRoot: root, outputRoot, candidateDir, profile, scopePath });
  const bytes = await fs.readFile(result.manifestPath);
  const pin = { artifactDir: result.artifactDir, artifactId: result.artifactId,
    manifestSha256: createHash('sha256').update(bytes).digest('hex'), scopePath };
  await verifyReleaseArtifact({ ...pin, profile });
  artifacts[profile] = pin;
}
const report = path.join(root, 'reports/fairy-feast-acceptance');
await fs.mkdir(report, { recursive: true });
await fs.writeFile(path.join(report, 'artifacts.json'), JSON.stringify(artifacts, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(artifacts, null, 2));
