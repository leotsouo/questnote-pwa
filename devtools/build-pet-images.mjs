/** Generate checked, hash-named display images while keeping original PNGs. */
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, realpath, lstat } from 'node:fs/promises';
import { resolve, dirname, sep, relative as relativePath, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

export const PET_IMAGE_BUILD_VERSION = '2';
export const PET_IMAGE_OPTIONS = Object.freeze({ card: 384, stage: 960, quality: 82, effort: 5 });
const defaultRoot = resolve(import.meta.dirname, '..');

async function containedPath(root, relative) {
  const resolvedRoot = await realpath(root);
  const target = resolve(root, relative);
  if (!target.startsWith(resolve(root) + sep)) throw new Error('Image path escapes root');
  let component = resolve(root);
  for (const part of relativePath(resolve(root), target).split(sep)) {
    component = join(component, part);
    try { if ((await lstat(component)).isSymbolicLink()) throw new Error('Image paths cannot contain symlinks or junctions'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  let existing = target;
  while (true) {
    try {
      const actual = await realpath(existing);
      if (actual !== resolvedRoot && !actual.startsWith(resolvedRoot + sep)) throw new Error('Image symlink escapes root');
      return target;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      existing = dirname(existing);
    }
  }
}

export function getPetImageVariants(pet, originalBytes) {
  if (!/^pet_[a-z0-9]+$/i.test(pet.id) || pet.image !== 'assets/pets/' + pet.id + '.png') {
    throw new Error('Invalid source: ' + pet.id);
  }
  const hash = createHash('sha256').update(originalBytes).digest('hex').slice(0, 12);
  return {
    card: 'assets/pets/variants/' + pet.id + '-card-384-' + hash + '.webp',
    stage: 'assets/pets/variants/' + pet.id + '-stage-960-' + hash + '.webp',
  };
}

/** Decode actual pixels; a valid PNG header alone is insufficient. */
export async function inspectPetImage(bytes) {
  const metadata = await sharp(bytes).metadata();
  if (metadata.format !== 'png' || !metadata.width || metadata.width !== metadata.height) {
    throw new Error('Pet source must be a square PNG');
  }
  await sharp(bytes).raw().toBuffer();
  return { width: metadata.width, height: metadata.height, format: metadata.format };
}

/** Import-safe image builder. Passing catalog keeps source JSON untouched. */
export async function buildPetImages({ root = defaultRoot, catalogPath, catalog, mode = 'check' } = {}) {
  if (mode !== 'build' && mode !== 'check') throw new Error('Use build or check');
  const sourcePath = catalogPath ? resolve(catalogPath) : resolve(root, 'data/pets.json');
  if (!catalog && !sourcePath.startsWith(resolve(root) + sep)) throw new Error('Catalog path escapes root');
  const data = structuredClone(catalog || JSON.parse(await readFile(await containedPath(root, sourcePath), 'utf8')));
  if (!Array.isArray(data.pets)) throw new Error('Pet catalog must contain pets');
  let changed = false;
  for (const pet of data.pets) {
    if (!/^pet_[a-z0-9]+$/i.test(pet.id) || pet.image !== 'assets/pets/' + pet.id + '.png') throw new Error('Invalid source: ' + pet.id);
    const originalBytes = await readFile(await containedPath(root, pet.image));
    const variants = getPetImageVariants(pet, originalBytes);
    const original = await inspectPetImage(originalBytes);
    for (const [kind, size] of [['card', PET_IMAGE_OPTIONS.card], ['stage', PET_IMAGE_OPTIONS.stage]]) {
      const output = await containedPath(root, variants[kind]);
      if (mode === 'build') {
        await mkdir(dirname(output), { recursive: true });
        const encoded = await sharp(originalBytes).resize(size, size, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: PET_IMAGE_OPTIONS.quality, effort: PET_IMAGE_OPTIONS.effort }).toBuffer();
        // Node handles long Windows staging paths that libvips' toFile cannot open.
        await writeFile(output, encoded);
      } else {
        if (pet.imageVariants?.[kind] !== variants[kind]) throw new Error(pet.id + ': stale ' + kind + ' path');
        const bytes = await readFile(output);
        const metadata = await sharp(bytes).metadata();
        const expected = Math.min(size, original.width);
        if (metadata.width !== expected || metadata.height !== expected || metadata.format !== 'webp') {
          throw new Error(pet.id + ': wrong ' + kind + ' dimensions or format');
        }
      }
    }
    if (mode === 'build' && JSON.stringify(pet.imageVariants) !== JSON.stringify(variants)) {
      pet.imageVariants = variants;
      changed = true;
    }
  }
  if (mode === 'build' && changed && !catalog) await writeFile(sourcePath, JSON.stringify(data, null, 2) + '\n');
  return { catalog: data, changed, count: data.pets.length, mode };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!['build', 'check'].includes(process.argv[2])) throw new Error('Use build or check');
  const result = await buildPetImages({ mode: process.argv[2] });
  console.log(result.mode + ': ' + result.count + ' pets × 2 sizes verified' + (result.changed ? ' and catalog updated' : ''));
}
