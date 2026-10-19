/**
 * Convenience steps on top of the card-pool pipeline. Nothing here weakens a gate: approve-all
 * calls the same exact-hash approval for each stage in order, and the handoff only writes a file.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { PIPELINE_STAGES, loadPipelineStatus, approvePipelineStage } from '../cardPoolPipeline.mjs';
import { AUTHORING_FILE } from './poolAuthoring.mjs';

export const CODEX_HANDOFF_FILE = 'CODEX-IMAGES.md';

/**
 * Approve every unapproved stage in order as an AI reviewer, stopping at the first stage that is
 * missing, invalid, has unacknowledged warnings, or needs a human (images in `human` mode).
 */
export async function approveAllStages(root, id, { reviewer, acknowledgeWarnings = false, through = 'images' } = {}) {
  if (typeof reviewer !== 'string' || !reviewer.trim()) throw new Error('approve-all requires --reviewer <name>');
  if (!PIPELINE_STAGES.includes(through)) throw new Error(`--through must be one of ${PIPELINE_STAGES.join(', ')}`);
  const brief = JSON.parse(await fs.readFile(path.join(root, 'content', 'pet-series', id, 'brief.json'), 'utf8'));
  const approved = [];
  const last = PIPELINE_STAGES.indexOf(through);
  for (const stage of PIPELINE_STAGES.slice(0, last + 1)) {
    const status = await loadPipelineStatus(root, id);
    if (status.errors.length) return { ok: false, approved, stoppedAt: stage, reason: 'status_errors', errors: status.errors };
    const current = status.stages.find((item) => item.stage === stage);
    if (current.approved) continue;
    if (current.missing.length) return { ok: false, approved, stoppedAt: stage, reason: 'missing_files', missing: current.missing };
    if (stage === 'images' && brief.imageReviewMode !== 'ai-self') {
      return { ok: false, approved, stoppedAt: stage, reason: 'human_image_review_required' };
    }
    // approvePipelineStage validates through this stage and refuses unacknowledged warnings.
    try {
      await approvePipelineStage(root, id, stage, current.outputHash, { acknowledgeWarnings, reviewer, reviewerType: 'ai' });
    } catch (error) {
      return { ok: false, approved, stoppedAt: stage, reason: error.code || 'approval_failed', error: error.message };
    }
    approved.push({ stage, outputHash: current.outputHash });
  }
  const status = await loadPipelineStatus(root, id);
  return { ok: true, approved, nextStage: status.nextStage, readyToStage: status.readyToStage };
}

function fence(text) {
  const longest = Math.max(2, ...[...String(text).matchAll(/`+/g)].map((match) => match[0].length));
  const ticks = '`'.repeat(longest + 1);
  return `${ticks}text\n${text}\n${ticks}`;
}

/** Markdown brief for generating every card (and new region art) in Codex with its built-in image tool. */
export function renderCodexHandoff({ id, brief, plan, prompts, authoring }) {
  const lines = [
    `# 卡圖產生交接：${brief.seriesName}（${id}）`,
    '',
    '請在 Codex 用**內建產圖工具**（image_gen）依下列提示詞產生圖片，放到指定路徑。',
    '',
    '## 規則',
    '',
    '- 只用 Codex 內建產圖工具。不要呼叫 API、第三方服務，不要購買或加值額度；若內含額度不足以完成，停下來回報。',
    '- 開始前記下額度檢查結果（是否在內含額度內、已用百分比、是否有購買額度），寫進每張圖的 `provenance.costBasis`。',
    '- 卡圖：正方形 PNG，建議 1024 × 1024（至少 512，最好不超過 2048 px、2 MB；單張上限 5 MB）。',
    '- 每張圖都要實際打開看：物種與肢體正確、翼尖／尾巴／道具沒有被裁掉、縮到 160 px 仍認得出角色、故事動作與可見結果有畫出來、沒有文字或浮水印。不合格就重產，不要只依提示詞宣稱完成。',
    '- 只修改 `images/`、`assets/expeditions/` 與 `prompts.json` 的 provenance；不要改其他檔案、不要 commit。',
    '',
    '## 產完後在 prompts.json 記錄',
    '',
    '每個 pet ID 的 `provenance` 保留原有欄位，並更新：',
    '',
    '- `tool`：實際使用的工具名稱；`noExtraCost: true`；`costBasis`：額度檢查結果與日期',
    '- `model`、`seed`：工具有回傳才填，沒有就維持 `null`，不要編造',
    '- `status`: `"generated"`；`generatedAt`：ISO 時間；`outputSha256`：最終 PNG 的 SHA-256',
    '- 重產過的話在 `note` 說明原因',
    '',
    '## 卡圖',
    '',
  ];
  for (const pet of plan.pets) {
    const entry = prompts.prompts?.[pet.petId];
    lines.push(`### ${pet.petId} ${pet.name}（${pet.rarity}）`, '', `輸出：\`content/pet-series/${id}/images/${pet.petId}.png\``, '');
    if (!entry) { lines.push('**缺少提示詞：先執行 `card-pool author`。**', ''); continue; }
    lines.push('提示詞：', '', fence(entry.prompt), '', '避免：', '', fence(entry.negativePrompt), '');
  }
  const areas = authoring?.ecosystem?.expedition?.decision === 'add' ? authoring.ecosystem.expedition.areas || [] : [];
  if (areas.length) {
    lines.push('## 新探險地區插畫', '', '靜態 16:9 WebP，至少 960 × 540。地圖小卡與派遣視窗共用同一張，地標要在小卡裁切後仍看得出來。', '');
    for (const area of areas) {
      const prompt = authoring.regionArt?.[area.id]?.prompt;
      lines.push(`### ${area.id} ${area.name}`, '', `輸出：\`assets/expeditions/${area.id}.webp\``, '');
      lines.push(prompt ? fence(prompt) : '**缺少地區提示詞：在 authoring.json 的 `regionArt.' + area.id + '.prompt` 補上。**', '');
    }
    lines.push('地區圖的來源紀錄（工具、提示詞、輸出 SHA-256）寫在回報裡，由 Claude 收進 `checks.region.evidence`。', '');
  }
  lines.push('## 完成後', '', '回報產生的檔案清單、每張的 SHA-256、重產次數與額度檢查結果。之後由 Claude 做 ai-self 審圖與整包驗證。', '');
  return lines.join('\n');
}

export async function writeCodexHandoff(root, id) {
  const dir = path.join(root, 'content', 'pet-series', id);
  const read = async (name, optional = false) => {
    try { return JSON.parse(await fs.readFile(path.join(dir, name), 'utf8')); } catch (error) {
      if (optional && error.code === 'ENOENT') return null;
      throw error;
    }
  };
  const [brief, plan, prompts, authoring] = await Promise.all([read('brief.json'), read('plan.json'), read('prompts.json'), read(AUTHORING_FILE, true)]);
  const text = renderCodexHandoff({ id, brief, plan, prompts, authoring });
  const file = path.join(dir, CODEX_HANDOFF_FILE);
  await fs.writeFile(file, text);
  const missingPrompts = plan.pets.filter((pet) => !prompts.prompts?.[pet.petId]).map((pet) => pet.petId);
  return { ok: missingPrompts.length === 0, file: path.relative(root, file).replaceAll('\\', '/'), cards: plan.pets.length, missingPrompts };
}
