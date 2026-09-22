# Development choices

Canon for agents and humans. Do not contradict **locked** rows. In-app: Internal → Development choices (`/i/dev-choices`). Store: `data/dev-choices.json`.

---

### `dc-sessions` — sessions (locked)

**Decision:** One chat = one job. Durable truth lives in repo files; harvest leftovers into canon; no transcript dumps; pin fat threads.

### `dc-w-studio` — /w-studio (locked)

**Decision:** Build and demo here. Do not host `/w/` apps as the client's production; packaging into their environment is a later job.

### `dc-guest-entra` — auth (locked)

**Decision:** Staff Entra already exists. DIY guest password is the cheap demo door. Client Entra on this studio is org-work; it does not replace a sandbox and does not buy packaging. No Entra for Sunwater client users on this host.

### `dc-guest-shape` — reuse (locked)

**Decision:** One product, two desks (live JSON vs sandbox). No guest fork of every function. Current code is MRT-named; the next `/w/` app reuses the pattern via later `fb-public-hub-share`, not a copy-paste of mrt-share.

### `dc-demo-artifact` — packaging (locked)

**Decision:** The demo artifact is a guest link, not a standalone `.html` of the Next app.

### `dc-janitor` — janitor (locked)

**Decision:** No folder reorg as a prelude to a feature. Structure is its own planned cycle.

### `dc-agent-intake` — agents (locked)

**Decision:** Before planning or building, read `docs/PLATFORM.md`, `docs/DEV_CHOICES.md`, and `docs/WEB_DEVELOPMENT.md`. Do not contradict locked rows. Two-agent rules: `docs/TWO_AGENTS.md`.

### `dc-web-stack` — html (locked)

**Decision:** All new hub UI is Next.js App Router + React + TypeScript + Tailwind + SG tokens (Appearance). my-site vanilla HTML/MD3 is a legacy island until the Great Merging. No third front-end kit.

**Why:** Hub products are app rooms (Gantt-class UI). Leaflet HTML cannot host that without a rewrite. One kit so requests do not need stack trivia.

### `dc-leaf-cycle` — leaf (locked)

**Decision:** Leaves ship in order: local dummy → skin location online (`sketched` shell + plan) → skeleton mockup online (`building`, same store types) → clean revision (`live`) → numbered+dated changelog cycles. Details: `docs/WEB_DEVELOPMENT.md`.

### `dc-leaf-contract` — leaf (locked)

**Decision:** Every leaf has a Development surface (changelog + bulk notes). Versions show number and datetime when shipping. Global chrome always has Feedback to one register. Site network is the fast-travel map. Details: `docs/WEB_DEVELOPMENT.md`.

### `dc-design-defaults` — design (locked)

**Decision:** Start from SG chrome and `globals.css` (`sg-card`, `sg-btn-*`, `sg-input`, tokens, Manrope, 10px radius). Hex on badge only unless a ThemeContract. Viewport-capped dialogs. Do not copy my-site MD3 onto hub pages.

### `dc-db-cutover` — data (locked)

**Decision:** Durable data via existing `DATABASE_URL` (Postgres/Neon), evolving `json-store` / `mrt-share`. Simple stores first, then MRT (guest sandbox/share design revisited in that pass). Zip must not ship `data/`. Plan: `docs/NEON_CUTOVER.md`.

### `dc-publish` — publish (locked)

**Decision:** Loop: you vibe, Cursor codes, localhost, you review, you say commit (commit **and** push to the current GitHub branch; merge to `dev_main` is never implied), you say make it live. A desk is `dev_main` or `wip/<leaf>`: wip only hands over a clean save-slot; station only takes finished blocks and never produces product. Prepare / handover / ready for station is not merge. Make it live = fast-forward `main` to `dev_main`, then tag `hub-*`/`v*` or GitHub **Run workflow** (same zip via OIDC onto `app-scrivengroup`). Hand zip is fallback. Push/merge `dev_main` is not live. Fast-forward `main` without the zip is not Azure. Details: `docs/GIT_AND_RELEASE.md`.

### `dc-versioning` — versioning (locked)

**Decision:** Two clocks. **Train** (website zip) is `vX.Y`: each make-it-live bumps to the next X.Y; **MAJOR** only if Bill asks. A hotfix still takes the next X.Y and shows a **Hotfix** chip only (not on regular Trains). No Train PATCH segment, no a/b/c. Git tag `hub-X.Y`. Home: chrome version → `/i/train-changelog`. **Leaf** (hub suite included) is always `X.Y.Z` (pad `1.6` → `1.6.0`). Unchanged leaves do not bump. Y when that leaf ships in a Train; Z on the wip desk per slice. Localhost slices may use PATCH until that leaf ships in a Train. Homes: leaf Development Changelog; wrapping suite → `/d/changelog` (SG Hub). Do not collapse to one website SemVer. Do not put Train as X.Y.Z. Details: `docs/GIT_AND_RELEASE.md`.

### `dc-great-merge` — merge (locked)

**Decision:** Great Merging of ’26: my-site apps become hub leaves; Cursor implements; Claude/you export files + data (no secret strings). Not a git merge of stacks. Plan: `docs/GREAT_MERGING.md`.

### `dc-two-agents` — agents (locked)

**Decision:** Cursor is the only agent that ships the hub. Claude owns my-site until a leaf moves, then stops editing that leaf. Claude does not zip-deploy `app-scrivengroup`. Treaty: `docs/TWO_AGENTS.md`.
