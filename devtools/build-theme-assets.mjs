/** Technical resizing/encoding only. Illustration and brand originals are generated assets. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let sharp;
try { sharp = require('sharp'); } catch { sharp = require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp'); }
const root = fileURLToPath(new URL('..', import.meta.url));
// Optional imagegen output directory. Without it, rebuild from committed masters.
const generated = process.argv[2] ? path.resolve(process.argv[2]) : null;
const heroes = {
  night: 'exec-931a7803-4735-4549-8d7a-9790cadd64b9.png',
  garden: 'exec-9e6d8d23-849b-4fa5-9ace-87c4b2d81449.png',
  twilight: 'exec-6cdc19a9-a09a-4a45-8c81-de0dc106446c.png',
};
await fs.mkdir(path.join(root, 'assets/brand'), { recursive: true });
await fs.mkdir(path.join(root, 'assets/scenes'), { recursive: true });
await fs.mkdir(path.join(root, 'reports/theme-round-two/masters'), { recursive: true });
for (const [name, file] of Object.entries(heroes)) {
  const original = path.join(root, `reports/theme-round-two/masters/${name}-hero.png`);
  if (generated) await fs.copyFile(path.join(generated, file), original);
  await sharp(original).resize({ width: 1179, withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(root, `assets/scenes/${name}-graywolf.webp`));
}
if (generated) await fs.copyFile(path.join(generated, 'exec-1bf144b9-c88a-4f95-9bd2-569041b86ca5.png'), path.join(root, 'reports/theme-round-two/icon-concepts.png'));
const master = path.join(root, 'assets/brand/questnote-icon-master-1024.png');
if (generated) await sharp(path.join(generated, 'exec-193fcd70-1cdb-48f1-b713-b09002e132ea.png')).resize(1024, 1024).png().toFile(master);
for (const size of [32, 180, 192, 512]) await sharp(master).resize(size, size).png().toFile(path.join(root, `assets/brand/questnote-icon-${size}.png`));
await sharp(master).resize(384, 384).extend({ top: 64, bottom: 64, left: 64, right: 64, background: '#101e31' }).png().toFile(path.join(root, 'assets/brand/questnote-icon-maskable-512.png'));
console.log('Encoded 3 home scenes, 1024 master, 4 app-icon sizes and a maskable icon; original assets preserved.');
