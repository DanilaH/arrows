# Archive storage0.35 acceptance

Work is on top of ee334b8 (latest0.34.1), preserving prior audit fixes. Local source verification before CI:

- `npm run check`: PASS,253unit/31files, exact38analytics schemas, typecheck, build/production fixture exclusion.
- New real IndexedDB/Web Locks browser cases:6/6 PASS, phone+desktop; exact normalized migration/reload, aborted transaction after put success, two writers and receipt retention.
- Existing affected browser cases:38/38 PASS (progression, commercial F1/F2/F3/M1, earned cascade/reload). First combined run42PASS/2fixture observer failures: fixture compared unnormalized freshSave to decoder-normalized state; corrected fixture seed, final6/6PASS. Do not count that first run as green.
- `npm run android:sync`: PASS. Local Android SDK absent; Android assembly/signature/DEX and new capacity gate pending hosted CI.
- Capacity730 real dates and rich-history final verification running; earlier script expectation corrected from nonexistent `reserved` commit result to actual `applied`, and final equality uses canonical object keys because existing parseReceipt reorders keys. Values/array ordering and original migration/date ordering remain checked.

No UI/feel changed, so no new animation GIF is required. Physical device/process death/install-update/performance, live SDK/dashboard/money and production signer: NOT RUN. Owner prior qualitative gameplay acceptance retained.
