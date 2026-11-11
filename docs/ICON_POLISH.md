# Collection icon polish — 0.16.1 (22)

2026-11-12: user supplied a Collection screenshot and requested cleaner icons, especially the three achievement medals. This is a presentation-only correction.

- All three medals share a centered 72×84 composition: balanced ribbon, 24-unit round face and a quiet inset rim. Their rendered 64×74 footprint and surrounding grid remain unchanged.
- Crown, check and flame are redrawn as simple line emblems with explicit `fill: none`. Open check strokes no longer inherit a closed-path fill. Emblems use consistent optical placement and controlled stroke weight instead of the previous irregular flame and crown contours.
- Medal styling is scoped to `.medal-icon`; disclosure chevrons keep their own small line treatment. Existing earned/unearned theme tokens still determine appearance; no gradients, raster assets, new effects or permanent animation are added.
- The small Collection navigation cup has balanced handles/pedestal. Settings slider tracks end at the knob edges instead of running through their centers. Home, calendar, theme, hearts and gameplay controls were inspected; they do not receive an unrelated redesign.
- Achievement identities, progress, disclosure/keyboard behavior, frozen trophy artwork, gameplay, daily generation, saves, rewards, ads and kit pin are untouched.

Validation uses production browser renders in both themes at 390px/DPR2 and narrow 320px/125% with open details, plus existing Collection/settings/UI browser regressions and the required strict check/build. Visual snapshots are internal QA. Delivery GIFs use ordinary UI interactions and a restored genuine 19-win save from the preceding production capture; they do not invent earned medals, cups, receipts or progress. Browser rendering is not physical-phone verification.

The known debug-key cache/signature problem from 0.16.0 remains a separate release task. This icon change does not claim to repair installed APK update compatibility.
