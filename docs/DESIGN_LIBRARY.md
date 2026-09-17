# Design library (agent names)

In-app: System → Standards. Design Library is the definitive visual kit. Picks are Neon rows (not laptop JSON). Off-standard picks are flagged on the object and applied to `sg-*` on the hub. Leaf desks dump gaps on Home → Hold — they do not rewrite this library.

Kit defaults stay on each card after a PM decision. Do not invent a parallel class. Do not restyle MRT or Buylist until Bill locks a row.

Live kit. Source: `src/modules/standards/catalog.ts`. Farmed 2026-09-17.

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
| tok-motion | token | `prefers-reduced-motion` in globals.css |
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
| obj-skip | object | `sg-skip` |
| obj-link | object | `underline underline-offset-2` |
| obj-check | object | native checkbox/radio |
| obj-dialog | object | `EffortPopupShell` / `ShellModal` (conflict) |
| pat-page-header | pattern | PageNav + h1 + CodeBadge + StatusPill |
| pat-leaf-tabs | pattern | `sg-tab` + `?tab=` |

Gaps (no name yet): `obj-btn-destructive`, `obj-table`, `obj-chip`, `obj-seg`, `obj-banner`, `obj-toast`, `tok-elevation`, `tok-icon`, `tok-focus`, `pat-form`.

## Behaviours

`beh-page-loading`, `beh-pending`, `beh-empty`, `beh-errors`, `beh-dialogs`, `beh-tables`, `beh-destructive`, `beh-unsaved`, `beh-a11y`, `beh-disabled-vs-hidden`, `beh-hover`, `beh-copy`.
