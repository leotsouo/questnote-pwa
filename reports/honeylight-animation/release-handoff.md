> 最新文案修訂：入場台詞改為「糖庭亮起／甜蜜相遇」，共8字。新 candidate／artifact／本機發布提交如下。runtime、圖片及抽卡機制逐 bytes 相同；舊完整 App、更新與真實抽卡驗收沿用為歷史回歸證據，未冒充本次重跑。本次重新完成候選核准、catalog驗證、5項動畫邏輯、14項瀏覽器動畫驗證及412檔產物驗證；見 short-copy-review.json。舊65b9755部署提交已被取代，不可推送。

# 蜜光糖庭動畫發布交接 — 2026-10-01（Asia/Taipei）

專屬入場、糖果／奶霜抽卡前奏、暖金 SSR、焦糖海獺與奶霜天鵝雙 UR 已完成。使用既有核准 PNG 和本地 CSS/SVG，無新生成、音效、付費 API 或新增依賴。所有舊已發布內容、機率、保底與卡圖原始 bytes 保持不變。

- Runtime source：`43680ad3ad5d7309f368c180847f7d64b612384e`；新 candidate：`73f205a59d5b2cccd37fcf82aef2fa705bf19d1164bf493d5d1f9a267e87a0a0`。保留原 84-pet canonical baseline、所有舊 receipts／candidates；12 PNG hashes 相同。
- Production：`7daeef4fe3eea6370c7a1ce6fa5045089a221a7c7624ee5c7a010fee7fb33b2c`，manifest SHA-256：`c79adaf819c1258c556daacff0e352626a862872fb840fb1bf39dce3b8279e0b`。
- Preview：`c16463778d483d8b47de2f89e42377ced0714eadc1bb20afc982d2659c3efc2f`，manifest SHA-256：`876838ac001798de52ea96a23ad4967ce6f8f80fdb963b7f72b5227051853041`。兩者412個檔案逐檔驗證，dry-run／重建／重用一致。
- 本機發布提交：`9e815676db8ff3e203391894090a52b1d5090129`，分支 `codex/honeylight-animation-production-v3436-short-debut`；parent仍是V3.4.35正式`77d30b869ca69cdf5a9b56b127ab13d5e2e6056b`，412 Git blobs與審核產物完全相同，未推送。
- Node tests 220/220、reveal-flow assertions、catalog與96×2圖片、Pipeline release rehearsal均通過。動畫桌面14/14、393×852手機尺寸14/14；完整App12/12、實際V3.4.35→V3.4.36更新8/8。
- 真實隔離App：3000→2900星塵的單抽保底天鵝UR，接著十連→1900星塵、10項結果含重複角色完整呈現。每次僅扣一次；手機總覽無水平溢出。測試只在全新本機origin，不改正式站／個人存檔。
- 完整authoring archive共884檔逐SHA驗證，位置與清單見authoring-backup.json。

可操作App預覽：http://127.0.0.1:55747/questnote-pwa-preview/
純動畫重播：http://127.0.0.1:54939/devtools/honeylight-animation-preview.html
詳細證據：animation-review.json、presentation-browser.json、presentation-mobile-browser.json、artifact-browser.json、actual-update-browser.json、manual-app-acceptance.json。

尚未自行merge來源或推送gh-pages。使用者說「可以發布」後，先重新核對origin/main、origin/gh-pages及正式HTTPS。source整合的runtime須與上述pin完全一致；若有其他改動，重新驗證／組裝。確認後才以準備提交fast-forward發布，再驗證Pages建置與正式HTTPS bytes。舊無專屬動畫的0e00ce0，以及已被新版取代的V3.4.34動畫提交77ab1b5與其產物只保留歷史，不可推送。

目前驗收為Chromium與手機尺寸模擬，未宣稱實體iPhone／Safari通過。工坊可製作食物／探險區域的流程規劃，依使用者要求留到正式卡池發布後討論；每次新企劃先同步最新正式版與reviewed source baseline。
