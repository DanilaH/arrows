# Living Home emblem —0.34.0/code48

Owner selected the emblem concept and explicitly requested recurring living arrow movement. Final source **decbfaf9e3c03c979d79f93a9cb27836c4cc9a43**, baseline d9f4727; initial013d188. Read [behavior and ownership](../../HOME_EMBLEM_034.md). No gameplay/assistance experiment, future-board preview or new meta.

Three generic arrows use the shared rounded body/head artwork and current theme roles. One arrow at a time nudges/springs and gets a finite glint, with quiet pauses. Play pointerdown acknowledges the press; its existing click enters immediately. Selected Home replaces the emblem with the original saved field, final campaign keeps its result. No idle sounds/haptics, saves, rewards or game moves.

The existing surface tick drives bounded WAAPI bursts, without a new timer/RAF or Phaser wake. Settings/activity/native background/visibility/blur stop owned effects; returning schedules a quiet future burst. Reduced motion is static and responds live. Outgoing menu snapshots freeze the displayed SVG pose. At usable height<=480px the decorative mark hides and stops to preserve the header/action.

| Check | Actual result |
| --- | --- |
| Unit/type/build/payload boundary | 234tests/29files PASS |
| Initial broad run | 52/56PASS;4new observer failures (DOMMatrix used in Node; native background helper missing boolean), corrected |
| Corrected broad regression | 56/56PASS,2.0min: new emblem,0.33composition, seamless entry and isolated pilot |
| Final affected run | 12/12PASS,24.2s after short-window correction; phone+desktop |
| Real short-window regression |568x320 emblem y11.56..99.56 overlapped header y12..44.5 before fix; hidden/stopped at<=480px, final safe action/heading checks PASS |
| Final signed-APK web matrix |14states/7profiles/0runtime errors: dark/light/RU/EN/320x568/390x844/430x932/800x1280/568x320, synthetic150% text/reduced motion |
| Actual recording |345received frames, all3arrows observed moving, idle save unchanged, real press/one legal move/Home return,0app errors |
| Input during animation | Browser observation35.2ms from release to game; functional tests accept input during motion; not a phone latency benchmark |
| Native |19JVM/0failures, sync and normal+.playtest assemblies PASS |
| Initial full hosted CI44038986372 |492/492browser PASS before final short-window adaptation; both jobs SUCCESS, see [completed excerpt](ci-initial-summary.txt) |
| Final hosted CI44040646713 | Android SUCCESS; final web completed SUCCESS:492/492browser,21.1min,234unit/type/build/sync. See ci-final-summary.txt |
| QA tools | Node syntax/Python parse and actual verifier/capture execution PASS |

Package com.danilah.arrows.playtest,0.34.0/code48; same official V2 certificate as0.33,533aa2ff18337e3b3630c1363e7fe49f98e6b21371ce715689d2cbbf2e45ea36. APK SHA256 **a97a083a3b60d5ce77485aed1b95569f6025dc342c95205c8b3188c155b9fb75**,11010009bytes. Compiled MainActivity portrait/application game, DEX test/demo rewarded+interstitial units/empty analytics key verified.28public web files extracted;26local production files match byte for byte, two empty Capacitor adapters; shared font/audio/brand/trophy assets unchanged.

Permanent **APK, silent GIF and actual-audio MP4** identities/URLs/hashes are in [deliveries](deliveries.json). All3saves succeeded and applied local metadata. The current-only recording uses the actual signed APK web in Chromium141/390x844/DPR1.5, fresh progress/no seeded victories and controlled native transport. Actual pointer actions/CDP JPEG frames/game WebAudio, no generated frames or overdub. Settings audio preview warmed the context before recording. Idle frames are held during encoding; encoded30/20fps is not device performance evidence. The movie shows quiet idle arrow bursts, Play, one real legal removal, then selected Home without the emblem.

Evidence: [verification](verification.json), [official signature](signing.txt), [compiled manifest](manifest-tree.txt), [capture and exact payload](recording.json), [matrix](matrix.json), [media/audio](media.json), [checks](checks.json), [unchanged canonical blobs/config](compatibility.json), [artifact hashes](artifacts.json).

Reproduce: build SSR fixtures with `npx vite build --ssr tools/audit/ui-composition-source.ts --outDir .test-output/home-emblem/ssr`; obtain CI44040646713 artifacts as .test-output/home-emblem/{playtest,verification,native-tests}.zip; run `python3 tools/qa/verify-emblem034-apk.py --source decbfaf9e3c03c979d79f93a9cb27836c4cc9a43 --application decbfaf9e3c03c979d79f93a9cb27836c4cc9a43 --workflow 44040646713`, then `node tools/qa/capture-home-emblem034.mjs`. QA-only androguard/Chromium/ffmpeg prerequisites as0.33; never application dependencies. Extraction resets owned web/capture metadata, so capture afterward.

Physical install/update/rotation/haptics/speaker/audio focus/FPS/thermal/system text scaling: **NOT RUN**. Real SDK/account/AppMetrica/export/money: **NOT RUN**, separate. Static same-package/certificate/increasing-code proof is not a physical update test. Prior owner's qualitative playtest remains accepted; no new human enjoyment/retention claim. Rules/content/embedded saves/rights/lives/lifetime gift/errors/flawless/ad cadence/pins preserved. No store publication.

**KIT IMPACT: REUSE** — existing rounded SVG artwork, pinned UI-motion/UX guidance e04a3fe and actual GameplayActivityCoordinator/viewport/OneShotPlayer seams at runtime a932526. Installed feel exports are pointer-response/damped-motion/polyline-markers/touch-activation; no OwnedDomMotion export was assumed/upgraded. This emblem's scheduling/pose/art policy stays local. No kit API or upstream write.
