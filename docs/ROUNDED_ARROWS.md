# Rounded arrow artwork — 0.17.2

User request: a filled triangular head with rounded corners, softer route bends and another increase in line weight/density. Presentation only: keep every canonical level/embedded attempt, orthogonal route, arc-length/move/contact timing, hit rule, save schema, reward/ad policy, audio/haptics, font and kit pin unchanged.

## Shared shape

`src/game/arrowArt.ts` provides the same sampled quadratic fillets and convex rounded triangular markers to Home SVG and BoardScene. Home previously used open chevrons, unlike the board: both now use the same filled marker contour. The marker covers the logical head and remains bounded in all four directions.

Body bends trim at most .24 cells (and at most half either adjacent segment). Canonical bend coordinates stay inside the minimum rendered shaft; logical picking/collision/measurement never receives rounded points. Short visible windows remain finite. The shaft is shortened under the triangle without reversing tiny entry segments, preventing a thick stem/cap from sticking out through its nose. The final marker contour stays at the original logical head.

Phaser's mitered polyline renderer produced visible spikes/holes on very short thick curve segments during visual QA. BoardScene instead fills the stroke tube with segment quads and small round joins; this matches the SVG's rounded contour. No masks/render textures/extra scenes or looping animation. Route fillets are weakly cached; no canonical data is mutated. Static, flight, contact/return and assistance rendering share this drawing path.

The first candidate passed178 browser cases but missed the original4.5s Hint deadline in two isolated large-field QA cases under CI load. A dedicated c20/320px diagnostic at CPU4x found roughly2x script cost versus0.17.1. Remove per-sample ellipse construction/earcut: body fillets use four samples, shared outer join wedges, and only two cached12-point cap fans. Triangular fillets retain six samples. Final diagnostic script cost is about40% below the first candidate, with the actual Hint visible within3.7s including route handoff at CPU4x. Original clocks/ad policy and QA deadlines are unchanged; this is a software diagnostic, not phone performance evidence. Build26 replaces the provisional build25 with the same visible version0.17.2 and a higher Android update code.

## Further density

Compact spacing20→19px. Base shaft becomes min(.64,max(.24,4.6/scale)) cells; final assistance widths cap at .68 cells, so dense highlighting retains a gap. Heads are .48–.74 cells with visibly rounded corners. Home stays large and increases adaptive ink weight; it still fits all original occupied bounds rather than shrinking remaining geometry.

At the default compact view, shaft3.6→4.6px and the adjacent gap16.4→14.4px. At a 7.29px/cell dense reference fit, shaft3.6→4.6px and gap3.69→2.69px. Short views fitting near5.42px/cell use the dense cap: gap2.28→1.95px. These are drawing metrics, not evidence of human enjoyment/difficulty. No published levels/generators are rebuilt.

## Verification and delivery

Local strict check:96 TS cases, including independent geometry coverage for unchanged canonical points, corner hit coverage, very short moving/inset windows, finite bounded output and convex heads covering the logical head in every direction. Sixty-two final focused browser cases pass for accepted/ambiguous input, collision/return, assistance/foreground/receipt order, finite/reduced-motion finish and menu/daily/end-campaign UX. Native sync passes. [CI 43202853203](https://github.com/DanilaH/arrows/actions/runs/43202853203), source `a949fe857ffa609821b3fce1471f1f7428dc947b`, passes 96 TS, all 180 browser and nine JVM checks plus Android assembly on workflow attempt 2. The corrected renderer first passed 179/180, with one phone isolated optional-context Hint deadline; ten additional local repeats and the unchanged full web rerun pass. No clock or test deadline was relaxed. All eleven APK web files match the final capture. Exact hashes/certificate and the diagnostic limits are in the handoff and verification record.

Initial internal QA renders c03/c06/c20/c60/c120 at 390×844 and 320×568/root 125%; after the performance correction, c03/c20 are re-rendered at both sizes. Seeded late views remain internal. Delivery uses `node tools/capture-rounded-arrows-gifs.mjs`: unmodified production browser, fresh storage, three genuinely touch-earned wins, c03 Home, real two-finger zoom to show the shape, one actual blocked contact/return and c03 finish. Companion MP4 records the unchanged actual AudioContext output; no replacement sound/progress/reward/SDK transport.

APK remains **com.danilah.arrows.playtest / Стрелки · Тест**, version0.17.2/code26. The actual V2 certificate matches 0.17.0/0.17.1 and provisional build 25; code 26 updates the same test package. Never uninstall player progress. Production signing and physical install/update/feel/performance remain separate acceptance.
