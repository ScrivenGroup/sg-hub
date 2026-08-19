"use client";

import { useState } from "react";
import type { ScheduleStore } from "../schema";
import {
  occurrenceWeekWindow,
  seedPlanFromDefaults,
} from "../logic/assignment";
import {
  defaultDueDayForIdx,
  fullDateLabel,
  idxToYm,
  monthIndex,
} from "../logic/dates";
import {
  effectiveDueIdx,
  effectiveLead,
  isCompleted,
  isScheduled,
  isUserNotRequired,
  schedKey,
  storeWindow,
} from "../logic/scheduling";
import { planStatusKind, planStatusLabel } from "../logic/status";
import type { GanttMarker } from "../logic/scheduling";
import { AssignmentGantt } from "./AssignmentGantt";

export function OccurrenceModal({
  store,
  marker,
  onClose,
  onChange,
}: {
  store: ScheduleStore;
  marker: GanttMarker;
  onClose: () => void;
  onChange: (store: ScheduleStore) => void;
}) {
  const dam = store.dams.find((d) => d.id === marker.damId)!;
  const lane = store.lanes.find((l) => l.code === marker.laneCode)!;
  const key = schedKey(dam.id, lane.code, marker.procDueIdx);
  const sd = store.scheduledDetails[key] || {};
  const weeks = occurrenceWeekWindow(store, dam.id, lane.code, marker.procDueIdx);
  const [plan, setPlan] = useState(() => {
    if (sd.plan) return sd.plan;
    return seedPlanFromDefaults(store, lane.code, weeks.length, dam.id);
  });

  const dueIdx = effectiveDueIdx(store, dam, lane, marker.procDueIdx);
  const lead = effectiveLead(store, dam, lane, marker.procDueIdx);
  const kind = planStatusKind(
    isScheduled(store, dam, lane, marker.procDueIdx),
    isCompleted(store, dam, lane, marker.procDueIdx),
    isUserNotRequired(store, dam, lane, marker.procDueIdx),
  );

  const winStart = storeWindow(store).start;
  const { y, m0 } = idxToYm(dueIdx, winStart);
  const dueDay = sd.dueDayOverride ?? defaultDueDayForIdx(dueIdx, winStart);
  const procDay = defaultDueDayForIdx(marker.procDueIdx, winStart);

  function patchDetail(
    partial: Partial<ScheduleStore["scheduledDetails"][string]>,
    actualise = true,
  ) {
    const next: ScheduleStore = JSON.parse(JSON.stringify(store));
    next.scheduledDetails[key] = {
      ...(next.scheduledDetails[key] || {}),
      ...partial,
      ...(actualise ? { actualised: true } : {}),
    };
    onChange(next);
  }

  function savePlan() {
    patchDetail({ plan });
  }

  function restoreToDefaults() {
    const seeded = seedPlanFromDefaults(
      store,
      lane.code,
      weeks.length,
      dam.id,
    );
    setPlan(seeded);
    const next: ScheduleStore = JSON.parse(JSON.stringify(store));
    const existing = next.scheduledDetails[key] || {};
    next.scheduledDetails[key] = {
      history: existing.history,
      completed: existing.completed,
      plan: seeded,
    };
    onChange(next);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="sg-card my-8 w-full max-w-6xl">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold">
              {dam.name} · {lane.code}
            </h2>
            <p className="text-sm text-[var(--muted)]">
              {lane.label} · {planStatusLabel(kind)} · due{" "}
              {fullDateLabel(dueIdx, dueDay, winStart)} · procedural{" "}
              {fullDateLabel(marker.procDueIdx, procDay, winStart)}
            </p>
          </div>
          <button type="button" className="sg-btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            Due (month index override)
            <input
              type="month"
              className="mrt-input mt-1"
              value={`${y}-${String(m0 + 1).padStart(2, "0")}`}
              onChange={(e) => {
                const [yy, mm] = e.target.value.split("-").map(Number);
                patchDetail({
                  dueIdxOverride: monthIndex(yy, mm, winStart),
                });
              }}
            />
          </label>
          <label className="text-sm">
            Due day
            <input
              type="number"
              min={1}
              max={31}
              className="mrt-input mt-1"
              value={dueDay}
              onChange={(e) =>
                patchDetail({ dueDayOverride: Number(e.target.value) || 1 })
              }
            />
          </label>
          <label className="text-sm">
            Lead-in (months)
            <input
              type="number"
              min={0}
              className="mrt-input mt-1"
              value={lead}
              onChange={(e) =>
                patchDetail({
                  leadInOverrideMonths: Number(e.target.value) || 0,
                })
              }
            />
          </label>
        </div>

        <label className="mb-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!sd.completed}
            onChange={(e) => patchDetail({ completed: e.target.checked })}
          />
          Completed
        </label>

        <h3 className="mb-2 font-medium">Assignment (people × week-ending dates)</h3>
        <p className="mb-2 text-xs text-[var(--muted)]">
          Seeded once from Defaults. Changing Defaults later does not overwrite
          this occurrence.
        </p>
        <AssignmentGantt
          store={store}
          plan={plan}
          weeks={weeks}
          mode="people"
          onChange={setPlan}
        />
        <div className="mt-4 flex flex-wrap items-start gap-2">
          <button type="button" className="sg-btn-primary" onClick={savePlan}>
            Save assignment
          </button>
          <button
            type="button"
            className="sg-btn-secondary"
            onClick={restoreToDefaults}
          >
            Restore to defaults
          </button>
          <button
            type="button"
            className="sg-btn-ghost"
            onClick={() => {
              setPlan(seedPlanFromDefaults(store, lane.code, weeks.length, dam.id));
            }}
          >
            Re-seed without saving
          </button>
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Restores dates, lead-in, and effort plan from current defaults. History
          is kept.
        </p>
      </div>
    </div>
  );
}
