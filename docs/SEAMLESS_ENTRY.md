# Seamless selected-field entry and stronger difficulty heading — 0.18.0

Owner request: remove the visible shake when entering from Home; let an already selected field flow from Home into play, and keep an unopened field invisible. Make difficulty prominent as in the original. This supersedes the 0.15 next-field preview policy: upcoming level/difficulty text is still honest, but its geometry is not shown before opening it.

## Reference and actual defects

Original stored gameplay was downloaded through Drive and decoded again on 2026-11-13. V06 SHA-256 `c32f1f98a37753eba07901e337948e5fb2673c747020bfa6a328602bec954dff`; V19 SHA-256 `b959d7f03577ea0ff89e4133a4ecc6cb43b2d04b2de62ab6263d294b02de90d5`. Updated timecodes/metadata are in `research/ARROWS_VIDEO_SOURCES_2026-11-09.json`.

OBSERVED: V06 55.5–59.2 shows Continue with no field in Home, then HUD/partial field appearing; V06 83–88 shows Level 6/Hard, then Hard as the principal label above hearts; V19 46–52 shows calendar→Nightmare and the prominent pink label above hearts. These are decoded frame sequences, not a measurement of every source frame, latency or physical feel. Exact source audio/haptics were NOT assessed here. Keeping an active field visible in Home and bridging it to the canvas is the owner's requested intentional addition. Our amber Hard/coral Nightmare palette remains original to Arrows; the reference informs label hierarchy/placement.

Baseline `7b6d5d8f4b03406bdd88b4030f2758fe2839f7f8` uses a separate SVG preview, loads/redraws arrow entry after switching, and measures the final HUD later. Snapshot ID renaming also removes ID-scoped button/text sizing. Local transition tests reproduced a 4px camera discrepancy from measuring the HUD's animated `getBoundingClientRect`. Fix the causes instead of adding shake-masking effects.

SELECT: existing Reference Protocol and `PUZZLE_PRODUCTION.md` guidance for coherent causal motion, bounded feedback and no animation-owned progress. HOLD: exact source-motion/audio/haptic parity and phone performance. REJECT: renderer/framework migration, new meta/rules/economy or generic director.

## Selection and authority

A loaded campaign attempt is selected for presentation if it was opened in this session, already started, or has an existing saved view. `started` remains first actual gameplay action; merely opening does not change it. The existing view save preserves an opened-but-unmoved field after returning/restarting. No new save field/schema/migration is introduced. Fresh/unrestored/upcoming fields reserve the same Home layout space but contain no displayed geometry. Final c120 keeps its existing result seal/entry. Selected partial fields use the same remaining paths/original occupied bounds and reflect saved error/hint color.

Prepare the canonical attempt, HUD text and final layout before revealing play. Menu entry uses a settled full field rather than replaying per-arrow construction; normal next-level drawing/celebration stays unchanged. Measure header/footer layout offsets, excluding transient CSS transforms. Preserve normalized saved camera, orthogonal paths/contact/picking and arc-length authority. Continuing an existing hint does not replay its camera focus; newly applied hints keep their existing focus/reveal behavior.

## Bounded visual continuity

`boardTransition.ts` builds one read-only SVG bridge from the actual visible preview/canonical remaining artwork. A 240ms transform/clip/stroke interpolation maps Home's real screen matrix to the prepared canvas camera (or reverses it on Home). A 60ms blend hands off at the exact destination. There are only a few parent animations, no per-arrow timers/WAAPI objects or JS RAF loop. The underlying canvas stays hidden until an actual Phaser POST_RENDER for the prepared scene; geometry/progression never wait on the bridge. Input continues to use the existing finite route lock.

An unopened level uses a quiet fade into its first selected field. Reduced motion uses a direct actual-frame handoff. Its owner/cleanup must be installed **before** unblocking: Phaser can produce POST_RENDER synchronously during wake. Local loss→Back→reduced-motion reentry caught and fixed this reentrancy case. Loss dialog presentation waits for the entry route to settle, so it cannot block the first prepared frame.

Back, new route, dialog/blocker, resize, background and disposal cancel the owned SVG, animations and paint listener. Shared route snapshots preserve computed ID-scoped dimensions before renaming IDs, and keep difficulty styling, preventing the cloned button from changing layout. No repeated success, reward or audio cues are created by a transition.

## Difficulty

Hard/Nightmare become bold 15px principal campaign labels above lives. The level's h1 context remains available semantically. Home uses a bold 15px label. Daily keeps a visible date (ordinary size on normal fields, compact contextual line on marked challenges) and a bold 13px difficulty line above lives; the narrow header remains <=64px. No panel, badge, arrow tint or difficulty-rule change. Colors and text remain redundant indicators.

## Verification/delivery

Strict check/build passes 98 TS cases. New real-browser coverage checks fresh selection, unchanged board/start state, selected c03/zoomed c20 matrix and camera continuity, repeated return/resume, Back/background/resize cancellation, reduced motion and prominent compact headings/dates. Existing native-Back/loss, calendar, assistance, finish and unlock checks are retained; the old upcoming-preview assertion now tests the explicitly changed unopened-field policy. Exact completed local/CI, APK identity/certificate/payload and current genuine media evidence follow in the handoff/verification record.

Capture `node tools/capture-seamless-entry-gifs.mjs`: unmodified production browser, fresh storage and nineteen genuine touch-earned wins chosen by an independent cell-walking oracle; unopened/selected c01, partial Hard c06, and Nightmare c20 resumed after actual pinch. No injected progression, camera, rewards or SDK transport. Actual-output audio MP4 complements silent GIFs. Original reference media and seeded QA captures are not shipped as our gameplay. Browser/CI success does not establish physical-phone performance/feel or installation.

KIT IMPACT: NONE. The actual runtime pin/API remains `a9325265e87583a4872cf6a158e1e881a0d7508e`; existing kit activity/viewport/audio ownership is retained. The SVG/canvas bridge and local snapshot fix are specific consumer presentation, not a new shared API. No kit or other consumer changes.
