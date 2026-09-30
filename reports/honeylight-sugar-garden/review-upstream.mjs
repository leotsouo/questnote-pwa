import fs from 'node:fs/promises';
import { loadPipelineStatus, approvePipelineStage } from '../../scripts/cardPoolPipeline.mjs';
import { authoringRoot, seriesId, workspace } from './author-content.mjs';

const read = async (file) => JSON.parse(await fs.readFile(`${workspace}/${file}`, 'utf8'));
const plan = await read('plan.json');
const pets = await read('pets.json');
const lore = await read('pets-lore.json');
const prompts = await read('prompts.json');
if (plan.pets.length !== 12 || plan.pets.filter((p) => p.rarity === 'SSR').length !== 2 || plan.pets.some((p) => p.phase !== 'base')) throw new Error('Product requirements violated');
if (!plan.pets.find((p) => p.petId === 'pet_ssr10').design.includes('糖果 SSR') || !plan.pets.find((p) => p.petId === 'pet_ssr11').design.includes('可愛')) throw new Error('SSR requirement violated');
if (pets.pets.length !== 12 || lore.lore.length !== 12 || Object.keys(prompts.prompts).length !== 12) throw new Error('Incomplete content');
const seen = new Set();
for (const l of lore.lore) {
  for (const key of ['normal', 'urgent', 'important', 'praise', 'idle', 'bondUp']) {
    for (const text of l.dialogues[key]) {
      if (seen.has(text)) throw new Error(`Repeated dialogue: ${text}`);
      seen.add(text);
    }
  }
}
// Only these four delegated stages; the human image gate cannot be approved here.
for (const stage of ['brief', 'plan', 'content', 'prompts']) {
  const current = await loadPipelineStatus(authoringRoot, seriesId);
  if (current.errors.length) throw new Error(JSON.stringify(current.errors));
  const output = current.stages.find((s) => s.stage === stage);
  console.log(JSON.stringify({ stage, reviewedFiles: output.files, exactCurrentHash: output.outputHash }));
  await approvePipelineStage(authoringRoot, seriesId, stage, output.outputHash, {
    reviewer: 'agent-under-user-delegation-2026-10-01', acknowledgeWarnings: true,
  });
}
const status = await loadPipelineStatus(authoringRoot, seriesId);
await fs.writeFile(`${workspace}/upstream-review.json`, JSON.stringify({
  reviewedAt: new Date().toISOString(), reviewer: 'agent-under-user-delegation-2026-10-01',
  delegation: 'User explicitly delegated all upstream decisions; requested 2 SSR, candy and dessert, plus especially cute swan.',
  reviewed: ['brief', 'plan', 'content', 'prompts'], dialogueLinesCheckedForExactDuplicates: seen.size,
  imageApproval: 'PENDING_HUMAN_REVIEW', releaseApproval: 'NOT_GRANTED', status,
}, null, 2) + '\n');
console.log(JSON.stringify({ approved: status.stages.filter((s) => s.approved).map((s) => s.stage), nextStage: status.nextStage, readyToStage: status.readyToStage }));
