import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { prepareReleaseArtifact } from '../scripts/releaseArtifact.mjs';
import { verifyReleaseArtifact } from '../scripts/verify-release-artifact.mjs';
import { APP_VERSION } from '../src/version.js';
const projectRoot = path.resolve(import.meta.dirname, '..');
const versionTag = 'v' + APP_VERSION.replaceAll('.', '');
const report = path.join(projectRoot, 'reports/summon-production-' + versionTag);
await fs.mkdir(report, { recursive: true });
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sourceCommit = execFileSync('git',['rev-parse','HEAD'],{cwd:projectRoot,encoding:'utf8'}).trim();
const root = 'https://leotsouo.github.io/questnote-pwa/';
const get = async (file) => {
  const response = await fetch(root + file + '?' + versionTag + '-baseline=' + Date.now());
  if (!response.ok) throw new Error('Formal baseline HTTP ' + response.status);
  return Buffer.from(await response.arrayBuffer());
};
const bytes = await get('release-artifact.json');
const baseline = JSON.parse(bytes);
assert.equal(baseline.artifactId, '5149724a0426c8dff872572adbcd5fbbbcd5f9fd54f675a2d2733fe200986c51');
const catalogBytes = await get(baseline.profile.contentBundleUrl);
assert.equal(hash(catalogBytes), baseline.profile.contentBundleSha256);
const catalog = JSON.parse(catalogBytes);
for (const [key,file] of [['petsData','pets'],['loreData','pets-lore'],['seriesCatalog','pet-series']]) {
  assert.deepEqual(catalog[key], JSON.parse(await fs.readFile(path.join(projectRoot,'data',file+'.json'))), 'Existing content must remain unchanged: '+file);
}
const pools = JSON.parse(await fs.readFile(path.join(projectRoot,'data/pools.json')));
const withoutTenGuarantee = (value) => ({ ...value, pools:value.pools.map(({ tenPullGuarantee, ...row }) => row) });
assert.deepEqual(withoutTenGuarantee(catalog.poolsData), withoutTenGuarantee(pools), 'Only the approved ten-pull SR floor may change');
assert(pools.pools.every((pool) => pool.tenPullGuarantee === 'SR'), 'Every pool must use the approved SR floor');
const mailbox = await get('data/global-mailbox.json');
assert.deepEqual(JSON.parse(mailbox),JSON.parse(await fs.readFile(path.join(projectRoot,'data/global-mailbox.json'))),'Public mailbox rewards must remain unchanged');
await fs.writeFile(path.join(report,'baseline.json'), JSON.stringify({at:new Date().toISOString(),artifactId:baseline.artifactId,sourceCommit:baseline.sourceCommit,manifestSha256:hash(bytes),contentBundleSha256:hash(catalogBytes),mailboxSha256:hash(mailbox)},null,2)+'\n');
const artifacts = {};
for (const [profile,scopePath] of [['preview',`/questnote-pwa-preview/${versionTag}-review-${sourceCommit.slice(0,8)}/`],['production','/questnote-pwa/']]) {
  const result = await prepareReleaseArtifact({projectRoot,outputRoot:path.join(process.env.TEMP,'questnote-summon-releases'),profile,scopePath});
  artifacts[profile] = {artifactDir:result.artifactDir,artifactId:result.artifactId,manifestSha256:hash(await fs.readFile(result.manifestPath)),scopePath};
  await verifyReleaseArtifact({...artifacts[profile],profile});
}
await fs.writeFile(path.join(report,'artifacts.json'),JSON.stringify(artifacts,null,2)+'\n');
console.log(JSON.stringify(artifacts,null,2));
