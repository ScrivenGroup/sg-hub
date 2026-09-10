import type {
  ChangelogEntry,
  DependencyRecord,
  DevChoiceRecord,
  IdeaRecord,
  NoteRecord,
  RegistryNode,
} from "@/core/contracts/types";

export const HUB_LABELS: Record<string, string> = {
  w: "Work",
  p: "Projects",
  i: "Internal",
  s: "System",
};

export const seedNodes: RegistryNode[] = [
  {
    id: "hub-work",
    hubPrefix: "w",
    slug: "",
    title: "Work",
    code: "3FAE6A",
    kind: "hub",
    parentId: null,
    href: "/w",
    accessMode: "shared",
    status: "live",
    hasNetworkMap: true,
    description: "Client-context products (org only).",
    order: 1,
  },
  {
    id: "hub-projects",
    hubPrefix: "p",
    slug: "",
    title: "Projects",
    code: "F2D04E",
    kind: "hub",
    parentId: null,
    href: "/p",
    accessMode: "shared",
    status: "live",
    hasNetworkMap: true,
    description: "Personal products — spin-out capable.",
    order: 2,
  },
  {
    id: "hub-internal",
    hubPrefix: "i",
    slug: "",
    title: "Internal",
    code: "4A8FDC",
    kind: "hub",
    parentId: null,
    href: "/i",
    accessMode: "shared",
    status: "live",
    hasNetworkMap: true,
    description: "ScrivenGroup capture and tools.",
    order: 3,
  },
  {
    id: "hub-system",
    hubPrefix: "s",
    slug: "",
    title: "System",
    code: "8B6BC4",
    kind: "hub",
    parentId: null,
    href: "/s",
    accessMode: "shared",
    status: "live",
    hasNetworkMap: true,
    description: "Definition and Appearance of this site.",
    order: 4,
  },
  {
    id: "w-sunwater-mrt",
    hubPrefix: "w",
    slug: "sunwater-mrt",
    title: "Sunwater - Milestone Resourcing Tracker",
    code: "4E8C6B",
    kind: "subhub",
    parentId: "hub-work",
    href: "/w/sunwater-mrt",
    accessMode: "shared",
    status: "live",
    hasNetworkMap: false,
    description:
      "Sunwater client — dam-safety obligation cycles with frequency-based predicted milestones.",
    order: 1,
  },
  {
    id: "p-fueltracker",
    hubPrefix: "p",
    slug: "fueltracker",
    title: "Fuel Tracker",
    code: "E0A83A",
    kind: "subhub",
    parentId: "hub-projects",
    href: "/p/fueltracker",
    accessMode: "per_user",
    status: "sketched",
    hasNetworkMap: false,
    description:
      "Vehicle cost and lifecycle tracker (featureless shell — build on desktop).",
    order: 1,
  },
  {
    id: "p-funds-forecaster",
    hubPrefix: "p",
    slug: "funds-forecaster",
    title: "Funds Forecaster",
    code: "1F6B4A",
    kind: "subhub",
    parentId: "hub-projects",
    href: "/p/funds-forecaster",
    accessMode: "per_user",
    status: "building",
    hasNetworkMap: false,
    description:
      "Personal funds forecast (savings, safety floor, horizon, income vs spend). Skeleton + Development reference; not revA.",
    order: 2,
  },
  {
    id: "p-mtg-buylist",
    hubPrefix: "p",
    slug: "mtg-buylist",
    title: "MTG Buylist",
    code: "B85C38",
    kind: "tool",
    parentId: "hub-projects",
    href: "/p/mtg-buylist",
    accessMode: "per_user",
    status: "live",
    hasNetworkMap: false,
    description:
      "Harvest Playmantis and MTGMate buylists, then allocate a ManaBox CSV for max store credit.",
    order: 3,
  },
  {
    id: "i-kanban",
    hubPrefix: "i",
    slug: "kanban",
    title: "Kanban Online",
    code: "6BA4E3",
    kind: "tool",
    parentId: "hub-internal",
    href: "/i/kanban",
    accessMode: "shared",
    status: "live",
    hasNetworkMap: false,
    description:
      "Global Inbox + KanBan. Same columns as a leaf. Filter by leaf tag. Raise defaults to Global.",
    order: 0,
  },
  {
    id: "i-ideas",
    hubPrefix: "i",
    slug: "ideas",
    title: "Ideas",
    code: "7EB6E8",
    kind: "tool",
    parentId: "hub-internal",
    href: "/i/ideas",
    accessMode: "shared",
    status: "live",
    hasNetworkMap: false,
    description: "Domain-wide idea register.",
    order: 1,
  },
  {
    id: "i-notes",
    hubPrefix: "i",
    slug: "notes",
    title: "Notes",
    code: "5BB8C9",
    kind: "tool",
    parentId: "hub-internal",
    href: "/i/notes",
    accessMode: "per_user",
    status: "live",
    hasNetworkMap: false,
    description: "Less formal capture.",
    order: 2,
  },
  {
    id: "i-feedback",
    hubPrefix: "i",
    slug: "feedback",
    title: "Feedback",
    code: "6B7FD4",
    kind: "tool",
    parentId: "hub-internal",
    href: "/i/feedback",
    accessMode: "shared",
    status: "live",
    hasNetworkMap: false,
    description: "Site-wide feedback register for bugs, ideas, and housekeeping.",
    order: 3,
  },
  {
    id: "i-testing",
    hubPrefix: "i",
    slug: "testing",
    title: "Testing",
    code: "A8C8F0",
    kind: "tool",
    parentId: "hub-internal",
    href: "/i/testing",
    accessMode: "shared",
    status: "sketched",
    hasNetworkMap: false,
    description: "Small web test pages.",
    order: 4,
  },
  {
    id: "i-dev-choices",
    hubPrefix: "i",
    slug: "dev-choices",
    title: "Development choices",
    code: "5A72B8",
    kind: "tool",
    parentId: "hub-internal",
    href: "/i/dev-choices",
    accessMode: "shared",
    status: "building",
    hasNetworkMap: false,
    description: "Locked development standards for humans and Cursor chats.",
    order: 5,
  },
  {
    id: "s-definition",
    hubPrefix: "s",
    slug: "definition",
    title: "Definition",
    code: "B49AE0",
    kind: "tool",
    parentId: "hub-system",
    href: "/s/definition",
    accessMode: "shared",
    status: "live",
    hasNetworkMap: false,
    description: "Site map, changelog, external dependencies.",
    order: 1,
  },
  {
    id: "s-appearance",
    hubPrefix: "s",
    slug: "appearance",
    title: "Appearance",
    code: "C989D4",
    kind: "tool",
    parentId: "hub-system",
    href: "/s/appearance",
    accessMode: "shared",
    status: "live",
    hasNetworkMap: false,
    description: "Theme tokens, templates, icons.",
    order: 2,
  },
];

