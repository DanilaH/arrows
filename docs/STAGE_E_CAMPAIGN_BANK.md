# Campaign continuation — 0.6.0 (10), 2026-11-09

## Delivered contract

The fixed campaign now contains 120 fields and 3,717 arrows. This adds 100 fields / 2,956 arrows after the original twenty. No runtime generator, personal difficulty adjustment, new economy or future-level browser is introduced. The catalogue still ends explicitly, now at c120.

The 100 new fields use twenty silhouette families, five fields per family: the existing diamond, flower, heart, ring, star, leaf, cross and butterfly plus crescent, shield, hourglass, lightning, crown, infinity, anchor, droplet, hexagon, key, wave and gear. The existing v1 silhouette functions are unchanged; their extraction into `tools/content/silhouettes.ts` also avoids generating the campaign when building the daily archive.

Each ten-field section follows short / normal / Hard / normal / short / normal / Hard / normal / normal / Nightmare. This is our production policy, not an inferred reference cadence. Family rotation changes the difficulty associated with each form across sections. New fields contain 6–77 arrows with considerably longer bent paths; size alone does not represent their difficulty.

## Generation, selection and limits

The original generator and original twenty recipes remain unchanged. A separate offline generator grows longer bent paths, allows turns around occupied cells, and prefers candidates that block an otherwise free arrow. It constructs in reverse removal order, so a completion witness exists. Four fixed seeded candidates are produced per new field and scored by dependency depth, arrow count, coverage and bends. Only the selected coordinates ship in `src/content/campaign.json`.

The independent cell-walking analyzer does not call the game's ray, occupancy or solver helpers. It checks occupied cells against the silhouette, constructs the dependency graph and rejects cycles. `verification/CAMPAIGN_BANK_SELECTION.json` records each selected seed, family, pace and structural measurements.

Observed dependency-depth ranges for the appended fields are 2–5 (short), 3–8 (normal), 4–9 (Hard), and 6–12 (Nightmare). Mean bends per arrow are at least 2. New difficulties are structurally selected labels; they have not been established by human phone playtesting. Thumbnail/production-browser review and solving tests are not a claim of 120 individually playtested or hand-authored puzzles.

Reproduce with `npm run content:campaign`. Do not alter any published field when adding later content: pin published fingerprints before changing generation. The first twenty original payloads are pinned in `tests/fixtures/campaign-v1-hashes.json` and checked byte-for-byte.

## Compatibility and navigation

Catalogue version 1 → 2 is append-only; schema remains 2 and the storage key is unchanged. The decoder accepts the known older catalogue and preserves its embedded field, attempt ID, removals, error marks, lives, camera, tutorial facts, wins, daily saves, trophy bindings, cadence and earned ledger. Schema-1 migration still works. Unknown future catalogues remain protected.

A completed c20 stays completed during migration. Explicit Continue/Next creates c21 exactly once; it neither silently records another win nor applies an old earned receipt to the new attempt. A partial c20 keeps its original geometry. The UI derives total counts from the installed catalogue, including Home, pause and field header. Final completion copy no longer embeds the historical number twenty. At c120 the next button is disabled and returning from Home does not reroll c01.

Daily fields, date gates, monthly cups, hidden future trophy reserve, unlocks at current levels 10/20, ad cadence and existing medal thresholds are unchanged.

## Verification and remaining acceptance

Strict typecheck/build and 74 TS tests pass locally, including catalogue fingerprints, geometry uniqueness, independent legal-choice comparisons and full removal in three orders for all 120 fields. The native sync and offline content-tool typecheck pass. Browser coverage adds completed-c20 upgrade, partial new-field restoration and final c120 exhaustion on phone/desktop. Exact CI/artifact results are recorded in the accompanying build evidence after completion.

The GIF tool `tools/capture-campaign-bank-gifs.mjs` starts from the unchanged genuine nineteen-win Stage C browser export, upgrades normally and earns c20/c21 through ordinary touch input. It records actual current production UI; it never inserts progress, fake rewards or edited gameplay pixels. This is browser evidence.

Named-device sound/haptics/system bars/performance, SDK fill/earned callbacks and AppMetrica dashboard delivery remain open. Final native icon/splash, signing and RuStore package remain release work. This milestone supplies the larger fixed bank, not final release acceptance.
