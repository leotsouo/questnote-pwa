# 快速語音建立任務：iOS 可行性評估（ADR 草案）

查詢日期：2026-10-23。狀態：**等使用者選方案**，尚未實作。

## 現況（來自程式碼）

- 語音輸入在 `src/taskVoiceInput.js`：用瀏覽器的 Web Speech API（`SpeechRecognition`／`webkitSpeechRecognition`，`zh-TW`），只把文字填進任務精靈的內容欄；儲存仍走 `src/taskWizard.js` 原本的表單送出。
- QuestNote **沒有登入**。所有資料存在本機 IndexedDB（production `QuestNoteDB`）。需求裡的「未登入先登入」在現有架構沒有對應；最接近的是「首次使用教學還沒完成」或「這個瀏覽器環境裡還沒有存檔」。
- `manifest.webmanifest` 沒有 `shortcuts`，App 也還沒有讀取任何「直接進入某畫面」的網址參數（只有 `?debug=1`、`?perf=1`）。

## 官方文件查證結論

| 項目 | 結論 | 來源 |
|---|---|---|
| 主畫面小工具（PWA 自己的） | 做不到。WebKit 沒有讓網頁 App 提供 WidgetKit 小工具的 API；只能用「捷徑」App 的小工具間接執行捷徑。 | [Shortcuts：從小工具執行捷徑](https://support.apple.com/guide/shortcuts/run-shortcuts-from-the-home-screen-widget-apd029b36d05/ios) |
| 鎖定畫面 | PWA 本身做不到。iOS 18 起鎖定畫面底部兩個按鈕可以換成控制項庫裡的項目，包含「捷徑」。 | [自訂 iPhone 鎖定畫面（iOS 18）](https://support.apple.com/en-ca/guide/iphone/iph4d0e6c351/18.0/ios/18.0) |
| 控制中心 | PWA 本身做不到；可以加「捷徑」控制項。 | [用控制中心執行捷徑](https://support.apple.com/guide/shortcuts/run-shortcuts-from-control-center-apd06a9201d4/ios) |
| 動作按鈕 | iPhone 15 Pro 以後可以指定執行某個捷徑。 | [用動作按鈕執行捷徑](https://support.apple.com/guide/shortcuts/run-shortcuts-with-the-action-button-apdfea15680b/ios) |
| 捷徑 App 開網址 | 「開啟 URL」動作會**在 Safari 開啟**連結，不是在主畫面 App 裡開啟。 | [Shortcuts：分享類動作](https://support.apple.com/guide/shortcuts/share-actions-apdaf74d75a5/ios) |
| URL 深層連結進主畫面 App | 找不到官方文件說 iOS 會把範圍內的連結交給已安裝的網頁 App（沒有 link capturing）。 | 同上；[WebKit Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/) 只說 iOS 26 起加到主畫面的網站預設以網頁 App 開啟 |
| Manifest `shortcuts` | WebKit 只在 macOS（Safari 17.4）支援，iOS 沒有。 | [WebKit Features in Safari 17.4](https://webkit.org/blog/15063/webkit-features-in-safari-17-4/) |
| Safari 與主畫面 App 的資料 | **互相隔離**。加到主畫面時只複製一次 cookie，IndexedDB／localStorage 不共用；WebKit 回覆這是刻意設計。 | [WebKit Tracking Prevention](https://webkit.org/tracking-prevention/)、[WWDC23 What's new in web apps](https://developer.apple.com/videos/play/wwdc2023/10120/)、[WebKit bug 181849](https://bugs.webkit.org/show_bug.cgi?id=181849) |
| 語音辨識在主畫面 App | WebKit 工程師寫明「SpeechRecognition API 目前在 SafariViewController 和加到主畫面的網頁 App 中無法使用」；這張 bug 被標成 RESOLVED LATER，到 2025-03 都沒有修好的紀錄。iOS 26／27 的狀況沒有官方說明。 | [WebKit bug 225298](https://bugs.webkit.org/show_bug.cgi?id=225298) |
| 外部連結開啟後自動錄音 | 找不到官方文件保證可以不點按就開始錄音。設計上一律假設**使用者要再點一次麥克風**；首次使用還會跳系統權限提示。 | 無官方保證（列入實機測試） |
| Apple Developer Program | 每年 99 美元（以當地幣別計價）。免費帳號可以用 Xcode 裝到自己的手機，但描述檔 7 天到期要重裝，最多 3 台裝置、3 個 App，進階功能需要付費會員。 | [加入計畫](https://developer.apple.com/programs/enroll/)、[帳號比較](https://developer.apple.com/support/compare-memberships/) |

**兩個會直接影響方案的結論**

1. 捷徑開的網址會進 Safari，而 Safari 的 IndexedDB 和主畫面 App 是分開的。如果平常是從主畫面圖示開 QuestNote，方案 A 建立的任務會存到另一份存檔，主畫面 App 裡看不到。
2. 依 WebKit bug 225298，現有的語音按鈕在主畫面 App 裡可能本來就不能用，只有在 Safari 分頁裡可以用。這需要在你的 iPhone 上確認。

## 使用者實機確認（2026-10-23）

- 平常是從**主畫面圖示**開 QuestNote。
- 主畫面版的麥克風按鈕**可以用**。所以 WebKit bug 225298 的限制在目前的 iOS 已經不成立，現有的 Web Speech 語音輸入在主畫面 App 裡可以正常使用。
- 因此方案 A 不適用：捷徑打開的 Safari 存檔看不到主畫面 App 的任務。可行的是方案 C，或下方的方案 D。

**方案 D：App 內快速語音入口（不改架構）。** 點主畫面圖示開啟時，直接顯示一個大麥克風按鈕的快速新增畫面（設定裡可以開關），完全沿用現有的語音與建立任務流程。不能放在鎖定畫面，但不需要後端也不用費用。從喚醒到開始錄音：解鎖 → 點圖示 → 點麥克風。

## 方案比較

| | A：深層連結頁 + 捷徑 | B：Capacitor 原生外殼 + WidgetKit | C：捷徑原生聽寫 + 雲端收件匣 |
|---|---|---|---|
| 做法 | 新增 `quick-voice` 頁面，只有一個大麥克風按鈕，沿用 `taskVoiceInput` 與既有的建立任務流程。捷徑用「開啟 URL」打開它。 | 把 PWA 包成 iOS App，加小工具／控制項直接打開語音頁；語音改接原生 `SFSpeechRecognizer` 外掛（WKWebView 很可能跟 SFSafariViewController 一樣不能用 Web Speech）。 | 捷徑先用 iOS 內建「聽寫文字」，再把文字送到你自己的 Cloudflare Worker 收件匣；QuestNote 開啟時把收件匣裡的項目用既有流程建立成任務。 |
| 從喚醒螢幕到開始錄音 | 喚醒 → 點鎖定畫面按鈕 → Face ID 解鎖（開 Safari 預期需要解鎖，待實機確認）→ 頁面打開 → 點麥克風。約 2 次點按 + 解鎖。 | 喚醒 → 點小工具或控制項 → 解鎖 → 點麥克風（原生 App 有機會打開就自動開始）。約 1–2 次點按 + 解鎖。 | 喚醒 → 點鎖定畫面按鈕 → 直接開始聽寫（不用開 App）。約 1 次點按，說完自動送出。 |
| 鎖定畫面 | 可以（iOS 18 鎖定畫面控制項、控制中心、動作按鈕） | 可以（自己的小工具／控制項） | 可以，同 A |
| 任務存到哪 | **Safari 那份存檔**；平常用主畫面 App 的話會看不到 | 原生 App 自己的存檔，要用備份匯出／匯入搬資料 | 主畫面 App 下次開啟時匯入，存在你平常用的那份 |
| 語音技術 | 現有 Web Speech（只在 Safari 分頁可用） | 原生語音辨識（要另寫一層轉接） | iOS 內建聽寫（最穩定） |
| 開發量 | 小：1 個頁面、網址參數、測試、教學 | 大：原生專案、外掛、小工具、簽章、資料搬遷、兩套版本維護 | 中：Worker 端點 + token、App 端匯入、捷徑教學 |
| 費用 | 0 | 免費帳號 7 天要重裝；長期使用要每年 99 美元 | 沿用現有 Cloudflare 帳號；需要你同意**部署後端** |
| 需要 Mac／Xcode | 不用 | **要**（這台是 Windows） | 不用 |
| 上架 App Store | 不用 | 自用不用上架，但要簽章 | 不用 |
| 對現有 PWA 的影響 | 加一個頁面，不改存檔格式 | 會分成兩個產品 | 加一個匯入來源；任務內容會經過你的後端 |

## 建議

**先在你的 iPhone 上確認兩件事（約 2 分鐘），再決定 A 或 C：**

1. 你平常是從 Safari 分頁還是從主畫面圖示開 QuestNote？
2. 在主畫面版 QuestNote 新增任務時，麥克風按鈕能不能用？

- 如果平常就用 Safari，或主畫面版的麥克風本來就不能用、你可以接受改用 Safari 版：**選 A**。成本最低、完全沿用現有語音，當天就能用。
- 如果你要繼續用主畫面版，又要從鎖定畫面一鍵記錄：**選 C**。只有這個方案能把任務送進你平常那份存檔，而且不需要 Mac 或年費；代價是要部署一個後端端點。
- **不建議 B**：需要 Mac，免費簽章每 7 天要重裝，還要把一個 PWA 拆成兩個產品來維護，跟「個人長期使用、每週 3–8 小時」的投入不相稱。
