# Pool Content Contract v1

Status: contract, UI/presentation/reveal adapters, shared schema validation, read-only CLI, and browser harness implemented. No persistent schema changes, production catalog changes, or new dependencies are included. Payment/transaction integration belongs to M2A and browser acceptance is run by the lead engineer after integration.

## Inputs and validation

`src/poolContentContract.js` accepts `{ schemaVersion: 1, pools: [...] }`. Omitted schemaVersion and bare arrays are supported legacy inputs; other versions are errors. Pool IDs and expansion keys are persistent identities, not display labels. Tokens match `^[a-z][a-z0-9_]*$` and exclude prototype-related reserved names. Pet references use the existing standard/SP numeric ID formats.

`validatePoolContent(catalog, { pets, previousPoolsData? })` returns `{ ok, errors, warnings, pools, previews }`. `pets` must be the complete proposed merged pet catalog. Errors contain `level/code/message/path`; invalid JSON-shaped data returns errors rather than throwing. `pools` is the canonical output, but callers MUST NOT use it when `ok` is false. Each preview reports `{ poolId, locked, unlocked }`. Warnings are currently empty. This validates pool-related pet identity, tags, rarity, and reveal metadata; existing pet/Lore/image validators must also run.

Checks apply to inactive and active pools: nonempty unique filters; every referenced tag has candidates; finite numeric rates in [0,1] totaling 1 within 1e-9; all five rates explicit; positive safe-integer cost and pity thresholds; ten-pull cost within safe-integer range; every nonzero rate has candidates; UR pity has a UR candidate; SSR+ pity has positive SSR+UR weight. Both locked and unlocked candidate sets are checked. References must exist in the correct phase. An expansion must add candidates and its gift must be one of those additions.

Optional `previousPoolsData` rejects removal of an existing pool and changes to an existing expansion key/rewardPetId. Disabling a pool and changing its threshold preserve identity. It does not authorize balance changes, validate retained images, or replace release approval/compatibility checks. The pipeline must separately restrict unapproved edits to existing content.

## Pool fields and defaults

Required: `id`, nonempty `name`, boolean `active`, `cost`, `rates.{N,R,SR,SSR,UR}`, `pity.{ssr,ur}`, and nonempty `petFilter.poolTags`. Tags retain OR semantics. There is no implicit all-pets pool. Candidate arrays do not duplicate a pet when multiple tags match.

Optional `presentation` is null when absent. It supports `themeKey`, `animationKey`, `badge`, `eyebrow`, `tagline`, `heroPetId`, up to four `featuredPetIds`, up to three `debutLines`, optional `debutLabel`, and `candidateNote` / `detailsNote`. Default theme is `default`, animation `none`, badge `限定系列`, and other copy empty. Hero is optional. IDs for hero and featured must be available before unlock. Strings remain plain strings; consumers MUST use textContent or proper escaping, never raw HTML.

Optional `unlockExpansion` is null when absent. It supports:

- `key`: required stable identity.
- `threshold`: required positive safe integer.
- `progressScope`: only `lifetime_pool_draws`; default if omitted.
- `extraPoolTags`: required nonempty distinct token list.
- `rewardPetId`: required; actual pet rarity comes from the catalog.
- `animationKey`: default `pool_unlock`.
- `title` / `unlockMessage`: default `卡池擴充` / empty.
- `presentation.heroPetId`: optional added hero.
- `presentation.featuredPetIds`: up to four unlocked candidates.
- `presentation.previewPetIds`: added candidates in display order. Missing or null derives all additions in catalog order; [] deliberately hides the preview cards.
- `presentation.progressLabel` / `candidateLabel`: default `累積召喚` / `解鎖角色`.
- `presentation.detailsNote`: optional plain text for pool details; legacy adapter preserves existing wording.

There is one expansion per pool in v1. Existing byPool storage remains suitable; multi-stage expansion is out of scope.

