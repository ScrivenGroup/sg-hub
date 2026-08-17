"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { saveSunwaterMrtStoreAction } from "../actions";
import type { ScheduleStore } from "../schema";
import { DefaultsTab } from "./DefaultsTab";
import { GanttTab } from "./GanttTab";
import { ObligationsTab } from "./ObligationsTab";
import { PeopleTab } from "./PeopleTab";

const TABS = ["Gantt", "Obligations", "People", "Defaults"] as const;
type TabId = (typeof TABS)[number];

export function MrtWorkspace({ initialStore }: { initialStore: ScheduleStore }) {
  const [tab, setTab] = useState<TabId>("Gantt");
  const [store, setStore] = useState(initialStore);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function persist(next: ScheduleStore) {
    setStore(next);
    setSaveState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      startTransition(async () => {
        const result = await saveSunwaterMrtStoreAction(next);
        setSaveState(result.ok ? "saved" : "error");
      });
    }, 400);
  }

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
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
        <p className="text-xs text-[var(--muted)]">
          {saveState === "saving"
            ? "Saving…"
            : saveState === "saved"
              ? "Saved"
              : saveState === "error"
                ? "Save failed"
                : "Store v1"}
        </p>
      </div>

      {tab === "Gantt" ? <GanttTab store={store} onChange={persist} /> : null}
      {tab === "Obligations" ? (
        <ObligationsTab store={store} onChange={persist} />
      ) : null}
      {tab === "People" ? <PeopleTab store={store} onChange={persist} /> : null}
      {tab === "Defaults" ? (
        <DefaultsTab store={store} onChange={persist} />
      ) : null}
    </div>
  );
}
