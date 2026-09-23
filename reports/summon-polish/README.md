# VP-03 — 召喚頁 polish

完成範圍：召喚入口的資訊層級、操作位置、卡池配色與可讀性。沿用「靜謐星夜・冒險手帳」基底與「幻獸典藏・精緻卡冊」收藏層。沒有新增卡池、資料 schema、framework 或交易／演出流程。

## 基底與工作線

- UI 分支：`codex/ui-visual-polish`；本輪起點 `4854b68ec539695fc696126fd7963ccd013c54f1`（VP-01／02／04／05）。
- Card Pool 分支已提交 HEAD：`95a4f5d70233195050f1f0fce2eee3d9945c2b32`，也是兩線的 merge-base。UI 已包含該提交的交易與卡池 contract。
- 開始前與驗收期間唯讀確認：Card Pool 的未提交 `ui.js` 修改在 themed summon import、debut guard、post-pull routing；本輪唯一 renderer 修改不與這三處重疊。未 merge 或複製該線的未提交程式與內容。
- 前輪未找到的 `docs/engineering/QUESTNOTE_ARCHITECTURE.md`、`ROADMAP.md` 仍不是目前本機已提交基底的文件；不假定其存在於另一未合併分支。實作以目前程式、`docs/roadmap-progress.md` 與已核准 audit 為依據。

## 實際完成

1. DOM 順序改為選池 → 池名／星塵 → 單抽與十連價格／操作 → 保底／機率 → 解鎖進度 → 角色展示／詳情 → 每日祝福。鍵盤順序跟隨 DOM，沒有用 CSS order 製造不同操作順序。
2. 移除純裝飾大星號區塊；池名在操作區保留一份，stage 不再重複顯示同一池名。標準池、單一 active pool、無主題但有解鎖的池都保留可見池名。
3. 單抽為主要操作，十連為次要 surface 按鈕；兩者至少 48px 高，價格緊鄰並透過 `aria-describedby` 關聯。可用／不足／召喚中仍由原有流程決定。
4. 保底並排、機率標籤減少裝飾。卡池 surface／text／border／accent tokens 成對使用，修正 sweet 主題覆蓋深色卡池底色造成的低對比；機率標籤內層文字也繼承正確色票。
5. 保留角色圖片、稀有度、剪影、晨醒狀態、雙主角展示、解鎖 details、卡池詳情與原本的 click handlers。角色圖上限由 11rem 調為 13rem，實際尺寸仍由可用欄寬決定。
6. `APP_VERSION` 更新為 `3.4.8`，cache 為 `questnote-preview-cache-v348-ui-polish`，新增 stylesheet 已加入 precache。

獨立 diff review 發現的 accessible description 問題已修正：按鈕只引用價格；不永久引用可能已隱藏但仍含舊錯誤文字的 hint。

## Before / After

390×844、2000 星塵、details 收合、無入場 overlay 的 renderer fixture：

- Default 標準池單抽起點：約 y=801 → y=295。
- Default 永眠花海單抽起點：約 y=1302 → y=295。
- After 兩個操作均在 y=295–343，早於底部導覽列 y=780；池名、餘額、價格、保底也都在首屏。
- Sweet 使用相同 DOM／資訊主次／操作語意，僅視覺色票不同；缺額提示仍就近出現，沒有用淡到難讀的 opacity 表示 disabled。

Before 圖含驗收工具外框，內部 app iframe 為 390×844；After 為純 390×844 截圖。所有圖均來自實際產品 DOM／CSS 與 synthetic 資料，非設計 mockup。

- [Before 標準池 Default](before-standard-default-390.jpg) · [Sweet](before-standard-sweet-390.jpg)
- [Before 永眠花海 Default](before-dream-default-390.jpg) · [Sweet](before-dream-sweet-390.jpg)
- [After 標準池 Default](after-standard-default-390.jpg) · [Sweet](after-standard-sweet-390.jpg)
- [After 永眠花海 Default](after-dream-default-390.jpg) · [Sweet](after-dream-sweet-390.jpg)
- [After 晨醒](after-awakened-default-390.jpg) · [星塵不足 Sweet](after-insufficient-sweet-390.jpg)

## 驗收

