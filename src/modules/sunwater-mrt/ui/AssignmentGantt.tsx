"use client";

import type { AssignmentPlan, ScheduleStore } from "../schema";
import {
  addAssigneeToTask,
  assigneeLabel,
  assignedResourceIds,
  heatmapForPlan,
  newLeafTask,
  setTaskHour,
} from "../logic/assignment";
import { ragClass } from "../logic/status";

type Week = { idx: number; label: string };

export function AssignmentGantt({
  store,
  plan,
  weeks,
  mode,
  onChange,
}: {
  store: ScheduleStore;
  plan: AssignmentPlan;
  weeks: Week[];
  mode: "roles" | "people";
  onChange: (plan: AssignmentPlan) => void;
}) {
  const weekCount = plan.weekCount;
  const heat = heatmapForPlan(store, plan, mode);
  const assigneeOptions =
    mode === "roles"
      ? store.resourceRoles
      : store.people.map((p) => p.id);

  function update(mut: (next: AssignmentPlan) => void) {
    const next = JSON.parse(JSON.stringify(plan)) as AssignmentPlan;
    mut(next);
    onChange(next);
  }

  const leafs = plan.tasks.filter((t) => t.level !== 0);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="sticky left-0 z-10 bg-[var(--surface)] px-2 py-2 text-left font-medium">
              Task
            </th>
            {weeks.map((w) => (
              <th key={w.idx} className="min-w-14 px-1 py-2 text-center font-medium">
                {w.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leafs.length === 0 ? (
            <tr>
              <td
                colSpan={weeks.length + 1}
                className="px-2 py-4 text-[var(--muted)]"
              >
                No tasks yet. Add a task to start the template.
              </td>
            </tr>
          ) : (
            leafs.map((task) => {
              const rids = Object.keys(task.assign || {});
              const rows = rids.length ? rids : [""];
              return rows.map((rid, ri) => (
                <tr key={`${task.id}-${rid || "empty"}-${ri}`} className="border-b border-[var(--border)]">
                  <td className="sticky left-0 z-10 bg-[var(--surface)] px-2 py-1">
                    {ri === 0 ? (
                      <input
                        className="sg-input min-h-9 py-1 text-sm"
                        value={task.name}
                        onChange={(e) =>
                          update((p) => {
                            const t = p.tasks.find((x) => x.id === task.id);
                            if (t) t.name = e.target.value;
                          })
                        }
                      />
                    ) : (
                      <span className="pl-3 text-[var(--muted)]">
                        {rid ? assigneeLabel(store, rid, mode) : ""}
                      </span>
                    )}
                    {ri === 0 && rid ? (
                      <div className="mt-1 text-[var(--muted)]">
                        {assigneeLabel(store, rid, mode)}
                      </div>
                    ) : null}
                  </td>
                  {weeks.map((w) => {
                    const start = task.start ?? 0;
                    const dur = task.dur ?? 1;
                    const inBar = w.idx >= start && w.idx < start + dur;
                    const local = w.idx - start;
                    const hours = rid && task.assign?.[rid] ? task.assign[rid][local] || 0 : 0;
                    return (
                      <td
                        key={w.idx}
                        className={`px-0.5 py-1 text-center ${
                          inBar ? "bg-[var(--surface-muted)]" : ""
                        }`}
                      >
                        {rid ? (
                          <input
                            type="number"
                            min={0}
                            step={0.5}
                            className="h-8 w-12 rounded border border-[var(--border)] bg-[var(--surface)] text-center"
                            value={hours || ""}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              update((p) => {
                                const t = p.tasks.find((x) => x.id === task.id);
                                if (!t) return;
                                setTaskHour(
                                  t,
                                  rid,
                                  w.idx,
                                  Number.isFinite(v) ? v : 0,
                                  weekCount,
                                );
                              });
                            }}
                          />
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ));
            })
          )}
        </tbody>
        {heat.length > 0 ? (
          <tfoot>
            {heat.map((row) => (
              <tr key={row.id} className="border-t border-[var(--border)]">
                <td className="sticky left-0 z-10 bg-[var(--surface)] px-2 py-1 font-medium">
                  {assigneeLabel(store, row.id, mode)}
                  {mode === "people" ? (
                    <span className="ml-1 font-normal text-[var(--muted)]">
                      ({row.cap}h)
                    </span>
                  ) : null}
                </td>
                {row.hours.map((h, i) => (
                  <td
                    key={i}
                    className={`px-1 py-1 text-center ${ragClass(row.rag[i])}`}
                  >
                    {h || ""}
                  </td>
                ))}
              </tr>
            ))}
          </tfoot>
        ) : null}
      </table>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="sg-btn-secondary min-h-10 text-sm"
          onClick={() =>
            update((p) => {
              p.tasks.push(newLeafTask("New task", weekCount));
            })
          }
        >
          + Task
        </button>
        <label className="flex items-center gap-2 text-sm">
          <span>Add assignee</span>
          <select
            className="sg-input min-h-10 w-auto py-1"
            defaultValue=""
            onChange={(e) => {
              const key = e.target.value;
              e.target.value = "";
              if (!key) return;
              update((p) => {
                let t = p.tasks.find((x) => x.level !== 0);
                if (!t) {
                  t = newLeafTask("New task", weekCount);
                  p.tasks.push(t);
                }
                addAssigneeToTask(t, key);
              });
            }}
          >
            <option value="">Select…</option>
            {assigneeOptions
              .filter((id) => !assignedResourceIds(plan).includes(id))
              .map((id) => (
                <option key={id} value={id}>
                  {assigneeLabel(store, id, mode)}
                </option>
              ))}
          </select>
        </label>
      </div>
    </div>
  );
}
