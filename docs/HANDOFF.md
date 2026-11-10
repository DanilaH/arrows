# Arrows handoff — 2026-11-10

## Current milestone

Version 0.12.0 / Android versionCode 17 implements the approved assistance feel pass: custom vector hearts, staggered recovery after dialog/ad return, a one-shot earned-Hint light pass and completed-field/new-field handoff. The rewarded lives entry waits for its own dialog blocker to close before invoking ads. See `ASSISTANCE_FEEL.md`.

Previous minimal UI milestone:

Version 0.11.0 / Android versionCode 16 implements the user-approved minimal UI pass: unframed Home/result/award shelf, stable bottom navigation, 59px phone HUD with 44px controls, growing held-preview ray and restrained transitions. Hint now appears after three active seconds and enters explicit video loading directly. See `MINIMAL_UI.md`. All content, saves, receipt authority and ad cadence remain unchanged.

Previous feel milestone:

Version 0.10.0 / Android versionCode 15 adds route-aware blocked-arrow contact/return, impact-timed sound/haptics, shared-art staggered menu transitions and finite confetti/result celebration. Content catalogue 5 and all embedded progress remain unchanged. Read `FEEL_PASS.md`. Verification is recorded below; physical-phone sound/vibration/performance acceptance remains open.

Previous dense-bank milestone:

Version 0.9.0 / Android versionCode 14 rebuilds fresh c05–c120 with dense contentVersion 4 after the user-authorized quality pass. All 116 silhouettes meet ≥98% fill and bounded accidental gaps; Hard/Nightmare have substantially stronger blocking and early-solve freedom gates. Twenty silhouette families and breathers remain. c01–c04 are unchanged v3; catalogue 1/2/3/4→5 preserves all embedded attempts, pending rights, daily/trophy content. The bank has 4,171 arrows. Read `CONTENT_BANK_V4.md` and `verification/CAMPAIGN_SELECTION_V4.json`. Structural metrics are not player difficulty/performance evidence.

Previous compact-opening milestone:

Version 0.8.1 / Android versionCode 13 tightens the first four fields after direct comparison with V06. Fresh contentVersion 3 uses small fully occupied tiles and the small-field camera caps initial cell spacing at 18px. At 390px width c01 is 90×90 CSS px instead of 180×180, with adjacent paths filling its rectangle. Catalogue 1/2/3→4 preserves all embedded attempts; c05 onward/daily/trophies are unchanged. See `COMPACT_OPENING_V3.md`. Tests and exact build/GIF evidence are recorded below.

Previous UI milestone:

Version 0.8.0 / Android versionCode 12 addresses UI/motion/opening-field feedback. Home uses a framed live board preview and selectively generated Collection/calendar illustrations. Buttons, route changes and dialogs have bounded motion with reduced-motion/background settlement and modal blockers retained through close. Fresh c01–c20 fields use contentVersion 2: hand-composed bent/blocking openings, then selected denser silhouette candidates. Catalogue 1/2→3 preserves **all embedded existing attempts**; the published c21–c120 and daily/trophy catalogues are unchanged. See `STAGE_F_UX_POLISH.md`. Browser/build verification and native artifact evidence follow below; physical acceptance remains open.

Previous identity milestone:

Version 0.7.0 / Android versionCode 11 replaces Capacitor launcher/splash art with a shared project-owned bent-arrow mark, adaptive/monochrome/legacy vector icons and matching initial HTML/native launch surfaces. The normal application exposes no control-board review route and excludes the control catalogue from its bundle. Review-only render/gesture tests use an isolated in-memory entry. Readiness still follows first render/uncovered paint; there is no new SDK dependency or minimum brand hold. See `STAGE_E_IDENTITY.md`. Native masks/launch transitions remain device acceptance, not browser proof.

Previous campaign milestone:

Version 0.6.0 / Android versionCode 10 expands the fixed campaign from 20 to 120 fields (3,717 arrows), preserving every original field. New fields rotate twenty silhouette families with short/normal/Hard/Nightmare pacing, longer bent paths and offline structural selection. Catalogue 1→2 upgrades are append-only; completed c20 continues into c21 explicitly, partial attempts and all daily/award/receipt state remain authoritative. Home now derives total progress from the installed bank. See `STAGE_E_CAMPAIGN_BANK.md`. Device playtesting still needs to establish actual difficulty and phone feel.

