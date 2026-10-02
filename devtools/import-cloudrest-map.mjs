import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
const root = path.resolve(import.meta.dirname, '..');
const input = process.argv[2];
if (!input) throw Error('Pass the generated map PNG');
const bytes = await fs.readFile(input);
const sha256 = createHash('sha256').update(bytes).digest('hex');
const original = `content/awakening/swordwild-shanhe/cloudrest-map-${sha256.slice(0, 12)}.png`;
await fs.mkdir(path.dirname(path.join(root, original)), { recursive: true });
await fs.writeFile(path.join(root, original), bytes);
const output = 'assets/expeditions/cloudrest_trail.webp';
await sharp(bytes).resize(960, 540, { fit: 'cover', position: 'centre' }).webp({ quality: 86 }).toFile(path.join(root, output));
await fs.writeFile(path.join(root, 'content/awakening/swordwild-shanhe/map-art.json'), JSON.stringify({
  generator: 'imagegen', generatedAfterFunctionalAcceptance: 'reports/awakening-implementation/browser-acceptance.json',
  direction: '與迷霧森林、豐穗遠郊一致的細緻場景插畫：前景竹林石徑、中景暖燈山亭與棧橋、遠景霧中群山。',
  references: ['assets/expeditions/mist_forest.webp', 'assets/expeditions/harvest_fields.webp'],
  original, originalSha256: sha256, output, outputSha256: createHash('sha256').update(await fs.readFile(path.join(root, output))).digest('hex'),
  width: 960, height: 540, preservedAsset: 'assets/expeditions/cloudrest_trail.svg', humanApproval: 'pending-whole-package-review',
}, null, 2) + '\n');
console.log(JSON.stringify({ original, output, sha256 }));
