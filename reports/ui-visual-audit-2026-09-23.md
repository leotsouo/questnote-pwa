# QuestNote UI / Visual Audit 與第一批 polish 計畫

> 歷史審計，本次補入版本控制。後續 UI polish 已納入 main；本文件不代表目前仍待實作。現況見 [分工文件](../docs/project-governance.md)。

日期：2026-09-23（Asia/Taipei）。狀態：審計與規劃，尚未實作。

## 依據、版本與範圍

- 審計基準：`95a4f5d70233195050f1f0fce2eee3d9945c2b32`，`codex/card-pool-pipeline`，App V3.4.6。這是目前本機 source checkout，不代表正式站目前的畫面。
- 已讀 `AGENTS.md`、`docs/roadmap-progress.md`、`docs/card-pool-pipeline.md`、`docs/pool-content-contract.md`、`docs/release-artifacts.md` 與召喚效能驗收說明。
- `docs/engineering/QUESTNOTE_ARCHITECTURE.md`、`docs/engineering/ROADMAP.md` 不在目前 checkout；搜尋 OneDrive 也未找到，使用者表示不清楚位置。因此沒有聲稱已閱讀這兩份文件；找回後應做規劃差異核對。
- 已檢查 `index.html`、`src/app.js`、`src/bootstrap.js`、`src/styles.css`、`src/ui.js`、`src/preferencesService.js`、task/collection service 與 summon controllers、presentation contract。兩個子代理只讀檢查 CSS 與 UI 流程，沒有同時修改 UI 核心檔。
- `AGENTS.md` 的「無 package.json/npm test」與舊版測試限制已落後於現況：目前有 `package.json` 與整合測試。未因這次審計修改該文件。
- 瀏覽器使用獨立本機 origin `http://127.0.0.1:8917/index.html`，390×844 CSS viewport。以新資料狀態、一筆合成緊急任務及既有本機工具提供的 8 隻測試寵物查看任務、標準/主題召喚、圖鑑、任務 modal、設定、default/sweet。未匯入個人備份或操作正式站。
- 本次屬局部視覺審計，沒有執行完整召喚交易回歸、所有寵物/主題排列、iOS 實機、200% 字體、軟鍵盤與全部 modal 狀態。以下明確區分實測、程式證據與待驗證風險。未改 App 程式、版本、cache、卡池內容或發布設定。

## A. UI / Visual Audit

### 已有的視覺優點

1. **幻想寵物的識別基礎已成立。** 深藍紫底、星塵、稀有度、角色稱號、主題卡池與 SSR/UR 演出形成一致題材；既有寵物圖足以支撐 polish，不需先製作新卡池或換全套素材。
2. **設計 token 與手機容器已存在。** 色彩、間距、圓角、字級、稀有度與任務優先度都已定義；430px 容器、safe area 與固定底部導航符合手機 PWA 定位。證據：`src/styles.css:6`、`:69`、`:92`、`:117`、`:191`。
3. **收藏成長感有完整材料。** 角色圖、星級、碎片、親密度、收藏進度與里程碑能帶出收集樂趣。問題主要在分配視覺重量，而非欠缺內容。
4. **已有可沿用的局部結構。** 單抽共用 class、原圖與詳情分離按鈕、空狀態下一步、卡池 details、reduced motion 與 focus 樣式都已有基礎。保留這些結構比建立新 UI 系統更合適。

### 最影響質感、易讀性與層級的問題

#### F01｜P1｜甜美主題 UR 卡片深底配深字（已實測）

甜美主題的 SR/SSR 卡為淺底，但 UR 卡沿用從 `rgb(20,26,46)` 開始的深色漸層；名稱是 `rgb(184,50,116)`，輔助文字亦偏暗。實際四張 UR 卡的名稱、原圖提示與稱號都不易掃讀。這比單純「配色不喜歡」更優先。

`src/styles.css:126` 的舊 alias 定義於 root，sweet 於 body 改主 token；UR 背景仍引用 `--bg-card`（`:1492`），sweet UR 規則僅改邊框/陰影（`:6843`）。应修受影響的背景/前景配對與 alias 邊界，勿全檔替換所有 token。**不能推論所有 sweet 卡片都有同一錯誤**：本次 sweet 緊急任務卡實際為淺色漸層，並非深底。

#### F02｜P1｜深色任務優先級的左線被覆蓋（已實測）

