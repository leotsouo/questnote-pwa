# QuestNote iOS App 計畫：App 外殼 + 主畫面待辦小工具

日期：2026-10-25。狀態：**計畫，等使用者確認後開始第 0 階段。** 背景與取捨見 [pwa-to-native-app-feasibility.md](pwa-to-native-app-feasibility.md)。

## 目標

1. 把現有的 QuestNote 包成 iOS App，功能、畫面、存檔格式都跟 PWA 一樣。
2. 主畫面小工具顯示**還沒完成的待辦**，點一下打開 App 的任務頁。
3. 不需要 Mac：所有 iOS 建置都在 GitHub Actions 的 macOS runner 上完成，透過 TestFlight 安裝到 iPhone。

不在這次範圍：在小工具上直接打勾完成、推播提醒改寫、鎖定畫面語音快速入口、上架 App Store。這些都排在第 3 階段以後。

## 已確定的條件

| 項目 | 內容 | 來源 |
|---|---|---|
| 開發者帳號 | 已付費（2026 年度），不用再花錢 | 使用者 |
| 外殼框架 | Capacitor，npm 最新穩定版 8.5.3（2026-10-25 查）；需要 Xcode 26 以上、Node 22 以上 | `npm view @capacitor/core`、[Capacitor Environment Setup](https://capacitorjs.com/docs/getting-started/environment-setup) |
| 建置機器 | 本 repo 是 public，GitHub Actions 標準 macOS runner 免費 | [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions) |
| 網頁和原生溝通 | 在 App 專案裡寫一個自訂的 Capacitor 外掛（`CAPBridgedPlugin`），不用發佈成 npm 套件 | [Capacitor Custom Native iOS Code](https://capacitorjs.com/docs/ios/custom-code) |
| App 和小工具共用資料 | 兩個 target 都開 App Groups，用 `UserDefaults(suiteName:)` 讀寫，寫完呼叫 `WidgetCenter.shared.reloadAllTimelines()` | [Apple 開發者論壇範例](https://developer.apple.com/forums/thread/670232) |
| CI 簽章 | `xcodebuild archive -allowProvisioningUpdates` 加上 App Store Connect API key 三個參數（key ID、issuer ID、.p8 路徑），讓 Xcode 自動管理憑證和描述檔 | [Apple 開發者論壇](https://developer.apple.com/forums/thread/756119)；第 0 階段會實際驗證 |

## 架構

```
QuestNote 網頁程式（現有，不改存檔格式）
  │ 組裝成新的 ios profile（離線檔案直接打包，不用 service worker）
  ▼
Capacitor App（WKWebView）
  │ refreshState() 之後 → QuestNoteWidgetBridge.update(待辦快照)
  ▼
App Group 共用資料：未完成待辦快照（JSON）
  ▼
WidgetKit 小工具（SwiftUI）
  └ 點一下 → questnote://tasks → App 打開任務頁
```

**重點設計**

- **同一套網頁程式。** 在 `scripts/releaseArtifact.mjs` 加一個 `ios` profile：使用 `QuestNoteDB`（App 有自己的資料容器，不會跟 PWA 衝突），不註冊 service worker，網址前綴是 App 內的根目錄。PWA 的 production／preview 流程完全不動。
- **小工具資料只在手機上。** 快照只包含小工具需要的欄位（任務 id、標題、安排日、截止日、優先度），寫在 App Group 裡，不經過任何伺服器。
- **掛在現有的角標同一個位置。** `src/appBadge.js` 的 `syncAppBadge()` 已經在每次 `refreshState()` 後執行。App 版在同一個點多呼叫原生外掛：更新小工具快照，並用原生 API 設定圖示角標（WKWebView 沒有 `navigator.setAppBadge`）。PWA 版偵測不到外掛就跳過。
- **小工具自己算「今天」。** 快照存日期，小工具在畫面上依當天日期分組（逾期 → 今天 → 其他），並在每天午夜排一次更新。所以就算 App 一整天沒打開，跨日後的分組也會正確。
- **信箱公告照常更新。** App 裡的信箱改成讀正式站的 `data/global-mailbox.json`，每日巡查發的公告和補償不用等 App 改版。第 1 階段要確認 GitHub Pages 允許 App 跨網域讀取（CORS）。

## 小工具內容（預設，可以改）

| 尺寸 | 顯示 |
|---|---|
| 小 | 未完成數量 + 最前面 2 項標題 |
| 中 | 未完成數量 + 最前面 4 項，標示逾期／今天 |
| 大 | 最前面 8 項，依「逾期 → 今天 → 其他」分組 |
| 鎖定畫面（圓形／矩形） | 未完成數量；矩形額外顯示第 1 項標題 |

排序：逾期 → 今日計畫 → 有截止日（近的在前）→ 其他。不含教學任務，跟角標的計算方式一致。

## 分階段

每個階段都是一個可以單獨驗收、可以停下來的切片。每階段結束時更新 PR #115，並在 iPhone 實機驗收。

### 第 0 階段：帳號準備與 CI 打通（約 1 週）

**你要做的（需要登入你的 Apple 帳號，我不能代做）：**

1. 在 [App Store Connect](https://appstoreconnect.apple.com/) 建立 App：名稱 QuestNote、Bundle ID `io.github.leotsouo.questnote`、SKU 自訂。
2. 在 App Store Connect →「使用者和存取權限」→「整合」建立一把 **API key**，角色選 **Admin**（CI 自動建立憑證需要這個權限），下載 `.p8` 檔。
3. 在 GitHub repo 的 Settings → Secrets 新增三個 secret：`ASC_KEY_ID`、`ASC_ISSUER_ID`、`ASC_KEY_P8`（`.p8` 檔的完整內容）。**不要把這些值貼到對話裡。**

**我做的：**

- 加入 Capacitor 8.5.3、`ios/` 專案、`ios` 組裝 profile。
- 新增 `.github/workflows/ios.yml`：
  - 每次推 `dev` 且改到 `ios/` 或網頁程式時：用模擬器組態建置（不需要簽章、不上傳），幾分鐘內知道 Swift 有沒有編譯錯誤。
  - 手動觸發（workflow_dispatch）時：簽章、封存、上傳 TestFlight。build 號用 GitHub run number。
- 先上傳一個「空殼」build，確認簽章與上傳流程可行。

**完成條件：** TestFlight 出現第一個 build，你的 iPhone 可以安裝並打開。

### 第 1 階段：App 外殼可以日常使用（約 2 週）

- 所有畫面都能在 App 內正常顯示，包含圖片、動畫、離線。
- **搬存檔：** 第一次打開 App 時，引導你從 PWA「設定 → 匯出備份」，再到 App「設定 → 匯入備份」（沿用現有的備份格式與還原流程，不新增匯入方式）。
- 語音輸入：Info.plist 加入麥克風和語音辨識的權限說明，實機確認現有的 Web Speech 能不能用；不能用時改接原生語音辨識，但填文字、建立任務的流程維持不變。
- App 版的提醒卡片顯示「App 版的提醒將在之後的版本提供，目前請保留 PWA 的每日提醒」，避免看起來像壞掉。
- 回報表單：兩個 Worker 的 CORS 都要允許 App 的來源，這需要**部署後端**，部署前會先問你；在你同意之前，App 版的回報會先引導你改用 PWA 送出。

**完成條件：** 你用 App 生活一週：新增、完成任務，召喚、探險，離線，重開 App，都沒有問題；存檔內容和 PWA 一致。

### 第 2 階段：主畫面待辦小工具（約 1–2 週）

- `QuestNoteWidgetBridge` 外掛：接收快照、寫入 App Group、刷新小工具、設定原生角標。
- WidgetKit extension：小、中、大三種尺寸，加上鎖定畫面的圓形與矩形；午夜自動更新；點一下開啟任務頁。
- 自動測試：快照內容與排序（Node 測試）、外掛呼叫時機（source-level 測試）、Swift 端在 CI 編譯。

**完成條件：** 新增或完成任務後回到主畫面，小工具在幾秒內更新；跨日後分組正確；點小工具會打開任務頁。

### 第 3 階段以後（另外決定）

- 在小工具上直接打勾完成（iOS 17 互動小工具；需要把「完成」先存在 App Group，App 打開時再套用到存檔）。
- 鎖定畫面控制項：一鍵打開語音新增任務，解決最早提出的快速語音需求。
- 提醒改用原生通知：本機通知或 APNs，二選一再評估。
- 家人的 iPhone 透過 TestFlight 安裝；決定 PWA 之後的角色。

## 風險與對策

| 風險 | 對策 |
|---|---|
| 沒有 Mac，Swift 錯誤只能在 CI 看到 | Swift 程式碼盡量少；每次推 `dev` 都跑模擬器組態建置；網頁端邏輯（快照、排序）全部用 Node 測試 |
| CI 自動簽章失敗（權限、App Group 未啟用） | 第 0 階段先用空殼驗證；API key 用 Admin 角色；失敗時改用手動上傳的憑證與描述檔 |
| App 版存檔和 PWA 分開，資料不同步 | 第 1 階段用備份搬一次；兩邊並行期間以 App 為主，PWA 只保留每日提醒 |
| WKWebView 不能用 Web Speech | 改接原生語音辨識，只替換「辨識」這一層 |
| TestFlight build 90 天到期 | 每次改版都會上傳新 build；一段時間沒改版時，手動觸發一次 workflow |
| 正式站的信箱 CORS 不允許 App 讀取 | 第 1 階段先實測；不行的話信箱就讀打包在 App 裡的版本，等 App 更新才收到 |

## 對現有專案的影響

- 新增 `ios/`、`capacitor.config.json`、`.github/workflows/ios.yml`、`src/nativeBridge.js`；`package.json` 新增 Capacitor 相依套件。
- PWA 的程式、存檔格式、production／preview 發布流程都不變。CLAUDE.md 和 `docs/release-flow.md` 會補上「iOS build 由 workflow 手動觸發上傳 TestFlight」。
- 後端只有第 1 階段的 CORS 需要部署，部署前會先問你。
