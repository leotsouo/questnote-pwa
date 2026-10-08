import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const output=path.resolve(process.argv[2]);await fs.mkdir(output,{recursive:true});
const previous=path.join(output,'formal-v389');await fs.mkdir(previous);const tar=path.join(output,'formal-v389.tar');
execFileSync('git',['archive','--format=tar','--output='+tar,'ce35b1f859b2b9ed5de5bd05c01b06651499c7ab']);
execFileSync('tar',['-xf',tar,'-C',previous]);
const manifest=JSON.parse(await fs.readFile(path.join(previous,'release-artifact.json')));
if(manifest.artifactId!=='77a4435d96191ec2fdd61197dbb98319e6f8ec00d7c1983793a125debf9e4d54')throw Error('Formal archive identity');
await fs.writeFile('reports/chaos-demon-court/formal-baseline.json',JSON.stringify({artifactDir:previous,artifactId:manifest.artifactId,deployedCommit:'ce35b1f859b2b9ed5de5bd05c01b06651499c7ab'},null,2)+'\n');
console.log('Verified formal baseline archive ready');
const log=execFileSync(process.execPath,['devtools/darkcrown-update-offline-test.mjs'],{encoding:'utf8',maxBuffer:16*1024*1024});await fs.writeFile(path.join(output,'update-offline.log'),log);console.log(log);

