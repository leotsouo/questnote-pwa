# V3.9.9 活眼終點線正式發布 — 2026-10-10

使用者明確要求「推上正式版」。正式站：https://leotsouo.github.io/questnote-pwa/ 。恢復活眼劇本的條紋終點線本體，眼睛附在線上一起移動；保留正常、活眼終點、打瞌睡、跑錯方向四種隨機演出及20秒賽程。

## 發布身份

- 功能 commit：7653f04f6596664e38d8830c1118494118d29566。
- [來源 PR #101](https://github.com/leotsouo/questnote-pwa/pull/101)，main 合併 b50b97211a9697dfc011ebc5830dd1419eb1f950。
- [來源 CI](https://github.com/leotsouo/questnote-pwa/actions/runs/37989225440) 與 [main CI](https://github.com/leotsouo/questnote-pwa/actions/runs/37989419828) 成功，包含完整 npm test。
- 不可變產物來源：0db8ba2d73c3aaee3d751805b51378acf82d52e9，main 包含該提交且 runtime 完全一致。
- production artifact：525797ca1b745d90a897c1066619dad37575799d22c8534f65a015f0a876274d。
- manifest SHA256：8550c4f328104368b0182d492f58f288640963186a622f5315021b7afe6c8dec。
- gh-pages：2d5ca66f5cf4182170c92165591660560f161c51，由正式 V3.9.8 的 d0796e2 正常 fast-forward。
- [Pages 37990683141](https://github.com/leotsouo/questnote-pwa/actions/runs/37990683141) 成功。

## 驗證

- 18 項 production/preview 固定產物原生瀏覽器檢查通過；833 個部署 Git blobs 與832個正式 HTTPS 檔案全数 SHA256/長度一致。
- 活眼場景四條终點線均有條紋背景、55px線體與一顆眼睛；使用正式產物實際 renderer。來源四種演出驗收見 ../living-finish-line-2026-10-10/。
- 真實下注／保存結算、備份還原、離線重載與免費觀賽通過。
- 實際 V3.9.8 → V3.9.9 原生 SW 更新通過：星塵2468、收藏、已完成賽事及全部玩家進度保留，舊快取移除，gzip及離線啟動通過。僅忽略公開郵件背景擷取時間 metadata。
- 正式172位夥伴／9池的 contentBundleSha256 與 V3.9.8 一致。公開公告內容與 main 相同，差異僅 CRLF/LF；發布時保存正式 Git/HTTPS 原 bytes。

初次 build 對公告換行格式過嚴，核對正文及正式 Git bytes 後修正驗證並保存原檔。第一次瀏覽器流程沿用160位/8池舊預期，18項固定產物驗證已成功，改為正式172位/9池後後續流程通過。正式 UI 首次截圖遇到非同步提示卡，另於明確收起提示卡後重查。診斷輸出保留，沒有修改發布包來繞過檢查。

不可變產物與完整日誌位於本工作區 .dev-backups/release-runs/v399-*，由治理 producer 登記 hold；本目錄保存長期證據。使用隔離 Chrome／390×844 viewport，實體 iPhone 未執行，沒有操作玩家既有存檔或傳送後端測試訊息。

最後正式 HTTPS 隔離 Chrome 驗收通過：App及原生SW皆為同一V3.9.9 artifact，提示卡收起後標題與入口沒有重疊，四位參賽者正確顯示，離線重載正常，無page errors。見 formal-browser.json。
