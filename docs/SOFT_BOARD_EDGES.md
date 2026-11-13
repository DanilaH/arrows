# Expanded board and soft viewport edges

Version0.19.1 / Android code31. Owner-approved presentation package, 2026-11-13.

## Evidence and selection

OBSERVED: the owner's two screenshots show the zoomed Nightmare field cutting off abruptly below progress and above the bottom actions. Baseline `32bede8459ec49def172727ae4d62ca0a1097ce3` uses a Phaser camera scissor and permanently reserves4.8em for `#app-status`, including empty text. Some whitespace also comes from camera position and original catalogue padding; it is not all a footer reserve.

SELECT: measured viewport/accessible controls and bounded rendering from the existing task router and pinned kit performance recipe. HOLD: true blur and physical-phone smoothness. REJECT: renderer masks/render textures, a new kit abstraction, content regeneration or extra panels. The owner approved the fade, expanded lower field, floating messages and camera-boundary review. Original-game timing/audio are not inferred from static screenshots.

## Presentation and input

- Render canvas across the full viewport in WebGL and Canvas. Keep a separate clear camera-fit/interaction rectangle: measured header bottom+28 CSS px through footer top−8. Use layout offsets, not animated HUD rects.
- One pointer-transparent static cover fades into the existing theme background:28px top,48px bottom,12px sides. Opaque parts sit below live HUD/actions. No blur, mask/filter, shader, offscreen texture, per-arrow fade, RAF or extra animation clock.
- Pointer-down/activation stay inside the clear rectangle with12px side exclusions. Captured gestures retain hold/cancel semantics. Covered arrows cannot receive taps behind controls and remain reachable by panning from the clear area.
- Status text floats above the stable action row. Empty messages reserve nothing; appearing/disappearing tutorial/zoom messages cannot shift camera/buttons. Existing message authority/timing stays unchanged.
- Home↔game uses the same fade on its finite read-only bridge: SVG inside an owned wrapper with copied edge coordinates. Preserve actual POST_RENDER handoff, reduced motion and Back/background/resize/disposal cleanup.

## Camera and compatibility

Pan limits use the **complete original** mask/path bounds. c120's catalogue height51 includes a figure ending at row40; scrolling no longer treats the ten empty rows below it as artwork. Bounds never shrink during removal. Keep original width/height-based minimum scale,19px compact spacing, ink and zoom limits.

Saved world-center/zoom meanings and schema2 remain intact. A restored view may clamp to corrected original bounds and the current measured screen, as normal resize does; no migration/reset. Content/paths, legal moves, lives/errors, lifetime gift, Hint3s, ad clocks/receipts/SDK, audio/haptics and kit pin stay unchanged. Exit/guideline visuals reach the full rendered area; rewards never depend on fading.

## Verification and media

`tests/unit/gestures.test.ts` adds the c120-padding regression: occupied center and pan reachability at both ends. `tests/browser/softEdges.spec.ts` compares actual faded arrow pixels with the temporarily uncovered reference, in both themes and WebGL/forced Canvas. It proves covered clicks preserve the board, clear clicks activate, messages/Hint do not move actions, and portrait/short-landscape resize/reduced motion remain valid. Seeded state and uncovered reference pixels are internal QA only.

The initial mobile QA helper failed to position the sample because emulated wheel deltas were smaller and fine drags remained inside gesture slop. Corrected through repeated real wheel events and explicit pan onset; application gesture rules were preserved. The corrected final ten-case phone/desktop run passes. The desktop helper also stops once it reaches sufficient zoom rather than demanding further zoom past the application limit. Local check passes103 TS tests; all216 pre-existing browser cases passed in the broad run. Four new desktop cases in that run exposed the helper limit; the final focused ten-case run closes those checks. Full CI/build results are recorded in the handoff/verification JSON after completion.

`node tools/capture-soft-edges-gifs.mjs` records unmodified production Chromium RU390×844/DPR1 from fresh storage: nineteen genuine wins selected by an independent cell-walking oracle, then real Nightmare c20 pinch/pan and Home/resume. No injected progress/camera/rewards/SDK transport. GIFs are silent; audio is unchanged. Final source/payload/media evidence goes in `verification/SOFT_BOARD_EDGES_BUILD_2026-11-13.json`. Browser/CI evidence does not establish physical-device smoothness, installation or live ads.

KIT IMPACT: NONE. Existing pinned viewport/activity/render lifecycle is retained; local HUD/fade/camera/bridge presentation is not a kit extraction or upgrade.
