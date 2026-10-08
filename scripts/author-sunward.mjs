/** One-time, deterministic authoring source for the Sunward Letters pool. */
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('content/pet-series/sunward_letters');
const plan = JSON.parse(await fs.readFile(path.join(root, 'plan.json'), 'utf8'));
const notes = [
  { species: 'field_mouse', element: '田野', role: 'gatherer', tags: ['harvest'], title: '一聲鈴，就是一條路', traits: ['機靈', '細心', '有耐性'],
    incident: '暴雨後，田埂的路標倒成一排，麥鈴田鼠以為只要跑得夠快就能帶大家回家，卻在泥地裡繞回原點。',
    change: '牠學會先看草莖受風的方向，再把小麥穗鈴繫在安全的岔口。', gift: '牠每天在田邊採集穀粒，喜歡帶有田園氣息的食物。',
    line: '聽見鈴聲了嗎？先走乾的那一條。', mark: '麥穗鈴', action: '採集沿路穀粒並辨認田埂素材' },
  { species: 'hedgehog', element: '森林', role: 'guardian', tags: ['nature'], title: '葉下保住的回信', traits: ['謹慎', '溫厚', '肯等待'],
    incident: '雨針刺蝟撿到一封濕信，急著送出去，刺尖卻差點勾破薄薄的信紙。',
    change: '牠改用鼻尖推動寬葉，讓信封先在葉下避雨，等路乾了才護送。', gift: '牠喜歡林間葉香，也珍惜能替信件遮雨的寬葉。',
    line: '信先放在葉下，你也先躲躲雨。', mark: '避雨葉', action: '護住隊伍的信件與補給' },
  { species: 'amber_snail', element: '露水', role: 'scout', tags: ['nature'], title: '最慢的方向線', traits: ['安靜', '可靠', '記路'],
    incident: '露痕蝸牛曾被快跑的夥伴留在後面，卻第一個發現積水石階旁仍有一條高處可走。',
    change: '牠用一路留下的露痕把那條安全線慢慢畫出來，讓晚到的人也能跟上。', gift: '牠常停在森林濕石旁，偏好清淡的自然氣息。',
    line: '跟著亮亮的露痕走，不必趕。', mark: '露痕', action: '先確認潮濕石階的安全路線' },
  { species: 'mountain_goat', element: '山風', role: 'guardian', tags: ['harvest'], title: '迎著風站穩', traits: ['固執', '勇敢', '會道歉'],
    incident: '逆風山羊曾把路標頂得更歪，以為力氣大就能對抗風，差點讓隊伍走向滑坡。',
    change: '牠學會用蹄先穩住木樁，再等麥鈴田鼠確認方向，兩者一起把布條拉直。', gift: '牠常走田野與坡道，喜歡穀香補給。',
    line: '我來壓住木樁，你看清前面的路。', mark: '藍布路標', action: '在強風中守住隊伍的路標' },
  { species: 'swift', element: '風', role: 'scout', tags: ['nature'], title: '把高處連成線', traits: ['敏捷', '守信', '愛回頭'],
    incident: '簷下雨燕飛得最快，卻曾把細布條送到沒有人看得見的樹梢。',
    change: '牠學會先看地上的小獸站在哪裡，再把方向線掛在所有人都能看見的高度。', gift: '牠偏愛森林枝葉的氣味，因為樹梢是牠的路標。',
    line: '布條掛好了，從這裡看得最清楚。', mark: '晴色布帶', action: '從空中探查能越過積水的高路' },
  { species: 'beaver', element: '溪流', role: 'gatherer', tags: ['nature'], title: '先讓水換一條路', traits: ['實在', '耐心', '擅長修補'],
    incident: '補岸河狸看到破岸時急著堆高木枝，卻發現水仍從底部沖走剛修好的路。',
    change: '牠改從低處引水，讓破口旁的草苗與信袋重新露出乾地。', gift: '牠常收集河岸木枝與嫩葉，偏好自然材料的香氣。',
    line: '先看水往哪裡走，再放這根木枝。', mark: '河岸木枝', action: '收集木枝與可用的河岸素材' },
  { species: 'red_fox', element: '晴光', role: 'companion', tags: ['harvest'], title: '讓影子替大家指路', traits: ['靈巧', '樂觀', '願分享'],
    incident: '晴布赤狐第一次把縫好的晴布藏在洞裡，怕風又把大家辛苦修好的東西吹走。',
    change: '看到遠處有小獸迷路，牠終於把晴布帶上高石，讓影子指向乾路。', gift: '牠和田埂上的夥伴一起縫補晴布，喜歡穀香點心。',
    line: '晴布升起來了，現在誰都看得到。', mark: '三角晴布', action: '在同行時協助辨認路線並照看夥伴' },
  { species: 'barn_owl', element: '夜聲', role: 'scholar', tags: ['nature'], title: '霧裡的第二個回音', traits: ['沉著', '善聽', '不武斷'],
    incident: '迴聲夜梟曾把自己聽見的每個回音都當成回答，結果在霧裡繞著同一棵樹飛了三圈。',
    change: '牠開始分辨樹幹與路標的回聲，耐心等到第二個清楚的回音才替夥伴指路。', gift: '牠夜間停在林木間，偏好自然葉香而非耀眼的禮物。',
    line: '再聽一聲，第二個回音才是路標。', mark: '第二個回音', action: '解讀霧中回聲與路標線索' },
  { species: 'river_otter', element: '溪流', role: 'scout', tags: ['nature'], title: '把信筒帶回岸上', traits: ['熱心', '好動', '學會停步'],
    incident: '渡溪水獺最愛搶先跳進溪裡，一次追著漂走的紅繩信筒，差點忘記岸上夥伴正在等牠。',
    change: '牠把信筒穩穩銜回乾石，先確認對岸的藍布路標，才讓大家一個個過溪。', gift: '牠熟悉溪岸草葉，喜歡自然氣味的補給。',
    line: '信筒在我這裡，先看對岸的布標。', mark: '紅繩信筒', action: '探查淺溪與可用的渡口' },
  { species: 'tit', element: '折光', role: 'companion', tags: ['harvest'], title: '雨後的色邊', traits: ['開朗', '敏銳', '懂得節制'],
    incident: '霓羽山雀想讓所有布標都閃亮，結果遠看反而分不出哪條路往哪裡。',
    change: '牠只替每條岔路留下一種水珠折光，讓顏色成為真正有用的約定。', gift: '牠常在田邊布標上歇息，喜歡穀香與暖陽。',
    line: '這條是金邊，回家的方向沒有變。', mark: '布標色邊', action: '在長路中與隊伍核對顏色記號' },
  { species: 'white_deer', element: '風', role: 'guardian', tags: ['nature'], title: '兩條都能走的路', traits: ['穩重', '謙和', '善於協調'],
    incident: '織風白鹿曾想把所有布帶接成唯一的路，卻讓急著送信與需要歇腳的夥伴擠在一處。',
    change: '牠以鹿角輕挑繩結，把路分成兩條互不相撞的通道，讓不同步伐都能抵達。', gift: '牠在森林與草坡間巡行，偏愛清淡葉香。',
    line: '走你的步伐，這兩條路都會到。', mark: '分開的布帶', action: '守住岔路並保護同行者的步調' },
  { species: 'red_crowned_crane', element: '光', role: 'scout', tags: ['harvest', 'nature'], title: '天空終於連成地圖', traits: ['從容', '守約', '願意傾聽'],
    incident: '晴界丹鶴從高處看見所有路，卻曾忘記地上的夥伴還需要一個接一個能踩穩的路標。',
    change: '牠等大家縫好長幅路線布才展翼升空，讓陽光沿布帶照亮連續的乾路，將各自修好的路接成一幅共同的地圖。', gift: '牠珍惜兩地夥伴共同採集的葉與穀，兩種氣息都喜歡。',
    line: '不是我找到的路，是大家一起留下的。', mark: '長幅路線布', action: '從高處探查兩地之間完整的安全路線' },
];

