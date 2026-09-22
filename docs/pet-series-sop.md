# QuestNote 寵物系列製作 SOP（V3.1.0）

> 新增完整卡池請改用 [Card Pool Pipeline v1](card-pool-pipeline.md)，依序核准 brief、plan、content、prompts、images，產出 staging candidate，再交給 [release assembler](release-artifacts.md)。以下為既有寵物系列工具的操作記錄；它的 publisher 不涵蓋完整卡池、版本化 catalog 與發布保障。

> 發布寵物原圖後，在專案根目錄執行 `npm ci`、`npm run images:build`、`npm run images:check`。前者以原 PNG 產生 384 px 卡片與 960 px 演出 WebP，並更新 `data/pets.json` 的可選 `imageVariants` 路徑；後者檢查來源雜湊、尺寸與檔案存在。原 PNG 須保留供放大檢視和載入失敗時備援。新生成的 `assets/pets/variants/` 應隨寵物資料一同提交，圖片不加入 Service Worker 預快取。

本文件供作者本機依照固定流程製作與發布寵物系列。  
**第一個正式新系列請在 V3.2.0 使用本工具發布；V3.1.0 只提供工具與規範，不正式新增寵物。**

---

## 1. 建立系列

### 啟動 Builder

```bash
node devtools/pet-series-builder/server.mjs
```

瀏覽器開啟：

```text
http://127.0.0.1:4174
```

工具只監聽 `127.0.0.1`，不會出現在正式 App 介面。

### 建立 seriesId

規則：

```text
僅允許：小寫英文字母、數字、底線
例如：starlight_garden
禁止：空白、斜線、中文路徑、..
```

在左側「建立新系列」填入 `seriesId` 與系列名稱後按「建立系列」。

### 設定 rarityPlan

在系列資料區填寫各稀有度計畫數量。實際新增寵物數與計畫不同時會出現 **warning**，不直接擋發布。

### 保存工作區

按「保存工作區」。資料寫入：

```text
content/pet-series/<seriesId>/
```

---

## 2. 新增寵物

1. 按「新增」自動分配 ID  
2. 選擇 ID 類型：
   - **一般寵物**：依 rarity 產生 `pet_nXX` / `pet_rXX` / `pet_srXX` / `pet_ssrXX` / `pet_urXX`
   - **特殊 SP**：產生 `pet_spXX`（rarity 仍可為 SR／SSR／UR）
3. 填寫：
   - 名稱、稀有度、短描述
   - `seriesId`（自動）
   - `speciesType`
   - `element`（pets.json 內部主題鍵，例如 `star_nature`）
   - `visualTheme`
   - `poolTags`（是否進標準池由此決定；**不要**把系列 ID 自動當 poolTag）

ID 規則：

```text
取相同前綴目前最大編號 + 1
不填補歷史空號（例如缺少 pet_sp07，下一個仍是 pet_sp14）
```

---

## 3. 圖片

標準：

```text
格式：PNG（檢查真實簽名，不是只看副檔名）
比例：1:1
建議尺寸：1024 × 1024
最低：512 × 512
高於 2048：warning
背景：透明（建議）
檔名：與寵物 ID 完全相同（pet_sr09.png）
容量：< 2MB 通過；2～5MB warning；> 5MB error
```

放到：

```text
content/pet-series/<seriesId>/images/<petId>.png
```

或在 Builder「圖片與 Prompt」分頁上傳。  
**不會**覆蓋 `assets/pets` 既有檔案。

---

## 4. Lore

必填：

```text
title
personality（1～3；新寵物建議 3）
element（顯示屬性，例如「光」——與 pets.json element 不同）
完整 lore
dialogues：
  normal ×5
  urgent ×5
  important ×5
  praise ×5
  idle ×3
  bondUp ×2
  summon（非空字串）
bondUnlocks：2、3、4、5
```

畫面會顯示完成狀態，例如「一般對話 5 / 5」。

同時在 `prompts.json` 記錄 prompt／negativePrompt（只留在工作區，不進正式 App）。

---

## 5. 驗證

按「驗證」。

### Error（禁止發布）

例如：ID／名稱／圖片衝突、缺 Lore、對話不足、圖片非 PNG／非 1:1、Pool 有機率但該稀有度無候選等。

### Warning（可發布但需確認）

例如：描述過短、personality 少於 3、未加入 `standard`、新 poolTag 無 Pool 使用、圖片偏大等。

修正後再驗證，直到 Errors = 0。

---

## 6. Pool Preview

右側 Pool Preview 使用與正式抽卡相同的篩選函式（`matchesPetPoolFilter`／`getEligiblePetsForPool`）。

目前多個 `poolTags` 語意為 **OR**（符合任一標籤即可）。

注意：

```text
poolTags = 抽卡池標籤
seriesId = 寵物系列
兩者不是同一件事
```

確認新寵物是否進入「標準召喚」：需具備 `poolTags: ["standard"]`。

目前正式抽卡池僅有「標準召喚」。未來若要自訂活動標籤，可使用例如：

```text
season_event
limited_event
```

這些只是未來自訂標籤範例，不是目前已存在的抽卡池。  
只有當 `pools.json` 實際新增對應 Pool，且寵物帶有該 tag 時，才會進入活動抽卡。

---

## 7. 發布

### Dry Run

```bash
node scripts/publish-pet-series.mjs <seriesId> --dry-run
```

或在 Builder 按「Dry Run」。

只模擬合併，**不修改**正式 JSON、不複製圖片、不改版本。

### 正式發布（Builder）

1. Errors = 0  
2. 勾選確認所有 Warnings  
3. 輸入系列 ID（例如 `starlight_garden`）  
4. 確認發布  

### 正式發布（CLI）

```bash
node scripts/publish-pet-series.mjs starlight_garden --confirm starlight_garden --ack-warnings
```

### 發布後檢查

- 查看 `reports/pet-series-<seriesId>.md`
- `git diff` 確認只動到白名單檔案
- **手動** Commit（Builder／CLI 不會自動 commit／push）

允許修改：

```text
data/pets.json
data/pets-lore.json
data/pet-series.json
assets/pets/<新圖片>
reports/pet-series-<seriesId>.md
```

---

## 8. 回滾

備份位置：

```text
.dev-backups/pet-series/<timestamp>-<seriesId>/
```

含發布前的：

```text
pets.json
pets-lore.json
pet-series.json
```

手動恢復範例：

```bash
copy .dev-backups\pet-series\<backup>\pets.json data\pets.json
copy .dev-backups\pet-series\<backup>\pets-lore.json data\pets-lore.json
copy .dev-backups\pet-series\<backup>\pet-series.json data\pet-series.json
```

並刪除本次新增的 `assets/pets/<新id>.png`。

---

## 9. 後續版本（系列資料發布後）

Builder **不會**自動升 App 版本。正式發版時仍需：

1. 更新 `APP_VERSION`  
2. 更新 Service Worker `CACHE_NAME` 與註冊 URL  
3. 更新備份支援版本  
4. 實機／PWA 測試抽卡、圖鑑、離線  

---

## CLI 驗證

```bash
node scripts/validate-pet-series.mjs <seriesId>
```

Exit code：`0` 通過；`1` 有 Error。

---

## 工作區結構

```text
content/pet-series/<seriesId>/
├─ series.json
├─ pets.json
├─ pets-lore.json
├─ prompts.json
└─ images/
```

模板：`content/pet-series/_template/`
