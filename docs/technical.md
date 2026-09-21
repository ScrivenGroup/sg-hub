# ScrivenGroup technical stack

Canon for agents comparing this product to functionally similar sites on other stacks. Human ELI5: the opening section. Do not treat planned items as shipped.

**Snapshot:** 1 September 2026. Source of versions: `package.json` / `package-lock.json`. Architecture: this repo, [`PLATFORM.md`](./PLATFORM.md), [`PHASE2_AZURE.md`](./PHASE2_AZURE.md), [`PHASE3_DEPLOY.md`](./PHASE3_DEPLOY.md).

**Live origin:** https://app-scrivengroup-ebcdarc2cwbtcjaa.australiaeast-01.azurewebsites.net  
**Intended domain:** `scriven.group` (DNS not required for the current azurewebsites host).  
**Repo identity:** private npm package `scrivengroup` `0.1.0`. One Next.js app. Sub-products are routes + `RegistryNode` rows, not separate apps.

---

## ELI5 (one page)

ScrivenGroup is **one office building**, not a street of separate shops.

You enter through a locked front door (Microsoft work login on live; a simple name box on a developer laptop). Reception is Home. Four floors: **Work**, **Projects**, **Internal**, **System**. Each product is a **room on a floor**, not its own building with its own paint and keys.

The building is **Next.js**: it draws the pages you see **and** does the back-office work (save a file, check a password) in the same program. **React** is how the pages are assembled. **TypeScript** is a spell-check so names and shapes stay consistent. **Tailwind** plus a few house colours (ink, page, surface) keep rooms looking like the same company. The typeface is **Manrope**.

Simple registers (Feedback, ideas, notes, changelogs, dependencies, development choices) use **Postgres** when `DATABASE_URL` is set (Neon on the live app). The MRT **live plan** and **guest share door** use the same hook. **Kanban Online** is Neon **rows** (leaf tag `node_id`), not a JSON blob per leaf. On a laptop with no URL they still write **JSON files** with the same columns. MRT sandboxes, mtg-buylist Run session cache, and guest activity are still JSON. Decks catalog + shared harvest book are Neon rows. Zip deploy must not ship the laptop `data/` folder.

The building sits on a rented plot in **Australia East**: **Azure App Service**, Linux, **Node 20**. Developers build on Windows, zip a ready-to-run copy, and upload it. Azure is told **not** to rebuild on arrival.

That is the whole stack: one app, one host, JSON or Neon for simple stores, Microsoft login, no extra UI kit, no second framework.

---

## Comparison identity (map other stacks onto these axes)

Use these axes. Do not infer a missing layer from a competing product.

