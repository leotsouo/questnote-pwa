# 黯冠原創演出 runtime 切片

受控模板 chaos_demon_court 接入卡池契約、首次／切池登場、召喚前奏及稀有 reveal；七色抵抗路線與裂冠黑塔為原創 SVG，三種 UR 與四種 SSR 圖騰保持各自稀有度。新 CSS 和模組納入離線 closure，來源版本預備為 V3.9.0，未發布。

驗證：完整 npm test 370 個 Node tests 全通過，另含產品安全與 reveal-flow 命令檢查。瀏覽器測試查出舊 reveal caption 將非 ssr key 一律視為 UR；已改用實際 rarity，修後相關 65 項 tests 及九個瀏覽器檢查通過，無 page errors。手機 393px 與桌面 1280px 入場可呈現七條路線，Escape 清場。

這是未固定 artifact 的 runtime 切片，不是最終動畫整包验收。最終仍須以實際 20 隻卡圖完成固定產物 viewer、單抽／十連／重複／略過／減少動態／失敗回退與全主題背景對比。
