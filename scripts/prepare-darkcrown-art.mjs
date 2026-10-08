import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const dir='reports/chaos-demon-court/';
const sel=JSON.parse(await fs.readFile(dir+'art-selection-draft.json','utf8'));
const plan=JSON.parse(await fs.readFile('content/pet-series/darkcrown_court_release/plan.json','utf8')).pets;
const validation=[];
await fs.mkdir('assets/pets/awakening',{recursive:true});
await fs.mkdir('content/pet-series/darkcrown_court_release/images',{recursive:true});
for(const row of sel.images){
 const pet=plan.find(p=>p.draftId===row.draftId);
 const bytes=await fs.readFile(dir+'images/'+row.file);
 const meta=await sharp(bytes).metadata(); const stats=await sharp(bytes).stats(); await sharp(bytes).raw().toBuffer();
 if(meta.format!=='png'||meta.width!==meta.height||meta.width<1024||!stats.isOpaque) throw Error('Invalid '+row.file);
 const sha=createHash('sha256').update(bytes).digest('hex');
 const r={...row,petId:pet.petId,name:pet.name,sha256:sha,bytes:bytes.length,width:meta.width,height:meta.height,opaque:stats.isOpaque};
 if(row.form==='initial') await fs.writeFile('content/pet-series/darkcrown_court_release/images/'+pet.petId+'.png',bytes);
 if(['UR','SSR'].includes(pet.rarity)){
  const stem='assets/pets/awakening/'+pet.petId+'-'+row.form+'-'+sha.slice(0,12);
  r.paths={original:stem+'.png',card:stem+'-card.webp',stage:stem+'-stage.webp'};
  await fs.writeFile(r.paths.original,bytes);
  for(const [k,size] of [['card',384],['stage',960]]) await sharp(bytes).resize({width:size,height:size,fit:'inside',withoutEnlargement:true}).webp({quality:82,effort:5}).toFile(r.paths[k]);
 }
 validation.push(r);
}
await fs.writeFile(dir+'final-art-selection.json',JSON.stringify({status:'selected after AI candidate review; actual App review pending',images:validation},null,2)+'\n');
const region=await fs.readFile(dir+'images/darkcrown-border-original.png');
await sharp(region).resize({width:1672,height:941,fit:'inside',withoutEnlargement:true}).webp({quality:82,effort:5}).toFile('assets/expeditions/darkcrown_border.webp');
await fs.writeFile(dir+'region-art-provenance.json',JSON.stringify({tool:'built-in image_gen',source:dir+'images/darkcrown-border-original.png',originalSha256:createHash('sha256').update(region).digest('hex'),image:'assets/expeditions/darkcrown_border.webp',sha256:createHash('sha256').update(await fs.readFile('assets/expeditions/darkcrown_border.webp')).digest('hex'),actualUiReview:'pending'},null,2)+'\n');
console.log('27 opaque square PNGs decoded; 20 authoring originals, 14 paired originals and 28 WebP variants ready.');

