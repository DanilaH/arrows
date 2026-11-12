# Empty-space feedback and difficulty colors — 0.17.3

Owner request: a small circle over a translucent circle, fading after each ordinary empty-space tap, with sound/haptics; different colors for difficulty. This is a presentation/input acknowledgement, not a move or a new hint policy.

## Evidence and choice

Baseline main: `d62b8fbc8c2496a9ede6076eaaa0dfe8e2cada27`, runtime kit pin `a9325265e87583a4872cf6a158e1e881a0d7508e`. Code confirms that BoardGestures discards completed empty taps and all Hard/Nightmare labels previously share the same blue. The owner's description is the reference requirement. Original recordings were NOT INSPECTED again in this pass; subjective source audio/haptics remain UNKNOWN, as recorded in the original source analysis. Do not claim an exact reference timing/sound match.

SELECT: bounded causal acknowledgement from the pinned guidance's `PUZZLE_PRODUCTION.md`; color plus text, independent feedback channels and reduced-motion/input constraints from `accessibility/README.md` (guidance `e2382670fbd5c2aa76462fea688c60de2b067392`). HOLD: numerical/subjective parity with the original and physical-phone feel. REJECT: new feedback framework, content/difficulty generation changes or broader decorative changes.

## Behavior and ownership

A completed single-primary-pointer tap in the playable area, shorter than 300ms and moving less than the existing 8px pan threshold, can acknowledge an empty point. Check final displacement, so a coalesced WebView move is still a pan. A hold, out-and-back pan, pinch/remaining finger, pointer cancellation/lost capture or blocker cannot become an empty tap. Reject points within 13 CSS px of any remaining path: an ambiguous arrow pick must retain its existing safe rejection. UI controls, menus, ads, uncertain save state, lost/completed boards and active route handoff do not produce gameplay tap effects.

`uiMotion` owns a 34px translucent circle with an 8px center: 280ms normal, 140ms fade-only with reduced motion. At most four acknowledgements coexist; the oldest is finished first. Existing animation completion/watchdog, gesture cancellation, navigation, resize, blockers and destruction remove the elements and their timers. Pointer-events are disabled and the marks are aria-hidden. There is no new Phaser geometry, game RAF, stored effect or input lock.

Reuse the actual existing short physical-style `button` sound and native `button` haptic on the **gameplay** channel. Existing separate sound/vibration preferences, six-voice/group/freshness bounds, native 60ms pulse throttle and lifecycle cancellation remain authoritative. No new native cue or SDK is introduced. Browser audio observation proves scheduling only; it cannot prove audible quality or physical vibration.

Empty taps do not activate a path, mark an error, start a level, teach zoom, change a saved board or reset/replace the existing three-active-second Hint/ad clocks. Existing timers can continue advancing naturally while time passes.

## Difficulty identity

Home preview, gameplay HUD and selected uncompleted daily use the same semantic `data-difficulty` values. Hard: amber (`#e7b96b` dark / `#8e570e` light). Nightmare: coral (`#f58ba2` dark / `#ac3153` light). Keep the Hard/Nightmare text; normal levels and completed-day wording retain their existing presentation. Apply color only to the existing labels, with no new panel, badge, arrow tint or gameplay change. Both-theme rendered labels must measure at least 4.5:1 against their actual backgrounds.

## Verification and delivery

Local strict check/build: 98 TS cases. Twelve focused browser cases pass, covering real empty touches/exact-once acknowledgement, unchanged board/start state, rapid-touch budget/cleanup, actual WebAudio output scheduling, mute/reduced motion, holds/pan/pinch/cancellation, native-background transport isolation, modal controls, existing compact picking and both-theme Home/HUD/calendar color/contrast consistency. Native sync and 44 additional feel/assistance/victory/daily browser cases pass. [CI 43249213456](https://github.com/DanilaH/arrows/actions/runs/43249213456) passes both jobs on source `9449c421acb263cefd16bef57077c87d414c753b`: 98 TS, all 190 browser and nine JVM checks, native sync and both Android assemblies, first workflow attempt. APK 0.17.3/code27 has the same actual V2 certificate as previous playtest builds; all eleven core web files and two empty native adapter files match the checked/captured payload. Exact hashes/native demo config/certificate and genuine media evidence are recorded in the handoff and verification JSON.

Capture recipe: `node tools/capture-empty-tap-gifs.mjs`. Production browser, fresh storage, independent cell-walking oracle selects legal arrows but all progression is earned by ordinary touch. Hard c06 and Nightmare c20 require five/nineteen genuine wins. No injected progression, review SDK or fake reward is used in delivery. Internal seeded test screenshots remain QA-only. Audio MP4 tees the actual AudioContext output. Phone sound/haptic/performance/install/update acceptance is separate.

KIT IMPACT: NONE. Runtime API/OneShotPlayer contract were checked at the actual pin. The existing Arrows feedback bridge already uses bounded kit audio; this adds a game-specific circle and label palette, not a new reusable runtime primitive. `installTouchActivation` targets DOM controls and does not replace this board's hold/pan/pinch state machine. No kit dependency or other consumer changes.
