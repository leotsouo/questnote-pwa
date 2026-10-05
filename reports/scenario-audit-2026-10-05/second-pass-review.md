# Second-pass Review

日期：2026-10-05。僅審查上一輪 `audit.md` 的 I01–I07 與 KEEP；不新增問題、不實作產品變更。原 audit commit：`65d62b0`。本輪核對的產品 source 與該 commit 相同。

結論：完整撤回 I04、I05；I03、I07 縮小提案；I02 交人工 Review；I01、I03、I06、縮小後 I07 可進入小範圍實作。最推薦先做 **I01 → I06 → I03**，不湊第四、第五項。

Evidence 的 High 表示來源能支持「特定條件下的行為」，不代表發生率或真人 UX benefit 已測量。上一輪兩個條件式 P0 不能直接當成正式環境事故或本輪工程排序。此次重跑兩個既有 reproduction harness，共 4 個 PASS；未重新做瀏覽器／原生 IndexedDB 故障測試。完整輸出見 `second-pass-validation.log`。上一輪 UI 截圖、互動記錄及 161 個既有聚焦檢查結果沿用，不宣稱本轮重跑。

圖例：[S] Screen、[C] Component、[F] Function、[STATE] State、[API] API/Persistence、[NAV] Navigation、[ERR] Error、[UX] 使用者判斷。AFTER 都是尚未實作的建議。

## 1. Rejected Recommendations

| 原項目 | 第二次決定 | 否決的內容與原因 |
| --- | --- | --- |
| I04 一般模式 dirty exit | 完整撤回 | 實測證明 Close 丟棄未儲存輸入，但沒有證明使用者誤關的頻率與成本。把所有模式的離開改成確認流程會新增 dirty tracking、退出分支與回訪操作負擔；目前不足以證明淨收益。 |
| I05 提醒 error 分類 | 完整撤回 | 原介面已有「已儲存在本機，提醒資料待同步」、重新同步及連線恢復後同步。原始錯誤可能難讀，但缺乏證據證明它阻止恢復；timeout/network/JSON 分類不是目前必要的 Flow 修正。 |
| I03 初始化恢復 | 部分撤回 | 不做完整錯誤分類、新恢復流程或頁內重跑 initApp。先修復 error host 被移除；重試沿用整頁重新載入，避免部分初始化後重複綁定與狀態清理。 |
| I07 恢復階段回報 | 部分撤回 | 不新增 restored flag、commit 前後錯誤分支。先把共用 catch 中兩處無法保證的錯誤斷言改成中性、可行動的訊息。 |

I04、I05 不進入 backlog 的執行清單。若未來重新提出，必須有新的使用者影響證據；不是本輪新增待做項目。

### I01 — 習慣重送與例外：保留，但限制錯誤邊界

1. **完全不改的後果：** 第一筆建立仍 pending 時再次提交，可建立兩筆同名習慣；持久化 reject 時，目前 callback 沒有 inline/toast catch。可能造成重複資料或結果不明。
2. **Evidence 足夠嗎：** CODE / High。實際 callback + createHabit 的受控重現通過；儲存邊界是 stub，沒有正式發生率證據。足以支持局部 guard/catch，不足以要求全域去重資料模型。
3. **是否主觀偏好：** 否；重複寫入與未處理例外是可檢查的行為。
4. **只是另一種做法嗎：** 以 pending guard 防同一次操作重送有明確結果；永久禁止同名習慣則只是另一套產品規則，不採用。
5. **增加 complexity 嗎：** 少量；一個表單 pending guard、disabled、try/catch/finally，與既有任務表單做法相近。
6. **增加 state/branch/edge case 嗎：** 增加 transient saving 狀態與失敗分支；需區分保存失敗和保存後刷新失敗，不能把兩者一律寫成「未保存」。不新增 persistence schema。
7. **新人更容易但回訪更慢嗎：** 正常提交不增加步驟；只阻止尚未結束的重送。
8. **改 mental model 嗎：** 不改「建立／編輯後儲存」；不加入同名限制、草稿系統或全站退出確認。
9. **工程成本高於 benefit 嗎：** 局部防護低成本，資料與回饋收益明確；跨頁／跨装置去重不在本案範圍。
10. **更小安全方式：** 只改 openHabitForm 提交 callback。寫入成功後保持不可再提交，刷新錯誤不引導重建；寫入失敗保留輸入並解鎖。不要承諾 guard 能處理跨頁或成功回應遺失。

