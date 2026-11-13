# Project decisions — 2026-11-09

## Product and scope

The supplied replication spec is the target. Stage C adds Home/Collection/daily on top of the initial chapter and durable game/reward authority; the current 0.6.0 campaign has 120 fields. see `STAGE_C_IMPLEMENTATION.md`. The larger release bank and C–E remain required. Historical Stage A baseline: four fixed own control scenes (6/6/68/188 arrows), correct extraction and blocker rules, input/camera, dots, errors and idle rendering. Local model/browser verification is recorded in `STAGE_A_IMPLEMENTATION.md`. Physical Android feel/performance acceptance remains open; the campaign bank and full product parity are not complete.

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

Stage B now owns validated schema v1, immutable saved level geometry, attempt/content identity, removals/errors/lives, camera, separate daily map and the effect+receipt ledger through one coordinated writer. Native storage was selected and is connected before reward commit. Do not treat Web Storage or a queue as an atomic native receipt implementation.

Native SDK infrastructure is now added, adapted from Road Lines at `180d5b1`: Yandex Mobile Ads/AppMetrica, haptics, native atomic storage and durable earned inbox. `NATIVE_PLATFORM.md` records scope and provenance. Accounts, purchases and banners are not implemented. The spec's cadence and free-continue policy are explicitly project assumptions, not measured original behavior.

Select native Yandex Mobile Ads and AppMetrica for the production platform, consistent with the portfolio's Android stack. Plan the analytics schema together with gameplay/progression in B, native transport and crash/error reporting in D, and real dashboard delivery in E. Validate names, keys and value types across TS/native code; telemetry failures must not prevent playing. Review current official SDK contracts at implementation time. The kit supplies analytics interfaces and integration guidance, not a ready native AppMetrica plugin. Ads remain rewarded + interstitial, with no banner in the agreed baseline.

Implementation moved the native transport/dependency work forward using the existing repositories. A shared JSON schema now feeds TS and native validation; the first shell-ready event is wired. The reusable queue is connected only after B supplies an idempotent authoritative game-save writer. No gameplay reward can be offered before that writer exists. Native disk saves and earned receipts use AtomicFile readback rather than assuming a failed SharedPreferences commit left no in-memory change. Java crash reporting is enabled for a configured AppMetrica app; native crash reporting is not claimed.

## Assets, language and native identity

RU/EN copy now covers the implemented menus, calendar, dialogs, settings and gameplay. Both themes and original short sound cues are connected in 0.4.0; native sound/haptic feel still needs phone tuning. System fonts/procedural geometry avoid network assets. Native icon/splash artwork is now project-owned and generated from a shared geometry source; exact-device acceptance remains required. `com.danilah.arrows`, app name Стрелки, version 0.9.0 / Android versionCode 14 are current control-build values; establish final store identity before publishing. CI caches the standard debug key for subsequent preview updates; cache eviction can still replace that test identity, and this is not production signing.

## Open decisions before corresponding features

- Four control scene sizes/counts are fixed in `STAGE_A_IMPLEMENTATION.md`; target phone and recording conditions remain to be recorded.
- Level authoring/generation, selection criteria and bank exhaustion behavior.
- Exact collection records/medals, League, account/purchase scope; no invented UI implementations.
- Game save codecs/migrations and reward writer coordination above the native storage adapter; back-stack behavior.
- Real sound reference, gradient-arrow trigger, self-blocking ambiguity and exact gesture tuning.

## Stage B policy decisions

The first chapter contains 20 fixed own tasks (Hard 6/12/18, Nightmare 20) and ends explicitly. The full bank remains stage E. Stage B initially used 12 active seconds for Hint; the user explicitly changed this to 3 seconds in 0.11.0, excluding required tutorials/background/dialogs/ads; camera movement does not reset it. Free refill is once per attempt; restart resets that eligibility. These remain project policies.

A late earned right for an ineligible/retired attempt is durably reserved under its original identity rather than applied to the next task. Reservations and receipt IDs are retained without arbitrary trimming; a future explicit recovery/support policy must honor them. Invalid/future progress is preserved verbatim in storage and opens an explicitly unsaved session. Only unsafe camera metadata is automatically repaired. A failed write is resolved by authoritative readback or gates mutations until recovery.

