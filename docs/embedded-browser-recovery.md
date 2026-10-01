# V3.4.42 — 內建瀏覽器啟動恢復

首次使用與已安裝使用者都可能碰到 WebView 缺少 Service Worker；是否已加入主畫面不決定這项能力。本次修正移除只有技術錯誤與重新載入的死路，提供可操作的外部瀏覽器引導。它不讓網站取得宿主 WebView 未開放的權限。

- 缺少 Service Worker、getter 被拒絕、SecurityError／NotSupportedError／app-bound 註冊拒絕，或 session storage getter 被拒絕：顯示「換個瀏覽器，繼續你的冒險」。
- 複製目前 App scope 的連結，iPhone／iPad 指引 Safari，其他平台指引 Chrome；複製權限失敗可長按 readonly 連結手動複製。已安裝者可回主畫面開啟。
- 暫時網路／版本驗證失敗仍提供重新載入。保留既有安全啟動、離線校驗、更新與 Preview 隔離；不繞過受控啟動，也不清除存檔。
- 不支援情況不載入 App 模組、不開啟產品 IndexedDB。無新追蹤、後端、費用或 DNS 修改。

## 來源、預覽與正式發布

來源 PR #36 已合併：`9962ef83c8af9283dcf4b2a8ab4d8002e5680706`。組裝來源：`41e234e79f9b1dfaf2ff9c6deca86b6a84aa3810`，包含 main 的探險與任務表單修正。來源 CI [36857888238](https://github.com/leotsouo/questnote-pwa/actions/runs/36857888238) 通過 235 個 Node tests、召喚邏輯、卡池／圖片檢查。

| | Preview | Production |
| --- | --- | --- |
| URL | https://leotsouo.github.io/questnote-pwa-preview/ | https://leotsouo.github.io/questnote-pwa/ |
| Artifact | `8f8c933b2e939632b2807e33ef21e18b9d3021052b67805b6f03472cf390e92f` | `bf602678f6c3b7935d1de4053afbe4b1346d0dbc984fa28011dbcf9b45878b1b` |
| Manifest SHA256 | `dc58eb5f1fd1e8b5951f54b24fedf8c799c8c0452b3785082b110b1f4d66b3d6` | `d6bfc9c44278f43d497808de341790ff6197b8b42613f26fe223fc806fe8817b` |
| 部署 commit | `871d35025d999c834037f2a3609a66b04192b812` | `f86c5b2371c16b87b98cf025b88b16099c59339b` |
| Pages run | `36875531694` | `36875982334` |

兩個 artifact 各 411 files，嚴格驗證與 staged Git blob 雜湊全部通過。正式部署 fast-forward 接在 V3.4.41 `4e6744b352975eab2d821e7922426835596b461f` 之後。輸入明確釘住當時正式內容 bundle `8475965d22917f5594a56ba6b5bba21e9c4aa22c4b160b4c000e32608e2bc5df`，所有正式 assets／data bytes 與 mailbox `49c06b7f0dc976bda2034ee5a9a50abb14d894baa0903a6821016798b6b9a1bd` 保留。過程中較舊 f00 candidate 的 Preview 已被替換，未發布到正式站。

## 驗收與限制

- 組裝版：12 recovery／supported-browser cases，另有維護中的 12 個 PWA 離線／更新案例，全數通過。
- 公開 Preview 與正式站：各 14 個 HTTPS 核心檔案與 immutable artifact bytes 相符。
- 公開瀏覽器驗證及截圖見 `reports/browser-recovery/{preview,production}/`；涵蓋 320、375、393、430、1440px，短畫面、reduced motion、keyboard、axe contrast／semantics、複製成功／失敗及支援的瀏覽器正常啟動。
- 這些是 Edge Playwright 的 WebView 失敗模擬，不是實體 iPhone 或 LINE 宿主測試。仍需使用者從 LINE 點一次正式網址，確認外部 Safari 交接；iOS 網站不能自行呼叫原生「加入主畫面」視窗。
- `reports/browser-recovery-regression.log` 是合併其他修正前的初次本機測試；最新 source CI log 才是 235 tests 的依據。

平台背景：[WebKit App-bound domains](https://webkit.org/blog/10882/app-bound-domains/)、[MDN ServiceWorker register](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register)。
