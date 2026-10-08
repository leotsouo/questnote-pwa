import {prepareReleaseArtifact} from './releaseArtifact.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const report=path.resolve('reports/chaos-demon-court'),output=path.resolve('..','release-artifacts-20261008');
const artifacts={};
for(const [profile,scopePath] of [['preview','/questnote-pwa-preview/'],['production','/questnote-pwa/']]){
 const r=await prepareReleaseArtifact({projectRoot:process.cwd(),outputRoot:output,profile,scopePath,candidateDir:path.resolve('content/pet-series/darkcrown_court_release/staging/303bcc646872e6eabeda7891637754069d1a7c553557f03e69ae70295246c543')});
 const bytes=await fs.readFile(r.manifestPath),m=JSON.parse(bytes);artifacts[profile]={artifactId:r.artifactId,artifactDir:r.artifactDir,manifestSha256:createHash('sha256').update(bytes).digest('hex'),scopePath,sourceCommit:m.sourceCommit};
}
try{const old=JSON.parse(await fs.readFile(path.join(report,'artifacts.json')));await fs.writeFile(path.join(report,'artifacts-superseded-'+old.preview.artifactId.slice(0,12)+'.json'),JSON.stringify(old,null,2)+'\n');}catch(e){if(e.code!=='ENOENT')throw e;}
await fs.writeFile(path.join(report,'artifacts.json'),JSON.stringify(artifacts,null,2)+'\n');
console.log(JSON.stringify(artifacts));