普通/重要/緊急原本有 3px 語意左線（`src/styles.css:850`），default theme 的高 specificity `border` 把它改回中性色細框（`:5624`）。合成緊急任務的 computed left border 為約 0.67 CSS px 中性色線。badge 仍在，但邊框無法幫助快速掃讀。局部修 cascade 即可，不動任務優先級資料。

#### F03｜P1｜首頁的任務主體出現太晚（已實測，限新使用者情境）

在 390×844 viewport，新使用者沒有陪伴寵物時，任務 tabs 約 y=563、任務內容約 y=681 才開始；此前是資源卡、很高的陪伴空狀態及三個遊戲入口。畫面標題雖是「任務」，首屏的大部分在呈現其他資訊。五張資源卡一次約見三張，隱藏捲軸也弱化後兩項的可發現性。

證據：`index.html:46`、`:74`、`:76`、`:105`；`src/styles.css:314`。優先縮小摘要/空狀態高度、統整間距和捲動提示；保留陪伴與獎勵循環，不建立另一套首頁。已設定陪伴、長文字及展開 hub 須補驗。

#### F04｜P1｜任務標題重複、metadata 與動作爭取注意力（已實測）

新增「整理本週工作重點」後，卡片標題與摘要出現相同一句。service 已取首行作 title（`src/taskService.js:21`），UI preview 又取 content 前兩行（`src/ui.js:2799`）。標題前還有一般/緊急/無截止日/今日四個 badge，底部有完成、移出今日、編輯、刪除，且上方另有完成圓鈕。

先讓單行任務只顯示一次，額外內容才作摘要；降低非必要 metadata 與編輯/刪除的視覺重量。保留所有操作與 data-action，不以這輪為由改資料模型或另造收納選單。完成圓鈕原始規則僅 28×28（`src/styles.css:890`），應驗收有效 hit area 達既有 44px 目標。

#### F05｜P1｜召喚頁的主操作被前置內容推得太遠（已實測）

標準池首屏由通用星形 hero、每日祝福、池選擇、資源、價格、保底與機率占據；主題池又加一大段角色展示。390×844 下主題池單抽按鈕約在 y=1312，遠低於首屏；「幸運轉盤」反而先以醒目主按鈕出現。入場過渡可能讓精確座標有小幅變化，但不影響主次判斷。

證據：`index.html:123` 起召喚結構、`:143` 主題 stage、`:226` 十連按鈕。建議將「目前卡池 → 可用星塵/成本 → 召喚」形成緊湊操作區；通用 hero 與祝福降權，詳細資訊沿用現有 details。機率、保底、解鎖進度仍須可見或有清楚入口，不能為縮短畫面而隱藏條件。

#### F06｜P1｜表單與狀態呈現有未收尾的細節（已實測）

新增任務 modal 的文字區/select 已有深色樣式，日期與子任務輸入卻是白底原生欄位；樣式套用範圍不一致。甜美主題反而另有日期輸入規則（`src/styles.css:7712`）。應保留原生 date 行為、補齊外觀，不新增日期 framework。

設定頁未匯入任何備份，卻顯示「備份恢復完成」。`index.html:569` 本有 hidden，`src/styles.css:3403` 的無條件 `display:flex` 覆蓋它，`src/ui.js:8349` 僅切換 hidden property。這是**状态顯示錯誤**，需局部修正 selector；不屬備份架構重做。

#### F07｜P1 小修 / P2 整理｜圖鑑更像狀態清單，寵物圖的份量偏小（已實測）

頁首收藏數/完成率與下方進度卡重複；里程碑、陪伴、兩排 filters 排在卡片前。每张已獲得卡片有小圖、「點圖看原圖」、名稱、稱號、稀有度、星級、碎片、親密度與兩個操作。按鈕面積與文字比寵物本身更搶眼，珍藏感被操作密度稀釋。

證據：`index.html:235`、`src/ui.js:5814`、`:6021`。讓圖像/名稱優先、meta 聚合、操作穩定對齊，不移除原圖/詳情差異，也不重寫圖鑑延遲渲染。

零收藏空狀態被放進兩欄 grid 的單一格，實際只占左半邊，像少了一張卡；應作全寬空狀態。證據：`src/styles.css:1472`、`:2977`；`src/ui.js:5991`。此項小而明確，可先列 P1。

#### F08｜P2｜共通視覺語法尚未一致（程式與畫面交叉檢查）

