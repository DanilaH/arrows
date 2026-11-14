# UI / feel fixes — 0.25.0 / code37

Implements the owner's approval of [the independent audit](UI_UX_FEEL_AUDIT_2026-11-14.md). Base main6b2598e / application84a1a5d. All subsequent existing work was preserved.

## Result and ownership

- **U1/U2:** press is a finite, pointer-transparent decorative face. The actual button keeps its hit geometry, original positioning transform, release/cancel/keyboard semantics and current font layout. Primary controls use an inset highlight so their text/background contrast is retained. B1 no longer loses its authored `translateX(-50%)`. Multiple held pointers cannot clear another held face. Navigation/background/teardown finish owned feedback.
- **U3:** one current entry/exit owns each dialog. Replacements sample displayed opacity/transform before cancelling the previous effect. Cancelled close callbacks cannot close the newer window or restore stale focus. Existing modal blockers remain until the actual close, including synchronous reduced-motion/hidden completion. The whole window retains its calm short entry/exit; no competing row transforms.
- **U5:** locked Calendar/Collection retain feature names and icons. A compact lock+10/20 badge communicates the threshold; accessible names retain the full explanation. Unlock indices and existing one-shot in-game notices are unchanged.
- **U6:** dark on-accent text is white, giving4.58:1 on the existing primary fill. Light theme already uses white. Press does not brighten the primary fill underneath that text.
- **U4/A3, separate change:** new earned routes frame all pending participant paths and their target with28px overview padding and a26px readable-scale cap. Subsequent steps do not reclaim camera ownership. Quiet restore preserves saved view and does not replay reveal.
- **U4/A2, separate change:** the reveal frames the immutable root+ordinary group and predicted native marks. No cap on native auto, group replacement, re-ranking or entitlement change. Explicit pan/pinch cancels camera motion and prevents a later return.

Overview uses the existing world-centre/relative-zoom view representation and original-board camera bounds. It owns presentation only. Input does not wait for path-light/flight completion. The single-hint path is retained; A1/A2/A3/A4 stay exclusive and B1 remains isolated.

## Sources and compatibility

Research guidance deliberately updated to kit **e04a3fe87ca93d506e01df4acc5afe690408cefa**, preserving all Arrows-specific AGENTS rules. Generated Task Router now directly routes UI composition/motion/stable-layout work. Guidance doctor passes. The newly extracted OwnedDomMotion contract was inspected; it is **absent from installed runtime a9325265…**. This patch maintains the existing local motion seam and does not copy the new module or upgrade the runtime.

Selected guidance: [UI Motion Recipes](https://github.com/DanilaH/mini-games-kit/blob/e04a3fe87ca93d506e01df4acc5afe690408cefa/docs/feel/UI_MOTION_RECIPES.md), [Stable Progress UI](https://github.com/DanilaH/mini-games-kit/blob/e04a3fe87ca93d506e01df4acc5afe690408cefa/docs/layout/STABLE_PROGRESS_UI.md). There is no new UI theme, general framework, banner, reward or experimental assignment.

Campaign/daily/trophy content, immutable embedded attempts, schema, errors/lives/flawless/lifetime gift, earned/reserved/legacy help, receipt identity, advertising cadence, SDK/engine/runtime pins and analytics behavior remain unchanged. `.playtest` uses the existing package/cache signing key, test ad IDs and a blank analytics key, with versionCode37. Do not regenerate a local signing key as a substitute for update compatibility.

## Verification

Baseline audit repro was rerun on the unchanged0.24.0 production bundle before edits. Tests now cover actual edge mouse/touch holds50/100/400ms, cancellation, the centred B1 hold, early modal close16/35/65/100ms, complete earned groups under zoom, early manual use during presentation, immutable plans, manual pan and quiet reload. Existing Hint-opacity check now waits for the bounded arrival's final state; press geometry checks wait for unrelated parent route entry before measuring. Route/native-accounting tests take coordinates after the overview, rather than assuming the camera is fixed immediately after a receipt.

Final verification:171 units/type/build,27 focused phone tests,6 repeated desktop overview tests,16 additional production camera cases,76 UI states and12 initial-action states pass. Full CI43612775540 on validation-only de2d67d1 is GREEN:286 browsers,19 JVM and both APK builds. The first full run had285/286 due to a serialized float-bit assertion, corrected without changing application code; that result remains documented. Exact APK/payload/certificate and permanent media links are in [ACCEPTANCE](evidence/ui-polish-025/ACCEPTANCE.md).

Required delivery evidence: genuine current-production recordings with build/source and seeded/controlled transport labels; exact APK/payload/signature/config inspection; explicit physical-phone haptic/audio/frame-pacing and real SDK NOT RUN status. External AppMetrica/real money is a separate task.

**KIT IMPACT: REUSE (guidance), no upstream write.** The reproduced failures belong to Arrows `createUiMotion`, not an imported kit primitive. OwnedDomMotion adoption would be a separate deliberate dependency upgrade and consumer replay, not a prerequisite for this bounded fix.
