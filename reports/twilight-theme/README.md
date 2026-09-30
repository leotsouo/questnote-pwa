# V3.4.25 · 暮光冒險手帳

The user approved Visual Study 01 and authorized a full-App third selectable theme.
Implementation continues in `codex/award-visual-experiment`, based on current
`origin/main` V3.4.24 (`08465aaa`). The preserved dirty root checkout was not edited.
This report records the local source implementation, not a production deployment.

## Use

Serve this worktree with `node devtools/ui-polish-server.mjs 8936`, then open
<http://127.0.0.1:8936/index.html>. Choose **更多 → 美術風格 → 暮光冒險手帳**.
The settings page also retains 深色幻想風 and 甜美可愛風. Preference persists on
reload and is included in valid export/restore snapshots. Defaults remain unchanged.

## Scope

- Task notebook: real today plans, source rewards, companion art, dialogue, bond
  progress and cooldown; completion and pet touch use the existing service handlers.
- Summon, collection, expedition map/camp, habits, achievements, workshop,
  handbook, guide, sharing, feedback and settings: common paper surfaces, ink,
  sage actions, serif headings and accessible focus/targets.
- Shared forms, pet details, mailbox, dispatch and summon results match the theme.
  Authored card-pool scenes retain their content identity; ordinary rare reveals
  adopt a restrained night palette.
- No task/reward/economy/authentication/backend rules or catalogs were changed.
  Backup schema only expands the accepted appearance enum; cache/version are synced.
- Original study routes and older themes remain selectable.

## Evidence

- `npm test`: 177 maintained tests + reveal-flow assertions + 4 new theme tests pass.
- `node --check`: all modified runtime and test JavaScript pass.
- `git diff --check`: pass (only normal repository CRLF conversion notices).
- [Browser theme checks](browser-theme-checks.txt): 40 checks pass, including all
  three preferences, reload, complete stored-data equality during theme switching,
  backup validity, cancel editing, 12 views at 390 × 844 and 44px targets.
- [Synthetic summon checks](browser-summon-checks.json): 15 checks pass across all
  three themes, including rapid-click single charging, ten-draw costs/compensation,
  results, closing and lock cleanup. UUID test DB is separate and cleaned by its harness.
- [320px checks](viewport-320-checks.json): all principal views fit 320 × 693.
  First task title bottom 601.5px; completion bottom 600.8px; nav top 621.3px.
- Manual browser checks: completion gives source rewards (80 dust, 3 energy,
  +20 bond); touch adds source +5 bond and shows the existing four-hour cooldown.
  Pet image/detail, collection cards, map art, forms and three-choice picker checked.
- Original local origin retained one completed task, 345 dust, 5 energy, zero
  owned pets; it correctly shows the waiting-for-a-companion scene, not a fake pet.

Screenshots: [picker](theme-picker.jpg), [320px home](home-320.jpg),
[summon](gacha.jpg), [collection](collection.jpg), [map](expedition.jpg),
[home](home.jpg). Screenshots of populated views use explicitly labeled UI-test
tasks with actual catalog pets on isolated localhost port 8937.

This is browser viewport validation. Native iPhone safe-area, installed PWA,
touch hardware and system reduced-motion behavior still need a device check.
