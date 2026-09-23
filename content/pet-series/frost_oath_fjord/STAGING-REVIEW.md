# 霜誓峽灣｜Staging 候選審閱

2026-09-23，Asia/Taipei。**五個內容階段均已核准；真實新卡池已完成 staging 預檢、組裝與驗證。尚未發布。**

使用者回覆「核准卡圖」後，已確認 12 張原圖與上輪審閱 hash 完全一致，封存 images 核准。先執行 dry-run，再用原生 Pipeline 建立候選；沒有使用 synthetic fixture。

## 可查看的結果

- [候選卡圖預覽](./STAGING-REVIEW.html)：使用 staging 的 384 px WebP，點圖查看 960 px WebP；也可連回已核准 PNG。
- [目前本機預覽](http://127.0.0.1:8129/STAGING-REVIEW.html)：只顯示候選素材，不是已發布的 QuestNote App。
- [候選完整 catalog](./staging/697316249910931d21b57c50744997c2a12e9fde9743bfd3e61e094b18b7a131/catalog.json)：合併後的 Pet、Lore、series 與 pool。
- [候選 validation](./staging/697316249910931d21b57c50744997c2a12e9fde9743bfd3e61e094b18b7a131/validation.json) 與 [核准紀錄](./staging/697316249910931d21b57c50744997c2a12e9fde9743bfd3e61e094b18b7a131/approvals.json)。

## 本次內容

- **84 隻 Pet 與 84 份 Lore：** 完整保留既有 72 隻，新增霜誓峽灣 12 隻。
- **3 個卡池、3 個系列：** 既有兩池／系列資料未刪改。
- **全部第一抽開放：** N×3、R×3、SR×3、SSR×2、UR×1；無解鎖門檻或贈寵，主打麝牛不加額外權重。
- **既定經濟設定：** 單抽 100、十連 1,000；機率 55%／30%／10%／3%／2%；SSR+ 30 抽、UR 100 抽保底。
- **美術：** 12 張已核准 1254×1254 PNG 原封保留，另產生 12 張 384 px card WebP 與 12 張 960 px stage WebP。馴鹿採已核准第二版。
- **演出與文案：** glacier_arrival、風雪越烈，誓約越亮。及已核准 Pet／Lore／陪伴台詞均保留。

## 實際驗證

- 完整 Pipeline validation 通過，0 errors；images receipt 已記錄並確認 12 個 PET_NO_STANDARD 與 12 個 IMAGE_LARGE warnings。
- dry-run 未建立 staging 目錄；正式 stage 成功，第二次 stage 從核准輸入重新產生輸出，比對後回傳 `reused: true`。
- 候選共 40 個檔案：4 個 JSON、12 張 PNG、24 張 WebP。manifest 所列的 39 個檔案 hash 全部吻合，另記錄 candidate.json 自身 hash。
- 正式 catalog 的既有 72 個 Pet／Lore 與兩個 pool／series 逐項比較完全相等；新內容與核准來源一致，Pet 僅增加建置產生的 imageVariants。
- 使用候選 catalog 執行真正的純抽卡規劃器：12 隻逐一驗證零抽數即可抽中、單抽與十連扣款正確、無額外贈寵、SSR+ 與 UR 保底邊界正確、餘額不足拒絕交易、输入保持不變。這是可達性與邊界檢查，不是機率統計抽樣，也沒有寫入玩家 DB。
- 全部 WebP 解碼、尺寸及路徑通過；瀏覽器 48／48 個 card 預覽 img 載入為 384 px，UR 放大 dialog 載入 960 px。縮圖與主打放大圖已目視檢查。

384 px WebP 共 513.8 KiB；960 px WebP 共 2.19 MiB。PNG 原圖共 31.92 MiB，保留供品質與追溯。

## 候選識別

candidateId：`697316249910931d21b57c50744997c2a12e9fde9743bfd3e61e094b18b7a131`。

candidate.json SHA-256：`7a21bd41a69224604638f4daa319ce30300a3647809e2602d05cbc187d774ff8`。

catalog.json SHA-256：`3dfd5055f9c2d2d288ab7e235d4c85202899f0ecba49a1b2473d505ba3e9ff32`。

images 核准 hash：`2dfdd2dbfe88da5fa42a0eefb8e422d5961dbbe0ab05964fa893b0a0ed740493`。候選位於 `staging/697316249910931d21b57c50744997c2a12e9fde9743bfd3e61e094b18b7a131/`，不要直接編輯其中任何檔案。

## 接續工作

這份候選可交給 M3A 發布準備流程，接續建立包含 runtime 的不可變 release artifact、隔離預覽與 PWA 更新／離線驗收。這些是後續工程驗證，不需重新核准同一份角色內容。

目前 `releaseReady: false`。本次素材預覽不是完整 App 的發布驗收；仍需核對實際 hosting／scope、部署基準與更新相容性，再做正式 release 決定。source promotion、merge 與部署均需另外授權，本輪沒有執行。

正式 data、assets 與 legacy compatibility snapshot 未修改。整個 authoring workspace（包含 generation sidecars、未選稿與 approvals）須一起保存，因 candidate 不會自動打包全部產圖過程資料。

2026-09-23 接續進度：使用者已要求發布準備與隔離預覽驗收；本機 release assembly、兩個 profile 與正式路徑的原生驗收已通過。見 [發布準備審閱](./RELEASE-REVIEW.md) 與 [隔離 App 預覽](./RELEASE-PREVIEW.html)。此進度不變更原候選或五階段核准，也不表示已正式發行。
