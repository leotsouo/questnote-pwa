# V3.5.19 — 全部切換改為完整卡池登場

使用者要求去除短過場，保留完整卡池登場，以蜜光糖庭原版完整登場的時長為基準。這是本機完整 App 記憶體展示版的工程修正；未合併、推送或發布，人工最終體驗待驗收。

## 時間與觸發

回查 `44cd234` 的 `src/themedSummonController.js`，蜜光糖庭正常完整入場為 3400ms，淡出 550ms。V3.5.19 全部卡池首次進入未看過的卡池、手動切換（包含再訪）及「重看卡池登場」均使用此完整分鏡。播完保留畫面等待使用者繼續，演出中可略過或 Escape；等待閱讀時間不算入固定秒數。

- 正常：3.4 秒完整登場 → 等待繼續 → 0.55 秒淡出；固定部分 3.95 秒。
- 減少動態：0.5 秒完整靜態構圖 → 等待繼續 → 0.24 秒淡出。
- 移除 0.9 秒短版計時、短版樣式及依首次／再訪選擇長短的邏輯。原生 controller、新版展示及作者預覽工具一致。
- 場景主動作須在 3264ms 內完成。逆造之誓的自然研究／人工逆造動作改取共用場景時間，不保留舊 5.8 秒；原始鏡池第二道漣漪也完成於新窗口內。
- 抽卡前奏 3 秒、SSR 2.5 秒、UR 4.5 秒、身份交接及下一位 240ms 維持既有設定。

## 實際驗證

Windows Chromium，V3.5.19，本機固定展示資料。桌機 1280 × 720，六池切換均進完整畫面，非短版；文字 opacity 為 1，繼續提示存在，沒有水平溢出。controller 實際完成時間包含瀏覽器排程延長，設定均為 3400ms。

| 卡池 | 切換完成 ms | 淡出設定 ms |
| --- | ---: | ---: |
| 星旅之原 | 3428 | 550 |
| 永眠花海 | 3412 | 550 |
| 霜誓峽灣 | 3427 | 550 |
| 蜜光糖庭 | 3417 | 550 |
| 劍隱山河 | 3463 | 550 |
| 逆造之誓 | 3417 | 550 |

逆造之誓首次進入實測 3462ms，場景 computed duration 3.264s；另實際操作重播及再次切回星旅之原，皆完成完整登場，Escape 回選單。六池截圖及轉錄量測見 [桌機紀錄](complete-entry-desktop-qa.json)。桌機暫存瀏覽器控制在 viewport 設定時逾時重設，未重做或編造其量測；手機改由獨立本機頁驗證。

393 × 852、標準字級、蜜光糖庭正常登場 3423ms。320 × 852、200%（root font 32px）的三套 Theme，減少動態 509–523ms，完整文字位於畫面範圍，無活動 CSS 動畫或水平溢出。略過前尚未 ready，只有一個 overlay；Tab 留在登場操作，略過後焦點回重播按鈕，捲動樣式還原，console warnings/errors 為空。展示標示依字級保留按鈕空間，大字實測標示右緣 140px、繼續左緣 198.67px，沒有遮擋。見 [手機紀錄](complete-entry-mobile-qa.json)。

測試設定及暫時 viewport 已還原，交付頁標示 V3.5.19。可操作 [本機 App](http://127.0.0.1:4193/?review=v3519) 與 [畫面紀錄](http://127.0.0.1:4193/reports/companion-app-test/ceremony.html)。

## 工程檢查與待驗

- `npm test`：303 tests 及既有 reveal-flow logic assertions 全通過；[log](complete-entry-npm-test.txt)。
- 展示 session、identity、ceremony focused checks：18 項通過；[log](complete-entry-focused-tests.txt)。
- 修改的 JavaScript 及兩個 HTML inline module 語法檢查通過，Git whitespace check 通過；版本與 cache name 同步。無新增 runtime 模組，precache closure 不變。
- SOP 共同時間、切換規格及動畫檢視頁要求已更新，歷史 V3.5.16／17 紀錄保留並明確標示新規格取代之。
- 本輪工程驗證通過，使用者最終動畫體驗尚待驗收；iPhone VoiceOver、原生字級、觸覺與裝置效能仍待真機驗證。
