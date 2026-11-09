# Arrows handoff — 2026-11-09

## Current milestone

First playable Stage A implementation is complete in source, version 0.1.0 / Android versionCode 2. Four fixed own fields contain 6/6/68/188 arrows, including bent extraction, a Hard flower and a dense Nightmare butterfly. Rules, arc-length movement, hold/cancel, pan/pinch, guides, lives/errors, reactive dots and idle rendering are connected to the actual game surface. Details, fixture counts and verification: `STAGE_A_IMPLEMENTATION.md`.

Native platform infrastructure remains connected: Yandex Mobile Ads/AppMetrica, shared analytics schema, earned receipt journal, atomic native storage seam and cancellable haptics. The surface sends `app_ready` and one in-memory `level_start` on the first accepted action of a control attempt, with mode `control`; full durable campaign telemetry belongs to B. Advertising awaits real placements and a coordinated reward writer. Native phone haptic quality is unverified.

Campaign/daily, Hint/free and rewarded continuation, durable game save schemas, final sound/haptic tuning, full telemetry/cadence, release signing and store packaging remain unimplemented. Current controls are in-memory attempts; reload or field selection starts them fresh. The full agreed product is unchanged. Stage A's physical phone feel/performance acceptance remains open.

Scope review on 2026-11-09 expanded `KIT_REUSE.md` to the full production map. The follow-up reused existing project integrations in code instead of stopping at that map. Implement gameplay event/reward boundaries during B and complete placement/device acceptance during D–E. Keep the baseline free of banners as specified; open account/purchase decisions remain open.

## Verification

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

The user explicitly authorized initialization, main-branch writes and routine repository work on 2026-11-09. `DanilaH/arrows` is initialized and full source is published in `main` at `61749a610cc7079e9643df48fabd7ebbc7f92858`; its tree SHA `46bd617a4378510fbdbd16e5cebbae501bc61265` exactly matches the locally checked source. There is no remaining permission blocker for routine repository work.

First CI run `42587117226` failed before native compilation because setup-android's default `tools` package no longer exists, and before browser acceptance because Playwright does not support the runner's new Ubuntu 26.04 image. The corrected workflow requests `platform-tools` explicitly and pins Ubuntu 24.04. Corrected run `42587270211` passed both jobs and produced the debug artifact. The following documentation-only evidence update does not change that verified payload.

## Next work: Stage A phone acceptance, then B

1. Playable APK 0.1.0 (2) is built and verified; see `verification/STAGE_A_BUILD_2026-11-09.json`. Install it on a named physical Android and record gesture, audio-independent haptic, active/idle frame pacing and repeated-entry behavior for all four fixtures. Do not infer phone 60 FPS from browser tests.
2. Tune extraction/head/line/dot response against the original clips. V06 is downloaded/hashed and targeted frames at 34.9–35.9 s / 86 s were inspected; other source roles remain in `research/ARROWS_VIDEO_SOURCES_2026-11-09.json`. No new full audio review is claimed.
3. B: implement one coordinated authoritative save writer, validating/migrating attempt state and restoration after interruption. Preserve separate campaign/daily identities; presentation never owns confirmed moves.
4. Add the real campaign/tutorial, lives continuation, current-state Hint and once-per-attempt gameplay events. Install reward commit only when effect+dedup is durable and tied to the correct attempt.
5. Keep C–E and all open parity questions on the agreed plan. These four fixtures are a feel/performance checkpoint, not the production campaign bank.

See `KIT_REUSE.md` for connected versus selected modules and `PROJECT_DECISIONS.md` for open policies. Do not restart research or silently narrow the agreed product to the bootstrap.
