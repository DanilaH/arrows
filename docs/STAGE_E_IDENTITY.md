# App identity and production surface — 0.7.0 (11)

The Android/browser app uses a shared project-owned mark: three bent white/lilac/violet arrows above a restrained dot field. `com.danilah.arrows` and the display name Стрелки are preserved; no application-ID/signing reset or save migration is involved. Campaign/daily fields, trophy ownership, reward authority, settings and advertising policy are unchanged.

## Artwork and native launch

`tools/brand/art.mjs` is the canonical geometry/palette. `npm run brand:generate` writes twelve text resources: browser mark/favicon, opaque store-icon SVG, Android adaptive foreground/background/monochrome layers, API-24/25 legacy square/round vector icons, a launch vector and launch color. Adaptive layers are 108 dp with the important mark inside the central safe region. Store/legacy marks are scaled to the corresponding visible crop. No third-party logo, raster service, new image decoder or network asset dependency is used.

`npm run build` checks generated resources and rejects old Capacitor icon/splash resources before assembling the web payload. All 29 obsolete default resources are removed. Native icon geometry is in common vector resources; density-specific PNG defaults cannot override it.

Android's existing core-splashscreen 1.2.0 dependency is used directly. `MainActivity` installs the splash before `super.onCreate`, the launch theme specifies its mark/background/post-launch theme, and the regular Activity window has a matching dark background. The browser/WebView loading surface has the same transparent mark from the initial HTML. It clears at the existing first-render/uncovered-paint boundary. No minimum launch hold or optional-SDK readiness dependency is added; the previous synthetic percentage is hidden. Physical launcher masks, API-24/25 gradients, Android 12+ launch transitions and system-bar behavior still require named-device acceptance.

Current official references checked 2026-11-09:

- [Android adaptive icons](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive)
- [Android splash screens](https://developer.android.com/develop/ui/views/launch/splash-screen)
- [AndroidX SplashScreen contract](https://developer.android.com/reference/androidx/core/splashscreen/SplashScreen)
- [RuStore app-publication/icon requirements](https://www.rustore.ru/help/developers/publishing-and-verifying-apps/app-publication): export 512×512 PNG with an opaque full background. The store export and installed app use the same mark/palette; launcher masks are platform-owned.

## Review fixtures are isolated

The normal `src/main.ts` calls `startGame()` with no review fields. `BoardScene` starts from campaign c01 rather than a diagnostic board. Home and pause expose no control-board entry. There is no query parameter, environment toggle, browser global or native debug/release switch that opens review fields in the delivered app.

The four original control boards remain in source for deterministic tests. `tests/fixtures/controlReview.ts` supplies those fields to the same bootstrap through an isolated in-memory Vite bundle, served only by Playwright route fulfillment. It never writes to `dist` or enters the Android graph. The review script is deferred like the production module so DOM/Phaser boot ordering matches. Gesture/error/large-field/repeated-entry and campaign-preservation scenarios run through this fixture. All ordinary campaign/meta/settings cases still use the production build.

`tools/verify-production.mjs` rejects control-catalogue identifiers and either test harness in built JavaScript. The full suite now has 72 cases: 54 on the ordinary application surface, twelve on the real-rendering control fixture and six on the isolated advertising integration fixture.

## Verification and delivery limits

Strict typecheck/build, all 74 TS tests, brand drift/production-content checks and the 72-case browser run are recorded against the exact build. Android sync/build evidence follows in `verification/STAGE_E_IDENTITY_BUILD_2026-11-09.json`. An earlier test-harness-only classic-script ordering error was corrected by deferring that script; it was not a production callback/SDK failure.

The delivered startup GIF records actual current production HTML/UI and an ordinary first move. JavaScript asset delivery is held for 900 ms only by the capture route so the pre-JS mark is visible. CDP screenshots avoid waiting for fonts/DOMContentLoaded and accidentally missing that state. There are no fabricated progress/rewards or altered pixels. This is a controlled browser recording, not native launch duration or phone performance evidence. Capture: `tools/capture-identity-gif.mjs`.

Signing, real SDK earned delivery, AppMetrica dashboard delivery, physical-device feel/performance and final RuStore submission materials/disclosures remain open. This package establishes app artwork and removes review navigation; it is not a signed store release.