if (notes.length !== plan.pets.length) throw new Error('Roster metadata count mismatch');
const petRows = [];
const loreRows = [];
const affinities = {};
const affinityNotes = {};
const specialties = {};
for (const [index, entry] of plan.pets.entries()) {
  const n = notes[index];
  const name = entry.name;
  const lore = `${n.incident}${n.change}${n.gift}如今牠會把自己的本領留給下一位出發的夥伴，讓雨後的路不只屬於最快抵達的人。`;
  petRows.push({ id: entry.petId, name, rarity: entry.rarity, image: `assets/pets/${entry.petId}.png`,
    description: `${n.title}。${n.incident}${n.change}`, poolTags: ['sunward_letters'], seriesId: 'sunward_letters',
    speciesType: n.species, element: n.element, visualTheme: 'rainwashed_meadow', expeditionSpecialty: n.role });
  loreRows.push({ id: entry.petId, title: n.title, personality: n.traits, element: n.element, lore,
    dialogues: {
      normal: [n.line, `今天先從${n.mark}旁邊的一小步開始。`, '雨聲小了，我們可以一起看看前面的路。', `我把${n.mark}留在看得見的地方。`, '走累了就停一會兒，路標會等你。'],
      urgent: [`先做最急的事，${n.mark}我會替你看著。`, n.line, '把現在能完成的一步放在前面，其他稍後再接上。', '時間快到了，我們先確認方向再出發。', '這一段交出去就好，不必一次修好整條路。'],
      important: [`重要的事值得停在${n.mark}旁想清楚。`, '先找出真正要送達的人，再決定走哪條路。', `我會用${n.mark}幫你記住今天的方向。`, '難走的路可以拆成幾段，一段一段走。', '你在意的事，我會和你一起守住。'],
      praise: [`完成了！${n.mark}又多了一個可靠的記號。`, '我看見你剛才沒有放棄。', '這一步也讓下一位旅人更容易找到路。', '不用比誰先到，你做的事已經有了結果。', '現在可以安心歇口氣，明天再出發。'],
      idle: [`先在${n.mark}旁邊休息吧。`, '暫停不會讓走過的路消失。', '等你準備好，我還在這裡。'],
      bondUp: [`我想把${n.mark}也交給你照看。`, '下一封信，我希望繼續和你一起送。'],
      summon: `${name}循著雨後的路標來到你面前，留下${n.mark}，邀請你一起走完未寄出的那段路。`,
    },
    bondUnlocks: {
      2: `你發現${name}每次出發前都會先確認${n.mark}；那是牠照顧同行者的方式。`,
      3: `${n.incident}${n.change}`,
      4: `${name}把最熟悉的路口畫在你的旅圖上，也願意聽你說想去哪裡。`,
      5: `雨後再次走過初遇之處，${name}不再獨自決定方向。你們一起把${n.mark}留給下一位旅人。`,
    } });
  affinities[entry.petId] = n.tags;
  affinityNotes[entry.petId] = n.gift;
  specialties[entry.petId] = { role: n.role, reason: `${n.action}；內容以 expeditionSpecialty=${n.role} 明確設定，並須核對 getPetSpecialty() 的實際派遣角色。` };
}

