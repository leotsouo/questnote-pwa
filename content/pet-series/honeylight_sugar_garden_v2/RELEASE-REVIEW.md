# 蜜光糖庭 — V3.4.33 發布準備

使用者已核准目前 12 張卡圖，並授權完成所有發布前工作；正式站推送仍須等待使用者最後說「可以」。這是正式內容候選，不是 synthetic 卡池。

配置為 N×3／R×3／SR×2／SSR×2／UR×2。雙 UR 為焦糖布蕾海獺 `pet_ur09` 與千層奶霜天鵝 `pet_ur10`；SSR 為琉糖星翼蝶與蜜曦盛宴小熊貓。全部第一抽開放，無解鎖、無贈寵。沿用每抽 100、總 UR 機率 2%、SSR 機率 3%、SSR 30／UR 100 保底；主打角色不另加權。

天鵝保留使用者要求的特別可愛原圖。12 張 PNG 皆沿用既有生成 bytes，本次稀有度與發布準備未呼叫生成服務、未增加生成費用。既有 default 呈現以天鵝為主視覺，海獺與兩隻 SSR 為 featured，召喚使用原有標準演出。

五個 stage 皆有效核准。Active candidate 為 `12f7ffb07c56d1df5f7e6f70728e881455b5254a5b6fac6e813773373fcaf046`；同一輸入重建完全相同。先前候選 `1ce366630024812a0be270e6f796ae99965457c47188e5f2556fe9a309133905` 僅保留歷史，不得發布。舊 `honeylight_sugar_garden` 草稿已被本版取代，保留 reservations 與生成歷史，不得與本版一起發布。

完整候選為 96 寵物、96 Lore、4 pools、4 series，既有已發布 84 隻未刪改。source main 先前只有 72 隻，本功能分支另外完成 reviewed source promotion：補上已發布霜誓峽灣 12 隻及本次蜜光糖庭 12 隻；不修改 frozen legacy catalogs 或信箱。後續卡池可從整合後的累積 authoring source 開始。

本次實際卡池驗證確認兩隻 UR 都能正常抽得及於第 100 抽保底取得，SSR 第 30 抽保底、單抽／十連扣款、無跨池候選、無贈寵，以及 84 隻 baseline 全部保留。圖片工具通過 96×2 衍生圖檢查。完整 Node 回歸、召喚 assertions 與 theme tests 通過；synthetic pipeline release rehearsal 另用隔離暫存，沒有混入正式候選。

工程測試修正的是舊測試對「只有兩池／72 隻」的固定假設，改為檢查舊池精確候選、所有原始欄位與不可變 legacy bytes，並確認 modern bundle 包含新增內容；沒有改召喚 runtime 規則。

完整 canonical authoring root（471 files，含 84 隻 baseline、兩版草稿、全部 receipt／PNG／歷史 candidate）已備存在 repository 外的可持久保存目錄，逐檔 hash 驗證通過。位置見 `reports/honeylight-sugar-garden-v2/authoring-backup.json`。Native pipeline 命令繼續使用 AUTHORING-LOCATION 指定的 84-pet canonical root，不能替 pipeline baseline 改 hash。

正式站目前 V3.4.32；本次準備使用其最新一鍵更新 runtime。最新 source main、gh-pages 與 7 個正式 HTTPS 檔案均已比對，既有 bundle 保持 `3dfd5055f9c2d2d288ab7e235d4c85202899f0ecba49a1b2473d505ba3e9ff32`。production artifact scope 固定 `/questnote-pwa/`，preview 為 `/questnote-pwa-preview/`，各有獨立 database/cache。最終 artifact pins、native browser 驗收與推送前交接將記錄在同名 reports 目錄。

實體 iPhone 安裝／standalone 行為不由桌面測試推定。正式發布前仍保留最終使用者 go-ahead；內容 withdrawal 必須保留取得過的 pet IDs／Lore／圖片，不回退玩家資料、不直接部署只有 84 隻的舊 bundle。
