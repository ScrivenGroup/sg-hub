"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { ChangelogEntry } from "@/core/contracts/types";
import { saveSunwaterMrtStoreAction } from "../actions";
import type { ScheduleStore } from "../schema";
import { DefaultsTab } from "./DefaultsTab";
import { DefinitionsTab, type DefinitionsSub } from "./DefinitionsTab";
import { DevelopmentTab } from "./DevelopmentTab";
import { GanttTab, type GanttOccurrenceFocus } from "./GanttTab";
import { InputsTab, type InputsSub } from "./InputsTab";
import { ObligationsTab } from "./ObligationsTab";
import "./mrt-tables.css";

const BASE_TABS = [
  "Gantt",
  "Obligations",
  "Inputs",
  "Definitions",
  "Defaults",
] as const;

export function MrtWorkspace({
  initialStore,
  changelogs,
  showDevelopment,
  readOnly = false,
  sandbox = false,
}: {
  initialStore: ScheduleStore;
  changelogs: ChangelogEntry[];
  showDevelopment: boolean;
  readOnly?: boolean;
  sandbox?: boolean;
}) {
  const tabs = showDevelopment && !readOnly
    ? ([...BASE_TABS, "Development"] as const)
    : BASE_TABS;
  const [tab, setTab] = useState<string>("Gantt");
  const [defaultsLane, setDefaultsLane] = useState<string | null>(null);
  const [inputsSub, setInputsSub] = useState<InputsSub | null>(null);
  const [defsSub, setDefsSub] = useState<DefinitionsSub | null>(null);
  const [ganttFocus, setGanttFocus] = useState<GanttOccurrenceFocus | null>(null);
  const [store, setStore] = useState(initialStore);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function persist(next: ScheduleStore) {
    if (readOnly) return;
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
    <div className="flex min-h-0 flex-1 flex-col">
      {sandbox ? (
        <p className="shrink-0 pb-1 text-[11px] text-[var(--muted)]">
          Demo copy — click and drag as you like. Changes stay in this session
          and do not update the live plan.
        </p>
      ) : null}
      <div className="sticky top-0 z-30 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--page)] pt-1">
        <div
          role="tablist"
          aria-label="Milestone Resourcing Tracker"
          className="flex flex-wrap gap-1"
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

      <div
        className={`flex min-h-0 flex-1 flex-col pt-2 ${
          tab === "Gantt" ? "overflow-hidden" : "overflow-auto"
        }`}
      >
      {tab === "Gantt" ? (
        <GanttTab
          store={store}
          onChange={persist}
          readOnly={readOnly}
          focusOccurrence={ganttFocus}
          onFocusConsumed={() => setGanttFocus(null)}
          onGoToDefaults={(laneCode) => {
            setDefaultsLane(laneCode);
            setTab("Defaults");
          }}
        />
      ) : null}
      {tab === "Obligations" ? (
        <ObligationsTab
          store={store}
          onChange={persist}
          onGoToDefaults={(laneCode) => {
            setDefaultsLane(laneCode);
            setTab("Defaults");
          }}
          onGoToGantt={(focus) => {
            setGanttFocus(focus);
            setTab("Gantt");
          }}
        />
      ) : null}
      {tab === "Inputs" ? (
        <InputsTab
          store={store}
          onChange={persist}
          focusSub={inputsSub}
          onGoToDefinitions={(sub) => {
            setDefsSub(sub);
            setTab("Definitions");
          }}
        />
      ) : null}
      {tab === "Definitions" ? (
        <DefinitionsTab
          store={store}
          onChange={persist}
          focusSub={defsSub}
          onGoToInputs={(sub) => {
            setInputsSub(sub);
            setTab("Inputs");
          }}
        />
      ) : null}
      {tab === "Defaults" ? (
        <DefaultsTab
          store={store}
          onChange={persist}
          focusLane={defaultsLane}
          onGoToInputs={(sub) => {
            setInputsSub(sub);
            setTab("Inputs");
          }}
        />
      ) : null}
      {tab === "Development" ? (
        <DevelopmentTab
          changelogs={changelogs}
          store={store}
          onChange={persist}
        />
      ) : null}
      </div>
    </div>
  );
}
