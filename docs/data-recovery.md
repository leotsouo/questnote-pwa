# Data recovery — M1

M1 keeps IndexedDB version 3 and the existing five stores. It does not deploy a
new release or operate on live storage. Application backup remains format 2,
including its historical flat/nested aliases.

## Accepted backups

Validate the raw file before normalizing it. Required collections and state
objects must be present, record IDs must be valid and unique, monetary counts
must be finite non-negative safe integers, and duplicate representations must
agree. A file containing only `tasks: []` is not a complete backup.

Profiles verified in Git history: 1.8.1; 2.1.1/2.1.2/2.1.4;
2.2/2.2.7/2.3.5/2.3.7; 2.6.1; 2.7.3; 2.9.0; 3.0.1; 3.4.3/3.4.4.
See `devtools/fixtures/backups/README.md` for exporter provenance and synthetic
fixtures. Another non-future version must provide the entire current shape;
an incomplete unknown format is rejected rather than guessed. Older files and
their validation error report must be preserved for a separately verified adapter.

Export reads all stores in one readonly transaction, then normalizes that single
snapshot in memory. Existing malformed stored state fails preflight instead of
being silently normalized to empty values. Missing later-added records may be
initialized using the verified legacy shape. It does not trigger quest rollovers
or other service writes.
Restore validates before queuing writes and commits all five stores together.
Both asynchronous errors and synchronous DataError/DataCloneError abort the
queued clears. Import preserves the snapshot's draw counts and quest dates;
normal application reads can subsequently perform the usual date rollover.

## Recovery drill

1. Use a separate browser profile/origin or the generated `QuestNoteTest-M1-*`
   databases. Do not use personal data in automated tests.
2. Export the current synthetic profile. Save the JSON outside browser storage.
3. Re-select/read the saved file and check validation and the displayed counts.
   A dispatched download is not proof of durable storage. Retain the original.
4. Restore a different complete fixture, then restore the saved JSON. Compare
   wallet, tasks/subtasks, habits, collection, pity, unlock/grants and claim IDs.
5. Repeat with an injected transaction failure; every store must remain equal
   to the pre-import snapshot. Partial input must fail without any write.

Automated checks: `npm test`; run `npm run test:browser` and open the M1 page
printed by the server. The browser suite uses native IndexedDB under a random
test-only name and cleans up only that database. Use a fresh localhost port with
no service worker. Add `?external=1` to the test-page URL and select the saved
`devtools/fixtures/backups/legacy-3.4.4.json` file to exercise actual file-picker
readback and restore. The suite also checks malformed nested state, transaction
abort, task/subtask and companion DOM rendering. This external fixture is
synthetic; the test never reads a personal backup.

## Rollback and limits

M1 code can be reverted without a database downgrade. Keep the export and
verification improvements when preparing any production rollback; reverting to
the former permissive importer reintroduces its known risks. Never automatically
restore an old user snapshot to roll back a content release.

This is a committed database snapshot, not a guarantee that every existing
multi-step gameplay workflow is atomic. M2A addresses shared gacha writes; M2B
remains deferred. Recovery drills require quiescent clients. Coordinating older
tabs and installed PWA updates belongs to M3A; these local checks do not prove
production deployment or iPhone installed-PWA behavior.
