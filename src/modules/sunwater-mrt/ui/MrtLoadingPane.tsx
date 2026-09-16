export function MrtInlineLoading({ label }: { label: string }) {
  return (
    <div
      className="mrt-inline-loading"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="mrt-inline-loading-spin" aria-hidden />
      <span>Loading {label}…</span>
    </div>
  );
}

const GUEST_TABS = [
  "Gantt",
  "Obligations",
  "Inputs",
  "Definitions",
  "Defaults",
  "Help",
] as const;

const STAFF_TABS = [...GUEST_TABS, "Admin", "Development"] as const;

export function MrtLoadingPane({
  step,
  total,
  label,
  showDevelopment,
  showChrome = true,
}: {
  step: number;
  total: number;
  label: string;
  showDevelopment: boolean;
  showChrome?: boolean;
}) {
  const tabs = showDevelopment ? STAFF_TABS : GUEST_TABS;
  return (
    <div className="flex min-h-0 flex-1 flex-col" aria-busy="true" aria-live="polite">
      {showChrome ? (
        <div className="sticky top-0 z-30 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--page)] pt-1">
          <div
            role="tablist"
            aria-label="Milestone Resourcing Tracker"
            className="flex flex-wrap gap-1"
          >
            {tabs.map((id) => {
              const selected = id === "Gantt";
              return (
                <span
                  key={id}
                  role="tab"
                  aria-selected={selected}
                  aria-disabled="true"
                  className={`min-h-10 px-3 py-1.5 text-sm font-medium ${
                    selected
                      ? "border-b-2 border-[var(--ink)] text-[var(--ink)]"
                      : "text-[var(--muted)]"
                  }`}
                >
                  {id}
                </span>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col gap-3 pt-6">
        <p className="text-sm text-[var(--muted)]">
          Loading {label}… {step} of {total}
        </p>
        <div className="h-2 w-48 animate-pulse rounded bg-[var(--surface-muted)]" />
        <div className="sg-card h-28 animate-pulse" />
      </div>
    </div>
  );
}
