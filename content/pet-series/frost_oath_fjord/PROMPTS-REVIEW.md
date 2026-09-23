# 霜誓峽灣｜美術提示詞審閱 v1

2026-09-23，Asia/Taipei。**五個內容階段均已核准，staging 已完成。** 最新候選見 [Staging 審閱](./STAGING-REVIEW.md)。以下保留當時批准的提示詞與製作方式，生成前敘述不是目前圖片狀態。

使用者已回覆「核准內容」，四份內容來源與該次審閱 hash 一致，已透過原生 Pipeline 封存。這次只需要決定下列畫面設計是否可開始製作；名稱、故事、機率、
全部第一抽開放及主打配置均延續核准版本。

## 共同畫面方向

- **質感：** 延續正式卡圖的細緻毛皮、羽毛、立體光影與完整場景，保留自然獸形與有表情的眼神。
- **地域：** 冰河峽灣、長船、船塢、長屋；冰藍、深海青、雪白為底，少量暖橙誓火與紅褐帆布串起全隊。
- **構圖：** 一張一隻主角、一個清楚動作。角尖、短翼、螯、尾部保留邊界空間，臉與主要職能線索集中，方便小卡圖及圓形裁切辨識。
- **稀有度：** N 是身邊的小勇氣，R 是可靠船員，SR 是專業動作，SSR 擴大到整段航路，UR 呈現全隊誓火匯聚。差異透過尺度、動作與構圖呈現。
- **素材：** 方形、有完整不透明背景的 PNG，提示詞以 1024×1024 為目標。這是製作要求，實際輸出仍須量測；Pipeline 最低 512 px、單張上限 5 MB。超過 2048 px 或 2 MB 另審 warning。

無新增題材禁區。negativePrompt 用於守住已核准的物種、裝備、獸形及無文字／UI／外框等輸出規格，並排除常見肢體或裁切錯誤。

## 12 張畫面摘要

1. **N｜燼囊旅鼠**（`pet_n20`）：金褐圓身旅鼠背陶罐，跳過覆霜棧橋的一道裂縫。橙光只留在罐口與透氣孔；小步向前就是牠的勇敢。

2. **N｜纜結海鸚**（`pet_n21`）：黑白短翼海鸚叼著無字訊旗躍上船首。橙色寬喙、胸前整齊繩結與短翼，讓牠和另外兩種鳥一眼分開。

3. **N｜鉚殼岸蟹**（`pet_n22`）：霧藍扁殼岸蟹在修船台邊扣住滑落的鐵件。船木小匣保持輕量，暖光是爐火反射，甲殼與螯仍是主體。

4. **R｜槳歌斑海豹**（`pet_r17`）：銀灰斑海豹在船邊躍水打拍，救援繩環清楚可見。畫面熱鬧、有水花，但尺度維持近船接應。

5. **R｜鍛火獠豬**（`pet_r18`）：赭鬃四足野豬以前蹄踏動槓桿鍛錘。看得懂牠如何工作；暖火映臉，不能變成人身鐵匠或讓火爐搶走焦點。

6. **R｜織帆雪貂**（`pet_r19`）：乳白長身雪貂沿斜桅收緊帆縫，嘴銜骨梭、前爪扶布。S 形獸身、深色尾尖與微亮補線是辨識重點。

7. **SR｜刻潮築舟狸**（`pet_sr13`）：栗褐河狸在船體骨架中，以槳尾壓木、前爪推楔。短暫暖光沿接點木紋延伸，呈現工藝與傾聽材質的能力。

8. **SR｜霜途馴鹿**（`pet_sr14`）：高腿分枝角馴鹿先踏上雪岩階，再回首招呼隊伍。只標示近處三個真實落腳點，與低身粗角麝牛明確區分。

9. **SR｜峽歌雷鳥**（`pet_sr15`）：圓胸短翼岩雷鳥立在綁牢木桶上領唱。紅色眼冠、覆羽雙足與帶冰晶的弧形音浪清楚；不畫成雷神巨鳥。

10. **SSR｜風眼誓鴉**（`pet_ssr08`）：藍綠黑羽渡鴉側身切入兩道暴風雲牆之間。銅色外翼細紋與羽毛亮邊保持清楚，遠方小船交代整段航路的尺度。

11. **SSR｜深潮領航鯨**（`pet_ssr09`）：光滑深石板藍弓頭鯨斜升至水線，淺色下頷、無背鰭長背與尾鰭可辨。上下水面為單一場景，以低鳴光帶與小船呈現深水尺度。

12. **UR｜破曉誓角麝牛**（`pet_ur07`）：低視角呈現寬肩長毛麝牛迎風踏上岩脊，天然粗角與胸前誓環匯聚暖光。身後航標連成路，突出共同承擔的領袖。

## 與既有正式美術的關係

已實際檢視以下正式 PNG；取用的只是質感、材質或差異比較，不把既有角色造型搬入新池。逐檔 SHA-256 與使用目的保存在每隻的 provenance。

- `pet_r16` 曉露花蝟：細毛、親和表情與完成度；不沿用粉花與花冠。
- `pet_sr12` 晨鈴花雀：羽毛細節與動態；不沿用長尾、花飾或具象音符。
- `pet_ur05` 永眠花皇兔：主打角色的清晰度、毛皮與場景深度；不沿用兔形、月輪、花冠或坐姿。
- `pet_sp09` 維京戰魂：冷光下的木、皮革、鐵與織物；不移植狼形、角盔或盾牌。
- `pet_sp08` 北海霸主：用於確認差異；新鯨維持光滑弓頭鯨輪廓、無背鰭、無冰晶重甲。

## 製作與審閱方式

