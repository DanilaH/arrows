# 0.21.0 separate source/build evidence

Source `393408dc9c07676713b574e7459876c61b11afdf`, [CI run](https://github.com/DanilaH/arrows/actions/runs/43465564183). Actual full-run results: **139 units,234/236 browser,17/17 JVM**. Two old browser scenarios timed out: combined control clear180s and zoomed finish5s. Neither is called PASS for this source. The later A4 elapsed/travel correction fixed finish timing; B1 raises only aggregate control-test budget based on the actual successful-move trace.

APK: [arrows-0.21.0-playtest.apk](https://chatgpt.com/library?file_id=libfile_43a276c55e6481919040cde3726c7983&account_id=personal). Actual Android manifest/config, SHA256, V2 certificate and every recorded payload byte are in apk-inspection.json. Same `.playtest` package/certificate as0.19.1; greater versionCode. Test ad IDs, blank analytics key. Native test XML aggregate in native-results.json.

Local actual-payload recordings were made against this exact source (capture-manifest.json). Attached current demonstrations are re-recorded against0.23.0 and labelled in ../assistance-023/ACCEPTANCE.md, rather than pretending earlier sources had all later fixes.

No physical install/update/real SDK session, haptic feel or phone frame-pacing acceptance. No dashboard/export money verification. Product variants are exclusive per attempt; no live rollout. KIT IMPACT: REUSE (same pinned storage/audio/lifecycle/render primitives; game/reward policy stays Arrows-owned). No kit writes or store publication.
