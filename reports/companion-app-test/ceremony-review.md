# 召喚儀式：舊資源接回新版

2026-10-02，本機完整 App V3.5.12，来源 origin/main 8c9a3ed。未合併或發布。

| 審查項目 | 結論與實作 |
| --- | --- |
| 現況最大問題 | 實際檢視舊版：操作、機率與保底先出現；UR 預覽偏重稱號。上一版新介面雖顯示原名，卻沒有接原有召喚前奏和專屬角色演出，情緒鋪陳斷開。 |
| 核心概念 | 每個卡池是一個迎接夥伴的場所。使用原有場景構成安靜聖所，保留原作的視覺語言。 |
| 儀式流程 | 首次進池完整登場 → 再訪短轉場 → 焦點角色與原名 → 啟動相遇 → 原本主題前奏 → 原本 SSR／UR 專屬登場 → 原名 → 稱號 → 正常招呼／碎片 → 詳細頁或圖鑑。 |
| 場景與氛圍 | 原有獅心城、山河、峽灣、糖庭 Scene 工廠直接嵌入待機畫面。花海沿用月光鏡池；標準採同一鏡池基礎，使用一般相遇入口文案。待機場景靜止，動態留給登場與召喚。 |
| 焦點角色 | 原始完整插畫、完整原名、稱號與明確稀有度。名字為主，稱號為次。未擁有可預覽公開介紹，不解鎖羈絆。 |
| CTA | 金色主按鈕「啟動相遇」，並列「十連相遇」，置於名字之後。一次按下啟動，不加長按或確認步驟。顯示 100／1000 星塵與不扣除的展示標示。 |
| Reveal 節奏 | 保留既有各池前奏與各角色完整動畫時長。普通角色用 1.8 秒插畫／原名／稱號揭露；已演出插畫的 SSR＋接 300ms 原名、650ms 稱號、1000ms 完整結果，不重播一次長演出。 |
| Name reveal | 專屬動畫中先隱藏原本同步出現的名字／稱號，動畫完成後自動交接新版，避免先見到名字又重新藏起。正式舊呼叫端維持原行為。 |
| Rarity | 保留原有稀有度徵兆與角色場景；字樣縮小為次要資訊，不能只靠色彩辨認。N／R／SR 仍有完整儀式前奏与角色揭露。 |
| Motion／Haptic | 原控制器維持動畫與 skip 清理；本機補上背景 inert，阻止鍵盤與輔助工具進入演出背後。減少動態停用大型角色演出，單抽直接完整身份／十連直接總覽。觸覺需自選且裝置支援，啟動輕回饋、名字依稀有度區分；不新增音效架構。 |
| Before／After | ceremony.html 有同來源舊 UI、新聖所、啟動、角色登場、結果、重複與三 Theme。舊 UI 對照同樣使用記憶體 adapter，不能代表正式站部署。 |
| Apple Design Awards 角度 | Interaction：單次啟動、略過、完整返回；Visuals：原畫與場景統一；Delight：名字有停頓；Inclusivity：三 Theme、大字、非色彩辨識、減少動態與焦點。這是內部設計檢核，不是獎項認證。 |
| iF 角度 | Idea：迎接而非賭中；Form：同源美術与節奏；Function：結果一次套用；Differentiation：保留 QuestNote 場景；Sustainability：重用原模組，無新增圖資或引擎。 |
| Red Dot 角度 | Idea：儀式是進入世界與記住角色；Form：場景、角色、名字和結果連貫；Impact：以實際操作與使用者回饋驗證，尚未做正式研究量測。 |
| 風險 | 仍需 iPhone Safari／VoiceOver／Dynamic Type／觸覺、低階裝置效能與原生線上更新驗收；固定展示不能證明正式抽卡交易整合。本輪不改機率、保底、經濟或存檔結構。 |
| Production 判斷 | 視覺方向值得進下一輪正式整合；本輪仍是來源分支內的本機展示。正式接合需將原生不可變抽卡結果送進同一呈現流程，保留原交易與解鎖／補償 exactly-once，不另寫抽卡。 |

## 舊資源使用清單

- 原有插畫、初始覺醒圖片與 variants：直接引用，没有修改 assets 下的原檔。
- lionheartScene、swordwildShanheScene、glacierArrivalScene、honeylightSugarScene：直接使用原工廠，未複製或重畫。
- themedSummonController：原本完整／短登場與前奏；新增可選 ritualOnly 交接，舊呼叫端不變。
- summonRevealService：原 SSR／UR 專屬場景與時長；新增可選 identityHandoff 自動接新版名字，舊呼叫端不變。
- poolAwakeningController：永眠花海「試看晨醒花庭」纯展示入口；不發獎、不存 animationSeen。
- 原正式畫面仍可透過 ?legacy=1 在同一隔離來源檢視，無原檔資源被移除。

## 驗證證據

- npm test：299 項 Node tests 與 reveal-flow assertions 通過；相關展示／記憶體／Theme 26 項通過。
- pools:validate：無 errors／warnings；変更 JS syntax、import resolution 与 diff 檢查通過。
- 六池首次登場、同池再訪短轉場、回到 CTA；三 Theme 393×852 CTA 底部約 607px，導覽 780px，無水平溢出。
- 三 Theme 320px／200%：root 32px、名字 48px，無水平溢出；十連完整 10 張、總覽無溢出。
- 正常十連角色順序：重鉚架橋犀 → 格里芬 → 盤根龜 → 奇美拉。原專屬動畫交接新結果，无原生摘要再停一次。
- 第五張同次重複苗圃護芽甲蟲碎片為 1；往返詳細頁仍是 1；Shift+Tab 回到返回卡池，Escape 回十連 CTA。
- 圖鑑「永眠花海」篩選 0／12；全六系列名稱同來源，不再混用召喚後綴。
- 前奏與專屬角色演出略過均直達完整十張；無殘留 overlay／展示標示。晨醒試演的鍵盤 Tab 留在演出按鈕，關閉後不增加收藏。

## 設計參考

外部僅參考官方的美術收藏原則：[Pokémon 官方收藏指南](https://www.pokemon.com/uk/strategy/a-guide-to-collecting-cards-and-using-wonder-picks-in-pokemon-trading-card-game-pocket) 描述以動畫讓插畫活起來。本案的推論是把情緒峰值交給角色插畫與名字，而非稀有度獎勵字樣。具體動畫、分鏡与時間以 QuestNote 原有控制器及本機實際操作為依據，沒有聲稱完成其他遊戲的實機研究。

目前已從單純取得結果，轉向可操作的迎接儀式。是否足夠隆重與值得記住，仍以使用者觀看新版后的實際感受為準。
