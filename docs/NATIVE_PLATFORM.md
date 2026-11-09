# Android platform integration — 2026-11-09

Source inspected: `DanilaH/road-lines@180d5b1dc4de2687da670a3b6cfc140a0a8fa156`, native ads/analytics/feedback plugins and platform adapters. Arrows reuses their native SDK ownership, nonblocking telemetry and capability checks. No Road Lines economy, banner layout, orientation lock or account UI is copied. Portable activity and receipt mechanisms come from the pinned mini-games-kit revision in `KIT_REUSE.md`.

## Connected code

- `src/app/platform.ts` constructs analytics, ads, haptics and storage synchronously alongside existing lifecycle wiring. Rendering never waits for an SDK response. The initial shell reports `app_ready` after its uncovered first paint.
- `ArrowsAdsPlugin` integrates Yandex Mobile Ads 8.6.0 rewarded/interstitials, main-thread sessions, bounded loads, explicit shows and dismissal. Interstitial preload has separate ownership from an active show. Only earned SDK callbacks create receipts. No timeout resumes under a possibly displayed ad; after `show()` is invoked, native dismissal/error/destruction owns settlement. A missing terminal SDK callback after invocation therefore remains a device-test risk, not an invented dismissal.
- `RewardJournal` persists exact receipt ID, attempt, mode and Hint/lives placement in an AtomicFile under no-backup storage. Failed writes retain the exact receipt process-wide for a later recovery query; JS receives nothing until disk readback succeeds. Process termination during a failed disk write cannot guarantee recovery; test disk-failure behavior separately from successful durable delivery. Wrong-ID acknowledgement is rejected.
- `createAds().installRewardCommit()` connects the kit's `DurableReceiptQueue` to a future game writer. That writer must durably apply effect+dedup to the correct attempt. Before it exists, the shell offers no rewarded opportunity and never acknowledges a pending award. Recovery/ack failures do not block ordinary navigation; polling and unresolved calls are bounded. Display outcomes alone never grant a reward.
- `ArrowsAnalyticsPlugin` and TS read the same per-event schema, copied into native assets by `tools/prepare-native.mjs`. They check names, keys, primitive types, finite numbers and string bounds. Transport is bounded to 32 outstanding calls and has no telemetry storage/outbox. AppMetrica 8.6.0 initialization enables Java crash reporting; native crash reporting and optional identifier/location modules are disabled. SDK behavior/disclosures still need release review.
- `ArrowsFeedbackPlugin` adapts native vibrator capability/freshness checks with Arrows cue names and cancellation generations. Preferences, game-specific tuning and actual sound remain feature work. Native pause cancels feedback independently of JS.
- `ArrowsStoragePlugin` implements the kit's async storage seam using a process-wide disk queue and per-key AtomicFiles with readback. It propagates disk/parse-read failures; it does not own save codecs, migrations or atomic transactions across keys. Store each atomic game effect+dedup in one document through one coordinated writer. `get` returning missing is distinct from an existing unreadable file.

## Build configuration

Run `npm run android:sync` before Gradle; it builds the web payload, copies the shared analytics contract and syncs Capacitor. Plugin classes and Gradle configuration are versioned native source. The manifest selects ArrowsApplication and disables automatic Yandex SDK initialization so the explicit ad-mode path owns startup.

| Variable | Meaning |
| --- | --- |
| `ARROWS_AD_MODE` | `test` by default, or `disabled` / `live` |
| `YANDEX_INTERSTITIAL_AD_UNIT_ID` | Required for live mode |
| `YANDEX_REWARDED_AD_UNIT_ID` | Required for live mode |
| `APPMETRICA_API_KEY` | Required for live mode |
| `APPMETRICA_DEBUG_API_KEY` | Optional separate analytics app for debug/test; absent disables explicit AppMetrica initialization |

Default debug builds use official demo ad units. Release pre-build rejects non-live mode or missing live SDK configuration. The values enter generated BuildConfig, never Vite env, checked-in assets or logs. `disabled` stops explicit ad initialization; a separately supplied debug analytics key still enables analytics. An SDK-level disabled mode is not a guarantee that an SDK is absent from the APK or that all dependency startup code is inert.

Signing remains a separate release requirement. This change neither generates production signing material nor claims a store-ready release APK.

## Remaining consumer work and evidence

The shell still has no playable level. Stage B must implement save schemas/the coordinated writer and then install the earned commit function; navigation, ad cadence, Hint/lives UI and gameplay event emission belong to the real game. Sound, final haptic tuning, full progression and store assets remain on the existing plan.

Run `npm run check`, `npm run android:sync`, `npm run test:browser`, then native compilation/Android tests. Tests of TS adapters prove bounded RPCs, independent blockers, failed commits/acks and stale delivery. They do not establish SDK inventory, actual earned delivery, phone vibration, crash dashboard data or update migration. Record native build/device evidence in `HANDOFF.md` as it becomes available.

Official contracts checked 2026-11-09: [Yandex integration/initialization](https://ads.yandex.com/helpcenter/en/dev/android/quick-start), [rewarded and earned callback](https://ads.yandex.com/helpcenter/en/dev/android/rewarded), [AppMetrica integration](https://appmetrica.yandex.com/docs/en/sdk/android/analytics/quick-start). Review current contracts again before release.
