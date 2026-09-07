# Git and release (agent-managed)

You speak in product language. The agent maps that to git/deploy.

**Locked (`dc-publish`):** you vibe → Cursor codes → **localhost** → you review → **you say commit** → **you say make it live**. The agent does not commit or deploy until those words.

**Push / merge `main` is not live.** Azure is the shop window. GitHub is the locker.

## Yard words

| Word | Meaning |
| --- | --- |
| **Room** | Leaf folder inside one Next.js app (not its own git repo) |
| **Desk** | Git worktree sibling folder + unique localhost port |
| **Save-slot** | Branch `wip/<leaf>` |
| **Station** | `main` — merge here when a room is happy; keep it clean |
| **Locker** | GitHub `ScrivenGroup/sg-hub` — push/pull across devices |
| **Shop window** | Azure `app-scrivengroup` — only when Bill says **make it live** |

Teaching poster: [`docs/publish-yard.html`](./publish-yard.html). Do not rebuild unless a sentence is wrong.

## What you say

| You say | Agent does |
| ------- | ---------- |
| develop / update / frame … | Edit code on **this chat’s desk**. Preview on that desk’s localhost port. **No commit** until you ask |
| commit / save a snapshot | `git add` + `git commit` on this desk’s branch (never `.env*` / secrets) |
| push / save to the locker | `git push` to `ScrivenGroup/sg-hub`. **Does not** change Azure |
| is it live yet? | Report localhost vs Azure App Service |
| make it live / deploy / publish | From **station `main`**: **tag** `hub-*` / `v*` or GitHub **Run workflow** (`Publish shop window`). Cloud: `npm ci` → `build` → `deploy:prepare` → zip → `az webapp deploy` via **OIDC**. Push `main` is **not** live. Hand zip (`deploy:azure`) is fallback. SCM Basic Auth stays Off |
| roll back / undo that release | `git` revert / older zip; redeploy if live was affected |

## Locker (already exists)

Private remote: **https://github.com/ScrivenGroup/sg-hub**. `gh` as ScrivenGroup. Local `main` is on the locker.

- **One sitting = one `wip/` branch = one device writing.** Other devices pull first.
- **One chat = one desk.** Worker `move_agent_to_root` to that worktree **before** disk.
- Do not `git init` inside a leaf folder. A room is not a repo.
- Never zip-deploy from a wip desk. Publish only from merged `main`.

**Desks:** sibling git worktrees. Port **3000** = station (`scrivengroup` / `main`). Ports **3001+** = desks (`scrivengroup-wip-<leaf>` / `wip/<leaf>`). Add/remove commands: [`docs/YARD_DESKS.md`](./YARD_DESKS.md). `move_agent_to_root` to that desk folder before disk.

## Why this is not Claude’s “push and magic”

Claude’s my-site: GitHub **remote** + **GitHub Actions** on `main` → Azure Static Web Apps.

This hub: locker exists. **Live is still the full zip** onto `app-scrivengroup`. Next.js is **glue + full zip**. Git diffs do not patch Azure. Azure does not apply `git` diffs.

## Make it live — `dc-publish`

GitHub Actions on **tag** (`hub-*` / `v*`) or **workflow_dispatch** (Run workflow) builds the same zip and deploys via **OIDC**. **Not** `on: push: branches: [main]`.

| Path | When |
| --- | --- |
| Tag `hub-*` or `v*` on station `main` | Spoken **make it live** (preferred) |
| Actions → **Publish shop window** → Run workflow | Same zip, no tag (test or explicit dispatch) |
| Laptop `deploy:prepare` → `deploy:zip` → `deploy:azure` | Fallback if Actions/OIDC is down |

Never zip-deploy from a wip desk. SCM Basic Auth stays Off. Zip still **excludes** `data/`. Never commit `.env*`.

## Versions (`dc-versioning`)

**Hub train:** SemVer `MAJOR.MINOR`. Each live publish bumps **MINOR**. **PATCH** = emergency hotfix. **MAJOR** only if Bill asks.

**Leaf changelog:** own SemVer per leaf (Kanban `0.1.x`, Buylist `1.x`, …). Unchanged leaves do not bump. Localhost slices may use PATCH (`1.4.1`) until that leaf ships in a hub train.

## Data vs deploy

Zip must **not** include `data/` once DB cutover starts (`docs/NEON_CUTOVER.md`). Do not run the legacy `rm -rf wwwroot` recovery unless you accept total JSON loss.

Publish-profile script is **legacy only**.

Never commit `.env.local` or secrets.
