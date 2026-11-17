# Daily entry and local reminders — 0.38.0 / 54

Owner authorized this package above current 0.37.1, preserving its first-theme Home, portrait policy, archive storage, brand/signing and all content/help/ad rules. No store publication. Runtime kit pin stays `a9325265e87583a4872cf6a158e1e881a0d7508e`.

## Player behavior

- One shared destination on Home, result and notification tap: today unfinished (resume its exact embedded attempt); otherwise nearest earlier unfinished available date, descending through the current month then earlier months; never future. If every available daily is completed, show “New daily tomorrow” and open Calendar. Gate remains campaign index 19 / level 20.
- Compact Home secondary action under campaign progress. Result secondary uses the SAME existing result/interstitial opportunity and terminal/external-activity barrier as Next. It does not advance the campaign to switch modes. When returning to campaign, existing next-selection behavior applies exactly once.
- Daily result shows confirmed month count / full month denominator and actual earned-cup status. Daily entry from these shortcuts returns directly to campaign via the primary result action; ordinary Calendar entry retains Calendar return. HUD Back still opens Calendar. No new reward or meta system.
- Android only: offer once after a saved current-day daily win becomes visible. No automatic permission prompt. Optional button requests Android permission and records the player's preference; blocked permission/channel is shown with a link to system settings. Time defaults to 19:00 local and is editable. Disable anytime. Browser has no simulated notification settings.
- At most one local reminder per day; suppress today's completed daily even if archive dates remain unfinished. Four generic texts plus eligible started/month-progress/one-remaining variants rotate, avoiding recent three when alternatives exist. No invented duration, fake urgency, daily-only streak claim, or premature cup promise.

## Authority, durability and native delivery

The archive root and schema2 state remain unchanged. A separate optional native AtomicFile stores preferences, recent template IDs, last delivery day, one schedule, and pending tap. A small read projection is bound to SHA256 of the EXACT confirmed archive root/inline document, captured synchronously with its validated state before hashing. It contains only dates and unlock status, no geometry, lives, receipts or rights. Root publication, projection and receiver evaluation share the existing process-wide serial disk queue. Root replacement cancels the stale alarm and visible reminder before replying; optional cancellation failures never turn an already committed game save into a failed save. Receiver rechecks the actual durable root hash immediately before claiming/posting. Stale, absent, unreadable or uncertain progress fails closed until a fresh validated projection is published.

Detailed completed/started dates cover this month and next. `lastCompleted` is the maximum date of ALL durable daily wins. Beyond the detailed window, only dates after that maximum are provably unfinished: generic texts remain eligible indefinitely through the existing 2200 calendar limit, without manufacturing counts. Future saved wins from a clock change conservatively suppress the uncertain interval. Days before projection coverage are suppressed. Opening the game reconciles the full validated save and refreshes this projection.

Native inexact `AlarmManager.setAndAllowWhileIdle`, one next local-calendar occurrence; no server, FCM, exact-alarm permission or background JS timer. Receivers reconcile after reboot, package update, clock/timezone change. Normal resume/preferences/committed progress also reconcile. App/channel permission is checked again at delivery. Foreground/visible process includes external SDK activities. Delivery later than three hours or on another calendar day is discarded without backlog. Claim last delivered day BEFORE notify: process death in that gap can miss a reminder, but cannot duplicate it. Clock rollback never replays an earlier claimed day. Force-stop / OEM battery policy can delay or prevent delivery; preference text explicitly allows timing variation.

Immutable explicit PendingIntent opens the existing singleTask portrait Activity. Cold intent and warm onNewIntent persist one nonce. JS consumes only after accepted current-state routing (or normal locked Home). Save load/recovery, settings/dialogs, SDK/external foreground, result transition and durable writes are respected. Failed generation stays retryable with a bounded five-second retry delay, not a 250ms worker loop. Stale intent date is never authoritative. Campaign board/view/lives/help rights remain owned by their original attempt.

Reminders are consumer-owned and disabled for isolated review/pilot contexts. Disabled reminders do not publish a projection on every move. No game save/preferences schema migration. Actual notifications, permission denial and background behavior require native runtime acceptance, not browser mocks.

## Measurement

Existing `daily_open`, resume/start/context/complete/final and cup events retain their meaning. Add exact-schema `daily_entry {date, attempt, source}` after accepted navigation; source is `calendar | home | result | notification`. This measures entry, NOT notification display/impression. Shared generated sender/native schema now has 39 events. Playtest keeps analytics OFF and test ads; production IDs/secrets and money/dashboard checks stay separate.

## Checks and limits

See `docs/evidence/daily-engagement-038/ACCEPTANCE.md` for final facts, source hashes, APK, recordings and hosted checks. Final local check:263 unit tests, typecheck/build,28 affected browser cases and12 observer repeats PASS; supplementary full524/532 is retained, with all8 failed cases passing the final isolated repeat. Hosted Android26JVM/sync/playtest/R8/official checks and730-date/32-release-state audit PASS. Artifact web529/532, three obsolete test observers corrected and repeated; new hosted test-only repeat still running, aggregate not yet GREEN. Exact evidence and downloads are recorded there. Browser bridge scenarios exercise routing/opt-in only and are explicitly not Android delivery proof.

Phone acceptance: Android 13+ grant/deny/permanent denial/channel off; pre-13 notifications; cold/warm/twice tap; today completed before alarm; midnight/month/year/leap/timezone/clock changes; reboot/update; foreground/advertisement; delayed Doze/OEM delivery; same-certificate update, vibration and large-field frame pacing. NOT RUN unless explicitly recorded as executed.

## KIT IMPACT

REUSE: latest kit guidance at `a3527be9e1a63cfb3c192d31ac85a4206c370bf5`, [LOCAL_REMINDERS.md](https://github.com/DanilaH/mini-games-kit/blob/a3527be9e1a63cfb3c192d31ac85a4206c370bf5/docs/android/LOCAL_REMINDERS.md): context permission, separate preference/OS status, inexact native schedule, durable completion suppression, local calendar time, truthful text, idempotent current-state deep entry. It supplies a recipe, not a scheduler API. The native bridge and root-bound projection are local Arrows integration with its archive writer. No kit changes or pin update; no general director, new currency or extra product experiment.
