# V3.5.9 獅心城探險插畫與卡池配色發布收據

2026-10-02，正式站 [QuestNote](https://leotsouo.github.io/questnote-pwa/) 已發布 V3.5.9。獅心城地圖卡與派遣對話框使用同一張新生成的 16:9 插畫；獅心城卡池採黃銅、氧化銅與蒸汽藍灰背景，與劍隱山河的墨綠背景區隔。三種 App 主題均以實際 computed style 和畫面確認生效。

## 授權與產圖

使用者明確要求「獅心城 探險的圖片也需要生成」「這個也要寫進SOP每次上線後才發現沒做到」，並授權「生成後直接發到正式版」。後續要求「並且卡池背景顏色可以稍微跟劍隱山河做出差別 現在顏色很像」。本次修正依此直接發布授權執行 AI 審圖；不將其記為人工已檢視新生成的圖片，也不改寫一般新卡池的人工驗收規則。

採 Codex 內建 imagegen，產圖前確認現有方案 included usage 可用、未啟用獨立付費 API。完整費用依據、原始圖與成品雜湊、AI 圖像觀察見 [產圖來源紀錄](v359-region-image-provenance.json)；[實際提示詞](v359-region-image-prompt.txt) 保留原文。成品為 [lionheart_city.webp](../../assets/expeditions/lionheart_city.webp)，960×540、226,534 bytes。舊 SVG 留作歷史資料，不再作為獅心城正式探險圖片。

## 來源、產物與正式部署

- 來源 [PR #53](https://github.com/leotsouo/questnote-pwa/pull/53)，合併提交 `3a88db8f227e710c13324860197b73c1ce880573`；產物鎖定的實作來源為 `6b0d5c0cf96f0d8d7cfaab86dca42db3cd23561f`。最新來源 [CI 36988726127](https://github.com/leotsouo/questnote-pwa/actions/runs/36988726127) 通過。
- Preview artifact：`a48a151d94dfb8976678d7272be34051f2707c6645afb7623aa9551436568f03`；manifest SHA-256 `dc5a2da0b193658e2097f9e7ac269a2ca8dc7c66dcb80f1b4aabbc99d7e0279f`。本輪 preview 為隔離 loopback 實際產物驗收，未宣稱部署獨立 HTTPS preview。
- Production artifact：`fc6946ae230b2583071b1e814227d1c8e175b185750fe96e3fe7834b3e9d50e0`；manifest SHA-256 `c5fcf60d26506497f974564f63bb4aca23359134f1f10cafbe09da0b95131af7`。完整 [artifact pins](v359-artifact-pins.json) 與 [發布前授權證據](v359-direct-publication-evidence.json) 保留。
- 整包授權雜湊：`0f64f6fb3641cd9b9be44311b4ecdcda316791dd3a990b975451f78f9c7c3022`。
- `gh-pages` 提交 `9a01e6af5d643b4df88e3e89130595eebb6e76ef`，正常 fast-forward 推送；[Pages 36989205700](https://github.com/leotsouo/questnote-pwa/actions/runs/36989205700) 成功。
- [Git 產物驗證](v359-git-pins.json)：598 個檔案的 Git bytes 全部符合固定產物。`.gitattributes` 為額外部署 metadata，用於保留產物原始換行。
- [正式 HTTPS 讀回](v359-production-https.json)：2026-10-02T09:23:02.157Z，598 個檔案全部 byte count／SHA-256 相符，0 個失敗。包含 manifest、新圖片、配色 CSS、版本、Service Worker 與內容 bundle。

## 驗證與內容保全

- `npm test`：281 個整合案例、11 個主題案例、5 個動畫案例及 reveal-flow assertions 通過；卡池資料驗證、128 隻寵物的卡圖／缩圖與 8 張探險 WebP 完整解碼、發布 pipeline 測試及修改 JavaScript 語法檢查通過。
- 固定最終產物的 [功能瀏覽器驗收](v359-browser.json) 12 項、[動畫驗收](v359-animation.json) 10 項通過，涵蓋真實結果順序、重複 UR、略過、減少動態、圖片失敗及交易／收藏不變。
- [V3.5.8 → V3.5.9 更新驗收](v359-update.json) 8 項通過，涵蓋 waiting worker、忙碌／編輯／其他視窗阻擋，以及斷網時地圖卡和派遣對話框的真實新圖片解碼；保留玩家存檔与主題選擇。
- [畫面驗收](v359-visual.json) 比對三種 App 主題下兩個卡池的實際背景，確認 390×844 手機與 1280×900 桌面地圖／對話框圖片載入、裁切及溢位。[手機卡池](v359-lionheart-pool-mobile.png)、[手機地圖](v359-city-map-mobile.png)、[手機派遣](v359-city-dispatch-mobile.png)、[桌面派遣](v359-city-dispatch-desktop.png) 保留。
- 128 隻寵物／6 個卡池與 companion 資料的 canonical semantic hash 保持 `588aae49654b5f9bb3b13a2d2d63157964366274bb076c5212e6a76017344ef6`；既有 UR 動畫構圖與時間、角色、經濟規則及資料庫契約未變更。
- 最新正式信箱修正已保留，推送前以完整 JSON 比對全部內容與獎勵 identity；新 pinned artifact 使用來源 checkout 的 CRLF 序列化，故 raw hash 與先前部署不同。更新測試只排除已知 lastFetched 與公告版本 lastSeenGeneratedAt 的預期變動，仍驗證已讀／已領取 identity 及其他玩家 store。
- 首輪共用測試 origin 造成動畫前後 fixture 狀態比較失敗，以及信箱版本時間戳的更新診斷，分別保留在 `v359-initial-animation-concurrent-fixture-failure.json`、`v359-update-mailbox-diagnostic.json`；分離 origin 並修正預期時間戳檢查後，最終固定產物全部通過。歷史產物、前輪 pins、V3.5.8 收據與既有草稿保留。

## 後續 SOP 必做項目

[新卡池 SOP](../../docs/new-card-pool-sop.md)、[技術流程](../../docs/card-pool-pipeline.md) 與 `AGENTS.md` 現要求新增地區必須有生成插畫、來源／費用依據／雜湊，納入既有審圖，以及實際桌面／手機地圖卡、派遣對話框裁切與離線驗證。新增卡池亦須比較既有池背景，並驗證所有 App 主題中的實際效果。

`images:check` 與 artifact 組裝共用探險圖片驗證器：缺圖、僅有 SVG 佔位、不完整或無法解碼的 WebP、尺寸不足、比例不符、缺少 Service Worker 預載項目都無法完成發布檢查；以 focused regression cases 驗證。前置授權與產物紀錄維持不可變，本收據單獨記錄實際發布完成狀態。
