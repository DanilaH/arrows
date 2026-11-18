# Stable native banner —0.39.2/code58

Owner asked to stop banner flashing during scene changes. Baseline7baa59b / applicationdcae105 (0.39.1) remains the source of truth for safe fractional WebView measurements, live/demo configuration, portrait and pinned dependencies.

## Confirmed cause and change

The banner already has a stable DOM reservation and one independent native host. The surface nevertheless made it ineligible whenever routeBusy was true; the250ms refresh and screen mutation then called native apply(visible:false), followed by a show after the animation. An ordinary scene-transition regression failed on both phone/desktop against0.39.1. Internal next-level ad-transition holds also hid it even when no fullscreen ad was selected.

Remove only those internal presentation/navigation exclusions from banner eligibility. Menu and ad-transition reasons are allowed for the banner; actual ad, Settings/dialog/trophy, visibility/native background and all other reasons still exclude it. Subscribe to the pinned coordinator's onBlockReasonsChange, so adding a real external blocker to an already blocked menu/navigation state is observed immediately. Do not delay hiding, change the native safety proof or grant scene callbacks any ad/progress authority.

Ordinary Home/Collection/Calendar/game changes and next-field advancement without fullscreen advertising keep the same loaded SDK view/request/reservation. Tutorials, initial theme selection, modal windows, fullscreen preparation/show/external return, invalid/inset/width changes retain their existing hiding and geometry rules. SDK-managed creative refresh remains SDK-owned. Rewarded/interstitial eligibility, saves, content, earned rights, reminders, signing, SDK8.6.0 and kit a9325265e87583a4872cf6a158e1e881a0d7508e are unchanged.

## Verification plan and provenance

- Browser: actual game with controlled native transport, test absence of hide calls throughout animated scenes and no-ad next-level hold; retain all existing banner safety regressions.
- Native: real Android35 WebView/Capacitor/Yandex demo SDK, actual legal tutorial tap, then six animated Home↔game transitions. Probe native pre-draw frames for visibility and assert identical SDK view, request ID and generation; Settings must still hide and restore. No seeded progress or substituted creative.
- Native screenrecord/GIF: capture the actual Android display during the six transitions, with animations enabled. Native screenrecord is silent; no browser/creative mock or audio overdub.

Local checks:264 unit/typecheck/build and Android sync PASS.22 existing/scene browser cases PASS plus2 corrected no-ad next-field cases PASS. The first next-field fixture incorrectly supplied a cleared board without its matching win and was rejected by the save decoder; the corrected test starts with one arrow and clears it through real input. No application change was inferred from that fixture error.

Native run44291763071/job134758464311 SUCCESS on application7f58981:6 animated Home↔game transitions,44 observed native pre-draw frames,0 hidden native frames, identical SDK view/request/generation. One actual legal tutorial tap, fresh unseeded progress, real Yandex demo SDK creative. Settings subsequently hid and restored it as required. Android31JVM/debug/playtest/R8releaseCheck and official payload/signer checks PASS; release-audit730dates/32states PASS. Broad web is still running; aggregate CI is not claimed GREEN.

The native screenrecord has45 actual source frames/6.467s. Its first8frames precede the SDK creative's initial paint, although the loaded native view is already visible. The delivered GIF/video use one contiguous segment from1.724022s through the end, after that first paint; no intermediate frames are removed. All37 remaining original frames retain a non-empty actual banner band (native1080×130 atx0/y1660, pixel standard deviation84.426–84.699). This initial creative loading is separate from scene hiding. GIF has76 encoded frames at16fps, including ordinary frame duplication from the original variable-frame-rate screenrecord; silent native emulator footage, no synthesized UI or audio. These are emulator checks, not physical-phone frame-pacing/live-fill acceptance.

Exact playtest:0.39.2/code58,11,544,362bytes, SHA256 `0433e52c06f9bf16055291498b37f40395875c806be878620522ec4d6a474045`; same `.playtest` package and `533aa2ff18337e3b3630c1363e7fe49f98e6b21371ce715689d2cbbf2e45ea36` certificate, v2 verified. All31 embedded public files/current40-event schema checked exactly; unchanged permissions, test ads, analytics OFF. See [build verification](evidence/stable-banner-0392/build-verification.json), [native continuity](evidence/stable-banner-0392/native-runtime.json) and [native frame](evidence/stable-banner-0392/native-banner.png).

[Arrows-0.39.2.apk](https://chatgpt.com/library?file_id=libfile_fde3_f-55e06a6437288191a42d8ec95e88e37d_2841ca9da26c8191b7a266fa9b41a810&account_id=personal) · [Native transition GIF](https://chatgpt.com/library?file_id=libfile_fde3_f-3a281a1515e08191ae5851a8f809e92c_2841ca9da26c8191b7a266fa9b41a810&account_id=personal) · [Silent native video](https://chatgpt.com/library?file_id=libfile_fde3_f-868e43957fdc8191b232b37ab844f2da_2841ca9da26c8191b7a266fa9b41a810&account_id=personal).


KIT IMPACT REUSE: existing persistent banner geometry and granular activity-blocker contract from the unchanged kit. This is Arrows presentation policy, not a shared-kit defect; no kit/store publication.