- `npm test`：113 tests + 34 logic assertions 通過，涵蓋原有交易、保底、解鎖、重複補償、SSR+ queue/order/skip、cache/release 與 pipeline 回歸。[完整輸出](node-tests.txt)
- 變更 JavaScript 的 `node --check` 與 `git diff --check` 通過。
- 手機 renderer 矩陣：標準、永眠未解鎖、晨醒、synthetic 無主題解鎖、synthetic future CSS-token probe × default/sweet × 320/390/430，共 30 組、702 checks 通過。[輸出](mobile-matrix.txt)
- 矩陣包含池名／資源／價格／操作首屏位置、橫向溢出、成本邊界、disabled/hint、DOM／tab 順序、details/aria-expanded、單一 active pool、未知 theme 提供 tokens 時的配色。Synthetic token probe 是 CSS 相容性測試，並非實際 Glacier 卡池測試。
- M4 native browser：10 cases 通過，含無主題解鎖、legacy locked/awakened、全部池 inactive、安全文案、SSR gift normal/fallback、moon reveal、debut cleanup、pending unlock resume。[輸出](pool-contract-browser.json)
- 真正 UI 抽卡：390×844，兩主題共 16 cases 通過。快速連點單抽只扣 75 一次；十連確認的 Cancel/Escape/×/backdrop 還原同一結果 DOM、焦點與全資料快照；同池改價拒絕舊報價；成功十連扣 750、10 張結果、10 個 N 重複碎片、正確 counters；關閉後解除鎖定且不再寫入。[輸出](draw-browser.json)
- 原生 Tab 手動確認：卡池 selector → 單抽 → 十連；焦點 outline 可見。操作 description 只引用當前價格。
- 桌面 1280×844、永眠花海兩主題各 21 checks 通過；沿用既有置中 app 寬度，沒有橫向溢出。[Default 輸出](desktop-default.txt) · [Sweet 輸出](desktop-sweet.txt) · [Default 截圖](after-dream-default-desktop.jpg) · [Sweet 截圖](after-dream-sweet-desktop.jpg)
- 瀏覽器測試使用 Reduced Motion 模式；新樣式不新增動畫，也不改原有 reveal/debut/awakening controllers。

抽卡 harness 首跑曾誤讀上一輪已關閉 modal 內保留的 DOM。修正為等待「新節點、open modal、正確主題及結果種類」後重跑通過；沒有因此修改產品交易或 resolver。

## Changed files

產品：`index.html`、`src/ui.js`（一行）、`src/summon-polish.css`、`src/version.js`、`service-worker.js`。

驗收：`devtools/summon-polish-test.html/js`、`devtools/summon-polish-draw-test.html/js`、`devtools/summon-polish-regression.html`、本報告與截圖／測試輸出。既有 M4 harness 透過新的 HTML wrapper 重用，沒有覆蓋 Card Pool 正在修改的測試檔。

## 整合風險與保留項目

- 文字衝突主要在 `src/version.js` 與 `service-worker.js`。整合時需選定共同版本／cache 名稱，合併 precache 清單（UI styles/helper 與 Card Pool scene 檔都必須保留）。
- `src/styles.css`、卡池 contract、presentation/transaction controllers、data/catalogs 未修改。本輪 `ui.js` 變更與目前 Card Pool 的 routing hunks 不重疊。
- 新 stylesheet 在原 stylesheet 後載入，卡池面板採其 surface tokens。Card Pool 的 Glacier 面板 gradient 在整合後會由其 token surface 呈現；需在含實際 Glacier 內容的合併版本確認最終外觀與演出。未宣稱已測未合併的 Glacier 流程。
- 舊主 stylesheet 的歷史疊加規則仍存在；本輪只作局部覆寫。標準池仍沿用既有的純資訊 presentation，沒有擅自新增角色或卡池內容。
- 真實 iOS／VoiceOver、已安裝 PWA 更新與完整離線生命週期不在這輪 native desktop browser 驗收範圍。未部署、未修改正式使用者資料。

## 重跑

從此 worktree 執行 `node devtools/ui-polish-server.mjs`，使用其新回傳的 localhost port。伺服器禁止 SW，測試資料庫使用每次產生的 `QuestNoteTest-*` 名稱。

1. `/devtools/summon-polish-test.html`：初始化後可切換場景／主題／320–430 手機與 1280 桌面，或跑手機矩陣。此頁會攔截抽卡提交，只驗證 renderer；純截圖模式按 Escape 返回。
2. `/devtools/summon-polish-draw-test.html`：自動執行實際抽卡的 16 cases，結束只刪除它自己的 UUID DB。
3. `/devtools/summon-polish-regression.html`：既有 M4 的 10 cases，載入目前產品 styles。
