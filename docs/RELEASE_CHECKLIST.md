# Android / RuStore acceptance

This is a future release gate, not a claim of completion. The reuse/implementation map is [KIT_REUSE.md](KIT_REUSE.md). Record each result against a source revision and artifact; unresolved or untested items do not pass because CI is green.

## Game, progress and recovery

- Complete the spec's acceptance scenarios and maintain an honest difference register, including unresolved reference policies.
- Validate the whole versioned bank and daily calendar independently of the generator; playtest variety, difficulty, onboarding and content exhaustion separately from solvability.
- Verify first touch, hold/cancel, pan/pinch, Hint, lives, restart, victory, campaign/daily separation, collection and Android Back through the actual screen stack.
- Test fresh installation, relaunch, force-stop/process death and upgrade over a prior compatible signed build. Preserve confirmed progress/settings through content/schema migration; test damaged and failed saves without resetting valid history.
- Interrupt actions before/during/after durable writes, during flight/victory, with pending rewards and after effect commit but before ack. Check saved truth and visible recovery.
- Verify offline core play, independent background/focus/ad blockers, rotation and repeated route entry; late callbacks cannot revive an obsolete screen or attempt.

## Advertising and optional services

- Integrate native Yandex Mobile Ads rewarded for Hint/lives and interstitials on eligible saved-progress transitions. No banner is part of the agreed baseline.
- Validate required IDs and explicit test/live mode without logging values; recheck current official SDK contracts before shipping.
- Test load/no-fill/show errors, missing pre-show callback, late/duplicate callbacks, both dismissal/resume orders, rotation/background, destruction and repeated preloads. A displayed ad is not dismissed by a generic timeout.
- Prove earned receipt persistence, exact attempt ownership, effect+dedup commit before ack, failed ack recovery and no reward for dismissal/failure. A mock callback is not live SDK proof.
- Verify the configured first-session protection and active-time/new-progress cadence, rewarded postponement and one-fullscreen ownership; a preload completion never authorizes showing.
- Check real ad presentation, confirmed reward and sound/input return on a named Android device. Record no-fill/network limits honestly.
- Verify startup and normal navigation stay usable with absent or stalled ad/telemetry status; bound outstanding RPCs/retries.

## Analytics and failure reporting

- Implement the native AppMetrica adapter; the kit's analytics interface, console adapter and web Metrica adapter are not native transport.
- Cover tutorial, meaningful attempt start/completion/restart, assistance/continues, daily/progression and distinct ad request/load/show/impression/dismissal/earned/grant boundaries. Define active-time, duplicate and error semantics.
- Check event names, allowed keys, value types and envelopes across TS/native transport. Avoid silently discarded events and unbounded/per-frame reporting.
- Verify events on a real device and in the intended dashboard, plus crash/error reporting using a controlled test configuration. Record configuration mode and avoid presenting test traffic as organic usage.
- Test offline/reconnection and failed analytics initialization without blocking play or reward commits. Do not transmit raw saves, boards or configuration secrets in custom payloads.

## Presentation and measured performance

- Test small portrait, short landscape, tablet, large font, cutouts and gesture/three-button navigation on Android, using actual large content and all relevant dialogs.
- Verify both themes and every enabled locale, including calendar, onboarding, ads unavailable, storage errors and support screens; review rendered text, not just dictionary parity.
- Check independent saved sound/haptic settings, audio focus, phone speaker/headphones, background cancellation and no stale sound/vibration burst after return.
- Measure large-field active/idle behavior, startup, frame pacing, memory and repeat-entry resources on a named target phone. Record board size and build/configuration.
- Use controlled SDK-disabled runs to isolate costs when needed, then test the final release with ads and analytics enabled. Bootstrap/browser FPS is not proof of full native performance.

## Reproducible signed payload

- Lock application ID, display name, versionCode/versionName and public signing identity; replace Capacitor launcher/splash defaults.
- Run `npm ci`, `npm run check`, `npm run test:browser`, `npm run android:sync`; retain native customizations in versioned reproducible source.
- Build on the project's JDK 21 / SDK 36 baseline; review compatibility and current store requirements at release. Validate R8/resources/shrinking separately from debug assembly.
- Configure production signing outside Git; fail clearly on missing signing/live settings instead of generating substitute credentials. Preserve the production key privately.
- Verify signature, alignment, manifest identity/permissions/debuggable state, embedded web payload and absence of test hooks. Test bridges, storage and SDKs on the shrunk release.
- Identify the exact delivered APK/AAB by commit, build/run, version, size, SHA-256 and public certificate fingerprint; retain mapping/evidence without private signing material.

## Store package and release evidence

- Prepare icon, authentic gameplay captures and any framed compositions for the exact build, descriptions, support/privacy URLs and upload instructions. Track capture locale, viewport and staging provenance.
- Derive permissions/data disclosures and audience/content declarations from the actual game and SDK behavior. Verify current RuStore fields and asset requirements; do not copy another game's declarations blindly.
- Resolve explicitly whether open account/purchase flows ship; any enabled flow needs success/cancel/error/recovery evidence and honest store copy. No placeholder login/purchase buttons.
- Record passed/failed/untested device and service checks, known limitations and the parity difference register. Distinguish built, signed, device-verified, submitted, approved and published states.
