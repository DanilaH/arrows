# Advertising, earned delivery and telemetry — 0.5.0 (9)

Implemented after the user approved the next advertising/analytics package on 2026-11-09. This is consumer integration and tested failure handling; real SDK fill, earned callback delivery and AppMetrica dashboard receipt still need an exact-device run. Default debug APKs use official demo ad units; no browser simulation or production mock selector is included.

## Opportunities and persistence

Only an explicit Next action after a newly completed campaign/daily puzzle can request an interstitial. Startup, Back, settings, restored results and automatic campaign Continue never trigger one. The first six completed tasks are protected. Later requests require two new unique wins since the previous fullscreen request and at least 150 seconds of eligible active play. An attempted request consumes the opportunity even on no-fill; an explicit rewarded request also restarts the 150-second/two-win guard. This conservative cancellation/no-fill policy is intentional.

Schema 2 adds `adCadence` to the same authoritative save/writer: accumulated eligible play time, next request time and confirmed win count at the previous request. Menu, mandatory tutorial, lost-life dialogs, ads and background contribute no ad time. Wall time is never used, so relaunch/clock edits do not skip cooldown. Old saves start a fresh grace period at their existing confirmed win count. Failed writes do not consume a confirmed opportunity; valuable receipt writes still share the original ordering/ambiguity protection. Attempt geometry, trophies, daily ownership and receipt IDs are preserved.

Preloading is bounded and separate from permission to show. An inactive or replaced load callback cannot open an ad later. A deliberate transition captures its attempt and advances exactly once after SDK termination plus independent foreground/blocker clearance, in either event order. It cannot advance or resume gameplay underneath an unresolved fullscreen.

## Visible waiting and SDK boundaries

A real request displays a labelled loading dialog with Cancel before invocation; cancellation targets the exact request. Native rewarded loading has a 15-second deadline. Load failures/timeouts impose a 30-second native retry backoff; user taps cannot create an automatic retry storm. After SDK `show()` invocation, loading cancellation/JS timeouts cannot guess that an ad has closed; actual dismissal/error/destruction settles that session. Missing terminal callbacks after invocation remain a device-test risk. A loading/background cancellation rejects stale load callbacks. Idle DOM/Phaser does not gain a permanent rendering loop; the decorative loading animation is bounded and respects reduced motion.

The browser uses the actual unavailable path and never fabricates watched ads, earned callbacks or rewards. No-fill/cancellation leave the field, errors, camera and existing lives intact. Free continuation, restart, navigation and ordinary gameplay remain available.

## Earned receipt authority

Only a valid SDK earned callback records a receipt, retaining its native/JS request ID, original attempt, mode and placement. Dismissal/impression/show result do not grant anything. A late earned callback may append after dismissal or Activity teardown; the new journal queue preserves other receipts instead of overwriting a single slot.

`RewardJournalCore` owns the SDK-independent queue with an injected disk and shared process-wide memory/lock. `RewardJournal` supplies AtomicFile writes and readback. It reads shipped v1 single receipts and writes a version-2 queue at the existing path. A failed read/write retains exact callbacks in process; corrupt or future disk data is not overwritten. A process kill before any successful durable write still cannot guarantee recovery. Exact-ID acknowledgement removes one record, preserving any later award. Failed deletion/write stays retryable; dedup remains in the authoritative game save without arbitrary trimming.

The kit DurableReceiptQueue still commits effect + dedup through ProgressStore before exact ack. Retired/ineligible attempts reserve the right under the original identity rather than redirecting it. Pending/preload/ack observation is bounded to two seconds while the underlying RPC stays single-flight. Late query replies are processed; a hung acknowledgement does not prevent committing later receipts or spending already committed help. At most four distinct unresolved acknowledgement RPCs exist. Optional service failure does not gate readiness, navigation or ordinary play; genuinely ambiguous valuable storage still uses the existing mutation recovery gate.

## Analytics and configuration

The shared TS/native schema separates opportunity, preload/request/load/invoke/show/impression/dismiss/cancel/timeout, SDK earned notification, durable grant and reserved right. Interactive events carry request/attempt/mode/placement; preloads are explicitly context-free. No raw saves, geometry, SDK IDs or configuration keys are sent as custom parameters. JS error categories are bounded enums, not raw exception payloads. Start/completion remain semantic, best-effort events after accepted durable actions rather than a new exactly-once telemetry outbox.

The 32-call transport budget remains. Native report results distinguish SDK acceptance, disabled analytics and SDK errors. `snapshot()` counters and native status never claim dashboard delivery. Optional flush requests the AppMetrica buffer and does not acknowledge network receipt. CI maps a separate `APPMETRICA_DEBUG_API_KEY` secret if present; absent means explicit analytics initialization is disabled in the default debug build. Live mode still requires all three live SDK values; release signing/shrinking/store submission remain separate gates.

For actual delivery acceptance: configure that separate debug analytics app, install the exact APK, complete a normal puzzle and both rewarded placements, then verify the corresponding ad/earned/grant and gameplay events in its AppMetrica dashboard. Record device/WebView/network, run/commit and APK hash. Do not substitute a successful plugin call, SDK acceptance counter or browser test for that check. Test offline startup/no-fill, partial and complete video, return in both lifecycle orders, duplicate delivery and process restoration. Exact failure windows are covered by deterministic tests; physical behavior still needs the phone run.

Official contracts reviewed: [Yandex rewarded](https://ads.yandex.com/helpcenter/en/dev/android/rewarded), [interstitials](https://ads.yandex.com/helpcenter/en/dev/android/interstitial), [AppMetrica Android operations](https://appmetrica.yandex.com/docs/en/sdk/android/analytics/android-operations.html). SDK versions stay pinned at the already integrated 8.6.0.

## Verification

Strict typecheck/build and 71 TS tests pass. Five SDK-independent Java journal tests pass locally on the real Java implementation with JSON-java/JUnit: legacy migration, late/overlapping owners, ambiguous and failed writes, exact/wrong acknowledgements, failed deletion and corrupt disk preservation. CI now runs these through `testDebugUnitTest` before assembling the APK.

The six browser integration cases use an isolated in-memory-built test harness for loading/cancellation/foreground UI and constrained layouts. They are test doubles, never production imports/assets and never user-facing SDK proof. Fourteen actual progression browser cases also pass; the full 62-case suite also passes. Exact native artifact/CI evidence follows separately. User GIF capture uses the real production unavailable path with an unedited genuine playthrough export, no fabricated rewards.
