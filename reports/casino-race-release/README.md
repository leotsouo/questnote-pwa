# V3.9.3 星辰賭場正式發布 — 2026-10-10

使用者明確授權「現在可以推到正式版」，並要求隱藏劇本名稱、入口移至郵件同排、加入錢雨動畫。正式網址：https://leotsouo.github.io/questnote-pwa/ 。

## 本次內容

- 郵件同排增加骰子圖示入口，普通／易讀模式皆可進入；每日祝福舊入口移除。
- 開啟星辰賭場時播放 24 枚星幣雨；不擋操作，減少動態偏好下停用。
- 四種 20 秒賽事均勻隨機選擇；每段播報 4 秒，正式介面只顯示「比賽進行中」，不揭示劇本名稱。
- 活眼終點只保留眼睛造型，背景保留跑道；另有正常、睡過頭、跑反方向的演出。
- 動畫呈現已原子保存的結果；勝率、下注規則、賠率、每日限制與備份格式保留。

## 發布身份

- [來源 PR #93](https://github.com/leotsouo/questnote-pwa/pull/93)，功能 commit `d184ec4da90f0fbe72fa52113fbd52dcc0483c28`，main 合併 `affa93df83eaeb9f0ceb418a31a0176bd6b461a3`。
- [PR CI 37957604914](https://github.com/leotsouo/questnote-pwa/actions/runs/37957604914) 與 [main CI 37958025531](https://github.com/leotsouo/questnote-pwa/actions/runs/37958025531) 成功。
- production artifact：`29f573c8b16810a89354b46383dc00dee6a92e02d3d79d31959c585fa91d77da`。
- manifest SHA-256：`d120f859248aa6d8bbf2a3dd6b2d5c7ef53ded298e06e560baa4717605e3c1c2`。
- gh-pages：`fd3a084b2132d8e305c6561d1f2c171554021604`，以 `48be5954b60dcd1c27d5d192922f6753b1e5597b` 為 parent，正常 fast-forward 推送。
- [Pages 37958793695](https://github.com/leotsouo/questnote-pwa/actions/runs/37958793695) 成功。
- 160 位夥伴／8 池與原 catalog 保留；contentHash `71aefb86f17b64f793d310a9ac10b28e0d670bfdc6c4e1a09f269bc24af7a014`。最新公告保留 Git／正式站原 bytes，SHA-256 `78ead11960d5d574d320fa7b0286d423828925f116c2110c5ea5064eb9f6f957`。

## 驗證

- 完整 npm test、JavaScript 語法檢查及 scene targeted tests 11/11 通過；四種劇本 × 四位勝者 × 1,001 個時間點保持保存的勝者先抵終點。
- 來源原生瀏覽器 10 組驗收通過：同排入口／錢雨、20 秒自然結束、未下注觀賽、略過／重載、雙分頁一次結算、交易 rollback、備份還原、減少動態與離線開賽。
- 固定 production／preview 產物原生瀏覽器 18/18 通過；正式產物下注 500、1900 總返還揭示、隱藏劇本名稱、保存賽果、備份與離線觀賽通過，無 page errors。
- V3.9.2 → V3.9.3 原生 SW 更新通過；2,468 星塵、收藏、已完成賽事及所有玩家進度欄位一致。僅排除信箱背景擷取時間欄位；閱讀／領取紀錄保持一致。gzip、舊快取移除與離線啟動通過。
- 769 個部署 Git blobs 與 768 個正式 HTTPS 檔案（含 manifest、不含 .nojekyll）全部雜湊一致。
- 正式網址全新私有 Chrome：V3.9.3、頁面／SW artifactId 一致、賭場入口、四位選手、離線重載通過，無 page errors。見 [正式驗收](formal-browser.json)、[線上](formal-mobile-race.png)及[離線畫面](formal-offline-race.png)。

## 限制與保留

原生驗收使用隔離 Chrome 及手機 viewport；實體 iPhone／Android 未執行。本機右側原有正式分頁曾按更新，但遇到另一個 QuestNote 視窗仍開啟的正常更新保護，因此不宣稱該既有分頁已啟用 V3.9.3；關閉其他視窗後可再按更新。未在正式玩家存檔下注。

首次來源瀏覽器驗收發現共用圖示轉換器重寫裝飾字元，已修正為骰子 SVG 與 CSS 星幣；第二次為舊 10 秒動畫測試等待不足，改按 20 秒常數設定 timeout。修正後來源全套瀏覽器通過，沒有放寬結算或完整性檢查；失敗診斷仍保留。

完整不可變產物及測試輸出由磁碟治理登記為 release-evidence／hold，位於本任務 worktree 的 .dev-backups/release-runs/v393-*；本目錄保存長期發布證據。來源試玩頁維持可用，正式產物不包含 devtools 試玩選單。
