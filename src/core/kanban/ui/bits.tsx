import type { LivePresence } from "../fingerprint";
import { COLUMN_ACCENT } from "../schema";

export const PRESENCE_LABEL: Record<LivePresence, string> = {
  "on-live": "On live",
  "on-live-diff": "On live · local diff",
  "local-only": "Local only",
  unknown: "No live baseline",
};

export type SortKey = "date-desc" | "date-asc" | "title-asc" | "title-desc";

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function clipText(s: string, n: number) {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n).replace(/\s+\S*$/, "")}…`;
}

export function sortItems<T extends { title: string; createdAt: string; updatedAt: string }>(
  items: T[],
  sort: SortKey,
): T[] {
  const next = items.slice();
  next.sort((a, b) => {
    if (sort === "title-asc") return a.title.localeCompare(b.title);
    if (sort === "title-desc") return b.title.localeCompare(a.title);
    const da = new Date(a.updatedAt || a.createdAt).getTime();
    const db = new Date(b.updatedAt || b.createdAt).getTime();
    return sort === "date-asc" ? da - db : db - da;
  });
  return next;
}

export function PresenceChip({
  presence,
  show,
}: {
  presence: LivePresence;
  show: boolean;
}) {
  if (!show || presence === "unknown") return null;
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{
        background:
          presence === "on-live-diff"
            ? "var(--rag-amber)"
            : presence === "on-live"
              ? "color-mix(in srgb, var(--rag-green) 22%, transparent)"
              : "color-mix(in srgb, var(--ink) 10%, transparent)",
        color: presence === "on-live-diff" ? "var(--page)" : "var(--ink)",
      }}
      title="This item already exists on live. Changing it here creates a publish diff."
    >
      {PRESENCE_LABEL[presence]}
    </span>
  );
}

export function HatInbox() {
  return (
    <span
      className="inline-block shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{ color: COLUMN_ACCENT.inbox, borderColor: COLUMN_ACCENT.inbox }}
    >
      Inbox
    </span>
  );
}
