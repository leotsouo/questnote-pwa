import fs from 'node:fs/promises';import path from 'node:path';import {spawnSync} from 'node:child_process';
const output=path.resolve(process.argv[2]);await fs.mkdir(output,{recursive:true});
const r=spawnSync(process.execPath,['devtools/darkcrown-update-offline-test.mjs'],{encoding:'utf8',maxBuffer:16*1024*1024});
await fs.writeFile(path.join(output,'update-offline.log'),r.stdout+r.stderr);console.log(r.stdout+r.stderr);process.exitCode=r.status;

