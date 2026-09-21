"use client";

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import type { EffortDemo, EffortStick, ScheduleStore } from "../schema";
import type { LoadContribution } from "../logic/resource-load";
import {
  alignDemosToSharedWindow,
  loadBaselineOccurrenceDemo,
  loadOccurrenceEffortDemo,
  occurrenceStackHeading,
  writeOccurrenceEffortDemo,
} from "../logic/occurrence-effort";
import {
  demoWeeks,
  mergePersonWeekLoads,
  personWeekLoad,
  setStick,
  type EffortGroupMode,
} from "../logic/effort-gantt";
import {
  ALL_META,
  EffortGantt,
  EffortLoadSummary,
  EffortWeekPxProvider,
  WEEK_PX_DEFAULT,
  WeekZoomChip,
  effortChromeWidths,
  readEffortWeekPx,
  scrollEffortChartToSpan,
  toggleEffortUiClass,
  type MetaCols,
} from "./EffortGantt";
import { EffortPopupShell } from "./EffortPopupShell";
import { MrtInlineLoading } from "./MrtLoadingPane";
import { BusySpin, usePaintedBusy } from "./paint-busy";

export function StackedEffortModal({
  store,
  contributions,
  personId,
  onClose,
  onChange,
  readOnly = false,
}: {
  store: ScheduleStore;
  contributions: LoadContribution[];
  personId?: string;
  onClose: () => void;
  onChange: (store: ScheduleStore) => void;
  readOnly?: boolean;
}) {
  const storeRef = useRef(store);
  storeRef.current = store;

  const [chartsReady, setChartsReady] = useState(false);
  const [demos, setDemos] = useState<EffortDemo[]>([]);
  const demosRef = useRef(demos);
  demosRef.current = demos;

  useEffect(() => {
    let cancelled = false;
    let inner = 0;
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => {
        if (cancelled) return;
        const loaded = contributions.map((c) =>
          loadOccurrenceEffortDemo(storeRef.current, c.damId, c.laneCode, c.procDueIdx),
        );
        const aligned = alignDemosToSharedWindow(
          storeRef.current,
          contributions,
          loaded,
        );
        demosRef.current = aligned;
        setDemos(aligned);
        setChartsReady(true);
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(outer);
      window.cancelAnimationFrame(inner);
    };
    // Load once after the shell paints. Do not block first paint on demos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const baselines = useMemo(
    () =>
      contributions.map((c) =>
        loadBaselineOccurrenceDemo(store, c.damId, c.laneCode, c.procDueIdx),
      ),
    // Snapshot when the popup opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contributions.map((c) => `${c.damId}|${c.laneCode}|${c.procDueIdx}`).join(";")],
  );

  const [mode, setMode] = useState<EffortGroupMode>("task-res");
  const [metaCols, setMetaCols] = useState<MetaCols>(ALL_META);
  const [colsOpen, setColsOpen] = useState(false);
  const [focusPerson, setFocusPerson] = useState<string | null>(personId || null);

  const pmOn = !!store.projectManagement;
  const widths = effortChromeWidths(mode, metaCols, pmOn, true);
  const axisDemo = demos[0];
  const weeks = useMemo(
    () => (axisDemo ? demoWeeks(axisDemo, false) : []),
    [axisDemo],
  );
  const weekLoad = useMemo(
    () => mergePersonWeekLoads(demos.map((d) => personWeekLoad(d)), weeks.length),
    [demos, weeks.length],
  );

  useEffect(() => {
    if (!colsOpen) return;
    function onDown(e: PointerEvent) {
      const t = e.target as HTMLElement;
      if (t.closest("[data-mrt-cols-pop]") || t.closest("[data-mrt-cols-btn]")) return;
      setColsOpen(false);
    }
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [colsOpen]);

  function saveAll(base: ScheduleStore) {
    let next = base;
    contributions.forEach((c, i) => {
      const demo = demosRef.current[i];
      if (!demo) return;
      next = writeOccurrenceEffortDemo(
        next,
        c.damId,
        c.laneCode,
        c.procDueIdx,
        demo,
      );
    });
    return next;
  }

  function patchDemo(index: number, nextDemo: EffortDemo) {
    const aligned = alignDemosToSharedWindow(
      storeRef.current,
      contributions,
      demosRef.current.map((d, i) => (i === index ? nextDemo : d)),
    );
    demosRef.current = aligned;
    setDemos(aligned);
  }

  function persistStore(incoming: ScheduleStore) {
    storeRef.current = incoming;
    onChange(incoming);
  }

  function applyStick(id: EffortStick) {
    const next = alignDemosToSharedWindow(
      storeRef.current,
      contributions,
      demosRef.current.map((d) => setStick(d, id)),
    );
    demosRef.current = next;
    setDemos(next);
  }

  function saveAssignment() {
    if (readOnly) return;
    const merged = saveAll(storeRef.current);
    storeRef.current = merged;
    onChange(merged);
  }

  const stick = axisDemo?.stick || "tail-start";

  const toolbar = (
    <StackedEffortToolbar
      mode={mode}
      stick={stick}
      metaCols={metaCols}
      colsOpen={colsOpen}
      pmOn={pmOn}
      setMode={setMode}
      applyStick={applyStick}
      setMetaCols={setMetaCols}
      setColsOpen={setColsOpen}
      persistStore={persistStore}
      storeRef={storeRef}
      demosRef={demosRef}
    />
  );

  return (
    <EffortPopupShell
      onClose={onClose}
      title={<h2 className="text-xl font-semibold">Rebalance stacked obligations</h2>}
      subtitle={
        <p className="text-sm text-[var(--muted)]">
          Shared week axis. Edit planned hours by hand. Heatmap stays planned
          hours — no auto-leveling.
        </p>
      }
      toolbar={toolbar}
      footer={
        <div className="mrt-occ-foot mt-2 flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[var(--border)] pt-2">
          <button
            type="button"
            className="mrt-btn-primary"
            disabled={readOnly}
            onClick={saveAssignment}
          >
            Save assignment
          </button>
          <button
            type="button"
            className="mrt-btn-primary"
            disabled={readOnly}
            onClick={() => {
              saveAssignment();
              onClose();
            }}
          >
            Save and Close
          </button>
        </div>
      }
    >
      <EffortWeekPxProvider weekPx={WEEK_PX_DEFAULT}>
          {!chartsReady ? (
            <div className="px-1 py-8">
              <MrtInlineLoading label="charts" />
            </div>
          ) : (
            <>
          {contributions.map((c, i) => (
            <section
              key={`${c.damId}|${c.laneCode}|${c.procDueIdx}`}
              className="mrt-stacked-pane"
            >
              {demos[i] ? (
                <EffortGantt
                  store={store}
                  onChange={persistStore}
                  demo={demos[i]}
                  onDemoChange={(d) => patchDemo(i, d)}
                  lockedPlace="milestone"
                  readOnly={readOnly}
                  toolbarNote={null}
                  baselineDemo={baselines[i]}
                  initialFocusPerson={personId}
                  hideToolbar
                  hideSummary
                  hideWeekHeader={i > 0}
                  stackedCompact
                  milestoneCaption={occurrenceStackHeading(store, c)}
                  centreAlign="start"
                  mode={mode}
                  onMode={setMode}
                  metaCols={metaCols}
                  onMetaCols={setMetaCols}
                  redHover
                />
              ) : null}
            </section>
          ))}
          {axisDemo ? (
            <EffortLoadSummary
              store={store}
              demo={axisDemo}
              weeks={weeks}
              weekLoad={weekLoad}
              roleDemos={demos}
              focusPerson={focusPerson}
              onFocus={setFocusPerson}
              metaCols={metaCols}
              onMetaCols={setMetaCols}
              nameW={widths.nameW}
              labelW={widths.labelW}
              n={weeks.length}
              pmOn={pmOn}
              redHover
            />
          ) : null}
            </>
          )}
      </EffortWeekPxProvider>
    </EffortPopupShell>
  );
}

function StackedEffortToolbar({
  mode,
  stick,
  metaCols,
  colsOpen,
  pmOn,
  setMode,
  applyStick,
  setMetaCols,
  setColsOpen,
  persistStore,
  storeRef,
  demosRef,
}: {
  mode: EffortGroupMode;
  stick: EffortStick;
  metaCols: MetaCols;
  colsOpen: boolean;
  pmOn: boolean;
  setMode: (mode: EffortGroupMode) => void;
  applyStick: (id: EffortStick) => void;
  setMetaCols: (next: MetaCols | ((cur: MetaCols) => MetaCols)) => void;
  setColsOpen: (next: boolean | ((cur: boolean) => boolean)) => void;
  persistStore: (store: ScheduleStore) => void;
  storeRef: MutableRefObject<ScheduleStore>;
  demosRef: MutableRefObject<EffortDemo[]>;
}) {
  const { busyId: toolBusy, run: runTool } = usePaintedBusy();
  const rootRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={rootRef} className="flex flex-wrap items-center gap-2">
      <div className="mrt-gantt-tools rounded-md border border-[var(--border)]">
        {(
          [
            ["task-res", "Task > Role"],
            ["res-task", "Role > Task"],
            ["flat", "Flat"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`mrt-gantt-tool ${mode === id ? "on" : ""}`}
            aria-busy={toolBusy === id}
            disabled={!!toolBusy}
            onClick={() => {
              runTool(id, () => {
                setMode(id);
                toggleEffortUiClass(rootRef.current, "is-all-collapsed", false);
              });
            }}
          >
            <BusySpin on={toolBusy === id} />
            {label}
          </button>
        ))}
      </div>
      <div className="mrt-gantt-tools rounded-md border border-[var(--border)]">
        {(
          [
            ["unstick", "Unstick"],
            ["tail-start", "Tail start"],
            ["tail-end", "Tail end"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`mrt-gantt-tool ${stick === id ? "on" : ""}`}
            aria-busy={toolBusy === id}
            disabled={!!toolBusy}
            onClick={() => runTool(id, () => applyStick(id))}
          >
            <BusySpin on={toolBusy === id} />
            {label}
          </button>
        ))}
      </div>
      <div className="mrt-gantt-tools rounded-md border border-[var(--border)]">
        <div className="relative inline-flex items-center" data-mrt-cols-pop>
          <button
            type="button"
            data-mrt-cols-btn
            className={`mrt-gantt-tool${colsOpen ? " on" : ""}`}
            onClick={() => setColsOpen((v) => !v)}
          >
            Columns
          </button>
          {colsOpen ? (
            <div className="mrt-cols-pop">
              {(
                [
                  ["start", "Start"],
                  ["finish", "Finish"],
                  ["duration", "Duration"],
                  ["hours", "Hours"],
                  ["totalCost", "Total Cost"],
                ] as const
              ).map(([id, label]) => (
                <label key={id} className="flex items-center gap-2 text-[11px]">
                  <input
                    type="checkbox"
                    checked={metaCols[id]}
                    onChange={() =>
                      setMetaCols((cur) => ({ ...cur, [id]: !cur[id] }))
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div className="mrt-gantt-tools rounded-md border border-[var(--border)]">
        <button
          type="button"
          className="mrt-gantt-tool"
          title="Scroll to the start of the shared timeline"
          aria-busy={toolBusy === "centre"}
          disabled={!!toolBusy}
          onClick={() =>
            runTool("centre", () => {
              const popup = rootRef.current && effortPopupFrom(rootRef.current);
              const box = popup?.querySelector(".mrt-effort-timescale") as HTMLElement | null;
              const demo = demosRef.current[0];
              if (!box || !demo) return;
              scrollEffortChartToSpan(box, demo, readEffortWeekPx(popup), "start");
            })
          }
        >
          <BusySpin on={toolBusy === "centre"} />
          Centre around Gantt
        </button>
        <button
          type="button"
          className="mrt-gantt-tool"
          disabled={mode === "flat" || !!toolBusy}
          aria-busy={toolBusy === "collapse"}
          onClick={() =>
            runTool("collapse", () => {
              toggleEffortUiClass(rootRef.current, "is-all-collapsed");
            })
          }
        >
          <BusySpin on={toolBusy === "collapse"} />
          <span className="effort-collapse-label-off">Collapse</span>
          <span className="effort-collapse-label-on">Expand</span>
        </button>
        <button
          type="button"
          className="mrt-gantt-tool"
          data-effort-avail
          aria-busy={toolBusy === "availability"}
          disabled={!!toolBusy}
          onClick={() =>
            runTool("availability", () => {
              toggleEffortUiClass(rootRef.current, "is-avail");
            })
          }
        >
          <BusySpin on={toolBusy === "availability"} />
          Availability
        </button>
      </div>
      <WeekZoomChip weekPx={WEEK_PX_DEFAULT} onWeekPx={() => {}} />
      <div className="mrt-gantt-tools rounded-md border border-[var(--border)]">
        <label
          className="mrt-gantt-tool inline-flex cursor-pointer items-center gap-1.5"
          title="Show status, actuals, forecast at completion, and variation"
        >
          <input
            type="checkbox"
            checked={pmOn}
            onChange={() => {
              const next = JSON.parse(JSON.stringify(storeRef.current)) as ScheduleStore;
              next.projectManagement = !next.projectManagement;
              persistStore(next);
            }}
          />
          Enable Project Management
        </label>
      </div>
    </div>
  );
}

function effortPopupFrom(from: HTMLElement) {
  return from.closest(".mrt-effort-popup") as HTMLElement | null;
}
