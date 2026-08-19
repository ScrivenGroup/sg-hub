"use client";

import { useMemo, useState } from "react";
import type { ScheduleStore } from "../schema";
import {
  defaultDueDayForIdx,
  fullDateLabel,
  idxToYm,
  monthIndex,
  storeBaseline,
} from "../logic/dates";
import {
  predictedBeforeDate,
  schedKey,
  storeWindow,
  type GanttMarker,
} from "../logic/scheduling";

type Resolution = {
  mode: "complete" | "notRequired" | "";
  due: string;
  reason: string;
};

function isoFromParts(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseIso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

export function BaselineModal({
  store,
  onChange,
  onClose,
}: {
  store: ScheduleStore;
  onChange: (store: ScheduleStore) => void;
  onClose: () => void;
}) {
  const current = storeBaseline(store);
  const [iso, setIso] = useState(isoFromParts(current.y, current.m, current.d));
  const proposed = parseIso(iso);
  const win = storeWindow(store);
  const blockers = useMemo(
    () => predictedBeforeDate(store, proposed),
    [store, proposed.y, proposed.m, proposed.d],
  );
  const [res, setRes] = useState<Record<string, Resolution>>({});

  function keyOf(m: GanttMarker) {
    return `${m.damId}|${m.laneCode}|${m.procDueIdx}`;
  }

  function patchRes(m: GanttMarker, partial: Partial<Resolution>) {
    const k = keyOf(m);
    const fallback: Resolution = {
      mode: "",
      due: isoFromParts(
        idxToYm(m.displayDueIdx, win.start).y,
        idxToYm(m.displayDueIdx, win.start).m0 + 1,
        m.dueDay || defaultDueDayForIdx(m.displayDueIdx, win.start),
      ),
      reason: "",
    };
    setRes((cur) => ({
      ...cur,
      [k]: { ...fallback, ...(cur[k] || {}), ...partial },
    }));
  }

  const ready =
    blockers.length === 0 ||
    blockers.every((m) => {
      const r = res[keyOf(m)];
      if (!r) return false;
      if (r.mode === "complete") return !!r.due;
      if (r.mode === "notRequired") return !!r.reason.trim();
      return false;
    });

  function confirm() {
    if (!ready) return;
    const next = JSON.parse(JSON.stringify(store)) as ScheduleStore;
    for (const m of blockers) {
      const r = res[keyOf(m)];
      const key = schedKey(m.damId, m.laneCode, m.procDueIdx);
      const existing = next.scheduledDetails[key] || {};
      if (r.mode === "complete") {
        const { y, m: mm, d } = parseIso(r.due);
        next.scheduledDetails[key] = {
          ...existing,
          actualised: true,
          completed: true,
          dueIdxOverride: monthIndex(y, mm, win.start),
          dueDayOverride: d,
        };
      } else {
        next.scheduledDetails[key] = {
          ...existing,
          actualised: true,
          notRequired: true,
          notRequiredReason: r.reason.trim(),
        };
      }
    }
    next.baselineDate = proposed;
    onChange(next);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="sg-card my-8 w-full max-w-3xl">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Baseline</h2>
            <p className="text-xs text-[var(--muted)]">
              Current {isoFromParts(current.y, current.m, current.d)}. Predicted
              cycles before the new date must be Completed (with due date) or
              Not required (with reason). Scheduled records are not changed.
            </p>
          </div>
          <button type="button" className="sg-btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <label className="mb-3 block text-sm">
          Baseline date
          <input
            type="date"
            className="mrt-input mt-1"
            value={iso}
            onChange={(e) => {
              setIso(e.target.value);
              setRes({});
            }}
          />
        </label>
        {blockers.length === 0 ? (
          <p className="mb-3 text-sm text-[var(--muted)]">
            No predicted milestones before this date.
          </p>
        ) : (
          <div className="mb-3 max-h-80 overflow-auto">
            <table className="mrt-table mrt-table-gaps">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Obligation</th>
                  <th>Predicted due</th>
                  <th>Resolve</th>
                </tr>
              </thead>
              <tbody>
                {blockers.map((m) => {
                  const k = keyOf(m);
                  const r = res[k];
                  return (
                    <tr key={k}>
                      <td>{m.damName}</td>
                      <td>
                        {m.laneCode} {m.laneLabel}
                      </td>
                      <td>
                        {fullDateLabel(m.displayDueIdx, m.dueDay, win.start)}
                      </td>
                      <td>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs">
                            <input
                              type="radio"
                              name={k}
                              checked={r?.mode === "complete"}
                              onChange={() => patchRes(m, { mode: "complete" })}
                            />{" "}
                            Completed
                          </label>
                          {r?.mode === "complete" ? (
                            <input
                              type="date"
                              className="mrt-input"
                              value={r.due}
                              onChange={(e) =>
                                patchRes(m, { due: e.target.value })
                              }
                            />
                          ) : null}
                          <label className="text-xs">
                            <input
                              type="radio"
                              name={k}
                              checked={r?.mode === "notRequired"}
                              onChange={() =>
                                patchRes(m, { mode: "notRequired" })
                              }
                            />{" "}
                            Not required
                          </label>
                          {r?.mode === "notRequired" ? (
                            <input
                              className="mrt-input"
                              placeholder="Reason"
                              value={r.reason}
                              onChange={(e) =>
                                patchRes(m, { reason: e.target.value })
                              }
                            />
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <button
          type="button"
          className="sg-btn-primary"
          disabled={!ready || !iso}
          onClick={confirm}
        >
          Save baseline
        </button>
      </div>
    </div>
  );
}
