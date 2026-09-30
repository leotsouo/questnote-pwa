# QuestNote 三套同行世界設計系統

此輪基於 `e346722` 的三套既有偏好，來源版本 V3.4.26。`default / sweet / twilight` 儲存值不改，不新增第四套。正式站發布與來源完成分開記錄。

## Shared QuestNote DNA

產品仍是「把現實任務轉成冒險、成長與陪伴」，並非 RPG 操作台。三套使用相同資訊架構：首頁任務／召喚／圖鑑／探險／更多。習慣、工坊、成就、手冊、教學與設定繼續位於更多。

首頁第一層是今日夥伴與場景，第二層是今日進度及要做的事，第三層是完成所得的星塵、能量與親密度。資源統計在任務之後；完成操作與新增任務在三套中保持相同位置。空收藏引導召喚；已有角色卻沒設定陪伴時引導圖鑑。

相同元件包括：場景、角色名／原圖／撫摸／餵食、進度條、任务列、子任務、原生更多操作、收藏目標、里程碑、篩選器、卡池價格與保底、冒險區域、對話框、狀態回饋、主導覽和風格選擇器。所有獎勵數字讀既有服務，不建立設計用的假 KPI。

### Grid / spacing / typography

以 4px 為基本間距。393px 手機內容左右 22px，320px 左右 18px；內容列可換行，篩選列可橫向捲動；圖片不把文字推離頁面。2 欄收藏保留，卡片間距 16px／窄螢幕 12px。頁末預留 96px 加 `safe-area-inset-bottom`，導覽固定。

| 角色 | 尺寸 | 使用位置 |
|---|---:|---|
| Display | 30px，矮螢幕 24px | 首頁情緒標題 |
| Page title | 28px | 主要頁面 |
| Section | 22px | 今日任務與主要區塊 |
| Quest | 16px / 1.65 | 真實任務標題，完整換行 |
| Body | 15px | 表單及主要閱讀 |
| Metadata | 12px | 日期、目標、說明 |
| Reward | 12px，320px 11px | 每件任務實際收益 |
| Button | 14px | 主要操作 |
| Caption | 11px | 次要狀態與圖片說明 |

字重以 400／500／600 為主；不讓每個數值、標籤都同時粗黑。系統繁體中文字體不依赖外部網路下載；暮光標題優先使用本機宋體類 serif。英文字句只是章節標記，不替代中文操作名稱。

### Semantic colors

`src/themeTokens.css` 是 palette 單一來源，含背景、surface、card、elevated、主要／次要文字、inverse、primary、secondary、accent、success、warning、danger、border、rarity、priority 和 scene。舊元件別名在 body 重新綁定，避免繼承 :root 已解析的舊顏色。

| 角色 | 星夜 | 晨光 | 暮光 |
|---|---|---|---|
| Main background | #101a2b | #fff8f2 | #f3efe6 |
| Card | #18263b | #fffcf8 | #faf7ef |
| Main text | #f4eee1 | #493441 | #27362f |
| Muted text | #b1bdcc | #7b6370 | #656e66 |
| Primary | #b9b0ed | #914b68 | #476952 |
| Secondary | #9ac8d3 | #526f65 | #426275 |
| Reward accent | #e4c38c | #866235 | #796039 |
| Success | #a6c9b4 | #526f65 | #476952 |
| Warning | #e4c38c | #866235 | #855b25 |
| Danger | #f2a6a3 | #ab4551 | #a14e3f |
| Border | #35445b | #dbc8cc | #ced3c5 |
| Hero scene | #101a2b | #f5e8de | #172330 |

稀有度與優先級始終有文字，不只靠顏色。Primary 用於可以採取的行動；reward accent 用於實際收益；danger 只用於刪除、錯誤和緊急。金色不變成滿畫面的装飾框。

### Icons / interaction / motion

採本機固定 Lucide 1.49.0，24px grid、1.7px stroke、round caps；導覽 23px、內文 16px。官方授權與來源存在 `assets/icons/lucide/`。品牌標誌使用生成的 PNG，介面图示才使用官方 SVG。正式 UI emoji 被呈現層替換；任務、暱稱、故事與對話內容不被改寫。

所有主操作有 44px 以上觸控範圍；任務完成即原有 toggle，更多操作保留原生 details／summary。已完成任務有文字、刪線與取消完成名稱。導覽有 `aria-current`，進度有 label／value text。風格選擇有三個 radio、使用中標記、roving tabindex，方向鍵／Home／End 可選擇。

