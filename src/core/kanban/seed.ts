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

const BOARD_SEEDS: Record<string, { ideas: KanbanInboxNote[]; tickets: KanbanTicket[] }> = {
  "p-mtg-buylist": { ideas: MTG_BUYLIST_IDEAS, tickets: MTG_BUYLIST_TICKETS },
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
