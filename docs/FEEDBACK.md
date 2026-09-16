# Feedback feature (agent notes)

## User-facing
- **Any authenticated page:** Feedback in header (desktop) or floating button (mobile/tablet). Raise-style popup (type, title, details, leaf tag, attachments).
- **Register:** Development Inbox (`/d?tab=inbox`). No separate Feedback, Ideas, or Notes cards.
- Types: bug | idea | housekeeping | other.

## One inbox, one capture door

All rows live in `kanban_ideas` (Neon when `DATABASE_URL` is set; else `data/kanban/ideas.json`). Notes for a leaf live on the Development Notes tab (`kanban_leaf_notes`).

| Door | Default type | Who | Lands |
| --- | --- | --- | --- |
| Chrome **Feedback** | Bug. Idea, housekeeping, and other are first-class. | Staff now; guests later (`kt-inbox-guest-write`) | Development Inbox: leaf tag + page breadcrumb + attachments |

There is no in-tab Raise on leaf Development. Old URLs `/i/kanban`, `/i/feedback`, and `/i/ideas` redirect to Inbox; `/i/notes` redirects to the Notes tab.

Bugs are not product tickets. Do not split a bug into Kanban tickets unless asked. Inbox type filter on a leaf Development host defaults to Idea; global `/d` can show all types.

## Persistence
When `DATABASE_URL` is set, the inbox is Neon `kanban_ideas`. The old `feedback` table is read only to copy missing `fb-*` rows. Zip excludes `data/`.

## For Cursor sessions
1. **Neon first:** `npx --yes tsx scripts/inspect-neon-inbox.ts` (read-only SELECT; never print `DATABASE_URL`; do **not** call `getKanbanBoard` / `loadKanbanRows`).
2. Then Development Inbox (`/d?tab=inbox`). [`docs/feedback-inbox.md`](./feedback-inbox.md) is not the live register.
3. Seed / laptop JSON last. Seed only adds missing ids. Seed `ideas: []` for a leaf is not proof the inbox is empty.
4. Prefer open **bug** / **housekeeping** items for fix prompts. Scout **ideas** on the leaf Inbox to plan tickets.
5. After resolving, mark done in a follow-up.
