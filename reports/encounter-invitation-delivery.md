# 相遇系統 V3.6.0 — 來源交付驗收

2026-10-03。從主線 `d9c69bba09c59da11a115db24a2b3c1d7e4a9ed8` 建立隔離 worktree；正式站基準 V3.5.24、artifact `c65c038a0a6ed9c2db0d6b043c2c2a649ec03a3a653ebe55b40fe74f775502be`。原型先於 production implementation 完成，見 [原型審查](encounter-prototype-review.md)。

## 功能與 Before / After

移除升星 service、升星操作、角色專屬碎片 UI、星級手冊與星級教學；退役四項未領星級里程，保留既有徽章。新紀錄不寫 stars/fragments。Backup reader 留有舊欄位驗證與轉換，歷史設計預覽的星級 fixture 不屬於 App runtime。

第一次相遇→收藏；再次相遇→全局碎片 1/2/5/10/20；SSR100／UR200→指定邀請→新夥伴；養成→親密度、故事與覺醒。正式 active pools 的有效資格統一決定名單，跨卡池且不繞過擴充條件。

例：4 星＋剩餘17，轉為67枚、專長下限4；原親密度保持原值。五種 review sample 混合為202，重試仍202。邀請一位UR後為2，設定同行與重播仍2。真實 App 操作已確認新夥伴進入收藏，18項現役里程不再要求升星。

## 視覺與互動

「重逢光痕」以兩弧線加節點識別資源，沿用現有三主題、真實角色畫作與Lore。次要召喚入口→角色畫廊→完整角色預覽→費用確認→確定到來→設為同行。沒有單卡價格、購買、假稀有度懸念或抽數保障；儀式2.3秒，Reduced Motion直接到結果。

Native dialog 有可讀名稱、關閉返回焦點、提交期間重複點擊防護、成功live announcement；已相遇／故事鎖／不足／儲存失敗均有狀態。舞台圖無法取得時先用相同角色的卡片圖，再顯示可讀載入狀態，保持人物資料與邀請功能可用。

## Screenshot matrix

目錄：`C:/Users/User/.codex/visualizations/2026/10/03/01a1011a-9936-78b1-a5bd-95a0cb2f9051/encounter-invitation/`。

|編號|情境|最終證據檔|
|---|---|---|
|A|召喚入口|[A-summon-393-final.png](C:/Users/User/.codex/visualizations/2026/10/03/01a1011a-9936-78b1-a5bd-95a0cb2f9051/encounter-invitation/A-summon-393-final.png)|
|B|N重逢|[B-duplicate_n-393-final.png](C:/Users/User/.codex/visualizations/2026/10/03/01a1011a-9936-78b1-a5bd-95a0cb2f9051/encounter-invitation/B-duplicate_n-393-final.png)|
|C|SR重逢|[C-duplicate_sr-393-final.png](C:/Users/User/.codex/visualizations/2026/10/03/01a1011a-9936-78b1-a5bd-95a0cb2f9051/encounter-invitation/C-duplicate_sr-393-final.png)|
|D|UR重逢|[D-duplicate_ur-393-final.png](C:/Users/User/.codex/visualizations/2026/10/03/01a1011a-9936-78b1-a5bd-95a0cb2f9051/encounter-invitation/D-duplicate_ur-393-final.png)|
|E|邀請畫廊|[E-gallery-393-final.png](C:/Users/User/.codex/visualizations/2026/10/03/01a1011a-9936-78b1-a5bd-95a0cb2f9051/encounter-invitation/E-gallery-393-final.png)|
|F|SSR預覽|[F-ssr-393-final.png](C:/Users/User/.codex/visualizations/2026/10/03/01a1011a-9936-78b1-a5bd-95a0cb2f9051/encounter-invitation/F-ssr-393-final.png)|
|G|UR預覽|[G-ur-393-final.png](C:/Users/User/.codex/visualizations/2026/10/03/01a1011a-9936-78b1-a5bd-95a0cb2f9051/encounter-invitation/G-ur-393-final.png)|
|H|確認|[H-confirm-393-final.png](C:/Users/User/.codex/visualizations/2026/10/03/01a1011a-9936-78b1-a5bd-95a0cb2f9051/encounter-invitation/H-confirm-393-final.png)|
|I|儀式|[I-ceremony-393-final.png](C:/Users/User/.codex/visualizations/2026/10/03/01a1011a-9936-78b1-a5bd-95a0cb2f9051/encounter-invitation/I-ceremony-393-final.png)|
|J|結果|[J-result-393-final.png](C:/Users/User/.codex/visualizations/2026/10/03/01a1011a-9936-78b1-a5bd-95a0cb2f9051/encounter-invitation/J-result-393-final.png)|
|K|轉換摘要|[K-migration-393-final.png](C:/Users/User/.codex/visualizations/2026/10/03/01a1011a-9936-78b1-a5bd-95a0cb2f9051/encounter-invitation/K-migration-393-final.png)|
|L|無星級手記|[L-care-393-final.png](C:/Users/User/.codex/visualizations/2026/10/03/01a1011a-9936-78b1-a5bd-95a0cb2f9051/encounter-invitation/L-care-393-final.png)|

