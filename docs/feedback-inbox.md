# Feedback inbox

Open items for Cursor housekeeping / bug-fix sessions. Newest first.

When the user asks to fix bugs or do housekeeping, read this file and
`data/feedback.json` (and Internal → Feedback in the app).

---

## HOUSEKEEPING — Sunwater - Milestone Resourcing Tracker
- id: `fb-public-hub-share`
- when: 2026-08-19T04:52:00.000Z
- page: /w/sunwater-mrt
- by: Scriven Owner
- status: open

Platform pattern (later cycle, not MRT-only): reusable “open this hub publicly” so a page can be shared like a blog post or portfolio demo. Shareable URL, optional password, read-only, no Entra account. Not the whole app public. MRT should stay share-ready (session-gated writes, hide Development/open notes, optional readOnly).

Logged from MRT development pass 2026-08-19 — do not implement auth/middleware until this cycle is picked up.

---

## DONE — fb-mss1ma27 (card/table, age chips, page filter, export)
Resolved 2026-08-15 — Feedback register UI shipped.

## DONE — fb-mss1k2du (breadcrumbs / back)
Resolved 2026-08-15 — PageNav on hubs, sub-hubs, Definition, Appearance, Feedback.

## DONE — fb-mss1j2tf (popup overflow)
Resolved 2026-08-15 — Feedback + Site network dialogs use scrollable overlays.
Follow-up 2026-08-19 — overlays were still sized to the sticky header (`backdrop-blur` containing block). Dialogs now portal to `document.body`.