The save schema has no earlier shipped gameplay version to migrate. Started attempts embed their original immutable geometry so a later generator update cannot reroll them. Attempt events are best-effort after durable state, not an exactly-once telemetry outbox.

## Stage C policies and explicit adaptations

The installed daily archive is now 2026-01-01 through 2026-12-31 (expanded by explicit user request on 2026-11-09), with fixed date IDs and eight own silhouette families. Only local dates at or before today can start; future/unsupported dates are never rerolled. A monthly trophy requires every provided date in that full month. Clock changes do not duplicate confirmed wins/cups.

Collection opens at current level 10, Challenge at 20. Three local records use consecutive local win dates, consecutive wins since the 0.3 restart journal, and maximum wins per local date. Home shows the current day streak, not its historic best. Three local medals use 20 campaign wins / 10 error-free wins / 10 consecutive wins. These thresholds and statistic rules explicitly adapt the unknown reference policies. League's three medals remain unimplemented, with no fake competitors or placeholder league UI.

Schema 2 migrates shipped v1 at the same key, preserving accepted moves/identity/geometry and the receipt ledger. Prior win local dates are frozen using the upgrading timezone; missing restart history is not invented. New raw facts capture their local date at commit. Native Back and HUD Back follow screen parents; asynchronous opens cannot override newer navigation.

## Whole-year expansion, 2026-11-09

The user requested all of 2026’s rewards/content. Version 0.3.1 adds January–October without changing any shipped November/December field. Daily catalog version 1→2 is a compatible schema-2 upgrade preserving all accepted state. The calendar has 365 tasks and 12 actual month-specific SVG trophy designs, shown in a compact grid. Past dates are open after the existing level-20 gate; future dates remain date-gated.

Fields are generated/validated offline from a numeric YYYYMMDD seed, silhouette/size and difficulty policy, then shipped as fixed coordinates. A selected date/catalog version is shared by all users, not personalized or rerolled per device. Eight base silhouette families provide varied arrow layouts; there is no claim of 365 separately authored silhouettes or adaptive difficulty. Local device time governs availability only.

## Rich future trophy catalogue, 2026-11-09

The user explicitly approved richer/more varied reward artwork with a large future reserve. The frozen v2 catalogue covers 240 month/year designs for 2026–2045. It combines curated compatible silhouettes, handles, stems, pedestals, surface patterns, seasonal emblems and material/gem palettes. No raster asset service or runtime per-player randomness is required.

An additive schema-2 map binds earned trophy versions/IDs. Existing confirmed awards without that map migrate to their original v1 visuals; newly earned cups bind v2 in the same authoritative win transaction. Published art/style versions are immutable. Viewing a future collection or after-earning appearance is explicitly a preview and grants nothing. The puzzle catalogue remains 2026; future years do not expose fictional playable tasks.

## Future reward visibility correction, 2026-11-09

The user asked to remove browsing of future trophy collections. Version 0.3.3 exposes only months backed by the installed daily catalogue (currently the twelve months of 2026). The art-only reserve for 2027–2045 stays frozen in source without a player preview route. A lone installed year is a plain label, not a selector. Large artwork inspection remains available from the real calendar. This supersedes the earlier decision to expose future artwork previews; ownership, earned-design bindings and playable date gates are unchanged.

## Stage D presentation and preferences, 2026-11-09

Version 0.4.0 implements both themes, live RU/EN selection, independent sound/vibration preferences, bounded original feedback and a settings dialog reachable from Home/gameplay. The separate `arrows.settings.v1` document never shares the gameplay writer/key. A 1.5 s optional hydration deadline avoids gating readiness; late reads cannot override choices. Invalid/future preference data is preserved until an explicit edit/retry. Failed writes retain the session choice and expose retry.

Default appearance stays dark, language initially follows the device and sound/vibration default on. Switching language/theme does not restart attempts or recreate the renderer. Only fully covered RU/EN are offered. Published trophy art/bindings and the hidden future reserve are unchanged.

