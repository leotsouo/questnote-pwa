# QuestNote 磁碟治理

這是本機開發工具，不改 App、版本、SW、套件管理器或部署。需 Windows x64、PowerShell 7.4+、Git、Node 24/npm。程式和預設 policy 受版本控制；中央狀態放 root 的 `.dev-backups/disk-governance/state`，固定 runtime 放相鄰 `runtime`。兩者受保護且已由既有 `.dev-backups/` 規則忽略，不改 Git metadata。此電腦實測 Task Scheduler 無法看見 Codex 環境建立的 LocalAppData 檔案，改用已驗證可見的專案路徑；不將該目錄設為雲端專用，雲端／離線檔案一律停止操作，不下載。每週排程使用 SHA256 固定的 runtime，切換工作區分支不會讓工具消失。

## 現有流程 audit — 2026-10-05

- 兩輪清理後有 26 個 Git 登錄（7 個在 Codex managed worktree 區），另有未登錄 artifact materialization 與獨立 repository。手動盤點資料僅用於背景，不作自動刪除的信任來源。
- Git common hooks 只有 samples，沒有 active hooksPath；沒有既有任務完成 cleanup。歷史隔離環境由 Codex 任務、手動 Git 和發布/預覽組裝留下，不能為每個歷史目錄猜 owner 或建立時間。
- npm/package-lock v3，sharp/web-push/wrangler；不是 Expo/React Native，沒有統一 Playwright config 或 frontend build。Node tooling 各工作副本獨立安裝 npm dependencies，沒有改用 pnpm/yarn。
- browser scripts 直接使用 `PLAYWRIGHT_MODULE` 並將截圖寫到 `reports/<feature>`。其中已追蹤內容是歷史驗收證據，不能自動當成 temporary screenshots。現有執行器不被本輪改寫；新執行使用下述 producer wrapper，在輸出首次產生時就登錄用途。
- `releaseArtifact.mjs` 組裝不可變 artifact；`card-pool-release-smoke.mjs` 會建立 OS temp synthetic rehearsal。`.dev-backups` 混合 authoring、copied assets、Git repos、錯誤 traces、存檔及發佈材料，沒有既有 retention。`petSeriesPublishService.mjs` 在發佈前建立 safety backup；pipeline 的 content/approvals/hash-locked snapshots 是長期作者資產。
- 舊 `.gitignore` 已忽略 dependencies、`.npm-cache`、`.dev-backups`、`.worktrees`、`.wrangler`，新增的是限定 `.dev/` generated locations；沒有全面忽略或刪除 `reports/`、screenshots、assets/content。

## 簡單架構

```text
worktree-create → official git worktree add → active task metadata (no install/copy)
agent Touch → actual work → producer Run → file-ID + SHA256 output proof
agent Complete/Hold → integration evidence / retention reason
weekly Task Scheduler → pinned runtime → mutex → Git snapshot + fsck + actual disk audit
 → unchanged inactive generated outputs → fresh remote/Git/process checks → normal worktree remove
 → refs / every remaining HEAD+status verify → compact latest report / bounded logs
```

`registry.json` 包含建立時間、branch/HEAD、task/owner、lastActivity、status、managed，以及產物 recipe/input SHA256/file proofs。Audit 顯示 dirty/untracked status、未被現存遠端 refs 保留的 commits、mergedMain、程序 cwd/命令及保留原因。legacy created=null、status=hold；不能只等 30 天就變成可刪。最新 Git 觀測只更新 activity，不把觀測時間假當任務完成。

所有 producer、create、lifecycle、audit、cleanup 使用同一 repo named mutex；排程另外 `IgnoreNew`。同時清理直接拒絕，工作區 process/active task 維持保護。命令/cwd讀不到的開發程序導致保守保留。CIM/必要 Git 失敗、中途 refs/HEAD/status改變、刪除錯誤會立即停止後續 destructive actions。

## Agent 標準流程

以下參數由 agent 填寫，不要求使用者日常手動維護。安裝 runtime 路徑見本機 state 和排程 Action。

