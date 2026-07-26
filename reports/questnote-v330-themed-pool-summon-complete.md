# QuestNote V3.3.0 主題卡池與永眠花海召喚演出完成報告

## 1. 版本
- APP_VERSION：`3.3.0`
- CACHE_NAME：`questnote-cache-v330-themed-pool-summon`
- Service Worker URL：`./service-worker.js?v=330`
- DB_VERSION：`3`（未升級）

## 2. 架構
- 新增／修改的 presentation schema：
  - `pools[].presentation`（optional）
  - 欄位：`themeKey`、`badge`、`eyebrow`、`tagline`、`heroPetId`、`featuredPetIds`、`animationKey`
  - 正規化模組：`src/poolPresentation.js`（白名單 theme／animation；缺省不報錯）
- 向後相容方式：
  - 無 `presentation` 的池（含 `standard`）維持既有預設樣式與舊 SSR／UR reveal
  - JSON 只存語意資料；視覺由 `themeKey`／`animationKey` 映射 CSS／JS
- 動畫控制器：`src/themedSummonController.js`（`playDreamBloomSummon`、`playPoolDebutPresentation`）
- 狀態機：`idle → preparing → dreamDust → mirrorRipple → rarityOmen → bloom → revealing → summary → complete`（失敗 → `fallback`）
- fallback：主題動畫失敗時退回既有 `summonRevealService`＋結果 Modal；結果資料不變、不重抽

## 3. 永眠花海主畫面
- hero：`pet_ur05`（灰階剪影預覽，不顯示全彩圖）
- featured pets：`pet_ssr05`、`pet_ssr06`（同樣灰階剪影）
- 卡池短句：
  - 標籤：限定系列
  - 眉題：月皇花已於長夜中甦醒
  - 說明：將散落的夢塵投入鏡池，喚醒沉睡於花庭深處的生命。
- 大獎文案：主畫面只顯示稀有度＋**稱號**（不顯示角色本名）
- 保底顯示：沿用既有 SSR／UR 進度條
- 詳情顯示：單／十連成本、五階機率、保底、目前進度、候選 12、限定說明、重複補償規則
- 首次登場演出：
  - 完整開場約 3.6 秒後進入可關閉狀態
  - **不自動關閉**；需點擊畫面／「繼續」／Esc（開場期間可用「略過」）
  - 已看過狀態存於 `STORES.META` key=`poolDebutSeen`（不升 DB_VERSION）
  - 手動再切換該池：短開場後同樣需點擊繼續

## 4. 召喚動畫
- 單抽流程：夢塵落入 → 鏡池光紋 → 稀有度預兆 → 花苞綻放 → 夢境花印揭露 → 摘要
- 十連流程：多塵／多苞 → 最高稀有度預兆 → 依結果陣列原始順序逐張揭露（下一張／全部顯示）→ 2 欄總覽
- rarity omen：N／R／SR／SSR／UR 語意色（CSS variables）
- SSR 演出：花庭紋章＋柔金預兆層級
- UR 演出：`pet_ur05` 專屬花環／剪影揭露（可略過）
- 初次／再次相遇：依正式結果 `isNew`；重複顯示碎片補償文案（非負面失敗）
- 略過：AbortController 終止等待，跳到既定結果；不重抽、不重扣
- Reduced Motion：短淡入路徑；無大量花瓣移動／縮放穿梭／長時間光效

## 5. 抽卡安全
- 是否只呼叫正式 draw 一次：是（`pullOnce`／`performTenPull` 各維持單一交易入口）
- 是否只扣款一次：是（仍在 `gachaService` 內先扣費再產生結果）
- 略過是否不影響結果：是
- 動畫錯誤 fallback：是（退回舊 reveal／既有結果 Modal）
- 重複補償是否未改：是（仍由 `rollSinglePull` 寫入收藏／碎片）

## 6. 效能
- 粒子數：約 ≤ 24（單抽約 12、十連約 18）
- 圖片預載方式：卡池主頁只預載 hero＋featured；抽卡後再預載本次結果圖
- 暫時 DOM 清理：overlay 移除、監聽器清除、body scroll lock／unlock
- 外部依賴：無（HTML／CSS／vanilla JS；無 React／GSAP／Lottie／Canvas／WebGL）
- Service Worker precache：已加入新模組 JS；**未**將寵物圖片加入 App Shell precache

## 7. 測試
- 單抽：靜態路徑檢查通過（只呼叫一次 `pullOnce`）
- 十連：靜態路徑檢查通過（只呼叫一次 `performTenPull`）
- N／R／SR／SSR／UR：可由 `devtools/summon-animation-preview.html` 以 mock result 驗證
- 首次取得／重複取得：動畫依 `isNew` 顯示初次／再次相遇
- 保底分池：未改 `gachaService` 保底邏輯；standard 與限定池獨立
- standard 回歸：候選 56、無 presentation、不套永眠主題／夢塵動畫
- Reduced Motion：CSS＋控制器雙路徑
- 320px：主題主畫面可自適應；十連總覽 2 欄
- iPhone Safari 靜態檢查：`100dvh`、safe-area、scroll lock／unlock 已實作

## 8. 正式資料保護
- rates 是否未改：是（standard／永眠花海皆 N55／R30／SR10／SSR3／UR2）
- pity 是否未改：是（SSR30／UR100）
- cost 是否未改：是（單 100／十連 1000）
- pets／lore 是否未改（相對 V3.2.0 正式內容）：本次 V3.3.0 未再改名稱／稀有度／說明／對話／羈絆
- IndexedDB 是否未清除：是
- DB_VERSION 是否維持 3：是

## 9. Changed Files
### V3.3.0 核心新增
- `docs/v330-themed-pool-summon-design.md`
- `src/poolPresentation.js`
- `src/poolDebutService.js`
- `src/themedSummonController.js`
- `devtools/summon-animation-preview.html`（開發預覽；不進 App 導航／precache）

### V3.3.0 主要修改
- `data/pools.json`（永眠花海 optional `presentation`）
- `index.html`（主題卡池主畫面結構）
- `src/ui.js`（主題渲染、登場、抽卡後展示串接、點擊關閉登場）
- `src/styles.css`（主題主畫面、登場、夢塵鏡池、夢境花印）
- `src/version.js`
- `service-worker.js`（CACHE_NAME v330＋新模組 precache）
- `src/db.js`（`replaceAllStores` 支援 `poolDebutSeen`）
- `src/backupService.js`（`poolDebutSeen` 備份白名單、`SUPPORTED_VERSIONS` 含 `3.3.0`）
- `src/healthCheckService.js`（版本檢查對齊 3.3.0）

### 後續調校（同版本內）
- 大獎預覽：全塗黑 → 灰階剪影
- 召喚／登場節奏加長
- 登場演出改為「播完後需使用者點擊才關閉」，並避免 select 的 Enter 誤關

## 10. 尚待實機驗收
- iPhone Safari PWA：永眠花海主題主畫面、灰階大獎剪影、登場（點擊關閉）
- 單抽／十連完整節奏、略過、連點防重、橫向／安全區
- Reduced Motion 實際體感
- UR `pet_ur05` 專屬揭露與圖片載入
- 離線更新後新模組可正確載入（SW v330）
- standard 池視覺與機率／保底無回歸

最終狀態：  
**Code Complete，pending iPhone acceptance。**
