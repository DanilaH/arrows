# Production readiness / 0.34.1-code49

Owner request 2026-11-17: audit translations, production packaging and measurement against current mini-games-kit before supplying service IDs. Base main63ac429 / applicationdecbfaf (0.34.0-code48), no reset or pin upgrade. This is preparation, **not a published or device-accepted production release**. Previous application CI44040646713 is now confirmed completed SUCCESS:234 unit,492/492 browser (21.1min), native builds/19JVM.

## Sources and selection

Read current kit at **5a0836cbf562013201ec842376d7a84998f89e48**: API, task router, Arrows research index, Android Release Acceptance, Committed Analytics, Localization and Authentic Store Media; current Arrows decisions, release checklist, C/MEASUREMENT and later commercial audit/fixes. Installed runtimea932526 and consumer guidancee04a3fe remain unchanged. These are reviewed newer documents, not an implicit runtime upgrade or a renewed execution of old assistance experiments.

Primary platform sources checked2026-11-17:

- https://developer.android.com/topic/performance/app-optimization/enable-app-optimization
- https://ads.yandex.com/helpcenter/en/dev/android/rewarded
- https://ads.yandex.com/helpcenter/en/monetization/ad-unit/rewarded
- https://appmetrica.yandex.ru/docs/en/data-collection/basic-events
- https://appmetrica.yandex.ru/docs/en/mobile-api/logs/endpoints
- https://appmetrica.yandex.ru/docs/en/data-collection/upload-mapping

SELECT: contextual locale review, exact TS/native schema checks, correct explicit re-entry reporting, small startup/content diagnostics, fail-closed release/signing and separate optimized test payload. HOLD: globally exactly-once analytics/outbox, additional experiment framework, ANR/native-crash changes without need, automatic SDK/pin upgrades. REJECT: treating debug/playtest success as production/device/dashboard proof; new ad placements/cadence or simultaneous product experiments.

## Reproduced findings and bounded changes

| Finding | Before | Implemented |
| --- | --- | --- |
| Russian difficulty labels | Home/board/calendar hardcode Hard/Nightmare | Shared RU Сложный/Кошмар, EN unchanged; same difficulty keys/colors/layout |
| Locale metadata | Changing language updates visible strings but leaves document lang/title at initial browser language | Update document lang/title with the accepted setting; localize startup progress accessibility label; EN launcher label uses Android locale |
| Counted assistance copy | Route amount5 reads «5 шага»; reserved1 and future amounts inconsistent | Consumer-local counted arrows and route nominative/genitive; test0/1/2/4/5/11/14/21/22/25/101/111. No reward amount change |
| Meaningful re-entry | level_resume sent for recovery while already in game, absent for normal Home→started board | Report explicit entry into unfinished started campaign/daily. Opening untouched/result board, Settings and background do not fabricate a start/resume |
| Startup/content measurement | Startup timing exists only in debug; start carries version but no embedded historical difficulty/size | One startup_timing after uncovered ready; attempt_context after first committed meaningful action, stable attempt-context ID, difficulty/arrow count/version, no geometry |
| Sender/native contract | Shared JSON/runtime validators exist, but sender AnalyticsParams allows wrong fields until runtime | Generate exact sender types from JSON and check drift before compilation; real native plugin uses testable validator; all38 schemas tested including negative fields/types |
| Production packaging | CI only debug/playtest; release unconfigured signing, minify=false, all three HTML entries bundled | Separate release-only web build; labs/QA controls excluded; R8+resource shrinking, consumer/scoped bridge keep rules, explicit env signing, required live config/signer fingerprint. No substitute production key |
| Missing native optimized coverage | Debug assembly says nothing about optimizer output | Isolated .releasecheck with same optimizer/rules, debuggable=false, test ads/key empty and debug test signer; official APK/manifest/DEX/16KB ZIP-alignment/payload inspection. This cannot be mistaken for production credentials/signature |

Fresh browser reproducer against unmodified baseline:4/4 expected failures (two scenarios ×phone/desktop). Base unit/type/build234PASS. Preserve failed and corrected test runs explicitly in evidence; do not infer phone feel or complete translations from a dictionary parity test.

## Metrics: instrumented versus externally verified

Custom events are a best-effort diagnostic transport after semantic/durable actions. Native SDK acceptance means local enqueue, not dashboard delivery. The32-outstanding budget/drop diagnostics remain; no per-tap/per-frame reporting or new durable telemetry queue. Existing save schema2, content, reward ledger, hints, lives, lifetime gift, error/flawless history and ad cadence remain unchanged.

