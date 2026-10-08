import fs from 'node:fs';
const seriesId=process.argv[2]||'darkcrown_court_release';
const base='content/pet-series/'+seriesId+'/';const plan=JSON.parse(fs.readFileSync(base+'plan.json'));const draft=JSON.parse(fs.readFileSync('reports/chaos-demon-court/design-draft.json'));
const voices={
 ur_1:['界石','guardian',['冷峻','支配','守約'],'裂冠界石片','你可以同行，卻不能替我決定。','七條路都在抵抗。很好，我記住了。'],
 ur_2:['潮汐門','scout',['傲慢','敏銳','野心'],'月隙銀紋','門由我開，方向由你選。','下一道裂隙，未必通往王座。'],
 ur_3:['終鐘','scholar',['沉靜','精密','執著'],'終鐘靜音簧','鐘聲可以停，約定不能憑空完成。','我留下這一刻，等你親自走過。'],
 ssr_1:['荊誓線','guardian',['桀驁','尖銳','重諾'],'未斷金誓線','我會撕開命令，留下你親口說的約定。','別拿一張契約，代替自己的回答。'],
 ssr_2:['鏡宴','companion',['優雅','狡黠','孤獨'],'無客銀鏡匙','幻宴裡什麼都有，只有真心不能捏造。','這個座位，今日為你保留。'],
 ssr_3:['律輪','scholar',['嚴謹','寡言','自負'],'停律銅齒','規則的缺口，也是一種規則。','別再加速了。先找出卡住的一齒。'],
 ssr_4:['星鏈','guardian',['威嚴','警戒','固執'],'逆向星鏈節','我守的是界線，並非任何人的牢籠。','星光倒轉，也不能抹掉你的名字。'],
 sr_1:['燼羽','scout',['機敏','挑釁','審慎'],'未熄燼羽','塔頂的風變了，我先替你看。','一片羽毛，也能留下警告。'],
 sr_2:['潮索','scout',['耐心','深沉','好勝'],'斷潮水結','潮水會回來，現在正好穿過。','別把所有退路都綁成一個結。'],
 sr_3:['霜祈','guardian',['孤傲','忠於承諾','警覺'],'霜印祈石','別向空白的祈詞低頭。看清前方。','我聽見冰下有腳步，還有人等我們。'],
 sr_4:['夢絨','companion',['好奇','貪心','怕孤單'],'未食夢絨','你的夢太亮了。我先替它擋住黑風。','留一個夢給明天，其餘的慢慢說。'],
 sr_5:['棘令','gatherer',['倔強','守序','敏感'],'逆令棘芽','命令可以折斷，根還會自己找路。','這一叢刺，先替你留一道入口。'],
 r_1:['幽燈','scout',['狡黠','敏捷','念舊'],'不滅燈芯','跟著燈走，但別忘了你要去哪裡。','黑影想借我的火，我偏不給。'],
 r_2:['銹齒','gatherer',['貪藏','靈巧','謹慎'],'銹齒小栓','洞裡有用的東西，我一件也不漏。','舊鎖銹了，門後可不一定空著。'],
 r_3:['墨信','scholar',['安靜','懷疑','有耐心'],'未封墨頁','我把信送到，你要親自讀完。','沒有署名，也不代表沒有自己的聲音。'],
 r_4:['逆芽','gatherer',['敏感','頑固','機靈'],'逆向棘種','被拔掉的芽，也會另找出口。','別踩這裡，我留了一個小洞。'],
 r_5:['煤焰','guardian',['躁動','勇敢','護短'],'暖煤角屑','黑煤下面，火還沒有認輸。','先把最冷的那一步跨過去。'],
 n_1:['微燼','guardian',['膽小','好奇','不肯放棄'],'微燼暖砂','火很小，我會守著它。','今天只亮一點點，也算數。'],
 n_2:['碎冠','gatherer',['勤勞','貪亮','倔強'],'碎冠甲片','大冠裂了，小碎片也能推回去。','這一塊很重，你等我一下。'],
 n_3:['暮紗','scholar',['細心','怕生','執著'],'暮紗線結','我把裂縫縫住，留一條能出去的線。','別把名字封在繭裡，我記得出口。'],
};
const tagsById={ur_1:['fire','astral'],ur_2:['frost','astral'],ur_3:['astral'],ssr_1:['nature','fire'],ssr_2:['astral'],ssr_3:['machine','fire'],ssr_4:['astral'],sr_1:['fire'],sr_2:['frost'],sr_3:['frost'],sr_4:['astral'],sr_5:['nature'],r_1:['astral'],r_2:['machine'],r_3:['astral'],r_4:['nature','harvest'],r_5:['fire'],n_1:['fire'],n_2:['machine'],n_3:['nature']};
const reveal={ur_1:'chaos_crown',ur_2:'chaos_moon',ur_3:'chaos_bell',ssr_1:'chaos_thorn',ssr_2:'chaos_mirror',ssr_3:'chaos_law',ssr_4:'chaos_star'};
const pets=[],lore=[];const eco=JSON.parse(fs.readFileSync(base+'ecosystem.json'));
for(const slot of plan.pets){
 const r=draft.roster.find(r=>r.draftId===slot.draftId);const [anchor,role,traits,token,line1,line2]=voices[r.draftId];const tags=tagsById[r.draftId];
 const element=tags.map(t=>({fire:'餘燼',astral:'蝕星',frost:'裂月霜潮',nature:'黯棘',machine:'灰律銅機',harvest:'逆芽'}[t])).join('／');
 pets.push({id:slot.petId,name:r.name,rarity:r.rarity,image:'assets/pets/'+slot.petId+'.png',description:r.design.storyAction+'；'+r.design.visibleConsequence+'。',poolTags:[seriesId],seriesId,speciesType:r.initialSpecies||r.form,element,visualTheme:'Dark Fantasy 90s Retro Anime & Pop Anime',expeditionSpecialty:role,...(reveal[r.draftId]?{presentation:{revealKey:reveal[r.draftId],revealCaption:anchor+' · '+r.name}}:{})});
 const history='織界的黯冠邊境保留著七地不同的路色。'+r.name+'是王庭的'+(r.initialSpecies||r.form)+'，'+r.design.signature+'。'+r.design.storyAction+'；'+r.design.visibleConsequence+'。牠想要'+r.motive+'。'+r.relationship+'。你們的契約只限制同行時的力量，沒有改寫牠的來歷與野心。';
 const dialogues={normal:[line1,line2,'今天的'+anchor+'還留著一條路。','你的下一步，別讓'+anchor+'替你決定。','我記得你在'+anchor+'前說過的話。'],urgent:['先處理最急的那件，'+anchor+'不會替你等。','危險還沒散。我在'+anchor+'旁盯著。','期限逼近了，讓我們先跨出一步。','別被'+anchor+'的影子帶走時間。','把眼前這件完成，再決定要往哪裡走。'],important:['你親口說的事，比'+anchor+'的命令更重。','這件值得你自己選擇。我會在旁邊。','先守住最重要的名字，再理會王庭的聲音。','別讓'+anchor+'掩住你真正要做的事。','把承諾說清楚，我記得每一個字。'],praise:['這一步是你完成的，'+anchor+'不能據為己有。','你留下了自己的刻痕。很好。','王庭沒有替你動手，這份結果屬於你。','今天的'+anchor+'旁，多了一個完成記號。','我看見了。你沒有把選擇交給黑影。'],idle:['先歇一口氣，'+anchor+'由我照看。','王庭的命令很多，今日不必全聽。','路還在。等你回來，我們再走。'],bondUp:['我把'+token+'交給你，記住這個約定。','同行更久，不代表你必須變成我的影子。']};
 dialogues.summon=r.name+'回應召喚，'+line1;
 const bondUnlocks={2:'牠開始辨認你的腳步，卻仍守著'+anchor+'。',3:'牠把自己的野心與來歷交給你聽。',4:'你們決定同行時保留彼此的選擇。',5:r.awakeningEligible?'牠允許你觸碰化身的界線；完成新的試煉後，才會揭曉另一個姿態。':'牠把'+token+'交給你，仍以原生魔獸的樣子同行。'};
 const invitation='與'+r.name+'完成你選定的一件新任務或習慣，練習在'+anchor+'前保留自己的選擇。';
 const paragraphs=[
 [r.design.storyAction+'。你在'+anchor+'旁停下腳步，看清牠正在改變什麼。',r.design.visibleConsequence+'。牠讓你看見結果，卻沒有替你指定該走哪條路。'],
 [history,'牠的野心沒有被陪伴抹去。你聽完後說，同行不能靠另一道命令維持。'],
 ['你們再次走到'+anchor+'前。牠說：「'+line1+'」你把願意做到的一步說清楚，也保留拒絕其他命令的權利。','牠留下'+token+'作為約定的記號；裂冠的影子還在，你們今天的選擇卻沒有被它收走。'],
 ['牠將'+token+'推到你面前，說：「'+line2+'」這份記號只證明你們走過的日常，不是效忠王庭的命令。',r.awakeningEligible?'牠仍以非人形本體站在界線上。另一個姿態尚未開放；若你們願意，要以新的三次日常與一次邊境同行，再確認這份化身契約。':'牠仍保留完整的魔獸本體。你沒有要求牠變成人，也沒有把相處的結果寫成王庭的勝利。'],
 ];
 const story={petId:slot.petId,title:r.name+'的裂冠同行故事',keepsake:{name:token,description:'在'+anchor+'前留下的同行記號；保留各自的意志與原來的名字。'},chapters:[2,3,4,5].map((level,i)=>({level,title:anchor+'・'+['初見','坦白','界線','有名'][i],paragraphs:paragraphs[i],invitation,choices:[{id:'gentle',label:'我會聽，也保留彼此的選擇。',reply:r.name+'回應：「'+line1+'」'},{id:'steady',label:'先完成今天能做到的一步。',reply:r.name+'回應：「'+line2+'」'}],ending:'約定完成後，'+r.name+'在'+anchor+'旁為今日留下記號。牠把'+token+'的來歷再說了一次，沒有要求你交出自己的名字。'}))};
 lore.push({id:slot.petId,title:anchor+'的界線守望',personality:traits,element,lore:history,dialogues,bondUnlocks,bondJourneyStory:story});
 eco.affinities[slot.petId]=tags;eco.affinityNotes[slot.petId]=r.name+'的'+r.design.signature+'與'+anchor+'的故事能力對應'+tags.join('／')+'喜好，不按稀有度給予額外收益。';eco.specialties[slot.petId]={role,reason:r.design.storyAction+'；以此行動對應既有'+role+'派遣專長，不新增收益規則。'};
}
fs.writeFileSync(base+'pets.json',JSON.stringify({pets},null,2)+'\n');fs.writeFileSync(base+'pets-lore.json',JSON.stringify({version:1,lore},null,2)+'\n');
const pool=JSON.parse(fs.readFileSync(base+'pool.json'));pool.presentation={...pool.presentation,heroPetId:plan.pets.find(p=>p.draftId==='ur_1').petId,featuredPetIds:['ur_2','ur_3','ssr_1','ssr_2'].map(id=>plan.pets.find(p=>p.draftId===id).petId),badge:'裂冠降臨',eyebrow:'織界 · 黯冠王庭',tagline:'七色星路仍有名字，黑塔的裂冠正試圖吞下它們。',debutLines:['七色星路','裂冠吞光','王庭降臨'],debutLabel:'黯冠王庭降臨',detailsNote:'二十位原生魔獸；七位 UR／SSR 可完成羈絆覺醒，揭曉人形惡魔。',candidateNote:'本池不含標準池角色；同一角色雙形態保留相同稀有度與收藏。'};fs.writeFileSync(base+'pool.json',JSON.stringify(pool,null,2)+'\n');
eco.food={id:'item_chaos_ember_tart',name:'黯莓餘燼塔',type:'favorite_bond_item',rarity:'R',description:'以森林嫩葉裹住暖燼莓香的小塔；黯紫外皮下留有暖意。喜愛餘燼與星界的夥伴特別喜愛，也用於黯冠王庭的化身儀式。',enabled:true,favoriteTags:['fire','astral'],effect:{bondExp:75,favoriteBonusBondExp:150},recipe:{forest_leaf:3,lava_core:3},futureTags:['bond_item',seriesId]};
eco.materials=[];eco.expedition={decision:'add',reason:'王庭的裂冠侵蝕需要獨立邊境入口，五個篇章連起既有地區而保留舊故事。',reusedAreaIds:['lava_rift'],areas:[{id:'darkcrown_border',name:'黯冠邊境',description:'黑塔裂冠試圖吞沒七色星路；沿著抵抗侵蝕的界石前進，找回每位生命自己的名字。邊境補給仍能採到森林嫩葉。',unlock:{type:'default'},energyCost:5,durationMinutes:60,rewards:{stardust:{min:30,max:60},material:{id:'forest_leaf',name:'森林嫩葉',min:1,max:2},bondExp:10}}]};
eco.releaseNotes='新增20位原生非人形魔獸、7位高階羈絆覺醒候選、黯莓餘燼塔及黯冠邊境。舊故事、經濟、存檔與派遣收益規則保留；食物素材來自邊境森林嫩葉及既有熔岩裂谷。';fs.writeFileSync(base+'ecosystem.json',JSON.stringify(eco,null,2)+'\n');
console.log(JSON.stringify({pets:pets.length,lore:lore.length,bondChapters:lore.length*4,food:eco.food.id,region:eco.expedition.areas[0].id}));
