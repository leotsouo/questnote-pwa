# Gacha transaction boundary (M2A)

A single draw or complete ten draw now reads and writes `meta` and `collection` in
one native IndexedDB readwrite transaction. A rejected draw commits no debit,
pity, collection fragments, lifetime count, unlock flag or fixed gift.

`dbMutateRecords(reads, reducer)` waits for all native reads, calls a synchronous
reducer inside the final request callback, enqueues its writes, and resolves only
on transaction completion. Async reducers are rejected. No fetch, image work,
UI callback or nested service transaction belongs inside the reducer.

`planGachaTransaction` copies records, resolves the pool and cost from the shared
content contract, and freezes candidates using the transaction's initial unlock
state. Ten results are planned against that one candidate set. Only then are
lifetime draws, threshold crossing and the fixed gift applied. Presentation runs
after the service promise resolves. The existing single/ten result fields remain
available to the reveal UI; ten cost is the pool's single cost multiplied by ten.

The grant identity comes from the shared contract. Existing Morning Garden saves
keep `awakening_reward:eternal_slumber_bloom:20`; unrelated expansions receive
independent identities. Duplicate gifts use the reward pet's actual rarity. The
existing missing-pet recovery is preserved, but an already marked grant never
adds guessed historical duplicate fragments.

## Shared record writers

Wallet energy, materials, stardust and initialization update the latest wallet
inside the same transaction. Collection nickname, migration, fragments, star,
companion selection, pet cooldown, bond and notification updates likewise read
their current record inside the write transaction. Gacha initialization and pool
selection cannot overwrite pity; unlock animation and legacy-backfill updates
cannot overwrite lifetime counts. Companion selection reads all owned entries in
one transaction and preserves a single companion.

Existing atomic mailbox and collection milestone grants already read wallet in
their own META transactions and serialize safely with gacha. The full Task,
Habit, Workshop, Achievement and Expedition reward workflows are still M2B;
M2A does not claim those business operations are all-or-nothing.

`importCollection`, `importGachaStats` and `savePoolUnlockState` are explicit
replacement surfaces with no current runtime callers. Normal operations must not
use them to save a previously read snapshot. Complete user backup restoration
continues through M1's `replaceAllStores` transaction.

## Validation

Run from the repository root:

```text
node --test devtools/gacha-transaction.test.mjs devtools/backup-safety.test.mjs devtools/pool-content-contract.test.mjs devtools/summon-perf.test.mjs
node devtools/v343-reveal-flow-logic-test.mjs
node devtools/browser-test-server.mjs 8766
```

Open `http://127.0.0.1:8766/devtools/m2a-browser-test.html` on an unused local origin.
The browser harness opens two frames and routes their native IndexedDB factory to
one unique `QuestNoteTest-M2A-*` database. It never opens a product database. It
injects synchronous put failures and native transaction aborts, races two clients,
checks shared writer preservation and threshold candidate freezing, then verifies
M1 backup round-trip and deletes only its own test database. Results are visible
on the page and in `window.m2aTestResults`.

## Integration and rollback

- Include `gachaTransactionCore.js` and `poolUnlockCore.js` in the release's required
  app shell, alongside the shared content contract. Version/SW changes are owned
  by the integrating release change.
- `ensureUnlockRewardClaimed(poolId, expansion, allPets)` needs the current pet
  catalog for gift rarity. The UI must use the returned entry and must not assume
  a rejected grant succeeded.
- This change keeps DB version 3, store keys and backup record shapes. Do not run
  a data migration or restore an old user snapshot to revert code.
- Reverting to the old writers reintroduces partial commits and stale-record
  overwrite risks. If a regression appears, disable affected gacha entry points
  or roll forward with compatible code; retain all published catalog identities.
- Already-open old runtime tabs do not use these primitives. M3A must address
  their release transition; successful new-runtime concurrency tests do not
  establish safety for old JavaScript still executing against the same DB.
