import { z } from "zod";

/** Categories = hats / swimlanes. Colour is badge-only. */
export const KANBAN_CATEGORIES = [
  "experience",
  "structure",
  "behaviour",
  "data",
  "platform",
] as const;
export type KanbanCategory = (typeof KANBAN_CATEGORIES)[number];
/** @deprecated use KanbanCategory — kept so existing `lane` JSON still types. */
export type KanbanLane = KanbanCategory;
export const KANBAN_LANES = KANBAN_CATEGORIES;

export const KANBAN_COLUMNS = ["later", "open", "done", "archived"] as const;
export type KanbanColumn = (typeof KANBAN_COLUMNS)[number];

export const KANBAN_VISIBLE_COLUMNS = ["later", "open", "done"] as const;

export const INBOX_STATUSES = ["open", "archived"] as const;
export type KanbanInboxStatus = (typeof INBOX_STATUSES)[number];

export const INBOX_KINDS = ["bug", "idea", "housekeeping", "other"] as const;
export type InboxKind = (typeof INBOX_KINDS)[number];

export const INBOX_SOURCES = ["feedback", "raise"] as const;
export type InboxSource = (typeof INBOX_SOURCES)[number];

export const INBOX_KIND_LABELS: Record<InboxKind, string> = {
  bug: "Bug",
  idea: "Idea",
  housekeeping: "Housekeeping",
  other: "Other",
};

export const CATEGORY_LABELS: Record<KanbanCategory, string> = {
  experience: "Experience",
  structure: "Structure",
  behaviour: "Behaviour",
  data: "Data",
  platform: "Platform",
};
export const LANE_LABELS = CATEGORY_LABELS;

export const CATEGORY_BADGE: Record<KanbanCategory, { color: string; fill: string }> = {
  experience: { color: "#7b61c4", fill: "#f3eef9" },
  structure: { color: "#3b6fd4", fill: "#eef3fb" },
  behaviour: { color: "#d4782c", fill: "#fbf1e8" },
  data: { color: "#2f8f4e", fill: "#eaf5ee" },
  platform: { color: "#2a9aa8", fill: "#e7f5f7" },
};

export const COLUMN_LABELS: Record<KanbanColumn | "inbox", string> = {
  inbox: "Inbox",
  later: "Later",
  open: "Open",
  done: "Done",
  archived: "Archived",
};

export const COLUMN_ACCENT: Record<KanbanColumn | "inbox", string> = {
  inbox: "#b45a78",
  later: "#c9a227",
  open: "#3b6fd4",
  done: "#2f8f4e",
  archived: "#7a7a78",
};

export const COLUMN_FILTERS = [
  { id: "all", label: "All Kanban", columns: ["later", "open", "done", "archived"] },
  { id: "later-open", label: "Later + Open", columns: ["later", "open"] },
  { id: "open-done", label: "Open + Done", columns: ["open", "done"] },
  { id: "later", label: "Later", columns: ["later"] },
  { id: "open", label: "Open", columns: ["open"] },
  { id: "archived", label: "Archived", columns: ["archived"] },
] as const;

export type ColumnFilterId = (typeof COLUMN_FILTERS)[number]["id"];

const LEGACY_COLUMN: Record<string, KanbanColumn> = {
  backlog: "later",
  doing: "open",
  review: "open",
  later: "later",
  open: "open",
  done: "done",
  archived: "archived",
};

export function migrateTicketColumn(raw: unknown): KanbanColumn {
  if (typeof raw === "string" && raw in LEGACY_COLUMN) return LEGACY_COLUMN[raw];
  return "later";
}

export const kanbanLaneSchema = z.enum(KANBAN_CATEGORIES);
export const kanbanColumnSchema = z.preprocess(migrateTicketColumn, z.enum(KANBAN_COLUMNS));
export const inboxStatusSchema = z.enum(INBOX_STATUSES);
export const inboxKindSchema = z.enum(INBOX_KINDS);
export const inboxSourceSchema = z.enum(INBOX_SOURCES);

/** Leaf tag for Global (Development hub) rows. Not a swimlane. */
export const KANBAN_GLOBAL_NODE_ID = "global";

/** Metadata only — never bytes / base64. */
export const kanbanAttachmentMetaSchema = z.object({
  id: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  byteSize: z.number().int().nonnegative(),
  createdAt: z.string(),
});
export type KanbanAttachmentMeta = z.infer<typeof kanbanAttachmentMetaSchema>;

export const kanbanAttachmentStoreRowSchema = kanbanAttachmentMetaSchema.extend({
  ideaId: z.string(),
  nodeId: z.string(),
});
export type KanbanAttachmentStoreRow = z.infer<typeof kanbanAttachmentStoreRowSchema>;

export const kanbanInboxNoteSchema = z.object({
  id: z.string(),
  nodeId: z.string().default(KANBAN_GLOBAL_NODE_ID),
  title: z.string(),
  body: z.string(),
  status: inboxStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  copiedAt: z.string().nullable().optional().default(null),
  kind: inboxKindSchema.optional(),
  source: inboxSourceSchema.optional(),
  pageHref: z.string().nullable().optional(),
  pageTitle: z.string().nullable().optional(),
  submittedBy: z.string().nullable().optional(),
  attachments: z.array(kanbanAttachmentMetaSchema).optional(),
});
export type KanbanInboxNote = z.infer<typeof kanbanInboxNoteSchema>;

