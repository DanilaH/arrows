# First delivery evidence: C / A1 / F / A2

APK **0.20.0/code32**, source **35693f1ad049ae7082a3e20256e6583006646463**. Owner first-delivery download was provided before beginning A3. Source baseline0.19.1/ad4bc416; content/SDK/kit pins unchanged.

`PASS` below means the named engineering evidence, not human enjoyment, real ad success or physical phone acceptance. Mixed external gates remain `NOT RUN` even where local parts passed.

Checks at delivery: `npm run check`132/132 unit tests + typecheck/production build; current focused browser6/6 including actual RAF idle and restore; native16/16 plus Android debug/playtest assemble. Prior full browser229/230: one finish timing timeout under concurrent stress, isolated repeat2/2 passed. Full current CI run43461425616 still executing at delivery and will be updated.

APK: `com.danilah.arrows.playtest`,10,388,199 bytes; SHA256 `fe3c542a45eeeed93a79e09bc5232544db56fadec4a6303c384f6b4f459e9b8e`; V2 certificate `533aa2ff18337e3b3630c1363e7fe49f98e6b21371ce715689d2cbbf2e45ea36`, same as previous code31. Native DEX config: AD_MODE=test, demo-rewarded-yandex/demo-interstitial-yandex, analytics key empty; automatic SDK reporting disabled with empty key. All captured application web files equal APK bytes. Actual install and SDK video on a phone have not been performed here.

Recordings: Chromium/WebGL390×844,DPR1.5, seeded QA states, controlled native advertising/storage/feedback transport injected before the unmodified production bundle. This is not natural player behaviour or a real SDK video session. Audio is the real game Web Audio output; a separate recording-only clock preserves actual silence during game-context suspension. Four labelled clips are concatenated without replacement audio. Capture/source/hashes are in capture-manifest.json and APK inspection.

A2 results: c40 prefix0..20 gives root22+23/24/27,19→15. With marks23/24: manual1/native2/bonus1, lives1/errors2 retained. Actual long c20 chain: manual1/native7/bonus3. Independent already-free arrows are excluded. Logic/right consumption/win commit once before effects; visible corridors determine dependent presentation timing, with700ms maximum start offset and no input wait.

The offline canonical money tool uses custom `sdk-ilrd` observations, request→assignment joins, stable dedup, separate currencies/precision/unknown and all mature7d assigned installs including nonviewers. It never sums automatic dashboard revenue. Scalar-event path requires no ad-revenue module upgrade. Dashboard delivery, real monetary exports and uplift remain unverified.

Desktop stress profiles: exact old APK payload vs candidate presentation, same original c20/c120 states,390×844/DPR2, software WebGL/4×CPU; two pairs. c20 script time baseline1825–1852ms vs candidate1974–2124ms; c120 baseline1512–1696ms vs candidate1433–1590ms. Frame intervals varied widely; no phone FPS/performance improvement claim. Whole renderer idle is separately asserted from actual RAF counts.

**KIT IMPACT: REUSE.** Existing pinned DurableReceiptQueue, gameplay blockers, JsonStorageRepository and OneShotPlayer remain the seams. Reproducer: helpLedger uncertain use/claim+duplicate receipt tests, native journal fresh-owner recovery and assistance browser restore/idle. Reward semantics/presentation stay game-owned; no new kit API, pin change or mini-games-kit push.