- 多個區塊同時使用漸層、光暈、彩色 badge 與大圓角，常態任務介面缺少足夠安靜的區域。召喚可以保留戲劇性；常態操作應收斂裝飾。
- 導航/功能入口混用 emoji、文字符號與精細角色圖，跨平台圖示比例不同；先統一容器、尺寸與基線，暫不做全量新圖示。
- 完成任務/未獲得卡片使用整卡 opacity，文字也變淡（`src/styles.css:858`、`:1497`）；需量測文字與背景配對，不能只以整卡淡化區分狀態。
- 通用 modal 開啟只換 HTML/class（`src/ui.js:1332`），本次新增任務後焦點仍留在背景新增鈕；原圖 viewer 與十連確認卻已有特殊焦點處理。局部統一標題、關閉、捲動、主要動作與焦點；不要更換 modal engine。
- sweet/default 十連結果主次動作權重不一致（`src/ui.js:5498`、`:5630`）。只對齊語意，不要求合併 renderer。

### 頁面先後

先處理跨頁可讀性/狀態錯誤，再依「任務首頁 → 召喚 → 圖鑑/詳情 → 共通 modal 收尾 → 更多/探險等其餘頁面」推進。任務表單的小修可隨首頁先做；圖鑑 UR 與空狀態的小修不必等待整批圖鑑 polish。

## B. 優先順序

### P1 必做

- F01/F02：甜美 UR 卡可讀性、深色任務優先級標示。
- F06/F07 小修：正確隱藏未觸發成功狀態、補齊任務輸入外觀、圖鑑空狀態全寬。
- F03/F04：首屏任務焦點、去除重複內容、建立主次動作。
- F05：召喚池/成本/主操作形成可快速理解的區域。

### P2 很值得做

- 圖鑑卡片圖像比例、名稱基線、meta 與按鈕對齊；減少頁首數字重複。
- 共通 modal 的尺寸/捲動/焦點/內外層返回一致性。
- 正文/meta 字級、語意色、完成/未獲得/disabled 對比統一。
- 導航圖示容器與分頁選中狀態統一；兩主題的同一動作保有同一主次語意。

### P3 可以之後再做

- 大螢幕外框與品牌 framing，保留手機主體，暫不改多欄 dashboard。
- 少量品牌圖示替換、空狀態插圖與更精細轉場。
- CSS 分拆、全面 component 化、全新主題/模板；須另立工程議題，不綁定 polish 完成。

## C. Visual Direction

以下是可用現有 CSS、markup 與素材達成的提案，尚未選定最終方向。

### 方向 1：靜謐星夜・冒險手帳（建議主方向）

保留深藍紫與星塵，讓常態頁以安靜深色表面、清楚文字和穩定留白為主；紫色標主要操作，金色給獎勵/SSR，高彩度集中在寵物與召喚。任務像好讀的每日清單，遊戲性由陪伴及完成回饋帶出。

**適合原因：** 最接近既有 default 的幻想定位，兼顾工作工具與抽卡樂趣。**成本：低至中**，主要是現有樣式權重與局部排版。**邊界：** 不把每張卡都加金邊/光效，不擴建新的 dashboard。

### 方向 2：柔光花園・陪伴記事

沿用 sweet 的奶白、淡粉與少量莓紫，使用深色可讀文字、細邊框、較輕陰影；稀有度以 badge/小面積邊線呈現。任務像輕鬆筆記，寵物像桌邊陪伴者。

**適合原因：** 契合日常任務與療癒陪伴，現有 sweet 已有相當素材。**成本：中**，先修跨 theme 遺留背景與語意色。**邊界：** 不新增第三種 theme，也不把所有動作都塗粉色；兩套 theme 共用資訊層級與動作語意。

### 方向 3：幻獸典藏・精緻卡冊

讓召喚/圖鑑以角色圖、名稱與精簡稀有度章作主角，保留有辨識度的角色框；星級/碎片/親密度聚成低權重資料區。首頁只吸收它的整齊卡片比例，不變成卡牌遊戲大廳。

**適合原因：** 最直接提升既有素材的珍藏感。**成本：中**，調圖片框與卡片排版即可。**邊界：** 不重繪角色、不改 rarity/掉落、不新增 3D 翻卡或視覺模板。

**建議組合：** 方向 1 作全產品基底，方向 3 作召喚/圖鑑的展示規則；方向 2 保留為同一層級系統的明亮版本。無須一次切換全產品風格。

