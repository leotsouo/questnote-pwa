# 新卡池發布 SOP

一頁流程清單。每一步要達到的標準寫在 [新卡池規格與驗收標準](card-pool-spec.md)，CLI 契約與 hash 規則在 [Card Pool Pipeline](card-pool-pipeline.md)。目標節奏是兩週一池，圖片審核預設交給 AI（`imageReviewMode: "ai-self"`）。

指令都在 repository root 的 `dev` 上執行（不另開分支或 worktree，見 [CLAUDE.md](../CLAUDE.md)）。`<id>` 是 seriesId，通常等於 poolId。

## 1. 同步正式版

Fetch 最新 `origin/main`、`gh-pages`，讀取正式 HTTPS 的版本與 release descriptor／artifact manifest，核對部署 commit、artifact ID、reviewed source commit 與核對時間，記進 brief 的 `productionBaseline`。來源 main 最新不等於正式版最新；記錄 main 尚未發布的差異及處理方式，不把生成的 gh-pages 複製回 source。若有未發布內容，先完成 reconciliation，不可混入本池。舊 workspace 的 baseline、receipts、卡圖和 candidates 不重寫。

## 2. 選主題（使用者只需要選）

AI 先提出 **3 個主題方案**讓使用者用選項挑一個（可以選「交給你」或補充要求）。每個方案寫清楚：主題與地域、希望玩家感受到的情緒、招牌角色（UR 與一兩隻 SSR 的物種與故事一句話）、是否需要新探險地區。不要詢問 repository 可判斷的工程細節。

選定後其餘全部由 AI 決定：預設一池、12 隻可調整，稀有度由 AI 配置（兩隻 UR 不是通用規則）；沿用現行價格、機率與保底，全部第一抽開放，不新增解鎖或贈寵；一種新食物、逐隻偏好與探險專長、地區 add／reuse 評估、動畫方案（禁止 `animationKey: "none"`）。使用者的特殊要求寫進 brief 的 `interview`。若企劃要求新資料模型或跨系統功能，先完成獨立規格與相容性評估，不以每池例行項目直接擴大範圍。

## 3. 建立工作區與企劃

```text
node scripts/card-pool.mjs init <id> --brief <brief.json>
```

brief 寫明 `imageReviewMode`、`storyDirection`（主要衝突、角色關係、禁忌、這些決策如何落到名單／地區／動畫）與 `animationPlan`。接著在 `plan.json` 填每隻的名稱與 `design`：辨識特徵、故事動作、可見結果、構圖與限制（方法見規格的「故事如何成為卡圖」）。

## 4. 一份 authoring.json 產生全部內容

在工作區寫 `authoring.json`：每隻寵物一列筆記（物種、元素、專長、偏好 tags、標題、個性、事件、轉變、送禮說明、招呼語、記號、派遣行動、信物、地點、約定），加上本池的文字模板（描述、Lore、對話、羈絆解鎖、羈絆故事、專長理由、提示詞）與 pool／食物／地區資料。格式範例：`devtools/fixtures/pool-authoring/sunward_letters.authoring.json`（它能逐位元組重現晴信原野的正式內容）。新增地區時另寫 `regionArt.<areaId>.prompt`。

```text
node scripts/card-pool.mjs author <id>          # 產生 pets / pets-lore（含羈絆故事）/ pool / ecosystem / prompts
node scripts/card-pool.mjs validate <id>
```

模板裡打錯的 `{佔位}` 會直接報錯；重跑只改有變動的檔案，提示詞沒變時保留已記錄的產圖 provenance。AI 逐項審查內容（名稱／Lore／描述與 design 一致、偏好與專長有理由、食物與地區完整）後核准到提示詞：

```text
node scripts/card-pool.mjs approve-all <id> --reviewer "<AI 審查者>" --through prompts [--ack-warnings]
```

`approve-all` 逐階段用目前的確切 hash 呼叫原本的核准；遇到缺檔、驗證錯誤或未確認的 warning 就停。`--ack-warnings` 只在看過該次 warnings 後才加。

## 5. 產圖（Codex）

```text
node scripts/card-pool.mjs codex-handoff <id>
```

把產生的 `content/pet-series/<id>/CODEX-IMAGES.md` 交給使用者貼到 Codex。Codex 用內建產圖工具產生全部卡圖（與新地區插畫），放回 `images/` 與 `assets/expeditions/`，並在 `prompts.json` 的 provenance 記錄工具、額度依據、SHA-256。費用原則見規格的「產圖外掛與費用原則」。

## 6. 審圖

`ai-self`：AI 逐張實際打開卡圖，縮到卡片尺寸檢查物種與肢體、裁切、辨識度、故事動作與結果，留逐張紀錄（放 `.dev-backups/evidence/<id>/`），不合格的請 Codex 重產。通過後：

```text
node scripts/card-pool.mjs approve-all <id> --reviewer "<AI 審查者>"
node scripts/card-pool.mjs stage <id>
```

`human` 模式時 `approve-all` 會停在 images，等使用者在審圖頁核准後用 `approve <id> images --hash <目前的 outputHash> --reviewer <名字> --reviewer-type human` 記錄。

## 7. 整包驗證與動畫檢視

接入 candidate、同步 `src/poolDirectory.js` 的 `POOL_NAVIGATION.featuredPoolId` 與推薦期設定，跑 `npm test`、`npm run pools:validate`、`npm run images:check`、`npm run test:pool:release`。推上 `dev` 後更新預覽站並放上動畫檢視頁：

```text
node scripts/card-pool.mjs review-page <poolId>
npm run preview:deploy -- --review-dir .dev-backups/evidence/review/<poolId>
```

在預覽站實際操作新池：檢視頁的「執行檢查」全過、三套主題與減少動態都看過，再依規格的「整包驗收與正式發布」完成工坊、專長、地區、交易與更新離線驗證，用 `node scripts/poolReleaseReview.mjs <evidence.json>` 取得 `packageHash`。`human` 模式把檢視頁連結給使用者；`ai-self` 只給整包結論。

## 8. 使用者說「可以發布」

把整包摘要（角色、食物、專長、地區、動畫、驗證數字、`packageHash`）寫進 PR。使用者對同一個 package hash 說「可以發布」後，照 [發布流程](release-flow.md) 執行 `npm run release:production -- --confirm 可以發布`。沒有這句明確同意就等待。

## 9. 發布後清理

依規格的「發布完成後清理草稿」：打 tag 保留 workspace 原貌，只留驗證工具會讀的檔案，跑四組驗證後 commit。
