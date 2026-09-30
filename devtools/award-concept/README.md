# QuestNote Visual Study 01

Original single-screen, localhost-only design experiment. Its approved art direction
is now available throughout the source App as the optional `twilight` theme in
More → Art style. The original comparison and captured baseline remain here.
See [full-theme validation](../../reports/twilight-theme/README.md) for integration status.

From this worktree, run Node.js 24:

```powershell
node devtools/ui-polish-server.mjs 8936
```

Open the explicit file URLs (the server does not resolve directory indexes):

- Comparison: <http://127.0.0.1:8936/devtools/award-concept/index.html>
- Current home: <http://127.0.0.1:8936/devtools/award-concept/current.html>
- Concept home: <http://127.0.0.1:8936/devtools/award-concept/concept.html>

`current.html` loads the original HTML, CSS and renderer, replacing its bootstrap
with a readonly presentation adapter. Its controls are deliberately readonly.
`concept.html` supports task completion/undo, filters, adding a preview task,
companion reactions and contextual sheets. Other screens are outside this study.

Both read the same session baseline. Existing local tasks, wallet and companion
are used where available. Without pending tasks, the two actual actions from the
design brief are shown. Without an owned companion, the existing gray wolf catalog
asset is presented without adding it to the collection. There are no invented
resource balances. This localhost origin is separate from the production origin.

Concept interactions change only page memory. Reloading returns to the baseline;
「重新比較」 refreshes that baseline. The comparison page explains content sources,
offers a reduced-motion toggle, and can verify that tasks/meta/collection have not
changed. No production writes, reward claims, summons or backend requests occur.

Research, audit and verification evidence:
[`reports/award-visual-experiment/notes.md`](../../reports/award-visual-experiment/notes.md).
