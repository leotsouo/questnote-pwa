# 正式分享只走官網 — V3.4.39

本輪依使用者後續 Social Share Preview brief 更新：不重設 App Icon、不用放大 Icon 當 OG。先前未發布的狼形 Icon 預覽方案已撤回，改用官網正式的 1200×630 campaign poster。

- 原生 Web Share 的 text 不含網址，url 只使用 https://questnote.taste-compare.com/。
- 複製與不支援 Web Share 的備援，使用同一段短文案與官網 URL，整段只有一個網址，不會再產生 App 與官網兩張預覽。
- App 仍提供直接開始入口，但它不再包含於對外分享訊息。官網 CTA 可開啟實際 App；不轉址或改動 GitHub Pages、存檔或離線架構。
- 舊 App 網址的 OG/X 預覽也使用官網同一張新版 campaign poster 作為 fallback，避免仍出現放大紫色 Q。OG title 為「QuestNote｜小事完成，冒險繼續」。
- 分享卡內原有紫色 Q 引用改用既有正式品牌資產，不修改任何 App Icon 原圖。其他教學、提醒 UI 修改已撤回。
- 不改 Theme / Quest / Pet progression。版本與 cache 同步到 V3.4.39。

分享服務 tests 通過，原生與複製均只有官網 URL；30 組實際 Edge/Playwright 的五寬度、三主題、兩字級分享/版面驗證通過，axe 15 組無違規。截圖在 reports/social-share-app/local。

官網 campaign、十組文案比較、LINE/X/Discord 模擬與三組貼文文案由獨立 codex/social-share-preview 分支維護，沒有合併整個官網 PR 到 main。部署驗證另記。實機分享面板及 LINE 第三方快取不能由桌面模擬宣稱已驗收。
