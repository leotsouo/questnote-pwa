# Local OneDrive governance metadata read repair

Cause: JSON metadata used the same Scan rejection as deletion candidates. Hydrated OneDrive files retain a Cloud Files reparse tag, so local policy and registry could not load.

Repair: the metadata reader opens the exact file with OPEN_REPARSE_POINT and OPEN_NO_RECALL and holds read-only sharing through attribute/tag validation and UTF-8 reading. It rejects directories, offline/recall flags, symlinks, junctions, unknown/name-surrogate tags and files over64MiB. Cleanup Scan and DeleteVerified remain byte-for-byte unchanged.

Actual original installed policy and central registry both read successfully through the fixed source module. The installed scheduler runtime is preserved; this task uses the fixed source wrappers. No scheduled task was changed.

API basis: https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew

Validation: devtools/disk-governance.test.ps1 passed all 37 assertions, including existing cleanup protections and nine metadata reader checks. Central Adopt and governed dependency producer completed successfully.
