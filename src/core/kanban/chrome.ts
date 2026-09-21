import { COLUMN_FILTERS, COLUMN_LABELS } from "./schema";

/** One place for Kanban chrome copy and layout. Relabel here; every host follows. */
export const KANBAN_CHROME = {
  labels: {
    inbox: COLUMN_LABELS.inbox,
    changelog: "Changelog",
    notes: "Notes",
    raise: "Raise an idea",
    designSpec: "Design spec",
    leafs: "Leafs",
    type: "Type",
    sort: "Sort",
    layout: "Layout",
    category: "Category",
    more: "More options",
    columns: "Columns",
    swimlanes: "Swimlanes",
    boardFilters: COLUMN_FILTERS.map((f) => ({ id: f.id, label: f.label })),
  },
  raise: {
    placement: "chrome-feedback" as const,
    trigger: "header Feedback / mobile FAB" as const,
    popup: "viewport-capped ShellModal with type, leaf tag, details, attachments",
  },
  layout: {
    host: "flex min-h-0 flex-1 flex-col (fills leftover viewport)",
    pageWidth: "full width of the leaf main; no max-w-5xl on the board",
    chromeRows:
      "Layout 1 rooms have no suite tab strip. Kanban card row 1 = column-filter tabs until kt-kanban-column-filter. Layout 2 (leaves) row 1 = Inbox | filters | Changelog | Notes. Row 2 = filters (Inbox and board only).",
    readingWidth: "Changelog / Notes / Design spec may use a readable card; the board must not.",
  },
  density: {
    controlHeight: "32px (min-h-8, --sg-btn-height)",
    radius: "10px (--radius)",
    typeface: "Manrope",
    tabs: "sg-tab underline, not pills",
    empty: 'lowercase "none" in muted text — no illustration, no fake cards',
  },
  colour: {
    badge:
      "Leaf CodeBadge hex only (dc-design-defaults). Development hub badge is C45C26.",
    inboxAccent:
      "Inbox hat/accent stays pink (#b45a78). Column colours: Later gold, Open blue, Done green.",
  },
} as const;

export type KanbanChrome = typeof KANBAN_CHROME;