| Axis | ScrivenGroup (factual) | Not this |
| ---- | ---------------------- | -------- |
| Product shape | Modular monolith. Four hubs (`/w` `/p` `/i` `/s`). Registry-driven IA | Microfrontends, multi-repo apps, WordPress multisite |
| Rendering | Next.js App Router: React Server Components, Server Actions, some Client Components. Node SSR. `output: "standalone"`. Not `output: "export"` | Vite CSR SPA, Astro/Eleventy SSG-only, PHP templates, Blazor WASM |
| UI framework | React 19.1.0 | Vue, Svelte, Angular, htmx, Razor, WordPress PHP |
| App framework | Next.js 15.5.23 App Router (not Pages Router) | Remix, Nuxt, SvelteKit, Django, Rails, ASP.NET MVC |
| Language | TypeScript 5, `strict: true`, `target: ES2017`, path alias `@/*` → `src/*` | Plain JS, Python, PHP, C#, Go |
| CSS | Tailwind CSS 4.3.3 (`@tailwindcss/postcss`) + CSS custom properties in `globals.css`. No MUI / shadcn / Radix / Bootstrap in dependencies | Component-library design systems, CSS-in-JS, SCSS toolchain |
| Typeface | Manrope via `next/font/google` | System-only, Adobe Fonts, self-hosted kits |
| Validation | Zod 4.4.3 where forms/APIs need it | Yup, class-validator, none |
| Auth library | Auth.js (`next-auth` 5.0.0-beta.32) | Clerk, Cognito SDK, Passport-only, custom JWT |
| Identity provider (live) | Microsoft Entra ID (OIDC) | Google-only, Auth0, magic-link SaaS |
| Session | JWT session cookie (no Auth.js database adapter). `trustHost: true`. Custom page `/login` | Server session store, Redis sessions |
| Extra auth doors | `DEV_AUTH=true` Credentials “Dev Login” (local). MRT guest Credentials share-password (scoped to `/w/sunwater-mrt`) | Public unauthenticated app |
| Persistence now | Simple stores (`feedback`, `ideas`, `notes`, `changelogs`, `dependencies`, `dev_choices`) plus MRT live **rows** (`mrt_plan` and child tables) and share door (`mrt_share`) in `json-store` / `mrt-share`: Postgres when `DATABASE_URL` is set, else JSON under `data/`. **Kanban Online** = `kanban_ideas` + `kanban_tickets` rows (`node_id` leaf tag), same columns in JSON fallback. Sandboxes, mtg-buylist Run session cache, guest activity still JSON files. Decks catalog/harvest are Neon rows (`precon_*`) | A second ORM, Prisma, paid Azure Flexible Server, MRT plan JSONB blob, opaque per-leaf JSONB kanban blobs |
| Persistence planned | MRT guest sandbox + activity still JSON until pass 2 (`docs/NEON_CUTOVER.md`). Live zip-deploy of MRT wiring is a follow-up “make it live” | “Sandboxes already on Neon” is false |
| Hosting class | Azure App Service PaaS, Linux, Node 20 LTS, Australia East | Vercel, Netlify, Cloudflare Workers, AWS ECS/EKS, IIS, shared PHP |
| Azure names | RG `rg-scrivengroup`, app `app-scrivengroup` | — |
| Runtime process | `node server.js` from Next standalone output | `next start` from source on the host, Oryx `npm run build` |
| Package manager | npm (`package-lock.json`) | pnpm, yarn, bun |
| Local dev | `next dev --turbopack` on **this desk’s port** (station `:3000`, wip `:3001+`; match `AUTH_URL`) | Vite 5173, etc. |
| Images | `next/image`; linux `sharp` injected at `deploy:prepare` (Windows build otherwise ships win32 sharp) | Unoptimized `<img>` only |
| SEO | `robots: { index: false, follow: false }` | Public marketing index |
| Tests | No Jest / Vitest / Playwright / Cypress in `package.json` | — |
| CI/CD | No `.github/workflows`. Agent-run zip deploy | GitHub Actions → Vercel |
| Observability | No Sentry / App Insights / analytics SDK in dependencies | — |
| Queues / cache / realtime | None (no Redis, no GraphQL, no websocket lib) | — |
| Containers | No Dockerfile in repo | Kubernetes/Compose |
| i18n | None (English UI, `lang="en"`) | next-intl, etc. |
| Client state lib | None (React + server). No Redux / Zustand / TanStack Query in dependencies | — |

**Hobby hosting constraints (locked in Phase 2 docs):** prefer App Service Free F1 or Basic B1; do not take paid Azure Postgres Flexible Server at hobby cost; Neon (or Supabase) is the planned Postgres host, portable via `DATABASE_URL`.

---

## Layer inventory (what actually runs)

### 1. Browser

- HTML from Next App Router (mostly Server Components).
- Client JS only where `"use client"` is used (shell widgets, MRT UI, etc.).
- CSS: Tailwind utilities + `.sg-*` classes and tokens `--ink` `#3c3c3b`, `--page` `#f5f5f4`, `--surface`, `--border`, `--muted`, RAG colours. Product hex codes colour **badges only** unless a ThemeContract exists.
- Skip link, 44px targets, `prefers-reduced-motion` kill switch in `globals.css`.

### 2. Next.js app (`src/`)

| Path | Role |
| ---- | ---- |
| `src/app/` | Routes: `/login`, `/home`, `/w/*`, `/p/*`, `/i/*`, `/s/*`, `api/auth/[...nextauth]` |
| `src/core/` | Shell, registry, JSON store, feedback, access RAG |
| `src/modules/` | Product UI (e.g. sunwater-mrt, funds-forecaster) |
| `src/auth.ts` | Auth.js providers |
| `src/auth.config.ts` | JWT callbacks, `authorized` gate |
| `src/middleware.ts` | Auth.js middleware; matcher skips static assets |

Mutations: Next **Server Actions** (`"use server"`) in feedback, dev-choices, MRT, login/sign-out — not a separate REST API for those flows.

### 3. Auth gate

