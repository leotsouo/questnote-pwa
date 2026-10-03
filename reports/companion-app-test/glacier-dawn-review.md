# 霜誓峽灣日出修正 · V3.5.15

日期：2026-10-03。來源為 codex/companion-app-art-test 上的 V3.5.14（03bff9c），本機完整 App：<http://127.0.0.1:4193/>。此為記憶體展示版，重新整理重設；未合併、push 或發布。

## 問題與結果

使用者指出抽卡前奏中金色菱形與發光圓形分離，要求重新設計，可改為日出。原菱形是 Glacier 地景的 HTML 百分比定位；圓形則是通用 summon omen，UR 樣式仍會顯示。兩者不屬於同一構圖，也未隨 SVG 地景的裁切同步。

改為霧散、太陽從山脊後升起、暖色倒影沿航道展開的 3.4 秒有限演出。太陽在山脊後方，倒影在船下方；冰壁、紅帆船、碼頭與燈火沿用既有 SVG。六盞燈火移入相同 viewBox，其中房屋內的兩盞與窗戶對齊。刪除舊菱形並直接移除 Glacier 的通用 omen，不讓 rarity CSS 再產生第二個圓環。每個場景實例使用獨立漸層 ID。

同一地景用於卡池完整登場、再訪短轉場、單次與十連前奏。減少動態與短轉場直接使用日出完成構圖。角色插畫、角色登場、既有台詞、SSR／UR 停留、十連順序、碎片計算與存檔規格沿用現有流程。未新增或覆寫 raster 美術、卡池資料、資源或正式 API。

## 實際驗證

- npm test：283 + 11 + 5 = 299 項通過，既有 reveal-flow assertions 通過；記錄見 [glacier-dawn-tests.log](glacier-dawn-tests.log)。修改的四個 JavaScript 檔案 node --check 與 git diff --check 通過。
- Windows Chromium 完整 App／393 × 852：日出核心範圍 x154–239、y213–298；正常演出 3.4 秒、一次完成。十連 rarityOmen 階段沒有舊菱形或通用 omen，SVG 漸層引用均可在各自地景內解析。
- 1024 × 768：太陽核心從 y271–374 上升到 y128–230，SVG transform 從 translateY(140) 到 0；山脊遮擋、紅帆、碼頭與倒影完整，沒有水平溢出。
- 星夜遠行／晨光花園／暮光冒險手帳，393 × 852：減少動態皆為 animation:none、transform:none，日出終點一致，無水平溢出。320 × 852／200%：root 32px，文字區 x24–296，太陽仍完整，沒有水平溢出。
- 再訪短轉場沒有重新播放長日出，直接顯示完成構圖；單次前奏使用 glacierSunrise，沒有舊菱形或通用 omen，多個地景實例的漸層 ID 分離。
- 正常十連：風眼誓鴉 SSR 實測 2546ms、破曉誓角麝牛 UR 4559ms；總覽完整十張。纜結海鸚同次重複 +1、麝牛同次重複 +20。纜結海鸚詳細頁碎片為 1，重開仍為 1。
- 十連 dreamDust 前奏由實際略過按鈕按 Escape，直接到完整十張總覽；返回卡池正常。入場 Tab／Shift+Tab 留在繼續按鈕，Escape 返回池選擇器（沿用控制器的返回焦點），解除演出捲動鎖定。可見圖片未破圖，沒有瀏覽器 warning/error。

逐項 DOM／動態測量見 [glacier-dawn-browser-qa.json](glacier-dawn-browser-qa.json)。早期略過驗證起初定位到不可聚焦的 dialog，之後改用實際 data-action skip 按鈕，在 dreamDust 成功驗證；未以失敗操作充當通過證據。

## 畫面證據與 SOP

- [修正前手機登場](screenshots/glacier-dawn-before-393.png)
- [修正後手機登場](screenshots/glacier-dawn-after-393.png)
- [十連前奏](screenshots/glacier-dawn-ten-393.png)
- [桌機日出](screenshots/glacier-dawn-desktop.png)
- [320px／200%／減少動態](screenshots/glacier-dawn-320-200.png)

可操作對照頁：<http://127.0.0.1:4193/reports/companion-app-test/ceremony.html>。[新卡池 SOP](../../docs/new-card-pool-sop.md) 補入共同地景座標、特製前奏替換通用元素、SVG ID 隔離與畫面驗收規則。

工程與本機視覺驗證完成；使用者最終體驗驗收尚未作結。iPhone Safari、VoiceOver、原生字級、觸覺與裝置效能仍待實機；本報告不作正式部署或離線 PWA 的驗收證據。
