import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { workspace } from './author-content.mjs';
import { inspectPetImage } from '../../devtools/build-pet-images.mjs';

const [id, sourcePath, startedAt, completedAt] = process.argv.slice(2);
if (!/^pet_(n|r|sr|ssr|ur)\d+$/.test(id)) throw new Error('Invalid pet ID');
if (!sourcePath?.endsWith('.png')) throw new Error('Expected native output PNG');
const plan = JSON.parse(await fs.readFile(path.join(workspace, 'plan.json')));
const pet = plan.pets.find((p) => p.petId === id);
if (!pet) throw new Error('Unallocated pet');
const bytes = await fs.readFile(sourcePath);
const hash = createHash('sha256').update(bytes).digest('hex');
const metadata = await inspectPetImage(bytes);
if (metadata.width < 512 || metadata.width !== metadata.height || bytes.length > 5 * 1024 * 1024) throw new Error('Image violates native constraints');
await fs.mkdir(path.join(workspace, 'images'), { recursive: true });
const target = path.join(workspace, 'images', `${id}.png`);
try {
  const existing = await fs.readFile(target);
  if (createHash('sha256').update(existing).digest('hex') !== hash) throw new Error('Existing image differs; preserve a revision before replacing');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  await fs.copyFile(sourcePath, target, fs.constants.COPYFILE_EXCL);
}
const logPath = path.join(workspace, 'generation-log.json');
let log;
try { log = JSON.parse(await fs.readFile(logPath)); }
catch (error) { if (error.code !== 'ENOENT') throw error; log = { schemaVersion: 1, tool: 'built-in image_gen.imagegen', model: null, seed: null, referenceImages: [], calls: [] }; }
if (!log.calls.some((c) => c.petId === id && c.sha256 === hash)) log.calls.push({
  petId: id, name: pet.name, startedAt, completedAt, sourcePath, savedAs: `images/${id}.png`,
  sha256: hash, bytes: bytes.length, width: metadata.width, height: metadata.height,
  transparentBackgroundRequested: false, promptSource: `prompts.json#prompts.${id}`, promptAssembly: 'prompt + two newlines + AVOID: + negativePrompt',
});
await fs.writeFile(logPath, JSON.stringify(log, null, 2) + '\n');
console.log(JSON.stringify({ id, name: pet.name, target, sha256: hash, bytes: bytes.length, width: metadata.width, height: metadata.height }));
