# Missing Android banner —0.39.1/code57

Owner reported that the0.39.0 banner never appeared. This is a confirmed consumer integration defect, not an inferred no-fill/network problem.

## Reproduction

`BannerRuntimeTest` starts the actual APK on Android35/x86_64 Pixel2, enters a fresh campaign and returns to ordinary Home. It uses the real WebView, Capacitor plugin and pinned Yandex8.6.0 SDK; no transport/creative substitute. Source02df765c7f632fbce3956e72df6081c1afd0731a, run44286629458, job134740855139 failed with sdkReady=true, focus=true, width=0, height=0, requestId empty. Every native measure rejected: window.innerWidth412 versus DOM slot width412.19049072265625; analogous height660 versus660.1904907226562. No SDK request had been sent. Artifact14418944566 archive SHA256f09071a512a9236a28dcdd0c50cfb81677bd98b712239dd28eab4a1e40002fa0 contains full native log/test report/frame.

## Correction

The HTML root is the existing100% full layout viewport with no transform/scroll. Read its fractional getBoundingClientRect width/height, in the same CSS coordinate space as the slot, throughout native admission and the pinned kit inverse-safe/placement calculation. Preserve native whole-pixel mapping, containment, current proof and system safe bounds. Do not add a tolerance that allows creative outside its root.

Native revision parsing now accepts JSON Integer/Long/integral Number and rejects invalid/unsafe counters. A JVM regression uses actual JSONObject decoding. Debug-only native phases/error codes distinguish no request from SDK load failure without exposing configuration values. No live ID, progress, content, rights, ad cadence, dependency, portrait, signing or notification changes.

The browser regression uses fractional CSS edges with rounded window dimensions and a faithful native width admission guard. The native runtime test requires a real SDK load and a visible BannerAdView in the Android hierarchy, then captures the native screen. Service-network failure is reported honestly rather than replacing it with a browser mock.

## Verification

- `npm run check`:264 unit tests/typecheck/build PASS; Android sync PASS.20 banner browser cases across phone/desktop PASS, including fractional WebView admission, safe insets, dialogs/fullscreen return and short/enlarged layouts.31 JVM tests PASS, including real JSONObject revision decoding.
- Source application `dcae105c29cf6498f4a37461e9567427598418d9`, CI44287863643 Android and release-audit PASS. Optimized R8 releaseCheck/payload/official signer/alignment and730-date/32-release-state audit PASS; broad web is still running, aggregate not claimed green.
- Real Android35/x86_64 Pixel2 emulator: app instrumentation PASS, native1080×131 BannerAdView, one request→loaded→shown, SDK integration analyzer SUCCESS. Test uses real WebView/Capacitor/SDK, not controlled transport. The first corrected workflow then failed in an unrelated Cordova library instrumentation duplicate-class check after the app test had passed. Correct the workflow to `:app:connectedDebugAndroidTest` and retain the native capture via MediaStore through Gradle test uninstall; no application change in4f4d34f. Final app-only run44288670259/job134747858855 SUCCESS: real SDK loads/shows, native screenshot retained and visually reviewed. Demo creative is below app navigation and above Android three-button system navigation with no critical control overlap in this Home state. See [native frame](evidence/banner-webview-0391/native-banner.png).
- Exact delivered playtest:0.39.1/code57,11,544,358bytes, SHA256 `feee53561cee563c830d991665c45cb39fe00f0edce27927dcf34f3db7bd72e0`; compatible certificate `533aa2ff18337e3b3630c1363e7fe49f98e6b21371ce715689d2cbbf2e45ea36`, v2 verified, same package/permissions and byte-exact embedded current web/schema. Test ads, analytics OFF. See [build verification](evidence/banner-webview-0391/build-verification.json) and [native runtime](evidence/banner-webview-0391/native-runtime.json).
- [Arrows-0.39.1.apk](https://chatgpt.com/library?file_id=libfile_fde3_f-6024edcc7af081919a0b2e5633f01588_2841ca9da26c8191b7a266fa9b41a810&account_id=personal). Install over the prior playtest to retain its progress. Actual phone/live-ID fill, OEM safe areas, gestures/update/performance remain separate; no production/store publication.

KIT IMPACT REUSE: `resolveNativeSafeAreaCss` and `resolveNativeBannerPlacement` at unchangeda9325265e87583a4872cf6a158e1e881a0d7508e. Relevant native banner and Android lifecycle contracts were inspected; fractional geometry was supplied incorrectly by this consumer. No kit/pin/store changes.
