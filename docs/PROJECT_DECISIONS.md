# Project decisions — 2026-11-09

## Product and scope

The supplied replication spec is the target. Stage A now has a first playable implementation: four fixed own control scenes (6/6/68/188 arrows), correct extraction and blocker rules, input/camera, dots, errors and idle rendering. Local model/browser verification is recorded in `STAGE_A_IMPLEMENTATION.md`. Physical Android feel/performance acceptance remains open; the campaign bank and full product parity are not complete.

Scope clarification, 2026-11-09: the game-kit review covers the complete built Android game preparing for RuStore, not only the modules needed to draw the first scene. `KIT_REUSE.md` now maps advertising, analytics, saves, feedback, progression, UI, diagnostics, native release and store packaging to reusable code/recipes, consumer work and evidence. Stage A remains the next implementation milestone; the full release scope is not deferred out of the project.

## Platform and bootstrap adaptations

| Original template contract | Arrows replacement | Reason / evidence |
| --- | --- | --- |
| Yandex web SDK, mock runtime and LoadingAPI/GamePlayAPI | Capacitor lifecycle/browser development runtime, later extended with native Android service plugins | Spec sections 11–12 target native Android/RuStore; the kit's web SDK is not the native integration |
| Yandex env modes, upload audit and DRAFT checklist | Normal production build, cap sync, Android CI/build/release checklist | Native packaging target; web assets are local to APK |
| Landscape gate | Portrait-first responsive surface; short landscape supported by init shell | Reference is portrait; spec requires resize safety, not a forced landscape game |
| AVIF/WebP probe at every startup | Procedural rendering; no raster probe yet | No raster runtime assets exist at initialization |
| Continuous default Phaser loop | Stop after first/final dirty frame; resize/foreground request repaint | Kit idle-paint production guidance; browser RAF smoke verifies boot scene only |
| Debug env toggle | Development-only dynamic import | No shipped diagnostic control or global mock switch |

## Rendering and lifecycle

Use Phaser 4.2.1 from the reviewed kit baseline. Cap DPR at 2; Phaser 4 physical game size + inverse Scale zoom maps to CSS size. The bootstrap mark uses physical coordinates. Stage A must establish the explicit CSS/world/camera/input transform and test hit-testing at multiple DPRs.

First readiness follows scene creation, first `POST_RENDER`, removal of the loading shell and an uncovered browser paint. A background blocker does not prevent that first frame, but disables input/mutes sound and prevents ongoing render work. Browser visibility and native background remain independent. An old native getState response cannot override a newer appStateChange event. Late listener handles are removed after disposal.

Back now delegates to the game surface: close the current dialog or open field selection. Domain input cancels on blockers, blur/capture loss and resize. Main-game Home/campaign routing and saving before navigation belong to B–C.

Stage A keeps the board camera in CSS/world coordinates and maps its container through the capped physical DPR. Use the Phaser camera viewport (with matching scroll offset) to clip world geometry at the measured HUD/footer bounds. Phaser 4 GeometryMask is Canvas-only; no WebGL mask filter/offscreen texture is needed for a rectangular play area. Input uses the same play-area bounds.

## Durability and ads

Initialization has no save schema or fake save. Define validated contentVersion, attempt identity, removed/error-marked arrows, lives, camera, per-date daily state and reward ledger during stage B. Select native durable storage and a coordinated writer before advertising rewards. Do not treat Web Storage or a queue as an atomic native receipt implementation.

Native SDK infrastructure is now added, adapted from Road Lines at `180d5b1`: Yandex Mobile Ads/AppMetrica, haptics, native atomic storage and durable earned inbox. `NATIVE_PLATFORM.md` records scope and provenance. Accounts, purchases and banners are not implemented. The spec's cadence and free-continue policy are explicitly project assumptions, not measured original behavior.

Select native Yandex Mobile Ads and AppMetrica for the production platform, consistent with the portfolio's Android stack. Plan the analytics schema together with gameplay/progression in B, native transport and crash/error reporting in D, and real dashboard delivery in E. Validate names, keys and value types across TS/native code; telemetry failures must not prevent playing. Review current official SDK contracts at implementation time. The kit supplies analytics interfaces and integration guidance, not a ready native AppMetrica plugin. Ads remain rewarded + interstitial, with no banner in the agreed baseline.

Implementation moved the native transport/dependency work forward using the existing repositories. A shared JSON schema now feeds TS and native validation; the first shell-ready event is wired. The reusable queue is connected only after B supplies an idempotent authoritative game-save writer. No gameplay reward can be offered before that writer exists. Native disk saves and earned receipts use AtomicFile readback rather than assuming a failed SharedPreferences commit left no in-memory change. Java crash reporting is enabled for a configured AppMetrica app; native crash reporting is not claimed.

## Assets, language and native identity

RU/EN copy now covers the Stage A game surface/dialogs. Complete campaign localization, both themes and sound remain later work; the native haptic cues need phone tuning. System fonts/procedural geometry avoid network assets. Native icons/splash are still Capacitor defaults and must be replaced for release. `com.danilah.arrows`, app name Стрелки, version 0.1.0 / Android versionCode 2 are current control-build values; establish final store identity before publishing. CI caches the standard debug key for subsequent preview updates; cache eviction can still replace that test identity, and this is not production signing.

## Open decisions before corresponding features

- Four control scene sizes/counts are fixed in `STAGE_A_IMPLEMENTATION.md`; target phone and recording conditions remain to be recorded.
- Level authoring/generation, selection criteria and bank exhaustion behavior.
- Exact collection records/medals, League, account/purchase scope; no invented UI implementations.
- Game save codecs/migrations and reward writer coordination above the native storage adapter; back-stack behavior.
- Real sound reference, gradient-arrow trigger, self-blocking ambiguity and exact gesture tuning.
