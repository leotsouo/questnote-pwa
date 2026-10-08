# 晴信原野動畫秒數與 SOP 核對

核對對象：V3.8.8 晴信原野候選，preview artifact `96c966d318832ec5582d1bd39a5bce717d7fbbff760a5957b1f1f983b5c3e8d6`、production artifact `af250b58a7a712856ce2b67d3df1eaac80242158fcde8b4e7d12ec37dc9e324a`。兩者由 source commit `6952649fc3ce644c7656a43d2047450df5886e01` 組裝。此表核對固定控制器時間；使用者停留、圖片預載與瀏覽器排程另計，不宣稱每次牆鐘時間恰好相等。

| 段落 | 本池實際設定與呼叫路徑 | SOP 修訂後規格 | 結果 |
| --- | --- | --- | --- |
| 首次入場、切換及重看 | `playPoolDebutPresentation` 讀取 `poolDebutDuration`：3400ms 到 ready；繼續後 `poolDebutDissolveDuration`：550ms。 | 3400ms＋等待繼續＋550ms | 一致 |
| 減少動態入場 | 共用控制器：500ms 到 ready，繼續後 240ms 淡出。 | 500ms＋等待繼續＋240ms | 一致 |
| 單抽／十連抽卡前奏 | `data/pools.json` 設 `animationKey: "none"`；`playCeremonyRitual` 呼叫的 `playThemedSummon` 對此 key 直接回傳 fallback，不建立前奏 overlay，故為 0ms。固定產物動畫檢視頁亦直接展示固定結果。 | 明確無主題動畫時 0ms；有主題動畫時 650＋750＋900＋700＝3000ms，減少動態 500ms。 | 原 SOP 未區分無動畫，已修訂 |
| SSR／UR 角色登場 | `playCeremonyCharacter` → `playSummonReveal` → `summonRevealDuration`，分別為 2500／4500ms。 | 2500／4500ms | 一致 |
| 十連下一位 | `presentBatchCharacter` 使用 `SUMMON_TIMING.nextCharacter`，結果卡離場 240ms。 | 240ms | 一致 |
| 減少動態十連 | `presentCommittedEncounters` 直接顯示十張總覽，無前奏與逐張揭露。 | 可直接總覽 | 一致 |

補充：本池道路裝飾在入場第 400ms 啟動，CSS 轉場長 `0.96 × 3400 = 3264ms`，理論上到第 3664ms 才停止；控制器在第 3400ms 已可繼續。這是裝飾動作與操作就緒時點的差異，不應把 3400ms 說成所有像素皆停止的時間。

依據：`src/summonTiming.js`、`src/themedSummonController.js`、`src/encounterCeremony.js`、`src/encounterView.js`、`src/summonRevealService.js`、`data/pools.json` 與固定產物 `reports/sunward-letters/animation-review.html`。本次僅釐清 SOP 的條件規格，未修改已組裝的 App 產物。