### I02 — 製作原子性：保留 Review，不當作低風險快速修正

1. **完全不改的後果：** 若扣料成功後 inventory 寫入失敗，材料與道具可能不一致；重試可能再次扣料。不是宣稱日常製作已經失效。
2. **Evidence 足夠嗎：** CODE / High 支持 sequential write 與注入故障下的不一致。實際 craftItem orchestration 使用 stub 邊界；未實測原生 IndexedDB abort、關 App 或發生率。足以審查可靠性，不足以判定立即 P0 全面重構。
3. **是否主觀偏好：** 否；扣料與取得道具的一致性是既有任務的正確性。
4. **只是另一種做法嗎：** 單一交易確實改善指定故障的一致性；但不能僅因「transaction 比較好」就改所有養成服務。
5. **增加 complexity 嗎：** 會。雖可減少半完成狀態，仍需把 wallet、inventory、stats 的讀寫與正規化放進同一交易。
6. **增加 state/branch/edge case 嗎：** 需驗證缺料、舊資料、交易 abort、多頁並行、stats 失敗；不是加一行 catch 即可。
7. **新人更容易但回訪更慢嗎：** 不應增加 UI 步驟；交易執行成本與成功路徑效能仍需確認，尚未量測。
8. **改 mental model 嗎：** 不改「扣材料製作道具」；若限制多頁、加入新資源規則或改資料模型，超出原提案。
9. **工程成本高於 benefit 嗎：** 尚不能確定。條件式損失影響高，但修正成本及實際故障頻率未量測；不能與低風險文案修正同批直接執行。
10. **更小安全方式：** 原先交易建議不能用 catch 或盲目補回材料取代；那會隱藏不一致或產生重複補償。限制在既有 stores 的一次製作，先確認可行範圍與必要測試，再決定實作。

### I03 — 初始化 error host：保留可見錯誤，撤回頁內重啟設計

1. **完全不改的後果：** init catch 把載入錯誤寫到已 remove 的 loader，該說明不會顯示。不能由此推論每次故障都整頁空白；fallback initUI 的結果因失敗點而異。
2. **Evidence 足夠嗎：** CODE / High。實際 hideLoader/catch 順序與 synthetic DOM 重現；足以修 error host 的可見性，不能證明不同故障需要完整分類器。
3. **是否主觀偏好：** 否；已編寫的錯誤訊息不在 document，是功能性 feedback 缺口。
4. **只是另一種做法嗎：** 保留可見 host 有明確改善；新增完整錯誤頁、恢復精靈只是另一種設計，刪除。
5. **增加 complexity 嗎：** 縮小後低；只處理現有失敗路徑的 host 與重新載入入口。
6. **增加 state/branch/edge case 嗎：** 可見 host 不需要新持久化狀態。頁內重跑 initApp 會增加半初始化、重複 listener 等 edge case，因此撤回。
7. **新人更容易但回訪更慢嗎：** 成功路徑不變；失敗時才顯示，不加 onboarding。
8. **改 mental model 嗎：** 不改；仍是打開 App，未完成載入則重新載入。
9. **工程成本高於 benefit 嗎：** 小範圍 host 修正低成本；完整 recover/bootstrap flow 成本較高，證據不足。
10. **更小安全方式：** 保留或重新接回既有 error host，顯示「載入未完成」與整頁重新載入；不重置資料、不保證重載會解決未知錯誤、不在部分啟動状態重新執行 initApp。

### I04 — 全模式 dirty exit：撤回

1. **完全不改的後果：** 一般模式未保存表單被關閉後需重新輸入；既有已保存任務不因此丟失。使用者選擇放棄時，這是預期結果。
2. **Evidence 足夠嗎：** CODE + INTERACTION / High 支持輸入被丟棄；誤關造成重大摩擦的推論仍為 ASSUMPTION / Low。沒有誤關率、重輸成本或真人理解資料。
3. **是否主觀偏好：** 「所有模式都應確認」含設計偏好；一致性本身不能證明值得增加步驟。
4. **只是另一種做法嗎：** 是；直接 Cancel 與 dirty confirm 各有取捨，不代表後者普遍較好。
5. **增加 complexity 嗎：** 會；要擴充 dirty tracking 與多種 modal 退出行為。
6. **增加 state/branch/edge case 嗎：** 會；預填、程式更新、子任務、日期、focus、保存中與備份 dialog 的互動皆需處理。
7. **新人更容易但回訪更慢嗎：** 可能；熟練使用者有意放棄也需要第二次確認。
8. **改 mental model 嗎：** 會改正常模式 Close/Cancel 的立即退出預期。
9. **工程成本高於 benefit 嗎：** 在未驗證誤關影響前，有這個風險；不宜用易讀模式需求推導所有使用者。
10. **更小安全方式：** 保留目前一般模式語意與易讀模式已有 guard；本輪不替換成另一個未驗證的確認方案。

