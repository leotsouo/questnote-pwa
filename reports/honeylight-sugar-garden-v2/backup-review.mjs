import fs from 'node:fs/promises';
import path from 'node:path';
import { loadPipelineStatus } from '../../scripts/cardPoolPipeline.mjs';
import { authoringRoot, seriesId, workspace } from './revise.mjs';

const status = await loadPipelineStatus(authoringRoot, seriesId);
const images = status.stages.find((s) => s.stage === 'images');
if (status.errors.length || images.approved || status.readyToStage) throw new Error('Unexpected pipeline state');
const backup = path.resolve(import.meta.dirname, '../../content/pet-series', seriesId);
await fs.cp(workspace, backup, { recursive: true, force: false, errorOnExist: true });
const note = `# Revised authoring workspace

Active pool: ${seriesId} (蜜光糖庭), superseding the unpublished honeylight_sugar_garden draft. Never stage or publish both drafts. Previous IDs remain reserved; native init assigned all revised identities.

Canonical native root: ${authoringRoot}

This directory is a byte-for-byte review backup, with this added location note. Always pass the canonical root to the pipeline CLI: the feature checkout's official catalog is an older source baseline than the verified cumulative 84-pet authoring root. Baseline evidence is in reports/honeylight-sugar-garden/baseline-evidence.json.

The user's correction requires exactly two UR: 焦糖布蕾海獺 and 千層奶霜天鵝. Allocation is N3/R3/SR2/SSR2/UR2. All 12 are available from the first draw; prices, total rarity rates and pity thresholds remain unchanged.

The four upstream stages were reviewed by the agent under explicit user delegation. Human image approval remains pending. Exact current image outputHash: ${images.outputHash}.

All 12 PNGs were copied without changing bytes. image-reuse.json maps each original ID and SHA-256 to its revised identity. Original generation logs, revision images and immutable receipts are preserved in the previous workspace and its backup. No generation or editing service was called for this revision. No extra generation fees were incurred.

No staging candidate, source promotion, PR merge or publication has occurred.
`;
await fs.writeFile(path.join(backup, 'AUTHORING-LOCATION.md'), note);
await fs.writeFile(path.join(import.meta.dirname, 'preparation.md'), note + '\nNative validation passes: only 12 pets, 12 Lore entries, one pool and one series are added; no existing catalog entries changed or removed. All twelve 1254×1254 PNGs fully decode and match original hashes. Existing warnings: empty release version (deferred until release preparation), isolated-pool tags, and source PNGs above 2 MiB.\n\nBrowser acceptance: http://127.0.0.1:53483/ displays revised introduction and UR labels; UR filter shows precisely sea otter and swan; SSR filter shows butterfly and red panda. Saved dual-ur-preview.jpg.\n');
await fs.writeFile(path.resolve(import.meta.dirname, '../honeylight-sugar-garden/SUPERSEDED.md'), '# Unpublished draft superseded\n\nOn 2026-10-01 the user corrected the requirement to two UR (sea otter and swan). The active revised workspace is honeylight_sugar_garden_v2; see ../honeylight-sugar-garden-v2/preparation.md. Preserve this original workspace, image history and reservations. Do not stage or publish the old draft, and do not publish both drafts.\n');
console.log(JSON.stringify({ backup, imageHash: images.outputHash, pendingHumanImages: true }));
