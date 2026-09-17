import { COLUMN_FILTERS, type ColumnFilterId } from "@/core/kanban/schema";
import type { KanbanOnlineStart } from "@/core/kanban/ui/KanbanOnlineHost";

export const STANDARDS_NODE_ID = "s-standards";
export const STANDARDS_HREF = "/s/standards";

export const STANDARDS_DROP_KINDS = ["note", "decision", "conflict"] as const;
export type StandardsDropKind = (typeof STANDARDS_DROP_KINDS)[number];

export type StandardsDropRecord = {
  id: string;
  createdAt: string;
  kind: StandardsDropKind;
  body: string;
  source?: string;
  submittedBy: string;
};

export type StandardsMode =
  | "home"
  | "drop"
  | "design"
  | "behaviours"
  | "process"
  | "development";

const DEV_QUERY = new Set<string>([
  "development",
  "inbox",
  "kanban",
  "changelog",
  "notes",
  "spec",
  ...COLUMN_FILTERS.map((row) => row.id),
]);

export function isStandardsDevelopmentQuery(raw?: string): boolean {
  return Boolean(raw && DEV_QUERY.has(raw));
}

export function standardsMode(raw?: string): StandardsMode {
  if (isStandardsDevelopmentQuery(raw)) return "development";
  if (raw === "drop") return "drop";
  if (raw === "design") return "design";
  if (raw === "behaviours") return "behaviours";
  if (raw === "process") return "process";
  return "home";
}

export function standardsKanbanStart(raw?: string): KanbanOnlineStart {
  if (!raw || raw === "development") return "inbox";
  if (raw === "spec") return "changelog";
  if (raw === "kanban") return "kanban";
  if (raw === "inbox" || raw === "changelog" || raw === "notes") return raw;
  if (COLUMN_FILTERS.some((row) => row.id === raw)) return raw as ColumnFilterId;
  return "inbox";
}

export const DROP_KIND_LABELS: Record<StandardsDropKind, string> = {
  note: "Note",
  decision: "Decision",
  conflict: "Conflict",
};
