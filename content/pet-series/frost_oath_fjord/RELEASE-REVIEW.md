# 霜誓峽灣｜發布準備與隔離預覽驗收

2026-09-23，Asia/Taipei。**本機發布準備與隔離驗收通過；尚未正式發行。** 本輪依使用者「發布準備與隔離預覽驗收」指示執行，不代表 source promotion、merge 或部署核准。

## 可查看的結果

- [有環境標示的預覽入口](http://127.0.0.1:8129/RELEASE-PREVIEW.html)：390 px App 框，可從底部「召喚」查看卡池。
- [完整 App 預覽](http://127.0.0.1:50345/preview/)：使用真正的 immutable preview artifact 與 QuestNotePreviewDB。進入「召喚」即可看到已選取的霜誓峽灣。
- [全部已核准卡圖](http://127.0.0.1:8129/STAGING-REVIEW.html)。
- [工程交接與重跑方式](../../../reports/frost-oath-fjord-release-handoff-2026-09-23.md)。

本機服務需持續執行，連結不是公開部署網址。預覽存檔只供本次驗收；驗收完成時有 900 星塵、5 種新夥伴。資金來自既有信箱的兩份 1,000 星塵獎勵，沒有修改 wallet、機率或卡池來安排結果。

## 已完成

- 保留五個內容 approval receipts 與原 staging candidate。12 張核准 PNG、24 張 WebP、84 隻 Pet／Lore、3 個系列與卡池均進入完整 App bundle。
- production 與 preview 各先 dry-run，再組裝並重跑確認 `reused: true`。每包 328 個檔案；manifest 記錄其餘 327 個檔案與 287 個來源檔案 hashes。
- production 使用 GitHub Pages API 確認的 `/questnote-pwa/` 路徑；preview 使用已驗證的本機 `/preview/` 路徑。後者不是已核准的公開 preview hosting 設定。
- 完整 Node suite：115 tests、34 logic assertions，全部通過。
- 原生瀏覽器：M1 備份 14、M2A 原子交易 25、M4 卡池呈現 10、SW lifecycle 6、冰河演出 7，全部通過。這些工程測試仍使用隔離測試資料；真實卡池內容沒有被 synthetic fixture 取代。
- 真實候選包 8 項原生驗收通過，另以正式 `/questnote-pwa/` 路徑重跑 8 項全數通過：錯誤／缺漏／混版資料在開啟 DB 前被阻擋；舊 worker 的兩個分頁關閉後才自然更新；兩個 profile 資料庫、controller、快取分離；所有 App 網路回應 503 時，已快取 App 與 versioned catalog 仍可啟動。
- 實際 App 手動單抽與十連：2,000 → 1,900 → 900 星塵；單抽得到纜結海鸚，十連共 10 張，包含 SSR 深潮領航鯨。5 種不同寵物進入圖鑑；旅鼠 3、海鸚 2、獠豬 2 碎片，與實際重複次數及稀有度相符。
- 10 張結果圖均載入正確的 384 px WebP；冰河抵達、單抽結果、SSR 揭曉、十連清單與鯨的 Lore 已目視驗收。重新整理後仍為 900 星塵、SSR 5/30、UR 11/100，沒有重播首次抵達；preview console 未見 error。
- 390×844 內嵌 App 可啟動，實測內容寬 375 px、scrollWidth 375 px，首頁無水平溢位。工具對內嵌分頁的輸入控制有限，因此完整抽卡操作是在直接開啟的 1280×720 App 驗收；不冒充實體手機／安裝 PWA 的驗收。

## 產物識別

來源 Git HEAD：`95a4f5d70233195050f1f0fce2eee3d9945c2b32`。工作樹有尚未提交的工程與內容變更；assembler 另外記錄實際來源 bytes，不能只用 HEAD 還原這次產物。

- staging candidate：`697316249910931d21b57c50744997c2a12e9fde9743bfd3e61e094b18b7a131`
- 共用 catalog SHA-256：`3dfd5055f9c2d2d288ab7e235d4c85202899f0ecba49a1b2473d505ba3e9ff32`
- production `/questnote-pwa/`：`a8c5117b44ac36342cf00aef0b2770848239c6b6e78efaef86767db06d798c64`
- preview `/preview/`：`79b630eaeae4f4610a9b5d19b0d9bc1051a72248e9ef30e73385d943c6fbfca6`

產物根目錄：`C:\Users\User\AppData\Local\Temp\questnote-frost-oath-release-20260923`。不要直接編輯包內內容。正式候選與 preview 的 release-artifact.json 另以原始 bytes 封存在 reports 的 evidence 目錄。

## 正式發布前剩餘條件

1. **Hosting 與發布來源。** Pages 目前 `build_type: legacy`，從 `main` 的 `/` 發布。需要另行核准並落實可發布已驗證 artifact 的方式；不能直接合併原始碼就宣稱此包上線。公開 preview 的 origin／固定 scope 仍未設定、未驗證。
2. **即時線上基準。** GitHub 最新紀錄仍為成功的 [Pages run 30220073263](https://github.com/leotsouo/questnote-pwa/actions/runs/30220073263)，commit `aada9a73e6cf0381fc03359dafd78b70b274cce2`。Node fetch 與 PowerShell HTTPS 讀取正式站檔案都遇到憑證驗證失敗；未停用驗證，故尚未確認 CDN 即時 bytes。
3. **實際裝置與發布保存。** 已驗證已知舊版 worker 的隔離切換；仍需實體安裝 PWA、仍在使用的客戶端版本、實際 hosting 更新與撤回策略驗收。完整 authoring workspace 將與 generation sidecars、未選稿、approvals 一起封存；TEMP 中的本機備份不是遠端持久備份。
4. **外部核准。** source promotion、可追溯整合 revision、merge、deploy 各依原流程核准。撤回只能停用池，必須保留已取得 Pet／Lore／圖片／identity，不可回滾玩家 wallet 或刪除內容。

非阻塞文字觀察：共用卡池詳情仍有「解鎖後機率」欄位；本池同頁已清楚標示無抽數解鎖、無贈寵，實際候選與交易驗證符合核准設定。這是共用介面的文字清理事項，並非有隱藏解鎖機制。

`releaseReady` 仍為 false。immutable manifest 中的 `nativePwaValidation: NOT_RUN` 是組裝當下的固定狀態；本輪實際驗收證據另存 reports，不回寫或偽造發布核准。
