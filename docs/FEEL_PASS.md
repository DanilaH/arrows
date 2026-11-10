# Feel pass — 0.10.0 (15), 2026-11-10

This pass follows the user's request for a route-aware blocked-arrow collision, richer menu transitions and a more responsive victory. Content catalogue 5, all campaign/daily/trophy coordinates, save schema and earned-state authority are unchanged.

## Blocked arrows

The domain still accepts/persists an error before presentation and charges only the first error on an arrow. The scene finds the nearest forward blocking segment, including collinear segments, and advances the measured polyline along arc length. The visible tip stops at the blocker surface. Outward motion lasts 110–270 ms, contact holds 55 ms and the same route reverses over 190–350 ms. Impact sparks, blocker highlight, heart shake, sound and error haptics occur on contact. The red error mark remains after return.

There are at most twelve concurrent bounces. Repeated taps do not reset an active bounce. If its blocker disappears before contact, the arrow returns silently; a newly legal activation continues its normal exit from its current route position. The loss dialog waits for the last error motion. Navigation/background settles all transient presentation without changing accepted moves. Reduced motion keeps immediate feedback and stable error marks without bounces, shakes or particles.

## Menus

Home, Collection and daily calendar enter with a finite stagger of visible structural elements. Matching Collection/calendar art travels between Home cards and menu headers; the outgoing snapshot is inert and hidden from assistive technology. Async metadata refresh waits until the transition finishes so it cannot replace the incoming animated elements halfway through. Routes own a single snapshot, one shared image and a bounded set of animations; quick navigation, background and teardown settle them. Dialog entry has a small overshoot/stagger and preserves its modal blocker through exit. Reduced motion skips these transitions.

## Victory and feedback

After the last arrow actually leaves the board, a finite double ring, dot wave and 72 ribbons (96 on Hard/Nightmare) celebrate the clear. A check emblem, title, result detail and Continue appear in sequence; result detail distinguishes an error-free clear. The one Graphics overlay uses no filters, blur, particle objects or permanent render loop. Celebration ends within 2.1 seconds plus bounded dot settling. Restore/navigation does not replay a win or grant an award.

Original synthesized sound now distinguishes slide, impact and exit. Successful moves close together rise in pitch; the win uses a short five-note chord sequence and awards use six. The pinned kit still owns one lazy AudioContext, at most six sources, finite buffers and stale-resume cancellation. No audible work is durably queued. Preferences and independent background/ad blockers remain authoritative.

Native feedback profiles distinguish tap, removal, rapid-removal combo, collision, hint, life and victory. Devices with amplitude control get bounded amplitude waveforms; other devices receive the same timed pattern, with an API-24/25 fallback. Victory is a three-pulse 181 ms pattern, error a two-pulse 71 ms pattern. Existing freshness, foreground, generation and cancellation guards stay in force. Browser recordings cannot establish vibration feel on a phone.

## Evidence and limits

`bumpMotion.test.ts` checks contact direction/nearest segment, bends/collinearity, arc-length reversal and bounded early return. `feel.spec.ts` checks impact timing through actual AudioBufferSource starts, legal activation during return, one celebration, idle rendering, restored progress, last-life collision timing and metadata refresh during shared art travel. Existing navigation, gameplay, ads, save and reduced-motion suites remain applicable. JVM tests check native waveform bounds and independent profiles.

`tools/capture-feel-gifs.mjs` records the actual production build from fresh storage, earns nineteen wins through ordinary touch with an independent cell-walking oracle and captures real menus. Gameplay framing uses an ordinary pinch. Its MP4 audio is the actual AudioContext destination signal tee, recorded through MediaRecorder and aligned to screenshot timestamps; no audio is added or replaced. The GIFs are silent. Browser/mobile emulation is explicitly separate from physical-phone sound, vibration and performance acceptance. Exact source/build and artifact hashes are recorded in the verification evidence after CI.