## Controlled template metadata

Exported frozen registries enumerate keys; they are metadata, not executable UI handlers:

- POOL_THEME_REGISTRY: `default` (no CSS theme), `dream_bloom` (existing `eternal_slumber_bloom` CSS theme), `glacier_arrival` (ice fjord with warm beacons).
- POOL_SUMMON_REGISTRY: `none`, `dream_bloom`, `glacier_arrival`.
- POOL_UNLOCK_REGISTRY: `pool_unlock`, `morning_garden_unlock`.
- PET_REVEAL_REGISTRY: `ssr`, `ur`, `moon`, `petal`.

The runtime integration must bind only these keys to owned rendering functions. New pool IDs do not require new handlers. An additional visual template is a code change with separate tests, never arbitrary script or HTML in content.

`glacier_arrival` uses an owned SVG/CSS scene in `glacierArrivalScene.js` with six beacons, finite transform/opacity animations, and static reduced-motion composition. The shared `playThemedSummon` lifecycle preserves already-committed results, intro skip versus rare-reveal skip, ordered SSR/UR reveals and explicit result dismissal. The legacy `playDreamBloomSummon` entry point remains available. Both templates support first-visit debut; content copy remains inert text. Preview and presentation-only acceptance: `devtools/glacier-arrival-preview.html?auto=1` on a fresh loopback origin. This page opens no database and displays existing pets only as engineering samples.

Pet `presentation.revealKey` and plain-text `presentation.revealCaption` are optional. SSR supports `ssr`; UR supports `ur/moon/petal`. Lower rarities have no SSR+ reveal. Shared pet validation preserves and validates this metadata.

## Pure API

`normalizePoolDefinition(rawPool)` validates structure and returns a fresh canonical pool. It is idempotent; it does not validate references without a pet catalog. Invalid input throws `PoolContentError` with `.issues`. It does not mutate inputs. Use full validation before accepting staged/runtime content.

`normalizeUnlockExpansion(pool)` returns the normalized expansion or null; validates the entire supplied pool structurally. It is intentionally stricter than the old tolerant service normalizer and requires coordinated caller integration.

`resolveEffectivePool(pool, unlockEntry)` returns a normalized pool whose tags include expansion tags only when `unlockEntry.unlocked === true`. Null pool returns null. No storage reads occur.

`resolveDrawCost(pool, count)` only accepts count 1 or 10 and returns pool.cost times count. It validates cost but not the full pool or active status. Transaction callers validate/select the pool separately.

`resolveActivePool(catalog, selectedPoolId)` validates structure, then returns the selected active canonical pool. A stale/unknown selection falls back to the first active pool. No active pool returns null; inactive content is never selected as fallback.

`resolveUnlockGrantId(poolId, expansion)` produces `awakening_reward:<poolId>:<expansion.key>`. `resolveUnlockRewardSource` produces `pool_unlock_reward:<poolId>:<expansion.key>`. Both validate identity. Neither threshold nor reward ID changes grant identity. Neither function grants anything or claims transaction safety.

`resolvePetRevealKey(pet)` returns the explicit supported key, legacy override, or rarity default. It returns null for low rarities and throws on explicit incompatible/unknown keys.

`resolvePetRevealPresentation(pet)` returns `{ key, caption }`, retaining the two legacy captions and using a general rarity caption for new pets unless explicit plain text is supplied.

`resolvePoolPresentationModel(pool, allPets, unlockEntry?, { visualLocked? })` fully validates pool references and returns:

- poolId/poolName, costs.single/ten, canonical presentation, cssTheme.
- phase (`slumber` or `awakened`), awakened/unlocked flags.
- counts.locked/unlocked/effective/added, eligiblePets.
- hero, heroes, featured.
- unlock (independent of presentation): expansion, actual rewardPet, previewPets, grantId, rewardSource, progress.draws/threshold/percent, progressText, description, countsText.