| 動態 | 時間 | 目的 |
|---|---:|---|
| Button feedback | 160ms | 清楚表示按下 |
| Page entrance | 220ms | 輕量定向回饋 |
| Progress update | 550ms | 把完成與今日比例連起來 |
| Companion reaction | 720ms | 原有完成／撫摸事件後短暫回應，配合實際角色對話 |

不加入不斷漂浮的裝飾。系統 `prefers-reduced-motion` 與 App「減少動態」都關閉動畫、transition 與 smooth scroll。三套共享時間與 ease，以一致可用性優先。

## Theme A — 星夜遠行（default）

**在深藍星夜的營地，與幻獸校準今天的目標，把每一次完成化為前行的星光。**

夜色以低亮度 navy 為基底，象牙白文字與少量紫灰行動色；金色只標記旅程及收穫。Sans 標題較俐落，14px card radius 與清楚分隔線形成探索工具的精準感。新主視覺是星空、遠山、森林營地與側邊暖燈。狼坐在右側，左側留給日期／意圖；前景石面與蕨葉、角色中景、月光背景建立層次。

圖鑑的同行區延續同一營地，角色卡片仍用原始角色圖。召喚為下一次營地相遇；探險保留各地區真實 landscape。短反應像亮起的前行提示，不使用霓虹 HUD。

## Theme B — 晨光花園（sweet）

**在柔和晨光的花園，和熟悉的夥伴把日常小事照顧成值得期待的成長。**

保留明亮、溫柔與療癒偏好，改用 warm cream／rose／sage，避免大量糖果色相互競爭。主要操作為深莓色，文字為暖墨色；22px card radius、較柔和 surface 與相同乾淨 sans 帶出親近感。新場景有斜向晨光、花園、石沿與前景花朵；灰黑狼趴下、藍眼直視，並沒有把牠漂白成通用可愛吉祥物。

圖鑑像照顧中的花園冊，召喚像新的生命靠近。相同的任務／親密度反馈更溫和，清楚的對比與觸控範圍保持不變。花與光存在插畫中，不把操作按钮变成裝飾花瓣。

## Theme C — 暮光冒險手帳（twilight）

**在安靜的森林暮色裡，與夥伴把日常小事寫成共同成長的旅程。**

保留已通過的森林夜色、溫暖紙頁、sage 行動與 serif 章節氣質。改善原本角色方圖／文字重疊：重新生成前景木沿、角色中景、遠處暮色與霧層的完整構圖。狼在右侧安静守候，左侧文字低彩度、清楚可读；文字与角色不再争夺同一区域。

內頁使用紙頁、克制分隔、18px cards 和 serif 名稱；圖鑑與召喚的夜色場景自然接到紙面內容。避免把森林理解成金框、宝石、皮革 HUD。完成反應輕柔，重點是「一起寫下一頁」。

## Brand / pet / asset rules

唯一主 App Icon 為 **同行星芽**：象牙白雙耳芽葉、金色種子、向上延伸的曲線，固定深藍背景。雙耳傳達陪伴與傾聽，芽傳達成長，曲線傳達共同旅程；不是把 checklist 與武器拼在一起。1024 master、180 Apple touch、192／512 PWA、獨立 maskable 和 32 favicon 已整合，風格切換不更換 icon。

灰影幼狼維持灰黑毛、藍眼、深色吻部、尖耳及陰影氣質。三個新場景只在實際陪伴／卡池角色就是 `pet_n01` 時使用；其他角色使用原有 stage asset，空收藏顯示環境與正確 CTA，不能假裝擁有灰狼。原圖 viewer 与其他寵物圖片／故事／稀有度保留。

圖資使用版本化的新路徑；不覆盖舊 Q icon 或原始角色檔。WebP 場景1179×786，主圖 PNG1024×1024；完整规格及可重製 prompt 在 `art-assets.md`。三套比較證據、同一份資料與 12 張主要頁面矩陣位於 `reports/theme-round-two/`。

## Review / QA boundary

以 Apple、iF、Red Dot 的公開評判角度作內部定性 review，詳見 `three-theme-jury-review.md`；没有獲獎／報名／評審分數聲明。實際測試報告為 `reports/theme-round-two/verification.md`。桌面瀏覽器手機尺寸不是 iPhone 實機，safe-area、VoiceOver 和原生触控仍需裝置驗收。
