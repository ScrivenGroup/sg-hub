# The Great Merging of ’26

Move **my-site** web-apps / leaves and their data into **this hub**. Cursor implements in `scrivengroup`. Claude (or you) **exports**; Cursor does not guess Prisma tables.

This is **not** a git merge of two histories. Two stacks (static HTML vs Next hub) do not fast-forward into one repo.

---

## Principle

Each my-site app becomes a **hub leaf**: registry node + `/p/...` or `/i/...` route + SG chrome + hub store (Postgres after cutover). my-site keeps a “moved to hub” stub or the page is removed after smoke test.

---

## How to get the source in front of Cursor

**Preferred:** clone or copy the my-site repo to a **sibling folder** under the Cursor dev root, for example:

`C:\1D\Anyliki\Scriven Group - Documents\Cursor\my-site`

Then tell Cursor that path. Cursor can read it; do not copy it *into* `scrivengroup` as a nested git repo.

**Also fine:** zip of `prisma/schema.prisma`, `docs/`, each app folder, and a **data export** (JSON/CSV) with no secrets.

**Not useful:** “Claude, describe the apps” with no files. Screenshots help layout; they do not migrate data.

---

## Paste this to the Claude / my-site session

```text
We are merging my-site products into the ScrivenGroup Next.js hub (Cursor repo).
Please do not rewrite them as hub code.

Give me a single pack:
1. Inventory table: app name, folder path, URL on my-site, what it stores (tables or localStorage), who uses it.
2. prisma/schema.prisma (or equivalent) and which tables belong to which app.
3. A JSON or CSV export of those tables (no connection strings, no API keys, no Entra secrets).
4. For each app: entry HTML/JS files and any shared CSS that is not just MD3 chrome.
5. Anything that must keep working (auth assumptions, unguessable share links, cron, cold-start pings).
6. Confirm: after Cursor ports an app, we will stop changing that app on my-site.

Do not start a second Next.js app. The hub already exists.
```

---

## Merge sequence (suggested)

1. Inventory from the pack (one table in this doc or Feedback).
2. Hub DB cutover for **simple hub stores** first ([`NEON_CUTOVER.md`](./NEON_CUTOVER.md)) so new leaves are not born on JSON-in-wwwroot.
3. Port **smallest** my-site app (fewest tables, least UI) as a sketched → building leaf.
4. Load exported data into hub types (dummy-shaped like production).
5. You review localhost → commit → live.
6. Repeat. MRT is **already** on the hub; do not “merge MRT from my-site.”
7. When a leaf is live on the hub, Claude archives it on my-site.

---

## What Cursor will not do

- Rewrite MRT into vanilla HTML.
- Point the hub at Azure SQL as a second ORM “because Prisma is there” unless you later lock that (default remains Neon/`DATABASE_URL` on the hub).
- Merge git remotes.

---

## Execution: sub-agents & multitask

Inventory can be a read-only explore of the sibling folder. Porting is **one leaf per session**, sequential.
