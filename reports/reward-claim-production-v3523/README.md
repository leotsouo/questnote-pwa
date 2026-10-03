# V3.5.23 一鍵領取正式發布 — 2026-10-03

正式站：https://leotsouo.github.io/questnote-pwa/ 。每日祝福、每日／每週冒險任務、成就、圖鑑收藏里程碑、各地區探索里程碑和信箱附件，現在有與原介面融合的「一鍵領取」與待領數量；沒有可領獎勵時不顯示。原有單項領取與內容閱讀仍可使用。批次領取依序重新核對資格、阻擋重複操作並加總顯示結果；部分失敗時可重試尚未領取的項目。原本只有一筆可領的旅程／同行約定與自動發放獎勵維持原流程。[設計與畫面](../reward-claim-2026-10-03.md)。

## 來源與基準

- 發布前正式站為 V3.5.22，artifact `9373470b03eff9a04955a9401377a787dcb9ff471d7c11a292418eb46dcb6818`，Pages `4aa9aa10dcd79810f781f8c2f40318d5d45401b6`；見 [baseline.json](baseline.json)。
- [來源 PR #65](https://github.com/leotsouo/questnote-pwa/pull/65) 的 [CI](https://github.com/leotsouo/questnote-pwa/actions/runs/37114743956) 通過，合併來源為 `47b7c337a39612a4eb337a22c64e812dd22f7454`。V3.5.22 召喚、十連保底和原有圖鑑功能均保留。
- 發布前比對 `main` 與舊 `gh-pages` 信箱：公告、內容和 reward identity 相同，差異僅是行尾格式。新產物沿用同一批公告與獎勵。沒有後端部署或存檔遷移。

## 驗收

- `npm test`：292 + 14 + 12，共 318 個 Node 測試及 35 項揭示流程檢查通過；修改的 JavaScript 語法檢查通過。六個領取區域的實際瀏覽器流程、重複領取／交易中止檢查及 108 組版面檢查通過；測試只使用拋棄式 loopback origin 和合成獎勵。
- 從合併後來源組裝 production `/questnote-pwa/` 與僅供隔離驗收的 preview `/questnote-pwa-preview/`。兩者各 607 個檔案，嚴格 artifact 驗證通過；正式 artifact ID `12c4a4103be3d3a45e112eed5ac1566bc482c2ce85a470fb0e3d5672663f9cf0`，manifest SHA-256 `6e158a6bb6f62d485eb1401a55f6eae306c89945a37e56c19d56cf88d27cbf4d`。內容 catalog hash `da32429aa6caf259c31f6fb8b613585144bb7ccfc653733cff583b099f03456d` 與 V3.5.22 相同；完整 ID 見 [artifacts.json](artifacts.json)。
- [固定產物瀏覽器驗收](artifact-browser-qa.json) 16／16 通過，包含正式／預覽資料隔離、舊 worker 更新保護、離線啟動、召喚與覺醒回歸。只在新建的本機測試 origin 建立和清理測試存檔。
- Pages 提交 `6bab17d148d770b30444ca438cce73a80e003eb4` 的 [建置與部署 run 37115062133](https://github.com/leotsouo/questnote-pwa/actions/runs/37115062133) 成功。提交前逐檔確認 607 個 Git blob 與不可變產物相符；2026-10-03T10:04:34Z 從正式 HTTPS 讀回全部 606 個可服務檔案，大小與 SHA-256 全部相符，其餘 `.nojekyll` 已在 Git 驗證。[讀回結果](live-verification.json)。

既有已開啟的 PWA 分頁依正常更新提示重新載入後才會切到新版本；不需清除網站資料。實機 VoiceOver、原生字級與觸覺尚未在這輪驗收。
