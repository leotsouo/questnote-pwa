# 永眠花海 Builder Dry Run 完成報告

產生時間：2026-07-26（本機 Dry Run，未正式發布）

## 1. 執行狀態
- Builder 啟動方式：本機 CLI（`validate-pet-series.mjs` / `publish-pet-series.mjs --dry-run`）；因 `content/pet-series/eternal_slumber_bloom/` 已含 `source-data`／`source-images`，`createWorkspace` 無法新建同名資料夾，改以 Builder 同款 `getNextPetId` + `saveWorkspace` 建草稿
- 使用 CLI／本機工具：`node scripts/validate-pet-series.mjs eternal_slumber_bloom`、`node scripts/publish-pet-series.mjs eternal_slumber_bloom --dry-run`
- Dry Run 是否完成：是（`DRY-RUN PASS`，Errors = 0）
- 是否正式發布：否

## 專案現況（操作前確認）
- APP_VERSION：`3.1.1`
- CACHE_NAME：`questnote-cache-v311-remove-dragon-pool`
- Service Worker URL：`./service-worker.js?v=311`
- DB_VERSION：`3`（未變更）
- 正式寵物／Lore：各 56 隻
- 正式 pools：僅 `standard`（active）

## 2. 來源檢查
- 圖片數量：12／12
- 圖片格式：真實 PNG 簽名通過；colorType=2（RGB，無 alpha／無 tRNS）
- 圖片尺寸：全部 1254 × 1254（Builder UI 接受範圍：≥512 且 1:1；非硬性 1024，已保留原尺寸）
- 圖片比例：1:1
- 文字資料檔案：
  - `source-data/01-series-handoff.md`：存在
  - `source-data/02-lore-dialogues.md`：存在（12 組 lore + dialogues）
  - `source-data/03-field-supplement.md`：存在（12 組 title／personality／description／bondUnlocks）
- 缺少資料：無
- 來源圖片：僅複製至 `images/<id>.png`，原檔保留於 `source-images/`

### 已核准文字修正
- 霧絮海蛞 title：來源已是「夢霧播散者」，無需修正
- 寂繭眠蛾 bondUnlocks Lv.5：來源已是核准版，無需修正

## 3. 系列資料
- seriesId：`eternal_slumber_bloom`
- poolTag：`eternal_slumber_bloom`
- 寵物總數：12
- 稀有度分布：N3／R3／SR3／SSR2／UR1
- 皆不含 `standard`／`event_dragon`／`dragon_event`

## 4. ID 預分配

| 稀有度 | 名稱 | Builder 分配 ID | 預計圖片檔名 |
|---|---|---|---|
| N | 花眠蜜鼯 | pet_n17 | pet_n17.png |
| N | 苞燈蕈靈 | pet_n18 | pet_n18.png |
| N | 霧絮海蛞 | pet_n19 | pet_n19.png |
| R | 鏡池浮水母 | pet_r13 | pet_r13.png |
| R | 夢壤穿山甲 | pet_r14 | pet_r14.png |
| R | 鈴蕊果子狸 | pet_r15 | pet_r15.png |
| SR | 霧紗夢蛛 | pet_sr09 | pet_sr09.png |
| SR | 花庭旋角羚 | pet_sr10 | pet_sr10.png |
| SR | 琉夢花螈 | pet_sr11 | pet_sr11.png |
| SSR | 寂繭眠蛾 | pet_ssr05 | pet_ssr05.png |
| SSR | 鏡夢花貘 | pet_ssr06 | pet_ssr06.png |
| UR | 永眠花皇兔 | pet_ur05 | pet_ur05.png |

分配依據：正式資料各前綴最大編號 +1（N16→17、R12→13、SR08→09、SSR04→05、UR04→05）；未回填缺號、未使用 `pet_sp*`。