完整英文 prompt、negativePrompt 與來源說明在 [prompts.json](./prompts.json)。英文 prompt 是供生成工具執行的版本；下方附錄逐字展開 prompt 與 negativePrompt，中文摘要供快速審阅。正式核准對象為該 JSON 的當前 Pipeline outputHash。

核准後使用內建 image_gen，逐隻以完整 prompt 加上兩個換行及 `Avoid: ` + negativePrompt 製作。初次採文字生成，不附參考圖；本輪看到的 PNG 是撰寫提示詞的視覺參照，沒有宣稱已送入生成服務。上述執行方式也存入 provenance。

尚無實際模型版本、seed、生成時間或原圖 hash。生成後另存實際請求、工具回傳的可用資訊、原始路徑／hash 及修訂紀錄，不能杜撰。若需要更改已核准提示詞或新增影像參考的製作方式，先更新提示詞來源並重新審閱該 hash。

圖片生成後，必須另做逐張視覺檢查：物種與配件、四肢／角／翅膀結構、場景動作、色彩一致性、方形及圓形縮圖、文字／水印、實際尺寸／格式／大小。這些是待執行的圖片 QA，不能把提示詞結構通過當成圖片品質通過。

依 [Card Pool Pipeline](../../../docs/card-pool-pipeline.md) 的 prompts → images gate，本次核准只開啟圖片製作。images 核准、完整 validation、staging 與發布 review 仍需各自完成。正式 catalog／assets 未改，本池尚未發行。

## 本輪實際檢查

- 12 個保留 ID 各有獨立且完整的 prompt、非空 negativePrompt、provenance，沒有佔位提示詞。
- 5 份被引用的正式原圖 hash 均核對一致。
- brief、plan、content 的檔案 hash 與核准 receipts 維持有效。
- 完整 Pipeline validation 沒有內容或 prompt 錯誤；目前只剩 12 張尚未生成圖片的 `ENOENT`。12 個 `PET_NO_STANDARD` warning 仍符合獨立新池設定。
- 既有 standard 候選 56、永眠花海 12／16、新池 12／12，沒有刪改既有角色或池。
- `nextStage: prompts`，`readyToStage: false`；未建立 staging。

本輪 prompts outputHash：`a5ea5c0e2112ae6f3bcb6a68e14e0b82c6e2049c552cda7fde1a74e5a5efb58f`。核准前仍需重新 status 並讀取來源，確認沒有變更。

上述提示詞及 12 張選定原圖均已批准並封存；實際請求及輸出紀錄在 generation/。目前已完成 [Staging 候選](./STAGING-REVIEW.md)，不需再次核准相同提示詞或原圖。

## 附錄：逐張完整執行文字

### N｜燼囊旅鼠 — pet_n20

金褐圓身旅鼠背陶罐，跳過覆霜棧橋的一道裂縫。橙光只留在罐口與透氣孔；小步向前就是牠的勇敢。

<details>
<summary>展開英文 prompt 與 negativePrompt</summary>

**Prompt**

```text
Use case: stylized-concept

Asset type: One finished fantasy animal companion illustration for QuestNote, frost_oath_fjord, pet_n20 (N). The identifier and rarity are production metadata, never visible text.

Format: One opaque square full-scene image, target 1024 x 1024 PNG; no card frame or UI. One featured animal and one readable action.

Scene/backdrop: A frost-covered wooden pier in a northern glacier fjord. A single unlit navigation beacon is ahead; distant timber longhouses remain softly out of focus.

Subject: One tiny lemming with a low, round silhouette, fluffy golden-brown fur, round ears and short legs. A small ventilated ceramic ember jar rides securely on its back in coarse woven straps, with one russet cloth corner. Its expressive animal face looks nervous yet determined.

Action and emotion: Catch the lemming in one compact leap across a narrow gap between pier planks. Show the landing plank clearly, with all four natural paws readable and the jar stable. Courage is this small, achievable forward step.

Style/medium: Highly detailed, dimensional fantasy animal illustration, with convincing species anatomy, expressive animal eyes, carefully resolved natural materials, layered atmospheric depth and polished painterly lighting. Nordic Viking-inspired fantasy shipcraft belongs to a new glacier-fjord region in the existing QuestNote world. Make this a collectible companion with courage and warmth, not a human in an animal costume. Any oathfire is a restrained visual expression of fulfilled promises.

Composition/framing: Low three-quarter view, whole animal and jar within the frame with generous air around ears, feet and leap direction. The lemming is the clear foreground subject; the pier leads the eye forward. Keep its face and glowing jar near the central region so they remain recognizable in a small circular crop.

Lighting, palette and materials: Cold ice-blue daylight, soft teal water and white frost; a restrained ember-orange glow comes only from the jar mouth and ventilation holes and warms the nearby fur. Preserve ceramic grain, woven fibers and individual fur strands.

Constraints: Preserve the distinct species, approved equipment and single action. Fill the square with a complete environment. Keep the face and signature role cues readable at 80-96 px; use breathing room rather than edge-to-edge cropping. Use atmosphere, scale and composition for rarity, with clear animal identity. No visible words, captions, logos, watermarks, borders or interface elements.
```

**Negative prompt**

```text
Text, captions, lettering, watermark, logo, card border, rarity badge, UI overlay, collage, contact sheet, multiple panels, multiple featured creatures, transparent or plain studio background, flat vector art, pixel art, plastic toy rendering, human torso or human hands, duplicate heads, fused anatomy, extra limbs, cropped main silhouette, unreadable face, excessive bloom. Mouse with long exposed tail, hamster wheel, rabbit ears, large fox body, burning fur, fiery paws, full-body magical aura, oversized furnace, warrior armor, background characters.
```

</details>

### N｜纜結海鸚 — pet_n21

