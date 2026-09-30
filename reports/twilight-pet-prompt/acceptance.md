# V3.4.27 twilight petting prompt position

The twilight petting button and cooldown text are now below the portrait scene,
on the right of the companion dialogue. The button uses a fixed 148 × 44px box
for both ready/cooldown states. Old absolute positions, invisible large image
hit areas and small-screen position overrides were removed. Empty-collection
dialogue retains its existing spacing. The petting action, cooldown computation,
bond rewards and update selectors are unchanged.

Source branch: `codex/twilight-pet-prompt-position`, from `a466173` on main.
Version and Service Worker cache identifiers are synchronized at V3.4.27.
This is a local source/preview adjustment; production is still V3.4.26.

## Validation

- `npm test`: all 183 Node cases plus summon/reveal assertions passed.
  [Output](npm-test.log).
- Syntax checks passed for twilightPresentation, version and Service Worker;
  `git diff --check` passed.
- Actual App checks used disposable loopback browser contexts, blocked Service
  Workers and blocked external requests. A companion was seeded only into these
  disposable contexts. The real UI petting action entered cooldown and awarded
  its existing five bond EXP. Ready and cooldown button geometry remained fixed.
- 430 × 932, 393 × 852, 320 × 740 and 1280 × 900 were checked with simulated safe
  insets. The button lies entirely below the image scene, does not overlap the
  dialogue, retains at least a 44px touch target and contains the long hour/minute
  label. No horizontal overflow or uncaught app errors occurred.
  [Geometry results](after-checks.json).
- Before screenshots loaded the unchanged origin/main presentation/CSS in memory;
  no source reset or user save was used. [Visual comparison](comparison.html).

Physical iPhone native status-bar acceptance remains separate from these
layout checks. The previous safe-area fix is retained.
