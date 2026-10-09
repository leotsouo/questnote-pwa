# 賭場入口標題重疊修正 — 2026-10-10

首頁原本只替信箱預留空間，新增賭場入口後會擋住主題名稱。一般模式的 masthead 現在替兩個 44px 按鈕、12px 間距與右側 inset 預留 126px，允許品牌／主題自然換行並取消舊的單按鈕 margin。易讀模式維持自己的工具列。

Chrome 54 組主題（default/sweet/twilight）、字體（standard/large/extra-large）、viewport（320/375/390/414/768/1440）檢查：品牌／主題不與兩個入口重疊、完整主題文字在視窗內、44px 觸控區保留。實際點擊賭場入口成功；完整 npm test、版本／SW 語法與 git diff --check 通過。另在 390px 暮光畫面等待通知消失後截圖，避免通知遮住驗收目標。

來源版本與 SW cache 同步至 V3.9.4，修正版在本機 http://127.0.0.1:55453/index.html 可檢視；尚未推送或部署，正式版本仍為 V3.9.3。完整日誌／生成證據在 .dev-backups/test-runs/casino-entry-layout* 登記為 release-evidence／hold。