黑白短翼海鸚叼著無字訊旗躍上船首。橙色寬喙、胸前整齊繩結與短翼，讓牠和另外兩種鳥一眼分開。

<details>
<summary>展開英文 prompt 與 negativePrompt</summary>

**Prompt**

```text
Use case: stylized-concept

Asset type: One finished fantasy animal companion illustration for QuestNote, frost_oath_fjord, pet_n21 (N). The identifier and rarity are production metadata, never visible text.

Format: One opaque square full-scene image, target 1024 x 1024 PNG; no card frame or UI. One featured animal and one readable action.

Scene/backdrop: The wooden prow of a fjord longship beneath distant blue glacier walls, with a clearly visible halyard beside the prow.

Subject: One small puffin: upright teardrop body, crisp black-and-white plumage, broad triangular orange beak, orange webbed feet and short wings. A single loose, orderly nautical rope knot rests on the chest, leaving both wings free; a lightweight flag case sits at one shoulder.

Action and emotion: The puffin hops onto the prow, spreading its short wings for balance while carrying a small plain russet signal flag by its short staff in its beak, delivering it toward the halyard. Its alert eyes and forward lean convey eager, persistent good news.

Style/medium: Highly detailed, dimensional fantasy animal illustration, with convincing species anatomy, expressive animal eyes, carefully resolved natural materials, layered atmospheric depth and polished painterly lighting. Nordic Viking-inspired fantasy shipcraft belongs to a new glacier-fjord region in the existing QuestNote world. Make this a collectible companion with courage and warmth, not a human in an animal costume. Any oathfire is a restrained visual expression of fulfilled promises.

Composition/framing: Three-quarter bird-level view. Show the complete short-winged silhouette, feet, beak and flag with comfortable margins. Keep the face, chest knot and flag close enough to read together at thumbnail size; the ice wall provides a simple contrasting backdrop.

Lighting, palette and materials: Cool ice-blue and deep teal surroundings with soft white feather highlights. Warmth comes mainly from the orange beak and russet flag, with no magical halo. Resolve tiny feathers, weathered rope fibers and worn ship wood.

Constraints: Preserve the distinct species, approved equipment and single action. Fill the square with a complete environment. Keep the face and signature role cues readable at 80-96 px; use breathing room rather than edge-to-edge cropping. Use atmosphere, scale and composition for rarity, with clear animal identity. No visible words, captions, logos, watermarks, borders or interface elements.
```

**Negative prompt**

```text
Text, captions, lettering, watermark, logo, card border, rarity badge, UI overlay, collage, contact sheet, multiple panels, multiple featured creatures, transparent or plain studio background, flat vector art, pixel art, plastic toy rendering, human torso or human hands, duplicate heads, fused anatomy, extra limbs, cropped main silhouette, unreadable face, excessive bloom. Eagle, raven, penguin, long-necked seabird, elongated raptor wings, human hands holding the flag, tied or tangled wings, lettered signal flag, feather crown, floating musical notation, magical halo.
```

</details>

### N｜鉚殼岸蟹 — pet_n22

霧藍扁殼岸蟹在修船台邊扣住滑落的鐵件。船木小匣保持輕量，暖光是爐火反射，甲殼與螯仍是主體。

<details>
<summary>展開英文 prompt 與 negativePrompt</summary>

**Prompt**

```text
Use case: stylized-concept

Asset type: One finished fantasy animal companion illustration for QuestNote, frost_oath_fjord, pet_n22 (N). The identifier and rarity are production metadata, never visible text.

Format: One opaque square full-scene image, target 1024 x 1024 PNG; no card frame or UI. One featured animal and one readable action.

Scene/backdrop: A low wooden ship-repair platform at the edge of an icy fjord. Cold water strikes beneath the planks, while warm longhouse hearth light reaches the work surface from off frame.

Subject: One compact shore crab with a broad, low mist-blue natural carapace, two visibly unequal claws and eight articulated walking legs arranged naturally. A small weathered ship-wood plate and a tiny rivet box are secured on the shell by simple leather straps; the organic shell remains dominant.

Action and emotion: The crab braces low and firmly catches one slipping iron repair fastener at the platform edge with its larger claw. Its smaller claw stabilizes on the plank. The rivet box stays upright and the face conveys stubborn concentration.

Style/medium: Highly detailed, dimensional fantasy animal illustration, with convincing species anatomy, expressive animal eyes, carefully resolved natural materials, layered atmospheric depth and polished painterly lighting. Nordic Viking-inspired fantasy shipcraft belongs to a new glacier-fjord region in the existing QuestNote world. Make this a collectible companion with courage and warmth, not a human in an animal costume. Any oathfire is a restrained visual expression of fulfilled promises.

Composition/framing: Close low three-quarter view, whole crab inside the square with space around claws and leg tips. The caught fastener and eyes sit near the central focus; water and dock structures are secondary, with a clean readable horizontal silhouette.

Lighting, palette and materials: Mist-blue shell and icy teal water against brown timber. A gentle orange hearth reflection reaches the inside of the wooden box; it is reflected light, not a magical glowing box. Show wet shell texture, worn wood grain, salt droplets and dull iron.

Constraints: Preserve the distinct species, approved equipment and single action. Fill the square with a complete environment. Keep the face and signature role cues readable at 80-96 px; use breathing room rather than edge-to-edge cropping. Use atmosphere, scale and composition for rarity, with clear animal identity. No visible words, captions, logos, watermarks, borders or interface elements.
```

**Negative prompt**

```text
Text, captions, lettering, watermark, logo, card border, rarity badge, UI overlay, collage, contact sheet, multiple panels, multiple featured creatures, transparent or plain studio background, flat vector art, pixel art, plastic toy rendering, human torso or human hands, duplicate heads, fused anatomy, extra limbs, cropped main silhouette, unreadable face, excessive bloom. Mechanical crab, robot joints, all-metal shell, complete plate armor, many extra claws, duplicated legs, lobster body or tail, enormous monster scale, blazing magical box, human hands.
```

