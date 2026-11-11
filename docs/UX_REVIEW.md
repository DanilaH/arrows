# Whole-game UI/UX review — 0.15.0 (20), 2026-11-11

The user accepted a complete independent navigation/readability/feel pass and fixes. This is a review of the existing game, not new content or a new meta system.

## Findings and changes

| Area | Observed issue | Final behavior |
| --- | --- | --- |
| Small calendar | At 320×568 the sticky selected-day footer covered actual day buttons. In short landscape its main action started behind bottom navigation. | Calendar days and the selected-day action stay in normal flow. Short portrait uses a compact cup summary; short landscape uses a compact side summary and a separate month column. Every row and the action can be scrolled into an unobscured position. No day hitbox is covered by another calendar panel. |
| Collection | Native closed `details` hid not just the medal rule, but also all numeric/progress information. | The summary always exposes the real progress line/count and a small disclosure chevron. Only the rule expands. Keyboard behavior and expanded-state/language restoration remain intact. The level-10 cup shelf explains the existing level-20 gate with one inline caption. |
| Route focus | Programmatically focused Home headings acquired a browser focus box. | Heading focus remains available for navigation semantics, with no decorative box. Interactive controls retain their keyboard outline. |
| Daily HUD | The generic daily title wrapped above the hearts at 320px while the date was repeated at the bottom. | The header shows the localized day/month in the existing compact row. Its Back label names Calendar. The duplicate footer date is hidden; control-review labels remain available in isolated tests. |
| Loss | A Pause button added a second menu; native Back could close and immediately reopen the loss. | Loss offers a direct Home/Calendar action. Escape and native Back use the same parent destination. Navigation establishes its menu blocker before the modal blocker closes, including synchronous reduced motion; the hidden game cannot reopen its loss. Closing the game dialog does not steal focus from a menu heading. Returning restores the same attempt, error marks, free-refill availability and earned-reward eligibility. |
| Home after a win | A cleared board was replaced with an arbitrary empty circle. | Home previews the actual installed next board and labels the action Next, without advancing or rerolling state until the existing explicit entry. Exhausted c120 shows a quiet completion mark and View result, retaining the exact final attempt and Calendar result action. |
| Record explanation | Optional rules exposed a historical implementation version. | RU/EN retain the same counting rules in player language; history/codec rules remain documented in source. |

## Review coverage

Baseline and final production browser captures inspect Home, campaign, daily, Collection, medal disclosure, Collection scroll end, month/calendar selection, trophy viewer/top and scroll end, settings/top and scroll end, and restart. Profiles: 390×844 dark RU; 320×568 light RU; 568×320 dark RU; 390×844 light EN. Fixtures for late-game states are internal QA only. Settings also retain the existing 125% text, 320px and short-landscape regressions.

Behavioral verification additionally covers a six-row August month at 320×568, 568×320, 780×360 and 390×844; first/middle/last date centers and the launch action must actually receive hit-testing after scrolling. Daily date localization, closed-medal progress, gate explanation, keyboard disclosure, route heading versus control focus, lost campaign Escape/Home/restore, exhausted daily no-provider video/Calendar/restore, native Back with ordinary/reduced motion, next-board preview and retained c120 result are direct regressions.

Seven new browser cases run on phone and desktop (14 cases). The first relevant 62-case run passed 56 and exposed three new test-harness mistakes in each profile: a daily fixture with only five distinct blocked arrows for six errors; a keyboard action racing the settings close/focus return; and replacing storage before an old page's final save. Corrected fixtures/waits/init timing pass all 14 focused cases. No production rule was relaxed to satisfy them. Existing progression, ad failure, settings, award and lifecycle checks remain applicable. Final strict/native-sync/CI and exact build/capture evidence are recorded in the handoff and verification report when assembled.

## Motion and authority

No new permanent panel, idle animation or render loop. The chevron uses a finite transition and respects reduced motion. Existing owned route/dialog/refill/victory/unlock/daily presentations remain responsible for finite cleanup and no-replay behavior. Calendar scrolling remains ordinary user scrolling; there is no delayed scroll into a newer route.

The content catalogue, campaign/daily geometry, published trophy art/bindings, save schema/codec, attempt and receipt ownership, ad cadence, feedback profiles and kit pin are unchanged. The Home next-board SVG is a read-only preview, not a next-attempt transaction.

`capture-ux-review-gifs.mjs` uses unmodified production assets, fresh storage and ordinary touch selected by an independent cell-walking oracle. It earns nineteen real campaign wins, records the fifth-win→Home→next-board path, actual medal progress/disclosure, a six-row calendar at 320×568 and its real August 31 daily entry. The loss path makes six distinct real errors with the ordinary one free refill, then receives the browser's actual no-provider video response and returns/resumes the same lost attempt. No progression, rewards or SDK transport is injected. Its MP4 tees actual AudioContext output; it adds/replaces no sound. Full-campaign and native-Back fixtures are internal QA, not delivered earned-completion/device claims.

Browser mobile emulation does not establish physical-phone sound/haptics/performance, real SDK inventory/earned behavior, AppMetrica delivery or production signing/store acceptance.
