# Trophy art v2 — 0.3.2 (6)

User request, 2026-11-09: make monthly rewards substantially richer and more varied, with a generous future reserve and good artwork.

## Art and reserve

`src/content/trophies-v2.json` freezes 240 distinct compositions for 2026–2045. `npm run content:trophies` reproduces it from the pure versioned domain generator. A month/year seed chooses within curated compatible libraries: 16 bowl silhouettes, eight handle styles, six stems, six bases, six rims/crowns, ten metal palettes, twelve gemstone palettes, eight surface patterns and three emblem frames. Twelve seasonal motifs remain tied to the month. Each year uses twelve different bowl silhouettes. All 240 component signatures are distinct, not just their date labels.

The renderer uses vector gradients, facets, relief grooves, medallion stones, seasonal emblems, engraved month/year plates and finished pedestals. Earned/after-earning views add laurels and bounded static glints. There are no raster downloads, SVG filters, per-card frame loops or unbounded particle systems. The light direction and component attachment ports are shared, so random combinations remain coherent and connected. The miniature card and full-size viewer were inspected in the real UI.

The artistic libraries and generated v2 parameters are immutable after publication. A later style revision must be introduced as a new version; do not reinterpret an earned v2 ID by editing its published library. The catalogue is a reserve of reward artwork, not 20 years of playable puzzles.

## UI

Collection has a year selector covering the frozen catalogue. Installed 2026 months open their real calendars as before. Other years explicitly say they are future collection previews. Their cards open a large artwork viewer, show that puzzles are not yet available and offer no fake Play action.

The calendar's trophy is inspectable. The large viewer shows the exact month/year, an owned state or an explicit appearance-after-earning label, and the real progress/rule when that calendar exists. Open Month routes to the actual calendar. Close, Escape and native Back dismiss the viewer, restoring the parent screen. Its independent activity blocker does not release the menu/background blockers.

A short 280 ms CSS reveal is bounded and disabled by reduced motion. Scrolling/menu art remains DOM-owned while Phaser sleeps. Each SVG instance has distinct gradient/clip IDs for Collection, Calendar and Viewer, avoiding cross-instance paint collisions.

## Existing awards and saves

Save schema stays 2, with an additive `trophyDesigns` map. On loading a pre-v2 save with no map, already confirmed cups deterministically bind to the original v1 artwork. `trophies-v1.ts` preserves that geometry/material styling. Original awarded cups retain their look; new unearned goals use the new art.

A newly earned monthly cup saves its v2 ID/version in the same authoritative transaction as the final daily move and cup award. Duplicate awards do not choose a new design. A present but missing/conflicting/unknown binding is rejected instead of guessing a replacement. Campaign/daily attempts, history, receipt ledger and reward reservations remain unchanged.

Previewing years, inspecting artwork or rendering an after-earning appearance never modifies trophy ownership. Future month artwork is deterministic and shared by all users with the same frozen style/catalogue. Actual daily content remains the 365 fixed dates of 2026, with normal date and level-20 gates.

## Verification

- Strict typecheck/build and 53 unit tests pass. Checks cover the whole frozen catalogue, reproducible parameters, 240 distinct compositions, twelve distinct bowl silhouettes per year, version/identity validation and separate SVG definition scopes.
- The full 46-case browser suite passes across phone/desktop. The final attachment/forward-year polish also passes all 14 targeted navigation/preview cases. Preview ownership stays unchanged and future years expose no invented tasks.
- Existing whole-month model checks verify v2 binding commit/reload, deterministic v1 migration and rejection of unknown awarded designs, alongside the earlier date/reward/save invariants.
- `android:sync` passes. Native CI/artifact evidence follows separately.
- User GIFs capture the real production browser UI using the unedited genuine 19-level Stage C playthrough export. Full-size unowned art is explicitly labelled as a preview; ownership is asserted unchanged. Capture tool: `tools/capture-trophy-gifs.mjs`.

This does not establish physical Android frame pacing, live ad SDK behavior or final store readiness. D–E remain on the product roadmap.
