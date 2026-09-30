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