19種原型狀態。393×852 A–L無水平溢出；320×852 gallery/confirm/result/migration/care實際innerWidth=320、root文字24px、無溢出。三主題result Reduced Motion的computed animation為none；背景實際讀回#101a2b／#fff8f2／#f3efe6。PNG擷取的是瀏覽器內容區，不含原生捲軸。另保存production-gallery／production-migration／production-result與runtime-transactions證據。

## 資料、安全與回歸

`encounter-economy.test.mjs`：轉換sample、fresh/legacy、未知目錄角色、異常與溢出拒絕、邀請資格、五種重逢、十連與雙保底、親密度與舊能力下限。備份新增嚴格收據/餘額/標記驗證與新舊往返；相遇資料與角色原子替換。

本機native IndexedDB隔離harness 7/7通過：新存檔、舊存檔202及重試、同一UR並發只扣一次、寫入失敗rollback、完整備份往返、fetch拒絕時的離線資料操作、實際頁面重新載入後仍202。測試資料庫名為隨機QuestNoteTest-Encounter；未開啟玩家資料庫，未向正式後端送資料。

`npm test`：304＋14＋12次測試執行全部通過，另有reveal-flow邏輯斷言。全部修改/新增JS語法檢查、卡池contract與Git whitespace檢查通過。機率與目錄資料沒有修改；卡池鎖、保底、十連、固定贈寵保留，贈寵重複也只進共用餘額。

最後 runtime source commit：`3ecd7088c0b7b92662525b21765f438e817a3a71`，分支 `codex/encounter-invitation`。後續文件 commit 不修改 App runtime。

Preview artifact：`213f2191b3e275260ade155ffa3357d79d0868ccfd2bec77cb35d5f57b2cfce9`，manifest SHA256 `fa80476a7382f6c90427d81125a3859196c6c8c99338fd196ea4acb2b4b82550`。
Production-profile 本機 artifact：`f49a95448949e091c3ef93b6485e4c75a1df9989857b0224a0e7304e0ea04159`，manifest SHA256 `fa73e7243d34d823261a59f74954840d230b61ddc49efd43c96462f4eb481e02`。各611檔，均通過 immutable artifact verifier；profile/scope/cache/byte hash/依賴closure確認，沒有發布。

雙連線原生 IndexedDB M2A 27/27：全部7個write位置逐一throw/abort均rollback、召喚/暱稱/親密度/錢包競態、兩連線同角色邀請一次、固定贈寵一次與整份備份往返。

最終兩個不可變artifact的native Service Worker驗收17/17通過：production/preview隔離、快取恢復、既有controller更新、十連與覺醒回歸，以及所有產物HTTP回應503時的啟動與成長教學。離線指定邀請pet_ur01實際餘額202→2，重播仍2、同行設定成功、保底不變；controller確認為最終preview artifact。這是本機瀏覽器與原生IndexedDB／Service Worker驗收，未冒稱實機或正式發布驗收。

最後補測：migration/economy/backup/presentation共32/32通過；Reduced Motion實際互動242→42，成功status朗讀角色接受邀請。初次移除star後的過期測試斷言均改為新資源語意，並保留原counter、交易與能力回歸檢查。

[跨連線原生結果](C:/Users/User/.codex/visualizations/2026/10/03/01a1011a-9936-78b1-a5bd-95a0cb2f9051/encounter-invitation/m2a-concurrency-results.json) · [原生轉換驗收截圖](C:/Users/User/.codex/visualizations/2026/10/03/01a1011a-9936-78b1-a5bd-95a0cb2f9051/encounter-invitation/runtime-transactions.png) · [最終產物原生結果](C:/Users/User/.codex/visualizations/2026/10/03/01a1011a-9936-78b1-a5bd-95a0cb2f9051/encounter-invitation/artifact-runtime-results-final.json) · [最終產物驗收截圖](C:/Users/User/.codex/visualizations/2026/10/03/01a1011a-9936-78b1-a5bd-95a0cb2f9051/encounter-invitation/artifact-runtime-final.png)。

可操作的[本機原型](http://127.0.0.1:8029/devtools/encounter-invitation-preview.html?scenario=interactive)只使用記憶體中的示範狀態，不讀寫玩家資料。

## 三種內部設計檢視

Apple：選擇、確認、提交與演出責任分開；角色辨識與Reduced Motion保持清楚。iF：收藏選擇與養成分離，跨卡池安全網有實際功能，無新增伺服器／AI／美術管線。Red Dot：光痕、名字、畫廊與到來儀式形成一致的重逢到同行體驗。以上是內部設計審查，沒有官方評分或獲獎主張。

## 發布狀態與實際限制

完成來源重構，不包含main合併、正式站或backend發布。實機VoiceOver／iPhone PWA觸控與背景行為仍需裝置驗收；瀏覽器鍵盤／ARIA／大字體檢查不能取代它。本 App 沒有帳號或雲端同步，重裝後須完整備份恢復，不能承諾帳號級補發或同步。轉換後不可直接交由3.5.x寫入，回退需使用保存的舊備份。100/200尚未經新系統的實際長期玩家資料驗證。

沒有需要使用者另定產品方向的blocker。正式發布前保留review與裝置驗收門檻，沒有臨時改動使用者固定的價格、資格或專長承接決策。

Duplicate現在提供下一次確定相遇的進度；指定邀請是歡迎一位夥伴加入旅程；Collection與Growth由不同資料與操作實際分離。
