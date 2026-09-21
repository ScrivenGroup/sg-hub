# Hub web development (locked handbook)

Canon for **how** we build ScrivenGroup HTML and leaves. Locked one-liners live in [`DEV_CHOICES.md`](./DEV_CHOICES.md) and Internal → Development choices (`/i/dev-choices`). Do not contradict locked rows.

**Decision (2026-09-01):** all new hub UI is Next.js App Router + React + TypeScript + Tailwind + SG tokens. my-site’s hand-written HTML/MD3 is a **legacy island** until the Great Merging. Do not start a third front-end kit.

How to ask (if you do not know what is hard): say **what the user must do**, not which `.html` file to edit. Easy vs hard cheat-sheet is in the 1 Sep 2026 stack conversation; default: *“Build it as a hub room: React + Tailwind + SG chrome.”*

---

## 1. Leaf development cycle

A **leaf** is a registry card (sub-hub or tool): `/w/{slug}`, `/p/{slug}`, `/i/{slug}`, `/s/{slug}`. Development hub `/d` is the global suite, not a product leaf.

| Stage | Status | What exists | Dummy data |
| ----- | ------ | ----------- | ---------- |
| 1. Local dummy | not on the map yet | Mock on localhost only (or a Development-tab museum). Not a second repo. | Fine, but use **hub types** if it will graduate |
| 2. Skin the location online | `sketched` | Registry node + route + featureless `SubHubShell` + changelog **plan**. No fake buttons. | None |
| 3. Skeleton the mockup online | `building` | Real routes/chrome; screens may be incomplete. Dummy **must** use the same store/types as production. | Yes, same store |
| 4. Clean revision | `live` | Real capability. Changelog **release** with **version number + datetime** | Production data (after DB cutover: Postgres) |
| 5. Leaf cycles | still `live` | Small slices: plan → build → localhost review → commit (when you say) → live (when you say). Each slice gets a changelog release when it ships. | — |

Do not skip stage 2 (a live URL with a plan) just because a dummy exists on a laptop.

---

## 2. Consistent functional elements

Every **leaf** (not every inner tab) eventually has:

| Element | Rule | Today (gap) |
| ------- | ---- | ----------- |
| **Development** | Two layouts. **Layout 1** (Development hub `/d`): cards Ideas/Feedback, Kanban, Train Changelog, SG Hub Changelog, Notes, Design spec. **Layout 2** (product leaves): Development is an L1 tab; L2 is Inbox, Kanban, Changelog (this leaf), Notes. Kanban uses a shared column-checkbox filter (default Later + Open). Capture is chrome Feedback, not an in-tab Raise. Relabel in `src/core/kanban/chrome.ts`. Sketched shells: changelog on the shell only — no fake Kanban. | Hub cards are `/d`. Buylist, MRT, and Standards use Layout 2. |
| **Versions** | Two clocks. **Train** (website zip) is `vX.Y` in chrome → Train Changelog; Hotfix chip only on hotfix zips. **Leaf** (hub suite included) is always `X.Y.Z` + datetime on the leaf/SG Hub changelog. Y when that leaf ships in a Train; Z on the wip desk per slice. No Train PATCH / a/b/c. Details: `docs/GIT_AND_RELEASE.md`. | Chrome v1.14. SG Hub 0.2.x. Buylist/MRT leaf changelogs. |
| **Feedback** | Global header (and mobile FAB) **always** has Feedback. Raise-style popup: type (default **bug**), title, details, leaf tag, attachments. Writes Development Inbox (`kanban_ideas`; Neon when `DATABASE_URL` is set). No Internal Feedback/Ideas/Notes cards; `/i/kanban` redirects to `/d`. Bugs are not auto-ticketed. Guests may be excluded until `kt-inbox-guest-write`. Sittings: Neon inspect script → `/d/inbox` → seed last. Details: [`docs/FEEDBACK.md`](./FEEDBACK.md). | Done in `AppShell`. |
| **Site map / fast travel** | **Site network** in chrome is the fast-travel map (Home → Hubs → cards). Definition is the same map for reading. Product interiors are inside a card, not extra map nodes (v1). | Done. Do not invent a second sitemap widget. |

Chrome that must stay: logo, Train version (always shown; Hotfix chip only when that zip is a hotfix; staff click through to Train Changelog), Home, Site network, Feedback, Profile, `PageNav` (Back + breadcrumbs) unless a leaf documents a guest-minimal shell (MRT guests).

---

## 3. Consistent design / layout (starting library)

**Do not copy my-site MD3.** Start from this kit; ThemeContract only when a leaf explicitly opts in.

### Chrome

- Sticky header, `bg-[var(--surface)]`, hairline `border-[var(--border)]`.
- Page ground `var(--page)` `#F5F5F4`; ink `var(--ink)` `#3C3C3B`.
- Typeface **Manrope**. Radius **10px**.
- Logo left; optional centred leaf title; actions right.

### Page body

- `PageNav` then `<h1 className="text-3xl font-semibold tracking-tight">` + `CodeBadge` + `StatusPill`.
- Description in `text-[var(--muted)]`. Reading text may use `max-w-2xl`. The **page** fills the frame (`AppShell` main: padding, no `max-w-5xl`). Wide tools (tables, boards, libraries) use that width.
- Cards: `sg-card`. Buttons: `sg-btn-primary` / `sg-btn-secondary` / `sg-btn-ghost` (`--sg-btn-height`, 32px — same as Kanban LAYOUT toggle). Tabs: `sg-tab` (underline, not pills).
- Inputs: `sg-input`. Long text: `sg-prose`.

### Tables

- Prefer simple HTML tables or existing MRT table CSS **inside that leaf**. Do not import a new table library.
- Header row: muted, medium weight. Numeric cells tabular if lots of numbers.

### Dialogs

- Viewport-capped overlay (see PLATFORM.md / `EffortPopupShell`): grid overlay, flex column dialog, scrollport `min-height: 0; overflow-y: auto`. Footer stays on screen. Esc closes.

### Colour

- Product **6-hex code → badge only**.
- RAG: `--rag-green` / `--rag-amber` / `--rag-red`.
- Dark/car ThemeContract (Fuel Tracker) is **opt-in later**, not a global theme.

Tokens live in `src/app/globals.css` and System → Appearance.

---

## 4. Stack (do not fork)

| Use | Stack |
| --- | ----- |
| This hub (all new leaves) | Next 15 App Router, React 19, TS, Tailwind 4, Zod, Auth.js + Entra |
| Persistence | `json-store` now → Neon/Postgres via same store (`dc-db-cutover`) |
| my-site | Static HTML + Express + Prisma + Azure SQL until merged; then **retire** that leaf on my-site |
| Never | New Vite/CRA/Next repo, MUI/shadcn/Radix/Bootstrap, MD3 on hub pages, standalone `.html` as the demo (`dc-demo-artifact`) |
