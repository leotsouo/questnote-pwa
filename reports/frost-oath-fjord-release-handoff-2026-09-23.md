# 霜誓峽灣：發布準備交接

本輪完成真實候選的完整 release assembly、本機 profile 隔離、已知 legacy 更新與離線驗收，以及真實 App 單抽、十連、圖鑑與 Lore 驗收。正式發布尚未核准。產品結論與已知限制見 [RELEASE-REVIEW](../content/pet-series/frost_oath_fjord/RELEASE-REVIEW.md)。

## 來源與保存

- real Git HEAD `95a4f5d70233195050f1f0fce2eee3d9945c2b32`，工作樹未提交；實際 runtime source hashes 在各 release-artifact.json。
- 五個 approval stages 保持有效，candidate／catalog／PNG／WebP 沒有修改。
- 最終 production artifact：`a8c5117b44ac36342cf00aef0b2770848239c6b6e78efaef86767db06d798c64`，scope `/questnote-pwa/`。
- preview artifact：`79b630eaeae4f4610a9b5d19b0d9bc1051a72248e9ef30e73385d943c6fbfca6`，scope `/preview/`，僅作本機驗收。
- 早期 `/production/` 測試 artifact `85f7598b2e2e9abf64c70e0eb4309dc4628c871d5c4447a53429d3a3d6bd9d8c` 只保留為本機歷史測試證據；不能上傳到 `/questnote-pwa/` 代替最終包。
- 三包皆 328 files，dry-run/build/reuse 通過；共用同一個已核准 catalog hash。
- 完整 authoring 備份與逐檔 hashes 放在 release output root；明細見本輪 release-validation JSON。TEMP 可能被清理，正式部署前須轉存至核准的持久保存位置。

## 本輪工程變更

只改 `devtools/release-artifact-browser-server.mjs` 與 `devtools/release-artifact-browser-test.js`，使既有 native harness 讀取 artifact 的 scope，取消 `/production/` 寫死路徑。保留全新 loopback、逐檔 hash、profile DB／cache、token 控制、清理所有權等保護，新增拒絕 root、互相重疊及 `/test/` 衝突的 scope。UI 標示改成 supplied content artifact，避免把真實卡池誤稱 synthetic content。

兩檔 syntax checks 通過；4 個獨立 temp guard probes（root、equal、nested、harness-overlap）皆在啟動 server 前拒絕。最終正式路徑的 8 項 native artifact tests 全數通過，證明新 scope 路由、legacy 過渡與 cleanup 可正常工作。這些 devtools 不進 runtime closure，沒有修改 runtime／工具指紋或重新要求內容核准。

完整 `npm test` 在修改這兩個 browser harness 前通過 115 tests＋34 logic assertions；harness 修改後執行對應 syntax、scope guard 與真實 native tests，沒有把前一次 Node suite 說成修改後全套重跑。

## 重跑

```powershell
$questReleaseRoot = Join-Path $env:TEMP 'questnote-frost-oath-release-20260923'
$questCandidate = 'content/pet-series/frost_oath_fjord/staging/697316249910931d21b57c50744997c2a12e9fde9743bfd3e61e094b18b7a131'
node scripts/card-pool.mjs status frost_oath_fjord
node scripts/prepare-release.mjs --project-root . --output-root $questReleaseRoot --profile production --scope /questnote-pwa/ --candidate-dir $questCandidate
node scripts/prepare-release.mjs --project-root . --output-root $questReleaseRoot --profile preview --scope /preview/ --candidate-dir $questCandidate
node devtools/release-artifact-browser-server.mjs --production (Join-Path $questReleaseRoot 'a8c5117b44ac36342cf00aef0b2770848239c6b6e78efaef86767db06d798c64') --preview (Join-Path $questReleaseRoot '79b630eaeae4f4610a9b5d19b0d9bc1051a72248e9ef30e73385d943c6fbfca6')
```

Server 使用新 port。開啟顯示的 `/test/` 會在該空白 origin 進行測試與 cleanup；請勿把目前保留給使用者操作的 preview origin 當成測試 origin。若要單純看 App，在另一個新 server 的 `/preview/` 開啟即可，勿開 `/test/`。來源或 Git HEAD 變動後 artifact ID 可能不同，應使用新 assembler 回傳值，不強行覆寫舊包。

本輪 live preview 是 `http://127.0.0.1:50345/preview/`，gallery server 是 port 8129。首次 `/production/` suite 位於 port 57433，最後正式路徑 suite 位於 port 57614；兩次 suite 都已完成 owned-origin 清理。手機框位於 gallery 的 `RELEASE-PREVIEW.html`；實體手機操作仍未驗收。

## 外部 release gates

GitHub Pages API 已確認 `https://leotsouo.github.io/questnote-pwa/`、HTTPS enforced、legacy build、main `/`。API 最新 workflow 仍是 `30220073263`；CDN 檔案讀取兩種工具都遇到 TLS 驗證失敗。公開 preview hosting、現存安裝客戶端範圍、實體 PWA 與部署／撤回驗收仍未完成。沒有停用 TLS 驗證或變更 Pages 設定。

未執行 source promotion、commit、push、merge、deploy。正式 `data/`、`assets/`、frozen legacy compatibility catalog 沒有改動。五個內容核准可以沿用；正式發布仍需另行決定，manifest 的 releaseReady 維持 false。
