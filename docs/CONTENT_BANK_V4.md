# Dense campaign bank — 0.9.0

The user explicitly requested rebuilding the later campaign after the 2026-11-10 audit found large holes and weak blocking. Fresh c05–c120 now use contentVersion 4. The compact c01–c04 remain byte-for-byte contentVersion 3. There are still 120 fields, 20 silhouette families, normal/Hard/Nightmare pacing and short breathers; the bank contains 4,171 arrows.

## Result and quality contract

| Field | Before | Dense revision |
| --- | --- | --- |
| c06 flower / Hard | 75% fill; 20/29 initially free; dependency depth 6 | 99.5%; 5/31 free; depth 10 |
| c20 butterfly / Nightmare | 53.6% fill; 48/87 initially free; depth 9 | 99.9%; 13/136 free; depth 30 |
| c120 heart / Nightmare | 45.9% fill; 35/54 initially free; depth 7 | 99.6%; 10/97 free; depth 28 |

Every rebuilt field fills at least 98% of its intentional mask. Largest accidental empty component is at most three grid cells. Deliberate holes in rings, keys, gears and infinity shapes remain part of their masks. Current average initial freedom is about 14% on Hard and 9.6% on Nightmare (per-field means), versus about 62%/60% in the audited bank.

Qualified candidates must meet these structural limits:

| Pace | Initial free, maximum | Mean free in early solve, maximum | Peak early free, maximum | Minimum dependency depth |
| --- | --- | --- | --- | --- |
| Breather | 65% | 65% | 100% | 2 |
| Normal | 50% | 50% | 85% | 4 |
| Hard | 30% | 30% | 50% | 10 |
| Nightmare | 20% | 20% | 45% | 18 |

Early freedom is sampled through the first half of three different legal removal orders; choosing a single initial bottleneck is not enough. Minimum mean bends and a cap on straight-arrow share also apply. Full exact values, seeds and number of candidates are in `verification/CAMPAIGN_SELECTION_V4.json`. These are structural selection criteria; exact perceived difficulty and completion time still require players/device playtesting.

## Construction and reproducibility

`dense-campaign-generator.ts` begins with a filled mask. A chosen head sees no still-unassigned cell ahead, then its path grows backwards into the remaining mask. Birth order is a legal completion witness: future paths cannot obstruct an earlier head. Earlier paths create actual blockers in the original complete field. A controlled root budget provides several initial choices rather than forcing every task into a single chain.

Orphan-aware growth, later tail extensions, two-cell detours and safe absorption of later tiny fragments into earlier tails fill pockets. Endpoints/head directions stay stable during repair, and independent validation rejects overlap, self-blocking or cycles. At least four qualified seeded candidates are considered per field, up to 24 attempts. Selection scores density, bends, depth and freedom throughout the solve.

`npm run content:campaign` builds the fixed 120-field bank and v4 report offline. `npm run content:opening` only writes the preserved first four fields and leaves c05 onward intact. Legacy generators/reports remain available for historical reproduction; no procedural generation runs at app startup. Domains, camera, renderer, ads and reward semantics remain unchanged.

## Compatibility and evidence

Catalogue 1/2/3/4→5 preserves every embedded attempt, including unstarted old fields, accepted moves, errors, camera, wins, receipts and reserved rights. Restart retains the embedded field; explicit next creates the current next field. Schema 2/key stay unchanged. All daily geometry, monthly trophy designs/bindings and the native service contract are unchanged. Historical c05/c06/c20/c21/c90/c120 fixtures and compact-opening fingerprints cover upgrades.

Tests independently remove every current field in three orders and compare each available-choice set with the game model; quality metrics are recomputed on all 116 rebuilt fields. Seed reproducibility, repairs and rejection of the old sparse Nightmare are checked. All 81 TS tests, all 80 browser cases, five JVM tests and Android assembly pass in CI. The exact APK, all eight web payload files and both authentic GIF runtimes match. Evidence is in HANDOFF and `verification/CONTENT_BANK_V4_BUILD_2026-11-10.json`.

`node tools/capture-dense-bank-gifs.mjs <output>` earns nineteen wins from fresh storage through ordinary touch, then records real blocking/unblocking and pinch on c20. No seeded progress is used in delivery GIFs. `python tools/render-dense-catalog.py <output.png>` draws an exact-path catalogue diagram without any gameplay/earned-state UI. Synthetic save starting points are reserved for internal production-render QA, never presented as earned gameplay.
