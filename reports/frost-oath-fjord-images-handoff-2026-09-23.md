# 霜誓峽灣：images 階段交接

後續紀錄（2026-09-23）：使用者已另回覆「核准卡圖」，images 已依相同 hash 封存；staging 已組裝且重建驗證一致。最新狀態見 [staging 交接](./frost-oath-fjord-staging-handoff-2026-09-23.md)。以下保留圖片產出當時的歷史紀錄。

2026-09-23，Asia/Taipei。prompts 已核准，12 張選定原圖完成待審，完整 validation 通過。尚未核准 images，未 stage、source promotion、commit、push、merge 或部署。

## 授權與封存

使用者明確回覆「核准提示詞」。重新讀取 prompts.json 與 status，確認 prompts outputHash 仍為 `a5ea5c0e2112ae6f3bcb6a68e14e0b82c6e2049c552cda7fde1a74e5a5efb58f`，file SHA-256 仍為 `84e83ed86e72c5e828ce7af53999392e588685557ecc89ab6f875e55a89fca74`。原生 approve CLI 以 reviewer `user-via-chat-prompts-2026-09-23` 及 --ack-warnings 封存；12 個 PET_NO_STANDARD 符合已核准獨立池設定。

沒有手改 pipeline.json、prompt、plan、brief 或四份 content。原生 status 現有前四階段核准，images awaiting_review。

## 實際產圖

使用 imagegen skill 的預設內建 image_gen，13 次文字生成，未使用 CLI/API fallback、附加影像、未知 model 或 seed。每次真正送出的 input 只有 prompt 欄位，內容逐字拼接已核准 prompt + `\n\nAvoid: ` + negativePrompt。

12 隻各有首版；pet_sr14 首版角尖碰近頂緣，以相同 prompt 重生成第二版，選用第二版。第一版與第二版都在 workspace generation/variants 保留，工具原始輸出保持原位。原圖複製至 images/<petId>.png，沒有 resize、crop、壓縮或像素修改。

實際輸出並非提示詞中的目標 1024，而是 1254×1254；全部符合 Pipeline 規格。每張 2.38–3.01 MiB，12 張總計 33,470,501 bytes。全部 opaque、完整 decode 成功，選定 bytes 等於工具原檔，SHA-256 均記錄。

每次執行記錄見 content/pet-series/frost_oath_fjord/generation/*.json；manifest 包含版本選擇、hash、檔案 metadata 和請求 hash。生成前的 prompt provenance 保持 immutable，生成後資料獨立記錄。工具只回傳 image_url 與 output_hint；model、version、seed 未公開，明確留 null。

generation sidecars 和未選稿須隨整個 authoring workspace 一起備存；既有 staging 不會自動把這些新增 sidecars 當作原生 approvals 打包。

## 驗證

完整原始 status、validation 及輸出完整性 audit 保存於 [images validation JSON](./frost-oath-fjord-images-validation-2026-09-23.json)。

- Pipeline validate：ok true、0 errors；warnings 是 PET_NO_STANDARD×12、IMAGE_LARGE×12。
- IMAGE_LARGE 全因 PNG 大於 2 MiB，未超過 5 MiB 硬上限，也沒有超過 2048 px。保留原圖供人類品質審閱，images approval 時需要明確 ack 這項取捨；WebP 由後續 staging 產生。
- 前四階段 approved、既有 baseline／工具指紋一致。
- old catalog changed／removed 均空；standard 56／56、eternal_slumber_bloom 12／16、frost_oath_fjord 12／12。
- 每個實際請求均等於已批准文字、無 reference 參數；13 個原始檔都可溯源，12 個選定檔與原始輸出完全相等。

## 視覺與審閱頁

12 張原圖皆在生成工具輸出中逐張視閱。檢查物種、角色配件、動作、色調、全圖邊界、解剖與可辨識文字。沒有把 schema 通過當成人類品質批准；目前是製作者建議交付的版本。

[IMAGE-REVIEW.html](../content/pet-series/frost_oath_fjord/IMAGE-REVIEW.html) 使用原 PNG，提供完整圖、48／80 px 方圖、96 px 圓形 cover 模擬，另有 rarity 篩選與放大 dialog。無 App 啟動、IndexedDB、SW 或生成按鈕。

使用隱藏的本機 browser tab 實際看過全部縮圖。DOM 檢查：12 cards、48/48 預覽 img 載入成功，naturalWidth 1254；正常瀏覽器 viewport 為 1280，document scrollWidth 1265，未設 viewport override。UR filter 顯示 1 張，放大 dialog 對應正確主打。沒有宣稱本輪做手機或正式 App UI 驗收。

80 px 與圓形中臉部保留、物種和主要色塊可辨；圓形會裁掉部分外側翼角及背景，完整輪廓以方形圖為準。48 px 不足以呈現工具精細接點，審閱頁提供放大原圖。

## 下一 gate

images outputHash：`2dfdd2dbfe88da5fa42a0eefb8e422d5961dbbe0ab05964fa893b0a0ed740493`。nextStage images，readyToStage false。

使用者審閱 [IMAGES-REVIEW.md](../content/pet-series/frost_oath_fjord/IMAGES-REVIEW.md) 和 12 張選圖後，若明確核准卡圖，再重讀最新來源／status／validation，以當前完整 hash 核准 images，並確認兩類 warnings。接著才 stage dry-run、stage immutable candidate，供下一輪 staging review。

正式發布仍需 release review；本輪没有修改正式 data/assets、runtime、schema、工具指紋或 legacy compatibility，也沒有 merge、deploy 或玩家資料寫入。
