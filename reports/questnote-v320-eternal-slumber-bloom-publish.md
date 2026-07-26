# QuestNote V3.2.0 永眠花海正式發布完成報告

## 1. 版本
- APP_VERSION：`3.2.0`
- CACHE_NAME：`questnote-cache-v320-eternal-slumber-bloom`
- Service Worker URL：`./service-worker.js?v=320`
- DB_VERSION：`3`（未變更）

## 2. Publish
- Builder Publish 是否成功：是（`PUBLISHED`）
- Backup：
  - 發布前完整備份：`.dev-backups/pet-series/2026-07-26T23-40-48-eternal_slumber_bloom-prepublish/`
  - Builder 原子發布備份：`.dev-backups/pet-series/2026-07-26T15-43-15-215Z-eternal_slumber_bloom/`
- Rollback：可自上述備份還原 `pets.json`／`pets-lore.json`／`pet-series.json`／`pools.json`，並刪除新增 `assets/pets/pet_*.png`
- Publish report：`reports/pet-series-eternal-slumber-bloom.md`
- 正式資料是否寫入：是

## 3. 寵物
- 發布前 pets：56
- 發布後 pets：68
- 發布前 lore：56
- 發布後 lore：68
- 新增寵物：12（花眠蜜鼯～永眠花皇兔）
- ID 範圍：`pet_n17`–`pet_n19`、`pet_r13`–`pet_r15`、`pet_sr09`–`pet_sr11`、`pet_ssr05`–`pet_ssr06`、`pet_ur05`
- 既有 56 隻 pets／lore：與發布前備份比對 **0 變更**

## 4. 圖片
| ID | 名稱 | 尺寸 | 原始容量 | 正式容量 | 是否無損最佳化 |
|---|---|---:|---:|---:|---|
| pet_n17 | 花眠蜜鼯 | 1254×1254 | 2,548,208 | 2,474,319 | 是 |
| pet_n18 | 苞燈蕈靈 | 1254×1254 | 2,447,246 | 2,385,176 | 是 |
| pet_n19 | 霧絮海蛞 | 1254×1254 | 2,357,146 | 2,357,146 | 否（節省不足） |
| pet_r13 | 鏡池浮水母 | 1254×1254 | 2,764,779 | 2,764,779 | 否（節省不足） |
| pet_r14 | 夢壤穿山甲 | 1254×1254 | 2,991,967 | 2,991,967 | 否（節省不足） |
| pet_r15 | 鈴蕊果子狸 | 1254×1254 | 2,869,151 | 2,802,201 | 是 |
| pet_sr09 | 霧紗夢蛛 | 1254×1254 | 3,048,216 | 2,989,676 | 是 |
| pet_sr10 | 花庭旋角羚 | 1254×1254 | 2,821,585 | 2,821,585 | 否（節省不足） |
| pet_sr11 | 琉夢花螈 | 1254×1254 | 2,789,940 | 2,789,940 | 否（節省不足） |
| pet_ssr05 | 寂繭眠蛾 | 1254×1254 | 2,770,584 | 2,684,666 | 是 |
| pet_ssr06 | 鏡夢花貘 | 1254×1254 | 3,009,692 | 2,945,101 | 是 |
| pet_ur05 | 永眠花皇兔 | 1254×1254 | 2,648,840 | 2,583,144 | 是 |

- 圖片總容量：約 **31.08 MB**
- 是否全部可解碼：是（PNG／RGB／1254×1254）
- 是否加入 precache：否（僅 runtime pet image cache）
- 來源圖：`source-images/` 完整保留未覆寫

## 5. 系列
- seriesId：`eternal_slumber_bloom`
- poolTag：`eternal_slumber_bloom`
- 系列寵物數：12
- 稀有度分布：N3／R3／SR3／SSR2／UR1

