# V3.8.0 正式發布收據

使用者授權正式發布，並要求先等待及拉取最新教學。已完成 V3.7.0 最終主線 a46cf59 的整合；沒有使用根目錄舊草稿或覆蓋教學 chat 工作區。

- 來源提交：5473d5b226b6eaa56a97302a84a9eba33042de19；PR #75 CI 通過，main 合併提交5b2695452173a9bda7dea987ace2fe8f3a5fc7b2。
- production artifact：173e026b448bef3001c8d220fd36465b2ec485b03b2c61acff918d10dbc66ca6；manifest SHA256 e2497778fd5c2a0b99eccbb7379dee33f96e23a8b59a2f43a38a48b3cdad306b；scope /questnote-pwa/，QuestNoteDB。
- Pages 提交：774259f902c581171b6a8b0657a82506a72490dd，從正式 V3.7.0 3dbba4025a549f2079a722327f3725f0a2309efb 正常快轉；沒有 force push。
- [正式 Pages run 37201996845](https://github.com/leotsouo/questnote-pwa/actions/runs/37201996845) 成功；[正式 QuestNote](https://leotsouo.github.io/questnote-pwa/)。
- 固定 production／preview 產物嚴格驗證通過；18/18 原生瀏覽器安裝、更新、離線、資料隔離與核心交易檢查通過。preview 僅本機驗證，未更新 HTTPS preview。
- 全部619 Git blobs 與固定產物位元組完全相符。正式 HTTPS 617 runtime檔案加manifest共618項讀回通過，.nojekyll另以Git blob驗證。卡池catalog與最新公告原始內容均與正式V3.7.0相同。
- 真實正式HTTPS的乾淨桌面瀏覽器context：版本3.8.0、正確production artifact與DB、worker控制、易讀模式切換與重載保存均通過；任務／收藏／wallet／gachaStats未變，沒有注入合成貨幣或任務。live-browser.json／live-senior-home.png為直接讀取正式站證據。
- 完整 Node336+14+12項與揭示斷言；Normal／Senior17組、guided21組、交叉guided3組通過，詳見integration.md及完整logs。

第一次正式瀏覽器腳本誤點隱藏checkbox而timeout，改為點擊可見模式label後重跑通過；這是驗證脚本修正，runtime與固定產物沒有再次修改。其他原始失敗亦保留。

未宣稱實體iPhone／VoiceOver已驗收。主畫面PWA請保持連線，關閉其他QuestNote視窗後重新開啟，或按「更新並重新載入」，不要清除資料。設定→易讀模式即可使用。
