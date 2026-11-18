# Store candidate 0.40.0 / Android code59

Owner approved the dark violet circular icon and requested a production-signed RuStore APK with live IDs and no debug tools. Base:2f922653864193608971a0c87954bcfb26fb0368. Preserve schema2, embedded attempts, earned help, daily13:00+19:00 permission flow, portrait, banner continuity, ads cadence and all dependency pins.

## Icon

Approved round artwork is exported as assets/brand/launcher-round.png; full-bleed512px store artwork is assets/brand/store-icon.png. Genuine transparent1024px foreground is assets/brand/launcher-foreground.png. Generated with built-in image generation; ImageMagick only performs lossless technical resize/export. Final edit prompts: extend the approved dark violet background to all square corners without redesigning the arrows; extract precisely the three glossy arrows onto genuine transparency. An initial cutout with excessive edge artifacts was discarded; selected cutout retains the original balanced composition and restrained edge details.

The adaptive icon uses separate full-bleed violet gradient and transparent foreground, with16% inset in108dp layer space. The opaque glyph stays inside the33dp safe radius. System masking is not baked into the adaptive layer. Both regular and round adaptive resources share it; Android25 legacy round and the splash use the approved circular PNG. Existing light launch-window background, saved themes and living in-game Home emblem remain unchanged. The monochrome layer uses the same transparent silhouette. Final PNGs are checked at96/64/48/32px, on light/dark, circular/squircle and themed previews; native installed-resource evidence is a separate check.

Official references checked2026-11-18: https://developer.android.com/develop/ui/compose/system/icon_design_adaptive and https://www.rustore.ru/help/developers/publishing-and-verifying-apps/app-publication . Android specifies108dp layers with a central66dp safe zone; RuStore accepts signed APK, stable package/certificate and an increasing version.

## Release isolation

Release-mode compilation eliminates the A1 local QA experiment, its storage key/notes/UI and presentation implementation. The existing help laboratory controls and laboratory entry HTML remain excluded. Remove the startup debug root from release HTML; verify forbidden QA markers in compiled scripts. Keep legacy help/right decoders so existing earned help is preserved. Test infrastructure stays in tools/tests/androidTest and is not application payload.

Explicitly disable WebView remote debugging. Capacitor loggingBehavior=debug disables its diagnostic logging in a non-debuggable release. Native banner debug logging is BuildConfig.DEBUG-gated. Product error handling and production telemetry remain functional.

## Production build

.github/store-release.json is the explicit owner-requested build manifest. Updating it on main triggers Store release APK; workflow_dispatch remains available. It builds/downloads an APK only, publish=false; no store upload, moderation submission, tag or GitHub release. Secrets are consumed only inside Actions and never logged or copied into source. Existing pinned production signer remains e7cb7061aebc42ca415ee8fbe17235769c6e40af4f1ab46fb17af68c8581bac6, package com.danilah.arrows. No replacement signing key is generated.

The workflow validates signing material and all three distinct live ad units plus AppMetrica; runs check, release-interface matrix,730-date archive-capacity gate, native JVM tests and R8 assembleRelease. Official apksigner/zipalign/aapt/dexdump inspect the actual APK, certificate pin, package/code, non-debuggable state, portrait/reminder permissions, exact release web and analytics schema, live config in optimized DEX and disabled WebView debugging. The private key is always deleted from the runner.

Local:264unit/typecheck/standard build/release build/sync PASS;32release states/5profiles/0runtime errors and no debug/lab controls even when controlled native claims playtest=true PASS. Archive audit/native/resource verification and production artifact status are recorded after CI completes. Browser/CI evidence does not establish physical phone feel, live ad fill/revenue or dashboard delivery. Production signing prevents updating a differently signed playtest package; both applications have separate package IDs.

KIT IMPACT: REUSE. Selected Android release acceptance and UX/art small-size guidance; no generic runtime API, pin upgrade or kit change.
