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
      "Before planning or building, read `docs/PLATFORM.md` and `docs/DEV_CHOICES.md`. Do not contradict locked rows.",
  },
];
