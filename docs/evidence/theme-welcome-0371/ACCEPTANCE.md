# Theme welcome0.37.1 checkpoint

Base077305b; owner requested removal of bottom navigation from first theme selection. Normal Home retains its existing nav. No data/rules/SDK/signing changes. Earlier0.37full CI now SUCCESS516browser/256unit/21JVM.

Local256unit/31files/type/build/38analytics schemas/16brand resources +sync PASS. Corrected70browser +2A1-targeted cases PASS; final4repeat after QA-only atomic seed/full-height assertion updates PASS. Distinct final affected cases72. Existing welcome checks assert hidden first-visit nav/full-height viewport and visible nav after Play/menu return/reload, including failed preference writes. No new mirror unit tests for this presentation-only adjustment.

Initial36-browser run28PASS/8FAIL: old Settings scenarios tried to open Home Settings directly on the newly nav-free welcome. Tests now explicitly prepare ordinary preferences for menu/Settings checks, while the fresh-profile test follows Play→game Settings. Also adapted the same ordinary-menu assumption in typography/modal/feedback/A1 QA observers. This does not bypass welcome tests; first-visit cases remain clean. A settings-write fault fixture seeds preferences and installs its failure within the same init script so the rejected write remains the actual user change. Initial run is not called green.

CI44081220764/android134032015464 SUCCESS:debug/21JVM/compatible .playtest53/R8releaseCheck and official signature/zipalign16k/manifest/DEX/exact payload checks PASS. release-audit134032014984 SUCCESS:730dates/32release-web states. Current full web134032015468 RUNNING; aggregate not declared green.

Actual delivered APK11,516,094bytes/SHA2564018caa62b27d7f64e468d6a05a250014f9b4fc46dbe9edc154d9458e6dfc075. Same .playtest cert533aa2ff18337e3b3630c1363e7fe49f98e6b21371ce715689d2cbbf2e45ea36/v2;29embedded web files/schema exactly match checked source; forced test ads/analytics OFF.

Downloaded/hash-verified ZIP artifacts: playtest14326983018 0f3e720c6c0c574e450518052e55d2cf90b80223e7de03969fee62bf40d9386a; identity14326379457 58979a0ed4043d6a2988c2e4b2d3495c76e24dafd3546d7d82da715a888d9d0c; native XML14327572006 1dbf84f6392663da1996473bddfb25ab02d8bd0ca70236068ef84e0c73dfc838. Optimized evidence14326509154 a6693a4ad8eaee4e28a82188e1f3d06855c0fdf62d84085975791d0ef2a2a472 verified/downloaded, report releasecheck.json; test-signed .releasecheck is not production signer proof.

Actual current signed-APK web recording PASS:317CDP source frames/6.370s,390×844DPR1.5, clean unseeded browser storage. First nav hidden and normal nav restored on post-game Home were asserted by the recorder. Real choices/reversal/Play and one legal move;0runtime errors. Actual WebAudio mean−44.4dB/max−16.9dB, no overdub. Input-to-game270.2ms includes an authored85ms press hold and is a single Chromium observation, not a phone benchmark. Current GIF/audio/APK saved, see manifest.json/artifacts.json.

Five further RU/EN/320×568/synthetic150%-text/short-window layout states PASS, every choice/Play44px+ visible and hit-testable (layout.json). Physical phone/install-update/haptics/FPS/live SDK/dashboard/money/production IDs: NOT RUN. KIT IMPACT NONE; no kit/store publication.
