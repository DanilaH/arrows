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
- Keep signed artifacts, keystores, local SDK paths, node_modules, dist and copied native web assets out of Git.
