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
if (baseline.artifactId !== '0235b47e9f0e8aed5a4e707cce8e6c79a40a25543bd9841c23cee21f5c78ef33'
  || sha(manifest) !== '9859b4fdc3379162abec5a60c7e6901955d29bb9b69cc8d80b1300ff12d2e10b'
  || !version.toString().includes("APP_VERSION = '3.5.7'")) throw Error('Formal baseline moved; review next patch before freezing.');
const catalogResponse = await fetch(`https://leotsouo.github.io/questnote-pwa/${baseline.profile.contentBundleUrl}?awakening-guide-baseline=${Date.now()}`);
if (!catalogResponse.ok) throw Error(`Formal catalog HTTP ${catalogResponse.status}`);
const catalog = await catalogResponse.json();
const canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value;
const contentBundleSemanticSha256 = sha(JSON.stringify(canonical(catalog)));
if (contentBundleSemanticSha256 !== 'e560670c83393125494fb9456ea30678864a31e0a986af1da67da863ce20349e') {
  throw Error('Formal catalog semantics changed; review the new baseline before freezing.');
}
await fs.writeFile(path.join(report, 'baseline.json'), JSON.stringify({ at: new Date().toISOString(), version: '3.5.7', artifactId: baseline.artifactId, manifestSha256: sha(manifest), sourceCommit: baseline.sourceCommit, contentBundleSemanticSha256 }, null, 2) + '\n');
const artifacts = {};
for (const [profile, scopePath] of [['preview', '/questnote-pwa-preview/'], ['production', '/questnote-pwa/']]) {
  const built = await prepareReleaseArtifact({ projectRoot, outputRoot: path.join(process.env.TEMP, 'questnote-awakening-guide-releases'), profile, scopePath });
  artifacts[profile] = { artifactDir: built.artifactDir, artifactId: built.artifactId, manifestSha256: sha(await fs.readFile(built.manifestPath)), scopePath };
  await verifyReleaseArtifact({ ...artifacts[profile], profile });
}
await fs.writeFile(path.join(report, 'artifacts.json'), JSON.stringify(artifacts, null, 2) + '\n');
console.log(JSON.stringify(artifacts, null, 2));
