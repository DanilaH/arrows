# Content pilot0.29.0 / code42 — verified test delivery

Application source: [4c0956c](https://github.com/DanilaH/arrows/commit/4c0956c744c638148f7cdb97d697d7ea1241ea98), based on53a761a. Main published content/dated generation and0.28 normal help unchanged. Scope and human protocol: [CONTENT_PILOT_029.md](../../CONTENT_PILOT_029.md).

## Checks

| Check | Observed result |
| --- | --- |
| Typecheck / unit / production build | PASS;215tests in27files; isolated harness absent |
| Existing focused browser regression |26PASS: campaign rendering, comfort, B1; source unchanged since run |
| Final pilot browser suite |10/10PASS, phone+desktop: entry/return, exact main-save isolation, errors/reload, independent comparisons, legal completion/Next,3-error loss/restart, narrow320×568 Canvas/reduced motion |
| Native bridge isolation | No ArrowsAds/ArrowsAnalytics calls in pilot; pre-existing pending receipt untouched |
| Frozen source comparison | Published campaign/daily/generated/silhouette sources byte-identical to53a761a |
| Offline generation |648bounded candidates;27nominations reproduce byte-for-byte; every field strict geometry and independent DAG/three-order checks |
| Android |Sync PASS; hosted19JVM PASS; debug and signed.playtest builds PASS |
| Full hosted web suite |43719550404 still IN PROGRESS at preparation; not claimed green |

Earlier non-acceptance runs and observer fixes are preserved in test-results.json. Bots prove legality and structural contrast only; human enjoyment/actual difficulty/return motivation are HOLD.

## Compatible artifact

[Arrows-0.29.0-playtest.apk](https://chatgpt.com/library?file_id=libfile_fde3_f-904b1b665ea08191a9a4e82b5bcc0adf_2841ca9da26c8191b7a266fa9b41a810&account_id=personal) · `10595129`bytes · SHA256 `fb263898292e8ac712b0de7ed7d1e1369eeb8b5c56a8c0f91c85898de2bca279`.

`com.danilah.arrows.playtest`, code42; official apksig V2 verification PASS, same certificate `533aa2ff18337e3b3630c1363e7fe49f98e6b21371ce715689d2cbbf2e45ea36`. BuildConfig extracted from actual DEX: AD_MODE=test, demo-rewarded-yandex/demo-interstitial-yandex, analytics key empty. All22recorded production payload files match APK byte-for-byte; extra Cordova adapters empty. See build-verification.json. This proves package/key/payload compatibility, not a physical install test.

Open Settings → Testing → Challenge pilot. RU: Настройки → Тестирование → Пилот сложности. Back opens27-field picker; Compare selects frozen counterpart; To campaign returns to same profile. No real calendar dates/cups are unlocked by these previews.

## Real behavior recordings

- Current daily vs candidate daily: [silent GIF](https://chatgpt.com/library?file_id=libfile_fde3_f-1a4bf93948f48191a6308d0707f953b3_2841ca9da26c8191b7a266fa9b41a810&account_id=personal), [actual sound MP4](https://chatgpt.com/library?file_id=libfile_fde3_f-fb86d86ca9308191a3ec2e3682a45bcb_2841ca9da26c8191b7a266fa9b41a810&account_id=personal).
- Short breather → Hard → Nightmare: [silent GIF](https://chatgpt.com/library?file_id=libfile_fde3_f-36c334d6f5688191b8da842d0b9dc46c_2841ca9da26c8191b7a266fa9b41a810&account_id=personal), [actual sound MP4](https://chatgpt.com/library?file_id=libfile_fde3_f-80fd25b061a081919769666ceb246b34_2841ca9da26c8191b7a266fa9b41a810&account_id=personal).

Source: unmodified web files from exact APK source, real Chromium390×844/DPR1.5, actual WebAudio output and timestamped CDP frames. Controlled native storage/audio observation, disabled pilot services, scripted legal clicks; no synthetic gameplay frames, no SDK video, no human playtest. Captures are9.3s comparison and12.1s campaign; actual frame counts/times/result snapshots and source hashes in capture-manifest.json. Main wins remain0, native analytics events0. Audio comparison has nonzero actual output (mean−42.5dBFS/peak−16.8dBFS).

## Separate pending acceptance

Physical phone install/update, vibration quality, speaker/audio-focus, FPS/frame pacing/memory/thermal: **NOT RUN**. Actual SDK inventory, AppMetrica dashboard and real money: **NOT RUN**. No commercial/service claims. Human comparison and rollout to future fresh assignments/dates: **HOLD**. Neither blocks this installed-artifact engineering delivery.

KIT IMPACT: **REUSE** — existing dense offline constructor, Board/control renderer, activity/storage/feedback primitives and pinned content-quality methodology. Runtime a9325265e87583a4872cf6a158e1e881a0d7508e/guidance e04a3fe87ca93d506e01df4acc5afe690408cefa unchanged. No kit/store publication; no generic director, currencies or reward experiment.
