# 信任待辦

排序：這類錯多常發生 × 漏掉的代價 ÷ 成本。2026-11-21 第一輪做完原第 1–8 項（第 8 項部分）。

## 等使用者決定（不是 agent 能自己定的）

- **暮光主題頂部 safe-area 是米色不是夜色。** `twilight-safe-area-browser-test` 因此失敗，`npm run verify:browser` 目前 23/24。`index.html` 用 `black-translucent`（白色狀態列文字）。要恢復深色填色，或確認刻意拿掉並改寫測試；對比只能真機確認。
- **V3.17.2 刪掉的兩段未使用程式可能是沒做完的功能：** 遭遇演出中途切換「減少動態」直接跳到結果（`finishPresentation`，舊原型 `devtools/companion-app-identity.js` 有接）；冒險手冊顯示「下一里程碑 %」（`nextMilestonePercent` 已算出但沒顯示）。
- **已覺醒的夥伴在圖鑑格子仍顯示初遇圖**（V3.5.20 起），是否刻意。

## 1. 健康檢查的固定字元視窗清完
- **哪類錯：** 檢查靜默失效或誤報。`src/healthCheckService.js` 還有 16 個 `[\s\S]{0,N}` regex（錨點是 HTML／CSS／switch），其中 3 條現在就在誤報（`renderView` fallback、單抽與十連演出整合）；另有 `slice(idx, idx + 600)` 同類寫法。
- **哪一層：** 第 2 層。
- **完成：** 16 個改成整檔或結構化比對，`devtools/no-fixed-window-regex.test.mjs` 的掃描範圍加入 `src/healthCheckService.js`，三條誤報消失。

## 2. 瀏覽器驗證穩定到可以當關卡
- **哪類錯：** 不穩定的測試讓人學會忽略紅燈。已見三次偶發：`senior-mode`（機器忙時選單被重繪關掉，已修）、`daily-encounter`（等 service worker 逾時一次）、`layout-tour`（mailbox 點擊逾時一次，原因未明）。
- **哪一層：** 第 3 層。
- **完成：** `npm run verify:browser` 連續 5 次結果相同；之後才考慮放進 CI（ubuntu runner 有 Edge）或 pre-push。

## 3. 溢出巡覽補盲點
- 只查右緣、只在一般模式；易讀模式、左緣、元件內部水平捲動（只設 `overflow-y` 的容器）都沒查。
- **完成：** 加易讀模式一格；元件內部以 `scrollWidth > clientWidth` 且非刻意橫向捲動者列為違規。

## 4. 沒有瀏覽器測試的畫面
- 功能地圖標「未確認」：寵物詳情、看原圖、更多頁、分享頁。溢出巡覽已走過版面，但沒有行為測試。

## 之後

5. **`innerHTML` 一律經過跳脫**（139 處）：先盤點未跳脫的使用者輸入，再決定 helper 或 lint 規則。
6. **型別檢查核心邏輯**：`// @ts-check` + JSDoc 先上 service 層（存檔、抽卡交易、羈絆）。成本高。
7. **`ios/` Swift**：SwiftLint 與 Widget 測試跑在 `ios.yml`。
8. **`data/global-mailbox.json` 手改防護**：CI 檢查該檔變更只來自巡查。
9. **同步測試擴到其他快取名**：`PET_IMAGE_CACHE`、`MAILBOX_RUNTIME_CACHE`、SW 檔頭版本註解目前不在 `version-sync` 檢查內。
10. **CLAUDE.md 瘦身**：這一輪反而從 13,352 增到 13,782 bytes（刪 4 條、加 3 條新工具說明）。下一步把「新卡池」一節移到既有的 SOP 文件，只留連結。
11. **拆 `src/healthCheckService.js`（約 4,000 行）**：只有在它造成實際錯誤時才做。
