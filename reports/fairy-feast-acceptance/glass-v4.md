# 玻璃罩稀有演出 — 2026-10-10

依使用者框選要求「改成類似玻璃罩著他們的感覺」，將霓霞仙膳SSR／UR登場卡框改為透明玻璃罩。弧形罩頂、內外雙層邊緣、斜向微弱反光與底部玻璃厚度；背景模糊只作用於罩身後方，角色插畫不模糊，原圖bytes不變。

新版預覽：http://127.0.0.1:55125/review/ 。確切preview／production產物見 `artifacts-v4.json`，preview ID `3c3129e65f6408e314e82dce807a2c888d9f3b90aaf150c6905a26425d9bc37d`。v4取代v3視覺版本，先前packageHash不適用此版，未取得發布授權。

已實際播放原始主題曜夜玄鴞及暮光月露雪鹿。960px插畫完整載入，圖片filter:none，空白副標display:none。903px桌面與393×852手機截圖分別為 `glass-desktop-v4.jpg`、`glass-mobile-v4.jpg`。手機罩身上緣174.21、下緣677.79、寬338.26；繼續按鈕784～828，無重疊，scrollWidth378，無橫向溢出。

8組新池與共用時間targeted tests通過，演出控制器、3.4秒入場、3秒前奏、SSR／UR時間、略過與交易邏輯均未改。此次只改 `src/aurora-fairy-feast.css`，沿用先前交易及v3動畫回歸證據，未重跑無關交易／備份測試。這是隔離artifact瀏覽器驗證，不代簽真機或正式HTTPS。

preview及production完整manifest驗證通過並登錄hold；本次OS暫存重複產物逐檔比對長期保留副本後刪除。工作區與本機提交保留待人工視覺審閱，未push或部署。
