# Feedback inbox

Open items for Cursor housekeeping / bug-fix sessions. Newest first.

When the user asks to fix bugs or do housekeeping, query Neon first
(`npx --yes tsx scripts/inspect-neon-inbox.ts`), then Development Inbox
(`/d?tab=inbox`). Laptop `data/feedback.json` and seed
are not the live register. Live rows are `kanban_ideas` (one inbox).

---

## BUG — Sunwater MRT load times
- id: `fb-mtteyhko`
- when: 2026-09-09T01:22:20.664Z
- page: /w/sunwater-mrt
- by: live Feedback
- status: archived

sunwater-brt laod times stupid long.

Split 2026-09-16 into `kt-mrt-shell-first` and `kt-mrt-defer-board`. Spec in archived
`IN-20260909-01` and `IN-20260908-03`.

---

## HOUSEKEEPING — Close persistence chat — Kanban tickets seeded
- id: `fb-hub-decisions-tickets`
- when: 2026-09-08T10:45:00.000Z
- page: /i/kanban
- by: Scriven Owner
- status: open

Outstanding work from the persistence / HTML / publishing / Great Merging chat is now Kanban tickets (seed merge on next `/i/kanban` load). Do not rebuild the briefing — pick a ticket.

Open: `kt-db-make-live`, `kt-db-phase0-neon`, `kt-commit-decisions-pack`.
Later: `kt-mrt-sandbox-pg`, `kt-publish-gha`, `kt-great-merge-pack`, `kt-two-agents-claude-md`, `kt-leaf-dev-notes`.

Already logged (do not duplicate): `fb-atlas-ia-review`, `fb-atlas-skin-hub`, `fb-public-hub-share`.
Reading copy: `docs/hub-decisions-pack.html`.

---

## HOUSEKEEPING — Proposed wrapping map — IA review
- id: `fb-atlas-ia-review`
- when: 2026-09-08T10:41:00.000Z
- page: /home
- by: Scriven Owner
- status: open

Do this before `fb-atlas-skin-hub`.

Standalone proposed atlas (outside this repo, not deployable):
`C:\1D\Anyliki\Scriven Group - Documents\Cursor\hub-atlas-standalone\index.html`

Open it, walk Internal and System, then decide keep vs fold before any hub registry/routes are added. User parked every remaining my-site leaf as a visible card so the map could be reviewed; Internal/System may reshuffle.

Already folded (do not rebuild as cards): changelog, external-interfaces, and Notifications stay in System → Definition; standards-themes stays System → Appearance.

Decide keep, fold, or drop:
- Internal: Claud-its; Testing as a sub-hub with Timestamp Tester, Future Testing, Share Link Demo
- Projects: Claude Hub Template (scaffold, not a product)
- System: Options, Preview environments (SWA-specific), Design Gallery, Architecture Vision, Git Tree, Network diagram, Wiki / Help

Do not implement hub leaves until this review is done and `fb-atlas-skin-hub` is picked up.

---

## HOUSEKEEPING — Proposed wrapping map — skin on hub
- id: `fb-atlas-skin-hub`
- when: 2026-09-08T10:41:30.000Z
- page: /home
- by: Scriven Owner
- status: open

Blocked on `fb-atlas-ia-review`.

When asked to skin the proposed map on this hub: add RegistryNode + `src/app/{p|i|s}/.../page.tsx` + SubHubShell + changelog plan for each surviving framed leaf. Status `sketched`. Same ids/slugs/hex/access as the standalone atlas. Testing becomes a subhub with child tools only if those children survive review.

Source of truth for the proposed map (not `docs/hub-atlas.html`):
`C:\1D\Anyliki\Scriven Group - Documents\Cursor\hub-atlas-standalone\index.html`

Hub pills stay sketched/building/live. my-site live/partial/concept/template/demo does not make a hub leaf live. Great Merging still applies. Work stays Sunwater MRT only. Chrome stays AppShell / PageNav / badge hex only.

Spawned leaves in the atlas (filter after IA review): `p-mtg-collector`, `p-pm-toolkit`, `p-trivia-scoring`, `p-scratchpad`, `p-mtg-buylist-compare`, `p-idp-blueprint`, `p-palo`, `p-claude-hub-template`, `i-claudits`, `i-testing-timestamp`, `i-testing-future`, `i-testing-share-link`, `s-options`, `s-preview-environments`, `s-design-gallery`, `s-architecture-vision`, `s-git-tree`, `s-network-diagram`, `s-wiki`. Promote `i-testing` from tool to subhub if children remain.

Do not implement until this cycle is picked up. Do not deploy from a hub chat until the user says make it live.

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
