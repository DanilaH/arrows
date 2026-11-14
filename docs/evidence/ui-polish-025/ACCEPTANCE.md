# UI/feel 0.25.0 / code37 — acceptance

Application source **f8a75b3106f8194d1ad27a2a58ede7c3b30d48d3**. Starting main6b2598e preserved. Changes delivered separately: common UI49321c28, A3b2df17f7, A263e1acb4, package/capture sourcef8a75b3. Validation-only source **de2d67d1b05ca63052e5c2125aa2d3639c951fa2** changes a float comparison in one browser test; `src`, native app, package and lock are byte-identical to the APK source.

## Per-point results

| Point | Actual result | Evidence |
| --- | --- | --- |
| U1 press hit area | PASS: mouse and real CDP touch at2px inside the original left edge both enter the game. Held and resting boxes both `x75/y580.8125/w240/h52`; before, the button shrank to225.6px and release stayed on Home. Centre/left/right holds50/100/400ms and cancellation covered. | `after-matrix.json`, `before-probes.json`, `uiPolish025.spec.ts` |
| U2 B1 | PASS: centre hold keeps `x101.5/y696/w187/h44`; helpUsed=true. Before, the button moved to x200.61 and did not grant help. Main profile remains separate. | Same actual-production probes; B1 GIF |
| U3 interrupted windows | PASS: early close preserves displayed opacity/transform. Example35ms sample remains opacity0.605755/Y4.73094 before and immediately after close, rather than jumping to1/Y0.16/35/65/100ms, focus return, reduced motion and background checked. | `after-detail-results.json`, browser UI checks |
| U4 A3 | PASS: earned c40 route22→23→28 is shown as a complete overview with its goal. All promised participant paths fit; subsequent manual steps do not reclaim camera. | Real route GIF/audio; camera matrix c20/c40/c120; immutable-plan/quiet-restore tests |
| U4 A2 | PASS: c40 promised root+3 ordinary arrows remain exact and use leaves15 arrows. Under zoom3 the formerly clipped bonus head now sits at x66.517, inside the clear area. Native marked closure is not capped. | `after-detail-results.json`, old native-accounting suite, cascade GIF |
| U5 locked destinations | PASS: Calendar/Collection names and recognisable icons remain visible with small lock10/20 badges. Availability still changes at current levels10/20; existing in-game notices preserved. | Main-controls GIF, boundary tests indices0/8/9/18/19 |
| U6 primary contrast | PASS for the audited normal primary pair: white on#6264ef gives4.58:1 versus4.13 before. Existing fill retained; primary press uses a ring, not a fill-brightening overlay. Light mode remains unchanged. | Actual computed colours in after-detail results; not a whole-app WCAG certificate |

No domain/content/save/reward/SDK/ad-cadence runtime policy changed. Legacy Hint is not a cascade; rights/old attempts/errors/flawless/lifetime gift remain authoritative. A1/A2/A3/A4 remain exclusive; B1 stays a lab. New camera code only changes presentation, retains original-board bounds/world-centre view meaning and yields to direct pan/pinch.

## Verification

