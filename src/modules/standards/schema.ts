import { COLUMN_FILTERS } from "@/core/kanban/schema";
import type { KanbanOnlineStart } from "@/core/kanban/ui/KanbanOnlineHost";

export const STANDARDS_NODE_ID = "s-standards";
export const STANDARDS_HREF = "/s/standards";

/** Latest pick per library object. One value, no history. */
export type StandardsChoices = Record<string, string>;

export const STANDARDS_HOLD_KINDS = ["note", "conflict", "idea"] as const;
export type StandardsHoldKind = (typeof STANDARDS_HOLD_KINDS)[number];

export type StandardsHoldRecord = {
  id: string;
  createdAt: string;
  kind: StandardsHoldKind;
  body: string;
  source?: string;
  submittedBy: string;
};

export const HOLD_KIND_LABELS: Record<StandardsHoldKind, string> = {
  note: "Note",
  conflict: "Conflict",
  idea: "Idea",
};

export type StandardsMode =
  | "home"
  | "design"
  | "behaviours"
  | "process"
  | "development";

const DEV_QUERY = new Set<string>([
  "development",
  "requirements",
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
  if (raw === "design") return "design";
  if (raw === "behaviours") return "behaviours";
  if (raw === "process") return "process";
  return "home";
}

export function standardsKanbanStart(raw?: string): KanbanOnlineStart {
  if (!raw || raw === "development") return "inbox";
  if (raw === "spec") return "changelog";
  if (raw === "kanban") return "kanban";
  if (raw === "requirements" || raw === "inbox" || raw === "changelog" || raw === "notes") return raw;
  if (COLUMN_FILTERS.some((row) => row.id === raw)) return "kanban";
  return "inbox";
}
