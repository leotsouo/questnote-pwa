# Card Pool Pipeline v1

這套 CLI 把已審核的新系列與新卡池組裝成可重現的 staging candidate。它會保留每階段原始輸入、核准輸出、SHA-256、工具版本指紋與審核紀錄；不呼叫既有 pet publisher，不修改官方 `data/`、`assets/`，也沒有 deploy、promote 或覆寫已完成 candidate 的命令。

v1 提供 AI handoff scaffold、資料契約、審核與組裝流程。**AI 企劃、Lore、prompt 和圖片生成仍由操作者／AI 協作完成，沒有在 CLI 內串接生成服務。** 視覺品質、Lore 與概念是否一致仍需人工判斷；可重現的是已核准產物的組裝，並非每次重新生成都相同。

## 產品範圍與少量必要決策

一個 workspace 對應一個全新 `seriesId` 和 `poolId`，沿用 M4 單一 expansion 機制，不替換既有系列、不變更既有池候選、不新增機制或任意 HTML／程式碼模板。先確認主題、各 rarity 數量、價格／機率／保底、演出模板與有無解鎖贈禮。例如把下列內容存為尚未核准的 `brief-draft.json`：

```json
{
  "schemaVersion": 1,
  "seriesId": "rain_lanterns",
  "poolId": "rain_lanterns",
  "seriesName": "雨燈小徑",
  "concept": "雨夜裡替迷途旅人照亮小徑的植物寵物。",
  "rarityPlan": { "N": 1, "R": 2, "SR": 1, "SSR": 1, "UR": 1 },
  "cost": 100,
  "rates": { "N": 0.55, "R": 0.30, "SR": 0.10, "SSR": 0.03, "UR": 0.02 },
  "pity": { "ssr": 30, "ur": 100 },
  "presentationTemplate": "default",
  "unlock": { "key": "daybreak", "threshold": 20, "rewardDraftId": "r_2" },
  "releaseVersion": "3.4.6"
}
```

不解鎖時明確使用 `"unlock": null`。`presentationTemplate` 使用受控 registry 的 `default`、`dream_bloom` 或 `glacier_arrival`。冰河模板供霜誓峽灣及未來適合的卡池使用，不綁定 pool ID；新增模板必須先完成 runtime、契約與呈現驗證，再鎖定 authoring 輸入。每個非零機率及保底可達 rarity 必須在 locked、unlocked 階段都有候選；不能把唯一 UR 放到解鎖後。總寵物數為 1–100。

`rewardDraftId` 使用分 rarity 的穩定 roster slot：`n_1`、`r_1`、`r_2`、`sr_1` 等。`init` 在全域 authoring lock 下，從官方與所有工作區的現有 ID 後接續配置 pet ID；同時保留未發布 pool ID。**配置發生於尚未核准的 scaffold 建立階段，approve 不會修改 plan 或重配 ID。** 所以人工核准的 plan hash 已涵蓋實際 `draftId → petId` mapping。

## 操作順序

從 repository root 執行；測試或其他隔離 root 可加 `--root <directory>`。

```text
node scripts/card-pool.mjs init rain_lanterns --brief brief-draft.json
node scripts/card-pool.mjs status rain_lanterns
```

`init` 只建立 `content/pet-series/rain_lanterns/`，其中有 `AI-HANDOFF.md` 和各階段 JSON scaffold。相同 brief 重跑回傳現有狀態，不重配 ID、不覆寫已核准內容。不同 brief 用同一 workspace ID 呼叫 init 會被拒絕。核心 roster 數量與 identity 若需改變，須另建新 workspace／新 ID；既有 reservations 保留，不回收給其他草稿。

按以下順序審核；每次修改工作副本後先重新 `status`，閱讀該階段 `files` 和 `outputHash`，並檢查實際檔案內容：

1. **brief**：審核 `brief.json` 的產品決策。
2. **plan**：依 brief 填入 `plan.json` 的寵物名稱、設計說明和 `base`／`unlock` 階段；保留配置好的 identity。贈禮寵物必須屬於 unlock 階段。
3. **content**：依核准 roster 完成 `series.json`、`pets.json`、`pets-lore.json`、`pool.json`。base tags 固定為 `[poolId]`，expansion tags 固定為 `[poolId + '_expanded']`；禁止加上 `standard` 等其他池 tag。
4. **prompts**：完成 `prompts.json`，每個 pet ID 對應 `{ "prompt": "...", "negativePrompt": "...", "provenance": "..." }`。provenance 可記錄使用的生成工具、模型、版本、seed 或 reference 說明；可用的生成資訊應保留，不猜測未提供資訊。
5. **images**：放入 `images/<petId>.png`，必須可完整解碼、正方形、至少 512 px、每張不超過 5 MB。超過 2048 px 或 2 MB 會要求審核 warning。人工檢查外觀、角色識別、裁切、透明度與 prompt／Lore 一致性。