## 5. Schema 驗證
- pets：通過（Errors = 0）
- lore：通過（Errors = 0）
- dialogues：通過（各 rarity 結構齊全）
- bondUnlocks：通過（2／3／4／5）
- pets/lore 一對一：通過（12／12）
- 圖片引用：通過（工作區 `images/<id>.png` 存在；正式 `assets/pets/<id>.png` 尚不存在，無覆蓋衝突）

## 6. Pool Preview
### Staging（draft-only，未寫入 `data/pools.json`）
- Preview 候選總數：12
- N：3
- R：3
- SR：3
- SSR：2
- UR：1
- 是否含 standard 寵物：否
- 是否使用暫用機率：是（複製 standard rates／pity 作為技術預覽；**暫用預覽值，未核准**；`active: false`）

### 正式 Builder Pool Preview（僅現有 `standard` 池）
- 標準召喚：56 → 56（本系列未加入 standard，故正式池候選不變）

## 7. 正式資料保護
- pets.json 是否未變：是（SHA256 前後一致；仍 56 隻）
- pets-lore.json 是否未變：是（SHA256 前後一致；仍 56 筆）
- pools.json 是否未變：是（SHA256 前後一致；僅 standard）
- IndexedDB／DB_VERSION 是否未變：是（`DB_VERSION = 3`；本次未觸碰 IndexedDB）
- Service Worker precache 是否未變：是（寵物圖僅 runtime cache 路徑判斷，未加入 `PRECACHE_URLS`）
- APP_VERSION／CACHE_NAME／SW URL：未變更
- `event_dragon`／`dragon_event`：未重新加入

## 8. Errors
無

## 9. Warnings
共 72 項（可發布阻擋僅針對 Errors；以下依類型彙整，不可忽略）：

1. **PET_POOLTAG_UNUSED** ×12：`eternal_slumber_bloom` 目前沒有任何正式 Pool 使用（預期：尚未核准活動池）
2. **PET_NO_STANDARD** ×12：未加入 `standard`（預期：獨立限定系列）
3. **PET_NO_ACTIVE_POOL** ×12：未進入任何 active Pool（預期：同上）
4. **LORE_PERSONALITY_FEW** ×12：personality 為 2 個（來源鎖定；建議值為 3）
5. **PROMPT_MISSING** ×12：工作區 `prompts.json` 無 prompt 紀錄（來源未提供；prompts 不進正式 App）
6. **IMAGE_LARGE** ×12：圖片 2～5 MB（1254×1254 PNG；未重新取樣）

## 10. 產出位置
- Builder 草稿：`content/pet-series/eternal_slumber_bloom/`（`series.json`、`pets.json`、`pets-lore.json`、`prompts.json`、`images/`）
- staging output：`content/pet-series/eternal_slumber_bloom/staging/`（`id-allocation.json`、`pool-preview.json`、`dry-run-summary.json`、本報告）
- Dry Run report：`content/pet-series/eternal_slumber_bloom/staging/dry-run-report.md`；另複製至 `reports/pet-series-eternal-slumber-bloom-dry-run.md`
- backup：Dry Run 不建立 `.dev-backups`（僅正式 Publish 會備份）

## 11. 下一步
正式發布前仍需使用者決定：

1. 是否承認上述 72 項 Warnings（尤其 personality=2、無 prompt、圖片偏大）
2. 永眠花海召喚的正式 rates／pity／cost／重複補償（目前僅 staging 暫用 standard 值）
3. 是否新增正式 `data/pools.json` 活動池（`active` 時機、`petFilter.poolTags`）
4. 是否執行正式 Publish（寫入 `data/pets.json`／`pets-lore.json`／`pet-series.json` 並複製圖片至 `assets/pets/`）
5. 正式發版時是否提升 APP_VERSION／CACHE_NAME／SW URL（Builder 不會自動升版）
6. iPhone Safari PWA 實機驗收（本次未執行）

最終狀態：
Dry Run Complete，尚未發布，等待使用者確認。
