# 蜜光糖庭 V3.4.36 正式發布 — 2026-10-01（UTC+8）

使用者明確回覆「可以發布」，包含先前交接提出的既有公開倉庫來源與驗收資料推送。PR #21 的 CI 通過後合併，來源整合提交 `2dd6bd88ecc7d0737b2e3fb971c3d2c8e574fe48`；與核准 runtime `43680ad3ad5d7309f368c180847f7d64b612384e` 逐檔差異為空。

正式 `gh-pages` 提交 `9e815676db8ff3e203391894090a52b1d5090129` 為 V3.4.35 的 fast-forward 更新。412 個 Git blobs 均與 immutable artifact 相同，GitHub Pages run 36777867059 成功；正式 HTTPS 的30檔SHA-256／長度比對全通過，涵蓋14個全部變更檔案、12張核准PNG、manifest、正式工坊資料與信箱。

- 網站：[QuestNote](https://leotsouo.github.io/questnote-pwa/)
- Source PR：[PR #21](https://github.com/leotsouo/questnote-pwa/pull/21)
- Pages：[run 36777867059](https://github.com/leotsouo/questnote-pwa/actions/runs/36777867059)
- Artifact：`7daeef4fe3eea6370c7a1ce6fa5045089a221a7c7624ee5c7a010fee7fb33b2c`；manifest SHA-256：`c79adaf819c1258c556daacff0e352626a862872fb840fb1bf39dce3b8279e0b`。
- Candidate：`73f205a59d5b2cccd37fcf82aef2fa705bf19d1164bf493d5d1f9a267e87a0a0`；正式catalog SHA-256：`f00f02ed3dc6414a7bdc41b1032d1f021e6a19edd1b1f5792f27725ec07abc45`。

正式 catalog 96隻／4卡池，蜜光糖庭12隻（N3／R3／SR2／SSR2／UR2）皆第一抽開放。糖晶溫室入場、SSR暖金效果、焦糖海獺與奶霜天鵝UR已隨正式runtime發布；入場台詞為「糖庭亮起／甜蜜相遇」。核准卡圖bytes、原價格、機率、保底、舊角色和工坊功能保持不變。無額外付費API、產圖或新音效。

既有安裝版依正常waiting-worker更新流程升級；沒有操作玩家資料、正式抽卡或強制更新，也沒有宣稱實體iPhone／Safari驗收。prepared receipts／舊candidate／產物與舊`productionPushed:false`紀錄均保留為當時歷史；本文件與production-release.json為最新發布狀態。

卡池已正式發布，後續才進行工坊食物需求、探險地區需求與發布流程的規劃討論；每次企劃前先同步最新實際正式版與對應reviewed source。詳細逐檔證據見production-live-hashes.json。
