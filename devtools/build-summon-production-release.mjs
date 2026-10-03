import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { prepareReleaseArtifact } from '../scripts/releaseArtifact.mjs';
import { verifyReleaseArtifact } from '../scripts/verify-release-artifact.mjs';
const projectRoot = path.resolve(import.meta.dirname, '..');
const report = path.join(projectRoot, 'reports/summon-production-v3520');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sourceCommit = execFileSync('git',['rev-parse','HEAD'],{cwd:projectRoot,encoding:'utf8'}).trim();
const root = 'https://leotsouo.github.io/questnote-pwa/';
const get = async (file) => {
  const response = await fetch(root + file + '?v3520-baseline=' + Date.now());
  if (!response.ok) throw new Error('Formal baseline HTTP ' + response.status);
  return Buffer.from(await response.arrayBuffer());
};
const bytes = await get('release-artifact.json');
const baseline = JSON.parse(bytes);
assert.equal(baseline.artifactId, '4f3b66f218a858f2b42a324be80dab4beb0b294f90ab542f2d955cb3f54c2009');
const catalogBytes = await get(baseline.profile.contentBundleUrl);
assert.equal(hash(catalogBytes), baseline.profile.contentBundleSha256);
const catalog = JSON.parse(catalogBytes);
for (const [key,file] of [['petsData','pets'],['loreData','pets-lore'],['seriesCatalog','pet-series']]) {
  assert.deepEqual(catalog[key], JSON.parse(await fs.readFile(path.join(projectRoot,'data',file+'.json'))), 'Existing content must remain unchanged: '+file);
}
const pools = JSON.parse(await fs.readFile(path.join(projectRoot,'data/pools.json')));
const withoutNames = (value) => ({...value,pools:value.pools.map(({name,...row}) => row)});
assert.deepEqual(withoutNames(catalog.poolsData), withoutNames(pools), 'Only approved pool labels may change');
const mailbox = await get('data/global-mailbox.json');
assert.deepEqual(JSON.parse(mailbox),JSON.parse(await fs.readFile(path.join(projectRoot,'data/global-mailbox.json'))),'Public mailbox rewards must remain unchanged');
await fs.writeFile(path.join(report,'baseline.json'), JSON.stringify({at:new Date().toISOString(),artifactId:baseline.artifactId,sourceCommit:baseline.sourceCommit,manifestSha256:hash(bytes),contentBundleSha256:hash(catalogBytes),mailboxSha256:hash(mailbox)},null,2)+'\n');
const artifacts = {};
for (const [profile,scopePath] of [['preview',`/questnote-pwa-preview/v3520-review-${sourceCommit.slice(0,8)}/`],['production','/questnote-pwa/']]) {
  const result = await prepareReleaseArtifact({projectRoot,outputRoot:path.join(process.env.TEMP,'questnote-summon-releases'),profile,scopePath});
  artifacts[profile] = {artifactDir:result.artifactDir,artifactId:result.artifactId,manifestSha256:hash(await fs.readFile(result.manifestPath)),scopePath};
  await verifyReleaseArtifact({...artifacts[profile],profile});
}
await fs.writeFile(path.join(report,'artifacts.json'),JSON.stringify(artifacts,null,2)+'\n');
console.log(JSON.stringify(artifacts,null,2));
