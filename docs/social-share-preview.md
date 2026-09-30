# QuestNote Social Share — 小事完成，冒險繼續。

## 先看懂，再想點

原卡片在手機縮圖裡，左側細字與下方三種數字獎勵都太小；中間方形裁切也會分開文案和夥伴。App 與官網兩個網址又讓 LINE 產生兩張卡，舊 App metadata 搶走主要辨識。這輪保留既有灰影幼狼與世界素材，重新做一张 campaign poster，並把正式分享集中到官網。

## 10 組 Headline

每項 1–5 分。評分是設計判斷，未宣稱真人市場測試。

| Headline | 清楚 | 情緒 | 記憶 | 縮圖可讀 | 產品差異 |
| --- | --- | --- | --- | --- | --- |
| 小事完成，冒險繼續。 | 4 | 4 | 5 | 5 | 4 |
| 今天的小事，有夥伴一起。 | 4 | 5 | 4 | 4 | 5 |
| 做完一件事，多走一段路。 | 3 | 4 | 4 | 4 | 3 |
| 待辦打個勾，夥伴靠近你。 | 5 | 4 | 4 | 4 | 5 |
| 你的進步，牠都收到了。 | 3 | 5 | 5 | 5 | 4 |
| 一件小事，也是一段冒險。 | 4 | 4 | 4 | 4 | 4 |
| 把今天，寫成你們的旅程。 | 3 | 5 | 4 | 4 | 4 |
| 今天有完成，也有陪伴。 | 4 | 5 | 4 | 5 | 4 |
| 讀完幾頁，冒險又往前。 | 5 | 4 | 4 | 5 | 4 |
| 不用很厲害，也能一起往前。 | 3 | 5 | 4 | 3 | 3 |

選「小事完成，冒險繼續。」：五字一行，在小卡仍有清楚節奏。「完成」是現實生活，「繼續」連結夥伴與世界，避免做完打勾就結束。畫面中的實際閱讀任務與親密度提示補足產品概念；metadata 首句直接說明這是一個 App。

## Metadata

- Title：**QuestNote｜小事完成，冒險繼續**
- Description：**把生活裡的待辦變成冒險的 App。完成一件小事，和你的夥伴一起成長。**
- Canonical / OG URL：`https://questnote.taste-compare.com/`
- Image：`https://questnote.taste-compare.com/assets/questnote-og-v2.jpg`，1200×630，JPEG，靜態可直接 GET。
- Twitter：summary_large_image，title / description / image 與 OG 一致。

## Art direction

一個安靜的森林夜晚。灰影幼狼是第一個視覺焦點；同一個世界裡，讀書完成的記號和關係進度留下細微回應。短句與 QuestNote 名稱使用高對比、清楚的中文排版，沒有放大 App Icon、手機 mockup、功能清單、QR 或 RPG 框。主要資訊保留於中央 630px 安全區，額外檢查方形裁切及 LINE 類型的小 thumbnail。

這是專門排版的海報，以 HTML/CSS 作為可維護的排版原始稿，經瀏覽器輸出成靜態 JPEG；不是網站或 App 畫面截圖，也沒有重新生成或改造角色。

## 分享短文案

### A — 朋友 / LINE

我把每天的待辦，做成了一場有人陪的小冒險。完成現實裡的一件事，QuestNote 裡的夥伴也收到你的進步。

官網可以先完成一個小任務，看看牠的回應：
https://questnote.taste-compare.com/

### B — Threads

做完一件事，待辦清單通常只多一個勾。
我想讓那個勾，也在另一個世界留下回音。

QuestNote 把生活任務變成你與夥伴一起成長的冒險。官網裡可以直接完成一個任務，看看牠的回應。
https://questnote.taste-compare.com/

### C — 一句話

把今天的一件小事，變成你和夥伴的下一步。
https://questnote.taste-compare.com/

## 入口與快取

GitHub Pages 仍是使用者實際操作、離線快取與存檔的 App。它不是可以直接 301 到官網的舊靜態頁；轉址會干擾既有使用者。這輪不改部署架構與 App Icon，官網 canonical 維持自己，正式分享及複製訊息只包含官網一個 URL。官網 CTA 仍可開啟 App。

新圖片使用獨立 v2 檔名，舊圖片留存以免既有訊息抓圖失敗。社群平台仍可能保存舊 HTML / 卡片，本站無法清除已送出的 LINE 訊息。實際卡片由平台決定；模擬圖不宣稱是 LINE / X / Discord 實機抓取結果。
