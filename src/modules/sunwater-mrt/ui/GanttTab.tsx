"use client";

import { useMemo, useState } from "react";
import type { ScheduleStore } from "../schema";
import { totalMonths, todayIdx, todayYm, WINDOW_START } from "../logic/dates";
import { ganttMarkers, type GanttMarker } from "../logic/scheduling";
import { planStatusLabel } from "../logic/status";
import { OccurrenceModal } from "./OccurrenceModal";

const MONTH_PX = 14;
const ROW_H = 18;
const LABEL_W = 280;

export function GanttTab({
  store,
  onChange,
}: {
  store: ScheduleStore;
  onChange: (store: ScheduleStore) => void;
}) {
  const [open, setOpen] = useState<GanttMarker | null>(null);
  const [damFilter, setDamFilter] = useState<string[]>([]);
  const [laneFilter, setLaneFilter] = useState<string[]>([]);
  const months = totalMonths();
  const width = months * MONTH_PX;
  const todayX = todayIdx(todayYm()) * MONTH_PX;
  const markers = useMemo(() => ganttMarkers(store), [store]);

  const visibleDams = store.dams.filter(
    (d) => damFilter.length === 0 || damFilter.includes(d.id),
  );
  const visibleLanes = new Set(
    laneFilter.length === 0 ? store.lanes.map((l) => l.code) : laneFilter,
  );

  const rows: { damId: string; damName: string; laneCode: string; color: string; label: string }[] = [];
  for (const dam of visibleDams) {
    const damMarkers = markers.filter(
      (m) => m.damId === dam.id && visibleLanes.has(m.laneCode),
    );
    const codes = [...new Set(damMarkers.map((m) => m.laneCode))];
    for (const code of codes) {
      const lane = store.lanes.find((l) => l.code === code);
      if (!lane) continue;
      rows.push({
        damId: dam.id,
        damName: dam.name,
        laneCode: code,
        color: lane.color,
        label: `${dam.name} · ${lane.code}`,
      });
    }
  }

  return (
    <div>
      <p className="mb-3 text-sm text-[var(--muted)]">
        Cyclical obligations by dam and requirement type. Click a marker to plan
        an occurrence. Predicted / Scheduled / Completed; tails are lead-in.
      </p>
      <div className="mb-3 flex flex-wrap gap-3 text-sm">
        <label className="flex items-center gap-2">
          Dams
          <select
            multiple
            className="sg-input h-24 w-48 py-1 text-xs"
            value={damFilter}
            onChange={(e) =>
              setDamFilter([...e.target.selectedOptions].map((o) => o.value))
            }
          >
            {store.dams.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          Types
          <select
            multiple
            className="sg-input h-24 w-48 py-1 text-xs"
            value={laneFilter}
            onChange={(e) =>
              setLaneFilter([...e.target.selectedOptions].map((o) => o.value))
            }
          >
            {store.lanes.map((l) => (
              <option key={l.code} value={l.code}>
                {l.code} {l.label}
              </option>
            ))}
          </select>
        </label>
        <p className="self-end text-xs text-[var(--muted)]">
          Empty selection = all. Window {WINDOW_START.y}–2046.
        </p>
      </div>

      <div className="overflow-auto rounded-[10px] border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex min-w-max">
          <div
            className="sticky left-0 z-20 border-r border-[var(--border)] bg-[var(--surface)]"
            style={{ width: LABEL_W }}
          >
            {rows.map((r) => (
              <div
                key={`${r.damId}-${r.laneCode}`}
                className="flex items-center gap-2 truncate px-2 text-xs"
                style={{ height: ROW_H }}
              >
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ background: r.color }}
                />
                {r.label}
              </div>
            ))}
          </div>
          <div className="relative" style={{ width, minHeight: rows.length * ROW_H }}>
            <div
              className="pointer-events-none absolute top-0 z-10 w-px bg-[var(--ink)]"
              style={{ left: todayX, height: "100%" }}
              title="Today"
            />
            {rows.map((r, rowIdx) => {
              const rowMarkers = markers.filter(
                (m) => m.damId === r.damId && m.laneCode === r.laneCode,
              );
              return (
                <div
                  key={`${r.damId}-${r.laneCode}-tl`}
                  className="relative border-b border-[var(--border)]/60"
                  style={{ height: ROW_H }}
                >
                  {rowMarkers.map((m) => {
                    const left = Math.max(0, m.leadStart) * MONTH_PX;
                    const dueX = m.displayDueIdx * MONTH_PX;
                    const tailW = Math.max(4, dueX - left);
                    return (
                      <button
                        key={`${m.damId}-${m.laneCode}-${m.procDueIdx}`}
                        type="button"
                        className="absolute top-1/2 -translate-y-1/2"
                        style={{ left: dueX - 5 }}
                        title={`${m.damName} ${m.laneCode} · ${planStatusLabel(m.kind)}`}
                        onClick={() => setOpen(m)}
                      >
                        <span
                          className="absolute right-full top-1/2 h-1 -translate-y-1/2 rounded-sm opacity-40"
                          style={{
                            width: tailW,
                            background: m.color,
                            marginRight: 2,
                          }}
                        />
                        <span
                          className={`block h-2.5 w-2.5 rounded-full border ${
                            m.kind === "completed"
                              ? "border-[var(--ink)]"
                              : m.kind === "scheduled"
                                ? "border-[var(--ink)] bg-transparent"
                                : ""
                          }`}
                          style={{
                            background:
                              m.kind === "predicted" ? m.color : "var(--surface)",
                            boxShadow:
                              m.kind === "scheduled"
                                ? `inset 0 0 0 3px ${m.color}`
                                : undefined,
                          }}
                        />
                      </button>
                    );
                  })}
                  <span className="sr-only">row {rowIdx}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {open ? (
        <OccurrenceModal
          store={store}
          marker={open}
          onClose={() => setOpen(null)}
          onChange={onChange}
        />
      ) : null}
    </div>
  );
}