Original procedural pluck/glass cues are our own sound direction, not verified reference audio. The pinned kit OneShotPlayer owns one lazy AudioContext, at most six sources and a 90 ms cold-resume deadline. Named groups replace/rate-limit; bounded gains prevent worst-case clipping. No sound event is durably queued. Menu/dialog/settings permit UI feedback; background/ads and browser focus loss permit none. Native App lifecycle, document visibility, ad blockers and AudioContext interruptions gate/cancel feedback; native haptics also cancel independently on pause. No Phaser audio context or continuous audio loop is needed.

Capacitor 8.6.0's bundled SystemBars applies theme-appropriate icons; native EdgeToEdge and CSS inset handling keep the body theme behind the bars. Exact-device system bars, loudness, haptic feel, audio focus, interruption and process-kill acceptance remain required. Native advertising cadence/live earned delivery and dashboard evidence are the next D package.

## Stage D advertising and telemetry, 2026-11-09

Version 0.5.0 wires the explicit Next-after-new-win opportunity in campaign/daily. No ads on startup, Back, restored results or automatic Continue. Protection covers the first six completed tasks; later requests require two new unique wins and 150 seconds of active non-tutorial play. Every attempted interstitial/rewarded request conservatively consumes/defers the opportunity even on no-fill/cancellation. The schema-2 additive adCadence uses accumulated play time, never wall time; old saves begin a fresh grace period at their confirmed win count. Policy writes share the authoritative game writer and survive reload.

Loading is visibly cancellable before SDK invocation, with a native 15-second pre-show deadline. An invoked/fullscreen ad is never guessed closed by a JS timeout. Next continues exactly once after terminal SDK settlement and independent foreground blockers clear. Optional query/ack/preload observation has a two-second deadline but keeps the underlying operation single-flight; late answers remain valid. At most four unresolved exact-ID acknowledgements exist, without blocking already committed effects or ordinary play.

Native pending receipts now use an AtomicFile queue with readback and shared process-wide memory/lock, migrating the shipped single-receipt document. A valid earned callback may append after dismissal/Activity teardown; its original ID/attempt/mode/placement remains authoritative. Exact acknowledgement preserves other receipts. Failed disk writes retain in-process callbacks but cannot promise survival of a process kill before durable persistence. Gameplay effect and dedup stay one transaction; retired attempts reserve the earned right.

Ad events distinguish preload/request/load/invoke/show/impression/dismiss/cancel/timeout/earned/grant/reservation, carrying request/attempt identity without SDK configuration or raw saves. Native analytics reports acceptance vs disabled/error separately; SDK acceptance is not dashboard-delivery evidence. CI can inject a separate APPMETRICA_DEBUG_API_KEY; release still requires deliberate live configuration. Browser/JVM doubles are isolated tests, never shipped mock hooks or evidence of real inventory. Exact-device earned flow, process interruption and actual dashboard receipt remain release acceptance work.

## Campaign expansion, 2026-11-09

Version 0.6.0 appends 100 fixed fields to the original twenty, for 120 fields and 3,717 arrows. The original twenty are fingerprint-pinned and unchanged. Catalogue 1→2 is an append-only schema-2 upgrade: preserve the embedded attempt and every daily/award/receipt/cadence fact; do not auto-grant a victory or apply late rights to c21. Explicit Continue/Next crosses the former c20 boundary once. Unknown future catalogues stay protected. The installed bank now ends explicitly at c120 and the UI derives its totals from actual content.

The appended fields rotate twenty silhouette families (twelve new) five times each. Ten-field pacing is short/normal/Hard/normal/short/normal/Hard/normal/normal/Nightmare, a project policy. A separate offline generator prefers longer bent paths and blockers of currently free arrows; the original generator and daily fields are untouched. Four deterministic candidates per new field are selected using independent cell-walking dependency depth, coverage, arrow count and bends. Only selected coordinates ship. Structural selection is not human difficulty/playtesting evidence; physical-phone acceptance remains open. See `STAGE_E_CAMPAIGN_BANK.md` and the committed selection report.

