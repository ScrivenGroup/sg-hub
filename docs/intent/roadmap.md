# Roadmap — requirements

Home: Internal → **Roadmap** (`/i/roadmap`). Overall glass (hub + all leaves, unfiltered). Survives hiding `/d`. Not nested under an `sg-hub-home`. Dummy first; Neon later.

This file is the lock for agents. UI lives in `src/core/roadmap/`.

## Why it exists

Planning glass for streams (webapps) and chunks (features/modules). Kanban is doing. Ideas are capture. Tickets should point at a chunk (late-bind allowed). Ideas are optional both ways.

## Objects

| Noun | Meaning |
| --- | --- |
| **Stream** | One webapp / product line. Open kinds: `tools`, `process`, `tied`, plus later kinds. Optional `regions[]` (steps or tools) and later `external_ties[]`. |
| **Chunk** | A labelled box. Scope is the whole stream or one region. Placement: `undeveloped`, `waiting_sequence`, `sequenced`, `future`. Grid: `col`, `row`, `w`, `h`. |
| **Band** | WIP (undeveloped + waiting), Sequential, Future. Collapsible. Height grows to fit chunks. |
| **Priority strip** | Roadmap of roadmaps. Left = higher stream priority. |

## Canvas

- One grid-matrix canvas. Snap cell is half the first dummy (`CELL` 20). Streams are columns in horizontal view, rows in vertical view. Same data; user can swap orientation.
- Rounding is slight, not pills and not bricks.
- Streams are independently sized (`cols`). Resize by dragging the stream edge. No widen icon.
- Streams move by the stream grab handle. Reorder commits on drop (do not reorder mid-drag).
- Pencil on the stream title edits the name now; more stream details later.
- New stream from the priority strip.
- **+** lives on each **section** header (adds a chunk into that section), not on the stream title bar.
- A collapsed section is header-only. No leftover empty pocket.

## Chunks

- Drag **only** from the grip. **Edit** (not info) opens the drawer. The rest of the box is not a grab target.
- Default and minimum size: **7 × 3** cells on the dense grid. Resize from all four sides and four corners. Handles stay small.
- Drag freely inside the stream, including **between sections**. Snap on drop. One row per chunk id — never duplicate on a section change.
- If a drop or resize overlaps another chunk in that band, **push the others down**. Then grow the band so every box still fits.
- A band never clips a placed chunk.
- Edit drawer can **delete** the chunk.

## Links (later than dummy)

- Chunk ↔ ticket: strong, late-bind allowed.
- Chunk ↔ idea: optional both ways.
- `feature_id`: stub for a future `dev_main` feature manager.

## Out of this leaf

- Paid canvas SDKs. Freehand whiteboard as the store.
- Per-leaf Roadmap tab (v1).
- Horizons and calendar dates as required fields.
- Building the feature manager.

## Dummy vs live

Localhost dummy uses the same types as production. In-memory until Neon. Do not put this glass on `/d`.
