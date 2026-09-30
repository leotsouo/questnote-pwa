# Award-Level Visual Design Experiment — 2026-09-30

## Scope and source

Only the **task home** is redesigned. It connects real-life work, the companion,
today's progress, rewards and the five main destinations. This is the clearest
single-screen expression of Productivity × Fantasy × Companion.

Clean worktree: `.worktrees/award-concept`, branch `codex/award-visual-experiment`,
based on fetched `origin/main` at `08465aa` (V3.4.24). The historical dirty root
checkout and its drafts are preserved. All new implementation is under
`devtools/award-concept/`; production runtime, data and service worker are unchanged.
There is no release, backend change or deployment in this experiment.

## Product reading

QuestNote translates task completion into star dust, adventure energy and bond
growth. Those resources lead to summons, companions, exploration and crafting.
The existing 72-pet catalog has substantial identity: character illustrations,
rarity, lore, personalities and situational dialogue. The fantasy is strongest
when an everyday action changes the relationship with that character.

The existing home already communicates completion rewards, today/all/smart
views, task categories and progress. Its biggest opportunity is to make those
parts feel like one world rather than adjacent utility panels. The experiment
retains the existing art, Chinese task language, companion dialogue, reward
amounts, growth thresholds and navigation destinations.

## Recent benchmark research

These are design principles inferred from primary award descriptions and visible
compositions, not copied layouts or a claim of having tested every winning app.

