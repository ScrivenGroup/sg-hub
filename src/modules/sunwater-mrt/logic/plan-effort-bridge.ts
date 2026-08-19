import type {
  AssignmentPlan,
  EffortDemo,
  EffortResource,
  EffortTask,
  PlanTask,
  ScheduleStore,
} from "../schema";
import { emptyPlan } from "../schema";
import { isLeafTask } from "./assignment";
import {
  calendarWindow,
  effortId,
  ensureEffortDemo,
  mergeSpans,
  spanOf,
  windowHours,
} from "./effort-gantt";

export type EffortAssignMode = "roles" | "people";

export function assignmentPlanToEffortDemo(
  plan: AssignmentPlan | undefined | null,
  opts: {
    due?: { y: number; m: number; d: number };
    tailWeeks?: number;
    windowStart?: { y: number; m: number; d: number };
    people?: ScheduleStore["people"];
  } = {},
): EffortDemo {
  const src = plan || emptyPlan(1);
  const weekCount = Math.max(1, src.weekCount || 1);
  const due = opts.due || { y: 2027, m: 6, d: 30 };
  const tailWeeks = Math.max(1, opts.tailWeeks ?? weekCount);
  const tasks: EffortTask[] = [];

  for (const t of src.tasks) {
    if (!isLeafTask(t)) continue;
    const start = t.start ?? 0;
    const resources: EffortResource[] = [];
    for (const [key, hours] of Object.entries(t.assign || {})) {
      const global = Array.from({ length: weekCount }, () => 0);
      (hours || []).forEach((h, i) => {
        const idx = start + i;
        if (idx >= 0 && idx < weekCount) global[idx] = Number(h) || 0;
      });
      let role = key;
      let personId: string | undefined;
      if (key.startsWith("role:")) role = key.slice(5);
      else {
        const person = opts.people?.find((p) => p.id === key);
        if (person) {
          personId = person.id;
          role = person.role || "";
        }
      }
      resources.push({
        id: effortId("r-"),
        role,
        personId,
        hours: global,
      });
    }
    tasks.push({
      id: t.id || effortId("t-"),
      name: t.name || "Task",
      resources,
    });
  }

  return ensureEffortDemo({
    weekCount,
    stick: "unstick",
    windowStart: opts.windowStart,
    hoursOrigin: opts.windowStart,
    milestone: {
      label: "Milestone",
      due,
      tailWeeks,
    },
    tasks,
  });
}

export function effortDemoToAssignmentPlan(
  demo: EffortDemo,
  opts: { assignMode: EffortAssignMode },
): AssignmentPlan {
  const d = ensureEffortDemo(demo);
  const { n } = calendarWindow(d);
  const tasks: PlanTask[] = d.tasks.map((task) => {
    const assign: Record<string, number[]> = {};
    const windowed = task.resources.map((res) => ({
      res,
      hours: windowHours(d, res.hours),
    }));
    const merged = mergeSpans(windowed.map((x) => spanOf(x.hours)));
    const start = merged.start ?? 0;
    const dur = Math.max(1, merged.dur || 1);
    for (const { res, hours } of windowed) {
      const slice = hours.slice(start, start + dur);
      if (!slice.some((h) => (Number(h) || 0) > 0)) continue;
      const key =
        opts.assignMode === "people"
          ? res.personId || (res.role ? `role:${res.role}` : res.id)
          : res.role || "Lead";
      if (assign[key]) {
        assign[key] = assign[key].map((h, i) => (Number(h) || 0) + (Number(slice[i]) || 0));
      } else {
        assign[key] = slice;
      }
    }
    return {
      id: task.id,
      name: task.name,
      level: 1,
      parent: null,
      start,
      dur,
      assign,
    };
  });
  return { tasks, weekCount: n };
}
