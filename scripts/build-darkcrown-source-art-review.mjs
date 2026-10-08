import fs from 'node:fs/promises';
const root='reports/chaos-demon-court/';
const ui=(await fs.readFile('src/ui.js','utf8')).replaceAll('\r\n','\n');
const extract=(start,end)=>ui.slice(ui.indexOf(start),ui.indexOf(end,ui.indexOf(start)+start.length)).replace(/^export /,'');
const funcs=[
 extract('function petDisplayName(', '/** 寵物原始名稱'),
 extract('function petOriginalName(', '/** 有暱稱時'),
 extract('function petNameBlockHtml(', 'function openNicknameModal('),
 extract('export function petImageHtml(', '/** 取得目前 active'),
 extract('function bondBadgeHtml(', 'function showBondUnlockToast('),
 extract('function renderCollectionCard(', '/** 圖鑑詳情彈窗')
].join('\n');
const index=await fs.readFile('index.html','utf8');
const styles=[...index.matchAll(/<link rel="stylesheet"[^>]+>/g)].map(x=>x[0]).join('\n');
const rows=JSON.parse(await fs.readFile(root+'final-art-selection.json','utf8')).images;
const pets=JSON.parse(await fs.readFile('content/pet-series/darkcrown_court_release/pets.json','utf8')).pets;
const data=rows.map(r=>({...pets.find(p=>p.id===r.petId),owned:true,form:r.form,image:r.paths?.original||root+'images/'+r.file,imageVariants:r.paths?{card:r.paths.card,stage:r.paths.stage}:undefined}));
const module="import { getPetImageSrc } from '../../src/imagePreloadService.js';\nconst escapeHtml=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]));\n"+funcs+"\nconst pets="+JSON.stringify(data)+";\ndocument.querySelector('#cards').innerHTML=pets.map(p=>renderCollectionCard(p,{eager:true})).join('');window.artReview={count:pets.length};";
await fs.writeFile(root+'source-art-review.js',module);
await fs.writeFile(root+'source-art-review.html','<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="/">'+styles+'<style>body{padding:12px}.collection-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;max-width:1100px;margin:auto}</style></head><body><div id="cards" class="collection-grid"></div><script type="module" src="/'+root+'source-art-review.js"></script></body></html>');
console.log('Exact collection renderer extracted for source image review; no game initialization.');

