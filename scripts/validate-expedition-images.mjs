#!/usr/bin/env node
/** Shared region art gate: CLI checks source; assembler checks effective catalogs. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

export async function validateExpeditionImages({ catalog, readBytes }) {
  if (!Array.isArray(catalog?.areas) || !catalog.areas.length) throw new Error('Missing expedition areas');
  const results = [];
  const seen = new Set();
  for (const area of catalog.areas) {
    if (!/^[a-z][a-z0-9_]*$/.test(area.id || '') || seen.has(area.id)) throw new Error('Invalid/duplicate expedition ID');
    seen.add(area.id);
    const file = `assets/expeditions/${area.id}.webp`;
    const bytes = await readBytes(file);
    if (!bytes?.length) throw new Error(`Missing expedition artwork: ${file}`);
    try {
      const image = sharp(bytes, { failOn: 'warning' });
      const metadata = await image.metadata();
      if (metadata.format !== 'webp' || metadata.width < 960 || metadata.height < 540
        || Math.abs(metadata.width / metadata.height - 16 / 9) > 0.02 || (metadata.pages || 1) !== 1) {
        throw new Error('Requires a static landscape WebP, at least 960 × 540, 16:9');
      }
      // Metadata alone does not detect a truncated pixel stream.
      await image.raw().toBuffer();
      results.push({ areaId: area.id, file, width: metadata.width, height: metadata.height, bytes: bytes.length });
    } catch (error) {
      throw new Error(`Invalid expedition artwork ${file}: ${error.message}`);
    }
  }
  return results;
}

export async function checkSourceExpeditionImages(projectRoot) {
  const root = await fs.realpath(projectRoot);
  const catalog = JSON.parse(await fs.readFile(path.join(root, 'data/expeditions.json')));
  const results = await validateExpeditionImages({ catalog, readBytes: async (file) => {
    const target = path.join(root, file);
    const resolved = await fs.realpath(target);
    if (resolved !== target) throw new Error(`Linked expedition artwork is not allowed: ${file}`);
    return fs.readFile(target);
  } });
  const worker = await fs.readFile(path.join(root, 'service-worker.js'), 'utf8');
  for (const { file } of results) {
    if (!worker.includes(`'${file}'`) && !worker.includes(`'./${file}'`)) throw new Error(`Expedition artwork missing from source precache: ${file}`);
  }
  return results;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const results = await checkSourceExpeditionImages(path.resolve(process.argv[2] || '.'));
    console.log(JSON.stringify({ ok: true, regions: results.length, results }, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