### I05 — 提醒錯誤完整分類：撤回

1. **完全不改的後果：** 一些原始錯誤文字仍可能難讀；本機已保存／待同步狀態與重新同步能力仍存在。没有證據支持「無法恢復」。
2. **Evidence 足夠嗎：** CODE / High 支持 raw error.message；影響完成率／恢復的證據不足。沒有真人或當次真實服務 failure 操作證據。
3. **是否主觀偏好：** 中文易讀有可能有功能收益，但目前分類內容與呈現方式包含推測；不是已證實的阻塞。
4. **只是另一種做法嗎：** 較細分類是另一種回饋策略，未證明比現有狀態＋重試明顯更好。
5. **增加 complexity 嗎：** 會；維護 HTTP、AbortError、network、JSON parse 等映射與 fallback。
6. **增加 state/branch/edge case 嗎：** 新增錯誤判斷分支；還要保留 401/token 清理、離線、停用待確認等語意。
7. **新人更容易但回訪更慢嗎：** 純訊息替換不一定拖慢，但若附加說明或確認則可能；不加入。
8. **改 mental model 嗎：** 原本地保存／同步模式可維持；不需要因訊息分類改同步流程。
9. **工程成本高於 benefit 嗎：** 相比已有可恢復路徑，增量 benefit 未證明，不值得目前排入工程工作。
10. **更小安全方式：** 本輪 KEEP 現有保存、待同步、重新同步路徑；不另創新的文案微調項目湊數。

### I06 — 子任務名稱／完成狀態：保留

1. **完全不改的後果：** 完成與未完成的控制都稱「完成子任務」且未暴露 pressed 狀態；讀屏無法從此控制區分下一次動作，易讀模式也沿用該 label。可能誤取消已完成項目。
2. **Evidence 足夠嗎：** CODE + INTERACTION / High。已完成仍同名且 aria-pressed 缺失，點擊確實取消；未宣稱已量測讀屏使用者的誤操作率。
3. **是否主觀偏好：** 否；控制名稱與操作結果不一致、未表達狀態，是語意缺口。
4. **只是另一種做法嗎：** 不是重新布局；從現有 completed 與子任務名稱派生 label/pressed，可客觀核對。
5. **增加 complexity 嗎：** 極低；render 時派生字串與布林屬性。
6. **增加 state/branch/edge case 嗎：** 不新增 state；只使用既有 completed。需處理名稱安全輸出並驗證一般／易讀模式。
7. **新人更容易但回訪更慢嗎：** 不增加點擊或確認；成功與切換行為保留。
8. **改 mental model 嗎：** 不改同一個控制切換完成；只是準確說明當前狀態與下一次動作。
9. **工程成本高於 benefit 嗎：** 低成本，有明確 Accessibility、Consistency 與 Error prevention 收益。
10. **更小安全方式：** 只在 renderTaskCard 派生目標名稱、完成／取消完成 label 與 aria-pressed；不改 service、data model、layout 或新增確認。

### I07 — 恢復失敗斷言：只保留中性回饋文字

1. **完全不改的後果：** 共用 catch 含 restore 後刷新／主題／成就失敗，卻一律顯示「資料未完整寫入」及要求確認備份檔。若 commit 已完成，會誤導使用者對資料及重匯的判斷。
2. **Evidence 足夠嗎：** CODE / High 支持 catch 的範圍與交易提交順序；上一輪未重現真實 commit 後刷新故障。足以刪除不成立的全稱斷言，不足以宣稱這是常見問題。
3. **是否主觀偏好：** 否；訊息聲稱的資料狀態不由 catch 保證。
4. **只是另一種做法嗎：** 精確階段回饋是另一種較複雜策略；中性文案能以更低成本避免錯誤斷言。
5. **增加 complexity 嗎：** 原階段 flag 提案會增加；缩小後只換共用 catch 中兩處 feedback，不增加。
6. **增加 state/branch/edge case 嗎：** 中性回饋沒有新增 state 或 branch；不區分未測量的內部故障類別。
7. **新人更容易但回訪更慢嗎：** 不加步驟；避免直接引導再次覆蓋恢復。
8. **改 mental model 嗎：** 不改預覽／確認／覆蓋恢復；只改失敗時的資訊。
9. **工程成本高於 benefit 嗎：** 精確階段回報對此低頻、未量測事件未必值得；兩處小文案修正成本低，但優先度仍低於前三項。
10. **更小安全方式：** 兩處改成一致的中性意思，例如「恢復流程未完成，請先重新整理並檢查資料。」不聲稱未寫入、已寫入或備份一定錯誤；不新增自動重匯、不保證重新整理能恢復。