| ID | Status | Evidence / limit |
|---|---|---|
| BASE-01 | PASS | Started from ad4bc416; owner package and project rules read. No newer branch was rolled back. |
| BASE-02 | PASS | Existing progression/content migration tests plus legacy lives0/marked Hint recovery; no content files changed. |
| BASE-03 | PASS | Board/progression/browser stable-error tests and c40 marked recording. |
| BASE-04 | PASS | Existing lifetime-gift tests, phoneFeelV2 restart/loss UI; global gift policy unchanged. |
| BASE-05 | PASS | Existing flawless/history tests; A2 c01 win has errors0 and one winner; c40 marks retain lives1/errors2. |
| BASE-06 | PASS | Existing content hash/date/namespace/unit tests and229 successful full-browser cases; full current CI pending. |
| BASE-07 | PASS | helpLedger failed request/grant/use/claim, ambiguous write/readback and duplicate receipt tests. |
| BASE-08 | NOT RUN | Current full CI still running at first delivery. Local check132/132, focused6/6, native16/16/build succeeded. Prior full run229/230; finish timeout passed separately2/2. |
| C-01 | PASS | rewardedReadiness coalesced demand with no startup preload/blocker; cache/generation JVM cases. Simulated transport. |
| C-02 | PASS | Configured vs ready, monotonic TTL/take and stale status tested in TS/JVM; actual APK config inspected. |
| C-03 | PASS | RewardedCacheStateTest cancellation/generation/expiry/backoff; adapter demand singleflight and stale RPC test. |
| C-04 | NOT RUN | Engineering cache take and cold load compile/policy tested; physical SDK warm/cold invocation latency not measured. |
| C-05 | PASS | Native generation invalidation tests and controlled cancel→late-ready recording; real SDK callback timing remains phone gate. |
| C-06 | PASS | Simulated unavailable/dismiss/no-earned outcomes, cache failure/backoff and existing ad-flow tests; no live no-fill rate claim. |
| C-07 | PASS | Native queue reconstruction/dedup/exact ack, writer duplicate tests and duplicate UI fixture delivery. |
| C-08 | PASS | Fault-injection fresh-store/native-journal reconstruction before commit/after commit-before-ack. No actual process-kill phone session claimed. |
| C-09 | PASS | Late current/retired/occupied single/cascade rights remain typed reserves; current help retained. |
| C-10 | PASS | Schema1 stays legacy; schema2 missing descriptor quarantines and dedups. Invalid version never becomes legacy. |
| C-11 | PASS | Double explicit claim/uncertain recovery and receipt after claim; reserve recording uses same entitlement with no second show. |
| C-12 | PASS | Failed and unknown writes at request/grant/use/claim; previous confirmed failure followed by unknown claim is covered. |
| C-13 | PASS | Independent counts for c40 manual/native/bonus; old free marked Hint entry release has manual0/native1, unknown SDK provenance retained. |
| C-14 | PASS | New unit cases first_move/repeat_loss/exit_before_move; repeat loss keeps attempt, no false final outcome. |
| C-15 | NOT RUN | Scalar ILRD parser/value dedup/exact schema and offline7d denominator join passed. No dashboard/export/automatic-total reconciliation access; no income/uplift claim. |
| C-16 | PASS | Fixed attempt assignment, kill switch stops new offers while earned fixed cascade remains usable; decoder preserves type. |
| C-17 | PASS | Existing protected6-wins/150s/two-new-wins/explicit Next tests and unchanged cadence source; preload has no cadence writer. |
| C-18 | NOT RUN | Exact APK forced demo IDs/blank analytics key/certificate verified. Separate enabled-analytics cabinet QA and phone SDK session unavailable. |
| A-01 | PASS | assistance.test.ts/helpLedger.test.ts + c40 browser6-case suite; genuine c40/long-native/cancel-reserve records where applicable. |
| A-02 | PASS | assistance.test.ts/helpLedger.test.ts + c40 browser6-case suite; genuine c40/long-native/cancel-reserve records where applicable. |
| A-03 | PASS | assistance.test.ts/helpLedger.test.ts + c40 browser6-case suite; genuine c40/long-native/cancel-reserve records where applicable. |
| A-04 | PASS | assistance.test.ts/helpLedger.test.ts + c40 browser6-case suite; genuine c40/long-native/cancel-reserve records where applicable. |
| A-05 | PASS | assistance.test.ts/helpLedger.test.ts + c40 browser6-case suite; genuine c40/long-native/cancel-reserve records where applicable. |
| A-06 | PASS | assistance.test.ts/helpLedger.test.ts + c40 browser6-case suite; genuine c40/long-native/cancel-reserve records where applicable. |
| A-07 | PASS | assistance.test.ts/helpLedger.test.ts + c40 browser6-case suite; genuine c40/long-native/cancel-reserve records where applicable. |
| A-08 | PASS | assistance.test.ts/helpLedger.test.ts + c40 browser6-case suite; genuine c40/long-native/cancel-reserve records where applicable. |
| A-09 | PASS | assistance.test.ts/helpLedger.test.ts + c40 browser6-case suite; genuine c40/long-native/cancel-reserve records where applicable. |
| A-10 | PASS | assistance.test.ts/helpLedger.test.ts + c40 browser6-case suite; genuine c40/long-native/cancel-reserve records where applicable. |
| A-11 | PASS | assistance.test.ts/helpLedger.test.ts + c40 browser6-case suite; genuine c40/long-native/cancel-reserve records where applicable. |
| A-12 | PASS | assistance.test.ts/helpLedger.test.ts + c40 browser6-case suite; genuine c40/long-native/cancel-reserve records where applicable. |
| A-13 | PASS | assistance.test.ts/helpLedger.test.ts + c40 browser6-case suite; genuine c40/long-native/cancel-reserve records where applicable. |
| A-14 | PASS | assistance.test.ts/helpLedger.test.ts + c40 browser6-case suite; genuine c40/long-native/cancel-reserve records where applicable. |
| A-15 | PASS | assistance.test.ts/helpLedger.test.ts + c40 browser6-case suite; genuine c40/long-native/cancel-reserve records where applicable. |
| A-16 | NOT RUN | Subsequent isolated A3/A4 delivery; first APK does not enable it. |
| A-17 | NOT RUN | Subsequent isolated A3/A4 delivery; first APK does not enable it. |
| A-18 | NOT RUN | Subsequent isolated A3/A4 delivery; first APK does not enable it. |
| A-19 | NOT RUN | Subsequent isolated A3/A4 delivery; first APK does not enable it. |
| A-20 | NOT RUN | Subsequent isolated A3/A4 delivery; first APK does not enable it. |
| A-21 | NOT RUN | Subsequent isolated A3/A4 delivery; first APK does not enable it. |
| B-01 | NOT RUN | Subsequent isolated B1 delivery; first APK does not enable it. |
| B-02 | NOT RUN | Subsequent isolated B1 delivery; first APK does not enable it. |
| B-03 | NOT APPLICABLE | B2/B3 labs excluded from authorized first delivery. |
| B-04 | NOT APPLICABLE | B2/B3 labs excluded from authorized first delivery. |
| FEEL-01 | PASS | Finite presentation unit tests, actual-output recordings and existing gesture/error/idle/browser cases; browser evidence only. |
| FEEL-02 | PASS | Finite presentation unit tests, actual-output recordings and existing gesture/error/idle/browser cases; browser evidence only. |
| FEEL-03 | NOT RUN | Exact additional monochrome/offscreen-autofocus matrix not independently completed; current roles and manual cancellation implemented. |
| FEEL-04 | PASS | Finite presentation unit tests, actual-output recordings and existing gesture/error/idle/browser cases; browser evidence only. |
| FEEL-05 | PASS | Finite presentation unit tests, actual-output recordings and existing gesture/error/idle/browser cases; browser evidence only. |
| FEEL-06 | PASS | Finite presentation unit tests, actual-output recordings and existing gesture/error/idle/browser cases; browser evidence only. |
| FEEL-07 | PASS | Finite presentation unit tests, actual-output recordings and existing gesture/error/idle/browser cases; browser evidence only. |
| FEEL-08 | PASS | Finite presentation unit tests, actual-output recordings and existing gesture/error/idle/browser cases; browser evidence only. |
| FEEL-09 | PASS | Finite presentation unit tests, actual-output recordings and existing gesture/error/idle/browser cases; browser evidence only. |
| FEEL-10 | PASS | Actual c20 prefix0..14, marks16..22, root15, bonus23/24/25: manual1/native7/bonus3, lives2 retained. 700ms start budget; real recording. |
| FEEL-11 | PASS | Finite presentation unit tests, actual-output recordings and existing gesture/error/idle/browser cases; browser evidence only. |
| FEEL-12 | NOT RUN | Applies with later A3/B1 isolated delivery. |
| FEEL-13 | NOT RUN | Applies with later A3/B1 isolated delivery. |
| FEEL-14 | NOT RUN | Applies with later A3/B1 isolated delivery. |
| FEEL-15 | PASS | Finite presentation unit tests, actual-output recordings and existing gesture/error/idle/browser cases; browser evidence only. |
| FEEL-16 | PASS | Finite presentation unit tests, actual-output recordings and existing gesture/error/idle/browser cases; browser evidence only. |
| FEEL-17 | NOT RUN | Exact additional monochrome/offscreen-autofocus matrix not independently completed; current roles and manual cancellation implemented. |
| FEEL-18 | PASS | c01 A2 completes: native cue trace button/remove/win only, one saved win, actual audio video; no help-final over level final. |
| FEEL-19 | NOT RUN | Browser source cue separation/max voices/native freshness code and audio trace checked. Subjective listening/haptics on phone pending. |
| FEEL-20 | PASS | Finite presentation unit tests, actual-output recordings and existing gesture/error/idle/browser cases; browser evidence only. |
| FEEL-21 | NOT RUN | Bounded native fallback pattern/code compiled/JVM checked; no physical amplitude-control/no-vibrator matrix. |
| FEEL-22 | PASS | Finite presentation unit tests, actual-output recordings and existing gesture/error/idle/browser cases; browser evidence only. |
| FEEL-23 | PASS | Finite presentation unit tests, actual-output recordings and existing gesture/error/idle/browser cases; browser evidence only. |
| FEEL-24 | NOT RUN | Two matched desktop stress pairs and real RAF idle checks recorded; high variance/no phone frame pacing or heap-retention acceptance claimed. |
| FEEL-25 | NOT RUN | Applies with later A3/B1 isolated delivery. |
| EDGE-01 | NOT RUN | A4 component collision/claim cases are the later isolated bundle delivery. |
| EDGE-02 | NOT RUN | A4 component collision/claim cases are the later isolated bundle delivery. |
| EDGE-03 | NOT RUN | A4 component collision/claim cases are the later isolated bundle delivery. |
| EDGE-04 | PASS | Legacy migration carries origin=legacy-save, requestId/receiptId=null; no synthetic SDK grant/join. |
| DELIVERY-01 | PASS | APK source35693f1a, SHA/certificate/config/web bytes in apk-inspection.json; permanent download delivered. |
| DELIVERY-02 | NOT RUN | Same package and V2 certificate as0.19.1, code32>31. Actual physical install/update remains owner phone gate. |
| DELIVERY-03 | PASS | Eight genuine browser GIFs, exact APK web byte match, seeded/controlled source watermark and per-clip source metadata. |
| DELIVERY-04 | NOT RUN | Actual-output audio video verified AAC/nonempty timing. Physical haptics/frame pacing unverified; desktop stress profiles are separate. |
| DELIVERY-05 | NOT RUN | QA variants/assigned vs actual effect identified; no live rollout. External monetary delivery unavailable. |
| DELIVERY-06 | PASS | Owner package/checkpoint/handoff/decisions/evidence preserved in Arrows. KIT IMPACT REUSE; no kit/store writes. |

