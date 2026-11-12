# Phone playtest feedback — 0.17.0

User authorization: fix missing vibration, replace the chiptune-like audio, strengthen thin/small arrows and make bottom navigation unlocks match the original. Presentation and a separately installable phone preview; no content/rule/save migration.

## Changes

- Confirmed native bug: Capacitor 8.6 `PluginCall.getLong` accepts only Java Long. JSON generation 0/1 is Integer, so every pulse fell back to -1 and failed freshness/cancellation checks. Read Number with nonnegative, integral, finite, JS-safe bounds for both pulse/cancel. Existing generation, foreground, 250ms freshness and 60ms throttle remain. Seven distinct finite profiles are modestly stronger. Settings includes an independent vibration preview; device hardware/system policy still needs actual acceptance.
- Replace bright harmonic beeps/arpeggios with original damped inharmonic body/filtered-air cues and a simultaneous warm finish bloom. Removal chain pitch varies only 1–1.14 rather than 1–1.667. Keep lazy cached buffers, six-voice budget, mute/background/ad cancellation and no stale replay. PCM safety/energy and semantic lifecycle tests establish technical behavior, not subjective quality.
- Home SVG fits all original occupied bounds with a fixed margin, never the shrinking remaining bounds; keep honest next-field/final previews. Larger responsive presentation, stronger contrast and size-adapted line weight. Board shafts use min 2.8 CSS px / .14 cells; heads are bounded to .64 cells to keep adjacent paths separate. Small-field initial spacing 18→22 CSS px; large-field fit/pan/zoom policies unchanged. Embedded geometry and relative saved camera authority stay intact.
- Original V06 `video_2026-11-08_20-55-06.mp4` at 00:57 directly reviewed: full lock icons, visible Level20/Level10 captions and an icon selection pill. Replace tiny numeric badges accordingly; RU captions read Уровень 20/10. Exact availability remains current level20/10 (indices19/9), not ten/twenty completed wins. Stable nav element identities, disabled behavior, accessibility reasons and earned new-dot handling remain.

## Safe phone delivery

The previous same-package debug APK signing key is unavailable; never ask the player to uninstall progressed builds. `-ParrowsPlaytest=true` explicitly produces `com.danilah.arrows.playtest`, launcher label **Стрелки · Тест**, forced demo ad units and empty analytics key. It installs alongside the old app with independent fresh progress. Normal package remains unchanged. Release rejects this option. CI explicitly supplies a workspace keystore cached separately from the previously ineffective home-directory cache; verify the saved artifact/certificate and cache outcome before claiming future update continuity. This is not production signing/store acceptance.

## Verification

Local strict check/build: 93 TS tests pass. Relevant browser checks cover ambiguity/touch, native-independent settings, cancellation/contact/victory and responsive unlock boundaries. Native sync passes. Full CI/JVM/APK and exact capture evidence are recorded in the follow-up handoff/verification record after completion.

Capture tool: `node tools/capture-phone-feel-gifs.mjs`. Unmodified production browser; fresh storage, three touch-earned wins, actual c03 preview, locks, Settings test, blocked contact and finish. Sound MP4 tees actual AudioContext output, without replacement sound. Internal seeded late-field/layout images are QA only and must not be delivered as earned play. No physical vibration, human enjoyment or native install/update claim follows from browser/JVM success.