核准命令必須帶入當前顯示的完整 SHA-256；不是從聊天中猜測或沿用舊 hash：

```text
node scripts/card-pool.mjs approve rain_lanterns brief --hash <current-outputHash> --reviewer <reviewer-name>
node scripts/card-pool.mjs approve rain_lanterns plan --hash <current-outputHash> --reviewer <reviewer-name>
node scripts/card-pool.mjs validate rain_lanterns
node scripts/card-pool.mjs approve rain_lanterns content --hash <current-outputHash> --ack-warnings --reviewer <reviewer-name>
node scripts/card-pool.mjs approve rain_lanterns prompts --hash <current-outputHash> --ack-warnings --reviewer <reviewer-name>
node scripts/card-pool.mjs approve rain_lanterns images --hash <current-outputHash> --ack-warnings --reviewer <reviewer-name>
```

`--ack-warnings` 是對該次 validation warnings 的明確確認；例如獨立限定池寵物未加入 standard，既有 pet schema 會提示 warning。錯誤不能 override。機器可先準備下游工作副本，但核准順序必須完整；未核准 upstream 無法核准 downstream。

## 保存、重跑與失效規則

`pipeline.json` 記錄 allocation、官方 baseline hashes 與 append-only approval history。每個 receipt 指向 `approvals/<outputHash>/`，保存當時該 stage 的**原始 bytes**，包括舊版 prompt 和原 PNG，不覆寫同 hash revision。來源副本之後可編輯，已核准輸出仍可從 snapshot 讀回。當前 snapshot 缺漏或 bytes 不符時 status 和 staging 都會失敗。

stage hash 涵蓋 stage 檔案 hashes、upstream output hash、初始官方 baseline hash 與工具指紋。修改上游內容、工具／schema／encoder 版本或 baseline 會使對應核准及下游失效；保留舊 history，重新審核新 hash。相同 hash 再核准不追加相同 receipt。

這些 receipts 是本地審核追蹤紀錄，並非可驗證審核者身份的數位簽章。持有 workspace 寫入權限的人能編輯紀錄；正式 release 核准仍由外部工程／產品流程負責。不要將陌生人提供的整個 authoring workspace 視為已可信核准。

```text
node scripts/card-pool.mjs status rain_lanterns
node scripts/card-pool.mjs validate rain_lanterns
node scripts/card-pool.mjs stage rain_lanterns --dry-run
node scripts/card-pool.mjs stage rain_lanterns
```

`status`、`validate`、`stage --dry-run` 不建立目錄、報告、lock 或 temp；也不產生／修改圖片。`stage` 以官方 baseline 加入當前新系列，保留所有舊 pool／pet／Lore／series ID 與資料，產生衍生 WebP，並驗證 locked／unlocked 候選與已發布 grant identity。只改變新內容，既有池候選集合不能變動。

candidate 位於 `content/pet-series/<seriesId>/staging/<candidateId>/`：

```text
catalog.json          schemaVersion: 1 + petsData/poolsData/loreData/seriesCatalog
candidate.json        schemaVersion: 1, candidateId, releaseReady: false, baselineHash, files
validation.json       schema/reference/image checks、warnings、candidate counts、added/changed/removed IDs
approvals.json        baseline、工具hash、receipts、history、brief、plan、歷次文字snapshot bytes
assets/pets/*.png     當前核准的新原圖
assets/pets/variants/*.webp
```

`candidate.files` 精確列出所有其他檔案的 SHA-256，不含自己的 hash；M3A assembler 另封存 candidate.json。文字 snapshots 在 approvals.json 以 base64 保存原始 bytes（包括 prompts 和 provenance），歷次圖片 snapshot 用 hash/index 指向工作區保留的 revision；當前圖片原文已在 candidate assets。正式發布前應備存**整個 authoring workspace**，才能連同所有舊圖片 revision 一起保留。

衍生圖沿用既有 384 card／960 stage 設定，WebP quality 82、effort 5、不放大原圖。512 px 原圖產生 384 card 與 512 stage；stage 檔名仍包含目標上限 960。variant 名稱包含原 PNG hash，candidate manifest 包含实际 WebP hash 與 encoder 版本指紋。

同一批核准輸入產生相同 candidateId。重跑會從核准輸入在新 temp 重建完整輸出（包含 WebP bytes），逐檔比對既有 candidate，全部一致才回傳 `reused: true`；不只相信既有 candidate 自述的 hashes。若 candidate 被改動，即使有人重算它自己的 manifest，也會拒絕並保留現場。修復應重新取回該批准產物或移開經確認損壞的 candidate，再重跑；不可把未審核檔案混入它。

## 中斷與復原

完成 candidate 以同磁碟 rename 從 `.building-*` 轉為最終目錄。正常例外只清掉該次建立的 temp；不動既有 candidate／核准內容。若程序被硬終止，可能留下 `.creating-*`、`.archiving-*`、`.building-*` 和 `.card-pool.lock`。

