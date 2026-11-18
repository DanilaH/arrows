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

Results, exact APK identity and native continuity/capture are pending.

KIT IMPACT REUSE: existing persistent banner geometry and granular activity-blocker contract from the unchanged kit. This is Arrows presentation policy, not a shared-kit defect; no kit/store publication.
