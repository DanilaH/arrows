# Stage C — navigation, records and daily, 2026-11-09

Version 0.3.0 / Android versionCode 4. Home, Collection, the dated daily catalog and monthly trophies are implemented. Open League parity and D–E remain required; this is not the store release.

## Navigation and UI

- Startup opens Home with a preview of the actual remaining campaign geometry, current level/difficulty, Play/Continue, chapter progress and current local-day streak.
- Continue restores the same attempt. A campaign victory interrupted before Next advances exactly once when Continue is used. No reroll or progress reset on navigation.
- Collection opens at current level 10; daily at current level 20. Locks describe their actual threshold. Home/Collection/calendar are real DOM screens over a sleeping renderer, not game dialogs.
- Game Back returns to Home for campaign or the selected calendar date for daily. Calendar entered through a Collection trophy returns to Collection; Android Back follows this parent, then minimizes from Home. Independent native/background/ad blockers remain intact.
- Menu scroll/focus is preserved across refresh and return. Late async opens carry a navigation revision and cannot steal a newer screen.
- RU/EN cover all new screens, calendar labels and record rules. Layouts were checked at phone portrait, short landscape, desktop and a 125% text-size stress. This is browser evidence, not Android accessibility/physical-device acceptance.
- The temporary Control boards review link lives at the bottom of Home and stays independent of campaign/daily. Remove it for the store release.

## Explicit local record/medal adaptation

The original Most Wins meaning, reset boundaries, medal thresholds and League have not been proven. These are **our documented local rules**, not claimed reference parity:

| Item | Implemented rule |
| --- | --- |
| Longest day streak | Longest consecutive local calendar dates with at least one first-clear win, campaign/daily together |
| Consecutive wins | Best sequence of first-clear completed attempts, broken by restarting a started attempt |
| Most wins in a day | Maximum first-clear wins on one local calendar date, not total wins |
| Home day streak | Current sequence ending today or yesterday; an older best streak is not presented as current |
| Level Legend | 20 campaign wins |
| Perfect Play | 10 first-clear wins with zero mistake marks |
| Unstoppable | 10 consecutive wins under the rule above |

Records show the date of their first best result. Rules are available on the Collection screen. Three local medals derive from confirmed history; earned styling/progress is real. League Climber/Fighter/Winner and a league UI remain unimplemented pending evidence or an explicit scope decision. There are no fake competitors or disabled League controls. This is a deliberate partial adaptation of the six-medal reference, not a claim that all six match.

Schema v1 had confirmed campaign win timestamps/mistakes but no restart log or original local-date key. Migration preserves those wins and freezes their local date using the upgrading device's timezone. Their missing restart history is not invented: consecutive-win facts start at 0.3, explained in the record rules. Existing zero-error wins still count toward Perfect Play. New facts capture local date/time, attempt and mode at the accepted action and allow later recalculation.

## Fixed daily catalog and calendar policy

`src/content/daily.json` contains 61 own fixed fields, one for each date of November/December 2026 (2,408 arrows total). `npm run content:daily` reproduces the committed catalog. There are eight silhouette families, normal/Hard/Nightmare variants, stable date IDs and contentVersion 1. No runtime generation/reroll is used for Continue.

- Archive starts 2026-11-01. Both promised months can be browsed; future days are disabled. Dates before the archive or beyond the installed catalog cannot be started. After catalog exhaustion, installed past dates remain playable; no infinite/new-day catalog is claimed.
- Date eligibility uses the device's local calendar. The selected date is fixed when opening a task; midnight and month rollover never rename an existing attempt. Today, selection, completed green dates and future days have distinct states.
- Each date owns its geometry, attempt, removals/errors/lives, free refill, active Hint, guides and camera. Campaign and every daily date share one writer but never overwrite each other's attempt.
- A daily win and its date marker commit with the final removal. Reopening a completed date shows its result; restart/double taps cannot award another daily win.
- A monthly cup commits once when every promised date in that full month is complete. Moving the device clock backwards cannot award it again. Two own SVG trophy variants have distinct November/December engraving, muted unearned and gold earned states; Collection shows each month’s confirmed count.
- This offline local calendar is not an anti-cheat or server-time system. The catalog is structurally/independently validated, not phone-playtested/curated as final release content.

## Save migration and reward ownership

The same `arrows.progress.v1` storage key now contains schema **2**. The v1→v2 migration preserves campaign identity, immutable geometry, removal/error/life state, camera, tutorials, history, receipt ledger and reservations. It adds daily version/wins, immutable run facts, cup IDs and seen-award state. Unknown schemas and invalid durable truth still remain untouched in explicitly unsaved mode. Safe metadata repair is unchanged.

Every gameplay/presentation/reward operation resolves an exact attempt inside the sole authoritative queue. Daily operations do not depend on a mutable globally selected date. A delayed view write/reward for another date cannot be redirected by switching screens. Receipt deduplication/effect+ledger atomicity remains unchanged; daily earned receipts go only to their matching owned attempt. Late/retired rights remain reserved under their original ID.

The codec validates daily date-to-field ownership, legal snapshots, matching completed-day facts, trophy prerequisites and unique/confirmed run facts. A failed write after migration compares authoritative decoded readback, not only raw v1/v2 JSON bytes. Acknowledgement still follows durable commit, and unsaved play never earns a fake receipt.

New analytics cover screen visits/daily opens, exact-mode starts/errors/exits/completions, daily completion and first unlock observations. They remain best-effort after durable truth, not an exactly-once network outbox or dashboard delivery claim.

## Verification

- Strict typecheck, production build and 48 unit tests pass. All 61 daily boards pass geometric/solvability validation plus an independent integer-cell dependency checker.
- All 42 browser cases pass across phone and desktop profiles; the navigation-target refinement also passes its 10 targeted cases. Coverage includes locks, parent Back, actual partial Continue, two dates/campaign/restoration, future selection, only-one-green-date victory, month browsing and text/layout stress, plus all earlier gestures/idle/error/reward-unavailability checks.
- Model checks cover v1 migration, date validity/leap centuries, exact reward ownership, view/attempt isolation, midnight/month rollover, whole-month completion and exactly-one trophy, clock rollback, records and forged/duplicate-fact rejection.
- `android:sync` passes. Native CI/artifact evidence follows separately.
- GIFs are recorded from the current production browser build. To obtain the unlock, the capture tool plays the first 19 campaign fields through actual touch input and restores only that unedited exported browser state. No fabricated achievement, daily win, earned ad or edited gameplay pixel is used. See `tools/capture-stage-c-gifs.mjs`.

## Remaining scope

D: both themes, sound/haptic/settings tuning, native ad placements/interstitial cadence and live SDK/dashboard acceptance. E: selected larger campaign bank, rolling daily coverage, final identity/assets, signing, store materials/disclosures and exact release acceptance. Named physical-device FPS, gestures, process-kill restoration, haptics and live rewarded remain unverified. Keep League/gradient-arrow/sound-reference parity open rather than declaring full reproduction.
