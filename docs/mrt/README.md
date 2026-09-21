# Sunwater MRT — product spec pack

Durable memory for `/w/sunwater-mrt`. Chat, Neon sittings, and uncommitted polish are **not** the product. This folder is.

| Doc | Role |
| --- | ---- |
| [REQUIREMENTS.md](./REQUIREMENTS.md) | Purpose, users, surfaces, function catalogue. **CORE** cards are unchangeable unless Bill re-locks them. |
| [WORKSHOP.md](./WORKSHOP.md) | How Bill talks and how the agent turns that into cards without inventing behaviour. |
| [../mrt-gantt-pan-save-state.md](../mrt-gantt-pan-save-state.md) | Pan implementation save-state (how the camera paints). Does not replace the function cards. |
| Neon `kt-mrt-effort-reqs` | Workshop ticket (Open). Points here. |
| Neon `kt-mrt-core-behaviour` | Historical CORE notes. Catalogue in REQUIREMENTS.md is now the source; keep the ticket as a pointer. |
| Neon `kt-mrt-gantt-chrome-polish` | Parked (Later) until the spec exists. |

## Why this exists

Flush sittings kept rewriting gestures to make the current code easier (whack-a-mole). A smoothness pass disabled pan; a z-index pass hid coloured bars; a resize preview remounted the grid every week. Opening one obligation (FIA Assessment) reached ~60s.

21 Sep night: uncommitted polish discarded. Desk is HEAD `d955bdf` (pan restore `6a3ccf2` + save-state). No more Effort Gantt rewrites until Bill has locked the relevant cards.

## Builder gate

A sitting that changes `src/modules/sunwater-mrt/**` must:

1. Read this README, REQUIREMENTS.md, WORKSHOP.md, and the pan save-state if it touches a chart.
2. Name the function IDs **in scope** and the CORE IDs that must still be true when it stops.
3. Not mix a behaviour rewrite with a paint/fps flush.
4. Stop and ask if the sitting would change a CORE card.

v1 ownership (regulator cycles, catalog, hours, heatmap, exclusions) still holds: `.cursor/rules/sunwater-mrt-ownership.mdc`.
