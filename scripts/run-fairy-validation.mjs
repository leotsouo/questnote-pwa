import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const output = path.resolve(process.argv[2]);
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.mkdir(output, { recursive: false });
const commands = process.argv.length > 3 ? process.argv.slice(3) : ['test', 'pools:validate', 'images:check', 'test:pool:release'];
const results = [];
for (const name of commands) {
  const started = Date.now();
  const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', name],
    { shell: process.platform === 'win32', encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  await fs.writeFile(path.join(output, name.replaceAll(':', '-') + '.log'), (result.stdout || '') + (result.stderr || ''));
  results.push({ name, exitCode: result.status, milliseconds: Date.now() - started, error: result.error?.message });
  console.log(JSON.stringify(results.at(-1)));
}
await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(results, null, 2) + '\n');
if (results.some(result => result.exitCode !== 0)) process.exitCode = 1;
