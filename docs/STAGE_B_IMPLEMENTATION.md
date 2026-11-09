# Stage B — campaign loop, 2026-11-09

Version 0.2.0 / Android versionCode 3. This implements the first campaign chapter and persistence/reward boundaries. It does not complete C–E or physical-phone acceptance.

## Player-facing changes

- Twenty fixed own campaign levels. Levels 1–4 introduce tapping, bent arrows, blockers and guides; level 6 introduces zoom on a Hard field. Tutorial completion follows actual actions and persists across restart.
- Hard at 6/12/18; Nightmare at 20. The chapter stops explicitly after level 20; it neither rerolls nor silently repeats level 1. The release target remains the larger selected campaign/daily bank.
- Header shows level number, lives and progress. Victory offers the next level after the final flight/point reaction. Confirmed victory is already durable before these effects.
- Pause preserves the attempt. Restart creates a new attempt of the same immutable field after confirmation. The four Stage A fixtures remain accessible under Pause → Control boards, separately from campaign; remove this review entry for the store release.
- One free refill per attempt, then rewarded. Both restore to three hearts without clearing removals, marks or camera. Restart resets the free chance, an explicit project policy from spec §8.
- Hint appears after 12 seconds without a successful removal in active gameplay. Pause, background, ads and mandatory tutorial time are excluded; camera movement does not reset it. The video explanation is explicit. Earned Hint highlights a currently removable arrow, focuses it if needed, and never auto-plays it.
- Browser video requests report unavailability and grant nothing. Real native show/receipt wiring is connected, but live SDK fill/earning and dashboard delivery still require Android acceptance.

## Fixed content

`src/content/campaign.json` is generated offline by `npm run content:campaign`, then committed. Own silhouettes include ring, flower, heart, star, leaf, cross, diamond and butterfly. IDs and contentVersion are stable; Continue uses the saved field, not fresh generator output.

Arrow counts by level: 3, 4, 6, 6, 21, 68, 24, 22, 29, 26, 30, 86, 28, 25, 28, 31, 34, 68, 40, 182. The generator validates all fields. A separate cell-walking oracle proves removal legality and completion in three orders for every field. This proves model consistency/solvability, not enjoyable difficulty, reference parity or phone playtesting.

## Save authority and recovery

`ProgressStore` is the sole writer of `arrows.progress.v1`, using the pinned kit's `JsonStorageRepository`. All operations (moves, wins, next/restart, tutorial, view/time snapshots, free refill and earned receipt) derive their changes from the latest confirmed state *inside the same queue*. Producers never write prebuilt stale full snapshots.

The schema stores revision/catalog version, position, current immutable level geometry with ID/contentVersion, attempt identity, removal order, errors, lives, free-use/continuation counts, view center/relative zoom, guides, active hint/time, first-action flag, tutorial completion, win facts and receipt ledger. Daily attempts have an independent per-date map; daily UI/catalog is stage C.

A move is presented only after its snapshot commits. Reload during flight restores the removed arrow without replaying it. Last removal and win fact commit together. Duplicate Next commands carry the original attempt ID; they cannot skip another level. Tutorial events follow the first committed semantic action. Attempt-start state persists; restoration emits a separate `level_resume`, not a new `level_start`. Events are best-effort after save, not a crash-proof analytics outbox.

No older gameplay schema shipped. The v1 decoder strictly validates schema/catalog, IDs, geometry, legal removal history, lives/continuations, chapter history, hints and receipt reservations. Unknown/future or invalid durable data is preserved verbatim and opened as an explicitly unsaved session, never overwritten with defaults. Only invalid camera metadata is deterministically repaired to a fitted view. A slow initial read offers explicit unsaved play; its late response cannot replace that session. Restore retries the authoritative read.

Failed writes do not advance the displayed board. If readback proves the candidate landed despite a rejected RPC, it commits once. If readback proves the old state remains, a retry is allowed. If truth cannot be established, all save mutations freeze until Restore reloads authoritative state. Rewards cannot be acknowledged in unsaved mode. The browser adapter is a single-tab development surface; no cross-tab locking is claimed.

The native adapter already uses AtomicFile readback. Camera writes are debounced and active time is sampled without a rendering loop; active time also checkpoints on actions, pause/background and a 15-second interval. Recent unsaved camera/time can be lost on abrupt process death; accepted removals and wins do not depend on that debounce. Physical process-kill evidence is still pending.

## Earned rewards

The existing durable native inbox feeds `DurableReceiptQueue` only after the save load settles. Effect plus receipt ID commit together through the same authority as ordinary gameplay. Acknowledgement follows that durable result. Replays consult durable IDs; the ledger is not arbitrarily truncated. Failed acknowledgements do not undo the grant.

A late receipt for a retired, completed or otherwise ineligible attempt becomes a durable reserved right tied to that original attempt. It is not redirected to the next level. These reservations are retained for a later explicit recovery/support policy; no claim that a reservation has visibly helped the player is sent. This is a documented project recovery policy, not observed reference behavior. Daily rewards target only their exact date-owned attempt.

The shared TS/native analytics schema now includes first/repeated errors and separate restoration. Other connected events cover start, win, restart, tutorial, free/rewarded refill, Hint request/application, receipt grant and save errors. Native prepare copies this exact schema. Interstitial cadence, final placements, real earning and device-to-dashboard validation remain D–E.

## Verification

- Strict TypeScript, production build, 39 unit tests and `android:sync` pass locally.
- All 32 browser cases pass across Pixel 7 emulation and desktop Chromium, including all four fixture clears and idle-render/resize checks.
- Added UI scenarios cover interrupted victory, one-time Next, partial-state restoration, separate control boards, free refill/mark retention, unavailable rewarded, restart, zoom/rotation, semantic guide tutorial, contextual Hint, invalid-save preservation and write-failure retry.
- Model tests cover the whole chapter with an independent oracle, ordinary-write/reward races, duplicate receipt/ack recovery, late-attempt reservation, ambiguous persistence, frozen recovery and an abandoned slow initial read.
- Delivery GIFs come from normal touch interactions in the actual production browser build. Capture script: `tools/capture-stage-b-gifs.mjs`. No forced gameplay state or fake reward is used for the recordings. They are not phone performance evidence.
- CI [42600519336](https://github.com/DanilaH/arrows/actions/runs/42600519336) passed both web and Android jobs on `bf3285acdd6457f30ae1ae70daac942229d542f2`. Debug APK: 9,758,477 bytes, SHA-256 `dd5ac5c4133a215533742c6ba5feca7eb9861460c074f9e3dbb23631ebde3cb7`. Downloaded artifact ZIP matched its digest; every embedded web payload file and the shared analytics contract matched the locally recorded build. See `verification/STAGE_B_BUILD_2026-11-09.json`.

## Next work

C: real Home/Continue routing, Collection and daily calendar/content identities. Preserve separate campaign/daily attempts and the full source-of-truth spec. Keep open medal/League/account/purchase rules explicit rather than inventing them. Phone feel/performance, final sound/themes, production ads/cadence, real analytics delivery, signing and RuStore package remain required later work.
