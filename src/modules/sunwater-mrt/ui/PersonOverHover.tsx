"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ScheduleStore } from "../schema";
import { contributionsAroundWeek } from "../logic/resource-load";
import { formatHours, round2 } from "../logic/numbers";
import type { WeDate } from "../logic/effort-gantt";
import { ragStatus } from "../logic/status";

function weLabel(we: WeDate) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${we.d} ${months[we.m - 1]}`;
}

function ragText(kind: ReturnType<typeof ragStatus>) {
  if (kind === "red") return "var(--rag-red)";
  if (kind === "yellow") return "var(--rag-amber)";
  return "inherit";
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function PersonOverHover({
  store,
  personId,
  liveStart,
  weekIdx,
}: {
  store: ScheduleStore;
  personId: string;
  liveStart: WeDate;
  weekIdx: number;
}) {
  const probe = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const data = contributionsAroundWeek(store, personId, liveStart, weekIdx, 2);
  const person = store.people.find((p) => p.id === personId);
  const allTasks = data.weeks.map((_, i) =>
    round2(data.rows.reduce((s, row) => s + (row.hours[i] || 0), 0)),
  );
  const cap = data.availability;

  useEffect(() => {
    const cell = probe.current?.parentElement;
    if (!cell) return;
    function enter() {
      const r = cell!.getBoundingClientRect();
      const left = clamp(r.left + r.width / 2, 140, window.innerWidth - 140);
      const top = clamp(r.top - 8, 8, window.innerHeight - 8);
      setPos({ left, top });
    }
    function leave() {
      setPos(null);
    }
    cell.addEventListener("mouseenter", enter);
    cell.addEventListener("mouseleave", leave);
    return () => {
      cell.removeEventListener("mouseenter", enter);
      cell.removeEventListener("mouseleave", leave);
    };
  }, []);

  const tip = pos ? (
    <div
      className="mrt-over-hover-wrap is-portaled"
      style={{ left: pos.left, top: pos.top }}
      role="tooltip"
    >
      <div className="mrt-over-hover">
        <p className="mrt-over-hover-title">
          {person?.name || personId}
        </p>
        <table className="mrt-over-hover-table">
          <thead>
            <tr>
              <th>Source</th>
              {data.weeks.map((w, i) => (
                <th key={i} className={i === 2 ? "is-centre" : ""}>
                  {weLabel(w)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="is-load">
              <td>All / available</td>
              {allTasks.map((h, i) => {
                const rag = ragStatus(h, cap, store.overrunPercent);
                return (
                  <td
                    key={i}
                    className={`tabular-nums${i === 2 ? " is-centre" : ""}`}
                    style={{ color: ragText(rag) }}
                  >
                    {`${formatHours(h, true)}/${formatHours(cap, true)}`}
                  </td>
                );
              })}
            </tr>
            {data.rows.map((row) => (
              <tr key={row.label}>
                <td className="truncate" title={row.label}>
                  {row.label}
                </td>
                {row.hours.map((h, i) => (
                  <td key={i} className={`tabular-nums${i === 2 ? " is-centre" : ""}`}>
                    {h ? formatHours(h) : ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  ) : null;

  return (
    <>
      <span ref={probe} className="mrt-over-hover-probe" aria-hidden />
      {typeof document !== "undefined" && tip
        ? createPortal(tip, document.body)
        : null}
    </>
  );
}
