import fs from 'node:fs/promises';
import path from 'node:path';

// Preserve the original review and its evidence; derive a separate revised review.
const oldDir = path.resolve(import.meta.dirname, '../honeylight-sugar-garden');
let builder = await fs.readFile(path.join(oldDir, 'build-review.mjs'), 'utf8');
const replaceOnce = (before, after) => {
  if (!builder.includes(before)) throw new Error('Original review template changed: ' + before);
  builder = builder.replace(before, after);
};
replaceOnce("from './author-content.mjs'", "from './revise.mjs'");
replaceOnce("const first = ['pet_ssr11', 'pet_ssr10', 'pet_ur08'];", "const first = ['pet_ur09', 'pet_ur10', 'pet_ssr12', 'pet_ssr13'];");
replaceOnce("motif: id === 'pet_ssr11' ? '甜點 SSR · 特別可愛的奶霜小天鵝' : id === 'pet_ssr10' ? '糖果 SSR · 透光硬糖晶翼' : id === 'pet_ur08' ? '代表角色 · 分享糖果與甜點' : '',", "motif: id === 'pet_ur09' ? 'UR · 焦糖布蕾與暖池海獺' : id === 'pet_ur10' ? 'UR · 特別可愛的奶霜小天鵝' : id === 'pet_ssr12' ? '糖果 SSR · 透光硬糖晶翼' : id === 'pet_ssr13' ? 'SSR · 分享糖果與甜點' : '',");
replaceOnce('兩隻 SSR 分別代表糖果與甜點，小天鵝特別走圓潤、蓬鬆、親人的可愛方向。', '兩隻 UR 是焦糖布蕾海獺與千層奶霜天鵝。小天鵝保留圓潤、蓬鬆、親人的可愛方向。12 隻配置為 N×3／R×3／SR×2／SSR×2／UR×2。');
replaceOnce("r === 'SSR' ? ' · 2 隻' : ''", "r === 'UR' || r === 'SSR' ? ' · 2 隻' : ''");
await fs.writeFile(path.join(import.meta.dirname, 'build-review.mjs'), builder);
let server = await fs.readFile(path.join(oldDir, 'review-server.mjs'), 'utf8');
server = server.replace("from './author-content.mjs'", "from './revise.mjs'").replace("server.listen(0, '127.0.0.1'", "server.listen(53483, '127.0.0.1'");
await fs.writeFile(path.join(import.meta.dirname, 'review-server.mjs'), server);
