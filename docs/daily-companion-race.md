# 星辰夥伴賽 MVP

入口：任務首頁郵件旁骰子圖示 →「星辰賭場」。易讀模式入口在信箱與禮物旁。版本：3.9.3。

## 玩法

- 每個裝置當地日期三場，可以一次玩完。四名選手從完整圖鑑抽選，同場不重複，不要求玩家已收藏。當日名單首次開啟後固定。
- 每位選手獨立於稀有度、等級、賽道、收藏狀態及過往輸贏，勝率皆為 25%。使用 `crypto.getRandomValues` 的拒絕採樣。
- 每場選一位，押 5～500 星塵、以 5 為級距。猜中總返還為 `(押注 / 5) × 19`，包含本金；猜錯返還 0。押 100 猜中返還 380、淨增 280。
- 不另設每日總押注限制。一天三場全押滿且全輸，最多損失 1,500 星塵，約等於 15 次 100 星塵單抽。確認畫面明示每位勝率、押注、返還、本場及當日最大損失。
- 免費觀賽不扣款、不派彩，仍用掉該場次；看過結果不能補下注。
- 雲海星橋、月光森林、極光海岸輪替，動畫 20 秒，可略過。減少動態效果設定直接顯示結果。
- 完成後留下賽道印記及賽果。保存今日與過往 90 個賽事日，畫面顯示最近 30 場；備份保存全部仍保留的資料。缺席不扣進度，也沒有連續登入獎懲。

## 賽事呈現

正常賽跑、活眼終點、領先者打瞌睡、全員跑錯方向以獨立 Web Crypto byte 等機率四選一。劇本名稱只用於本機試玩工具，正式畫面只顯示比賽進行中與現場播報。活眼終點只保留眼睛，腳下有清楚的跑道。每段播報 4 秒；略過、關閉及背景分頁不影響既有結算。

開啟賭場時播放一次約三秒星塵金幣雨，裝飾不增加餘額、不攔截操作；減少動態時省略。

## 資料與結算

`dailyRaceCore.js` 負責純規則與格式驗證；`dailyRaceService.js` 負責 IndexedDB；`dailyRaceController.js` 與 `daily-race.css` 負責畫面。郵件旁賭場入口沿用共用 modal。

不新增 store。`meta` 中新增 `dailyRace`：

```text
key: dailyRace, version: 1
day: { date: YYYY-MM-DD, rounds: [三場] } | null
history: [過往日期，最多90個]
round: { track: 0..2, petIds: [四個ID], result: null | 結果 }
result: { mode, selectedId, stake, payout, winnerId, settledAt }
```

按下確認開賽後，同一個 `dbMutateRecords` readwrite transaction 讀取賽事與 wallet，驗證當日／場次／額度／餘額，抽取勝者，原子保存賽果與星塵。讀取到已結算場次時直接回傳原結果，不再抽選或付款。多分頁交易由 IndexedDB 序列化。中途失敗則兩筆資料一起回滾，沒有動畫後才派彩的第二次寫入。

關閉或重新載入只影響呈現。動畫不改機率與獎金。日期前進時封存舊日、建立三場；舊畫面的下注會被拒絕並重新載入。日期退到最後賽事日前會提示確認裝置日期。

備份沿用既有完整快照與原子還原。3.9.2 的快照新增 `dailyRace`，舊備份遷移為空賽事。格式驗證涵蓋日期、選手唯一性、場次數、下注級距與由勝者推算的派彩，損壞紀錄不會被靜默清除。

這是本機個人遊戲。裝置時鐘、開發者工具或還原舊備份仍可能改變本機進度；不是跨裝置或伺服器端防作弊系統。星塵不兌現，也不透過現金購買。

## 離線與快取

Service Worker 預快取新增 core、service、controller、CSS，App 與快取版本同步為 3.9.3。需要先在線上完成一次 App Shell 安裝。夥伴圖片沿用既有 runtime cache，未快取的圖片離線時使用原有 fallback；文字、選手、下注與結算不依賴圖片下載。

驗收發現 `no-store` 回應在預快取時可能占滿 HTTP 連線，導致等待所有 response headers 的安裝停住。因此安裝流程立即讀完每份回應內容，全部下載／雜湊驗證完成後才寫入快取；不改變原有版本驗證與啟用規則。

## 驗證

- `node --test devtools/daily-race.test.mjs devtools/backup-safety.test.mjs`
- `npm test`
- 對修改的 `.js`／`.mjs` 執行 `node --check`。
- `devtools/daily-race-browser-test.mjs <output-directory>`：Playwright 原生 IndexedDB、Chrome、手機與桌面視窗、三種主題、下注／免費觀賽／略過／關閉／重載、雙分頁競爭、寫入失敗回滾、備份往返、減少動態及離線重載。

瀏覽器驗收使用臨時 localhost origin 與 `QuestNoteTest-Onboarding-*` 合成資料庫。需要可用的 Playwright 與 Chrome，或用 `QUESTNOTE_PLAYWRIGHT_PACKAGE` 指定套件、`QUESTNOTE_BROWSER_CHANNEL` 指定瀏覽器。依磁碟治理規則，透過 `scripts/worktree-artifact.ps1 -Action Run` 執行 `devtools/daily-race-checks.mjs browser <output-directory>`；完整測試可使用同一 runner 的 `suite` 模式。輸出目錄必須是新的、專用 ignored 路徑。
