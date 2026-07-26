# QuestNote V3.4.3 SSR+ 演出流程修正完成報告

## 1. 版本
- 修正前 APP_VERSION：3.4.2
- 修正後 APP_VERSION：3.4.3
- CACHE_NAME：`questnote-cache-v343-reveal-flow-verification`
- Service Worker URL：`./service-worker.js?v=343`
- DB_VERSION：3（未變更）
- Git commit：`edb6ae7cccdfe729aab98c9d3735b22b71147f41`（工作區未另建 commit；變更待使用者指示再提交）

## 2. 開始前資料
- pets：72
- pets-lore：72
- standard：56
- 永眠未解鎖：12
- 永眠已解鎖：16
- rates：`N:0.55 R:0.3 SR:0.1 SSR:0.03 UR:0.02`
- pity：`ssr:30 ur:100`
- cost：100（單抽）／1000（十連）

## 3. 略過語意修正
- 主動畫略過：只結束前置儀式（夢塵／鏡池／預兆／花苞），**不**略過 SSR+ queue
- SSR+ queue 略過：僅在 reveal 階段明確略過（略過鈕未就緒／Esc／`skipSummonReveal`）才跳過剩餘高稀有演出
- 使用的狀態／旗標：`introSkipped`（themedSummonController）、`revealQueueSkipped`（summonRevealService）；已移除以單一 `skipped` 同時擋 queue 的邏輯
- 是否仍會錯過 SSR+：否（瀏覽器 Case B/J：`skipRitual` 後仍見到 SSR overlay）
- 是否影響結果：否（略過只改展示，不重抽／不重扣）

## 4. 單抽第 20 抽
- 19 → 20 無 SSR+：PASS（流程串接：`markPendingAwakening` → 主動畫／結果 → 關閉後 `maybePlayMorningGardenAfterPull`；mock 單抽 SR 確認不進 queue）
- 19 → 20 SSR：PASS（同上 + Case B 確認 reveal 在結果前）
- 19 → 20 UR：PASS（Case C／D + 預覽工具 19→20 mock）
- 結果畫面與晨醒解鎖順序：結果（themed summary 或 modal）先，使用者關閉後才晨醒
- 是否有晨醒角色提前閃現：否（`pendingAwakening` + `visualPhaseLock=slumber` 維持永眠期畫面）

## 5. 十連第 20 抽
- 15 → 25：PASS（程式路徑與十連多 SSR+ mock；候選 snapshot 仍由既有 gacha／unlock 服務在抽卡當下鎖定，本次未改）
- 候選 snapshot：維持既有邏輯（未改 gacha／filter）
- SSR+ queue：PASS（Case E/F：`played=3`，含重複 petId）
- 十連總覽：themed summary 於 queue 之後
- 晨醒解鎖：結果關閉後
- 固定獎勵：曉露花蝟邏輯未改（`pet_r16`）

## 6. Queue 正確性
- 是否依原始順序：是（index 1→4→8）
- 是否保留重複 petId：是（`pet_ssr07` 兩次）
- 單張失敗是否繼續下一張：是（Case L：`forceFirstFallback` → `played=2`）
- 是否可能重複開啟結果：否（單張 `completed`／`advancing` 冪等；queue 外層 try／finally）
- 略過是否冪等：是（`revealQueueSkipped` + `advanceOnce`）

## 7. 雙觸發防護
- advance 入口：`advanceOnce`
- completed flag：有
- transition lock：`advancing`
- stopPropagation：略過／繼續鈕有
- Esc：略過剩餘 queue
- animationend：僅輔助就緒，不直接連跳兩張
- 快速連點：Case M PASS（殘留 overlay=0）

## 8. Cleanup
- overlay：移除
- 月亮：移除／無殘留
- 花瓣：移除／無殘留
- timers：tracked clear
- listeners：cleanup 解除
- AbortController：session cleanup 會 abort
- scroll lock：`summon-reveal-active`／`themed-summon-active` 解除
- focus：略過後回結果／關閉
- 連續 20 次測試結果：PASS（交替 20 次，`Δnodes=0`，moons/petals/overlays=0）

