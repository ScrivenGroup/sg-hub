"use client";

export function SubTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: readonly T[];
  value: T;
  onChange: (tab: T) => void;
}) {
  return (
    <div className="mb-3 flex flex-wrap gap-1 border-b border-[var(--border)]">
      {tabs.map((id) => (
        <button
          key={id}
          type="button"
          className={`min-h-9 px-3 text-sm ${
            value === id
              ? "border-b-2 border-[var(--ink)] font-medium"
              : "text-[var(--muted)]"
          }`}
          onClick={() => onChange(id)}
        >
          {id}
        </button>
      ))}
    </div>
  );
}

export function CrossLinks({
  links,
}: {
  links: { label: string; onClick: () => void }[];
}) {
  return (
    <p className="mb-3 flex flex-wrap items-center gap-2">
      {links.map((l) => (
        <button
          key={l.label}
          type="button"
          className="mrt-type-link"
          onClick={l.onClick}
        >
          {l.label}
        </button>
      ))}
    </p>
  );
}
