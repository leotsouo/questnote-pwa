# Local release artifacts

`prepare-release.mjs` assembles a complete, immutable directory for review. It does
not commit, push, upload, deploy, run the application, or authorize a release.
No production dependencies are added. Node and a source Git checkout with a real
HEAD commit are required; source changes need not already be committed because
every included source file's actual bytes are recorded by SHA-256.

```powershell
node scripts/prepare-release.mjs --project-root . --output-root "$env:TEMP/questnote-releases" --profile preview --scope /questnote-pwa-preview/ --dry-run
node scripts/prepare-release.mjs --project-root . --output-root "$env:TEMP/questnote-releases" --profile preview --scope /questnote-pwa-preview/
```

Use `--profile production --scope /questnote-pwa/` for a production candidate.
`output-root` must be outside the source repository. Scope is required, starts and
ends with `/`, and contains only ASCII letters, numbers, `_` and `-` per segment.
Do not choose a scope merely from these examples: the actual hosting configuration
is a release gate. Preview artifacts declare `QuestNotePreviewDB` and a preview
cache namespace; production declares `QuestNoteDB` and a production namespace.
The runtime must consume that descriptor and native browser tests must verify it.
One origin supports one production scope and one preview scope. Multiple scopes
with the same profile share that profile's DB and cache namespace; they are not
isolated deployments and must not be operated together.
The two scopes must remain fixed and must not contain one another. A production
scope `/` would intercept the initial navigation to a nested preview scope;
use verified sibling paths and check the pair against hosting configuration before release.

Generated releases enter through `src/bootstrap.js`. It checks the index/profile
artifact marker before loading product code, waits for verified worker installation,
and reloads at most once to acquire control. An install failure shows a retry message
without opening the product database. Existing controlled clients keep their active
generation; the application never forces a waiting worker to interrupt an operation.

## Inputs and M5 handshake

Without content input the four existing source catalogs are bundled. With
`--candidate-dir <directory>`, the directory must contain:

```text
candidate.json
catalog.json
validation.json                             (optional, archived metadata)
approvals.json                              (optional, archived metadata)
assets/pets/<new-original-or-variant-images>  (optional)
```

`catalog.json` is the complete bundle consumed by `src/releaseCatalog.js`:

```json
{
  "schemaVersion": 1,
  "petsData": { "pets": [] },
  "poolsData": { "pools": [] },
  "loreData": { "lore": [] },
  "seriesCatalog": { "schemaVersion": 1, "series": [] }
}
```

The empty arrays above document structure only; an actual candidate must pass the
runtime's full pool/pet/lore/series validators. Existing pet, pool, lore and series
IDs must remain present. New content can extend the catalogs. Existing image paths
cannot be replaced with different bytes. Original unversioned source catalogs are
served from the frozen compatibility snapshot so older runtime code is not served
the new pool contract, even after later approved authoring-catalog promotions.

`candidate.json` has `schemaVersion: 1` and a `files` object mapping every candidate
file other than `candidate.json` itself to its lowercase 64-character SHA-256.
For example, `files["catalog.json"]` is the hash of the exact catalog file bytes.
Every other declared path must be `validation.json`, `approvals.json`, or begin
with `assets/pets/`. Candidate/approval/validation metadata is archived under
`release-input/` and excluded from runtime precache. The assembler checks its
hashes and JSON syntax, but does not interpret it as deployment approval.
Unlisted files, missing
files, mismatched hashes, path traversal, symlinks and junctions are rejected.

The transitional API also accepts `bundlePath` and optional `assetRoot` (CLI
`--bundle-path`/`--asset-root`). Asset root contains only `assets/pets/...` files.
This mode records `explicit-local-input`, because it has no candidate manifest.
It cannot be combined with candidateDir. It retains all intrinsic content, path,
reference and collision checks and never grants release approval.

## Deterministic assembly and verification

The exported JavaScript API is:

```javascript
await prepareReleaseArtifact({
  projectRoot, outputRoot, profile, scopePath,
  candidateDir, // or bundlePath + assetRoot
  dryRun: true,
});
```

The artifact ID hashes the actual source file hashes, assembler hash, actual Git
HEAD, profile/scope, canonical bundle bytes and candidate asset/manifest hashes.
It is not inferred from APP_VERSION. Generated files are not fed back into their
own identity hash. The manifest excludes its own file hash for the same reason.

