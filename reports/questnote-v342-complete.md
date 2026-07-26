# QuestNote V3.4.2 完整完成報告

> 涵蓋本版全部交付：結果畫面可讀性／單抽偏左修正、SSR+ 自動出場、雙 UR 映襯強化、截圖停留、月亮光柱移除、開發測試按鈕。  
> 最終狀態：**Code Complete，pending iPhone acceptance。**

---

## 1. 版本

| 項目 | 值 |
| --- | --- |
| APP_VERSION | `3.4.2` |
| CACHE_NAME | `questnote-cache-v342-ssrplus-auto-reveal` |
| Service Worker URL | `./service-worker.js?v=342` |
| DB_VERSION | `3`（未變更） |
| IndexedDB schema | 未變更 |
| BUILD_TIME | `2026-07-27T03:20:00+08:00` |

### 版本演進備註

| 階段 | 說明 |
| --- | --- |
| 起點 | 正式功能基線為 V3.4.1（卡池 UI／動畫流程、pendingAwakening） |
| 中間 | 曾暫用 CACHE `v342-summon-summary-contrast`（單抽偏左／字色對比） |
| 定稿 | 維持 `APP_VERSION 3.4.2`，CACHE 定為規格名 `v342-ssrplus-auto-reveal`；對比修正一併保留 |

---

## 2. 本版目標與達成

### 2.1 目標清單

1. 抽獎／結果畫面字色可讀（含 Sweet 主題）
2. 單抽結果不再約一秒後偏左
3. 只要結果含 SSR／UR → 主動畫後**自動**播完整 SSR+ 出場 queue → 再進結果
4. 單抽／十連規則一致
5. 永眠花皇兔（UR）強化「月亮」語言
6. 曙綻花后兔（UR）強化「花瓣飄落」語言
7. 雙 UR 映襯但不混淆
8. 出場結束後可停留截圖
9. 開發用測試按鈕可直接預覽雙 UR

### 2.2 達成狀態

| 項目 | 狀態 |
| --- | --- |
| SSR+ 自動 reveal | 完成 |
| 單抽流程 | 完成 |
| 十連流程 | 完成 |
| 第 20 抽跨門檻順序 | 完成（沿用 3.4.1 pendingAwakening） |
| standard 池未受主題儀式污染 | 完成 |
| 字色／單抽偏左 | 完成 |
| 截圖停留 | 完成 |
| 月亮白矩形移除 | 完成 |
| 雙 UR 測試按鈕 | 完成 |
| rates／pity／成本／RNG／獎勵／資料／DB | **未改動** |

---

## 3. 問題修復（UI／流程）

### 3.1 抽獎底部字色不清

**原因：** Sweet 主題把 `--color-text-main` 等設成深莓色，夜空 overlay／按鈕繼承後幾乎不可讀。

**修正：**

- `.dream-bloom-overlay`／`.dream-bloom-btn*`／名稱／稱號／摘要改固定淺色
- 另加 `body[data-theme="sweet"]` 保險覆寫
- 「略過／下一張／全部顯示」等類似搭配一併調整（後續流程簡化後主按鈕為「略過」「關閉結果」）

### 3.2 單抽約一秒後偏左

**原因：** 不是動畫殘影。`revealHold` 結束後把置中花印藏起，改顯示十連用 **2 欄摘要網格**，單卡落在左欄。

**修正：**

- 單抽收束維持置中花印，不切 2 欄摘要
- 十連仍用摘要網格

### 3.3 月亮下方白色半透明矩形

**辨識：** `.summon-reveal-moon__beam`（固定寬度矩形漸層，意圖為月光柱，視覺像白塊）

**修正：** 已從 DOM 與 CSS 完全移除；保留月亮圓盤與光暈。

---

## 4. SSR+ 自動出場流程

### 4.1 核心規則

```text
抽卡主動畫
→ 自動播放本次所有 SSR / UR 出場（依原始順序 queue）
→ 全部結束（或略過剩餘）
→ 才進入結果畫面
```

不得再因「全部顯示／摘要」而錯過高稀有正式演出。

### 4.2 單抽

| 結果 | 流程 |
| --- | --- |
| N / R / SR | 主動畫 → 單抽結果 |
| SSR / UR | 主動畫 → 該角色出場 → 等點擊 → 單抽結果 |

### 4.3 十連

| 結果 | 流程 |
| --- | --- |
| 無 SSR+ | 主動畫 → 十連總覽 |
| 有 SSR+ | 主動畫 → queue 依序播全部 SSR+ → 十連總覽 |

