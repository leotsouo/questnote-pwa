/** Prepare a verified fast-forward deployment commit from accepted immutable bytes. Never pushes. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {checkPoolReleaseReview} from '../scripts/poolReleaseReview.mjs';
const output=path.resolve(process.argv[2]);await fs.mkdir(output,{recursive:true});
const e=JSON.parse(await fs.readFile('reports/fairy-feast-acceptance/release-review-v5-authorized.json'));const d=await checkPoolReleaseReview(e);assert.equal(d.releaseReady,true);
const pins=e.artifacts.production;const manifestBytes=await fs.readFile(path.join(pins.artifactDir,'release-artifact.json'));const m=JSON.parse(manifestBytes);
const sha=b=>createHash('sha256').update(b).digest('hex');const git=(args,options={})=>execFileSync('git',args,{maxBuffer:512*1024*1024,...options});
const parent=git(['rev-parse','origin/gh-pages']).toString().trim();assert.equal(parent,JSON.parse(await fs.readFile('reports/fairy-feast-acceptance/baseline-v5.json')).originPages,'Formal baseline moved');
const names=Object.keys(m.files).concat('release-artifact.json').sort();const entries=[];
for(const name of names){const bytes=await fs.readFile(path.join(pins.artifactDir,name));const ref=name==='release-artifact.json'?{sha256:pins.manifestSha256,bytes:manifestBytes.length}:m.files[name];assert.equal(bytes.length,ref.bytes);assert.equal(sha(bytes),ref.sha256);const oid=git(['hash-object','-w','--stdin'],{input:bytes}).toString().trim();entries.push('100644 '+oid+'\t'+name);}
const env={...process.env,GIT_INDEX_FILE:path.join(output,'deployment.index')};git(['read-tree','--empty'],{env});git(['update-index','--index-info'],{env,input:entries.join('\n')+'\n'});const tree=git(['write-tree'],{env}).toString().trim();
const commit=git(['commit-tree',tree,'-p',parent],{input:'V3.9.5: publish approved fairy feast immutable artifact '+pins.artifactId+'\n'}).toString().trim();
assert.deepEqual(git(['ls-tree','-r','--name-only','-z',commit]).toString().split('\0').filter(Boolean).sort(),names);
for(let offset=0;offset<names.length;offset+=32){const group=names.slice(offset,offset+32);const batch=git(['cat-file','--batch'],{input:group.map(n=>commit+':'+n+'\n').join('')});let cursor=0;
for(const name of group){const newline=batch.indexOf(10,cursor);const [,type,len]=batch.subarray(cursor,newline).toString().split(' ');assert.equal(type,'blob');cursor=newline+1;const bytes=batch.subarray(cursor,cursor+Number(len));assert.equal(sha(bytes),name==='release-artifact.json'?pins.manifestSha256:m.files[name].sha256);cursor+=Number(len)+1;}assert.equal(cursor,batch.length);}
const result={status:'passed',verifiedAt:new Date().toISOString(),packageHash:d.packageHash,artifactId:pins.artifactId,manifestSha256:pins.manifestSha256,sourceCommit:m.sourceCommit,parent,tree,deploymentCommit:commit,verifiedFiles:names.length,method:'Raw hash-object stdin; isolated Git index; every committed blob SHA-256 verified; no checkout EOL filters; no push'};
await fs.writeFile(path.join(output,'deployment-tree.json'),JSON.stringify(result,null,2)+'\n');console.log(result);
