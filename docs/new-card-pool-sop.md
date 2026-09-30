# 新卡池發布 SOP

## 第一步：先同步並核對最新正式版本

**需求訪談與企劃之前，先同步最新正式版。** Fetch 最新 `origin/main`、`gh-pages`，讀取正式 HTTPS 的版本、release descriptor／artifact manifest，核對部署 commit、artifact ID、reviewed source commit 與核對時間。來源 main 最新不等於正式版最新；記錄 main 尚未發布的差異及處理方式，不把生成的 gh-pages 複製回 source。

從最新 `origin/main` 建立乾淨 `codex/` 功能分支，先完成必要 runtime／契約支援，再以核對過的內容建立新的 authoring workspace。若有未發布內容，先完成 reconciliation；不可混入本池且未經驗收。舊 workspace 的 baseline、receipts、卡圖和 candidates 不重寫。

此 SOP 從下一池開始。蜜光糖庭與既有正式內容不補做；歷史 workspace／candidate 保持原格式。

## 固定訪談與預設

已提供的資訊直接帶入，一次詢問以下三題，每題可回答「交給你」。不要詢問 repository 可判斷的工程細節。

1. **主題與感覺**：這次的文化、地域或故事方向是什麼？希望玩家感受到什麼情緒？
2. **角色與美術**：必須出現哪些動物、代表角色、指定稀有度、畫風或禁止元素？數量是否沿用預設 12 隻？
3. **特殊體驗**：是否指定新探險地區、特殊解鎖、贈寵或特別演出？沒有指定就由 AI 評估。

回答後由 AI 完成企劃、名單、Lore、提示詞、食物、專長、地區方案與動畫。預設一池、12 隻可調整，稀有度由 AI 配置；兩隻 UR 不是通用規則。沿用現行价格、機率與保底，全部第一抽開放，不新增解鎖或贈寵。特殊要求寫進 brief。

## 每池同時發布的內容

| 內容 | 必須完成 |
| --- | --- |
| 一個卡池／系列 | 名單、稀有度、卡圖、Lore、對話與角色資料 |
| 一種新工坊食物 | 唯一新 ID、名稱、配方、效果、材料來源、實際適合的新角色 |
| 每隻寵物的偏好 | 明確 tags 與理由；空偏好也須说明，不從名稱猜測 |
| 每隻寵物的探險專長 | 角色定位、專長角色與用途，核對實際派遣結果 |
| 卡池動畫 | 專屬／重用／無動畫的明確選擇及理由、分鏡、時長、稀有度效果、略過與減少動態 |
| 探險地區評估 | `add` 或 `reuse` 及理由；新增時完成整個地區，沿用時列出材料供應地區 |
| 發布說明 | 角色、食物、專長、動畫、地區變更及實際驗收證據 |

食物優先使用現有材料，預設使用既有主題食物尺度：普通送禮 +75、符合偏好時總共 +150，不能疊加；保留每日贈送與交易限制。

專長包括探路 `scout`、採集 `gatherer`、同行 `companion`、解讀 `scholar`、守護 `guardian`。目前 runtime 依角色資料推導，SOP 記錄預期角色與理由並比對 `getPetSpecialty()`，不把企劃文字當成有效設定，也不改變舊寵物專長。若要新增類型或獨立指定方式，先完成受控 runtime／契約，再鎖定 authoring。

新地域具有獨立故事，且有探索、獎勵或材料用途時新增地區；只有美術題材差異可沿用。標準發布最多一個新地區。新增地區包含可實際使用的解鎖條件、派遣時間／能量、獎勵、材料用途、探索發現、故事及 10／25／50／75／100 五個里程碑。新增材料須有可領取的來源與食物配方用途。決定新增後不能以未完成名稱或 fallback 故事交付。

## 產圖外掛與費用原則

**盡量使用已安裝且適用的產圖外掛插件，避免額外費用。** 開始產圖前先盤點可用工具／外掛及參考圖支援，確認其計費方式與目前可用權限。優先使用已確認不會額外計費的外掛；安裝了外掛不代表呼叫免費。

