# Stage A: first playable controls — 2026-11-09

Status: implemented and locally verified; physical Android feel/performance acceptance remains open. Version 0.1.0 / Android versionCode 2. This is the first playable control build, not the complete campaign product.

## Four fixed own scenes

| Fixture | Arrows | Segments | Mask dots |
| --- | ---: | ---: | ---: |
| Straight | 6 | 6 | 29 |
| Bent | 6 | 10 | 38 |
| Hard flower | 68 | 87 | 397 |
| Nightmare butterfly | 188 | 260 | 1,859 |

The first two are authored geometry. The silhouettes use fixed offline seeds and reverse construction. `src/content/controlScenes.json` is the runtime catalog; `npm run content:controls` regenerates it from `tools/content/control-scene-source.ts`. Regeneration was byte-identical. No generator/solver executes on game startup. These are new control fixtures, not recovered source levels or an approved production difficulty curve.

## Implemented behavior

- Pure domain rules and orthogonal geometry, outside Phaser. Exit blockers use the same rules for input/validation. Accepted removals immediately leave logical occupancy, so a newly freed arrow can be tapped while the earlier arrow is still flying. Repeated taps cannot remove one arrow twice.
- A first blocked tap marks that arrow and removes one life. Repeated blocked taps on the same arrow have feedback without another life charge. The red arrow can later leave normally. Zero lives stops moves and offers restart/field selection; free/rewarded continuation belongs to B.
- Extraction uses the arc-length window `[d, d + L]`, preserving visible length while the tail passes the original bends. Rendered flights continue outside the silhouette and settle after leaving the current viewport.
- Tap, 300 ms hold preview, permanent leave-and-return cancellation, 8 CSS px pan threshold, two-pointer pinch, final-up displacement validation, cancellation on capture loss/blur/blocker/resize. The remaining finger after pinch cannot become a tap. Board input excludes HUD/footer bounds.
- Camera transforms are explicitly CSS-to-world; physical DPR is owned by the existing capped backing store. Zoom keeps its interior focal point; resize preserves relative zoom and clamps the camera. The Phaser camera viewport clips world geometry away from HUD in both renderers without an offscreen mask/filter.
- Stable paths and resting dots stay in retained geometry. Animated paths/dots use separate layers. Local dot impulses use the pinned kit's `stepDampedMotion`, with a 512-active-dot cap and no per-dot timers. Final paint precedes renderer sleep. Reduced motion removes entry growth, dot pulses and error wash.
- RU/EN controls, progress/lives, direction guides, selection/restart dialogs, delayed win/next UI and native haptic cues. Real SDK infrastructure remains installed, but rewarded placements are not offered before a durable game writer exists.

The DOM surface owns pointer capture, one hold timer, a resize observer and subscriptions. Scene changes clear current effects and retain a single Phaser scene/canvas; disposal removes application listeners before renderer teardown. Back currently closes a dialog or opens field selection; the final Home/campaign navigation comes later.

## Reference evidence

Downloaded V06 from the recorded Drive file `1-Kvn7EGTSmeIvluKaJdsbNOR4byLclvy`: 74,608,971 bytes, 576 × 1280, duration 359.533129 s, SHA-256 `c32f1f98a37753eba07901e337948e5fb2673c747020bfa6a328602bec954dff`.

Inspected a six-frame contact strip at 5 fps beginning 34.9 s and a full-resolution Hard frame at 86 s. The strip confirms progressive extraction, a straight-moving head, blue flight and local dot response. The Hard frame confirms the minimal HUD, rounded thin orthogonal paths and zoom affordance. This is a targeted visual comparison, not a full playback/audio review of all five recordings. No reference imagery or MP4 is bundled into the game or repository.

Flight speed, dot spring profile, head/line dimensions, new field masks and entry timing remain Arrows tuning. The hold release/leave-and-return policy remains the explicit project choice in the replication spec; video did not isolate it. Audio parity and the unexplained gradient arrow remain open.

## Verification and limits

- `npm run check`: 28 unit tests, strict typecheck and production build pass. A separate integer-cell ray oracle agrees with the domain blocker model and completes all four fields without losing lives.
- Full browser run: 16 scenarios across Pixel 7 emulation and desktop, including every arrow on every fixture (536 accepted removals across both profiles), hold cancellation, first UI tap after a captured gesture, real CDP two-finger pinch, resize/reload and independent startup checks. After the clipping fix the full run passed again.
- Added idle/repeated-entry checks; targeted gesture/resize/idle reruns pass on the latest source. The complete 18-scenario suite passed in CI on source `aa40b47`; final evidence is recorded in HANDOFF.
- `npm run android:sync` passes. Native `assembleDebug` passed in CI run `42594630773` for this exact web payload; previous bootstrap compilation is not reused as its evidence. The downloaded APK payload matches local `dist` byte-for-byte; its identity/checks are in `verification/STAGE_A_BUILD_2026-11-09.json`.
- Reviewed full-resolution portrait fixtures and zoomed short-landscape captures. Found and fixed world geometry overlapping HUD after rotation; current captures show clipping at the measured gameplay bounds.

Browser emulation is not a physical-device FPS/heat/feel measurement. No sustained hardware 60 FPS, native SDK inventory, AppMetrica dashboard delivery or subjective sound/haptic parity is claimed. Stage A remains pending phone acceptance before scaling content.

## Next milestones

Finish phone interaction/performance comparison and tune the four controls. B then adds coordinated durable game saves, real attempt restoration, tutorial/campaign progression, Hint/lives recovery and gameplay event boundaries. C–E retain their full agreed scope. A control-field switch intentionally starts a fresh in-memory attempt; it is not campaign/daily persistence.
