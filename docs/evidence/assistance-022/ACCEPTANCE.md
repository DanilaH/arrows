# 0.22.0 separate source/build evidence

Source `ffc925b2610c65185c47e80d0fe94cd4429d884e`, [CI run](https://github.com/DanilaH/arrows/actions/runs/43469938209). Actual full-run results: **148 units,243/244 browser,17/17 JVM**. Only combined phone control clear exceeded180s. Trace reached all four legal wins,3lives, then exhausted total budget at canvas count; all individual API/assertion durations under2s.0.23.0 changes only aggregate test budget240s; per-action5s assertions remain.

APK: [arrows-0.22.0-playtest.apk](https://chatgpt.com/library?file_id=libfile_b4d9277195b48191a5f2761a251ce26b&account_id=personal). Actual Android manifest/config, SHA256, V2 certificate and every recorded payload byte are in apk-inspection.json. Same `.playtest` package/certificate as0.19.1; greater versionCode. Test ad IDs, blank analytics key. Native test XML aggregate in native-results.json.

Local actual-payload recordings were made against this exact source (capture-manifest.json). Attached current demonstrations are re-recorded against0.23.0 and labelled in ../assistance-023/ACCEPTANCE.md, rather than pretending earlier sources had all later fixes.

No physical install/update/real SDK session, haptic feel or phone frame-pacing acceptance. No dashboard/export money verification. Product variants are exclusive per attempt; no live rollout. KIT IMPACT: REUSE (same pinned storage/audio/lifecycle/render primitives; game/reward policy stays Arrows-owned). No kit writes or store publication.
