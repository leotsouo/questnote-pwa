# 晴信原野修正版整包驗收

## 為何需要修正版

使用者於 2026-10-07 20:13:36 UTC 對原整包 `0e1290bce15e048bd5adac4ccb8c8656592371e4a3de5ed622cfea515970207a` 說「通過 可以發佈」，原話與當時的 acceptance／authorization 已原樣保留於 `release-evidence.json`。來源資料升格時，完整回歸測試發現原候選的 12 隻新角色缺少四章羈絆故事，會讓這些角色的同行章節不可用。這是原整包的實質缺陷，因此停止對該整包的來源合併與網站部署。原始產物與驗收紀錄沒有覆寫。

12 隻角色已各補四章故事及獨立紀念物。依 SOP 重新核准 content、prompts、images；12 張原圖及衍生圖 bytes 不變。新候選與兩份固定產物另行組裝、驗證；這是**新的整包**，先前同意不轉移。

## 修正版固定身分

| 項目 | 身分 |
| --- | --- |
| `packageHash` | `94468c0c85434421049e10a996402706dca8da48bb22b5b84dd8987b1ec4cc5c` |
| Source commit（產物輸入） | `93e15f39dfdf35dc8a44b09dd7f620787d5afe7f` |
| Source promotion commit（僅分支） | `925e28c` |
| Candidate ID | `0b00ab77a5a8aad3cf9e93271d98a25c91df1d89ee9d7faf4837d105f7944cda` |
| Candidate manifest SHA-256 | `ef369dc1c14761d5fb961c879222c7e158b4360296d6e67dc58a793c1d3a4bcb` |
| Production artifact ID | `39f0883039a81e6b47d9d96a19d51053f3846ee080b03ae120325748e89eb52e` |
| Production manifest SHA-256 | `0180d6b38ab435af785cab7c0fad455da7548b7e9b9ea6526fbf22fc8eb2bb05` |
| Preview artifact ID | `83fabdc9de0e3ebb1d9039299f42b27deaee378579559859e9b1e3f6def131e4` |
| Preview manifest SHA-256 | `eae13c9a294083b9e99be7dde1732e9e930e2b3e05e0a81150da4bab70605c5a` |
| 共同內容 bundle SHA-256 | `dc5db85d1a11033cf2f2b8bcd7f8d55b82eb79e4921b49784663b140fd7e67c1` |

完整本機路徑見 `artifacts-v2.json`，整包 evidence 見 `release-evidence-v2.json`。兩份產物各 665 個檔案，`verify-release-artifact` 全部通過。與舊產物相比，runtime `sourceFiles` 與全部寵物素材 SHA 完全相同；變更集中於內容 bundle 的羈絆章節。原有實際動畫與 160 px 卡片審查據此沿用，沒有宣稱重新產圖。

## 修正版驗證

- `node --check`：新故事補全腳本、調整的測試檔通過。
- `npm test`：通過；完整 log `source-promotion-npm-test.log`。其中羈絆測試確認現有 140 隻角色都有四章、兩種回覆與不重複紀念物。
- `npm run pools:validate`：7 池，errors／warnings 均為 0。
- `npm run images:check`：140 隻角色的兩種尺寸通過；8 地區圖片可解碼、比例與離線資源通過。
- `npm run test:pool:release`：通過；log `source-promotion-pool-smoke.log`。
- 修正版固定產物瀏覽器 run `2dbd6854-2186-486b-9839-8429a266d9d5`，loopback `/test/`：**19 passed，0 failed**。涵蓋正式／預覽分離、十連一次扣款與保底、碎片、工坊與偏好送禮、探險專長、手機版面、更新保護、斷線重啟與存檔。
- 修正版 `poolReleaseReview.mjs`：`ok: true`，`packageHash` 如上；`releaseReady: false`，`nextGate: human_whole_package_acceptance`，因為沒有把原整包的授權套到新雜湊。

## 發布狀態

修正版來源與正式網站**尚未合併、推送或部署**。最新 `origin/main` 的獨立信箱更新 `45e1c29` 仍需在整合／部署時保留。正式 HTTPS 目前仍是 V3.8.6；正式站全檔 SHA 與真實手機／已安裝 PWA 的更新、觸控及網路切換，都必須在這份修正版獲新驗收並發布後執行。

發布前需使用者對上表**新的** `packageHash` 完成整包驗收並再次明確說「可以發布」。
