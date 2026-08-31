"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { ChangelogEntry } from "@/core/contracts/types";
import { saveSunwaterMrtStoreAction, saveGuestMrtSandboxAction, resetMrtSandboxAction } from "../actions";
import type { ScheduleStore } from "../schema";
import { AdminTab } from "./AdminTab";
import { DefaultsTab } from "./DefaultsTab";
import { DefinitionsTab, type DefinitionsSub } from "./DefinitionsTab";
import { DevelopmentTab } from "./DevelopmentTab";
import { GanttTab, type GanttOccurrenceFocus } from "./GanttTab";
import { HelpTab } from "./HelpTab";
import { InputsTab, type InputsSub } from "./InputsTab";
import { ObligationsTab } from "./ObligationsTab";
import "./mrt-tables.css";

const BASE_TABS = [
  "Gantt",
  "Obligations",
  "Inputs",
  "Definitions",
  "Defaults",
  "Help",
] as const;

type ReturnNav = {
  tab: string;
  inputsSub?: InputsSub | null;
  defsSub?: DefinitionsSub | null;
  defaultsLane?: string | null;
};

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
    ? ([...BASE_TABS, "Admin", "Development"] as const)
    : BASE_TABS;
  const [tab, setTab] = useState<string>("Gantt");
  const [defaultsLane, setDefaultsLane] = useState<string | null>(null);
  const [inputsSub, setInputsSub] = useState<InputsSub | null>(null);
  const [focusPersonId, setFocusPersonId] = useState<string | null>(null);
  const [defsSub, setDefsSub] = useState<DefinitionsSub | null>(null);
  const [ganttFocus, setGanttFocus] = useState<GanttOccurrenceFocus | null>(null);
  const [returnStack, setReturnStack] = useState<ReturnNav[]>([]);
  const [store, setStore] = useState(initialStore);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [, startTransition] = useTransition();
  const [resetting, startReset] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function persist(next: ScheduleStore) {
    if (readOnly) return;
    setStore(next);
    setSaveState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      startTransition(async () => {
        const result = sandbox
          ? await saveGuestMrtSandboxAction(next)
          : await saveSunwaterMrtStoreAction(next);
        setSaveState(result.ok ? "saved" : "error");
      });
    }, 400);
  }

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function pushReturn() {
    setReturnStack((stack) => [
      ...stack,
      {
        tab,
        inputsSub,
        defsSub,
        defaultsLane,
      },
    ]);
  }

  function goBackInMrt() {
    setReturnStack((stack) => {
      if (stack.length === 0) {
        if (typeof window !== "undefined" && window.history.length > 1) {
          window.history.back();
        }
        return stack;
      }
      const prev = stack[stack.length - 1];
      setTab(prev.tab);
      setInputsSub(prev.inputsSub ?? null);
      setDefsSub(prev.defsSub ?? null);
      setDefaultsLane(prev.defaultsLane ?? null);
      setFocusPersonId(null);
      setGanttFocus(null);
      return stack.slice(0, -1);
    });
  }

  function resetToLive() {
    startReset(async () => {
      const result = await resetMrtSandboxAction();
      if (result.ok) {
        setStore(result.store);
        setSaveState("idle");
      } else {
        setSaveState("error");
      }
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {sandbox ? (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 pb-1">
          <p className="text-[11px] text-[var(--muted)]">
            Demo copy keyed by your name and network. Changes do not update the
            live plan. Reset restores the current live copy.
          </p>
          <button
            type="button"
            className="sg-btn-ghost min-h-8 px-2 text-xs"
            onClick={resetToLive}
            disabled={resetting}
          >
            {resetting ? "Resetting…" : "Reset to live plan"}
          </button>
        </div>
      ) : null}
      <div className="sticky top-0 z-30 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--page)] pt-1 print:hidden">
        <div
          role="tablist"
          aria-label="Milestone Resourcing Tracker"
          className="flex flex-wrap gap-1"
        >
          <button
            type="button"
            className="min-h-10 px-2 py-1.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)]"
            onClick={goBackInMrt}
            title={
              returnStack.length > 0
                ? "Return to previous MRT tab"
                : "Browser back"
            }
          >
            ← Back
          </button>
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
                onClick={() => {
                  setTab(id);
                  setFocusPersonId(null);
                }}
              >
                {id}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
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
      </div>

      <div
        className={`flex min-h-0 flex-1 flex-col pt-2 ${
          tab === "Gantt" || tab === "Development"
            ? "overflow-hidden"
            : "overflow-auto"
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
            pushReturn();
            setDefaultsLane(laneCode);
            setTab("Defaults");
          }}
          onGoToPerson={(personId) => {
            pushReturn();
            setInputsSub("Resource Names");
            setFocusPersonId(personId);
            setTab("Inputs");
          }}
        />
      ) : null}
      {tab === "Obligations" ? (
        <ObligationsTab
          store={store}
          onChange={persist}
          readOnly={readOnly}
          onGoToDefaults={(laneCode) => {
            pushReturn();
            setDefaultsLane(laneCode);
            setTab("Defaults");
          }}
          onGoToGantt={(focus) => {
            pushReturn();
            setGanttFocus(focus);
            setTab("Gantt");
          }}
        />
      ) : null}
      {tab === "Inputs" ? (
        <InputsTab
          store={store}
          onChange={persist}
          readOnly={readOnly}
          focusSub={inputsSub}
          focusPersonId={focusPersonId}
          onGoToDefinitions={(sub) => {
            pushReturn();
            setDefsSub(sub);
            setTab("Definitions");
          }}
        />
      ) : null}
      {tab === "Definitions" ? (
        <DefinitionsTab
          store={store}
          onChange={persist}
          readOnly={readOnly}
          focusSub={defsSub}
          onGoToInputs={(sub) => {
            pushReturn();
            setInputsSub(sub);
            setFocusPersonId(null);
            setTab("Inputs");
          }}
        />
      ) : null}
      {tab === "Defaults" ? (
        <DefaultsTab
          store={store}
          onChange={persist}
          readOnly={readOnly}
          focusLane={defaultsLane}
          onGoToInputs={(sub) => {
            pushReturn();
            setInputsSub(sub);
            setFocusPersonId(null);
            setTab("Inputs");
          }}
        />
      ) : null}
      {tab === "Help" ? (
        <HelpTab
          showStaffNotes={showDevelopment && !readOnly}
          sandbox={sandbox}
        />
      ) : null}
      {tab === "Admin" ? <AdminTab /> : null}
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
