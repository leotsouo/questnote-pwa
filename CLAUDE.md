# CLAUDE.md

專案規範維護在同層的 `AGENTS.md`，Codex 與 Claude Code 共用同一份，避免兩邊內容分歧。
下面這行會讓 Claude Code 自動載入完整內容：

@AGENTS.md

## Claude Code 對應說明

- 規範中提到「Codex」之處，在 Claude Code 中同樣適用。分支前綴 `codex/` 沿用，不改名，以免打斷既有工具與文件的引用。
- 規範中的模型建議以 Claude 對應：GPT-6 Luna → Haiku；GPT-6.1 Sol → Sonnet；GPT-6 Astra → Opus。
- `.agents/skills/` 內的專案 skill 不會被 Claude Code 自動載入；需要時直接讀取該 `SKILL.md`。
- 需要 Node.js 24 與 `npm ci`（feedback 後端測試用 `node:sqlite`）。
- 暫時工作副本請依 `AGENTS.md`／`docs/disk-governance.md` 走 `scripts/worktree-create.ps1`（Windows PowerShell），不要手動 `git worktree add` 後留下沒有 metadata 的大型目錄。
- 發布公告與補償信件（`data/global-mailbox.json`）有每日巡查流程，見 `docs/questnote-watch.md`（在 `tools/questnote-watch` 分支）；不要手動改信箱檔再推送，以免與巡查狀態衝突。
- 不做 force push、reset、clean、prune 或刪除分支（見 `AGENTS.md`）。