1. 先重用合適環境；需要新隔離工作區時，從已核對 origin/main 使用 `scripts/worktree-create.ps1 -Name <slug> -Task <actual task> -Owner <agent/thread>`。官方 `git worktree add -b codex/...`；沒有 dependencies/caches/evidence copy 或 install。建立前容量預估到 40 GiB 即拒絕，最多 6 個 managed active task。
2. App 必須使用其 managed-worktree API 時仍可使用，不能繞過 App ownership；建立後用 `worktree-lifecycle.ps1 -Action Adopt` 記錄實際 task/owner。外部 App worktree 本工具不自動移除，改走 App 正規 lifecycle。未知或無任務資訊不能自動 Adopt/Complete。
3. 開始/恢復/重大進度用 `Touch`，記錄 actual activity。主要 root/main-integration/guided dependencies 永久保護，不替所有 worktree install。
4. 新環境確實要跑 Node 才用 `worktree-artifact.ps1 -Action Run -Kind dependencies -Retention ephemeral -Worktree <path> -Path <path>/node_modules`；產物路徑必須不存在，wrapper 執行 npm ci 并使用中央 npm cache。現有 node_modules 不可單靠 Capture 或 lockfile 宣稱沒有手動變更，保留直到另做 byte/provenance investigation。
5. 新 build/test 用 producer Run，明確設定 `-Executable`、`-CommandArguments`、`-Inputs`、新且已 ignored 的 output directory（所有既有來源都支援 `.dev-backups/test-runs/<id>`；新治理分支也支援 `.dev/test-runs/<id>`）。不接受 unignored output，因此清理不會意外改 Git status。只有明確 ephemeral 的成功輸出有期限。保留必要 source、package、lock、build/test scripts；不為清理執行重新生成或重跑整個測試。新增測試產物前若 test/project 已 Critical，拒絕继续生成，不以刪唯一資料滿足配額。
6. 任務結束檢查 git status、commit/整合及現存遠端保留狀態，用 Complete 記錄具體整合/成果證據；有未提交、untracked、本機 commits、草稿或用途未明則 Hold 並寫原因。completed 不會繞過 dirty/local-only/remote safety。
7. 交接後需即時收尾可先 DryRun、再 cleanup；不足 age 會留到每週檢查。禁止任務完成不記 lifecycle 就丟著大型副本。

## 清理層級與 retention

| 類別 | 自動規則 |
|---|---|
| Active，<7 天或 task 明確 active | 全部保留；capacity/count guardrail 仍適用 |
| Idle，7–14 天 | 僅明確登錄 ephemeral、完整檔案清單/SHA256不變、輸入 SHA256不變、無使用線索的生成產物 |
| Stale，14–30 天 / Old，≥30 天 | 同樣 audit；完成的 managed worktree 必須 clean、無 ignored/untracked、本機 commit 已由現存遠端 refs ancestry 保留、無 nested repo/WT、無 process、不 protected，才 normal remove |
| 成功測試 | ephemeral 記錄至少 7 天；release/驗收證據預設 hold，不因成功就丟棄 |
| 失敗測試 | diagnostics hold；處理者 Review、明確指定 ephemeral 且說明不再需保留，至少 14 天後才審查；未知錯誤永久保留並警戒 |
| release evidence / archive | 長期 hold，建議新證據存 `.dev-backups/release-archive`；不搬移、重分類或丟掉舊 tracked reports |
| recovery / DB / unique ZIP/bundle | 無自動期限；警戒不凌駕資料安全 |
| duplicate backup | Capture backup-duplicate 僅接受完整 path/bytes/SHA256 相同且不重疊的 protected recovery anchor；14 天後重驗 anchor 再清；不刪其唯一 recovery copy |
| logs | 本工具自建 compact JSON 最多20份／30天；不輪替未知歷史 logs/reports |
| central npm cache | 本工具自己的 shared cache 30天後，只清 public npm registry index/SHA512及即時 HEAD ETag/length全相符的content，每輪最多64次metadata探測；private/unindexed/修改/離線無證據保留。2GiB阻止後續wrapper install；不清全球npm cache，不把 cache當唯一recovery |

