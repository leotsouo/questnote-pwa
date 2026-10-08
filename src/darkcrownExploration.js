/** New connective stories; published regional and character lore stays intact. */
export const DARKCROWN_STORIES = Object.freeze({
  darkcrown_border_story_10: '邊境界石刻著七條仍有顏色的路：霧林、火脈、機械遺跡、星界、北境、田野與雲棧。旅人把這片由不同記憶織成的大地稱作織界。黑塔伸出的裂冠正試圖將它們染成同一個名字；你們先替一條熄滅的路重新點燈。',
  darkcrown_border_story_25: '暮紗幼蛛封住信封，緘信墨梟卻將沒有署名的信送出塔外。王庭的魔獸並非失去思考的影子：牠們各有欲望，也各有不願交出的記憶。你們在逆芽棘兔挖出的裂縫找到一張舊路圖，七地的故事依然保留自己的筆跡。',
  darkcrown_border_story_50: '裂月魔鰩划開潮汐門，終鐘夢蛾令鐘下的夢花停在盛開之前。黯冠古龍壓住交界石，要求萬物只聽一道意志。你們沒有擊碎界石，而是把七地傳來的不同回聲留在裂縫裡，讓每一條路仍能走向自己的地方。',
  darkcrown_border_story_75: '荊誓角麒撕裂紅色誓線，鏡宴銀狐的幻宴映出缺席的座位；灰律銅鴉停住齒輪，蝕星獄獅反轉牢鏈上的星光。四股力量沒有消失，王庭也沒有忽然變成善意的家。你們只替同行者留下一份可以自己選擇的約定，拒絕用另一道命令取代裂冠。',
  darkcrown_border_story_100: '黑塔仍在，裂冠仍試圖吞光，七色星路卻不再只靠一處抵抗。邊境路碑留出二十個不同的刻痕，證明每位生命有自己的名字。這條新路將舊地連在一起，沒有重寫任何人的往事；你們帶著各自的記憶，準備面對王庭下一次伸出的影子。',
});
export const DARKCROWN_EXPLORATION = Object.freeze({
  areaId:'darkcrown_border',name:'黯冠邊境',increment:4,
  milestones:[
    {percent:10,title:'七色界石',description:'替仍有名字的星路重新點燈。',storyId:'darkcrown_border_story_10',reward:{stardust:50}},
    {percent:25,title:'無署名的信',description:'找回沒有被王庭抹去的筆跡。',storyId:'darkcrown_border_story_25',reward:{stardust:80,materials:{forest_leaf:5}}},
    {percent:50,title:'裂冠之外',description:'把七地回聲留在界石裂縫裡。',storyId:'darkcrown_border_story_50',reward:{stardust:120,title:'七路守燈者',badgeId:'badge_darkcrown_50'}},
    {percent:75,title:'自行選擇的約定',description:'讓同行者保留自己的意志。',storyId:'darkcrown_border_story_75',reward:{stardust:180,materials:{lava_shard:3}}},
    {percent:100,title:'織界有名',description:'守住七色路線及二十個不同的名字。',storyId:'darkcrown_border_story_100',reward:{stardust:300,materials:{forest_leaf:8},title:'裂冠界線守望者',badgeId:'badge_darkcrown_100'}},
  ],
});
