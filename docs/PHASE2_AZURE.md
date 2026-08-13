# Phase 2 — Azure / Entra / DNS (revised: existing resources)

You already have Azure website / server / database work from another session (Claude Code). **Do not assume a greenfield create.** Prefer **discover → reuse → fill gaps**.

## Does an existing `rg-scrivengroup` matter?

**Yes — in a good way.**

| Fact | What it means |
| ---- | ------------- |
| Resource group names are unique **per subscription** | You cannot create a second `rg-scrivengroup` in the same subscription. |
| If it already exists | **Reuse it.** Open it and inventory what’s inside. |
| If that RG already holds the site/DB you want | Wire **this** ScrivenGroup Hub app to those resources (or decide to share vs separate). |
| If the name is taken by something unrelated | Either use that RG anyway (add resources beside them) **or** use a new name e.g. `rg-scrivengroup-hub` for this project only. |

Nothing is “wrong” with the name existing. The mistake would be trying to Create → same name again and fighting the portal error, or spinning a duplicate Postgres/App Service you don’t need.

## Goal of Phase 2 (revised)

1. **Inventory** what you already have (RG, App Service, DB, Entra, domain).  
2. **Decide** reuse vs isolate (same DB vs new DB; same web app vs new web app).  
3. **Collect** connection values for this repo’s env / App Settings.  
4. **Fill gaps** only (e.g. Entra app, DNS, missing firewall rule).  
5. Hand off to Phase 3 deploy of **this** codebase.

## Step 0 — Inventory (do this first)

In [Azure Portal](https://portal.azure.com):

1. Open **Resource groups**.  
2. Find **`rg-scrivengroup`** (or note the actual RG name if different).  
3. Open it and list resources. Reply using this template:

```text
Phase 2 inventory:
- Subscription: (name or "default")
- Resource group: 
- Region: 
- App Service / web app name(s): 
- App Service default URL (*.azurewebsites.net): 
- Database type (Azure Database for PostgreSQL / SQL / other): 
- Database / server name: 
- Entra / app registration already? (yes/no / unknown)
- Domain already pointed? (scriven.group or other / none)
- Anything else in the RG: 
```

Optional CLI (if you use Azure CLI locally):

```bash
az group show -n rg-scrivengroup -o table
az resource list -g rg-scrivengroup -o table
```

## Decision after inventory

| Situation | Recommendation |
| --------- | -------------- |
| One App Service + one Postgres already for “the” Scriven site | **Reuse** for this Hub if that *is* this product; or create a **second** App Service in the same RG if the old site must stay untouched. |
| DB already has important data from the other project | Prefer a **new database name** on the same server (or new server) for Hub v1 unless you intend to merge schemas. |
| Entra app already exists for the old site | Reuse if redirect URIs can include this app’s URLs; else new app registration `scrivengroup-hub`. |
| Domain already on the old App Service | Keep it there until cutover; Hub can go live first on `*.azurewebsites.net`. |

## Env vars still needed (for Phase 3)

Whether reused or new:

- `DATABASE_URL`
- `AUTH_SECRET`
- Entra: client id, secret, issuer/tenant (when ready)
- `AUTH_URL` (azurewebsites URL first, then `https://scriven.group`)
- Production: `DEV_AUTH=false`

## Steps (only after inventory)

1. ~~Blind-create RG~~ → **Inventory RG** (Step 0)  
2. Confirm / create Postgres (reuse server if possible)  
3. Confirm / create App Service for **this** Next.js app  
4. Entra app registration + redirect URIs  
5. App Settings (env vars)  
6. DNS when ready to cut over `scriven.group`  
7. Phase 3 deploy this repo  

## What to say next

Paste the **Phase 2 inventory** block (even partial). We’ll map each line to reuse vs create — no duplicate `rg-scrivengroup` create attempt.
