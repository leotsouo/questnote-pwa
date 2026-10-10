import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const source = path.resolve(root, '..');
const assets = path.join(root, 'assets');
await fs.mkdir(assets, { recursive: true });
for (const [name, original] of [['night', 'night-graywolf'], ['twilight', 'twilight-graywolf'], ['garden', 'garden-graywolf']]) {
  for (const width of name === 'garden' ? [720] : [720, 1179]) {
    await sharp(path.join(source, `assets/scenes/${original}.webp`)).resize({ width }).webp({ quality: 82 }).toFile(path.join(assets, `${name}-${width}.webp`));
  }
}
await fs.copyFile(path.join(source, 'assets/brand/questnote-icon-32.png'), path.join(assets, 'favicon.png'));
await fs.copyFile(path.join(source, 'assets/brand/questnote-icon-180.png'), path.join(assets, 'apple-touch-icon.png'));
const catalog = JSON.parse(await fs.readFile(path.join(source, 'data/pets.json'), 'utf8'));
for (const [id, name] of [['pet_n01', 'wolf'], ['pet_n03', 'owl']]) {
  const pet = catalog.pets.find(item => item.id === id);
  await fs.copyFile(path.join(source, pet.imageVariants.card), path.join(assets, `${name}-card.webp`));
}
await sharp(path.join(source, 'assets/expeditions/mist_forest.webp')).resize({ width: 800 }).webp({ quality: 82 }).toFile(path.join(assets, 'mist-forest.webp'));
for (const view of ['tasks', 'collection', 'gacha', 'expedition']) {
  const screenshot = path.join(source, 'reports/marketing/product-audit', `twilight-${view}.png`);
  await sharp(screenshot).webp({ quality: 85 }).toFile(path.join(assets, 'product', `${view}.webp`));
  const duplicate = path.join(assets, 'product', `${view}.png`);
  await fs.rm(duplicate, { force: true });
}
console.log('Prepared responsive original-character assets and actual runtime screenshots.');
