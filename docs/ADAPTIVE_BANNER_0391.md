# Missing Android banner —0.39.1/code57

Owner reported that the0.39.0 banner never appeared. This is a confirmed consumer integration defect, not an inferred no-fill/network problem.

## Reproduction

`BannerRuntimeTest` starts the actual APK on Android35/x86_64 Pixel2, enters a fresh campaign and returns to ordinary Home. It uses the real WebView, Capacitor plugin and pinned Yandex8.6.0 SDK; no transport/creative substitute. Source02df765c7f632fbce3956e72df6081c1afd0731a, run44286629458, job134740855139 failed with sdkReady=true, focus=true, width=0, height=0, requestId empty. Every native measure rejected: window.innerWidth412 versus DOM slot width412.19049072265625; analogous height660 versus660.1904907226562. No SDK request had been sent. Artifact14418944566 archive SHA256f09071a512a9236a28dcdd0c50cfb81677bd98b712239dd28eab4a1e40002fa0 contains full native log/test report/frame.

## Correction

The HTML root is the existing100% full layout viewport with no transform/scroll. Read its fractional getBoundingClientRect width/height, in the same CSS coordinate space as the slot, throughout native admission and the pinned kit inverse-safe/placement calculation. Preserve native whole-pixel mapping, containment, current proof and system safe bounds. Do not add a tolerance that allows creative outside its root.

Native revision parsing now accepts JSON Integer/Long/integral Number and rejects invalid/unsafe counters. A JVM regression uses actual JSONObject decoding. Debug-only native phases/error codes distinguish no request from SDK load failure without exposing configuration values. No live ID, progress, content, rights, ad cadence, dependency, portrait, signing or notification changes.

The browser regression uses fractional CSS edges with rounded window dimensions and a faithful native width admission guard. The native runtime test requires a real SDK load and a visible BannerAdView in the Android hierarchy, then captures the native screen. Service-network failure is reported honestly rather than replacing it with a browser mock.

## Verification

Initial repro is confirmed FAIL. Corrected validation/build/SDK runtime and final artifact details are pending.

KIT IMPACT REUSE: `resolveNativeSafeAreaCss` and `resolveNativeBannerPlacement` at unchangeda9325265e87583a4872cf6a158e1e881a0d7508e. Relevant native banner and Android lifecycle contracts were inspected; fractional geometry was supplied incorrectly by this consumer. No kit/pin/store changes.