</details>

### R｜槳歌斑海豹 — pet_r17

銀灰斑海豹在船邊躍水打拍，救援繩環清楚可見。畫面熱鬧、有水花，但尺度維持近船接應。

<details>
<summary>展開英文 prompt 與 negativePrompt</summary>

**Prompt**

```text
Use case: stylized-concept

Asset type: One finished fantasy animal companion illustration for QuestNote, frost_oath_fjord, pet_r17 (R). The identifier and rarity are production metadata, never visible text.

Format: One opaque square full-scene image, target 1024 x 1024 PNG; no card frame or UI. One featured animal and one readable action.

Scene/backdrop: Broken ice and lively water immediately beside a timber longship. A few oars and one rescue float or tied driftwood piece establish the practical near-boat setting.

Subject: One spotted seal with a small rounded head, silver-gray spotted skin, streamlined curved torso and short natural flippers. A coiled rescue rope ring is fixed neatly at the chest side by a fitted harness, with a small russet cloth accent.

Action and emotion: The seal arcs up from the water beside the hull, one foreflipper slapping a crisp splash in a joyful rowing rhythm. Keep the body continuous and the rear flippers readable through clear shallow spray. Its bright expression suggests quick, friendly readiness to turn back and help.

Style/medium: Highly detailed, dimensional fantasy animal illustration, with convincing species anatomy, expressive animal eyes, carefully resolved natural materials, layered atmospheric depth and polished painterly lighting. Nordic Viking-inspired fantasy shipcraft belongs to a new glacier-fjord region in the existing QuestNote world. Make this a collectible companion with courage and warmth, not a human in an animal costume. Any oathfire is a restrained visual expression of fulfilled promises.

Composition/framing: Water-level three-quarter view, one flowing curved silhouette filling the foreground. Keep face, chest rope and flipper action close to the center, with margin around head and rear flippers. The ship provides scale without becoming the subject; spray must not obscure anatomy.

Lighting, palette and materials: Ice-blue daylight and deep teal water, silver wet highlights and restrained russet warmth. Detailed wet skin, individual spots, rope fibers and translucent droplets; energetic light and action rather than a rare-character aura.

Constraints: Preserve the distinct species, approved equipment and single action. Fill the square with a complete environment. Keep the face and signature role cues readable at 80-96 px; use breathing room rather than edge-to-edge cropping. Use atmosphere, scale and composition for rarity, with clear animal identity. No visible words, captions, logos, watermarks, borders or interface elements.
```

**Negative prompt**

```text
Text, captions, lettering, watermark, logo, card border, rarity badge, UI overlay, collage, contact sheet, multiple panels, multiple featured creatures, transparent or plain studio background, flat vector art, pixel art, plastic toy rendering, human torso or human hands, duplicate heads, fused anatomy, extra limbs, cropped main silhouette, unreadable face, excessive bloom. Walrus tusks, sea lion external ear flaps, dolphin body, human arms or legs, giant armored sea monster, heavy scales, ice-crystal plating, oversized magical waves, dominant whale-scale composition.
```

</details>

### R｜鍛火獠豬 — pet_r18

赭鬃四足野豬以前蹄踏動槓桿鍛錘。看得懂牠如何工作；暖火映臉，不能變成人身鐵匠或讓火爐搶走焦點。

<details>
<summary>展開英文 prompt 與 negativePrompt</summary>

**Prompt**

```text
Use case: stylized-concept

Asset type: One finished fantasy animal companion illustration for QuestNote, frost_oath_fjord, pet_r18 (R). The identifier and rarity are production metadata, never visible text.

Format: One opaque square full-scene image, target 1024 x 1024 PNG; no card frame or UI. One featured animal and one readable action.

Scene/backdrop: An open-sided stone forge outside a timber longhouse, with an ice-blue fjord visible beyond. A simple animal-operated lever hammer, anvil and a small ship fastener form one understandable work station.

Subject: One sturdy quadrupedal wild boar with a forward wedge silhouette, deep russet bristles, short powerful legs and short upward-curving tusks. A practical leather chest guard and a few worn iron rings identify the craftsperson while leaving the beast anatomy visible.

Action and emotion: The boar presses a broad low lever with one forehoof, causing the pivoted hammer to strike the ship fastener on the anvil. Its other hooves support its weight naturally. Show this single decisive strike and the boar’s focused, forthright face; the apparatus does the hammering.

Style/medium: Highly detailed, dimensional fantasy animal illustration, with convincing species anatomy, expressive animal eyes, carefully resolved natural materials, layered atmospheric depth and polished painterly lighting. Nordic Viking-inspired fantasy shipcraft belongs to a new glacier-fjord region in the existing QuestNote world. Make this a collectible companion with courage and warmth, not a human in an animal costume. Any oathfire is a restrained visual expression of fulfilled promises.

Composition/framing: Three-quarter view at shoulder height, full boar and the essential lever-to-hammer connection visible. Keep face, tusks and working forehoof central, tools lower and subordinate. Do not hide the short-legged body behind the forge.

Lighting, palette and materials: Warm orange sparks and forge light model the face against cold glacier daylight. Preserve rough bristles, worn leather, matte iron and stone. Sparks are a small concentrated accent at the hammer impact, not a curtain hiding the subject.

Constraints: Preserve the distinct species, approved equipment and single action. Fill the square with a complete environment. Keep the face and signature role cues readable at 80-96 px; use breathing room rather than edge-to-edge cropping. Use atmosphere, scale and composition for rarity, with clear animal identity. No visible words, captions, logos, watermarks, borders or interface elements.
```

