# 官網與 App 一起分享 — V3.4.38

「更多 → 分享 App」顯示一份可先閱讀的邀請，說明現實待辦與夥伴成長的關係，並提供「認識 QuestNote」與「直接開始」兩個入口。

- 官網：https://questnote.taste-compare.com/
- App：https://leotsouo.github.io/questnote-pwa/
- 原生 Web Share：官網放在 `url`，直接 App 入口放在 `text`；兩個網址各一次。
- 複製邀請及無原生分享的備援：完整文案與兩個網址一起複製。權限拒絕時嘗試選取複製；仍失敗可展開完整內容手動選取。
- 取消原生分享不複製、不顯示錯誤。分享只包含固定公開文案，沒有存檔、任務、收藏或個人資料。
- 網址與文案集中在 `src/shareService.js`，顯示及發送使用相同來源。既有分享入口與加入主畫面指引保留。

## 驗證

`npm test`：207 + 11 + 5 = 223 項通過，0 失敗；召喚邏輯斷言通過。分享服務測試另驗證網址各一次、取消／失敗／不支援、Clipboard 權限拒絕的選取備援。

真實 Edge / Playwright：320、375、393、430、1440px × 三風格 × 16/24px 字體，共 30 組：無水平溢出，按下分享產生正確 payload，複製包含兩個網址。每個尺寸另外通過取消、無 Web Share 備援及鍵盤展開完整內容。使用新 localhost context、隔離 IndexedDB、封鎖外站請求，沒有實際傳訊給任何人或提交 production feedback。

截圖與矩陣在 `reports/share-marketing/`。檢視手機、320px 特大字體及桌面實際截圖；第一屏能閱讀產品差異與分享動作，特大字體可自然換行捲動。沿用主題與 focus 系統，不新增動畫；reduced motion 下完整操作正常。

## 範圍與限制

Web Share 的接收端由作業系統與 LINE 等 App 決定。此驗證測試真实按鈕至 navigator.share 的 payload，沒有宣稱實機 iOS 分享面板或各通訊 App 的網址預覽排序已驗證。

發佈身份、預覽／正式驗證另記於 `reports/share-marketing/deployment.json`；來源完成不代表已上線。

## 上線驗收

**PRODUCTION LIVE**：V3.4.38。PR #25 已合併至 main；預覽与正式 App 的 Pages 建置皆成功，兩站各 13 個關鍵 HTTPS 檔案符合固定產物 SHA-256。413 個 staged Git blobs 全部符合產物；正式產物相對 V3.4.37 只變更分享 UI、服務、樣式、版本與發布身份八個檔案，內容包和信箱原樣保留。

- 正式 App：https://leotsouo.github.io/questnote-pwa/
- HTTPS 預覽：https://leotsouo.github.io/questnote-pwa-preview/
- 本機、HTTPS 預覽及正式站各通過 30 組版面與分享／複製檢查。正式站另外在五尺寸 × 三風格共 15 次 axe WCAG 2 A/AA 自動規則檢查中發現 0 項違規；此結果不代表所有實機與輔助技術皆已驗收。
- axe 必須等待主題顏色過渡結束再測量；過渡中瞬間混合的顏色曾導致誤判，穩定畫面確認無違規，QA runner 現在保留等待步驟。
- 本機 393×852 觸控事件模擬：分享按鈕以 tap 成功產生官網 payload；分享頁按鈕／連結／展開控制均至少 44px；page errors 為 0。
- 12 項真實組裝版 PWA 測試通過，包含升版、回退、預覽隔離及離線。

已安裝舊 PWA 的使用者請關閉全部 QuestNote 視窗及分頁後再在線上開啟，以便 verified worker 正常啟用。不要清除網站資料。
