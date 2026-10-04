# V3.8.0 易讀模式與最新新手教學整合

使用者於 2026-10-04 授權正式發布，並要求等待新手教學 chat 完成。已以最終 origin/main a46cf59（正式 V3.7.0）整合，實際 HTTPS 基線 artifact b0b22f41b2ff4407b3c21e77a72eaa53ad3936b6ff2fd28da97b19c757191868。保留最新新手／四章成長教學、共用相遇碎片／指定邀請、公告和50枚贈禮 identity。未加入任何主動語音播放，所有模式共用資料與 progression。

整合決策與必要修復：
- 共用任務表單沿用新版單一原生 disclosure，易讀模式保留今日勾選與安排日期／時間可見，不建立第二份表單或資料。
- 引導生效時隱藏另一個易讀練習卡；引導取得背景鎖之前通知易讀控制器交還所有權，避免新手新增後 app 殘留 inert。
- 大文字教學 coach 保留操作空間，長內容仍可捲動；320px／200% 實際按鈕不再被遮擋。
- 完成的練習不能取消，按鈕停用且呈現「已完成」，避免誤導回饋。
- 備份不刪除使用者編輯過的練習。還原未完成首輪練習時，保留文字／日期／時間／領獎旗標，轉為共用一般任務；已完成練習保留收據，不能重複領獎。

驗證：完整 Node 336 +14 +12 項與揭示斷言通過；一般／易讀模式17組瀏覽器流程通過（含CRUD、完成、抽卡、寵物、收藏、modal、中文IME、主功能touch target、不同主題與200%文字reflow）；新版教學21組瀏覽器流程通過；交叉教學3組通過（完整重播、320px／200%首輪、編輯器略過）。原始失敗與最後通過日誌保留在本目錄。交叉測試未用force-click。詳細 runtime JS 語法與git whitespace檢查通過。

Agent integration_audit 負責唯讀跨服務與導覽審查、獨立交叉瀏覽器harness、備份修復／focused tests。Lead 複核其發現後採納單一disclosure及鎖交接；否決省略未完成練習備份的方案，原因是可能丟失使用者輸入，改採還原正規化。Lead 解決合併、整合runtime並執行完整回歸。之前product_audit／design_accessibility／mode_service_qa的原始設計與QA決策見reports/senior-mode。

Immutable artifact、Pages及正式HTTPS結果於發布收據另記。實體 iPhone、iOS VoiceOver／原生文字放大仍需使用者驗收；不將Chromium或合成鍵盤事件宣稱實機通過。

## 正式畫面複核修正

最後實際正式畫面發現 .guided-learned 的 pseudo label 與 Senior visible label 重複。已僅在Senior scope移除既有教學 pseudo content，保留Normal教學標籤；同步BUILD_TIME與cache identity。追加實際computed-style斷言，17組Normal／Senior完整瀏覽器重跑通過；最終固定產物與部署結果見更新production-release.md。第一次發布的收據留在production-release-initial.md。
