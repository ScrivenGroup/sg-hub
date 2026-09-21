# MRT Gantt pan — save state (21 Sep 2026)

Restore point for **moving around** the two charts. If a later sitting makes pan feel dead, jittery, or 1 fps, read this before changing camera code.

Git: `wip/sunwater-mrt`. Effort pan restore: `6a3ccf2`. Obligations camera: `24ca6fb` (leaf 1.5.8), picture/blit: `ca7c5a3`.

Preview: `http://localhost:3001/w/sunwater-mrt` (never station `:3000` from this desk).

Pan is **CORE**. Smoothness may only change how it paints, not remove the gesture. See Neon `kt-mrt-core-behaviour`.

---

## Shared rule (both charts)

Pan is a **camera over a picture**, not a React rebuild.

During pointermove:

- No `setState` / `commit()` / store writes.
- One `requestAnimationFrame`; write transform or blit in that frame.
- Do not walk the DOM (`querySelectorAll` of cells/cams) every frame.
- Do not restyle the whole popup with a descendant selector (`.is-panning *`).
- Do not `getBoundingClientRect` / `getComputedStyle` / `scrollHeight` on move.

Bars, handles, hour inputs, and milestone diamonds keep their own gestures. Empty week header / empty track pans.

---

## Obligations Gantt (main Gantt, leaf 1.5.8)

**Where:** Gantt tab — all dams × requirement types.

**Picture:** one timeline canvas + one timescale canvas. Names are a DOM layer that rides the same camera (`translate3d` Y only).

**During pan**

1. Pointerdown on the pan root (not markers, minimap, alloc pop, inputs). Empty Resource Hours cells still pan.
2. Native `scrollLeft` / `scrollTop` on the body scroller (the camera).
3. `syncChrome` on rAF: quantise camera to whole device pixels (`quantisePx`) so blits never resample.
4. `timelineCanvas.pan()` / `timescaleCanvas.pan()` — `blitGanttScene` copies the existing pixels by the pan delta and **repaints only the uncovered edge strip**. Full `paint()` only on resize or a real scene change.
5. Label layer: one `translate3d(0, -cam.y)`.
6. Hours pane `scrollLeft` stays in lockstep without a second React pass.
7. View-band `setState` is **not** for plain pan. Only Hours / “On screen” follow the band, and only when it actually moved.

**Due-drag** is an overlay: one marker leaves the scene; the rest of the picture is not redrawn while it moves.

**Do not**

- Rebuild layout items or React rows on pointermove.
- Invalidate the whole canvas every pan frame.
- Publish the view band to React on every pan.

**Code:** `src/modules/sunwater-mrt/ui/GanttTab.tsx` (`syncChrome`, `startPan`), `GanttTimelineCanvas.tsx` (`paint` vs `pan`), `src/modules/sunwater-mrt/logic/gantt-paint.ts` (`blitGanttScene`, `GanttSceneCache`).

---

## Effort Gantt (Rebalance / Occurrence hours popup)

**Where:** Rebalance (stacked obligations) and the single-occurrence hours popup. Defaults tab is the non-freeze HTML grid (own scroller).

**Picture:** HTML week grids (hour cells stay). Freeze panes portal labels vs weeks into `frozenHost` / `chartHost`. Horizontal pan is a CSS `translate3d` camera, not `overflow-x: auto` (the timescale is `overflow-x: hidden`; a stuck camera with max pan 0 looks like pan was deleted).

**Why Rebalance was dead (and must not return)**

Portaled week rows live under `chartHost` in the DOM but in a **different React tree**. React `onPointerDown` on `chartHost` never sees those clicks.

**During pan (locked)**

1. Native `pointerdown` on `.mrt-effort-timescale` (`EffortPopupShell` listener → `panDownRef`). Also `startPan` on the portaled week-header / chart stack.
2. First stacked chart registers `panDownRef` (`timescaleOnly && !hideWeekHeader`).
3. **One** `translate3d` on `freeze.chartHost` per frame. Nested hour grids **ride** that layer — do not transform each `[data-effort-cam]` or each cell.
4. Cache cam layers, `contentW`, `viewW`, `maxTop` on pointerdown. rAF only writes transform and integer `scrollTop` when the value changed.
5. Store cam x on the clip expando. Set `--effort-cam-x` only on `.effort-gantt` (Defaults label counter-shift). **Never** inherit `--effort-cam-x` onto `.mrt-effort-timescale` (style recalc of the whole stack).
6. Cursor: set grabbing on the grabbed node only. Do not `.mrt-effort-popup.is-panning *`.

**Do not**

- `querySelectorAll("[data-effort-cam]")` every frame.
- `content-visibility` on the first stack (kills week-header hit testing).
- `commit()` / `setState` on pan move.
- Replace the native timescale listener with React-only `onPointerDown` on `chartHost`.

**Code:** `src/modules/sunwater-mrt/ui/EffortGantt.tsx` (file-top pan lock comment, `startPan`, `writeEffortCamX`), `EffortPopupShell.tsx` (native listener), `StackedEffortModal.tsx`, `mrt-tables.css`.

---

## How to use this save state

If pan regresses:

1. Diff against this commit and `6a3ccf2` / `24ca6fb`.
2. Check the DO / DO NOT lists above before inventing a new camera.
3. Verify on `:3001`: Obligations Gantt pan (all dams), then Rebalance Effort Gantt (1 obligation and many), then one Occurrence hours popup.
4. Do not “fix fps” by disabling pan.

Effort Gantt still stays an HTML table. Copy **timing** from the main Gantt (rAF, no React on move, one compositor layer). Do not copy the canvas/blit machinery onto Effort unless a later ticket explicitly says so.
