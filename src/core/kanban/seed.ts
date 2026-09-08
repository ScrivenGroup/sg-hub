import { prependEvent, type KanbanBoard, type KanbanInboxNote, type KanbanTicket } from "./schema";

/** Inbox + tickets to merge onto a live disk that has no `data/` from the zip. */
const MTG_BUYLIST_IDEAS: KanbanInboxNote[] = [
  {
    id: "IN-20260904-02",
    nodeId: "p-mtg-buylist",
    title: "Future Functonality Idea - 'getting cash back'",
    body: "Scenario: i am preparing buy a stack of bulk cards for $20 from a vendor. I have scanned the cards and process it through this app - can i get the $20 back from MTGMate and accumulate credit from other stores?",
    status: "open",
    createdAt: "2026-09-04T08:56:47.892Z",
    updatedAt: "2026-09-04T08:56:47.892Z",
    copiedAt: null,
  },
  {
    id: "raw-mtmjtpzg-pe3pkf",
    nodeId: "p-mtg-buylist",
    title: "Testing tab",
    body: "'Parser fixture check' seems like its a testing fucntion, and if so should live under its own tab. \n\nLook i am all for having whatever we need for development and testing live under the Recevelopment tab, but we need to have the sub-tabs structured.",
    status: "open",
    createdAt: "2026-09-04T06:04:13.132Z",
    updatedAt: "2026-09-04T06:04:13.132Z",
    copiedAt: null,
  },
  {
    id: "raw-mtmjsema-xrf956",
    nodeId: "p-mtg-buylist",
    title: "changelog - wip/plan",
    body: "This feels like it should perpetually live in the next version, so i would like the default changelog table to always include a row that is (for example) 1.2(wip) with the details expanded.  We can utilise the same structure to emphasise the same data.\nThen once the next revision is publshed and 1.2 becomes real with its own details, the top row would be 1.3(wip) with any remaining/updated/new WIP items.",
    status: "open",
    createdAt: "2026-09-04T06:03:11.746Z",
    updatedAt: "2026-09-04T06:03:11.746Z",
    copiedAt: null,
  },
  {
    id: "raw-mtmjqb8t-jglsww",
    nodeId: "p-mtg-buylist",
    title: "Changelog Format",
    body: "Keep the sumamry table rows (1.0, 1.0, etc) but have each row expandable to see the detail, instead of the detail being a stacke dblock of text below the table.",
    status: "open",
    createdAt: "2026-09-04T06:01:34.061Z",
    updatedAt: "2026-09-04T06:01:34.061Z",
    copiedAt: null,
  },
  {
    id: "raw-mtmjpad9-7x5fou",
    nodeId: "p-mtg-buylist",
    title: "light-grey behind all 'want qty = 0' in the summary table.",
    body: "light-grey behind all 'want qty = 0' in the summary table.",
    status: "open",
    createdAt: "2026-09-04T06:00:46.269Z",
    updatedAt: "2026-09-04T06:00:46.269Z",
    copiedAt: null,
  },
  {
    id: "raw-mtmje2ew-f55c7z",
    nodeId: "p-mtg-buylist",
    title: "Mate harvest on a phone",
    body: "Need a way to harvest Mate on mobile without F12 console. Split into capture UX plus join/data if needed.",
    status: "archived",
    createdAt: "2026-09-04T05:52:02.744Z",
    updatedAt: "2026-09-04T05:53:20.319Z",
    copiedAt: "2026-09-04T05:52:35.887Z",
  },
  {
    id: "IN-20260905-10",
    nodeId: "p-mtg-buylist",
    title: "Parallel runs — more than This run",
    body: "Under Run, This run is a placeholder tab. Future: several independent CSV/harvest/Compare sessions in parallel (own store files, not overwriting each other). Needs run-id infrastructure on the per-user JSON (and later Neon). Do not fake extra runs until that exists.",
    status: "open",
    createdAt: "2026-09-05T06:30:00.000Z",
    updatedAt: "2026-09-05T06:30:00.000Z",
    copiedAt: null,
  },
  {
    id: "IN-20260905-11",
    nodeId: "p-mtg-buylist",
    title: "Playmantis harvest — Scryfall ID only",
    body: "HOLD matching on the large 2025-26 rares CSV (still misses many after 1.3 name fallback). Future: squash the harvest bug and lock ground rules — Playmantis bulk should run exclusively off Scryfall ID (tag:buylist + scryfall-id), no name-search assumptions. They do not buylist every card; empty ID search means not on the list. Name fallback was a workaround and must not be the contract.",
    status: "open",
    createdAt: "2026-09-05T06:31:00.000Z",
    updatedAt: "2026-09-05T06:31:00.000Z",
    copiedAt: null,
  },
  {
    id: "IN-20260905-12",
    nodeId: "p-mtg-buylist",
    title: "Extra store vendors as Compare streams",
    body: "Future: plug more buylist stores in the same way as Playmantis and MTGMate — isolated stream, then Compare when two or more allocates exist. Credit vs credit.",
    status: "open",
    createdAt: "2026-09-05T06:32:00.000Z",
    updatedAt: "2026-09-05T06:32:00.000Z",
    copiedAt: null,
  },
  {
    id: "IN-20260905-13",
    nodeId: "p-mtg-buylist",
    title: "Parked / out of v1 leftovers",
    body: "From the old WIP plan, still not in scope: combined % cutoff + CK USD FX shop-floor filter; Neon shared notes; store cart submit; Mate password on the hub; a second offline app; durable card/inventory database. Zip must not ship data/.",
    status: "open",
    createdAt: "2026-09-05T06:33:00.000Z",
    updatedAt: "2026-09-05T06:33:00.000Z",
    copiedAt: null,
  },
];

