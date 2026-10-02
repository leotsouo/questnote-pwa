# 焦點卡顯示修正 · V3.5.13

使用者截圖指出插畫遮住左上角的焦點標籤，並希望插畫滿版。原本絕對定位的標籤與後方定位的圖片區產生重疊；1.5 比例的橫向圖框用 contain 顯示方形圖片，形成兩側留白。

標籤移到 hero-caption 的正常文件流；圖片區改為 1:1，原圖完整填滿卡片寬度。既有圖片、角色動畫與抽卡展示狀態保持原檔。此修正只在專用本機完整 App 測試版啟用。

驗證：

- 128 位角色的 384 個原圖／縮圖引用均存在；本機可見圖片無載入失敗。
- 三套 Theme、393 × 852、16px 字級：插畫 303.33 × 303.33px 與容器等寬；標籤位於圖片下方；召喚按鈕底部約 730.79px，底部導覽從 780px 開始；沒有水平溢出。
- 暮光 Theme、320px、200%（root 32px）：圖片與容器等寬且維持方形，標籤位於圖片下方；自然垂直捲動，沒有水平溢出。
- Enter 開啟格里芬詳細頁，插畫成功載入；Escape 返回，焦點恢復至原焦點卡按鈕。大字詳細頁沒有水平溢出。
- 桌面實際 App：圖片與容器同為 338.8px 寬，標籤為 static，不再重疊。
- npm test：299 項 Node tests 及既有 reveal-flow assertions 通過；變更 JS 語法與 git diff --check 通過。完整輸出見 image-layout-tests.log。

截圖：screenshots/image-layout-full-393.png、screenshots/image-layout-full-desktop.png。對照已加入 ceremony.html。320px／200% 的截圖工具失敗，排版測量及實際 UI 操作已完成，不以失敗截圖作為證據。

仍為記憶體展示資料，未發布；iPhone VoiceOver、原生字級與觸覺仍待實機確認。
