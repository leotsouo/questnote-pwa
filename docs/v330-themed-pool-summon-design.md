# QuestNote V3.3.0｜主題卡池展示與永眠花海召喚演出設計

## 現有流程

```text
使用者點擊單抽／十連
→ isGachaPullInProgress 鎖定
→ pullOnce / performTenPull（扣費 → RNG → 保底 → 收藏／碎片）
→ preloadGachaResultImages
→ 若最高稀有度為 SSR／UR：playSummonReveal（純展示）
→ showPullResult / showTenPullResult（共用 Modal）
→ 解鎖按鈕
```

關鍵模組：

| 職責 | 位置 |
|---|---|
| 抽卡交易 | `src/gachaService.js`（`pullOnce`／`performTenPull`／`rollSinglePull`） |
| SSR／UR 舊演出 | `src/summonRevealService.js` |
| 召喚頁 UI | `src/ui.js`（`renderGachaView`／`handlePull`／`handleTenPull`） |
| 偏好儲存 | `src/preferencesService.js` → `STORES.META` |
| 卡池資料 | `data/pools.json` + `petFilter.poolTags` |

交易順序（不可改）：**扣費 → 產生結果 → 寫保底／收藏／補償 → 再交給展示層**。

## 預計修改點

1. `data/pools.json`：為 `eternal_slumber_bloom` 增加可選 `presentation`（語意欄位 only）。
2. 新增 `src/poolPresentation.js`：正規化 presentation、theme／animation allowlist、安全讀取。
3. 新增 `src/poolDebutService.js`：META key `poolDebutSeen` 記錄首次登場（不升 `DB_VERSION`）。
4. 新增 `src/themedSummonController.js`：主題召喚狀態機（純展示）。
5. `index.html`／`src/styles.css`／`src/ui.js`：主題主畫面、登場演出、抽卡入口串接。
6. `devtools/summon-animation-preview.html`：mock 結果預覽（不呼叫正式 draw）。
7. `version.js`／`service-worker.js`：升至 3.3.0；新 JS 加入 precache；**不加寵物圖**。
8. `backupService.js`：`poolDebutSeen` 納入備份白名單；`SUPPORTED_VERSIONS` 加 `3.3.0`。

不修改：rates／pity／cost／RNG／pets／lore／補償規則／`DB_VERSION`。

## 新舊流程比較

| 項目 | V3.2.0 | V3.3.0 |
|---|---|---|
| 無 presentation 池 | 預設面板 + SSR／UR reveal | **相同**（相容） |
| 有 presentation 池 | （無） | 主題主畫面 + dream_bloom 儀式動畫 |
| 結果產生 | gachaService | **相同，只呼叫一次** |
| 動畫失敗 | 進 Modal | 立即 fallback 既有結果 Modal |
| standard | 現有風格 | **不得套用永眠主題** |

新流程：

```text
確認抽卡 → 鎖定
→ 正式 draw 一次（扣費／結果／保底／收藏）
→ 既定結果交給 themedSummonController（或舊 reveal）
→ 演出／略過／reduced
→ 結果 Modal（夢境花印或既有樣式）
→ 解鎖
```

## 動畫狀態機

```text
idle → preparing → dreamDust → mirrorRipple → rarityOmen → bloom
     → revealing → summary → complete
任意階段錯誤／初始化失敗 → fallback
略過：AbortController 取消等待 → 跳到 summary／complete（不重抽）
```

狀態集中於 `themedSummonController`；等待以 Promise + `animationend`／timeout + AbortSignal 完成，避免散落互相依賴的 `setTimeout` 鏈。

## 失敗回退策略

| 情境 | 行為 |
|---|---|
| 動畫 DOM 建立失敗 | 立刻 `fallback` → 既有 Modal |
| 圖片 decode 失敗 | 略過該圖特效，仍顯示名稱／稀有度 |
| 使用者略過／連點 | 只結束演出；結果陣列不變 |
| Reduced Motion | 300～700ms 淡入路徑 |
| standard／無 presentation | 走舊 `summonRevealService` 或直接 Modal |

**保證**：動畫層永不呼叫 `pullOnce`／`performTenPull`／`spendStardust`／收藏寫入。

## 效能策略

- 粒子 DOM ≤ 24～32；結束後移除 overlay 與監聽器。
- 卡池主頁只預載 `heroPetId` + `featuredPetIds`。
- 抽卡後再預載本次結果圖；`image.decode()` 失敗走 fallback。
- 不用 React／GSAP／Lottie／Canvas／WebGL／外部 CDN。
- 避免大面積長時間 `blur`／`backdrop-filter`。
- Overlay 關閉後恢復 `body` 捲動（移除 lock class）。

## 測試計畫

見規格第十七節：抽卡安全、稀有度、所有權、保底分池、UI／Reduced Motion、standard 回歸、資料保護。

最終狀態目標：Code Complete，pending iPhone acceptance。
