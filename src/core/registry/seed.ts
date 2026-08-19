import type {
  ChangelogEntry,
  DependencyRecord,
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
    status: "building",
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
- building
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
    id: "cl-sunwater-mrt-0.9",
    nodeId: "w-sunwater-mrt",
    kind: "plan",
    version: "0.9",
    createdAt: "2026-08-19T09:05:00.000Z",
    title: "WIP",
    body: `- Gantt split-view: people hours vs weekly capacity on the same timescale as the MS Gantt; click an overage to open contributing occurrences (heatmap only, no leveling).
- Public hub share: read-only URL, optional password, no Entra account (feedback \`fb-public-hub-share\`).`,
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
