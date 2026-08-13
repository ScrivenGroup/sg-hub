# Phase 2 — Azure / Entra / DNS checklist

Walk **one step at a time**. Paste back values when asked (never paste secrets into chat if you prefer — say “saved in portal” and keep them in App Settings / password manager).

## Target inventory

| Resource | Suggested name |
| -------- | -------------- |
| Resource group | `rg-scrivengroup` |
| Region | Australia East (or your nearest) |
| PostgreSQL Flexible Server | `psql-scrivengroup` |
| Database | `scrivengroup` |
| App Service plan | `asp-scrivengroup` (B1 or cheapest Linux that runs Node 20) |
| Web app | `app-scrivengroup` → `*.azurewebsites.net` |
| Entra app registration | `scrivengroup-hub` |
| Custom domain | `scriven.group` |

## Env vars to collect (for Phase 3)

- `DATABASE_URL`
- `AUTH_SECRET` (can reuse local or generate new)
- `AUTH_MICROSOFT_ENTRA_ID_ID` (client id)
- `AUTH_MICROSOFT_ENTRA_ID_SECRET`
- `AUTH_MICROSOFT_ENTRA_ID_ISSUER` = `https://login.microsoftonline.com/<tenant-id>/v2.0`
- `AUTH_URL` = `https://scriven.group` (or azurewebsites URL until DNS ready)
- `DEV_AUTH=false` on production

## Steps

1. Resource group  
2. PostgreSQL Flexible Server + database + firewall  
3. App Service (Node 20 Linux)  
4. Entra app registration + redirect URIs  
5. App Settings (env vars)  
6. DNS for `scriven.group`  
7. Confirm URLs → hand back to agent for Phase 3 deploy  
