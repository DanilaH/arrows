# Asset policy

Initialization uses geometry, CSS and system fonts. There are no external runtime requests, image atlases, audio downloads or image-format probes. The Phaser bundle is the main web payload; build bytes are not phone FPS evidence.

Version 0.7.0 replaces Capacitor defaults with project-owned vector icon/splash geometry. `tools/brand/art.mjs` is canonical; generated native/SVG assets are checked during build. The small SVG mark is an initial-HTML resource, and the favicon is browser-only; neither requires an atlas, AVIF probe or Phaser texture. Store export is an opaque 512px PNG made from the same SVG. See `STAGE_E_IDENTITY.md`; exact native mask/launch appearance remains device acceptance.

For medals, trophies and audio: keep source provenance, presentation dimensions, DPR cap, encoded/decoded budgets and startup/session/deferred loading categories explicit. Inspect the kit asset APIs only when these resources exist. A procedural board must not gain per-dot blur, DOM elements or perpetual tweens.

Version 0.8.0 adds two local transparent generated Home illustrations. Runtime exports are 256×256 WebP, 23,124 + 14,942 encoded bytes, 262,144 decoded bytes each (512 KiB combined at RGBA8). Explicit dimensions reserve layout; no network asset/probe is added. They are ordinary cached DOM images on Home, not Phaser atlases or gameplay textures. Original generation prompts and source SHA-256s live in `assets/ui/provenance.json`; original 1280px images are not shipped. Both themes and the actual GIF capture are visually reviewed. Board dots remain procedural, without blur or perpetual tweens.
