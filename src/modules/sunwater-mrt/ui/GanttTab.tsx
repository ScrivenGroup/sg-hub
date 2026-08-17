"use client";

import { useMemo, useRef, useState } from "react";
import type { ScheduleStore } from "../schema";
import {
  HORIZON_YEARS,
  MONTH_NAMES,
  idxToYm,
  planningWindow,
  todayIdx,
  todayYm,
  totalMonths,
} from "../logic/dates";
import { ganttMarkers, type GanttMarker } from "../logic/scheduling";
import { planStatusLabel } from "../logic/status";
import { OccurrenceModal } from "./OccurrenceModal";

const ZOOM_X = [8, 11, 14, 18, 24, 32];
const ROW_H = 20;
const LABEL_W = 240;

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
  const [dueBeforeIdx, setDueBeforeIdx] = useState<number | null>(null);
  const [onlyOngoing, setOnlyOngoing] = useState(false);
  const [scheduleFilter, setScheduleFilter] = useState<
    null | "scheduled" | "predicted"
  >(null);
  const [panel, setPanel] = useState<null | "dam" | "type" | "due">(null);
  const [zoomI, setZoomI] = useState(2);
  const [fullscreen, setFullscreen] = useState(false);
  const [fsTop, setFsTop] = useState(120);
  const scroller = useRef<HTMLDivElement>(null);

  const monthPx = ZOOM_X[zoomI] ?? 14;
  const win = planningWindow();
  const months = totalMonths(win.start, win.end);
  const width = months * monthPx;
  const tIdx = todayIdx(todayYm(), win.start);
  const todayX = tIdx * monthPx;
  const markers = useMemo(() => ganttMarkers(store), [store]);

  const visibleDams = store.dams.filter(
    (d) => damFilter.length === 0 || damFilter.includes(d.id),
  );
  const visibleLanes = new Set(
    laneFilter.length === 0 ? store.lanes.map((l) => l.code) : laneFilter,
  );

  function matches(m: GanttMarker) {
    if (!visibleLanes.has(m.laneCode)) return false;
    if (onlyOngoing && m.bucket !== "ongoing") return false;
    if (scheduleFilter === "scheduled" && m.kind !== "scheduled") return false;
    if (scheduleFilter === "predicted" && m.kind !== "predicted") return false;
    if (dueBeforeIdx !== null && m.displayDueIdx > dueBeforeIdx) return false;
    return true;
  }

  const rows: {
    damId: string;
    damName: string;
    laneCode: string;
    color: string;
    label: string;
  }[] = [];
  for (const dam of visibleDams) {
    for (const lane of store.lanes) {
      if (!visibleLanes.has(lane.code)) continue;
      if (store.laneApplicability[dam.id]?.[lane.code] === false) continue;
      rows.push({
        damId: dam.id,
        damName: dam.name,
        laneCode: lane.code,
        color: lane.color,
        label: `${dam.name} · ${lane.code}`,
      });
    }
  }

  const years: { y: number; start: number; span: number }[] = [];
  for (let i = 0; i < months; i++) {
    const { y } = idxToYm(i, win.start);
    const last = years[years.length - 1];
    if (!last || last.y !== y) years.push({ y, start: i, span: 1 });
    else last.span += 1;
  }

  function enterFullscreen() {
    const bar = document.querySelector('[aria-label="Milestone Resourcing Tracker"]');
    const top = bar
      ? Math.round(bar.getBoundingClientRect().bottom + 8)
      : 120;
    setFsTop(top);
    setFullscreen(true);
  }

  function jumpToday() {
    const el = scroller.current;
    if (!el) return;
    el.scrollLeft = Math.max(0, todayX - el.clientWidth / 3);
  }

  function resetView() {
    setDamFilter([]);
    setLaneFilter([]);
    setDueBeforeIdx(null);
    setOnlyOngoing(false);
    setScheduleFilter(null);
    setZoomI(2);
    setPanel(null);
  }

  const chart = (
    <div
      ref={scroller}
      className="overflow-auto rounded-[10px] border border-[var(--border)] bg-[var(--surface)]"
      style={
        fullscreen
          ? { height: `calc(100dvh - ${fsTop}px)` }
          : { maxHeight: "calc(100dvh - 220px)" }
      }
    >
      <div className="flex min-w-max">
        <div
          className="sticky left-0 z-20 border-r border-[var(--border)] bg-[var(--surface)]"
          style={{ width: LABEL_W }}
        >
          <div className="border-b border-[var(--border)] px-2 py-1 text-[10px] text-[var(--muted)]">
            Asset · Obligation
          </div>
          <div className="h-6 border-b border-[var(--border)]" />
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
        <div>
          <div className="flex border-b border-[var(--border)] text-[10px]">
            {years.map((yr) => (
              <div
                key={yr.y}
                className="border-r border-[var(--border)] px-1 py-1 font-medium"
                style={{ width: yr.span * monthPx }}
              >
                {yr.y}
              </div>
            ))}
          </div>
          <div className="flex border-b border-[var(--border)] text-[9px] text-[var(--muted)]">
            {Array.from({ length: months }, (_, i) => {
              const { m0 } = idxToYm(i, win.start);
              return (
                <div
                  key={i}
                  className="shrink-0 text-center"
                  style={{ width: monthPx }}
                >
                  {monthPx >= 14 ? MONTH_NAMES[m0].slice(0, 1) : ""}
                </div>
              );
            })}
          </div>
          <div className="relative" style={{ width, minHeight: rows.length * ROW_H }}>
            <div
              className="pointer-events-none absolute top-0 z-10 w-px bg-[var(--ink)]"
              style={{ left: todayX, height: "100%" }}
              title="Today"
            />
            {rows.map((r) => {
              const rowMarkers = markers.filter(
                (m) =>
                  m.damId === r.damId && m.laneCode === r.laneCode && matches(m),
              );
              return (
                <div
                  key={`${r.damId}-${r.laneCode}-tl`}
                  className="relative border-b border-[var(--border)]/60"
                  style={{ height: ROW_H }}
                >
                  {rowMarkers.map((m) => {
                    const dueX = m.displayDueIdx * monthPx;
                    const left = Math.max(0, m.leadStart) * monthPx;
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
                          className="block h-2.5 w-2.5 rounded-full border border-[var(--ink)]"
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
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={
        fullscreen
          ? "fixed right-0 bottom-0 left-0 z-30 bg-[var(--page)] px-4 pt-2"
          : ""
      }
      style={fullscreen ? { top: fsTop } : undefined}
    >
      <div className="mb-2 flex flex-wrap items-center gap-1 text-sm">
        <button
          type="button"
          className="sg-btn-secondary min-h-9 px-3 text-sm"
          onClick={() => (fullscreen ? setFullscreen(false) : enterFullscreen())}
        >
          {fullscreen ? "Exit full screen" : "Full screen"}
        </button>
        <button
          type="button"
          className="sg-btn-secondary min-h-9 px-3 text-sm"
          onClick={resetView}
        >
          Reset view
        </button>
        <button
          type="button"
          className="sg-btn-secondary min-h-9 px-3 text-sm"
          onClick={jumpToday}
        >
          Jump to today
        </button>
        <button
          type="button"
          className={`sg-btn-ghost min-h-9 px-3 text-sm ${panel === "dam" ? "bg-[var(--surface-muted)]" : ""}`}
          onClick={() => setPanel(panel === "dam" ? null : "dam")}
        >
          Asset filter {damFilter.length ? `(${damFilter.length})` : "(all)"}
        </button>
        <button
          type="button"
          className={`sg-btn-ghost min-h-9 px-3 text-sm ${panel === "type" ? "bg-[var(--surface-muted)]" : ""}`}
          onClick={() => setPanel(panel === "type" ? null : "type")}
        >
          Type filter {laneFilter.length ? `(${laneFilter.length})` : "(all)"}
        </button>
        <button
          type="button"
          className={`sg-btn-ghost min-h-9 px-3 text-sm ${panel === "due" ? "bg-[var(--surface-muted)]" : ""}`}
          onClick={() => setPanel(panel === "due" ? null : "due")}
        >
          Due before
        </button>
        <button
          type="button"
          className={`sg-btn-ghost min-h-9 px-3 text-sm ${onlyOngoing ? "bg-[var(--surface-muted)]" : ""}`}
          onClick={() => setOnlyOngoing((v) => !v)}
        >
          Show only ongoing
        </button>
        <button
          type="button"
          className={`sg-btn-ghost min-h-9 px-3 text-sm ${scheduleFilter === "scheduled" ? "bg-[var(--surface-muted)]" : ""}`}
          onClick={() =>
            setScheduleFilter((v) => (v === "scheduled" ? null : "scheduled"))
          }
        >
          Scheduled only
        </button>
        <button
          type="button"
          className={`sg-btn-ghost min-h-9 px-3 text-sm ${scheduleFilter === "predicted" ? "bg-[var(--surface-muted)]" : ""}`}
          onClick={() =>
            setScheduleFilter((v) => (v === "predicted" ? null : "predicted"))
          }
        >
          Predicted only
        </button>
        <span className="ml-2 text-xs text-[var(--muted)]">Timescale</span>
        <button
          type="button"
          className="sg-btn-ghost min-h-8 px-2"
          onClick={() => setZoomI((i) => Math.max(0, i - 1))}
        >
          −
        </button>
        <span className="text-xs">{Math.round((monthPx / 14) * 100)}%</span>
        <button
          type="button"
          className="sg-btn-ghost min-h-8 px-2"
          onClick={() => setZoomI((i) => Math.min(ZOOM_X.length - 1, i + 1))}
        >
          +
        </button>
        <span className="text-xs text-[var(--muted)]">
          {win.start.y}–{win.start.y + HORIZON_YEARS}
        </span>
      </div>

      {panel === "dam" ? (
        <div className="sg-card mb-2 flex max-w-md flex-wrap gap-2 py-2">
          {store.dams.map((d) => (
            <label key={d.id} className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={damFilter.includes(d.id)}
                onChange={(e) =>
                  setDamFilter((cur) =>
                    e.target.checked
                      ? [...cur, d.id]
                      : cur.filter((id) => id !== d.id),
                  )
                }
              />
              {d.name}
            </label>
          ))}
        </div>
      ) : null}
      {panel === "type" ? (
        <div className="sg-card mb-2 flex max-w-md flex-wrap gap-2 py-2">
          {store.lanes.map((l) => (
            <label key={l.code} className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={laneFilter.includes(l.code)}
                onChange={(e) =>
                  setLaneFilter((cur) =>
                    e.target.checked
                      ? [...cur, l.code]
                      : cur.filter((c) => c !== l.code),
                  )
                }
              />
              {l.code} {l.label}
            </label>
          ))}
        </div>
      ) : null}
      {panel === "due" ? (
        <div className="sg-card mb-2 max-w-xs py-2">
          <label className="text-xs">
            Due before (month index from today)
            <input
              type="number"
              min={0}
              className="sg-input mt-1"
              value={dueBeforeIdx ?? ""}
              onChange={(e) =>
                setDueBeforeIdx(
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
            />
          </label>
        </div>
      ) : null}

      {chart}

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
