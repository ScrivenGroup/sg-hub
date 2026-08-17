# ScrivenGroup platform (canon for agents)

There is **one** web app: this repo. Sub-products are **routes + registry nodes**, not separate apps, repos, or stacks.

Read this before building or “demoing” anything. Deeper intent: [`docs/intent/`](./intent/). Module steps: [`docs/MODULES.md`](./MODULES.md). Release language: [`docs/GIT_AND_RELEASE.md`](./GIT_AND_RELEASE.md). Checklist: [`src/core/checklist.md`](../src/core/checklist.md).

## Live

https://app-scrivengroup-ebcdarc2cwbtcjaa.australiaeast-01.azurewebsites.net

## Stack (do not fork)

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
  ├── Work      /w     client-context (org only, no client logins)
  ├── Projects  /p     personal / spin-out capable
  ├── Internal  /i     ScrivenGroup tools
  └── System    /s     Definition + Appearance
```

Sub-hubs: `/w/{slug}`, `/p/{slug}`, etc. Registry drives Home cards, Site network, and Definition maps.

## Chrome and UI

- Global shell: [`AppShell`](../src/core/shell/AppShell.tsx) — Home, Site network, Feedback, Profile.
- Page trail: [`PageNav`](../src/core/shell/PageNav.tsx) (Back + breadcrumbs).
- Sketched products: [`SubHubShell`](../src/core/shell/SubHubShell.tsx) + changelog plan — no fake feature UI while `sketched`.
- Tokens: System → Appearance (`--ink`, `--page`, surfaces, Manrope). Hex codes colour the **badge only** unless an explicit ThemeContract override is added for that sub-hub.

## Modules (how to extend)

1. Add/update `RegistryNode` in [`src/core/registry/seed.ts`](../src/core/registry/seed.ts) (hubPrefix, slug, title, 6-hex `code`, accessMode, status).
2. Add route under `src/app/{w|p|i|s}/...`.
3. Keep shared chrome; build product UI **inside** that route.
4. Access: `shared` | `restricted` | `per_user` per surface.
5. Status: `sketched` → `building` → `live` as real capability lands.
6. Run [`src/core/checklist.md`](../src/core/checklist.md).

## Data

- **Now:** JSON files under `data/` via [`src/core/store/json-store.ts`](../src/core/store/json-store.ts); seeds in registry; new seed changelog ids merge into existing files.
- **Later:** Neon Postgres (`DATABASE_URL` already on App Service for durable storage). Prefer evolving this store toward Neon over inventing a second database approach.
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

Open bugs/housekeeping: Internal → Feedback, `docs/feedback-inbox.md`, `data/feedback.json`. See `.cursor/rules/feedback-register.mdc`.