- Local `npm run check`: **171/171 unit**, typecheck/build/brand/payload exclusion PASS; native sync PASS.
- Final focused phone run: **27/27 PASS**.
- Corrected desktop A3/A2 overview tests, repeat3: **6/6 PASS**.
- Actual-production UI: **76 states /0 page or flow errors /0 horizontal body overflow**;12 initial critical-action states with successful coordinate actions. Raw rectangular kit corner-probe limitations on rounded pills are retained, with independent shape-aware point checks.
- Additional exact-payload camera matrix: **16/16 PASS**. c20/c40/c120, A3/A2,320×568 light, normal/reduced motion; actual pan and pinch during incoming focus on390×844 preserve the user's camera afterward.
- Native CI: **19/19 JVM**, normal debug and isolated playtest assembly PASS.
- First full CI [43611526133](https://github.com/DanilaH/arrows/actions/runs/43611526133): **285/286 browser PASS**. Its one failure compared serialized floating-point coordinates after reload: y84.02564102564102 versus84.025641025641. Recorded in `first-ci.json`; not represented as a green run. Validation commit replaces only that assertion with a1e-9 coordinate comparison; six local repeats pass.
- Final full CI: [43612775540](https://github.com/DanilaH/arrows/actions/runs/43612775540) **GREEN:171 unit/type/build,286/286 browser, native sync,19 JVM and both APK builds**. The validation-run APK is byte-identical to the delivered APK (`final-apk-comparison.json`).

`checks.json`, `camera-matrix.json`, `native-results.json` and capture manifest contain the environment and facts. Counts/frame captures are not evidence of human enjoyment, phone FPS or revenue.

## Installable APK and update identity

[arrows-0.25.0-code37-playtest.apk](https://chatgpt.com/library?file_id=libfile_fde3_f-a4e661c807908191940d76f87cecbe41_2841ca9da26c8191b7a266fa9b41a810&account_id=personal)

- Package **com.danilah.arrows.playtest**, version **0.25.0 /37**, label Стрелки·Тест.
- SHA256 **4b6493f8d7763702e05701bfd9a2024e0ff19f19a5bc51b71cb0e12f9bed3d6c**;10,406,871bytes.
- Official Google **apksig8.13.0 ApkVerifier** verifies the APK/V2 signature. Certificate SHA256 **533aa2ff18337e3b3630c1363e7fe49f98e6b21371ce715689d2cbbf2e45ea36**, identical to the prior playtest line. Code37 is greater than36.
- Actual DEX BuildConfig checked: **AD_MODE=test**, demo rewarded/interstitial IDs, **ANALYTICS_API_KEY empty**. No live ads or analytics in this APK.
- All **16** captured web/font/art/license files match APK bytes; both Capacitor adapters have the expected empty hashes. See `apk-inspection.json` and `signature.json`.
- Engineering update identity is verified. Actual installation/update and retained data on a physical phone are **NOT RUN**.

## Genuine recordings

| Recording | Permanent link |
| --- | --- |
| Menu, locked tabs, edge hold, interrupted/settings transitions | [UI controls GIF](https://chatgpt.com/library?file_id=libfile_fde3_f-74478413626c8191bb1b3aec6ce9a83e_2841ca9da26c8191b7a266fa9b41a810&account_id=personal) |
| Centred B1 hold and actual help | [B1 GIF](https://chatgpt.com/library?file_id=libfile_fde3_f-27f58e6b3a6c819199780ea549bab04b_2841ca9da26c8191b7a266fa9b41a810&account_id=personal) |
| Complete A3 overview and three manual steps | [A3 GIF](https://chatgpt.com/library?file_id=libfile_fde3_f-36132e73d3b48191a1b3db037c81017f_2841ca9da26c8191b7a266fa9b41a810&account_id=personal) |
| Exact A2 overview and one-trigger use | [A2 GIF](https://chatgpt.com/library?file_id=libfile_fde3_f-f913f2f595e4819182ad91c86cf4e2f5_2841ca9da26c8191b7a266fa9b41a810&account_id=personal) |
| Actual current-game sound from the A3 episode | [Video with sound](https://chatgpt.com/library?file_id=libfile_fde3_f-35d7266e9060819194cd26a6694ecdbf_2841ca9da26c8191b7a266fa9b41a810&account_id=personal) |

Source: real Chromium390×844/DPR1.5 WebGL frames from the exact APK web payload, recorded at original timing; seeded QA progress, actual UI/pointer input and controlled native receipt transport. No fabricated product animation or actual SDK video. Sound is captured from the game's actual WebAudio output; GIFs are explicitly silent. Caption padding is outside the game frame. `capture-manifest.json` records frame counts/source; `deliverables.json` records persistent identities and hashes. Screencast frame counts are not a performance benchmark.

## Remaining external acceptance

**NOT RUN:** physical Android install/update/process lifecycle, vibration feel, speaker/headphone loudness/audio focus and frame pacing/thermal behavior; actual Yandex demo-SDK video/no-fill/resume on a device. AppMetrica cabinet/export and real-money verification remain a separate stage. They do not change the factual readiness of the supplied isolated test APK.

**KIT IMPACT: REUSE (guidance), no upstream changes.** Guidance updated to e04a3fe with a passing discovery doctor; runtime remains a9325265. The new OwnedDomMotion was reviewed and deliberately not imported from an unavailable installed pin. This work fixes the local Arrows UI seam and presentation policy, with no new shared framework, SDK upgrade, banner, store submission or kit publication.
