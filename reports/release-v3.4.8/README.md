# V3.4.8 發布前檢查

狀態：本機整合、固定發布包與驗收已完成；等待使用者檢查。**尚未 push、發布或更改 Pages 設定。**

本機 App 預覽：<http://127.0.0.1:54881/preview/>。這是獨立預覽存檔，包含一件已完成的驗收任務、實際抽到的五隻新寵物與本機測試星塵；不會改到正式站存檔。預覽目前為 default theme，可在「更多 → 設定」切換 sweet。不要開啟這個 origin 的 /test/。

## 這次整合了什麼

- VP-01：sweet UR 對比、任務優先邊框、重複標題、表單一致性、圖鑑空狀態與備份恢復狀態修正。
- VP-02：今日任務與完成操作提前、首頁摘要與次要功能收斂。
- VP-03：先呈現卡池、星塵、成本、召喚按鈕及保底，再呈現收藏角色與卡池說明。保留召喚／解鎖語意。
- VP-04：寵物圖片、角色標題及卡片操作對齊；降低 metadata 的主導程度。
- VP-05：共用 modal 的標題、捲動、關閉、焦點返回與手機可用範圍。
- 已核准的霜誓峽灣：12 隻新寵物、12 PNG／24 WebP、Glacier 登場及結果展示。總 catalog 為 84 隻寵物／Lore、3 個卡池與系列。
- 本輪整合修正：Glacier 結果金色按鈕在 sweet 的文字由淺色改回深色（約 2.08:1 → 6.67:1），結果關閉按鈕最小高度 44px。更新提示改成先備份、關閉所有 QuestNote 客戶端後重開，移除清除網站資料的建議。

沒有新增 framework、改資料 schema、經濟規則、Pool／Pet identity，或全面改寫 UI／CSS。

## 固定來源與發布包

- UI 起點：codex/ui-visual-polish @ 0bee84d；共同 Card Pool base：95a4f5d70233195050f1f0fce2eee3d9945c2b32。
- 整合分支：codex/release-v3.4.8；發布包來源固定為 **b588cd97094c1dbca7fca73cef7918166023f29b**。之後的報告 commit 不代表需要重新 build。
- 原 Card Pool 工作樹仍保留自己的未提交工作；原 UI 工作樹未被修改。整合時 runtime patch 可直接套用。
- Approved candidate：697316249910931d21b57c50744997c2a12e9fde9743bfd3e61e094b18b7a131。
- Candidate manifest SHA-256：7a21bd41a69224604638f4daa319ce30300a3647809e2602d05cbc187d774ff8。
- Catalog SHA-256：3dfd5055f9c2d2d288ab7e235d4c85202899f0ecba49a1b2473d505ba3e9ff32。
- Production artifact：**2c3a9312a4cac620c1982bc90c884da6b0db3c35acd41cfe3b682d440c3fb6ad**，scope /questnote-pwa/，331 files。
- Production manifest SHA-256：524d9ad830aa6a670d25e15ad96491c9965db4f43da05fda6194f112b37eaba5。
- Preview artifact：0b97a80a824cd1713c57c2edbf80b6e5930c987a81253ea3279053d556341f29，scope /preview/，331 files。
- 待發布純檔案分支：**codex/pages-v3.4.8 @ 0e35485d35f908f702baf7f5590c225fec71ebd0**。Tree 328ac6b7c398f424c49856f38c150553fdaa4213。

完整 paths／hash pins 在 [release-pins.json](release-pins.json)，Git tree 與 ZIP 在 [pages-commit.json](pages-commit.json)。不可改用早期 d4544e／17ed08 包或 Card Pool 舊包 a8c511／79b630。

持久保存目錄：C:/Users/User/.codex/visualizations/2026/09/22/01a0ca2b-5107-7b60-9728-a226c5cd348c/questnote-v3.4.8-releases。authoring 子目錄為完整 105 檔、110,228,564 bytes 的逐檔校驗備份；不是 TEMP，也尚未上傳遠端。

## 驗收證據

