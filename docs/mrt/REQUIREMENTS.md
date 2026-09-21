# Sunwater MRT — requirements catalogue

Source of product behaviour. Status rules: [WORKSHOP.md](./WORKSHOP.md).

Git restore point for charts: HEAD `d955bdf` (Effort pan `6a3ccf2`, Obligations camera `24ca6fb` / `ca7c5a3`). Preview: `http://localhost:3001/w/sunwater-mrt` (never station `:3000` from this desk).

Blank purpose / user rows are **for Bill**. Do not fill them from guesswork.

---

## P-APP-01 Purpose of the app

| Field | Value |
| ----- | ----- |
| Purpose | *(Bill)* Staff plan people-hours against regulator cycles (dam × requirement type), not named engagement milestones. |
| Who | Scriven planners on the hub; guest via `MRT_SHARE_PASSWORD` is a demo door, not client Entra. |
| Status | CORE (v1 ownership) |
| Out | Followups, Assumptions, non-resource/intangibles costing, any levelling algorithm. |

Locked v1 (do not reopen in a flush sitting):

1. Regulator cycles (dam × requirement type).
2. Seeded 24×11 catalog; staff may add/rename.
3. Plan hours on Defaults (roles) and occurrence popup (people); seed-once merge.
4. Overrun heatmap: blank / yellow / red. No levelling.
5. Out of v1 as above.

---

## Surfaces

