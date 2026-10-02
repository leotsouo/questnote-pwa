/** Freeze this follow-up independently of the already-published V3.5.5 package. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { prepareReleaseArtifact } from '../scripts/releaseArtifact.mjs';
import { verifyReleaseArtifact } from '../scripts/verify-release-artifact.mjs';
const projectRoot = path.resolve(import.meta.dirname, '..');
const report = path.join(projectRoot, 'reports/awakening-guide');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const get = async (file) => {
  const response = await fetch(`https://leotsouo.github.io/questnote-pwa/${file}?awakening-guide-baseline=${Date.now()}`);
  if (!response.ok) throw Error(`Baseline HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
};
const manifest = await get('release-artifact.json');
const version = await get('src/version.js');
const baseline = JSON.parse(manifest);
if (baseline.artifactId !== '24d38b6793d3e5cec64e1aa896c7832c2c4a104a4e9851c8bb728edf052b1769'
  || sha(manifest) !== '113b2182285c641a9930c76879f0fe1f612a1a38a5df5723318c7e18520cf0c3'
  || !version.toString().includes("APP_VERSION = '3.5.5'")) throw Error('Formal baseline moved; review next patch before freezing.');
await fs.writeFile(path.join(report, 'baseline.json'), JSON.stringify({ at: new Date().toISOString(), version: '3.5.5', artifactId: baseline.artifactId, manifestSha256: sha(manifest), sourceCommit: baseline.sourceCommit }, null, 2) + '\n');
const artifacts = {};
for (const [profile, scopePath] of [['preview', '/questnote-pwa-preview/'], ['production', '/questnote-pwa/']]) {
  const built = await prepareReleaseArtifact({ projectRoot, outputRoot: path.join(process.env.TEMP, 'questnote-awakening-guide-releases'), profile, scopePath });
  artifacts[profile] = { artifactDir: built.artifactDir, artifactId: built.artifactId, manifestSha256: sha(await fs.readFile(built.manifestPath)), scopePath };
  await verifyReleaseArtifact({ ...artifacts[profile], profile });
}
await fs.writeFile(path.join(report, 'artifacts.json'), JSON.stringify(artifacts, null, 2) + '\n');
console.log(JSON.stringify(artifacts, null, 2));