const MTG_BUYLIST_TICKETS: KanbanTicket[] = [
  {
    id: "kt-mate-mobile-ux",
    nodeId: "p-mtg-buylist",
    title: "Mobile Mate harvest capture",
    body: "Experience: a phone-friendly way to capture Mate /data without F12.",
    lane: "experience",
    column: "later",
    sourceIdeaId: "raw-mtmje2ew-f55c7z",
    createdAt: "2026-09-04T05:53:20.301Z",
    updatedAt: "2026-09-04T05:53:20.319Z",
  },
  {
    id: "kt-mate-mobile-data",
    nodeId: "p-mtg-buylist",
    title: "Mate harvest payload on mobile",
    body: "Data: same join/store types as desktop harvest.",
    lane: "data",
    column: "later",
    sourceIdeaId: "raw-mtmje2ew-f55c7z",
    createdAt: "2026-09-04T05:53:20.301Z",
    updatedAt: "2026-09-04T05:53:20.319Z",
  },
];

const GLOBAL_IDEAS: KanbanInboxNote[] = [
  {
    id: "IN-20260907-02",
    nodeId: "global",
    title: "Raise an Idea leaf tag",
    body: "Leaf tag should be a label until click, then the Site-network tree in a nested popup. Details box grows. Save/Cancel always visible. Same on Inbox edit.",
    status: "open",
    createdAt: "2026-09-07T02:00:00.000Z",
    updatedAt: "2026-09-07T02:00:00.000Z",
    copiedAt: null,
  },
  {
    id: "IN-20260907-03",
    nodeId: "global",
    title: "Kanban Online tag colour",
    body: "i-kanban code is pink D45A78. Internal hub is 4A8FDC. Badge should be a blue tint of Internal, not pink.",
    status: "open",
    createdAt: "2026-09-07T02:10:00.000Z",
    updatedAt: "2026-09-07T02:10:00.000Z",
    copiedAt: null,
  },
  {
    id: "IN-20260907-04",
    nodeId: "global",
    title: "Empty leaf shells from old my-site",
    body: "Do not register empty my-site leaves. Leave this note open so a comparison can be uploaded as an attachment.",
    status: "open",
    createdAt: "2026-09-07T02:20:00.000Z",
    updatedAt: "2026-09-07T02:20:00.000Z",
    copiedAt: null,
  },
  {
    id: "IN-20260907-05",
    nodeId: "global",
    title: "Attachment verify note",
    body: "Verify screenshot + CSV attachments persist after reload.",
    status: "open",
    createdAt: "2026-09-07T06:47:41.655Z",
    updatedAt: "2026-09-07T10:46:31.794Z",
    copiedAt: "2026-09-07T06:49:32.526Z",
  },
];