檔案檢查不能只看名稱：未登錄內容永遠不選入；Run 只接受不存在的新输出，producer失敗保留，不把手動改過的已存在 node_modules 認作 disposable。清理再逐檔檢查 native file-ID/bytes/SHA256，使用不共享 file handle 持續持有至 delete disposition；只移除已證明的檔案，再刪空目錄，沒有 recursive-delete、force、reset、clean、prune 或刪分支。tracked檔和 protected資料不做 Level1 刪除。正常 worktree remove 可移除已被遠端保留的 tracked副本。

追加 protected list 用本機 `state/protected.json` 的 `worktrees`、`paths`；只能新增保護。版本控制預設保護 root/main-integration/guided、W20/W42 Honeylight、W79，以及作者內容/assets/data/src/backend、release archive/recovery。獨立 repo、nested repo、未知資料因沒有信任 metadata 自動保留。

## 容量與排程

| 範圍 GiB | Healthy | Warning | High | Critical |
|---|---:|---:|---:|---:|
| .worktrees | <20 | 20–<30 | 30–<40 | ≥40 |
| Project | <40 | 40–<60 | 60–<80 | ≥80 |
| .dev-backups | <10 | 10–<12 | 12–<15 | ≥15 |
| 普通 test output | <0.5 | 0.5–<1 | 1–<2 | ≥2 |
| 工具自己的 shared cache | <0.5 | 0.5–<1 | 1–<2 | ≥2 |

每週日當地時間03:00；登入後補跑錯過排程；Limited/current-user，無保存密碼或SYSTEM權限。Task Scheduler只呼叫已固定hash的本機 runtime，不依賴主工作區分支持續存在。排程僅該 process 使用 ExecutionPolicy Bypass 執行已授權本機工具，不更改電腦/使用者全域 execution policy。無網路不能證明現存遠端時 fail closed，不自行停任何 node/服務。

每次自動 maintenance 都嘗試安全層級 cleanup，Critical 也不能扩大範圍；仍 Critical 留 latest.json 并 exit2，Git/cleanup錯誤 exit1，正常 exit0。root/state/working tree metadata 不受 -DryRun 改動，只有 stdout 計畫。未知內容的容量是 warning，不是刪除授權。

量測使用 NTFS AllocationSize、NumberOfLinks、File-ID。logical/allocated/estimatedRecoverable 分列，外部 hardlink不計可回收；C free delta 是實測且有其他程序波動。OneDrive cloud/recall/offline、junction/symlink或未知 reparse内容不下載、不遞迴操作；既有 OneDrive provider-root directory tag 可通過祖先檢查，內容仍逐項確認。

## 維護範圍的實際限制

安全不能承諾「所有未來資料永遠低於X GiB」：唯一素材/未提交工作仍可能增長，直接用 Git/App 繞過 wrapper 也不會被 Git 強制攔截。這套工具會登錄未知內容、警戒、阻止標準新 worktree 越過 critical；它不會為了達標誤刪。不安裝 Git hooks 或更改 Codex 全域設定。

## 驗證與外部文件

`devtools/disk-governance.test.ps1` 用微型獨立 local Git fixtures（不是 QuestNote工作副本），測試 clean remove、modified/untracked/local-only保留、可清dependencies與dirty source並存、protected、nested、跨程序 lock、Git失敗停止、hardlink與错误SHA保护。測試不 push。

- Task Scheduler multiple instances/start settings：[Microsoft 文件](https://learn.microsoft.com/en-us/powershell/module/scheduledtasks/new-scheduledtasksettingsset)。
- npm cache官方 integrity/content-addressed机制：[npm 文件](https://docs.npmjs.com/cli/v11/commands/npm-cache)。cache并不是唯一 recovery store，不用它保存作者修改。