Previous advertising milestone:

Version 0.5.0 / Android versionCode 9 connects explicit after-win interstitial transitions, durable active-time/two-win/first-six protection, visible cancellable rewarded loading, foreground-safe continuation, queued native earned receipts and correlated ad/analytics events. Original effect+dedup and exact-ack authority remains in ProgressStore. See `STAGE_D_MONETIZATION.md` for policy and failure contracts. Default APK is test ads; real SDK fill/earned behavior and AppMetrica dashboard delivery are not yet established.

Previous presentation milestone:

Version 0.4.0 / Android versionCode 8 adds live light/dark themes, an accessible settings dialog on Home/gameplay, persisted independent sound/vibration and RU/EN preferences, and original bounded UI/board/life/hint/victory/award cues. Theme/language changes preserve current attempt, camera, errors, receipt ownership and mode. Separate preference storage cannot overwrite progress. Native system-bar icons follow the theme; physical-device feel remains unverified. See `STAGE_D_PRESENTATION.md`.

Previous trophy milestone:

Version 0.3.3 / Android versionCode 7 keeps the rich versioned monthly trophy art and large viewer, but removes future-collection browsing at the user’s request. Collection only exposes months backed by the installed daily catalogue; the sole 2026 year is a plain label. The frozen reserve of 240 compositions for 2026–2045 remains in source, with no player route into art-only future years. Actual daily tasks still cover all 365 dates of 2026; campaign remains the initial 20-level chapter. See `TROPHY_CATALOG_V2.md` for the current contract.

Save schema 2 adds an earned-design binding map. Pre-update awarded cups retain their original v1 design; new awards atomically bind v2 IDs. Do not edit a published style library to reinterpret existing trophies. Keep the writer/receipt ordering and separate campaign/date ownership intact.

Stage C navigation/records remain: Collection at current level 10, daily at 20, independent attempts/cameras, and three explicitly adapted local medals. League is still open. The control-board review link has been removed from the normal application; its catalogue is supplied only by isolated test fixtures.

D–E remain: exact-device SDK fill/live earned acceptance, dashboard delivery, physical-phone sound/haptics/system-bar/feel/performance/process-kill evidence, human bank playtesting, physical native-icon/splash acceptance, signing and RuStore package. Keep attaching authentic GIFs for visible changes.

## Verification

0.12.0 local: `npm run check` passes (85 TS tests and production build); all fourteen new assistance browser cases pass on phone/desktop emulation. Native sync and twenty-two related feel/minimal-UI/motion/idle cases also pass. CI assembly and exact artifact/capture verification follow in the final evidence record.

