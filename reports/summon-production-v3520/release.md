# V3.5.20 相遇與收藏正式整合

使用者在已驗收 V3.5.19 後明確要求：「幫我推上正式版」。本次將已確認的新介面接回原生抽卡、收藏與存檔；不新增卡池、角色、圖片、機率、費用或 DB 欄位。

正式基準：2026-10-03 HTTPS 讀回 V3.5.10，artifact `4f3b66f218a858f2b42a324be80dab4beb0b294f90ab542f2d955cb3f54c2009`，source `8c9a3edae21fbad75c926cfb337d44c660d9a821`。Pages 使用 gh-pages 根目錄，main 僅為來源。

新版使用原生 gachaService 原子交易。展示種子、固定抽卡及清空收藏邏輯未移入正式 renderer。結果呈現只消費交易結果，單抽／十連碎片欄位轉接，演出或略過不寫獎勵。完整六池登場、SSR／UR、全寬 1:1 結果圖、公開介紹、圖鑑篩選及養成入口沿用驗收設計。陪伴與暱稱透過原有服務持久化。

隔離 localhost:4194 原生存檔驗證：10000 星塵十連後為 9000；十張總覽含第 7／10 張同一墨殼蝸牛，各 +1 碎片；UR 創世星龍 +20。略過直接總覽，返回可再單抽；單抽後 8900 星塵，棉雲羊 +1，滿星仍累積。結果圖片與容器同為 683.333px 正方形、cover、載入完成且頁面無橫向溢出。將棉雲羊設為陪伴後重新整理，首頁仍顯示棉雲羊、餘額 8900，沒有重複扣款或回到展示種子。新 renderer 不干擾保留的本機展示 renderer。

三套 Theme 於 393×852 原生 App 均載入角色圖且無橫向溢出；標準字級首屏召喚按鈕底部 y=670.125px。320px viewport／200%（32px）字級 fixture 使用真實 App，實際可用寬 305px（含捲軸），scrollWidth=305px，正常捲動；圖片見 screenshots。

最終 runtime source `fd30782f` 的 production artifact `289e965079051be3e843872247e88a424436a2718460f1e6b38b1f8eb1c65ce9`；preview `4dddac050996ddc96265d7c615bad0462b72f3b858d485623af418f4a24f350e`。`artifact-browser-qa.json` 綁定這兩個 artifact，12 項全部通過，包含首次 bootstrap 拒絕缺檔／不一致、真實舊 SW 遷移、DB/cache 隔離、eviction、503 下离線啟動及教學保留。第一次工具仍讀取舊隱藏 DOM，已改成實際可見的規則 dialog、價格與完整圖鑑，再於新 origin 重跑。

部署產物所有 606 個 staged Git blobs（含 manifest）已逐檔比對 bytes／SHA-256，tree `9d5212c2378f7e809914c68c8a28422c668ae91b`。後續證據提交只包含測試／文件，runtime hashes 不變；manifest source 保留實際凍結來源。正式推送後再記錄部署 commit、Pages 建置與 HTTPS 讀回。

必要測試：npm test 共 303 項通過，另兩項原生結果與無展示寫入檢查通過。卡池、圖片及 release pipeline 檢查另存驗證紀錄。iPhone VoiceOver、原生字級與觸覺未由桌面瀏覽器代驗。
