# Marketing Jury Review · 2026-10-01

這是依公開評判角度做的內部設計審查，不是正式 Jury、得獎聲明、轉換率預測或新訪客研究。資料來源：[Webby judging criteria](https://www.webbyawards.com/judging-criteria/)、[D&AD Writing for Design](https://www.dandad.org/awards/d-ad-awards/categories/writing-for-design)、[D&AD Digital Experience Design](https://www.dandad.org/awards/d-ad-awards/categories/digital-experience-design)、[The One Show Interactive, Online & Mobile](https://oneshow.org/categories/interactive-online-mobile/)。

Webby 的網站框架重視內容、架構、視覺、功能、互動與整體體驗；D&AD 數位體驗從使用需求與完整流程檢視實作品質；One Show 的此類別將數位渠道作為品牌／產品傳播。以下將這些公開方向轉為 QuestNote 的具體檢查，未複製得獎網站的外觀。

| Jury / lens | 檢查與判斷 | 證據／限制 |
| --- | --- | --- |
| Webby / Home Page | Hero 明說待辦、你們與冒險；副標連接生活任務、夥伴成長。灰狼與真實獎勵規則的任務共用營地，第一屏單獨成立。 | 393×852 完整完成操作可見。10 秒理解是設計判斷，尚未招募陌生訪客驗證。 |
| Webby / UX | Hook 就給 Aha，再說完成後的情緒連續、夥伴、相遇／遠行、真實產品與 CTA。 | Demo 不必捲到第四大節；長頁仍可用導航直達 App。 |
| Webby / UI | 一個完成按鈕、一次獎勵、清楚的進度和可重試。4 個 screenshot tabs 不同頁共用一套語意。 | Playwright 操作与键盘方向鍵／Home／End通過。 |
| Webby / Mobile | 320、375、393、430px，另含768與1440。手機視覺與文案另設尺寸；Sticky只在Hero已離開且Final尚未出現時顯示。 | 實際觸控模擬、無overflow；未以實機Safari／LINE內建瀏覽器宣稱驗收。 |
| Webby / Visual design | 森林夜色＋紙頁連接產品；狼臉與UI錯開，收益用gold，不把幻想做成HUD。 | 截圖發現狼臉被文案壓住並修正；完成提示直列也已修正。 |
| D&AD / Writing | 「今天的待辦，成了你們的冒險。」清楚；「小事，有回音。」為同一個具體概念留下餘韻。 | 10組繁中Headline有內部五向比較；沒有效率誇大、勇者語氣或虛構用戶實績。 |
| D&AD / UX writing | 「點一下完成」「你的小事，牠收到了。」「再試一次」短且對應真實動作。 | 螢幕閱讀器另有完整獎勵公告；沒有讓動態取代文字。 |
| D&AD / Art direction | 同一隻灰影幼狼、三套共用品牌DNA、中文宋體章節、克制UI與原世界插畫，沒有另一個吉祥物。 | 原角色與場景未重新生成；真實App截圖標明source版本／示範資料。 |
| D&AD / Digital experience | 完成讓親密度與今日進度一起改變，訪客手裡有產品概念。 | 沒有帳號／表單摩擦；想不想繼續探索仍需人測與正式流量資料。 |
| One Show / Campaign | Hero、1200×630 OG與三張Social都講「日常小事，在夥伴世界裡有回應」，可單獨流通。 | 3個1080×1350 concept已輸出；非僅logo+gradient。 |

## 最後三個壓力測試

1. **關閉動畫**：Playwright reduce motion 下無running animation，Enter仍完成，進度、收益、台詞保留。沒有每行fade或需要opening的故事。
2. **移除Logo**：實際存了no-logo手機Hero；任務＋灰狼＋親密度＋星夜營地仍是同一產品概念。此為內部辨識判断，未假裝取得未提示品牌的用戶辨識率。
3. **只看Mobile Hero**：第一屏可讀到「生活任務與夥伴一起成長的冒險」，可見狼和任務按鈕。排版通過，不宣稱已完成真人10秒訪談。Owner可邀請3–5位不認識產品的人，遮住後問是什麼、打勾會發生什麼、下一步想做什麼。

成功節奏：3秒用幼狼／任務產生好奇；10秒靠文字與場景定位；30秒內完成一次互動；60秒可從Hero或Final開啟PWA。這是設計目標，不是已量測的轉換漏斗。
