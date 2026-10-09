import { COLUMN_FILTERS, COLUMN_LABELS } from "./schema";

/** One place for Kanban chrome copy and layout. Relabel here; every host follows. */
export const KANBAN_CHROME = {
  labels: {
    requirements: "Requirements",
    inbox: COLUMN_LABELS.inbox,
    kanban: "Kanban",
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
    columnFilterAll: "All",
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
      "Layout 1 Kanban card: no suite tabs; checkbox row above buckets (default Later+Open). Layout 2 (leaves): L2 tabs Requirements | Inbox | Kanban | Changelog | Notes. A new leaf opens on Requirements. Kanban tab uses the same checkbox row. Design spec is a Development hub card only.",
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
      "Leaf CodeBadge hex only (dc-design-defaults). Development hub badge is 8C8C8C.",
    inboxAccent:
      "Inbox hat/accent stays pink (#b45a78). Column colours: Later gold, Open blue, Done green.",
  },
} as const;

export type KanbanChrome = typeof KANBAN_CHROME;

/** Old /d?tab= and leaf ?tab= column-filter ids still redirect to the Kanban room. */
export const LEGACY_BOARD_TAB_IDS = COLUMN_FILTERS.map((row) => row.id);