## D. 第一批 UI polish milestones

使用獨立 `VP-*` 編號，避免與卡池工程 M1–M5 混用。每個 milestone 独立可 review、可回退；以下均是規劃，尚未執行。

### VP-01｜Theme / 狀態一致性小修（P1）

- **Goal：** 修掉最像未完成產品的錯色與錯誤狀態。
- **Scope：** sweet UR 背景/前景配對、default priority border、備份成功 panel 的 hidden、圖鑑空狀態跨欄；記錄受影響 token 邊界。
- **Likely files：** `src/styles.css`；必要時僅調 `src/ui.js` 的空狀態 markup。`src/preferencesService.js` 只讀確認，不改偏好 schema。
- **Risk：** 中。舊 alias 與高 specificity 規則可能影響多頁；備份 panel 與 pipeline M1 呈現共用。避免全域 `[hidden]` 或 token 大量替換，優先局部 selector。
- **Acceptance criteria：** default/sweet 的任務與 N/R/SR/SSR/UR（已得/未得）都可讀；一般文字對比目標 ≥4.5:1、大字 ≥3:1，漸層取不利背景點，這是待驗收目標非本輪通過宣稱；未匯入時無成功訊息，成功狀態才呈現；三種 priority 保留文字及色彩識別；零收藏/零搜尋結果占滿 grid 可用寬度。

### VP-02｜首頁 / 任務頁 polish（P1）

- **Goal：** 打開就能知道今天要做什麼，完成動作清楚。
- **Scope：** 縮小資源與陪伴空狀態高度、統一區塊間距；單行 title 不重複、額外內容才顯示 preview；降低 metadata 與次操作權重；補齊 task form 日期/子任務欄位外觀。
- **Likely files：** `index.html` 任務區、`src/ui.js` task renderer/form、`src/styles.css` task/home/form 節。`src/taskService.js`/`src/taskFilterService.js` 作只讀契約。
- **Risk：** 中；首頁包含祝福/任務/成就入口，UI 共用檔高衝突。保留事件 selector、分類、今日/全部/智慧與完成行為。
- **Acceptance criteria：** 390×844、hub 收合且有一筆今日任務時，不捲動能看到第一筆任務名稱與主要完成控制；同時驗證有/無陪伴狀態；單行無重複、長中文/多行/子任務/逾期/完成都不橫溢；所有原操作可達；重要 hit area ≥44×44；date 原生選擇與驗證保持正常。

### VP-03｜召喚頁 polish（P1，高衝突，獨立一批）

- **Goal：** 一眼辨識選中卡池、成本與召喚動作，保留角色展示的期待感。
- **Scope：** 共通 hero/祝福降權、調整展示與操作區的順序/留白、統一 single/ten 主次、整理保底/機率/詳情；不改演出階段或交易呼叫。
- **Likely files：** `index.html` gacha 區、`src/ui.js` gacha presentation/results 的局部 markup、`src/styles.css` gacha 共通外框。`src/poolPresentation.js`/`src/poolContentContract.js` 只讀。
- **Risk：** 高。與 M4 contract/解鎖呈現及 M2A quote/交易 UI 共用。改 DOM 前確認 id、data-action、data-pool-theme、focus trigger 全保留。
- **Acceptance criteria：** 390×844、入場演出已關閉、details 收合時，池名、價格/星塵和至少主要召喚控制可在首屏辨識；必要的價格/限制不可被裝飾取代；320/430px 不橫溢；兩既有池與 synthetic contract fixture 都正常；不足/disabled/進行中/單抽/十連/NEW/重複/保底/第20抽解鎖顯示完整。連點一次交易、十連取消返回原結果、報價改變重新確認、SSR+ 順序/重複項/略過/reduced motion 保持既有驗收。

### VP-04｜圖鑑 / 卡片 polish（P2）

- **Goal：** 讓使用者先看見收藏品，再看見培養操作。
- **Scope：** 整理重複進度摘要、提高圖片相對份量、統一名稱/稀有度/metadata/操作區基線；降低逐卡教學提示；詳情中避免重複提醒未設暱稱。
- **Likely files：** `src/ui.js` collection renderer/detail、`src/styles.css` collection/pet detail 節；必要時 `index.html` collection header。`src/collectionService.js` 不改持久化邏輯。
- **Risk：** 中。長暱稱、不同星級、陪伴狀態會改卡高；放大圖片可能增加載圖成本。保留 grid key、lazy/eager、變體圖路徑與原圖獨立入口。
- **Acceptance criteria：** 320/390/430px 兩欄無橫溢、同列操作區穩定對齊；名字不被 badge/按鈕遮住；12中文字暱稱與長角色名能讀完整或有清楚詳情入口；0/大量碎片、最高星級、陪伴中、未獲得、篩選零結果都可辨識；原圖/詳情/設陪伴/升星/返回篩選結果保持正常；不讓全圖鑑改載原始大圖。

