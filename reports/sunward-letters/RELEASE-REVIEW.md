# 晴信原野 · 驚喜自審整包驗收

**待使用者整包驗收；未發布。** 本摘要綁定 `packageHash`：

`0e1290bce15e048bd5adac4ccb8c8656592371e4a3de5ed622cfea515970207a`

## 內容

- 從開工時正式 V3.8.2 企劃，後續整合已發布 V3.8.6 的任務精靈與手機修正，待發布版號 V3.8.7。
- 新池 `sunward_letters`「晴信原野」：12 隻原創動物，N 3／R 3／SR 3／SSR 2／UR 1；雨後重建路標與送信的故事。每隻含 Lore、對話、偏好與探險專長。
- 新工坊食物 `item_sunward_grain_ring`；沿用迷霧森林及豐穗遠郊，沒有新地區、額外解鎖或贈寵。100 星塵單抽、1000 星塵十連、既有機率與保底不變。
- 池級入場故事及暖青／麥金召喚背景。抽卡使用既有 SSR／UR 正式角色揭露；固定產物動畫檢視不呼叫錢包、抽卡、收藏或保底 API。

## 精確身分

| 項目 | SHA-256／commit |
| --- | --- |
| Source commit | `1746fac9daab6e1608cfb298ef1b3e67e4e8d637` |
| Candidate ID | `f0ddd51a16e30c31f7f2262e4804e366ed452ddcfe4de16132b13ef521b87fbf` |
| Candidate manifest SHA-256 | `c8901c7b8fa645b29b15f1f31479a5136b313a9900c8bb167519b2cfe8499059` |
| Preview artifact ID | `55be4cc8b8700a5c454308078a4113d1169d20396bf38cd58eb9537d7dd51dae` |
| Preview manifest SHA-256 | `7d036c8467b41d7b1c48a041e28ada906bdd78392fbdccb78d93ae273c31609b` |
| Production artifact ID | `ee44ee416cbd1d42897bc79f431fd250b1c36bf727d80e243142a560e23325ed` |
| Production manifest SHA-256 | `bc7544603afb95bae634aee837426d31aa3323492f637890439b981a6bd7b72a` |

固定預覽 `/questnote-pwa-preview/`，正式待發布 `/questnote-pwa/`。兩個產物同一內容 bundle（`a2ce27259fd485ef4d61b5aceea55d0c9e82e1db7539a43d7e2dbd8b8ea91b34`），分別使用隔離存檔與快取。驗收時本機預覽為 `http://127.0.0.1:51616/questnote-pwa-preview/`；此位址僅在本機測試伺服器運行時有效。固定產物目錄與清單見 `artifacts.json`，可重播動畫頁見 `animation-review.html`／`devtools/sunward-animation-review-server.mjs`。

## 審查與驗證

- 五階段 brief、plan、content、prompts、images 均以最新輸入確切雜湊重新核准；圖像使用內建 `image_gen.imagegen`，確認使用已含額度、未購買額外點數。12 張原圖逐張比對 160 px 卡片辨識度、故事動作、裁切與一致性；不合格草稿保存在 `first-attempts/`，選定原圖 SHA-256 與審查理由見 `image-review.json`。
- `node --check`、`npm test`、`npm run pools:validate`、`npm run images:check`、`npm run test:pool:release`、`node --test devtools/companion-ceremony.test.mjs`：通過。卡池 staging errors 0；12 個 `PET_NO_STANDARD` 是限定池隔離，12 個 `IMAGE_LARGE` 是 2–5 MB 原圖警告；發布衍生 384／960 px WebP 已固定。
- 固定產物瀏覽器 run `2c073184-47de-4f9d-b656-29011833f40d`：**19 passed，0 failed**。驗證首次入場、預覽／正式隔離、十連一次扣 1000 星塵、SR 十連保障、重複碎片、工坊製作與偏好送禮（150 羈絆經驗）、探險 `gatherer` 專長、更新、快取修復、斷線啟動與存檔持續性。測試網址 `http://127.0.0.1:54137/test/`。
- 最終固定 preview 的實際模組演出：3.4 秒入場、兩位 SSR 與一位 UR、載圖成功（UR 960×960）、略過／繼續、Escape、減少動態、固定十連重複 1／6 及 5／10。實際 App 切池與 393×852 卡片已視覺審查，無橫向溢出；完整三主題、320／393 寬及模擬 200% 字級由 19 案例驗證。

## 正式環境與限制

- 開工正式 V3.8.2；最後核對正式 HTTPS `release-artifact.json` 是 V3.8.6 artifact `a8c463442773863088aefbd5164ad1a0cd0747d373372c854e9ba10ae47f0d0e`，source `6cf303a4cface9c32cf5ebca9a73c1cb490258f9`。`gh-pages` 後續 `bc5f30f` 與 `main` 後續 `45e1c29` 僅更新獨立信箱 JSON，不改 App 產物。正式網站尚未包含本新池。
- 尚待真實手機／PWA 安裝情境驗證觸控、鍵盤與網路切換；正式 HTTPS 發布後仍須核對實際 manifest、版本、內容與離線。這些是發佈後關卡，不能由本機瀏覽器測試冒充。
- 來源整合與網站產物發布是兩個不同步驟。現階段僅本地分支與固定產物，未 push、未 merge、未部署。`poolReleaseReview.mjs` 回傳 `ok: true`、`releaseReady: false`、`nextGate: human_whole_package_acceptance`；CLI exit code 1 是刻意保留使用者驗收關卡。

只有使用者對上述 `packageHash` 完成整包驗收且明確說出「可以發布」，才進行來源整合、正式產物推送與 HTTPS 回查。若任何來源、候選、產物或驗收證據變動，須重新計算整包雜湊並再次驗收。