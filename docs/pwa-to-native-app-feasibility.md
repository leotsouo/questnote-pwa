# QuestNote 從 PWA 轉成 iOS App：可行性評估

查詢日期：2026-10-23。狀態：評估，尚未決定。前一份評估見 [quick-voice-entry-feasibility.md](quick-voice-entry-feasibility.md)。

## 為什麼現在會考慮

目前只有一個具體需求是 PWA 做不到的：**從鎖定畫面點一下就記任務，而且任務要進主畫面 App 那份存檔。** 其他功能（任務、習慣、召喚、探險、語音輸入、Web Push 提醒）在主畫面 PWA 都已經可以使用。

## 會受影響的現有功能（來自程式碼）

| 功能 | 現在怎麼做 | 包成 App 後 |
|---|---|---|
| 存檔 | IndexedDB `QuestNoteDB`（`src/db.js`） | App 有自己的一份存檔，跟主畫面 PWA 不相通。要用現有的備份匯出／匯入搬一次；格式不用改。 |
| 離線與更新 | Service worker + 驗證過的 precache（`service-worker.js`） | 檔案直接打包在 App 裡。WKWebView 的 service worker 只在設定 App-Bound Domains 時才能用，而且有數量限制（社群回報，非官方文件）。**更新改成每次都要重新建置、上傳 TestFlight**，不再是推 `gh-pages` 就生效。 |
| 每日提醒 | Web Push（`src/reminderService.js` + `backend/reminders` 用 VAPID 發送） | 沒有證據顯示 WKWebView 支援 Web Push；開發者論壇的回答是要改用原生 APNs。要改 App 端和 Worker 的發送方式，而且推播需要付費開發者帳號（免費的 personal team 不支援 Push Notifications）。 |
| 語音輸入 | Web Speech API（`src/taskVoiceInput.js`） | WKWebView 能不能用沒有官方保證。WebKit 工程師提到要在 Info.plist 加 `NSSpeechRecognitionUsageDescription`；不行的話改接原生語音外掛。要實機確認。 |
| 回報、提醒後端 | CORS 只允許 `https://leotsouo.github.io` | App 的來源是 `capacitor://localhost`，兩個 Worker 都要加入允許清單並重新部署。 |
| 觸覺回饋 | `navigator.vibrate`（iOS 本來就不支援） | 可以改用原生觸覺回饋，算是加分。 |
| 發布流程 | `npm run release:production` → `gh-pages` | 要多一條 iOS 建置、簽章、上傳的流程；PWA 也還要繼續維護（預覽站、Android、桌面）。 |

## 官方文件查證

| 項目 | 結論 | 來源 |
|---|---|---|
| Capacitor iOS 開發環境 | **一定要 macOS + Xcode**。Capacitor 8 要 Xcode 26 以上，Capacitor 9 要 Xcode 27 以上、iOS 16 以上。 | [Capacitor Environment Setup](https://capacitorjs.com/docs/getting-started/environment-setup)、[Updating to 9.0](https://capacitorjs.com/docs/next/updating/9-0) |
| 鎖定畫面／控制中心／動作按鈕 | iOS 18 起可以用 WidgetKit 的 `ControlWidget` + App Intents 做控制項，按下去可以打開 App。這部分要寫 Swift。 | [WWDC24 Extend your app's controls across the system](https://developer.apple.com/videos/play/wwdc2024/10157/)、[ControlWidget](https://developer.apple.com/documentation/swiftui/controlwidget) |
| 付費帳號 | Apple Developer Program 每年 99 美元。 | [加入計畫](https://developer.apple.com/programs/enroll/) |
| 免費帳號 | 描述檔 7 天到期要重裝，最多 3 台裝置、3 個 App；不支援推播。 | [帳號比較](https://developer.apple.com/support/compare-memberships/)、[Supported capabilities](https://developer.apple.com/help/account/reference/supported-capabilities-ios) |
| 自用安裝（不上架） | TestFlight：每個 build 可以測 90 天；內部測試者最多 100 人，必須是你 App Store Connect 帳號裡的使用者；第一次給外部測試群組時要經過審查。 | [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/)、[Add internal testers](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers/) |
| 上架 App Store | 審查準則 4.2 要求 App 不能只是包裝過的網站。QuestNote 有完整功能，加上原生控制項／推播後比較有機會通過，但不保證。 | [App Review Guidelines 4.2](https://developer.apple.com/app-store/review/guidelines/) |
| 沒有 Mac 的建置方式 | 公開 repo 使用 GitHub Actions 標準 macOS runner 免費（本 repo 是 public）。可以在雲端建置、簽章、上傳 TestFlight。 | [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)、[GitHub-hosted runners](https://docs.github.com/en/actions/reference/runners/github-hosted-runners) |

**沒有 Mac 的實際代價（推估，非官方）：** 沒有 iOS 模擬器，也沒有 Safari Web Inspector 可以除錯 App 裡的網頁。每改一次原生部分，都要「推上 GitHub → 雲端建置 → TestFlight 處理 → 手機安裝」才能看到結果，一輪大約數十分鐘。Swift 寫的控制項出錯時，只能看 CI log 和手機上的表現。簽章憑證要放進 GitHub Secrets。

## 路線比較

| | 1. 維持 PWA（+ 前一份的方案 C 或 D） | 2. Capacitor 外殼 + 原生控制項 | 3. 原生重寫（Swift／React Native） |
|---|---|---|---|
| 鎖定畫面一鍵記錄 | C 可以（捷徑聽寫 + 收件匣），D 不行 | 可以，而且直接開進 App | 可以 |
| 每年費用 | 0 | 99 美元 | 99 美元 |
| 需要 Mac | 不用 | 不用 Mac 也做得到，但除錯很辛苦 | 實際上需要 |
| 開發量（以每週 3–8 小時推估） | D 約 1 週內；C 約 1–2 週 | 外殼 + 搬存檔 + CORS 約 2–3 週；控制項約 1–2 週；推播改 APNs 約 1–2 週 | 數個月 |
| 長期維護 | 一套 | 兩套（PWA + iOS），發布流程變兩條 | 兩套或全部換掉 |
| 對現有使用者 | 不受影響 | 要搬存檔；家人的手機也要裝 TestFlight | 要搬存檔 |
| 風險 | 低 | 中：語音、推播、更新流程都要重新驗證 | 高 |

## 建議

**現在還不需要轉成 App。** 轉成 App 要付的成本（每年 99 美元、兩套發布流程、改推播、搬存檔、沒有 Mac 很難除錯）遠大於目前唯一的收益「鎖定畫面一鍵記錄」，而這個收益用方案 C 免費就能拿到。

**什麼時候值得轉：** 下面出現兩項以上時再重新評估。

- 想在主畫面或鎖定畫面直接**顯示資料**的小工具（例如今天的任務、寵物狀態），而不只是捷徑按鈕。
- Web Push 提醒在實際使用中不夠穩定。
- 想上架 App Store，讓別人也能下載。
- 需要 PWA 拿不到的系統功能（例如 HealthKit、Siri 直接建立任務、原生觸覺回饋）。
- 你有了 Mac，或願意接受用雲端建置除錯的節奏。

**如果還是要轉，第一步要做最小切片，不要一次搬全部：** 付費帳號 → GitHub Actions 建出 Capacitor 外殼並上傳 TestFlight → 在你的 iPhone 確認存檔匯入、語音輸入、離線可以用 → 再加鎖定畫面控制項 → 最後才處理推播。每一步都可以停下來回頭用 PWA。
