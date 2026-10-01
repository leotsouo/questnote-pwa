# 官網 → 主畫面引導

官網手機版的「開啟 QuestNote」先開啟一個 native HTML dialog，詢問是否把 QuestNote 放進主畫面。這是網站自己的引導，不能宣稱是 iOS 系統的安裝視窗。

- iPhone / iPad Safari：先開啟實際 App，再從 Safari 的分享選單選「加入主畫面」。
- LINE / IG 等內建瀏覽器：提供複製實際 App 連結、貼到 Safari / Chrome 的步驟，避免直接進入不支援 Service Worker 的 App loader。
- Android Chrome：引導到 App，再從瀏覽器選單安裝；官網與 App 不同 origin，官網不能替另一個網站叫出原生安裝提示。
- 偵測只是提示：UA 無法可靠辨識所有內建瀏覽器，使用者可切換「我是在 LINE／IG 裡開啟」的說明。
- 「我已加入主畫面」明確請使用者回到主畫面點圖示，不假裝能偵測或喚起另一個 origin 的已安裝 PWA。
- Desktop 維持直接開啟 App；無 JavaScript 維持原始的真實 href。不改 CTA mode、不保存安裝狀態、不新增追蹤或外部服務。

原始截圖的 loader 文案來自 bootstrap 在 navigator.serviceWorker 不可用時的安全停止。畫面明明已使用 HTTPS，因此不是已安裝 App 導致，也不能只叫使用者重載。本輪透過官網入口引導到可用的完整瀏覽器，不繞過 App 的版本驗證或更改既有存檔。

瀏覽器測試涵蓋 320 / 375 / 393 / 430px 的 Safari 與 LINE UA、Android Chrome / WebView、iPad、桌面，另含 640px 短視窗，共 14 cases，包含關閉與 focus restoration、鍵盤、clipboard 拒絕後手動複製、手動修正 UA 分類、實際 App 目標與 UTM、axe contrast / semantic checks。截圖屬於瀏覽器模擬，沒有宣稱實機 iPhone 的 Safari 系統選單或 LINE WebView 皆已驗證。

參考：[Apple iPhone web app instructions](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/27/ios/27)、[MDN installation support](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)。

