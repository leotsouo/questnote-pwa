/** Build derivatives of the exact human-approved originals; retain existing entries. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { validateAwakeningCatalog } from '../src/petAwakeningCatalog.js';

const root = path.resolve(import.meta.dirname, '..');
const dir = path.join(root, 'content/pet-series/aurora_fairy_feast');
const read = async file => JSON.parse(await fs.readFile(path.join(dir, file), 'utf8'));
const review = await read('art-review-set.json');
const direction = await read('art-direction.json');
const catalogPath = path.join(root, 'data/pet-awakening.json');
const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8'));
const rows = direction.rows.filter(pet => pet.awakening);
const precacheOnly = process.argv.includes('--precache-only');
if (!precacheOnly && rows.some(row => catalog.pets.some(pet => pet.petId === row.petId))) throw Error('Fairy awakening entries already exist');
const motifs = { pet_ssr41: 'petal', pet_ssr42: 'mist', pet_ur31: 'dew', pet_ur32: 'hearth' };
for (const row of precacheOnly ? [] : rows) {
  const images = {};
  for (const form of ['initial', 'awakened']) {
    const file = review.files.find(file => file.petId === row.petId && file.form === form);
    const bytes = await fs.readFile(path.join(dir, file.file));
    const hash = createHash('sha256').update(bytes).digest('hex');
    if (hash !== file.sha256) throw Error('Approved artwork changed');
    const prefix = `assets/pets/awakening/${row.petId}-${form}-${hash.slice(0, 12)}`;
    const paths = { original: prefix + '.png', card: prefix + '-card.webp', stage: prefix + '-stage.webp' };
    await fs.mkdir(path.join(root, 'assets/pets/awakening'), { recursive: true });
    await fs.writeFile(path.join(root, paths.original), bytes, { flag: 'wx' });
    for (const [kind, size] of [['card', 384], ['stage', 960]]) {
      const derivative = await sharp(bytes).resize(size, size, { fit: 'cover' }).webp({ quality: 82, effort: 5 }).toBuffer();
      await sharp(derivative, { failOn: 'warning' }).raw().toBuffer();
      await fs.writeFile(path.join(root, paths[kind]), derivative, { flag: 'wx' });
    }
    images[`${form}Sha256`] = hash;
    images[`${form}Image`] = paths;
  }
  catalog.pets.push({ petId: row.petId, name: row.name, rarity: row.petId.startsWith('pet_ur') ? 'UR' : 'SSR',
    trialTitle: '把晨昏香氣帶回同一席', tokenName: row.palette === 'light' ? '晨露共席信物' : '暮香共席信物',
    title: row.awakeningTitle, visual: 'fairy_' + motifs[row.petId], signature: row.design.signature,
    invitation: `${row.name}邀你沿霓霞膳庭同行。接受試煉後完成三次新的日常，並完成一次新的膳庭派遣及領取；以霓霞花露塔和共席信物，迎接仙女形態。`,
    story: [`${row.name}${row.design.action}。${row.design.consequence}。牠曾想獨自留住最美的滋味，卻發現香氣只有在分享時才會長久。`,
      `你和牠記下三次日常與一次膳庭同行。花露塔映起晨昏光影，${row.design.signature}化入仙女的衣飾；${row.awakeningTitle}為晚歸的你留下一席，仍願意用熟悉的靈獸模樣陪你走路。`],
    dialogue: ['你的那一席，我一直留著。', '晨露與暮香，都能成為我們共席的溫暖。', '做完今天這一步，再一起嚐一口吧。'], ...images });
}
const errors = validateAwakeningCatalog(catalog);
if (errors.length) throw Error(errors.join('; '));
await fs.writeFile(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
const resources = catalog.pets.filter(pet => rows.some(row => row.petId === pet.petId))
  .flatMap(pet => [...Object.values(pet.initialImage), ...Object.values(pet.awakenedImage)]);
// Pet portraits retain the shared on-demand PET_IMAGE_CACHE; the assembler pins all bytes.
console.log(JSON.stringify({ awakeningEntries: rows.length, resources: resources.length, retainedOlderEntries: catalog.pets.length - rows.length }));
