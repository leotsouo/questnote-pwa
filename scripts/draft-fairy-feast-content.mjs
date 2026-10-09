/** Writes only this unpublished pool's authored inputs; never changes official catalogs. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { FAIRY_AWAKENING_IDS } from '../src/petAwakeningProfiles.js';

const root = path.resolve(import.meta.dirname, '..');
const dir = path.join(root, 'content/pet-series/aurora_fairy_feast');
const read = async (file) => JSON.parse(await fs.readFile(file, 'utf8'));
const write = async (file, value) => fs.writeFile(path.join(dir, file), JSON.stringify(value, null, 2) + '\n');
const proposal = await read(path.join(root, 'content/pool-proposals/aurora_fairy_feast/proposal.json'));
const pipeline = await read(path.join(dir, 'pipeline.json'));
if (pipeline.history.length) throw Error('Draft script cannot rewrite reviewed inputs; revise explicitly.');
const order = ['sugar_mist_butterfly','violet_dew_firefly','floral_silk_bird','night_jam_hedgehog','cream_bow_rabbit','blue_sugar_marten','peach_tea_squirrel','violet_cup_cat','cherry_silk_fox','indigo_mist_swan','moon_dew_deer','night_radiance_owl'];
const titles = ['餅上微花','晚宴引路燈','最後一瓣糖花','留火的莓香','穩穩的奶霜籃','回望霧橋','兩籃晨昏茶','為你放涼的茶','補好一盒溫柔','讀香的夜羽','晨露照席者','晚歸守灶者'];
const anchors = ['糖花','露光路標','塔面花冠','莓醬小火','奶霜食籃','糖光足印','晨昏茶籃','溫茶盞','花紋食盒','香氣食譜','月滴果塔','返航極光'];
const species = ['butterfly','firefly','small songbird','hedgehog','rabbit','marten','squirrel','cat','fox','swan','white deer','eagle owl'];
const personalities = [['輕盈','體貼','安靜'],['耐心','警覺','溫柔'],['細心','勤快','靦腆'],['踏實','守信','謹慎'],['認真','溫柔','堅持'],['敏捷','謹慎','可靠'],['勤快','公平','爽朗'],['安靜','體貼','耐心'],['溫柔','巧思','樂於分享'],['沉靜','敏銳','好學'],['優雅','溫柔','有分寸'],['穩重','警覺','護短']];
const rows=pipeline.allocation.map((slot,i)=>{
  const pet=proposal.roster.find(p=>p.key===order[i]);
  if(!pet||pet.rarity!==slot.rarity) throw Error('Allocation mismatch');
  return {...slot,...pet,index:i};
});
if(JSON.stringify(rows.filter(p=>p.awakening).map(p=>p.petId).sort())!==JSON.stringify([...FAIRY_AWAKENING_IDS].sort())) throw Error('Awakening allocation differs from controlled runtime');
const plan={schemaVersion:1,pets:rows.map(p=>({draftId:p.draftId,petId:p.petId,rarity:p.rarity,name:p.name,phase:p.availability==='expansion'?'unlock':'base',
  design:`辨識特徵：${p.design.signature}。故事動作：${p.design.action}。可見結果：${p.design.consequence}。構圖與限制：${p.design.composition}。本池原創，保留${p.species}本體；初遇只呈現靈獸。`,key:p.key,palette:p.palette,awakening:p.awakening}))};
await write('plan.json',plan);
const pets={pets:rows.map(p=>({id:p.petId,name:p.name,rarity:p.rarity,image:`assets/pets/${p.petId}.png`,seriesId:proposal.poolId,speciesType:species[p.index],element:p.element,visualTheme:p.palette==='light'?'pastel_pink_white':'pastel_blue_violet',
  expeditionSpecialty:p.specialty,description:`${p.name}是霓霞膳庭的${p.species}靈獸，${p.design.action}；${p.design.consequence}。`,poolTags:[proposal.poolId+(p.availability==='expansion'?'_expanded':'')],
  ...(['SSR','UR'].includes(p.rarity)?{presentation:{revealKey:p.rarity.toLowerCase(),revealCaption:titles[p.index]}}:{})}))};
await write('pets.json',pets);
const lore={version:1,lore:rows.map(p=>{
  const a=anchors[p.index], title=titles[p.index];
  const dialogues={
    normal:[`我把${a}留在你看得見的地方。`,`今天的第一件小事，我陪你做。`,`忙完這一步，就能安心開席了。`,`不用趕成別人的步伐，我會等你。`,`你的份量已經留好了，慢慢來。`],
    urgent:[`先照看最急的那一件，${a}交給我。`,`時間快到了，我陪你把最後一步做好。`,`先把眼前的火候穩住吧。`,`我們先走近期限，再整理其他事情。`,`需要幫忙時就說，我一直在旁邊。`],
    important:[`${a}也需要次序，先做最重要的那一步。`,`你想完成的那件事，我記著。`,`先替真正想守住的事留一個位置。`,`把今天最要緊的材料放在手邊。`,`我們一起把那份承諾做完整。`],
    praise:[`${a}亮起來了，你的努力我看見了。`,`這一步完成得很踏實。`,`你願意慢慢做完，真好。`,`今天的席位，多了一份安心。`,`辛苦了，這口溫暖為你留下。`],
    idle:[`我正在照看${a}，你可以先歇一會兒。`,`雲上風很輕，我陪你聽。`,`等你準備好，我們再一起出發。`],
    bondUp:[`你已經認得${a}裡藏著的心意了。`,`以後開席，我都會留你的位置。`],summon:`${p.name}循著${a}的香氣，來到你身旁。`,
  };
  const unlocks={'2':`你願意等我把${a}照看好，我記住了。`,'3':`我曾以為只要珍藏材料，香氣就不會消失。`,'4':`現在我想把${a}帶去與你分享，而不是獨自收藏。`,'5':`晨宴或夜宴，我都願意和你坐在同一桌。`};
  const chapters=[2,3,4,5].map((level,i)=>({level,title:['先留一席','散去的香氣','把食物帶給你','晨昏同桌'][i],
    paragraphs:[`${p.name}${[p.design.action+'。',`把${a}藏在膳亭一角，卻發現收藏不能讓香氣長留。`,`再次${p.design.action}，這次把成果分給晚歸的你。`,`看著${p.design.consequence}，終於不再急著將所有滋味收進自己的籃子。`][i]}`,unlocks[String(level)]],
    invitation:`與${p.name}一起完成一件日常小事，為共席留一段時間。`,choices:[{id:'gentle',label:'慢慢說，我會聽。',reply:`${p.name}安靜靠近，讓你看見${a}裡留下的心意。`},{id:'steady',label:'我們一起做一件小事。',reply:`${p.name}點頭，重新照看${a}，等著與你並肩完成。`}],ending:`約定完成後，${p.name}把${a}帶到你的席前。${unlocks[String(level)]}`}));
  return {id:p.petId,title,personality:personalities[p.index],element:p.element,lore:`${p.name}以靈獸之身從霓霞膳庭下凡，想學會人間的料理。${p.design.signature}讓牠在雲霧中仍可辨認。牠${p.design.action}，於是${p.design.consequence}。最初牠只想收藏完美的滋味，後來才懂得，等待與分享能讓一餐留下溫度。${p.awakening?'當羈絆與同行約定成熟，牠能覺醒為仙女；初遇與召喚始終保持靈獸。':'牠喜歡以靈獸的模樣陪伴旅人，往後也會保持這個模樣。'}`,dialogues,bondUnlocks:unlocks,
    bondJourneyStory:{petId:p.petId,title:`${p.name}的共席故事`,keepsake:{name:`${a}的共席記`,description:`${p.design.consequence}；你們為彼此留下的席位，比一份珍藏的食譜更長久。`},chapters}};
})};
await write('pets-lore.json',lore);
const pool=await read(path.join(dir,'pool.json'));
pool.tenPullGuarantee='SR';pool.presentation={...pool.presentation,heroPetId:'pet_ur31',featuredPetIds:['pet_ur32','pet_ssr41','pet_ssr42'],badge:'晨昏共席',eyebrow:'靈獸赴宴 · 羈絆成仙',tagline:'把人間的溫柔，帶回雲上的餐桌。',debutLabel:'霓霞仙膳登場',debutLines:['花露循香，晨昏相迎','為同行者留一席溫暖']};
pool.unlockExpansion={...pool.unlockExpansion,title:'晨昏共席',unlockMessage:'二十次相遇，晨宴與夜宴終於坐在同一桌。桃露茶栗與紫盞雲狸加入候選，桃露茶栗一位前來同行。'};
await write('pool.json',pool);
const e=await read(path.join(dir,'ecosystem.json'));
e.food={id:proposal.food.id,name:proposal.food.name,type:'favorite_bond_item',rarity:'R',enabled:true,description:'以森林嫩葉托住膳庭花露的果塔；普通送禮增加75親密經驗，符合偏好時總共150，也用於霓霞仙膳四位稀有夥伴的覺醒儀式。',favoriteTags:proposal.food.favoriteTags,effect:{bondExp:75,favoriteBonusBondExp:150},recipe:proposal.food.recipe,futureTags:['bond_item',proposal.poolId]};
e.materials=[{id:'aurora_flower_dew',name:'霓霞花露',rarity:'R',description:'從晨昏交會的花瓣收集的露珠，用於霓霞花露塔。',category:'nature',sourceArea:'aurora_feast_garden'}];
for(const p of rows){e.affinities[p.petId]=p.affinityTags;e.affinityNotes[p.petId]=p.affinityReason;e.specialties[p.petId]={role:p.specialty,reason:`${p.design.action}；${p.design.consequence}。此定位以 expeditionSpecialty 明確提供給派遣系統。`};}
e.expedition={decision:'add',reason:'獨立晨昏分享故事與新花露材料、覺醒同行目的地，具有實際採集與料理用途。',reusedAreaIds:['mist_forest','cloudrest_trail'],areas:[{id:proposal.region.id,name:proposal.region.name,description:proposal.region.description,durationMinutes:60,energyCost:5,unlock:proposal.region.unlock,rewards:proposal.region.rewards}]};
e.releaseNotes='新增霓霞仙膳十二位靈獸，深淺各六；二十抽後擴充兩位SR並以既有單次發放贈送桃露茶栗。只有兩SSR和兩UR能依既有羈絆流程覺醒為仙女。新花露塔保持75／符合偏好總150尺度；膳庭提供花露、五段故事及里程碑。晨昏雲廚新場景沿用固定時長。價格、機率、保底、十連保障與舊卡池候選保持不變。工程與人工整包驗收尚待完成。';
await write('ecosystem.json',e);
const representative=await read(path.join(root,'content/pool-proposals/aurora_fairy_feast/representative-art-v1.json'));
const costBasis='Built-in image_gen.imagegen consumes included Codex usage per https://learn.chatgpt.com/docs/image-generation. Session ordinaryUsageAllowed confirmed, no paid API, subscription, purchase or credits used. Model and seed unavailable.';
const prompts={schemaVersion:1,prompts:Object.fromEntries(rows.map(p=>[p.petId,{prompt:p.key==='moon_dew_deer'?representative.images[0].prompt:
  `Create ONE standalone square full-frame premium illustrated fantasy pet card, no text, border, collage or inset. ONE ${species[p.index]} spirit beast ONLY, unmistakable natural animal anatomy, no human/fairy figure, no hybrid organs. Character ${p.name}. Recognizable features: ${p.design.signature}. Story action: ${p.design.action}. Visible consequence: ${p.design.consequence}. Composition: ${p.design.composition}. All wing tips, ears, antlers, tails and feet must remain within frame with generous margin. Clearly readable subject at 320px. Graceful gentle cloud-kitchen world, softly layered lace, ribbons, gauze and satin Ambient Light. ${p.palette==='light'?'Milky white, petal pink, pale lilac, macaroon dawn colors.':'Soft dusk periwinkle, blue and violet, pale lilac aurora, warm ivory accent; never solid black or aggressive red.'} ${p.rarity==='UR'?'Legendary UR guardian presence with broad controlled environmental reaction.':p.rarity==='SSR'?'Distinctive SSR signature skill and memorable silhouette.':'Intimate everyday cooking moment, restrained effects appropriate to rarity.'} Quiet cloud terraces and restrained background, crisp animal face and central story prop, richly painted fur/feathers and delicate fabric matching approved references. Original QuestNote fantasy, no historical deity claims.`,
  negativePrompt:'text, card border, split composition, collage, inset, second main character, humanoid initial form, fairy initial form, cropped wing tips, cropped feet or ears, extra legs, fused limbs, unreadable story action, blown highlights, black-red demon palette',
  provenance:{tool:'image_gen.imagegen',noExtraCost:true,costBasis,modelReported:null,seedReported:null,references:p.palette==='light'?['content/pool-proposals/aurora_fairy_feast/artwork/moon-dew-deer-initial-v1.png']:['content/pool-proposals/aurora_fairy_feast/references/night-owl-design-board.png']}}]))};
await write('prompts.json',prompts);
await write('art-direction.json',{schemaVersion:1,source:'Original QuestNote fantasy. User-supplied design references guide style, not historical or mythological attribution.',rows:rows.map(p=>({petId:p.petId,key:p.key,name:p.name,palette:p.palette,awakening:p.awakening,awakeningTitle:p.awakeningTitle||null,design:p.design,source:'本池原創；沿用已核准的粉白／暮藍紫視覺語言，不引用特定歷史神祇。'}))});
await fs.copyFile(path.join(root,'content/pool-proposals/aurora_fairy_feast/artwork/moon-dew-deer-initial-v1.png'),path.join(dir,'images/pet_ur31.png'));
console.log('Authored 12 reserved pets, explicit specialties, individual story actions, four chapters each, recipe/region and prompts. Preserved approved deer PNG bytes.');