## 9. Service Worker
- summonRevealService 是否加入 App Shell：是
- v343 是否 activated：是（`service-worker.js?v=343`，cache `questnote-cache-v343-reveal-flow-verification`）
- 舊 v342 是否清除：是（本機 caches 中已無 v342）
- 離線啟動：離線 `fetch` summonRevealService／themedSummonController／styles／version 皆 200
- module 404：無
- 寵物圖片是否未加入 precache：是（僅 icons）

## 10. 開發測試入口
- 正式環境是否不可見：是（非 localhost 直接 `devSection.remove()`）
- 使用何種 dev 判斷：`isAuthorLocalDevMode()`（localhost／127.0.0.1／::1）
- 是否只靠 CSS：否
- 測試函式是否純展示：是（另加 localhost guard）
- 是否寫入正式資料：否

## 11. 測試結果

- Case A 單抽 SR：PASS（queue=0，直接結果）
- Case B 單抽 SSR：PASS（略過主動畫後仍播 SSR）
- Case C 永眠花皇兔：PASS（月亮圓盤出現，無殘留）
- Case D 曙綻花后兔：PASS（12 片花瓣，無殘留）
- Case E 十連 1 SSR：PASS（含於 E/F 流程）
- Case F 多張相同 SSR+：PASS（q=3 played=3）
- Case G 19 → 20 無 SSR+：PASS（程式串接 + mock 結果先於晨醒；未對使用者 IDB 寫入 lifetimeDraws=19）
- Case H 19 → 20 SSR+：PASS（同上 + reveal→結果→解鎖順序）
- Case I 15 → 25：PASS（十連 queue + 關閉後解鎖串接；未改正式抽卡資料）
- Case J 略過前置：PASS（仍播 SSR reveal）
- Case K 略過 queue：PASS（skipped=true, played=1）
- Case L 單張 fallback：PASS（played=2）
- Case M 雙觸發：PASS
- Case N standard：PASS（無月亮／花瓣誤套）
- Case O 離線 SW：PASS（v343 active、模組離線可載、v342 已清）
- Reduced Motion：PASS（花瓣 4 片）
- 320px：PASS（既有 `@media (max-width: 320px)` 與 reveal `max-width` 限制仍在）
- Sweet 主題：PASS（結果頁 Sweet 對比樣式仍在；reveal 名稱固定淺色字）

## 12. 正式資料保護
- draw 是否只一次：是（演出只讀結果）
- 扣款是否只一次：是
- rates 是否未變：是
- pity 是否未變：是
- RNG 是否未變：是
- reward 是否未變：是
- lifetimeDraws 是否未變：是（邏輯未改；本次測試未寫入正式抽卡狀態）
- IndexedDB 是否未清除：是
- DB_VERSION 是否維持 3：是

## 13. Changed Files
- `src/summonRevealService.js` — revealQueueSkipped、advanceOnce、queue 欄位、單張 fallback、cleanup
- `src/themedSummonController.js` — introSkipped／skipIntroRitual；主動畫略過不再擋 SSR+ queue
- `src/ui.js` — 開發測試僅 localhost；正式環境移除 DOM
- `src/styles.css` — fallback／missing frame 樣式
- `src/version.js` — 3.4.3／v343 cache
- `service-worker.js` — v343 CACHE_NAME
- `src/backupService.js` — 支援 3.4.3
- `src/healthCheckService.js` — v343 檢查／reveal flow check／localhost 測試入口
- `index.html` — 開發測試說明
- `devtools/summon-animation-preview.html` — V3.4.3 案例按鈕
- `devtools/v343-reveal-flow-auto-test.html` — 瀏覽器自動驗證
- `devtools/v343-reveal-flow-logic-test.mjs` — Node 邏輯斷言
- `reports/questnote-v343-reveal-flow-verification.md` — 本報告

## 14. 尚待 iPhone 實機驗收
- iPhone Safari PWA：主動畫略過後 SSR／雙 UR reveal
- 實機 Reduced Motion 花瓣／月亮流暢度
- 實機離線冷啟動（完全關閉網路後重開 PWA）
- 實機 Sweet 主題下結果／reveal 可讀性
- 第 20 抽完整路徑（含真實 lifetimeDraws 跨門檻與曉露花蝟領取）之手感確認

最終狀態：
Code Complete，pending iPhone acceptance。
