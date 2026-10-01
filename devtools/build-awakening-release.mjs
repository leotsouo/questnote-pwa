/** Build both feature profiles from the same reviewed source, never deploy. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { prepareReleaseArtifact } from '../scripts/releaseArtifact.mjs';
import { verifyReleaseArtifact } from '../scripts/verify-release-artifact.mjs';
const projectRoot = path.resolve(import.meta.dirname, '..');
const outputRoot = path.join(process.env.TEMP, 'questnote-awakening-releases');
const artifacts = {};
for (const [profile, scopePath] of [['preview', '/questnote-pwa-preview/'], ['production', '/questnote-pwa/']]) {
  const built = await prepareReleaseArtifact({ projectRoot, outputRoot, profile, scopePath });
  const manifestSha256 = createHash('sha256').update(await fs.readFile(built.manifestPath)).digest('hex');
  artifacts[profile] = { artifactDir: built.artifactDir, artifactId: built.artifactId, manifestSha256, scopePath };
  await verifyReleaseArtifact({ ...artifacts[profile], profile });
}
await fs.writeFile(path.join(projectRoot, 'reports/awakening-implementation/artifacts.json'), JSON.stringify(artifacts, null, 2) + '\n');
console.log(JSON.stringify(artifacts, null, 2));
