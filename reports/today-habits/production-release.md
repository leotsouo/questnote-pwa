# V3.5.4 每日習慣直接完成 — 正式發布收據（2026-10-02）

正式站：<https://leotsouo.github.io/questnote-pwa/>。

每日習慣直接顯示在「任務 → 今日」，可勾選、取消今日完成、查看完成進度／連續天數，也能直接新增或管理習慣。未完成項目在前，已完成項目保留供取消；分類篩選同時適用。今日頁不再重複顯示原有數量摘要。

## 來源與部署

- [PR #44](https://github.com/leotsouo/questnote-pwa/pull/44) 經 CI 通過後合併：`38288b3424ece2ef020c0f4dfa8fa4fa8d27529c`。
- 產物來源提交：`377b62ffeef20328b7f3b7ebe9d5acd5ee9b67cc`（已進入 main）。
- 正式 artifact：`1a1a51c938ee04c1300caedf019efdd17f8b3a706442d35936bb5b9ff493c842`。
- Manifest SHA-256：`55e7e3551ee7fd2e4ef5e2c58353ab9de06064d2bfd2465d231302128d38b0a4`。
- gh-pages：`5d971c0bc65b99e6455b1237f483aa6c968159a9`。
- [Pages run 36930403527](https://github.com/leotsouo/questnote-pwa/actions/runs/36930403527) 建置及部署成功。

## 驗證與內容保留

- 489 個暫存 Git blob 逐一符合固定產物的 SHA-256；嚴格 production／preview 驗證通過。
- 13 項原生產物瀏覽器驗收全部通過，包含舊 worker 接手、離線啟動、資料／profile 隔離及教學恢復。Preview 只用於獨立本機驗收。
- 98 個正式 HTTPS 檔案雜湊吻合，涵蓋全部本次變更檔案及主要資料；線上版本確認為 V3.5.4。
- Node suite 共 262 cases 與召喚流程斷言通過（新增的 4 cases 已加入 CI）。習慣實際操作及 27 組主題／窄屏／字體檢查見 [驗收記錄](acceptance.md)。
- 沿用已發布的 Swordwild candidate `eaa3e4d2e525439b7c3dd430ad4a9421c1655f4d4776626a8fcb84c7ba8fa2c6`，保持內容包身份 `509f8172c0a5f1f29513b10b9bcf46ef5a64668ef9970d1eac35f16f62f41223`，仍有 116 位寵物、5 個卡池。
- 公開信箱 SHA-256 保持 `80cab9075a5db551fadca624f947c5824536cbd988656b246945a95d87db2a67`；配方、禮物偏好、材料、探險資料與線上基準完全相同。未修改存檔結構或回報後端。

發布在獨立 checkout 組裝。Windows 自動換行與已核准 candidate 的精確字節不同，因此僅在該 checkout 保留正式信箱及四個未改動 companion runtime 的線上原始位元組；先確認信箱 JSON／runtime 程式碼與 main 一致，再逐一驗證 runtime 為 candidate 中核准的 SHA-256。未改寫 hash-bound authoring snapshots。相關 pins、原生瀏覽器結果、暫存與 HTTPS 驗證 JSON 均保留於本資料夾。

既有使用者可透過版本資訊的更新按鈕套用；若仍有其他開啟中的 QuestNote 視窗，關閉後連線重開即可。實體 iPhone 的已安裝 PWA／觸控狀況仍需裝置實測。
