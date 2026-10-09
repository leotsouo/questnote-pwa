# V3.9.8 卡池覺醒翻面預覽正式發布

2026-10-10（Asia/Taipei）。使用者於本次工作階段明確指示「推上正式版」，授權整合及正式發布此功能。這次只開放既有覺醒卡的造型預覽，沒有新卡池、卡圖、獎勵或資料遷移。

正式站：[QuestNote](https://leotsouo.github.io/questnote-pwa/)。卡池詳情支援劍隱山河 20 張、黯冠王庭 7 張、霓霞仙膳 4 張，合計 31 張全彩翻面／翻回；未持有角色也可預覽。預覽不消耗資源、不完成覺醒，實際儀式仍由原養成流程解鎖。

## 來源與部署

- 功能提交：`091e9d3e39816306214a6415a67826b69f24b640`。
- [來源 PR #99](https://github.com/leotsouo/questnote-pwa/pull/99) 已合併，主線提交 `4ddf2c5389ef507663b6d3e107301f9adffb6c4d`；PR 及合併後主線 CI 皆成功。
- 不可變產物來源：`ef418f80f8a88272fa802ab3c9bddd6e1241b672`，已由上述合併提交包含。後續提交只有驗證工具與發布紀錄，runtime 相同。
- 正式 artifact：`af81a876ca6928ffbf219fb8d4cecbee348a33d3a0bbc587b08bb5962f9e3331`。
- 正式 manifest SHA256：`14bacb17be129cfdbe45dbd9a305466ce97add8fb2b110da159d8dd225e5c72c`。
- `gh-pages` 部署提交：`d0796e2dd1c361622c86d58a0c850bab6eb57eb6`，從最新正式基準 `dc9f9b815ce17e5e420f0d760e272d473da8896d` 正常 fast-forward，沒有 force push。
- [Pages 建置／部署 37987516048](https://github.com/leotsouo/questnote-pwa/actions/runs/37987516048) 成功，正式 HTTPS `APP_VERSION` 為 `3.9.8`。
- 最新主線及正式站的 `data/global-mailbox.json` 在發布前逐一確認相同，公開郵件及補償保留。

## 驗證

來源的完整 `npm test`、production encounter、pools:validate、images:check 均由 PR CI 通過。相關 26 個 tests、31 位實際 renderer、鍵盤焦點、375×812 手機、桌面、減少動態、載圖失敗／重試等結果見[本機驗收歷史](../pool-awakening-preview-2026-10-10.md)。

預覽與正式產物以 `verifyReleaseArtifact` 驗證所有 bytes、profile、DB、scope、SW precache 與模組閉包。原生瀏覽器 artifact 驗收 18/18 通過，包括 profile 隔離、錯誤包阻擋、快取修復與離線啟動；詳見 [artifact-browser.json](artifact-browser.json)。

使用全新隔離 loopback origin，從實際 V3.9.5 發布包走正常更新橫幅到 V3.9.8：收藏與已完成／領獎的故事章節完全保留，正式 DB 名稱保留、舊 artifact 快取移除，31 張卡的正反兩相在線上及離線都正確載入，離線備份版本為 3.9.8；詳見 [update-offline.json](update-offline.json)。沒有操作玩家的資料庫、清除存檔或強制更新已開啟分頁。

部署 Git tree 的 833 個檔案逐 blob SHA256 驗證；正式 HTTPS 的 832 個檔案（包含 manifest；`.nojekyll` 只驗證 Git blob）逐一比對發布包長度及 SHA256，詳見 [deployment-tree.json](deployment-tree.json) 與 [live-verification.json](live-verification.json)。本機 Node 初次 HTTPS 驗證缺系統憑證鏈，改用 `--use-system-ca` 後保留 TLS 驗證完成，沒有關閉憑證檢查。

設計掃描只沿用展示頁四項明確誤判／既有主題例外的狹義忽略；App 舊樣式及歷史展示頁保留，沒有全域忽略。實體 iPhone 專屬行為尚未驗證；已完成桌面 Chrome 與手機 viewport、更新及離線檢查。

不可變產物保存於治理工具永久保護的 `.dev-backups/release-archive/awakening-v398/`，驗收輸出登記為 hold。工作區及 port 51081 的本機預覽保留，供後續查看。
