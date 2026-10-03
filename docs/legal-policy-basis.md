# QuestNote 隱私政策與使用條款 · v1.0

2026-10-01：Owner 明確授權依同類型 App 的常見規範設定政策並公開。
`marketing/scripts/legal-content.mjs` 是單一內容來源，build 產生
`/privacy`、`/terms`、`/support`。公開頁面改為版本、生效日期與實際規定，
移除原先 OWNER REVIEW REQUIRED 草稿標記。這是產品自行發布的政策，
不宣稱經律師審核、主管機關核准或符合所有國家法律。

## 參考方式

- [Habitica 隱私政策](https://habitica.com/static/privacy)與
  [官方政策原始碼](https://github.com/HabitRPG/habitica/blob/develop/website/client/src/components/static/privacy.vue)：
  參考資料分類、用途、供應商、保存、使用者選擇與政策更新的架構。
- [Habitica 使用條款](https://habitica.com/static/terms)與
  [官方條款原始碼](https://github.com/HabitRPG/habitica/blob/develop/website/client/src/components/static/terms.vue)：
  參考內容權利、合理使用、虛擬內容與服務限制的組織方式。
- [Todoist 隱私政策](https://www.todoist.com/privacy)、
  [Todoist 使用條款](https://www.todoist.com/terms-of-service)：
  參考生產力服務的適用範圍、資格、使用者內容及支援結構。
- [臺灣個人資料保護法](https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=I0050021)：
  核對第3條資料權利與第8條告知項目；資料庫標示部分修法未施行，
  沒有將未施行的新增條文寫成 QuestNote 的已適用義務。
- [Cloudflare RUM 隱私說明](https://developers.cloudflare.com/speed/observatory/rum-beacon/)：
  核對分析與一般 HTTP 連線處理的區別。

採共同議題架構，沒有複製競品長篇條文、公司資訊、Cookie 行為、
廣告資料分享、仲裁、付費訂閱或 QuestNote 不存在的帳號功能。
Finch 官方政策連結無法由本次研究工具完整讀取，未當作已讀政策引用。

## 與真實功能的對照

| 議題 | 政策與實作依據 |
| --- | --- |
| 官網 Demo | 當次記憶體，無 App storage / API，無 Email 表單。 |
| App 本機資料 | IndexedDB / 設定 / 草稿；不宣稱全部資料永不上傳。 |
| 意見回報 | `docs/feedback.md`、`backend/feedback/worker.js`；手動提交、診斷勾選、私密 D1、授權協作者及 Codex 輔助處理。IP 不寫入回報表不等於平台不處理連線資訊。 |
| 回報保存 | 沒有固定期限自動清理，明說現況與依有效請求處理，不虛構自動30天刪除。 |
| 提醒 | `src/reminderRules.js`、`src/reminderService.js`、`backend/reminders/worker.js`；匿名安裝、必要投影、選用標題、30天失效及排程清理、離線撤銷待同步、備份無法保證即時擦除。 |
| 分析 | Cloudflare PV / 速度、DNT / GPC；互動事件無遠端彙總；不採廣告 Cookie / 指紋。 |
| 身分及聯絡 | 使用已知專案維護帳號 leotsouo 與 App 私密回報；未虛構公司、地址、Email 或即時客服。公開 GitHub Issue 不承接敏感資料請求。 |
| 未成年人 | 13歲以上及依法所需法定代理人同意；沒有新增生日蒐集或宣稱已有年齡驗證。 |
| 費用 | 目前免費，未來費用另行通知同意，不虛構現有付款／退款機制。 |
| 使用者權利 | 本機可管理／匯出；伺服器資料依私密請求處理與合理確認，不以條款放棄法定權利。 |
| 使用限制 | 違法／濫用限制及善意安全研究例外；無無條件免責、強制仲裁或放棄法定救濟。 |

本次只修改網站政策、產生器及對應 QA，不改 App、後端、資料保存機制、
DNS 或分析設定。回報刪除請求仍需要開發者依合法請求實際處理，
政策本身沒有偷偷建立自動刪除或新的雲端服務。

先驗證 Pages Preview，再發佈同一份產物；部署與瀏覽器證據會記錄於
`reports/marketing/legal-v1/`。先前 acceptance.md 是原網站發布的歷史收據，
其中法律草稿狀態已由此版取代。
