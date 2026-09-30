import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
export const authoringRoot = path.join(root, '.dev-backups/honeylight-authoring');
export const seriesId = 'honeylight_sugar_garden';
export const workspace = path.join(authoringRoot, 'content/pet-series', seriesId);
const write = (file, value) => fs.writeFile(path.join(workspace, file), JSON.stringify(value, null, 2) + '\n');
export const roster = [
  {
    slot: 'n_1', name: '方糖絨兔', species: 'rabbit', element: 'sugar_spark', display: '糖光', theme: 'sugar_cube_fluff',
    title: '把小步堆成甜甜方塊', traits: ['羞怯', '細心', '樂於分享'],
    design: '圓潤乳白兔，短小身形、軟毛與淡金糖粒；雙耳直立，腳邊只有幾塊方糖，沒有方形機械身體。奶油白與淡桃粉，低處溫室晨光。',
    subject: 'One extremely endearing small ivory rabbit with a natural round furry body, two upright fluffy ears and soft peach inner ears, tiny paws and golden sugar grains sparkling on its fur. A few clean white sugar cubes nestle by its forepaws. It sits on warm moss at the base of a sugar-crystal greenhouse, shyly tilting its head. Cream and pale peach palette. Sugar granules must feel tactile, the animal must remain furry, not a cubical robot.',
    description: '毛尖沾著金色糖粒的乳白小兔，總把慶祝用的方糖一塊塊擺齊。牠喜歡替不起眼的小進展留一個位置，也把第一塊方糖推給剛踏進糖庭的旅人。',
    lore: '糖晶溫室的晨光落地時，方糖絨兔會沿著玻璃牆收集毛尖凝結的微小糖粒。牠曾想替糖庭的宴席堆起最高的方糖塔，卻因一次疊得太急，讓整座塔散落在苔地上。千層奶霜天鵝陪牠一塊一塊收拾，還把那天的第一塊方糖擺在小碟中央。自此，牠的方糖堆不再求高，每放上一塊，便替一件確實完成的小事留名。牠仍不太敢站在宴席最前面，卻會悄悄把第一碟甜味推到新朋友腳邊。',
    normal: ['先擺好第一塊，今天就有開始啦。', '我把這個小位置留給你的進展。', '不用一下堆很高，一塊也很好看。', '糖粒落在毛上了，你看，亮亮的。', '選一件小事吧，我在旁邊等你。'],
    urgent: ['先把最急的那一塊放穩！', '快倒的塔先扶住，其他晚點擺。', '時間靠近了，我們只看眼前這塊。', '別急著加高，先完成能交出去的一步。', '把需要的東西擺近一點，少跑一趟。'],
    important: ['這塊是底座，要替它留足時間。', '重要的事值得慢慢放正。', '我們先找最穩的落點，再往上疊。', '把今天最想做到的事放在中央吧。', '我守住小碟，你專心做好這一步。'],
    praise: ['又多一塊啦！今天真的有前進。', '這塊放得好穩，我想看久一點。', '你做到了，我的耳朵都立起來了！', '小小一件也值得這一碟甜。', '今天的糖堆有你的形狀呢。'],
    idle: ['坐在苔地上歇一下，塔不會跑掉。', '我在數糖粒，你可以慢慢想。', '還沒開始也沒關係，底座先留著。'],
    bond: ['我敢把第一塊放得更靠近你了。', '這次想請你和我一起擺小碟。'],
    summon: '乳白小兔從溫室的苔地探出頭，把一塊微亮方糖推到你面前。',
    unlocks: ['牠的糖堆裡總留一格空位，原來是留給下一位加入的小夥伴。', '糖塔散落那天，牠最怕被笑；天鵝先陪牠收拾，再說第一塊也值得慶祝。', '你得到一塊帶有細小爪印的方糖，那是牠第一次獨自擺穩的底座。', '今天的第一碟由你端出。牠靠在你腳邊，耳朵不再因人群而縮起來。'],
  },
  {
    slot: 'n_2', name: '跳跳果凍蛙', species: 'frog', element: 'jelly_ripple', display: '凝露', theme: 'lime_jelly_pond',
    title: '跟著漣漪再跳一次', traits: ['活潑', '好奇', '不怕重來'],
    design: '天然青蛙形、透亮萊姆綠果凍皮膚、肚子淡琥珀；小圓眼與四肢清楚。從糖庭淺水池跳上濕石，少量水珠，不能只是圓球史萊姆。',
    subject: 'One small joyful frog with anatomically recognizable frog legs, webbed toes, two round expressive eyes, and translucent lime-green jelly skin with a pale amber belly. It lands on a smooth damp stepping stone beside a shallow greenhouse pond, with a restrained arc of clear droplets and soft jelly highlights. A few mint leaves and reflected warm bakery lights. Natural frog silhouette, clearly jelly material, no floating fruit chunks inside its body.',
    description: '萊姆綠的果凍小蛙住在溫室淺池，落水後總會隨漣漪彈回岸邊。牠把每次失足都當成重選落腳處的機會，最愛陪朋友試試看下一跳。',
    lore: '糖庭淺池的石頭很滑，跳跳果凍蛙第一次替大家測試新石徑時，一連掉進水裡五回。牠的凝露皮膚不怕濕，卻很在意其他夥伴會不會跟著滑倒。於是牠停下來看漣漪，找到被水草遮住的一塊平石，再換個方向跳。現在牠每天會先沿池邊試走一圈，將歪掉的薄荷葉標記扶正。對牠而言，再試一次不等於照原樣亂跳，而是帶著上一跳看到的東西，選一個更可靠的落點。',
    normal: ['我找到一塊平石，一起跳過來！', '剛才滑了一下，換個角度試試。', '水面亮了，今天也有新的落點。', '先試一小跳，就知道路好不好走。', '你動一步，我替你看下一塊石頭。'],
    urgent: ['先上最近那塊石頭，別繞遠路！', '要交付的那件先跳到岸上。', '水漲了，現在只挑最可靠的路。', '停一下看準方向，下一跳就出發！', '把眼前這步做完，再想後面的池子。'],
    important: ['這条石徑大家都會走，先試穩。', '別急著跳遠，重要的是能落地。', '我看著水面，你看清要到的岸。', '試過的方法記下來，下次就有路。', '大池子也能從最近一塊石頭開始。'],
    praise: ['啪嗒！漂亮地落地啦！', '你換了方向就成功，我也記住了。', '剛才那一跳比昨天穩耶！', '漣漪都在替你畫小圓圈。', '今天走過的石頭，真的變多了。'],
    idle: ['浮在水面歇歇，腿也需要休息。', '我替你看著岸，先慢慢呼吸。', '池子很安靜，等你想好再跳。'],
    bond: ['聽見你的腳步，我就知道岸在哪裡。', '最喜歡的平石讓你坐，我在旁邊。'],
    summon: '一聲輕巧的水響後，透亮的小蛙穩穩落在石頭上，朝你眨了眨眼。',
    unlocks: ['牠每次起跳前會蹲得特別低，那是在確認腳趾已抓穩石面。', '薄荷葉不是裝飾，而是牠替新朋友留下的安全路標。', '你陪牠移開遮住平石的水草，牠高興得在岸邊連跳了三個小圈。', '牠不再搶著示範第一跳，而是在對岸安靜等你，讓你選自己的路。'],
  },
  {
    slot: 'n_3', name: '奶油曲奇刺蝟', species: 'hedgehog', element: 'biscuit_warmth', display: '暖香', theme: 'butter_cookie_spines',
    title: '留住剛出爐的溫度', traits: ['踏實', '慢熱', '體貼'],
    design: '小刺蝟真實短腿與毛茸茸臉腹，背刺像放射狀奶油曲奇脆瓣，金黃烘烤邊緣。木窗台暖光，不用裝飾奶油帽。',
    subject: 'One tiny round hedgehog with a natural furred face and belly, a small dark nose and short visible feet. Its protective back spines have transformed into delicate fan-shaped butter-cookie petals with crisp golden baked edges, arranged radially without looking like armor. It rests beside a linen napkin on a sunlit bakery windowsill with a few biscuit crumbs. Warm biscuit gold, ivory fur, tactile browned pastry detail, cozy humble scale.',
    description: '背刺散著奶油曲奇香的小刺蝟，常在烘焙街窗台替新出爐的點心守溫。牠話不多，總等朋友坐穩了，才輕輕挪近那一點暖香。',
    lore: '奶油曲奇刺蝟住在烘焙街最低的窗台。牠背上的脆瓣能留住餘溫，卻不是取之不盡的爐火。有一年糖庭宴席遲遲沒開始，牠為了讓所有點心都保持熱乎，整晚不肯離開窗邊，最後累得連身體都蜷不起來。泡芙栗鼠抱來一條乾淨的布巾，教牠把餘溫分成幾段守候。如今牠會準時休息，再把暖好的小位置讓給晚到的朋友。那股奶油香總是溫和而安穩，像一句不用急著回答的問候。',
    normal: ['窗台暖好了，先放一件事上來。', '我慢慢走，但會把這段路走完。', '麵團要一點時間，你的進展也是。', '先收拾桌角，做起來就順手了。', '餘溫還在，我陪你再做一小段。'],
    urgent: ['先看快出爐的那盤，別讓它焦了。', '最有時限的那件先端出來吧。', '布巾在這裡，準備好就能接住。', '把眼前的火候照顧好，其他等一下。', '別抱全部的盤子，一次穩穩一盤。'],
    important: ['這一盤值得留出完整的時間。', '想做得扎實，底下的火候先穩住。', '重要的地方再看一次，我陪你。', '讓最需要的事先佔住暖窗台。', '把能交付的模樣想清楚，再開爐。'],
    praise: ['香氣剛剛好，你也做得剛剛好。', '這份踏實的進展，我想替你守著。', '今天的桌面比剛才清爽多了呢。', '完成了，來坐在暖暖這一側。', '不用說很大聲，我看見你努力啦。'],
    idle: ['我把背蜷起來，你也休息一下。', '等一等，餘溫不會因此消失。', '窗外的光很舒服，先坐一下吧。'],
    bond: ['我願意把最暖的窗台分給你。', '看到你歇下來，我也敢好好休息了。'],
    summon: '窗台上傳來奶油香，一隻背著金黃脆瓣的小刺蝟慢慢抬起鼻尖。',
    unlocks: ['牠的脆瓣在降溫時會發出細小的沙沙聲，你開始聽懂牠何時需要休息。', '那條布巾一直放在窗邊，提醒牠守溫不必耗盡自己。', '你替牠換了更低的小踏板，從此牠上窗台不用再勉強伸長短腿。', '宴席這回準時開了，牠卻先陪你在安靜窗邊坐一會，再一起加入人群。'],
  },
  {
    slot: 'r_1', name: '薄荷拐杖鼬', species: 'weasel', element: 'mint_breeze', display: '薄荷風', theme: 'mint_candy_cane_tail',
    title: '拐個彎也能抵達', traits: ['機敏', '爽朗', '善於變通'],
    design: '修長天然鼬，奶白短毛、薄荷綠耳背，尾巴有薄荷白條紋並彎成拐杖糖曲線；明亮糖晶溫室小徑。自然四足，沒有拿手杖。',
    subject: 'One lively slender natural weasel on all four paws with cream-white sleek fur and mint-green ears. Its long tapering tail is subtly striped mint and ivory and curls into a graceful candy-cane hook, a believable flexible animal tail with glossy candy highlights at the tip. It trots along a curved greenhouse path edged with mint leaves and clear sugar-crystal arches. Dynamic diagonal pose, fresh mint and ivory palette, no hand-held cane, no costume.',
    description: '尾巴帶著薄荷條紋的靈巧小鼬，穿過糖晶拱門時總留下一縷清爽風。牠最擅長找替代小路，讓卡住的事情也有繼續前進的方法。',
    lore: '糖晶溫室的拱門常因夜裡長出的新晶枝變得狹窄。薄荷拐杖鼬本來以穿過最窄的門為傲，直到一次用力擠過，碰落了琉糖星翼蝶正在照顧的晶芽。牠從那天起學會先看門邊的薄荷葉，再選一條不會打擾旁人的路。尾尖的彎鉤能輕輕撥開葉片，留下清爽的風。夥伴們遇到阻塞時便喊牠來看看，牠總先問目的地在哪，而不是要求大家一定走原先的那一道門。',
    normal: ['這邊也有路，我帶你看看。', '先認清要去哪裡，再挑好走的彎。', '拱門窄了，換條小徑也行。', '吸一口薄荷風，重新整理順序吧。', '把卡住的位置說給我聽。'],
    urgent: ['時間短，我們選最近的通路！', '先繞過小阻塞，把要交的送到。', '尾巴收好，這一段直接跑。', '能先處理的先做，別都堵在門口。', '先確認目的地，我們馬上出發。'],
    important: ['這條路會影響大家，先看仔細。', '核心目標別拐丟了，方法可以換。', '留一條回頭路，做決定更踏實。', '我看門邊，你看最關鍵的那一步。', '選擇省力的路，不代表少了用心。'],
    praise: ['轉過彎就到了，你真會找路！', '薄荷風都清亮起來啦。', '卡住的地方通了，後面好走多了。', '你保住了目的地，也找到新方法。', '今天的路線可以記在小葉子上。'],
    idle: ['蹲在葉影下歇歇，風會慢慢吹。', '我先把尾巴捲好，等你準備。', '不趕路的時候，這個彎很好看。'],
    bond: ['有你在，我不必每次都跑最前面。', '我想帶你走那條只有薄荷香的小路。'],
    summon: '薄荷葉輕輕一晃，一隻條紋尾小鼬轉過糖晶拱門，停下來等你。',
    unlocks: ['牠尾尖的彎鉤總朝內收，免得掃到剛長出的晶芽。', '那次碰落的晶芽被蝶重新栽好，牠每天路過都會放慢腳步。', '你和牠在地圖上加了一條新小徑，它不最短，卻能讓每個夥伴安心經過。', '牠將帶路的位置交給你，自己在最後確認沒有人落下。'],
  },
  {
    slot: 'r_2', name: '泡芙栗鼠', species: 'chinchilla', element: 'cream_cloud', display: '奶霜', theme: 'cream_puff_chinchilla',
    title: '把柔軟留給晚到的人', traits: ['溫柔', '愛整理', '有點怕生'],
    design: '胖嘟嘟栗鼠，大圓耳、自然小爪與灰奶油絨毛；背毛分瓣像烘烤泡芙，胸前微卷毛像鮮奶油。木烘焙架旁，非蛋糕堆人偶。',
    subject: 'One very round fluffy chinchilla with large circular ears, tiny natural forepaws and a soft gray-ivory face. The rich golden-tan fur over its back forms gently segmented choux-pastry puffs, while a delicate ivory tuft on its chest resembles whipped cream. It curls beside a linen-lined wooden cooling rack in a warm bakery alcove, one real cream puff nearby to make the motif clear. Natural plush chinchilla anatomy, soft curious eyes, no chef hat.',
    description: '像剛出爐泡芙般圓滾滾的栗鼠，會用蓬鬆毛團把小布巾暖好。牠不擅長熱鬧招呼，卻總替晚到的朋友留下最柔軟的座位。',
    lore: '泡芙栗鼠替糖庭宴席整理座位，起初總把布巾摺得太過整齊，連自己都不敢坐上去。一次大雨讓烘焙街的旅人全身濕透，牠來不及重新摺好，只能抱著一團溫暖乾布迎上前。旅人舒服地靠下來，說這正是自己需要的。從此牠學會讓柔軟先於漂亮，晚到的夥伴也總有位置。牠胸前那撮奶霜般的捲毛，會在有人安心坐下時輕輕蓬開，像偷偷鬆了一口氣。',
    normal: ['布巾暖好啦，你先坐穩。', '桌面不用完美，能開始就很好。', '先整理常用的那一角吧。', '我替今天的事情留了幾個小位置。', '慢慢來，我正在把邊角摺鬆一點。'],
    urgent: ['先把能用的布巾送出去！', '來不及摺漂亮，也能好好完成。', '眼前最需要的那件，先抱起來。', '把必需的都放到一側，現在就取用。', '別等每個角都整齊，先讓事情前進。'],
    important: ['這個位置留給今天的重點。', '想清楚對方真正需要什麼，再準備。', '做得舒服，比看起來整齊更有用。', '我把干擾先收好，你專心吧。', '重要的那件，值得一塊乾淨桌面。'],
    praise: ['你坐得安心，我就很開心。', '完成了，我替你把小椅子暖好。', '剛才那份安排真貼心。', '事情順利用上了，比摺得漂亮還好。', '今天留給自己休息的位置也做到了。'],
    idle: ['靠近這團軟毛歇一下吧。', '我會守住你的座位，不用急。', '布巾沒摺好也沒關係，現在很舒服。'],
    bond: ['我不再擔心你會弄亂布巾啦。', '這塊暖布也留一半給我，好嗎？'],
    summon: '烘焙架下探出兩隻圓耳，泡芙般的小栗鼠抱著一角暖布等你靠近。',
    unlocks: ['牠摺布前會用鼻尖試溫度，確認不太燙，才放心交給朋友。', '那位雨中旅人留下的歪摺痕仍在，牠沒有再熨平。', '你幫牠在宴席邊添了一張小椅子，原來照顧座位的牠也需要坐下。', '今天的布巾由你們隨意鋪開，牠坐在你身邊，第一次不再一直盯著邊角。'],
  },
  {
    slot: 'r_3', name: '莓糖卷尾松鼠', species: 'squirrel', element: 'berry_glaze', display: '莓光', theme: 'berry_candy_spiral_tail',
    title: '留下一顆記得的甜', traits: ['熱情', '善記憶', '容易分心'],
    design: '赤褐自然松鼠，大尾巴卷成清晰螺旋，尾毛有莓紅半透硬糖光帶；一顆莓果硬糖在前爪間。莓樹與糖晶籬旁，尾巴不像蝸牛殼。',
    subject: 'One cheerful reddish-brown natural squirrel with a large fluffy tail curled into a clear spiral behind its body. Narrow translucent berry-red sugar-glaze streaks follow the spiral while preserving soft fur underneath. It holds one small round berry hard candy between its natural forepaws, perched on a low branch beside berry bushes and a sugar-crystal fence. Coral berry and caramel-brown palette, bright lively eyes, no candy packaging, not a snail shell.',
    description: '卷尾映著莓紅糖光的小松鼠，記得每位朋友喜歡的甜味，卻偶爾忘了自己的安排。牠正學著把今天最重要的事也放進心裡那座小糖罐。',
    lore: '莓糖卷尾松鼠能從糖衣的細微光澤認出每種莓果味道，糖庭的朋友都喜歡請牠挑一顆合意的糖。牠也很喜歡替大家跑腿，常跑到第三家烘焙窗台，才發現自己忘了最初要送去哪裡。琉糖星翼蝶教牠在出發前先選一顆莓糖，當作今天要記得的那件事。如今牠的卷尾裡仍閃著許多誘人的光帶，但最深的那一道只留給當天的核心安排。牠分享甜味時，終於也記得替自己的進度留一份。',
    normal: ['今天要記得哪一顆？先選好吧。', '我差點被香氣帶走，還好想起你。', '把這件寫下來，回來就找得到。', '新的點子先放糖罐旁，稍後再看。', '先送完這一趟，再選下一顆莓糖。'],
    urgent: ['最急的那顆先送，路上不逛窗台！', '眼前這件寫清楚，就直接出發。', '我把其他糖收起來，陪你專心。', '先確認交付地點，別跑錯巷子。', '時間緊，我們只帶需要的一顆。'],
    important: ['把最深那道糖光留給主目標。', '這件不能只記在香氣裡，要記下來。', '我替你看著提醒，不讓新點子蓋過它。', '今天想完成什麼？先說給自己聽。', '留一份注意力給自己的安排吧。'],
    praise: ['送對地方啦！這顆莓糖給你。', '你把分心的尾巴捲回來了，真好。', '今天想記得的事，真的完成了耶。', '每跑完一趟，都值得一點莓光。', '你也替自己留了一份，我看到了。'],
    idle: ['把糖罐放好，這回我們不用跑。', '枝上有空位，你慢慢整理想法。', '我先數好莓糖，等你準備下一趟。'],
    bond: ['你喜歡的味道，我一直記著。', '現在我也敢告訴你自己想留哪顆。'],
    summon: '莓紅光帶在枝間捲起，小松鼠抱著一顆晶亮硬糖，期待地看向你。',
    unlocks: ['牠尾巴最深的光帶每天不同，標記著今天要記得的核心安排。', '牠最愛的莓味其實偏酸，只是以前總把最甜的讓給大家。', '你給牠的小記錄簿放在糖罐旁，第一頁寫著自己的名字。', '今天牠準時完成跑腿，帶回兩顆微酸莓糖，坐下來和你慢慢分享。'],
  },
  {
    slot: 'sr_1', name: '焦糖布蕾海獺', species: 'sea_otter', element: 'caramel_glow', display: '焦糖暖光', theme: 'brulee_amber_otter',
    title: '敲開恰好的薄脆', traits: ['耐心', '專注', '幽默'],
    design: '自然海獺，奶油腹毛、琥珀金背毛與薄脆焦糖光紋，仰躺暖池、前爪抱一只小布蕾陶碟。小碟不是機械裝置，脆層清楚。',
    subject: 'One charming sea otter floating belly-up in a shallow warm amber reflecting pool, its creamy soft belly and rich caramel-brown fur clearly visible. Thin glassy caramel cracks shimmer subtly along its back fur. Natural forepaws cradle a small plain ceramic crème-brûlée dish with an unmistakable crisp golden caramelized surface, one tiny crack catching light. Friendly focused face, gentle ripples, warm bakery doorway behind. Dessert illustration with believable otter anatomy, no spoon held like a human.',
    description: '琥珀背毛映著薄脆糖光的海獺，在暖池邊慢慢照看小碟布蕾。牠懂得等火候，也懂得在恰好的時候輕輕敲開，讓完成的香氣真正散出來。',
    lore: '焦糖布蕾海獺最喜歡糖層裂開的那一聲輕響。年幼時牠為了追求更響亮的聲音，將糖層反覆烤厚，最後連下方柔嫩的布蕾也失了溫度。千層奶霜天鵝陪牠試過幾次，才找到能讓薄脆和柔軟相互襯托的火候。如今牠不再不斷補烤已經完成的小碟，而是準時把它送上宴席。牠在暖池上漂得安穩，常用小玩笑提醒夥伴：認真照料很重要，知道何時交付，也同樣是一門手藝。',
    normal: ['火候剛好，這件可以準備收尾啦。', '先照看一小碟，別把所有爐子都開了。', '做到能交出去，就讓香氣散開吧。', '我替你守著節奏，慢慢做穩。', '要不要敲開看看？也許已經很好了。'],
    urgent: ['這盤快過火了，先端出去！', '別再補烤，眼前的成果可以交付。', '最急那一碟先查一遍就出發。', '時間緊，我們保住必要的火候。', '先做收尾那一下，後面再慢慢調。'],
    important: ['薄脆與柔軟都要顧到，先抓核心。', '把完成的標準說清楚，就知道何時停。', '值得細做的事，也值得按時端出。', '我守住小碟，你把關鍵處理好。', '留一段完整時間，讓這份心思成形。'],
    praise: ['咔嚓，這聲完成真好聽！', '你沒有烤過頭，成果正香呢。', '小碟端上桌了，努力被看見啦。', '認真又知道何時停，真是好火候。', '這次的薄脆，我們一起慶祝吧。'],
    idle: ['在池上漂一會，不用一直開火。', '碟子放穩，我們先歇歇。', '水暖暖的，想法可以慢慢沉下來。'],
    bond: ['聽到你的笑聲，我就知道小碟準備好了。', '這回第一聲薄脆，想和你一起聽。'],
    summon: '暖池上浮起琥珀漣漪，小海獺抱著布蕾碟，給你一個滿足的眨眼。',
    unlocks: ['牠敲糖層前會將小碟貼近耳邊，先聽表面的細微聲音。', '那只烤得太厚的舊碟還在架上，牠用它提醒自己不必無止境補做。', '你們寫下第一份清楚的交付標準，海獺笑著說這比多烤三回更有用。', '宴席開了，牠放下自己的小碟，先陪你欣賞已完成的那一份。'],
  },
  {
    slot: 'sr_2', name: '馬卡龍錦羽孔雀', species: 'peacock', element: 'pastel_harmony', display: '彩香', theme: 'macaron_fan_feathers',
    title: '讓每種顏色都有位置', traits: ['自信', '講究', '善於協調'],
    design: '小型天然孔雀、淡薰衣草身羽，扇尾含薄荷莓粉淡紫圓形羽眼，明確像兩片馬卡龍夾奶霜但仍羽毛組成。粉彩階層、自然鳥腿、溫室拱門。',
    subject: 'One elegant small natural peacock with a lavender-gray feathered body, short natural bird legs, a delicate crest and a proud gentle face. Its broad symmetrical fan tail has evenly spaced round feather eyes in mint, berry pink and soft lavender, each eye resembling a double macaron shell with a narrow cream center integrated into feather texture. One cohesive feather fan, not a pile of attached cookies. It stands on a greenhouse mosaic path in diffuse afternoon light. Clearly readable pastel macaron motifs and refined feather detail.',
    description: '扇尾排著薄荷、莓粉與淡紫羽眼的孔雀，總能把不同甜香放在恰好的位置。牠相信漂亮的宴席來自彼此襯托，也正學著接受一點不對稱。',
    lore: '馬卡龍錦羽孔雀負責糖庭宴席的色彩安排，牠的羽眼在不同光線下，像一對對夾著奶霜的馬卡龍。牠曾為了讓每列顏色完全相同，將朋友帶來的手作點心藏在最後一桌。蜜曦盛宴小熊貓看見那桌，先把自己最喜歡的莓色小碟搬過去，大家也跟著坐下。孔雀才發現，不規則的邊緣能容納每位朋友的手藝。如今牠仍細心配色，卻會在扇尾中央留一片隨當天來客改變的羽眼。',
    normal: ['先把不同的事擺開，看見彼此的位置。', '今天的主色由你選，我來搭配。', '這個邊緣有點歪，也很有自己的模樣。', '先處理一列，整桌就清楚了。', '讓相近的工作靠在一起，做起來更順。'],
    urgent: ['先讓必要那列成形，細節稍後配。', '時間緊，就保住最清楚的主色。', '別重排整桌，先補眼前缺的那格。', '把能交付的擺在前面吧。', '現在最需要哪一色？先照顧它。'],
    important: ['這是整桌的主題，值得仔細想。', '讓重點被看見，不必每格都搶眼。', '彼此能襯托，比每件都完美更好。', '替重要的內容留一片清楚空間。', '先問這份安排要幫到誰，再配色。'],
    praise: ['這桌有你的手藝，看得出來呢。', '不同的顏色一起亮了，真好看。', '你保住重點，也照顧到了細節。', '小小不對稱，讓這份成果很親切。', '我想為這個完成展開扇尾！'],
    idle: ['羽尾收好，現在不必保持完美。', '在淡紫這側坐一會吧。', '等光線慢慢變，我們也慢慢想。'],
    bond: ['中央那片羽眼，今天想留給你的選擇。', '你在旁邊時，我不怕尾羽有一點歪了。'],
    summon: '粉彩羽扇在溫室光下舒展，小孔雀替你的到來留出中央的位置。',
    unlocks: ['牠中央的羽眼每天換色，現在不再要求整排都一致。', '宴席最後一桌的手作碟仍被保留，成了牠每次配色的起點。', '你和牠一起挑了三種不常相鄰的顏色，第一次排出意外和諧的小列。', '牠將自己的主色也放進你挑的配置裡，扇尾不再只展現自己，而是展現你們。'],
  },
  {
    slot: 'sr_3', name: '可可熔心龍', species: 'small_dragon', element: 'cocoa_ember', display: '可可暖火', theme: 'chocolate_lava_heart',
    title: '用一點暖火把事情融開', traits: ['熱心', '急性子', '肯修正'],
    design: '小四足翼龍，可可棕磨砂鱗片、短翼與少量金色暖紋，胸口一道琥珀熔光如熔岩巧克力蛋糕核心，非傷口。坐在石烤爐旁，無爆炸火焰。',
    subject: 'One affectionate small quadrupedal dragon with two short folded wings, matte cocoa-brown chocolate-like scales, a rounded muzzle and a friendly determined expression. A narrow amber-gold glow shines from an intact translucent heart-shaped scale on its chest, suggesting the warm molten center of a chocolate lava cake without any wound. Tiny steam wisps rather than fire blasts, amber edge light, resting beside a stone bakery oven with a broken chocolate cake in the background. Clearly natural fantasy creature, appetizing cocoa textures, no human stance.',
    description: '可可棕小龍的胸前藏著一點琥珀暖光，能替烘焙街穩住爐邊溫度。牠原本一熱心就把火加大，如今會先聽朋友需要多暖，再慢慢呼出熱氣。',
    lore: '可可熔心龍的胸鱗能留住暖火，像熔心蛋糕裡最後流出的那一點可可。牠剛來烘焙街時，一心想證明自己有用，見爐門開了便大口呼出熱氣，讓泡芙接連塌了三盤。奶油曲奇刺蝟沒有責備牠，只把小爐移到身旁，讓牠練習將同樣的溫度維持久一點。牠終於懂得，照顧一件事不是越用力越好。現在牠會先問火候，胸前的琥珀光安穩跳動，連等候冷卻也成了牠願意學的手藝。',
    normal: ['我先吐一點暖氣，不急著加大。', '要多少火候？說好再開始。', '今天把這一爐照顧穩就很棒。', '力氣收一點，動作反而準一點。', '先試小火，看看它真正需要什麼。'],
    urgent: ['先關掉多餘的火，保住這一爐！', '最急的那件需要穩，不需要慌。', '把要用的準備好，我陪你集中。', '眼前能完成的先做好，別同時全燒。', '吸一口氣，照著順序做就來得及。'],
    important: ['這一爐會影響整桌，溫度先看清楚。', '把力氣放在關鍵處，我們慢慢守住。', '先聽懂需要，再決定怎麼幫忙。', '重要的事，也可以用小火完成。', '讓熱心有方向，比一直加火有用。'],
    praise: ['這回沒塌！你的火候真穩。', '胸前暖光都跟著你亮起來啦。', '你先聽再做，成果舒服多了。', '完成了，爐邊的香氣正好。', '今天這份耐心，也很值得慶祝。'],
    idle: ['我把小翅膀收好，一起等它冷卻。', '不用一直呼熱氣，爐子也要歇歇。', '胸口還暖著，你可以慢慢休息。'],
    bond: ['我知道怎樣的溫度讓你舒服了。', '現在和你一起等候，我也不著急啦。'],
    summon: '石爐旁的小翼龍抬起圓鼻，胸前琥珀暖光伴著一縷可可香亮起。',
    unlocks: ['牠的暖光不是裂開的傷口，而是一片完整透亮的胸鱗。', '三盤塌泡芙的記錄被牠畫在爐邊，下面寫著先問火候。', '你陪牠守住第一爐細小火，牠開心地只吐出一小縷暖氣，沒有再把火加大。', '宴席散了，牠在你身旁耐心等石爐降溫，第一次覺得安靜也能幫上忙。'],
  },
  {
    slot: 'ssr_1', name: '琉糖星翼蝶', species: 'butterfly', element: 'sugar_prism', display: '琉糖光', theme: 'hard_candy_prism_butterfly',
    title: '把微光折成看得見的慶祝', traits: ['敏銳', '輕盈', '珍惜心意'],
    design: '糖果 SSR；一隻大而優美的蝶，四片清晰硬糖薄翼、圓滑莓粉薄荷琥珀分區、星形糖晶脈、細巧絨毛蝶身。玻璃般糖晶溫室、傍晚透光；不是普通花蝴蝶、無甜點羽毛。',
    subject: 'One spectacular but approachable fantasy butterfly with four clearly arranged large translucent HARD-CANDY wings. The wings are smooth polished sugar glass with softly rounded edges, colored berry-pink, mint and amber, and a few star-shaped prismatic sugar veins. A delicate dark-ivory furry butterfly body, two slim antennae, readable symmetrical insect anatomy. It hovers above a low sugar-crystal branch in a luminous confectionery greenhouse at late afternoon, colored light gently refracted onto leaves. The wing material must unmistakably read as glassy hard candy, not flowers, fabric, bird feathers or pastries. Clear calm focal silhouette with jewel-like candy detail.',
    description: '四片硬糖晶翼折出莓粉、薄荷與琥珀光的蝶，是糖晶溫室的細心照看者。牠能讓不起眼的晶芽也被看見，從不要求每一份慶祝都同樣耀眼。',
    lore: '琉糖星翼蝶守著糖晶溫室的初生晶芽。那些晶芽需要穩定的光才能長出清楚糖脈，太強的光反而會讓邊緣碎裂。牠曾把最亮的折光送給所有芽，卻發現最小的一株一直躲在葉後。薄荷拐杖鼬帶牠沿低處小徑走過，牠才看見那株晶芽只需要一束柔和側光。如今牠會逐株調整翼角，讓大小不同的光都能找到位置。宴席前，牠也替每位朋友折一片小光，不按成果的大小排亮暗，而按朋友願意分享的心意。',
    normal: ['把這一點光放在你的第一步上。', '今天不必最亮，只要看得清楚。', '我換個翼角，你看看事情有沒有不同。', '小小晶芽也有自己的糖脈呢。', '先找舒服的光，再慢慢往前。'],
    urgent: ['先照亮最急的那一步！', '光收窄一點，就能看清眼前。', '別追每一道閃光，先到需要的地方。', '要交付的那件，我替你留下清楚光線。', '先處理快碎的邊緣，其他稍後照看。'],
    important: ['重要的晶芽，需要合適的光。', '留出不受打擾的時間，讓糖脈成形。', '先看清真正需要，不必一律加亮。', '你珍惜的這件事，我會安靜陪著。', '讓心意被看見，比讓它刺眼更好。'],
    praise: ['你的進展有自己的光，真好看。', '這束光不是最強，卻剛好照到你。', '小小晶芽長大了，努力看得見啦。', '每一片完成都值得留一點琉糖亮色。', '你願意分享，我就替這份心意折光。'],
    idle: ['翅膀收半片，我們在柔光裡歇歇。', '不用追著亮處走，葉影也很舒服。', '晶芽正慢慢長，現在可以安靜一會。'],
    bond: ['我記得什麼角度的光讓你安心。', '這片小折光，只想留在你手邊。'],
    summon: '糖晶間升起四色薄翼，莓粉與薄荷的折光輕輕落在你的腳邊。',
    unlocks: ['星形糖脈不是貼上去的飾片，而是晶翼自然結出的紋理。', '那株曾躲在葉後的小晶芽如今留在最低的枝上，牠仍每天替它調光。', '你學會從翼角判斷牠是否疲倦，替牠找到一處不用展翅的溫室角落。', '宴席中牠第一次收起耀眼晶翼，停在你身邊，讓別人的微光也成為主角。'],
  },
  {
    slot: 'ssr_2', name: '千層奶霜天鵝', species: 'swan', element: 'millefeuille_cream', display: '奶霜暖香', theme: 'cute_millefeuille_swan',
    title: '把慶祝抱得軟軟的', traits: ['親人', '溫柔', '俏皮'],
    design: '甜點 SSR；使用者特別要求鵝要可愛。幼態圓潤天鵝、短柔S形頸、小圓桃橙喙、亮而溫和深眼；極蓬鬆奶白絨羽。小翅膀和扇尾是清楚的金黃千層酥皮，間隔薄奶霜。不纖長冷艷、不戴冠，保持自然鳥身、友好歪頭，暖窗與淺水倒影。',
    subject: 'One EXCEPTIONALLY CUTE plump baby-like fantasy swan, an irresistibly cuddly companion. It has a round pear-shaped ivory fluffy body, a SHORT softly curved S-shaped neck, a small round head, warm bright dark eyes, a tiny rounded peach-orange beak and very soft whipped-cream down. It tilts its head affectionately toward the viewer. Its two small tucked wings and gently fanned tail are formed from unmistakable delicate golden mille-feuille puff-pastry layers separated by thin ivory cream, with finely crisp flaky edges. The rest stays softly feathered, not an entire cake. Short natural bird feet subtly visible as it sits on a low warm wooden sill beside a shallow reflecting pond and a small plain mille-feuille slice. Warm honey light, cream ivory and toasted pastry gold, softly blurred bakery windows. Prioritize extremely adorable approachable round proportions over regal elegance; no long thin adult swan neck, no crown, no chef clothing. Keep clear swan anatomy, visible natural neck and wings; not a duck toy, not a goose-person.',
    description: '圓滾滾、奶霜羽毛蓬鬆的親人小天鵝，小翅膀與尾羽藏著金黃千層酥皮。牠總歪著頭聽朋友說今天的小事，再用柔柔的暖香陪對方慶祝。',
    lore: '千層奶霜天鵝是烘焙街最受歡迎的小夥伴，短短的頸總往朋友身旁靠，聽每個人說剛完成的事。牠的小翅膀能留住千層酥皮的脆香，卻曾以為慶祝一定要準備一盤又大又漂亮的點心。當方糖絨兔為散掉的糖塔難過時，牠只找到一只小碟，便把第一塊方糖放上去，兩個夥伴還是笑了。從那天起，牠讓每場慶祝從一個能靠近的小位置開始。牠偶爾也會調皮地歪頭，等朋友說完，再把最蓬鬆的奶霜羽毛輕輕挨過去。',
    normal: ['靠過來一點，我想聽你的今天。', '先做一小件，待會一起慶祝呀。', '這片小翅膀旁邊，有你的位置。', '不用準備大盤子，小碟也很可愛。', '我歪頭看著你，等你選第一步。'],
    urgent: ['先端好這只小碟，其他等等。', '時間靠近了，我陪你做最需要的。', '把眼前那一步收好，就能鬆口氣啦。', '別抱太大一盤，先完成能拿穩的。', '我在這裡，你照順序慢慢快一點。'],
    important: ['你在意的事，我想好好聽完。', '替最重要那件留一段暖暖的時間。', '做得合你心意，就值得放上小碟。', '我們先顧好核心，邊角之後再補。', '慶祝不用大，但心意要真實。'],
    praise: ['完成啦！可以靠靠我的軟羽毛。', '我想為你歪一個開心的頭！', '這只小碟裝得下好多努力呢。', '你做到的這一件，我有認真看見。', '酥皮香起來了，今天也有好消息。'],
    idle: ['我坐成圓圓一團，陪你歇一會。', '先別趕，奶霜小翅膀很暖。', '今天沒有大事，也能一起看看水光。'],
    bond: ['聽你說完一天，是我最喜歡的甜。', '想靠過來時，就靠過來吧，我認得你。'],
    summon: '一團奶霜般的蓬鬆羽毛轉向你，小天鵝歪著頭，金黃小翅膀亮得暖暖的。',
    unlocks: ['牠歪頭不是擺姿勢，而是在仔細分辨朋友聲音裡藏著的開心與疲倦。', '那只最初裝方糖的小碟仍在窗邊，牠從不因為碟子小就把它換掉。', '你替牠留下一方能蜷成圓團的軟墊，牠高興地拍了一下小翅膀。', '今天輪到牠分享自己的小進展。你安靜聽完，牠把頭輕輕靠在你身旁。'],
  },
  {
    slot: 'ur_1', name: '蜜曦盛宴小熊貓', species: 'red_panda', element: 'honey_dawn', display: '蜜曦', theme: 'confectionery_feast_red_panda',
    title: '為每個夥伴留一席甜', traits: ['開朗', '包容', '珍惜相聚'],
    design: 'UR代表；天然小熊貓四足坐姿、橘紅毛、白臉黑腿、寬厚焦糖條紋蓬尾。尾圈間一點半透琥珀糖脈，頸側奶霜絨毛、幾片自然蜜晶像葉。共享小桌有糖果與千層點心，暖曦連接溫室烘焙街。非人形國王、非SP星糖萌皇翻版。',
    subject: 'One lovable natural red panda as the warm-hearted centerpiece of a confectionery fantasy region. Rich russet-red fur, white cheek mask, dark natural legs, a wide luxurious ringed tail in caramel and cream curled across the foreground. Fine translucent honey-amber sugar veins glint between some tail rings, and its neck ruff is softly whipped-cream ivory with a few tiny natural honey-crystal leaf shapes. The red panda sits on all four natural paws by a LOW shared wooden table; a few jewel-like hard candies on one side and a small mille-feuille and cream puffs on the other connect candy and pastry. A luminous dawn vista behind unites a sugar-crystal greenhouse and cozy bakery lane, restrained celebratory honey motes and rich atmospheric depth. Both candy and dessert motifs present, red panda remains dominant and readable. Welcoming affectionate face, tactile lavish fur, no throne, crown, royal robe or human posture.',
    description: '橘紅毛、焦糖環尾的小熊貓在糖庭晨光裡召集分享宴席。牠把糖晶與暖香放上同一張小桌，不比誰帶來的甜更多，只確認每位夥伴都有坐下的位置。',
    lore: '蜜曦盛宴小熊貓住在糖晶溫室與烘焙街交會的低木台。牠第一次召集宴席時，忙著挑最亮的糖與最精緻的點心，卻漏看了窗邊安靜等待的奶油曲奇刺蝟。刺蝟沒有抱怨，只把暖好的小布巾放到桌角。小熊貓這才發現，分享不是把桌子堆滿，而是看見誰還沒有位置。如今牠會先繞桌走一圈，確認小、慢、怕生的朋友都能坐下，才讓晨光沿環尾的蜜晶紋亮起。牠不是糖庭的君王，也不掌管誰的努力，只是願意讓每份真實進展都有一席甜味的召集者。',
    normal: ['今天先留一個位置給自己的進展。', '糖和點心都在，第一步由你挑。', '桌子不用堆滿，心意放上來就好。', '我繞一圈看看，你有沒有需要幫忙。', '把今天能做的端到面前，一起開始。'],
    urgent: ['先照顧等著交付的那一席！', '把桌角清出來，眼前這件就能進行。', '時間緊，我們只帶最必要的上桌。', '別忙到忘了自己，先收好核心那件。', '我看著路，你把這一步穩穩送到。'],
    important: ['這一席為你在意的事留下。', '先確認誰需要成果，再決定怎麼做。', '把重要的心意放中央，不必搶著堆高。', '願意長久照顧的事，值得慢慢安排。', '記得自己也在這張桌子旁，有位置休息。'],
    praise: ['到齊啦！你的進展也在桌上了。', '這份甜不是獎給最快的人，是慶祝你做到了。', '我看見你替自己和夥伴都留了位置。', '晨光沿尾巴亮起來了，一起坐下吧。', '今天這一席，有你真實完成的心意。'],
    idle: ['小桌旁有空位，先陪我看看晨光。', '宴席還沒開也沒關係，慢慢準備。', '把尾巴圈好，我們歇一段再走。'],
    bond: ['你來時，我不再只想把桌子準備完美。', '想請你和我一起看看，誰還需要一個位置。'],
    summon: '糖晶溫室與烘焙街交會處亮起蜜色晨光，小熊貓甩開蓬尾，替你留出一席。',
    unlocks: ['牠召集宴席前一定繞桌走一圈，先確認每個夥伴的高度都能夠到桌面。', '桌角那條布巾一直是刺蝟的位置，提醒牠看見安靜的朋友。', '你幫牠加上一塊矮木台，果凍蛙也終於能舒服地靠近分享桌。', '這次牠放心坐在你身旁，讓別的夥伴一起安排宴席。分享的責任，也可以分享。'],
  },
];

