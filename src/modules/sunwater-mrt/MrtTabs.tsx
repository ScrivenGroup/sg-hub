"use client";

import { useState } from "react";

const TABS = [
  "Gantt",
  "Obligations",
  "Inputs",
  "Definitions",
  "Defaults",
] as const;

type TabId = (typeof TABS)[number];

const PLACEHOLDERS: Record<TabId, string> = {
  Gantt: "Cyclical milestone Gantt will land here after requirements lock.",
  Obligations: "Obligation status rows will land here after requirements lock.",
  Inputs: "Master lists (roles, names, dams, requirements) will land here after requirements lock.",
  Definitions:
    "Relationship tables (ownership, dam × obligations, lead times) will land here after requirements lock.",
  Defaults:
    "Assignment templates (resource types × Week 1…N) will land here after requirements lock.",
};

export function MrtTabs() {
  const [tab, setTab] = useState<TabId>("Gantt");

  return (
    <div>
      <div
        role="tablist"
        aria-label="Milestone Resourcing Tracker"
        className="flex flex-wrap gap-1 border-b border-[var(--border)]"
      >
        {TABS.map((id) => {
          const selected = id === tab;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              id={`mrt-tab-${id.toLowerCase()}`}
              aria-controls={`mrt-panel-${id.toLowerCase()}`}
              className={`min-h-11 px-3 py-2 text-sm font-medium ${
                selected
                  ? "border-b-2 border-[var(--ink)] text-[var(--ink)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
              onClick={() => setTab(id)}
            >
              {id}
            </button>
          );
        })}
      </div>

      {TABS.map((id) =>
        id === tab ? (
          <section
            key={id}
            role="tabpanel"
            id={`mrt-panel-${id.toLowerCase()}`}
            aria-labelledby={`mrt-tab-${id.toLowerCase()}`}
            className="sg-card mt-4 border-dashed"
          >
            <h2 className="text-lg font-semibold">{id}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Placeholder</p>
            <p className="mt-3 text-sm text-[var(--muted)]">{PLACEHOLDERS[id]}</p>
          </section>
        ) : null,
      )}
    </div>
  );
}
