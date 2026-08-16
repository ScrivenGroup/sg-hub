# Git and release (agent-managed)

You speak in product language. The agent maps that to git/deploy.

| You say | Agent does |
| ------- | ---------- |
| develop / update / frame … | Edit code; **commit** locally when the slice is coherent |
| is it live yet? | Report localhost vs Azure; deploy only if Phase 2 foundation exists |
| roll back / undo that release | `git` history / revert; redeploy if live was affected |

- **History:** local commits on `main` (or feature branches if needed).  
- **Remote:** create/push when useful for backup or Azure deploy — agent initiates, no need for you to say “push”.  
- **Never commit** `.env.local` or secrets.  
- **Live** = deployed to App Service + reachable on `scriven.group` (after Phase 2).  
- **Azure deploy default:** `npm run deploy:azure` (`scripts/deploy-with-az.ps1`) via Entra — **no SCM Basic Auth toggle**. Publish-profile script is legacy only.
