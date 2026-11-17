# 0.38.0 acceptance

Implementation above 17c829f / 0.37.1. Final source, hosted builds, APK hash/certificate, current recordings and final results will be appended after execution. Do not infer final GREEN from this placeholder.

- Previous baseline CI44081220764 is now completed SUCCESS, checked before new implementation.
- Initial 262 unit / type / build PASS. New destination/calendar/projection/durable-witness and optional bridge-failure tests included.
- Initial browser pass: 17/20, three new scenarios clicked before their asynchronous game entry/route was settled. Actual game snapshots and traces examined; explicit screen/mode/settlement waits corrected. Final affected repeat pending.
- Native policy JVM tests added for DST/calendar/year/leap, completed/locked/foreground/expiry/rollback suppression, bounded truthful text rotation and future-window proof. Native compile/execution pending hosted build.
- Physical Android notification delivery/permission/Doze/OEM/boot/tap/update, haptics/performance: NOT RUN.
- Production IDs, dashboard / money / production-signed APK / store publication: NOT RUN. Existing private signer unchanged; no private material in this package.

## Follow-up before final APK

- 60 affected browser cases PASS (daily entry, Home/Calendar, settings, existing cup/unlock arrivals and UI motion), both browser projects. Added 4 unmodified-production-bundle cases PASS: existing interstitial consumed once, external SDK/background barrier, cold pending bridge entry re-resolves today's saved win to yesterday and preserves it.
- Additional compact-layout cases passed hit/bounds checks, but visual screenshot inspection found overly narrow landscape result text. Added a scoped two-column short-window layout; native portrait policy unchanged. Final screenshots/repeat pending.
- 263 unit tests PASS, including in-flight publication proof. ProgressStore now publishes the confirmed root witness TOGETHER with its matching state, rather than exposing the repository's intermediate token. Daily entry awaits an accepted campaign view write before switching; a failed view save stays on the current screen.
- First hosted run44148431444: Android source COMPILED, all four new policy JVM tests PASS; 25 JVM tests ran, one existing analytics test failed because its explicit count was still38 instead of39. Corrected the count; this first Android job is FAILURE, not a successful APK delivery. Final hosted repeat pending.
- UI bridge simulations are not proof of native permission/alarm/broadcast delivery. They run actual web behavior with controlled native responses; physical statuses remain NOT RUN.
