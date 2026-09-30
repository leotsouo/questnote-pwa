import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { inspectPetImage } from '../../devtools/build-pet-images.mjs';
import { workspace } from './author-content.mjs';

const specs = JSON.parse(await fs.readFile(path.join(import.meta.dirname, 'image-revisions.json')));
const promptsPath = path.join(workspace, 'prompts.json');
const prompts = JSON.parse(await fs.readFile(promptsPath));
const logPath = path.join(workspace, 'generation-log.json');
const log = JSON.parse(await fs.readFile(logPath));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
await fs.mkdir(path.join(workspace, 'images/revisions'), { recursive: true });
for (const spec of specs) {
  const bytes = await fs.readFile(spec.outputPath);
  const metadata = await inspectPetImage(bytes);
  if (metadata.width < 512 || bytes.length > 5 * 1024 * 1024) throw new Error('Invalid revision image');
  const target = path.join(workspace, 'images', spec.petId + '.png');
  const oldBytes = await fs.readFile(target);
  const previousHash = sha(oldBytes), selectedHash = sha(bytes);
  if (previousHash !== selectedHash) {
    const referenceBytes = await fs.readFile(spec.referencePath);
    if (sha(referenceBytes) !== previousHash) throw new Error('Revision reference is not the current original');
    const archivedRelative = `images/revisions/${spec.petId}-v1-${previousHash.slice(0, 12)}.png`;
    const archived = path.join(workspace, archivedRelative);
    try { await fs.writeFile(archived, oldBytes, { flag: 'wx' }); }
    catch (error) { if (error.code !== 'EEXIST' || sha(await fs.readFile(archived)) !== previousHash) throw error; }
    for (const call of log.calls) if (call.petId === spec.petId && call.sha256 === previousHash) {
      call.savedAs = archivedRelative; call.selection = 'SUPERSEDED_AFTER_AGENT_VISUAL_QA';
    }
    await fs.copyFile(spec.outputPath, target);
    log.calls.push({ petId: spec.petId, revision: 2, operation: 'edit', startedAt: spec.startedAt, completedAt: spec.completedAt,
      sourcePath: spec.outputPath, savedAs: `images/${spec.petId}.png`, sha256: selectedHash,
      bytes: bytes.length, width: metadata.width, height: metadata.height, selection: 'CURRENT_PENDING_HUMAN_APPROVAL',
      referenceImages: [{ path: spec.referencePath, sha256: previousHash, preservedAs: archivedRelative }],
      exactPrompt: spec.prompt, promptAssembly: 'prompt verbatim; no separate negativePrompt field sent to tool',
      transparentBackgroundRequested: false, reason: spec.reason,
    });
    prompts.prompts[spec.petId].prompt = spec.prompt;
    prompts.prompts[spec.petId].provenance = `Built-in image_gen.imagegen edit revision 2. Reference: ${archivedRelative}, SHA-256 ${previousHash}. Prompt supplied verbatim. Prior original prompt is preserved in native approval snapshot. Actual output and timestamps in generation-log.json. Model and seed not exposed. ${spec.reason}`;
  }
  console.log(JSON.stringify({ petId: spec.petId, selectedHash, revision: 2 }));
}
for (const call of log.calls) {
  if (!call.referenceImages) call.referenceImages = [];
  if (!call.selection) call.selection = 'CURRENT_PENDING_HUMAN_APPROVAL';
}
delete log.referenceImages;
await fs.writeFile(logPath, JSON.stringify(log, null, 2) + '\n');
await fs.writeFile(promptsPath, JSON.stringify(prompts, null, 2) + '\n');
