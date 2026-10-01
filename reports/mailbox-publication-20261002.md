# 2026-10-02 更新公告與補償發布

依 docs/mailbox-publishing.md 發布，使用者已明確授權公告與補償。

- 上則公告 V3.4.21；正式 HTTPS 版本讀回為 V3.5.1。整理 V3.4.22–V3.5.1 已發布功能與修復，依各功能 production receipt 與最新親密度正式發布收據核實。
- 新公告 ID：2026-10-v351-cumulative-update；minAppVersion 3.5.1，不過期。
- 新補償 ID：2026-10-frequent-updates-compensation-01；minAppVersion 3.0.0，1,000 星塵、10 冒險能量、3 份 item_small_spirit_food；期限 2026-11-02 23:59:59 +08:00。每份本機資料手動領取一次。
- validateMailboxDocument 通過，errors/warnings 均為空；比對來源與正式站原七封信完整一致，新文件保留所有舊信與 reward identity。沒有更動 App、SW 或 artifact。
- 公告來源提交：04cb339。正式 Pages 提交：b434f218c1cedee03d88150ea6f985f648f1e8f0。兩分支 JSON Git blob 相同：c56f7f4bfad26581533c3bb617024be6c6872740。
- Pages run 36889153049 completed/success：https://github.com/leotsouo/questnote-pwa/actions/runs/36889153049。
- 正式 HTTPS data/global-mailbox.json 已讀回，與來源位元組完全一致；SHA-256：2c252ab1b9a7303a580b6ffcf539865fd4599303b054879b4eb10b7e334909b6。
- 未操作任何使用者 IndexedDB 或代領獎勵。使用者開啟 App／回到前景／刷新信箱後取得；本次未執行實際玩家存檔領取。
