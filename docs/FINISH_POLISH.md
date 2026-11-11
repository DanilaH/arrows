# A fuller minimalist finish — 0.13.0 (18), 2026-11-11

The user requested a slightly richer finish while preserving the minimal design, plus a review of useful improvements.

## Implemented presentation

The last accepted removal records its original head as a transient visual origin. After the final exit flight leaves, the existing dot silhouette receives a radial wave from that origin over 500ms, replacing the previous mask-order sweep. Two staggered inward fans emit 72 ribbons on ordinary fields and 100 on Hard/Nightmare/new-award clears. Three theme-aware colors, eight brief four-point glints and two thin rings give a fuller gesture with substantial empty space. No new card, backdrop, bitmap, shader/filter, particle GameObject or permanent emitter is introduced.

The result seal grows from 38px to 62px on tall screens; a faint outer orbit, drawn inner ring/check and short disappearing rays share a finite 740ms entry. Short landscape keeps the compact 32px seal and horizontal result. Existing win/award sounds retain their durations, notes and voice bounds, with slightly more space between the ascending notes to support the visual sequence. Native haptic profiles remain unchanged.

The completed board no longer retains its guides tutorial/label. The disabled restart glyph is hidden while its layout space stays reserved. Result-title/detail text updates only on a value change; the title is a polite status announcement, avoiding repeated mutations on every 250ms UI sync. Next remains available during the celebration. No additional mandatory wait is added.

## Ownership and bounds

All effects are presentation-only. Canonical moves, wins, receipt authority, saved camera/attempts, content catalogue, daily/trophy identities, ads cadence and pinned kit are unchanged. The sorted wave holds references to the frozen mask, not new domain state. The existing bounded 512-dot response pool remains authoritative. Graphics are reused, and the celebration clears within 2300ms; reduced motion skips the wave, fans, glints and result animations. Background/navigation/teardown settle immediately; restored completion is already beyond the finish timeline and never replays sound/rewards. A quick Next clears the old scene and begins the existing next-field handoff. A restored/silently settled completed board cannot start a celebration: fresh start additionally requires an unannounced win and the exact fresh-attempt sentinel. The previous generic negative timestamp test confused an already-expired restored timeline with a new finish during a young scene. A direct completed-c120 restore regression reproduces the visual replay before the fix and stays idle after it.

## Review: useful next work

These are proposals, not part of this implementation:

1. **Unlock arrival.** Collection at current level 10 and daily at 20 currently change the existing navigation's disabled state/number badge, without a dedicated arrival cue (`meta.ts` navigation and `surface.ts` unlock tracking). Animate the newly available existing icon once and briefly label the newly available destination. Keep the transition finite, persist only the real unlock/seen identity, and avoid an extra modal.
2. **Daily completion and monthly goal.** The date and monthly progress already update authoritatively; the player returns to the calendar via the result action. Make that existing completed cell/progress update visibly arrive once, linking the finished puzzle to the cup. Do not invent rewards, expose future trophy art or add a second result panel.
3. **Campaign-end destination.** The completed c120 restore regression also exposes an inert final primary action: `#next` is disabled at bank exhaustion. Offer the already-unlocked calendar as the primary destination after the final campaign clear, keeping the bank-end and ad policy explicit. This is a proposed route change, not part of the finish presentation patch.
4. **Human pacing/device feel.** Structural bank gates and automated solves do not establish interesting difficulty or physical audio/haptic quality. Playtest the opening→first Hard→first Nightmare sequence on the exact APK before changing the frozen bank or adding a difficulty director. This is a more useful next acceptance than more UI decoration.

## Verification and recordings

`victory.spec.ts` exercises completed-tutorial cleanup, actual ring/check animation submission, stable live-result text, finite rendering/animation settlement, interruption/no replay, 320px light/reduced-motion layout and quick Next during short-landscape celebration. The animation check records the browser-normalized submitted keyframes, rather than sampling a short-lived animation after several async assertions. Existing feel/minimal UI/motion/idle cases remain applicable.

`capture-victory-gifs.mjs` records the production build from fresh storage. Six error-free wins are earned by ordinary touch with an independent cell-walking oracle. The first clip shows the whole c01 clear in dark theme; the second shows the final five arrows and Hard c06 finish after a real light-theme Settings action. The MP4 records actual AudioContext output through a MediaRecorder tee, timestamp-aligned with the frame capture, with bounded padded export duration. No progress, reward or advertising transport is injected. GIFs are silent. These are browser-emulation recordings; exact-phone sound/vibration/performance and genuine native SDK service acceptance remain separate. Final evidence: `verification/FINISH_POLISH_BUILD_2026-11-11.json`, source `366c716263dcc37a33ef748cb1edb7dadfea01b6`, CI 42977404951. Both jobs pass with 85 TS, all 118 browser and seven JVM tests plus assembly. All eight web files and native configuration match the delivered APK; both GIFs/actual-output MP4 use the same payload. Local final ten-case victory and two menu-review runs also pass. The evidence-only follow-up leaves the application payload unchanged.