- 多張必須全部播，不可只播最高稀有
- 節奏：SSR 較短、UR 較長；張與張之間短暫停頓

### 4.4 略過

- 主動畫中略過 → 跳過剩餘儀式與 SSR+ queue → 結果
- SSR+ 播放中按「略過」→ 略過剩餘 queue → 結果
- 播完就緒後按「繼續」／點畫面 → 下一張或進結果
- **不重抽、不重扣、不漏資料**

### 4.5 第 20 抽跨門檻順序（嚴格）

```text
1. 十連主動畫
2. SSR+ reveal queue（若有）
3. 十連總覽
4. 使用者關閉／繼續結果
5. 晨醒花庭解鎖動畫
6. 曉露花蝟固定取得（既有邏輯）
7. 返回晨醒期卡池主畫面
```

SSR+ 優先於結果總覽；晨醒解鎖晚於結果總覽。由 `pendingAwakening`／`visualPhaseLock` 維持（V3.4.1）。

### 4.6 Reduced Motion

| 類型 | 行為 |
| --- | --- |
| SSR | 快速淡入，約 550ms，仍顯示角色與稀有度 |
| UR | 月亮／花瓣意象保留但縮短，約 750ms |

### 4.7 Fallback

展示失敗只影響演出；抽卡結果、星塵、保底、解鎖進度不受影響。

---

## 5. 雙 UR 專屬設計

### 5.1 永眠花皇兔（`pet_ur05`）

| 面向 | 內容 |
| --- | --- |
| 主題 | 夜、月亮、沉眠、收束、鏡池、靜謐 |
| 色彩 | 深藍／霧紫／月白 |
| 月亮 | 上方圓盤升起 + 光暈（已移除矩形光柱） |
| 動態 | 月光收束（converge）、安靜高貴 |
| 文案 caption | 月下沉眠 · 花庭主人 |

### 5.2 曙綻花后兔（`pet_ur06`）

| 面向 | 內容 |
| --- | --- |
| 主題 | 晨曦、花開、甦醒、展開、花瓣 |
| 色彩 | 粉金／暖白／晨曦玫瑰 |
| 花瓣 | 約 12 片 DOM 落瓣（Reduced Motion：4 片靜態） |
| 動態 | 光環綻放、花瓣飄落、流動展開 |
| 文案 caption | 晨曦綻放 · 花庭主人 |

### 5.3 映襯關係

| 永眠花皇兔 | 曙綻花后兔 |
| --- | --- |
| 沉眠 | 甦醒 |
| 夜 | 晨 |
| 月亮 | 花瓣 |
| 收束 | 展開 |
| 靜謐 | 綻放 |

共通骨架：鏡池意象、中央構圖、UR 標誌、名稱／稱號出現方式一致。

### 5.4 截圖紀念

SSR／UR 出場播完後停留最終畫面（「點擊畫面繼續」／「繼續」），方便截圖後再關閉。

---

## 6. 技術實作摘要

### 6.1 共用 reveal queue

`src/summonRevealService.js`

- `collectSsrPlusRevealQueue(results)`：依原始順序收集 SSR+
- `playSsrPlusRevealQueue(...)`：逐張播放，等點擊再下一張
- `resolveRevealTheme`：`moon` / `petal` / `ur` / `ssr`
- 純展示；不呼叫 draw／扣款／寫入

### 6.2 主題池（永眠花海／晨醒）

`src/themedSummonController.js`

- 儀式結束後接 SSR+ queue
- 移除舊「逐張下一張／全部顯示」路徑（避免錯過高稀有）
- 按鈕簡化：略過 →（結果）關閉結果
- 單抽結果維持置中花印

### 6.3 一般池

`src/ui.js` → `playPostPullPresentation`

- standard：有 SSR+ 則播完整 queue，再進結果 modal
- 主題池成功則由 dream-bloom 內含 queue＋結果；失敗 fallback 仍播 queue

### 6.4 效能約束（已遵守）

- 無外部動畫庫、無 Lottie／GSAP／Three.js、無大型 canvas 粒子
- 僅 HTML／CSS／Vanilla JS；粒子／花瓣數量受控

---

## 7. 安全與回歸

| 檢查項 | 結果 |
| --- | --- |
| draw 只呼叫一次 | 是 |
| 扣款只一次 | 是 |
| pity／rates／成本 | 未變 |
| 重複補償 | 未變 |
| RNG／候選池 | 未變 |
| 20 抽解鎖／曉露花蝟 | 未變邏輯，僅順序保證 |
| lifetimeDraws | 未改 gacha 寫入路徑 |
| DB_VERSION / schema | 未變 |
| standard 池 | 正常走 SSR+ queue，無主題儀式 |

