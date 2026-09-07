# Cursor and Claude on the same real website

Two AIs, **one live hub**: `app-scrivengroup`. my-site is a **different** live site until the Great Merging finishes.

## Treaty (locked)

| Actor | May do | Must not |
| ----- | ------ | -------- |
| **Cursor** (this repo) | Edit `scrivengroup`, localhost, `deploy:azure`, hub rules/docs | Deploy my-site SWA or `scrivengroup-backend` unless you explicitly name that repo |
| **Claude** (my-site repo) | Edit my-site, its GitHub Actions, Prisma, Azure SQL for **that** app | Edit this hub repo, zip-deploy `app-scrivengroup`, or add a second Next app |
| **You** | Say which site a request is for; say commit / make it live | Assume “the website” means both |

**Cursor is the only agent that ships the hub.** Claude may **propose** (markdown, screenshots, export packs). Cursor implements on the hub.

That is the “brain” split: Cursor already has PLATFORM, DEV_CHOICES, `.cursor/rules`. Claude gets a short **treaty card** (below) in my-site’s `CLAUDE.md` if you want — not a second copy of the whole hub handbook.

## If Claude should help the hub

Claude can: draft copy, review a screenshot, produce the Great Merging pack.  
Claude cannot: open a PR against `scrivengroup` unless you later add a GitHub remote and ask for that. Default remains **files in chat or a sibling folder**.

## If Cursor should help my-site

Only when you **open that folder as the workspace** (or give the path) and name the GitHub repo. Do not “quickly add a page” to my-site from a hub chat.

## Same Azure subscription is not the same app

Hub and `scrivengroup-backend` already share a B1 plan. Still two programs. A deploy of one must not zip-wipe the other. Cursor zip is **wwwroot of `app-scrivengroup` only**.

## After a leaf is merged

Claude’s job for that leaf **ends**. Further change requests go to Cursor on the hub.

## Treaty card (paste into my-site `CLAUDE.md`)

```text
ScrivenGroup hub (Next.js, Azure app-scrivengroup) is owned by Cursor.
Do not create a Next/Vite app. Do not instruct the human to zip-deploy the hub.
Hub-bound work: export files + inventory for the Great Merging; stop editing a leaf once it has moved.
This repo: static my-site + Express + Prisma + Azure SQL only.
```
