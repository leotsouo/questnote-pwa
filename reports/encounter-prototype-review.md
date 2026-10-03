# 相遇與指定邀請 — 實作前設計驗收

2026-10-03。先完成 prototype、實際 browser screenshots 與下列 review，再開始正式 economy / migration implementation。

## 可互動預覽

`devtools/encounter-invitation-preview.html`，正式 128 角色與 Lore／初遇相，只有記憶體 fixture，無 IndexedDB、召喚、遠端追蹤或扣款 API。19 個情境涵蓋使用者要求的 14 種狀態。實際操作已完成畫廊→UR 預覽→確認→儀式→結果→設為同行→重播，餘額 242→42，重播仍是 42。

## Screenshot matrix

Capture directory：`C:/Users/User/.codex/visualizations/2026/10/03/01a1011a-9936-78b1-a5bd-95a0cb2f9051/encounter-invitation/`。

393×852：summon、duplicate_n、duplicate_sr、duplicate_ur、gallery、ssr、ur、confirm、ceremony、result、migration、care；另含 insufficient、owned、locked、specialty。320×852 / root 24px：gallery、confirm、result、migration、care。三主題 Reduced Motion：result-default/sweet/twilight-reduced。

第一輪發現：旋轉光徑造成 horizontal overflow、完整 Lore 將確認 CTA 推得太遠、初版篩選佔過多畫面。已縮短為真實介紹前兩句、光徑收於容器內、搜尋／系列改為可展開工具。修正後上述 DOM width checks 無 horizontal overflow，畫作皆未發現 broken image；三主題實際背景讀回為 #101a2b / #fff8f2 / #f3efe6，24px 字體讀回正確。

## 依使用者指定評審角度的內部檢視

Apple Interaction：選擇／確認／提交分開，取得角色後才播放儀式；重播是 presentation，提供直接設為同行。Visuals：沿用正式畫作與色票、名字先於稱號、弧線光痕符合同行星芽的共同旅程語言。Delight：重逢顯示真實角色回應、相遇碎片與下一次邀請距離。Inclusivity：44px 按鈕、文字稀有度、native controls、Reduced Motion、24px 文字；實機 VoiceOver／觸控尚待裝置驗收。

iF Idea/Function：RNG 逐漸轉為可指定的收藏選擇，成本／餘額／已相遇／故事鎖清楚。Form/Differentiation：畫廊是人物與世界的連續篇頁，沒有單卡價格／買入動作。Sustainability：純本機原子存檔、現有 Artwork、線條 SVG 與 CSS 動態，無新伺服器或 AI 依賴。

Red Dot Idea/Impact：重逢回應與確定的碎片進度同時成立；結果的重點是同行者與下一步關係。Form：共享圖示、書頁層級、光徑儀式串起完整流程。此為內部設計檢視，沒有官方評分或獲獎聲明。

判定：視覺與互動方向成立，可進入正式交易、migration、備份與回歸驗收。正式 App 與真實交易仍須另測，不能用 prototype 當作資料安全證據。
