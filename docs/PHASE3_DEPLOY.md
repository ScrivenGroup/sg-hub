# Phase 3 — Deploy to Azure (hobby)

**Target URL:**  
https://app-scrivengroup-ebcdarc2cwbtcjaa.australiaeast-01.azurewebsites.net

Phase 2 App Settings must already include Entra + `AUTH_URL` + `AUTH_SECRET` + `DEV_AUTH=false`.

## One-time App Service settings (Portal)

1. **Environment variables** — add if missing:  
   - `SCM_DO_BUILD_DURING_DEPLOYMENT` = `false`  
   - `ENABLE_ORYX_BUILD` = `false`  
   (Stops Azure re-running `next build` on a prebuilt zip.)  
2. **Configuration → Stack settings**  
   - **Startup Command:** `node server.js`  
3. Save / Restart.

**Why the first deploy failed:** Deployments Preview ran `npm run build` inside the zip. Our zip is already built (standalone) and has no `src/app`, so Next failed. New zip makes `build` a no-op; disable Oryx as above.

## Default live path — GitHub Actions (OIDC)

Tag `hub-*` / `v*` on `main`, or **Actions → Publish shop window → Run workflow**. Cloud builds the same zip and `az webapp deploy`. **Push `main` is not live.** SCM Basic Auth stays Off.

## Fallback — Azure CLI on the station laptop

Requires [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) once, then `az login` (browser) when the session expires.

```powershell
npm run build
npm run deploy:prepare
npm run deploy:zip
npm run deploy:azure
```

Or directly:

```powershell
.\scripts\deploy-with-az.ps1
```

Uses Entra via `az` → `app-scrivengroup` / `rg-scrivengroup`. **SCM Basic Auth Publishing Credentials can stay Off.**

## Smoke test (live)

1. Open the azurewebsites URL  
2. **Sign in with Microsoft** (work account)  
3. Land on Home with five Hubs  

If login fails: check redirect URI, App Settings names, and that `DEV_AUTH` is `false` (Microsoft button still shows when Entra env vars are set).

## Legacy fallback — publish profile (needs SCM Basic Auth On)

Only if `az` is unavailable:

1. Portal → turn **SCM Basic Auth Publishing Credentials** On  
2. Download publish profile → `app-scrivengroup.PublishSettings` (gitignored)  
3. `.\scripts\deploy-with-publish-profile.ps1 -PublishProfilePath ".\app-scrivengroup.PublishSettings"`  

Prefer fixing Azure CLI login over using this path.

## Disk full (`No space left on device`)

Failed deploys can leave junk under `/home`. With Azure CLI you can still use Kudu SSH (portal Advanced Tools) if needed:

```bash
rm -rf /home/site/wwwroot/* /home/site/wwwroot/.[!.]* /tmp/* 2>/dev/null; df -h /home
```

Confirm App Settings: `SCM_DO_BUILD_DURING_DEPLOYMENT=false`, `ENABLE_ORYX_BUILD=false`, then redeploy with `npm run deploy:azure`.

## Not live yet until

Zip is uploaded **and** smoke test passes. Until then only localhost is the working demo.
