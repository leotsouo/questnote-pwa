import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const output=path.resolve(process.argv[2]);fs.mkdirSync(output,{recursive:true});
let failed=false;const results=[];
for(const [name,args] of [['runtime',['run','test']],['pools',['run','pools:validate']],['images',['run','images:check']]]){
 const result=spawnSync('npm.cmd',args,{shell:true,encoding:'utf8',maxBuffer:32*1024*1024});
 fs.writeFileSync(path.join(output,name+'.log'),result.stdout+result.stderr);
 results.push({name,exitCode:result.status});failed ||= result.status!==0;console.log(name+': '+result.status);
}
fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({results,passed:!failed},null,2)+'\n');
process.exitCode=failed?1:0;

