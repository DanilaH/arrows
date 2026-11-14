# Arrows 0.25: read-only baseline for the proposed first-error A1 cue

Checked 2026-11-14 on source `56f65a4ee5b9b169b1a53ab21f06e186b9619d48`, app `0.25.0 / 37`. Production build succeeded, including typecheck and production-payload verification. No application, repository test, or tracked file was changed. No full regression suite, PR, CI operation, real SDK call, or analytics activation was performed.

## Surface and limits

The script loaded the actual newly built `dist` in headless Chromium `141.0.7390.37`, using the repository's Pixel 7 profile (412 × 839), existing `tools/qa/assistance-native-transport.mjs`, and a validated campaign-40 save constructed with the repository's domain/save exports. The seed and controlled transport are QA inputs. These observations establish browser behavior of production application code, not physical-phone quality, actual SDK readiness, revenue, or causal lift. Native analytics calls were captured locally by the existing QA adapter, whose return value is `accepted:false, disabled:true`.

## Five observed cases

| Case | Observed production behavior | Consequence for a narrow experiment |
|---|---|---|
| Initial Hint boundary | Hint starts hidden. Its first visible state has an active 900 ms opacity/translation/scale animation whose target is the real `#hint` button. | Require the button to have been visible and settled before the triggering action. The existing entrance must not be reused for a new cue. |
| Error identity and overlap | Actual taps on blocked `c40-23`, `c40-23`, `c40-24` in one attempt produce `level_error.first=[true,false,true]` and lives `2,2,1`. The first save was observed while the existing Hint entrance was about 217 ms into its 900 ms duration. | `first:true` means first error on that arrow, not first error in the attempt. Use accepted-error count/context, and explicitly exclude an active Hint entrance. |
| Rewarded readiness | The same fresh `single-v2` Hint is visible and enabled in `ready`, `loading`, and `backoff`. Text changes from `Video ready` to `Video loading` to `Try later`. The latter two report transport `ready:false`. | Visible + enabled is insufficient. A rewarded-only experiment needs current actual ready state. |
| Saved entitlement | One A1 was earned through an explicit Hint click and the controlled receipt path. An actual Restart reserved it. The new attempt then displayed `Use saved help / No new video · no video`, with the video icon hidden, while the transport was in backoff. Clicking this granted the saved hint; ad sessions and saved ad requests both stayed at one. | A reserved `single-v2` entitlement is free help and must be excluded from a fresh rewarded A1 opportunity. Effect kind alone cannot distinguish these sources. |
| First error with settled fresh A1 | In a separate fresh context, Hint was visible, enabled, settled, `single-v2`, `ready`, with no saved right and no prior errors. A real first blocked-arrow tap reduced lives from 3 to 2 and emitted one `first:true`. Hint had no animation immediately after save or 700 ms later; its rectangle stayed (95.5,779,161,44), and no ad session started. | The proposed contextual cue is absent in the current baseline and can be tested as a small presentation-only change. This observation does not establish that the cue improves monetization. |

The exact `sample()/3 s` boundary race was not forced or claimed as a browser reproduction. Source confirms that `activate()` calls `takeTime()/sample()` before the save/change synchronization, whereas visibility is based on `idleMs >= 3000`. Therefore, selecting opportunity after synchronization can include a Hint that was not visible before the action. Record eligibility before this action-dependent sampling and revalidate before presentation.

## Source anchors

- [Hint visibility, readiness text, enabled state, and activation order](https://github.com/DanilaH/arrows/blob/56f65a4ee5b9b169b1a53ab21f06e186b9619d48/src/game/surface.ts)
- [Existing 900 ms Hint entrance and separate error feedback](https://github.com/DanilaH/arrows/blob/56f65a4ee5b9b169b1a53ab21f06e186b9619d48/src/game/uiMotion.ts)
- [Per-arrow `first` flag](https://github.com/DanilaH/arrows/blob/56f65a4ee5b9b169b1a53ab21f06e186b9619d48/src/domain/board.ts)
- [Reserved help labels and offer source](https://github.com/DanilaH/arrows/blob/56f65a4ee5b9b169b1a53ab21f06e186b9619d48/src/game/helpOffers.ts)
- [Reservation and entitlement application](https://github.com/DanilaH/arrows/blob/56f65a4ee5b9b169b1a53ab21f06e186b9619d48/src/progression/helpLedger.ts)

## Actual commands

Working directory: `../probe-checkout` relative to this report.

```sh
npm run build
node node_modules/vite/bin/vite.js build --ssr tools/qa/assistance-state.ts --outDir .test-output/assistance-source
```

Working directory: this report's directory.

```sh
node run.mjs
```

The script started and stopped its own server on an OS-selected free port. Final run:

```sh
node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 33157 --strictPort
```

Final result: 5 focused cases passed; zero page errors; `git status --short` empty. Server shutdown was independently checked with a TCP connect to port 33157 returning connection refused (`connect_ex=111`). Raw bounded result: `result.json` (39,012 bytes). Reproduction script: `run.mjs`. No screenshots or new demonstration video were produced because no new feature was implemented.
