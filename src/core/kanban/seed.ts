import { prependEvent, type KanbanBoard, type KanbanInboxNote, type KanbanTicket } from "./schema";

/** Inbox + tickets to merge onto a live disk that has no `data/` from the zip. */
const MTG_BUYLIST_IDEAS: KanbanInboxNote[] = [
  {
    id: "IN-20260904-02",
    nodeId: "p-mtg-buylist",
    title: "Future Functonality Idea - 'getting cash back'",
    body: "Scenario: i am preparing buy a stack of bulk cards for $20 from a vendor. I have scanned the cards and process it through this app - can i get the $20 back from MTGMate and accumulate credit from other stores?",
    status: "archived",
    createdAt: "2026-09-04T08:56:47.892Z",
    updatedAt: "2026-09-17T06:30:00.000Z",
    copiedAt: null,
  },
  {
    id: "raw-mtmjtpzg-pe3pkf",
    nodeId: "p-mtg-buylist",
    title: "Testing tab",
    body: "'Parser fixture check' seems like its a testing fucntion, and if so should live under its own tab. \n\nLook i am all for having whatever we need for development and testing live under the Recevelopment tab, but we need to have the sub-tabs structured.",
    status: "archived",
    createdAt: "2026-09-04T06:04:13.132Z",
    updatedAt: "2026-09-17T06:30:00.000Z",
    copiedAt: null,
  },
  {
    id: "raw-mtmjsema-xrf956",
    nodeId: "p-mtg-buylist",
    title: "changelog - wip/plan",
    body: "This feels like it should perpetually live in the next version, so i would like the default changelog table to always include a row that is (for example) 1.2(wip) with the details expanded.  We can utilise the same structure to emphasise the same data.\nThen once the next revision is publshed and 1.2 becomes real with its own details, the top row would be 1.3(wip) with any remaining/updated/new WIP items.",
    status: "archived",
    createdAt: "2026-09-04T06:03:11.746Z",
    updatedAt: "2026-09-17T06:30:00.000Z",
    copiedAt: null,
  },
  {
    id: "raw-mtmjqb8t-jglsww",
    nodeId: "p-mtg-buylist",
    title: "Changelog Format",
    body: "Keep the sumamry table rows (1.0, 1.0, etc) but have each row expandable to see the detail, instead of the detail being a stacke dblock of text below the table.",
    status: "archived",
    createdAt: "2026-09-04T06:01:34.061Z",
    updatedAt: "2026-09-17T06:30:00.000Z",
    copiedAt: null,
  },
  {
    id: "raw-mtmjpad9-7x5fou",
    nodeId: "p-mtg-buylist",
    title: "light-grey behind all 'want qty = 0' in the summary table.",
    body: "light-grey behind all 'want qty = 0' in the summary table.",
    status: "archived",
    createdAt: "2026-09-04T06:00:46.269Z",
    updatedAt: "2026-09-17T06:30:00.000Z",
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
    status: "archived",
    createdAt: "2026-09-05T06:30:00.000Z",
    updatedAt: "2026-09-17T06:30:00.000Z",
    copiedAt: null,
  },
  {
    id: "IN-20260905-11",
    nodeId: "p-mtg-buylist",
    title: "Playmantis harvest — Scryfall ID only",
    body: "HOLD matching on the large 2025-26 rares CSV (still misses many after 1.3 name fallback). Future: squash the harvest bug and lock ground rules — Playmantis bulk should run exclusively off Scryfall ID (tag:buylist + scryfall-id), no name-search assumptions. They do not buylist every card; empty ID search means not on the list. Name fallback was a workaround and must not be the contract.",
    status: "archived",
    createdAt: "2026-09-05T06:31:00.000Z",
    updatedAt: "2026-09-17T06:30:00.000Z",
    copiedAt: null,
  },
  {
    id: "IN-20260905-12",
    nodeId: "p-mtg-buylist",
    title: "Extra store vendors as Compare streams",
    body: "Future: plug more buylist stores in the same way as Playmantis and MTGMate — isolated stream, then Compare when two or more allocates exist. Credit vs credit.",
    status: "archived",
    createdAt: "2026-09-05T06:32:00.000Z",
    updatedAt: "2026-09-17T06:30:00.000Z",
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
  {
    id: "IN-20260910-01",
    nodeId: "p-mtg-buylist",
    title: "Past run summary logs",
    body: "Logs → diffs is harvest vs Import Review only. Consider a backend table of past run summaries (CSV name, when, store credit totals, sell counts) so Logs can grow another L2 tab without relying on the current Run store.",
    status: "archived",
    createdAt: "2026-09-10T04:40:00.000Z",
    updatedAt: "2026-09-17T06:30:00.000Z",
    copiedAt: null,
  },
  {
    id: "IN-20260906-01",
    nodeId: "p-mtg-buylist",
    title: "Playmantis checks",
    body: "Ability to save the playmantis csv run as a file upload to use as the PM tool. Also add a way to compare the results of the PM harvest to the PM Upload, and log the deltas for continual improvement.",
    status: "archived",
    createdAt: "2026-09-06T00:00:00.000Z",
    updatedAt: "2026-09-17T06:30:00.000Z",
    copiedAt: null,
  },
  {
    id: "IN-20260915-01",
    nodeId: "p-mtg-buylist",
    title: "Step 4: needs the set code and cn.",
    body: "Recent upload of foils showed many basic lands, which have the same name but different set code and cn.",
    status: "archived",
    createdAt: "2026-09-15T00:00:00.000Z",
    updatedAt: "2026-09-17T06:30:00.000Z",
    copiedAt: null,
  },
  {
    id: "IN-20260904-03",
    nodeId: "p-mtg-buylist",
    title: "Mobile Friendly functionality",
    body: "Specifically: Need a way to harvest Mate on mobile without F12 console.",
    status: "archived",
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-17T06:30:00.000Z",
    copiedAt: null,
  },
  {
    id: "IN-20260914-01",
    nodeId: "p-mtg-buylist",
    title: "Shortlist wanted commons and uncommons from mtgmate for specific sets.",
    body: "Prepare a shortlist of commons and uncommons to keep an eye out for when perusing bulk at stores.",
    status: "archived",
    createdAt: "2026-09-14T00:00:00.000Z",
    updatedAt: "2026-09-17T06:30:00.000Z",
    copiedAt: null,
  },
  {
    id: "IN-20260916-02",
    nodeId: "p-mtg-buylist",
    title: "keep an eye out for...",
    body: "This is matching the wrong finish / version. Update the function to align with the mtgmate comparison.",
    status: "archived",
    createdAt: "2026-09-16T00:00:00.000Z",
    updatedAt: "2026-09-17T06:30:00.000Z",
    copiedAt: null,
  },
  {
    id: "IN-20260918-01",
    nodeId: "p-mtg-buylist",
    title: "MTG Buylist Layout per Run",
    body: "Replace the vertical Step 1–5 stack with four cards under the run tabs: Upload → Harvest → Picking → Reupload. Only the active step body is on screen.",
    status: "archived",
    createdAt: "2026-09-18T01:33:06.253Z",
    updatedAt: "2026-09-18T02:35:00.000Z",
    copiedAt: "2026-09-18T01:33:06.253Z",
  },
  {
    id: "IN-20260918-02",
    nodeId: "p-mtg-buylist",
    title: "Buylist leaf tabs remount the whole leaf",
    body: "Run / Logs / Development remount the whole leaf (full veil). Keep PageNav, title row, and L1 tabs; swap only the pane. L1 tabs must not be Links. Changelog: click row to expand/collapse; group by live milestone X.Y.",
    status: "archived",
    createdAt: "2026-09-18T05:30:00.000Z",
    updatedAt: "2026-09-18T05:55:00.000Z",
    copiedAt: "2026-09-18T06:00:00.000Z",
  },
  {
    id: "IN-20260918-03",
    nodeId: "p-mtg-buylist",
    title: "1.5 wrap — copy and leftover Testing remap",
    body: "Last 1.5.x sitting before 1.6: Development intent, drop ?tab=testing remap, Brisbane stamps, hide the dummy Logs diffs tab. No new product.",
    status: "archived",
    createdAt: "2026-09-18T07:50:00.000Z",
    updatedAt: "2026-09-18T08:10:00.000Z",
    copiedAt: "2026-09-18T08:10:00.000Z",
    kind: "housekeeping",
    source: "raise",
    pageHref: "/p/mtg-buylist/development",
    pageTitle: "MTG Buylist",
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
  {
    id: "kt-changelog-expand",
    nodeId: "p-mtg-buylist",
    title: "Changelog WIP top row — superseded",
    body: "Expand-on-click + collapse + X.Y grouping shipped in kt-buylist-leaf-tabs / 1.5.34. Perpetual next-version WIP row cancelled: 1.3.4 already moved plans to Inbox. sourceIdeaId raw-mtmjqb8t-jglsww / raw-mtmjsema-xrf956.",
    lane: "structure",
    column: "archived",
    sourceIdeaId: "raw-mtmjqb8t-jglsww",
    createdAt: "2026-09-17T06:30:00.000Z",
    updatedAt: "2026-09-18T07:54:00.000Z",
  },
  {
    id: "kt-cash-back-scenario",
    nodeId: "p-mtg-buylist",
    title: "Cash-back / vendor-stack recovery scenario",
    body: "Future: can a $20 bulk stack scanned through this app recover that listed from Mate plus credit at other stores.",
    lane: "behaviour",
    column: "later",
    sourceIdeaId: "IN-20260904-02",
    createdAt: "2026-09-17T06:30:00.000Z",
    updatedAt: "2026-09-17T06:30:00.000Z",
  },
  {
    id: "kt-pm-scryfall-id-only",
    nodeId: "p-mtg-buylist",
    title: "Playmantis harvest on Scryfall ID only",
    body: "Lock bulk harvest to Scryfall ID + finish. Empty ID search means not on the list. Name fallback is not the contract.",
    lane: "data",
    column: "later",
    sourceIdeaId: "IN-20260905-11",
    createdAt: "2026-09-17T06:30:00.000Z",
    updatedAt: "2026-09-17T06:30:00.000Z",
  },
  {
    id: "kt-extra-vendors",
    nodeId: "p-mtg-buylist",
    title: "Extra store vendors as Compare streams",
    body: "Plug more buylist stores the same way as Playmantis and Mate: isolated stream, then Compare on credit.",
    lane: "structure",
    column: "later",
    sourceIdeaId: "IN-20260905-12",
    createdAt: "2026-09-17T06:30:00.000Z",
    updatedAt: "2026-09-17T06:30:00.000Z",
  },
  {
    id: "kt-run-summary-logs",
    nodeId: "p-mtg-buylist",
    title: "Past run summary log table",
    body: "Logs L2: persist CSV name, when, store credit totals, sell counts so Logs is not only the current run.",
    lane: "data",
    column: "later",
    sourceIdeaId: "IN-20260910-01",
    createdAt: "2026-09-17T06:30:00.000Z",
    updatedAt: "2026-09-17T06:30:00.000Z",
  },
  {
    id: "kt-bulk-shortlist",
    nodeId: "p-mtg-buylist",
    title: "Mate commons/uncommons shortlist by set",
    body: "A keep-an-eye-out list for bulk perusal without scanning the whole collection.",
    lane: "behaviour",
    column: "later",
    sourceIdeaId: "IN-20260914-01",
    createdAt: "2026-09-17T06:30:00.000Z",
    updatedAt: "2026-09-17T06:30:00.000Z",
  },
  {
    id: "kt-eye-out-finish",
    nodeId: "p-mtg-buylist",
    title: "Keep-an-eye-out finish/version match",
    body: "Shipped in 1.5.33 (kt-testing-tab-mate-print). IN-20260916-02 was the wrong printing $ (sibling max), not the shortlist. Listed Mate $ / Put aside use the resolved printing. kt-bulk-shortlist stays Later.",
    lane: "behaviour",
    column: "done",
    sourceIdeaId: "IN-20260916-02",
    createdAt: "2026-09-17T06:30:00.000Z",
    updatedAt: "2026-09-18T08:05:00.000Z",
  },
  {
    id: "kt-run-four-step",
    nodeId: "p-mtg-buylist",
    title: "Four-step horizontal Run (Upload / Harvest / Picking / Reupload)",
    body: "sourceIdeaId IN-20260918-01. Run cards: Upload → Harvest → Picking → Reupload. Only the active step body is on screen. Same store, harvest, Compare, and re-prepare logic. No CSV row editor.",
    lane: "experience",
    column: "done",
    sourceIdeaId: "IN-20260918-01",
    createdAt: "2026-09-18T01:33:06.253Z",
    updatedAt: "2026-09-18T02:35:00.000Z",
  },
  {
    id: "kt-run-step-polish",
    nodeId: "p-mtg-buylist",
    title: "Run step polish: folder-tab join, 2a/2b harvest, New Run hang",
    body: "Follow-up to kt-run-four-step / IN-20260918-01. New Run is client-only idle. Folder-tab join panel, chevrons, numbered titles, both-store harvest/picking/reupload summaries, Harvest 2a/2b one table, Picking toolbar, collapse tables only, pointer cursors. Bump 1.5.30. Live stays 1.5.",
    lane: "experience",
    column: "done",
    sourceIdeaId: "IN-20260918-01",
    createdAt: "2026-09-18T03:00:00.000Z",
    updatedAt: "2026-09-18T03:25:00.000Z",
  },
  {
    id: "kt-run-step-chrome",
    nodeId: "p-mtg-buylist",
    title: "Run chrome: merged tab silhouette, equal cards, shared table toolbar",
    body: "Follow-up to kt-run-step-polish / IN-20260918-01. Rebuild folder-tab as one silhouette (concave shoulders). Equal cards, darker+thicker selected, sticky collapse headers, CSV O-preview, Harvest store sections, Picking RAG+$ badges, shared table toolbar. Bump 1.5.31. Live stays 1.5.",
    lane: "experience",
    column: "done",
    sourceIdeaId: "IN-20260918-01",
    createdAt: "2026-09-18T03:40:00.000Z",
    updatedAt: "2026-09-18T04:10:00.000Z",
  },
  {
    id: "kt-run-step-metrics",
    nodeId: "p-mtg-buylist",
    title: "Run metrics grid, white join fill, table-filter wait",
    body: "Follow-up to kt-run-step-chrome / IN-20260918-01. White --surface silhouette fill. Store metrics name | status | RAG | $. No runUi on table filters. Put aside above Picking table, collapsible. Toolbar tabs left, legends+buttons right. Bump 1.5.32. Live stays 1.5.",
    lane: "experience",
    column: "done",
    sourceIdeaId: "IN-20260918-01",
    createdAt: "2026-09-18T04:20:00.000Z",
    updatedAt: "2026-09-18T05:10:00.000Z",
  },
  {
    id: "kt-buylist-leaf-tabs",
    nodeId: "p-mtg-buylist",
    title: "Leaf tabs keep chrome; changelog groups by X.Y",
    body: "sourceIdeaId IN-20260918-02. Run / Logs / Development keep PageNav, title, L1 tabs; pane only. Buttons + router.replace, not Links. Neutralize leaf loading.tsx. KanbanOnlineHost.selectChrome without runUi. Changelog row toggle + X.Y groups. Bump 1.5.34. Live stays 1.5. WIP top-row stays Later on kt-changelog-expand.",
    lane: "experience",
    column: "done",
    sourceIdeaId: "IN-20260918-02",
    createdAt: "2026-09-18T05:30:00.000Z",
    updatedAt: "2026-09-18T05:55:00.000Z",
  },
  {
    id: "kt-buylist-1.5-wrap",
    nodeId: "p-mtg-buylist",
    title: "1.5 wrap: copy, timestamps, leftover Testing remap",
    body: "sourceIdeaId IN-20260918-03. Development intent matches the host. Drop testing from parseDevTab. Brisbane formatStamp on Changelog/Logs/Run. Remove dummy Logs diffs tab. Rename CsvRowsEditor. Bump 1.5.35. Live stays 1.5. No 1.6 product.",
    lane: "experience",
    column: "done",
    sourceIdeaId: "IN-20260918-03",
    createdAt: "2026-09-18T07:50:00.000Z",
    updatedAt: "2026-09-18T08:10:00.000Z",
  },
];

const GLOBAL_IDEAS: KanbanInboxNote[] = [
  {
    id: "IN-20260907-02",
    nodeId: "global",
    title: "Raise an Idea leaf tag",
    body: "Leaf tag should be a label until click, then the Site-network tree in a nested popup. Details box grows. Save/Cancel always visible. Same on Inbox edit.",
    status: "archived",
    createdAt: "2026-09-07T02:00:00.000Z",
    updatedAt: "2026-09-08T12:00:00.000Z",
    copiedAt: null,
  },
  {
    id: "IN-20260907-03",
    nodeId: "global",
    title: "Kanban Online tag colour",
    body: "i-kanban code is pink D45A78. Internal hub is 4A8FDC. Badge should be a blue tint of Internal, not pink.",
    status: "archived",
    createdAt: "2026-09-07T02:10:00.000Z",
    updatedAt: "2026-09-08T12:00:00.000Z",
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
    status: "archived",
    createdAt: "2026-09-07T06:47:41.655Z",
    updatedAt: "2026-09-08T12:00:00.000Z",
    copiedAt: "2026-09-07T06:49:32.526Z",
  },
  {
    id: "IN-20260908-02",
    nodeId: "global",
    title: "Kanban as Development template",
    body: "Kanban Online is the template for other leaves' Development tabs: Raise (leaf-tagged), Inbox, board, Changelog, Notes. Design spec (labels, width, Raise, colours) lives only on global /i/kanban. Relabel in chrome.ts so every copy follows. New leaves get this host when they leave sketched. Design Library apply-to-all is later.",
    status: "archived",
    createdAt: "2026-09-08T02:00:00.000Z",
    updatedAt: "2026-09-08T12:00:00.000Z",
    copiedAt: null,
  },
  {
    id: "IN-20260908-01",
    nodeId: "global",
    title: "test idea from localhost",
    body: "We should have a Design Library added as another hub or internal hub. Duplicate of IN-20260908-06.",
    status: "archived",
    createdAt: "2026-09-08T12:02:39.069Z",
    updatedAt: "2026-09-09T06:50:00.000Z",
    copiedAt: null,
  },
  {
    id: "IN-20260908-05",
    nodeId: "global",
    title: "Feedback merge into Kanban ideas.",
    body: "The feedback functionally should merge into the Kanban ideas register. There's boil down to both being 'user generates input '. Feedback being global to capture bugs and improvements is still a good idea. 'raise' is useful in terms of dumping ideas within a leaf. Figure out how to have a single dataset, because the workflow becomes 'i am on branch wip/leaf, scout the Kanban for related ideas and work a plan to acrion'.",
    status: "archived",
    createdAt: "2026-09-08T22:54:24.856Z",
    updatedAt: "2026-09-09T06:50:00.000Z",
    copiedAt: null,
    source: "feedback",
  },
  {
    id: "IN-20260916-01",
    nodeId: "global",
    title: "WIP desk preview must stay on that desk’s port",
    body: `Bug. Agents copy station .env.local (AUTH_URL=http://localhost:3000) onto a wip desk, run next on :3001, then type “localhost:3001” while login, callbacks, and clickable preview dump the user on :3000 (station).

Yard protocol: station scrivengroup / dev_main = :3000. Each wip/<leaf> desk = its own port (:3001, :3002, …). AUTH_URL on that desk must match the port next dev uses. Never paste a :3000 preview from a wip chat.

Update the brain so this cannot happen again: YARD_DESKS, publish-yard rule, GIT_AND_RELEASE desks line, .env.example, kanban session prompt Host, hub-web-dev, checklist item 8. Split remaining docs (technical.md, hub-decisions-pack, README) if they still say “open localhost:3000” as the only preview.`,
    status: "archived",
    kind: "bug",
    source: "raise",
    createdAt: "2026-09-16T01:14:00.000Z",
    updatedAt: "2026-09-21T00:30:00.000Z",
    copiedAt: null,
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
  {
    id: "kt-kanban-dev-template",
    nodeId: "global",
    title: "Development tab = Kanban Online host",
    body: "Leaves that have left sketched use KanbanOnlineHost: Inbox, board, Changelog, Notes, Raise tagged to the leaf. Sketched shells stay changelog-only. Design spec tab is global /i/kanban only.",
    lane: "experience",
    column: "done",
    sourceIdeaId: "IN-20260908-02",
    createdAt: "2026-09-08T12:00:00.000Z",
    updatedAt: "2026-09-08T12:00:00.000Z",
  },
  {
    id: "kt-kanban-chrome-tokens",
    nodeId: "global",
    title: "Kanban chrome labels in one file",
    body: "Copy and layout notes live in src/core/kanban/chrome.ts (KANBAN_CHROME). Relabel there; every host follows. Not the Design Library atlas.",
    lane: "experience",
    column: "done",
    sourceIdeaId: "IN-20260908-02",
    createdAt: "2026-09-08T12:00:00.000Z",
    updatedAt: "2026-09-08T12:00:00.000Z",
  },
  {
    id: "kt-kanban-design-spec",
    nodeId: "global",
    title: "Design spec tab on /i/kanban only",
    body: "Global Kanban Online shows a Design spec tab that documents chrome.ts. Leaf Development embeds do not show it.",
    lane: "experience",
    column: "done",
    sourceIdeaId: "IN-20260908-02",
    createdAt: "2026-09-08T12:00:00.000Z",
    updatedAt: "2026-09-08T12:00:00.000Z",
  },
  {
    id: "kt-kanban-rollout-buylist",
    nodeId: "p-mtg-buylist",
    title: "Buylist Development uses the Kanban host",
    body: "MTG Buylist Development is the shared host (Inbox, board, Changelog, Notes, Raise). Parser fixture check stays a Testing extra. Per-login notes still save via the buylist store.",
    lane: "experience",
    column: "done",
    sourceIdeaId: "IN-20260908-02",
    createdAt: "2026-09-08T12:00:00.000Z",
    updatedAt: "2026-09-08T12:00:00.000Z",
  },
  {
    id: "kt-kanban-rollout-mrt",
    nodeId: "w-sunwater-mrt",
    title: "MRT Development uses the Kanban host",
    body: "Sunwater MRT Development tab embeds KanbanOnlineHost. Notes still save on the plan store openNotes field. Staff-only; guests do not see Development.",
    lane: "experience",
    column: "done",
    sourceIdeaId: "IN-20260908-02",
    createdAt: "2026-09-08T12:00:00.000Z",
    updatedAt: "2026-09-08T12:00:00.000Z",
  },
];

const HUB_DECISIONS_TICKETS: KanbanTicket[] = [
  {
    id: "kt-db-make-live",
    nodeId: "global",
    title: "Make DB cutover live (zip deploy)",
    body: `Code for simple stores + MRT relational rows + zip exclude of data/ is in-repo. Not live until you say make it live.

Done when: a Feedback add, a Kanban Raise, and an MRT Save survive zip deploy and App Service restage. Notes durability: kt-notes-survive-publish. Plan: docs/NEON_CUTOVER.md. Do not deploy from a random chat — wait for that phrase.

Chat: persistence / hub-decisions pack (close that thread).`,
    lane: "platform",
    column: "open",
    sourceIdeaId: null,
    createdAt: "2026-09-08T10:45:00.000Z",
    updatedAt: "2026-09-08T10:45:00.000Z",
  },
  {
    id: "kt-notes-survive-publish",
    nodeId: "global",
    title: "Live Feedback and Kanban notes must survive publish",
    body: `Durability/publish card. sourceIdeaId IN-20260909-03.

Live staff notes live on Neon when DATABASE_URL is set. Zip strips data/. persistKanbanBundle upserts; pgReplaceKanbanRows has no callers. Seed only adds missing ids. w-sunwater-mrt seed ideas: [] is not the live inbox.

Sittings: npx --yes tsx scripts/inspect-neon-inbox.ts (Neon SELECT first) then /i/feedback then seed. Do not call getKanbanBoard for forensics (it can seed-write). Never print DATABASE_URL.

Done when: a Feedback add and a Kanban Raise survive zip + App Service restage. That live proof is kt-db-make-live (still Open). Do not zip from a wip desk. No MRT product work on this card.

Feedback Bug stays on /i/feedback; Idea copies to Kanban Inbox; Raise is Kanban only.`,
    lane: "platform",
    column: "open",
    sourceIdeaId: "IN-20260909-03",
    createdAt: "2026-09-09T06:20:00.000Z",
    updatedAt: "2026-09-09T06:20:00.000Z",
  },
  {
    id: "kt-db-phase0-neon",
    nodeId: "global",
    title: "You: confirm Neon / DATABASE_URL",
    body: `Done on the laptop: DATABASE_URL is in gitignored .env.local on the desks; localhost Kanban writes Neon. Do not paste the connection string into chat.

Make it live (kt-db-make-live) is still the Azure zip so App Service uses the same URL.`,
    lane: "data",
    column: "done",
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
    id: "kt-mrt-shell-first",
    nodeId: "w-sunwater-mrt",
    title: "MRT paints shell before plan data",
    body: `sourceIdeaId fb-mtteyhko. Spec in archived IN-20260908-03 and IN-20260909-01.

AppShell and MRT tabs render immediately. The workspace pane shows a loading line with qty (Loading plan… 1 of 2). MRT-local only — not the hub-wide spinner in fb-mtuwhdnu.`,
    lane: "experience",
    column: "open",
    sourceIdeaId: "fb-mtteyhko",
    createdAt: "2026-09-16T00:38:00.000Z",
    updatedAt: "2026-09-16T00:38:00.000Z",
  },
  {
    id: "kt-mrt-defer-board",
    nodeId: "w-sunwater-mrt",
    title: "Do not block Gantt on the Kanban board",
    body: `sourceIdeaId fb-mtteyhko.

Gantt path loads plan + changelogs in parallel. getKanbanBoard runs only when Development is shown. Do not call getKanbanBoard for inbox forensics.`,
    lane: "behaviour",
    column: "open",
    sourceIdeaId: "fb-mtteyhko",
    createdAt: "2026-09-16T00:38:00.000Z",
    updatedAt: "2026-09-16T00:38:00.000Z",
  },
  {
    id: "kt-publish-gha",
    nodeId: "global",
    title: "GitHub Actions so push can equal live",
    body: `Superseded. .github/workflows/publish.yml already zips via OIDC on hub-* / v* tags and Run workflow. Push to main or dev_main is not live (dc-publish). Do not implement push-equals-live.`,
    lane: "platform",
    column: "done",
    sourceIdeaId: null,
    createdAt: "2026-09-08T10:45:00.000Z",
    updatedAt: "2026-09-21T00:30:00.000Z",
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
    body: `Done as the Kanban Online host: Inbox, board, Changelog, Notes, Raise. Notes persist (kanban_leaf_notes, or a leaf callback). Sketched shells stay changelog-only. Handbook: docs/WEB_DEVELOPMENT.md.`,
    lane: "experience",
    column: "done",
    sourceIdeaId: null,
    createdAt: "2026-09-08T10:45:00.000Z",
    updatedAt: "2026-09-08T10:45:00.000Z",
  },
  {
    id: "kt-commit-decisions-pack",
    nodeId: "global",
    title: "Commit hub-decisions pack and related canon docs",
    body: `Done on the WIP/main catch-up. Canon docs and dc-* rows are in git. Not a reason to zip-deploy.`,
    lane: "platform",
    column: "done",
    sourceIdeaId: null,
    createdAt: "2026-09-08T10:45:00.000Z",
    updatedAt: "2026-09-08T10:45:00.000Z",
  },
  {
    id: "kt-git-three-lane",
    nodeId: "global",
    title: "Git race: live lane vs station vs wip desks",
    body: `Yard sitting. Bake-in A locked 2026-09-09. Branch name: **dev_main** (not main_dev).

Lanes (after the rename sitting — parked until Bill says go on that plan)
- main = Azure live (shop window), always most behind.
- dev_main = station / QA combination, folder scrivengroup, localhost:3000.
- wip/<leaf> = per-leaf desks, ahead of both.

Make it live = fast-forward main to dev_main and zip (tag hub-* / v* or GitHub Run workflow).

2026-09-09 catch-up: wip/kanban merged to station main and published (Kanban 0.2 / hub 1.6) so live, locker main, and the kanban desk match. wip/buylist ignored.

Still: one locker ScrivenGroup/sg-hub; never zip from a wip desk; commit ≠ merge ≠ live.

Touch later: docs/GIT_AND_RELEASE.md, dc-publish, docs/YARD_DESKS.md, docs/publish-yard.html, .cursor/rules/publish-yard.mdc.`,
    lane: "platform",
    column: "open",
    sourceIdeaId: null,
    createdAt: "2026-09-09T00:00:00.000Z",
    updatedAt: "2026-09-09T00:00:00.000Z",
  },
  {
    id: "kt-inbox-unify-schema",
    nodeId: "global",
    title: "One inbox table for Feedback and Ideas",
    body: "Data: kanban_ideas has kind, source, pageHref, pageTitle, submittedBy. Migrate leftover feedback rows (keep fb-* ids). Stop dual-write to the feedback table and dummy ideas table. JSON fallback mirrors columns.",
    lane: "data",
    column: "done",
    sourceIdeaId: "IN-20260908-05",
    createdAt: "2026-09-09T06:50:00.000Z",
    updatedAt: "2026-09-09T06:50:00.000Z",
  },
  {
    id: "kt-inbox-feedback-chrome",
    nodeId: "global",
    title: "Feedback chrome is the bug/help door",
    body: "Experience: header/FAB Feedback defaults to Bug. Leaf tag + page breadcrumb always stored. Idea remains in the type list but is not advertised. Raise writes kind=idea source=raise.",
    lane: "experience",
    column: "done",
    sourceIdeaId: "IN-20260908-05",
    createdAt: "2026-09-09T06:50:00.000Z",
    updatedAt: "2026-09-09T06:50:00.000Z",
  },
  {
    id: "kt-inbox-register-views",
    nodeId: "global",
    title: "Feedback and Ideas pages are inbox views",
    body: "Structure: /i/feedback shows bug/housekeeping/other plus source=feedback. /i/ideas shows kind=idea. i-ideas is untaggable. Inbox has a type chip and type filter (leaf hosts default to Idea).",
    lane: "structure",
    column: "done",
    sourceIdeaId: "IN-20260908-05",
    createdAt: "2026-09-09T06:50:00.000Z",
    updatedAt: "2026-09-09T06:50:00.000Z",
  },
  {
    id: "kt-inbox-sitting-docs",
    nodeId: "global",
    title: "Sittings use one inbox; bugs are not auto-ticketed",
    body: "Platform: FEEDBACK.md and WEB_DEVELOPMENT Feedback row. Inspect script reads kind. Neon first. Split ideas into tickets; do not auto-ticket bugs.",
    lane: "platform",
    column: "done",
    sourceIdeaId: "IN-20260908-05",
    createdAt: "2026-09-09T06:50:00.000Z",
    updatedAt: "2026-09-09T06:50:00.000Z",
  },
  {
    id: "kt-inbox-guest-write",
    nodeId: "global",
    title: "Guest Feedback writes the shared inbox",
    body: "Later. External guests use chrome Feedback only (no Development). Tag with audience/username and an external badge. Schema already has submittedBy. sourceIdeaId IN-20260908-04.",
    lane: "experience",
    column: "later",
    sourceIdeaId: "IN-20260908-04",
    createdAt: "2026-09-09T06:50:00.000Z",
    updatedAt: "2026-09-09T06:50:00.000Z",
  },
  {
    id: "kt-yard-wip-not-station",
    nodeId: "global",
    title: "Yard: prepare/handover must not merge station",
    body: "sourceIdeaId IN-20260918-04. Two-role desks written into GIT_AND_RELEASE, publish-yard.mdc, YARD_DESKS, dc-publish. Prepare/handover = save-slot only. Station sitting takes finished blocks.",
    lane: "platform",
    column: "done",
    sourceIdeaId: "IN-20260918-04",
    createdAt: "2026-09-18T08:23:01.354Z",
    updatedAt: "2026-09-21T00:30:00.000Z",
  },
  {
    id: "kt-yard-no-pull-station-mu56iw2h",
    nodeId: "global",
    title: "Teach agents: never merge station into a wip desk unless asked",
    body: "sourceIdeaId IN-20260917-06. Folded into the same two-role yard canon. Do not undo the 17 Sep merge unless Bill asks.",
    lane: "platform",
    column: "done",
    sourceIdeaId: "IN-20260917-06",
    createdAt: "2026-09-17T06:59:30.137Z",
    updatedAt: "2026-09-21T00:30:00.000Z",
  },
  {
    id: "kt-feedback-hub-tags",
    nodeId: "global",
    title: "Feedback leaf tag must include hub nodes",
    body: "sourceIdeaId IN-20260918-06. Any Site network hub (Work, Development, …) is selectable. Global stays. Retired /i/kanban redirects stay untaggable.",
    lane: "experience",
    column: "done",
    sourceIdeaId: "IN-20260918-06",
    createdAt: "2026-09-21T00:30:00.000Z",
    updatedAt: "2026-09-21T00:30:00.000Z",
  },
  {
    id: "kt-stale-feedback-table",
    nodeId: "global",
    title: "Refuse writes to the deprecated feedback table",
    body: "sourceIdeaId IN-20260917-07. pgInsertFeedback throws. Capture is kanban_ideas only. Copy-forward of leftover fb-* rows stays. Retire or catch up wip/kanban on station when asked.",
    lane: "data",
    column: "done",
    sourceIdeaId: "IN-20260917-07",
    createdAt: "2026-09-21T00:30:00.000Z",
    updatedAt: "2026-09-21T00:30:00.000Z",
  },
  {
    id: "kt-hub-version-homes",
    nodeId: "global",
    title: "Homes for Train vs leaf versions",
    body: `sourceIdeaId IN-20260921-01 / IN-20260918-05 / IN-20260909-04.

Locked process (do not build until kt-dev-hub-cards + kt-sg-hub-changelog + kt-train-changelog homes exist):

- Two clocks. Train = the live website zip: vX.Y on every surface (chrome: kt-train-chrome). Hotfix chip only when that zip is a hotfix. Leaf (hub suite included) = always X.Y.Z (pad 1.6 → 1.6.0).
- Train bumps X.Y every make-it-live (every new tip of main). Hotfix still takes the next X.Y; kind chip is Hotfix, not a letter suffix.
- Expand Train: leaves that changed in that zip, each with X.Y.Z. Unchanged omitted. Expand Hotfix: hotfix notes only.
- Leaf Y when that leaf ships in a Train. Z on the wip desk per slice; changelog row = version + datetime + title. No 4th segment a/b/c.
- Git tag hub-1.12. Do not collapse to one giant website SemVer. Do not put Train as X.Y.Z.

Blocked on Development house-clean. Not a dump into today's /d Changelog (that is Kanban 0.x / wrapping suite).`,
    lane: "structure",
    column: "later",
    sourceIdeaId: "IN-20260921-01",
    createdAt: "2026-09-21T00:30:00.000Z",
    updatedAt: "2026-09-21T02:16:00.000Z",
  },
  {
    id: "kt-dev-hub-site-network",
    nodeId: "global",
    title: "Development hub in Site network + Kanban page scroll",
    body: "Superseded by kt-dev-hub-cards (Layout 1 cards). sourceIdeaId IN-20260917-05.",
    lane: "structure",
    column: "archived",
    sourceIdeaId: "IN-20260917-05",
    createdAt: "2026-09-21T00:30:00.000Z",
    updatedAt: "2026-09-21T02:16:00.000Z",
  },
  {
    id: "kt-dev-hub-cards",
    nodeId: "global",
    title: "Development hub Layout 1 — cards, not a tab strip",
    body: `sourceIdeaId IN-20260921-01. Shipped on localhost 0.2.5. Live after make it live.

Layout 1 (only /d). Cards: Ideas/Feedback, Kanban, Train Changelog (sketched), SG Hub Changelog, Notes, Development Design Spec.
Old /d?tab= URLs redirect. Leaf template stays Layout 2 (kt-leaf-dev-tabs).
Train history: kt-train-changelog. Combine/relabel: kt-sg-hub-changelog. Column checkboxes: kt-kanban-column-filter.`,
    lane: "structure",
    column: "done",
    sourceIdeaId: "IN-20260921-01",
    createdAt: "2026-09-21T02:16:00.000Z",
    updatedAt: "2026-09-21T03:12:00.000Z",
  },
  {
    id: "kt-leaf-dev-tabs",
    nodeId: "global",
    title: "Leaf Development Layout 2 — tabs Inbox / Kanban / Changelog / Notes",
    body: `sourceIdeaId IN-20260921-01. Shipped on localhost with kt-kanban-column-filter.

Layout 2: Development is an L1 tab. L2 tabs: Inbox, Kanban, Changelog (this leaf only), Notes. No Train, no SG Hub Changelog, no Design spec.
Shared Kanban checkbox filter is kt-kanban-column-filter.`,
    lane: "structure",
    column: "done",
    sourceIdeaId: "IN-20260921-01",
    createdAt: "2026-09-21T02:16:00.000Z",
    updatedAt: "2026-09-21T04:08:00.000Z",
  },
  {
    id: "kt-kanban-column-filter",
    nodeId: "global",
    title: "Kanban column checkboxes (default Later+Open)",
    body: `sourceIdeaId IN-20260921-01. Shipped on localhost with kt-leaf-dev-tabs.

Filter row above the buckets: checkbox per column (Later, Open, Done, Archived) plus All (show-all / hide-all). Default Later and Open. Same on /d/kanban and leaf Kanban.`,
    lane: "experience",
    column: "done",
    sourceIdeaId: "IN-20260921-01",
    createdAt: "2026-09-21T02:16:00.000Z",
    updatedAt: "2026-09-21T04:08:00.000Z",
  },
  {
    id: "kt-sg-hub-changelog",
    nodeId: "global",
    title: "SG Hub Changelog — combine, relabel, update existing rows",
    body: `sourceIdeaId IN-20260921-01. Ask 2 content A. Shipped on localhost as 0.2.7.

- /d/changelog is one list from hub-development + i-kanban. Surface and clock are SG Hub X.Y.Z. Not Train, not Buylist, not MRT.
- Existing row titles/bodies read as suite history. Ids kept. Two-part versions pad to X.Y.Z.
- Not on the Kanban board. Not on product-leaf Layout 2.`,
    lane: "structure",
    column: "done",
    sourceIdeaId: "IN-20260921-01",
    createdAt: "2026-09-21T02:16:00.000Z",
    updatedAt: "2026-09-21T05:15:00.000Z",
  },
  {
    id: "kt-train-chrome",
    nodeId: "global",
    title: "Train version always in page chrome",
    body: `sourceIdeaId IN-20260921-01. Shipped on localhost as 0.2.8. Feedback 0.2.9: Hotfix chip only.

- AppShell always shows vX.Y. Version is the link to /d/train-changelog. Hotfix chip only when that zip is a hotfix — not on regular Trains.
- One module src/core/train/version.ts (last live tag hub-1.14). Not leaf X.Y.Z. Not SG Hub clock.
- MRT guests still see the clock; they do not get the Development link.
- History rows stay kt-train-changelog.`,
    lane: "experience",
    column: "done",
    sourceIdeaId: "IN-20260921-01",
    createdAt: "2026-09-21T05:20:00.000Z",
    updatedAt: "2026-09-21T05:40:00.000Z",
  },
  {
    id: "kt-train-changelog",
    nodeId: "global",
    title: "Train Changelog — home plus history from past make-it-live zips",
    body: `sourceIdeaId IN-20260921-01. Ask 2 content B. Shipped on localhost as 0.2.9.

- /d/train-changelog lists named hub-* zips. Clock is vX.Y. Hotfix chip only on hotfix zips (historic hub-1.8.1).
- Expand uses the tag subject: leaves we can name. Do not invent unnamed zips or extra leaves.
- Chrome clock is kt-train-chrome. Not SG Hub Changelog. Not a product-leaf changelog.`,
    lane: "structure",
    column: "done",
    sourceIdeaId: "IN-20260921-01",
    createdAt: "2026-09-21T02:16:00.000Z",
    updatedAt: "2026-09-21T05:40:00.000Z",
  },
  {
    id: "kt-feedback-open-register",
    nodeId: "global",
    title: "Feedback popup shortcut to open register",
    body: "sourceIdeaId IN-20260917-03. Workshop with Wave 2. Button/link in the Feedback popup to /d/inbox.",
    lane: "experience",
    column: "later",
    sourceIdeaId: "IN-20260917-03",
    createdAt: "2026-09-21T00:30:00.000Z",
    updatedAt: "2026-09-21T00:30:00.000Z",
  },
];

const WAVE0_IDEAS: KanbanInboxNote[] = [
  {
    id: "fb-atlas-ia-review",
    nodeId: "global",
    title: "Proposed wrapping map — IA review",
    body: "Do this before fb-atlas-skin-hub. Walk hub-atlas-standalone Internal/System; decide keep vs fold. Raised from docs/feedback-inbox.md onto Neon 2026-09-21.",
    status: "open",
    kind: "housekeeping",
    source: "feedback",
    pageHref: "/home",
    createdAt: "2026-09-08T10:41:00.000Z",
    updatedAt: "2026-09-21T00:30:00.000Z",
    copiedAt: null,
  },
  {
    id: "fb-atlas-skin-hub",
    nodeId: "global",
    title: "Proposed wrapping map — skin on hub",
    body: "Blocked on fb-atlas-ia-review. Sketched shells only after keep/fold. Raised from docs/feedback-inbox.md onto Neon 2026-09-21.",
    status: "open",
    kind: "housekeeping",
    source: "feedback",
    pageHref: "/home",
    createdAt: "2026-09-08T10:41:30.000Z",
    updatedAt: "2026-09-21T00:30:00.000Z",
    copiedAt: null,
  },
  {
    id: "fb-public-hub-share",
    nodeId: "global",
    title: "Public hub share (platform pattern)",
    body: "Later. Reusable open-this-page publicly (URL, optional password, read-only, no Entra). Not MRT-only. Raised from docs/feedback-inbox.md onto Neon 2026-09-21.",
    status: "open",
    kind: "housekeeping",
    source: "feedback",
    pageHref: "/w/sunwater-mrt",
    createdAt: "2026-08-19T04:52:00.000Z",
    updatedAt: "2026-09-21T00:30:00.000Z",
    copiedAt: null,
  },
  {
    id: "fb-hub-decisions-tickets",
    nodeId: "global",
    title: "Close persistence chat — Kanban tickets seeded",
    body: "Pointer. Outstanding work is the Global board. Do not rebuild the briefing. Raised from docs/feedback-inbox.md onto Neon 2026-09-21.",
    status: "open",
    kind: "housekeeping",
    source: "feedback",
    pageHref: "/d",
    createdAt: "2026-09-08T10:45:00.000Z",
    updatedAt: "2026-09-21T00:30:00.000Z",
    copiedAt: null,
  },
  {
    id: "IN-20260918-06",
    nodeId: "global",
    title: "Feedback Leaf Tag Selector - Cannot select 'hubs'",
    body: "Any node on the tree is selectable including the hubs.",
    status: "archived",
    kind: "bug",
    source: "feedback",
    createdAt: "2026-09-18T09:01:42.311Z",
    updatedAt: "2026-09-21T00:30:00.000Z",
    copiedAt: null,
  },
  {
    id: "IN-20260918-05",
    nodeId: "global",
    title: "Scrivengroup > Development > Changelog",
    body: "Hub-train vs leaf changelog homes. Split to kt-hub-version-homes. Workshop Wave 2.",
    status: "archived",
    kind: "bug",
    source: "feedback",
    createdAt: "2026-09-18T09:00:20.608Z",
    updatedAt: "2026-09-21T00:30:00.000Z",
    copiedAt: null,
  },
  {
    id: "IN-20260909-04",
    nodeId: "global",
    title: "Consistent Version numbering accross all of site",
    body: "Rides with kt-hub-version-homes / IN-20260918-05. Workshop Wave 2.",
    status: "archived",
    kind: "idea",
    source: "raise",
    createdAt: "2026-09-09T06:46:02.512Z",
    updatedAt: "2026-09-21T00:30:00.000Z",
    copiedAt: null,
  },
  {
    id: "IN-20260917-05",
    nodeId: "global",
    title: "Development: Kanban - Page Scroll",
    body: "Split to kt-dev-hub-site-network. Workshop Wave 2.",
    status: "archived",
    kind: "other",
    source: "feedback",
    createdAt: "2026-09-17T06:54:39.159Z",
    updatedAt: "2026-09-21T00:30:00.000Z",
    copiedAt: null,
  },
  {
    id: "IN-20260917-03",
    nodeId: "global",
    title: "Feedback popu - shortcut to open register.",
    body: "Split to kt-feedback-open-register. Workshop Wave 2.",
    status: "archived",
    kind: "idea",
    source: "feedback",
    createdAt: "2026-09-17T06:45:07.150Z",
    updatedAt: "2026-09-21T00:30:00.000Z",
    copiedAt: null,
  },
  {
    id: "IN-20260917-07",
    nodeId: "global",
    title: "Stale desk writes feedback to the deprecated `feedback` table (fb-* ids)",
    body: "Split to kt-stale-feedback-table.",
    status: "archived",
    kind: "housekeeping",
    source: "raise",
    createdAt: "2026-09-17T07:04:28.575Z",
    updatedAt: "2026-09-21T00:30:00.000Z",
    copiedAt: null,
  },
  {
    id: "IN-20260917-08",
    nodeId: "global",
    title: "Station publish workflow: wip desk → merge station → sweep → make it live",
    body: "Folded into docs/GIT_AND_RELEASE.md two-role desks. Not a fourth git ticket.",
    status: "archived",
    kind: "housekeeping",
    source: "raise",
    createdAt: "2026-09-17T07:19:22.175Z",
    updatedAt: "2026-09-21T00:30:00.000Z",
    copiedAt: null,
  },
  {
    id: "IN-20260918-04",
    nodeId: "global",
    title: "Wip desk merged to station without merge-to-station words",
    body: "Split to kt-yard-wip-not-station.",
    status: "archived",
    kind: "bug",
    source: "raise",
    createdAt: "2026-09-18T08:23:01.354Z",
    updatedAt: "2026-09-21T00:30:00.000Z",
    copiedAt: null,
  },
  {
    id: "IN-20260917-06",
    nodeId: "global",
    title: "WIP desk must not pull station (dev_main) unless asked",
    body: "Split to kt-yard-no-pull-station-mu56iw2h.",
    status: "archived",
    kind: "housekeeping",
    source: "raise",
    createdAt: "2026-09-17T06:59:30.137Z",
    updatedAt: "2026-09-21T00:30:00.000Z",
    copiedAt: null,
  },
  {
    id: "IN-20260921-01",
    nodeId: "global",
    title: "Wave 2 — master versioning + Development two layouts",
    body: "Workshop 2026-09-21. Split to kt-dev-hub-cards, kt-leaf-dev-tabs, kt-kanban-column-filter, kt-sg-hub-changelog (combine/relabel/update), kt-train-chrome (AppShell vX.Y), kt-train-changelog (home + past zip history), kt-hub-version-homes. Clean house before Train content.",
    status: "archived",
    kind: "housekeeping",
    source: "raise",
    createdAt: "2026-09-21T02:16:00.000Z",
    updatedAt: "2026-09-21T02:16:00.000Z",
    copiedAt: null,
  },
];

const BOARD_SEEDS: Record<string, { ideas: KanbanInboxNote[]; tickets: KanbanTicket[] }> = {
  "p-mtg-buylist": { ideas: MTG_BUYLIST_IDEAS, tickets: MTG_BUYLIST_TICKETS },
  global: {
    ideas: [...GLOBAL_IDEAS, ...WAVE0_IDEAS],
    tickets: [...GLOBAL_DONE_TICKETS, ...HUB_DECISIONS_TICKETS.filter((t) => t.nodeId === "global")],
  },
  "w-sunwater-mrt": {
    // Empty on purpose — seed is not the live board. Inbox sittings query Neon first.
    ideas: [],
    tickets: HUB_DECISIONS_TICKETS.filter((t) => t.nodeId === "w-sunwater-mrt"),
  },
};

const HYGIENE_IDEA_IDS = new Set([
  "IN-20260907-02",
  "IN-20260907-03",
  "IN-20260907-05",
  "IN-20260908-01",
  "IN-20260908-02",
  "IN-20260908-05",
  "IN-20260904-02",
  "IN-20260904-03",
  "raw-mtmjtpzg-pe3pkf",
  "raw-mtmjsema-xrf956",
  "raw-mtmjqb8t-jglsww",
  "raw-mtmjpad9-7x5fou",
  "IN-20260905-10",
  "IN-20260905-11",
  "IN-20260905-12",
  "IN-20260906-01",
  "IN-20260910-01",
  "IN-20260914-01",
  "IN-20260915-01",
  "IN-20260916-02",
  "IN-20260918-02",
  "IN-20260918-03",
  "IN-20260916-01",
  "IN-20260918-06",
  "IN-20260918-05",
  "IN-20260909-04",
  "IN-20260917-05",
  "IN-20260917-03",
  "IN-20260917-07",
  "IN-20260917-08",
  "IN-20260918-04",
  "IN-20260917-06",
  "IN-20260921-01",
]);

const HYGIENE_TICKET_IDS = new Set([
  "kt-db-phase0-neon",
  "kt-commit-decisions-pack",
  "kt-leaf-dev-notes",
  "kt-kanban-dev-template",
  "kt-kanban-chrome-tokens",
  "kt-kanban-design-spec",
  "kt-kanban-rollout-buylist",
  "kt-kanban-rollout-mrt",
  "kt-inbox-unify-schema",
  "kt-inbox-feedback-chrome",
  "kt-inbox-register-views",
  "kt-inbox-sitting-docs",
  "kt-buylist-leaf-tabs",
  "kt-eye-out-finish",
  "kt-changelog-expand",
  "kt-buylist-1.5-wrap",
  "kt-publish-gha",
  "kt-yard-wip-not-station",
  "kt-yard-no-pull-station-mu56iw2h",
  "kt-feedback-hub-tags",
  "kt-stale-feedback-table",
  "kt-hub-version-homes",
  "kt-dev-hub-site-network",
  "kt-dev-hub-cards",
  "kt-leaf-dev-tabs",
  "kt-kanban-column-filter",
  "kt-sg-hub-changelog",
  "kt-train-chrome",
  "kt-train-changelog",
  "kt-feedback-open-register",
]);

function allSeedIdeas(): KanbanInboxNote[] {
  return Object.values(BOARD_SEEDS).flatMap((seed) => seed.ideas);
}

function allSeedTickets(): KanbanTicket[] {
  return Object.values(BOARD_SEEDS).flatMap((seed) => seed.tickets);
}

/** Archive / Done patches for ids that already exist on Neon (seed merge does not overwrite). */
export function applyKanbanHygiene(bundle: {
  ideas: KanbanInboxNote[];
  tickets: KanbanTicket[];
}): boolean {
  const ideaSeed = new Map(allSeedIdeas().map((row) => [row.id, row]));
  const ticketSeed = new Map(allSeedTickets().map((row) => [row.id, row]));
  let changed = false;
  for (const idea of bundle.ideas) {
    if (!HYGIENE_IDEA_IDS.has(idea.id)) continue;
    const seed = ideaSeed.get(idea.id);
    if (!seed) continue;
    if (idea.status !== seed.status) {
      idea.status = seed.status;
      idea.updatedAt = seed.updatedAt;
      changed = true;
    }
  }
  for (const ticket of bundle.tickets) {
    if (!HYGIENE_TICKET_IDS.has(ticket.id)) continue;
    const seed = ticketSeed.get(ticket.id);
    if (!seed) continue;
    if (
      ticket.column !== seed.column ||
      ticket.title !== seed.title ||
      ticket.body !== seed.body
    ) {
      ticket.column = seed.column;
      ticket.title = seed.title;
      ticket.body = seed.body;
      ticket.updatedAt = seed.updatedAt;
      changed = true;
    }
  }
  return changed;
}

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
