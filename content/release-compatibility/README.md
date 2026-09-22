# Frozen old-runtime catalog contract

`v3.4.4` contains the exact four catalog Git blobs from the latest recorded Pages
deployment, `aada9a73e6cf0381fc03359dafd78b70b274cce2`. `baseline.json` records their
SHA-256 values. The release assembler verifies the snapshot before every build
and uses it at the original unversioned `data/*.json` URLs.

Modern clients use a separate hash-addressed complete bundle. A reviewed new-pool
promotion updates authoring catalogs in root `data/`, never this compatibility
snapshot. Keeping this boundary is necessary across the second and later pool
releases: copying the latest authoring catalogs to legacy URLs would expose new
unlock rules to old runtimes that cannot execute them safely.

Changing or retiring this snapshot requires a separate old-client compatibility
decision. It contains public catalog data only, not user backups or database state.
