# Autonomous daily tasks and scale learning — 0.16.0 (21)

Owner approved the combined package on 2026-11-11 after the independent gameplay audit: genuine zoom learning beyond c06, autonomous dated tasks, calendar/year continuation and generated trophy continuation. This supersedes the audit's proposal-only status for this bounded package. Campaign/content experimentation still needs human evidence.

## Player behavior

- All 365 published 2026 tasks remain byte-for-byte equivalent. The 120 campaign fields, rules, lives, three-active-second Hint, ad cadence, SDK/reward authority and pinned kit are unchanged.
- From 2027-01-01 a task is generated locally on its first entry. Date determines a shared seed, silhouette, dimensions and difficulty. There is no server, download, personalized difficulty or runtime random reroll. Restart uses the same embedded geometry with a new attempt ID.
- Calendar follows the actual local year/day, preserves a deliberately selected archive date and returns to the daily just played across midnight. Current-year twelve-month view is retained; dates after today are disabled. Future-year artwork cannot be browsed. Earlier years are selectable once those years arrive.
- The existing valid-date contract supports through 2200, so no yearly content update is required in that range. This is practical ongoing generation, not a mathematical guarantee of infinite unique/enjoyable puzzles. Before 2026 the screen explains the start date; after the supported range it explicitly identifies the archive.
- Frozen trophy v2 compositions for 2026–2045 stay authoritative. Later months use that same immutable composition algorithm and rendering libraries, on demand. Award bindings and legacy-v1 art remain exact; viewing a design grants nothing.
- Genuine manual pinch/wheel scale change can complete zoom learning on any played board. A clamped/no-op wheel, restored view and Hint auto-focus do not teach it. Existing c06 lesson and other steps remain intact.
- The optional dense-field zoom reminder exists **only as an isolated QA experiment** (`reviewOptions.scaleContext`, no player route/default switch). It uses the existing status lane, has no tutorial/timer authority, and needs observation of independent unlearned-zoom users before a production rollout. Its threshold is a prototype setting, not a research constant.

**Build verification:** source `0e2c876` passes [CI 43076701532](https://github.com/DanilaH/arrows/actions/runs/43076701532): 93 unit / 164 browser / 7 JVM and Android assembly. Exact APK/capture evidence is in [AUTONOMOUS_DAILY_BUILD_2026-11-11.json](verification/AUTONOMOUS_DAILY_BUILD_2026-11-11.json). The debug certificate differs from 0.15.0 because the existing CI signing cache did not persist its key; this APK cannot update a differently signed installation. Do not delete existing player data to try it. Signing/cache repair was not part of the gameplay implementation.

## Algorithm and compatibility

`src/domain/silhouette.ts` extracts the original reverse-construction algorithm and eight masks without changing them. Offline 2026 tools re-export that implementation; the audit regenerates and compares every archive field. Control scenes remain tool-only and are excluded from production.

`src/content/dailyGenerated.ts` is dated algorithm v1 / level `contentVersion: 2`, starting 2027-01-01. It preserves the existing daily difficulty/size policy (8th/28th Nightmare, other multiples of seven Hard). Construction is bounded to three deterministic candidates, each with at most `mask.length * 100` trials; successful fields undergo geometry/solvability validation. If no valid candidate with at least six arrows is produced, a deterministic mask-row layout is independently validated. It is a safety path, not a second player-selectable mode. There is no fill/depth optimization or automatic difficulty director.

The construction, masks, date mapping, seed retries and trophy v2 libraries are published immutable dependencies. A future content change requires a new generator version with an explicit start date; it must not reinterpret earlier dates. Representative generated fingerprints and a full-archive fingerprint are pinned in `tests/fixtures/daily-generated-v1-hashes.json`.

Daily catalogue 1/2 upgrades to 3 inside schema 2, with the same save key. Decode validates the date/identity and **embedded** attempt rather than generating the current field. It retains unstarted/partial/completed geometry, camera, errors, help, receipt IDs and reserved late rights. Future catalogue versions still fail closed rather than being guessed. First open uses the existing coordinated writer; there is no second persistence or reward pipeline. Generated preview metadata does not construct levels. The in-memory level cache is bounded to 16.

## Verification and evidence limits

- Local strict check, unit/build and focused browser results are recorded with the release evidence. The ordinary full browser suite includes new autonomous-date cases on phone/desktop.
- `tools/audit/generated-daily.ts`: 1,253 dates — every day of 2027/2028, three annual difficulty strata for 2029–2200, plus leap/century/end-range probes. An independent cell-walking graph verifies every generated field and every safety layout, without runtime `canExit`/ray helpers. No cycles, exact geometry duplicates or fallback selections occurred in this sample. All 365 original tasks reproduce unchanged.
- Node/V8 generation including runtime validation: sample median ~10 ms, p95 ~36 ms, maximum ~108 ms in this run. These are host timings under concurrent verification, not Android phone latency or a portable performance promise. See `verification/GENERATED_DAILY_AUDIT_2026-11-11.json`.
- The initial unshipped density gate caused excessive fallback/repetition; it was removed before publication. Published selection uses correctness and a minimal nonempty-workload guard, preserving the original construction policy. No campaign field was changed to optimize a new metric.
- Regressions cover leap-month award after the old trophy reserve, exact-once win/cup, clock reversal, catalogue upgrade, restart/no-reroll, late rewarded rights, restored camera/Hint, real late pinch, no-op wheel and three-second Hint/ad time under the QA reminder.
- `tools/capture-autonomous-daily-gifs.mjs` records the actual production browser build. Fresh storage earns nineteen campaign wins through real touch via an independent oracle. It records c20 manual pinch, then explicitly controls the clock to 2027-01-05 for a generated task and 2046-06-08 for trophy preview. Four new daily removals are real; no daily win/cup/receipt is injected. Future-clock QA is not an actual future-date or earned-award claim. Generated videos/GIFs stay outside Git.
- No human enjoyment/retention, physical-phone pinch/sound/haptics/performance, live SDK delivery or store publication is established by this package. The 12-field human content pilot remains separate, with advertising/rewards fixed.

Reproduce:

```sh
npm run check
npm run test:browser
npx vite build --ssr tools/audit/generated-daily.ts --outDir .test-output/generated-daily-source
node .test-output/generated-daily-source/generated-daily.js
node tools/capture-autonomous-daily-gifs.mjs .test-output/autonomous-daily-release
npm run android:sync
```
