# Production audit acceptance /0.34.1-code49

**Production FAIL: BLOCKED_SAVE_CAPACITY.** This is a completed audit with small verified fixes, not a store release or an implemented archive migration. Read [the owner report](../../PRODUCTION_READINESS_0341.md). Base63ac429, final app/web673713c, final native/config/audit6efbb270dffbe68c0d45f05221a56005f1c054f7. Later changes since673713c are CI/docs/native SDK graph/verifiers only; compare recorded in compatibility.json.

| Layer | Actual result |
| --- | --- |
| Type/build/unit |239PASS,30files; exact38-schema generated sender types and native JSON source |
| Final affected browser |80/80PASS,2.9min, terminal log read after local environment reconnected |
| Full production-browser source673713c |496/496PASS,26.1min; [web133919531913](https://github.com/DanilaH/arrows/actions/runs/44048341230/job/133919531913) completed SUCCESS. That run's Android failed the real missing-AppSet R8 defect, so the aggregate run is not green |
| Current release-only web |32states/5profiles/0runtime errors, RU/EN/both themes/narrow screens/synthetic150%/reduced-motion/loss; laboratory entries/controls absent. Every screenshot SHA verified from downloaded original artifact |
| Native source6efbb27 |[android133930316565](https://github.com/DanilaH/arrows/actions/runs/44051537203/job/133930316565) SUCCESS: sync,debug,compatible playtest,R8/resource-shrunk releaseCheck,official APK checks |
| Native units |Downloaded7JUnitXML files:21tests,0failures,0errors,0skips |
| Production missing configuration |Actual assembleRelease rejected with required live-configuration error; no fallback production key |
| Long-profile product gate |[release-audit133930316155](https://github.com/DanilaH/arrows/actions/runs/44051537203/job/133930316155) FAIL after successful reproducer/capture. Real dates2026-01-01…2026-02-24,54opened fields fit4,187,443bytes;55th candidate4,254,201 exceeds4,194,304. Actual ProgressStore write rejected, prior raw/revision unchanged |
| Latest repeat full web |May still run when recorded. No claim of a green current aggregate; capacity gate stays FAIL regardless |
| Physical install/update/audio/haptics/frame-pacing,actual production signer,live SDK/dashboard/money |NOT RUN; owner previous qualitative gameplay acceptance retained |

See capacity.json for all55actual generated samples and matrix.json for all32states/screenshot hashes. The long-profile storage adapter reproduces the exact native source UTF8 budget; it is not Java bridge/device execution. Captures are actual release-mode web in headless Chromium with possible prepared progress and controlled native transport. Synthetic computed150% font sizing is not Android OS font scaling. The source mark does not turn this into a live ad or phone recording. Text/metadata/internal changes introduce no new motion sequence requiring a fresh GIF.

## Exact optimized artifact

- Package com.danilah.arrows.releasecheck,0.34.1/code49,5,408,972bytes.
- APK SHA25689d138165ef38d6fd2b1051d48b4fac9514dcb63d95594120d1caf5930c2579b.
- Test certificate SHA2561fbd42420d4844d2c655c43181c9733161a09abfca777da203c0bcefcc26fede;V2verified,debuggable=false,portrait,official zipalign16KB check PASS. This debug test signer is not production signing or a stable .releasecheck update promise.
-15web files exactly match dist; native analytics contract SHA256c986cd1fb8f6fe08b93ecd9d75ec59728c0dc177d37a3319cf57a8000ed71244. Main-only release stamp, no lab HTML. Four custom bridge classes and required method names present in optimized DEX. Generated BuildConfig matches forced test ads/empty analytics key; required ad constants present in raw DEX. This is not active AppMetrica SDK runtime proof.
- R8mapping21,737,725bytes, SHA2565504ba6ec59e2fa169c93aed6c65e364a927d4b1f22aa26402a06d6b60a1615e; mapping remains a CI artifact, not committed generated source.

releasecheck-verification.json contains public-payload hashes and official inspection results. Test signatures differ between CI debug runs; always use the exact report's fingerprint/hash, never a prior releaseCheck artifact. Production requires its own expected public fingerprint.

## Compatible preview identity

.playtest0.34.1/code49 remains com.danilah.arrows.playtest. Actual APK SHA256b2fdad7ad695d58dae162d7bc1bb2d966befdb7c8ab03a7a058c954f5f86ef6a; officialV2/public certificate533aa2ff18337e3b3630c1363e7fe49f98e6b21371ce715689d2cbbf2e45ea36 matches earlier deliveries. Test ads and analyticsOFF are forced by playtest configuration. Identity verification/build passed, actual phone update not performed. No fresh APK/Library media delivery was requested for this audit; existing0.34delivery stays available. Preview progress is separate from production.

## CI originals and reproducibility

All four downloaded evidence ZIPs were SHA-checked against GitHub artifact digests before extraction. Native test counts,32screenshot files/hashes and public metadata were read back. [artifacts.json](artifacts.json) records exact IDs/digests/links for the whole run; artifact retention is7days, while these source/evidence summaries persist in Git. The audit artifact includes actual PNGs, complete matrix and all capacity samples.

Useful current artifacts:

- [production-readiness-audit14313842135](https://github.com/DanilaH/arrows/actions/runs/44051537203/artifacts/14313842135):32original screen captures + complete capacity report.
- [releasecheck-verification14314346324](https://github.com/DanilaH/arrows/actions/runs/44051537203/artifacts/14314346324):official outputs and mapping.
- [native-unit-results14314082234](https://github.com/DanilaH/arrows/actions/runs/44051537203/artifacts/14314082234):original21-test XML.

Reproduce with exact checked source and pinned dependencies:

1. npm ci; npm run check; npm run test:browser -- --workers=2.
2. npx vite build --ssr tools/audit/ui-composition-source.ts --outDir .test-output/production-readiness/ssr; node tools/qa/audit-save-growth.mjs. The report says BLOCKED_SAVE_CAPACITY; the final release-audit CI gate intentionally fails it.
3. npx vite build --mode release --outDir .test-output/release-web; ARROWS_AUDIT_SOURCE=<checked-sha> node tools/qa/audit-release-web.mjs.
4. npm run android:sync:release; JDK21/SDK36 ./gradlew assembleReleaseCheck from native/android; python3 tools/qa/verify-release-payload.py native/android/app/build/outputs/apk/releaseCheck/app-releaseCheck.apk --kind releasecheck --out .test-output/releasecheck-verification. Use this run's generated BuildConfig/mapping, not files from a different variant. Production assembleRelease needs real configuration and signer; none were generated or submitted automatically.

Earlier failed QA observers and actual R8 failure are retained in checks.json. A diagnostic MUTF8 decode correction does not suppress missing-class errors. No published field, generator, canonical save schema2, old earned help, lives/gift/error/flawless rule or ad cadence was altered. GameSave interface/decoder and JS dependency graph are byte/structure-equal;40canonical content/domain/native blobs match base. Storage architecture work is explicitly outstanding.

KIT IMPACT REUSE: exact-release acceptance, committed event ordering and contextual localization guidance exposed concrete consumer defects. Runtime/guidance pins unchanged; no kit/store writes.
