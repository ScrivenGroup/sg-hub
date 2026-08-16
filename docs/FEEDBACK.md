# Feedback feature (agent notes)

## User-facing
- **Any authenticated page:** Feedback in header (desktop) or floating button (mobile/tablet).
- **Register:** `/i/feedback` under Internal.
- Types: bug | idea | housekeeping | other.

## For Cursor sessions
1. Read [`docs/feedback-inbox.md`](./feedback-inbox.md) and/or `data/feedback.json`.
2. Prefer open `bug` / `housekeeping` items for fix prompts.
3. After resolving, mark done in a follow-up (status field — UI mock stores `open` for now).

## Persistence note
Phase 1/3 mock uses local `data/feedback.json`. On Azure Free/Basic the disk can be ephemeral — Neon-backed feedback is the durable follow-up.
