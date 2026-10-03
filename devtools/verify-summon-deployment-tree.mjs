// Read-only: compare every staged/committed Pages blob with the pinned artifact.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { APP_VERSION } from '../src/version.js';
const report = path.resolve(import.meta.dirname,'../reports/summon-production-v' + APP_VERSION.replaceAll('.', ''));
const expected = JSON.parse(fs.readFileSync(path.join(report,'artifacts.json'))).production;
const manifestBytes = fs.readFileSync(path.join(expected.artifactDir,'release-artifact.json'));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(manifestBytes),expected.manifestSha256);
const manifest = JSON.parse(manifestBytes);
assert.equal(manifest.artifactId,expected.artifactId);
const deploymentRoot = path.resolve(process.argv[2]);
const revision = process.argv[3] || 'index';
assert(revision === 'index' || revision === 'HEAD');
const git = (args,options={}) => execFileSync('git',args,{cwd:deploymentRoot,maxBuffer:512*1024*1024,...options});
const names = Object.keys(manifest.files).concat('release-artifact.json').sort();
const actual = git(revision === 'index' ? ['ls-files','-z'] : ['ls-tree','-r','--name-only','-z','HEAD']).toString().split('\0').filter(Boolean).sort();
assert.deepEqual(actual,names,'Deployment has missing or unapproved files');
const blobs = git(['cat-file','--batch'],{input:names.map((name)=>(revision==='index'?':':'HEAD:')+name+'\n').join('')});
let cursor = 0;
for (const name of names) {
  const newline = blobs.indexOf(10,cursor);
  const [objectId,type,length] = blobs.subarray(cursor,newline).toString().split(' ');
  assert.equal(type,'blob','Missing blob '+name);
  cursor = newline + 1;
  const bytes = blobs.subarray(cursor,cursor+Number(length));
  const reference = name === 'release-artifact.json' ? {sha256:expected.manifestSha256,bytes:manifestBytes.length} : manifest.files[name];
  assert.equal(bytes.length,reference.bytes,'Git blob byte count '+name);
  assert.equal(hash(bytes),reference.sha256,'Git blob hash '+name);
  cursor += Number(length)+1;
}
assert.equal(cursor,blobs.length);
console.log(JSON.stringify({ok:true,artifactId:expected.artifactId,revision,fileCount:names.length,tree:git(revision==='index'?['write-tree']:['rev-parse','HEAD^{tree}']).toString().trim()},null,2));
