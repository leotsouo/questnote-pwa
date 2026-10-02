/** Freeze this follow-up against the already-published V3.5.9 package. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { prepareReleaseArtifact } from '../scripts/releaseArtifact.mjs';
import { verifyReleaseArtifact } from '../scripts/verify-release-artifact.mjs';
const projectRoot = path.resolve(import.meta.dirname, '..');
const report = path.join(projectRoot, 'reports/awakening-guide');
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: projectRoot, encoding: 'utf8' }).trim();
const previewScope = `/questnote-pwa-preview/v3510-review-${sourceCommit.slice(0, 8)}/`;
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const get = async (file) => {
  const response = await fetch(`https://leotsouo.github.io/questnote-pwa/${file}?awakening-guide-baseline=${Date.now()}`);
  if (!response.ok) throw Error(`Baseline HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
};
const manifest = await get('release-artifact.json');
const version = await get('src/version.js');
const baseline = JSON.parse(manifest);
if (baseline.artifactId !== 'fc6946ae230b2583071b1e814227d1c8e175b185750fe96e3fe7834b3e9d50e0'
  || sha(manifest) !== 'c5fcf60d26506497f974564f63bb4aca23359134f1f10cafbe09da0b95131af7'
  || !version.toString().includes("APP_VERSION = '3.5.9'")) throw Error('Formal baseline moved; review next patch before freezing.');
const catalogResponse = await fetch(`https://leotsouo.github.io/questnote-pwa/${baseline.profile.contentBundleUrl}?awakening-guide-baseline=${Date.now()}`);
if (!catalogResponse.ok) throw Error(`Formal catalog HTTP ${catalogResponse.status}`);
const catalog = await catalogResponse.json();
const canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value;
const contentBundleSemanticSha256 = sha(JSON.stringify(canonical(catalog)));
if (contentBundleSemanticSha256 !== '588aae49654b5f9bb3b13a2d2d63157964366274bb076c5212e6a76017344ef6') {
  throw Error('Formal catalog semantics changed; review the new baseline before freezing.');
}
await fs.writeFile(path.join(report, 'baseline.json'), JSON.stringify({ at: new Date().toISOString(), version: '3.5.9', artifactId: baseline.artifactId, manifestSha256: sha(manifest), sourceCommit: baseline.sourceCommit, contentBundleSemanticSha256 }, null, 2) + '\n');
const artifacts = {};
for (const [profile, scopePath] of [['preview', previewScope], ['production', '/questnote-pwa/']]) {
  const built = await prepareReleaseArtifact({ projectRoot, outputRoot: path.join(process.env.TEMP, 'questnote-awakening-guide-releases'), profile, scopePath });
  artifacts[profile] = { artifactDir: built.artifactDir, artifactId: built.artifactId, manifestSha256: sha(await fs.readFile(built.manifestPath)), scopePath };
  await verifyReleaseArtifact({ ...artifacts[profile], profile });
}
await fs.writeFile(path.join(report, 'artifacts.json'), JSON.stringify(artifacts, null, 2) + '\n');
console.log(JSON.stringify(artifacts, null, 2));
