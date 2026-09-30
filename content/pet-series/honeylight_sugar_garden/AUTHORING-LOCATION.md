# 蜜光糖庭審核備份

這是 images gate 待使用者核准時，從 canonical authoring workspace 匯出的完整備份。內容、PNG、未選取 revision、native approvals 與 prompt history 都保留；不編輯 pipeline.json，也不以這份備份冒充正式 source promotion。

canonical authoring root 為本 worktree 的 `.dev-backups/honeylight-authoring`，包含與已發布 bundle 逐檔驗證一致的累積 84 隻 baseline。操作務必帶 `--root .dev-backups/honeylight-authoring`。本 worktree 正式 `data/` 與 `assets/` 仍是未 promotion 的 main 來源，因此不帶 --root 的 status 會正確顯示 baseline drift；不可手改 hash 消除它。

使用者只需核准最終 12 張圖。當前 images outputHash：`e30a189e64fc9c5e4083a07057c4f40811df6ebb7e52c27ae2d262961607ca5a`。審核後在 canonical root 執行 native images approval，再進 staging / validation；更新備份以保留新 receipt。不自行發布或 merge。

若 canonical ignored root 遺失，可在相同 source snapshot 下執行 `reports/honeylight-sugar-garden/prepare-baseline.mjs` 重建經驗證的 baseline，再將本目錄完整複製到其 `content/pet-series/honeylight_sugar_garden`。工具指紋與 baseline 必須由原生 status 重新確認；不可假裝不同工具產物仍保有舊核准。
