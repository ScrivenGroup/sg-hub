"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { ChangelogEntry } from "@/core/contracts/types";
import { saveSunwaterMrtStoreAction } from "../actions";
import type { ScheduleStore } from "../schema";
import { DefaultsTab } from "./DefaultsTab";
import { DefinitionsTab } from "./DefinitionsTab";
import { DevelopmentTab } from "./DevelopmentTab";
import { GanttTab } from "./GanttTab";
import { InputsTab } from "./InputsTab";

const BASE_TABS = ["Gantt", "Inputs", "Definitions", "Defaults"] as const;

export function MrtWorkspace({
  initialStore,
  changelogs,
  showDevelopment,
}: {
  initialStore: ScheduleStore;
  changelogs: ChangelogEntry[];
  showDevelopment: boolean;
}) {
  const tabs = showDevelopment
    ? ([...BASE_TABS, "Development"] as const)
    : BASE_TABS;
  const [tab, setTab] = useState<string>("Gantt");
  const [store, setStore] = useState(initialStore);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
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
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div
          role="tablist"
          aria-label="Milestone Resourcing Tracker"
          className="flex flex-wrap gap-1 border-b border-[var(--border)]"
        >
          {tabs.map((id) => {
            const selected = id === tab;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={selected}
                className={`min-h-10 px-3 py-1.5 text-sm font-medium ${
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
                : ""}
        </p>
      </div>

      {tab === "Gantt" ? <GanttTab store={store} onChange={persist} /> : null}
      {tab === "Inputs" ? <InputsTab store={store} onChange={persist} /> : null}
      {tab === "Definitions" ? (
        <DefinitionsTab store={store} onChange={persist} />
      ) : null}
      {tab === "Defaults" ? (
        <DefaultsTab store={store} onChange={persist} />
      ) : null}
      {tab === "Development" ? (
        <DevelopmentTab changelogs={changelogs} />
      ) : null}
    </div>
  );
}