`visualLocked` delays the awakened presentation after a committed transaction. It never changes actual candidate eligibility or persisted unlock state. Returned pet objects reference the supplied catalog and should be treated as read-only. UI animationSeen remains separate from unlocked/rewardClaimed. This module writes neither.

## Legacy adapter and integration constraints

The single legacy identity adapter preserves eternal_slumber_bloom + morning_garden grant `awakening_reward:eternal_slumber_bloom:20` and source `morning_garden_unlock_reward`, independent of threshold. It supplies existing debut text, dawn hero, featured/preview order, labels, and copy. Old theme key `eternal_slumber_bloom` normalizes to `dream_bloom` without changing its CSS attribute. Pet IDs pet_ur05/pet_ur06 retain moon/petal reveals unless explicit compatible metadata is present. Do not add future pool identities to this adapter.

M2A integrates pure costs/eligibility/identity inside its transaction design. The UI uses pool-specific costs throughout and consumes the presentation model; existing schema validators delegate all pool errors without filtering. M5 supplies complete merged catalogs and uses the validation result for staging. No formal catalogs are modified by these files.

## Validation

Run `node --test devtools/pool-content-contract.test.mjs`. Tests cover actual legacy catalogs, two synthetic pools, differing cost and gift rarity, stable independent identities, malformed schema/economics/references, deep-frozen inputs, phase separation, and inactive fallback. Fixtures live in devtools/fixtures and never enter production catalogs.

Not delivered here: IndexedDB atomicity/reward payment, actual transaction tests, publication/rollback, or M5 candidate assembly. Browser cases are provided but must be executed after the lead integrates the M1 baseline and this change. Passing Node tests alone does not satisfy the entire M4 milestone.

## Runtime and browser integration

UI/service boundary: ensureUnlockRewardClaimed(poolId, expansion, allPets) must resolve actual gift rarity and return the latest entry. markUnlockAnimationSeen(poolId) returns the latest entry. The UI never synthesizes rewardClaimed=true on failure. M2A owns those services. A single or ten-pull result retains unlockProgress.entry/justUnlocked/reward.

The existing themed stage and independent unlock/details section remain in the same visual order. Standard hides the wrapper. Unthemed pools can show unlock progress. Debut's seen check does not bypass unlock resume. The legacy animation function name remains a compatibility alias, but developer preview callers now supply a validated model. Registry keys bind only owned controllers; no code is loaded from content.

Repeat-ten confirmation captures pool identity and price, and rechecks both before enqueuing and executing. A changed quote restores the result for a new confirmation. All-inactive or invalid selected content disables gacha without preventing task rendering.

Run read-only validation with node scripts/validate-pool-content.mjs [pools.json] [pets.json] [previous-pools.json]. It prints JSON and exits 1 on errors. Builder preview retains before/after/addedIds and adds unlocked.before/after/addedIds plus preview errors.

Serve the fully integrated repository on a fresh localhost port and open devtools/pool-content-browser-test.html. The harness intercepts every QuestNote database open and redirects it to a random QuestNoteTest-M4 name, checks the name, and deletes only that generated database at completion. It refuses a controlling service worker. It imports the real UI with an isolated fixture DOM and tests independent unlock rendering, legacy copy/phase, plain-text safety, unavailable controls, actual SSR reward overlay/fallback, reveal metadata, and pending resume after an already-seen debut. These default cases exercise an already-paid gift, not reward transaction correctness.

After M2A is integrated, add ?draws=1 to exercise a real fixture single draw followed by cancel/changed-quote repeat-ten confirmation, asserting no additional writes. The final result is JSON in #test-results with a PASS/FAIL document title. Browser and visual validation results are owned by the lead, not inferred from the presence of this harness.

Follow-up: legacy healthCheckService source-string assertions still expect caption/theme literals in old modules and old version/cache names. They should later use behavior/contract checks. This change does not perform a full health-check rewrite.
