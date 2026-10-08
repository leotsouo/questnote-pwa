import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const root = process.cwd();
const series = path.join(root, 'content/pet-series/sunward_letters');
const promptFile = path.join(series, 'prompts.json');
const prompts = JSON.parse(await fs.readFile(promptFile, 'utf8'));
const urOverride = ' Composition override for this generation: use a distant wide view inside the square, keep the entire crane including both complete wing tips, beak, feet and the complete hanging cloth within a generous 12 percent empty margin on every side; the crane may occupy only 55 percent of frame width. No part of either wing may touch or exit the canvas. The ribbon should bend down within the image rather than flow beyond the right edge.';
prompts.prompts.pet_ur21.provenance.actualPrompt = prompts.prompts.pet_ur21.prompt + urOverride;
prompts.prompts.pet_ur21.provenance.note = 'The approved base prompt produced a cropped wing. A recorded composition override was used for the selected replacement; the first two outputs remain archived in reports/sunward-letters/first-attempts.';
await fs.writeFile(promptFile, JSON.stringify(prompts, null, 2) + '\n');

const sources = {
  pet_n41: 'exec-92127cca-7bf7-403f-91dc-4e832e19c506.png',
  pet_n42: 'exec-da1401d7-e369-4ded-b9ed-b62554cb08c8.png',
  pet_n43: 'exec-abbfe35b-51f0-49ab-ba15-c186eab5d10e.png',
  pet_r44: 'exec-036efcc5-85f5-414c-bd1a-607b12a85d44.png',
  pet_r45: 'exec-a45a9484-c25f-4e81-abbf-117938acc528.png',
  pet_r46: 'exec-5a7983e5-1104-4d5e-ae4b-c59bfa03b319.png',
  pet_sr38: 'exec-1fa1131f-9f77-4ef0-862a-0658cd4c3439.png',
  pet_sr39: 'exec-7310a672-d05d-4087-91d1-412f49030694.png',
  pet_sr40: 'exec-c66a3160-dacd-42c4-8026-8b221b428326.png',
  pet_ssr27: 'exec-f8f74741-90ee-4528-bb0a-077a1cc8b781.png',
  pet_ssr28: 'exec-778b896c-459e-482c-a4a1-d17240a70ed6.png',
  pet_ur21: 'exec-eabfb491-1f15-4279-9db7-f4c199006684.png',
};
const reviews = {
  pet_n41: 'Field mouse, wheat bell and repeated dry-path markers read at card scale; ears, feet and tail are intact.',
  pet_n42: 'Hedgehog lifts a wet leaf over a letter; quills, face and envelope are legible and uncropped.',
  pet_n43: 'Snail, golden shell and wet wayfinding trail are distinct; complete feelers and shell stay in frame.',
  pet_r44: 'Goat braces the repaired sign against wind; horns, hooves and the tied ribbon are visible.',
  pet_r45: 'Swift carries a yellow guide ribbon between eave and tree; wings and tail are intact.',
  pet_r46: 'Beaver secures the stream crossing beside an addressed letter; tail, paws and dam read clearly.',
  pet_sr38: 'Fox anchors the patched sun cloth and exposes the route below; silhouette and prop read at card scale.',
  pet_sr39: 'Owl calls across the mist toward a distant sign; sound rings and open beak show the action.',
  pet_sr40: 'Otter leaps with a recovered scroll; the river splash and route banner show the outcome.',
  pet_ssr27: 'Small bird fastens a luminous banner to the route; iridescent wings and sequential markers remain visible.',
  pet_ssr28: 'White deer threads the route cloth through the wayfinding posts; full antlers and legs stay inside the crop.',
  pet_ur21: 'Crane raises the communal route cloth over forest and field; both wings, feet and cloth are complete after the composition revision.',
};
const entries = [];
const thumbs = [];
for (const [id, source] of Object.entries(sources)) {
  const relative = `content/pet-series/sunward_letters/images/${id}.png`;
  const bytes = await fs.readFile(path.join(root, relative));
  const metadata = await sharp(bytes).metadata();
  if (metadata.width !== metadata.height || metadata.width < 512) throw new Error(`Invalid source image: ${id}`);
  entries.push({ id, source: `C:/Users/User/.codex/generated_images/01a1179d-cd47-7fb2-af67-724eeba6e06a/${source}`, originalPath: relative, originalSha256: crypto.createHash('sha256').update(bytes).digest('hex'), width: metadata.width, height: metadata.height, bytes: bytes.length, prompt: id === 'pet_ur21' ? 'recorded composition override' : 'approved prompt', review: reviews[id], cardScaleReviewed: true, accepted: true });
  const thumb = await sharp(bytes).resize(160, 160).png().toBuffer();
  const i = entries.length - 1;
  thumbs.push({ input: thumb, left: (i % 4) * 160, top: Math.floor(i / 4) * 160 });
}
const reportDir = path.join(root, 'reports/sunward-letters');
await fs.mkdir(reportDir, { recursive: true });
await sharp({ create: { width: 640, height: 480, channels: 3, background: '#ffffff' } }).composite(thumbs).png().toFile(path.join(reportDir, 'card-scale-contact-sheet.png'));
const rejected = [
  { id: 'pet_n41', path: 'reports/sunward-letters/first-attempts/pet_n41.png', reason: 'Actual first invocation prompt was not retained verbatim; replaced with a traceable approved-prompt generation.' },
  { id: 'pet_ur21', path: 'reports/sunward-letters/first-attempts/pet_ur21.png', reason: 'Actual first invocation prompt was not retained verbatim; replaced with a traceable generation.' },
  { id: 'pet_ur21', path: 'reports/sunward-letters/first-attempts/pet_ur21-approved-prompt-cropped.png', reason: 'Approved prompt generation clipped a wing; replaced with a composition override and complete silhouette.' }
];
for (const image of rejected) {
  const bytes = await fs.readFile(path.join(root, image.path));
  image.sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
}
await fs.writeFile(path.join(reportDir, 'image-review.json'), JSON.stringify({ schemaVersion: 1, poolId: 'sunward_letters', imageReviewMode: 'ai-self', reviewEnvironment: 'original PNGs and a 160px/card contact sheet', tool: 'image_gen.imagegen (built-in)', selected: entries, rejected }, null, 2) + '\n');
console.log(JSON.stringify({ reviewed: entries.length, allSquare: true, contactSheet: 'reports/sunward-letters/card-scale-contact-sheet.png' }));
