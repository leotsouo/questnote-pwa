# QuestNote 新場景與品牌素材

本輪使用內建 image generation 產生真實 raster asset，參考本機已檢視的灰影幼狼原始 stage 圖。新素材已整合，沒有把 CSS 畫圖或空白 placeholder 當 final。技術轉檔由 `devtools/build-theme-assets.mjs`（Sharp）處理；生成來源 PNG 留在 `reports/theme-round-two/masters/`。

執行 `node devtools/build-theme-assets.mjs` 可從專案保存的 masters 重建 WebP 與各尺寸 icon，不依賴原作者的本機目錄。重新生成時，可把新的 imagegen 輸出資料夾作為唯一參數；檔名映射記錄於工具中。

## 共用角色鎖定

參考 `assets/pets/variants/pet_n01-stage-960-41df3c9be3b1.webp`。灰黑毛、尖耳、藍眼、深吻部、幼狼比例及陰影感固定。允许姿勢／環境／光線改變，不能變白狐、彩色貓、玩具犬或另一種 mascot。不要添加項圈、盔甲、武器、文字、logo、水印與任務數值。

## Hero assets

三張 master 都是 1536×1024、3:2、不透明環境圖；WebP 1179×786、quality82。首頁使用 responsive crop；同一圖資用于对应世界的實際灰狼同行區與标准召喚場景。左側約42%是文案空間，角色在右側約70%；不要把重要臉部放在最右側邊界。文字由 HTML 渲染，不燒在圖片內。

| 素材 | 用途／構圖／光線／姿態 | 檔案 |
|---|---|---|
| Night graywolf | 星夜營地；前景石面蕨葉，狼坐在中景右側，遠山／森林／星空在後；冷月光與少量暖燈形成探索情緒 | `assets/scenes/night-graywolf.webp` |
| Garden graywolf | 晨光花園；石沿、花葉前景，狼趴在右側；peach dawn 側光、明亮但非過曝，灰黑毛仍清楚 | `assets/scenes/garden-graywolf.webp` |
| Twilight graywolf | 森林暮色；前景木沿，狼安靜趴伏，中景霧森林、遠處暖暮光；少量螢火點，低飽和而有層次 | `assets/scenes/twilight-graywolf.webp` |

可重製提示詞（每張都附上述真實角色 reference）：

> Create a polished illustrated 3:2 environment for QuestNote, a calm fantasy productivity app about growing alongside a companion. Preserve the referenced young gray-black wolf: pointed ears, blue eyes, dark muzzle, youthful anatomy and subtle shadow character. Place the actual wolf around 70% from the left, keeping the left 42% quiet for real UI typography. Create layered foreground, character middle ground, and distant background. No text, labels, interface, border, badge, logo, watermark, weapons or costume. Restrained painterly realism, believable fur, atmospheric depth, excellent mobile readability.

分別追加：

- Night: seated alert wolf on a stone ledge in a deep navy forest campsite, fine star field, distant mountains, cool moonlight, one small warm lantern at the right edge, fern foreground. Calm adventurous tone, preserve clean dark left area.
- Garden: relaxed wolf resting its front paws on a garden stone ledge, warm peach dawn from upper right, soft blossom and foliage foreground, distant garden landscape, bright warm left area. Keep the same charcoal fur and blue eyes, no pastel recoloring of the animal.
- Twilight: wolf resting on a forest log ledge at dusk, layered misty trees, distant warm last light, a few restrained fireflies, dark blue green atmosphere. Keep quiet left space and readable character silhouette; no RPG ornaments.

來源記錄：night `exec-931a7803-4735-4549-8d7a-9790cadd64b9.png`；garden `exec-9e6d8d23-849b-4fa5-9ace-87c4b2d81449.png`；twilight `exec-6cdc19a9-a09a-4a45-8c81-de0dc106446c.png`。本機 generated_images 是生成工作區，專案 masters 才是可攜的保存副本。

## App Icon 概念與選擇

