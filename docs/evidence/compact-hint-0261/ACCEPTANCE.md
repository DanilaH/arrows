# Compact Hint —0.26.1/code39,2026-11-15

Implemented over current main907b4b2 without reverting newer work. Application source8e2c8d322dda6df471218aef73bab6ebe7b03665. Owner's new feedback deliberately removes the earlier permanently visible ready caption; actual readiness, cue eligibility and all rights remain unchanged.

| Change / state | Actual result |
| --- | --- |
| Ordinary ready RU Hint |207×44 painted pill →149×36.44px actual touch/keyboard height retained. One “Подсказка · видео” line and video mark; no ready caption, ×1 or duplicate bulb. |
| Loading / backoff / unavailable / neutral idle | Existing floating app-status shows the useful state, with notice/tutorial priority. Button rect stays constant; readiness is not inferred from text. |
| Reserved help | Free claim/detail remains disclosed, bulb retained, video mark hidden; backoff claim still creates no second ad. |
| First-error A1 cue | Own inward layer fits36px painted bounds; eligibility/default Off/1200ms/400ms reduced and cancellation unchanged. |
| Actual presses | Centre/2px edge hold/release/cancel/Enter preserve target geometry and single request semantics. An initial child-order CSS rule exposed the bulb when press prepended its face; semantic hint-bulb class fixes this. First19/24 failures retained in checks.json; corrected24/24 PASS, not weaker assertions. |
| Themes / motion / narrow / idle |4 frozen-payload dark/light × normal/reduced cases at320×700/DPR1.5 PASS; stable rect, visible text/video/cue, no overflow and idle after finish. |
| Automated checks |174 unit/type/build PASS;24 phone +9 desktop affected browser cases PASS.19 JVM PASS, Android sync and normal+.playtest builds PASS. Full hosted CI43634090122 is still IN PROGRESS in this report snapshot; not represented as green. |

No game content/generator/save/earned/help strength/lives/error/flawless/lifetime gift/ad cadence/SDK/runtime/guidance pin or analytics-schema change. This is the same .playtest update identity; no kit/store publication.

## Deliverables

- [APK0.26.1/code39](https://chatgpt.com/library?file_id=libfile_fde3_f-5ed6e06750608191a9208abc4caf6396_2841ca9da26c8191b7a266fa9b41a810&account_id=personal)
- [Before/current, cropped actual footer recording](https://chatgpt.com/library?file_id=libfile_fde3_f-788cb1e05b08819197cef50e8edc5dd4_2841ca9da26c8191b7a266fa9b41a810&account_id=personal)
- [Current cue and edge activation](https://chatgpt.com/library?file_id=libfile_fde3_f-72cd2e3ce90881919613ed7dd3830f8e_2841ca9da26c8191b7a266fa9b41a810&account_id=personal)
- [Actual current game audio, MP4](https://chatgpt.com/library?file_id=libfile_fde3_f-6c7fc5a553c881918932cab9490fd92a_2841ca9da26c8191b7a266fa9b41a810&account_id=personal)
- [Version/SHA256/provenance](https://chatgpt.com/library?file_id=libfile_fde3_f-0199aa51b4208191a89cde301b696257_2841ca9da26c8191b7a266fa9b41a810&account_id=personal)

Real Chromium390×844/DPR1.5 captures, seeded c40 after21 legal removals, controlled native transport. Before uses the archived0.26.0 payload/source19b2fec, after the current8e2c8d3 payload.19/19/109 real captured frames, original timing; comparison takes are independent. GIFs silent, MP4 records the actual WebAudio sink without added soundtrack. Captions are outside the game image; detail GIF crops the footer, no effect is painted over footage. All16 current recorded payload files exactly match APK bytes. [Manifest](capture-manifest.json), [checks](checks.json), [layout/idle](layout-idle.json), [native tests](native-tests.json), [binary inspection](apk-inspection.json).

APK SHA256 dd44e1f19ea9497f3ab47eb3dd9f49fce7a028368fea92a528da75596aad9503. Package com.danilah.arrows.playtest, version0.26.1/code39. Official ApkVerifier V2 verifies the previous certificate533aa2ff18337e3b3630c1363e7fe49f98e6b21371ce715689d2cbbf2e45ea36. DEX confirms AD_MODE=test, demo ad IDs, ANALYTICS_API_KEY empty.

NOT RUN: physical phone install/update/haptics/speaker/audio focus/frame pacing/thermal, actual native SDK inventory, AppMetrica dashboard and money. Existing sound was not changed. No human/retention/revenue claim follows from these checks.

KIT IMPACT: REUSE. Applied pinned guidancee04a3fe UI composition/stable hit geometry: retain the action/source, remove redundant ready text, reuse floating status and independently owned press/cue layers. Runtimea932526 unchanged; no new shared UI runtime or upstream patch.

Reproduce: npm run check; affected tests in a1ErrorCue.spec/commercialAudit.spec/phoneFeelV2.spec/uiPolish025.spec; build tools/qa/assistance-state.ts as SSR seed seam, freeze current dist in .test-output/compact-hint-0261/web, then run capture-compact-hint.mjs and verify-compact-hint.mjs. Before recording additionally requires the archived0.26.0 web payload. CI uses the unchanged signing cache/test-ad/analytics-off build path.
