# Git and release (agent-managed)

You speak in product language. The agent maps that to git/deploy.

**Locked (`dc-publish`):** you vibe → Cursor codes → **localhost** → you review → **you say commit** → **you say make it live**. The agent does not commit or deploy until those words.

| You say | Agent does |
| ------- | ---------- |
| develop / update / frame … | Edit code. Preview at http://localhost:3000. **No commit** until you ask |
| commit / save a snapshot | `git add` + `git commit` (never `.env*` / secrets) |
| is it live yet? | Report localhost vs Azure App Service |
| make it live / deploy / publish | `npm run build` → `deploy:prepare` → `deploy:zip` → `deploy:azure` (`az webapp deploy`, Entra). SCM Basic Auth stays Off |
| roll back / undo that release | `git` revert / older zip; redeploy if live was affected |

## Why this is not Claude’s “push and magic”

Claude’s my-site: GitHub **remote** + **GitHub Actions** on `main` → Azure Static Web Apps.

This hub (measured): **no git remote** in this workspace at lock time. History is local `git` on `main`. **Live is only the zip** onto `app-scrivengroup`. Pushing git somewhere would **not** update Azure until we add a pipeline.

## Later slice (not done)

GitHub repo + OIDC + a workflow that builds standalone and `az webapp deploy` on `main`. Then “commit + push” can equal live, like my-site. Until then, **make it live** always means the zip commands.

## Data vs deploy

Zip must **not** include `data/` once DB cutover starts (`docs/NEON_CUTOVER.md`). Do not run the legacy `rm -rf wwwroot` recovery unless you accept total JSON loss.

Publish-profile script is **legacy only**.

Never commit `.env.local` or secrets.
