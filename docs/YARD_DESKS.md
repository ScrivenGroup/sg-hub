# Yard desks (git worktrees)

One Next.js app. Two (or more) folders. Each folder is a **desk**: its own dirty tree, its own localhost port. They are **not** separate websites.

A ticket or Front desk prompt names `wip/<leaf>` when a **product** sitting starts. Sessions and git do not invent a desk.

## Ports

| Port | Desk |
| --- | --- |
| **3000** | **Station** — folder `scrivengroup`, branch `main` |
| **3001+** | WIP desks — sibling folders `scrivengroup-wip-<leaf>`, branch `wip/<leaf>` |

Never run two desks on the same port. Never zip-deploy from a wip desk. Publish only from merged `main` / the station desk.

## Add a desk

From the **station** folder (`scrivengroup`), parent is `Cursor`:

```powershell
git worktree add -b wip/<leaf> ../scrivengroup-wip-<leaf> main
cd ../scrivengroup-wip-<leaf>
npm ci
npx next dev --turbopack -p 3001
```

Use the next free port (3002, 3003, …) if 3001 is taken.

Before any disk writes in that product chat: `move_agent_to_root` to the **desk folder** (`scrivengroup-wip-<leaf>`), not a leaf room, not brain-only.

If that desk needs login/DB, give it its own `.env.local` on disk. Do not commit `.env*`.

## Remove a desk

From the station folder, after the sitting is merged or abandoned:

```powershell
git worktree remove ../scrivengroup-wip-<leaf>
git branch -d wip/<leaf>
```

Use `git worktree remove --force` if the desk still has `node_modules` or other untracked files. Use `git branch -D` only if the save-slot was never merged and Bill wants it gone.

## Do not

- `git init` inside a leaf folder. A room is not a repo.
- Zip the shop window from a wip desk.
- Treat each worktree as a third app or a second GitHub repo.
- Leave three idle full `node_modules` unless those desks are in use.
- Invent `wip/<slug>` because a chat started. Wait for a ticket or prompt that names it.

## Smoke (2026-09-07)

Placeholder `wip/kanban` / `scrivengroup-wip-kanban` was added from `main`, `npm ci`, then **station :3000 + desk :3001** together. Neither checkout mixed two-leaf WIP. Placeholder **left as a clean unused desk** (folder + branch `wip/kanban`; no product files). It is not a third app. Recreate or remove when a product ticket names that save-slot. Idle `node_modules` on an unused desk is expected until someone removes it.
