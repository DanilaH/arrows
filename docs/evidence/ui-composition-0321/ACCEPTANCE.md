# UI composition audit — current0.32.1, no application change

Read [the independent report and proposed package](../../UI_COMPOSITION_AUDIT_0321.md). Audit base `21736b58e2ddd7e9ff9fe50a64e35ba64a064230`, application `c0729730da9cf7b5c64f6aac7b0418a697ac8e36`. This commit adds findings/reproducers/evidence, not product behavior.

Actual source: signed `.playtest`0.32.1/code46, SHA-256 `d07530de92734d3ba0e0b8416f319937d99acaa3fae5bc8208f0e236cdd50eb3`; all28 extracted public files match the accepted0.32 payload. Existing package/certificate, test advertising and analytics OFF remain unchanged. A new APK is unnecessary for an audit.

| Verification | Factual result |
| --- | --- |
| Main portrait matrix | 127 completed states /5profiles /0runtime or flow errors |
| Additional main-game states | 39 completed /3profiles /0runtime or flow errors |
| Document horizontal overflow | 0 in those166states; inspect-label still overflows its narrow own control at synthetic150% |
| Ordinary accepted UI actions | 7/7 actual audio-source starts and button pulse commands; Escape separate, no sound expected |
| Actual recordings | 3 current-only clips /414received frames; real pointer/wheel actions; 2silentGIFs and1audibleMP4 delivered |
| Existing source CI43920386155, now completed | Both jobs SUCCESS;458browser(21.6min),232unit/29files,19JVM, build/sync/APKs PASS |
| New audit tools | Signed extraction/hash check and3Node syntax checks PASS; actual scripts completed |
| Application/source/pins/data changes | None; proposed C01–C05 not implemented |
| Physical Android/haptics/FPS/audio/rotation | NOT RUN in this audit; manifest proof remains separate; old owner qualitative playtest retained |
| Real SDK/AppMetrica/money | NOT RUN, separate external stage |

Findings include three structural SELECTs (stateful Home composition, explicit board overview, rewards-first Collection), earned-viewer contradictory copy and small text/label issues. Intentional hidden future geometry and difficulty-primary heading are not misreported as accidental regressions. No new human enjoyment/retention claim follows from automated captures.

Evidence: [source](source.json), [matrix](matrix.json), [focus](focus.json), [input](input-feedback.json), [checks](checks.json), [recordings](recordings.json), [saved delivery identities/hashes](deliveries.json), [completed CI excerpts](ci-web-summary.txt). Portrait0.32.1 acceptance was updated from pending web CI to its actual completed result. Raw snapshots/frame sequences can be reproduced with the report's commands; they are not generated mockups.

All UI records are Chromium141/APK-web, portrait, prepared QA/native transport, not a phone or real ad SDK. Synthetic150% is not WebView system font-scale proof. Initial focused-driver bootstrap race was corrected before the completed39-state pass; QA caption removed from the final viewport. Navigation GIF carries no sound; its unoffered silent capture track is not evidence of silent application buttons. Independent source-start/pulse observation confirms the actual feedback path.

**KIT IMPACT: REUSE** — pinned UI composition/state hierarchy and motion/evidence methodology. No new runtime API, kit change, dependency upgrade or store publication.
