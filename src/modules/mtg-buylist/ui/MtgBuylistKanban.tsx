/** Sketched shell — columns are placeholders until a real board store lands. */
export function MtgBuylistKanban() {
  const columns = ["Backlog", "Doing", "Done"] as const;
  return (
    <div className="space-y-4">
      <div className="sg-card">
        <h2 className="mb-2 font-medium">KanBan — shell</h2>
        <p className="text-sm text-[var(--muted)]">
          Future home for each idea and task that goes into this leaf (including items that
          graduate from Development notes). No board store yet — layout only for Rev 1.0.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {columns.map((title) => (
          <section
            key={title}
            className="min-h-40 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-3"
          >
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
              {title}
            </h3>
            <p className="text-xs text-[var(--muted)]">Empty — cards land in a later version.</p>
          </section>
        ))}
      </div>
    </div>
  );
}
