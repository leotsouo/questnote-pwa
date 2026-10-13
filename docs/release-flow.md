# 驗收與發布流程

一套固定流程：在 `dev` 開發 → 更新同一個預覽網址 → 使用者在同一個 PR 驗收 → 一句「可以」完成正式發布。

| 項目 | 固定位置 |
| --- | --- |
| 開發分支 | `dev` |
| 驗收入口 | 唯一開啟的「持續整合：dev → main」PR |
| 預覽 | <https://leotsouo.github.io/questnote-pwa-preview/>（preview profile、`QuestNotePreviewDB`） |
| 審查頁 | <https://leotsouo.github.io/questnote-pwa-preview/reports/review/> |
| 正式站 | <https://leotsouo.github.io/questnote-pwa/>（`gh-pages`、production profile、`QuestNoteDB`） |
| 本機 | `npm run serve` → <http://127.0.0.1:8000/> |

## 平常：開發與預覽

1. 在 `dev` 上修改、跑相關測試、commit、`git push origin dev`。
2. 巡查可能推了新信件到 `main`：`git fetch origin` 後用 `git merge origin/main` 合併進 `dev`（不 rebase）。
3. `npm run preview:deploy`（需要乾淨的 `dev`）。它會：
   - 用 `scripts/releaseArtifact.mjs` 組裝 preview artifact 到系統暫存目錄，並用 `verify-release-artifact` 逐檔驗證；
   - 把預覽 repo（`leotsouo/questnote-pwa-preview` 的 `main`）的內容換成這個 artifact，核對 commit 後的每個 blob 與 artifact 位元組相同，再正常 push（不 force）；
   - 等 Pages 換版，用 HTTPS 逐檔讀回比對 SHA-256，結果寫到 `.dev-backups/evidence/preview-deploy-latest.json`。
   - `--dry-run` 只組裝與驗證；`--review-dir <資料夾>` 同時覆蓋固定的審查頁。
4. 更新 PR 說明：做了什麼、驗證結果與數字、需要使用者決定的事。截圖與 log 留在 `.dev-backups/evidence/`。

預覽站和正式站是同一個網域下的不同 scope，資料庫與快取各自獨立；預覽站的操作不會影響正式存檔。已開啟的預覽分頁要全部關閉再重開，新的 service worker 才會接手——不要清除網站資料。

## 使用者說「可以」或「可以發布」之後

這句話代表一次到位。確認它是針對目前 PR 的最新內容後，在乾淨的 `dev` 上執行：

```bash
npm run release:production -- --confirm 可以發布
```

腳本依序做以下事情，任何一步失敗就停下，不會略過：

1. 確認本機 `dev` 等於 `origin/dev`，且 `origin/main` 沒有 `dev` 缺少的 commit（有的話先合併、重新預覽、重新確認）。
2. 等 PR 的 CI 全部通過，把 draft 轉為 ready，用 **merge commit** 合併（不 squash，`dev` 才能 fast-forward 跟上）。
3. 切到 `main` 並 fast-forward，從這個確切的 commit 組裝 production artifact 並驗證。
4. 核對 `gh-pages` 上的 `data/global-mailbox.json` 與 `main` 相同（不同代表有信件只發到一邊，停下來照信箱流程處理）。
5. 把 `gh-pages` 的內容換成 artifact，核對每個 blob，正常 push。
6. 等 Pages 換版，用正式 HTTPS 逐檔讀回比對 SHA-256。
7. 切回 `dev`，fast-forward 到 `main` 並 push。
8. 把結果寫到 `.dev-backups/evidence/release-v<版本>.json` 並印出摘要。

完成後由 Claude 在 `dev` 的 `docs/final-integration.md` 加一小段發布紀錄（版本、PR、source commit、artifact ID、gh-pages commit、驗證檔案數），這個 commit 推上去時開下一輪的「持續整合：dev → main」PR。

`npm run release:production -- --dry-run` 只從目前的 checkout 組裝並驗證 production artifact，不合併、不推送，可隨時用來確認組裝沒問題。

## 這套流程不包含的事

- **新卡池**：仍需先完成 [新卡池 SOP](new-card-pool-sop.md) 的整包驗收（`poolReleaseReview.mjs` 的 package hash、使用者對同一個 hash 說「可以發布」），再走上面的發布。
- **信箱公告與補償**：由雲端巡查管理，見 [mailbox-publishing.md](mailbox-publishing.md)。不手動改 `data/global-mailbox.json`。
- **後端（Cloudflare Worker／D1）**：另外明確要求時才部署，見 [feedback.md](feedback.md) 與 [daily-reminder-system.md](daily-reminder-system.md)。
- **已安裝的 App**：網站產物更新不等於每個開著的 App 都已套用。使用者關閉所有 QuestNote 分頁與主畫面視窗後重新開啟即可更新；不清資料、不強制啟用 service worker。iPhone 專屬行為需要真機確認。

## 回復

- 來源：每個 commit 都可以單獨 `git revert`；被移除的歷史檔案從 tag（最早是 `pre-cleanup-2026-10-14`）取回。
- 正式站：`gh-pages` 的每個發布都是一個 commit；回復是把上一個已驗證的 artifact 再發布一次（新的 commit），不是改寫歷史。runtime 回退必須能讀目前的存檔格式，否則改用向前修正。
- 撤回卡池：停用卡池並保留寵物、Lore、圖片與 ID，不還原使用者資料。
