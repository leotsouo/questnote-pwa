# 晴信原野：融合最新正式版的預覽與整包驗收

## 基線核對

2026-10-08 重新 fetch 後，`origin/main` 為 `61d7a139ad4f1225828b5633c9efdd7d2e39a4dd`，`origin/gh-pages` 為 `dfcfd8b0653edba36f83b10c5d86980970ca9990`。正式 HTTPS `release-artifact.json` 回傳 HTTP 200，artifact `88179f282a1fd57cf7ee262de9ad745559d4033d895dc458552618fc9c3022c5`，source commit `61d7a13`，正式版 V3.8.7。工作分支已包含該主線；新池連同最新的語音輸入星塵贈禮信箱組裝為 V3.8.8。重建產物的 `data/global-mailbox.json` SHA-256 與目前主線相同：`47eb1f9a8761869bde7cb006630b95aaaa6898ddba2c9e413c5ee70f41b144ab`。

上一個右側預覽先停在預設的「星旅之原」，後來切到晴信原野；它的固定產物則在最新信箱合入之前組裝。這次已重新組裝，從全新的本機網址進入、略過隔離教學、選定「晴信原野」，親眼核對晴界丹鶴 UR 卡面及 12 位可相遇的夥伴。這個網址的預覽存檔與正式站分離。

## 這次供檢查的固定包

| 項目 | 精確身分 |
| --- | --- |
| 新 `packageHash` | `369fa577d0cb216eebfec558b6986513bc2f3d5214def3ca165828f51cfe90f4` |
| 產物來源 commit | `6952649fc3ce644c7656a43d2047450df5886e01` |
| Candidate ID | `0b00ab77a5a8aad3cf9e93271d98a25c91df1d89ee9d7faf4837d105f7944cda` |
| Candidate manifest SHA-256 | `ef369dc1c14761d5fb961c879222c7e158b4360296d6e67dc58a793c1d3a4bcb` |
| Production artifact ID | `af250b58a7a712856ce2b67d3df1eaac80242158fcde8b4e7d12ec37dc9e324a` |
| Production manifest SHA-256 | `e08a2d79be599f3496097392dbc6a6d870ac2875784e6441d7e5285cf198c8bf` |
| Preview artifact ID | `96c966d318832ec5582d1bd39a5bce717d7fbbff760a5957b1f1f983b5c3e8d6` |
| Preview manifest SHA-256 | `9034c744ea09b16179725e538b98f48009644a1dd7268b76bf19a79e31e011b4` |
| 右側乾淨預覽 | `http://127.0.0.1:60946/questnote-pwa-preview/` |

路徑見 `artifacts-v4.json`，完整驗收輸入見 `release-evidence-v4.json`。兩份產物各 665 個檔案，嚴格 SHA、profile、SW 與 catalog 驗證通過。這次的新池保留 12 張原圖與原遊戲經濟；新增的四章羈絆故事已包含在已審核候選中。先前包的接受紀錄仍保留，沒有套到本包。

## 驗證與限制

- 最新主線融合後 `npm test` 通過，完整輸出為 `latest-main-npm-test.log`。資料與圖像未受最新信箱變更影響；先前 `pools:validate` 為 7 池、0 errors／warnings，`images:check` 覆蓋 140 隻寵物的 card／stage 圖及 8 張地區插畫。
- 重新組裝的固定產物瀏覽器 run `39c730aa-74fc-43bf-a7e0-16fd47c5a0bd`：**19 passed，0 failed**，涵蓋入場、隔離存檔、十連扣款／保障、工坊送禮、探險、手機與離線更新。
- 右側預覽已停在「晴信原野」主卡面。預覽帳戶為全新隔離存檔，星塵 0，因此召喚按鈕暫時不可用；不代表卡池未載入。
- 仍待真實手機與已安裝 PWA 驗證觸控、鍵盤和更新；正式發布後另需 Pages 成功及 HTTPS 逐檔雜湊回讀。

2026-10-08 17:37（台北），使用者對 packageHash `369fa577d0cb216eebfec558b6986513bc2f3d5214def3ca165828f51cfe90f4` 明確表示「通過可以發佈 去跑更新流程」。此核准對應上述 preview／production artifact ID。使用者已知晴信原野的 `animationKey` 為 `none`，並在之後改定新 SOP 為所有池必須有 3000ms 前奏；目前包仍未符合該新要求。此發布依使用者對此確切整包的明確決定執行，不能據此把本包記成符合新動畫規格。

## 正式發布紀錄

- PR #84 已合併；`main` 為 `5af21f55127b1920ba2baec8f1de1dbc4ef3d905`。PR CI 的 `npm test`、卡池資料驗證與圖片驗證通過。
- Production artifact `af250b58a7a712856ce2b67d3df1eaac80242158fcde8b4e7d12ec37dc9e324a` 以 byte-identical tree 推送到 `gh-pages` commit `76cefea20bd5de44da225cc24fb147a20ae18db8`；Pages run [37758910237](https://github.com/leotsouo/questnote-pwa/actions/runs/37758910237) 成功。
- 正式 HTTPS `release-artifact.json` 回讀 artifact ID、manifest SHA-256 `e08a2d79be599f3496097392dbc6a6d870ac2875784e6441d7e5285cf198c8bf` 與 source commit 相符。663 個一般 HTTPS 檔案逐一通過長度及 SHA-256 核對，manifest 本身也相符；`.nojekyll` 是部署標記，不由 HTTPS 路徑提供。版本模組回讀為 3.8.8。
- 發布按使用者對確切 packageHash 的核准執行。晴信原野仍沒有抽卡前奏，這是本次明確接受的規格差異，不能當作新 SOP 動畫驗收通過。未清除正式存檔，也未強制啟用等待中的 service worker。
- 實機手機與已安裝 PWA 的更新仍待裝置驗證；使用者可在線關閉其他 QuestNote 視窗後正常重開，讓 verified service worker 更新。
