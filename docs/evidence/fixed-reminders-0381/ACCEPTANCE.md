# Automatic fixed reminders 0.38.1 / 55 — acceptance

Source: `2f550199f031512ca5b61eb2b59427b80e6de2f2`, with application tree `2c970b04577d910ad0483604f451b53c788009e4`, above `45721cc`. Owner correction: automatic OS-only notification permission; fixed lunch/evening slots, no time picker or in-game switch. See DAILY_REMINDERS_0381.md. No game-save/content/rights/advertising-policy or runtime dependency change.

## Verified

- `npm run check`: typecheck, 264 tests / 32 files and production build PASS. `npm run android:sync` PASS.
- Final affected Chromium phone/desktop run: 20/20 PASS (1.2 min), covering automatic request after unlock, denied permission/reload/no reprompt, external activity, no obsolete controls, current-state cold/warm taps, exact campaign preservation, cup progress and the existing one-ad result continuation.
- Eight additional RU/EN × compact/normal portrait × ordinary/enlarged text states PASS: no setting overflow, no switch/time field, Android-settings link stays visible/hittable with minimum 44 CSS-pixel target. Screenshots were inspected locally; not claimed as device frames.
- Native CI [44269599659](https://github.com/DanilaH/arrows/actions/runs/44269599659), Android job `134682591714`: SUCCESS. 27 JVM tests PASS, debug and compatible `.playtest` APK built; production config fails closed; optimized R8 releaseCheck and official payload/DEX/signature/zipalign checks PASS. ReleaseCheck is a separately test-signed non-production package.
- Downloaded playtest ZIP matches published digest `10f1751ad9c855c36400eaccba572deec13f07cbdd03e01187f6d0a255bbecff`. Extracted APK: 11,530,918 bytes, SHA256 `247b8c75b3c7da19e848e60121ece5d753363b117ec995248c97ba8c951efe03`. Version 0.38.1/code55, package `com.danilah.arrows.playtest`, same certificate `533aa2ff18337e3b3630c1363e7fe49f98e6b21371ce715689d2cbbf2e45ea36`, verified v2 signature. All embedded web files and the 39-event native analytics schema match final local source build byte-for-byte. Demo ads and analytics OFF.
- Genuine current-APK-web capture: 292 frames / 13.32 seconds, actual pointer input/three legal moves/actual game audio/no overdub, 390×844 DPR1.5, RU/light theme. Prepared campaign and dated 280-arrow daily with three arrows left; fixed local date 2026-11-18; controlled native replies. Shows daily result/cup, settings with fixed 13:00+19:00 information, no opt-in/time controls, and exact campaign return. One permission bridge request. Chromium capture, NOT phone notification-delivery proof. `ffprobe` confirms video and audio streams; result/settings screenshots inspected.

## Downloads

[Arrows-0.38.1.apk](https://chatgpt.com/library?file_id=libfile_fde3_f-8a89293bb7048191845a4ccc71f07135_2841ca9da26c8191b7a266fa9b41a810&account_id=personal) · [Arrows-0.38.1-daily-audio.mp4](https://chatgpt.com/library?file_id=libfile_fde3_f-cb2ef06528cc8191a196709575cc36cf_2841ca9da26c8191b7a266fa9b41a810&account_id=personal) · [Arrows-0.38.1-daily.gif](https://chatgpt.com/library?file_id=libfile_fde3_f-610e93c16e4481918fd87a4ee72835bb_2841ca9da26c8191b7a266fa9b41a810&account_id=personal)

## Limits

Full hosted web repeat and independent release-audit job remain RUNNING at delivery; do not report aggregate CI green. Local first browser attempts were environment launch failures (missing expected browser/full Chromium requires an unavailable socket); project-pinned headless shell subsequently ran all final cases successfully. No application change was needed for the test environment.

Physical Android permission dialog, actual AlarmManager notification posting/clearing/tap, Doze/OEM/boot and install/update/runtime performance: NOT RUN. Official signing/payload checks establish artifact compatibility, not an actual phone update. Live production services/store publication: NOT RUN.

KIT IMPACT: REUSE of the existing local-reminders production recipe; fixed times/frequency/permission prompt timing are Arrows policy. No kit changes.
