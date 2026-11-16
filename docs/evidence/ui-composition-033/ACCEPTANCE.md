# UI composition delivery —0.33.0/code47

Implemented the owner's approved C01–C05 over `6e5a3fbb047b136d6ba26ab4b6596e2773ec1dce`, preserving the latest0.32/0.32.1 fixes. Initial application `bade6fa4bea55633cc885b25d4d1be98a3482cc9`; final application/signed build source `960d6ffb2498acc4a954c15616e0e65a851a2476` preserves that work and corrects the reproduced pilot/finite-animation regressions. Intermediate5220131 repaired only CI dependency-cache restore. Read [the behavior contract](../../UI_COMPOSITION_033.md). C06/C07 remain HOLD.

## Per-point result

| Point | Implemented behavior | Verification |
| --- | --- | --- |
| C01 Home | Unopened level/action form one group without the304px invisible SVG slot. A selected field retains original bounds and seamless bridge. Started attempts with1–3arrows show localized remaining count. | Fresh/unopened/last-arrow/current selection, outgoing snapshot geometry, RU/EN and original viewBox; actual fresh c01 move/return recording. |
| C02 Overview | One contextual44px icon occupies the existing free HUD slot.320ms return to the current viewport's original clamped fit; actual displayed position is the starting point. Gestures interrupt immediately, reduced motion is immediate, no input/reward authority. | c120 fit, stable Settings/Guides/Hint, actual wheel/pan interruption, resize, reduced motion, early Back, final save/reload and exact retained earned A2 group. Actual c120 recording ends at persisted zoom1 with unchanged board. |
| C03 Collection | Current cup/progress/Open month leads after level20. Before20, usable achievements lead and the locked cup follows. Preserve the12-month shelf, archive, calculations, design bindings and gates. | Current/locked/earned/past-year/future-year states; first current CTA above navigation on320×568, including synthetic150% text; Collection↔Calendar return. Actual collection recording. |
| C04 Ownership | Small earned check/contour/semantic ownership; owned viewer states all days were completed rather than instructing the owner to earn the cup. | Prepared earned August and current-month states, exact old design binding and RU/EN earned text; actual August viewer recording. |
| C05 Readability | Home progress uses11px secondary ink. Calendar inspect text wraps within76px. | Dark/light/RU/EN/narrow/reduced-motion; actual signed-APK synthetic150% label has no own overflow, Play remains visible/hit-testable. |

No published campaign/daily/generator/artwork, save schema/embedded attempt, lives/lifetime gift, errors/flawless, assistance assignment/receipt/right, lab, ad cadence, runtime or guidance pin changes. The overview saves the displayed camera through the existing view schema. Existing final-campaign result and unselected future-geometry hiding remain intact. Owner's earlier qualitative playtest acceptance remains valid.

## Factual checks

