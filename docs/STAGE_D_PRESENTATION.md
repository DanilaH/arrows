# Presentation/settings package — 0.4.0 (8)

Implemented after the user approved the next themes/settings/sound/vibration package on 2026-11-09. This completes the presentation portion of D; native ad cadence/live earned delivery and dashboard verification remain separate work.

## User-facing behavior

Home and the game HUD open a labelled, keyboard-accessible settings dialog. Light/dark theme previews, independent Sounds/Vibration switches, a real sound-preview button and complete RU/EN selection apply immediately. Close, Escape and native Back restore the originating screen/focus. Small landscape/narrow/large-text layouts scroll instead of clipping controls. Choices do not restart the attempt or recreate Phaser.

Both themes cover Home, records, medals, the calendar/date states, trophy backgrounds, settings/game dialogs, save errors, tutorial, HUD, normal/error/guided arrows and reactive dots. Semantic CSS variables and numeric renderer palettes share the appearance policy. Published SVG trophy materials and v1/v2 bindings retain their art identities. Future year artwork remains hidden. The transparent board canvas takes its background from the active document theme, including outside the camera viewport.

Native EdgeToEdge and Capacitor 8.6.0's bundled SystemBars use the existing `viewport-fit=cover`/CSS safe-area contract. Theme changes request matching status/navigation icon style. This is compiled wiring; exact-device cutout, gesture/three-button bars and rotation inspection remain required.

## Preference durability

`arrows.settings.v1` is a separate versioned document using the pinned kit JsonStorageRepository over the existing browser/native adapter. The authoritative gameplay schema/key/writer and receipt ledger are untouched. Defaults are dark, device RU/EN, sound on and vibration on.

Optional hydration never gates first paint or gameplay. A 1.5 s deadline ends an unavailable read; later responses are ignored. A loaded snapshot merges with keys the user already changed rather than overwriting them. Invalid/future JSON is retained until an explicit edit/retry. Changes apply to the session before the serialized disk write; a failed latest write exposes Retry and does not silently revert the UI or clear progression. The last accepted writes may settle after teardown; subscriptions, load timer and UI listeners are removed.

## Feedback and lifecycle

Original short pluck/glass tones cover UI, removal, error, hint, restored lives, victory and newly earned awards. A cached synchronous consumer buffer provider feeds OneShotPlayer; no decoding/network request is awaited. One lazy AudioContext, six voices, 90 ms cold-resume deadline, fixed replacement/cadence groups and bounded cue amplitude/gain prevent an expanding backlog. Rapid removals have a small bounded pitch contour. Phaser audio is disabled to avoid a second context. There is no continuous sound texture or soundtrack.

The native vibrator uses freshness/generation/capability checks, with new button/hint/life/victory hooks. JS cancellation advances its generation without imposing a later native wall-clock cutoff on the fresh UI pulse; stale cancellation generations are ignored. Native pause still records its own timestamp and cancels independently. The switches are independent; muting audio does not disable vibration, and disabling vibration does not silence audio. Sound Preview deliberately plays only audio.

Reason-aware activity eligibility treats menu/dialog/trophy/settings as UI-only. Ads, document/native background and browser focus loss disable all feedback. Block changes stop ineligible WebAudio sources; context interruption cancels rather than replaying stale voices. Native pause separately cancels the vibrator. Accepted gameplay moves, life/hint application and first victory presentation own cues; receipt recovery/load does not replay a victory fanfare. Browser focus events are not substituted for the native App lifecycle. Teardown releases voices/context/buffers/listeners and preference hydration resources.

These are our own audio choices. The source video's sound has not been verified by listening, and no exact audio parity is claimed. Browser source scheduling/cancellation tests do not establish Android speaker loudness, haptic feel, audio-focus recovery or phone frame pacing.

## Verification

Strict typecheck/build and 61 unit tests pass. Tests cover preference hydration races/deadlines, preserved unsupported documents, failed writes/retry, independent values and feedback/sample bounds. Ten new browser cases cover actual WebAudio source cancellation/no replay, live theme/language changes with a partial attempt retained across reload, collection/calendar/trophy appearance, persistence errors and constrained layouts. The full 56-case phone/desktop browser suite passes on the presentation implementation. A final ten-case settings rerun also passes after the focus-return polish. Native artifact identity and CI evidence follow separately.

`tools/capture-presentation-gifs.mjs` records the real production UI from fresh RU mobile browser sessions. It uses normal UI/pointer input, never injected progression, and asserts that theme/language edits preserve the attempt. GIFs demonstrate appearance and navigation; they contain no audio and do not prove physical-device behavior.
