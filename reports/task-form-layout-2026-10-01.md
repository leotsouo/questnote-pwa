# 新增任務表單垂直捲動 — 2026-10-01

來源：從 origin/main `71b57cd` 建立 `codex/task-form-vertical-scroll`；本機來源版本 V3.4.41，尚未部署。

修正：任務彈窗的 modal-body 明確隱藏橫向溢出、保留垂直捲動，觸控手勢限制為 pan-y（保留 pinch-zoom）。日期欄位依內容寬度與字體大小排列，子任務新增列可換行，輸入框可縮小，長文字與按鈕可換行，避免靠裁切掩蓋欄位。

瀏覽器驗收：`devtools/task-form-layout-browser-test.mjs` 使用 headless Edge、隔離的 127.0.0.1:8879 origin、暫存瀏覽器 context；阻擋 service worker 及對外請求，不提交任務或回報。

- 320、360、390、430、768px × default、sweet、twilight × 根字體 16、24、32px，共 45 組通過。
- 使用長任務內容和已加入表單的長子任務內容；確認 scrollWidth 未超過 clientWidth、表單控制項未超出容器。
- 斜向滑鼠滾輪後 scrollLeft 為 0、scrollTop 增加；底部新增按鈕可見且可點擊（trial）。
- 截圖：`task-form-layout/after.png`。

回歸：`npm ci --no-audit --no-fund`、`npm test`、修改的 JS 與瀏覽器測試腳本 `node --check`、`git diff --check` 通過。版本與 service-worker cache name 已同步；修改的 CSS 原已在 precache，沒有新增 runtime 資源。

限制：這是桌面瀏覽器 viewport 與 CSS 字體放大測試，沒有驗證 iPhone/Android 實機觸控。原 CSS 在 Edge 的抽查未重現水平溢出，但 modal-body 的 touch-action 是 auto，未限制觸控軸向；不能宣稱已重現使用者裝置上的左右滑動。
