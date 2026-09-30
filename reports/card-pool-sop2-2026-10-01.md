# 卡池 SOP 2 工具交接 — 2026-10-01

完成 [新卡池發布 SOP](../docs/new-card-pool-sop.md)、AGENTS 入口、Pipeline／系列／release 文件與新 AI handoff。僅流程、scaffold、validation、artifact tooling 和測試；沒有下一池正式內容，沒有改動蜜光糖庭或正式 data/assets/runtime，沒有 push／merge main／部署。

## 基準與內容

- 功能分支：`codex/pool-release-sop`。實作期間核對正式站已更新至 V3.4.37，功能分支再 fast-forward 至 `origin/main` 的 `d2edcea8a56a08ef4486aaa0bcad93b00c18a20e`，完成新版回歸。
- 2026-09-30T21:46:01.871Z 唯讀正式 HTTPS 核對：artifact `a63513a696737209d41aa8ec6a1d7f1c1540b390b7e893beaa9c0b19f2a6c1f5`，runtime source `704896b876b0316b4182da7052b36ffc5c464a31`，descriptor 與 manifest 相符。此為既有正式部署，並非 SOP 工具發布。
- SOP 最前面要求企劃／訪談前同步正式版本；固定三題後 AI 完成前期，人工只審卡圖／最終整包。預設 12 可調整，一種新食物，逐隻偏好／探險專長，地區按需新增且評估必填。優先使用已確認不额外計費的適用產圖外掛，保留實際工具與費用依據。
- SOP 2 `ecosystem.json` 與 baseline、runtime hashes 進入 content approval／candidate。缺少新食物、偏好、專長、地區評估／完整地區或費用依據會阻擋。Assembler 核對完整 companion catalogs、原 baseline 及來源漂移，將實際資料納入同版 precache。
- 最終唯讀 `poolReleaseReview.mjs` 綁定兩種 artifact、來源、candidate、實際驗收證據及人工整包／明確發布授權；未就緒 exit code 非零。Local receipts 不具數位簽章，不能取代真實人工同意。Synthetic candidate 不可取得發布就緒。

## 驗證

- `npm test`：231 tests PASS（215 主套件、11 theme、5 Honeylight），既有召喚流程 Node assertions PASS。最後修改另跑 Pipeline／最終 gate focused 22 tests PASS，以及備份／最終 gate 20 tests PASS。
- `npm run pools:validate`：四個正式池 PASS；`npm run images:check`：96 隻 ×2 sizes PASS。變更 JS 語法與 `git diff --check` PASS。
- `npm run test:pool:release`：全 catalog 合成演練 PASS、candidate 重現 PASS、實際 gacha planner PASS；新食物／偏好進入兩種完整 artifact 且通過 strict verifier。重新 self-hash 的食物竄改被拒絕，synthetic 最終 release gate 被拒絕。
- [最新隔離瀏覽器證據](card-pool-sop2-browser-2026-10-01.json)：13/13 PASS，含新食物實際製作→送禮推薦→150 bond EXP、實際專長、連點不重複製作、不同 profile DB、legacy worker 自然更新、快取修復與 503 離線啟動。測試自動清除其自有 origin 的 DB／cache；不接觸正式玩家資料。
- 新增地區的 complete/incomplete 故事、發現與五里程碑、專長與實際 source runtime 相符，另由 focused tests 覆蓋。沒有宣稱新增地區的裝置驗收，因本次没有真實地區。
- 首輪完整測試因新 worktree 缺既有 `web-push` 依賴失敗；依 lockfile `npm ci` 補齊後 PASS，沒有新增 dependency。初版 browser fixture 直接備料後未刷新 App state，修正 fixture reload 後重跑 PASS；正式 runtime 未修改。

## 合成產物 pins（不是正式發布）

- Candidate：`154587c6d5aeb83fd7360cf073d19e014a3f417a629d81b2f16466f174dde524`。
- Production fixture artifact：`98e34905071befb60e8ef7fcac44c68d8a41e5e4ec1cf2db8036d27be90bf3a7`；manifest SHA-256：`a174ffb7082b41ac8bfa4a06f4d59fd9b5b70371e8a818b40d8138d2aa11872a`。
- Preview fixture artifact：`f690ea60761d2380e6dc44c30c955ba41e0eaa10b763e400dd9beadc9831c5e2`；manifest SHA-256：`f99d7e3cc9ebde495cc42b3b0df8859ba5621b27622a4be9043fbce59717698d`。
- 本地演練保存於 `%TEMP%/questnote-pool-rehearsal-9p6r6f/rehearsal.json`；原 artifacts／candidate 未覆寫。6 隻合成寵物、1 種測試食物只在 disposable fixture source 與本地 artifacts 內。

下一次提出卡池時，直接依 SOP 最前面的同步與三題啟動。真正發布時仍需要該池的人工卡圖核准、實際整包預覽與明確「可以發布」；本交接沒有授予下一池發布權限，也沒有產圖服務費用。