## App identity and review boundary, 2026-11-09

Version 0.7.0 keeps the application ID/display name/save identity while adding shared bent-arrow artwork across the store SVG, browser preloader/favicon and native adaptive/monochrome/legacy/launch vector resources. The 29 Capacitor default resources are removed, with build-time drift/obsolete-resource checks. The existing AndroidX splash library is installed before Activity creation; no minimum presentation hold or SDK readiness wait is added. Initial HTML contains the mark, completion stays tied to the first actual game render and uncovered paint. Native masks, API-24 vector gradients and launch appearance still need phone evidence.

Normal Home/pause no longer expose control boards, and their catalogue is absent from the APK graph. Four fixed review boards remain source/test inputs through an isolated deferred in-memory bootstrap entry. No production query/global/debug toggle reopens them. Production-bundle checks reject their identifiers and test harnesses. This moves twelve browser checks to an isolated real-rendering fixture; the 72-case suite has 54 ordinary application cases and eighteen isolated fixture cases. This is a distribution boundary change, not removal of deterministic gesture/renderer verification. See `STAGE_E_IDENTITY.md`.

## User-directed presentation and opening revision, 2026-11-10

0.8.0 applies generated raster art selectively to two Home destinations; all readable/control UI remains DOM. Original prompts, source fingerprints and runtime sizes are recorded. Finite UI animations settle on background and teardown, respect reduced motion, and never own domain progress. Quick navigation finishes prior visual transitions; modal blockers release only after close completes.

The user explicitly requested more turns and tighter relationships in early boards. Catalogue 3 therefore introduces opening contentVersion 2 for fresh c01–c20 attempts, superseding the original twenty-field immutability constraint for future attempts. Already embedded attempts (including unstarted), receipts and wins stay unchanged. c21–c120 and daily/trophy content are frozen. The opening is independently solved and legacy/tail fingerprints remain pinned. This is composition work; real-player difficulty and exact-device feel still require playtesting.

## Reference-calibrated compact opening, 2026-11-10

After rewatching early V06 frames, 0.8.1 replaces only fresh c01–c04 with fully occupied small tiles (contentVersion 3) and caps small-board initial spacing at 18px. Original level 1 is straight; our own bent first field retains the user's earlier request for turns. Empty background around a small central puzzle remains part of the reference presentation; internal holes are removed. Catalogue 4 preserves all embedded attempts and receipts. c05 onward and all daily/trophy content remain frozen. See `COMPACT_OPENING_V3.md` for measured before/after and evidence.

## User-authorized dense-bank replacement, 2026-11-10

After the read-only audit, the user explicitly asked to rebuild the later bank. 0.9.0 replaces only fresh c05–c120 with contentVersion 4; the first four compact fields remain v3. Catalogue 5 accepts known 1–4 without rewriting embedded geometry or receipts. Old freeze constraints are superseded for fresh campaign content, while daily/trophies remain frozen.

Construction now peels paths from a filled silhouette, with orphan repair and seeded selection gates on ≥98% occupancy, small accidental holes, bends, dependency depth and initial/early-solve freedom. Breathers keep more choices and short tasks; Hard/Nightmare strengthen interleaving. Full criteria, limits and reproducibility are in `CONTENT_BANK_V4.md`. These are content-selection proxies; no human completion-time or phone performance claims follow from them.


## User-directed feel pass, 2026-11-10

0.10.0 moves blocked arrows along their measured route to the nearest blocker and reverses the same route. Contact owns impact sound/haptics and sparks; domain acceptance, first-error life cost and durable progression remain independent. Removing a blocker or activating the now-free arrow during motion must not introduce a snap, phantom impact or extra penalty. Navigation/background settles presentation and never replays a completed reward.

Menu routes now stagger visible cards and carry matching Home art into destination headers. Metadata refresh is deferred through the finite transition to preserve animated element identity. Victory begins after the last exit flight, with bounded confetti/rings, a staged result and original ascending sound. Native haptics use distinct short amplitude/timing patterns with capability fallback. See `FEEL_PASS.md` for exact bounds, lifecycle contracts, recording provenance and phone-evidence limits. No content catalogue, save schema, ads policy, SDK or kit pin changes.


