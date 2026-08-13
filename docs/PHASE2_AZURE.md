# Phase 2 — Azure (hobby / low-cost path)

**Constraint:** hobby use — avoid ~$80/mo database compute.

## Resource group (done)

- Name: `rg-scrivengroup`
- Region: **Australia East**

## Database — do **not** take paid Flexible Server Burstable at ~$80/mo

Cancel / don’t create that SKU.

### Option A (preferred for hobby): Free Postgres outside Azure compute

Use a **free Postgres** provider; App Service on Azure still hosts the app.

| Provider | Notes |
| -------- | ----- |
| [Neon](https://neon.tech) | Free tier, Postgres, easy `DATABASE_URL` |
| [Supabase](https://supabase.com) | Free tier, Postgres |

Same Drizzle/Postgres story later; only the host of the DB changes. Azure still holds the **website**.

### Option B: Stay Azure-only if a free DB offer appears

On **Create Azure Database for PostgreSQL Flexible server**, look for a **Free** tier / trial (availability varies by subscription and region). If Australia East shows only paid compute ~$80 → **skip** and use Option A.

### Option C: No managed Postgres yet

Keep the Phase 1 **JSON file store** (or SQLite) on a single App Service instance until you outgrow it. Cheapest; least “production DB”. Fine for early v1 hobby.

**Locked default for this project (hobby):** **Option A — Neon free Postgres** + Azure App Service for the web app.

## App Service (next step) — keep cheap

| Field | Hobby value |
| ----- | ----------- |
| Resource group | `rg-scrivengroup` |
| Name | `app-scrivengroup` (must be globally unique) |
| Runtime | **Node 20 LTS** |
| OS | Linux |
| Plan | **Free F1** if available; else **Basic B1** (shared) — avoid Premium |

Free F1 limits: cold starts, no custom domain SSL on some SKUs, limited CPU — OK for hobby demo. Custom domain `scriven.group` may need **B1** later for TLS; can stay on `*.azurewebsites.net` until then.

## Rest of Phase 2 (unchanged order, cheaper DB)

1. ~~Paid Postgres~~ → **Neon (or Supabase) free** → copy `DATABASE_URL`  
2. **App Service Free F1** in `rg-scrivengroup`  
3. Entra app registration  
4. App Settings env vars  
5. DNS when ready (may wait until not on Free tier)  
6. Phase 3 deploy  

## Env vars (still)

- `DATABASE_URL` — from Neon/Supabase (Option A)  
- `AUTH_SECRET`  
- Entra ids when ready  
- `AUTH_URL` — `https://<app>.azurewebsites.net` first  
- `DEV_AUTH=false` on Azure  
