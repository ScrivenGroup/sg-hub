import type { AssignmentPlan, PlanTask, ScheduleStore } from "../schema";
import { emptyPlan } from "../schema";
import {
  defaultDueDayForIdx,
  idxDayToDate,
  weekEndingSunday,
} from "./dates";
import { effectiveDueIdx, effectiveLead, schedKey } from "./scheduling";
import { ragStatus } from "./status";

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function newAssignmentId(prefix = "id") {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function clonePlan(plan?: AssignmentPlan | null): AssignmentPlan {
  return JSON.parse(JSON.stringify(plan || emptyPlan(1))) as AssignmentPlan;
}

export function isLeafTask(t: PlanTask) {
  return t.level !== 0;
}

function clampTaskToWindow(task: PlanTask, weekCount: number) {
  if (!isLeafTask(task)) return;
  weekCount = Math.max(1, weekCount || 1);
  if (task.start === undefined || task.start === null) task.start = 0;
  if (task.dur === undefined || task.dur === null) task.dur = 1;
  if (task.start >= weekCount) {
    task.start = Math.max(0, weekCount - 1);
    task.dur = 1;
  }
  if (task.start < 0) task.start = 0;
  if (task.start + task.dur > weekCount) task.dur = Math.max(1, weekCount - task.start);
  for (const rid of Object.keys(task.assign || {})) {
    const a = [...(task.assign![rid] || [])];
    while (a.length < task.dur) a.push(0);
    task.assign![rid] = a.slice(0, task.dur);
  }
}

export function resizePlanToWeekCount(
  plan: AssignmentPlan,
  oldCount: number,
  newCount: number,
) {
  oldCount = Math.max(1, oldCount || plan.weekCount || 1);
  newCount = Math.max(1, newCount || 1);
  const delta = newCount - oldCount;
  for (const t of plan.tasks) {
    if (!isLeafTask(t)) continue;
    if (t.start === undefined) t.start = 0;
    if (t.dur === undefined) t.dur = 1;
    if (delta > 0) t.start += delta;
    else if (delta < 0) {
      const shift = -delta;
      const newStart = t.start - shift;
      if (newStart + t.dur <= 0) {
        t.start = 0;
        t.dur = 1;
        for (const rid of Object.keys(t.assign || {})) t.assign![rid] = [0];
      } else if (newStart < 0) {
        const drop = -newStart;
        for (const rid of Object.keys(t.assign || {})) {
          t.assign![rid] = (t.assign![rid] || []).slice(drop);
        }
        t.dur -= drop;
        t.start = 0;
      } else {
        t.start = newStart;
      }
    }
    clampTaskToWindow(t, newCount);
  }
  plan.weekCount = newCount;
  return plan;
}

export function weekEndingLabel(y: number, m1: number, d: number) {
  return `${d} ${SHORT_MONTHS[m1 - 1]}`;
}

export function weeksCoveringLeadIn(
  dueY: number,
  dueM1: number,
  dueD: number,
  leadMonths: number,
) {
  leadMonths = Number(leadMonths) || 0;
  const dueWE = weekEndingSunday(dueY, dueM1, dueD);
  const startDt = new Date(dueY, dueM1 - 1, dueD);
  startDt.setMonth(startDt.getMonth() - leadMonths);
  const startWE = weekEndingSunday(
    startDt.getFullYear(),
    startDt.getMonth() + 1,
    startDt.getDate(),
  );
  const weeks: { idx: number; y: number; m1: number; d: number; label: string; relative?: boolean }[] = [];
  const cur = new Date(startWE.y, startWE.m1 - 1, startWE.d);
  const end = new Date(dueWE.y, dueWE.m1 - 1, dueWE.d);
  let i = 0;
  while (cur.getTime() <= end.getTime() && i < 220) {
    weeks.push({
      idx: i,
      y: cur.getFullYear(),
      m1: cur.getMonth() + 1,
      d: cur.getDate(),
      label: weekEndingLabel(cur.getFullYear(), cur.getMonth() + 1, cur.getDate()),
    });
    cur.setDate(cur.getDate() + 7);
    i++;
  }
  if (weeks.length === 0) {
    weeks.push({
      idx: 0,
      y: dueWE.y,
      m1: dueWE.m1,
      d: dueWE.d,
      label: weekEndingLabel(dueWE.y, dueWE.m1, dueWE.d),
    });
  }
  return weeks;
}

export function weekCountFromLeadMonths(leadMonths: number) {
  return weeksCoveringLeadIn(2026, 6, 30, leadMonths).length;
}

export function relativeWeekWindow(weekCount: number) {
  const n = Math.max(1, weekCount || 1);
  return Array.from({ length: n }, (_, i) => ({
    idx: i,
    label: `Week ${i + 1}`,
    relative: true as const,
  }));
}

export function laneTemplateWeekWindow(store: ScheduleStore, laneCode: string) {
  const lane = store.lanes.find((l) => l.code === laneCode);
  const lead =
    store.leadGeneral[laneCode] !== undefined
      ? store.leadGeneral[laneCode]
      : (lane?.defLead ?? 0);
  return relativeWeekWindow(weekCountFromLeadMonths(lead));
}

export function occurrenceWeekWindow(
  store: ScheduleStore,
  damId: string,
  laneCode: string,
  procDueIdx: number,
) {
  const dam = store.dams.find((d) => d.id === damId);
  const lane = store.lanes.find((l) => l.code === laneCode);
  if (!dam || !lane) return relativeWeekWindow(1);
  const dueIdx = effectiveDueIdx(store, dam, lane, procDueIdx);
  const sd = store.scheduledDetails[schedKey(dam.id, lane.code, procDueIdx)];
  const dueDay = sd?.dueDayOverride ?? defaultDueDayForIdx(dueIdx);
  const lead = effectiveLead(store, dam, lane, procDueIdx);
  const due = idxDayToDate(dueIdx, dueDay);
  return weeksCoveringLeadIn(due.y, due.m1, due.d, lead);
}

export function coerceDefaultAssignToRoles(
  plan: AssignmentPlan,
  roles: string[],
  people: ScheduleStore["people"],
) {
  for (const t of plan.tasks) {
    if (!t.assign) continue;
    const next: Record<string, number[]> = {};
    for (const key of Object.keys(t.assign)) {
      let role = key;
      if (!roles.includes(key)) {
        if (key.startsWith("role:")) role = key.slice(5);
        else {
          const p = people.find((x) => x.id === key);
          role = p?.role || "";
        }
      }
      if (role) next[role] = t.assign[key];
    }
    t.assign = next;
  }
  return plan;
}

export function defaultPlanForLane(store: ScheduleStore, laneCode: string): AssignmentPlan {
  const existing = store.defaultPlansByLane[laneCode];
  if (existing) {
    coerceDefaultAssignToRoles(existing, store.resourceRoles, store.people);
    return existing;
  }
  const weeks = laneTemplateWeekWindow(store, laneCode);
  return emptyPlan(weeks.length);
}

export function getEffectiveDamOwnership(
  store: ScheduleStore,
  damId: string,
  role: string,
) {
  const byRole = store.damOwnership[role] || {};
  if (byRole[`dam:${damId}`]) return byRole[`dam:${damId}`];
  const dam = store.dams.find((d) => d.id === damId);
  const region = dam?.region || store.damMeta[damId]?.region || "Unassigned";
  if (byRole[`region:${region}`]) return byRole[`region:${region}`];
  return byRole.ALL || "";
}

export function remapRoleAssignToPeople(
  store: ScheduleStore,
  plan: AssignmentPlan,
  damId: string,
) {
  for (const t of plan.tasks) {
    if (!t.assign) continue;
    const next: Record<string, number[]> = {};
    for (const key of Object.keys(t.assign)) {
      const hours = t.assign[key];
      if (store.people.some((p) => p.id === key)) {
        next[key] = hours;
        continue;
      }
      const role = key.startsWith("role:") ? key.slice(5) : key;
      const ownerName = getEffectiveDamOwnership(store, damId, role);
      const person = store.people.find((p) => p.name === ownerName || p.id === ownerName);
      if (person) next[person.id] = hours;
      else if (role) next[`role:${role}`] = hours;
      else next[key] = hours;
    }
    t.assign = next;
  }
  return plan;
}

export function seedPlanFromDefaults(
  store: ScheduleStore,
  laneCode: string,
  targetWeekCount: number,
  damId?: string,
) {
  const src = store.defaultPlansByLane[laneCode] || emptyPlan(targetWeekCount);
  const plan = clonePlan(src);
  const fromCount = plan.weekCount || laneTemplateWeekWindow(store, laneCode).length;
  resizePlanToWeekCount(plan, fromCount, targetWeekCount);
  plan.weekCount = targetWeekCount;
  plan.seededFromLane = true;
  if (damId) remapRoleAssignToPeople(store, plan, damId);
  return plan;
}

export function newLeafTask(name: string, weekCount: number): PlanTask {
  const task: PlanTask = {
    id: newAssignmentId("t-"),
    name: name || "New task",
    level: 1,
    parent: null,
    start: 0,
    dur: Math.max(1, Math.min(4, weekCount || 1)),
    assign: {},
  };
  clampTaskToWindow(task, weekCount || 1);
  return task;
}

export function ensureAssignArray(task: PlanTask, resourceId: string) {
  if (!task.assign) task.assign = {};
  const dur = Math.max(1, task.dur || 1);
  if (!task.assign[resourceId]) task.assign[resourceId] = new Array(dur).fill(0);
  while (task.assign[resourceId].length < dur) task.assign[resourceId].push(0);
  if (task.assign[resourceId].length > dur) {
    task.assign[resourceId] = task.assign[resourceId].slice(0, dur);
  }
  return task.assign[resourceId];
}

export function setTaskHour(
  task: PlanTask,
  resourceId: string,
  globalWeekIdx: number,
  value: number,
  weekCount: number,
) {
  if (!isLeafTask(task)) return;
  const start = task.start ?? 0;
  const local = globalWeekIdx - start;
  if (local < 0 || local >= (task.dur || 1)) {
    // expand to cover
    if (globalWeekIdx < start) {
      const need = start - globalWeekIdx;
      task.start = globalWeekIdx;
      task.dur = (task.dur || 1) + need;
      for (const r of Object.keys(task.assign || {})) {
        for (let k = 0; k < need; k++) task.assign![r].unshift(0);
      }
    } else {
      const need = globalWeekIdx - (start + (task.dur || 1)) + 1;
      task.dur = (task.dur || 1) + need;
      for (const r of Object.keys(task.assign || {})) {
        for (let k = 0; k < need; k++) task.assign![r].push(0);
      }
    }
  }
  clampTaskToWindow(task, weekCount);
  const arr = ensureAssignArray(task, resourceId);
  const idx = globalWeekIdx - (task.start ?? 0);
  if (idx >= 0 && idx < arr.length) arr[idx] = Math.max(0, value);
}

export function resourceHoursByWeek(
  plan: AssignmentPlan,
  resourceId: string,
  weekCount: number,
) {
  const hours = new Array(weekCount).fill(0);
  for (const t of plan.tasks) {
    if (!isLeafTask(t) || !t.assign?.[resourceId]) continue;
    const start = t.start ?? 0;
    t.assign[resourceId].forEach((h, i) => {
      const g = start + i;
      if (g >= 0 && g < weekCount) hours[g] += h;
    });
  }
  return hours;
}

export function assignedResourceIds(plan: AssignmentPlan) {
  const ids = new Set<string>();
  for (const t of plan.tasks) {
    for (const k of Object.keys(t.assign || {})) ids.add(k);
  }
  return [...ids];
}

export function addAssigneeToTask(
  task: PlanTask,
  key: string,
) {
  ensureAssignArray(task, key);
}

export function personCapacity(store: ScheduleStore, personId: string) {
  const p = store.people.find((x) => x.id === personId);
  return p?.weeklyCapacityHours ?? 0;
}

export function heatmapForPlan(
  store: ScheduleStore,
  plan: AssignmentPlan,
  mode: "roles" | "people",
) {
  const weekCount = plan.weekCount;
  const ids = assignedResourceIds(plan);
  return ids.map((id) => {
    const hours = resourceHoursByWeek(plan, id, weekCount);
    const cap =
      mode === "people" ? personCapacity(store, id) : 0;
    const rag = hours.map((h) =>
      mode === "people" ? ragStatus(h, cap, store.overrunPercent) : h ? "ok" : "empty",
    );
    return { id, hours, cap, rag };
  });
}

export function assigneeLabel(
  store: ScheduleStore,
  key: string,
  mode: "roles" | "people",
) {
  if (mode === "roles") return key.startsWith("role:") ? key.slice(5) : key;
  if (key.startsWith("role:")) return `${key.slice(5)} (unassigned)`;
  const p = store.people.find((x) => x.id === key);
  return p?.name || key;
}