export const seedChangelogs: ChangelogEntry[] = [
  {
    id: "cl-mtg-buylist-1.0",
    nodeId: "p-mtg-buylist",
    kind: "release",
    version: "1.0",
    createdAt: "2026-09-03T12:15:00.000Z",
    title: "Rev 1.0 — Run, join, Compare",
    body: `## Shipped

- ManaBox CSV → Playmantis + MTGMate streams → Compare (credit winners, Sell qty, Gain %).
- Mate ambiguous printings: Confirm, Scryfall treatments, exact image-hash join, Wrong printing reopen.
- Recovered % bands, listed-price basis, collapsible steps, drop-zone uploads, loading banner.
- Development: release table + WIP plan; Notes stay on per-user JSON until Neon.
- KanBan tab: shell only (Backlog / Doing / Done placeholders).

## Parked after 1.0

- Combined % cutoff + CK USD FX shop-floor filter.
- Neon notes / shared ideas.
- Full KanBan board store.
- Mobile-friendly Mate harvest.
`,
  },
  {
    id: "cl-mtg-buylist-1.1",
    nodeId: "p-mtg-buylist",
    kind: "release",
    version: "1.1",
    createdAt: "2026-09-04T05:35:00.000Z",
    title: "Rev 1.1 — Harvest feedback, Playmantis matching",
    body: `## Shipped

- Playmantis harvest: overlay with live counts, batches of 8, no infinite retry of not-found. Re-click still retries empties and title mismatches.
- CSV filename is a download link. Clear this run is a red-bordered button. Section headers stick under chrome.
- RAG above tables is coloured chips with tooltips. Mate cash in summaries is informational, not a peer headline.
- Playmantis harvest uses the same Scryfall-ID tag search as their CSV import (tag:buylist tag:{id}). Name search is only a fallback that still requires data-scryfall-id. Remaining want follows their import (4 minus listed stock). Each harvest re-fetches matched cards so want 0 stays current when their stock fills.
- Compare: winner cell stays green; the other store is grey when it wants 0, unchanged when it still wants some.

## Parked after 1.0

- Combined % cutoff + CK USD FX shop-floor filter.
- Neon notes / shared ideas.
- Mobile-friendly Mate harvest.
`,
  },
  {
    id: "cl-mtg-buylist-1.2",
    nodeId: "p-mtg-buylist",
    kind: "release",
    version: "1.2",
    createdAt: "2026-09-04T09:10:00.000Z",
    title: "Rev 1.2 — Inbox, KanBan, Raise an idea",
    body: `## Shipped

- Development tabs: Changelog | Notes | KanBan | Inbox. Inbox is raw notes (ids visible), not tickets. KanBan is Later / Open / Done / Archived with category badges and optional swimlanes.
- Raise an idea lives next to Run and Development on every Buylist page, and again on Inbox.
- Development uses the full viewport. Host strip is ON LIVE vs VIA LOCALHOST. Localhost can meter change-since-live against a captured baseline.
- This zip seeds the current Inbox notes and Later tickets onto live on first load (by id). Zip still does not copy \`data/\`.

## Versioning from 1.2

- Each **live** update: 1.x → 1.(x+1).
- Changes while developing toward the next live: 1.x.y (starts after this ship).
- 2.0 / 3.0 only when asked.

## Parked

- Combined % cutoff + CK USD FX shop-floor filter.
- Neon notes / shared board.
- Expandable changelog rows and a standing 1.(x+1)(wip) table row.
- Grey behind want qty = 0.
- Testing sub-tab for parser fixtures.
- “Get the $20 back” bulk-to-credit scenario.
- Mobile Mate harvest (tickets already on Later).
`,
  },
  {
    id: "cl-mtg-buylist-1.3",
    nodeId: "p-mtg-buylist",
    kind: "release",
    version: "1.3",
    createdAt: "2026-09-05T01:50:00.000Z",
    title: "Rev 1.3 — Playmantis name fallback",
    body: `## Shipped

- Playmantis harvest still starts with Scryfall-ID tag search (same as their CSV import).
- If that page is empty, name search binds the **same title**. Prefers your set, then a plain title (not a borderless/showcase treatment, not a different card).
- Fixes the live 2025-26 rares miss: search HTML has no \`data-scryfall-id\`, so name fallback never bound cards that are findable on playmantis.com.au.
- Zip still does not copy \`data/\`. Re-click Harvest Playmantis after this ship to refill missing rows.

## Known (hold)

- Re-running the large 2025-26 rares CSV still misses many Playmantis cards after 1.3. Do not chase matching in this slice.

## Parked

- Combined % cutoff + CK USD FX shop-floor filter.
- Neon notes / shared board.
- Expandable changelog rows and a standing 1.(x+1)(wip) table row.
- Grey behind want qty = 0.
- Testing sub-tab for parser fixtures.
- “Get the $20 back” bulk-to-credit scenario.
- Mobile Mate harvest (tickets already on Later).
`,
  },
  {
    id: "cl-mtg-buylist-1.3.1",
    nodeId: "p-mtg-buylist",
    kind: "release",
    version: "1.3.1",
    createdAt: "2026-09-05T04:00:00.000Z",
    title: "1.3.1 (dev) — ManaBox packing CSVs",
    body: `## Publish to localhost (not live)

- Compare summary: three ManaBox-shaped CSVs from the starting file.
- Playmantis / MTGMate files use this table’s Sell qty.
- Not sold = Have minus both Sells — re-import leftover into ManaBox.
- Existing Compare CSV picklist is unchanged.

Playmantis matching on the large rares CSV remains HOLD.
`,
  },
  {
    id: "cl-mtg-buylist-1.3.2",
    nodeId: "p-mtg-buylist",
    kind: "release",
    version: "1.3.2",
    createdAt: "2026-09-05T04:05:00.000Z",
    title: "1.3.2 (dev) — White button hover",
    body: `## Publish to localhost (not live)

- White \`sg-btn-secondary\` buttons now change on hover (muted fill + charcoal border). Primary/ghost already had hover.
- From 1.3.1, each publish-to-dev is its own 1.x.y changelog row (level 3). Live remains 1.x.
`,
  },
  {
    id: "cl-mtg-buylist-1.3.3",
    nodeId: "p-mtg-buylist",
    kind: "release",
    version: "1.3.3",
    createdAt: "2026-09-05T06:15:00.000Z",
    title: "1.3.3 (dev) — Compact tabs and chrome",
    body: `## Publish to localhost (not live)

- Live/localhost warning is a right-aligned chip on the Run / Development row (detail on hover).
- Page chrome matches Internal Kanban: smaller title, intent/path behind (i).
- Lvl1 (Run / Development) and lvl2 (Changelog / Notes / KanBan / Inbox) are underline tabs, not pill buttons.
- Button height token \`--sg-btn-height\` (32px) matches the Kanban LAYOUT toggle — prepared for hub-wide use.

Inbox + KanBan board layout still to be rewritten to the global template.
`,
  },
  {
    id: "cl-mtg-buylist-1.3.4",
    nodeId: "p-mtg-buylist",
    kind: "release",
    version: "1.3.4",
    createdAt: "2026-09-05T06:30:00.000Z",
    title: "1.3.4 (dev) — Tabs, Testing, Inbox plans",
    body: `## Publish to localhost (not live)

- Raise an idea is far-right; host is a badge to its left (not a button).
- Parser fixture check lives under Development → Testing.
- KanBan column filters (Inbox, All Kanban, Later + Open, …) are Development lvl2 tabs.
- WIP / plan changelog section removed. Plans and ideas go to Inbox only.
- Run has a This run tab (parallel runs are a future idea).
- Compare: each filter tab exports CSV + ManaBox template of that filter (including Not sold).
`,
  },
  {
    id: "cl-mtg-buylist-1.4",
    nodeId: "p-mtg-buylist",
    kind: "release",
    version: "1.4",
    createdAt: "2026-09-05T07:54:00.000Z",
    title: "1.4 — Compact chrome, Compare exports, Inbox plans",
    body: `## Live

Ships the 1.3.1–1.3.4 localhost slices.

- Compact leaf chrome: smaller title, intent behind (i), host is a badge, Raise an idea far-right.
- Run / Development and Development sub-pages are underline tabs. KanBan column filters sit on Development lvl2. Parser check is Testing.
- WIP / plan changelog section removed — plans and ideas go to Inbox.
- Run shows This run (parallel runs are a future idea).
- Compare: filter tabs each export CSV + a ManaBox template of that filter (All, Sellable, Want full, Not found, Mate, Playmantis, Not sold).
- White secondary buttons hover. Control height token \`--sg-btn-height\` (32px).

## Known (hold)

- Large 2025-26 rares Playmantis harvest still misses many cards. Do not chase matching. Future: Scryfall-ID-only harvest (Inbox).

Zip does not copy \`data/\`. Azure store stays on the App Service.
`,
  },
  {
    id: "cl-mtg-buylist-1.4.1",
    nodeId: "p-mtg-buylist",
    kind: "release",
    version: "1.4.1",
    createdAt: "2026-09-05T08:40:00.000Z",
    title: "1.4.1 — Playmantis harvest matches their CSV import",
    body: `## Shipped

- Playmantis harvest copies their ManaBox importer: \`tag:buylist tag:{scryfallId}\` first, then name search only when the product’s Scryfall ID matches (search HTML has no \`data-scryfall-id\`, so we use the image-file UUID they stamp on the same products).
- No more title/set rebound onto a different printing.
- Finish match copies theirs, including a single-variant product (foil-only) against a CSV normal row.
- HTTP errors no longer skip the name pass. Empty UUID pages are not retried three times.

## Known (hold)

- Printings they do not tag (and whose image UUID is not on a name-search hit) stay not found — same as their bulk tool.
`,
  },
  {
    id: "cl-mtg-buylist-1.4.2",
    nodeId: "p-mtg-buylist",
    kind: "release",
    version: "1.4.2",
    createdAt: "2026-09-05T08:55:00.000Z",
    title: "1.4.2 — Playmantis name fallback matches on-site search",
    body: `## Shipped

- After Scryfall-ID tag miss, harvest uses the same title search as their buylist search box (\`tag:buylist AND (title:*word*)\`) and binds the matching card name (prefers your set, then a plain title).
- That is how Duel Decks reprints (DDH/DDK) show up on their site even though those printings are not UUID-tagged.
`,
  },
  {
    id: "cl-mtg-buylist-1.4.3",
    nodeId: "p-mtg-buylist",
    kind: "release",
    version: "1.4.3",
    createdAt: "2026-09-05T09:10:00.000Z",
    title: "1.4.3 — Playmantis harvest retries empty Shopify pages",
    body: `## Shipped

- Harvest retries when Shopify returns no buylist grid (rate-limit / challenge) and retries a genuine empty grid once.
- Pause after every batch of 8, including between server-action round trips, so a 182-ID CSV is not hammered back-to-back.
`,
  },
  {
    id: "cl-mtg-buylist-1.4.4",
    nodeId: "p-mtg-buylist",
    kind: "release",
    version: "1.4.4",
    createdAt: "2026-09-05T09:30:00.000Z",
    title: "1.4.4 — Retry Playmantis not-found after throttle",
    body: `## Shipped

- Harvest keeps cards already found when a later Shopify page comes back empty.
- After the main pass, a slower second pass retries only the not-found Scryfall IDs (batches of 4). **Retry not found** does the same without re-fetching hits.
- Blocked/challenge HTML skips the name-search hammer that made throttling worse.
`,
  },
  {
    id: "cl-mtg-buylist-1.4.5",
    nodeId: "p-mtg-buylist",
    kind: "release",
    version: "1.4.5",
    createdAt: "2026-09-06T10:05:00.000Z",
    title: "1.4.5 — Mate harvest JSON uploads larger than 10 MB",
    body: `## Shipped

- Upload cap is 32 MB (a full Mate harvest is ~18 MB). Next.js middleware was dropping anything over 10 MB with no useful error.
- Keep only cards in the ManaBox CSV’s sets so the run store is not 40k+ offers.
- Clearer upload progress and errors when the body is rejected.
`,
  },
  {
    id: "cl-mtg-buylist-1.4.6",
    nodeId: "p-mtg-buylist",
    kind: "release",
    version: "1.4.6",
    createdAt: "2026-09-06T10:35:00.000Z",
    title: "1.4.6 — Compare stores with one harvest",
    body: `## Shipped

- Step 4 Compare stays available from the first harvested store (filters and ManaBox/CSV exports). Second store still fills the other column.
`,
  },
  {
    id: "cl-mtg-buylist-1.5",
    nodeId: "p-mtg-buylist",
    kind: "release",
    version: "1.5",
    createdAt: "2026-09-06T10:35:00.000Z",
    title: "1.5 — Playmantis harvest, large Mate JSON, Compare with one store",
    body: `## Live

Ships the 1.4.1–1.4.6 localhost slices.

- Playmantis harvest copies their ManaBox importer (Scryfall-ID tag, then on-site title search). Retries empty Shopify pages; keeps found cards; slower **Retry not found** pass.
- Mate harvest JSON up to 32 MB (full dump ~18 MB). Keep cards in the CSV’s sets. Upload errors are visible.
- Step 4 Compare is available from the first harvested store (filters + CSV / ManaBox exports).

Zip does not copy \`data/\`. Azure store stays on the App Service.
`,
  },
  {
    id: "cl-mtg-buylist-1.5.1",
    nodeId: "p-mtg-buylist",
    kind: "release",
    version: "1.5.1",
    createdAt: "2026-09-07T11:00:00.000Z",
    title: "1.5.1 (dev) — Run uses the page width",
    body: `## Publish to localhost (not live)

- Run fills the window (not the 64rem hub column). Development stays the locked full-viewport board.
- Playmantis, Mate, and Compare tables stretch to that width. Long card names wrap; the page does not scroll sideways.

Live remains 1.5 until you say make it live.
`,
  },
  {
    id: "cl-mtg-buylist-1.5.2",
    nodeId: "p-mtg-buylist",
    kind: "plan",
    version: "1.5.2",
    createdAt: "2026-09-08T12:00:00.000Z",
    title: "1.5.2 — Development uses the Kanban template (localhost)",
    body: `## Localhost

- Development is the shared Kanban Online host: Inbox, board, Changelog, Notes, Raise tagged to Buylist.
- Parser fixture check stays under Testing.
- Per-login notes still save on the buylist store. Not live until make it live.
`,
  },
  {
    id: "cl-mtg-buylist-1.5.3",
    nodeId: "p-mtg-buylist",
    kind: "release",
    version: "1.5.3",
    createdAt: "2026-09-09T01:10:00.000Z",
    title: "1.5.3 (dev) — Re-prepare ManaBox after pick",
    body: `## Publish to localhost (not live)

- Run step 5: upload Playmantis and/or Mate submission CSVs (ManaBox-shaped) after the shop floor.
- Download a leftover ManaBox CSV = this run’s original file minus those copies. Overwrite ManaBox with that, not Compare Not-sold.
- Unmatched submission lines are listed. Live remains 1.5 until you say make it live.
`,
  },
  {
    id: "cl-mtg-buylist-1.5.4",
    nodeId: "p-mtg-buylist",
    kind: "release",
    version: "1.5.4",
    createdAt: "2026-09-09T23:50:00.000Z",
    title: "1.5.4 (dev) — Sticky sections, Mate row and harvest polish",
    body: `## Publish to localhost (not live)

- Section headings stay under the hub header so you can collapse a long table.
- Mate **Wrong printing** is a compact ↻ icon; row height stays the default.
- Recovered-% chips ( >100% / ≥80% / … ) filter Playmantis, Mate, and Compare. Click again to clear.
- Mate bookmark harvest filename ends with local date_time.

Live remains 1.5 until you say make it live.
`,
  },
  {
    id: "cl-mtg-buylist-1.5.5",
    nodeId: "p-mtg-buylist",
    kind: "release",
    version: "1.5.5",
    createdAt: "2026-09-09T23:58:00.000Z",
    title: "1.5.5 (dev) — Real store submissions for leftover ManaBox",
    body: `## Publish to localhost (not live)

- Step 5 Playmantis drop is the sort-order **.eml** (the only reliable receipt).
- Step 5 Mate drop is a **saved order HTML** from mtgmate.com.au/buylist/orders/… (Accepted rows only; one row = one copy).
- ManaBox-shaped CSVs still work. Leftover match uses Scryfall id, then name/set/finish, then a unique name+finish.

Live remains 1.5 until you say make it live.
`,
  },
  {
    id: "cl-mtg-buylist-1.5.6",
    nodeId: "p-mtg-buylist",
    kind: "release",
    version: "1.5.6",
    createdAt: "2026-09-10T00:50:00.000Z",
    title: "1.5.6 (dev) — Step 5 outer join and leftover re-import",
    body: `## Publish to localhost (not live)

- Step 5 tabulates ManaBox CSV, Playmantis, and Mate (Name, Set, Finish, Qty) with Scryfall hover previews.
- Outer join lists every unique printing: CSV Qty, MM Qty, PM Qty, Remaining (CSV − MM − PM), Note.
- Remaining &gt; 0 is the ManaBox re-import download. Store-only and Remaining ≤ 0 stay on the join.
- Playmantis set names resolve to set codes from this CSV, then a unique Scryfall set-name lookup.

Live remains 1.5 until you say make it live.
`,
  },
  {
    id: "cl-mtg-buylist-1.5.7",
    nodeId: "p-mtg-buylist",
    kind: "release",
    version: "1.5.7",
    createdAt: "2026-09-10T00:55:00.000Z",
    title: "1.5.7 (dev) — Step 5 tables collapse",
    body: `## Publish to localhost (not live)

- Step 5 CSV, Playmantis, Mate, outer join, and re-import tables each fold independently. Open/closed is remembered in this tab.

Live remains 1.5 until you say make it live.
`,
  },
  {
    id: "cl-mtg-buylist-1.5.8",
    nodeId: "p-mtg-buylist",
    kind: "release",
    version: "1.5.8",
    createdAt: "2026-09-10T01:05:00.000Z",
    title: "1.5.8 (dev) — Step 5 Scryfall previews for every row",
    body: `## Publish to localhost (not live)

- Step 5 rows without a ManaBox Scryfall ID look up the card by name + set (collector # when Mate has it) so the hover preview can show.

Live remains 1.5 until you say make it live.
`,
  },
  {
    id: "cl-mtg-buylist-1.5.9",
    nodeId: "p-mtg-buylist",
    kind: "release",
    version: "1.5.9",
    createdAt: "2026-09-10T01:12:00.000Z",
    title: "1.5.9 (dev) — Step 5 collector numbers and lookup warning",
    body: `## Publish to localhost (not live)

- Step 5 tables (CSV, Playmantis, Mate, join, re-import) show collector # after Set.
- A **!** mark means the hover face is a Scryfall name+set lookup, not a ManaBox Scryfall ID, so it may be the wrong printing.

Live remains 1.5 until you say make it live.
`,
  },
  {
    id: "cl-mtg-buylist-1.5.10",
    nodeId: "p-mtg-buylist",
    kind: "release",
    version: "1.5.10",
    createdAt: "2026-09-10T01:22:00.000Z",
    title: "1.5.10 (dev) — Step 5 join notes and compact columns",
    body: `## Publish to localhost (not live)

- Outer join notes stay on one line so row height stays even.
- Set, #, Finish, and qty column headers are centred; values keep a left offset; a light vertical rule separates those columns.

Live remains 1.5 until you say make it live.
`,
  },
  {
    id: "cl-mtg-buylist-1.5.11",
    nodeId: "p-mtg-buylist",
    kind: "release",
    version: "1.5.11",
    createdAt: "2026-09-10T01:28:00.000Z",
    title: "1.5.11 (dev) — compact columns on every Run table",
    body: `## Publish to localhost (not live)

- Playmantis, Mate, Compare, and Step 5 tables use the same Set / # / Finish / qty spacing: centred headers, left-offset values, light vertical rules.

Live remains 1.5 until you say make it live.
`,
  },
  {
    id: "cl-mtg-buylist-1.5.12",
    nodeId: "p-mtg-buylist",
    kind: "release",
    version: "1.5.12",
    createdAt: "2026-09-10T01:34:00.000Z",
    title: "1.5.12 (dev) — one-line card names, tighter columns",
    body: `## Publish to localhost (not live)

- Card names stay on one line. Compact columns use 13px type, shorter headers (Fin, Want, Left, CSV/MM/PM, List, Cr, Win), and tighter padding so Set / # / qty columns still fit.

Live remains 1.5 until you say make it live.
`,
  },
  {
    id: "cl-ff-1",
    nodeId: "p-funds-forecaster",
    kind: "plan",
    createdAt: "2026-09-01T00:00:00.000Z",
    title: "Offline HTML is reference, not revA",
    body: `## Funds Forecaster — development plan

**Badge:** #1F6B4A only (global SG theme; no ThemeContract).
**Access:** per_user — personal money.

The sibling offline \`index.html\` is a **Development reference**, not revA product UI. Do not restyle that layout onto Inputs, Forecast, or Upcoming.

### Skeleton routes (intent only)
- Hub — savings, safety floor, horizon, income vs hard/soft/category spend
- Inputs — those fields and groups
- Forecast — monthly income/expense, rate gap, trough, extra weekly need, projected-balance chart
- Upcoming — payments table + occurrence filter
- Development — parked copy of the offline HTML (museum)

### Out of this pass
- No statement CSVs or snapshots in this repo
- No seeded Table 1 numbers in SG JSON
- No monthly-drop ritual
- Sibling \`funds-forecaster\` folder stays until a later promote/archive ticket
`,
  },
  {
    id: "cl-fuel-1",
    nodeId: "p-fueltracker",
    kind: "plan",
    createdAt: "2026-08-01T00:00:00.000Z",
    title: "Development plan (mobile framing)",
    body: `## Fuel Tracker — development plan

**Theme notes (desktop):** dark theme by default, car-thematic. Opt-in ThemeContract; until then global SG theme. Badge colour #E0A83A only.

**Goal:** Lifecycle + cost tracker for vehicles you own. View costs over time by category per vehicle.

### Fuel fill-ups
- cost, litres, $/L, location/servo, car, full tank vs partial

### Other vehicle costs
- Registration, Replacement Parts, Services, Fines, etc.

### Asset lifecycle
- Purchase: when, where, amount
- Disposition: sold (amount) / written off / other

### Access
- per_user — each user sees only their own data

### Status
- sketched / featureless shell — build on desktop
`,
  },
  {
    id: "cl-sunwater-mrt-1",
    nodeId: "w-sunwater-mrt",
    kind: "plan",
    createdAt: "2026-08-01T00:00:00.000Z",
    title: "Product plan (locked)",
    body: `## Sunwater — Milestone Resourcing Tracker

**Client context:** Sunwater (Work hub — org only, no client logins).
**Badge:** #4E8C6B only (global SG theme until any ThemeContract).

**Model:** Dam-safety **regulator cycles**, not named engagement milestones. Occurrence identity is a procedural due date (dam × requirement type × cycle), not a free-named project milestone.

**Users:** Scriven Group staff via Entra. Shared Work hub.

**v1 job:** See upcoming obligations on the cyclical Gantt, mark a plan (due / lead-in + who / hours) via the occurrence popup. Defaults templates seed an occurrence once; later Defaults edits do not overwrite a saved occurrence.

**Catalog:** Seed the offline 24 dams × 11 regulator lanes; staff can add/rename. Staff tick which obligations apply and set lead times (general + per-dam).

**People:** Roles, named people, weekly available hours, overrun threshold (default 125%). Assignment heatmap: blank under capacity, yellow above 100%, red above overrun. No portfolio leveling algorithm.

**Surfaces:** Gantt | Obligations (apply / types / dams / lead times / ownership) | People | Defaults. Occurrence is a modal. Followups, Assumptions, and non-resource/intangibles costing are out of v1.

### Status
- live
`,
  },
  {
    id: "cl-sunwater-mrt-0.4",
    nodeId: "w-sunwater-mrt",
    kind: "release",
    version: "0.4",
    createdAt: "2026-08-18T00:00:00.000Z",
    title: "Effort Gantt demo on Development",
    body: `- Shipped the Task/Role Effort Gantt as a Development sandbox (not wired to occurrences).
- Pan, trim, stick/unstick, tail handles, and hour bars on \`effortDemo\`.
- Defaults and occurrence popup still used the older assignment table.`,
  },
  {
    id: "cl-sunwater-mrt-0.5",
    nodeId: "w-sunwater-mrt",
    kind: "release",
    version: "0.5",
    createdAt: "2026-08-19T00:00:00.000Z",
    title: "Defaults template and occurrence Effort Gantt",
    body: `- Seeded Prepare / Inspect / Report obligation defaults (roles × hours).
- Wired Effort Gantt into Defaults and the occurrence popup using live assignment plans.
- AI lane colour is steel blue; green is reserved for completed milestones.
- Completed markers open the popup (no drag). Open notes sit under Development → Effort Gantt.`,
  },
  {
    id: "cl-sunwater-mrt-0.6",
    nodeId: "w-sunwater-mrt",
    kind: "release",
    version: "0.6",
    createdAt: "2026-08-19T06:00:00.000Z",
    title: "Occurrence popup polish and recalc fix",
    body: `- Recalculate this row no longer duplicates a scheduled first occurrence.
- Remove this milestone from the occurrence popup (returns to predicted).
- Larger popup, status badge, Completed in the footer, default-plan ghost bars.
- Show/hide Start-Finish-Duration-Hours. Tab in Defaults no longer stretches the chart.`,
  },
  {
    id: "cl-sunwater-mrt-0.7",
    nodeId: "w-sunwater-mrt",
    kind: "release",
    version: "0.7",
    createdAt: "2026-08-19T08:00:00.000Z",
    title: "FY Gantt window and predicted remove",
    body: `- Gantt window starts at 1 Jul of the current financial year.
- Timescale shows year, quarter, and month letters with weighted grid lines.
- Remove this milestone hides a predicted occurrence until Recalculate this row.
- Remove button uses a pink destructive style.`,
  },
  {
    id: "cl-sunwater-mrt-0.8",
    nodeId: "w-sunwater-mrt",
    kind: "release",
    version: "0.8",
    createdAt: "2026-08-19T09:00:00.000Z",
    title: "Recalc, columns, and Gantt sort",
    body: `- Baseline ghosts stay pinned to calendar dates when panning the Effort Gantt.
- Recalculate this row skips not-required as origin; those slots move with the cycle and may become required.
- Recalculate fills yellow when a saved due is off the cycle origin.
- Columns popover toggles Start, Finish, Duration, and Hours individually.
- Obligation Gantt sorts Dam, Obligation, and Next due (within groups when grouped).
- Development drops Product plan and Future Planning; WIP lives in 0.9.`,
  },
  {
    id: "cl-sunwater-mrt-0.9-rel",
    nodeId: "w-sunwater-mrt",
    kind: "release",
    version: "0.9",
    createdAt: "2026-08-19T10:20:00.000Z",
    title: "Resource allocation split-view",
    body: `- Gantt tab splits horizontally: milestone chart on top, people hours vs monthly capacity below on the same timescale.
- Yellow and red cells list contributing dam × obligation; click through to the occurrence popup.
- Heatmap only — no auto-leveling. Resources toggle restores a full-height Gantt.`,
  },
  {
    id: "cl-sunwater-mrt-0.10",
    nodeId: "w-sunwater-mrt",
    kind: "release",
    version: "0.10",
    createdAt: "2026-08-19T16:00:00.000Z",
    title: "Grouped Gantt, rates, and split panes",
    body: `- Grouped Gantt uses nested Dam/Obligation labels; the combined header sorts parent groups.
- Ongoing means the milestone tail crosses today (due RAG yellow). Overdue is due before today and not complete. Upcoming is a due-date lookahead of every status.
- Definitions Asset × Role shows L0/L1/L2 hierarchy with inherit and unassigned captions. Resource Names include email plus internal/external rates (150% autofill; blue dot when custom).
- Occurrence popup: type opens Defaults for that lane; Save and Close; save does not actualise unchanged predicted dates; columns popover is no longer clipped.
- Gantt tab Splitscreen/X panes (default Gantt only). Heatmap shows hours inside each person's chunk, including zeros. Week cells when few months fit, with lightened month lines.
- Dark grey bar under the milestone tail matches the Effort Gantt All-row span.`,
  },
  {
    id: "cl-sunwater-mrt-0.11",
    nodeId: "w-sunwater-mrt",
    kind: "release",
    version: "0.11",
    createdAt: "2026-08-20T03:30:00.000Z",
    title: "Week tails, seed rates, and resource summary",
    body: `- MS Gantt tails follow saved Effort popup \`tailWeeks\` (week-accurate), not month columns.
- Effort popup: darker live tail; pan no longer grows the calendar; Centre around Gantt; default stick to tail start.
- Resource Names seed rates (Lead $250, Engineer $200, Support $150) and a full draft row. Heatmap zeros between obligations stay blank.
- Resource hours title bar holds the close control. Heatmap-only keeps a timescale; split uses a compact header.
- Week cutoff and Force weeks apply to the MS Gantt (W1–W52, Sunday week-end) as well as the heatmap.
- Effort Gantt shows over-capacity week tint on named people plus a filterable resource summary (this occurrence only).
- Baseline stays visible but disabled — parked with Actuals capturing for a later pass.
- Public hub share: read-only URL, optional password, no Entra account (feedback \`fb-public-hub-share\`).`,
  },
  {
    id: "cl-sunwater-mrt-0.12",
    nodeId: "w-sunwater-mrt",
    kind: "release",
    version: "0.12",
    createdAt: "2026-08-20T05:00:00.000Z",
    title: "Infinite pan, cost columns, and equal week scale",
    body: `- Effort popup pans infinitely again (calendar grows at the edges without jumping dates) and pads weeks so the chart fills the popup.
- Predicted stick defaults to tail start; scheduled occurrences keep the last stick, window start, and hours origin so dragging All no longer shifts on reopen.
- Columns: Availability (remaining hours on named people) and Total Cost (external rate, hidden by default). Resource summary sits under the week columns with Total hours, Total Cost, and a totals row.
- Resource Names: Overrun Hours % above hours, External $/h % above external; dollar-formatted rates; blue/orange dots when external is under/over the %.
- MS Gantt and heatmap week columns are equal width (months/years overlay). Month lines are stronger than week lines. Tail hours bar is lighter, ~80% of tail thickness, and flush.`,
  },
  {
    id: "cl-sunwater-mrt-0.13",
    nodeId: "w-sunwater-mrt",
    kind: "release",
    version: "0.13",
    createdAt: "2026-08-20T05:40:00.000Z",
    title: "Hours origin, restore, and Gantt jump",
    body: `- Effort hours map to the saved calendar window (All-shadow and heatmap no longer clip to the lead-in). Pad/save/load keep hoursOrigin on windowStart so Save and Close does not slip weeks.
- Restore Effort Gantt snaps hours onto the tail start. Availability sits on the toolbar; resource summary highlights names without filtering. Placeholder Actual hours / Actual $ columns.
- Compact heatmap shows month letters above week numbers. Resource Names rate-dot resets external to the %; Resource Roles keep focus while typing.
- Inputs and Definitions cross-link; Obligations Go to Gantt centres that occurrence.`,
  },
  {
    id: "cl-sunwater-mrt-0.14",
    nodeId: "w-sunwater-mrt",
    kind: "release",
    version: "0.14",
    createdAt: "2026-08-20T06:30:00.000Z",
    title: "Actuals, restore pulse, and stacked rebalance",
    body: `- Defaults Lead-in and Task+Resource Effort cross-link to Inputs (Assets, Obligation Types, Resource Roles).
- Obligations Go to Gantt pulses the centred marker. Effort role change keeps the name and warns when they will show *.
- Occurrence Effort: per-task status and editable Actual hours / Actual $ totals. Defaults stay plan-only. Heatmap remains planned hours.
- Heatmap Rebalance all stacks contributing occurrence Effort charts on a shared week axis for manual hour edits. No leveling.`,
  },
  {
    // Shipped as 0.15; id kept so existing changelogs.json rows still match.
    id: "cl-sunwater-mrt-0.9",
    nodeId: "w-sunwater-mrt",
    kind: "release",
    version: "0.15",
    createdAt: "2026-08-21T01:30:00.000Z",
    title: "Popup shell, grain toggle, and filter checklists",
    body: `- Hours, rates, and money commit at 2 d.p.; steppers move by 1. Splitscreen drag updates height in the DOM until mouse up.
- Columns popover closes on outside click. Restore Effort / Milestone keeps the week window. Milestone, All, and Resource summary headings are larger.
- Resource summary: Name/Role stay in the name pane; Role lists assigned roles with *; Start/Finish dates; This milestone vs Everywhere; Total vs Available/over.
- Enable Project Management (off by default) shows status, actuals, FAC, and VAC. FAC is actuals plus planned from today; VAC is FAC minus budget.
- Rebalance popup: one toolbar, stacked Milestone→resource charts, one summary, body scroll, Centre at timeline start, red-cell hover table. Heatmap stays planned hours.
- Stacked charts share one week axis and scrollLeft; the popup body scrolls vertically so Close stays on screen. Obligation text sits on the Milestone row; Reset icons on Milestone and All restore due/tail or hours to Defaults without snapping to the tail.
- Enable Project Management is a checkbox in its own group. Resource summary uses This milestone | Everywhere and Total | Available/over segments.
- Site header is full width (logo left, MRT title centre, Home / Site network / Feedback / Profile right). Product tabs stick at the top of the MRT body.
- Gantt chrome: grouped slim filter row with overlay Asset / Type / Due / Legend; Dam↔Obl, Flatten, zoom, and FY timeline share one row above the chart.
- Occurrence and Rebalance share one popup shell (Close top-right, Esc, in-popup vertical scroll, one table). Rebalance only adds extra obligation rows. Red-cell hover shows all/available with RAG colour and highlights the hovered week.
- Effort popup uses a definite height with a visible Y-scrollbar on the table; Task/Role/Name stay frozen while only the week columns H-scroll. Collapsed obligations no longer leave empty 280px gaps. MS Gantt Timescale and Rows are bordered zoom chips.
- Effort popup is a grid-capped overlay (never taller than the window). The table Y-scrolls; Save/Close stay pinned. Rebalance has Save assignment / Save and Close; stacked hour edits draft until Save.
- Red-cell hover portals above frozen Task/Role/Name labels.
- MS Gantt milestone drag moves All Tasks with the diamond (tail-end shift, stick unchanged).
- Timescale grain is a Weeks/Months toggle; the Wks cutoff is gone.
- Asset and Type filters (Gantt and Obligations) have Select all / Clear all.
- Rows zoom sizes Resource hours; Name and Role sit on one line.`,
  },
  {
    id: "cl-sunwater-mrt-1.0",
    nodeId: "w-sunwater-mrt",
    kind: "release",
    version: "1.0",
    createdAt: "2026-08-23T04:00:00.000Z",
    title: "Initial product cut",
    body: `Sunwater dam-safety obligations as regulator cycles (each dam × requirement type × due date), not named project milestones. Shared Work hub for Scriven Group staff (Microsoft sign-in).

What you can do
- Gantt: predicted and scheduled occurrences on a cyclical timeline. Filter by asset, type, and due; Weeks or Months; zoom timescale and rows. Resource-hours pane shows planned load (blank under capacity, yellow over 100%, red over the overrun threshold). Drag a milestone diamond to move its due and the attached task hours.
- Occurrence popup: set due and lead-in/tail, assign people, and plan hours on the Effort chart. Rebalance stacks several obligations for one person when they are over. Save / Save and Close; Close discards unsaved hour edits.
- Obligations: table of occurrences with plan status, due, and lead-in. Filter assets and obligation types (Select all / Clear all).
- Inputs: assets, obligation types, which types apply to which dams, named people, roles, weekly available hours, overrun threshold (default 125%).
- Definitions and Defaults: catalog labels plus role-hour templates that seed an occurrence once (later Defaults edits do not overwrite a saved plan).

Out of this version
- Followups, Assumptions, non-resource costing, and automatic leveling. Heatmap is planned hours only. No client logins.`,
  },
  {
    id: "cl-sunwater-mrt-1.1",
    nodeId: "w-sunwater-mrt",
    kind: "release",
    version: "1.1",
    createdAt: "2026-08-28T05:00:00.000Z",
    title: "Audience shares and guest gate",
    body: `Staff share a read-only live plan with named audiences. This is a guest door, not Microsoft logins for clients.

- Site/Staff /login stays generic (Microsoft / Dev Login only). Viewers use a separate gate: /w/sunwater-mrt/guest?s=…
- Admin → Sharing: one labelled link per audience, password and expiry set in the app. Copy the guest link; tell the password another way. Disable (or expiry) cuts that audience; others stay on.
- Guests see the live plan read-only (Gantt, Obligations, Inputs, Definitions, Defaults). No Admin, Development, Home, or Feedback. They cannot save back to live.
- Admin → Guest activity logs share-login name, audience, and IP on this instance (file-only; zip deploys may wipe it).
- Admin → Guides → How to share is the staff how-to (HTML and PDF). Do not use Azure App Settings for the share password.
- Zip deploy can clear data/mrt-share.json. Recreate audiences in Admin → Sharing if View stops working.`,
  },
  {
    id: "cl-sunwater-mrt-1.2",
    nodeId: "w-sunwater-mrt",
    kind: "release",
    version: "1.2",
    createdAt: "2026-08-31T02:00:00.000Z",
    title: "Recalc week-ending, First due, Effort polish",
    body: `Bugs and small polish on the live tracker.

- Recalc keeps the week-ending day you dragged (not month-end). Same-month moves show the stale ↺ until you Recalc.
- First due jumps the Gantt to the earliest filtered obligation still on the board.
- Effort Gantt: hide a column with × (Columns to bring it back); Resource summary toggles use the amber selected look; week hours in the summary update while you drag; Save buttons sit with the Defaults seed note; Weeks zoom is an inline chip.
- One-line intro under every tab and sub-tab.`,
  },
  {
    id: "cl-sunwater-mrt-1.3",
    nodeId: "w-sunwater-mrt",
    kind: "release",
    version: "1.3",
    createdAt: "2026-08-31T05:10:00.000Z",
    title: "Share-ready release",
    body: `This is the 1.0 pack to share. Regulator cycles, guest Help, and audience shares.

- Help (staff and guests): User guide and Quick reference. Quick reference More links jump to the matching User guide section. HTML and Print → PDF downloads. Version v1.0 sits in the page header.
- Admin → Guides stays How to share (staff). Guests do not see Admin.
- Development: sandbox Effort Gantt removed. Notes is a full-page textarea saved with the live plan (openNotes). Staff only.
- Includes audience shares (guest gate), Recalc week-ending, First due, and Effort polish from the cycles after the first product cut.`,
  },
  {
    id: "cl-sunwater-mrt-0.16",
    nodeId: "w-sunwater-mrt",
    kind: "release",
    version: "1.4",
    createdAt: "2026-08-31T08:20:00.000Z",
    title: "Guest click-drag sandbox",
    body: `- Guests load a personal copy of the live plan. Drag and hour edits save under data/mrt-sandboxes, keyed by guest name and network. Not live writes. Same App Service, no Neon.
- Reset to live plan reclones the current live store onto that desk. Staff save path is unchanged. Guests still do not see Admin or Development.
- Help describes the personal copy and Reset. Shell version stays v1.0.`,
  },
  {
    id: "cl-sunwater-mrt-0.17",
    nodeId: "w-sunwater-mrt",
    kind: "release",
    version: "1.5",
    createdAt: "2026-08-31T09:00:00.000Z",
    title: "Baseload dataset and header version",
    body: `- Live store loads the 24-dam × 11-obligation catalog from the milestone-master condition schedules (applicability: AI where listed, SR where SR years exist, OTH = Paradise Dam only).
- Cycle anchors use the source CI/SR years and the annual/once months from that dataset. Dummy Prepare/Inspect/Report Effort templates seed each obligation type (hours scaled by lead-in) and the next due on each applicable dam × type.
- Header shows the sub-version and its datetime (v1.5 · 31 Aug 2026, 7:00 pm).`,
  },
  {
    id: "cl-sunwater-mrt-dev-template",
    nodeId: "w-sunwater-mrt",
    kind: "plan",
    createdAt: "2026-09-08T12:00:00.000Z",
    title: "Development tab uses the Kanban template",
    body: `- Staff Development is the shared Kanban Online host (Inbox, board, Changelog, Notes, Raise tagged to MRT).
- Notes still save on the live plan (openNotes). Guests do not see Development.
- Shipped with Kanban 0.2 / hub 1.6.`,
  },
  {
    id: "cl-kanban-online-0.0.1",
    nodeId: "i-kanban",
    kind: "plan",
    version: "0.0.1",
    createdAt: "2026-09-07T06:00:00.000Z",
    title: "Inbox attachments + compact Raise (localhost WIP toward 0.2)",
    body: `Kanban Online plan 0.0.1. Localhost / save-slot wip/kanban only. Not live. Live stays 0.1.6 until Bill says make it live (then 0.2 from station main).

- Inbox notes can hold files (Neon bytea / local JSON+bin). Tickets inherit via sourceIdeaId. No Azure Blob.
- Raise / Inbox leaf tag is a label until click (nested Site network popup). Details grow. Save/Cancel stay on screen.
- Kanban Online CodeBadge is a blue tint of Internal (6BA4E3), not pink D45A78. 0.1.1–0.1.6 ids unchanged.`,
  },
  {
    id: "cl-kanban-online-0.1.1",
    nodeId: "i-kanban",
    kind: "release",
    version: "0.1.1",
    createdAt: "2026-09-05T02:20:00.000Z",
    title: "Compact chrome — more body, leaf dropdown, underline tabs",
    body: `Kanban Online chrome (0.1.1). Layout only. Same columns and leaf tags. Not deployed.

- Short Internal header. Leafs dropdown of tags that already have a row. Empty sketched leaves stay out.
- Inbox / KanBan underline tabs. Compact column / category / layout. More options modal.
- Shared host on mtg-buylist Development uses the same board/inbox chrome. No schema change.`,
  },
  {
    id: "cl-kanban-online-0.1.2",
    nodeId: "i-kanban",
    kind: "release",
    version: "0.1.2",
    createdAt: "2026-09-05T04:10:00.000Z",
    title: "Tab strip — Inbox | All Kanban | Later+Open …",
    body: `Kanban Online chrome (0.1.2). Layout only. Same columns and leaf tags. Not deployed.

- One tab strip: Inbox | All Kanban | Later + Open | Open + Done | Later | Open | Archived. No parent KanBan tab.
- Leafs on row 2 (Internal). Raise an idea on every tab. Layout = Columns | Swimlanes toggle.`,
  },
  {
    id: "cl-kanban-online-0.1.3",
    nodeId: "i-kanban",
    kind: "release",
    version: "0.1.3",
    createdAt: "2026-09-05T05:50:00.000Z",
    title: "Visual density — toggle-height chrome, one Inbox row",
    body: `Kanban Online chrome (0.1.3). Layout only. Same store. Not deployed.

- Chrome controls match the Layout Columns | Swimlanes toggle height (min-h-8). Raise an idea sits before Leafs.
- Inbox Sort / Show archived / More options share that row. Show archived is a bordered button with a pressed state.`,
  },
  {
    id: "cl-kanban-online-0.1.4",
    nodeId: "i-kanban",
    kind: "release",
    version: "0.1.4",
    createdAt: "2026-09-05T06:00:00.000Z",
    title: "Changelog tab — stepped 0.1.x chunks",
    body: `Kanban Online chrome (0.1.4). Same changelogs store (nodeId i-kanban). Not deployed.

- Changelog tab at the end of the strip. Four stepped release rows 0.1.1–0.1.4 with datetime.
- Later register reads changelogs by nodeId / all nodes. No second changelog table.`,
  },
  {
    id: "cl-kanban-online-0.1.5",
    nodeId: "i-kanban",
    kind: "release",
    version: "0.1.5",
    createdAt: "2026-09-05T08:00:00.000Z",
    title: "Raise right + Changelog inline + all-leaf picker",
    body: `Kanban Online chrome (0.1.5). Same changelogs store (nodeId i-kanban). Not deployed.

- Raise an idea sits on the tab strip, far right, on Inbox, Kanban tabs, and Changelog.
- Leafs filter hidden on Changelog. Inbox and Kanban column tabs still have it.
- Raise leaf picker uses the Site network nested list (Global + every hub’s children). Not Work/Projects only.
- Changelog newest version on top. One inline detail row under the selected version (latest open on first paint).`,
  },
  {
    id: "cl-kanban-online-0.1.6",
    nodeId: "i-kanban",
    kind: "release",
    version: "0.1.6",
    createdAt: "2026-09-05T09:15:00.000Z",
    title: "Published to Azure live",
    body: `Kanban Online (0.1.6). Zip-deployed to Azure App Service. Live at /i/kanban.

- Inbox, column tabs, Changelog, and Raise an idea are on the live origin.
- Same changelogs store (nodeId i-kanban). 0.1.1–0.1.5 ids unchanged.
- Whole app zip (Kanban cannot ship alone). Laptop data/ not in the zip.`,
  },
  {
    id: "cl-kanban-online-0.0.2",
    nodeId: "i-kanban",
    kind: "plan",
    version: "0.0.2",
    createdAt: "2026-09-08T12:00:00.000Z",
    title: "Development template + Notes + Design spec (localhost WIP)",
    body: `Kanban Online plan 0.0.2. Localhost / save-slot wip/kanban only. Not live.

- This page is the template for other leaves' Development tabs (Inbox, board, Changelog, Notes, Raise).
- Labels and layout notes live in src/core/kanban/chrome.ts. Design spec tab is only on /i/kanban.
- Notes persist in kanban_leaf_notes (Neon when DATABASE_URL is set).
- Buylist and MRT Development embed the same host. Sketched leaves stay changelog-only.`,
  },
  {
    id: "cl-kanban-online-0.2",
    nodeId: "i-kanban",
    kind: "release",
    version: "0.2",
    createdAt: "2026-09-09T00:10:00.000Z",
    title: "0.2 — Development template live (hub 1.6)",
    body: `Kanban Online 0.2. Zip-deployed with hub 1.6. Live at /i/kanban.

- Development on Buylist and MRT is the same host (Inbox, board, Changelog, Notes, Raise).
- Design spec tab only on /i/kanban. Chrome labels live in src/core/kanban/chrome.ts.
- Notes persist in kanban_leaf_notes (Neon). Sketched leaves stay changelog-only.
- Buylist product work on wip/buylist is not in this train.`,
  },
];