| Source | Observation | QuestNote translation |
| --- | --- | --- |
| [Apple Design Awards 2025](https://developer.apple.com/design/awards/2025/) — Visuals and Graphics, Interaction, Delight and Fun | Lumy uses a deliberate palette and focused interface; Denim gives depth and motion a specific job; iA Writer protects focus. CapWords makes learning playful through tangible feedback. Neva connects atmosphere with a companion relationship; Infinity Nikki uses light and texture to build a cohesive world. | A restrained palette, one illustrated scene, quiet work area and an emotional response tied to completion. No decorative RPG HUD. |
| [UX Design Awards — Unity Next, 2025 Concept](https://ux-design-awards.com/winners/2025-1-unity-next-distributed-team-culture-booster) | Its team garden gives collaboration an emotional expression while balancing play with professional use. | Bond and progress appear beside the companion; task entry and completion remain simple. |
| [iF — One UI 7, 2026 award](https://ifdesign.com/en/winner-ranking/project/one-ui-7-the-first-step-to-ai-companion/758314) | The entry describes consistent grids, refined geometry, clear hierarchy and immediate access to useful information. The product launched in 2025; the inspected award is 2026. | Shared spacing, icon stroke, touch sizes and semantic colors. Keep the current task and its payoff easy to locate. |
| [Red Dot — Waypoint, 2025 Design Concept](https://www.red-dot.org/project/waypoint-83177) | Guidance combines practical navigation with relief from travel stress. | Calm orientation and encouragement are part of the task experience, rather than a competing decoration. |
| [CSS Design Awards — The Symphony of Vines, July 2025 WOTM](https://www.cssdesignawards.com/wotm/the-symphony-of-vines/47747/) | The inspected composition combines an editorial title, atmospheric imagery and a clear focal point. | A typographic greeting and the existing forest-wolf illustration open the page; the task notebook then becomes the practical focus. Its layout and cinematic treatment are not reproduced. |

The [Awwwards storytelling gallery](https://www.awwwards.com/websites/storytelling/?ut_source=help_center)
was also consulted for recent examples. Direct project inspection was limited;
CSSDA provides the directly inspected web-design benchmark for this study.

## Visual audit of the current task home

| Dimension | Finding | Preserve / change |
| --- | --- | --- |
| First impression and hierarchy | Three resource cards, saturated category chips, borders and multiple completion controls attract attention before the actual task. | Preserve today planning and exact payoff; make the task title/action dominant. |
| Information density and cards | Repeated category, priority, no-deadline and today badges plus edit/delete/remove controls make each item tall. | Preserve detail access; use ruled rows and one contextual details control. |
| Typography and spacing | Strong bold text is readable, but nearly every region has similar emphasis. Chips and panels create several competing rhythms. | Use editorial serif headings, clean task text, a shared inset and deliberate section spacing. |
| Color and depth | Purple actions, yellow/green rewards, rarity colors, emoji and outlined dark cards each work locally but lack a shared composition. | Keep star dust gold and purposeful priority signals; use paper, ink and sage for the working surface. |
| Pet identity | The small companion panel appears below the long task list and empty overdue section. A first-screen viewer can miss the core relationship. | Keep the original illustration and dialogue. Give the companion a scene and put journey/bond information beside it. |
| Fantasy and emotion | The catalog contains richer fantasy than the homepage conveys. The completion action is practical, but the character connection is distant. | Use forest atmosphere, restrained light and character response to express the world. |
| CTA and navigation | Completion is explicit and the five destinations are familiar; duplicate completion controls and a floating add button compete. | One completion target per task; add near the task heading; consistent SVG navigation. |
| Product maturity | Repetitive badges, equally boxed information, mixed emoji and always-visible CRUD controls give the page a prototype feel. | Reduce visual scaffolding while retaining the useful underlying model. |

The three largest gaps are competing visual emphasis, a disconnected companion,
and inconsistent composition/type/icon treatment. This does not require replacing
the task system or discarding the existing character content.

## Art direction and interaction

**暮光冒險手帳：在安靜的森林暮色裡，與夥伴把日常小事寫成共同成長的旅程。**

Deep indigo holds the character scene; warm paper holds the work. Serif headings
suggest a personal journal, while familiar sans-serif text keeps tasks practical.
Gold means star dust/progress, sage means completion/growth. Paper grain is subtle;
there are no gem controls, ornate borders or glowing primary buttons.

Five main changes: an integrated companion scene; reduced task boxing and metadata;
journey/bond beside the character; completion → progress → reward → encouragement;
consistent icons, touch sizes and restrained motion.

Motion has a specific purpose: a 550ms progress update communicates change; a
720ms small character lift/brightness response conveys encouragement; a short
reward reveal confirms the payoff. The tiny idle light runs only twice. Native
dialogs preserve focus and Escape behavior. Reduced-motion preferences and the
comparison toggle disable animation/transitions; completion remains understandable.

## Content provenance and preservation

The actual current app was run at a separate loopback origin. The local task
「閱讀 QuestNote 設計文件」 was entered and completed while doing that work. Existing
local mailbox rewards produced the displayed 345 star dust / 5 energy; these
are actual local values, not fabricated dashboard metrics. No production-origin
save was read or changed.

Both comparison screens use that same local snapshot plus the two real actions
from this brief: 「製作 QuestNote 首頁視覺實驗」 and 「比較目前版本與新版」. The local
save has no owned companion, so both present the existing gray wolf catalog art,
lore and dialogue as an explicitly disclosed preview. It is not added to the
collection. The current comparison uses the original HTML/styles/renderer with
this readonly snapshot; it is not a claim that the user's production save has
these tasks or owns this pet.

The prototype calls existing pure reward/growth helpers. Completing the important
task previews +45 dust, +2 energy, +12 bond; the normal task previews +20/+1/+5.
These changes remain in page memory. Current comparison blocks game mutations;
the adapter only opens an already-existing database in readonly mode. The local
server blocks service-worker registration and private paths. The comparison
verifier reported identical `tasks`, `meta`, and `collection` before/after preview
interaction. No summon, persistent reward claim or backend request is made by the
prototype.

## Verification and evidence

- `npm test`: **177 passed, 0 failed**, including maintained reveal-flow assertions.
- New JavaScript syntax checks and staged whitespace checks passed.
- Actual app execution and both final screenshot files were visually inspected.
- Browser portrait **393 × 852** and narrow **320 × 693**: no horizontal overflow,
  illustration loads at natural width 960, task text wraps, primary controls are
  at least 44 × 44. Long Chinese/English task content was also checked at 320px.
- At 320 × 693, the first task title ends before the bottom navigation. At the
  page bottom, the preview note remains 40px above the navigation.
- Completion, repeated-claim guard, undo, 100%/empty-day state, add-task, filters,
  keyboard tab navigation, pet response, native dialog Escape/focus, comparison
  switching, reset and reduced motion were exercised.
- Flat-color contrast: primary paper text 11.06:1, secondary text 4.60:1,
  navigation 4.53:1, reward text 5.16:1, completion outline 3.39:1. Hero text sits
  on a dark gradient; the flat night reference is 13.80:1. These numbers do not
  assert contrast at every image pixel.
- No captured console warnings/errors in either final screen.
- Safe-area insets and viewport-fit are implemented. This is browser-size
  verification; physical iPhone Safari, actual notch/home-indicator and Dynamic
  Type remain untested.

Screenshots: [CURRENT](before.jpg), [AWARD CONCEPT](after.jpg),
[current full page](before-full.jpg), [concept full page](after-full.jpg),
[concept page bottom](after-bottom.jpg), [320px concept](concept-320-final.jpg),
[actual app audit](audit-live-current.jpg).

Next screens for evaluation only: **圖鑑 → 召喚 → 探險**. They would extend character
identity, the reward-to-companion moment and the shared adventure. None was
redesigned in this round.
