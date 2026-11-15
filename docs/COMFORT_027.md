# Phone feedback: sound, Settings and camera —0.27.0/code40

Base main5c01687 (application8e2c8d3/0.26.1). Preserve all newer compact-Hint/A1 cue work. Owner reports A3 disliked, harsh defaults, oversized Settings and restricted zoomed panning.

## Reproduced and selected

- Settings, actual current production web payload with isolated native-QA transport: RU390×844 opens816px tall with850px content;320×568 has540px surface/879px content and horizontal overflow. QA controls consume314–344px; whole-dialog scrolling loses Close. Existing14px viewport margin ignores asymmetric safe insets. SELECT independently scrolling body, pinned heading/Close/save-recovery, inset-aware dialog, collapsed Testing. No screen/art redesign. After correction initial390×844 height511px,320px horizontal overflow absent. Final acceptance includes enlarged text and short landscape.
- Camera code and real gesture comparison: a compact figure's short axis is always re-centred;48px perimeter slack on larger axes prevents bringing edge situations into the central reading area. SELECT presentation-only continuous zoom-dependent exploration band. From fit to1.6× freedom grows smoothly; shorter axes allow30% viewport movement, large axes allow42% perimeter margin capped240px. The complete original figure remains intersecting the clear area; no bounds from shrinking remaining arrows. Existing world-centre/relative-zoom save meaning, min/max scale, manual-overview priority, gestures and picking remain. No invisible board input or expanded action overlap.
- Audio remains procedural synthesized transients despite previous revisions. Owner's phone listening is negative evidence, not overridden by green tests. SELECT sourced Kenney UI Audio/Interface Sounds CC0 clips, with baked high/low-pass,4ms attack,35ms release, bounded peak. Click/remove/body/air/confirmation differ; native marked auto/exit layers are quieter. Flawless adds a subdued glass accent. No live oscillator, new audio engine, network/preload wait or replay queue. Existing OneShotPlayer6 voices/group freshness90ms resume, mute/foreground cancellation and independent haptics remain at runtimea932526. Subjective speaker/headphone acceptance stays OPEN.

Official source/license pages: https://kenney.nl/assets/ui-audio and https://kenney.nl/assets/interface-sounds. Direct ZIP endpoints returned403 in this environment; actual source files and original license texts retrieved from GeorgeQLe/assets-sfx-ui@760afd035e8fc3cd7fb5bc58d49a967649875e3e. Exact source/derived hashes, filters, sample rate and ffmpeg version: tools/audio/manifest.json. Reproduce with build-bank.py and that mirror checkout. Shipped small PCM16 bank is synchronous/lazy-decoded, not a remote dependency; original licenses ship in public/audio. Numeric bounds are not proof of pleasant sound.

## Assistance: proposal, not a combined rollout

Owner liked the tested variants except A3 and asks how to combine. Recommended product hierarchy:

1. A1: ordinary useful single hint, one existing compact video-labelled CTA.
2. A2: explicit stronger cascade with exact preview/root and2–4 extra ordinary removals. Possible separate contextual offer after ordinary help; **HOLD** its trigger/price/sequence until separately specified and tested. Do not turn every legacy Hint receipt into A2 or stack slots.
3. A4: contextual post-loss three-heart continue with useful ordinary help; retain existing active/reserved assistance. Lifetime gift remains once globally.
4. A3: **HOLD**, lab-only, preserve already earned manual routes. No new default migration or removal of earned rights based on one feedback statement.

This release retains exclusive per-attempt QA assignments and all existing rights/receipts/ad timing. It does not silently enable A1+A2+A4 together. Testing controls remain in .playtest, now collapsed; the misleading “New cascades” gate is accurately labelled “Variants A2–A4”. A1 first-error accent remains separately default Off. B1 stays separate.

## Acceptance and compatibility

Run npm run check, affected real-browser Settings/zoom/restoration/soft-edge/manual-overview and help regressions; native sync/build and existing JVM suite. Genuine before/after camera/Settings GIFs and actual-output audio use exact production payloads, seeded canonical progress and isolated controlled native transport. They are browser recordings, not physical Android/SDK ads. Verify APK packagecom.danilah.arrows.playtest/code40, same V2 cert533aa2ff18337e3b3630c1363e7fe49f98e6b21371ce715689d2cbbf2e45ea36, demo ads/empty analytics key, and payload hashes against capture. Actual results/artifact identities appended in delivery evidence.

No content, generator, schema, embedded attempts, lives/errors/flawless, lifetime gift, reward meaning/reservations, commercial cadence, runtime/guidance pins or native SDK changes. Physical install/update, insets/keyboard/TalkBack, haptics, perceived speaker quality/frame pacing and actual SDK inventory remain NOT RUN here. AppMetrica dashboard/real money stay separate.

Research SELECT: pinned Stable Progress UI/Viewport initial-action and scroll ownership guidance; pinned OneShotPlayer synchronous provider/freshness lifecycle. No additional framework or director. KIT IMPACT: REUSE — existing OneShotPlayer@a932526 and stable-layout acceptance; Arrows-owned bank/layout/pan policy, no upstream or store publication.

Final delivered evidence: [evidence/comfort-027/ACCEPTANCE.md](evidence/comfort-027/ACCEPTANCE.md).175 unit/type/build,140 affected browsers,19 JVM and Android builds/sync PASS; full hosted web pending at preparation. Same-cert code40 APK and real saved GIF/audio verified against18 packaged files.