Middleware `authorized`: allow `/login`, `/api/auth/*`, `/w/sunwater-mrt/guest`; otherwise require session. MRT guests may only use `/w/sunwater-mrt` and children. Guest share expiry lives on the JWT.

Env (live): `AUTH_SECRET`, `AUTH_URL`, `AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET`, `AUTH_MICROSOFT_ENTRA_ID_ISSUER`, `DEV_AUTH=false`. Local: `DEV_AUTH=true` enables Dev Login.

### 4. Data

JSON files for MRT sandboxes / buylist Run session cache / guest activity. Decks catalog/harvest are Neon rows. Simple registers, MRT live plan, the guest share door, and **Kanban Online rows** (`kanban_ideas`, `kanban_tickets`, `kanban_meta`) use Drizzle + `postgres` against `DATABASE_URL` when set (tables created on first use). Same `json-store` functions; no second store. The `< 20 dams` rewrite is JSON-file only — never on Postgres reads. Zod schemas where module stores need them (e.g. MRT `scheduleStoreSchema`).

`DATABASE_URL` on App Service is the Neon/Postgres hook. Laptop with no URL keeps JSON. Zip/standalone **excludes `data/`**.

### 5. Build and deploy

```
npm run build          → next build (standalone)
npm run deploy:prepare → copy .next/standalone + static + public; start = node server.js; linux sharp
npm run deploy:zip     → zip with forward-slash paths (Linux Kudu)
npm run deploy:azure   → az webapp deploy (Entra). SCM Basic Auth stays Off
```

App Service settings: `SCM_DO_BUILD_DURING_DEPLOYMENT=false`, `ENABLE_ORYX_BUILD=false`, startup `node server.js`.

**Make it live:** GitHub Actions on tag `hub-*`/`v*` or **Run workflow** (OIDC). Push `main` is not live. Laptop `deploy:azure` is fallback.

Dev machine: Windows. Host: Linux x64. Publish-profile script is **legacy**.

### 6. Tooling (dev-time only)

ESLint 9 + `eslint-config-next` (core-web-vitals + typescript). PostCSS = Tailwind 4 plugin. No Prettier package.

---

## Architecture rules that affect comparisons

Competitors may look similar in the browser (login, hub cards, inner tools) and still differ on every axis above. When scoring “same product, different stack,” treat these as **locked product constraints**, not stack accidents:

1. **Extend this app only** — no second Vite/CRA/Next repo, no parallel design system.
2. **Keep chrome** — `AppShell`, Site network, Feedback, Profile, `PageNav`.
3. **Registry** — Home cards, Site network, Definition maps come from `RegistryNode` in `src/core/registry/seed.ts`.
4. **Access** — `shared` \| `restricted` \| `per_user`. **Status** — `sketched` \| `building` \| `live`. Sketched = featureless `SubHubShell` + changelog plan, no fake UI.
5. **Work hub** is a studio (`dc-w-studio`): do not treat `/w/` as the client’s production host.
6. **Guest demo** is a share link, not a static HTML export of the Next app (`dc-demo-artifact`).

---

## Dependency versions (locked-in-repo)

| Package | Version |
| ------- | ------- |
| next | 15.5.23 |
| react / react-dom | 19.1.0 |
| next-auth | 5.0.0-beta.32 (range `^5.0.0-beta.32`) |
| drizzle-orm | ^0.45.2 |
| postgres | ^3.4.9 |
| zod | 4.4.3 (range `^4.4.3`) |
| tailwindcss | 4.3.3 (range `^4`) |
| typescript | ^5 |
| @types/node | ^20 |
| eslint | ^9 |
| eslint-config-next | 15.5.23 |

Azure runtime **Node 20 LTS** (Phase 2). TypeScript compile target **ES2017**.

---

## Honest gaps (do not advertise as present)

- Simple-store **live** cutover (Kudu migrate of wwwroot simple JSON + restage proof). Code can talk to Neon; those files are not migrated in this pass
- MRT guest **sandbox** + activity on Postgres (`NEON_CUTOVER.md` pass 2). Live plan + share door are wired (pass 1); zip-deploy still needs “make it live”
- Live site still reading MRT from JSON until the next zip-deploy after Neon has the live blob
- Custom domain TLS on `scriven.group` (may need B1; can stay on `*.azurewebsites.net`)
- Automated CI, test runner, error tracking, CDN product, Redis, GraphQL
- Client Entra for external customer users on this host (`dc-guest-entra`)
