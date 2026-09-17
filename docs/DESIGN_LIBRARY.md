# Design library (agent names)

In-app: System → Standards → Design Library / Behaviours. Live notes: Drop (`/s/standards?tab=drop`).

Kit defaults live on each card even after a PM decision. Do not invent a parallel class. Conflicts are listed in-app for Bill — do not silently restyle MRT or Buylist.

Source: `src/modules/standards/catalog.ts`.

## Use these names

| id | layer | use |
| --- | --- | --- |
| tok-ink | token | `--ink` |
| tok-page | token | `--page` |
| tok-surface | token | `--surface` |
| tok-surface-muted | token | `--surface-muted` |
| tok-border | token | `--border` |
| tok-muted | token | `--muted` |
| tok-rag | token | `--rag-green` / `--rag-amber` / `--rag-red` |
| tok-radius | token | `--radius` |
| tok-control-height | token | `--sg-btn-height` |
| tok-type | token | `--font-sans` |
| obj-btn-primary | object | `sg-btn-primary` |
| obj-btn-secondary | object | `sg-btn-secondary` |
| obj-btn-ghost | object | `sg-btn-ghost` |
| obj-input | object | `sg-input` |
| obj-card | object | `sg-card` |
| obj-tab | object | `sg-tab` |
| obj-badge | object | `CodeBadge` |
| obj-status-pill | object | `StatusPill` |
| obj-rag | object | `RagDot` |
| obj-info | object | `InfoTip` |
| obj-dialog | object | `EffortPopupShell` / `ShellModal` (conflict) |
| pat-page-header | pattern | PageNav + h1 + CodeBadge + StatusPill |
| pat-leaf-tabs | pattern | `sg-tab` + `?tab=` |

Gaps (no name yet): `obj-btn-destructive`, `obj-table`, `tok-elevation`, `tok-icon`, `pat-form`.

## Behaviours

`beh-page-loading`, `beh-pending`, `beh-empty`, `beh-errors`, `beh-dialogs`, `beh-tables`, `beh-destructive`, `beh-unsaved`, `beh-a11y`, `beh-disabled-vs-hidden`, `beh-hover`, `beh-copy`.
