# 2026-10-02 公告與補償合併更正

- 更正使用者回報的問題：原 V3.5.1 更新公告與補償分成兩封，公告本身無領取按鈕。
- 以最新正式版本 V3.5.8 更新摘要，將更新重點與補償整合至補償信 `2026-10-frequent-updates-compensation-01`。信件類型保持 `compensation`，沿用原 reward identity，已領者不會因更正再次領取。
- 停用原公告 `2026-10-v351-cumulative-update`，避免顯示沒有領取按鈕的更新信。原補償維持 1,000 星塵、10 冒險能量、3 份小份靈食，期限 2026-11-02 23:59 +08:00。
- 更新摘要涵蓋 V3.4.21 至 V3.5.8 的新內容與已修復問題。`validateMailboxDocument()` 通過，無 errors/warnings；`git diff --check` 通過。
- Source commit：`2cab8cadfdc0648a7207207c4c2f6de0c1c4dac6`。
- Pages commit：`23ddaa4d3c21756da5d6986e5b60836ea08daab3`；[deployment run 36986454984](https://github.com/leotsouo/questnote-pwa/actions/runs/36986454984) 成功。
- 正式 HTTPS `data/global-mailbox.json` 讀回與 source commit 位元組完全一致，SHA-256：`8531b110cc63668d1f4899ca3f0dcddfeb4b7b07f82ccb0460c059afd23ad57e`。已確認整合信為 V3.5.8 `compensation`、含原獎勵，獨立無獎勵公告已停用。
- 信箱依既有規則在使用者開啟 App／刷新時更新；沒有操作使用者存檔，也沒有代領獎勵。
