# Minimal UI pass — 0.11.0 (16)

The user approved the preceding simplification plan and explicitly changed the Hint delay from twelve to three active seconds, while requesting a shorter gameplay HUD. This pass changes presentation and Hint entry timing; content catalogue 5, embedded attempts, award identities, save schema, receipt authority, ad cadence and the pinned kit stay unchanged.

## Surfaces and navigation

Home uses an unframed current puzzle, a quiet level/difficulty label, one Play/Continue action and a small completed count. Home, Calendar, Collection and Settings live in a single compact bottom navigation. It sits outside the animated/scrolling screen, with stable button identities through routes and metadata refresh. Active state uses color and a small line; locked destinations retain their level-10/20 gates and accessible unlock descriptions. Navigation is hidden during gameplay. Back retains the current screen-parent behavior, separate campaign/date saves and stale-open intent guards.

The HUD groups level, lives and difficulty into one compact row with existing Back/restart/settings actions; visible glyphs are small, all three input targets remain 44×44 CSS px. The normal phone header is 59px before system top insets. Campaign no longer repeats the level counter in the footer. Empty instructions reserve no permanent space; required tutorial copy, conditional Hint, errors and save recovery stay readable. Existing HUD ResizeObserver ownership updates the camera/clip when text or controls change size.

Collection presents records as three unframed numbers, awards as a shelf and the twelve installed monthly trophies as unframed artwork. Medal summaries are keyboard-operable native details; their conditions/progress appear on demand and expanded state survives metadata/language refresh. Trophy design bindings and future-year visibility are unchanged. Calendar keeps today, selected, completed and future states distinct; the selected-day action remains reachable above navigation. Short landscape and narrow portrait use their own layout.

Settings uses one dialog surface with compact theme choices and plain sound/vibration/language rows. Game dialogs and trophy inspection share the same restrained styling. Save/service failures keep real recovery actions.

## Motion and celebration

Routes crossfade over 220–300ms; visible content enters over 220ms with at most 64ms stagger and an 8px offset. The old whole-screen scale and large shared-art flight are removed. One inert outgoing snapshot and a bounded set of WAAPI animations are owned by the route; quick navigation, background, reduced motion and disposal settle them. The persistent navigation stays outside snapshots. Nav color changes do not create CSS transitions after a modal is settled in background.

Held-arrow preview still begins at 300ms and keeps existing release/cancel semantics. Its direction line grows from the head to the viewport edge over 160ms and briefly excites nearby existing dots. Entry strokes have bounded 0–90ms stagger and finish within 370ms. Both own wake/last-paint behavior and return to idle; neither changes legality or durable moves.

Victory is text, a check and Continue on the game background. Normal wins have 48 shorter-lived ribbons; Hard has 80, Nightmare/new awards have 104. The existing one-Graphics budget, ring/dot effects and voice/lifecycle ownership remain. A new canonical award may fly once to Collection on the first return to a menu. It is purely presentation: restore/background discards the pending flight and the existing unseen marker remains the durable discovery mechanism. It never grants an award. Big artwork and earned bindings are unchanged.

## Three-second video Hint

Outside required tutorials, count three active seconds without a successful removal, excluding menus/dialogs/background/ads and route transitions. Camera movement and errors do not reset the existing idle definition. A new attempt and successful removal reset it. There is no wall-clock catch-up.

The appearing button has a lamp, explicit localized “Hint · video” copy and a video symbol. Clicking directly starts the existing cancellable pre-show loading flow; the redundant explanatory confirmation dialog is removed by user approval. No implicit ad request happens on button appearance. Consent is conveyed by the explicit video-labelled action. SDK invocation, fullscreen cancellation limits, earned receipt + save commit + dedup + exact ack, original attempt ownership, no-fill and late receipt handling are unchanged. Browser no-provider behavior grants nothing. A successful earned Hint still highlights one currently legal arrow and never plays the move for the user.

## Verification and recording

Run strict typecheck, unit/build checks, full browser suite, native sync and versioned Android CI assembly. Focused UI tests cover persistent navigation, compact HUD touch areas, keyboard medal details, a genuinely earned-in-test award flight with no replay, three-second active Hint timing/no-provider behavior and background settlement. Synthetic saves exist only in internal tests/visual QA; delivered captures start with fresh production storage and earn nineteen wins through ordinary touch selected by an independent cell-walking oracle.

`tools/capture-minimal-gifs.mjs` records held-preview cancellation, collision/return and the unframed victory, then real navigation/award discovery and direct video Hint entry. The browser has no native ad provider; its actual unavailability response is shown rather than a staged ad or fake reward. Gameplay recording also includes actual AudioContext output, without added/replaced sound. Browser emulation does not establish physical-phone feel, vibration or performance. Exact source, CI/artifact/payload hashes and recording provenance are added to the build evidence after verification.