## Downloads

- [arrows-0.20.0-playtest.apk](https://chatgpt.com/library?file_id=libfile_d05c55a07e348191acb5aad077c3c69d&account_id=personal)
- [a1-early.gif](https://chatgpt.com/library?file_id=libfile_149559ed852481919e30b349442a3763&account_id=personal)
- [a1-press-cancel.gif](https://chatgpt.com/library?file_id=libfile_2ae362023f708191a23ffbbeafd73369&account_id=personal)
- [a2-c40.gif](https://chatgpt.com/library?file_id=libfile_ecb4165dbafc819199bf448aec6c12d5&account_id=personal)
- [a2-c40-native.gif](https://chatgpt.com/library?file_id=libfile_f05bfb246d0881918278fb25529f83ca&account_id=personal)
- [long-native-c20.gif](https://chatgpt.com/library?file_id=libfile_2f660963372c8191959406a37a23feaf&account_id=personal)
- [a2-one-final.gif](https://chatgpt.com/library?file_id=libfile_2c4208070cec8191bb6128aabe2a6de2&account_id=personal)
- [dense-c120-pan.gif](https://chatgpt.com/library?file_id=libfile_dbe928d456f081918dd6a837189df322&account_id=personal)
- [cancel-late-ready-reserve.gif](https://chatgpt.com/library?file_id=libfile_e4eaecceee3c819189a259679f09bbd1&account_id=personal)
- [assistance-0.20.0-actual-audio.mp4](https://chatgpt.com/library?file_id=libfile_cec7a976c8748191be2a9bcf7e53fd5d&account_id=personal)
