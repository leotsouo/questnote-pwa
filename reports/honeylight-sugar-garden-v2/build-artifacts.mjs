import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { prepareReleaseArtifact } from '../../scripts/releaseArtifact.mjs';
import { verifyReleaseArtifact } from '../../scripts/verify-release-artifact.mjs';

const projectRoot = path.resolve(import.meta.dirname, '../..');
const outputRoot = 'C:/Users/User/.codex/visualizations/2026/09/22/01a0ca22-627f-7f11-898a-8e5d89734c1d/honeylight-release/artifacts';
const staging = JSON.parse(await fs.readFile(path.join(import.meta.dirname, 'staging-final.json')));
const candidateDir = path.join(projectRoot, 'content/pet-series/honeylight_sugar_garden_v2/staging', staging.built.candidateId);
const pins = { preparedAt: new Date().toISOString(), sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: projectRoot, encoding: 'utf8' }).trim(), candidateId: staging.built.candidateId, productionApproval: 'PENDING_USER_FINAL_GO_AHEAD', productionPushed: false };
for (const [profile, scopePath] of [['production', '/questnote-pwa/'], ['preview', '/questnote-pwa-preview/']]) {
  const options = { projectRoot, outputRoot, profile, scopePath, candidateDir };
  const dryRun = await prepareReleaseArtifact({ ...options, dryRun: true });
  const built = await prepareReleaseArtifact(options);
  const reused = await prepareReleaseArtifact(options);
  if (dryRun.artifactId !== built.artifactId || reused.artifactId !== built.artifactId || !reused.reused) throw new Error('Artifact reproduction mismatch');
  const bytes = await fs.readFile(built.manifestPath);
  const manifestSha256 = createHash('sha256').update(bytes).digest('hex');
  const verification = await verifyReleaseArtifact({ artifactDir: built.artifactDir, artifactId: built.artifactId, manifestSha256, profile, scopePath });
  pins[profile] = { root: built.artifactDir, artifactId: built.artifactId, manifestSha256, fileCount: built.fileCount, scopePath, catalogSha256: built.descriptor.contentBundleSha256, reproducible: reused.reused, verification };
  console.log(JSON.stringify({ profile, artifactId: built.artifactId, fileCount: built.fileCount, reproducible: reused.reused }));
}
await fs.writeFile(path.join(import.meta.dirname, 'release-pins.json'), JSON.stringify(pins, null, 2) + '\n');
