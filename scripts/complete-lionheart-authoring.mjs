/** Complete authored chapters and the human art review; never approve or publish images. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { validateBondStories } from '../src/bondStoryCatalog.js';

const root = path.resolve(import.meta.dirname, '..');
const dir = path.join(root, 'content/pet-series/lionheart_inverse_oath');
const read = async (name) => JSON.parse(await fs.readFile(path.join(dir, name), 'utf8'));
const [petsData, loreData, plan, ecosystem, input, generations] = await Promise.all([
  read('pets.json'), read('pets-lore.json'), read('plan.json'), read('ecosystem.json'), read('authoring-input.json'), read('generation-records.json'),
]);
const notes = [
  ['圓耳、灰褐毛與天然長尾', '穩住齒輪、轉動扳手，替換磨損零件', '新齒輪咬合，測試儀指針轉動；舊件留在桌邊', '尾尖與四足完整，維修工具不遮臉', '未修訂', '接回的位置'],
  ['天然葉形鞘翅、兩觸角、六足', '以前足頂開溫室通風蓋', '凝水流下，芽葉舒展', '主角為天然甲蟲；銅框只屬於溫室', '移除首版容易被看成機械的腿部關節', '留一點空氣'],
  ['棕毛、奶白喉斑與天然長尾', '雙前爪轉動冷卻閥輪', '觀測管接通清水，水輪與冷卻槽恢復水流', '完整尾部；由真實水流表達方向', '移除管內示意箭頭、修正尾部邊距', '讓水先到家'],
  ['長耳淡青霜邊與天然四足', '在洩漏管旁踏上穩固石板，標出霜痕', '霜路繞開裂管熱汽，下一處安全落點清楚', '普通巡查提燈與地圖包已寫入 Lore；沒有光系能力或機械肢體', '普通巡查道具已對齊設計與故事', '把警告說出來'],
  ['赤褐鱗片、橙色胸腹、四足長尾', '將外溢焰舌收回爐室', '受控火流回到爐膛，錶針停在安全中段', '無翼、無裝備、完整尾部，沒有爆炸', '修正尾部裁切，收束火流', '安全的那一格'],
  ['褐白面盤、琥珀眼、天然雙翼', '半展翼轉動符文刻盤', '機械翼測試架的錯位與正位相互對照', '天然翼尖完整；刻盤符號不含可讀文字', '半展翼重新構圖，保留翼尖', '把誤差記下'],
  ['銀灰身形、冰藍尾尖與天然四足', '沿高架疾行，送回高崖消息', '落脚凝冰，短冰軌與霜線標出路徑', '完整尾尖；不使用輪子或外掛機械', '移除首版多出的機械背具與圍巾', '消息的時間'],
  ['深栗羊毛、巨大天然耐熱彎角與四蹄', '雙角架穩翼樑、前蹄操作鍛台固定桿', '新接頭凝實，破裂舊工件留在桌邊', '不把翼樑畫成羊本身的翅膀；保留角與四蹄', '未修訂', '重新開爐'],
  ['灰皮犀牛、天然主鼻角與工作支架', '抵住試飛塔，以支架工具鎖定鉚點', '接點固定，後方橋塔穩定承重', '工作支架屬外掛；主角保持活體犀牛，沒有騎士', '移除示意箭頭、保留尾部與足部', '重量歸誰'],
  ['天然龜甲、蕨葉與根系', '根系纏住過熱管道，葉片導走凝水', '根部苗床保持舒展，蒸汽遠離幼芽', '天然四足、完整頭尾，不是機器龜', '未修訂', '記住幼苗'],
  ['天然鷹首、羽翼與前爪；金棕獅身、後腿與尾', '立於高崖展翼，迎向遠方試飛塔', '天然風環收束亂流、分開雲層，草葉向外伏倒', '完全純生物、沒有任何冠冕或裝備；採用人工指定近景原圖，部分翼尖出框', '人工指定附圖：原第 1 版像素相同，直接採用所附 PNG 原檔；中間修訂全部保留', '界線仍在'],
  ['單一活體獅首、赤棕鬃毛、活體胸腹；人工器官、翼架與節段尾', '在試飛塔主動展開機械翼，挑戰高崖原型', '翼架鎖定，蒸汽推開吊鏈，平台承受推力', '半生物半機械、只有一個獅首；無鳥喙、羊頭、血腥；採用人工指定近景，部分翼尖出框', '人工指定附圖：原第 1 版像素相同，直接採用所附 PNG 原檔；中間修訂全部保留', '以自己的名字'],
];
const keepsakes = ['拾修定位齒','護芽露珠瓶','引水閥刻片','巡路霜石','添薪爐陶片','校準刻盤拓印','疾行冰軌片','鍛角試件','架橋鉚樣','盤根種葉','風界岩片','自名翼鉚'];
const reviews = [];
for (let i = 0; i < petsData.pets.length; i += 1) {
  const pet = petsData.pets[i], lore = loreData.lore[i], r = input.roster[i];
  const [signature, action, result, constraints, revisions, chapterTheme] = notes[i];
  const titles = [`${chapterTheme}・初見`, `${chapterTheme}・坦白`, `${chapterTheme}・約定`, `${chapterTheme}・同行`];
  const opening = [
    `你在${r.focus}旁遇見${pet.name}。牠沒有先談城市兩派的爭論，而是讓你看清眼前正在做的事：${action}。`,
    `${pet.name}第一次把那段來歷完整告訴你。${r.lore}`,
    `你們再次回到${r.focus}旁。${pet.name}將下一步交給你選擇，並說：「${lore.dialogues.important[0]}」`,
    lore.bondUnlocks['5'],
  ];
  const story = { petId: pet.id, title: `${pet.name}的獅心城同行故事`,
    keepsake: { name: keepsakes[i], description: `${pet.name}交給你的${keepsakes[i]}，記下你們照看${r.focus}的約定。${i >= 10 ? '這份紀念不代表與另一方和解，也不是角色的穿戴裝備。' : r.lesson + '。'}` },
    chapters: [2, 3, 4, 5].map((level, j) => ({ level, title: titles[j], paragraphs: [opening[j],
      j === 0 ? `${result}。你站在牠身旁，聽見牠說：「${lore.dialogues.normal[0]}」` : j === 1 ? `你沒有替牠的經歷改寫結局。${r.lesson}，是牠想親口說明的選擇。` : j === 2 ? `城市的對立沒有停止，今天的約定只屬於你們。${r.lesson}。` : `牠準備了「${keepsakes[i]}」。${i >= 10 ? lore.dialogues.bondUp[0] : lore.dialogues.bondUp[1]}`],
      invitation: `和${pet.name}一起完成你選定的一項任務或習慣，練習${r.lesson}。`,
      choices: [{ id: 'gentle', label: '我會聽，也尊重你的選擇。', reply: `${pet.name}回應：「${lore.dialogues.bondUp[0]}」` },
        { id: 'steady', label: '把今天能做到的一步完成吧。', reply: `${pet.name}回應：「${lore.dialogues.normal[(j + 1) % 5]}」` }],
      ending: `約定完成後，${pet.name}對你說：「${lore.dialogues.praise[j]}」${level === 5 ? `你收下「${keepsakes[i]}」，將這份同行留在自己的記錄裡。` : '你們記下今天的結果，為下一段相處留下空間。'}${i >= 10 ? '對另一方的敵意仍未改變。' : ''}`,
    })) };
  const errors = validateBondStories({ schemaVersion: 1, stories: [story] }, [pet]);
  if (errors.length) throw Error(errors.join('; '));
  lore.bondJourneyStory = story;
  const bytes = await fs.readFile(path.join(dir, 'images', `${pet.id}.png`));
  reviews.push({ petId: pet.id, name: pet.name, rarity: pet.rarity, signature, action, result, constraints, revisions,
    source: i === 10 ? '鷹／獅形體參考傳統格里芬；天律、獅心城與敵對故事為遊戲原創。' : i === 11 ? '以奇美拉混種意象原創改造：单一獅首、人工器官與機械翼架；不是傳統三首奇美拉。' : '以真實動物輪廓為基礎；名稱、能力、道具、獅心城工作與故事為遊戲原創。',
    sha256: createHash('sha256').update(bytes).digest('hex'), versions: generations.records.filter((x) => x.petId === pet.id).map((x) => x.file),
    aiReview: i >= 10 ? '兩隻 UR 已由使用者指定此附圖。採用近景、翼尖部分出框的原圖；不另行補畫，保留純生物／半機械故事設定。' : '已逐張查看實際圖：物種與主要肢體可辨、臉與工作道具清楚、主要翼尖／尾端未裁切；由人工確認畫風及故事表達。部分小角色邊距較緊，審圖頁提供 160px 檢視。',
  });
}
await fs.writeFile(path.join(dir, 'pets-lore.json'), JSON.stringify(loreData, null, 2) + '\n');
await fs.writeFile(path.join(dir, 'art-review-notes.json'), JSON.stringify({ schemaVersion: 1, reviews, humanApproved: false }, null, 2) + '\n');
const escape = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const roleLabels = { scout: '探路', scholar: '解讀', gatherer: '採集', guardian: '守護', healer: '療癒' };
const order = [10, 11, 8, 9, 5, 6, 7, 2, 3, 4, 0, 1];
const cards = order.map((i) => {
  const pet = petsData.pets[i], lore = loreData.lore[i], note = reviews[i];
  return `<article id="${pet.id}" class="card"><div class="heading"><span>${pet.rarity} · ${escape(lore.element)}</span><span>${escape(roleLabels[ecosystem.specialties[pet.id].role])}</span></div><h2>${escape(pet.name)}</h2><a href="images/${pet.id}.png" target="_blank"><img class="art" src="images/${pet.id}.png" alt="${escape(pet.name)}" loading="${i >= 10 ? 'eager' : 'lazy'}"></a><p class="caption">${escape(lore.title)}</p><dl>${[['辨識特徵',note.signature],['故事動作',note.action],['可見結果',note.result],['形體與構圖',note.constraints]].map(([label,value])=>`<dt>${label}</dt><dd>${escape(value)}</dd>`).join('')}</dl><details class="lore"><summary>展開 Lore 與角色對話</summary><p>${escape(lore.lore)}</p><p>偏好：${escape(ecosystem.affinities[pet.id].join('、'))}。${escape(ecosystem.affinityNotes[pet.id])}</p>${Object.entries(lore.dialogues).map(([key,lines])=>`<p><b>${escape(key)}</b><br>${(Array.isArray(lines)?lines:[lines]).map(escape).join('<br>')}</p>`).join('')}</details><details><summary>展開四章羈絆故事</summary>${lore.bondJourneyStory.chapters.map((c)=>`<h3>Lv.${c.level} · ${escape(c.title)}</h3>${c.paragraphs.map((p)=>`<p>${escape(p)}</p>`).join('')}<p>${escape(c.invitation)}</p><p>${escape(c.ending)}</p>`).join('')}<p>紀念物：${escape(lore.bondJourneyStory.keepsake.name)}。${escape(lore.bondJourneyStory.keepsake.description)}</p></details><details><summary>來源、自查與前版比較</summary><p>${escape(note.source)}</p><p>${escape(note.aiReview)}</p><p>修訂：${escape(note.revisions)}</p><div class="versions">${note.versions.map((file,j)=>`<figure><img src="${file}" alt="${escape(pet.name)}第${j+1}版" loading="lazy"><figcaption>第 ${j+1} 版${j===note.versions.length-1?' · 本次送審':''}</figcaption></figure>`).join('')}</div><p class="hash">SHA-256：${note.sha256}</p></details></article>`;
}).join('\n');
const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>獅心城・逆造之誓｜卡圖審核</title><style>*{box-sizing:border-box}body{margin:0;background:#102824;color:#e6eadf;font:16px/1.75 system-ui,sans-serif}main{max-width:1160px;margin:auto;padding:30px 22px 80px}h1{font-size:clamp(26px,5vw,44px);color:#e6c58d;margin:5px 0}h2{font-size:24px;line-height:1.4;margin:10px 0 18px;color:#f2dfb5}h3{font-size:18px}.intro{max-width:800px}.status{color:#a9ccc0}.controls{display:flex;flex-wrap:wrap;gap:12px;margin:24px 0}button,a.button{font:inherit;padding:10px 17px;border:1px solid #b19569;border-radius:8px;background:#e0c393;color:#18322a;cursor:pointer;text-decoration:none}nav{display:flex;flex-wrap:wrap;gap:12px}nav a{color:#d6c298}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:26px;margin-top:24px}.card{padding:22px;border:1px solid #5e7868;background:#19352e;border-radius:14px;min-width:0}.heading{display:flex;justify-content:space-between;gap:12px;color:#bad1c1;font-size:14px}.art{width:100%;aspect-ratio:1;object-fit:contain;border-radius:8px;background:#102824;display:block}.small .art{width:160px;margin:auto}.caption{color:#d4be93}dl{margin:16px 0}dt{color:#dac393;font-size:14px}dd{margin:2px 0 12px}details{border-top:1px solid #416153;padding:12px 0}summary{color:#efd5a4;cursor:pointer;min-height:28px}details p{white-space:pre-line}.versions{display:flex;flex-wrap:wrap;gap:10px}.versions figure{margin:0;width:calc(50% - 5px)}.versions img{width:100%;aspect-ratio:1;object-fit:contain}.hash{word-break:break-all;color:#9bbbab;font-size:11px}.note{padding:16px;border:1px solid #677d68;border-radius:8px}.footer{color:#a9ccc0;margin-top:28px}@media(max-width:700px){main{padding:20px 14px 50px}.grid{grid-template-columns:1fr}.card{padding:17px}.heading{font-size:13px}h2{font-size:22px}}</style></head><body><main><p class="status">製作審圖 · 12 隻 · 尚未人工核准</p><h1>獅心城・逆造之誓</h1><p class="intro">人們仰望最完美的生命，卻造出了向神露齒的產物。純生物的「天律之冕・格里芬」與半生物半機械的「逆造獅首奇美拉」持續對峙，羈絆不會改變牠們的敵意。</p><p class="intro">請檢視角色形體、風格、名稱與故事是否一致。點圖可看原尺寸；Lore、工作動作、羈絆故事與修訂前版均可展開。這是人工卡圖審核，正式整包與動畫驗收會在核准後進行。</p><div class="controls"><button id="size">切換為 160px 小卡檢視</button><button id="lore">展開全部 Lore</button><a class="button" href="/animation/">檢視製作中的專屬動畫</a></div><nav>${order.map((i)=>`<a href="#${petsData.pets[i].id}">${escape(petsData.pets[i].name)}</a>`).join('')}</nav><p class="note">新食物「爐香齒輪酥」：古代齒輪 ×3、森林之葉 ×4、熔岩核心 ×1；普通 +75，機械／火系偏好總共 +150。新增獅心城：1～3 隻、耗能 5、60 分鐘、五段探索故事與里程碑。所有角色第一抽開放，雙 UR 等權。</p><div class="grid">${cards}</div><p class="footer">本次 12 張卡圖由 Codex 內建產圖工具製作，使用已確認的方案額度；未使用額外付費 API 或插件。${generations.records.filter(x=>x.kind!=='user-provided-selection').length} 次生成／定向修訂與 2 張人工指定原圖均留存原圖與紀錄。人工 images gate 未核准；尚未建立發布 candidate 或修改正式網站。</p></main><script>document.getElementById('size').onclick=()=>{const small=document.body.classList.toggle('small');document.getElementById('size').textContent=small?'切換為完整卡圖':'切換為 160px 小卡檢視';};document.getElementById('lore').onclick=()=>{const rows=[...document.querySelectorAll('details.lore')],open=rows.some(x=>!x.open);rows.forEach(x=>x.open=open);document.getElementById('lore').textContent=open?'收合全部 Lore':'展開全部 Lore';};</script></body></html>`;
await fs.writeFile(path.join(dir, 'art-review.html'), html);
console.log('Authored 48 bond chapters and 12-card human review. No images approval recorded.');