export const seedDependencies: DependencyRecord[] = [
  {
    id: "dep-azure",
    name: "Azure subscription / App Service",
    type: "cloud",
    expiresAt: null,
    externalUrl: "https://portal.azure.com",
    notes: "Phase 2 — provision rg-scrivengroup, Postgres, App Service.",
  },
  {
    id: "dep-entra",
    name: "Microsoft Entra app registration",
    type: "auth",
    expiresAt: null,
    externalUrl: "https://entra.microsoft.com",
    notes: "Phase 2 — client id/secret/tenant for Auth.js.",
  },
  {
    id: "dep-domain",
    name: "scriven.group DNS",
    type: "dns",
    expiresAt: null,
    externalUrl: null,
    notes: "Point domain at App Service after Phase 2.",
  },
  {
    id: "dep-entra-secret",
    name: "Entra app client secret (scrivengroup-hub)",
    type: "secret",
    expiresAt: "2027-08-13",
    externalUrl: "https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade",
    notes:
      "Client secret created Phase 2 — 365-day expiry. Rotate before this date; update Azure App Settings.",
  },
  {
    id: "dep-playmantis-buylist",
    name: "Playmantis buylist search",
    type: "external",
    expiresAt: null,
    externalUrl:
      "https://playmantis.com.au/search?q=tag:buylist&type=product&view=buylist-custom",
    notes:
      "Hub server-fetches /search?q=tag:buylist tag:{scryfallId}&type=product&view=buylist-custom. Parse data-credit-price and data-buylist-limit. Ignore Shopify products.json price. Batch + 429 retry.",
  },
  {
    id: "dep-mtgmate-buylist",
    name: "MTGMate buylist /data",
    type: "external",
    expiresAt: null,
    externalUrl: "https://www.mtgmate.com.au/buylist/magic_sets/",
    notes:
      "Logged-in bookmarklet harvest of /buylist/magic_sets/{set}/data. Unauthenticated fetch is 401. Visual hotlist is incomplete — do not use it. No Mate password stored on the hub.",
  },
];