const GLOBAL_DONE_TICKETS: KanbanTicket[] = [
  {
    id: "kt-inbox-attachments",
    nodeId: "global",
    title: "Inbox file attachments",
    body: "Inbox notes hold files (8 MB each, 5 per note). Neon bytea + JSON+bin fallback. Tickets inherit via sourceIdeaId (read-only). Raise saves the note first, then POSTs files. Copy prompt inlines small text; images/PDFs are listed only.",
    lane: "data",
    column: "done",
    sourceIdeaId: "IN-20260907-04",
    createdAt: "2026-09-07T06:10:00.000Z",
    updatedAt: "2026-09-07T06:20:00.000Z",
  },
  {
    id: "kt-raise-compact",
    nodeId: "global",
    title: "Compact Raise / Inbox leaf tag",
    body: "Leaf tag is a label until click, then the same Site-network tree in a nested popup. Details textarea takes leftover height. Save/Cancel stay on screen. Same on Inbox edit.",
    lane: "experience",
    column: "done",
    sourceIdeaId: "IN-20260907-02",
    createdAt: "2026-09-07T06:10:00.000Z",
    updatedAt: "2026-09-07T06:20:00.000Z",
  },
  {
    id: "kt-kanban-badge-blue",
    nodeId: "global",
    title: "Kanban Online badge blue tint",
    body: "i-kanban CodeBadge is a blue tint of Internal hub 4A8FDC (now 6BA4E3), not pink D45A78. Inbox lane accent stays pink.",
    lane: "experience",
    column: "done",
    sourceIdeaId: "IN-20260907-03",
    createdAt: "2026-09-07T06:10:00.000Z",
    updatedAt: "2026-09-07T06:20:00.000Z",
  },
];

const HUB_DECISIONS_TICKETS: KanbanTicket[] = [
  {
    id: "kt-db-make-live",
    nodeId: "global",
    title: "Make DB cutover live (zip deploy)",
    body: `Code for simple stores + MRT relational rows + zip exclude of data/ is in-repo. Not live until you say make it live.

Done when: Feedback add and an MRT Save survive zip deploy and App Service restage. Plan: docs/NEON_CUTOVER.md. Do not deploy from a random chat — wait for that phrase.

Chat: persistence / hub-decisions pack (close that thread).`,
    lane: "platform",
    column: "open",
    sourceIdeaId: null,
    createdAt: "2026-09-08T10:45:00.000Z",
    updatedAt: "2026-09-08T10:45:00.000Z",
  },
  {
    id: "kt-db-phase0-neon",
    nodeId: "global",
    title: "You: confirm Neon / DATABASE_URL",
    body: `Outside Cursor. Do not paste the connection string into chat.

Confirm the Postgres behind Azure App Setting DATABASE_URL on app-scrivengroup is the project you want. Optional: a Neon branch you can wipe. az login still required until GitHub Actions exists.

Blocks confidence in kt-db-make-live, not the code itself.`,
    lane: "data",
    column: "open",
    sourceIdeaId: null,
    createdAt: "2026-09-08T10:45:00.000Z",
    updatedAt: "2026-09-08T10:45:00.000Z",
  },
  {
    id: "kt-mrt-sandbox-pg",
    nodeId: "w-sunwater-mrt",
    title: "MRT guest sandbox + activity as Postgres tables",
    body: `NEON_CUTOVER pass 2. Keep one product, two desks (dc-guest-shape) but stop using zip-wiped JSON files.

Sandbox rows keyed by guest; TTL 168h; persist across deploy; Reset-to-live clones Neon live plan. Guest activity cap 500 in DB. Not JSONB. Own session. After kt-db-make-live.`,
    lane: "data",
    column: "later",
    sourceIdeaId: null,
    createdAt: "2026-09-08T10:45:00.000Z",
    updatedAt: "2026-09-08T10:45:00.000Z",
  },
  {
    id: "kt-publish-gha",
    nodeId: "global",
    title: "GitHub Actions so push can equal live",
    body: `dc-publish later slice. Hub locker is GitHub sg-hub; live is still the zip onto Azure until Actions exist.

Add OIDC + workflow: build standalone, exclude data/, az webapp deploy. Until then “make it live” always means the zip commands. docs/GIT_AND_RELEASE.md.`,
    lane: "platform",
    column: "later",
    sourceIdeaId: null,
    createdAt: "2026-09-08T10:45:00.000Z",
    updatedAt: "2026-09-08T10:45:00.000Z",
  },
  {
    id: "kt-great-merge-pack",
    nodeId: "global",
    title: "Great Merging of ’26 — export pack then port leaves",
    body: `Blocked on fb-atlas-ia-review (keep vs fold cards) then fb-atlas-skin-hub (sketched shells). This ticket is the data/code port, not the atlas framing.

Cursor implements in scrivengroup. Claude/you export: inventory, prisma schema, JSON/CSV (no secrets), app HTML/JS. Preferred: sibling folder Cursor/my-site. Not a git merge of stacks. MRT is already on the hub. docs/GREAT_MERGING.md. Paste for Claude is in that doc and docs/hub-decisions-pack.html.`,
    lane: "structure",
    column: "later",
    sourceIdeaId: null,
    createdAt: "2026-09-08T10:45:00.000Z",
    updatedAt: "2026-09-08T10:45:00.000Z",
  },
  {
    id: "kt-two-agents-claude-md",
    nodeId: "global",
    title: "Paste two-agent treaty into my-site CLAUDE.md",
    body: `You or Claude. Cursor does not edit my-site unless that folder is the workspace.

Card: hub (app-scrivengroup) is owned by Cursor; do not zip-deploy the hub from Claude; export packs for Great Merging; stop editing a leaf after it moves. Full treaty: docs/TWO_AGENTS.md.`,
    lane: "platform",
    column: "later",
    sourceIdeaId: null,
    createdAt: "2026-09-08T10:45:00.000Z",
    updatedAt: "2026-09-08T10:45:00.000Z",
  },
  {
    id: "kt-leaf-dev-notes",
    nodeId: "global",
    title: "Development tab + bulk notes on every leaf",
    body: `dc-leaf-contract target, not done. MRT already has changelog + openNotes. Sketched leaves: changelog on the shell only.

When a leaf leaves sketched: Development surface with changelog/plan and a bulk text notes area; shipping versions show number + datetime. Do not fake it on sketched shells. Handbook: docs/WEB_DEVELOPMENT.md.`,
    lane: "experience",
    column: "later",
    sourceIdeaId: null,
    createdAt: "2026-09-08T10:45:00.000Z",
    updatedAt: "2026-09-08T10:45:00.000Z",
  },
  {
    id: "kt-commit-decisions-pack",
    nodeId: "global",
    title: "Commit hub-decisions pack and related canon docs",
    body: `Git only when you say commit (now also pushes). Files from the persistence/decisions chat: docs/hub-decisions-pack.html, WEB_DEVELOPMENT.md, NEON_CUTOVER.md, GREAT_MERGING.md, TWO_AGENTS.md, GIT_AND_RELEASE.md, DEV_CHOICES.md, .cursor/rules/hub-web-dev.mdc, two-agents.mdc, seed dc-* rows.

Not a reason to zip-deploy. Teaching mudmaps in docs/mudmap/ may be committed or left untracked — your call.`,
    lane: "platform",
    column: "open",
    sourceIdeaId: null,
    createdAt: "2026-09-08T10:45:00.000Z",
    updatedAt: "2026-09-08T10:45:00.000Z",
  },
];