Current 0.11.0: [CI 42873215357](https://github.com/DanilaH/arrows/actions/runs/42873215357) passes both jobs on source `310d9324e91ac44a0cd88de4e3e737b811cbf86b`: 85 TS tests, all 94 browser cases (76 ordinary application, twelve isolated real-control and six isolated ads), seven JVM tests and Android assembly. Final local typecheck/build/native sync and fourteen focused browser cases pass. Earlier 0.11 checks exposed a real footer recentering race after tutorial removal and summary focus loss during async Collection refresh; stable transparent text bounds, middle-aligned Hint/directions and stable summary IDs fix them, with direct regressions. Idle smoke checks the same quiescent RAF window within a bounded deadline; no phone performance claim follows from software-rendering timing.

The normal phone HUD measures 59px with 44×44 controls; visual QA covers 390px dark, 320px light, short landscape and keyboard disclosure, with no horizontal overflow. Three-second Hint timing excludes menu time and its appearance does not move the camera/footer. APK 0.11.0 (16): 10,217,130 bytes; SHA-256 `df8aa2ac88d87fad76db3c289fd4bfc86e523764404a41a13b75ebee0f7a2d4b`. Both archive digests, manifest, all eight bundled web files, native configuration/analytics and compiled feedback profile match. Delivered GIFs/actual-output sound MP4 share this exact payload. Gameplay is a fresh one-win session; the separate menu session starts fresh and earns nineteen wins by real touch, with zero daily wins/cups. Its actual browser no-provider Hint response is visible; no ad or reward is staged. Evidence: `verification/MINIMAL_UI_BUILD_2026-11-10.json`. The evidence-only follow-up changes no application payload. Physical-phone sound/vibration/performance and live-service/signing/store acceptance remain open.

Historical 0.10.0:

Current 0.10.0: strict typecheck/build, 85 TS tests, full 86-case browser run and `android:sync` pass locally. The final shared-art layout refinement passes twelve focused phone/desktop cases. [CI 42825677737](https://github.com/DanilaH/arrows/actions/runs/42825677737) passes both jobs on source `3c0045efc6585a12b58f7bf9c9e753f9eece59c1`: all 85 TS tests, all 86 browser cases (68 ordinary application, twelve isolated real-control and six isolated ads), seven native JVM tests and Android assembly. Visual checks cover dark phone, light 320px, short landscape, reduced motion and narrow Collection/calendar. Background during collision or final flight produces no stale impact/replayed victory and keeps canonical lives/progress. APK 0.10.0 (15): 10,215,374 bytes; SHA-256 `577dbc563fdc297e4bdcebe99708136f8e2e8dc2400812d8527de48ab996dd4d`. Both archive digests, manifest, all eight bundled web files, native configuration/analytics and compiled feedback profile match. Two authentic production GIFs and an actual-output audio MP4 use the same payload; the fresh recording earns nineteen wins by ordinary touch with zero cups/daily wins. Evidence: `verification/FEEL_PASS_BUILD_2026-11-10.json`. The evidence-only follow-up changes no application payload. Physical-phone sound/vibration/performance and live-service acceptance remain open.

Historical 0.9.0:

Current 0.9.0: strict typecheck/build, 81 TS tests, offline tool typecheck, compact-writer bank identity, 22 relevant browser cases and `android:sync` pass locally. [CI 42790495206](https://github.com/DanilaH/arrows/actions/runs/42790495206) passed both jobs on source `6f66a340a93adb3ba5f209b5a51f54c3b7d3e42a`: all 81 TS tests, all 80 browser cases (62 ordinary application, twelve isolated real-control and six isolated ads), five native JVM tests and Android assembly. All 120 fields are independently solved in three orders with exact legal-choice comparison; all 116 dense replacements meet quality gates. Actual production rendering was inspected for all twenty silhouette families using explicit internal QA fixtures. APK 0.9.0 (14): 10,210,622 bytes; SHA-256 `7b01d9f94f145b18cd62d234ae7fc029124dd0f224476f0722d461b568ddb970`. Both archive digests, manifest, all eight web payload files, native configuration, analytics schema and both authentic GIF runtimes match. Capture starts fresh, earns nineteen wins through ordinary touch and shows genuine blocking/unblocking and pinch on c20. The separate catalogue diagram is drawn from exact current paths without gameplay/earned-state UI. Evidence: `verification/CONTENT_BANK_V4_BUILD_2026-11-10.json`. The evidence-only follow-up changes no application payload. Structural selection/browser evidence do not establish human difficulty or physical-phone performance; those remain next acceptance.

Historical 0.8.1:

Current 0.8.1: strict typecheck/build, 77 TS tests, offline content-tool typecheck, 22 relevant phone/desktop cases and `android:sync` pass locally. [CI 42782463349](https://github.com/DanilaH/arrows/actions/runs/42782463349) passed both jobs on source `81c1ea4e2a8a9a839858c78854d507ec428fddf4`: all 77 TS tests, all 80 browser cases (62 ordinary app, twelve isolated real-control, six isolated ads), five native JVM tests and Android assembly. The actual opening is compact, accepts deliberate taps at adjacent paths, rejects an ambiguous midpoint and retains errors/restored progress. APK 0.8.1 (13): 10,171,990 bytes, SHA-256 `3d607c7f85cad2354248c5fda70f9604095c32b4e5fc2db4cad248bf1a562af8`. Both artifact archive digests, manifest, all eight web payload files, native configuration, shared analytics and recorded GIF runtime match. The fresh touch recording earns three wins and stops on full c04, with no injected progression. Evidence: `verification/COMPACT_OPENING_BUILD_2026-11-10.json`. Source V06 was re-downloaded, rehashed and visually inspected around its early fields. The evidence-only follow-up changes no application payload. Physical phone feel/performance remains open.

Historical 0.8.0:

Current 0.8.0: strict typecheck/build, 75 TS tests, offline content-tool typecheck and `android:sync` pass locally. [CI 42778589321](https://github.com/DanilaH/arrows/actions/runs/42778589321) passed both jobs on source `6413e73aae6c2b723fc03c69ed7e71688fa7804a`: all 75 TS tests, all 78 browser cases (60 ordinary application, twelve isolated real-control and six isolated ad cases), five native JVM tests and Android assembly. Local exploratory runs exposed obsolete assertions, a finite tutorial animation included in an unrelated motion count, one startup overlapping a rebuild and a too-tight 120s bulk control budget; fixes/targeted reruns and the complete CI pass close these. APK 0.8.0 (12): 10,171,738 bytes; SHA-256 `a17f81dcb8a911006fc168df9878246123127aa413320383ed83b1b268b03bc4`. Both archive digests, manifest, all eight embedded web files (including the two WebP assets), native configuration, shared analytics contract and both authentic GIF runtimes match. Menu capture follows nineteen actual touch-earned wins with zero cups/daily wins; its unedited storage export is retained outside Git. Evidence: `verification/STAGE_F_UX_BUILD_2026-11-10.json`. The evidence/capture-only follow-up changes no application payload. This is browser/build evidence; exact-phone motion/feel and native live-service acceptance remain open.

Historical 0.7.0:

Current 0.7.0: strict typecheck/build and all 74 TS tests pass; generated brand resources and production-catalogue exclusion are checked during build. All 72 browser cases pass locally (54 ordinary app, twelve isolated real-rendering control cases, six isolated ad cases). [CI 42665600126](https://github.com/DanilaH/arrows/actions/runs/42665600126) passed both jobs on source `4e0d060dad7ee2683c8f32aa912f8e04aba1d78d`, including all 74 TS tests, all 72 browser cases, five JVM tests and Android assembly. APK 0.7.0 (11): 10,130,189 bytes; SHA-256 `84693a2fa9d521b2b3bda74758993e0ab3e6fd9dfd9a3df862a14b96e4af9e97`. Archive digests, manifest, every embedded web file, native configuration/schema, eight compiled native vector/adaptive resources (including generated gradient resources) and the captured GIF runtime match. Default Capacitor art and review catalogue/harnesses are absent. Icon export is an opaque 512×512 PNG of the same canonical SVG. Evidence: `verification/STAGE_E_IDENTITY_BUILD_2026-11-09.json`. This is browser/build evidence; native launcher/launch appearance still needs a named device. The documentation-only follow-up changes no application payload.

Historical 0.6.0:

Current 0.6.0: strict typecheck/build and 74 TS tests pass locally. All 120 fields are independently removed in three orders, and each legal-choice set is compared with the game model. Original twenty field fingerprints, partial-save upgrades, completed-c20 continuation, exact-once c21 creation and c120 exhaustion pass. Offline content-tool typecheck and `android:sync` pass. The first local full browser run passed 67/68 cases with one five-second startup deadline in an existing control-board case; its isolated rerun passed. [CI 42643783152](https://github.com/DanilaH/arrows/actions/runs/42643783152) passed both jobs on source `9ba1f03d16e5eb6551f8aeea4debbbf0fcf3beb4`: all 74 TS tests, all 68 browser cases (62 application / six isolated harness), five JVM tests and Android assembly. APK 0.6.0 (10): 10,359,121 bytes; SHA-256 `91b5b7e9805fd00cc66392598eec5268f5238257adc84c1c123df36264729eae`. Archive/test digests, manifest identity, every embedded web file, native configuration, analytics schema and both genuine GIF runtimes match. An additional isolated browser QA pass reviewed all twenty new silhouette families and cleared c50's 77 arrows with touch input and no errors; its synthetic starting fixtures are never used for delivery GIFs. Evidence: `verification/STAGE_E_CAMPAIGN_BUILD_2026-11-09.json`. The documentation-only follow-up changes no application payload.

Historical 0.5.0:

Current 0.5.0: strict typecheck/build, 71 TS tests, five native JVM journal tests and the full 62-case browser suite pass locally (56 application cases, six isolated UI integration cases). `android:sync` passes. [CI 42639056598](https://github.com/DanilaH/arrows/actions/runs/42639056598) passed both jobs on source `9118df4e3d3d404c39f667f14300769b1230df06`: 71 TS tests, all 62 browser cases, five native JVM tests through Gradle and Android `assembleDebug`. APK 0.5.0 (9): 10,183,133 bytes; SHA-256 `a6077e01bd90b56278fb06a2b60d86216658d34ac341f5e5660b6470c9d18f15`. Both downloaded archive digests were checked; native test XML has zero failures/errors/skips. All embedded web files, native configuration, shared analytics schema and recorded GIF entry match the checked build. The isolated test harness is absent from the APK. Evidence: `verification/STAGE_D_MONETIZATION_BUILD_2026-11-09.json`. The following documentation-only update has the same application runtime. This does not establish real-device SDK fill/earned behavior or AppMetrica dashboard delivery.

Historical 0.4.0:

Current 0.4.0: strict typecheck/build, 61 unit tests, the full 56-case browser suite and final ten-case settings/focus-return rerun pass locally. `android:sync` passes. [CI 42625659830](https://github.com/DanilaH/arrows/actions/runs/42625659830) passed both jobs on source `361b3a657a485cdccbf240ca16581b920eaf2ed2`: 61 unit tests, all 56 browser cases and Android `assembleDebug`. APK 0.4.0 (8): 10,177,341 bytes; SHA-256 `278c1e402d476287bf40504f0d615bb89b709160cc7a95af7a36d82d02af0e87`. Archive digest, every embedded web file, shared analytics contract, native SystemBars configuration and both GIF runtime payloads match. Evidence: `verification/STAGE_D_PRESENTATION_BUILD_2026-11-09.json`. The capture-tool/evidence-only follow-up has the same application runtime. Physical-phone sound, haptics, bars and performance acceptance remain open.

Historical 0.3.3:

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

## Queued visual feedback — 2026-11-10

- The heart-shape feedback is implemented in 0.12.0 with project-owned SVG contours; assess the delivered visual on a phone.

## Next work: bank playtesting, D and physical acceptance

The read-only sparse-bank audit (`verification/CAMPAIGN_QUALITY_AUDIT_2026-11-10.json`) is historical input to the user-requested 0.9.0 rebuild. Current selection fills all rebuilt silhouettes at least 98%, with mean initial freedom around 14% on Hard and 9.6% on Nightmare; it also gates freedom throughout three early removal profiles. Next content acceptance is actual human progression/device playtesting, not just solver success. Preserve all embedded legacy geometry through catalogue upgrades.

1. Verify 0.4.0 on a named Android device: both themes/insets, system bars, sound/loudness/audio focus, independent vibration switches, return from interruptions and update persistence. Do not claim exact original sound.
2. Accept 0.5.0 native advertising on an exact Android artifact: genuine SDK earned delivery, interruption/process restoration, both dismissal/foreground orders and matching AppMetrica dashboard events. Configure a separate APPMETRICA_DEBUG_API_KEY through repository secrets for that run.
3. Preserve schema 2 migration, per-date identity, combined writer/receipt ordering and reserved rights. Keep stage C local record policies explicit; League remains open.
4. E: playtest the installed 120-field bank, extend dated coverage deliberately, accept final icon/splash on-device, production signing and RuStore materials/disclosures.
5. Measure named-device touch/zoom, frame pacing, haptics and process-kill restoration. Browser checks/GIFs do not establish phone performance.

See `KIT_REUSE.md`, `PROJECT_DECISIONS.md` and the replication spec for full scope.