## User-approved minimal interface, 2026-11-10

0.11.0 implements the agreed UI simplification: one primary Home action, persistent compact bottom navigation outside route snapshots, smaller gameplay HUD, unframed victory and award shelf, plain settings rows and contextual detail disclosure. The user explicitly requested three seconds instead of twelve for the active Hint delay and less vertical space for lives/buttons. The explicit video-labelled Hint now opens existing pre-show loading directly, removing the confirmation step. Existing rewarded authority and cadence are unchanged.

Held-preview growth, small dot response, entry stroke stagger and once-per-new-earned-award travel remain finite presentation. Restores never manufacture/replay earned rewards. All embedded attempts, content catalogue 5, daily/trophy geometry, save schema and kit pin are preserved. See `MINIMAL_UI.md` for exact motion bounds, background/idle rules and verification provenance.


## Approved assistance presentation, 2026-11-10

0.12.0 implements the user's accepted custom-heart/recovery, earned-Hint light and next-field transition package. Recovery feedback follows actual dialog close and independent ad/foreground release; lives and receipt dedup remain authoritative before any animation. A dialog-close wait also fixes rewarded-lives entry being rejected while its own dialog blocker remained active. Hint arrival owns its cue; duplicate receipts and restore never replay it. Background/new attempts settle finite presentation, with no durable visual queue. See `ASSISTANCE_FEEL.md` for timing, lifecycle and explicit isolated-transport capture provenance. Content, save schema, cadence, native cue profiles and the pinned kit remain unchanged.


## Fuller finish within the minimal design, 2026-11-11

The user requested a richer victory with the existing minimalist design. 0.13.0 strengthens the single finish sequence through a last-arrow radial dot wave, two bounded palette-limited ribbon fans, sparse glints and a drawn seal. The result adds no panel or mandatory delay. Completed tutorial/restart noise is removed and its live text is no longer rewritten on every sync. Win/award note spacing follows the visual cadence; native profiles stay unchanged. State/reward/content/ads authority and no-replay/idle contracts are preserved. `FINISH_POLISH.md` separately records proposed unlock and daily-calendar arrival improvements; those proposals are not implemented or silently added to this release.

The finish review also reproduced a pre-existing visual replay when opening a completed final field in a young scene: a negative expired timestamp was mistaken for the fresh-attempt sentinel. The start guard now additionally requires an unannounced finish and the exact fresh sentinel. Direct completed-c120 restore and immediate post-interruption quiet assertions cover the distinction; no new reward/state authority is introduced. The final artifact/recordings use the corrected source.


## Approved meta arrivals, 2026-11-11

The user accepted all three next steps from 0.13.0. 0.14.0 introduces the existing Collection/calendar icons after real level-10/20 availability crossings, links a fresh daily return to its actual green cell and monthly cup progress, and sends the completed final campaign result to the calendar. Save schema 2 gains only optional-on-read cosmetic `seenUnlocks`; legacy available sections remain quiet, malformed discovery metadata cannot invalidate valuable progress, and claims use the shared writer before motion. Pending presentation remains transient. Native ad/foreground continuation ownership, receipt authority, content geometry/art identities and kit pin stay intact. `META_ARRIVALS.md` records exact lifecycle, serialization, small-screen and recording contracts. The earlier proposal-only notes are historical.

## Whole-game UI/UX review, 2026-11-11

The user authorized an independent complete UI/UX/feel pass and fixes. Version 0.15.0 / code 20 addresses observed calendar occlusion on small/short screens, hidden medal progress, accidental heading focus boxes, a wrapping daily HUD, loss Back/menu re-entry and cleared-board Home placeholders. The next-board SVG is a read-only installed-content preview; only the existing explicit entry advances progress. Final Home keeps the actual c120 result entry. Loss establishes the parent menu before closing its dialog, preventing synchronous reduced-motion/native-Back reopening. `UX_REVIEW.md` records inventory, direct regressions and authentic capture recipe. No new content, reward authority, save schema, ad cadence, service or kit update is included.

