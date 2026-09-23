# 霜誓峽灣：冰河模板與 plan 交接

後續紀錄：使用者已於同日另以「核准這 12 隻」批准 plan，目前進入 [content 審閱](./frost-oath-fjord-content-handoff-2026-09-23.md)。下方保留當時 plan 交接狀態，供追溯。

2026-09-23，Asia/Taipei。狀態：本機工程前置完成；真實內容 workspace 已建立；brief 已核准；plan 等待使用者審閱。沒有正式發布。

## 授權與內容狀態

使用者先指定北歐維京文化、勇敢熱血、同世界新地域、12 隻、全員第一抽開放、冰河抵達感與無題材禁區，之後以「核准 進到下一階段」核准企劃。執行前已說明採推薦的 UR A「破曉誓角麝牛」與冰河演出方案；核准依據與完整產品範圍保留在 [企劃](../docs/card-pool-proposals/frost-oath-fjord.md)。

`content/pet-series/frost_oath_fjord/` 是準備正式使用的原創內容 workspace。12 隻新角色的名稱、構圖、個性及相互關係已填入 plan；不是測試 fixture，也未用測試圖或複製既有 Lore 充當新內容。Pet、Lore、pool 文案及 prompts 仍保留 init scaffold，images 為空，尚無 staging 目錄。

Pipeline 原生配置的 ID：N `pet_n20`–`pet_n22`、R `pet_r17`–`pet_r19`、SR `pet_sr13`–`pet_sr15`、SSR `pet_ssr08`–`pet_ssr09`、UR `pet_ur07`。全部為 `base`，brief 的 `unlock` 為 null；不改號、不修改 reservations。

已讀取實際 brief 與最新 status，再以 CLI 記錄使用者的企劃核准。reviewer `user-via-chat-2026-09-23` 表示代理依本對話記錄的核准，並非身分簽章；history 只有一筆 brief receipt。第一次封存因 Windows rename 回報 EPERM 失敗，檢查確認 history 為空、無殘留 lock 或 snapshot 後，重新讀 status 並以同一 hash 重試成功，未手改 approval history。

- baseline SHA-256：`7fc0939c4d680b3a95ca902a0792e15dfa838d6f080c167bc67fb63e2d92606d`。
- tools SHA-256：`09b569be007620bd04e7d8ca5c3fda610c93349b0e99a9be1373639a00cd5a7b`。
- 已核准 brief outputHash：`a55283d88b59c30c2169a3a4fff2a5ef0ac81cd922dfc12d575146b1e6b776ad`。
- 目前待審 plan outputHash：`9cc9098621403aedda8abd272044eac3d055580db5dace27cd59fd9ed6b463f4`。
- `nextStage: plan`、`readyToStage: false`、status errors 為空。

這些 hash 是此次交接的紀錄。下次批准前仍須重新執行 status、閱讀當前 bytes，不可直接沿用本報告 hash。

## 冰河演出工程

新增受控 `glacier_arrival` theme／summon registry，Pipeline 可建立對應 scaffold。場景由程式內固定 SVG／CSS 構成：冰壁分開、水道展開、船影與岸邊暖色航標，最後銜接誓紋及既有稀有揭示。沒有把任意 HTML 或程式碼放入 catalog。

`playThemedSummon` 依 animationKey 選擇場景，沿用既有結果、單抽／十連 summary、SSR+ 順序、略過、reduced motion 與錯誤復原。既有 `playDreamBloomSummon` 保留相容入口。UI 在交易完成後才呼叫呈現；場景程式不開 DB、不抽 RNG、不計算掉落或扣款。錯誤結束時補齊 key listener cleanup。

App 版本與 preview cache 同步為 V3.4.7／`questnote-preview-cache-v347-glacier-arrival`，新場景模組納入 precache。這是本機版本準備，未組裝本池 release artifact，也不代表網站或已安裝 PWA 已更新。

## 驗證結果

- `npm test`：115 項測試全數通過；接續 34 項既有召喚邏輯 assertions 全數通過。
- 12 個本次新增／修改 JavaScript 檔的 `node --check` 通過；`git diff --check` 通過。
- `node devtools/build-pet-images.mjs check`：既有 72 隻 × 2 衍生圖通過。沒有生成或修改正式圖片。
- Pipeline 新增的受控模板 fixture 測試：全 base、無 expansion 的冰河池可完成既有各 gate 後 stage，所有候選保留。此測試在系統 temp 執行，與真實 workspace 分開。
- 冰河呈現專用瀏覽器頁：桌面及 390×844 各 7 項全數通過，涵蓋未知模板拒絕、文字安全、debut 明確關閉、十連重複項與順序、SSR／UR queue、legacy scene、故障後解鎖與有限動畫。該頁只使用既有寵物作展示樣本，攔截 DB open，沒有新池正式圖。
- 原生瀏覽器 pool integration：390×844 共 12 項全數通過，包括實際 UI 切換冰河 debut、單抽交易完成後展示、100 星塵只扣一次、關閉演出後所有 store 不再變動、無解鎖贈寵，以及原有 pool／repeat-ten 回歸。無解鎖池仍保留既有 lifetime draw 計數，此非角色解鎖。
- 桌面及 390px 目視查看冰河抵達場景，冰壁、船影、暖色航標與文案可辨讀；手機寬度等於 scrollWidth，無水平溢出。測試頁結果 pre 原先造成橫向溢出，已加換行後重跑通過。
- Browser origin 為新建 loopback 測試 server，integration 使用隨機隔離 DB 並於結束清理；不開正式 App 或正式玩家 DB。測試分頁已關閉，viewport override 已還原。
- 真實 plan 的 12 個 ID mapping、rarity 數量、名稱／design、全 base 及僅 brief approval 皆通過唯讀檢查。

執行真實 workspace 的 `validate` 正確回報 `CONTENT_ROSTER_MISMATCH`：plan 已有 12 隻，content 的 `pets.json` 仍是尚待核准 roster 後填寫的空 scaffold。**完整內容 validation 尚未通過，也未執行 stage 或跳過 gate。** 這不是工程測試失敗或可發布狀態。

## 接續工作

1. 由使用者審閱 [12 隻設計摘要](../content/pet-series/frost_oath_fjord/PLAN-REVIEW.md) 與 plan，修改後再讀 status，以當前 hash 核准 plan。
2. 依核准 roster 填寫完整 Pet／Lore、召喚與陪伴台詞、pool 文案和 hero metadata；`pool.name` 在 content 階段使用已核准的「霜誓峽灣召喚」。再審閱 content。
3. 完成並依序審閱 prompts 與原創圖片，保留生成來源與可得的生成資訊；執行完整 validation、warnings review、stage dry-run 與 candidate 審閱。
4. source promotion、release assembly、preview 與實體裝置驗收仍需另外執行和核准。此次只驗證瀏覽器桌面／手機 viewport，未宣稱實體手機效能、hosting／CDN、PWA 自然更新或正式新圖品質已通過。

`data/`、正式 `assets/` 和 legacy compatibility catalogs 沒有 diff。無 commit、push、merge、部署或玩家資料操作。既存未追蹤的 `AGENTS.md` 與另一份 UI audit 報告未修改。
