# Features

| Feature | Status | Notes |
| ------- | ------ | ----- |
| Login + Home (4 Hubs) | done | Phase 1 localhost |
| Shell chrome (Home, map, profile) | done | Phase 1 |
| System Definition (map + deps) | done | Phase 1 |
| Internal Ideas + Notes stubs | done | Phase 1 |
| Development choices (`/i/dev-choices`) | building | Locked standards register; agents read `docs/DEV_CHOICES.md` |
| Work/Projects hub + Fuel Tracker shell | done | Mobile-framing demo |
| Sunwater MRT (`/w/sunwater-mrt`) | live | v1.0 — Gantt, Obligations, Inputs, Definitions, Defaults; guest view via `MRT_SHARE_PASSWORD` |
| Entra + Azure live | proposed | Phase 2–3 |

## Sunwater MRT — order of work

A **flush** is a polish pass on something that already works: performance,
feedback while it thinks, and the small behaviours that make it feel finished.
No new v1 scope (`sunwater-mrt-ownership` still holds).

| # | Flush | State | What it covers |
| - | ----- | ----- | -------------- |
| 1 | Main Gantt | leaf 1.5.8, on `wip/sunwater-mrt` | One camera over the picture: pan, FY, zoom and due-drag off React and off full repaints. Spinner while the chart rebuilds. Filters and camera survive a tab switch |
| 2 | Effort Gantt | next | The occurrence popup timeline. Expect the same faults as the main Gantt had: state changes on every pointer move, whole-surface redraws, hour cells rebuilt per drag. Also finish the reset story — a reset occurrence must read as predicted everywhere |
| 3 | Shareable link | after that | The guest share door and sandbox (`mrt-share`, `/w/sunwater-mrt/guest`): link handling, what a guest sees, and how a shared copy is reset |
| 4 | Future features | not started | Only on request. v1 still excludes Followups, Assumptions, non-resource costing and any levelling algorithm. Grey hour bars under the tails wait for the hours sitting |