## Independent gameplay audit, 2026-11-11 — proposals only

The user requested analysis/plan before substantial implementation. `GAMEPLAY_AUDIT_2026-11-11.md` records the research snapshot (`mini-games-kit@60af6ee`), all-120 independent graph/order analysis, current production-render samples and explicit evidence limits. Readability/zoom learning and the unsupported-year daily/archive contract are SELECT product hypotheses; experimentation is selected as the verification method. A targeted human comparison precedes bank/generator changes. Hidden online DDA, answer-highlighting, new currencies/meta and coupling difficulty to ads are rejected for this scope. No app/content/save/ad policy/version/dependency has changed, and SELECT does not mean owner-approved production implementation.

## Autonomous daily continuation and scale learning, 2026-11-11

The user subsequently approved the concrete package, explicitly replacing a 2027-only addition with ongoing local generation. Version 0.16.0/code 21 implements fixed dated algorithm v1 from 2027-01-01, based on the existing eight-mask reverse construction, bounded correctness validation/retry/fallback and a 16-field memory cache. Catalogue 3 migrates known 1/2 without a new save schema. Decode/restart preserve embedded geometry and exact reward ownership; future date difficulty changes require a new algorithm/date boundary. Existing campaign, all 2026 tasks and frozen/earned trophy designs stay unchanged. Calendar/year availability uses local dates through the existing 2200 contract, and post-2045 trophies use immutable v2 composition on demand; future-year preview is still forbidden. `AUTONOMOUS_DAILY.md` records scope and verification.

True late pinch/wheel scale change now records existing zoom learning. Restored camera and Hint auto-focus do not. The contextual zoom reminder is prepared only in an isolated QA fixture; a human pilot precedes enabling it. Three-second Hint, active ad clocks, lives, SDK and pinned kit remain unchanged. Campaign redesign, novelty/DDA, extra meta and advertising/reward experiments remain outside this package.

## Collection icon polish, 2026-11-12

The user requested cleaner icon artwork based on the Collection medal screenshot. Version 0.16.1/code 22 redraws the three medal compositions/emblems, the small navigation cup and Settings slider tracks. Existing geometry footprint, earned/unearned theme tokens, labels, rules, disclosure, progress and reward identities remain authoritative. There is no new meta, effect system, asset dependency or gameplay/content/save/ad change. See `ICON_POLISH.md` for visual QA and ordinary-UI capture provenance.

## Debug signing evidence correction, 2026-11-11

The APK-v2 X.509 certificate of 0.16.0 differs from archived 0.15.0 (and 0.14.0 differs too). Completed CI job 130718283407 reports a signing-cache miss and post-cache path validation failure for `~/.android/debug.keystore`; the earlier stable-preview-update assumption is superseded. No private key recovery or signing/cache repair was performed. The debug APK is a fresh-install preview, not an in-place update for the differently signed old build; existing real installation data must not be removed as a workaround. Format migrations/receipt ownership pass independently. Durable signing and actual installation/update evidence remain release work.

## 2026-11-12 — actual phone readability and feedback

User feedback authorizes 0.17.0 presentation/native fixes in `PHONE_FEEDBACK.md`. Preserve bank geometry, all embedded attempts, progression/ads/reward authority and kit pin. Correct actual Capacitor JSON counter parsing before treating absent vibration as device tuning; physical acceptance remains open. Replicate observed V06 full nav locks and level captions without changing unlock boundaries. The new `.playtest` app explicitly isolates fresh test progress from the differently signed installed app; never prescribe uninstalling real progress. This bounded debug delivery does not complete release signing.

## 2026-11-12 — casual face and tighter presentation

The user explicitly requests a more casual-game font and slightly thicker/closer arrows. Version 0.17.1 ships Nunito locally with its OFL and uses stronger text hierarchy; font failure must not block startup or play. Correct the prior camera side effect: compact spacing22→20 while shared ink rises independently, with a dense .58-cell cap. The large Home preview and frozen content/input/save/reward/ad authority remain. See `TYPOGRAPHY_DENSITY.md`. Continue the same signed `.playtest` package, subject to exact artifact/certificate evidence; no player uninstall or fabricated install/update claim.

