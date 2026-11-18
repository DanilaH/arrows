# Automatic daily reminders — 0.38.1 / 55

Owner correction on 2026-11-18 supersedes the optional/editable reminder policy of DAILY_ENGAGEMENT_038.md. Reminders are an automatic part of unlocked dailies. Android permission and the notification channel remain authoritative; refusal never blocks play or triggers repeated requests.

- Request the OS permission once when level 20/dailies are available, after durable save loading and navigation/dialog/external-activity barriers settle. No extra in-game opt-in, victory prompt, time input or reminder switch.
- Fixed local-calendar slots: approximately 13:00 and 19:00. The evening slot remains eligible only while today's daily is incomplete. Each slot has its own durable claim, written before posting. One shared notification ID; an unread lunchtime card is updated quietly in the evening rather than stacked.
- Completing today's daily cancels the outstanding alarm/visible reminder and skips the remaining slot. Recheck the root-bound durable projection, permission, foreground and finite lateness at delivery. No archive-based reminders after today's completion.
- Preserve local calendar behavior across midnight/year/DST/timezone changes. Backwards clock changes do not replay a claimed slot. Native version 1 reminder state migrates to version 2 without changing progress/snapshot/pending tap; old per-day claims conservatively count as the evening slot. Previously enabled players retain the recorded permission request. Remove obsolete custom time/opt-in fields. Android denied/off channel stays off.
- Settings only explains the fixed schedule and current Android permission, with an Android settings link/retry for capability errors. Browser and isolated review/pilot remain free of simulated production notifications.
- Shared daily destination, exact campaign return, cup counts, stale/cold/warm tap handling, content/save schema/earned rights, advertising cadence, signing and runtime pins remain unchanged.

## Verification

Local typecheck/build and 263 pre-existing unit cases initially PASS. Added automatic-request serialization/denial coverage and targeted browser/native policy coverage; final counts/build evidence are recorded in HANDOFF/evidence after completion. Initial local browser launch could not start because the expected Playwright binary was absent; rerun uses the installed Chromium, not a game failure.

Physical Android permission UI, AlarmManager delivery/Doze/OEM restrictions, reboot and tap acceptance remain NOT RUN unless executed on a named device. No notification-delivery claim follows from browser mocks or JVM scheduling tests.

KIT IMPACT: REUSE. The existing LOCAL_REMINDERS recipe supplies the durability/OS/lifecycle boundaries; initial policy/time/frequency remain consumer choices. No kit changes or pin update.