---

## 8. 可讀性與 UI

| 區塊 | 狀態 |
| --- | --- |
| 主題抽獎按鈕 | 固定淺色＋Sweet 覆寫 |
| reveal 名稱／稱號 | 固定淺色，對比足夠 |
| 單抽花印／十連摘要 | 單抽置中；摘要標題淺色 |
| 結果 modal | 沿用 3.4.1 遮罩加強 |
| 320px | 名稱 max-width／進度條置中 |

---

## 9. 開發測試入口

設定 → 開發工具 → **抽卡演出測試**（localhost／dev 可見）：

| 按鈕 | 用途 |
| --- | --- |
| 測試 SSR 演出 | 泛用 SSR |
| 測試 UR 演出 | 泛用 UR（第一隻 UR） |
| 測試 UR：永眠花皇兔（月亮） | `pet_ur05` 專屬 |
| 測試 UR：曙綻花后兔（花瓣） | `pet_ur06` 專屬 |

另有：`devtools/summon-animation-preview.html`（mock，不進 SW precache）

---

## 10. 測試矩陣

| 案例 | 預期 | 實機 |
| --- | --- | --- |
| A. 單抽 SR | 主動畫 → 結果，無 SSR+ | 待驗 |
| B. 單抽 SSR | 自動 SSR 出場 → 點擊 → 結果 | 待驗 |
| C. 單抽永眠花皇兔 | 月亮主題 → 點擊 → 結果；無白矩形 | 待驗 |
| D. 單抽曙綻花后兔 | 花瓣主題 → 點擊 → 結果 | 待驗 |
| E. 十連 1 張 SSR | queue 1 張 → 總覽 | 待驗 |
| F. 十連多 SSR+ | 依原始順序全播 → 總覽 | 待驗 |
| G. 十連跨第 20 抽且含 SSR+ | reveal → 總覽 → 關閉 → 晨醒 → 贈送 | 待驗 |
| H. 略過 | 不重抽不重扣，進正確結果 | 待驗 |
| I. Reduced Motion | 縮短但仍可辨識 | 待驗 |
| J. standard 回歸 | 無主題儀式干擾 | 待驗 |
| K. Sweet 字色 | 按鈕／名稱可讀 | 待驗 |
| L. 開發測試按鈕 | 雙 UR 可直播 | 待驗 |

---

## 11. Changed Files（本版相關）

### 核心演出

- `src/summonRevealService.js` — SSR+ queue、雙 UR theme、截圖停留
- `src/themedSummonController.js` — 儀式後接 queue；單抽置中；按鈕簡化
- `src/ui.js` — presentation 接 queue；雙 UR 測試函式／事件
- `src/styles.css` — 對比字色、月亮／花瓣、reveal z-index、移除 moon beam

### 版本／基礎設施

- `src/version.js`
- `service-worker.js`
- `src/backupService.js` — 支援 `3.4.2`
- `src/healthCheckService.js` — 版本字串同步
- `index.html` — 雙 UR 測試按鈕

### 工具／報告

- `devtools/summon-animation-preview.html`
- `reports/questnote-v342-ssrplus-auto-reveal.md`（初版）
- `reports/questnote-v342-complete.md`（本完整報告）

### 明確未改（本版限制）

- `data/pets.json`／lore／圖片檔
- rates、pity、成本、補償、RNG、候選池
- 20 抽解鎖核心邏輯、固定贈送規則本體
- `DB_VERSION`、IndexedDB schema

---

## 12. 尚待人工實機驗收（iPhone Safari PWA）

1. 單抽 SSR／雙 UR 出場與截圖停留手感
2. 十連多 SSR+ queue 順序與總時長
3. 略過不重扣、結果正確
4. 第 20 抽：reveal → 總覽 → 關閉 → 晨醒解鎖 → 曉露花蝟
5. Sweet 主題字色對比
6. 舊機花瓣／動畫流暢度
7. 硬重新整理後 SW cache `v342-ssrplus-auto-reveal` 生效

---

## 13. 最終狀態

```text
Code Complete，pending iPhone acceptance.
```

V3.4.2 將「結果可讀與單抽版面修正」與「SSR+ 自動出場／雙 UR 映襯」合併於同一 patch 定稿；抽卡數值與解鎖資料路徑維持不變，僅優化演出順序與視覺體驗。