## 2026-11-12 — rounded triangles, bends and heavier ink

The user explicitly requests rounded triangular heads, mildly rounded bends and more ink/density. Version0.17.2 uses shared display-only fillets/markers in Home and game; the open Home chevron is replaced by the filled marker. Keep all canonical paths, picking/contact/arc-distance authority and saved geometry frozen. A bounded filled tube avoids observed WebGL miter artifacts; partial shaft clipping stays behind the head. Compact spacing20→19; shared ink4.6 CSS px with dense/assistance caps. No font/audio/haptic, content, progression, ad or kit change. See `ROUNDED_ARROWS.md`; require matching playtest certificate and genuine current-build GIFs, including real pinch rather than injected camera state.

0.17.2 final candidate uses Android code26 after CI exposed a dense-field rendering cost in the provisional code25 build. Keep body curve joins lightweight: four fillet samples, explicit outer wedges and only two cached cap fans; no per-sample ellipse/earcut. Preserve six-sample head corners and the actual artwork. CPU4x c20 diagnostics confirm lower cost and timely Hint; original3s Hint/ad clocks and4500ms QA deadline remain unchanged. Final APK/media replace the provisional files; no source clock/ad/difficulty change is authorized by this fix.

## 2026-11-12 — empty-tap acknowledgement and semantic difficulty colors

The owner requests a short circle/halo plus sound/haptic on empty taps and different difficulty colors. 0.17.3 acknowledges only a completed short unambiguous empty-space tap through the existing board gesture machine, with final-displacement validation. uiMotion owns at most four finite pointer-transparent marks and cleanup; reduced motion retains fade-only confirmation. Reuse gameplay-channel button feedback/settings/lifecycle budgets; no new native cue. Keep Hint/ad clocks, canonical input/geometry, content, saves, rewards and SDK unchanged. Existing text labels gain shared amber Hard/coral Nightmare colors with both-theme contrast checks, including Home and daily selection. See `EMPTY_TAP_FEEDBACK.md` for actual/reference evidence, chosen bounded-feedback/accessibility guidance, isolated-QA provenance and KIT IMPACT: NONE.

## 2026-11-13 — selected-field continuity and principal difficulty heading

The owner requests a seamless Home/game boundary and no displayed field before selection. 0.18.0 supersedes the earlier next-geometry preview policy: infer opened presentation from this session/started/existing saved view without changing first-move authority/schema. Prepare HUD/layout/scene before reveal, skip per-arrow entry only for menu continuation, and use one finite read-only SVG bridge to the actual rendered canvas camera. Layout offsets exclude animated HUD transforms; snapshots preserve ID-scoped sizing before ID renaming. Direct reduced-motion owner state must precede potentially synchronous Phaser wake/POST_RENDER. Back/blocker/resize/disposal clean all presentation. Reference V06/V19 decoded frames confirm a principal Hard/Nightmare label above hearts; keep our palette and daily context. All canonical content, moves, camera-save meaning, rewards/ads and runtime pin remain unchanged. See `SEAMLESS_ENTRY.md` for source evidence, limits, tests and KIT IMPACT: NONE.

## 2026-11-13 — second phone-feedback package

The owner explicitly authorizes automatic flight of an errored arrow after its last blocker, a single lifetime free refill, new sound/Hint/ray/flawless-finish presentation and camera framing, plus large-field optimization, in-game unlock arrivals and stronger control presses. Version0.19.0/code29 preserves content/attempt/receipt/SDK/ad-cadence identities. `PHONE_FEEL_V2.md` specifies atomic chain ownership, legal historical replay, post-route explicit-entry resume, additive global gift and conservative legacy Restart ambiguity, finite/reduced-motion FX and fixed resource budgets. Availability remains c10/c20; the existing seen claim now presents in play. Select bounded causal presentation and paired actual-gesture performance measurement; no new director/meta/shared framework or runtime upgrade. Original snapshot/video timing is not inferred from the owner's static screenshot. Physical acceptance remains distinct from software evidence. KIT IMPACT: NONE.
