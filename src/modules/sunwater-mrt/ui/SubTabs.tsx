"use client";

import type { ReactNode } from "react";

export function PageIntro({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 text-xs leading-snug text-[var(--muted)]">{children}</p>
  );
}

export function SubTabs<T extends string>({
  tabs,
  value,
  onChange,
  intro,
}: {
  tabs: readonly T[];
  value: T;
  onChange: (tab: T) => void;
  intro?: ReactNode;
}) {
  return (
    <div className={intro ? "mb-1" : "mb-3"}>
      <div className="flex flex-wrap gap-1 border-b border-[var(--border)]">
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
      {intro ? <PageIntro>{intro}</PageIntro> : null}
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
          className="mrt-type-link"
          onClick={l.onClick}
          type="button"
        >
          {l.label}
        </button>
      ))}
    </p>
  );
}