**Negative prompt**

```text
Text, captions, lettering, watermark, logo, card border, rarity badge, UI overlay, collage, contact sheet, multiple panels, multiple featured creatures, transparent or plain studio background, flat vector art, pixel art, plastic toy rendering, human torso or human hands, duplicate heads, fused anatomy, extra limbs, cropped main silhouette, unreadable face, excessive bloom. Upright humanoid blacksmith, human hands, hammer held like a person, giant tusks, domestic pink pig, full metal armor, modern industrial machinery, steam engine, guns, body made of fire, forge larger and brighter than the character.
```

</details>

### R｜織帆雪貂 — pet_r19

乳白長身雪貂沿斜桅收緊帆縫，嘴銜骨梭、前爪扶布。S 形獸身、深色尾尖與微亮補線是辨識重點。

<details>
<summary>展開英文 prompt 與 negativePrompt</summary>

**Prompt**

```text
Use case: stylized-concept

Asset type: One finished fantasy animal companion illustration for QuestNote, frost_oath_fjord, pet_r19 (R). The identifier and rarity are production metadata, never visible text.

Format: One opaque square full-scene image, target 1024 x 1024 PNG; no card frame or UI. One featured animal and one readable action.

Scene/backdrop: A diagonal wooden mast beside a billowing russet sail on a fjord longship. Cold wind bows the sail; glimpses of blue ice and water establish the northern voyage.

Subject: One slender ferret with creamy-white fur, a dark-brown tail tip, small pointed ears and a long flexible S-shaped body. A narrow russet shoulder scarf and a little bone-shuttle tool pouch are the only clothing-like equipment.

Action and emotion: The ferret climbs along the diagonal mast, forepaws bracing the cloth while its mouth holds a bone shuttle to pull one repaired sail seam taut. Keep the contact points understandable and the thin flexible tail distinct from the cloth.

Style/medium: Highly detailed, dimensional fantasy animal illustration, with convincing species anatomy, expressive animal eyes, carefully resolved natural materials, layered atmospheric depth and polished painterly lighting. Nordic Viking-inspired fantasy shipcraft belongs to a new glacier-fjord region in the existing QuestNote world. Make this a collectible companion with courage and warmth, not a human in an animal costume. Any oathfire is a restrained visual expression of fulfilled promises.

Composition/framing: Close three-quarter view of the complete ferret along a strong diagonal. Face, shuttle and seam form the central focus; leave breathing room at ears, paws and tail tip. Large simple sail folds support the long silhouette without swallowing it.

Lighting, palette and materials: Cold blue rim light through the sail edge, soft creamy fur highlights and rich russet cloth. A faint warm oathfire trace follows only the freshly repaired knot line. Show woven canvas, small stitches, bone texture, rope and fine fur with convincing material differences.

Constraints: Preserve the distinct species, approved equipment and single action. Fill the square with a complete environment. Keep the face and signature role cues readable at 80-96 px; use breathing room rather than edge-to-edge cropping. Use atmosphere, scale and composition for rarity, with clear animal identity. No visible words, captions, logos, watermarks, borders or interface elements.
```

**Negative prompt**

```text
Text, captions, lettering, watermark, logo, card border, rarity badge, UI overlay, collage, contact sheet, multiple panels, multiple featured creatures, transparent or plain studio background, flat vector art, pixel art, plastic toy rendering, human torso or human hands, duplicate heads, fused anatomy, extra limbs, cropped main silhouette, unreadable face, excessive bloom. Fox proportions, giant bushy tail, rabbit ears, human hands sewing, full human outfit, flower embroidery or garden theme, text on the sail, floating disconnected needlework, magical full-body glow, extra elongated limbs.
```

</details>

### SR｜刻潮築舟狸 — pet_sr13

栗褐河狸在船體骨架中，以槳尾壓木、前爪推楔。短暫暖光沿接點木紋延伸，呈現工藝與傾聽材質的能力。

<details>
<summary>展開英文 prompt 與 negativePrompt</summary>

**Prompt**

```text
Use case: stylized-concept

Asset type: One finished fantasy animal companion illustration for QuestNote, frost_oath_fjord, pet_sr13 (SR). The identifier and rarity are production metadata, never visible text.

Format: One opaque square full-scene image, target 1024 x 1024 PNG; no card frame or UI. One featured animal and one readable action.

Scene/backdrop: An open northern shipyard, within the ribs of a wooden longship under construction. Curved hull beams frame the scene, with a glacier and the new prow visible farther back.

Subject: One substantial beaver with thick chestnut fur, a sturdy block-shaped torso, short strong forelimbs, visible incisors and a broad flat paddle tail. A leather work strap across the chest carries measuring rope and a few wooden wedges.

Action and emotion: The beaver uses its broad tail to hold a curved timber steady and both natural forepaws to push a wedge into the joint. Its head tilts attentively toward the wood as if listening to stress and resonance. Show one credible joining task, with quiet confidence.

Style/medium: Highly detailed, dimensional fantasy animal illustration, with convincing species anatomy, expressive animal eyes, carefully resolved natural materials, layered atmospheric depth and polished painterly lighting. Nordic Viking-inspired fantasy shipcraft belongs to a new glacier-fjord region in the existing QuestNote world. Make this a collectible companion with courage and warmth, not a human in an animal costume. Any oathfire is a restrained visual expression of fulfilled promises.

Composition/framing: Three-quarter working view, whole body and flat tail visible. The face, working paws and joint sit centrally, with the ship ribs creating depth around them. The beaver remains the primary silhouette; the hull communicates skilled responsibility and a wider scene.

Lighting, palette and materials: Cold glacier daylight balanced by a short warm oathfire line tracing wood grain immediately around the secured joint. Render dense fur, scaly paddle-tail texture, fresh-cut and weathered wood, fibrous rope, and small dull iron fittings. The timber stays solid and ordinary beyond that local glow.

Constraints: Preserve the distinct species, approved equipment and single action. Fill the square with a complete environment. Keep the face and signature role cues readable at 80-96 px; use breathing room rather than edge-to-edge cropping. Use atmosphere, scale and composition for rarity, with clear animal identity. No visible words, captions, logos, watermarks, borders or interface elements.
```

