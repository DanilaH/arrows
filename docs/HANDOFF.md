# Arrows handoff — 2026-11-09

## Current milestone

Stage C source is ready: version 0.3.0 / Android versionCode 4. Home/Continue, Collection (three explicit local records/medals), separate daily/calendar and monthly trophies are connected to the single authoritative save writer. There are 20 own campaign fields plus 61 fixed November/December daily fields. Schema v1 from 0.2 migrates to v2 without changing accepted campaign state or its reward ledger. `STAGE_C_IMPLEMENTATION.md` is the current detailed contract.

Collection unlocks at current level 10, daily at 20. Campaign and each daily date own independent attempts/cameras. Parent Back routing is implemented. League medals remain open and are not imitated. Three local medal thresholds/record rules are explicitly documented adaptations, not reference parity. Full 100-level bank/curation remains E.

D–E remain: themes/sound/settings, native ad placements/cadence/live earning, dashboard delivery, phone feel/performance/process-kill evidence, release signing and RuStore package. The user requested GIFs for visible changes; keep attaching authentic current-build recordings. The temporary control-board link is now on Home and must be removed for release.

## Verification

Current C: strict typecheck/build, 48 unit tests, all 42 browser cases (plus targeted parent-navigation rerun), independent validation of the full 61-day catalog and `android:sync` pass. Native CI/artifact evidence follows separately. See `STAGE_C_IMPLEMENTATION.md`.

Historical B evidence:

Current B: strict typecheck, production build, 39 unit tests, all 32 browser scenarios and `android:sync` pass locally. Added independent validation covers all 20 campaign fields in three removal orders. CI [42600519336](https://github.com/DanilaH/arrows/actions/runs/42600519336) passed both jobs on source `bf3285acdd6457f30ae1ae70daac942229d542f2`. APK 0.2.0 (3): 9,758,477 bytes; SHA-256 `dd5ac5c4133a215533742c6ba5feca7eb9861460c074f9e3dbb23631ebde3cb7`. Its embedded web payload and analytics contract match local `dist`. Evidence: `verification/STAGE_B_BUILD_2026-11-09.json`. The subsequent capture-tool/evidence update does not change that runtime payload. See `STAGE_B_IMPLEMENTATION.md`.

Historical A evidence:

Current Stage A local verification: 28 unit tests, strict typecheck, production build and `android:sync` pass. The full 16-scenario browser run passed after viewport clipping; two additional idle/repeated-entry scenarios and targeted gesture/resize checks pass on the latest source. CI [42594630773](https://github.com/DanilaH/arrows/actions/runs/42594630773) passed on source `aa40b47de64ffd2125c7247d40ce5e769f606acc`: all 28 unit tests, all 18 browser scenarios and native `assembleDebug`. Historical bootstrap evidence below remains separate.

Playable artifact: `Arrows-0.1.0-debug.apk`, 9,727,229 bytes, SHA-256 `a1051511aab1ed2b0f22fd22ce78aaa44df6c7f8dc437da85cf8427b5fff2254`. GitHub artifact `arrows-debug`, ID `13661669838`. Downloaded archive matched its expected digest; every embedded web payload file matched local `dist`, the shared native analytics contract matched, plugin class descriptors and official demo ad unit strings were present. These are payload/build checks, not live SDK or physical-device acceptance. The APK was also made available as a user-facing download.

The user requested GIFs for visible changes on 2026-11-09; this is a standing delivery preference in `AGENTS.md`. The current delivery includes three short recordings of actual production-browser gameplay: bent extraction/reactive dots, blocked-arrow feedback with repeated taps costing only one life, and Nightmare pinch/pan without phantom moves. These are Chromium mobile-emulation recordings, not physical-phone evidence. Reproduce with `npm run build`, then `node tools/capture-stage-a-gifs.mjs <output-directory>` (requires installed Playwright Chromium and ffmpeg). The script records normal UI/touch interactions and writes a provenance manifest. Keep generated GIFs/videos outside Git and attach the GIFs to the user-facing delivery.

Historical initialization evidence:

- Local `npm run check` after native platform integration: typecheck, 15 unit tests, production build pass.
- Local `npm run test:browser`: 8 checks pass across phone/desktop Chromium profiles: real render, readiness, no external service requests, DPR cap, idle RAF, resize, Russian copy, reload and denied storage at startup.
- `cap add android` and sync generated the native project and connected @capacitor/app.
- Follow-up `npm run android:sync` passes with the shared native analytics contract and SDK/plugin source.
- Local host has Java 17 and no configured Android SDK; its Gradle attempt stopped during download (`Network is unreachable`). Native compilation is now confirmed in GitHub CI on JDK 21 / SDK 36: run [42587270211](https://github.com/DanilaH/arrows/actions/runs/42587270211), source `f06236518d89b0d2a4e2cef99745b57a58c40949`, both web and Android jobs passed. `:app:compileDebugJavaWithJavac` and `assembleDebug` succeeded with the real SDK dependencies.
- CI uploaded `arrows-bootstrap-debug`, artifact ID `13660066108`, ZIP size 9,049,055 bytes, archive digest `sha256:a73b796d2d0d0f0f7dc3e04764427c74b62d2958415c525419121e26884c3961`. This is the artifact archive digest, not the embedded APK hash. It contains the debug shell APK and is not a signed production game release.
- These are bootstrap checks. No phone FPS, native advertising, sound or gameplay parity has been measured.

## Repository delivery

The user explicitly authorized initialization, main-branch writes and routine repository work on 2026-11-09. `DanilaH/arrows` was initialized and bootstrap source was published in `main` at `61749a610cc7079e9643df48fabd7ebbc7f92858`; its tree SHA `46bd617a4378510fbdbd16e5cebbae501bc61265` exactly matches the locally checked source. There is no remaining permission blocker for routine repository work.

First CI run `42587117226` failed before native compilation because setup-android's default `tools` package no longer exists, and before browser acceptance because Playwright does not support the runner's new Ubuntu 26.04 image. The corrected workflow requests `platform-tools` explicitly and pins Ubuntu 24.04. Corrected run `42587270211` passed both jobs and produced the debug artifact. The following documentation-only evidence update does not change that verified payload.

## Next work: D and physical acceptance

1. Implement both themes, persisted sound/haptic/language preferences and meaningful UI/board feedback. Do not claim exact original sound without listening/comparing.
2. Complete native ad placements/interstitial cadence and verify genuine earned delivery, interruption and dashboard events on an exact Android artifact.
3. Preserve schema 2 migration, per-date identity, combined writer/receipt ordering and reserved rights. Keep stage C local record policies explicit; League remains open.
4. E: curate the larger bank, extend dated coverage, final identity/icon/splash, production signing and RuStore materials/disclosures.
5. Measure named-device touch/zoom, frame pacing, haptics and process-kill restoration. Browser checks/GIFs do not establish phone performance.

See `KIT_REUSE.md`, `PROJECT_DECISIONS.md` and the replication spec for full scope.