| ID | Surface | What it is | Spec status |
| -- | ------- | ---------- | ----------- |
| OG | Obligations Gantt | Canvas chart on the Gantt tab: all dams × requirement types | CORE gestures locked; purpose for Bill |
| EG | Effort Gantt | HTML week grid in Rebalance and Occurrence hours popup | CORE gestures locked; workshop first |
| RB | Rebalance | Stacked Effort Gantts for many obligations | Confirm vs OC |
| OC | Occurrence hours | Single-obligation Effort popup (e.g. FIA Assessment) | Confirm vs RB; open-time is a user requirement |
| DF | Defaults | Role hours grid (no freeze camera) | Not yet workshopped |
| HS | Resource hours / heatmap | Alloc pop, overrun colours | Overlay polish parked |
| IN / DEF | Inputs, Definitions | Catalog / dams / requirement types | Not yet workshopped |
| SH | Guest share | Sandbox copy | After Gantt flush (features.md #3) |

---

## User requirements (seed)

### U-01 Plan hours on one obligation without waiting a minute

| Field | Value |
| ----- | ----- |
| Who | Planner |
| Trigger | Click a single obligation (example: FIA Assessment) |
| Requirement | Occurrence hours must open in a few seconds, not ~60s |
| Status | CORE (stated 21 Sep night; restore to `d955bdf` is the baseline) |
| Do not | Walk/rebuild the whole Rebalance stack to open one occurrence |

### U-02 See and drag the work as coloured bars

| Field | Value |
| ----- | ----- |
| Who | Planner |
| Trigger | Open Effort Gantt (1 or many obligations) |
| Requirement | Tasks show as full-width coloured runs at the right weeks; task and summary bars are draggable |
| Status | CORE |
| Do not | Cover bars with hour cells; replace bars with 1px grey ticks; offset the run from its weeks |

### U-03 Move around the picture

| Field | Value |
| ----- | ----- |
| Who | Planner |
| Trigger | Drag empty week header / empty track / timescale (both charts) |
| Requirement | The picture slides. Pan is a camera, not a React rebuild |
| Status | CORE |
| Save-state | [docs/mrt-gantt-pan-save-state.md](../mrt-gantt-pan-save-state.md) |
| Do not | Disable pan to chase fps; `commit` / `setState` on pointermove |

---

## Function catalogue — Obligations Gantt (`OG`)

### F-OG-01 Pan the canvas

| Field | Value |
| ----- | ----- |
| Surface | Obligations Gantt |
| Trigger | Pointerdown on pan root (not diamond). Empty Resource Hours cells still pan. Tail / lead-in is pan, not drag. |
| Behaviour | Camera over one picture: native scroll + blit of existing pixels; names ride `translate3d` Y |
| Status | CORE |
| Do not | Rebuild layout items or React rows on pointermove; invalidate the whole canvas every pan frame |

### F-OG-02 Milestone diamond due-drag

| Field | Value |
| ----- | ----- |
| Surface | Obligations Gantt |
| Trigger | Pointer on the diamond (short hold). |
| Behaviour | Only click-drag on this chart. Changes due date. Overlay: one marker leaves the scene; the rest of the picture is not redrawn while it moves. |
| Status | CORE |
| Do not | Click-drag the tail / lead-in; add other click-drags on this chart |

---

## Function catalogue — Effort Gantt (`EG`)

Shared by Rebalance and Occurrence unless a card says otherwise. Effort Gantt stays an HTML week table. Copy **timing** from the main Gantt, not canvas/blit machinery.

### F-EG-01 Pan the week grid

| Field | Value |
| ----- | ----- |
| Surface | EG (Rebalance + Occurrence) |
| Trigger | Drag week header, empty chart, timescale. Not a bar / handle / hour input. |
| Behaviour | One `translate3d` camera on `freeze.chartHost` per frame. Nested grids ride it. Native timescale listener (portaled weeks are a different React tree). Must actually move on 1 and many obligations. |
| Status | CORE (restore `6a3ccf2`) |
| Do not | `querySelectorAll("[data-effort-cam]")` every frame; React `onPointerDown` only on `chartHost`; `commit` on move; kill pan to make fps look fine |

### F-EG-02 Milestone diamond (due date)

| Field | Value |
| ----- | ----- |
| Surface | EG |
| Trigger | Drag the diamond |
| Behaviour | Change due date. If stick is tail-start or tail-end, matching tasks shift; preview must match drop. Unstick: milestone row only. |
| Status | CORE |
| Do not | Remove this gesture; preview only the diamond when stick is on |

### F-EG-03 Obligation tail-end (duration)

| Field | Value |
| ----- | ----- |
| Surface | EG only (not OG) |
| Trigger | Drag the tail end |
| Behaviour | Change tail duration |
| Status | CORE |
| Do not | Strip this when removing OG tail-drag |

### F-EG-04 Parent / summary bar move

| Field | Value |
| ----- | ----- |
| Surface | EG |
| Trigger | Drag an L0 / L1 / group bar (not the edge handle) |
| Behaviour | Move the summary and all matching children. Preview shadows the same set `commit` moves. Child bar move updates parent summary bar(s). |
| Status | CORE |
| Do not | Move only the grabbed row |

### F-EG-05 Individual task bar move

| Field | Value |
| ----- | ----- |
| Surface | EG |
| Trigger | Drag an L2 / resource bar |
| Behaviour | Move that task; parent summary bars update |
| Status | CORE |
| Do not | Leave bars undraggable under hour cells |

### F-EG-06 Task edge grow / shrink

| Field | Value |
| ----- | ----- |
| Surface | EG |
| Trigger | Drag the start or end of a task bar |
| Behaviour | Grow/shrink that task. Pointermove = preview only (transform/width, one rAF). Pointerup = one `commit`. |
| Status | CORE |
| Do not | `commit` / remount HourGrid on every week jumped |

### F-EG-07 Summary edge grow / shrink (touching)

| Field | Value |
| ----- | ----- |
| Surface | EG |
| Trigger | Drag the start or end of a summary bar |
| Behaviour | Only bars whose start or finish **touches** the summary edge being dragged. Interior children stay put. Preview shadows only those touching bars. Drop matches preview. |
| Status | CORE |
| Do not | Resize every child in scope (the 18 Sep smoothness rewrite) |

#### F-EG-07a Expand hours (stated, confirm wording)

| Field | Value |
| ----- | ----- |
| Surface | EG summary edge |
| Behaviour | Expand: only children with hours in the summary **edge week**; copy that week’s hours into the new week(s). |
| Status | intended (stated 21 Sep evening; polish parked before a clean land) |
| Do not | Copy hours onto children that did not have hours in the edge week |

#### F-EG-07b Shrink hours (stated, confirm wording)

| Field | Value |
| ----- | ----- |
| Surface | EG summary edge |
| Behaviour | Shrink: zero only the week(s) leaving the summary, and only where those weeks had hours. Do not slide every child inward. |
| Status | intended (same as 07a) |
| Do not | Shrink every child span toward the new edge |

---

## Cross-cutting rules (all charts)

### F-APP-01 Flush may not redefine CORE

Performance, smoothness, freeze-pane, overlay, and spinner work may only change **how** a gesture paints. If the fix would change CORE, stop and ask.

### F-APP-02 No rebuild on pointermove

During pan and during bar/edge/due drag: no `setState` / `commit()` / store writes on move. One `requestAnimationFrame`. Commit once on pointerup.

### F-APP-03 One sitting, one cluster

Do not mix hours-overlay / z-index / cursor / button-spinner / touching-hours semantics into a pan sitting, or pan into a colour restore. If colours, pan, or occurrence-open regress, restore first.

---

## Parked (not CORE — do not mix into a restore)

From `kt-mrt-gantt-chrome-polish` (Later) and earlier flush tickets:

- Hours overlay that stays until the new table is ready
- Week header z-index vs name/meta
- 4-way cursor on the diamond
- Wheel pan (if not already in `d955bdf`)
- Centre around all obligations
- Button wait indicators / paint-busy everywhere
- Sticky Rebalance headers / footer, popup condense
- Week zoom default ~57%
- Resource Hours popup off-screen clamp

These may return **after** the related CORE cards are locked and the restore baseline is stable.

---

## Proposed (not locked)

_Workshop sitting fills this, then Bill locks. Agent: do not delete CORE cards to make room._