**Negative prompt**

```text
Text, captions, lettering, watermark, logo, card border, rarity badge, UI overlay, collage, contact sheet, multiple panels, multiple featured creatures, transparent or plain studio background, flat vector art, pixel art, plastic toy rendering, human torso or human hands, duplicate heads, fused anatomy, extra limbs, cropped main silhouette, unreadable face, excessive bloom. Otter with narrow furry tail, raccoon, human carpenter body or hands, floating summoned ship, giant magical construction beam, steam machinery, electric tools, metal-dominated ship, illegible crowded workbench.
```

</details>

### SR｜霜途馴鹿 — pet_sr14

高腿分枝角馴鹿先踏上雪岩階，再回首招呼隊伍。只標示近處三個真實落腳點，與低身粗角麝牛明確區分。

<details>
<summary>展開英文 prompt 與 negativePrompt</summary>

**Prompt**

```text
Use case: stylized-concept

Asset type: One finished fantasy animal companion illustration for QuestNote, frost_oath_fjord, pet_sr14 (SR). The identifier and rarity are production metadata, never visible text.

Format: One opaque square full-scene image, target 1024 x 1024 PNG; no card frame or UI. One featured animal and one readable action.

Scene/backdrop: A snowy rock staircase above a glacier fjord, with the navigable waterway unfolding far below. Three nearby solid footholds continue ahead along the bank.

Subject: One tall, lightly built reindeer with long legs, fine branching antlers, pale gray-brown winter fur and a black nose. A flat direction stone hangs beside the neck on a narrow woven strap; a small bedroll leaves the deer body unobscured.

Action and emotion: The reindeer places one leading hoof on the next snow-covered rock step and turns its head back invitingly toward the unseen companions behind the viewer. The antler tips cast restrained glimmers onto the next three actual footholds, showing an assessed short route.

Style/medium: Highly detailed, dimensional fantasy animal illustration, with convincing species anatomy, expressive animal eyes, carefully resolved natural materials, layered atmospheric depth and polished painterly lighting. Nordic Viking-inspired fantasy shipcraft belongs to a new glacier-fjord region in the existing QuestNote world. Make this a collectible companion with courage and warmth, not a human in an animal costume. Any oathfire is a restrained visual expression of fulfilled promises.

Composition/framing: Full-body three-quarter view, an elegant rising silhouette with every antler tip and hoof inside generous margins. Keep the turned face and neck stone in the central focus, with the antler spread close enough to remain legible in a circular thumbnail. The cliff and fjord give SR depth without dwarfing the animal.

Lighting, palette and materials: Clear ice-blue morning light, white frost and muted gray-brown fur. Small warm path glimmers contrast with the cold terrain; antlers remain natural bone. Resolve winter hairs, woven strap and rock grain.

Constraints: Preserve the distinct species, approved equipment and single action. Fill the square with a complete environment. Keep the face and signature role cues readable at 80-96 px; use breathing room rather than edge-to-edge cropping. Use atmosphere, scale and composition for rarity, with clear animal identity. No visible words, captions, logos, watermarks, borders or interface elements.
```

**Negative prompt**

```text
Text, captions, lettering, watermark, logo, card border, rarity badge, UI overlay, collage, contact sheet, multiple panels, multiple featured creatures, transparent or plain studio background, flat vector art, pixel art, plastic toy rendering, human torso or human hands, duplicate heads, fused anatomy, extra limbs, cropped main silhouette, unreadable face, excessive bloom. Muskox or bison body, thick unbranched horns, horned helmet, short heavy legs, floating or flying deer, levitating path, newly conjured bridge, prophecy symbols, magical road extending to the horizon, antlers cropped by the frame.
```

</details>

### SR｜峽歌雷鳥 — pet_sr15

圓胸短翼岩雷鳥立在綁牢木桶上領唱。紅色眼冠、覆羽雙足與帶冰晶的弧形音浪清楚；不畫成雷神巨鳥。

<details>
<summary>展開英文 prompt 與 negativePrompt</summary>

**Prompt**

```text
Use case: stylized-concept

Asset type: One finished fantasy animal companion illustration for QuestNote, frost_oath_fjord, pet_sr15 (SR). The identifier and rarity are production metadata, never visible text.

Format: One opaque square full-scene image, target 1024 x 1024 PNG; no card frame or UI. One featured animal and one readable action.

Scene/backdrop: The deck of a fjord longship, with a securely lashed wooden barrel, a nearby sail corner and distant ship silhouettes establishing a shared voyage.

Subject: One rock ptarmigan in winter plumage: a fluffy round white breast, short black tail, vivid red brow combs, feather-covered feet, small brownish beak and short wings. It wears only a russet throat band and a small wooden beat pendant.

Action and emotion: The ptarmigan stands firmly on the barrel, head raised and beak open in a brave leading song, short wings partly spread. Soft arcs of frosty air and sparse ice crystals carry the vocal rhythm toward a fluttering sail corner and a little mist.

Style/medium: Highly detailed, dimensional fantasy animal illustration, with convincing species anatomy, expressive animal eyes, carefully resolved natural materials, layered atmospheric depth and polished painterly lighting. Nordic Viking-inspired fantasy shipcraft belongs to a new glacier-fjord region in the existing QuestNote world. Make this a collectible companion with courage and warmth, not a human in an animal costume. Any oathfire is a restrained visual expression of fulfilled promises.

Composition/framing: Bird-level three-quarter view, complete round-bodied silhouette, short wing tips and feathered feet within the square. Face, red brows, throat band and chest remain the central readable group. The barrel is a simple base; surrounding ship shapes stay secondary.

Lighting, palette and materials: Cold white and ice-blue daylight with translucent air arcs, warm russet cloth and brown wood accents. Render dense tiny feathers and distinct red brow texture. Enthusiasm and teamwork come from posture and breath, not an enormous magical aura.

Constraints: Preserve the distinct species, approved equipment and single action. Fill the square with a complete environment. Keep the face and signature role cues readable at 80-96 px; use breathing room rather than edge-to-edge cropping. Use atmosphere, scale and composition for rarity, with clear animal identity. No visible words, captions, logos, watermarks, borders or interface elements.
```

