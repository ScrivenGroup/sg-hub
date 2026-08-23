"use client";

import { useMemo, useState } from "react";
import type { EffortDemo, ScheduleStore } from "../schema";
import {
  leadMonthsFromTailWeeks,
  occurrenceWeekWindow,
  seedPlanFromDefaults,
} from "../logic/assignment";
import {
  defaultDueDayForIdx,
  fullDateLabel,
  idxDayToDate,
  monthIndex,
} from "../logic/dates";
import {
  ensureEffortDemo,
  syncHoursOriginToWindow,
} from "../logic/effort-gantt";
import {
  assignmentPlanToEffortDemo,
  effortDemoToAssignmentPlan,
} from "../logic/plan-effort-bridge";
import {
  effectiveDueIdx,
  isCompleted,
  isScheduled,
  isUserNotRequired,
  schedKey,
  storeWindow,
  type GanttMarker,
} from "../logic/scheduling";
import { planStatusKind, planStatusLabel } from "../logic/status";
import { EffortGantt } from "./EffortGantt";
import { EffortPopupShell } from "./EffortPopupShell";

function dueYmd(
  dueIdx: number,
  dueDay: number,
  winStart: { y: number; m: number },
) {
  const dt = idxDayToDate(dueIdx, dueDay, winStart);
  return { y: dt.y, m: dt.m1, d: dt.d };
}

function weekOrigin(weeks: { y?: number; m1?: number; d?: number }[] | { label: string }[]) {
  const w = weeks[0] as { y?: number; m1?: number; d?: number } | undefined;
  if (!w?.y || !w.m1 || !w.d) return undefined;
  return { y: w.y, m: w.m1, d: w.d };
}

function statusChipClass(kind: ReturnType<typeof planStatusKind>) {
  if (kind === "completed") return "mrt-chip mrt-chip-complete";
  if (kind === "notRequired") return "mrt-chip mrt-chip-not-required";
  if (kind === "scheduled") return "mrt-chip mrt-chip-scheduled";
  return "mrt-chip mrt-chip-predicted";
}

function demoFromPlan(
  store: ScheduleStore,
  damId: string,
  laneCode: string,
  plan: ScheduleStore["scheduledDetails"][string]["plan"],
  due: { y: number; m: number; d: number },
  weeks: { length: number; 0?: { y?: number; m1?: number; d?: number } },
  tailWeeks?: number,
  saved?: ScheduleStore["scheduledDetails"][string],
) {
  const origin = weekOrigin(weeks as { y?: number; m1?: number; d?: number }[]);
  return assignmentPlanToEffortDemo(
    plan || seedPlanFromDefaults(store, laneCode, weeks.length, damId),
    {
      due,
      tailWeeks: Math.max(1, tailWeeks ?? weeks.length),
      windowStart: saved?.windowStart || origin,
      hoursOrigin: saved?.windowStart || origin,
      stick: saved?.stick || "tail-start",
      people: store.people,
    },
  );
}