export function normalizeInboxNote(note: KanbanInboxNote): KanbanInboxNote {
  return {
    ...note,
    kind: note.kind ?? "idea",
    source: note.source ?? "raise",
    pageHref: note.pageHref ?? null,
    pageTitle: note.pageTitle ?? null,
    submittedBy: note.submittedBy ?? null,
    copiedAt: note.copiedAt ?? null,
  };
}

/** Feedback chrome rows plus bug / housekeeping / other (Kanban Inbox type filter). */
export function isFeedbackRegisterNote(note: KanbanInboxNote): boolean {
  const kind = note.kind ?? "idea";
  if (note.source === "feedback") return true;
  return kind === "bug" || kind === "housekeeping" || kind === "other";
}

export const kanbanTicketSchema = z.object({
  id: z.string(),
  nodeId: z.string().default(KANBAN_GLOBAL_NODE_ID),
  title: z.string(),
  body: z.string(),
  lane: kanbanLaneSchema.default("behaviour"),
  column: kanbanColumnSchema,
  sourceIdeaId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type KanbanTicket = z.infer<typeof kanbanTicketSchema>;

export const kanbanFingerprintSchema = z.object({
  kind: z.enum(["ticket", "idea"]),
  column: z.string().optional(),
  lane: z.string().optional(),
  status: z.string().optional(),
  hash: z.string(),
});
export type KanbanFingerprint = z.infer<typeof kanbanFingerprintSchema>;

export const kanbanLiveBaselineSchema = z.object({
  capturedAt: z.string(),
  revision: z.number(),
  items: z.record(z.string(), kanbanFingerprintSchema),
});
export type KanbanLiveBaseline = z.infer<typeof kanbanLiveBaselineSchema>;

export const kanbanEventSchema = z.object({
  at: z.string(),
  kind: z.enum(["inbox", "pack", "baseline"]),
  summary: z.string(),
});
export type KanbanEvent = z.infer<typeof kanbanEventSchema>;

export const kanbanMetaSchema = z.object({
  nodeId: z.string(),
  revision: z.number(),
  updatedAt: z.string(),
  publishedAt: z.string().nullable(),
  liveBaseline: kanbanLiveBaselineSchema.nullable(),
  events: z.array(kanbanEventSchema),
  lanes: z.array(kanbanLaneSchema),
});
export type KanbanMeta = z.infer<typeof kanbanMetaSchema>;

export const kanbanBoardSchema = z.object({
  nodeId: z.string(),
  revision: z.number(),
  updatedAt: z.string(),
  publishedAt: z.string().nullable(),
  ideas: z.array(kanbanInboxNoteSchema),
  tickets: z.array(kanbanTicketSchema),
  liveBaseline: kanbanLiveBaselineSchema.nullable(),
  events: z.array(kanbanEventSchema),
  lanes: z.array(kanbanLaneSchema),
});
export type KanbanBoard = z.infer<typeof kanbanBoardSchema>;

export const changelogFragmentSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  body: z.string(),
  kind: z.enum(["plan", "release"]),
  version: z.string().optional(),
  createdAt: z.string().optional(),
});
export type ChangelogFragment = z.infer<typeof changelogFragmentSchema>;

export const sessionPackSchema = z.object({
  boardId: z.string(),
  revisionExpected: z.number().optional(),
  tickets: z.array(kanbanTicketSchema).default([]),
  archiveIdeaIds: z.array(z.string()).default([]),
  changelogFragments: z.array(changelogFragmentSchema).optional().default([]),
});
export type SessionPack = z.infer<typeof sessionPackSchema>;

export const liveBaselineSourceSchema = z.object({
  nodeId: z.string().optional(),
  revision: z.number(),
  ideas: z.array(kanbanInboxNoteSchema),
  tickets: z.array(kanbanTicketSchema),
});
export type LiveBaselineSource = z.infer<typeof liveBaselineSourceSchema>;

export const EVENT_CAP = 50;

export function emptyKanbanMeta(nodeId: string): KanbanMeta {
  return {
    nodeId,
    revision: 0,
    updatedAt: new Date().toISOString(),
    publishedAt: null,
    liveBaseline: null,
    events: [],
    lanes: [...KANBAN_CATEGORIES],
  };
}

export function emptyKanbanBoard(nodeId: string): KanbanBoard {
  const meta = emptyKanbanMeta(nodeId);
  return {
    nodeId: meta.nodeId,
    revision: meta.revision,
    updatedAt: meta.updatedAt,
    publishedAt: meta.publishedAt,
    ideas: [],
    tickets: [],
    liveBaseline: meta.liveBaseline,
    events: meta.events,
    lanes: meta.lanes,
  };
}

export function boardFromRows(
  nodeId: string,
  ideas: KanbanInboxNote[],
  tickets: KanbanTicket[],
  meta: KanbanMeta,
): KanbanBoard {
  return {
    nodeId,
    revision: meta.revision,
    updatedAt: meta.updatedAt,
    publishedAt: meta.publishedAt,
    ideas,
    tickets,
    liveBaseline: meta.liveBaseline,
    events: meta.events,
    lanes: meta.lanes.length ? meta.lanes : [...KANBAN_CATEGORIES],
  };
}

export function nextInboxId(ideas: { id: string }[]): string {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `IN-${day}-`;
  let max = 0;
  for (const idea of ideas) {
    const m = idea.id.match(new RegExp(`^IN-${day}-(\\d+)$`));
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}${String(max + 1).padStart(2, "0")}`;
}

export function newKanbanId(prefix: "raw" | "kt"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function prependEvent(
  events: KanbanEvent[],
  event: KanbanEvent,
): KanbanEvent[] {
  return [event, ...events].slice(0, EVENT_CAP);
}