**Negative prompt**

```text
Text, captions, lettering, watermark, logo, card border, rarity badge, UI overlay, collage, contact sheet, multiple panels, multiple featured creatures, transparent or plain studio background, flat vector art, pixel art, plastic toy rendering, human torso or human hands, duplicate heads, fused anatomy, extra limbs, cropped main silhouette, unreadable face, excessive bloom. Eagle or raven body, puffin beak, long raptor wings, long ornamental tail, lightning deity or mythic thunderbird design, lightning bolts, literal music notes or staff lines, flower crown, human singer with microphone.
```

</details>

### SSR｜風眼誓鴉 — pet_ssr08

藍綠黑羽渡鴉側身切入兩道暴風雲牆之間。銅色外翼細紋與羽毛亮邊保持清楚，遠方小船交代整段航路的尺度。

<details>
<summary>展開英文 prompt 與 negativePrompt</summary>

**Prompt**

```text
Use case: stylized-concept

Asset type: One finished fantasy animal companion illustration for QuestNote, frost_oath_fjord, pet_ssr08 (SSR). The identifier and rarity are production metadata, never visible text.

Format: One opaque square full-scene image, target 1024 x 1024 PNG; no card frame or UI. One featured animal and one readable action.

Scene/backdrop: A high aerial passage between two towering storm-cloud walls above a northern fjord. Through the narrow gap, a tiny longship and a few warm navigation beacons reveal the route far below.

Subject: One large raven with ink-black feathers carrying blue-green iridescence, a thick black beak, broad spread wings and a wedge-shaped tail. One worn iron ring and a short russet streamer hang on an orderly chest rope. Fine copper-colored oath marks trace only the outer flight-feather edges.

Action and emotion: The raven banks decisively through a temporary gap between the cloud walls, reading the moving wind. Show the top of its broad wing span and a clear three-quarter face. The storm continues on both sides; the bird finds the moment to pass.

Style/medium: Highly detailed, dimensional fantasy animal illustration, with convincing species anatomy, expressive animal eyes, carefully resolved natural materials, layered atmospheric depth and polished painterly lighting. Nordic Viking-inspired fantasy shipcraft belongs to a new glacier-fjord region in the existing QuestNote world. Make this a collectible companion with courage and warmth, not a human in an animal costume. Any oathfire is a restrained visual expression of fulfilled promises.

Composition/framing: Aerial three-quarter view with a strong diagonal wing silhouette, complete wing tips and tail inside ample margins. Keep the head, chest ring and wing roots near the central region; retain enough lit feather detail for small square and circular thumbnails. The deep cloud corridor conveys SSR scope.

Lighting, palette and materials: Ice-blue storm light and controlled bright rim light separate every major feather plane from the dark clouds. Small copper feather accents echo orange beacons below. Preserve layered glossy feathers, wet iron and frayed sailcloth, with contrast that never turns the raven into a featureless black cutout.

Constraints: Preserve the distinct species, approved equipment and single action. Fill the square with a complete environment. Keep the face and signature role cues readable at 80-96 px; use breathing room rather than edge-to-edge cropping. Use atmosphere, scale and composition for rarity, with clear animal identity. No visible words, captions, logos, watermarks, borders or interface elements.
```

**Negative prompt**

```text
Text, captions, lettering, watermark, logo, card border, rarity badge, UI overlay, collage, contact sheet, multiple panels, multiple featured creatures, transparent or plain studio background, flat vector art, pixel art, plastic toy rendering, human torso or human hands, duplicate heads, fused anatomy, extra limbs, cropped main silhouette, unreadable face, excessive bloom. Sea eagle, white-headed raptor, yellow eagle beak, puffin or ptarmigan anatomy, extra heads or eyes, human deity costume, huge helmet, storm permanently erased, full-body lightning, cosmic throne, wings clipped by the frame.
```

</details>

### SSR｜深潮領航鯨 — pet_ssr09

光滑深石板藍弓頭鯨斜升至水線，淺色下頷、無背鰭長背與尾鰭可辨。上下水面為單一場景，以低鳴光帶與小船呈現深水尺度。

<details>
<summary>展開英文 prompt 與 negativePrompt</summary>

**Prompt**