## 2. KEEP

重新確認上一輪 KEEP，没有把保留流程改成修改項目。

| 流程 | 保留理由／證據限制 |
| --- | --- |
| 真實任務式新手教學、預填、可略過、checkpoint 續接 | 上輪互動完成核心任務並 reload 續接；不擴充強制教學。 |
| 回訪不重跑教學、同頁新增／完成、進階欄位選填、中文導航 | 上輪保存與 reload 確認；沒有常用效率不足證據。 |
| 任務提交 pending guard、既有 required / validation | 已有防護，I01 只修習慣提交，不把任務表單重做。 |
| 已提交任務持久化、召喚提交後演出 | 原 source／聚焦測試支持；不把動畫中斷當成資料遺失。 |
| 工坊現有製作鎖、明確選擇收件夥伴 | 防當次重送的行為保留；不因此宣稱鎖能解決 I02 的多筆交易一致性。 |
| 上輪已確認的原子領獎／receipt 流程 | 保留各自交易與防重機制，不擴大推導所有服務皆原子。 |
| 易讀模式共享資料、文字控制、結果回饋與 dirty guard | 上輪實測可繼續編輯／放棄；只修 I06 不準確的 label。 |
| 刪除確認、習慣封存、既有記錄保留 | 已有具體後果與保護，不新增全站 Undo。 |
| 備份預覽、操作前備份、覆蓋確認、全 stores 恢復交易 | 保留既有核心恢復流程；I07 不改交易或 confirmation。 |
| 提醒本機保存、待同步、重新同步與連線恢復後同步 | CODE 支持已有恢復路徑；I05 分類提案撤回。 |
| Feedback 草稿／預覽／收件編號及恢復方式 | 沿用上輪確認結果，不另增 wizard。 |
| 既有 bootstrap fail-closed 與可見行動入口 | 保留；I03 僅處理 initApp 另一個 catch 的 detached loader。 |

原 NEEDS VALIDATION（教學長度、術語理解、更多入口頻率、平台中斷等）仍是驗證限制，**不升級成修改建議**。目前沒有新的 Flow Problem。

## 3. SAFE TO IMPLEMENT

「SAFE」表示可進入限定範圍實作及必要 regression check，不代表免測、已實作或已獲得新設計的真人成效證據。

| 順序 | ID | 限定範圍 | 必要 regression check |
| --- | --- | --- | --- |
| 1 | I01 | 習慣表單 pending guard／disabled／寫入例外回饋；不更改同名規則或 data model | 延遲保存時重送只一筆；reject 保留輸入且可重試；編輯與 validation 保留；保存後刷新失敗不再允許重建、不誤報未保存 |
| 2 | I06 | 子任務控制名稱與 aria-pressed 由現有狀態派生 | 兩種完成狀態、不同名稱、一般／易讀模式、鍵盤切換；不增加步驟 |
| 3 | I03 | 失敗訊息位於可見 host；重試為整頁重新載入 | 注入 init fail 後訊息可見；正常 loader 移除照舊；不新增重複 listeners；不 reset DB |
| 4 | I07 | 共用 catch 中兩處回饋改中性，不加入 restored flag | commit 前 reject 與 commit 後 refresh reject 都不聲稱資料未寫入或備份必定錯誤；既有成功訊息與交易不變 |

## 4. REQUIRES REVIEW

**I02 — 單次製作跨 wallet / inventory / stats 的原子交易。**

Medium scope、Impact High、Risk Medium、Confidence High（結構與指定條件）、Effort Medium。這是既有正確性需求，值得保留，但本輪不足以將它當成可直接執行的 SMALL 修正。

Review 應確認既有 stores 是否可使用 dbMutateRecords 完成一致讀寫，涵蓋現有正規化、缺料、舊資料、成功／abort 與多頁並行；確認實作範圍後才排工程工作。若必須改 schema、資源規則或多頁使用政策，停下來交使用者判斷。不得用盲目補償或泛用 catch 冒充交易修正。

