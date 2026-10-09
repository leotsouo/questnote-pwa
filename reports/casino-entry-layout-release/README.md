# V3.9.4 賭場入口排版修正正式發布 — 2026-10-10

使用者明確要求「發布到正式站」。[正式網址](https://leotsouo.github.io/questnote-pwa/) 已啟用入口修正：替賭場／信箱兩個按鈕預留空間，窄螢幕品牌與主題名稱自然換行，不遮住暮光冒險手帳。

## 發布身份

- [來源 PR #95](https://github.com/leotsouo/questnote-pwa/pull/95)，功能 commit `cabc85655afda4273a7208b721e97ecd6343be79`，main 合併 `3c12083e77a927b0096fbf0acf9acca636c4dff2`。
- [來源 CI 37973675067](https://github.com/leotsouo/questnote-pwa/actions/runs/37973675067) 與 [main CI 37973887445](https://github.com/leotsouo/questnote-pwa/actions/runs/37973887445) 成功。
- production artifact：`03c5e6ec03a3fb116f9a8431e906649f9098bf64e87557b4435210706b74f0a6`，manifest SHA-256：`4b8860f948624d9c0f4b914417c2147e668c3006e5314d0b14a720aeecb0a3de`。
- gh-pages：`43ca5ca1099ed9e5d306e52c92d7f4911aa8d329`，parent：`fd3a084b2132d8e305c6561d1f2c171554021604`，正常 fast-forward 推送。[Pages 37974581251](https://github.com/leotsouo/questnote-pwa/actions/runs/37974581251) 成功。
- 160 位夥伴／8 池保持原 catalog；發布前核對並保留正式公告原 bytes。來源、production／preview pins 與授權見本目錄 JSON。

## 驗證

- 來源完整 npm test、JS 語法與 54 組主題／字體／viewport 幾何及入口點擊檢查通過，見 [修正驗證](../casino-entry-layout-2026-10-10/README.md)。
- 固定 production／preview 原生瀏覽器 18/18 通過；正式產物另驗證 320／390／414px 暮光標題與兩個按鈕無重疊、入口開啟、下注／保存結果、備份、略過及離線觀賽。
- V3.9.3 → V3.9.4 原生 SW 更新：2,468 星塵、收藏、已完成賽事及所有玩家進度一致；只排除信箱擷取時間 metadata。gzip、舊快取移除與離線重載通過。
- 769 個部署 Git blobs 及 768 個正式 HTTPS 檔案全部與固定產物一致。
- 正式站全新隔離 Chrome 確認 V3.9.4、頁面／原生 SW artifactId 相同、暮光標題未重疊、賭場四位選手、離線啟動，無 page errors。見 [正式瀏覽器](formal-browser.json)、[正式首頁截圖](formal-casino-header.png)與[離線截圖](formal-offline-race.png)。

首次正式回讀有一張既有覺醒圖片回傳 HTTP 503，故全套回讀判為失敗。第二輪降低並行請求至四個，對暫時 HTTP 錯誤最多重試三次，再對所有成功回應照原 size／SHA-256 規則核對；完整結果與 retry 明細已保存。失敗診斷保留並登記 review。

原生 Chrome 使用 390×844 viewport；實體 iPhone／Android 未執行。未操作正式使用者的既有存檔或下注。不可變產物、完整日誌與生成材料在 .dev-backups/release-runs/v394-* 登記 release-evidence／hold。本目錄是長期發布證據；上一階段「尚未部署」報告記錄当時本機驗收狀態，本收據更新部署結論。