const pool = { id: 'sunward_letters', name: '晴信原野', active: true, cost: 100,
  rates: { N: 0.55, R: 0.3, SR: 0.1, SSR: 0.03, UR: 0.02 }, pity: { ssr: 30, ur: 100 },
  tenPullGuarantee: 'SR', petFilter: { poolTags: ['sunward_letters'] },
  presentation: { themeKey: 'default', animationKey: 'none', heroPetId: 'pet_ur21',
    featuredPetIds: ['pet_ssr27', 'pet_ssr28', 'pet_sr38'], badge: '雨後新篇',
    eyebrow: '路標曾被雨帶走，回家的方向沒有。', tagline: '把未送達的心意，一段一段接回來。',
    debutLines: ['雨停後，路標散落在兩地之間。', '跟著夥伴們，把每封信送到家。'], debutLabel: '晴信原野登場', detailsNote: '12 位夥伴從第一抽全部開放；無額外解鎖或贈寵。十連至少一位 SR 以上，沿用現行價格、機率與各池保底。',
    candidateNote: '僅含晴信原野 12 位夥伴，沿用共用召喚揭露；不含其他系列。' } };
const ecosystemPath = path.join(root, 'ecosystem.json');
const ecosystem = JSON.parse(await fs.readFile(ecosystemPath, 'utf8'));
Object.assign(ecosystem, {
  food: { id: 'item_sunward_grain_ring', name: '晴雨穀圈', type: 'favorite_bond_item', rarity: 'R',
    description: '雨後以森林嫩葉包裹豐穗護符的穀香小圈。自然與田園喜好的夥伴特別喜愛。',
    enabled: true, favoriteTags: ['nature', 'harvest'], effect: { bondExp: 75, favoriteBonusBondExp: 150 },
    recipe: { forest_leaf: 3, harvest_charm: 3 }, futureTags: ['bond_item', 'sunward_letters'] },
  materials: [], affinities, affinityNotes, specialties,
  expedition: { decision: 'reuse', reason: '故事發生在既有迷霧森林與豐穗遠郊之間，沒有獨立的新探索、獎勵或材料需求；沿用兩地可讓新增食物的嫩葉與護符都實際取得。',
    reusedAreaIds: ['mist_forest', 'harvest_fields'], areas: [] },
  releaseNotes: '晴信原野新增 12 位夥伴：N 3、R 3、SR 3、SSR 2、UR 1，全部首抽開放，沒有解鎖或贈寵。沿用 100/1000 星塵、N/R/SR/SSR/UR 55/30/10/3/2、SSR 30/UR 100 保底及十連 SR 保障。新食物晴雨穀圈使用森林嫩葉 3 與豐穗護符 3；一般送禮 +75，符合自然/田園偏好時總共 +150、不疊加。逐隻偏好與派遣專長依實際資料核對。故事沿用迷霧森林與豐穗遠郊，不增加地區或材料；召喚沿用共用演出，沒有本池專屬場景。圖片、交易、預覽、離線與人工整包驗收需綁定後續固定產物；本 authoring 內容本身不代表發布。',
});

const write = (name, value) => fs.writeFile(path.join(root, name), `${JSON.stringify(value, null, 2)}\n`);
await Promise.all([
  write('pets.json', { pets: petRows }),
  write('pets-lore.json', { version: 1, lore: loreRows }),
  write('pool.json', pool),
  write('ecosystem.json', ecosystem),
]);
console.log(JSON.stringify({ pets: petRows.length, food: ecosystem.food.id, region: ecosystem.expedition.decision }));