const BOARD_SEEDS: Record<string, { ideas: KanbanInboxNote[]; tickets: KanbanTicket[] }> = {
  "p-mtg-buylist": { ideas: MTG_BUYLIST_IDEAS, tickets: MTG_BUYLIST_TICKETS },
  global: {
    ideas: GLOBAL_IDEAS,
    tickets: [...GLOBAL_DONE_TICKETS, ...HUB_DECISIONS_TICKETS.filter((t) => t.nodeId === "global")],
  },
  "w-sunwater-mrt": {
    ideas: [],
    tickets: HUB_DECISIONS_TICKETS.filter((t) => t.nodeId === "w-sunwater-mrt"),
  },
};

/** Add missing seeded ids across the whole row set (retag must not re-seed). */
export function missingKanbanSeed(existing: {
  ideaIds: Set<string>;
  ticketIds: Set<string>;
}): { ideas: KanbanInboxNote[]; tickets: KanbanTicket[] } {
  const ideas: KanbanInboxNote[] = [];
  const tickets: KanbanTicket[] = [];
  for (const seed of Object.values(BOARD_SEEDS)) {
    for (const idea of seed.ideas) {
      if (!existing.ideaIds.has(idea.id)) ideas.push(idea);
    }
    for (const ticket of seed.tickets) {
      if (!existing.ticketIds.has(ticket.id)) tickets.push(ticket);
    }
  }
  return { ideas, tickets };
}

/** Add missing seeded ids. Does not overwrite notes already on the disk. */
export function mergeKanbanSeed(board: KanbanBoard): { board: KanbanBoard; added: boolean } {
  const missing = missingKanbanSeed({
    ideaIds: new Set(board.ideas.map((i) => i.id)),
    ticketIds: new Set(board.tickets.map((t) => t.id)),
  });
  const newIdeas = missing.ideas.filter((i) => i.nodeId === board.nodeId);
  const newTickets = missing.tickets.filter((t) => t.nodeId === board.nodeId);
  if (newIdeas.length === 0 && newTickets.length === 0) {
    return { board, added: false };
  }
  const now = new Date().toISOString();
  return {
    added: true,
    board: {
      ...board,
      ideas: [...newIdeas, ...board.ideas],
      tickets: [...board.tickets, ...newTickets],
      revision: board.revision + 1,
      updatedAt: now,
      events: prependEvent(board.events, {
        at: now,
        kind: "inbox",
        summary: `Seeded ${newIdeas.length} inbox note(s) and ${newTickets.length} ticket(s) from the live zip.`,
      }),
    },
  };
}