概念板1536×1024、3欄2列、不透明。深藍背景、象牙白主形、單一暖金，無文字。每格只探索一個整合符號，不拼接多個字面工具。`reports/theme-round-two/icon-concepts.png` 由 `exec-1bf144b9-c88a-4f95-9bd2-569041b86ca5.png` 保存。

| 概念 | Symbol / meaning | Silhouette / small size | 為何 QuestNote／與 Pet 的關係 |
|---|---|---|---|
| 1 同行之光 | 包覆光點的雙耳形，守護每天的意圖 | 上寬下收；中心細縫較容易縮小消失 | 傾聽與陪伴清楚，成長較間接 |
| **2 同行星芽** | 双耳芽葉、金色種子、延伸曲徑，向上共同成長 | 清楚雙尖、少量大色塊，32px仍有耳／芽和曲線 | 同時有夥伴與成長，路徑與任務旅程一致；抽象而非寵物頭像 |
| 3 月徑 | 月環環繞通往夥伴的路徑 | 單一月形很清楚，但中央路較細 | 夜間冒險強，容易像月相工具，跨三套情緒较弱 |
| 4 歸途之火 | 兩耳般火焰，營地與归属 | 大火形縮小清楚 | 暖冒險與夥伴等待清楚，但與成長關係弱，易像能源品牌 |
| 5 守望 | 耳形護符、金點、向上路径 | 簡潔盾式輪廓，较嚴肅 | 守護與陪伴成立，但不像溫柔日常產品 |
| 6 共行環 | 兩個環抱形组成共行軌跡 | 外環清楚，内部在小尺寸拥挤 | Companion relationship 直接，但旅程与成長較抽象 |

選2是設計判斷，並非用戶研究分數。Primary **同行星芽** 的小尺寸圖仍保持單一金色種子與白色主形，没有字母／微小任务细节。最初 master 後再用 image generation 編輯，降低背景／符號的光澤變化，以 silhouette 为核心；没有用程式重畫標誌。

可重製提示詞：

> Create a primary brand app icon for QuestNote. One integrated ivory silhouette suggests two attentive companion ears as upward growing leaves, with a single warm gold seed between them, continuing into a bold curved path stem. Strong clear silhouette readable at 32px. Flat deep navy background, flat ivory and gold shapes, generous mobile icon safe space, no typography, letters, checklist, sword, generic paw, notebook, literal wolf face, thin details, border, glow, meaningless gradients or watermark. Refine the selected top-middle concept into one confident mark; retain its essential silhouette.

最後生成来源 `exec-193fcd70-1cdb-48f1-b713-b09002e132ea.png`，技術轉為1024 square master。Master不透明、透明背景false；iOS自行套遮罩，不将外部装饰框烧进图。輸出：

- `assets/brand/questnote-icon-master-1024.png`：主品牌／分享素材。
- `questnote-icon-32.png`：favicon。
- `questnote-icon-180.png`：Apple touch。
- `questnote-icon-192.png`、`questnote-icon-512.png`：PWA any。
- `questnote-icon-maskable-512.png`：384px 圖置中、四邊64px navy留白，獨立 maskable。

`devtools/theme-worlds/brand.html` 展示32／48／64／96px、淺／深背景與 iPhone home-screen mockup；该 mockup 明确不是裝置截圖。手機主畫面只有一个 QuestNote icon，App 内3套世界共用它。

## 保留與品質規則

原角色全圖、原圖 viewer、角色名／物種／稀有度／故事，以及全部探索區域 landscape 不覆寫。新場景只對應真實 `pet_n01`；另一位陪伴角色使用自己的原 stage 图。幾何微動只回應真實完成／撫摸事件；畫面不新增假情緒數值或養成規則。

每次新角色場景必须通过物种／轮廓／颜色／名称／原图对照，再看393与320crop。优先确保角色眼睛、吻部与蓝眼未失真，文字背景可读，前景不挡任务。不能只靠生成工具自称高品質；本轮保存运行时截图供实际比较。
