# 「更多」功能整理 — 2026-10-03

來源基線：`origin/main` 的 `0d3fbeb4e6fe904652d57bb600d5fb3f1dfe619f`。工作分支：`codex/more-page-organization`。本次只完成來源變更與本機驗收，未合併或發布正式網站。

## 使用者流程

- 首要入口依序為：習慣、每日祝福、成就、工坊；接著是冒險手冊與設定。
- 使用教學、意見與問題回報、分享 QuestNote 及版本資訊集中於預設收合的「教學與支援」。點擊、Enter 或 Space 都能展開／收合；從支援頁返回時保留展開狀態。
- 美術風格功能仍在設定頁內，與提醒、字體及資料備份使用同一入口。設定文字列出這些功能，避免重複的風格捷徑佔據清單。
- 預設可見的選擇由 10 個獨立入口變為 6 個功能入口與 1 個支援入口。未刪除任何功能。
- 習慣、每日祝福和成就的提醒圓點保留；每日祝福仍會直接打開首頁祝福區塊。

## 圖片與美術

沒有修改圖片、SVG 圖示、美術素材、主題、色彩、字型或既有清單列的樣式。CSS 只加入原生 details 的標記隱藏與展開箭頭方向。瀏覽器比較調整前後「習慣」入口，確認圖示 HTML、列高度、padding、背景、邊框、圓角與標籤字型／色彩完全一致。

第一版執行期來源版本為 `3.5.22`；下述習慣頁修正後為 `3.5.23`，`src/version.js` 與 SW cache 同步為 `questnote-preview-cache-v3523-more-navigation`。未增加執行期檔案，原有 precache 已包含所有異動的 App 檔案。

## 驗收結果

- `npm ci --no-audit --no-fund`：成功。
- `npm test`：303 個 Node 測試通過；揭曉流程 Node logic assertions 全部通過。
- `node --check src/ui.js`、`src/version.js`、`service-worker.js`：全部通過。
- `git diff --check`：通過。
- 真實 Chrome 與原生 IndexedDB 驗收：五組檢查全部通過，結果見 [browser-results.json](more-navigation-20261003/browser-results.json)。
- 已驗證所有日常與支援入口、返回流程、原生鍵盤收合、版本資訊、每日祝福跳轉及設定內三種風格／提醒／備份功能。
- 三種主題、393px 手機、1280px 桌面及 320px 特大字體的收合／展開狀態皆無水平溢出。
- 使用隨機名稱的 `QuestNoteTest-*` 資料庫；阻擋外部網路，未使用玩家存檔、未送出正式回報，無執行期錯誤。

## 畫面

| 狀態 | 截圖 |
| --- | --- |
| 調整前手機畫面 | [before-mobile.png](more-navigation-20261003/before-mobile.png) |
| 調整後手機畫面 | [after-mobile.png](more-navigation-20261003/after-mobile.png) |
| 支援區塊展開 | [after-support-expanded.png](more-navigation-20261003/after-support-expanded.png) |
| 晨光花園 | [after-sweet.png](more-navigation-20261003/after-sweet.png) |
| 暮光冒險手帳 | [after-twilight.png](more-navigation-20261003/after-twilight.png) |
| 320px 特大字體 | [after-320-extra-large-collapsed.png](more-navigation-20261003/after-320-extra-large-collapsed.png) |
| 320px 特大字體展開 | [after-320-extra-large-expanded.png](more-navigation-20261003/after-320-extra-large-expanded.png) |
| 桌面 | [after-desktop.png](more-navigation-20261003/after-desktop.png) |

長頁的全頁截圖會把固定底部導覽列畫在擷取當下的可視區位置；實際操作已逐一捲動、點擊與驗證各入口。正式 iPhone 裝置尚未驗收。

## 後續：習慣頁統計區塊銜接

依使用者截圖修正統計外層突兀的方形底色。`habit-stats` 是排列四張卡片的容器，不應套用摘要卡的背景；從共用主題摘要樣式中排除此容器。下方間距由 12px 改為 16px，與內容卡片左右對齊。

四張統計卡的配色、邊框、圓角、padding、字型及數值皆與修改前完全一致，未改動圖片或功能。三種主題、393px 手機、724px 桌面、320px 特大字體皆通過透明外層、卡片對齊與無水平溢出檢查；建立第一個習慣仍可打開表單，無執行期錯誤。等待原有進場動畫結束後測量，實際卡片間距為 16px。

完整 `npm test` 再次通過 303 個 Node 測試與揭曉流程 assertions；版本／SW 語法與 `git diff --check` 通過。僅完成來源與本機預覽，尚未發布。

- [修正後手機畫面](more-navigation-20261003/habit-layout/after-default-mobile.png)
- [修正前桌面畫面](more-navigation-20261003/habit-layout/before-desktop.png)
- [修正後桌面畫面](more-navigation-20261003/habit-layout/after-desktop.png)
- [量測與驗收結果](more-navigation-20261003/habit-layout/results.json)