## 5. MAJOR PRODUCT DECISIONS

**沒有任何既有建議需要保留為 MAJOR PRODUCT DECISION。** I02 在同 stores／同資料模型內仍屬 Medium 工程審查。I04 全模式確認已撤回，不進一步擴展成 onboarding 或全站草稿哲學。

核心導航、journey、information architecture、data model、功能增刪均不列入本輪。沒有執行重大變更。

## 6. TOP 3–5 Recommended Changes

只選 3 項；I02 尚待 Review，I07 低優先的小修正不湊入前三。

### 1. I01 — 習慣提交防重與可恢復錯誤

**Problem：** pending 期間可重複建立，寫入例外缺乏可見回饋。**Evidence：** CODE；actual callback/createHabit 的既有受控 harness 重跑通過。**Confidence：** High（條件式行為；發生率未知）。

**Current Flow：** 每次 submit 都直接呼叫 createHabit/updateHabit。**Proposed Flow：** 同一表單只接受一次 pending 提交；保存失敗顯示錯誤、保留輸入並解鎖。寫入完成後不允許再次建立。

**Before ASCII**

```text
[S] 習慣表單 -> [C] 建立 -> [F] createHabit()
 -> [API] pending
 -> [UX] 再按建立 -> [F] createHabit() -> [API] 第二筆
 -> [STATE] duplicate
 [API] reject -> [ERR] callback 無 catch -> [UX] 結果不明
```

**After ASCII**

```text
[S] 習慣表單 -> [C] 建立
 -> [STATE] saving -> [C] disabled / 儲存中
 -> [F] createHabit() / updateHabit() -> [API] 保存
 +-- reject -> [ERR] 保存未完成 -> [STATE] 保留輸入 / 解鎖
 |            -> [UX] 修正或重試
 `-- resolve -> [NAV] 關閉 -> [F] onRefresh()
               [ERR] 刷新失敗也不重建習慣
```

**Affected Functions：** openHabitForm submit callback（src/ui.js:7857）；createHabit（src/habitService.js:88）/updateHabit 為需 regression 的既有呼叫，不要求修改服務。**Impact：** High（条件式資料重複與恢復）。**Risk：** Low。**Effort：** Low。**Scope：** SMALL。

**Why Now：** 受控重現明確，局部 guard 即有直接收益。新增一個短暫狀態／錯誤分支，但不增加正常點擊步驟，也不改 mental model。這個防護不保證跨頁去重。

### 2. I06 — 子任務控制準確表達狀態

**Problem：** 已完成項目的控制仍叫「完成子任務」，且缺少 pressed。**Evidence：** CODE + INTERACTION；上輪截圖 09 及 toggle 操作。**Confidence：** High。

**Current Flow：** 同一名稱切換完成與取消完成。**Proposed Flow：** 依既有 completed 派生名稱及 aria-pressed，包含目標子任務。

**Before ASCII**

```text
[S] 任務卡 -> [STATE] subtask.completed=true
 -> [C]「完成子任務」/ 無 aria-pressed
 -> [UX] 下一步含義不清 -> [F] toggleSubtaskComplete()
 -> [API] 保存 -> [STATE] completed=false
```

**After ASCII**

```text
[S] 任務卡 -> [STATE] subtask.completed=true
 -> [F] renderTaskCard()
 -> [C]「取消完成：整理書桌」/ aria-pressed=true
 -> [UX] 知道會取消 -> [F] toggleSubtaskComplete()
 -> [API] 保存 -> [STATE] completed=false
 -> [C]「完成：整理書桌」/ aria-pressed=false
 [ERR] 沿用既有保存錯誤處理；[NAV] 留在原頁
```

**Affected Functions：** renderTaskCard（src/ui.js:3138）；toggleSubtaskComplete、decorateSeniorControls（src/seniorModeController.js:184）驗證相容。**Impact：** Medium。**Risk：** Low。**Effort：** Low。**Scope：** SMALL。

**Why Now：** 語意與實際結果不一致已確認，影響可及性及誤操作預防。只改呈現派生，不新增 state、確認或資料欄位；不改熟練使用者的操作步驟與 mental model。

### 3. I03 — 初始化失敗訊息保持可見

**Problem：** catch 的 loader 已移除，錯誤文字沒有可見宿主。**Evidence：** CODE；實際程式片段的 synthetic-host 重現重跑通過。**Confidence：** High（宿主缺失，不代表所有失敗均空白）。

**Current Flow：** hideLoader 後在 detached loader 寫錯誤。**Proposed Flow：** 既有失敗 host 保持可見，提供整頁重新載入；不在頁內重跑部分初始化。

**Before ASCII**

```text
[S] 啟動 -> [F] initApp() -> [API] 初始化失敗
 -> [F] hideLoader() -> [STATE] loader detached
 -> [ERR] 寫入 detached node -> [UX] 看不到該說明
