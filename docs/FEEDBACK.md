# Feedback feature (agent notes)

## User-facing
- **Any authenticated page:** Feedback in header (desktop) or floating button (mobile/tablet).
- **Register:** `/i/feedback` under Internal.
- Types: bug | idea | housekeeping | other.

## Bug vs Idea vs Kanban Raise

| Type | Lands | Kanban Inbox |
| --- | --- | --- |
| Bug / housekeeping / other | `/i/feedback` only | Only if Bill asks to copy it |
| Idea | Feedback **and** Kanban inbox (leaf tag) | Always |
| Kanban **Raise** | Kanban inbox only | N/A |

Bugs are not product tickets. Do not open an MRT (or other leaf) Kanban card for a Feedback bug unless asked.

## Persistence
When `DATABASE_URL` is set, Feedback writes Neon (`feedback` table). Zip excludes `data/`. Laptop `data/feedback.json` is fallback only.

## For Cursor sessions
1. **Neon first:** `npx --yes tsx scripts/inspect-neon-inbox.ts` (read-only SELECT; never print `DATABASE_URL`; do **not** call `getKanbanBoard` / `loadKanbanRows`).
2. Then Internal → Feedback (`/i/feedback`) and [`docs/feedback-inbox.md`](./feedback-inbox.md).
3. Seed / laptop JSON last. Seed only adds missing ids. Seed `ideas: []` for a leaf is not proof the inbox is empty.
4. Prefer open `bug` / `housekeeping` items for fix prompts.
5. After resolving, mark done in a follow-up.
