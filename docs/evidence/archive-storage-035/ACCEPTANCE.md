# Archive storage0.35 acceptance

Work is on top of ee334b8 (latest0.34.1), preserving prior audit fixes. Local source verification before CI:

- `npm run check`: PASS,253unit/31files, exact38analytics schemas, typecheck, build/production fixture exclusion.
- New real IndexedDB/Web Locks browser cases:6/6 PASS, phone+desktop; exact normalized migration/reload, aborted transaction after put success, two writers and receipt retention.
- Existing affected browser cases:38/38 PASS (progression, commercial F1/F2/F3/M1, earned cascade/reload). First combined run42PASS/2fixture observer failures: fixture compared unnormalized freshSave to decoder-normalized state; corrected fixture seed, final6/6PASS. Do not count that first run as green.
- Actual unmodified game after startup migration:2/2 PASS (phone+desktop), actual taps/last-flight victory/reload/Next, daily archive and lifetime gift retained. Total distinct affected browser cases46PASS.
- `npm run android:sync`: PASS. Local Android SDK absent; Android assembly/signature/DEX and new capacity gate pending hosted CI.
- Capacity730 real dates and rich-history final verification PASS (capacity-local.json):54-field4,187,443-byte migration,55th succeeds,59,149,769-byte logical rich profile,122-byte root,maximum physical value20,625bytes. Presentation+one accepted move writes96,254bytes across21values, not the59MB archive. Cold rich reload9,666ms/warm95ms/total172,658ms in Node; no phone performance claim. earlier script expectation corrected from nonexistent `reserved` commit result to actual `applied`, and final equality uses canonical object keys because existing parseReceipt reorders keys. Values/array ordering and original migration/date ordering remain checked.

No UI/feel changed, so no new animation GIF is required. Physical device/process death/install-update/performance, live SDK/dashboard/money and production signer: NOT RUN. Owner prior qualitative gameplay acceptance retained.

## Hosted acceptance — source44a7da5 / CI44063551909

- release-audit job133971296158: SUCCESS. Downloaded artifact14320215529, SHA256bcbee3408a640212293882a6c76060c99b9eadd4e7e1cfac55c41a401fed03d7 verified. capacity-ci.json: gate PASS,54→55→730dates,727complete/3partial/21cups,59,149,769-byte logical profile, root122bytes; exact semantic reload/effect+dedup/lifetime gift PASS. Cold rich profile7,725ms/warm80ms Node; phone performance remains unverified.
- Release-mode web32states/5profiles/0runtime errors/0horizontal overflow: PASS (matrix-ci.json). Actual headless Chromium + controlled native transport, no physical/live claim.
- Android debug +21JVM/7files/0failures/errors/skips + signed .playtest: PASS. Native XML artifact14318609885 ZIP SHA256d4895303d96e797feb1b7ac903dd19b8d5b64e718b439d160cdabc4f5176f40b verified.
- Playtest APK27embedded web files and native analytics contract exactly match local checked dist. Package/version/signature verified from official aapt/apksigner artifact14319372274 (ZIP SHA2560a5222ccf4ed8357d13111deb5e506835347e031074622f33514dd100a0ead45). APK artifact14318714619 ZIP SHA2563e6321cdc2fed089556d23b4e30ecf0ef83399273d530d658a53e5c87779660d. Actual APK11,016,242bytes/SHA2561d252fd4a829bfeea41326ee2e17d59b92e3087f3fe289dafcacbb580a6e9b8b. Same .playtest cert533aa2ff18337e3b3630c1363e7fe49f98e6b21371ce715689d2cbbf2e45ea36; forced test ads/analytics OFF. See playtest.json and its permanent download link.
- Android job133971296700: SUCCESS. Optimized R8 releaseCheck/official signature-v2, zipalign16k, portrait manifest, all bridge methods including new storage list, exact release-only web/analytics contract and forced test SDK configuration: PASS. Evidence artifact14318799200 ZIP SHA256485e261a5c5231d97319e028065e2f6d40a060662016acc8cab9a3b31011c017 verified/downloaded; report releasecheck.json. It is a test-signed .releasecheck, not production signer/update proof. Full502-case browser repeat remains running at this checkpoint. Do not label aggregate CI green. Production without live IDs/signer remains intentionally blocked.

Historical0.34.1failed capacity evidence is unchanged. Only that software capacity blocker is resolved by this package, not live release/device acceptance. UI/feel/content/sound are byte-preserved; no new GIF/audio needed for this internal change.
