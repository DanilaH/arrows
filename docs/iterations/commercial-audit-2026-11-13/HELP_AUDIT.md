# Arrows: independent assistance audit

Snapshot: `794bef1e5056800f2dd42343b02fe5f8fb1b586c`, application `0.23.0` / Android code 35. Source checkout: `/workspace/scratch/e5bf09a1dcbf/arrows-commercial-audit-20261113`. Read-only audit; no product files, instructions or existing handoff were edited.

## Main conclusion

The substantial C/A1/A2/A3/A4/B1 engineering package is already present. Recommending that it be implemented again would be wrong. Normal fresh attempts use A1 (`single-v2`); A2, A3 and A4 are separately selected future-attempt QA variants, and B1 is a separate target laboratory. The bounded review found one concrete, relatively small missing requirement in A1: the actual camera does not reach its visibility tie-break. It did not establish a new high-severity reward-loss/duplication defect in the inspected paths.

This is a static code/contract audit plus independent execution of actual domain code. The parent task performs the current build and relevant browser regressions. Existing repository PASS reports are prior evidence, not executions made by this sub-audit. No physical device, native SDK session, player cohort or revenue dashboard was inspected here.

## HELP-01 — A1's camera tie-break exists but is not connected

**Classification:** confirmed missing task requirement; low-to-medium UX importance, not reward corruption. Revenue effect unknown.

**Contract:** `docs/iterations/assistance-2026-11-13/TASK.md:113–120` ranks actual marked-auto release first, newly freed ordinary moves second, and then legibility/visibility within the current camera. There is no separate explicit acceptance ID for this tie-break; A-02/A-03 primarily cover usefulness and a legal fallback. Thus a blanket PASS for A1 does not prove camera-aware selection.

**Actual code:**

- `src/domain/assistance.ts:71–83` supports a `visible` set and prefers its member when native and newly-free counts tie.
- `src/domain/assistance.ts:100–102`, `src/progression/helpLedger.ts:49–68`, and `src/progression/save.ts:363–365` can propagate that set.
- The application caller `src/game/helpOffers.ts:16–20` calls `progress.helpOffer(attempt, placement)` with no third argument. Its cache key contains board, assignment and rights, but no visibility/camera context.
- Other `visible` naming in `helpOffers.ts:22–35` records whether an offer button is visible; it is unrelated to board candidate visibility.

**Independent evidence:** `HELP_PROBE.json` calls actual `Board`, `chooseSingle` and `makeOffer` at this SHA, not a copied model. Results on real unmodified content:

| State | Application-equivalent default | Equally useful candidate in supplied visible set | Actual explicit-visible result |
|---|---|---|---|
| c20, initial | c20-1, native 0 / new-free 1 | c20-3 | c20-3 |
| c120, initial | c120-0, native 0 / new-free 1 | c120-3 | c120-3 |

The probe establishes that this tie-break can change the real selection and that the application omits its input. It does **not** claim that these alternatives were visually panned onto a physical phone in this sub-audit, nor how often users encounter the condition.

**Bounded correction proposal:** before freezing an A1 offer, provide the actually visible eligible arrow IDs from the current camera/play area; include that visibility snapshot in the offer cache invalidation. Preserve the first two usefulness priorities. Freeze the selected plan before the ad as now; never retarget an already earned right just because the camera moved. Re-evaluate only unaccepted offers on a meaningful camera change, not every animation frame.

**Acceptance:** two equal-usefulness free candidates, only one visible; offer chooses visible. A more useful offscreen candidate retains priority. Once accepted/earned, pan, reload and off-path moves preserve the promised target. Use real input/camera in a browser case and later verify readability on the target phone.

## Current delivery map: avoid duplicate or premature scope

