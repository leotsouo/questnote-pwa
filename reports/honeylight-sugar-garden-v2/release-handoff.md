# 蜜光糖庭 V3.4.34 — 正式推送前交接

發布前準備完成；正式版尚未推送，最後核准只由使用者給予。12 隻配置 N3／R3／SR2／SSR2／UR2；雙 UR 焦糖布蕾海獺與千層奶霜天鵝。12 隻第一抽開放，無解鎖／贈寵，價格／稀有度機率／保底沿用既有設定。核准圖片 bytes 完全保留，本次發布準備沒有圖片生成呼叫或額外費用。

## 審核與產物

- Active candidate：`42f8f86ac3f9ce330e0b401575abdb96b819dbf123c27de9953d498445b30ad0`；五階段核准有效，stage dry-run／build／rebuild 同 hash。
- Artifact source：`c8a0aef8804e6213a0856d83e7155c8f1b3dbd2d`。後續 evidence 提交及 main 整合不改此 runtime/content 快照；不因文件 HEAD 變更重新組裝已驗收產物。
- Production artifact：`e84e9462d4f2587fae3e4b7a0e1977a6ae20680c4793a099544279d474a9978a`；manifest SHA-256：`cc77cc06a790fe55de3b96d52b1bc2081da21d45bea55b851b228afd1b3d0426`。
- Preview artifact：`2a4f2ef20ae52f8310a8a3406d5be77e0bf17f49c03df2cf9cfd637be370b005`；manifest SHA-256：`c4a055b376b26c3beb660629ae41821168ef16a58d9643325657c71df6d3b69f`。
- Catalog SHA-256：`d826c45c22ed3d66cfbff9e1b54dc4732570455aa0c48b78eb4da13abfec6cf5`。96 pets／96 Lore／4 pools／4 series；已發布 84 隻逐筆保留。
- production scope：`/questnote-pwa/`／QuestNoteDB；preview scope：`/questnote-pwa-preview/`／QuestNotePreviewDB，各自獨立 cache。
- Authoring 全備份：587 files，逐檔 hash 通過，位置見 [authoring-backup.json](authoring-backup.json)。舊 receipts／原圖／草稿／四個 candidate／前版產物與證據全保留，不得發布被取代候選。

## 實際驗證

- 最終 `npm test`：192 個 main Node cases＋11 個 theme cases，0 failures；reveal-flow 35 assertions PASS，見 [node-tests-v3434.txt](node-tests-v3434.txt)。
- `pools:validate`、96×2 WebP check、獨立 synthetic pipeline release rehearsal 通過。synthetic fixture 沒有混入真實候選。
- [real-content-validation.json](real-content-validation.json)：兩隻 UR 正常抽與第100抽保底、SSR30保底、單抽／十連扣款、無跨池／贈禮／解鎖。
- [artifact-browser.json](artifact-browser.json)：最終 production／preview 原始 bytes 的 12/12 native browser 驗收，包含舊 SW 過渡、profile隔離、503離線與成長教學。
- [actual-update-browser.json](actual-update-browser.json)：真正 V3.4.33 → V3.4.34 的 8/8 一鍵更新驗收，五個 stores／theme／未儲存文字保留、多視窗與進行中操作阻擋、完全快取503可更新。
- [manual-app-acceptance.json](manual-app-acceptance.json)：真實內容、隔離測試玩家，單抽／十連雙UR演出、故事原圖與reload持久化；最後公開簡介收斂前後僅此一欄不同，且最終產物已重新跑兩套 native 驗收。實體 iPhone 安裝／standalone 尚無桌面可替代的 device 證據。
- [final-app-preview.jpg](final-app-preview.jpg)；可互動預覽：http://127.0.0.1:58456/questnote-pwa-preview/（本機 server 需繼續執行）。3000 測試星塵與全12隻收藏只在隔離預覽，不是正式贈寵設定。

## 最後一個發布關卡

正式站仍 V3.4.33：gh-pages `3942a7f35287a0aa2c3ac343b45115ec4948a380`；舊 artifact `4e04d3a13c9a5c3759130efcfc7bea52885f21338dc3b3bff12c0eedf00d492a`，7個正式HTTPS檔案讀回一致。

本機發布分支 `codex/honeylight-production-v3434`，提交 `0e00ce0c57c5a236cd74ffa8aa0231719f74225e`，parent 是上述 gh-pages。408 個 staged／committed Git blobs 均與不可變產物一致；分支沒有 remote push。完整位置／hash／復原界線見 [deployment-preparation.json](deployment-preparation.json)。Source PR／main 整合與 Pages 發布分開紀錄在 [source-integration.json](source-integration.json)。

等使用者明確說「可以發布」後，先 fetch 並確認正式分支與HTTPS baseline仍一致，再正常 fast-forward 推送此已審核提交到 gh-pages；禁止 force push。確認 Pages build 成功與正式 HTTPS artifact／manifest／catalog bytes一致，再宣告發布完成。若正式 baseline 已變，先整合新增變更與驗證，不能覆蓋他人更新。

需要撤回卡池時用保留所有96個pet IDs／Lore／圖片的 forward release 關閉新池，不部署84隻舊 bundle、不刪玩家資料。candidate 的 releaseReady:false 保留原意，不冒充最終正式核准。

## 正式卡池發布後才討論

依使用者最後指示，發布完成後進入規劃模式討論：把新增角色後的「工坊可製作食物檢視」及「是否新增探險地區」納入未來卡池發布流程。本次只記錄後續需求，未新增食譜、地區或改流程，也未啟動這些工作。
