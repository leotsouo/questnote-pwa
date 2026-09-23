# 霜誓峽灣：staging 階段交接

2026-09-23，Asia/Taipei。使用者以「核准卡圖」批准上輪已展示的 12 張選圖。五階段核准、實際 staging、重建一致性與候選資料驗證均完成。沒有正式 catalog／assets 寫入、source promotion、Git commit／push／merge 或 deploy。

## 圖片核准

重新讀取 AGENTS、Pipeline、roadmap、AI-HANDOFF、圖片 handoff、當前 status／validate，以及每張 PNG bytes。以 generation/manifest 的 12 個 SHA-256 和當前 images stage files 比較，均等於上輪審閱版本。

當前 images outputHash `2dfdd2dbfe88da5fa42a0eefb8e422d5961dbbe0ab05964fa893b0a0ed740493`；透過原生 CLI approve、--ack-warnings、reviewer `user-via-chat-images-2026-09-23` 封存。12 個 PET_NO_STANDARD 符合獨立池，12 個 IMAGE_LARGE 是已展示原圖的品質保存取捨，均記錄在 receipt。reviewer 是對話授權的本地追蹤，不是身分數位簽章。

未修改任何已核准 brief、plan、content、prompt 或 images bytes，也未手改 pipeline.json。

## Staging 流程

candidateId `697316249910931d21b57c50744997c2a12e9fde9743bfd3e61e094b18b7a131`，workspace 相對目錄 `staging/697316249910931d21b57c50744997c2a12e9fde9743bfd3e61e094b18b7a131/`。

先 stage --dry-run；成功且 staging 目錄仍不存在。之後 stage 建置 12 張 PNG + 24 張 WebP + 4 JSON，共 40 檔。再呼叫一次原生 stage，從同一批 approved inputs 重建，完整 manifest 比較一致，reused true。重建的工具版本指紋保持原值。

candidate.json、catalog.json、validation.json、approvals.json 均由原生 Pipeline 產生，沒有往 candidate 添放審閱 HTML 或額外報告。所有審閱文件寫在 workspace 外層或 reports/。

## 真實候選 audit

- manifest 39 個受管檔案全部核對 SHA-256，inventory 精確相符、沒有 symlink；candidate.json 自身 hash 另記。
- catalog 共有 pets 84、Lore 84、pools 3、series 3；原正式 72 pets／Lore、2 pools／series 逐項與 catalog metadata 比較不變。
- 新 Pet 去掉 imageVariants 後等於批准的 pets.json；新 Lore、pool 與批准文字相等。所有原 PNG bytes 等於 images receipt 與 workspace 源圖。
- 24 張 WebP 實際完全 decode，card 384×384、stage 960×960，引用等於依 PNG hash 算出的正式 variant 路徑。
- 原圖合計 33,470,501 bytes；card 合計 526,160 bytes；stage 合計 2,299,644 bytes。

以 staged catalog 執行 planGachaTransaction，而非臨時替代抽卡邏輯。用 rarity 區間中點和個體 index 的控制 RNG 在零抽數逐一抵達 12 ID；單抽100、十連1000／10結果／9重複，SSR pity29進第30抽、UR pity99進第100抽邊界正確；99星塵時拒絕100成本交易。無解鎖／贈寵，輸入不變，未寫 DB。這不是統計機率測試。

## Browser 素材驗證

[STAGING-REVIEW.html](../content/pet-series/frost_oath_fjord/STAGING-REVIEW.html) 僅讀 immutable candidate 的 PNG／WebP；沒有載入 App、bootstrap、SW 或 IndexedDB。隱藏的 loopback browser tab 顯示 12 cards，48/48 個 card img 成功解碼384；實際檢查縮圖、UR篩選及960 dialog，放大圖與原始PNG引用正確。未設置 viewport override，未聲稱此次完成正式 App 或手機PWA验收。

本機預覽服務在 127.0.0.1:8129，根目錄限制於該 authoring workspace；若服務結束，可直接開啟靜態 HTML。HTML 在 candidate 之外，不影響 candidate hash。

## 驗證範圍與下一步

本輪沒有更改 runtime、CLI、schema 或 encoder；不重跑與本輪無新關聯的廣泛 synthetic suite。完成的是原生 validate／stage build+check／重建、真實候選的 byte／semantic audit、實際 planner 與 WebP browser 檢查。先前工程整合測試仍見 plan handoff；release 前再依 M1／M2A／M4／M3A 流程核對完整驗收。

完整證據見 [staging validation JSON](./frost-oath-fjord-staging-validation-2026-09-23.json)，人類摘要見 [STAGING-REVIEW.md](../content/pet-series/frost_oath_fjord/STAGING-REVIEW.md)。

CLI status 的 readyToStage true／nextStage stage_candidate 表示五階段核准有效；CLI 不記錄「staging 已看過」或「發布核准」，即使已有 candidate 也會保留這個狀態。candidate releaseReady 始終為 false。

下一個工程步驟是 M3A release preparation 和隔離預覽／原生 PWA 驗收。docs/release-artifacts.md 的 hosting、scope、live baseline 和已安裝client檢查仍屬外部 release gates；不要從文件示例猜發布 scope，不把歷史部署紀錄當作即時線上 bytes。

圖片及內容不需重審；若任何批准來源／工具／baseline 改變，依原Pipeline重新核准相應 hash。正式 source promotion、merge 和 deploy 仍須另行授權。保留整個 workspace 的 generation sidecars、版本圖、approvals 和 staging，不能只備份candidate。
