# Bootstrap provenance

Generated on 2026-11-09 from `DanilaH/mini-games-kit/bootstrap/yandex-phaser` at `a9325265e87583a4872cf6a158e1e881a0d7508e` using:

```sh
npm run bootstrap:create -- ../arrows-bootstrap --name arrows --orientation portrait
```

The complete generated template was copied into the empty `DanilaH/arrows` checkout, then adapted for Android/RuStore. The upstream mandatory Yandex rule applies specifically to new **Yandex Games + Phaser** projects. This project intentionally replaces the Yandex-specific parts; see [the decision register](docs/PROJECT_DECISIONS.md).

Retained: strict TS/Vite/Phaser, exact kit pin, semantic first-frame readiness, startup failure/preload, timing diagnostics, mobile viewport watcher, aggregate activity blockers, sleeping-renderer teardown and CI.

Adapted: Capacitor/browser platform runtime, portrait-first responsive geometry, capped physical backing store, development-only diagnostics, Android validation. Procedural startup needs no image-format capability probe or runtime-image resolver. Restore an explicit asset-loading policy when trophies/medals are added.

This repository's `AGENTS.md` and documents now describe the Android consumer contract; upstream Yandex placeholders are not project requirements.