```text
Use case: stylized-concept

Asset type: One finished fantasy animal companion illustration for QuestNote, frost_oath_fjord, pet_ssr09 (SSR). The identifier and rarity are production metadata, never visible text.

Format: One opaque square full-scene image, target 1024 x 1024 PNG; no card frame or UI. One featured animal and one readable action.

Scene/backdrop: One coherent split-water-level view of a glacier fjord: icy roots and deep teal water below, a narrow surface band with floating ice and one distant small longship above. It is a single continuous scene through one waterline.

Subject: One immense bowhead-whale-shaped spirit with smooth dark slate-blue skin, a broad arched head, pale lower jaw and a continuous long back with no dorsal fin. Its short pectoral flippers and horizontal tail flukes remain anatomically clear. Sparse warm-gold oath marks follow only the jaw and flipper edges; it wears no armor.

Action and emotion: The whale rises diagonally from the deep toward the waterline with calm, purposeful strength. Soft widely spaced concentric light bands carry its low call toward the ice-wall roots, suggesting it listens for a passable channel. Its mouth stays relaxed and closed.

Style/medium: Highly detailed, dimensional fantasy animal illustration, with convincing species anatomy, expressive animal eyes, carefully resolved natural materials, layered atmospheric depth and polished painterly lighting. Nordic Viking-inspired fantasy shipcraft belongs to a new glacier-fjord region in the existing QuestNote world. Make this a collectible companion with courage and warmth, not a human in an animal costume. Any oathfire is a restrained visual expression of fulfilled promises.

Composition/framing: Wide-lens underwater three-quarter view composed within a square, with the whale occupying most of the image and its complete tail kept readable. Keep the broad head and pale jaw in the central focal area. The tiny boat provides vast scale while the whale remains clear at thumbnail size.

Lighting, palette and materials: Deep teal depth, ice-blue light filtering through translucent ice and restrained warm-gold marks. Render smooth wet skin with subtle natural texture, coherent water refraction and layered underwater depth; sonar light must not hide anatomy.

Constraints: Preserve the distinct species, approved equipment and single action. Fill the square with a complete environment. Keep the face and signature role cues readable at 80-96 px; use breathing room rather than edge-to-edge cropping. Use atmosphere, scale and composition for rarity, with clear animal identity. No visible words, captions, logos, watermarks, borders or interface elements.
```

**Negative prompt**

```text
Text, captions, lettering, watermark, logo, card border, rarity badge, UI overlay, collage, contact sheet, multiple panels, multiple featured creatures, transparent or plain studio background, flat vector art, pixel art, plastic toy rendering, human torso or human hands, duplicate heads, fused anatomy, extra limbs, cropped main silhouette, unreadable face, excessive bloom. Orca black-and-white patches, shark or dolphin dorsal fin, ice-crystal armor, heavy plating, spikes or scales, giant tusks, predatory open jaws, aggressive breaching attack, two separate panels, anatomical body cut at the waterline, tiny unreadable whale.
```

</details>

### UR｜破曉誓角麝牛 — pet_ur07

低視角呈現寬肩長毛麝牛迎風踏上岩脊，天然粗角與胸前誓環匯聚暖光。身後航標連成路，突出共同承擔的領袖。

<details>
<summary>展開英文 prompt 與 negativePrompt</summary>

**Prompt**

```text
Use case: stylized-concept

Asset type: One finished fantasy animal companion illustration for QuestNote, frost_oath_fjord, pet_ur07 (UR). The identifier and rarity are production metadata, never visible text.

Format: One opaque square full-scene image, target 1024 x 1024 PNG; no card frame or UI. One featured animal and one readable action.

Scene/backdrop: A forward rock ridge above a glacier fjord at the first break of dawn. Navigation beacons recede along the ice walls toward a distant longship; their small warm lights converge visually toward the leader.

Subject: One unmistakable quadrupedal muskox with extremely broad shoulders, a low center of gravity, short powerful legs and shaggy floor-length dark-brown hair dusted with frost. Its paired thick natural horns have broad adjoining forehead bosses, sweeping sideways down before turning upward. A chest oath ring, a few weathered wooden guard pieces, small worn iron fittings and russet sailcloth leave the heavy beast silhouette dominant.

Action and emotion: The muskox advances one forehoof onto the ridge against wind-driven ice grit. Its face is visible, calm, bold and inviting others to follow. Warm oathfire gathered from the beacon route concentrates at the chest ring and natural horns, briefly lighting a path through mist; the herd is implied by the shared route rather than painted as extra characters.

Style/medium: Highly detailed, dimensional fantasy animal illustration, with convincing species anatomy, expressive animal eyes, carefully resolved natural materials, layered atmospheric depth and polished painterly lighting. Nordic Viking-inspired fantasy shipcraft belongs to a new glacier-fjord region in the existing QuestNote world. Make this a collectible companion with courage and warmth, not a human in an animal costume. Any oathfire is a restrained visual expression of fulfilled promises.

Composition/framing: Low three-quarter hero view emphasizing width, weight and the forward step. Keep the whole animal, horn tips and visible hooves inside generous margins; center the face, horns and chest ring so they read in a small circular crop. Background scale and depth establish the unique UR presence.

Lighting, palette and materials: Cold blue-white dawn and deep teal fjord shadows against concentrated ember-orange oathfire. Exquisitely resolved long fur, frost, natural horn ridges, woven cloth and worn ship wood. Maintain facial detail and readable dark fur even in the strongest rim light.

Constraints: Preserve the distinct species, approved equipment and single action. Fill the square with a complete environment. Keep the face and signature role cues readable at 80-96 px; use breathing room rather than edge-to-edge cropping. Use atmosphere, scale and composition for rarity, with clear animal identity. No visible words, captions, logos, watermarks, borders or interface elements.
```

**Negative prompt**

```text
Text, captions, lettering, watermark, logo, card border, rarity badge, UI overlay, collage, contact sheet, multiple panels, multiple featured creatures, transparent or plain studio background, flat vector art, pixel art, plastic toy rendering, human torso or human hands, duplicate heads, fused anatomy, extra limbs, cropped main silhouette, unreadable face, excessive bloom. Reindeer antlers, goat horns, horned helmet, wolf or bear body, tall thin deer legs, upright humanoid warrior, hand-held weapons, crown, moon halo, throne, full-body armor, animal made of fire, solitary sea god, summoned army, clipped horn tips.
```

</details>
