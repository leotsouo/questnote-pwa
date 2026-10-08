import fs from 'node:fs/promises';
const root='reports/chaos-demon-court/';
const selected=JSON.parse(await fs.readFile(root+'final-art-selection.json','utf8')).images;
const file='data/pet-awakening.json';
const catalog=JSON.parse(await fs.readFile(file,'utf8'));
const legacy=catalog.pets.filter(p=>!selected.some(x=>x.petId===p.petId));
const definitions=[
 ['ur_1','chaos_crown','留住未被吞沒的名字','七路裂冠','裂冠執界者','破環雙角連起七路，界石留下自由裂隙',
 '無晝不肯讓王庭以外的道路擁有名字。你陪牠走過黯冠邊境，逐一記下那些仍抵抗吞光的路標；牠原本壓住界石的爪，終於停在最後一道裂縫前。',
 '儀式裡，黯莓餘燼塔的紅光映入破環雙角。古龍收起雙翼，凝成披黑紅長袍的人形；七道星路沒有歸順，卻獲得一夜不被抹除的期限。牠仍是王庭的統治者，而你已成為能當面質問牠的人。',
 ['我許你說完，並不代表我會認同。','七條道路的名字，我記住了。','冠冕能遮住光，遮不住你留下的裂縫。']],
 ['ur_2','chaos_moon','讓潮門留下返回的路','裂月潮鱗','月隙行刃者','月刃獨角與銀紫潮光，斷潮之中留一道回流',
 '瑟因割開潮門，只允許向王庭前進的水流。同行時你在逆潮裡繫下一枚路記，牠撞開路記，卻看見後方的小夥伴因此找不到岸。',
 '你將路記重新繫穩。儀式令魔鰩的銀紫鰭翼化為衣袂，月刃獨角仍在額前。瑟因沒有收回封潮的力量，只在刃下保留一條回流：想離開王庭的人，不必再向牠求情。',
 ['這道回流，只留給知道方向的人。','我的刃不鈍，只是換了一處落點。','若你要回去，月隙還開著。']],
 ['ur_3','chaos_bell','聽見鐘聲之外的夢','未鳴鐘繭','終鐘守夢者','金鐘翼紋化為鐘飾，停住的花重新落下一瓣',
 '維爾把每個夢都停在終鐘響起之前。三次日常讓你帶回三段不相同的聲音，牠起初將聲音封進繭，卻發現其中有人仍在呼喚遠方的同伴。',
 '你把餘燼塔放在未落的花旁。夢蛾的翼紋在鐘光裡化為深紫禮服與金鈴，人形的維爾鬆開一枚鐘錘。花瓣落下，夢沒有全部醒來，但呼喚终于可以傳出王庭。',
 ['我聽見了，鐘聲之外的那一句。','一枚鐘錘落下，足夠讓你選一次。','別替別人的夢作答。']],
 ['ssr_1','chaos_thorn','把誓言交還立誓的人','未斷金誓','荊誓裁約者','紅鬃荊角保留金線，契紙裂開卻不傷握紙的手',
 '洛恩以荊角扯緊所有誓言，連從未同意的人也被紅線纏住。你沿邊境找回一份空白契紙，牠要你簽名，你卻先問這份約定允不允許拒絕。',
 '儀式將紅鬃與荊角凝成人形，洛恩戴上黑金手套，撕開紙上強迫立誓的紅線。金線仍在，只有願意立約的人才會觸到它。牠仍善於交易，只不再把沉默當作答應。',
 ['空白處，留給你自己的決定。','我的條件會寫明，你也可以拒絕。','金線沒有斷，枷鎖斷了。']],
 ['ssr_2','chaos_mirror','讓鏡宴有一張真實的席位','留影鏡片','鏡宴留席者','銀狐耳與鏡尾化成鏡飾，虛席之中一盞燈不再重影',
 '奈璃在鏡宴裡映出每位來客最渴望的同伴，讓人忘記離席。你陪牠尋找一位沒有影子的客人，牠端來熟悉的笑容，你卻替真正缺席的人留下一把空椅。',
 '黯莓的紅光照出鏡中的接縫。銀狐收起鏡尾，化成人形，仍端著能幻出萬千宴席的鏡盤；牠第一次讓空椅保持空著，燈火只有一重。失去的人不能被冒認，等待也能是一種陪伴。',
 ['這一席，我不替你填上。','想看幻影，可以；要稱它是真人，我會先問你。','燈沒有重影，你看見的就是今晚。']],
 ['ssr_3','chaos_law','為規則留下停止的刻度','止轉銅齒','灰律停輪者','銅角齒輪胸紋延續，灰階齒輪停在不夾傷人的一格',
 '奧鉻讓齒輪照灰律運行，遲到一步的行旅者會被門扉隔開。你和牠在邊境記下三次等待，牠原本認為等待只是誤差，直到看見有人為扶起同伴而錯過門的刻度。',
 '儀式把銅鴉的角與金屬胸紋化入人形的正裝。奧鉻以手按住齒輪，增加一格能主動停輪的刻度。灰律仍然嚴密，卻第一次承認：守住同伴也能是準時之外的理由。',
 ['這一格，允許停止。','規則要能說明為何，而不只是命令。','先扶穩他，門由我來守。']],
 ['ssr_4','chaos_star','將星鏈的另一端握回自己手中','自持星環','蝕星持鏈者','黑獅星裂與角形延續，星鏈鬆開一段仍握在手中',
 '蝕星獄獅把星鏈扣在抵抗王庭的路標上，胸前裂隙隨每次勒緊而發光。你沒有替牠解開全部鎖鏈，只陪牠辨認哪一節出於自己、哪一節只是王庭的命令。',
 '餘燼映入星裂，獄獅化成人形，黑金獅角與胸前星光仍清楚可見。牠鬆開路標上的一節星鏈，握回末端。力量未曾消失，下一次鎖住誰，必須由牠自己承擔。',
 ['這一節，是我自己選的。','力量可以借來，後果不能推給別人。','星鏈在我手裡，我會看清它通向哪裡。']]
];
const newPets=definitions.map(([id,visual,trialTitle,tokenName,title,signature,...rest])=>{
 const initial=selected.find(x=>x.draftId===id&&x.form==='initial');
 const awakened=selected.find(x=>x.draftId===id&&x.form==='awakened');
 return {petId:initial.petId,name:initial.name,rarity:id.startsWith('ur')?'UR':'SSR',trialTitle,tokenName,title,visual,signature,
 invitation:initial.name+'邀你沿黯冠邊境同行。從接受試煉後的新日常與新派遣，留下三次日常及一次邊境同行的證明；準備黯莓餘燼塔，才揭開人形。',
 story:rest.slice(0,2),dialogue:rest[2],initialSha256:initial.sha256,initialImage:initial.paths,awakenedSha256:awakened.sha256,awakenedImage:awakened.paths};
});
catalog.pets=[...legacy,...newPets];
await fs.writeFile(file,JSON.stringify(catalog,null,2)+'\n');
await fs.writeFile(root+'awakening-content-review.json',JSON.stringify({reviewerType:'ai',legacyCount:legacy.length,newCount:7,principles:['原生魔獸與覺醒人形同名同稀有度','反派力量與身份保留，同行讓角色面對選擇及後果','七份故事、信物與称号不同','人形僅在完成試煉與儀式後顯示'],entries:newPets.map(p=>({petId:p.petId,trialTitle:p.trialTitle,signature:p.signature}))},null,2)+'\n');

