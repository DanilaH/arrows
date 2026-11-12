# Casual typography and denser ink — 0.17.1

User feedback: the system face feels like an application, and arrows still feel too thin/far apart. This is a presentation pass, preserving all level geometry, input rules, embedded attempts, schema, rewards, ads and the pinned kit.

## Typeface

Use the rounded **Nunito** normal variable face for RU/EN throughout the existing minimal UI. Bolder wordmark, level labels, actions and finish; regular text remains readable. No outline/shadow treatment or new decorative panels.

`public/fonts/nunito-variable.ttf` is the unmodified 276,932-byte upstream file from google/fonts commit `c30b221beb0c1da59d563feb91ec8656a1fa972a`, SHA-256 `bb55a5ca5c2042335b3991af27c4d0705d0ef41cac6164ac737fd8f2a1e85207`. Ship the complete copyright/OFL beside it. Actual font cmap covers RU/EN letters/numerals; weight axis is 200–1000. Preload from the application itself; CSS swap/fallback never gates readiness or gameplay. Existing HUD/footer ResizeObserver handles metrics changes; no new startup/lifecycle mechanism. No font CDN is contacted.

## Actual gaps, not inflated scale

The previous patch increased the compact camera grid from 18 to 22px, which also enlarged physical spaces. Reduce it to 20px while independently increasing ink. Keep the large-field fit and all relative saved camera semantics. Home remains large, cropped to the original occupied bounds; only its adaptive line/chevron weight grows.

A shared BoardScene getter supplies both static and animated shafts: min(.58, max(.18, 3.6/scale)) cells. The .58-cell ceiling preserves a real gap on dense fit-to-screen fields. Head size is .38–.66 cells. Domain collision/selection geometry remains unchanged.

| Example | 0.17.0 | 0.17.1 |
| --- | --- | --- |
| Compact grid | 22px | 20px |
| c03 shaft at default view | 3.08px | 3.60px |
| Adjacent c03 shaft gap | 18.92px | 16.40px |
| c20 shaft at 390px width | 2.80px | 3.60px |
| Adjacent c20 shaft gap, 390px | 4.49px | 3.69px |
| c20 shaft at 320px width | 2.80px | 3.38px |
| Adjacent c20 shaft gap, 320px | 3.03px | 2.45px |

Dense reference rows use 7.29 and 5.83px/cell respectively; shorter views/enlarged text can fit smaller. These numbers describe rendering, not human difficulty/enjoyment. Published levels/generators are not redesigned for visual density. Relative zoom/centre still restore; the physical initial view is intentionally a little tighter.

## Verification and delivery

Local strict check: 93 tests. Thirty-eight focused browser cases cover accepted/ambiguous input, contact/return/finish, font loading without a CDN, font failure without blocked startup/moves, RU/EN narrow controls, themes/125% text and real calendar/medal/daily/end-campaign flows. Native sync passes. CI 43192138431 on source bb611ad8f1ea493178c72f17c4af91c675009a03 passes all93 TS, all180 browser and nine JVM checks plus both Android assemblies. All eleven APK web files match, including the exact font and OFL; the actual-output capture uses that payload. Exact artifact/certificate/media evidence: `verification/TYPOGRAPHY_DENSITY_BUILD_2026-11-12.json`.

Capture recipe: `node tools/capture-typography-gifs.mjs`. Real production browser, fresh storage and three touch-earned campaign wins; c03 Home/settings/one collision/finish. Fonts, audio and game source come from the actual build. Seeded late-field screenshots are internal QA only. GIFs are browser evidence; unchanged audio is included in the companion actual-output MP4.

APK stays `com.danilah.arrows.playtest` / **Стрелки · Тест**, version 0.17.1/code24. Its actual V2 certificate matches 0.17.0 and the workspace signing cache restored successfully; never ask the player to uninstall progress. Separate production package/config stays unchanged. Physical installation/update/feel remain device acceptance.
