# Roadmap — requirements

Home: Internal → **Roadmap** (`/i/roadmap`). Overall glass (hub + all leaves, unfiltered). Survives hiding `/d`. Not nested under an `sg-hub-home`. Dummy first; Neon later.

This file is the lock for agents. UI lives in `src/core/roadmap/`.

## Leaf tabs

Under the breadcrumb on `/i/roadmap`:

| Tab | Contents |
| --- | --- |
| **Roadmap (v1)** | This canvas. |
| **Roadmap (v2)** | Placeholder. Another view. Not this version. |
| **Development** | Requirements (short brief on the tab — not this whole file), then Inbox, Kanban, Changelog (this leaf only), Notes. No Train, no SG Hub Changelog, no Design spec. |

## Brief

The Requirements tab shows this, and only this. Do not paste this file onto that tab.

- Show current and future work as chunks: a function, a feature, or a big idea.
- A chunk summarises captured ideas. It is not a second copy of each idea.
- Priority lives on the roadmap, from where a chunk sits. The inbox does not decide what gets built.
- This leaf is the source of truth. Each desk uses it, updates it, and checks it before starting work.

Guardrails: v1 canvas stays in memory until Neon. v2 is a placeholder. Do not fake chunk links to a ticket, an idea, or a changelog row. Stream kind, regions, ties, dates, a feature manager, and auto-complete from Kanban stay Later. A per-leaf Roadmap uses the single-stream layout and is not this version.

## Why it exists

Planning glass for streams (webapps) and chunks (features/modules). Kanban is doing. Ideas are capture. Tickets should point at a chunk (late-bind allowed). Ideas are optional both ways.

---

## Definitions

| Noun | Meaning |
| --- | --- |
| **Stream** | One webapp / product line. Open kinds: `tools`, `process`, `tied`. Optional `regions[]`. On the **overall** canvas it is free-placed (`canvasCol`, `canvasRow`). Optional `collapsed`, `collapsedCols` / `collapsedRows`, `frameRows`, `bandRows` / `bandCols`. |
| **Chunk** | A labelled box inside a stream section. Placement: `undeveloped`, `waiting_sequence`, `sequenced`, `future`, `completed`. Grid: `col`, `row`, `w`, `h`. Optional `locked`, `assignee`, `notes`. |
| **Section / band** | WIP, Sequential, Future, **Completed**. Collapsible. Completed starts collapsed and shows a count. The stream + its open sections are the **bounding containers** for chunks. |
| **Sequence SKU** | Derived, never stored. Chunks in that stream’s Sequential window: `S1`…. Streams on the canvas: `T1`…. Both read **top-left, then right, then down**. Lower number = higher priority. |
| **Selected stream** | The stream the user last clicked. Surfaces to the top (`z`) so they can work in it. Not the same as chunk multi-select. |
| **Collapsed** | Snap frame **12 × 5**. Header only at that min. Growing the frame while still collapsed **peeks** clipped sections/chunks. |
| **Peek** | Collapsed stream resized larger than 12 × 5. Body is visible but clipped. Still collapsed until Expand / Expand All. |
| **Fullscreen** | One stream fills the playground pane. Not free-placed. Same default as a single-leaf / single-stream roadmap. |
| **Overall canvas** | Multi-stream free grid. Only exists when more than one stream is on screen and none is fullscreen. |
| **Autofit** | Pack chunks top-left → right → down (honour grow rules) and grow the frame to fit. Does not invent features. |
| **Reorganize** | Pack stream **positions** (and refit frames). Does not change chunk contents. |
| **Legend** | Single-page explainer: icon / example visual, name, brief description. |

---

## Look (design)

- **Overall** playground: lighter page wash, same dark dots. Stream bodies use the section grid.
- Stream chrome is **blue-ish** (`#3B78C4` mix). Chunks stay surface / ink.
- Section **headers** have a tinted bar.
- Rounding is slight, not pills and not bricks.
- Band tints on the **chunk box** (locked wins):

| Placement | Tint |
| --- | --- |
| **WIP** | Lighter grey |
| **Sequential** | Darker official grey |
| **Future** | Blue-ish |
| **Completed** | Green, same treatment as lock amber |
| **Locked** | Amber border + lock well. No resize. |

