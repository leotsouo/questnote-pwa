import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createPipelineWorkspace, loadPipelineStatus, approvePipelineStage, validatePipelineWorkspace } from '../../scripts/cardPoolPipeline.mjs';

export const authoringRoot = path.resolve(import.meta.dirname, '../../.dev-backups/honeylight-authoring');
export const seriesId = 'honeylight_sugar_garden_v2';
export const workspace = path.join(authoringRoot, 'content/pet-series', seriesId);
const previous = path.join(authoringRoot, 'content/pet-series/honeylight_sugar_garden');
const read = async (dir, file) => JSON.parse(await fs.readFile(path.join(dir, file), 'utf8'));
const write = async (dir, file, value) => fs.writeFile(path.join(dir, file), JSON.stringify(value, null, 2) + '\n');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function revise() {
  const brief = await read(previous, 'brief.json');
  brief.seriesId = seriesId;
  brief.poolId = seriesId;
  brief.rarityPlan = { N: 3, R: 3, SR: 2, SSR: 2, UR: 2 };
  brief.concept = 'QuestNote 同一世界的新地域：山谷中的糖晶溫室與暖香烘焙街，自然獸形與甜食魔法相融。情緒輕快、療癒、分享，以完成小事後的微小慶祝為核心。12 隻皆第一抽開放，無解鎖、無贈寵；N 3／R 3／SR 2／SSR 2／UR 2。使用者更正：兩隻 UR 指定焦糖布蕾海獺與千層奶霜天鵝。海獺呈現焦糖脆層與暖池的悠然，天鵝保留圓身短頸、蓬鬆奶霜羽毛、親人歪頭的特別可愛方向。琉糖星翼蝶與蜜曦盛宴小熊貓為 SSR，維持糖果晶翼與分享宴席的設計。沿用既有細緻奇幻動物插畫，主色奶油白、薄荷綠、莓果粉、焦糖金；角色由材質、輪廓、棲地區分。糖庭不是星糖萌皇的王國，不改既有 Lore。宣傳句「每一步努力，都值得一點甜。」；沿用 default 演出與原價格、機率、保底，不新增機制。前置決策及審閱已由使用者明確委託代理；只有最終卡圖交由使用者審核。本次沿用先前已生成的 12 張原圖，不重新生成，不使用付費外部服務。';
  await write(import.meta.dirname, 'brief-draft.json', brief);
  await createPipelineWorkspace(authoringRoot, brief);
  const plan = await read(workspace, 'plan.json');
  const oldPlan = await read(previous, 'plan.json');
  const oldPets = await read(previous, 'pets.json');
  const oldLore = await read(previous, 'pets-lore.json');
  const oldPrompts = await read(previous, 'prompts.json');
  const originalReview = await read(previous, 'review-report.json');
  const mapping = { n_1: 'pet_n23', n_2: 'pet_n24', n_3: 'pet_n25', r_1: 'pet_r20', r_2: 'pet_r21', r_3: 'pet_r22', sr_1: 'pet_sr17', sr_2: 'pet_sr18', ssr_1: 'pet_ssr10', ssr_2: 'pet_ur08', ur_1: 'pet_sr16', ur_2: 'pet_ssr11' };
  const pets = { ...oldPets, pets: [] };
  const lore = { ...oldLore, lore: [] };
  const prompts = { ...oldPrompts, prompts: {} };
  const reuse = [];
  for (const slot of plan.pets) {
    const oldId = mapping[slot.draftId];
    if (!oldId) throw new Error('Unexpected native allocation');
    const oldSlot = oldPlan.pets.find((p) => p.petId === oldId);
    slot.name = oldSlot.name;
    slot.design = oldSlot.design.replace('甜點 SSR', '甜點 UR').replace('UR代表', 'SSR分享宴席代表');
    if (slot.draftId === 'ur_1') slot.design = '雙 UR 之一；' + slot.design;
    slot.phase = 'base';
    const pet = oldPets.pets.find((p) => p.id === oldId);
    pets.pets.push({ ...pet, id: slot.petId, rarity: slot.rarity, image: `assets/pets/${slot.petId}.png`, poolTags: [seriesId], seriesId });
    lore.lore.push({ ...oldLore.lore.find((p) => p.id === oldId), id: slot.petId });
    const source = path.join(previous, 'images', oldId + '.png');
    const bytes = await fs.readFile(source);
    const originalCheck = originalReview.imageChecks.find((p) => p.petId === oldId);
    if (!originalCheck || sha(bytes) !== originalCheck.sha256) throw new Error('Previous reviewed image changed: ' + oldId);
    await fs.writeFile(path.join(workspace, 'images', slot.petId + '.png'), bytes);
    const originalPrompt = oldPrompts.prompts[oldId];
    prompts.prompts[slot.petId] = { ...originalPrompt, provenance: `${originalPrompt.provenance}\nRarity revision only: reused original PNG from honeylight_sugar_garden/images/${oldId}.png, SHA-256 ${sha(bytes)}. New native allocation ${slot.petId}, rarity ${slot.rarity}. Prompt and negativePrompt preserved exactly from the original workspace; this revision made no image-generation or editing call. Previous generation and revision logs remain in the original workspace. Human image approval still pending.` };
    reuse.push({ name: pet.name, previousPetId: oldId, petId: slot.petId, previousRarity: pet.rarity, rarity: slot.rarity, source, sourceSha256: sha(bytes), destinationSha256: sha(await fs.readFile(path.join(workspace, 'images', slot.petId + '.png'))), originalPromptSha256: sha(Buffer.from(JSON.stringify(originalPrompt))), operation: 'reuse_existing_generated_image', newGenerationCalls: 0 });
  }
  const series = { ...await read(previous, 'series.json'), seriesId, description: brief.concept, rarityPlan: brief.rarityPlan };
  const pool = { ...await read(previous, 'pool.json'), id: seriesId, petFilter: { poolTags: [seriesId] } };
  for (const [file, value] of Object.entries({ 'plan.json': plan, 'series.json': series, 'pets.json': pets, 'pets-lore.json': lore, 'pool.json': pool, 'prompts.json': prompts })) await write(workspace, file, value);
  await write(workspace, 'image-reuse.json', { copiedAt: new Date().toISOString(), previousSeriesId: 'honeylight_sugar_garden', seriesId, reason: 'User corrected 2 SSR to 2 UR and specified sea otter and swan; remaining choices delegated.', newGenerationCalls: 0, additionalGenerationFees: 0, images: reuse });
  const ur = pets.pets.filter((p) => p.rarity === 'UR');
  if (ur.length !== 2 || !ur.some((p) => p.speciesType === 'sea_otter') || !ur.some((p) => p.speciesType === 'swan')) throw new Error('Requested UR pair missing');
  const seen = new Set();
  for (const item of lore.lore) for (const key of ['normal', 'urgent', 'important', 'praise', 'idle', 'bondUp']) for (const line of item.dialogues[key]) {
    if (seen.has(line)) throw new Error('Duplicate dialogue');
    seen.add(line);
  }
  const validation = await validatePipelineWorkspace(authoringRoot, seriesId);
  if (!validation.ok || Object.values(validation.changes).some((c) => c.changed.length || c.removed.length)) throw new Error(JSON.stringify(validation));
  for (const stage of ['brief', 'plan', 'content', 'prompts']) {
    const status = await loadPipelineStatus(authoringRoot, seriesId);
    if (status.errors.length) throw new Error(JSON.stringify(status.errors));
    const current = status.stages.find((s) => s.stage === stage);
    console.log(JSON.stringify({ reviewedStage: stage, files: current.files, exactCurrentHash: current.outputHash }));
    await approvePipelineStage(authoringRoot, seriesId, stage, current.outputHash, { reviewer: 'agent-under-user-delegation-2026-10-01', acknowledgeWarnings: true });
  }
  const status = await loadPipelineStatus(authoringRoot, seriesId);
  if (status.readyToStage || status.stages.find((s) => s.stage === 'images').approved) throw new Error('Human image gate must remain pending');
  await write(workspace, 'upstream-review.json', { reviewedAt: new Date().toISOString(), reviewer: 'agent-under-user-delegation-2026-10-01', delegation: 'User delegated upstream choices, then corrected UR pair to sea otter and swan. Human personally reviews final images only.', reviewed: ['brief', 'plan', 'content', 'prompts'], dialogueLinesCheckedForExactDuplicates: seen.size, imageApproval: 'PENDING_HUMAN_REVIEW', releaseApproval: 'NOT_GRANTED', status });
  console.log(JSON.stringify({ allocated: plan.pets, validation: validation.ok, nextStage: status.nextStage, readyToStage: status.readyToStage }, null, 2));
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) await revise();
