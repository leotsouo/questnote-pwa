# 霜誓峽灣：prompts 階段交接

後續紀錄（2026-09-23）：使用者另回覆「核准提示詞」，已依下列相同 hash 封存；12 張原圖已完成且完整 validation 通過，目前等待 images 審閱。見 [images 交接](./frost-oath-fjord-images-handoff-2026-09-23.md)。以下保留產出 prompts 當時的歷史紀錄。

2026-09-23，Asia/Taipei。brief、plan、content 已核准；12 份 prompts 完成待審，images 未製作。無 staging、source promotion、merge 或發布。

## 本次授權及 content 封存

使用者明確回覆「核准內容」。重新讀取四份來源與 Pipeline status，確認 outputHash 為 `cd5c1eb74b1b481f223fba86147fddd82532ff34c33f893779f3f89519735a97`，且內容對應已展示的 CONTENT-REVIEW.md。

透過原生 CLI `approve frost_oath_fjord content`、當前完整 hash、`--ack-warnings` 及 reviewer `user-via-chat-content-2026-09-23` 封存。審阅並確認 12 個 PET_NO_STANDARD 符合已批准獨立池範圍。reviewer 字串是對話授權的本地記錄，不是身分數位簽章。

沒有修改 brief、plan 或四份 content bytes，沒有手改 pipeline.json。未代替使用者批准新作 prompts。

## 提示詞交付

來源為 [prompts.json](../content/pet-series/frost_oath_fjord/prompts.json)，人類審閱稿為 [PROMPTS-REVIEW.md](../content/pet-series/frost_oath_fjord/PROMPTS-REVIEW.md)。12 隻各有 `{prompt, negativePrompt, provenance}`；每份完整指定物種、職能、單一動作、構圖、光線、材質與限制。

使用 imagegen skill 的結構化 prompt 方法；未呼叫生成工具。依核准 series 採完整不透明背景，沒有套用舊 SOP 的透明素材建議。為目前 square/card/contain 與圓形 cover 的 UI 明確要求主角邊界留白、中央臉部及身份線索；這是 prompt 意圖，圖片尚未驗證。

實際讀過 pet_r16、pet_sr12、pet_ur05、pet_sp08、pet_sp09；provenance 記錄來源路徑、SHA-256 與用途，明確區分質感参照和角色差異參照。pet_sp08 僅作新鯨的差異比較，沒有被當成要複製的冰甲造型。

預定初次 text-only image_gen 執行，輸入須原樣拼接 prompt + 兩個換行 + `Avoid: ` + negativePrompt。原始 prompt 不依賴附件或文件外的未記錄條件。後續實際生成紀錄另存；尚不可填模型／seed／圖片 hash，不能把計畫當成已執行。

## 本輪驗證與限制

完整原始 CLI status、validate 結果與一次性內容完整性檢查保存在 [prompts validation JSON](./frost-oath-fjord-prompts-validation-2026-09-23.json)。未新增鏡像內容的測試套件，也未修改或重跑與本輪提示詞無關的 runtime 測試。

一次性 Node 讀取檢查通過：exact roster keys、12 份唯一非佔位 prompts、三欄均為 string、各 negative 非空、5 份正式圖片 hash、6 份已核准來源 hash；images/ 為空、staging 不存在。`git diff --name-only` 和 untracked 查詢確認 data、assets、legacy compatibility 沒有變更。

完整 Pipeline validation 仍 `ok: false`，只有 12 個 `images/<id>.png` ENOENT；沒有 PROMPT_REQUIRED／PROMPT_MISSING 或其他內容錯誤。warnings 為 12 個 PET_NO_STANDARD，未被隱藏或當成 errors override。既有池候選 standard 56／56、eternal_slumber_bloom 12／16、新池 12／12。既有 pets、lore、series、pools 的 changed／removed 全為空。

本輪純文字及紀錄變更，不操作玩家 DB。此前 first-draw planner 和 glacier runtime 驗證仍見歷史 handoff，本輪不宣稱再次執行。

## 下一 gate

當前 prompts outputHash：`a5ea5c0e2112ae6f3bcb6a68e14e0b82c6e2049c552cda7fde1a74e5a5efb58f`；file SHA-256：`84e83ed86e72c5e828ce7af53999392e588685557ecc89ab6f875e55a89fca74`。

nextStage 是 prompts、readyToStage 為 false。等使用者明確核准美術提示詞後，重新讀取來源及 status、驗證同一 revision，以當前完整 hash 透過原生 CLI 核准並確認 warnings，才開始 12 張原圖製作。

實際產圖後以工具回傳資料寫 provenance record、逐張視覺及檔案 QA、images review；之後完整 validation、stage dry-run、immutable staging、release review。這次 approval 不涵蓋正式 catalog／assets 寫入、source promotion、merge 或部署。

未 commit、push、merge、部署或開啟 App。