- **Priority strip** controls match the **zoom** control height (`[-] n% [+]`). Compact, not full `sg-btn` min-height.
- **Every button has a border** (icon buttons included).
- Every control has a **tooltip**.
- Clickable elements use the **correct cursor**: `pointer` on buttons/chips, `grab` on stream header / chunk grip, resize cursors on handles, `default` on inert chrome.

---

## Layout

- Snap cell is `CELL` 20.
- **Section axis is the opposite** of the stream-stack label. Same chunk `col` / `row`; parallel boxes stay parallel.

| Toggle | Streams (if several, on overall) | Sections inside a stream |
| --- | --- | --- |
| **Horizontal** | Packed left → right, wrap down | Stacked |
| **Vertical** | Packed top → bottom, wrap right | Across |

Grow a section in its **normal** direction so it does not shove a neighbouring stream:

- Horizontal (sections stacked): new chunks wrap **down**. Do not grow stream **width**.
- Vertical (sections across): new chunks wrap **right**. Do not grow stream **height**.

Persist `sg-roadmap-orient` and `sg-roadmap-zoom`.

- Open sections **resize** (height when stacked, width when across).
- **+** on WIP / Sequential / Future only. No + on Completed.
- Collapsed **section** = header only.
- Stream sequence SKU (`T1`…) from canvas position: top-left, right, then down.
- Pencil edits the stream name. New stream from the strip.

### Overall canvas (several streams, not fullscreen)

- Streams are free-placed. Drop does **not** shove neighbours.
- **Reorganize streams** packs them. **H/V** also reorganizes (and refits frames to content height).
- Canvas has slack past the last stream so drag is not boxed by the content edge.

### Fullscreen / single stream

- The stream **container fills the playground** under the strip. No `canvasCol` / `canvasRow`. No empty canvas around it.
- Keep H/V and zoom. Exit on the strip. Escape exits.
- Hide the multi-stream chip row and New stream while fullscreen.
- This is the default when the glass is only one leaf / only one stream.

### Clip (no overflow)

- Stream and section are the bounding boxes. Chunks **do not** paint outside them (`overflow: hidden`).
- The yellow-squiggle leftovers (empty band width/height with chunks hanging off) are a bug, not a feature.

### Stacking (`z`)

- Default: **T1 above T2 above T3…** (higher sequence = higher `z`).
- **Selected** stream (last click anywhere on that stream) is above all others.
- A stream being moved/resized is above others for the gesture.
- Collapsed / peek does **not** automatically win `z` (revoked).

---

## Behaviour

### Strip

- Zoom `[-] n% [+]`. Expand All, Collapse All, Autofit page, Reorganize streams, H/V (click **anywhere** toggles, then reorganizes), New stream (overall only), Exit fullscreen (fullscreen only), **Legend**.
- Stream chips (overall only): title + fullscreen **inside** one box.

### Select

- Pointer down **anywhere** on a stream (header, body, handles) selects it and surfaces it.
- Header is still the drag handle (buttons still click).

### Collapse / expand / peek

- **Collapse** / Collapse All: snap to **12 × 5**, hide body (header only).
- **Expand** / Expand All: open as expanded, grow the frame to show all chunks if needed.
- Icons: four-arrows-in / four-arrows-out.

### Chunks

- Drag from the grip. **Edit** opens the drawer.
- **Marquee** on empty section grid selects many. **Shift+click** adds / removes. Drag any selected grip to move the group.
- **Double-click grip** locks. **Double-click lock** unlocks.
- Default and **minimum** size: **7 × 3**, prefer autosize to the title width when the row has room.
- Resize from all sides and corners. Handles are hairline, **hover only**.
- **Resize vs stream/section edge:** opposite sides stay **anchored**. Leftover drag at the bound grows the other axis (chunk only).
- New chunk: first free slot **top-left → right → down**, honouring the grow rule.
- Overlap pushes unlocked siblings. Locked boxes never move.
- **Assignee:** user icon on the box, hover shows the id.

### Chunk drawer

