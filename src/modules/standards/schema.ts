import { COLUMN_FILTERS, type ColumnFilterId } from "@/core/kanban/schema";
import type { KanbanOnlineStart } from "@/core/kanban/ui/KanbanOnlineHost";

export const STANDARDS_NODE_ID = "s-standards";
export const STANDARDS_HREF = "/s/standards";

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

export function standardsKanbanStart(raw?: string): KanbanOnlineStart {
  if (!raw || raw === "development" || raw === "process") return "inbox";
  if (raw === "spec") return "changelog";
  if (raw === "kanban") return "kanban";
  if (raw === "inbox" || raw === "changelog" || raw === "notes") return raw;
  if (COLUMN_FILTERS.some((row) => row.id === raw)) return raw as ColumnFilterId;
  return "inbox";
}
