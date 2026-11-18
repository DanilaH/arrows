# Adaptive banner 0.39.0 / 56 — acceptance

Final application source `0a60e621e65cb08753236829ebb8eed9e809ac9a`, tree `1aed2c9147d982c7f3979c355ad90b5c5b2cd539`, above initial implementation `1fdffed` and prior main `99d3bde`. The following QA/documentation-only changes have the identical application runtime. Owner authorized a missing native banner and the `YANDEX_BANNER_AD_UNIT_ID` secret. See ADAPTIVE_BANNER_039.md.

## Behavior and containment

Compact adaptive SDK banner below gameplay/menu navigation, measured native height, stable neutral reserve and single system-bottom inset ownership. Pinned kit inverse-safe/placement helpers; native current-token/revision/whole-pixel containment. Actual native coordinates and SDK dp remain distinct. First theme choice retains full safe viewport/no slot; tutorial reserves but hides ad. Dialogs/background/unfocused/fullscreen ads hide creative without moving controls. Width changes invalidate old SDK callbacks;30s load retry/backoff. Campaign/daily geometry, rights/progression, fullscreen cadence, portrait-only native policy, SDK/kit pins and signing preserved.

Confirmed small/enlarged UI failure cases were corrected: on844×390 with150% text the daily entry and Collection month action could be covered by nav; Home uses action columns and Collection yields secondary note/decorative art. On320×568 the emblem could overlap the title; it now follows actual menu height and stops while hidden. Functional text/targets remain readable. These are responsive-layout changes, not a new game or native-landscape policy.

## Verification

- `npm run check`:264 tests/32 files, exact40-event schema/typecheck/build PASS; final native sync PASS.
- Related final browser run:80/80 PASS in2.8min. Additional regression2/2 PASS for enlarged short Home/Collection hit targets and stopped decorative motion (82 distinct scenarios). Coverage includes safe-bottom ownership, SDK pixel→40/60/80CSS-size negotiation, side insets, no per-tick native measurement, held-pointer resize, stale measurement over Settings, full first-theme viewport, tutorial/disabled/browser/pilot states, existing one-interstitial daily transition and external return.
- Final signed-APK web:12 additional Home/Calendar/Collection states across RU/EN, light/dark, compact/normal/short browser and150% copy PASS; real initial hit targets checked before any automation scrolling. Synthetic CSS scaling is not Android system-font acceptance. Screens inspected locally; screenshots are not phone evidence.
- CI [44280559935](https://github.com/DanilaH/arrows/actions/runs/44280559935): Android job `134719789722` SUCCESS,30 JVM tests/0 failures, same-cert playtest/debug, fail-closed production configuration, R8 releaseCheck and official payload/DEX/bridge/v2/zipalign checks PASS. Independent archive/release-audit SUCCESS:730 actual daily dates, exact reload/rights/lifetime gift,32 release-web states. Full hosted web repeat remains RUNNING at delivery; aggregate CI is not reported green.
- Playtest ZIP digest matches published `f36371378fced73f4a3352cb80c7a6e79348f2c770498408a656681f218e7dbe`. APK11,544,066bytes, SHA256 `5821369b65b4f5855fda1a29363d9b49151c56733aad48addf6b9171a730c556`, package `com.danilah.arrows.playtest`,0.39.0/code56. Certificate `533aa2ff18337e3b3630c1363e7fe49f98e6b21371ce715689d2cbbf2e45ea36` matches previous delivered playtests; v2 verified. All embedded web files and40-event native schema match final local build byte-for-byte. Three demo ad IDs present, analytics OFF, permissions unchanged from0.38.1. ReleaseCheck is separately test-signed non-production.
- Current APK-web recording:295 real Chromium/CDP frames,13.31s, RU/light390×844 DPR1.5; real pointer input/three legal last moves of a prepared280-arrow daily, actual game audio/no overdub, confirmed cup result/Settings hide-return/campaign identity preserved. Calendar clock fixed2026-11-18, earned profile prepared. Native banner geometry/visibility replies controlled; **the native SDK creative is not rendered in Chromium**. No SDK fill/impression/device/revenue claim. Initial recorder warm-up coordinates were moved before reservation settled; the recorder now waits for the actual reserved state before warming audio. No game fix was inferred from that observer race.

## Downloads

[Arrows-0.39.0.apk](https://chatgpt.com/library?file_id=libfile_fde3_f-d80b9b66df8c81919d1a70bb3b2dd7d2_2841ca9da26c8191b7a266fa9b41a810&account_id=personal) · [Arrows-0.39.0-banner-audio.mp4](https://chatgpt.com/library?file_id=libfile_fde3_f-51d2f718def0819196f3d46898a29a02_2841ca9da26c8191b7a266fa9b41a810&account_id=personal) · [Arrows-0.39.0-banner.gif](https://chatgpt.com/library?file_id=libfile_fde3_f-93e7d451449c819187ea34389e7d3e70_2841ca9da26c8191b7a266fa9b41a810&account_id=personal)

## Remaining physical boundary

Actual demo/live creative load/no-fill/refresh, native visual/control non-overlap, gesture/three-button/cutout navigation, SDK/external return, install/update, sound/haptics/frame pacing and live AppMetrica/revenue: NOT RUN on a named physical device. System-notification delivery acceptance from0.38.1 also remains separate. Production build uses the owner's separate banner secret through the existing manual Store workflow; no store publication or secret-value extraction occurred.

## Kit impact

REUSE: `resolveNativeSafeAreaCss`/`resolveNativeBannerPlacement` at unchanged pin `a9325265e87583a4872cf6a158e1e881a0d7508e`, plus compact banner/lifecycle guidance at `a4ec33f10038331dce3bf105349f1216bc3c73a0`. No shared-kit modifications or invented runtime exports.
