# 活眼終點線本體修正 — 2026-10-10

正式 HTTPS V3.9.8 已核對四種演出 normal／living-finish／nap／wrong-way，以及 controller 使用共用 scene。讀回檔案 SHA-256 符合實際 live manifest；artifact af81a876ca6928ffbf219fb8d4cecbee348a33d3a0bbc587b08bb5962f9e3331，source ef418f80f8a88272fa802ab3c9bddd6e1241b672。早先 V3.9.4 發布 pins 已不是目前正式基線，未沿用舊版當作最新正式證據。

眼睛劇本把 finish marker 的 background 設為 none，造成只剩眼睛；之前誤把「只保留眼睛造型」也套到終點線本體。本次移除該覆寫，復用正常演出的條紋終點線，眼睛仍附在線上眨眼／回看，與本體一起移動。未加旗子或四肢。

來源基於最新 origin/main 4ddf2c5，版本／SW cache 同步至 V3.9.9。npm test、版本及 SW 語法、diff --check 通過。Chrome 390px 四種場景都可播放／略過；每場四條 55px 條紋終點線可見，眼睛版每條有一顆眼睛，其他三種沒有眼睛，活眼線本體實際移動，無 page errors。試玩頁 http://127.0.0.1:55453/devtools/race-theatre.html 使用同一場景和 CSS。

本次修正尚未 push 或部署，正式站仍是此次讀回的 V3.9.8。完整 npm 日誌與 producer recipe／檔案證據在 .dev-backups/test-runs/living-finish-line 登記 release-evidence／hold。未操作正式玩家星塵或存檔。
