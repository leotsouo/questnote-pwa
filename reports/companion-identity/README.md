# QuestNote：把名字還給夥伴

[開啟互動 Prototype](http://127.0.0.1:4187/devtools/companion-identity.html) · [完整截圖矩陣](matrix.html) · [遊戲研究](research.md) · [驗證與限制](verification.md)

2026-10-02；設計審查版，尚未進 Production。

來源固定為 `origin/main` 的 `3a88db8f227e710c13324860197b73c1ce880573`（來源版本 V3.5.9）。本機隔離分支：`codex/companion-identity-prototype`，工作目錄：`.worktrees/identity`。這是來源審查，不把來源版本當成正式 HTTPS 部署證據。舊根目錄草稿未改動。

## 1. 原卡池最大的問題

最大的問題是**身份在不同畫面失去連續性**，不只是少一行字。

- Pool Hero：`src/ui.js` 的 `renderGachaThemeStage` 將 `hero.title` 放進 hero-name，另把 title 欄隱藏；Featured caption 也優先 title。標準 UR 輪播 `src/standardUrCarousel.js` 同樣以稱號為 label。
- 原版 Pool 首屏先看到貨幣、抽取 CTA、保底和機率，角色出現在下面；焦點角色一律灰階，收藏後也缺乏清晰狀態。
- 原版已擁有圖鑑**已有名字**，也已有稱號；問題是星數、碎片、親密度、設定同行與升星按鈕同時壓在小卡上，卡片高度和插畫空間難以一致。
- 原版未擁有圖鑑以「???」呈現，但未擁有詳情的長介紹已提到真名，秘密政策不一致。原版卡片按鈕多使用泛稱「查看詳情」。
- 原版 SSR+ Reveal 已有名字、稱號、動畫佇列、略過與 reduced-motion；不能描述成只有 flash。此次截到的 UR 結果由巨大 UR 字樣先吸引目光，名字相對小。

原版召喚與 Reveal 採實際 source module、固定結果的 Audit viewer；沒有真的抽取或扣款。Pool／Collection／Detail 來自啟動中的原版 App。圖鑑對照使用同六隻真實寵物的隔離展示收藏。

## 實際系統盤點

| 項目 | 查到的現況 | Prototype 處理 |
| --- | --- | --- |
| 名字／稱號 | 128 隻真實 pet，name 與 title 分離；例如「灰影幼狼／迷霧追獵者」 | 不改名、不以使用者示例「灰影」替代真資料 |
| 種族／類型 | 96 隻有 speciesType，32 隻 legacy 未提供；另有 element、personality 等欄位 | 僅展示有證據的資訊；不猜 missing type |
| 成長 | 升星 1–5；親密度 Lv.1–5；部分角色有覺醒，不是全體通用三階進化 | 收到 Detail；覺醒角色維持同一身份 |
| 插畫 | 使用現有 image／imageVariants 的 card、stage 圖 | 完整 contain；不裁頭、不重生另一個角色 |
| 卡池 | 標準 56；永眠花海 12→16；霜誓 12；蜜光 12；劍隱 20；逆造 12 | 六池可切換；花庭只切換既有擴充預覽 |
| 基礎機率 | N 55%、R 30%、SR 10%、SSR 3%、UR 2%；先選 rarity，再在該 rarity 等機率選 pet | 直接讀既有 rates，顯示每隻基礎機率；Featured 沒有另加權 |
| 保底 | SSR+ 上限 30；UR 上限 100；各池獨立；UR 重設兩者，SSR 僅重設 SSR 計數 | 文字明示，無計數／抽取實作變更 |
| 費用 | 單次 100 星塵，十次 1000 | 角色介紹後才顯示；Prototype 不扣款 |
| 花庭擴充 | 累積 20 次後解鎖 4 隻候選及固定贈 pet_r16；贈寵不是抽卡 | 使用純 contract 處理候選與既有 presentation default，解鎖主角為曙綻花后兔 |
| 重複 | 該 pet 的碎片 N/R/SR/SSR/UR = 1/2/5/10/20 | 明示 pet 名字、實際增量、升星用途，僅記憶體展示 |
| 升星 | 升至 2/3/4/5 星需 5/15/30/50 碎片 | 不更改門檻 |
| 親密度 | EXP 門檻 0/50/150/300/500；摸摸有原有 4h 冷卻與 5 EXP 等規則 | 不模擬任務、餵食、親密度獲取 |
| Owned／nickname | 既有收藏有 nickname，原版優先暱稱；未擁有多為 ??? | 設計主標保留原名，暱稱獨立補充；不改存檔 schema |
| 羈絆／覺醒 | Lv.2–5 對話／章節、任務／習慣約定、紀念物；20 隻劍隱角色有覺醒 | 未擁有不插入章節文字；不虛構戰鬥職能或進化 |
| Theme | default／sweet／twilight，三套 palette 與字型語言 | 共用 UX、字級層級、名稱位置；兩套 muted 色在 Prototype 小幅加深 |
| Current components | Pool stage、standard UR carousel、single／ten result、collection card、detail modal、image viewer | Prototype 建立小型共用 identity、cue、miniCard、detail 元件 |
| 其他結果／獎勵 | single／ten result 已用 pet.name；pool unlock 固定贈寵說明也有 rewardPet.name | 保留正確的姓名語意；新增具名 recent encounter；不重做任務 reward 系統 |
| 演出／觸覺 | themed prelude + SSR+ queue；SSR 約 1500ms、UR 約 2200ms，部分特殊 UR 2800ms；無既有召喚 audio／haptic 套件 | 新短節奏只演固定結果；optional vibration hook，預設關閉 |

盤點依據：`src/ui.js`、`src/standardUrCarousel.js`、`src/summonRevealService.js`、`src/themedSummonController.js`、`src/gachaService.js`、`src/collectionService.js`、`src/poolContentContract.js`、`src/petPoolFilter.js`、`src/loreService.js`、`src/bondJourneyCore.js`、`src/petAwakeningCore.js`、`src/themeTokens.css`，以及三份 pets／lore／pools catalog 與維護中的 theme／summon／collection 文件。

## 2. 新 Character Information Hierarchy

語意層級：**Name 是身份；Title 是故事；Rarity／狀態是補充**。

掃視順序：**Art → Name → 小型 rarity cue → Title → 其他資訊**。稱號雖在名字下方，仍以較小、較低對比字級呈現；稀有度保持可掃讀，不變成最大標題。角色名字與稱號永不互相替代。

各畫面採相同原名，不因 Theme 或收藏狀態變成另一個身份。此處不是已驗證的「一秒眼動」或使用者記憶數據；是由構圖與字級建立的設計假設。

## 3. Pet Name 如何呈現

Pool mobile 主標 24px；Reveal 27.2px；Detail 26.4px；Compact 16px。字重較高，平衡換行，完整顯示。名字放在實底 caption，避免壓在繁複插畫上。

測試真資料：鳥哥（2 字）、霧隱兔（3 字）、灰影幼狼（4 字）、苗圃護芽甲蟲（6 字），及天律之冕・格里芬（更長原名）。英文與極長中文僅是有標記的排版樣本，不新增假角色。大字模式用 rem 放大，不縮小長名字，不截斷身份主標。

## 4. Title 如何呈現

Hero／Reveal 13.6px，Detail 同級；Expanded grid 12px。保持故事氣氛與充分對比，不強加引號，不與 name 同字級。Compact grid 為減少密度，只在 accessible label 保留稱號；展開或 Detail 可見完整稱號。

## 5. Rarity 如何呈現

永遠有 N／R／SR／SSR／UR 的文字，辨識不依賴顏色。Hero／Reveal 的 N/R 採基本 portrait；SR 邊緣增加單線；SSR 加 accent 邊；UR 雙線收邊。Reveal 使用克制的微光與輪廓、插畫淡入，名字最後成為主標。文字 cue 足以在減少動態、灰階和無震動裝置辨識稀有度。

特殊卡面本輪採**同一張現有完整插畫＋較大展示區＋克制邊框**。現有平面素材沒有可可靠拆分的角色／前景／背景，不假造 3D parallax 或生成新角色。未來可以在 Detail 研究很輕的材質光澤；沉浸全景須先有同身份 art asset 與效能證據，不能本輪直接宣稱已完成。

## 6. Pool Overview

步驟 1 — Pool Overview：**健康：可審查**。同一頁先看大插畫、真名和稱號，再看 pool 世界觀與名單，最後才是費用與 CTA。六池的候選數與擴充皆讀真 contract；不造 wallet balance 或倒數。

步驟 3 — Pool Preview：**健康：可審查**。每張有縮圖、原名、rarity、owned state、featured state；全部可點進 Detail。機率從 Overview／Preview 兩處可達。Featured 明示是介紹位置，沒有 rate-up。

## 7. Featured Pet

步驟 2 — Featured Pet：**健康：可審查**。主角為該池既有 hero，Supporting 用既有 featured IDs。未擁有仍可先認識真名、短介紹與 artwork。逆造之誓使用天律之冕・格里芬與逆造獅首奇美拉等原角色；花庭擴充尊重曙綻花后兔。

Pet Preview 有價值：先建立「這位夥伴是誰」。第一版已做可點角色與短 lore。Expression／idle／已解鎖 quote 可後續研究；未提供新動畫或未解鎖對話，不移植戰鬥試玩。

## 8. Summon Reveal

步驟 4 — Summon Animation：**健康：節奏與略過通過；實機觸覺待驗**。
步驟 5 — New Pet Reveal：**健康：固定結果、name peak 與完整結果通過**。

| 時間（目標） | 階段 | 設計目的 |
| --- | --- | --- |
| 0ms | 開始 | 讓介面安靜下來 |
| 300ms | Rarity cue | 給期待，不把 rarity 當獎品 |
| 550ms | 輪廓 | 一位夥伴正在靠近 |
| 850ms | 完整插畫 | 先認出角色 |
| 1200ms | 名字 | Recognition moment；主視覺峰值 |
| 1450ms | 稱號 | 補上身份背後的故事 |
| 1800ms | 取得狀態 | 完整結果停留至自行關閉 |

實測普通序列 result 約 1816ms；CSS 過渡約在 2 秒內完成。可略過；Escape 在演出中先到完整結果，在結果中再關閉。減少動態直接到結果，不跳過資訊。螢幕閱讀名稱跟著揭露順序；name 階段不提前把 title 讀出，結果以 live region 宣告。

觸覺預設關閉，只在支援 API 且使用者開啟、未減少動態時給一次短 pulse：N 8ms、R 12ms、SR 16ms、SSR 18ms、UR 20/30/12ms。這是裝置端待調參概念，瀏覽器可用 API 不代表實機手感驗證。未加入聲音或反覆閃爍。

## 9. Collection Grid

步驟 7 — Collection：**健康：compact／expanded、搜尋、狀態篩選可操作**。

Compact mobile 2 欄，只有 art、name、rarity、owned；Expanded mobile 1 欄，較大插畫與 title。桌面對應 4 欄／2 欄。星數、碎片、親密度、操作按鈕都移到 Detail。

Owned 保持完整彩圖；Unowned 用較暗灰階圖＋名字＋「尚未相遇」。真 catalog 沒有 secret flag，因此不把所有公開角色變成秘密。花庭未解鎖候選仍不進可抽名單；不把「公開身份」誤當「候選已解鎖」。將來若有真正 secret pet，要另訂顯式契約。

「4 / 12 位夥伴已相遇」記錄旅程，不說還缺幾隻，不要求完成率，不做強迫連抽。取得後可從結果直接進圖鑑。

## 10. Pet Detail

步驟 8 — Pet Detail：**健康：公開／已擁有內容分界與返回路徑可審查**。

完整原圖、原名、稱號與 rarity 放在前面。種族／屬性只列有資料者；不猜 legacy 缺值。未擁有先看 description 前兩句；完整背景於相遇後可讀。專屬對話與羈絆章節按原親密度標記；未解鎖章節內容不插入未擁有 DOM。

已擁有 Detail 增加升星、親密度、該角色碎片、性格與原有 normal quote。名稱政策讓原名永遠保留，nickname 作個人稱呼補充。此 Prototype 不提供正式餵食、升星與任務按鈕，不產生假進度。

Dialog 關閉恢復 opener，Preview→機率在同一個 dialog 內換頁後仍返回原入口。可從 Detail 返回本池名單。

## 11. Duplicate State

步驟 6 — Duplicate Reveal：**健康：真實碎片數與單次套用通過**。

例如 **重鉚架橋犀 → 再次相遇 → 重鉚架橋犀碎片 +10**，並說明升星用途。保留角色插畫與姓名，不標「失敗」。UR +20、SR +5、R +2、N +1 皆來自既有常數。原始收藏 Map 不被修改，展示結果只套用一次。

最近相遇入口同樣用 name 作主標，直接到角色 Detail。New／Duplicate 演出不連接抽卡、錢包、任務、獎勵或存檔 API。

## 12. Before / After Screenshots

[開啟五組前後對照與額外狀態](matrix.html)。

1. Pool：首屏資源／抽取先行 → 彩色角色與原名先行。
2. Summon：原版實際 themed module 起始儀式 → 短輪廓／名字節奏；新概念截圖為手動鎖定中間階段。
3. Reveal：巨大的 UR → 插畫與天律之冕・格里芬。
4. Collection：同樣六隻展示收藏，密集養成資訊／??? → art／name／state。
5. Detail：未擁有 ??? 但長介绍已提真名 → 公開原名與短介紹、保留解鎖內容。

所有 Before 均是本輪擷取的 pinned source，而非歷史 screenshot 或正式部署證據。新、舊 screenshot 同為 393×852 requested viewport；IAB 有 15px scrollbar，content width 為 378px。Collection 因卡片密度不同，截的是各自第一組卡片，不是同一垂直 scroll offset。Summon harness 的非遊戲底頁可見，不冒充原 App 裡完整十連實測。

## 13. Apple Design Awards Review

以官方 [Apple Design Awards](https://developer.apple.com/design/awards/) 的 Interaction、Visuals & Graphics、Delight & Fun、Inclusivity 為內部質性評審框架，並非官方評分或得獎預測。

- Interaction：角色→名單→Detail→相遇結果→手帳路徑清楚；44px touch target、skip／Escape、焦點返回已檢查。窄螢幕 CTA 需下捲，是角色先行的取捨，值得在實際任務情境測效率。
- Visuals & Graphics：原插畫完整展示，三 Theme 共享 name 層級，稀有邊框收斂。Pool 身份來自角色與原 lore，不只是裝飾背景。
- Delight & Fun：art→name→title 的短節奏與再次相遇的用途有正向敘事；但「令人記住」仍需真人記憶測試。
- Inclusivity：實際使用的 name／title／CTA 色對比通過 4.5:1；200% 字體與長名字可換行，reduced motion 通過，非色彩 rarity cue 已有。原生 Dynamic Type、VoiceOver 與實機觸覺尚未驗證，不能宣稱全面 accessibility 合格。

## 14. iF Review

依官方 [iF FAQ](https://ifdesign.com/en/faqs) 的 Idea、Form、Function、Differentiation、Sustainability 進行內部審查。

Idea：把角色身份連續性做回來，直接對應使用者不知道真名的問題。
Form：完整 art／高權重 name／較小 title／克制 rarity，構圖可成立。
Function：每個候選有名字，Featured 可點，機率可找，Duplicate 有真实用途。
Differentiation：旅程手帳、完成日常通向相遇、親密度故事連回 QuestNote 的陪伴定位。
Sustainability：重用 128 隻既有資料與插畫、共用三 Theme 架構、無額外圖片生成與大型特效成本；尚無能耗或長期維護成本量測，不能推論環境效益。

## 15. Red Dot Review

依官方 [Red Dot Jury](https://www.red-dot.org/bcd/red-dot-jury) 的 Idea、Form、Impact 進行內部審查。

Idea：name 讓世界觀找到具體角色，title 承接其故事。
Form：Typography、插畫比例、motion 與構圖都服務角色辨識，避免 rarity 巨字支配結果。
Impact：介面提供「我認識牠」的條件，但情感連結與記憶增益仍是需驗證的假設。建議用實際任務完成→相遇流程，測即時與隔日姓名回憶；目前無使用者樣本或效果數字。

## 16. 還有哪些風險

1. 未擁有公開姓名是有意的探索政策變更；需產品確認。Catalog 沒有 secret flag，不能私下發明一套 hidden schema。
2. 200% 根字體是 Web 排版模擬；Windows IAB 無 iOS VoiceOver／原生 Dynamic Type。Physical iPhone Safari/PWA、VoiceOver 焦點、中文發音、system reduce motion、觸覺 fallback 必須實機檢查。
3. 慢網路／弱裝置尚未定量測試；Production 應接回既有 preloader 與動畫 queue，在 image ready 後開始 recognition moment，並提供文字／圖像失敗 fallback。
4. Prototype 只預覽固定單隻結果。正式十連須維持原序列、SSR+ queue、atomic transaction、skips、new／duplicate 與補償語意，不能用本輪展示 Map 接存檔。
5. Detail 的前兩句是展示用摘要規則，有些 lore 首句就是稱號；正式實作宜人工編輯 publicIntro，不靠字串截取洩漏故事。
6. canonical name＋nickname 的政策需和原 App 個人稱呼流程協調；保留暱稱而不是丟掉。
7. 視覺假設不等於情感或記憶證據；未執行一秒辨識、眼動、隔日回憶與長期收藏壓力測試。

## 17. 是否值得進 Production Implementation

**值得，建議先做身份與閱讀層級的漸進實作。**

第一批：統一 name/title component；修 Pool／standard carousel 的 title-as-name；Featured 可點、名單與機率可達；整理 Collection face。
第二批：沿用正式交易與 queue 的結果資料，調整 SSR+ 名字峰值、新／重複結果和最近相遇；保持原圖、candidate、保底、存檔、Reward 不動。
第三批：確認公開／解鎖內容與 nickname 規則、完成實機 accessibility 和慢圖 fallback，再考慮 foil 或 idle。

這次只交付 local Prototype、Audit viewer、研究、驗證與截圖；沒有改 runtime `src/`、`data/`、首頁、版本、SW，沒有推送、合併或部署。

**現在這個設計讓使用者看見並帶走的主標是「天律之冕・格里芬」——這隻寵物本身。** 稀有度提供期待，稱號補充故事。是否真的形成長期記憶，留給真人測試驗證；目前沒有以設計判斷冒充結果。
