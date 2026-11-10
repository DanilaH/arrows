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