- Local `npm run check`:234unit tests/29files, typecheck, build and production-payload boundary PASS.
- Focused browser run:54/54PASS before the final early-Collection ordering refinement. Later broad run:67/68PASS; its lone failure compared floats differing by5e-14. Test tolerance and deterministic early-Back observation were corrected; repeated affected cases12/12PASS. Do not call that earlier68-case run green.
- Final signed-APK web matrix:78states/6profiles,0application errors,0document horizontal overflows. Checked critical live targets are at least44CSSpx, inside the viewport and centre-hit-testable. Includes320×568,390×844,430×932,800×1280, RU/EN, both themes, reduced motion and synthetic150% CSS text.
- Final hosted Android build [CI43946078829](https://github.com/DanilaH/arrows/actions/runs/43946078829):SUCCESS, sync,19JVM/0failures, normal and isolated playtest assemblies. Corrected full web run is **IN PROGRESS at delivery**, not claimed GREEN. Initial full43941196967 was466/480PASS (21.3min), with14failures explained below. Final affected46/46PASS (1.8min). A local extra full command lost its managed session after20observed passes; no terminal result, not counted.
- Official SDK APK Signature Scheme V2 verification, compiled manifest, DEX test configuration and28public-file extraction PASS;26local production files match the actual APK byte for byte. Both additional Capacitor adapters are empty.
- Supplementary actual-APK daily probe PASS: actual current November16 client/generator produces200arrows/contentVersion3; real zoom/overview returns to the exact original fit, writes daily zoom1, leaves the campaign attempt unchanged and resumes the same daily after reload. No paid help/ad is used. See [daily overview](daily-overview.json).
- QA tooling:4Node syntax checks/Python compile PASS. Recordings:363actual received frames/3current-only clips,0application errors, actual game audio separately; exact hashes and media analysis below.

The first hosted full run also exposed two real regressions: archived pilot HTML has no overview control, so shared addEventListener/hidden access threw; the SVG retained a filled CSS animation after its160ms arrival. Both were reproduced locally before correction. Shared surface now handles the absent optional control, and finite CSS leaves no filled animation. The medal press test also used raw offscreen coordinates after the intentional Collection reorder; its helper now scrolls and asserts actual centre hit before the unchanged press/cancel/stable-geometry checks. The selected before-fix reproduction failed3/3; the complete corrected pilot/phoneFeelV2/composition suites passed46/46. Preserve the [first full-CI failure excerpt](first-ci-web-excerpt.txt); never relabel that run green.

Two earlier real new-feature issues were reproduced and fixed during browser work: repeated unchanged layout notifications cancelled a newly requested fit; the old400ms save timer could preserve an intermediate camera on slower frames. The final code cancels only for actual viewport changes and schedules an attempt-owned save on fit completion/interruption. Outgoing inert snapshots retain visual field/owned state so the old blank slot does not return during a fade.

Initial infrastructure runs43939462377/43940727159 failed at `npm ci` before application compilation; their outcomes remain in [checks](checks.json). The kit repository became private while Arrows is public. The build restores the existing npm cache with the exact setup-node raw path `/home/runner/.npm` and verifies the unchanged pinned dependency through `npm ci --prefer-offline`. No private kit source was copied into public Arrows and no access/pin was changed. **A genuinely cold builder without that cache still needs authorized private-kit read credentials.** This is a concrete future CI provisioning item, not a claim that access was permanently repaired and not an outstanding APK compilation failure.

## Signed test build

Package `com.danilah.arrows.playtest`, version0.33.0/code47,11008253bytes. Same V2 certificate as0.32.1: `533aa2ff18337e3b3630c1363e7fe49f98e6b21371ce715689d2cbbf2e45ea36`. APK SHA256: `5631b7f6b9fe28029ff000a86385128b3a3146c8c12f41344c4176b0e5e6ab7d`.

Merged MainActivity orientation=portrait, application category=game. DEX `AD_MODE=test`, `demo-rewarded-yandex`/`demo-interstitial-yandex`, analytics key empty. Package, certificate and increasing code provide static update compatibility; physical update installation was not run. See [verification](verification.json), [official signing output](signing.txt) and [compiled manifest tree](manifest-tree.txt).

## Actual delivery and recording provenance

Permanent file identities, exact hashes and URLs are in [deliveries](deliveries.json). All five files were successfully replaced with the final960d6ff bytes at saved version1 and applied local metadata; canonical links retain their identities. Initial pre-fix candidates are not the delivered current versions.

| File | Behavior/source |
| --- | --- |
| Arrows-0.33.0-playtest.apk | Signed CI43946078829 build; compatible existing playtest identity/test ads/analytics OFF. |
| Arrows-0.33.0-home.gif | Genuine fresh save, no seeded victories: unopened Home→Play→one legal c01 removal→Home with2remaining.5.5s/137actual frames. |
| Arrows-0.33.0-overview.gif | Prepared current c120 with8legal removals; actual wheel zoom→overview→actual pan interruption→overview; board unchanged, final persisted zoom1.6.5s/90actual frames. |
| Arrows-0.33.0-collection.gif | Prepared c40,6November daily wins and owned August cup; real clicks/current preview→Calendar→real wheel→August earned viewer. No ad/reward grant in the recording.8.7s/136actual frames. |
| Arrows-0.33.0-ui-audio.mp4 | Actual Home+overview game WebAudio capture,12.0s; no synthetic sound/overdub. Both source clips also have captured sound; GIFs are silent. |

Source is **the actual signed APK's extracted web payload in Chromium141,390×844/DPR1.5**, prepared QA/controlled native transport, not Android/real-SDK footage. Every delivered frame belongs to0.33; no BEFORE version. Caption lies outside the application viewport. The capture uses one actual initial screenshot, subsequent timed CDP JPEG frames and holds idle frames during encoding; encoded30fps/20fps is **not** a device frame-rate measurement. Audio was unlocked/warmed through the actual Settings preview before each recorded sequence, not overdubbed. Peak/mean PCM-volume analysis confirms a nonempty signal, not physical speaker quality.

Evidence: [exact payload and recording manifest](recordings.json), [78-state observations](matrix.json), [media hashes/streams/audio analysis](media.json), [checks and preserved failures](checks.json), [unchanged canonical/config blobs and exact package-lock comparison](compatibility.json).

## Reproduce and limits

Build SSR fixtures with `npx vite build --ssr tools/audit/ui-composition-source.ts --outDir .test-output/ui-033/ssr`. Obtain the three source CI artifacts `arrows-playtest`, `playtest-verification`, `native-unit-results` as `.test-output/ui-033/{playtest,verification,native-tests}.zip`. Run `python tools/qa/verify-ui-033-apk.py --source 960d6ffb2498acc4a954c15616e0e65a851a2476 --application 960d6ffb2498acc4a954c15616e0e65a851a2476 --workflow 43946078829`, then `node tools/qa/verify-ui-033.mjs apk`, `node tools/qa/verify-ui-033-daily.mjs` and `node tools/qa/capture-ui-033.mjs`. The verifier requires local QA-only androguard at `.test-output/apk-python`; captures require Chromium and ffmpeg. These are not application dependencies. Re-running APK extraction replaces the owned extracted web directory and resets the capture manifest, so record again afterward. Matrix, daily probe and captures create their own local server/browser in one process for the managed environment.

Physical phone install/update/rotation/haptics/speaker/audio focus/FPS/thermal/system text scale: **NOT RUN** in this iteration. Real SDK/account/AppMetrica/export/money: **NOT RUN**, separate stage. Synthetic enlarged text and Chromium recordings are not those proofs. Automated checks do not prove human enjoyment, retention or monetization; no new human outcome claim is made. No store publication.

**KIT IMPACT: REUSE** — existing UX state hierarchy, stable targets, owned finite motion and actual-state evidence at guidance`e04a3fe`; no new runtime primitive. Existing `BrowserViewportWatcher/resolveViewportState` (`src/app/viewport.ts`, kit`/layout`), `GameplayActivityCoordinator` (`src/app/platform.ts`, kit`/platform`) and `OneShotPlayer` (`src/platform/sound.ts`, kit`/audio`) stay at runtime`a932526`. Camera gestures, exact earned A2 retention and real audio capture verify their consumer seams. No new generic API or kit upgrade/write. Separate **CANDIDATE**: document private pinned-dependency provisioning and cache raw-path identity with the two-failure reproducer above. A cache-independent authorized install should be the acceptance check; no second consumer is established, no extraction proposed and no reason to publish private source.
