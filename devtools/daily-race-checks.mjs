/** Producer entry point: retain complete diagnostics in an explicit ignored directory. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
const [mode = 'suite', output] = process.argv.slice(2);
if (!output) throw new Error('Provide an output directory');
await fs.mkdir(output, { recursive: true });
const command = mode === 'browser' ? process.execPath : process.platform === 'win32' ? 'cmd.exe' : 'npm';
const args = mode === 'browser' ? ['devtools/daily-race-browser-test.mjs', output]
  : process.platform === 'win32' ? ['/d', '/c', 'npm.cmd test'] : ['test'];
const child = spawn(command, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
child.stdout.on('data', data => { log += data; });
child.stderr.on('data', data => { log += data; });
const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
await fs.writeFile(path.join(output, `${mode}.log`), log);
console.log(log.slice(-6000));
console.log(`Full log: ${path.resolve(output, `${mode}.log`)}`);
process.exitCode = code || 0;
