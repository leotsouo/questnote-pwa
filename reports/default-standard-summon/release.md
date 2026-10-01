# V3.5.2 標準召喚預設

每次重新開啟 App 時選擇標準召喚，當次手動選擇其他卡池後，頁面往返與資料刷新保留該選擇。啟動沿用原子的卡池選擇更新，只修改 selectedPoolId；保底、召喚次數、玩家存檔與內容不變。

- 使用者已授權修正並推上正式版。
- [來源 PR #41](https://github.com/leotsouo/questnote-pwa/pull/41)，合併來源 `1b7a599055aa15b8fb441a95aabd8b893b0324dd`。PR 與 main CI 通過。
- 254 項 Node 測試、34 項召喚斷言、隔離瀏覽器首次啟動／手動切換／頁面往返／重新啟動／保底資料保留通過。
- Production artifact `39c40c77e52fd738b90bbd3648f09f6309e59d6ea3e26fb16ce47ee14a0fb529`，manifest SHA-256 `737db27a71c8abcff85fe8231a19b865ccddb5ed060b1b0726e35a1454122882`。
- 全部 417 個 staged Git blobs 均與 immutable artifact 位元組一致。12 項原生 PWA 產物驗收通過。
- 96 位角色／4 卡池 bundle 維持 `8475965d22917f5594a56ba6b5bba21e9c4aa22c4b160b4c000e32608e2bc5df`；保留發布前正式信箱原始位元組，含最新公告與補償。DB/scope 維持 QuestNoteDB、/questnote-pwa/。未部署後端。
- Pages commit `9adc2e99a7978d02f8c4707865a5f5c24378344a`。
- [Pages deployment 36891294364](https://github.com/leotsouo/questnote-pwa/actions/runs/36891294364) 成功；11 個正式 HTTPS 檔案均與 pinned artifact 雜湊一致，確認 V3.5.2 已上線。[HTTPS 核對](live-hashes.json)。

[Node 驗證](tests.log)、[原生 PWA 驗收](artifact-browser.json)、[strict artifact verification](artifact-verification.json)、[標準召喚畫面](standard-default.png)。