v1 **不自動搶占 stale lock，也不保證任何硬中斷後可無人值守續跑**。遇到 `PIPELINE_LOCKED`：

1. 讀取 `content/pet-series/.card-pool.lock` 的 pid／createdAt，確認同一 checkout 的原 CLI 程序已停止；PID 可能重用，不能只靠「存在／不存在」判斷。
2. 確认沒有其他 authoring 命令執行，保留或另存 lock 紀錄後，僅移除這一個已確認死亡的 lock 檔案。
3. 用 `status` 檢查 history／snapshot。完成 snapshot 但 receipt 尚未寫入時，同 hash 重新 approve 會驗證再重用；不需修改內容。若只有 `.archiving-*` 或 `.building-*`，重跑建立新的 temp，忽略其他 invocation 的 orphan。
4. 若 init 在 final rename 前中斷，該 `.creating-*` 還不是正式 workspace；檢查後重新 init。若 final workspace 已存在，相同 brief 的 init 直接載入它。備份所需原始輸入後才清理已確認的 orphan；清理目標必須解析到該 authoring 目錄內。

官方 baseline 一旦改變，不允許替舊 workspace 改 hash「假裝已重新驗證」。先調查改動／保存原 workspace，建立新的 reviewed baseline 與新的 authoring workspace，重新核對 ID、內容與核准流程。不要把新 baseline 的資料覆寫成較舊 catalog 來解除阻擋。

所有 pipeline／圖片寫入路徑拒絕 symlink 或 Windows junction，包括指向同一 repository 內的 link，避免 authoring 目錄被重導到產品檔案。

## 發布 preparation 與下一個卡池

`releaseReady: false` 表示 staging 通過內容組裝驗證，**並未完成正式發布核准**。validation.json 不冒充整個產品的測試報告。交付 M3A assembler 前應審查 candidate 四份完整 catalog 與 validation changes、assets、批准紀錄，執行 M1／M2A／M4 與 M3A 所需測試，並將 Git revision、artifact hash、測試結果與正式／preview profile 納入 release review。M3A 負責 runtime／catalog bundle 相容、SW 與環境隔離，不由本 CLI 修改。

第一個卡池上線後，第二個卡池必須以**已審核且包含第一個已發布卡池的 authoring source**為新 baseline。單純在舊 root 再 init 會保留舊 root 的世界觀；外部已發布 artifact 不會自動回灌官方 source。因此，在第一次 release 核准流程中另行完成並 review：

1. 將已批准 candidate 的四個 catalog 分別更新到正式 authoring `data/`，加入其新 PNG／WebP，審查完整 diff，確保既有 IDs／grant identity 未刪改。
2. 執行內容與回歸驗證，記錄／提交可追溯的 source Git revision，與已發布 artifact 對照確認。這是**另外核准的 source promotion**，pipeline 不會代做，也不等於 deploy。
3. **不要更新 M3A 固定的 legacy compatibility catalog snapshot。** 該 snapshot 為舊 runtime 提供其已知契約；modern authoring root 和新的 versioned bundle 可以前進，legacy snapshot 必須維持原相容 baseline。M3A assembler 會保護此邊界。
4. 下一個 workspace 從此 reviewed source revision init，captureBaseline 包含先前新寵物和衍生圖；候選自然累積，不能移除第一池或其寵物／Lore。已基於舊 source 的其他草稿會顯示 baseline drift，須另行 reconciliation，不自動 rebase 核准內容。

撤回已上線卡池時沿用 M3A 策略：停用 pool、保留 pet／Lore／IDs，避免已取得新寵物的存檔失去引用；不自動還原使用者資料。當前 CLI 的 stage 成果可直接捨棄，不涉及使用者 IndexedDB。

## 驗證

```text
node --test devtools/card-pool-pipeline.test.mjs
node devtools/build-pet-images.mjs check
npm run test:pool:release
```

測試只使用系統 temp 下的 synthetic catalog 與程序產生的 512 px PNG，不寫真實產品 catalog／DB。覆蓋完整 SOP、兩次 sequential pool source promotion、dry-run 零寫入、exact hash 和 immutable history、錯誤內容／缺圖／不完整 PNG、跨 draft ID reservation／並行 lock、中斷 orphan 復原、內外 junction、防篡改 candidate／WebP 重用。它們不涵蓋真實 AI 模型品質、人工審核是否正確、Git 發布權限或實體裝置更新行為。

`test:pool:release` 另把目前完整 catalog／runtime 複製到系統 temp，增加 6 隻合成寵物，重跑 candidate、執行實際抽卡 planner，再組裝 production／preview artifacts。輸出的 `rehearsal.json` 記錄所有路徑與 hashes，保留供 review；其中 Git commit 明確是 synthetic fixture，不能視為產品發布來源。可將兩個 artifactDir 交給 `node devtools/release-artifact-browser-server.mjs --production <dir> --preview <dir>`，在顯示的全新 loopback origin 執行完整 App 首啟、legacy SW 切換與 503 離線驗收。