The assembler follows index resources, static ES module imports/re-exports,
literal dynamic imports, CSS URLs, and runtime literal fetches. Bare/external
module imports and nonliteral dynamic imports are rejected. All root data JSON
and existing assets are retained; missing referenced content images fail assembly.
Health-check probes of archived or authoring source are not deployment resources.
The full runtime closure determines precache entries, so new transaction/contract
modules do not depend on a manually updated SW list.
The target source's runtime validator modules must match the assembler's own
checkout. A different validator generation is rejected, avoiding a report that
claims another runtime's contract was validated by the wrong code.

Generated output includes:

- `data/releases/<bundle-sha256>/catalog.json`, plus frozen legacy catalogs from
  `content/release-compatibility/v3.4.4/` (actual `aada9a7` Git blobs, verified by manifest hashes).
- `src/releaseProfile.js` pointing exclusively to that content generation.
- An index `questnote-artifact` meta marker matching the generated descriptor,
  so bootstrap can refuse a partially deployed index/profile combination.
- Production or preview manifest with consistent id/scope/start URL.
- Matching version/SW cache names containing the artifact ID and SW registration
  URL containing that identity.
- `PRECACHE_URLS` and `PRECACHE_HASHES` computed from final generated bytes.
  Pet images remain runtime cached; mailbox remains dynamic; SW itself is excluded.
- `release-artifact.json` with every other file's hash/size, source provenance,
  local checks, and explicit uncompleted external release gates.

Output is first written to a unique staging child, verified, then renamed into
`<output-root>/<artifact-id>`. A repeat call verifies and reuses identical output.
Different, extra, corrupt or missing files in an existing artifact cause failure;
the assembler does not repair or overwrite that artifact. Dry-run performs local
checks without creating output or staging directories.

## Release and withdrawal gates

Every generated report has `releaseReady: false`, `liveBaseline: "UNKNOWN"`,
`nativePwaValidation: "NOT_RUN"`, and `deploymentApproval: "NOT_GRANTED"`.
Passing local checks does not establish current production deployment identity,
compatibility with installed older workers, native update/rollback behavior, or
approval to deploy. Main integration owns those checks and the separate release
decision. Image dimensions, original/variant derivation, visual quality and Lore
approval belong to the content pipeline; this assembler verifies image references
and hashes, not artistic correctness.

Withdrawal disables the pool while keeping all existing pet/Lore/image/identity
records. Do not delete newly owned content or restore users' pre-release wallets
as a deployment rollback. Runtime rollback must read the current save format;
otherwise prepare a forward fix.

Focused verification: `node --test devtools/release-artifact.test.mjs`. This test
uses an isolated temporary Git project and synthetic tiny image bytes, never user
IndexedDB. The assembler deliberately does not run `npm test` itself.

The native `release-artifact-browser-server.mjs` harness accepts the scopes recorded
in the supplied production/preview artifacts, including the verified hosting path.
It rejects root scopes, overlapping scopes and overlap with its own `/test/` path.
It binds a fresh loopback port and verifies all artifact file hashes before serving.
Only visit `/test/` on a fresh test origin: the suite creates and cleans its own
test saves. A separate server instance can serve `/preview/` for manual review.
These local scopes do not establish a publicly configured preview host.

## Deployment evidence collected during implementation

Read-only GitHub API verification on 2026-09-23 (Asia/Taipei): the latest repository
workflow is [Pages run 30220073263](https://github.com/leotsouo/questnote-pwa/actions/runs/30220073263),
`pages build and deployment`, branch `main`, commit
`aada9a73e6cf0381fc03359dafd78b70b274cce2`, completed successfully at
2026-07-26T20:58:27Z. Its deploy job reports the environment URL
`https://leotsouo.github.io/questnote-pwa/` and that same deployment commit.
The `github-pages` artifact (8636941269) records digest
`sha256:cbd4f01124996029144d46fa27754034a4437bd9cf5207e05f1098366a83d3b6`,
but is expired. This identifies the latest recorded deployment source, not the
bytes currently served to every client.

Direct live-file verification was unavailable (local TLS connection failed;
the web reader could not access the JS URLs). Certificate validation was not
disabled. CDN byte identity, preview hosting configuration and the range of
still-installed client/SW versions remain external release checks. The bootstrap
explicitly refuses to start a new artifact under an incompatible legacy controller;
it prepares the update and asks that all old clients close naturally.
# Current integration and Preview

See [final integration](final-integration.md) for the authoritative branch, reviewed real candidate, Preview destination and cache-recovery fix. The existing HTTPS Preview is the separate `leotsouo/questnote-pwa-preview` repository, scope `/questnote-pwa-preview/`, using only the assembled `preview` profile. Historical production deployment examples below do not authorize a production push.
