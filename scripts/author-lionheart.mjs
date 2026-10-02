/** One-time original authoring input. Writes this new workspace only; never publishes. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createPipelineWorkspace } from './cardPoolPipeline.mjs';

const root = path.resolve(import.meta.dirname, '..');
const id = 'lionheart_inverse_oath';
const dir = path.join(root, 'content/pet-series', id);
const write = (name, value) => fs.writeFile(path.join(dir, name), JSON.stringify(value, null, 2) + '\n');
const roster = [
  {
    name: '齒輪拾修鼠', title: '小齒輪也有自己的位置', species: 'workshop_mouse', element: 'machine', display: '機械', role: 'scholar', tags: ['machine'], personality: ['機靈', '勤快', '好奇'],
    lore: '齒輪拾修鼠是逆造工坊最小的學徒，總在大工匠離開後收拾落在地上的零件。牠曾把一枚磨損齒輪偷偷換成新件，讓測試儀恢復運作，也讓尚未準備好的試驗提早開始。自那日起，牠學會修好東西之前先問清用途。牠還不懂追逐神的野心，只知道每一個接回去的零件，都會把城市帶向某個方向。',
    design: '灰褐小鼠、圓耳、細長天然尾與小型黃銅工具腰包。側身以兩隻前爪扶住扳手，把一枚缺齒齒輪換入桌面測試儀；原本停住的陶瓷指針向前移動，磨損零件留在桌邊。小鼠全身與尾尖完整，只有一個主角，微距工坊場景。',
    focus: '磨損齒輪', lesson: '先問清一件事的用途，再替它接上力量', reason: '熟悉齒輪與測試儀，可以解讀零件故障；偏愛工坊作業能量食物。',
    normal: ['這顆少一齒，我先放到另一邊。','大機器停了？讓我看看最小的地方。','你先寫，我替你把零件排好。','修好了，也要問問它接下來會做什麼。','今天只換一顆齒輪，也能讓指針往前。'],
  },
  {
    name: '苗圃護芽甲蟲', title: '留下自然生長的空間', species: 'seedling_beetle', element: 'wood', display: '木', role: 'gatherer', tags: ['nature'], personality: ['耐心', '細心', '倔強'],
    lore: '苗圃護芽甲蟲住在培育溫室的普通苗床，背上有一對像嫩葉的天然鞘翅。研究者忙著記錄奇美拉的成長時，牠仍逐株檢查幼苗。有人以為加熱越快，植物就能長得越好；牠卻頂開過熱的通風蓋，保住了一床險些乾枯的芽。牠不懂完美的定義，只相信每個生命都應有合適的生長速度。',
    design: '翠綠葉形鞘翅、棕色腹節，完整六足與觸角的甲蟲。以前足頂開小溫室通風蓋，凝結水沿蓋邊滑下；一側蜷縮幼芽重新舒展。葉形鞘翅與頂蓋動作同時可見，柔和綠植與銅框溫室，無昆蟲群。',
    focus: '剛舒展的幼芽', lesson: '給每個生命合適的時間與空間', reason: '逐株辨認苗圃植物、適合採集；喜歡清淡植物靈食。',
    normal: ['這株還小，今天先不採。','蓋子開一點，葉子才有空間。','長得慢，也是在長。','露水夠了，我們看看下一株。','你不用趕上別人的速度，先把根站穩。'],
  },
  {
    name: '銅管引水獺', title: '接通城市的呼吸', species: 'pipe_otter', element: 'water_machine', display: '水・機械', role: 'scholar', tags: ['machine'], personality: ['爽朗', '務實', '可靠'],
    lore: '銅管引水獺熟悉獅心城每條冷卻水道。牠曾為研究區讓出整晚水量，直到普通工坊的水輪停轉，才發現宏大的試驗也會擠壓居民的日常。如今牠每次調閥都先算好兩邊所需，爭論最激烈時仍把水送到每一戶。牠不替任何一派喊口號，但從不允許城市因一場研究而停止呼吸。',
    design: '深棕水獺、奶白喉斑、完整四足與長尾，佩小型銅質維修工具袋。站在濕石平台抱住大閥輪轉動，清水沿透明觀測管流向乾涸的冷卻槽，水輪重新轉起。清楚展示閥輪與水流方向，無額外主角。',
    focus: '冷卻閥輪', lesson: '先接通大家真正需要的日常', reason: '可判讀管線與水壓，因此擔任解讀；維修工作後偏愛工坊能量補給。',
    normal: ['水先送到住家，再談試驗。','這裡有回流，我聽得出來。','閥輪慢慢轉，別一下開到底。','今天的工作像管線，一段段接起來。','你把下一步說清楚，我替你找入口。'],
  },
  {
    name: '霜閥巡路兔', title: '在危險旁留下落腳點', species: 'frost_rabbit', element: 'ice', display: '冰', role: 'scout', tags: ['frost'], personality: ['警覺', '謹慎', '熱心'],
    lore: '霜閥巡路兔沿研究區的冷卻管道巡查，以耳尖感受壓力變化。一次試驗前，牠發現常走的踏板已有裂痕，卻因怕打斷研究而沒有立刻回報。夜裡蒸汽洩漏，牠用霜痕帶走受困學徒。從此，牠不再把警告吞回去：再完美的圖紙，也不能取代眼前真正安全的一步。',
    design: '白灰短毛兔、長耳帶淡青霜邊、完整四足，沒有機械肢體。輕踩冷卻管旁的石踏板，一串藍白霜痕繞開洩漏的熱汽；裂痕位於另一側。耳、後足與安全落腳點清楚，低視角巡路場景。',
    focus: '管旁霜痕', lesson: '發現危險就及時說出來', reason: '敏銳辨識低溫路線與危險落腳處，擔任探路；偏愛冰涼食物。',
    normal: ['那塊踏板有裂痕，走這邊。','耳尖聽到的聲音不太對。','不用硬闖，我找得到另一條路。','我留了霜痕，你跟著踩。','有疑問就停一刻，回報也算前進。'],
  },
  {
    name: '爐膛添薪蜥', title: '守住安全的那一格', species: 'furnace_lizard', element: 'fire', display: '火', role: 'guardian', tags: ['fire'], personality: ['直接', '警醒', '護短'],
    lore: '爐膛添薪蜥在獅心城公共蒸汽爐旁長大，胸腹的赤色鱗片能收束火焰。研究者不斷要求更高壓力，牠一度以為火越旺越能幫上忙，直到管道開始震顫。牠把焰舌收回安全範圍，拒絕再照著口令加火。牠並不反對創造，只是不願讓每個還在城市裡生活的生命，替野心承受無限壓力。',
    design: '赤褐鱗蜥、橙色胸腹、完整四足與長尾，爬伏爐口旁。張口把外溢焰舌引回燃燒室，陶瓷壓力錶的指針從紅區退回中段；爐門、火焰與鱗片可辨。無爆炸、無血腥。',
    focus: '爐旁壓力錶', lesson: '力量必須留在能承受的範圍內', reason: '能控制爐火、守住危險現場；偏愛溫熱燻烤補給。',
    normal: ['火够用了，先別加。','指針回到中間，我才放心。','你先做一件，我守著爐口。','熱血可以，過熱不行。','今天也要替明天留一點燃料。'],
  },
  {
    name: '刻紋校準鴞', title: '讓不可能開始運轉', species: 'calibration_owl', element: 'machine', display: '機械', role: 'scholar', tags: ['machine'], personality: ['精準', '自信', '執著'],
    lore: '刻紋校準鴞是逆造工坊最堅定的研究支持者，能以符文刻盤讀出人工器官與翼架的誤差。牠曾把格里芬每片飛羽的角度都量進圖譜，卻發現奇美拉的第一次自主展翼並不照著原型。牠沒有因此撤回研究，而是翻開空白頁。牠相信人工生命的價值不能只靠相似度證明，也明白每次突破都必須記下真正付出的代價。',
    design: '褐白貓頭鷹、清楚面盤、琥珀雙眼與天然雙翼，爪扶黃銅符文刻盤。半展翼轉動刻盤，身旁小型機械翼測試架逐層對齊，錯位與正位刻線對照可見。只有一隻鴞，刻盤無可讀文字，完整翼尖。',
    focus: '符文刻盤', lesson: '把每次突破的誤差與代價都記清楚', reason: '解讀造生控制符文與結構誤差；長時間校準後喜歡工坊補給。',
    normal: ['差了半格，讓我重新量。','原型提供答案，也留下新的問題。','這一頁空著，正好寫你的方法。','誤差不是藉口，是需要處理的資料。','先驗清這一步，再推下一步。'],
  },
  {
    name: '冰軌疾行狐', title: '比爭論更早抵達的消息', species: 'ice_rail_fox', element: 'ice', display: '冰', role: 'scout', tags: ['frost'], personality: ['俐落', '敏銳', '果斷'],
    lore: '冰軌疾行狐往返高崖觀測站與獅心城，把腳下的水汽凝成短暫冰軌。牠親眼看見格里芬逼近試飛塔，也聽見工坊仍在爭論是否繼續。牠沒有替消息加上哪一派的評語，只把時間、風向與距離說清楚。牠知道真相不會自動讓敵人和解，但可以讓其他夥伴少一步誤判。',
    design: '銀灰細身狐狸、冰藍尾尖、完整四足與長尾，沿高架軌道側向疾行。落腳處凝成短冰軌，霜線標出下一段安全落點，後方工坊與遠處高崖形成路線。禁止裁掉尾端或把腿化成輪子。',
    focus: '短暫冰軌', lesson: '把真正看見的事情及時帶回去', reason: '快速勘查高架運輸與城外路線，擔任探路；喜歡清涼補給。',
    normal: ['消息到了，先看時間。','這條軌道我剛跑過，現在安全。','風向變了，我去前面確認。','你寫下事實，我替你留住路線。','快是為了少一次誤判。'],
  },
  {
    name: '赤爐鍛角羊', title: '把野心鍛成能承重的形狀', species: 'forge_ram', element: 'fire', display: '火', role: 'guardian', tags: ['fire'], personality: ['豪爽', '堅定', '認真'],
    lore: '赤爐鍛角羊以耐熱雙角固定工件，是奇美拉人工骨架的鍛造者。牠相信人工生命值得離開培育艙，卻曾因急著追上試飛日期而留下不合格的翼樑。牠親自折斷那件半成品，重新開爐。對牠而言，支持一條劍走偏鋒的道路，不等於把缺陷交給下一個承受重量的生命。',
    design: '深栗羊毛、巨大赤銅色天然彎角、完整四蹄的公羊。以雙角架穩一根灼熱翼樑，前蹄壓住鍛台固定桿；新接頭冷卻凝實，桌邊有裂開的舊工件。爐香火星少量，角與翼樑用途清楚。',
    focus: '承重翼樑', lesson: '要支持一件事，就先讓它承得住重量', reason: '耐熱能力與結構固定可保護鍛造現場；喜歡爐香烘焙食物。',
    normal: ['這根不合格，重鍛。','喊得再響，也不能替翼樑承重。','把材料拿穩，我来接這一下。','你的方法可以不同，接頭得扎實。','先做能承重的部分，後面才飛得起來。'],
  },
  {
    name: '重鉚架橋犀', title: '讓一次真正的試飛有路可走', species: 'rivet_rhino', element: 'machine', display: '機械', role: 'scholar', tags: ['machine'], personality: ['沉著', '可靠', '固執'],
    lore: '重鉚架橋犀負責試飛塔與城市高架的受力結構，天然厚皮外有黃銅工作支架。牠支持奇美拉獲得一次真正試飛，因為牠見過培育室裡那雙不願只看圖紙的眼睛。但支持不等於失去判斷：牠在試飛前拆掉了妨礙居民通行的臨時加壓塔，把研究的重量從公共街道移回工坊。牠想證明，承擔創造的後果，也是創造的一部分。',
    design: '石灰色犀牛、單一天然鼻角、完整四足與小尾，外掛黃銅工作支架。肩背抵住傾斜試飛塔架，支架上的鉚接工具鎖定節點；後方歪斜橫樑逐段恢復水平。低視角強調受力，主角與鉚點清楚，無人類騎士。',
    focus: '試飛塔鉚點', lesson: '把自己支持的選擇連同後果一起扛起來', reason: '理解橋塔結構受力，適合解讀；偏愛耐力與機械能量補給。',
    normal: ['重量移過來，我算過受力。','支持牠試飛，也要保住下面的街道。','這個鉚點固定了，再動下一個。','別急，我還站得住。','你決定的事情，我陪你看清後果。'],
  },
  {
    name: '蒸園盤根龜', title: '研究之外仍有生命', species: 'root_tortoise', element: 'wood', display: '木', role: 'gatherer', tags: ['nature'], personality: ['沉穩', '堅持', '慈愛'],
    lore: '蒸園盤根龜的天然甲殼長著小型蕨葉，根系能感知培育溫室的水與熱。研究者把所有記錄留給奇美拉時，牠仍記得普通苗株的名字。牠反對無限制造生，並非因為畏懼新生命，而是看見追逐完美如何讓現有生命被忽略。牠以根系封住過熱管道，守住未參與試驗的苗床；城內爭論可以繼續，牠腳下的生命不能因此失去明天。',
    design: '深綠棕紋天然龜甲、低矮蕨葉、完整四足與頭尾的陸龜。踏穩溫室石基，甲邊根系纏住過熱管道，葉片承接凝水導入苗床；靠近苗床的蒸汽退去，幼葉保持舒展。不可畫成機器龜。',
    focus: '溫室苗床', lesson: '追求新的答案，也不能遺忘眼前的生命', reason: '熟悉溫室根系、水分與植物資源，擔任採集；偏愛植物靈食。',
    normal: ['先看苗床，它們也在這座城裡。','這片葉子需要水，不需要更大的火。','爭論可以等，根不能等。','你想走得遠，今天先照看近處。','我記得每株幼苗的名字。'],
  },
  {
    name: '天律之冕・格里芬', title: '自然法則的完整形體', species: 'griffin', element: 'wind', display: '風', role: 'scout', tags: ['nature'], personality: ['威嚴', '果決', '不退讓'],
    lore: '天律之冕・格里芬生於獅心城外的高崖。鷹首的感知、天然巨翼的風壓、獅身的力量與魔法在牠體內達成完整平衡，沒有任何人工增強。人們先仰望牠，後來量測牠，最後試圖創造足以取代牠的生命。格里芬拒絕逆造工坊強行拼接生命的道路，尤其不能容忍獅首奇美拉以人工翼架闖入自己的領域。牠可以承認契約者的勇氣，却不會因羈絆放棄這條界線。牠的完美不是裝備帶來的；牠展翼時，自然本身便有了不容侵犯的形體。',
    design: '純生物格里芬：象牙白鷹首、琥珀眼與天然鉤喙，寬大完整的奶白至深褐羽翼、天然鷹前爪、金棕獅身、獅後腿與長獅尾。立於高崖完整展翼，頭轉向遠方試飛塔，爪穩扣岩面；風流匯成巨大自然弧線、雲層沿翼展分開，草葉向外伏倒。低視角莊嚴、全身與翼尖尾端留白。絕對沒有金屬、機械、冠冕、衣物、項圈、護甲或外掛裝備；城市只在遠景。',
    focus: '高崖風界', lesson: '看清風向，守住自己真正認同的界線', reason: '依天然感知判讀氣流與航路，明確指定探路；偏愛清淡植物靈食，不使用機械偏好。',
    normal: ['先看清風向，再決定你的下一步。','高崖之上，每一次振翼都有它的尺度。','我的羽翼不需要工坊替它補足。','你可以接近，但必須知道自己的界線。','那座試飛塔仍在，我不會移開目光。'],
    urgent: ['亂流近了，跟著我的風界走。','現在先守住最急的一步。','不要讓催促替你作決定。','把腳站穩，風不會替猶豫停下。','我擋住這段逆風，你完成眼前的事。'],
    important: ['完美的形體，不需要靠急切證明。','你要守住什麼，先說清楚。','看見力量之前，先看它越過了哪條界線。','我不接受逆造的道路，也不要求你假裝沒有看見。','慎重選擇，再完整地走下去。'],
    praise: ['這一步，站得穩。','我看見你的判斷了。','你沒有把界線交給恐懼。','完成的事，就像收束的風，清楚而完整。','今日的勇氣，值得我記住。'],
    idle: ['停在這裡，看風越過草坡。','休息不會削去你的力量。','我仍望著试飛塔，你可以先歇息。'],
    bondUp: ['我允許你同行，但逆造工坊的道路，我不會認同。','你能走近我的風界，不代表我會向奇美拉退讓。'],
  },
  {
    name: '逆造獅首奇美拉', title: '向完美露齒的人工生命', species: 'biomechanical_chimera', element: 'fire_machine', display: '火・機械', role: 'guardian', tags: ['fire','machine'], personality: ['驕傲', '執拗', '自主'],
    lore: '逆造獅首奇美拉誕生於獅心城培育室。工匠以活體獅首、血肉胸腹與人工器官連接黃銅骨架、蒸汽肢架和機械翼，想重現格里芬那種天然的完整。牠第一次自主呼吸時，便看見牆上作為標準的格里芬圖譜。人們稱讚每一次相似，牠卻想知道何時才能只以自己的名字被衡量。離開培育艙後，牠把人工翼架張向高崖，決意擊敗原型。牠不是沒有感受的機器，也沒有因創造者的期待放棄自主；牠要以劍走偏鋒的力量，證明天然的完美並非不可逾越。與玩家的羈絆，仍不會消解牠對格里芬的敵意。',
    design: '只有一個主要活體獅首的半生物半機械奇美拉：赤棕鬃毛、天然獅形口鼻，絕不使用鳥喙、琥珀獅眼，活體肌肉胸腹與毛皮側腹清楚；黃銅肋架、受控人工器官外殼、羊角形壓力導管、四條血肉與機械融合的獸肢、兩面巨大節段機械翼、蛇形節段調壓尾。站在試飛塔前緣，壓低獅首、完整張開翼面，金屬節點依序鎖定，蒸汽推開兩側吊鏈、腳下平台受力微裂。胸腹呼吸可讀，無裸露傷口或血腥。完整翼尖、四足与尾端，只有一頭，不畫成全機器獅，不增加羊頭。',
    focus: '自主張開的人工翼', lesson: '讓結果證明自己的名字，並承擔每次突破', reason: '人工器官與蒸汽骨架可承受高壓、控制危險能量，擔任守護；喜歡爐熱與機械補給。',
    normal: ['別拿牠的標準量我。看我能做到什麼。','每一次呼吸，都是我自己的。','翼架已經張開，下一步由我選。','牠站在高崖，我就飛到那裡。','人工造的生命，也能咬住自己的命運。'],
    urgent: ['壓力上來了，把眼前這步做完。','別回頭比較，先把推力接上。','我扛住這一下，你把出口打開。','現在只需要一個能落實的決定。','過了這道阻力，再谈下一座高崖。'],
    important: ['模仿給了我身體，選擇才給我方向。','你想突破，就先承認代價。','我不要一個像牠的答案，我要自己的結果。','別用完美當作停止思考的理由。','我不會向格里芬低頭，你也不必替我說和。'],
    praise: ['做到了？把你的名字刻上去。','這個結果屬於你，不屬於別人的標準。','又越過一段阻力，很好。','你沒有等誰允許，便完成了能做的事。','我記住這次突破了。'],
    idle: ['讓壓力降下來，我還要飛。','胸口的節奏沒有停，只是慢一些。','你休息，我看看那座高崖。'],
    bondUp: ['你可以站在我身旁，但別勸我向牠低頭。','你叫的是我的名字。這一點，我會記住。'],
  },
];

const brief = {
  schemaVersion: 1, sopVersion: 2, noExtraCost: true, seriesId: id, poolId: id,
  seriesName: '獅心城・逆造之誓', concept: '人們模仿自然孕育的完美生命格里芬，以魔法與蒸汽造出半生物半機械的獅首奇美拉。原型與人工生命水火不容，獅心城承受追逐神、劍走偏鋒的創造代價。',
  rarityPlan: { N: 2, R: 3, SR: 3, SSR: 2, UR: 2 }, cost: 100,
  rates: { N: .55, R: .3, SR: .1, SSR: .03, UR: .02 }, pity: { ssr: 30, ur: 100 },
  presentationTemplate: id, unlock: null, releaseVersion: '3.5.4',
  productionBaseline: { deployedCommit: '4a1808126b9f6805ddb11c7b16ce1a1d8225ebf8', sourceCommit: '0d450279da0eb31aa01439ba7d875ee5ca28a173', mainCommit: 'ed81995648ba9b60c27207ba1ab3148afa6b2688', artifactId: '5a3ea973a884ae5dcc14c0ffd062963831724de3caa87e284ab37d9a766fd2f8', version: '3.5.3', httpsUrl: 'https://leotsouo.github.io/questnote-pwa/', verifiedAt: '2026-10-01T21:19:13.361Z', unpublishedChanges: 'Formal V3.5.3 and origin/main runtime/catalog sources agree. This clean feature checkout adds reviewed Lionheart presentation, explicit specialty, exploration stories and backup compatibility before authoring init. Existing catalogs and PNGs stay byte-identical; these engineering prerequisites are not deployed.' },
  interview: { theme: '魔法與蒸汽機械；獅心城人們模仿完美格里芬、造出半生物半機械奇美拉，追逐神、劍走偏鋒。', art: '12 隻雙 UR；天律之冕・格里芬純生物無裝備、無實體冠冕；逆造獅首奇美拉单一獅首半生物半機械。兩者敵對，不和解；禁光／暗系，允許場景照明。', experience: '新增獅心城探險地區与獨立卡池、雙 UR 及兩 SSR 動畫。無贈寵、抽數解鎖或陣營機制。使用者明確要求實作已定案計畫。' },
  animationPlan: { decision: 'dedicated', reason: '新作獅心城與自然風界／逆造翼架，直接呈現原型與造物對峙，不沿用其他池場景。全本地 SVG/CSS，無付費動畫服務。', storyboard: '首次入場 6 秒：銅門→天然翼研究→人工翼架→高崖与試飛塔對峙。短轉場 1.5 秒。抽卡前奏 3 秒：啟動650ms→開門750ms→壓力與稀有色900ms→排汽700ms，交接原交易结果。', rarityNotes: '兩 SSR 各2.5秒：鉚接塔架／根系護苗。格里芬4.5秒天然羽翼、風界、分雲；奇美拉4.5秒呼吸與人工驅動同步、翼面鎖定與排汽。十連依既有SSR+ queue順序處理重複，不呈現合作。', motionNotes: '前奏與揭示分別可略過；減少動態前奏500ms、SSR550ms／UR750ms，靜態場景與短淡入。失敗回完整結果。最終使用實際artifact播放頁檢視，不扣款不寫收藏。' },
};

try { await fs.access(path.join(dir, 'pipeline.json')); throw new Error('Authoring workspace already exists; do not overwrite approved input.'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const initialized = await createPipelineWorkspace(root, brief);
const plan = JSON.parse(await fs.readFile(path.join(dir, 'plan.json'), 'utf8'));
const ecosystem = JSON.parse(await fs.readFile(path.join(dir, 'ecosystem.json'), 'utf8'));
const pets = [], lore = [], prompts = {};
const style = 'Create ONE square original collectible fantasy creature story illustration. Painterly detailed realism, tactile fur/feathers/scales and original brass steam machinery where specified, oxidized copper, stone city, restrained teal and amber. Strong character silhouette readable at 160px, subject about 65-80%, all limbs, wing tips and tail inside an 8% safety margin. Show the signature, meaningful story action and its visible consequence. One main creature, no humans, no text, logos, watermark, UI, frame, rarity labels, gore, holy-light or shadow powers. Normal lighting and furnace flame are allowed.';
const costBasis = 'Verified 2026-10-02: official https://learn.chatgpt.com/docs/image-generation states built-in generation counts toward general included Codex usage. Live account ordinaryUsageAllowed=true, included usage usedPercent=9, purchased credits absent and balance=0. Use built-in image_gen only; no API key, third-party paid credits, purchases or subscription. Stop if included access becomes unavailable.';
plan.pets.forEach((slot, i) => {
  const r = roster[i];
  slot.name = r.name; slot.design = r.design;
  const pet = { id: slot.petId, name: r.name, rarity: slot.rarity, image: `assets/pets/${slot.petId}.png`, description: r.title + '。' + r.lore, poolTags: [id], seriesId: id, speciesType: r.species, element: r.element, visualTheme: `${id}_${r.species}`, expeditionSpecialty: r.role };
  if (slot.rarity === 'UR') pet.presentation = { revealKey: i === 10 ? 'lionheart_griffin' : 'lionheart_chimera', revealCaption: i === 10 ? '天然羽翼展開，風界不容逆造。' : '血肉自主呼吸，人工翼架向神挑戰。' };
  if (slot.rarity === 'SSR') pet.presentation = { revealKey: 'ssr', revealCaption: i === 8 ? '鉚接承重，讓創造者承擔自己的選擇。' : '根系守住研究之外的生命。' };
  pets.push(pet);
  const dialogues = { normal: r.normal,
    urgent: r.urgent || [`先看${r.focus}，最急的地方就在眼前。`, '先完成能交出去的一段，我替你守著現場。', `${r.lesson}，现在更要記住。`, '時間緊，先把下一步說清楚。', '別一次加滿壓力，完成這一件再接下一件。'],
    important: r.important || [r.lesson + '。', `像照看${r.focus}一樣，先弄清這件事需要什麼。`, '城市的爭論還在，你的選擇也需要自己的理由。', '先把承諾寫清楚，再看能承擔多少。', '值得用心的事情，要留下查清楚的時間。'],
    praise: r.praise || [`做好了！${r.focus}旁又多了一個完成的記號。`, '這一步有了結果，我看見了。', '你把自己的選擇接穩了。', '今天的進展值得記下，不必和誰比快。', '完成了，就讓壓力慢慢降下來。'],
    idle: r.idle || [`先歇一刻，${r.focus}可以等。`, '我留在這裡，你想好再接下一步。', '城市還有蒸汽聲，我們先聽一會兒。'],
    bondUp: r.bondUp || [`我願意把${r.focus}也交給你照看。`, '下次進城，我想繼續和你同行。'],
    summon: `${r.name}來到你面前，帶著${r.focus}的故事，與你訂下屬於自己的契約。`,
  };
  lore.push({ id: pet.id, title: r.title, personality: r.personality, element: r.display, lore: r.lore, dialogues,
    bondUnlocks: { '2': `你開始看懂${r.name}與${r.focus}的關係。${r.lesson}。`, '3': r.lore, '4': `${r.name}向你說起城內兩派的爭論，也願意聽你說出自己的判斷。陪伴不代表你們必须認同每一件事。`, '5': i === 10 ? '你再次踏上高崖，格里芬讓風界為你留出通路。牠仍望著試飛塔，對奇美拉的敵意未曾改變；允許你同行，是另一份獨立的承諾。' : i === 11 ? '奇美拉讓你靠近自主運轉的翼架，先叫出你的名字，再看向高崖。牠仍要超越格里芬，但不再需要你把牠當成原型的替代品。' : `你們回到最初的工作現場，${r.name}不再只展示自己的本領，也把下一步交給你一起決定。${r.lesson}。` } });
  const negativePrompt = 'extra or missing limbs, cropped wings or tail, duplicate main creatures, human face, distorted animal anatomy, readable text, watermark, border, UI, holy halo, shadow powers, blood, gore' + (i === 10 ? ', ANY machinery or metal on griffin, armor, jewelry, crown, harness, collar, artificial feathers' : i === 11 ? ', all-robot lion, multiple heads, goat head, beak instead of lion muzzle, fully metal chest, exposed organs' : '');
  prompts[pet.id] = { prompt: `${style}\nCharacter: ${r.name} (${slot.rarity}). Required story scene: ${r.design}`, negativePrompt,
    provenance: { tool: 'image_gen.imagegen (built-in)', noExtraCost: true, costBasis, costCheckedAt: '2026-10-01T21:24:00.000Z', status: 'prepared-not-generated', model: null, seed: null, references: [] } };
  ecosystem.affinities[pet.id] = r.tags;
  ecosystem.affinityNotes[pet.id] = r.reason;
  ecosystem.specialties[pet.id] = { role: r.role, reason: r.reason };
});
ecosystem.food = { id: 'item_lionheart_gear_crisp', name: '爐香齒輪酥', type: 'favorite_bond_item', rarity: 'SR', description: '工坊以齒輪靈質塑形、爐熱烘焙而成的可食用酥點，適合喜歡機械與火系禮物的夥伴。', enabled: true, favoriteTags: ['machine','fire'], effect: { bondExp: 75, favoriteBonusBondExp: 150 }, recipe: { machine_part: 3, forest_leaf: 4, lava_core: 1 }, futureTags: ['bond_item', id] };
ecosystem.expedition = { decision: 'add', reason: '獅心城具有獨立造生故事、五個探索里程碑與工坊零件來源；新增一區，保留既有區。', reusedAreaIds: ['machine_ruins','mist_forest','lava_rift'], areas: [{ id: 'lionheart_city', name: '獅心城', description: '高崖與試飛塔隔城對峙。循著銅門、培育溫室與逆造工坊，見證人們模仿完美生命、劍走偏鋒追逐神的代價。回收工坊提供可用古代齒輪。', unlock: { type: 'default' }, energyCost: 5, durationMinutes: 60, rewards: { stardust: { min: 30, max: 60 }, material: { id: 'machine_part', name: '古代齒輪', min: 1, max: 2 }, bondExp: 10 } }] };
ecosystem.releaseNotes = '新增獅心城・逆造之誓12隻雙UR，格里芬純生物無裝備、奇美拉半生物半機械且彼此敵對。新增爐香齒輪酥、逐隻偏好與明確專長、獅心城完整探險與五里程碑、獨立入場和雙UR／兩SSR演出。全部第一抽開放，沿用價格機率保底與交易限制；沒有贈寵、陣營或和解結局。工坊材料來源為獅心城／機械遺跡、森林與熔岩裂谷。不宣稱已發布或通過人工驗收。';
const pool = JSON.parse(await fs.readFile(path.join(dir,'pool.json'),'utf8'));
pool.name = '逆造之誓召喚';
Object.assign(pool.presentation, { heroPetId: pets[10].id, featuredPetIds: [pets[11].id,pets[8].id,pets[9].id], badge: '獅心城系列', eyebrow: '完美的原型，逆造的挑戰', tagline: '他們仰望完美，卻造出了向神露齒的生命。', debutLines: ['仰望天律','逆造之誓','獅心城'], debutLabel: '獅心城・逆造之誓登場' });
await write('plan.json',plan);
await write('pets.json',{pets});
await write('pets-lore.json',{version:1,lore});
await write('prompts.json',{schemaVersion:1,prompts});
await write('pool.json',pool);
await write('ecosystem.json',ecosystem);
await write('authoring-input.json',{origin:'Original Lionheart concept authorized by the user in this chat',roster,artReference:'https://www.metmuseum.org/art/collection/search/472849',adaptation:'Griffin eagle/lion anatomy is traditional; city, conflict, artificial chimera and all character stories are original.'});
console.log(JSON.stringify({seriesId:id,allocation:initialized.allocation || plan.pets.map(({petId,name,rarity})=>({petId,name,rarity})),imagesApproved:false,published:false},null,2));
