# 劍隱山河 V3.5.3 整包驗收

狀態：來源與不可變發布包已完成，隔離 HTTPS 預覽已部署並驗證。正式站仍為 V3.5.2；尚待使用者最終整包驗收及明確「可以發布」。

- 20 位角色：N3／R5／SR5／SSR4／UR3；沿用已認可第三版 PNG，逐張 SHA-256 一致。三 UR 為玄翎重岳雕、丹砂鎮嶺蛤、素心劍猿。
- 單抽100、機率55／30／10／3／2%、SSR+30／UR100保底；全員首抽開放，無解鎖贈寵。
- 松香行旅糰：森林嫩葉6＋豐穗護符2；普通75／自然或田園喜好總共150。新角送禮偏好與實際派遣專長均核對。
- 雲棧古道：平常3能量／30分鐘，沿用首次行旅優惠；完整五段故事、10／25／50／75／100里程碑、稱號徽章與材料來源。
- 20位角色各四章既有親密度故事及紀念物，共80章；沿用V3.5.1規則與獎勵。原有96角色及故事、4舊池、公告、legacy compatibility bytes保留。
- 故事轉卡圖流程已寫入 SOP。覺醒系統留待正式發布完成後另外討論與獨立文件；目前沒有覺醒狀態或圖片切換。

## 已驗證

完整 npm test：255 個 Node 測試全過，另包含召喚邏輯 assertions；JS語法、pools:validate、116寵物兩種縮圖、test:pool:release均通過。後者為 synthetic smoke，實際本池驗收另列：9個真實卡池/原生IDB/介面情境全過，13個雙profile/SW/快取/離線情境全過。桌面 Chromium 152；不宣稱 iPhone 實機驗收。

製作流程的 source promotion 發生在 candidate凍結之後：舊基準及receipts不改寫，後續新池從含116角色的來源建立新基準。所有72個已提交candidate輸入的Git blob已驗SHA-256，避免換行轉換。

正式站於驗收期間前進至 V3.5.2，因此本池順延 V3.5.3。已整合預設標準召喚的最新行為；正式站的新角色目錄、原有96位故事及公告均保留。HTTPS 預覽讀回175個關鍵檔案，全部與發布包雜湊一致；另以全新瀏覽器確認 preview DB、20張卡圖、80章故事及離線重載。見 [最新來源核對](source-promotion.json)、[Pages成功紀錄](preview-pages.json)、[HTTPS瀏覽器實測](preview-https-browser.json)。

初次 V3.5.2 製作與驗收記錄保留於 `*-v352.json`、`runtime-tests.log`、`catalog-check.log`、`image-check.log`、`release-smoke.log`；初始基準為 `production-baseline.json`，最新基準為 `production-baseline-v352.json`。`browser-failure.png` 是早期測試工具除錯截圖，正式驗收結果以最新 `pool-browser.json` 為準。這些歷史檔案不代表最新發布包。

## 審閱與發布綁定

- [完整內容審閱](review.html)：二十張圖、取材、Lore、故事、偏好與專長。
- [隔離 App 預覽](https://leotsouo.github.io/questnote-pwa-preview/?release-review=472a10006cb4)；preview部署提交 2f8bfc38225b7d2ee6a0ff06c607387fd60c92b4。
- [實際卡池驗收](pool-browser.json)、[SW驗收](artifact-browser.json)、[HTTPS讀回](preview-https.json)。
- reviewed source commit：`28c598ec8a335a017f5101c7b60cb9884b02dc9c`。
- candidate：`c1b379187f0d7b8cf5ccb01647a90344dfea30154eed448b698d1ebff8ee4dcd`。
- preview artifact：`472a10006cb4d729a4bb090c29d06f75a7e96e742a23de017c00c6230bbb532e`。
- production artifact：`d27c486d68150000f0b041d9cd4b379470850d1b3b1636731dce5c401056d589`（尚未發布）。
- packageHash：`334a2278ba163d65202b3d01914ebb3b50575101b79e945350391bdc1c4227a1`。

使用者對這一整包驗收及明確同意發布後，才把相同packageHash寫入humanAcceptance及publicationAuthorization，重跑poolReleaseReview，取得releaseReady:true後合併來源及推送正式產物。沒有冒用圖片認可作為整包或正式發布同意。

## 可播放的動畫檢視

已主動開啟[動畫檢視頁](http://127.0.0.1:57566/animation-review/)：完整入場、切換短轉場、可選角色的單抽、含三UR與重複角色的十連，以及三UR／四SSR的逐隻揭露，皆可重播；可切換減少動態。直接讀取待發布 artifact 的實際模組、樣式與資料，沒有改製動畫或替代效果。

[播放頁實測](animation-review-browser.json)：12個播放情境通過，7張SSR/UR圖載入，320px無橫向溢出，沒有建立IndexedDB或執行真實抽卡。SOP已加入必須開啟動畫供使用者檢視的交付步驟，此檢視屬於既有最終整包驗收。

僅新增檢視工具與SOP；原preview及production產物bytes不變。最終animation evidence加入可播放頁，故packageHash更新，前一份未獲人工驗收的review/gate保存在 `*-before-animation-viewer.json`。尚未取得「可以發布」，正式產物不推送。