export const seedIdeas: IdeaRecord[] = [
  {
    id: "idea-1",
    title: "Portfolio view for Work sub-hubs",
    body: "Later: mark Work products as portfolio-visible without client logins.",
    createdAt: new Date().toISOString(),
    status: "inbox",
  },
];

export const seedNotes: NoteRecord[] = [
  {
    id: "note-1",
    title: "Phase 1 localhost",
    body: "Demo shell before Azure. Use Dev Login.",
    updatedAt: new Date().toISOString(),
  },
];

const DEV_CHOICES_SEEDED_AT = "2026-08-26T00:00:00.000Z";

export const seedDevChoices: DevChoiceRecord[] = [
  {
    id: "dc-sessions",
    createdAt: DEV_CHOICES_SEEDED_AT,
    layer: "sessions",
    status: "locked",
    decision:
      "One chat = one job. Durable truth lives in repo files; harvest leftovers into canon; no transcript dumps; pin fat threads.",
  },
  {
    id: "dc-w-studio",
    createdAt: DEV_CHOICES_SEEDED_AT,
    layer: "/w-studio",
    status: "locked",
    decision:
      "Build and demo here. Do not host `/w/` apps as the client's production; packaging into their environment is a later job.",
  },
  {
    id: "dc-guest-entra",
    createdAt: DEV_CHOICES_SEEDED_AT,
    layer: "auth",
    status: "locked",
    decision:
      "Staff Entra already exists. DIY guest password is the cheap demo door. Client Entra on this studio is org-work; it does not replace a sandbox and does not buy packaging. No Entra for Sunwater client users on this host.",
  },
  {
    id: "dc-guest-shape",
    createdAt: DEV_CHOICES_SEEDED_AT,
    layer: "reuse",
    status: "locked",
    decision:
      "One product, two desks (live JSON vs sandbox). No guest fork of every function. Current code is MRT-named; the next `/w/` app reuses the pattern via later `fb-public-hub-share`, not a copy-paste of mrt-share.",
  },
  {
    id: "dc-demo-artifact",
    createdAt: DEV_CHOICES_SEEDED_AT,
    layer: "packaging",
    status: "locked",
    decision:
      "The demo artifact is a guest link, not a standalone `.html` of the Next app.",
  },
  {
    id: "dc-janitor",
    createdAt: DEV_CHOICES_SEEDED_AT,
    layer: "janitor",
    status: "locked",
    decision:
      "No folder reorg as a prelude to a feature. Structure is its own planned cycle.",
  },
  {
    id: "dc-agent-intake",
    createdAt: DEV_CHOICES_SEEDED_AT,
    layer: "agents",
    status: "locked",
    decision:
      "Before planning or building, read `docs/PLATFORM.md`, `docs/DEV_CHOICES.md`, and `docs/WEB_DEVELOPMENT.md`. Do not contradict locked rows. Two-agent rules: `docs/TWO_AGENTS.md`.",
  },
  {
    id: "dc-web-stack",
    createdAt: "2026-09-01T12:00:00.000Z",
    layer: "html",
    status: "locked",
    decision:
      "All new hub UI is Next.js App Router + React + TypeScript + Tailwind + SG tokens (Appearance). my-site vanilla HTML/MD3 is a legacy island until the Great Merging. No third front-end kit.",
    why: "Hub products are app rooms. One kit so requests do not need stack trivia.",
  },
  {
    id: "dc-leaf-cycle",
    createdAt: "2026-09-01T12:00:00.000Z",
    layer: "leaf",
    status: "locked",
    decision:
      "Leaves ship in order: local dummy → skin location online (sketched shell + plan) → skeleton mockup online (building, same store types) → clean revision (live) → numbered+dated changelog cycles. Details: docs/WEB_DEVELOPMENT.md.",
  },
  {
    id: "dc-leaf-contract",
    createdAt: "2026-09-01T12:00:00.000Z",
    layer: "leaf",
    status: "locked",
    decision:
      "Every leaf has a Development surface (changelog + bulk notes). Versions show number and datetime when shipping. Global chrome always has Feedback to one register. Site network is the fast-travel map. Details: docs/WEB_DEVELOPMENT.md.",
  },
  {
    id: "dc-design-defaults",
    createdAt: "2026-09-01T12:00:00.000Z",
    layer: "design",
    status: "locked",
    decision:
      "Start from SG chrome and globals.css (sg-card, sg-btn-*, sg-input, tokens, Manrope, 10px radius). Hex on badge only unless a ThemeContract. Viewport-capped dialogs. Do not copy my-site MD3 onto hub pages.",
  },
  {
    id: "dc-db-cutover",
    createdAt: "2026-09-01T12:00:00.000Z",
    layer: "data",
    status: "locked",
    decision:
      "Durable data via existing DATABASE_URL (Postgres/Neon), evolving json-store / mrt-share. Simple stores first, then MRT (guest sandbox/share design revisited in that pass). Zip must not ship data/. Plan: docs/NEON_CUTOVER.md.",
  },
  {
    id: "dc-publish",
    createdAt: "2026-09-01T12:00:00.000Z",
    layer: "publish",
    status: "locked",
    decision:
      "Loop: you vibe, Cursor codes, localhost, you review, you say commit (commit and push to the current GitHub branch; merge to dev_main is never implied), you say make it live. Make it live = fast-forward main to dev_main, then tag hub-*/v* or GitHub Run workflow (same zip via OIDC onto app-scrivengroup). Hand zip is fallback. Push/merge dev_main is not live. Fast-forward main without the zip is not Azure. Details: docs/GIT_AND_RELEASE.md.",
  },
  {
    id: "dc-versioning",
    createdAt: "2026-09-07T03:00:00.000Z",
    layer: "versioning",
    status: "locked",
    decision:
      "Hub train is SemVer MAJOR.MINOR: each live publish bumps MINOR; PATCH is an emergency hotfix; MAJOR only if Bill asks. Each leaf has its own SemVer; unchanged leaves do not bump. Localhost slices may use PATCH until that leaf ships in a hub train. Details: docs/GIT_AND_RELEASE.md.",
  },
  {
    id: "dc-great-merge",
    createdAt: "2026-09-01T12:00:00.000Z",
    layer: "merge",
    status: "locked",
    decision:
      "Great Merging of ’26: my-site apps become hub leaves; Cursor implements; Claude/you export files + data (no secret strings). Not a git merge of stacks. Plan: docs/GREAT_MERGING.md.",
  },
  {
    id: "dc-two-agents",
    createdAt: "2026-09-01T12:00:00.000Z",
    layer: "agents",
    status: "locked",
    decision:
      "Cursor is the only agent that ships the hub. Claude owns my-site until a leaf moves, then stops editing that leaf. Claude does not zip-deploy app-scrivengroup. Treaty: docs/TWO_AGENTS.md.",
  },
];
