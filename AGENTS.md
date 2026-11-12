# Arrows project contract

Read `docs/HANDOFF.md`, `docs/PROJECT_DECISIONS.md`, `docs/KIT_REUSE.md` and the replication spec before feature work.

- Target: Android / RuStore, with a browser development surface. This is not a Yandex Games web project. Do not add its SDK/bootstrap back implicitly.
- The complete agreed product remains the target. Initialization is only infrastructure; do not call it a playable game or parity implementation.
- Keep the exact mini-games-kit revision pinned. Start reusable API discovery at its `docs/API.md`, then read each relevant focused contract. `installTouchActivation` is for DOM controls; `polylineMarkers` is not arrow-exit geometry.
- Domain rules, content versions, attempt IDs and durable progression must not depend on Phaser, tweens, sound or advertising callbacks. Keep campaign and per-date daily saves separate.
- Replicate arc-length extraction, stable error marks and hold/cancel semantics from the specification. Mark all inferred policy explicitly.
- Maintain the independent-blocker lifecycle, first actual rendered frame, bounded DPR, idle rendering and deterministic teardown. New animated scenes must own wake/last-render behavior explicitly.
- Use real native ads only after a separate integration. Rewarded dismissal is not an earned receipt. Do not simulate monetization or fake account/purchase controls in production.
- Run `npm run check` and relevant browser checks. Native changes additionally need `npm run android:sync` and Android build/device evidence appropriate to the change.
- Update handoff and decisions when behavior or verification changes. Browser success is not Android hardware performance evidence.
- For visibly changed motion, feedback, transitions or gestures, include short GIFs recorded from the actual current build in the delivery. Show enough before/action/after to judge the change; keep framing readable and state browser versus physical-device provenance. Text-only/internal changes do not need GIFs. Preserve this user preference in subsequent handoffs.
- Keep signed artifacts, keystores, local SDK paths, node_modules, dist and copied native web assets out of Git.

- The user authorized a versioned c01–c20 redesign in 0.8.0. Catalogue 3/contentVersion 2 applies only to fresh attempts; preserve every existing embedded attempt and published c21–c120/daily/trophy geometry. See `docs/STAGE_F_UX_POLISH.md`.

- 0.8.1 follows the user’s compact-original feedback: fresh c01–c04 use contentVersion 3, catalogue 4 preserves embedded v1/v2/v3 attempts. Keep c05 onward frozen. Small camera spacing is presentation-only; see `docs/COMPACT_OPENING_V3.md`.

- Latest authorization: the user requested rebuilding c05–c120 in 0.9.0. Fresh fields use contentVersion 4/catalogue 5; c01–c04 remain v3. Earlier c05-onward freeze notes are historical. Preserve all embedded attempts, daily/trophy content and reward identities. Enforce `docs/CONTENT_BANK_V4.md` quality gates and retain authentic GIF provenance.

- Current feel pass 0.10.0 changes only presentation/feedback. Preserve `docs/FEEL_PASS.md` contact timing, route reversal, async-menu element ownership, finite celebration/idle rendering and no-replay rules. GIFs are silent; an actual-output audio video complements them. Physical haptic feel still requires a phone.

- 0.11.0 follows the user-approved minimal UI plan. Hint uses three active seconds and an explicit video-labelled direct entry to cancellable loading. Keep stable bottom-nav controls outside route snapshots, compact HUD 44px targets, keyboard medal disclosure, finite preview/award motion and unchanged reward authority. See `docs/MINIMAL_UI.md`.

- 0.12.0 adds finite assistance/next-field presentation. Preserve `docs/ASSISTANCE_FEEL.md`: post-dialog/ad/foreground feedback, no reward/restore replay, owned cancellable heart motion, bounded measured-path light and old/new dot handoff. Controlled SDK transport is isolated test infrastructure with explicit capture provenance; it must not enter the application payload.

- 0.13.0 strengthens the minimal finish; preserve `docs/FINISH_POLISH.md`: last-removal radial wave, bounded palette-limited fans/glints, drawn seal, stable live result, no mandatory wait/replay and 2300ms cleanup. Unlock/calendar review proposals are separate scope.

- 0.14.0 implements the subsequently authorized Collection/daily disclosures, daily→monthly-progress arrival and c120→calendar destination. Preserve `docs/META_ARRIVALS.md`: actual index ownership, quiet additive cosmetic upgrade, shared-writer seen claims, transient/no-replay cues, owned ad/foreground continuation, serialized finite DOM motion and no final-campaign opportunity consumption. Content/trophy identities and kit pin stay frozen.

- 0.15.0 completes the authorized whole-game UI/UX review. Preserve `docs/UX_REVIEW.md`: calendar dates/actions may scroll but must never occlude each other; medal progress remains visible while rules are collapsed; daily date fits the compact HUD; lost Back establishes its menu before releasing the dialog; Home preview is read-only and final c120 retains its result. Existing content, reward/receipt authority, schema, ad cadence and kit pin remain frozen.

- 0.16.0 implements the subsequently approved autonomous daily/scale package. Preserve `docs/AUTONOMOUS_DAILY.md`: all 2026 fields and campaign stay frozen; dated generator v1 starts 2027 with level contentVersion 2. Never edit published construction/masks/date mapping in place: future changes need a date/version boundary. Catalogue 1/2→3 retains every embedded attempt and exact rewarded ownership in schema 2. Calendar follows local date through the existing 2200 date contract; future-year trophy browsing stays hidden. Post-2045 art uses immutable v2 composition. Manual zoom learning is production behavior; the optional reminder is isolated-QA only until human evidence. Hint/ad clocks, SDK and kit pin stay unchanged.

- 0.17.0 responds to actual phone feedback; preserve `docs/PHONE_FEEDBACK.md`: JSON Number-safe haptic generations/cancellation, bounded physical-style audio, occupied-original-bounds preview, capped marker heads, heavier shared shafts, 22px compact-field spacing and explicit current-level nav locks. No content/save/ads-rule changes. `.playtest` is a separately installed fresh-progress preview with forced test ads/analytics off; do not conflate it with an in-place update or production signing. Physical haptic/audio acceptance remains open.

- 0.17.1 supersedes the compact spacing/ink of 0.17.0: preserve `docs/TYPOGRAPHY_DENSITY.md`, bundled Nunito/OFL with no font CDN/readiness gate, shared static/animated stroke with a dense gap cap and 20px compact spacing. Keep every level/save/rule/ad identity and the same `.playtest` update package/signing path. Attach genuine current-build GIFs; seeded late-field images remain internal QA.

- 0.17.2 supersedes the arrow artwork/compact spacing in0.17.1: preserve `docs/ROUNDED_ARROWS.md`, shared display-only fillets and filled rounded triangles, clipped shafts and artifact-free filled tube, bounded dense/assistance ink and19px compact spacing. Canonical orthogonal paths/contact/picking/saves/ads stay unchanged. Use the same signed `.playtest` update path and attach genuine current-build GIFs with ordinary zoom.
