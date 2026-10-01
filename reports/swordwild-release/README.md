# 劍隱山河 V3.5.3 整包驗收

狀態：來源與不可變發布包已完成，隔離 HTTPS 預覽已部署並驗證。正式站仍為 V3.5.2；尚待使用者最終整包驗收及明確「可以發布」。

- 20 位角色：N3／R5／SR5／SSR4／UR3；沿用已認可第三版 PNG，逐張 SHA-256 一致。三 UR 為玄翎重岳雕、丹砂鎮嶺蛤、素心劍猿。
- 單抽100、機率55／30／10／3／2%、SSR+30／UR100保底；全員首抽開放，無解鎖贈寵。
- 松香行旅糰：森林嫩葉6＋豐穗護符2；普通75／自然或田園喜好總共150。新角送禮偏好與實際派遣專長均核對。
- 雲棧古道：平常3能量／30分鐘，沿用首次行旅優惠；完整五段故事、10／25／50／75／100里程碑、稱號徽章與材料來源。
- 20位角色各四章既有親密度故事及紀念物，共80章；沿用V3.5.1規則與獎勵。原有96角色及故事、4舊池、公告、legacy compatibility bytes保留。
- 故事轉卡圖流程已寫入 SOP。覺醒系統留待正式發布完成後另外討論與獨立文件；目前沒有覺醒狀態或圖片切換。

## 本池專屬動畫

山河啟卷入場：雲霧退開、紙卷展出群山與古道，諾／俠／心三印回應。劍光赴約抽獎：稀有度光色、劍痕揭卷；三UR各以巨翼、朱息鎮岳界線與分葉劍勢登場。SSR金墨揭露，正常與減少動態均可重播、略過及逐張繼續。

[開啟互動動畫檢視](http://127.0.0.1:57996/animation-review/)（已在Codex實際開啟，與下列artifact相同）。本次12個播放情境、7張稀有卡圖與稀有度標示、320px版面與無IndexedDB寫入均通過。

## 已驗證

完整 npm test：258 個 Node 測試全過，另包含召喚邏輯 assertions；JS語法、pools:validate、116寵物兩種縮圖、test:pool:release均通過。後者為 synthetic smoke，實際本池驗收另列：9個真實卡池/原生IDB/介面情境全過，13個雙profile/SW/快取/離線情境全過。桌面 Chromium 152；不宣稱 iPhone 實機驗收。

製作流程的 source promotion 發生在 candidate凍結之後：舊基準及receipts不改寫，後續新池從含116角色的來源建立新基準。所有72個已提交candidate輸入的Git blob已驗SHA-256，避免換行轉換。

## 審閱與發布綁定

- [完整內容審閱](review.html)：二十張圖、取材、Lore、故事、偏好與專長。
- [隔離 App 預覽](https://leotsouo.github.io/questnote-pwa-preview/?release-review=f9bf15eabb42)；preview部署提交 af3f76307f15d93c93a4db6fa6ab40a65d06e0e1。
- [實際卡池驗收](pool-browser.json)、[SW驗收](artifact-browser.json)、[HTTPS讀回](preview-https.json)。
- reviewed source commit：`d7f18e724b25c38fa2cad97fe6835a05435f2ee5`。
- candidate：`eaa3e4d2e525439b7c3dd430ad4a9421c1655f4d4776626a8fcb84c7ba8fa2c6`。
- preview artifact：`f9bf15eabb426db00c85e0eabbf72b3afd9d80a5c1fe84684efccdbc956f000f`。
- production artifact：`b411c76af9d8dce537abeb260bfea76ad0c1add001d9b43b302482c40d57c583`（尚未發布）。
- packageHash：`29164739cac3bbe33deeefb3b740e0295e7d09c600d76f9d26ca3471bc538298`。

使用者對這一整包驗收及明確同意發布後，才把相同packageHash寫入humanAcceptance及publicationAuthorization，重跑poolReleaseReview，取得releaseReady:true後合併來源及推送正式產物。沒有冒用圖片認可作為整包或正式發布同意。