- No Close. **Save** and **Cancel** on the right. Lock / Complete / Delete on the left.
- **Complete** = green. **Lock / Unlock** = lock icon + amber. **Delete** = trash + red.
- Dummy **notes** and **Assigned to**. Save writes them.
- Complete (manual) → Completed. Reopen → Sequential.

### Legend

- Strip button opens a viewport-capped dialog.
- One page. Rows: **icon / example visual | Name | Brief description**.
- Covers nouns (stream, chunk, section, SKU), band colours, and every strip / stream / chunk control.
- Close / got-it. No fake features in the copy.

---

## Stream resize — scenarios

Code these. During drag the frame follows the **pointer 1:1** (delta from gesture start against the **original** box — do not accumulate). Min collapsed 12 × 5. Min expanded: header + one section header.

| # | User action | During drag | On release |
| --- | --- | --- | --- |
| 1 | Collapse button / Collapse All | — | Snap **12 × 5**. Header only. `collapsed = true`. |
| 2 | Expand button / Expand All | — | `collapsed = false`. Grow frame to fit all chunks if needed. |
| 3 | Resize **expanded** **larger** | Frame grows. Empty slack in the stream. Chunks stay put. Clip still on. | Keep the larger size. |
| 4 | Resize **expanded** **smaller**, contents still fit | Frame shrinks. Clip. | Keep the smaller size (user slack removed). |
| 5 | Resize **expanded** **smaller than contents** | Clip. Chunks must not hang outside the stream/section. | **Autofit** that stream (pack chunks + fit frame). |
| 6 | Resize **collapsed** at 12 × 5 **larger** | Body **peeks** (clipped sections/chunks). Still `collapsed`. | Keep peek size. Do not autofit. Do not expand. |
| 7 | Resize **peek** back to 12 × 5 | Peek shrinks. | At min: header only again. |
| 8 | Resize **peek** large enough to show everything | Still collapsed + clipped. | Stay collapsed until Expand. (No silent expand.) |
| 9 | Stream resize handles (N/S/E/W/corners) | Pointer and edge stay together. Zoom-aware (`dx / (CELL × zoom)`). Apply delta to the **start box**. | Per 3–8. |
| 10 | Fullscreen | — | Fill the pane. No canvas place. No stream-frame resize (the pane is the frame). Section resize still works. |
| 11 | Exit fullscreen | — | Return to overall place (`canvasCol` / `canvasRow` unchanged). |
| 12 | Reorganize / H/V | — | Pack positions. Refit frames to content. Selected stream stays selected. |

---

## Conflicts (this pass vs earlier locks)

These **replace** the older sentences. Do not implement both.

| Topic | Old lock | Now |
| --- | --- | --- |
| Overflow | Chunks may overflow the section / draw over borders | Stream + section **clip**. On expanded shrink-past-contents, **autofit** on release. |
| `z` | Collapsed streams always paint above expanded | **T1 above T2…**. Click **selects** and surfaces. Gesture lifts. |
| Collapse body | Contents always hidden while collapsed | Hidden at **12 × 5**. Larger = **peek**. |
| Fullscreen | Hide siblings but the stream stays free on the canvas | Stream **fills the page**. Canvas place is overall-only. |
| Autofit vs shrink | Autofit was a button only | Button remains. Also runs on release of scenario 5. |

No conflict with: H/V invert, sequence SKU derivation, free-place without neighbour-shove, header-as-drag, chip-internal fullscreen, drawer Save/Cancel, band colour set, dummy-in-hub.

---

## Links (later than dummy)

- Chunk ↔ ticket: strong, late-bind allowed.
- Chunk ↔ idea: optional both ways.
- `feature_id`: stub.
- Completed ↔ changelog register. Do not fake that wiring yet.

## Out of this leaf

- Paid canvas SDKs. Freehand whiteboard as the store.
- Per-leaf Roadmap tab (v1) — when it exists, it uses the **fullscreen / single-stream** layout.
- Horizons and calendar dates as required fields.
- Building the feature manager.
- Auto-complete from Kanban.

## Dummy vs live

Localhost dummy uses the same types as production. In-memory until Neon. Do not put this glass on `/d`.