export const style = 'Create one finished square collectible pet illustration for QuestNote, an established painterly fantasy-animal game. Full-bleed illustrated environmental background, no transparent cutout. High-detail tactile fur/feathers/scales and believable materials, warm dimensional soft lighting, clear single full-body animal focal subject occupying about 65 percent of the square, enough margin for ears, wings and tail, emotionally welcoming. Honeylight Sugar Garden palette: cream ivory, mint, berry pink, toasted caramel gold. Sophisticated detailed fantasy illustration with gentle charming expression, not flat vector, toy photo or generic sticker. Keep the main silhouette readable at thumbnail size; background scenic but quieter than the creature. One animal only, no extra companion characters. Square 1:1 format, at least 1024 pixels per side.';
export const negative = 'No text, lettering, numbers, logo, watermark, card frame, UI, product packaging, branded candy, humans, humanoid bodies, hands, chef hats, crowns, weapons, gore, extra heads or limbs, cropped ears/wings/tail, split panels, collages, grid, transparent background, plastic toy appearance, flat vector art. No visual indicators of gameplay powers not described in the content.';

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const plan = JSON.parse(await fs.readFile(path.join(workspace, 'plan.json')));
  const bySlot = new Map(roster.map((entry) => [entry.slot, entry]));
  if (plan.pets.length !== 12 || roster.filter((entry) => entry.slot.startsWith('ssr_')).length !== 2) throw new Error('Roster invariant failed');
  for (const allocated of plan.pets) {
    const entry = bySlot.get(allocated.draftId);
    if (!entry) throw new Error('Unrecognized allocated slot');
    allocated.name = entry.name;
    allocated.design = entry.design;
    allocated.phase = 'base';
  }
  await write('plan.json', plan);
  await write('pets.json', { pets: plan.pets.map((allocated) => {
    const e = bySlot.get(allocated.draftId);
    return { id: allocated.petId, name: e.name, rarity: allocated.rarity, image: `assets/pets/${allocated.petId}.png`, description: e.description,
      poolTags: [seriesId], seriesId, speciesType: e.species, element: e.element, visualTheme: e.theme };
  }) });
  await write('pets-lore.json', { version: 1, lore: plan.pets.map((allocated) => {
    const e = bySlot.get(allocated.draftId);
    return { id: allocated.petId, title: e.title, personality: e.traits, element: e.display, lore: e.lore,
      dialogues: { normal: e.normal, urgent: e.urgent, important: e.important, praise: e.praise, idle: e.idle, bondUp: e.bond, summon: e.summon },
      bondUnlocks: Object.fromEntries(e.unlocks.map((text, index) => [String(index + 2), text])) };
  }) });
  await write('prompts.json', { schemaVersion: 1, prompts: Object.fromEntries(plan.pets.map((allocated) => {
    const e = bySlot.get(allocated.draftId);
    return [allocated.petId, { prompt: `${style}\n\nSUBJECT: ${e.subject}`, negativePrompt: negative,
      provenance: 'Built-in image_gen.imagegen planned; one original PNG per pet. No reference images. Exact prompt supplied as prompt + AVOID + negativePrompt. Model, seed and tool version are not exposed and are not guessed. Actual output path/timestamps/SHA-256 are recorded in generation-log.json after generation. User delegated upstream decisions; final image approval remains pending.' }];
  })) });
  console.log(JSON.stringify({ authored: plan.pets.map((p) => ({ id: p.petId, rarity: p.rarity, name: p.name })), imagesGenerated: false }, null, 2));
}
