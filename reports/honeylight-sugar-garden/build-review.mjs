import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { loadPipelineStatus, validatePipelineWorkspace } from '../../scripts/cardPoolPipeline.mjs';
import { workspace, authoringRoot, seriesId } from './author-content.mjs';

const plan = JSON.parse(await fs.readFile(path.join(workspace, 'plan.json')));
const pets = JSON.parse(await fs.readFile(path.join(workspace, 'pets.json'))).pets;
const reviewDir = path.join(workspace, 'review');
await fs.mkdir(path.join(reviewDir, 'thumbs'), { recursive: true });
const first = ['pet_ssr11', 'pet_ssr10', 'pet_ur08'];
const order = [...first, ...plan.pets.map((p) => p.petId).filter((id) => !first.includes(id))];
const entries = order.map((id) => ({ ...pets.find((p) => p.id === id),
  motif: id === 'pet_ssr11' ? '甜點 SSR · 特別可愛的奶霜小天鵝' : id === 'pet_ssr10' ? '糖果 SSR · 透光硬糖晶翼' : id === 'pet_ur08' ? '代表角色 · 分享糖果與甜點' : '',
}));
const checks = [];
const sheet = [];
const escape = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
for (const [index, p] of entries.entries()) {
  const source = path.join(workspace, 'images', p.id + '.png');
  const bytes = await fs.readFile(source);
  const image = sharp(bytes, { failOn: 'error' });
  const metadata = await image.metadata();
  await image.clone().raw().toBuffer();
  await image.clone().resize(480, 480, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 84 }).toFile(path.join(reviewDir, 'thumbs', p.id + '.webp'));
  // Contact sheet is a review layout only; source PNG bytes stay untouched.
  const thumb = await image.clone().resize(320, 320).png().toBuffer();
  const x = (index % 3) * 340 + 20, y = Math.floor(index / 3) * 376 + 20;
  sheet.push({ input: thumb, left: x, top: y });
  const label = `<svg width="320" height="40"><text x="160" y="25" text-anchor="middle" font-family="Microsoft JhengHei, sans-serif" font-size="18" fill="#4b3326">${escape(p.rarity + ' · ' + p.name)}</text></svg>`;
  sheet.push({ input: Buffer.from(label), left: x, top: y + 326 });
  checks.push({ petId: p.id, name: p.name, rarity: p.rarity, width: metadata.width, height: metadata.height, bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'), fullyDecoded: true, square: metadata.width === metadata.height,
    below5MiB: bytes.length <= 5 * 1024 * 1024, humanApproval: 'PENDING' });
}
await sharp({ create: { width: 1040, height: 1512, channels: 3, background: '#fff8ec' } }).composite(sheet).png().toFile(path.join(reviewDir, 'contact-sheet.png'));
const card = (p, index) => `<article data-rarity="${p.rarity}">
  <button class="art" data-index="${index}" aria-label="放大 ${escape(p.name)}"><img src="review/thumbs/${p.id}.webp" alt="${escape(p.name)}卡圖" loading="${index < 3 ? 'eager' : 'lazy'}" width="480" height="480"></button>
  <div class="copy"><div class="eyebrow">${p.rarity}${p.motif ? ' · ' + escape(p.motif.replace(p.rarity + ' · ', '')) : ''}</div><h2>${escape(p.name)}</h2><p>${escape(p.description)}</p></div>
</article>`;
const html = `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>蜜光糖庭 · 12 張卡圖審核</title>
<style>
:root{color-scheme:light;--ink:#4b3326;--soft:#826955;--cream:#fff8ec;--mint:#d6e8d8;--line:#e8dcca}*{box-sizing:border-box}body{margin:0;background:var(--cream);color:var(--ink);font-family:"Microsoft JhengHei","Noto Sans TC",system-ui,sans-serif}button,a{font:inherit}button{cursor:pointer}button:focus-visible,a:focus-visible{outline:3px solid #27725b;outline-offset:4px}header,main,footer{max-width:1160px;margin:auto;padding:24px}header{padding-top:48px}.kicker{letter-spacing:.14em;font-size:12px;color:var(--soft)}h1{font-size:clamp(32px,5vw,54px);margin:8px 0}header p{font-size:18px;line-height:1.7;margin:12px 0;color:var(--soft)}.intro{max-width:740px}.note{display:inline-block;border:1px solid var(--line);border-radius:30px;padding:8px 14px;font-size:13px}.filters{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px}.filters button{border:1px solid var(--line);border-radius:24px;background:transparent;color:var(--ink);padding:9px 16px}.filters button[aria-pressed=true]{background:var(--ink);border-color:var(--ink);color:var(--cream)}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px 20px}article{overflow:hidden;border:1px solid var(--line);border-radius:18px;background:#fffcf6}[hidden]{display:none!important}.art{border:0;padding:0;width:100%;display:block;aspect-ratio:1;background:#f2e5ce}.art img{width:100%;height:100%;object-fit:contain;display:block}.copy{padding:18px}.eyebrow{font-size:12px;color:#7b5840;line-height:1.6;min-height:19px}h2{font-size:20px;margin:6px 0 12px}.copy p{font-size:14px;color:var(--soft);line-height:1.8;margin:0}footer{padding-bottom:48px;color:var(--soft);font-size:13px;line-height:1.8}dialog{border:0;border-radius:18px;padding:16px;background:var(--cream);color:var(--ink);width:min(880px,96vw);max-height:94vh}dialog::backdrop{background:#221508dd}dialog img{display:block;max-width:100%;max-height:72vh;margin:auto;object-fit:contain}.viewer-top,.viewer-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.viewer-actions{margin:12px 0 0;flex-wrap:wrap}dialog button,dialog a{background:transparent;border:1px solid var(--line);border-radius:22px;padding:8px 14px;color:var(--ink);text-decoration:none}#caption{font-size:16px;font-weight:700}.count{font-size:13px;color:var(--soft)}@media(max-width:760px){header,main,footer{padding-left:16px;padding-right:16px}.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 12px}.copy{padding:12px}h2{font-size:17px}.copy p{font-size:13px}header{padding-top:28px}}@media(max-width:460px){.grid{grid-template-columns:1fr;gap:24px}.copy{padding:16px}h2{font-size:21px}}
</style></head><body>
<header><div class="kicker">QUESTNOTE · NEW REGION</div><h1>蜜光糖庭</h1><p>每一步努力，都值得一點甜。</p><p class="intro">糖晶溫室與暖香烘焙街的 12 位新夥伴。兩隻 SSR 分別代表糖果與甜點，小天鵝特別走圓潤、蓬鬆、親人的可愛方向。</p><span class="note">卡圖審核版 · 尚未發布</span></header>
<main><nav class="filters" aria-label="稀有度篩選">${['全部', 'N', 'R', 'SR', 'SSR', 'UR'].map((r, i) => `<button data-filter="${r}" aria-pressed="${i === 0}">${r}${r === 'SSR' ? ' · 2 隻' : ''}</button>`).join('')}</nav><div class="grid">${entries.map(card).join('\n')}</div></main>
<footer>點卡圖可放大原圖，使用左右方向鍵切換。<br>本次只需審核這 12 張卡圖；可在聊天回覆「核准這 12 張卡圖」，或指名想調整的角色與細節。</footer>
<dialog aria-label="原圖檢視"><div class="viewer-top"><span id="caption"></span><button id="close" aria-label="關閉原圖">關閉 ✕</button></div><img id="full" alt=""><div class="viewer-actions"><button id="previous" aria-label="上一張卡圖">← 上一張</button><span class="count" id="count"></span><a id="download" download>下載原圖 PNG</a><button id="next" aria-label="下一張卡圖">下一張 →</button></div></dialog>
<script>
const pets=${JSON.stringify(entries.map((p) => ({ id: p.id, name: p.name, rarity: p.rarity })))};
const dialog=document.querySelector('dialog'), full=document.querySelector('#full');let current=0;
function show(index){current=(index+pets.length)%pets.length;const p=pets[current];full.src='images/'+p.id+'.png';full.alt=p.name+'原圖';document.querySelector('#caption').textContent=p.rarity+' · '+p.name;document.querySelector('#count').textContent=(current+1)+' / '+pets.length;document.querySelector('#download').href=full.src;if(!dialog.open)dialog.showModal();}
document.querySelectorAll('[data-index]').forEach(b=>b.addEventListener('click',()=>show(Number(b.dataset.index))));
document.querySelector('#close').addEventListener('click',()=>dialog.close());document.querySelector('#previous').addEventListener('click',()=>show(current-1));document.querySelector('#next').addEventListener('click',()=>show(current+1));
document.addEventListener('keydown',e=>{if(!dialog.open)return;if(e.key==='ArrowLeft'){e.preventDefault();show(current-1)}if(e.key==='ArrowRight'){e.preventDefault();show(current+1)}});
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));document.querySelectorAll('article').forEach(x=>x.hidden=b.dataset.filter!=='全部'&&x.dataset.rarity!==b.dataset.filter)}));
</script></body></html>`;
await fs.writeFile(path.join(workspace, 'IMAGE-REVIEW.html'), html);
const validation = await validatePipelineWorkspace(authoringRoot, seriesId);
const status = await loadPipelineStatus(authoringRoot, seriesId);
if (!validation.ok || status.errors.length) throw new Error(JSON.stringify({ validation, status }));
if (status.stages.find((s) => s.stage === 'images').approved || status.readyToStage) throw new Error('Human image approval must remain pending');
const report = { generatedAt: new Date().toISOString(), imageChecks: checks, validation, status,
  unchangedPublishedContent: Object.values(validation.changes).every((c) => !c.changed.length && !c.removed.length),
  pending: ['Human approval of exact current images outputHash', 'Native staging after approval', 'Separate source integration and release review'],
  originalImagesModified: false, externalPaidGenerationUsed: false,
};
await fs.writeFile(path.join(workspace, 'review-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ validation: validation.ok, imageCount: checks.length, imageHash: status.stages.find((s) => s.stage === 'images').outputHash,
  unchangedPublishedContent: report.unchangedPublishedContent, readyToStage: status.readyToStage,
  warnings: validation.warnings.map((w) => ({ code: w.code, path: w.path })), gallery: path.join(workspace, 'IMAGE-REVIEW.html') }, null, 2));
