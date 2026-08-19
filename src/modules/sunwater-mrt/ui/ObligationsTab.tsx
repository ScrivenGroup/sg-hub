"use client";

import { useMemo, useState } from "react";
import type { ScheduleStore } from "../schema";
import {
  clampHorizonYears,
  defaultDueDayForIdx,
  fullDateLabel,
  MONTH_NAMES,
  storeBaseline,
  todayIdx,
} from "../logic/dates";
import {
  ganttMarkers,
  storeWindow,
  type GanttMarker,
} from "../logic/scheduling";
import { planStatusLabel } from "../logic/status";
import { BaselineModal } from "./BaselineModal";
import { OccurrenceModal } from "./OccurrenceModal";
import { SubTabs } from "./SubTabs";

type SortKey =
  | "damName"
  | "laneLabel"
  | "kind"
  | "bucket"
  | "leadStart"
  | "displayDueIdx";

const SUBS = ["All Obligations", "Ongoing", "Upcoming"] as const;
const LOOKAHEAD = [6, 12, 24, 60, 0] as const;

const STATUS_LABEL: Record<GanttMarker["bucket"], string> = {
  overdue: "OVERDUE",
  ongoing: "In lead-in",
  upcoming: "Upcoming",
};

function rowStatus(m: GanttMarker) {
  if (m.kind === "completed") return "Complete";
  if (m.kind === "notRequired") return "Not required";
  return STATUS_LABEL[m.bucket];
}

function statusChipClass(m: GanttMarker) {
  if (m.kind === "completed") return "mrt-chip-complete";
  if (m.kind === "notRequired") return "mrt-chip-not-required";
  if (m.bucket === "overdue") return "mrt-chip-overdue";
  if (m.bucket === "ongoing") return "mrt-chip-ongoing";
  return "mrt-chip-upcoming";
}

