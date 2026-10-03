import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const report = path.resolve(import.meta.dirname,'../reports/summon-production-v3520');
const expected = JSON.parse(await fs.readFile(path.join(report,'artifacts.json'))).production;
const root = 'https://leotsouo.github.io/questnote-pwa/';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const get = async (name) => {
  const response = await fetch(root+name+'?release-check='+expected.artifactId);
  assert.equal(response.status,200,'Formal HTTP '+name);
  return Buffer.from(await response.arrayBuffer());
};
const manifestBytes = await get('release-artifact.json');
assert.equal(hash(manifestBytes),expected.manifestSha256,'Formal manifest not yet the pinned release');
const manifest = JSON.parse(manifestBytes);
assert.equal(manifest.artifactId,expected.artifactId);
// .nojekyll is hosting configuration, already verified as a Git blob.
const entries = Object.entries(manifest.files).filter(([name]) => name !== '.nojekyll');
let index = 0;
let checked = 0;
await Promise.all(Array.from({length:8},async()=>{
  while(index < entries.length) {
    const [name,entry] = entries[index++];
    const bytes = await get(name);
    assert.equal(bytes.length,entry.bytes,'Formal byte count '+name);
    assert.equal(hash(bytes),entry.sha256,'Formal hash '+name);
    checked++;
    if(checked%100===0) console.log('Verified '+checked+' formal files');
  }
}));
const result = {ok:true,checkedAt:new Date().toISOString(),url:root,artifactId:expected.artifactId,sourceCommit:manifest.sourceCommit,manifestSha256:expected.manifestSha256,checkedHttpsFiles:checked+1,gitOnlyFiles:['.nojekyll']};
await fs.writeFile(path.join(report,'live-verification.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
