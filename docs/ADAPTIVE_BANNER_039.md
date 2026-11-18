# Adaptive Android banner — 0.39.0 / 56

Owner authorized adding the missing banner on 2026-11-18 and supplied the repository secret name `YANDEX_BANNER_AD_UNIT_ID`. This supersedes the historical no-banner baseline only; portrait-only Android, rewarded/interstitial cadence, attempts/content/saves/rights, signing and dependency pins remain unchanged.

## Integration and layout

- Production uses its separate required banner secret; debug/playtest and releaseCheck use `demo-banner-yandex`, analytics OFF in playtest. No live ID is written into source/logs. Release validation requires three valid distinct unit IDs; Store workflow passes the banner secret to Gradle. No automatic store publication.
- Yandex Mobile Ads remains pinned8.6.0. Use its actual `BannerAdSize.inline(context,widthDp,50)`/`BannerAdView` APIs (verified against the pinned SDK class signatures and official SDK8 documentation), with measured native height and no creative cropping. SDK initialization/privacy settings remain shared with the existing ads plugin.
- Reuse `resolveNativeSafeAreaCss` and `resolveNativeBannerPlacement` from the installed kit pin `a9325265e87583a4872cf6a158e1e881a0d7508e`. Width mapping is WebView native width/CSS viewport width; Android density is only used for the SDK's dp. Native view/root offsets, system bars/cutout and CSS/native height rounding participate. Native final containment/measurement-token/revision guard rejects obsolete placement.
- One neutral bottom reservation, including an8CSS-pixel separation and one safe bottom owner. Footer/nav/Home/Calendar/Collection/results move above it. Canvas stays full viewport, actual camera interaction/fit area follows measured footer and native side exclusions. Dialogs retain full real safe bounds. No double safe bottom, permanent contrasting placeholder, arbitrary orientation/45CSS-pixel cutoff or dependency upgrade.
- First theme-choice Home retains its full safe viewport with no ad reservation or request; gameplay then reserves normally while the tutorial keeps the creative hidden. Reserve before SDK load and retain through loading/no fill/modals. Do not move controls under a held pointer. Recompute on slot/viewport/native geometry and safe-inset changes, with one in-flight measurement. Ordinary 250ms surface updates only reconcile changed eligibility; no per-frame/native polling.
- Hide in startup/recovery/tutorial/theme welcome, dialogs/Settings, background/unfocused/external windows and fullscreen ads; preserve space. Native fullscreen guard additionally hides before show invocation. Current UI state is authoritative on return. Optional service failures never own game progress/readiness.
- A second pass reproduced a daily CTA/nav collision and an obscured Collection action in a short browser window with150% text, plus decorative emblem overlap on a small portrait. Short-window Home uses two action columns; Collection yields its secondary note/decorative art; the Home emblem yields to actual container height and stops hidden motion. Critical text/targets and portrait-only Android policy remain intact.
- SDK view is main-thread owned. Width replacement invalidates old callbacks; loading failures/timeouts have a30s retry delay, including resize during backoff. A late callback cannot show an obsolete view or reopen the banner over a dialog. Inset/layout/focus observers and SDK resources are torn down. Actual fill remains a device/network check.

## Measurement and verification

`banner_event` separates native request/load/error/shown/hidden/click/impression from geometry negotiation. SDK ILRD is forwarded through existing `ad_impression_value` with format banner; missing value stays unknown. No fake impression, revenue, fullscreen opportunity or help attribution. Generated40-event TS/native contract stays exact.

Final264 unit/type/build/sync,80 related browser+2 short-window regressions,12 actual-APK meta states,30JVM/same-certificate APK/R8/official checks and730-date/32-release-state audit PASS.295-frame13.31s actual APK-web GIF/actual-audio video saved; native creative is not rendered in Chromium. Latest full web CI remains running; aggregate is not GREEN. Exact source/artifact hashes, final downloads and provenance: [acceptance](evidence/adaptive-banner-039/ACCEPTANCE.md).

Native phone acceptance remains separate: actual demo/live fill, gesture/three-button navigation, cutout, background and SDK/external return, real creative/control non-overlap, installation/update and performance. No phone emulator/device is claimed unless recorded.

KIT IMPACT REUSE: existing inverse safe-area and placement primitives plus current compact-banner/lifecycle recipe. Adapter is Arrows-owned; no kit write or pin upgrade.
