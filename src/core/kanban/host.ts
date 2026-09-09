import { COLUMN_FILTERS, type ColumnFilterId } from "./schema";

export type DevHostKind = "live" | "localhost" | "other";

export type DevTab = "changelog" | "notes" | "testing" | "inbox" | "spec" | ColumnFilterId;

const COLUMN_IDS = new Set<string>(COLUMN_FILTERS.map((f) => f.id));

export function isBoardDevTab(tab: DevTab): tab is ColumnFilterId {
  return COLUMN_IDS.has(tab);
}

export function parseDevTab(raw: string | undefined): DevTab {
  if (
    raw === "notes" ||
    raw === "testing" ||
    raw === "changelog" ||
    raw === "inbox" ||
    raw === "spec"
  ) {
    return raw;
  }
  if (raw === "kanban") return "all";
  if (raw && COLUMN_IDS.has(raw)) return raw as ColumnFilterId;
  return "changelog";
}

export function hostKindFromHost(host: string): DevHostKind {
  const raw = host.trim().toLowerCase();
  const h = raw.split(":")[0] || raw;
  if (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "0.0.0.0" ||
    h === "[::1]" ||
    h === "::1"
  ) {
    return "localhost";
  }
  if (h.endsWith(".azurewebsites.net") || h === "azurewebsites.net") return "live";
  return "other";
}

export function hostKindFromHeaders(headers: {
  get(name: string): string | null;
}): { kind: DevHostKind; host: string } {
  const host = headers.get("x-forwarded-host") || headers.get("host") || "";
  return { kind: hostKindFromHost(host), host };
}
