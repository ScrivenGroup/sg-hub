# Phase 3 — Deploy to Azure (hobby)

**Target URL:**  
https://app-scrivengroup-ebcdarc2cwbtcjaa.australiaeast-01.azurewebsites.net

Phase 2 App Settings must already include Entra + `AUTH_URL` + `AUTH_SECRET` + `DEV_AUTH=false`.

## One-time App Service settings (Portal)

1. **app-scrivengroup** → **Configuration** / **Environment variables** (already done for secrets).  
2. **Configuration** → **General settings** (or Startup Command):  
   - **Startup Command:** `node server.js`  
3. **Stack:** Node 20 if shown.  
4. Save / Restart.

## Deploy the zip (no Azure CLI required)

Agent prepares `scrivengroup-deploy.zip` in the project folder after `npm run build` + `npm run deploy:prepare`.

### Option A — Portal zip deploy

1. Portal → **app-scrivengroup** → **Advanced Tools (Kudu)** → **Go**  
2. In Kudu: **Tools** → **Zip Push Deploy** (or Drag/drop zip onto the page if available)  
3. Upload `scrivengroup-deploy.zip` from:  
   `C:\1D\Anyliki\Scriven Group - Documents\Cursor\scrivengroup\scrivengroup-deploy.zip`  
4. Wait for deploy to finish → Restart the web app if needed.

### Option B — VS Code

Azure App Service extension → right-click `app-scrivengroup` → Deploy → select `.azure-deploy` folder (or the zip).

### Option C — Install Azure CLI later

```bash
az login
az webapp deploy -g rg-scrivengroup -n app-scrivengroup --src-path .azure-deploy --type zip
az webapp config set -g rg-scrivengroup -n app-scrivengroup --startup-file "node server.js"
```

## Smoke test (live)

1. Open the azurewebsites URL  
2. **Sign in with Microsoft** (work account)  
3. Land on Home with four Hubs  

If login fails: check redirect URI, App Settings names, and that `DEV_AUTH` is `false` (Microsoft button still shows when Entra env vars are set).

## Not live yet until

Zip is uploaded **and** smoke test passes. Until then only localhost is the working demo.
