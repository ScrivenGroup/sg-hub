# Action plan — connect the database (hub)

**Goal:** a Save in Feedback (then other small stores, then MRT) still exists after `npm run deploy:azure` **and** after an App Service restage.

**Locked shape:** evolve [`src/core/store/json-store.ts`](../src/core/store/json-store.ts) and [`src/core/store/mrt-share.ts`](../src/core/store/mrt-share.ts). Do not invent a second database approach. Host = existing App Setting `DATABASE_URL` (Postgres; hobby = Neon/free, **not** paid Azure Flexible Server).

MRT guest sandbox / share-desk behaviour is **out of the first coding pass**. Revisit in the MRT phase (`dc-guest-shape` still means one product, two desks — the desks must not stay as zip-wiped files).

---

## Phase 0 — you (outside the agent)

Do these once. Do not paste the connection string into chat.

1. Confirm the Neon (or other Postgres) project that `DATABASE_URL` on `app-scrivengroup` already points at is the one you want. If the URL is stale, replace it in Azure **App Settings** (name stays `DATABASE_URL`).
2. In Neon: create a **branch or database** you are willing to wipe while we test (optional but safer).
3. Confirm you can `az login` (deploy still needs this until GitHub Actions exists).
4. **Do not zip-deploy** until Phase 2 zip-exclude is in the same release as the first DB write (or you will keep overwriting JSON).

Agent cannot: log into Neon console as you, rotate the URL, or see the secret on purpose.

---

## Phase 1 — agent: wiring (no MRT yet)

**Status (2026-09-04):** Wiring is in `json-store` + Drizzle. Zip/standalone excludes `data/`. Not live — no Azure deploy in this pass. Live migrate is a later ticket.

1. Add `drizzle-orm` + `postgres` (or `pg`). No Prisma in this app (Prisma stays on my-site until merge).
2. Drizzle schema for **simple** tables first: `feedback`, `ideas`, `notes`, `changelogs`, `dependencies`, `dev_choices`.
3. `json-store` functions: if `DATABASE_URL` set → Postgres; else JSON files (laptop).
4. Dual-write optional for one local run; then read-from-DB when URL present.
5. **Exclude `data/` from standalone / zip** (`prepare-azure-standalone.mjs` and/or `outputFileTracingExcludes`). Zip must not contain laptop JSON.
6. One-shot migrate: copy **live** wwwroot JSON (Kudu), not the laptop 22 KB MRT file. For this phase, migrate the simple files only.
7. You: localhost check Feedback add. You: say commit. You: say make it live. Agent: build + zip + azure (after exclude).
8. **Done for simple stores:** add Feedback on live → restage or zip-deploy again → row still there.

---

## Phase 2 — MRT (split: live plan tables + share, pass 2 sandbox)

Treat as its own job (`dc-sessions`).

~~Slim v1 = JSONB blob, not per-dam tables.~~ **Struck 2026-09-05.** Pass-1 parking table `mrt_live` (one JSONB cell) is void. Live MRT plan is **relational tables and columns** on the same Neon. No `json`/`jsonb` on live MRT tables. Gantt still uses `getSunwaterMrtStore` / `saveSunwaterMrtStore` (assemble / disassemble in one transaction).

**Pass 1 parking (2026-09-05, superseded):** Azure 24-dam file was copied into `mrt_live.body`. Keep as history only.

**Relational lock (2026-09-05, code + Neon explode; not zip-deployed):**

1. Live plan = rows (`mrt_plan`, catalog, maps, `mrt_occurrence`, `mrt_plan_task` / assign / actual, `mrt_effort_demo`). Same `DATABASE_URL`.
2. Guest **share** passwords = `mrt_share` rows (unchanged). Same `mrt-share.ts` functions.
3. `DATABASE_URL` set → Postgres; else JSON files (laptop).
4. `< 20 dams` rewrite **never** runs on Postgres reads (JSON-file laptop may still rewrite a demo file).
5. Explode script: `scripts/explode-mrt-relational.ts` — copy parking blob (or Azure wwwroot if thin) into tables, verify dam count, **then** `DROP TABLE mrt_live` only. Not `DROP DATABASE`. Not unplug Azure.
6. Same zip-exclude already in place. Do not zip-deploy until Bill says make it live.
7. Sandboxes + guest activity stay JSON until pass 2 (**tables**, not JSONB).

**Pass 2 (later ticket):** guest sandbox **tables** keyed by guest (TTL 168h, persist across deploy, reset-to-live clones Neon live); activity log cap 500. Not a blob.

**Done for MRT (after make-it-live deploy):** Save on live Gantt → zip deploy → hours still there; guest password still works without recreating audiences.

---

## Order (do not swap)

Simple registers → zip exclude → live migrate of those files → **then** MRT design + MRT migrate.

**Kanban Online (2026-09-05):** `kanban_ideas` + `kanban_tickets` (+ `kanban_meta`) rows with `node_id`. Not JSONB-per-leaf. Same `DATABASE_URL`. JSON fallback mirrors columns. Not deployed until Bill says.

---

## Execution: sub-agents & multitask

Default **sequential on the main agent**. Phase 1 is one session. Phase 2 is a later session. Do not parallelize schema + MRT sandbox redesign.
