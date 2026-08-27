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

**Decision:** Before planning or building, read `docs/PLATFORM.md` and `docs/DEV_CHOICES.md`. Do not contradict locked rows.