export function ObligationsTab({
  store,
  onChange,
}: {
  store: ScheduleStore;
  onChange: (store: ScheduleStore) => void;
}) {
  const [sub, setSub] = useState<(typeof SUBS)[number]>("All Obligations");
  const [dial, setDial] = useState(clampHorizonYears(store.horizonYears));
  const [lookAhead, setLookAhead] = useState<(typeof LOOKAHEAD)[number]>(12);
  const [open, setOpen] = useState<GanttMarker | null>(null);
  const [baselineOpen, setBaselineOpen] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "displayDueIdx",
    dir: "asc",
  });
  const [filters, setFilters] = useState({
    damName: "",
    laneLabel: "",
    kind: "",
    status: "",
    lead: "",
    due: "",
  });

  const markers = useMemo(() => ganttMarkers(store), [store]);
  const win = storeWindow(store);
  const tIdx = todayIdx(undefined, win.start);

  const scoped = useMemo(() => {
    let list = [...markers];
    if (sub === "Ongoing") {
      list = list.filter(
        (m) =>
          m.kind !== "completed" &&
          m.kind !== "notRequired" &&
          (m.bucket === "ongoing" || m.bucket === "overdue"),
      );
    } else if (sub === "Upcoming") {
      list = list.filter(
        (m) =>
          m.kind !== "completed" &&
          m.kind !== "notRequired" &&
          m.bucket === "upcoming",
      );
      if (lookAhead > 0) {
        list = list.filter((m) => m.displayDueIdx <= tIdx + lookAhead);
      }
    }
    return list;
  }, [markers, sub, lookAhead, tIdx]);

  const options = useMemo(() => {
    const dams = [...new Set(scoped.map((m) => m.damName))].sort();
    const lanes = [
      ...new Set(scoped.map((m) => `${m.laneCode} ${m.laneLabel}`)),
    ].sort();
    const kinds = [...new Set(scoped.map((m) => planStatusLabel(m.kind)))].sort();
    const statuses = [...new Set(scoped.map((m) => rowStatus(m)))].sort();
    return { dams, lanes, kinds, statuses };
  }, [scoped]);

  const rows = useMemo(() => {
    const list = scoped.filter((m) => {
      const leadDay = defaultDueDayForIdx(m.leadStart, win.start);
      const dueDay = m.dueDay ?? defaultDueDayForIdx(m.displayDueIdx, win.start);
      const lead = fullDateLabel(m.leadStart, leadDay, win.start);
      const due = fullDateLabel(m.displayDueIdx, dueDay, win.start);
      const lane = `${m.laneCode} ${m.laneLabel}`;
      if (filters.damName && m.damName !== filters.damName) return false;
      if (filters.laneLabel && lane !== filters.laneLabel) return false;
      if (filters.kind && planStatusLabel(m.kind) !== filters.kind) return false;
      if (filters.status && rowStatus(m) !== filters.status) return false;
      if (
        filters.lead &&
        !lead.toLowerCase().includes(filters.lead.toLowerCase())
      ) {
        return false;
      }
      if (
        filters.due &&
        !due.toLowerCase().includes(filters.due.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
    list.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [scoped, sort, filters, win.start]);

  function toggleSort(key: SortKey) {
    setSort((cur) =>
      cur.key === key
        ? { key, dir: cur.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  }

  function arrow(key: SortKey) {
    if (sort.key !== key) return "";
    return sort.dir === "asc" ? " ▲" : " ▼";
  }

  function setFilter(key: keyof typeof filters, value: string) {
    setFilters((cur) => ({ ...cur, [key]: value }));
  }

  function recalculate() {
    const next = JSON.parse(JSON.stringify(store)) as ScheduleStore;
    next.horizonYears = clampHorizonYears(dial);
    onChange(next);
  }

  return (
    <div>
      <SubTabs tabs={SUBS} value={sub} onChange={setSub} />
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="text-xs text-[var(--muted)]">
          Calculate for
          <span className="ml-2 inline-flex items-center gap-1 text-[var(--ink)]">
            <input
              type="number"
              min={5}
              max={40}
              className="mrt-input w-16"
              value={dial}
              onChange={(e) =>
                setDial(clampHorizonYears(Number(e.target.value)))
              }
            />
            years into the future
          </span>
        </label>
        <button
          type="button"
          className="mrt-btn-secondary"
          onClick={recalculate}
        >
          Recalculate
        </button>
        <button
          type="button"
          className="mrt-btn-secondary"
          onClick={() => setBaselineOpen(true)}
        >
          Baseline {String(storeBaseline(store).d).padStart(2, "0")}-
          {MONTH_NAMES[storeBaseline(store).m - 1]}-
          {String(storeBaseline(store).y).slice(2)}
        </button>
        {sub === "Upcoming" ? (
          <label className="text-xs text-[var(--muted)]">
            Look-ahead
            <select
              className="mrt-select ml-2"
              value={lookAhead}
              onChange={(e) =>
                setLookAhead(Number(e.target.value) as (typeof LOOKAHEAD)[number])
              }
            >
              {LOOKAHEAD.map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? "All upcoming" : `${n} months`}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <span className="text-xs text-[var(--muted)]">
          Live horizon {clampHorizonYears(store.horizonYears)} years · {rows.length}{" "}
          occurrences
        </span>
      </div>

      <div className="mrt-legend">
        <span>
          <span className="mrt-kind-mark predicted" /> Predicted (assist)
        </span>
        <span>
          <span className="mrt-kind-mark scheduled" /> Scheduled
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="mrt-table mrt-table-gaps">
          <thead>
            <tr>
              <th className="sortable" onClick={() => toggleSort("damName")}>
                Asset{arrow("damName")}
              </th>
              <th className="sortable" onClick={() => toggleSort("laneLabel")}>
                Obligation{arrow("laneLabel")}
              </th>
              <th className="sortable" onClick={() => toggleSort("kind")}>
                Plan status{arrow("kind")}
              </th>
              <th className="sortable" onClick={() => toggleSort("bucket")}>
                Status{arrow("bucket")}
              </th>
              <th className="sortable" onClick={() => toggleSort("leadStart")}>
                Lead-in starts{arrow("leadStart")}
              </th>
              <th
                className="sortable"
                onClick={() => toggleSort("displayDueIdx")}
              >
                Due date{arrow("displayDueIdx")}
              </th>
              <th>Actions</th>
            </tr>
            <tr className="mrt-filter-row">
              <th>
                <select
                  className="mrt-select"
                  value={filters.damName}
                  onChange={(e) => setFilter("damName", e.target.value)}
                >
                  <option value="">All</option>
                  {options.dams.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </th>
              <th>
                <select
                  className="mrt-select"
                  value={filters.laneLabel}
                  onChange={(e) => setFilter("laneLabel", e.target.value)}
                >
                  <option value="">All</option>
                  {options.lanes.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </th>
              <th>
                <select
                  className="mrt-select"
                  value={filters.kind}
                  onChange={(e) => setFilter("kind", e.target.value)}
                >
                  <option value="">All</option>
                  {options.kinds.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </th>
              <th>
                <select
                  className="mrt-select"
                  value={filters.status}
                  onChange={(e) => setFilter("status", e.target.value)}
                >
                  <option value="">All</option>
                  {options.statuses.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </th>
              <th>
                <input
                  className="mrt-input"
                  placeholder="Filter"
                  value={filters.lead}
                  onChange={(e) => setFilter("lead", e.target.value)}
                />
              </th>
              <th>
                <input
                  className="mrt-input"
                  placeholder="Filter"
                  value={filters.due}
                  onChange={(e) => setFilter("due", e.target.value)}
                />
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              const dueDay =
                m.dueDay ?? defaultDueDayForIdx(m.displayDueIdx, win.start);
              const leadDay = defaultDueDayForIdx(m.leadStart, win.start);
              return (
                <tr
                  key={`${m.damId}-${m.laneCode}-${m.procDueIdx}`}
                  className={m.inputOff ? "mrt-row-kept" : undefined}
                  title={m.inputOff ? "Input off — not deleted" : undefined}
                >
                  <td>{m.damName}</td>
                  <td>
                    <span
                      className="mr-1 inline-block h-2 w-2 rounded-full"
                      style={{ background: m.color }}
                    />
                    {m.laneCode} {m.laneLabel}
                  </td>
                  <td>
                    <span
                      className={`mrt-kind-mark ${m.kind}`}
                      title={planStatusLabel(m.kind)}
                    />
                    <span className={`mrt-kind-text-${m.kind}`}>
                      {planStatusLabel(m.kind)}
                    </span>
                  </td>
                  <td>
                    <span className={`mrt-chip ${statusChipClass(m)}`}>
                      {rowStatus(m)}
                    </span>
                    {m.inputOff ? (
                      <span className="ml-1 text-[10px]">kept</span>
                    ) : null}
                  </td>
                  <td>{fullDateLabel(m.leadStart, leadDay, win.start)}</td>
                  <td>{fullDateLabel(m.displayDueIdx, dueDay, win.start)}</td>
                  <td>
                    <button
                      type="button"
                      className="mrt-btn-secondary min-h-6 px-2 text-[11px]"
                      onClick={() => setOpen(m)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {open ? (
        <OccurrenceModal
          store={store}
          marker={open}
          onClose={() => setOpen(null)}
          onChange={onChange}
        />
      ) : null}
      {baselineOpen ? (
        <BaselineModal
          store={store}
          onChange={onChange}
          onClose={() => setBaselineOpen(false)}
        />
      ) : null}
    </div>
  );
}
