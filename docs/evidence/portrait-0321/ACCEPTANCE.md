# Portrait-only0.32.1/code46

Owner selected fixed vertical Android gameplay; source `c0729730da9cf7b5c64f6aac7b0418a697ac8e36`. Native manifest requests `portrait` on MainActivity and declares application category `game`. Preserves0.32UI, all content/saves/help/cadence and dependency pins. Details/official Android references: [PORTRAIT_0321.md](../../PORTRAIT_0321.md).

[Arrows-0.32.1-playtest.apk](https://chatgpt.com/library?file_id=libfile_fde3_f-5dd4382ed7848191b8359930839b231c_2841ca9da26c8191b7a266fa9b41a810&account_id=personal) —11,006,217bytes, SHA-256 `d07530de92734d3ba0e0b8416f319937d99acaa3fae5bc8208f0e236cdd50eb3`. Same package `com.danilah.arrows.playtest`, code46 >45; V2 same certificate as0.32, Yandex demo rewarded/interstitial, empty analytics key.

- `npm run check`: typecheck/232unit in29files/production build PASS.
- Hosted [CI43920386155](https://github.com/DanilaH/arrows/actions/runs/43920386155): Android job SUCCESS;19JVM tests, sync, debug and signed playtest builds PASS.
- Actual APK decoded manifest: MainActivity orientation portrait(enum1), application game(enum0), targetSdk36. Checked compiled manifest, not just source XML. Official SDK signature/manifest/SHA proof and DEX BuildConfig verified.
- All28public web files are byte-identical to verified0.32;26local dist hashes also match that payload. At original delivery the fresh web CI was still running. Subsequently verified completed CI43920386155: **web SUCCESS,458/458browser in21.6min**,232unit/29files, final type/build/sync PASS; Android SUCCESS unchanged. Actual completed-job excerpts are saved in [the later audit evidence](../ui-composition-0321/ci-web-summary.txt).
- Native/emulator/physical rotation, launch and resume behavior **NOT RUN**. Manifest verifies the Activity's persistent requested policy, not every OEM/window-manager override. Browser resizing is not native rotation evidence. No new browser GIF is offered for this native-only change; the0.32UI recordings remain the identical web behavior.
- Physical haptics/FPS/live services were not retested; old owner gameplay acceptance is retained. No store publication.

Machine evidence: [verification.json](verification.json), [manifest-tree.txt](manifest-tree.txt), [signing.txt](signing.txt). Reproduce with `tools/qa/verify-portrait-apk.py` against the three final CI artifact ZIPs. The APK and metadata are durably saved; no APK/key enters Git.

**KIT IMPACT: NONE.** Project Android orientation choice; no new common API, dependency upgrade or upstream write.
