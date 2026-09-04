export type DevHostKind = "live" | "localhost" | "other";

export type DevTab = "changelog" | "notes" | "kanban" | "inbox";

export function parseDevTab(raw: string | undefined): DevTab {
  if (raw === "notes" || raw === "kanban" || raw === "changelog" || raw === "inbox") {
    return raw;
  }
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
