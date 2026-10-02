/** Preserve a generated original; create deterministic display derivatives and provenance. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
const root = path.resolve(import.meta.dirname, '..');
const [petId, input, direction = '古老巨蛤低角度坐鎮；厚重四肢、金色眼睛與天然朱金脈紋；朱息退開腐霧，留出石徑。禁止龜殼與蛇身。', reference = 'assets/pets/pet_ur17.png'] = process.argv.slice(2);
if (petId !== 'pet_ur17' || !input) throw Error('Usage: node devtools/import-awakening-art.mjs pet_ur17 <generated.png>');
const bytes = await fs.readFile(input);
const sha256 = createHash('sha256').update(bytes).digest('hex');
const stem = `${petId}-awakened-${sha256.slice(0, 12)}`;
const out = path.join(root, 'assets/pets/awakening');
await fs.mkdir(out, { recursive: true });
await fs.writeFile(path.join(out, `${stem}.png`), bytes);
for (const [name, width] of [['card', 384], ['stage', 960]]) {
  await sharp(bytes).resize({ width, height: width, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(out, `${stem}-${name}.webp`));
}
const authoring = path.join(root, 'content/awakening/swordwild-shanhe');
await fs.mkdir(authoring, { recursive: true });
const existing = JSON.parse(await fs.readFile(path.join(authoring, 'awakened-art.json'), 'utf8').catch((error) => { if (error.code === 'ENOENT') return '{"pets":[]}'; throw error; }));
if (existing.pets.length) await fs.appendFile(path.join(authoring, 'art-history.jsonl'), JSON.stringify({ archivedAt: new Date().toISOString(), ...existing }) + '\n');
await fs.writeFile(path.join(authoring, 'awakened-art.json'), JSON.stringify({
  schemaVersion: 1, pets: [{ petId, awakenedSha256: sha256,
    awakenedImage: { original: `assets/pets/awakening/${stem}.png`, card: `assets/pets/awakening/${stem}-card.webp`, stage: `assets/pets/awakening/${stem}-stage.webp` },
    provenance: { generator: 'imagegen', generatedAt: new Date().toISOString(),
      reference,
      direction,
      humanApproval: 'pending-new-awakening-use', productionPortraitRetained: true } }],
}, null, 2) + '\n');
console.log(JSON.stringify({ petId, sha256, original: path.join(out, `${stem}.png`) }));
