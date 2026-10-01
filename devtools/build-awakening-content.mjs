import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
const root = path.resolve(import.meta.dirname, '..');
const inventory = JSON.parse(await fs.readFile(path.join(root, 'reports/awakening-discussion/art-inventory.json')));
const awakenedArt = JSON.parse(await fs.readFile(path.join(root, 'content/awakening/swordwild-shanhe/awakened-art.json'), 'utf8').catch((error) => { if (error.code === 'ENOENT') return '{"pets":[]}'; throw error; }));
// Each motif describes a visible consequence of the character's existing story.
const ideas = {
  pet_ur16: ['再築一橋', '渡橋之羽', '一諾越重岳', 'wing', '巨翼護橋，讓後來者踏上歸途', '牠不再只守著山碑前的舊約。你扶正橋板，牠展開巨翼，將迎面的山風擋在路外。', '最後一塊橋板安穩落下，牠走到你身旁。這一次，守諾也可以是一起跨到另一岸。', '有我在，這座橋就有下一個腳步。', '山風再重，我們也能並肩走過。', '今日的承諾，不必一個人扛。'],
  pet_ur17: ['為來客留清風', '留風朱石', '一界護山河', 'boundary', '朱息退霧，界線內留出清路', '牠低伏在谷口，把曾經擔心傷人的朱息壓成一道界線。你指向行旅者的路，腐霧便緩緩退到橋外。', '最細小的玉蜂也能安心落腳。牠的低鳴不再只有威懾，更是一句「這裡可以放心走」。', '這道界線裡，也有你的位置。', '強大的力量，要留得下一陣清風。', '慢慢走，我替你守住谷口。'],
  pet_ur18: ['把下一步交給你', '聽風竹節', '一葉知劍心', 'blade', '竹劍分葉，循風挑回橋索', '牠先讓你看葉子如何落下，再循著風勢揮動竹枝。分開的落葉標出劍路，散開的橋索一根根回到該在的位置。', '牠把竹枝輕放在你掌邊，沒有替你走完所有的路。學會下一步，便是你們新的同行方式。', '看清風來的方向，再走下一步。', '竹枝沒有刃口，也能讓路重新相連。', '我會陪你看見自己的劍路。'],
  pet_n36: ['把雨聲留給同行者', '聽雨蜜滴', '雨中引路人', 'honey', '蜜滴點亮竹葉，雨中仍有路', '你替牠扶起淋濕的竹葉，牠把收集的雨聲帶到亭前。小小蜜滴映出路標，讓迷路的夥伴辨認方向。', '牠不再只躲在花下聽雨，也會飛到你的袖邊，提醒你下一處可以避雨的屋簷。', '雨聲裡，也藏著回家的方向。', '那片竹葉，我替你記著。', '今日若下雨，我們一起找屋簷。'],
  pet_n37: ['把腳步放慢一點', '回風蹄印', '回風同行者', 'hoof', '蹄印接起石徑，回風等候慢步', '你沒有催牠跨過鬆動的橋板，牠也學會在回風裡等候。白蹄踏過石徑，為走得慢的夥伴留下一行穩當的足跡。', '山路並不因為放慢而變遠。牠回頭看你時，知道每個同行者都值得被等候。', '不用趕，我會等你。', '一步踏穩，再接下一步。', '今天的路，我們一起走完。'],
  pet_n38: ['留一盞不燙口的茶', '茗香花瓣', '亭前留香者', 'honey', '花香落入茶盞，疲憊者有歇腳處', '你將茶盞放在山亭裡，牠沿花間收回清甜的香氣。花瓣輕落水面，忙碌的行旅者終於願意坐下。', '牠從眠在花下的小客人，成了替大家留一點溫暖的亭前夥伴。醒來第一眼，總會先找你。', '先喝一口，事情可以慢慢做。', '花香還在，我也在。', '亭裡留著你的位置。'],
  pet_r36: ['為下一人踏開霞路', '踏霞紅穗', '霞路先行者', 'hoof', '赤蹄踏開晨霧，石路連向山亭', '牠循著你標出的路線，先踏過被晨霧遮住的石階。紅穗掠過護欄，路上的夥伴看見了能走的方向。', '牠回來時不再只想跑得最快，而是確認身後的腳步都能平安跟上。', '我先探一步，你再穩穩跟上。', '晨霞亮了，路也亮了。', '快跑與等候，我都學會了。'],
  pet_r37: ['在夜色中留下路標', '夜薔韁結', '夜路守候者', 'hoof', '黑蹄穿過月影，薔枝指向歸途', '你繫好的韁結輕貼牠的頸側，牠走過無燈的橋段。夜薔的枝影像記號，將回亭的路一段段連起來。', '黑色的身影不再消失在夜裡。牠願意帶著你辨認月影，讓安靜也能成為安心。', '夜路有我陪，不必急著跑。', '那處月影，就是回去的路標。', '我記得你繫的這個結。'],
  pet_r38: ['借一陣順風', '乘風翎片', '風路引航者', 'wing', '白翎引動順風，散索回到橋側', '你抬起將要墜下的繩索，牠掠過谷口，將散亂的風收成同一個方向。白翎劃過雲間，繩索便穩穩回到橋側。', '牠把飛得遠的本事留在你身邊，願意先看清誰需要一陣順風。', '風路找到了，一起走吧。', '你扶住這端，我去接另一端。', '飛得再遠，也會記得回來。'],
  pet_r39: ['把遠處的腳步看清', '守望羽結', '高處守望者', 'wing', '白翼展開視野，來客找到山亭', '牠陪你登上可以望見古道的高處，從雲隙辨認最後一位行旅者。白翼轉向山亭，將等待變成清楚的引路。', '牠不再只看著遠方，也會回頭確認你已走到身旁。守望的盡頭，是有人可以一起回家。', '還有一個腳步，我們等一等。', '亭子就在那裡，我看見了。', '高處的風景，也想讓你看見。'],
  pet_r40: ['金角探出安全的縫隙', '金角葉扣', '隙間探路者', 'snake', '金角撥開藤葉，細路留給小獸', '你指向被藤葉遮住的石縫，牠沿著狹小的邊界疾行。金角輕輕撥開葉片，露出不會滑落的落腳點。', '牠曾只為自己尋路，如今知道更小的夥伴也需要一個能通過的地方。', '這道縫隙，正好能走。', '小小的路，也要有人留著。', '跟著葉片亮起的方向來。'],
  pet_sr30: ['先聽見落石的聲音', '逐電鈴草', '雷前引路者', 'lightning', '電光沿石脈閃過，落石路段被避開', '牠在你腳邊停下，先聽見山壁深處細小的震動。電光掠過石脈，將危險的轉彎清楚標在雨幕中。', '你們等落石止住，再將新的路標留給後來者。迅捷的力量，這次用來提醒大家慢一步。', '先停一下，山壁有聲音。', '快一步發現，就能少一步危險。', '等雷聲過去，我們再出發。'],
  pet_sr31: ['在霜線之上辨路', '望雲霜翎', '霜線望路者', 'snow', '霜翎切開雲隙，雪線露出方向', '你在亭前留下記號，牠沿霜線飛上雲間。霜翎撥開遮住山口的薄雲，把雪中可走的稜線帶回你的眼前。', '牠沒有獨自飛向更高處，而是繞回你能看見的位置，讓高遠的視野成為同行的方向。', '那段雪線可以走，我確認過了。', '看見遠處，也要記得身旁。', '雲散開時，我會等你抬頭。'],
  pet_sr32: ['讓夜渡聽得見回聲', '夜渡回音石', '月下渡路者', 'moon', '回聲越過溪谷，暗處橋索被找回', '你在溪邊輕敲石面，牠循著回聲飛進看不清的橋洞。月下的振翅將斷索位置帶回來，黑暗裡也有了可依循的節奏。', '牠不必把夜色變成白晝，只要讓每一步都有回應。你也學會在靜默中聽見牠。', '聽，有一聲回應。', '夜色很深，路卻仍在。', '你敲一下，我就知道方向。'],
  pet_sr33: ['為風雨中的夥伴守亭', '金鬃亭鈴', '護亭鎮山者', 'mountain', '金鬃壓住山風，亭前有安穩屋簷', '你扶住搖晃的亭柱，牠低伏在風口，以金鬃承下迎面的山風。屋簷下的鈴聲漸漸安穩，夥伴們得以歇脚。', '牠的吼聲不再只是宣告領地，而是告訴疲憊的行旅者：這裡有人替你守著。', '到屋簷下來，風口交給我。', '山亭安穩了，你也歇一歇。', '守住一方，也要容得下來客。'],
  pet_sr34: ['雪地裡留兩行足跡', '雪徑狐絨', '雪徑同行者', 'snow', '狐尾拂開薄雪，兩行足跡並行', '你沒有追逐牠若隱若現的身影，只在雪徑旁耐心等候。牠用尾尖拂開薄雪，露出一段能並肩通過的石路。', '雪上終於留下兩行足跡。牠不再總走在看不見的前方，也願意把下一個轉角交給你。', '今天，留下兩行腳印吧。', '薄雪下面，藏著穩當的石頭。', '這個轉角，我等你一起走。'],
  pet_ssr21: ['讓書頁找到新的讀者', '抱卷竹籤', '山亭傳卷者', 'scroll', '卷頁舒展，失散的修橋記錄相連', '你將散落的竹籤按路段排列，牠展開懷中的卷頁。失散的修橋記錄重新接成一條能讀懂的古道。', '牠把一直抱緊的書卷放在山亭案上。知道的事願意傳下去，才不會只留在一雙手裡。', '這一頁，我們一起讀。', '書卷傳出去，路才走得更遠。', '你記下的那一行，也很重要。'],
  pet_ssr22: ['把斷處慢慢縫回來', '凝霜絲結', '霜絲續路者', 'frost', '霜絲跨過裂口，斷索重新接合', '你替牠扶住斷索的兩端，牠吐出細密的霜絲，一層層繞過磨損的裂口。透明的絲線在晨光裡顯出完整的連結。', '牠的寒意不只用來保護自己，也能讓散開的路重新相連。修補不用很快，但每一圈都可靠。', '扶住這端，我慢慢縫。', '細絲，也能接住很重的承諾。', '裂口補好了，放心跨過去。'],
  pet_ssr23: ['讓盤繞成為可以牽住的結', '繞指金結', '金結護索者', 'snake', '金蛇盤成繩結，橋側留出扶手', '你將鬆開的橋索遞向牠，金色身影繞過幾處要緊的結點。盤繞留下清楚的扶手，行旅者不必再摸索搖晃的邊緣。', '牠學會將精巧的身法用在別人的腳步上。那個曾難以靠近的金結，如今可以安心牽住。', '這個結，握緊就能走。', '盤繞的路，也能把人送向前。', '你信任的那端，我會守住。'],
  pet_ssr24: ['為橋下的溪水留路', '紫鱗溪石', '潛流護橋者', 'river', '紫鱗引開急流，橋墩重見安穩', '你沿溪岸放下記號，牠在水下循著橋墩轉身。紫鱗映出深處的流向，急水被引到不會沖垮橋腳的地方。', '牠沒有躍出水面爭一聲喝采，只在你走過橋時留下一圈平穩的水紋。看不見的守護，你也懂得了。', '橋下的水，我會看顧。', '不必每次都看見，同行仍在。', '那圈水紋，是我向你問好。'],
};
const prototype = process.argv.includes('--ur-prototype');
const selected = inventory.pairs.filter((p) => !prototype || p.rarity === 'UR');
const out = path.join(root, 'assets/pets/awakening');
await fs.mkdir(out, { recursive: true });
const pets = [];
for (const p of selected) {
  const [trialTitle, tokenName, title, visual, signature, first, last, ...dialogue] = ideas[p.newPetId];
  const bytes = await fs.readFile(path.join(root, p.earlierPath));
  if (createHash('sha256').update(bytes).digest('hex') !== p.earlierSha256) throw Error(`Historical art changed: ${p.newPetId}`);
  const stem = `${p.newPetId}-initial-${p.earlierSha256.slice(0, 12)}`;
  await fs.writeFile(path.join(out, `${stem}.png`), bytes);
  for (const [name, width] of [['card', 384], ['stage', 960]]) {
    await sharp(bytes).resize({ width, height: width, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(out, `${stem}-${name}.webp`));
  }
  pets.push({ petId: p.newPetId, name: p.name, rarity: p.rarity, trialTitle, tokenName, title, visual, signature,
    invitation: `${p.name}想和你一起${trialTitle}。把三次日常完成與一次古道同行，留成你們新的約定。`,
    story: [first, last], dialogue, initialSha256: p.earlierSha256,
    ...Object.fromEntries(Object.entries(awakenedArt.pets.find((a) => a.petId === p.newPetId) || {}).filter(([k]) => ['awakenedSha256', 'awakenedImage'].includes(k))),
    initialImage: { original: `assets/pets/awakening/${stem}.png`, card: `assets/pets/awakening/${stem}-card.webp`, stage: `assets/pets/awakening/${stem}-stage.webp` } });
}
await fs.writeFile(path.join(root, 'data/pet-awakening.json'), JSON.stringify({ schemaVersion: 1, seriesId: 'swordwild_shanhe_v3', pets }, null, 2) + '\n');
console.log(`Prepared ${pets.length} awakening stories and exact-hash initial portraits`);
