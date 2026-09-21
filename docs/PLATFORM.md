# ScrivenGroup platform (canon for agents)

There is **one** web app: this repo. Sub-products are **routes + registry nodes**, not separate apps, repos, or stacks.

Read this before building or “demoing” anything. Deeper intent: [`docs/intent/`](./intent/). Module steps: [`docs/MODULES.md`](./MODULES.md). Release language: [`docs/GIT_AND_RELEASE.md`](./GIT_AND_RELEASE.md). Checklist: [`src/core/checklist.md`](../src/core/checklist.md).

## Live

https://app-scrivengroup-ebcdarc2cwbtcjaa.australiaeast-01.azurewebsites.net

## Stack (do not fork)

Full comparison facts and a human ELI5: [`docs/technical.md`](./technical.md).

| Layer | Choice |
| ----- | ------ |
| App | Next.js 15 App Router, React 19, TypeScript, Tailwind 4 |
| Auth | Auth.js — Microsoft Entra on live; Dev Login only when `DEV_AUTH=true` locally |
| Validation | Zod where forms/APIs need it |
| Hosting | Azure App Service (`app-scrivengroup` / `rg-scrivengroup`), Australia East |

Do **not** start Vite, CRA, a second Next app, or a parallel theme/design system.

## Information architecture

```
Login → Home
  ├── Work         /w     client-context (org only, no client logins)
  ├── Projects     /p     personal / spin-out capable
  ├── Development  /d     hub of suite cards (Ideas/Feedback, Kanban, Train Changelog, SG Hub Changelog, Notes, Design spec)
  ├── Internal     /i     leftover tools (`/i/dev-choices`, `/i/testing`)
  └── System       /s     Definition + Appearance + Standards
```

Sub-hubs: `/w/{slug}`, `/p/{slug}`, etc. Registry drives Home cards, Site network, and Definition maps.

The wrapping website is **the hub** (this app — the building, not a room). Persistent header is **chrome**. The five floors are **Hubs**. Each named place on a floor is a **card** (registry node: sub-hub or tool). Development `/d` is a Hub whose cards are the suite rooms (Layout 1). Product leaves keep Development as an L1 tab (Layout 2). Login → Home → Hubs → cards is **the site map**. Product interiors sit *inside* a card and are not the wrapping hub.

Offline click-through of that map (no product interiors): [`docs/hub-atlas.html`](./hub-atlas.html).

## Chrome and UI

- Global shell: [`AppShell`](../src/core/shell/AppShell.tsx) — Home, Site network, Feedback, Profile.
- Page trail: [`PageNav`](../src/core/shell/PageNav.tsx) (Back + breadcrumbs).
- Sketched products: [`SubHubShell`](../src/core/shell/SubHubShell.tsx) + changelog plan — no fake feature UI while `sketched`.
- Tokens: System → Appearance (`--ink`, `--page`, surfaces, Manrope). Hex codes colour the **badge only** unless an explicit ThemeContract override is added for that sub-hub.
- **Viewport-capped dialogs:** Overlay is `position: fixed; inset: 0; display: grid; grid-template-rows/columns: minmax(0, 1fr); overflow: hidden` (not a flex `items-center` wrapper). Dialog is `display: flex; flex-direction: column; max-height: 100%; min-height: 0; overflow: hidden` and must beat `.sg-card { display: block }` (use `.sg-card.mrt-effort-popup`). The scrollport is `flex: 1 1 0%; min-height: 0; overflow-y: auto`. Header/toolbar/footer stay `shrink-0`. `max-height` plus `height: auto` (or `min(max-content, …)`) is not enough — the card grows with content and clips without a scrollbar. See [`EffortPopupShell`](../src/modules/sunwater-mrt/ui/EffortPopupShell.tsx).

## Modules (how to extend)

1. Add/update `RegistryNode` in [`src/core/registry/seed.ts`](../src/core/registry/seed.ts) (hubPrefix, slug, title, 6-hex `code`, accessMode, status).
2. Add route under `src/app/{w|p|d|i|s}/...`.
3. Keep shared chrome; build product UI **inside** that route.
4. Access: `shared` | `restricted` | `per_user` per surface.
5. Status: `sketched` → `building` → `live` as real capability lands.
6. Run [`src/core/checklist.md`](../src/core/checklist.md).

## Data

- **Now:** Simple stores can use Neon/Postgres when `DATABASE_URL` is set (`feedback`, `ideas`, `notes`, `changelogs`, `dependencies`, `dev_choices` via [`src/core/store/json-store.ts`](../src/core/store/json-store.ts)). **MRT live plan** is relational rows (`mrt_plan` + catalog/maps/occurrences/hours) assembled into `getSunwaterMrtStore`; **guest share door** is `mrt_share` rows. Same URL via [`json-store`](../src/core/store/json-store.ts) / [`mrt-share`](../src/core/store/mrt-share.ts). **Kanban Online** is Postgres **rows** (`kanban_ideas`, `kanban_tickets`, `kanban_meta`) with a `node_id` leaf tag — not one JSONB blob per leaf. No URL → JSON files under `data/` that **mirror the same columns**. Sandboxes, guest activity, and mtg-buylist **product** cache stay JSON. Zip/standalone excludes `data/`. The `< 20 dams` rewrite never runs on Postgres reads.
- **Later:** MRT guest sandbox + activity on Postgres (`docs/NEON_CUTOVER.md` pass 2). Live zip-deploy of this wiring is a separate “make it live” ticket. Simple-store wwwroot migrate still follow-up.
- Temp/demo/dummy data must use the **same** types, store patterns, and routes so it can graduate without a rewrite.

## Deploy (default)

```powershell
npm run build
npm run deploy:prepare
npm run deploy:zip
npm run deploy:azure
```

- Uses Azure CLI + Entra (`az login`). **SCM Basic Auth stays Off.**
- Publish-profile script is **legacy only**.
- Product language (“deploy”, “make it live”, “is it live?”) → agent runs the path above. See [`docs/GIT_AND_RELEASE.md`](./GIT_AND_RELEASE.md).

## Anti-patterns

- New isolated project “just for a demo”
- One-off layout that bypasses AppShell / registry
- Hex driving page theme without ThemeContract
- Asking the user to toggle SCM Basic Auth for routine deploys
- Inventing a second auth or CSS framework for one sub-hub

## Feedback → housekeeping

Open bugs/housekeeping: chrome Feedback writes Development Inbox (`/d/inbox`). Inspect: `scripts/inspect-neon-inbox.ts`. See [`docs/FEEDBACK.md`](./FEEDBACK.md) and `.cursor/rules/feedback-register.mdc`.

## Development choices

Locked standards: Internal → Development choices (`/i/dev-choices`), [`docs/DEV_CHOICES.md`](./DEV_CHOICES.md), `data/dev-choices.json`. Handbook: [`docs/WEB_DEVELOPMENT.md`](./WEB_DEVELOPMENT.md). Two agents: [`docs/TWO_AGENTS.md`](./TWO_AGENTS.md). DB plan: [`docs/NEON_CUTOVER.md`](./NEON_CUTOVER.md). Merge: [`docs/GREAT_MERGING.md`](./GREAT_MERGING.md). See `.cursor/rules/dev-choices.mdc`.