| Item | Actual state and anchors | Interpretation |
|---|---|---|
| C: immutable descriptors | `save.ts:368–380` persists request before `surface.ts:175–177` calls the SDK | Already implemented. Failed/uncertain write must remain a blocker to show. |
| C: exact reward ownership | `save.ts:338–359`, `helpLedger.ts:139–162` | Missing new descriptor quarantines; occupied slot is not overwritten; late incompatible rights reserve. |
| C: explicit saved rights | `helpLedger.ts:128–137,164–180`, `save.ts:382–388` | Typed amount and identity survive retirement; compatible claim is explicit and does not require a second ad. |
| A1 | `helpLedger.ts:30,49–68`, `assistance.ts:70–83` | Default new-attempt variant; actual Board activation and native closure used. Camera tie-break remains disconnected. |
| A2 | `assistance.ts:106–125,128–169`, `save.ts:225–270` | Fixed initially blocked causal ordinary group; one atomic accepted result; native marked chain is separate and unbounded by the bonus limit. |
| A3 | `assistance.ts:38–68`, `helpLedger.ts:128–130,160`, `save.ts:232–252` | Manual route, actual removed IDs drive pending steps, target closes once, retired partial route preserves only pending budget. |
| A4 | `helpLedger.ts:52–59,141–152`, `save.ts:353–358` | A single entitlement owns lives and single-help components. Late collision reserves the single while applying eligible lives; retained-only promise never manufactures a new hint. |
| Legacy/gift | `helpLedger.ts:109–125`, `save.ts:311–315,350–353` | Old single meaning retained; lifetime gift and schema1 lives remain lives-only. |
| QA activation | `helpOffers.ts:69–82`, `save.ts:390–403` | Variant selector only rendered for playtest, applies to future attempts; not evidence of a public A/B rollout. |
| B1 | `src/lab/targetStore.ts`, `src/lab/main.ts:18–19,31–44` | Own saved state and target completion; ads/analytics destroyed; no campaign win or cadence credit. The laboratory is included as a separate build entry but only linked by the playtest UI. |

## Independent representative domain execution

`HELP_PROBE.json` includes four actual states. It validates any generated A2/A3 plan through the production validator and derives the A2 result through the production predictor:

- c01 initial: legal A2 root 0 + bonus 1/2 completes the three-arrow field. This is within the agreed fixed bonus size; it is not an unbounded auto-clear bug. Normal users are not assigned A2 by default.
- c20 initial: A1 root 1; A2 root 9 + bonus 12/15; A3 9 → 12 → 15.
- c40 after accepted removals 0–20: A1 root 22 exposes 23/24/27; A2 root 22 + bonus 23/24/27 changes 19 remaining to 15; A3 22 → 23 → 28.
- c120 initial: A1 root 0; A2 root 0 + bonus 12/13; A3 0 → 12 → 13.

These are engineering diagnostics, not estimates of natural player-state frequency or commercial value. They substantiate that the new helpers do have different actual effects, rather than only different labels.

## What deserves the next decision

1. Close HELP-01 as a small completion of the existing A1 contract, alongside the more important defects found by the whole audit.
2. Keep A2/A3/A4 separated while testing the exact current APK with a person. The useful comparison is understanding before the ad, deliberate first action, observable progress, return to independent play and repeat difficulty—not simply whether the plan is solvable. No extra helper type or new adaptive level director follows from this code review.

Existing outcome events already include actual assistance use/progress and post-continue first successful move/repeat loss/exit/complete (`save.ts:239–270`; `helpLedger.ts:32–40`; `helpOffers.ts:56–67`). Therefore, “add all post-help measurement from scratch” would duplicate current work. Whether those events are complete and exported reliably belongs to the parent measurement audit, and live conversion/revenue is still unmeasured.

## Audit boundaries

Read current AGENTS, HANDOFF, PROJECT_DECISIONS, KIT_REUSE and TASK_ROUTER; used the assistance/receipt contract and the existing game-specific task/acceptance criteria. Prior handoff's references and code evidence are authoritative over old stage names. Did not reinterpret a future laboratory (cadence, B2/B3) as an overdue implementation defect. Did not modify source, saves, analytics or external accounts. No kit primitive defect was established by this sub-audit; KIT IMPACT: NONE (audit only).
