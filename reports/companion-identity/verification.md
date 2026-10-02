# 驗證紀錄與重現方式

來源：`3a88db8f227e710c13324860197b73c1ce880573`；Node 24.18.0；Codex IAB（Chromium）；2026-10-02。此為本機設計 Prototype 的驗證，不是 Production acceptance。

## 自動檢查

- `npm ci` 完成；使用 Node 的 system CA，沒有停用 TLS 驗證。最初缺依賴的測試不算產品回歸，安裝後重新跑完整 suite。
- `npm test` exit 0。標準 Node suites 281 + 11 + 5 = 297 項通過，另有 reveal-flow logic assertions 全部 PASS。[完整 log](baseline-tests.log)
- `node --test devtools/companion-identity.test.mjs`：5 / 5 通過。[log](prototype-tests.log)
- `node --check`：companion-identity.js、companion-identity-model.js、companion-identity.test.mjs 通過。
- 5 個 focused checks 對所有真實 catalog 驗證身份字串、六池候選／既有花庭擴充、同 rarity 等機率、實際 duplicate fragments／input immutable，以及 Prototype 沒有 draw／DB／random／feedback／SW write 呼叫。
- Runtime source、data、index、version、service-worker 差異為零；不需版本或 precache 更新。

## Browser 操作結果

[Browser QA JSON](browser-qa.json) 記錄 DOM 讀回的真值，沒有把工具嘗試當成功。

| 案例 | 結果 |
| --- | --- |
| default／sweet／twilight，393×852 | 同原名、24px Hero name、13.6px title；初始渲染無壞圖、無橫向溢出；可見 button 至少 44px |
| 320×852，正常字級 | content 305px / scrollWidth 305px；中文長原名可完整換行 |
| 三 Theme，320px／200% | Hero name 48px；content 305px / scrollWidth 305px；support 自動減為 1 欄，不將名字縮小 |
| 圖鑑 320px／200% | name 32px，卡片自動 1 欄；無橫向溢出 |
| 名字 stress | 鳥哥／霧隱兔／灰影幼狼／苗圃護芽甲蟲／天律之冕・格里芬與英文、長中文樣本，44.8px 字體；各 sample scrollWidth = clientWidth |
| 六池切換 | 56／12／12／12／20／12 位，Hero 與 demo options 對應真候選 |
| 花庭擴充 | 16 位；沿用 normalizePoolDefinition 的既有 presentation defaults，Hero 為曙綻花后兔 |
| 全名單→機率→關閉 | 機率表／保底文字可達，關閉返回「查看全部夥伴」 |
| 新／重複結果 | SSR 重鉚架橋犀 +10，已擁有 Detail 讀到碎片 10；新 UR 具名結果可入展示圖鑑 |
| Normal reveal timing | 實測 begin 7 / cue 323 / silhouette 561 / art 860 / name 1211 / title 1458 / result 1816ms |
| Reduce Motion | 直接 result 約 3ms；image transition 0s；完整 name/title/rarity/obtained 宣告保留 |
| Name peak 語意 | name aria-hidden false、title aria-hidden true，dialog label 只含原名／rarity |
| Escape | 演出中到 result，不關掉獎勵；結果中關閉，focus 回「逐步檢視 Reveal」 |
| Modal Tab 循環 | 原生邊界在 IAB 暴露焦點逸出，補顯式 wrap 後：Shift+Tab 到返回名單，Tab 到關閉；均在 dialog 中 |
| 搜尋／filter | owned 4、unowned 8；「齒輪」1；稱號詞「承重」1；不存在名字 0；重設恢復 12 |
| 錯誤 console | Prototype 最後讀取 warning/error 為空 |

可見元素的 44px、初始壞圖數、色對比是本次採樣與 rendered DOM 證據，不能外推為所有裝置及所有狀態的全面合格。

## 色對比

從 browser computed tokens 讀回，按 sRGB relative luminance 與 `(Lmax+.05)/(Lmin+.05)` 計算。[原色值](contrast-colors.json) · [結果](contrast-results.json)

| Theme | Name／card | Title／card | Muted／soft | Link／main | CTA |
| --- | --- | --- | --- | --- | --- |
| default | 13.17 | 7.99 | 6.90 | 8.71 | 8.70 |
| sweet | 11.09 | 5.80 | 4.87 | 5.85 | 5.94 |
| twilight | 11.85 | 5.30 | 4.62 | 5.37 | 5.75 |

原 sweet／twilight 的 muted-on-soft 分別為 4.46／4.29。Prototype 局部改為 sweet #765d69、twilight #616960；不修改正式 themeTokens。表格涵蓋主要文字配色，不等於 art 背景上所有像素的對比量測；名字與稱號放在實底 caption。

## 證據限制

- **VoiceOver／原生 Dynamic Type／實機 Haptic：未實測。** Windows IAB 不具 iPhone VoiceOver；200% 是 root rem 排版模擬，不是 iOS 系統字級。可確認 markup、aria label、live region、keyboard、reduced motion，但不能證明 iOS 發音與焦點行為。
- 未執行真人姓名回憶／情感連結／一秒眼動測試，無成功率或效果提升百分比。
- 未量測弱裝置、慢網路、能耗；未把固定結果 prototype 接入正式十連 atomic transaction／queue。
- 研究四款遊戲的是官方資料與公開頁，並非登入遊戲後的完整 UX audit；未驗的動態、owned state 與完成率政策在研究表中明示。
- Before Summon／Reveal 用真 modules、固定結果 viewer。新 Summon／Name Moment 用 reviewer 手動鎖定時間。正式 app 的 single／ten 消耗流程沒有為截圖執行。
- 同 origin 的 audit App 可能註冊其現有 local service worker；獨立 Prototype 自己不註冊 SW。它只讀本地 JSON，持有記憶體展示收藏，reload 歸零。

## 隔離與重現

`devtools/companion-audit-fixture.html` 只允許 `http://127.0.0.1:4187`，並拒絕非空 collection。它為原 App 的截圖插入六隻展示樣本（n01、n09、n39、r41、ssr25、ur20）；這是**唯一 audit fixture 的測試 DB 寫入**，不是 Prototype 寫入。全新 loopback origin 與 live HTTPS 存檔隔離，不送測試 feedback，不改 wallet 或任務，不清空任何使用者資料。

從 `.worktrees/identity` 以 HTTP serve，例：

```powershell
python -m http.server 4187 --bind 127.0.0.1
```

開啟 `http://127.0.0.1:4187/devtools/companion-identity.html`。本次使用 bundled Python，既有 local server 已啟動。一般設計審查不用打開 fixture，也不用 npm build。

Prototype 操作：

1. 相遇頁：切六池、點主角／support、查看全部夥伴與機率。
2. 點「體驗一次相遇」看固定 Hero reveal，略過或看完後進 Detail／手帳。
3. 「檢視設定」切三 Theme、字級、減少動態；指定真 pet 看新／重複／逐步 reveal。
4. 旅程圖鑑切 Compact／Expanded、owned state，搜尋原名／稱號，點 Detail。
5. Reload 或「重設展示收藏」恢復展示；不影響正式存檔。

目前僅有 local source commit 與上述審查資料；沒有新的 immutable artifact、HTTPS preview 或 production deployment。
