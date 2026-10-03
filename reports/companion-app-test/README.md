# 完整 App 美術整合測試

本機網址：http://127.0.0.1:4193/ 。執行 node devtools/companion-app-server.mjs 可重新啟動。

從 origin/main 8c9a3edae21fbad75c926cfb337d44c660d9a821（來源 V3.5.10）建立 codex/companion-app-art-test；本分支標示 V3.5.16。此為本機可操作的完整 App 測試版，未 push、合併或發布。

V3.5.16 六池共用逆造之誓的時間設定：完整入場 6 秒、再訪 1.5 秒、抽卡前奏 3 秒、SSR 2.5 秒、UR 4.5 秒、下一位交接 240ms。原生與新版角色流程使用同一個時間來源；地景動作按共同時間伸縮，減少動態保留快速靜態呈現。六池逐一實測與 SOP 更新見 [unified-timing-review.md](unified-timing-review.md)，303 項 repository tests 及 18 項展示整合 tests 通過。

V3.5.15 將霜誓峽灣的菱形誓印與通用圓環改成山脊日出；太陽、倒影與港口燈火共用原地景的 SVG 座標，保留冰壁、紅帆與碼頭。手機／桌機、三套 Theme、320px／200%、減少動態、單次／十連前奏、略過與鍵盤已實測，299 項 Node tests 通過。最新證據見 [glacier-dawn-review.md](glacier-dawn-review.md)，構圖規則已補入 SOP；人工最終體驗與 iPhone 驗收仍待進行。

V3.5.14 統一入場文字版型、SSR 2.5 秒／UR 4.5 秒及 240ms 下一位交接，接回二十位劍隱山河覺醒預覽；標準改名星旅之原，星圖山徑與永眠花海鏡池場景重新設計。六池、三套 Theme、320px／200% 字級及鍵盤已實測，317 項 Node checks 通過。最新證據與工程／人工驗收狀態見 [ceremony-v3-review.md](ceremony-v3-review.md)，共同規格已寫入新卡池 SOP。

下方保留 V3.5.11–15 歷史紀錄。舊的「標準」名稱、沿用鏡池及 607px 測量以最新報告為準；舊截圖與測試紀錄不覆寫。

V3.5.13 修正焦點標籤被插畫遮住，並將方形原圖完整填滿卡片寬度；393 × 852 三套 Theme 的召喚按鈕底部約 731px，仍在首屏。最新驗證與截圖見 [image-layout-repair.md](image-layout-repair.md)，下方儀式版 607px 的測量保留作為 V3.5.12 歷史證據。

## 操作與美術

- 首頁、任務、習慣、工坊、探險與設定使用現有 App。召喚與圖鑑接上第二版元件，使用同一份展示收藏。圖鑑可瀏覽全部 128 位真實角色，亦可依卡池篩選。
- 使用既有角色插畫、初始覺醒形態、品牌圖示、三套場景與 Theme tokens；沒有覆寫角色原圖、生成替代角色或新增遊戲資源。
- 相遇使用固定展示結果，不執行抽取或扣款。先播放原有主題前奏及 SSR／UR 專屬角色登場，再接新版原名、稱號與既有正常招呼；已演出插畫時只接 1 秒身份揭露，普通角色保留約 1.8 秒完整揭露。SSR＋十連順序為重鉚架橋犀 → 天律之冕・格里芬 → 蒸園盤根龜 → 逆造獅首奇美拉。
- 六池首次完整登場、再訪短轉場與重播共用原本控制器和場景。標準沿用鏡池演出基礎；花庭另提供純展示的既有解鎖演出。所有原圖和 Scene 模組保持原檔，無新增美術。
- 召喚頁移除今天同行者與最近相遇；卡池名稱與圖鑑系列統一為標準、永眠花海、霜誓峽灣、蜜光糖庭、劍隱山河、逆造之誓。原本正式呼叫端的動畫行為保留，新增交接參數僅供本機新版使用。
- 十連總覽完整十張，標示初次相遇與真實碎片增量；同次苗圃護芽甲蟲重複增加 1 碎片，滿星逆造獅首奇美拉增加 20。略過、詳細頁與返回不再累積。
- 設為陪伴會同步首頁；可從詳細頁進原生養成及暱稱表單。實測格里芬改稱小翼後，首頁顯示小翼及原名；召喚與新版圖鑑維持原名。

## 展示隔離

專用 server 僅綁定 127.0.0.1:4193，提供完整 App shell，將 /src/db.js 替換為 devtools/companion-session-db.js。全部表格在 JavaScript 記憶體中，不呼叫 IndexedDB，重新整理重設。初始星塵 30000、能量 300、六位夥伴及小灰暱稱均為明確展示資料。

只有來源 checkout、指定 loopback origin 與 server 的 HTML marker 同時成立，才可啟用新版 renderer；所有 assembled profiles 都拒絕啟用。正式 DB 封裝沒有修改，沒有新增存檔欄位、正式 API 或後端。原生 domain services 在本機測試會使用記憶體 adapter；直接 transaction 也保留複製、序列執行與 rollback。source version、SW cache 與新 bridge precache 已同步。本機 session 不註冊 SW，CSP 限制外部連線。

## 驗證

- npm test：283 + 11 + 5 = 299 項 Node tests 全通過，以及既有 reveal-flow assertions（見 repository-tests.log）。
- 新增記憶體整合 6 項、展示模型 9 項、相關 Theme 11 項，共 26 項通過（session-tests.log）。測試涵蓋原生陪伴與暱稱、transaction rollback、並行 mutation、idempotent reward、三套首頁原名及 loopback/artifact gate。
- 變更 JS 語法與 git diff --check 通過。
- Windows Chromium 實際操作：完整 App 啟動、建立今日任務、完成後星塵 30000 → 30020；暱稱儲存、陪伴切換、首頁圖資同步與重新整理重設。
- 儀式版三套 Theme 393×852：原名 24px、召喚 CTA 約 607px、底部導覽從 780px 開始，沒有水平溢出。
- 三套 Theme 320px／200%：root 32px、名字 48px、主要召喚文字 32px；自然垂直捲動，新畫面沒有水平溢出。320px 十連單欄且對話框沒有水平溢出。
- 正常動態四位 SSR＋完整隊列；略過至完整總覽；減少動態直接總覽；重複／滿星碎片單次累積；返回詳細頁恢復原卡片焦點；Shift+Tab trap 與 Escape 返回召喚 CTA。沒有 App warning/error。
- 128 位圖鑑的原名、擁有與灰階狀態、搜尋及返回路徑已檢查。隱藏 legacy stage 兩個未設定 src 的 image 不屬於可見破圖。

iPhone Safari、VoiceOver、原生 Dynamic Type、觸覺、safe-area 及實際裝置效能仍待手機驗收。本機記憶體測試版不作離線 PWA、正式更新或部署驗收證據。

## 前後對照

index.html 與 screenshots/ 包含完整 App 的首頁、召喚、結果、詳細頁、全部圖鑑、十連、滿星、三套 Theme 與大字畫面。before-prototype-393.jpg 是先前獨立 Prototype 02 截圖，明確用於比較獨立原型和這次完整 App 整合；不當作最新版正式站證據。

ceremony.html、ceremony-review.md 與 ceremony-*.png 為本輪舊版來源 UI 和新版儀式對照。舊版網址 ?legacy=1 仍使用記憶體 DB 和同一份来源，不代表正式 HTTPS 部署。更早截圖保留為歷史證據。