費用無法確認時不呼叫，改用已確認免費／不額外計費的現有方案；沒有可用方案時回報阻礙，不自行啟用付費 API、訂閱、購買額度或安裝付費依賴。每隻角色提示詞的 `provenance` 記錄實際 `tool`、`noExtraCost: true`、`costBasis`，並保存可用的模型、reference、seed 等資訊，未知資訊不編造。動畫優先本地 CSS／SVG。

## 階段與兩次人工審核

正式版本同步 → 固定訪談 → AI 企劃與製作 → **人工卡圖審核** → staging／整包驗證 → **人工最終驗收** → 明確「可以發布」 → 正式發布驗證。

保留 brief／plan／content／prompts／images 五個 exact-hash gates。前四階段由 AI 審查，記錄 `reviewerType: ai` 和真實 reviewer；images 必須 `reviewerType: human`。只有明確標記 synthetic 的測試可用 synthetic reviewer，不能用來取得真實發布就緒。

卡圖審查涵蓋角色識別、風格、裁切與提示詞／Lore 一致性。相同 PNG bytes 可記錄原人工核准及 SHA-256 沿用；圖片變更重新核准。工具或上游內容變更仍需重跑受影響階段，不覆寫舊 receipts、snapshots、candidates 或發布產物。

現行 SOP 的 `ecosystem.json` 與寵物內容一起進入 content hash；baseline 包含工坊、偏好、材料、探險資料與相關 runtime。缺少新食物、材料來源、逐隻偏好／專長、地區評估、完整新增地區或費用依據，都阻擋核准／staging。`pipeline.json` 的 SOP marker 不可移除降級。

candidate 保存原 companion baseline bytes、審核輸入與合併後 companion catalogs；assembler 重新驗證，preview 和 production 使用同一組內容。來源 companion 檔案只可等於原 baseline 或本次完整核准結果，其他漂移會被拒絕。

## 整包驗收與正式發布

執行 `npm test`、JS 語法檢查、`npm run pools:validate`、`npm run images:check`、`npm run test:pool:release`。新增內容時，不用固定總數取代資料引用、專長、偏好及地區覆蓋檢查。

在隔離 preview 實際驗證：入場／單抽／十連／SSR／UR 順序與重複角色、各階段略過／連點／鍵盤／減少動態／圖片失敗與中斷；工坊製作→選角送禮；逐隻專長與派遣效果；新增地區解鎖→派遣→領獎→里程碑；無重抽／重複扣款／領獎、存檔相容及 service worker 更新。不要操作正式玩家 DB 或把 synthetic 測試結果當成實際卡池驗收。

final review JSON 包含 `schemaVersion: 1`、`sourceCommit`、`candidateId`、`candidateManifestSha256`、`previewUrl`、`artifacts.preview/production`（`artifactDir`、`artifactId`、`manifestSha256`、`scopePath`），及 `checks.animation/workshop/specialties/region/transactions/serviceWorker`（`status: pass`、實際 `evidence`；沿用地區可 `status: reuse`）。

執行 `node scripts/poolReleaseReview.mjs <evidence.json>`，取得綁定整包的 `packageHash`。人工最終驗收寫入 `humanAcceptance: { reviewer, acceptedAt, packageHash }`；明確發布授權寫入 `publicationAuthorization: { reviewer, approvedAt, packageHash, phrase: '可以發布' }`。同一次明確整包驗收與發布同意可記錄兩者；沒有明確發布同意就等待，不多設前期人工關卡。

重新執行檢查須 `releaseReady: true`；缺少驗收／授權時 CLI 回傳非零 exit code。任何卡圖、內容、來源、預覽或 production artifact 的實質修改，都重建受影響產物並重新驗收最新 packageHash。紀錄不是數位簽章，工具不能替代真實人工同意，也沒有發布命令。

核准後才合併發布來源、推送核准的生成產物。記錄來源 PR／merge、部署 commit、Pages 成功、正式 HTTPS bytes／hashes 與 service worker 更新結果；保存舊產物與歷史證據。不把 source merge 當成已發布。