| Question / metric | Actual source and definition | Engineering status / external limit |
| --- | --- | --- |
| Installs, active users, DAU/WAU/MAU, sessions, session duration, ordinary D1/D7 | AppMetrica automatic install/session tracking via enableActivityAutoTracking; use SDK installation/session identity and chosen dashboard timezone/calendar or24h definition | SDK integration present; real dashboard/session/export rows NOT VERIFIED. No duplicate custom session SDK |
| First usable screen / startup | app_ready plus startup_timing module→first presentable and uncovered-ready ms; one launch, version/code native envelope | Implemented; excludes OS process/native pre-WebView startup. Not a phone cold-start benchmark |
| Onboarding | tutorial_step after persisted completion, step/outcome | Existing; completion never inferred from seeing a tooltip |
| Campaign/daily funnel, difficulty and drop-off | level_start at first accepted committed action; attempt_context links version/difficulty/arrow count; level_error first flag/lives; level_complete+attempt_final stable attempt; level_exit is a menu exit, level_resume a real re-entry | Existing plus fixes. Group by mode/id/content_version, unique attempt; exit/background are not permanent abandonment. Censor unfinished observation windows |
| Time and mistakes | completion active_ms and mistakes; active game clock excludes menu/background/ad blockers; errors retained on continue | Existing; use started-attempt denominators, completion rate and censored unfinished attempts together, not just mean time among winners |
| Daily return and rewards | daily_open/date/resumed, daily_complete, collection_unlock; SDK return dates | Existing; distinguish selected archive date from SDK event date; opening daily is not winning it |
| Help visibility→choice→request | assistance_assignment/offer/choice/request linked install/assignment/offer/request/attempt; variant+effect fixed before show | Existing; actual visibility episodes; same existing combined-v1 policy. QA/prod separated by native envelope, not qa=false alone |
| Ads: request/load/show/impression/dismiss/failure/wait | ad_preload, ad_event, ad_session, ad_result, ad_opportunity; SDK phases and timestamps by request | Existing; derive request→invocation/show latency and outcome. Preload has no fictitious attempt owner; invoke is not impression |
| Earned→durable right→reserve/claim→reveal/use | SDK earned, ad_reward_granted/reserved, assistance_fact phases; request/entitlement IDs and manual/native/bonus split | Existing; old hint_applied remains saved highlight, never redefined as consumption/cascade. Animations never authorize rights/results |
| Value of help / continue | assistance_followup, continue_outcome (ordinary manual move, completion, new help, loss/exit/restart as applicable), active-time delta | Existing one-terminal per right. No replay on reload; use is distinct from effect animation |
| Revenue / eCPM / eligible-cohort7d value | Canonical custom ad_impression_value from real SDK ILRD by request + ad_session + assignment; tools/assistance-revenue.mjs | Existing; explicit release/live/production only, dedup event IDs, currencies separate, missing amounts unknown. Eligible-assigned install denominator is NOT all-install ARPU. Automatic SDK totals must not be added to same ILRD income |
| Total ARPU/ARPDAU/ROAS/LTV | Network income + all SDK installs/active users; attribution/spend externally for ROAS; measured cohort window for LTV | Dashboard/export/account stage. Current cohort tool alone cannot calculate all these. No prediction presented as observed LTV/payout |
| Reliability / loss | save_error, sanitized runtime_error, analytics_health; native Java crash reporting | Existing; latest cumulative health per transport, missing diagnostics unknown. Native crashes explicitly OFF; ANR reporting NOT VERIFIED; mapping upload required for readable optimized crash reports |
| Performance / feel | Named-phone startup, frame pacing, memory, idle/large-field repeated-entry; actual audio/haptics | Browser diagnostics and automated checks exist. Physical optimized build and SDK-enabled profiling NOT RUN; not replaceable with a green CI counter |

No event contains full board/save, raw SDK configuration, signer material or arbitrary error messages. Native environment_version/build/ad/analytics/app-version envelope cannot be relabeled by JS. Sessions/identity come from the SDK/export; assistance install_id is not silently assumed to equal AppMetrica installation_id. Join export rows using their SDK identity first; prove that mapping in the live smoke test.

## Release configuration and next concrete external stage

`npm run build:release` emits only main game and channel stamp. `npm run android:sync:release` prepares that exact web payload. Production `assembleRelease` requires live SDK values and all signing configuration; `npm run release:config` reports **names only** for missing/invalid fields. `releaseCheck` is a separate test-signed .releasecheck package and never a production update. Compatible .playtest remains .playtest/code49/same cached signer/test ads/analytics OFF.

Required owner configuration:

| Purpose | Configuration name / needed item |
| --- | --- |
| Rewarded / interstitial | YANDEX_REWARDED_AD_UNIT_ID / YANDEX_INTERSTITIAL_AD_UNIT_ID, correct format and app binding |
| Production AppMetrica | APPMETRICA_API_KEY for com.danilah.arrows; separate debug app/key only if dashboard smoke needs it |
| Production signer | ARROWS_RELEASE_KEYSTORE, ARROWS_RELEASE_STORE_PASSWORD, ARROWS_RELEASE_KEY_ALIAS, ARROWS_RELEASE_KEY_PASSWORD, ARROWS_RELEASE_CERT_SHA256; keep actual private material in protected CI/local configuration |
| Explicit paid mode | ARROWS_AD_MODE=live; no demo/default fallback |
| Store package / mapping | RuStore application/listing identity, support contact/privacy URL and actual data/audience declarations; AppMetrica application access for mapping and event/export verification |
| Reproducible cold build | Authorized read access to private mini-games-kit at exact pinned SHA; warm CI cache is currently sufficient, not a permanent credential |

After configuration: build+inspect actual production-signed shrunk APK, compare expected signer/hash/manifest/config/payload, install/update on named phone without clearing saves, offline/relaunch/process interruption/Back/portrait checks, real rewarded/error/return and interstitial, debug/production dashboard export smoke, crash mapping, physical large-field performance/audio/haptics. Current owner gameplay acceptance is retained; this is targeted release integration work, not a mandatory repeat of generic product playtesting. No automatic store submission or spend.

## Validation record

Implementation checkpoint:238unit/30files/typecheck/standard build PASS. Final affected browser, release web/matrix, optimized native and full hosted CI are being run; status must be replaced with actual results before final delivery. IDs/dashboard/money/phone remain NOT RUN, not implied by source checks. No production key created, live SDK traffic sent or store change made.

KIT IMPACT **REUSE**: Android release, shared-schema parity, contextual localization and committed-analytics guidance; reuse installed StartupTimeline and existing lifecycle/transport/save seams. No new kit API necessary and no upstream writes. Current game intentionally keeps bounded best-effort analytics; the kit's optional committed journal recipe does not mandate a second durable subsystem.
