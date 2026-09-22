# Git and release (agent-managed)

You speak in product language. The agent maps that to git/deploy.

**Locked (`dc-publish`):** you vibe → Cursor codes → **localhost** → you review → **you say commit** → **you say make it live**. The agent does not commit or deploy until those words.

**Push / merge `dev_main` is not live.** Fast-forward `main` is the live **git** pointer. Azure is the shop window and still needs the zip.

## Yard words

| Word | Meaning |
| --- | --- |
| **Room** | Leaf folder inside one Next.js app (not its own git repo) |
| **Desk** | Git worktree sibling folder + unique localhost port |
| **Save-slot** | Branch `wip/<leaf>` |
| **Station** | `dev_main` — merge here when a room is happy; keep it clean |
| **Live lane** | `main` — always most behind; matches Azure after a successful **make it live** |
| **Locker** | GitHub `ScrivenGroup/sg-hub` — push/pull across devices |
| **Shop window** | Azure `app-scrivengroup` — only when Bill says **make it live** |

Teaching poster: [`docs/publish-yard.html`](./publish-yard.html). Do not rebuild unless a sentence is wrong.

## What you say

| You say | Agent does |
| ------- | ---------- |
| develop / update / frame … | Edit code on **this chat’s desk**. Preview on that desk’s localhost port. **No commit** until you ask |
| commit / save a snapshot | `git add` + `git commit` **and** `git push` to this desk’s GitHub branch (first time: publish with `-u`). Never `.env*` / secrets. **Does not merge to `dev_main`.** **Does not change Azure.** |
| prepare / handover / ready for station / ready for `dev_main` | Same as commit: save-slot only. Does not touch `origin/dev_main`. Does not run git in the station folder. |
| merge to station / merge to `dev_main` | Spoken words, **station desk** only. Never implied by commit, prepare, handover, or roadmap. |
| push / save to the locker | `git push` to `ScrivenGroup/sg-hub` if commits are already sitting un-pushed. **Does not** change Azure |
| is it live yet? | Report localhost vs Azure App Service |
| make it live / deploy / publish | From **station `dev_main`**: fast-forward **`main`** to `dev_main`, **tag** `hub-*` / `v*` (or GitHub **Run workflow**). Cloud: `npm ci` → `build` → `deploy:prepare` → zip → `az webapp deploy` via **OIDC**. Push `dev_main` is **not** live. Fast-forward `main` without the tag/zip is **not** Azure. Hand zip (`deploy:azure`) from the station folder is fallback. SCM Basic Auth stays Off |
| roll back / undo that release | `git` revert / older zip; redeploy if live was affected |

## Two-role desks

A desk is **`dev_main` (station)** or **`wip/<leaf>`**. Not both.

- **WIP** produces the room. The most git it may do is clean the desk for handover (commit + push the save-slot). It does not merge, push, or operate `dev_main`. It does not `git merge` station into itself unless you ask.
- **Station** takes finished blocks (fast-forward merge the named `wip/<leaf>` when you say merge to station). Sweep. Make it live when you say so. It does not produce product interiors.

Canon lives in this file and [`.cursor/rules/publish-yard.mdc`](../.cursor/rules/publish-yard.mdc). `this-desk.mdc` is git-excluded: desk identity plus that desk’s sitting leftovers (last wrap, next pickup). Do not copy these paragraphs onto each desk.

## Locker (already exists)

Private remote: **https://github.com/ScrivenGroup/sg-hub**. `gh` as ScrivenGroup.

- **One sitting = one `wip/` branch = one device writing.** Other devices pull first.
- **One chat = one desk.** Worker `move_agent_to_root` to that worktree **before** disk.
- Do not `git init` inside a leaf folder. A room is not a repo.
- Never zip-deploy from a wip desk. Publish only from merged `dev_main` after you say **make it live** (then `main` + tag).

**Desks:** sibling git worktrees. Port **3000** = station (`scrivengroup` / `dev_main`). Ports **3001+** = desks (`scrivengroup-wip-<leaf>` / `wip/<leaf>`). Add/remove commands: [`docs/YARD_DESKS.md`](./YARD_DESKS.md). `move_agent_to_root` to that desk folder before disk. Preview and `AUTH_URL` stay on **that** port — never station `:3000` from a wip chat. Each wip desk’s `.env.local` sets `WIP_DESK` (yellow chrome badge). Station and Azure omit it.

## Why this is not Claude’s “push and magic”

Claude’s my-site: GitHub **remote** + **GitHub Actions** on `main` → Azure Static Web Apps.

This hub: locker is GitHub `ScrivenGroup/sg-hub`. **Live is still the full zip** onto `app-scrivengroup`. Next.js is **glue + full zip**. Git diffs do not patch Azure. Pushing a branch is not live.

## Make it live — `dc-publish`

GitHub Actions on **tag** (`hub-*` / `v*`) or **workflow_dispatch** (Run workflow) builds the same zip and deploys via **OIDC**. **Not** `on: push: branches: [main]` and **not** `on: push: branches: [dev_main]`.

| Path | When |
| --- | --- |
| Fast-forward `main` to `dev_main`, then tag `hub-*` or `v*` | Spoken **make it live** (preferred) |
| Actions → **Publish shop window** → Run workflow | Same zip, no tag (test or explicit dispatch) |
| Laptop `deploy:prepare` → `deploy:zip` → `deploy:azure` | Fallback if Actions/OIDC is down (station folder only) |

Never zip-deploy from a wip desk. SCM Basic Auth stays Off. Zip still **excludes** `data/`. Never commit `.env*`.

If a zip lands but `/home/site/wwwroot/.next` stays old (Kanban still the previous chrome), delete that folder via Kudu and zip again from the station. Do not `--clean` the whole wwwroot (that can wipe `data/`).

## Versions (`dc-versioning`)

Two clocks. Do not collapse to one website SemVer. Do not put Train as `X.Y.Z`.

**Train** (the live website zip): `vX.Y`. Each **make it live** bumps to the next X.Y. **MAJOR** only if Bill asks. A hotfix still takes the next X.Y; chrome and Train Changelog show a **Hotfix** chip only on that zip (not on a regular Train). No Train PATCH third segment, no letter suffix a/b/c. Git tag `hub-X.Y`. Home: AppShell version → `/i/train-changelog`. Bump `TRAIN_VERSION` / `TRAIN_KIND` in `src/core/train/version.ts` on the station sitting that ships the zip.

**Leaf** (hub suite included): always `X.Y.Z` (pad two-part to `.0` for display). Unchanged leaves do not bump. Y when that leaf ships in a Train. Z on the wip desk per slice; changelog row = version + datetime + title. Localhost slices may use PATCH (`1.4.1`, `0.2.9`) until that leaf ships in a Train. Homes: product-leaf Development → Changelog (that leaf only); wrapping suite → `/d/changelog` (SG Hub). Not the Train.

## Data vs deploy

Zip must **not** include `data/` once DB cutover starts (`docs/NEON_CUTOVER.md`). Do not run the legacy `rm -rf wwwroot` recovery unless you accept total JSON loss.

Publish-profile script is **legacy only**.

Never commit `.env.local` or secrets.
