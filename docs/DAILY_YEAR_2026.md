# Full 2026 daily archive — 0.3.1 (5)

User request, 2026-11-09: extend the year’s rewards/content so past months are playable, and explain whether daily fields are seeded/shared.

## Delivered behavior

- The installed catalog covers all 365 dates from 2026-01-01 to 2026-12-31: 14,532 arrows across eight own silhouette families. Collection displays all 12 monthly cups in a compact three-column grid; each has its own seasonal engraving, across four cup body shapes.
- Every month requires all its actual calendar dates for its cup (February 28, the 30/31-day months). The existing durable exactly-once cup rule is unchanged. No trophy is granted just for installing the update or browsing a month.
- After daily unlock at current campaign level 20, past dates are playable and unfinished dates resumable. Future dates retain the normal date gate. On 2026-11-09 this gives 313 available calendar days including today, with 52 future dates still closed.
- Campaign and individual date attempts remain separate. Existing completed dates, monthly cups, views, errors/lives and receipt rights are preserved.

## How the fields are produced

`tools/content/daily-source.ts` generates the catalog offline. For a date such as `2026-01-09`, the numeric seed is `20260109`. The date also chooses a silhouette family, size and difficulty. The seeded reverse-construction generator builds a solvable arrangement; the output is validated and committed as ready coordinates in `src/content/daily.json`.

A player’s account, device or random session value does not enter generation. All installations with the same catalog/content version use the same field for a selected date. Local device date only controls when the date becomes available; users in different timezones can reach the next day at different moments, while the same selected date still identifies the same field.

The eight base silhouettes are diamond, flower, heart, ring, star, leaf, cross and butterfly. Daily layouts vary by arrow arrangement and size; this is not a claim of 365 independently drawn silhouettes. Current date policy makes the 8th/28th Nightmare, remaining multiples of 7 Hard and other dates normal. These are our policies, not recovered original constants. There is no runtime reroll and no per-player difficulty adaptation.

## Compatibility

The shipped November/December catalog (61 fields) is unchanged: IDs, contentVersion, masks, arrow geometry and difficulty all match the prior version. `tests/fixtures/daily-v1-hashes.json` pins their original per-date SHA-256 fingerprints rather than regenerating expected values from the new catalog.

Save schema stays 2 at the same key. The decoder upgrades `dailyCatalogVersion: 1` to 2 without rebuilding any attempt or clearing any ledger/history/cup. Existing attempts still embed their original geometry. Schema 1 (0.2) migration also remains supported; unknown future versions stay protected. New January–October attempts start from the added fixed content.

## Verification

- Strict typecheck/build, 50 unit tests and `android:sync` pass.
- The full 365-day catalog passes geometric/solvability validation and an independent integer-cell dependency oracle. All 61 original fields match their pinned fingerprints.
- Existing midnight/month rollover, February/leap-century, exact-date receipt, duplicate-cup and clock rollback checks remain. The new migration scenario preserves a completed day, a partial day/view and an already-earned receipt.
- Browser coverage adds all-12 reward visibility and a real January puzzle action/return/resume on phone and desktop, alongside the prior navigation/gesture/save cases. Final CI/artifact evidence follows separately.
- The delivery GIF shows actual production-browser UI and the January archive. It reuses an unedited genuine 19-level playthrough export from 0.3 and lets normal save migration upgrade it. No fake wins or trophies are inserted. Capture: `tools/capture-year-gif.mjs`.

The catalog is technically validated, not a claim of individually curated difficulty or physical-phone performance acceptance. Themes/sound/native platform completion and release work remain on D–E. Catalog coverage beyond 2026 is still explicit future work.
