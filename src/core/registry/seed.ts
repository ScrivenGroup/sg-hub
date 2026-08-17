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
    code: "A10001",
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
    code: "B20002",
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
    code: "C30003",
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
    code: "D40004",
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
    status: "sketched",
    hasNetworkMap: false,
    description:
      "Sunwater client — milestone resourcing tracker (featureless shell — build on desktop).",
    order: 1,
  },
  {
    id: "p-fueltracker",
    hubPrefix: "p",
    slug: "fueltracker",
    title: "Fuel Tracker",
    code: "A3F91C",
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
    code: "B1C2D3",
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
    code: "C4D5E6",
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
    code: "A7B8C9",
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
    code: "D7E8F9",
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
    code: "E1F2A3",
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
    code: "F4A5B6",
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
    createdAt: new Date().toISOString(),
    title: "Development plan (mobile framing)",
    body: `## Fuel Tracker — development plan

**Theme notes (desktop):** dark theme by default, car-thematic. Opt-in ThemeContract; until then global SG theme. Badge colour #A3F91C only.

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
    createdAt: new Date().toISOString(),
    title: "Development plan (mobile framing)",
    body: `## Sunwater — Milestone Resourcing Tracker

**Client context:** Sunwater (Work hub — org only, no client logins).
**Badge:** #4E8C6B only (global SG theme until any ThemeContract).

**Goal:** Plan and track people/roles against project milestones so resourcing gaps and over-allocation are visible early.

### Milestones
- Named milestones with target dates / windows
- Status (planned / in progress / done) and ordering within the engagement

### Resource / role pool
- People and/or roles available to the engagement
- Capacity notes (FTE, availability windows) as needed

### Allocation
- Assign resources to milestones over time
- Surface conflicts (same person double-booked) and shortfalls (uncovered milestone demand)

### Views / reporting
- Milestone-centric and resource-centric views
- Simple export or snapshot for client conversation (desktop build)

### Access
- shared — Scriven Group Entra users; client-context Work product

### Status
- sketched / featureless shell — build on desktop
`,
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
