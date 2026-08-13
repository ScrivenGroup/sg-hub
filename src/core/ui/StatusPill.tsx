import type { NodeStatus } from "@/core/contracts/types";

const labels: Record<NodeStatus, string> = {
  sketched: "Sketched",
  building: "Building",
  live: "Live",
};

export function StatusPill({ status }: { status: NodeStatus }) {
  return (
    <span className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-0.5 text-xs text-[var(--muted)]">
      {labels[status]}
    </span>
  );
}
