# Arrows handoff — 2026-11-09

## Current milestone

Version 0.3.3 / Android versionCode 7 keeps the rich versioned monthly trophy art and large viewer, but removes future-collection browsing at the user’s request. Collection only exposes months backed by the installed daily catalogue; the sole 2026 year is a plain label. The frozen reserve of 240 compositions for 2026–2045 remains in source, with no player route into art-only future years. Actual daily tasks still cover all 365 dates of 2026; campaign remains the initial 20-level chapter. See `TROPHY_CATALOG_V2.md` for the current contract.

Save schema 2 adds an earned-design binding map. Pre-update awarded cups retain their original v1 design; new awards atomically bind v2 IDs. Do not edit a published style library to reinterpret existing trophies. Keep the writer/receipt ordering and separate campaign/date ownership intact.

Stage C navigation/records remain: Collection at current level 10, daily at 20, independent attempts/cameras, and three explicitly adapted local medals. League is still open. The temporary control-board review link is on Home and must be removed for release.

D–E remain: themes/sound/settings, native placements/cadence/live earning, dashboard delivery, physical-phone feel/performance/process-kill evidence, release signing and RuStore package. Keep attaching authentic GIFs for visible changes.

## Verification

Current visibility correction: strict typecheck/build, 53 unit tests, all 14 relevant browser cases on phone/desktop and `android:sync` pass locally. [CI 42621244791](https://github.com/DanilaH/arrows/actions/runs/42621244791) passed both jobs on source `9a87bfce9f6859d6f5274840e361fb2a0d7c5ba7`, including all 46 browser cases and Android `assembleDebug`. APK 0.3.3 (7): 10,169,565 bytes; SHA-256 `ac652e9c47283e1201df86e4aad5e61a540fc0b7c6c5a7f827c1a4fd1804c31f`. Every embedded web payload file, shared analytics contract and recorded GIF runtime match. Evidence: `verification/TROPHY_VISIBILITY_BUILD_2026-11-09.json`. The documentation-only follow-up does not alter this runtime.

Historical 0.3.2 trophy art: strict typecheck/build, 53 unit tests, the full 46 browser cases and a final 14-case preview/navigation rerun pass. Catalogue/legacy-award identity checks and `android:sync` pass. [CI 42612344212](https://github.com/DanilaH/arrows/actions/runs/42612344212) passed both jobs on source `9c7b585e8b2736875a8471697cf8b6954864f476`, including all 46 browser cases and native `assembleDebug`. APK 0.3.2 (6): 10,169,845 bytes; SHA-256 `0055fd1e0f96ae0568d48ea6bc7b13001169cb7c4d79fb7c81bee5803b88e938`. Embedded web code/analytics contract and both recorded GIF runtimes match. Evidence: `verification/TROPHY_V2_BUILD_2026-11-09.json`. The subsequent documentation-only evidence update has the same runtime payload. See `TROPHY_CATALOG_V2.md`.

Historical year expansion evidence:

Current year expansion: strict typecheck/build, 50 unit tests, independent validation of all 365 dates, original-61 fingerprint regression and `android:sync` pass. All 44 browser cases pass locally and in CI. [CI 42608044200](https://github.com/DanilaH/arrows/actions/runs/42608044200) passed both jobs on source `c2f36ab5810c7be3cd84b5edf65ddc0a4320d01c`. APK 0.3.1 (5): 10,155,221 bytes; SHA-256 `3c7a1988085cc9cc786667f46ecd9a136dabc8aa2c468aeebea375d9203a403c`. Embedded web code/schema and recorded GIF runtime match. Evidence: `verification/DAILY_YEAR_BUILD_2026-11-09.json`. The capture/evidence follow-up does not alter that payload. See `DAILY_YEAR_2026.md`.

Historical 0.3 evidence:

Current C: strict typecheck/build, 48 unit tests, all 42 browser cases (plus targeted parent-navigation rerun), independent validation of the full 61-day catalog and `android:sync` pass. CI [42604407637](https://github.com/DanilaH/arrows/actions/runs/42604407637) passed both jobs on source `4edd27fe30c14fe2da3ab5ab0945f5563d12f2a3`. APK 0.3.0 (4): 9,832,101 bytes; SHA-256 `f7ad4218b791022eae1dd5c26382bf03be665a6168a1e41cf772c3f30b663534`. Its embedded web code, analytics schema and recorded GIF runtime match. Evidence: `verification/STAGE_C_BUILD_2026-11-09.json`. Subsequent capture-tool/evidence updates do not change this payload. See `STAGE_C_IMPLEMENTATION.md`.

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
