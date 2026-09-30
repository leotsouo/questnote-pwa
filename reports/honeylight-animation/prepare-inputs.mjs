import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { loadPipelineStatus } from '../../scripts/cardPoolPipeline.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const previousRoot = path.resolve(root, '../card-pool-honeylight/.dev-backups/honeylight-authoring');
export const authoringRoot = path.join(root, '.dev-backups/honeylight-authoring');
export const seriesId = 'honeylight_sugar_garden_v2';
export const workspace = path.join(authoringRoot, 'content/pet-series', seriesId);
const json = (value) => JSON.stringify(value, null, 2) + '\n';
await fs.cp(previousRoot, authoringRoot, { recursive: true, errorOnExist: true, force: false });
const before = await loadPipelineStatus(authoringRoot, seriesId);
assert.deepEqual(before.errors, []);
const briefPath = path.join(workspace, 'brief.json');
const brief = JSON.parse(await fs.readFile(briefPath));
brief.presentationTemplate = 'honeylight_sugar';
brief.animationPlan = {
  decision: 'dedicated',
  storyboard: '糖晶溫室亮起、拱門開啟，奶霜花與糖果浮現。首次入場3.4秒、短入場0.9秒；抽卡糖晶聚集→糖紙旋轉→奶霜花開→夥伴登場，約3–4秒，十連只播一次。',
  rarityNotes: 'SSR糖晶暖金盛宴；海獺UR焦糖糖殼裂開與漣漪，天鵝UR千層奶霜與柔軟羽光。全部SSR+依已提交結果原順序逐一播放，保留重複角色。',
  motionNotes: '前奏略過不略過SSR+ queue；稀有角色另有略過操作。減少動態停用粒子、旋轉、縮放；失敗只退回原結果，清場並恢復焦點捲動。本地CSS/SVG，無音效或額外費用。',
};
await fs.writeFile(briefPath, json(brief));
const poolPath = path.join(workspace, 'pool.json');
const pool = JSON.parse(await fs.readFile(poolPath));
pool.presentation.themeKey = pool.presentation.animationKey = 'honeylight_sugar';
pool.presentation.debutLabel = '蜜光糖庭登場';
pool.presentation.debutLines = ['穿過糖晶溫室', '每一步努力', '都值得一點甜'];
await fs.writeFile(poolPath, json(pool));
const petsPath = path.join(workspace, 'pets.json');
const pets = JSON.parse(await fs.readFile(petsPath));
for (const [id, revealKey, revealCaption] of [['pet_ur09', 'caramel', '焦糖漣漪 · 暖甜相遇'], ['pet_ur10', 'cream', '奶霜羽光 · 甜夢輕降']]) {
  const pet = pets.pets.find((item) => item.id === id); assert.ok(pet);
  pet.presentation = { ...pet.presentation, revealKey, revealCaption };
}
await fs.writeFile(petsPath, json(pets));
await fs.appendFile(path.join(workspace, 'AI-HANDOFF.md'), '\n動畫已由使用者核准方案：使用 honeylight_sugar，caramel／cream UR。發布前核對最新正式版與source baseline，附source/candidate/artifact hashes和實際動畫預覽證據。僅沿用相同PNG人工核准，需重新核對當前完整approval chain。\n');
await fs.writeFile(path.join(import.meta.dirname, 'input-review.json'), json({ recordedAt: new Date().toISOString(),
  originalAuthoringRoot: previousRoot, authoringRoot, baselineHash: before.baselineHash,
  oldCandidateId: '42f8f86ac3f9ce330e0b401575abdb96b819dbf123c27de9953d498445b30ad0',
  productionBaseline: '3942a7f35287a0aa2c3ac343b45115ec4948a380', sourceBaseline: '23d8cdcdfbb20d2a8199b04c3f45995bf5e1a996',
  originalImageFiles: before.stages.find((stage) => stage.stage === 'images').files,
  userApproval: 'User requested implementation of the complete Honeylight animation plan; previous card-image approval remains valid only for byte-identical PNGs.',
  productionPushed: false, animationPlan: brief.animationPlan }));
for (const relative of ['src/version.js', 'service-worker.js']) {
  const file = path.join(root, relative);
  let text = await fs.readFile(file, 'utf8');
  text = text.replaceAll('questnote-preview-cache-v3434-honeylight', 'questnote-preview-cache-v3434-honeylight-animation');
  if (relative === 'src/version.js') text = text.replace(/BUILD_TIME = '[^']+'/, `BUILD_TIME = '${new Date().toISOString()}'`);
  await fs.writeFile(file, text);
}
const packagePath = path.join(root, 'package.json');
const packageJson = JSON.parse(await fs.readFile(packagePath));
packageJson.scripts.test += ' && node --test devtools/honeylight-animation.test.mjs';
await fs.writeFile(packagePath, json(packageJson));
console.log(json({ authoringRoot, seriesId, unchangedBaseline: before.baselineHash, awaitingAnimationValidation: true }));
