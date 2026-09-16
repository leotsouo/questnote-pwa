/** Generate checked, hash-named display images while keeping original PNGs. */
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const catalogPath = resolve(root, 'data/pets.json');
const mode = process.argv[2];
if (mode !== 'build' && mode !== 'check') throw new Error('Use build or check');
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
let changed = false;

for (const pet of catalog.pets) {
  if (!/^assets\/pets\/[a-z0-9_]+\.png$/i.test(pet.image)) throw new Error(`Invalid source: ${pet.id}`);
  const originalPath = resolve(root, pet.image);
  const originalBytes = await readFile(originalPath);
  const hash = createHash('sha256').update(originalBytes).digest('hex').slice(0, 12);
  const variants = {
    card: `assets/pets/variants/${pet.id}-card-384-${hash}.webp`,
    stage: `assets/pets/variants/${pet.id}-stage-960-${hash}.webp`,
  };
  for (const [kind, size] of [['card', 384], ['stage', 960]]) {
    const output = resolve(root, variants[kind]);
    if (mode === 'build') {
      await mkdir(dirname(output), { recursive: true });
      // Build directly from original bytes; deterministic options and content hash.
      await sharp(originalBytes).resize(size, size, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82, effort: 5 }).toFile(output);
    } else {
      if (pet.imageVariants?.[kind] !== variants[kind]) throw new Error(`${pet.id}: stale ${kind} path`);
      await stat(output);
      const metadata = await sharp(output).metadata();
      if (metadata.width !== size || metadata.height !== size || metadata.format !== 'webp') {
        throw new Error(`${pet.id}: wrong ${kind} dimensions or format`);
      }
    }
  }
  if (mode === 'build' && JSON.stringify(pet.imageVariants) !== JSON.stringify(variants)) {
    pet.imageVariants = variants;
    changed = true;
  }
}
if (mode === 'build' && changed) await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`${mode}: ${catalog.pets.length} pets × 2 sizes verified${changed ? ' and catalog updated' : ''}`);
