# ScrivenGroup Hub

Distributable 4-Hub web-app OS for **scriven.group**.

## Phase 1 — local demo

```bash
npm install
npm run dev
```

Station desk: [http://localhost:3000](http://localhost:3000) → **Dev Login** → Home. A `wip/<leaf>` desk uses its own port (`:3001+`); match `AUTH_URL`. See [`docs/YARD_DESKS.md`](docs/YARD_DESKS.md).

## Delivery sequence

1. **Local demo** (this phase) — localhost  
2. **Azure / Entra / DNS** — separate Cursor session (see plan handoff prompt)  
3. **Live v1.0** — deploy to App Service + `scriven.group`

## Structure

`Login → Home → Work | Projects | Internal | System`

Routes use hub preambles: `/w`, `/p`, `/i`, `/s` (e.g. `/p/fueltracker`).

Intent docs: [`docs/intent/`](docs/intent/).
