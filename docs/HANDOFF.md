# Arrows handoff — 2026-11-09

## Current milestone

Initialization complete in source: generated/adapted game-kit baseline, pinned dependencies and lockfile, strict TS/Vite/Phaser, Capacitor Android shell, browser/native lifecycle, responsive DPR-capped startup mark, idle renderer, production/debug separation, unit/browser tests and CI.

Native platform infrastructure is now connected: Yandex Mobile Ads/AppMetrica SDK dependencies and native plugins, shared analytics schema, earned receipt journal, atomic native storage seam and cancellable haptics. Source provenance, configuration and exact boundaries: `NATIVE_PLATFORM.md`. The shell sends only `app_ready`; advertising awaits real game placements and a coordinated reward writer.

There is no playable level yet. Campaign, gesture automaton, extraction, dots, Hint, progression, game save schemas, sound, final haptic tuning, gameplay ad cadence/events, release signing and store packaging remain unimplemented. The full agreed product is unchanged.

Scope review on 2026-11-09 expanded `KIT_REUSE.md` to the full production map. The follow-up reused existing project integrations in code instead of stopping at that map. Implement gameplay event/reward boundaries during B and complete placement/device acceptance during D–E. Keep the baseline free of banners as specified; open account/purchase decisions remain open.

## Verification

- Local `npm run check` after native platform integration: typecheck, 15 unit tests, production build pass.
- Local `npm run test:browser`: 8 checks pass across phone/desktop Chromium profiles: real render, readiness, no external service requests, DPR cap, idle RAF, resize, Russian copy, reload and denied storage at startup.
- `cap add android` and sync generated the native project and connected @capacitor/app.
- Follow-up `npm run android:sync` passes with the shared native analytics contract and SDK/plugin source.
- Local host has Java 17 and no configured Android SDK. An actual `./gradlew --no-daemon assembleDebug` attempt stopped while downloading Gradle (`Network is unreachable`); native compilation is not confirmed. Android CI targets JDK 21 / SDK 36.
- These are bootstrap checks. No phone FPS, native advertising, sound or gameplay parity has been measured.

## Repository delivery

The user explicitly authorized initialization, main-branch writes and routine repository work on 2026-11-09. `DanilaH/arrows` is initialized and full source is published in `main` at `61749a610cc7079e9643df48fabd7ebbc7f92858`; its tree SHA `46bd617a4378510fbdbd16e5cebbae501bc61265` exactly matches the locally checked source. There is no remaining permission blocker for routine repository work.

First CI run `42587117226` started. Its Android job failed during SDK setup because setup-android's default `tools` package no longer exists; Java compilation had not started. The workflow now requests `platform-tools` explicitly and pins Ubuntu 24.04 instead of following ubuntu-latest. Native verification will be recorded after the corrected run finishes.

## Next work: stage A

1. Recover video access/frames for actual comparison; the supplied Markdown reports are preserved, while source videos/JSON manifest are not checked in.
2. Define four fixed control scenes with recorded arrow, segment and dot counts, including a dense Nightmare stress scene.
3. Implement independent domain geometry/validation and arc-length extraction; reference spec sections 3–4.
4. Implement arrow selection, hold/cancel, pan/pinch and explicit CSS/backing/world transforms; kit DOM activation is not the board automaton.
5. Add dirty stable/active layers, reactive mask dots and error marks. Wake for active animation, sleep after all motion owners finish their last frame.
6. Compare with source and measure on one named Android before scaling content and screens.

See `KIT_REUSE.md` for connected versus selected modules and `PROJECT_DECISIONS.md` for open policies. Do not restart research or silently narrow the agreed product to the bootstrap.
