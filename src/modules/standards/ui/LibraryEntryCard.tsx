import type { ReactNode } from "react";
import type { LibraryEntry, LibraryStatus } from "../catalog";
import { currentText } from "../catalog";

const STATUS_LABEL: Record<LibraryStatus, string> = {
  kit: "Kit default",
  decided: "Decided",
  gap: "Gap",
  conflict: "Conflict",
};

export function LibraryEntryCard({
  row,
  specimen,
  anchor = true,
}: {
  row: LibraryEntry;
  specimen?: ReactNode;
  anchor?: boolean;
}) {
  const decidedAway = Boolean(row.current && row.current !== row.kitDefault);
  return (
    <article className="sg-card space-y-3" id={anchor ? row.id : undefined}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">{row.title}</h3>
        <code className="font-mono text-xs text-[var(--muted)]">{row.id}</code>
        <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs font-medium uppercase">
          {STATUS_LABEL[row.status]}
        </span>
      </div>
      <p className="text-sm">
        <span className="font-medium">Use </span>
        <code className="font-mono text-xs">{row.use}</code>
      </p>
      {specimen ? <div className="flex flex-wrap items-center gap-2">{specimen}</div> : null}
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Kit default
          </dt>
          <dd className={decidedAway ? "text-[var(--muted)]" : ""}>{row.kitDefault}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Current
          </dt>
          <dd>{currentText(row)}</dd>
        </div>
      </dl>
      {row.notes ? <p className="text-sm text-[var(--muted)]">{row.notes}</p> : null}
      {row.decisions && row.decisions.length > 0 ? (
        <ul className="space-y-1 text-sm text-[var(--muted)]">
          {row.decisions.map((d) => (
            <li key={`${d.at}-${d.to}`}>
              {d.at.slice(0, 10)}: {d.from} → {d.to}. {d.why}
            </li>
          ))}
        </ul>
      ) : null}
      {row.conflicts && row.conflicts.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {row.conflicts.map((c) => (
            <li key={`${c.leaf}-${c.where}`}>
              <span className="font-medium">{c.leaf}</span>
              <span className="text-[var(--muted)]"> — {c.where}: {c.instead}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