```

**After ASCII**

```text
[S] 啟動 -> [F] initApp() -> [API] 初始化失敗
 -> [C] 可見 error host -> [ERR] 載入未完成
 -> [UX] 重新載入
 -> [NAV] 整頁 reload -> [F] initApp()
 [STATE] 不新增恢復旗標；不重置原存檔
```

**Affected Functions：** initApp/hideLoader（src/app.js:512、728）。**Impact：** Medium。**Risk：** Low（限定 host 與整頁 reload）。**Effort：** Low。**Scope：** SMALL。

**Why Now：** 現有失敗回饋在特定路徑完全無法顯示；修正可直接核對。成功路徑不加新步驟，不改 mental model；不加入錯誤分類、wizard 或頁內重啟狀態。

## 7. Final Priority Matrix

Priority 是本輪工作排序，不是對正式環境發生率的聲稱。Impact High 也可能只在受控故障下發生。

| Priority | ID | 決定 | Impact | Risk | Confidence | Effort | Scope |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | I01 | SAFE，TOP | High | Low | High | Low | SMALL |
| 2 | I06 | SAFE，TOP | Medium | Low | High | Low | SMALL |
| 3 | I03 | SAFE，TOP，縮小 | Medium | Low | High | Low | SMALL |
| 4 | I02 | REQUIRES REVIEW；不可直接排實作 | High | Medium | High* | Medium | MEDIUM |
| 5 | I07 | SAFE，縮小；可延後 | Low | Low | High* | Low | SMALL |

*I02 的 High 是 sequential orchestration／注入故障結果；I07 是 catch 語意範圍。兩者的發生頻率、真人影響與替代方案成效均未量測。I04、I05 已撤回，不列保留項目的 Priority。

I02 放第 4 是先 Review 的順位，不表示可以先做 I07 就忽略已確認的可靠性風險；若將來取得實際資料損失事故證據，應在同一 I02 範圍內重排，而不是沿用目前未知頻率。

## 8. Final Recommended ASCII Flow

這是前三項的最小修改位置，不是新產品架構；KEEP 的其他流程不需重畫或重做。

```text
[S] 開啟 App
 -> [F] initApp()
 +-- [API] failure -> [C] 可見載入錯誤 [I03]
 |                    -> [UX] 重新載入 -> [NAV] 整頁 reload
 `-- success -> [STATE] 已保存教學／任務／偏好
      -> [NAV] 首次引導或直接今日 [KEEP]
      +-- [S] 任務列表 [KEEP]
      |    -> [F] renderTaskCard()
      |    -> [C] 子任務名稱 + 完成／取消完成 + pressed [I06]
      |    -> [UX] 切換 -> [F] toggleSubtaskComplete()
      |    -> [API] 既有保存 -> [STATE] 更新
      |    [ERR] 既有保存回饋 [KEEP]
      `-- [NAV] 更多 -> 習慣 [KEEP]
           -> [F] openHabitForm()
           -> [C] 儲存 -> [STATE] saving / disabled [I01]
           -> [API] createHabit()/updateHabit()
           +-- reject -> [ERR] 可見錯誤 -> [STATE] 保留輸入 / 解鎖
           |             -> [UX] 修正或重試
           `-- resolve -> [NAV] 關閉 -> [F] onRefresh()
                          -> [STATE] 已存結果 [KEEP]

獨立保留：
 [F] craftItem() 的交易一致性 [I02] -> REQUIRES REVIEW
 [F] executeRestoreBackup() 的中性錯誤文字 [I07] -> 低優先 SMALL
 [F] dismissModal() 一般／易讀模式現有退出差異 [I04] -> KEEP
 [F] syncReminders() 保存／待同步／重試 [I05] -> KEEP
```

本輪停止在 Review。沒有改產品 source、data model、導航或使用者資料；沒有執行任何 MAJOR PRODUCT DECISION。
