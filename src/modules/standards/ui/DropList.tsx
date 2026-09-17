import {
  DROP_KIND_LABELS,
  type StandardsDropRecord,
} from "../schema";

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export function DropList({ items }: { items: StandardsDropRecord[] }) {
  if (items.length === 0) {
    return (
      <div className="sg-card">
        <p className="font-medium">Nothing in the pile yet</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Parallel desks dump here. Not chrome Feedback. Not a Kanban ticket.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="sg-card">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
            <span className="rounded-full border border-[var(--border)] px-2 py-0.5 font-medium uppercase text-[var(--ink)]">
              {DROP_KIND_LABELS[item.kind]}
            </span>
            <span>{formatWhen(item.createdAt)}</span>
            {item.source ? <span>from {item.source}</span> : null}
            <span>{item.submittedBy}</span>
          </div>
          <p className="whitespace-pre-wrap text-[var(--ink)]">{item.body}</p>
        </li>
      ))}
    </ul>
  );
}