### VP-05｜Modal / Overlay 與全線收尾（P2）

- **Goal：** 開啟、閱讀、操作、關閉的節奏一致。
- **Scope：** 標題保留 close 空間、內容/動作區間距、長內容捲動、安全區、焦點移入/還原；兩主題同一動作主次一致；只修共通外殼，不換 modal engine。
- **Likely files：** `src/styles.css` modal/viewer/result 節、`src/ui.js` open/close 与局部 modal markup；`index.html` modal shell 如確有必要。
- **Risk：** 中至高。`closeModal()` 會 resolve 召喚結果等待；原圖為內層 overlay，十連確認須還原原結果 DOM。這些不可當作純裝飾刪改。
- **Acceptance criteria：** 320/390/430px、200% 文字、長中文標題与長內容下不遮關閉/主動作；鍵盤 Tab 留在有效 dialog，Escape 只關應關層，返回原 trigger；圖片 viewer 返回原 detail；十連取消/繼續/解鎖順序不變；iOS 軟鍵盤與 safe area 另做實機驗收；reduce motion 不依賴完整動畫才能完成操作。

## 工作線隔離與驗收方式

- 本次只新增這份獨立報告；保留目前 branch，不切換正在承載 pipeline 的 checkout。這不等同已建立 Git 隔離。
- **收尾時發現實際並行修改：** 起始僅有未追蹤的 `AGENTS.md`；審計期間同一 checkout 新增了 `src/ui.js`、`src/themedSummonController.js`、`src/poolContentContract.js`、`src/poolPresentation.js`、`service-worker.js`、`scripts/cardPoolPipeline.mjs` 的修改，以及 `src/glacierArrivalScene.js`、`docs/card-pool-proposals/`。均不是本審計所改，沒有覆蓋或回退。當時 diff 顯示 `glacier_arrival` registry/演出擴充正在進行；本文舊模板與兩池觀察以起始基準為準，新演出未納入本輪驗收。下一批需重新固定整合基準；此為已發生的共用檔衝突風險。
- 實作前以雙方確認的整合 commit 建立獨立 worktree，建議分支 `codex/ui-visual-polish`；報告基準 commit 已記在文首。`VP-*` 進度另記，勿將本輪包進 pipeline M1–M5 的完成狀態。
- **高衝突共用檔：** `src/ui.js`、`src/styles.css`、`index.html`；特別是 gacha presentation、repeat-ten、theme stage、awakening/result selectors。按 milestone/selector 範圍指定單一修改者；合併前比較最新 pipeline 差異，不整檔覆蓋。
- **發布共用檔：** `src/version.js`、`service-worker.js`；各批正式整合時同步版本/cache/precache，並遵守 `docs/release-artifacts.md` 的完整 artifact 驗收。版本號由整合者決定，本輪不預占。
- **第一批排除：** DB/backup schema、抽卡交易/隨機/保底、任務獎勵、內容契約、召喚 queue/controller、release bootstrap、`data/`、`assets/pets/`、`content/pet-series/`、compatibility snapshot。若 polish 必須碰這些，先拆為獨立工程變更，不默默擴大範圍。
- 每批保存相同 fixture 的 before/after（default/sweet、320/390/430px）；CSS-only 以狀態矩陣和截圖驗收；有 JS 時先 `node --check`，再跑適用既有測試。VP-03/05 涉及召喚呈現時跑目前 `npm test` 與 native browser harness，不能只看 syntax。整合測試清單以目前 package.json 為準。
- 本輪只完成 source/UI audit，不宣稱上述 acceptance 已通過。缺失兩份 engineering 文件、iOS 實機及完整狀態矩陣列為下一階段補驗項。

建議執行次序：VP-01 → VP-02 → VP-03 → VP-04 → VP-05。VP-03 需等待共用 gacha 區段可獨占修改；可先以 VP-02 完成一小批，確認視覺方向後再往其他頁擴展。
