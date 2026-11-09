# Game-kit review for Arrows — 2026-11-09

Reviewed revision: [`a9325265e87583a4872cf6a158e1e881a0d7508e`](https://github.com/DanilaH/mini-games-kit/tree/a9325265e87583a4872cf6a158e1e881a0d7508e). Started with README, AGENTS, `docs/API.md`, bootstrap and focused usage contracts; inspected source where integration required it. The shared kit is unchanged.

## Scope: a complete Android / RuStore release

The connected bootstrap below is the current implementation, not the limit of reuse. On 2026-11-09 the user clarified that selection must cover the complete built game preparing for the store, including advertising and analytics. Reuse includes portable code, production recipes, consumer integrations and release verification. A recipe is not an installed native plugin, and a selected component is not a completed feature.

The whole delivery map is:

| Production need | Reuse from the pinned kit | Arrows work and completion evidence | Stage |
| --- | --- | --- | --- |
| Startup, lifecycle, layout and navigation | `/startup`, `/layout`, `/platform` activity coordinator; foreground-transition recipe | Extend existing wiring through real screens, Back, gestures, dialogs, audio and native ad locks; test both orders of dismissal/resume and process restoration | A–D |
| Durable settings, attempts and progress | `JsonStorageRepository`, `StorageAdapter`, optional `RevisionSnapshotQueue`; save-repair and receipt/writer coordination contracts | Native storage adapter, validating/migrating codecs, campaign and per-date daily state, attempt/content identity, confirmed victory and dedup ledger; prove interruption and update recovery | B–C |
| Rewarded Hint and lives | `DurableReceiptQueue`; `docs/android/ADS_AND_LIFECYCLE.md` | Native Yandex Mobile Ads bridge and persistent earned inbox; commit effect + dedup before exact ack, apply to the right attempt, handle duplicates/cancellation/no-fill; verify real earned delivery on Android | B contract, D integration |
| Interstitials | `ActionInterstitialGate` only where its request semantics fit; foreground-transition recipe | Implement the spec's active-time/new-progress cadence, first-session protection and rewarded postponement; one fullscreen owner, bounded pre-show wait, saved progress before transition | D |
| Analytics and failure visibility | `/platform`: `AnalyticsAdapter`, development-only `ConsoleAnalyticsAdapter`; native analytics parity guidance in `docs/ANDROID_RELEASE_ACCEPTANCE.md` | Native AppMetrica adapter; shared event/parameter contract across TS and native transport; gameplay, progression, assistance, ads, save/service errors; crash/error reporting and device-to-dashboard verification | B event schema, D transport, E delivery |
| Sound and haptics | `/audio`: `OneShotPlayer`; mixer/pitch/continuous texture only if justified by reference sound; native feedback recipe | Game-specific cues and Android haptic bridge, independent persisted preferences, voice/freshness budgets, audio focus, interruption and cancellation; phone listening/feel checks | A tuning, D full integration |
| Tutorial, campaign, daily and collection | `docs/ONBOARDING_PLAYBOOK.md`, `docs/PUZZLE_PRODUCTION.md`, storage primitives | Semantic tutorial events; selected/validated content, difficulty pacing, fixed daily identity, calendar and collection rules; independent catalog validation plus playtesting | B–C, E bank |
| UI, themes, localization and assets | Viewport/render-density helpers; text sharpness and asset APIs only when used; localization/store-media playbook | All actual screens and error states, both themes, complete enabled locales, large text/insets and accessible controls; explicit startup/deferred resource policy | A–D |
| Performance and diagnostics | `docs/PERFORMANCE_PLAYBOOK.md`, startup timeline, bounded rendering/audio and deterministic teardown | Named-device measurements on large fields and repeated sessions; compare controlled SDK-disabled diagnostics with final SDK-enabled release behavior; record startup, frame pacing, memory and idle work | A baseline, D–E integration |
| Reproducible Android release | `docs/ANDROID_RELEASE_ACCEPTANCE.md` and Android integration contracts | Versioned native source, pinned dependencies, production configuration validation, signing, shrinking, manifest/permissions, embedded web payload and exact artifact hash; install/update/offline/background checks on release payload | D–E |
| Store submission package | `docs/LOCALIZATION_AND_STORE_MEDIA.md` and release-evidence recipe | Final identity/icon/splash, genuine game captures, descriptions, support/privacy links and actual SDK/data disclosures checked against current RuStore requirements; archive exact build and evidence | E |

Analytics must not block startup or gameplay. Define events alongside the actions in B, rather than reconstructing a funnel after the game is finished. Distinguish ad request/load/show/impression/dismissal/earned/grant; record attempt start/completion at semantic boundaries with explicit duplicate policy. Keep raw saves, board data and configuration secrets out of event payloads. Prove TS/native name, key and type parity; console output or a passing mock is not dashboard delivery. The kit's web `MetricaAnalyticsAdapter` does not implement native AppMetrica.

Baseline monetization remains rewarded + interstitial without a banner, as specified. If a banner is explicitly added later, use `resolveNativeBannerPlacement` and its safe-area/SDK-height contract rather than inventing a second CSS-to-native geometry algorithm. Account/cloud, Remove Ads/restore purchases, notifications and store-review prompts are not silently enabled by the phrase “complete release”; account/purchase scope stays open as recorded in the spec, and any enabled service needs a real end-to-end implementation.

Read each focused API contract before implementing its row. The detailed release gate is [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md); completion requires recorded evidence for the exact shipped artifact, not just selecting these rows.

## Already connected

Native ads/analytics, haptic cancellation and atomic storage source have also been adapted from `DanilaH/road-lines@180d5b1`; see [NATIVE_PLATFORM.md](NATIVE_PLATFORM.md). Their portable activity/receipt seams still use this pinned kit. Placement/gameplay/save-domain work and real-device SDK acceptance remain distinct from connecting the infrastructure.

| Module | Actual use | Boundary |
| --- | --- | --- |
| `/platform`: `GameplayActivityCoordinator`, `installDocumentVisibilityBlocker` | Browser visibility and Capacitor app state have independent blockers | Does not directly pause the renderer; app wiring owns input/mute/sleep |
| `/layout`: `BrowserViewportWatcher`, `resolveViewportState` | Coherent resize/orientation, bounded settle and watchdog | Portrait-first; no forced landscape gate |
| `/core`: `getRenderPixelRatio`, `getBackingStoreSize` | DPR capped at 2, CSS size separated from physical backing size | Phaser 4 has no GameConfig.resolution; use physical size + inverse Scale zoom |
| `/startup`: `StartupPreloadController`, DOM view, `StartupTimeline` | Loading/failure, first postrender, uncovered paint before ready | No dependency on advertising/analytics/receipt services |
| `/startup`: `copyOrExposeText` | Diagnostic export in development only | Production build has no debug panel import |
| `/phaser`: `destroyRenderer` | Teardown of a sleeping renderer, including HMR | Application disposes its own observers/listeners first |

## Selected for the appropriate implementation stage

| Need | Candidate | Decision |
| --- | --- | --- |
| Versioned settings and ordered saves | `/platform`: `JsonStorageRepository`, `StorageAdapter` | Use with an Arrows-owned validating codec and one writer per key; native adapter choice before real durable progress |
| Frequent complete snapshots | `/platform`: `RevisionSnapshotQueue` | Optional after measuring write pressure; never coalesce earned receipts |
| Earned native rewards | `/platform`: `DurableReceiptQueue` | Integrate only with a real persistent native inbox and effect+dedup commit; does not provide that bridge itself |
| Ad cadence eligibility | `/platform`: `ActionInterstitialGate` | Review exact request-based semantics at stage D; spec's progress/active-time policy remains consumer-owned |
| UI taps after captured gestures | `/feel`: `installTouchActivation` | Opt-in for affected DOM controls only after reproducing a WebView compatibility-click problem |
| Dots along a polyline | `/feel`: `polylineMarkers` | Available if markers along paths are needed; the board-mask dots are a different data set |
| Local visual response | `/feel`: damped motion | Optional for measured dot/error response; tuning and scheduling stay in Arrows |
| Short audio cues | `/audio`: `OneShotPlayer` | Lazy context, voice budgets, no stale playback; independent haptic setting/native implementation |
| Medals/trophy images | `/assets`, `/runtime-assets` | Add when raster resources exist; no AVIF probe for a procedural-only boot |

## What must remain in Arrows

- Arrow occupancy, validation, dependency graph and removal legality.
- Arc-length window `[d, d + L]` on extended arrow paths. The kit does not provide this movement.
- Board hit-testing and the hold/pan/pinch/cancel state machine. The DOM touch helper does not implement these.
- Camera transforms, dot-mask response, dirty layer boundaries and bounded visual-flight ownership.
- Authored silhouettes, generator/selection workflow, difficulty cadence and control-scene budgets.
- Separate campaign/daily attempts, calendar rules, medal thresholds and content migration policy.
- Native Yandex Mobile Ads integration and persistent earned receipts. `/yandex` is the web Yandex Games SDK.

## Reviewed production recipes

`docs/PERFORMANCE_PLAYBOOK.md`, `docs/PUZZLE_PRODUCTION.md`, `docs/android/ADS_AND_LIFECYCLE.md`, storage/receipt coordination and first-paint guidance were read. Apply their concrete boundaries: final dirty paint before sleep; no optional-service wait before core startup; exact attempt identity for rewards; full catalog validation separate from playtesting. No arbitrary solver worker, account system, banner or progression economy is imported.
