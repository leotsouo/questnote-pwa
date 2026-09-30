# 分享品牌修正 — V3.4.39

使用者的 LINE 截圖顯示 App 連結仍使用紫色 Q。唯讀 HTTPS 確認正式 `assets/brand/questnote-icon-512.png` 已是新版米金狼形圖示，SHA-256 `32c505609ea48e4ffab010e2fc53b184441a8bad39d79a45701b658b31040a06`，因此截圖中的卡片使用了較早的預覽資料。同時發現分享頁、提醒示意與教學仍引用舊 `assets/icons/icon-192.png`。

## 修正

- 保留既有品牌身份，將活躍畫面中的三個舊引用換成新版 `assets/brand/questnote-icon-192.png`。
- 新增 `assets/brand/questnote-share-wolf-v1.png`，與既有正式 512px 品牌圖示 byte-for-byte 相同。OG 與 Twitter 使用新圖片網址、PNG type、512×512 尺寸及 alt，避免沿用紫色 Q 的圖片網址快取。
- 新分享的直接 App 入口是 `https://leotsouo.github.io/questnote-pwa/?share=wolf-v1`。穩定品牌修訂 query 提供新的 crawler page cache key；官網入口保持不變，原有直接網址仍可用。
- App 的 meta description 與分享邀請一致，清楚說明生活待辦與夥伴成長。
- 組裝器替預覽／正式站產生各自 OG 和 Twitter 圖片網址，缺少該圖資時拒絕發佈；新圖資加入 SW precache，版本與 cache 同步。

## 驗證

- 本機完整 `npm test`：223 項通過，召喚斷言通過。最終來源 CI 另覆蓋新增的圖資閉包和 metadata assertions。
- 真實 Edge / Playwright：五種寬度 × 三主題 × 標準／特大字，共 30 組無水平溢出，分享與複製帶上新的 query，取消及備援正常；三主題 × 五寬度 axe WCAG 2 A/AA 自動規則無違規。
- 圖示實際 decode 成功，檢視手機與桌面截圖，確認紫色 Q 已換為新版狼形圖示。證據在 `reports/share-brand/`。
- 未將使用者的私人 LINE 對話截圖加入公開 Git。

部署身份和線上讀回證據另見 `reports/share-brand/deployment.json`。新的 meta 及網址可提供新版預覽資料，無法由本站強制清除 LINE 已儲存的訊息卡片；實際 LINE/iOS 分享面板需用新分享重試，不能由 Playwright 宣稱已在 LINE 實機驗收。