## 6. 正式卡池
- Pool ID：`eternal_slumber_bloom`
- 顯示名稱：永眠花海召喚
- active：`true`
- cost：`100`
- rates：`N0.55 / R0.30 / SR0.10 / SSR0.03 / UR0.02`
- pity：`ssr30 / ur100`
- 候選總數：12
- 是否含 standard 寵物：否
- UR 候選：僅 `pet_ur05` 永眠花皇兔

## 7. Standard 回歸
- standard 候選數：56
- rates 是否未改：是
- pity 是否未改：是
- 既有資料是否未改：是（cost／filter／pets 皆未動）

## 8. Warnings
- 發布前（Dry Run）：72
- 發布後（活動池啟用後）：48
- 已消失：`PET_POOLTAG_UNUSED`×12、`PET_NO_ACTIVE_POOL`×12
- 已承認：`PET_NO_STANDARD`×12、`LORE_PERSONALITY_FEW`×12、`PROMPT_MISSING`×12、`IMAGE_LARGE`×12  
  （見 `content/pet-series/eternal_slumber_bloom/staging/warning-acknowledgement.md`）
- 圖片容量 Warning：仍存在（無損最佳化後仍 2～5 MB）

## 9. 測試
- Schema：通過（正式 pets／lore catalog Errors = 0）
- pets/lore 一對一：通過（68／68；新增 12／12）
- 圖片引用：通過（12 張正式圖皆存在）
- Pool Preview：standard 56→56；永眠花海 0→12
- 抽卡：已實作多 active 池選擇；單抽／十連改走選中池
- 保底分池：`poolPity[poolId]` 首次使用建立；standard 由舊 `ssrPity`／`urPity` 種子化且不重設
- 重複補償：沿用全域 `FRAGMENT_BY_RARITY`（未改）
- 收藏：寫入路徑未改；系列篩選新增「永眠花海 x／12」
- 圖鑑：系列分類可顯示永眠花海
- Health Check：版本／mailbox／series 相關斷言已對齊 3.2.0；瀏覽器完整 `runAppHealthCheck()` 待實機／本機 App 開啟確認
- PWA／Service Worker：CACHE_NAME 已換新；寵物圖未進 App Shell precache

## 10. 正式資料保護
- IndexedDB 是否未清除：是
- DB_VERSION 是否維持 3：是
- standard 保底是否未重設：是（邏輯上由舊欄位種子至 `poolPity.standard`）
- 使用者資料是否未修改：是（無 DB migration／無清除）

## 11. Changed Files
- `data/pets.json`（+12）
- `data/pets-lore.json`（+12）
- `data/pet-series.json`（+eternal_slumber_bloom）
- `data/pools.json`（+永眠花海召喚；移除舊 event_dragon 殘留已在發布前狀態）
- `assets/pets/pet_n17.png` … `pet_ur05.png`（12）
- `reports/pet-series-eternal-slumber-bloom.md`
- `src/version.js`（3.2.0）
- `service-worker.js`（CACHE_NAME v320）
- `src/backupService.js`（支援 3.2.0；備份含 poolPity）
- `src/gachaService.js`（多池選擇＋保底分池）
- `src/ui.js`／`index.html`／`src/styles.css`（卡池選擇器、系列篩選）
- `src/app.js`（載入 pet-series.json）
- `src/healthCheckService.js`（版本斷言對齊 3.2.0）
- `content/pet-series/eternal_slumber_bloom/`（工作區／staging／images）

## 12. 尚待實機驗收
1. iPhone Safari PWA 安裝／更新後是否拿到 V3.2.0 cache
2. 卡池選擇器切換「標準召喚／永眠花海召喚」
3. 單抽、十連、SSR／UR 保底分池與重載後保留
4. 永眠花海 UR 必為永眠花皇兔
5. 12 張大圖載入速度與記憶體
6. 圖鑑系列「永眠花海 0／12～12／12」
7. Lore／personality／bondUnlocks 顯示
8. 離線 App Shell 仍可用；寵物圖採 runtime cache

最終狀態：
Code Complete，pending iPhone acceptance。
