# 蜜光糖庭 V3.4.33 — 正式推送前交接

發布前準備完成；正式版尚未推送，最後核准只由使用者給予。12 隻配置 N3／R3／SR2／SSR2／UR2；雙 UR 焦糖布蕾海獺與千層奶霜天鵝。12 隻第一抽開放，無解鎖／贈寵，價格／稀有度機率／保底沿用既有設定。核准圖片 bytes 完全保留，本次發布準備沒有圖片生成呼叫或額外費用。

## 審核與產物

- Active candidate：`6192f3b1e821fb3ec2e1f5edfb369a1d6dd8ba2c17e8fd0b0eaea5e5a8b90583`；五階段核准有效，stage dry-run／build／rebuild 同 hash。
- Artifact source：`4bfe77043d4a4df8ab64b4391f6d8eb3cd898887`。後續 evidence 提交及 main 整合不改此 runtime/content 快照；不因文件 HEAD 變更重新組裝已驗收產物。
- Production artifact：`ddadc2ef1c539ca1b121d57478c19f5d13ff4a6c22e1de865405dcd812c0119e`；manifest SHA-256：`924927d4d7cde985d81e057949cdc458cb06f00824b2efa35ef625aea7ea1be2`。
- Preview artifact：`04404828ccd5c6282142fbc0d481eca2c8a1c7aee799c6b54a4eed6fb62d2071`；manifest SHA-256：`17f6d7c8820f3972e9d1b98b33c10d825e3c7f02584bb8366933835746a8e43e`。
- Catalog SHA-256：`d826c45c22ed3d66cfbff9e1b54dc4732570455aa0c48b78eb4da13abfec6cf5`。96 pets／96 Lore／4 pools／4 series；已發布 84 隻逐筆保留。
- production scope：`/questnote-pwa/`／QuestNoteDB；preview scope：`/questnote-pwa-preview/`／QuestNotePreviewDB，各自獨立 cache。
- Authoring 全備份：528 files，逐檔 hash 通過，位置見 [authoring-backup.json](authoring-backup.json)。舊 receipts／原圖／草稿／三個 candidate／前版產物與證據全保留，不得發布被取代候選。

## 實際驗證

- 最終 `npm test`：192 個 main Node cases＋11 個 theme cases，0 failures；reveal-flow 35 assertions PASS，見 [node-tests-final.txt](node-tests-final.txt)。
- `pools:validate`、96×2 WebP check、獨立 synthetic pipeline release rehearsal 通過。synthetic fixture 沒有混入真實候選。
- [real-content-validation.json](real-content-validation.json)：兩隻 UR 正常抽與第100抽保底、SSR30保底、單抽／十連扣款、無跨池／贈禮／解鎖。
- [artifact-browser.json](artifact-browser.json)：最終 production／preview 原始 bytes 的 12/12 native browser 驗收，包含舊 SW 過渡、profile隔離、503離線與成長教學。
- [actual-update-browser.json](actual-update-browser.json)：真正 V3.4.32 → V3.4.33 的 8/8 一鍵更新驗收，五個 stores／theme／未儲存文字保留、多視窗與進行中操作阻擋、完全快取503可更新。
- [manual-app-acceptance.json](manual-app-acceptance.json)：真實內容、隔離測試玩家，單抽／十連雙UR演出、故事原圖與reload持久化；最後公開簡介收斂前後僅此一欄不同，且最終產物已重新跑兩套 native 驗收。實體 iPhone 安裝／standalone 尚無桌面可替代的 device 證據。
- [final-app-preview.jpg](final-app-preview.jpg)；可互動預覽：http://127.0.0.1:53486/questnote-pwa-preview/（本機 server 需繼續執行）。3000 測試星塵與全12隻收藏只在隔離預覽，不是正式贈寵設定。

## 最後一個發布關卡

正式站仍 V3.4.32：gh-pages `505da31a7a97084c9a2b6e2b94842e2a3f1bef97`；舊 artifact `fbb07931fc76df36bef063435230a8ecfe1dc264613af6c3d85adebb1831b017`，7個正式HTTPS檔案讀回一致。

本機發布分支 `codex/honeylight-production-v3433`，提交 `724bb9b1fc225162f065521c7a68badc171556a3`，parent 是上述 gh-pages。407 個 staged／committed Git blobs 均與不可變產物一致；分支沒有 remote push。完整位置／hash／復原界線見 [deployment-preparation.json](deployment-preparation.json)。Source PR／main 整合與 Pages 發布分開紀錄在 [source-integration.json](source-integration.json)。

等使用者明確說「可以發布」後，先 fetch 並確認正式分支與HTTPS baseline仍一致，再正常 fast-forward 推送此已審核提交到 gh-pages；禁止 force push。確認 Pages build 成功與正式 HTTPS artifact／manifest／catalog bytes一致，再宣告發布完成。若正式 baseline 已變，先整合新增變更與驗證，不能覆蓋他人更新。

需要撤回卡池時用保留所有96個pet IDs／Lore／圖片的 forward release 關閉新池，不部署84隻舊 bundle、不刪玩家資料。candidate 的 releaseReady:false 保留原意，不冒充最終正式核准。

## 正式卡池發布後才討論

依使用者最後指示，發布完成後進入規劃模式討論：把新增角色後的「工坊可製作食物檢視」及「是否新增探險地區」納入未來卡池發布流程。本次只記錄後續需求，未新增食譜、地區或改流程，也未啟動這些工作。
