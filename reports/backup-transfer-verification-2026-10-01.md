# V3.4.32 JSON 備份與寵物移轉實測

結果：正式版匯出 → 實際磁碟 JSON → 另一個獨立 origin 的正式匯入介面 → 兩次確認 → 重新整理 → 新分頁重新開啟 → 再次匯出，84 隻寵物與全部 29 個輸出資料欄位一致。未修改 runtime、正式站或使用者存檔。

## 被測版本與隔離

- source 主線：`d73aa36`；runtime source：`f38c78e84b7084e3c499f4ae62750286aea730aa`。
- 實際部署 artifact：`fbb07931fc76df36bef063435230a8ecfe1dc264613af6c3d85adebb1831b017`，manifest SHA256：`b7d1d28a9e0cc287cdae31bf6b6752e25d8b61fd98aef5aae540a0156a0d2c4f`。
- 370 個 manifest-listed 檔案均驗證長度與 SHA256；使用正式 84-pet、3-pool catalog，未以來源樹的 72-pet catalog 代替。
- source `127.0.0.1:49354`、destination `127.0.0.1:49355`，首次啟動必須沒有任何 DB、SW 或 cache，否則拒絕寫入。fixture 全為合成測試資料。
- 歷史備份與 atomic rollback：另一獨立 origin `127.0.0.1:55253`，隨機 `QuestNoteTest-M1-*` DB，完成後只清除該測試 DB。

## 實際驗證

- UI「匯出 JSON 備份」實際產生 Downloads 檔案；重新讀取磁碟 JSON，84 隻、2 任務、2 習慣、1 探險，29 data 欄位與 source 一致。
- UI 選擇該實體檔案，預覽正確；先恢復前自動備份、再確認恢復。自動下載檔案確實含 destination 的舊寵物暱稱「移入前夥伴」、`destination-sentinel` 任務、1234 星塵。
- 匯入覆蓋舊 destination，沒有將舊任務或收藏合併進新存檔。
- 84 隻 petId / owned、1–5 星、不同碎片、1–5 親密度、EXP、暱稱（含中文與 emoji）、取得時間與來源、撫摸時間、羈絆旗標和已提示等級均一致。
- 陪伴仍為 `pet_ur06` 曙綻花后兔，暱稱「花花夥伴🌸」、Lv.5、羈絆解放；新分頁首頁圖片成功解碼為 960px 圖。
- 圖鑑顯示 84/84：既有 56/56、永眠花海 16/16、霜誓峽灣 12/12；各稀有度 N 22、R 19、SR 18、SSR 13、UR 12 均顯示已收集。
- 任務（含完成狀態、子任務、排程）、每日／每週習慣與紀錄、錢包與材料、抽卡與保底、探險、成就／稱號、道具庫存與使用紀錄、工坊、簽到、每日／週任務、探索、營地、收藏里程碑、信件已讀／已領、卡池解鎖與防重複獎勵標記、主題等欄位均逐項一致。
- UI「重新整理 App」後再次逐欄一致；新分頁再開啟後，實際再次下載磁碟 JSON，以 Node deepEqual 比對全部 29 data 欄位成功。
- 缺少收藏欄位、重複寵物 ID、6 星、未來版本：實際 IndexedDB 零寫入；第 4 次寫入 request success 後故意 abort，五個 stores 完整回滾，84 隻寵物保留。
- 實際檔案選擇測試截斷 JSON 顯示「JSON 格式錯誤，無法解析備份檔」，空白檔顯示「備份檔是空的」；沒有恢復預覽。再選有效檔並取消確認，29 欄位仍一致。
- `backup-safety.test.mjs` 18/18；exact-runtime M1 browser suite 14/14；`npm test` 203/203 並所有 reveal-flow assertions 通過；新增 JS 語法檢查通過。

## 例外與測試界線

唯一比較排除的是 `globalMailboxState.lastFetchedAt`：啟動會重新抓公開信箱，更新抓取時間。已讀、已領與其他信箱欄位完整比較，不排除。比對 exportedAt 不屬於 data snapshot，本就會隨每次匯出更新。

通知 token／推播訂閱與本機教學狀態不在可攜備份格式內；跨裝置仍須在新裝置啟用通知，未向正式提醒或回報服務發送測試。舊 reduceMotion 偏好已從產品移除，current export 為 false；系統減少動態仍由裝置控制。

這次是實體磁碟檔＋原生瀏覽器 IndexedDB 的移轉驗證。393×852 畫面檢查與截圖不代表實機 iPhone Safari／獨立 PWA、iOS 檔案選擇器或 OS 推播已實測。

測試工具的 download event 在 IAB 未回傳；因此以 OS Downloads 實際存在的原檔與重新匯出的檔案讀回驗證，沒有用攔截 Blob 或假檔取代 UI 下載。iframe 的部分點擊由鍵盤 Enter 啟動相同實際按鈕；正式 handlers 保持原樣。

## 重跑與證據

`node devtools/backup-transfer-server.mjs <以上 exact artifact 目錄> <隔離 evidence 目錄>` 會配置全新三個 loopback ports。source 完成 seed 後使用 App UI 匯出，將實際下載檔保存在 evidence `transfer.json`；destination 用正常 App「選擇備份檔」匯入、確認、重新整理。頁面「比對下載檔與目前存檔」與「驗證錯誤備份與交易回滾」會輸出詳細結果。頁面拒絕在已有 storage 的 origin 重跑 fixture。

本機 ignored 證據位於 `.dev-backups/backup-transfer-20261001/`：`transfer.json`、`before-import.json`、`reopened-export.json`、`destination-results.json`、`safety-results.json`、`restored-collection.jpg`、`restored-companion.jpg`。備份與截圖未進 Git。測試分頁已關閉，未清除手機／正式站存檔。