export function OccurrenceModal({
  store,
  marker,
  onClose,
  onChange,
  readOnly = false,
  onGoToDefaults,
}: {
  store: ScheduleStore;
  marker: GanttMarker;
  onClose: () => void;
  onChange: (store: ScheduleStore) => void;
  readOnly?: boolean;
  onGoToDefaults?: (laneCode: string) => void;
}) {
  const dam = store.dams.find((d) => d.id === marker.damId)!;
  const lane = store.lanes.find((l) => l.code === marker.laneCode)!;
  const key = schedKey(dam.id, lane.code, marker.procDueIdx);
  const sd = store.scheduledDetails[key] || {};
  const weeks = occurrenceWeekWindow(store, dam.id, lane.code, marker.procDueIdx);
  const dueIdx = effectiveDueIdx(store, dam, lane, marker.procDueIdx);
  const kind = planStatusKind(
    isScheduled(store, dam, lane, marker.procDueIdx),
    isCompleted(store, dam, lane, marker.procDueIdx),
    isUserNotRequired(store, dam, lane, marker.procDueIdx),
  );

  const winStart = storeWindow(store).start;
  const dueDay = sd.dueDayOverride ?? defaultDueDayForIdx(dueIdx, winStart);
  const procDay = defaultDueDayForIdx(marker.procDueIdx, winStart);
  const due = dueYmd(dueIdx, dueDay, winStart);

  const baselineDemo = useMemo(() => {
    const clone = JSON.parse(JSON.stringify(store)) as ScheduleStore;
    delete clone.scheduledDetails[key];
    const baseWeeks = occurrenceWeekWindow(
      clone,
      dam.id,
      lane.code,
      marker.procDueIdx,
    );
    const baseDueIdx = effectiveDueIdx(clone, dam, lane, marker.procDueIdx);
    const baseDueDay = defaultDueDayForIdx(baseDueIdx, winStart);
    const baseDue = dueYmd(baseDueIdx, baseDueDay, winStart);
    const seeded = seedPlanFromDefaults(
      clone,
      lane.code,
      baseWeeks.length,
      dam.id,
    );
    return demoFromPlan(clone, dam.id, lane.code, seeded, baseDue, baseWeeks);
    // Snapshot once per occurrence open — not as the user edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dam.id, lane.code, marker.procDueIdx]);

  const [demo, setDemo] = useState<EffortDemo>(() =>
    demoFromPlan(
      store,
      dam.id,
      lane.code,
      sd.plan,
      due,
      weeks,
      sd.tailWeeks,
      sd,
    ),
  );

  function patchDetail(
    partial: Partial<ScheduleStore["scheduledDetails"][string]>,
    actualise = true,
  ) {
    if (readOnly) return;
    const next: ScheduleStore = JSON.parse(JSON.stringify(store));
    next.scheduledDetails[key] = {
      ...(next.scheduledDetails[key] || {}),
      ...partial,
      ...(actualise ? { actualised: true } : {}),
    };
    onChange(next);
  }

  function savePlan() {
    if (readOnly) return;
    const ms = demo.milestone;
    const base = baselineDemo.milestone;
    const dueIdx = monthIndex(ms.due.y, ms.due.m, winStart);
    const baseDueIdx = monthIndex(base.due.y, base.due.m, winStart);
    const datesDiffer =
      dueIdx !== baseDueIdx ||
      ms.due.d !== base.due.d ||
      ms.tailWeeks !== base.tailWeeks;
    const synced = ensureEffortDemo(demo);
    syncHoursOriginToWindow(synced);
    setDemo(synced);
    const plan = effortDemoToAssignmentPlan(synced, { assignMode: "people" });
    const basePlan = effortDemoToAssignmentPlan(baselineDemo, {
      assignMode: "people",
    });
    const planDiffer = JSON.stringify(plan) !== JSON.stringify(basePlan);
    const next: ScheduleStore = JSON.parse(JSON.stringify(store));
    const existing = next.scheduledDetails[key] || {};
    const saved: ScheduleStore["scheduledDetails"][string] = {
      ...existing,
      plan,
      stick: synced.stick,
      windowStart: synced.windowStart,
      hoursOrigin: synced.windowStart,
    };
    if (datesDiffer) {
      saved.dueIdxOverride = dueIdx;
      saved.dueDayOverride = ms.due.d;
      saved.tailWeeks = Math.max(1, Math.round(ms.tailWeeks) || 1);
      saved.leadInOverrideMonths = leadMonthsFromTailWeeks(
        ms.due.y,
        ms.due.m,
        ms.due.d,
        ms.tailWeeks,
      );
    } else {
      delete saved.dueIdxOverride;
      delete saved.dueDayOverride;
      delete saved.leadInOverrideMonths;
      delete saved.tailWeeks;
    }
    if (datesDiffer || planDiffer) saved.actualised = true;
    else delete saved.actualised;
    next.scheduledDetails[key] = saved;
    onChange(next);
  }

  function removeMilestone() {
    if (readOnly || kind === "completed") return;
    const next: ScheduleStore = JSON.parse(JSON.stringify(store));
    if (kind === "predicted") {
      if (
        !confirm(
          `Remove this predicted milestone for ${dam.name} · ${lane.code}?\n\nHides this predicted occurrence. Recalculate this row brings predicted dates back.`,
        )
      ) {
        return;
      }
      next.scheduledDetails[key] = { skippedPredicted: true };
    } else {
      if (
        !confirm(
          `Remove this milestone for ${dam.name} · ${lane.code}?\n\nThe occurrence returns to predicted. Recalculate this row to rebase later cycles.`,
        )
      ) {
        return;
      }
      delete next.scheduledDetails[key];
    }
    onChange(next);
    onClose();
  }

  return (
    <EffortPopupShell
      onClose={onClose}
      title={
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold">
          <span>{dam.name}</span>
          <button
            type="button"
            className="mrt-type-link"
            title="Open Defaults for this obligation type"
            onClick={() => {
              onGoToDefaults?.(lane.code);
              onClose();
            }}
          >
            {lane.code} {lane.label}
          </button>
          <span className={statusChipClass(kind)}>{planStatusLabel(kind)}</span>
        </h2>
      }
      subtitle={
        <p className="text-sm text-[var(--muted)]">
          Due {fullDateLabel(dueIdx, dueDay, winStart)} ·
          procedural {fullDateLabel(marker.procDueIdx, procDay, winStart)}
        </p>
      }
      footer={
        <>
          <div className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
            <div className="flex flex-wrap items-center gap-2">
              {readOnly || kind === "completed" ? null : (
                <button
                  type="button"
                  className="mrt-btn-remove"
                  onClick={removeMilestone}
                >
                  Remove this milestone
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  disabled={readOnly}
                  checked={!!sd.completed}
                  onChange={(e) => patchDetail({ completed: e.target.checked })}
                />
                Completed
              </label>
              <button
                type="button"
                className="sg-btn-primary"
                disabled={readOnly}
                onClick={savePlan}
              >
                Save assignment
              </button>
              <button
                type="button"
                className="sg-btn-primary"
                disabled={readOnly}
                onClick={() => {
                  savePlan();
                  onClose();
                }}
              >
                Save and Close
              </button>
            </div>
          </div>
          <p className="mt-2 shrink-0 text-xs text-[var(--muted)]">
            Seeded once from Defaults. Changing Defaults later does not overwrite
            this occurrence until you restore.
          </p>
        </>
      }
    >
      <EffortGantt
        store={store}
        onChange={onChange}
        demo={demo}
        onDemoChange={setDemo}
        lockedPlace="milestone"
        readOnly={readOnly}
        toolbarNote={null}
        baselineDemo={baselineDemo}
        redHover
      />
    </EffortPopupShell>
  );
}