- [Node tests](node-tests.txt)：127 passed、0 failed、0 skipped，另 34 項召喚 logic assertions 全通過；改動 JS syntax、git diff --check 通過。
- [最終 artifact 原生測試](native-artifact-tests.json)：8/8。正式與預覽各自啟動、DB／cache 隔離、缺檔／corrupt／profile／marker 拒絕、所有 HTTP 503 時離線啟動、legacy 多客戶端關閉後自然 activation。
- [整合 M4 測試](integrated-m4-tests.json)：12/12。含實際 Glacier 付費抽卡、不重複扣款／送解鎖禮、原有主題與 SSR fallback、重複十連確認報價。
- [手機操作紀錄](manual-validation.json)：390×844，default／sweet、任務新增／完成、新池單抽／十連、碎片與重載、圖鑑／Lore、Escape 焦點返回與 Reduced Motion。桌面 1280×720 無水平溢出。
- 新 strict verifier 的 12 項 tamper tests 包含多檔／缺檔、pin mismatch、symlink／Windows junction 與身分不一致。Production、preview 與從 Pages commit 匯出的 ZIP 都逐檔通過同一 verifier。
- 原始 Git blobs 已保留 bytes；首次 Windows git archive 曾套用 CRLF 轉換，被 verifier 攔下。最終 ZIP 用 git -c core.autocrlf=false archive 產生並通過全部 331 檔驗證。沒有修改全域 Git 設定。

### 請優先檢查

1. 任務：今日主工作是否清楚，新增／完成是否順手。
2. 召喚：切換三個卡池，檢查價格、保底、單抽與十連，尤其霜誓峽灣。
3. 圖鑑：切霜誓峽灣系列，檢查圖片、詳情與長文捲動。
4. 兩種主題：更多 → 設定，切换深色／甜美；也可切換減少動畫。

截圖：[任務 default](task-default-390.jpg)、[任務 sweet](task-sweet-390.jpg)、[召喚 default](summon-default-390.jpg)、[召喚 sweet](summon-sweet-390.jpg)、[sweet 十連結果](glacier-summary-sweet-390.jpg)、[default 單抽結果](glacier-single-default-390.jpg)、[圖鑑 default](collection-default-390.jpg)、[圖鑑 sweet](collection-sweet-390.jpg)、[modal default](pet-modal-default-390.jpg)、[modal sweet](pet-modal-sweet-390.jpg)、[桌面召喚](summon-desktop.jpg)。

## 核准後才執行的發布順序

1. 確認使用者驗收及明確發布核准，重查 GitHub Pages 設定與 remote baseline 未變；本輪遠端 branches 唯讀結果只有 main @ aada9a73e6cf0381fc03359dafd78b70b274cce2。
2. 再驗 pinned production artifact／Pages commit archive。只發布固定 commit，不重新 assembler、不修改內容或傳送 preview。
3. Push 整合來源分支供保存；push 0e35485d35f908f702baf7f5590c225fec71ebd0 至 codex/pages-v3.4.8。保持 main 不動，避免既有 main / Pages 提早發布原始碼。
4. 在 Pages 設定選 Deploy from a branch，source 改為 codex/pages-v3.4.8、/(root)。**此設定切換是發布步驟，現在尚未執行。** 分支內已包含 assembler 收錄的空 .nojekyll；GitHub 文件支援這種預建静態檔發布方式：[官方 publishing source 說明](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。
5. 等待 Pages deployment 成功，記錄 run／commit／URL；核對線上 manifest、index marker、SW、version、catalog 及新圖檔 bytes。以實際裝置驗證更新／離線後再宣布發布成功。

不要直接把整合原始碼當發布包；source 的 RELEASE_PROFILE 是 null。不要覆寫 artifact manifest 裡的 releaseReady=false 或 PENDING 狀態來假裝取得核准。

## 限制與剩餘事項

- 實體 iOS／Android 安裝 PWA 與使用者既有實際存檔尚未在本輪測試；390×844 是桌面瀏覽器 viewport 驗收。
- GitHub CDN JS／SW 本輪仍無法經工具取得可驗證 bytes；沒有停用 TLS。remote branch baseline 可讀，live CDN byte baseline 仍 UNKNOWN。
- legacy 測試使用真實舊 SW 配合隔離 fixture，不能宣稱已證明舊版 runtime 可讀新抽卡後的所有存檔。不要以回退舊 main 或倒退 wallet 為預設 rollback；撤回新池時應保留已獲得 pet／Lore／images 並做相容前進修正。
- 部分共用結果措辭仍沿用「夢塵碎片」；不影響交易。收藏摘要、極長文字與更廣裝置尺寸可另輪改善，不阻塞這次審核。
- 共享衝突面仍有 src/ui.js、src/styles.css、src/themedSummonController.js、service-worker.js、src/version.js。後續整合應以本次 release 分支為依據，避免再完整覆蓋原 UI 或重套 Glacier patch；本輪實際衝突已在獨立整合分支處理。

若本機服務停止，於整合工作樹執行 devtools/release-artifact-browser-server.mjs，--production／--preview 使用 release-pins.json 內的 artifactDir。伺服器會輸出新 port；開啟該 origin 的 /preview/，不要為使用者的檢查 origin 開 /test/。
