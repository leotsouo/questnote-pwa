# QuestNote V3.4.2 SSR+ 自動出場演出完成報告

## 1. 版本
- APP_VERSION：3.4.2
- CACHE_NAME：`questnote-cache-v342-ssrplus-auto-reveal`
- Service Worker URL：`./service-worker.js?v=342`
- DB_VERSION：3（未變更）

版本備註：實作前本機已是 `3.4.2`（先前 CACHE_NAME 為 `v342-summon-summary-contrast`，單抽偏左／字色對比修正）。本次維持 APP_VERSION `3.4.2`，將 CACHE_NAME 更新為規格指定的 `v342-ssrplus-auto-reveal`（對比修正仍保留在樣式中）。

## 2. 目標達成
- SSR+ 是否自動 reveal：是（依原始順序 queue，自動播放）
- 單抽是否完成：是
- 十連是否完成：是
- 第 20 抽跨門檻順序是否正確：是（SSR+ → 結果總覽 → 使用者關閉 → 晨醒解鎖）
- standard 是否未受影響：是（standard 改走完整 SSR+ queue，非主題儀式）

## 3. reveal 流程
- 單抽 N/R/SR：主題儀式（若適用）→ 直接結果／花印；不播 SSR+ reveal
- 單抽 SSR：主動畫 → SSR 出場 → 單抽結果
- 單抽 UR：主動畫 → 對應 UR 專屬出場 → 單抽結果
- 十連無 SSR+：主動畫 → 十連總覽
- 十連有 SSR+：主動畫 → SSR+ queue（全部）→ 十連總覽
- reveal queue 規則：`collectSsrPlusRevealQueue` 依原始順序挑 SSR/UR，不可只播最高
- 略過行為：略過剩餘 reveal → 進結果；不重抽、不重扣
- Reduced Motion：SSR ≈550ms、UR ≈750ms，仍保留主題意象與名稱
- fallback：reveal 失敗只略過展示，結果／扣款／保底不變

## 4. 雙 UR 專屬設計
- 永眠花皇兔（`pet_ur05`）：
  - 月亮如何呈現：上方圓盤升起 + 月光暈 + 向下光束，成為構圖核心
  - 色彩：深藍夜色／霧紫／月白
  - 動態：月亮升起、光暈收束（converge）
  - 與主題的對應：沉眠、收束、靜謐主人
- 曙綻花后兔（`pet_ur06`）：
  - 花瓣如何呈現：12 片 DOM 落瓣（Reduced Motion 改 4 片靜態）
  - 色彩：粉金／暖白／晨曦玫瑰
  - 動態：花環綻放、花瓣飄落、光向外展開
  - 與主題的對應：甦醒、展開、流動主人
- 兩者映襯方式：共通鏡池／中央構圖／UR 標誌／名稱稱號骨架；夜月收束 vs 晨瓣展開對位

## 5. 結果畫面順序
- 單抽 SSR+：主動畫 → reveal → 單抽結果確認
- 十連 SSR+：主動畫 → reveal queue → 十連總覽
- 第 20 抽跨門檻：同上後，等關閉結果才晨醒解鎖
- 解鎖動畫與結果總覽的先後：結果總覽先，解鎖動畫後

## 6. 安全與回歸
- draw 是否只呼叫一次：是（reveal 只讀已產生結果）
- 扣款是否只一次：是
- pity 是否未變：是
- reward 是否未重複：是（解鎖贈送邏輯未改）
- lifetimeDraws 是否正確：是（未改 gacha／unlock 服務）
- standard 是否正常：是（走 `playSsrPlusRevealQueue`）

## 7. 可讀性與 UI
- reveal 名稱／稱號：固定淺色字，含 Sweet 主題保險
- 結果畫面：沿用 3.4.2 對比修正
- 按鈕：主題演出簡化為「略過」／「關閉結果」；reveal 僅「略過／略過剩餘」
- 320px：進度條與名稱 max-width 限制
- iPhone 靜態檢查：未實機；需 PWA 驗收

## 8. 測試
- 單抽 SSR：邏輯已接上（待實機）
- 單抽兩個 UR：theme=`moon`/`petal`（待實機）
- 十連多個 SSR+：queue 依序（待實機）
- 第 20 抽跨門檻：順序維持 pendingAwakening 之後（待實機）
- 略過：skipRemainingQueue + themed abort（待實機）
- Reduced Motion：縮短時長＋靜態意象（待實機）
- fallback：try/catch 不中斷結果（待實機）
- standard 回歸：待實機

## 9. Changed Files
- `src/summonRevealService.js` — SSR+ queue、雙 UR theme、autoAdvance
- `src/themedSummonController.js` — 儀式後接 queue；移除逐張／全部顯示
- `src/ui.js` — `playPostPullPresentation` 改 queue
- `src/styles.css` — 月亮／花瓣／名稱進度樣式；reveal z-index
- `src/version.js` — CACHE_NAME 更新
- `service-worker.js` — CACHE_NAME 更新
- `src/healthCheckService.js` — 版本字串同步
- `devtools/summon-animation-preview.html` — UR 選擇／queue 預覽
- `reports/questnote-v342-ssrplus-auto-reveal.md` — 本報告

## 10. 尚待人工實機驗收
- iPhone Safari PWA：單抽 SSR／雙 UR、十連多 SSR+ queue
- 略過是否直達正確結果且不重扣
- Reduced Motion 是否仍能辨識角色與稀有度
- 第 20 抽：reveal → 總覽 → 關閉 → 晨醒解鎖 → 曉露花蝟
- Sweet 主題下 reveal／結果字色對比
- 花瓣粒子在舊機是否流暢

最終狀態：
Code Complete，pending iPhone acceptance。
