# V3.5.17：蜜光糖庭短切換與滿版結果插畫

2026-10-03，本機完整 App 記憶體試演，來源分支 `codex/companion-app-art-test`，前一提交 `a087fe0`。操作頁：http://127.0.0.1:4193/；前後對照：http://127.0.0.1:4193/reports/companion-app-test/ceremony.html。

本次是使用者指定的工程修正。展示資料重新整理重設，沒有新增正式 API、存檔欄位或美術資源；沒有合併、推送或正式發布。工程驗證通過，人工最終體驗待使用者檢視。

## 最終行為

- 六個卡池切換皆使用蜜光糖庭原有的 900ms 短過場，淡出縮至 240ms，共 1140ms；自動回卡池，不再等待繼續。
- 首次選到與再次選到同樣長。修正原本首次選到會播放 6000ms 完整登場的分支；完整入場及「重看卡池登場」仍為 6000ms，完成後等待繼續，淡出 550ms。
- 減少動態切換固定 240ms 靜態停留 + 120ms 淡出，共 360ms。保留各池原場景、美術和共同文字位置。
- 短過場文字在 280ms 開始、300ms 到位；主地景動畫完成於 864ms 內。劍隱山河原本多秒的印記／路徑延遲不再帶進短切換。
- `src/summonTiming.js` 同時提供演出及淡出時間；遮罩 CSS、底下主畫面交接與移除計時一致。清理後還原原本 CSS variable、捲動、背景操作，焦點回卡池選單。
- 結果插畫移除 `max-height:45dvh`，維持 `min(100%,440px)` 寬的 1:1 原圖；背景透明、移除細框及 4px 外框。原來 440 × 345.6 的橫框修正為 440 × 440，原圖貼齊四邊，不裁掉角色構圖。單次與十連逐張共用相同結果模板。較矮視窗自然捲動。
- 抽卡前奏 3000ms、SSR 2500ms、UR 4500ms、下一位 240ms 保持 V3.5.16 設定。

## 瀏覽器量測

使用本機完整 App、固定展示結果，沒有操作正式玩家資料或真正抽卡 API。原始記錄見 [切換 QA](pool-switch-browser-qa.json) 及 [結果圖片 QA](result-full-bleed-browser-qa.json)。

| 卡池 | 正常演出設定／實測至交接 | CSS 淡出 | 減少動態演出／淡出 |
| --- | --- | --- | --- |
| 蜜光糖庭 | 900ms／910ms | 240ms | 240ms／120ms |
| 星旅之原 | 900ms／910ms | 240ms | 240ms／120ms |
| 永眠花海 | 900ms／910ms | 240ms | 240ms／120ms |
| 霜誓峽灣 | 900ms／909ms | 240ms | 240ms／120ms |
| 劍隱山河 | 900ms／937ms | 240ms | 240ms／120ms |
| 逆造之誓 | 900ms／905ms | 240ms | 240ms／120ms |

設定時間相同；實測差異是瀏覽器排程。工具從選擇到確認返回的正常 round trip 1176–1252ms、減少動態 415–427ms，包含工具往返，不能當成純動畫時間。全部自動返回，焦點為 `identity-pool-select-pool`，背景 inert 已解除，overflow 還原。

蜜光糖庭再次切換也自動返回。快速連續選擇只保留一個過場，後續選擇被 busy guard 擋下。Tab／Shift+Tab 留在略過按鈕，Escape 返回選單。完整蜜光糖庭重播實測 6011ms 才顯示繼續，沒有變成短切換。最終遮罩及主畫面交接 computed duration 都是 0.24s，CSS variable 清理後為空。最後新頁面無 console warning／error。

三套 Theme 在 320 × 852、200% 字級下，入場文字左右 24px、區塊底部 749.76px，水平 scrollWidth = 320px。減少動態六池子元素均無 CSS animation。

結果插畫在三套 Theme、1024 × 768 下皆為 440 × 440、原圖 960 × 960、border = 0、背景透明、max-height = none；對話框 clientWidth 與 scrollWidth 同為 683px。393 × 852 下為 320.67 × 320.67；320px／200% 為 232 × 232，對話框寬及 scrollWidth 同為 272px，角色詳細頁可操作。

正常固定十連前奏實測 3015ms；首個 SSR 完整角色演出返回時間為 2625ms、下一個 UR 為 4661ms，含預載與排程延遲。兩次結果插畫都為 320.67 × 320.67，下一位設定仍為 240ms，最後總覽完整十張。未縮短抽卡或角色登場的既定計時器。

## 檢查及交付

- `npm test`：303 項測試及 reveal-flow 邏輯斷言通過。
- 共同時間／記憶體展示相關測試：22 項通過，其中 4 項亦包含於 npm test。
- 修改 JavaScript 與 service worker 的 `node --check`、`git diff --check` 通過。
- 版本與快取同步至 V3.5.17；既有 precache 已包含共用時間模組，本次沒有新 runtime 檔案。
- 短切換、結果插畫比例與驗證規格已更新於 `docs/new-card-pool-sop.md`。沒有把工程測試回填為人工驗收。

截圖：[白邊修正前](screenshots/result-full-bleed-before-desktop.png)、[桌機修正後](screenshots/result-full-bleed-after-desktop.png)、[393px 結果](screenshots/result-full-bleed-after-393.png)、[320px／200%](screenshots/result-full-bleed-320-200.png)、[十連結果](screenshots/result-full-bleed-ten-393.png)、[蜜光糖庭短切換](screenshots/pool-switch-sugar-393.png)、[自動返回](screenshots/pool-switch-sugar-return-393.png)。

本機試演未啟用 service worker，不能代表正式更新／離線驗收。iPhone VoiceOver、原生字級、觸覺與裝置效能仍須實機驗證。
