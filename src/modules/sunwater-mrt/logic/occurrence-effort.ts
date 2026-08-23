import type { EffortDemo, ScheduleStore } from "../schema";
import {
  occurrencePlanWeeks,
  occurrenceWeekWindow,
  seedPlanFromDefaults,
  leadMonthsFromTailWeeks,
} from "./assignment";
import { defaultDueDayForIdx, fullDateLabel, idxDayToDate, monthIndex } from "./dates";
import {
  addWeeksWe,
  calendarWindow,
  ensureEffortDemo,
  syncHoursOriginToWindow,
  weMax,
  weMin,
  weeksBetweenWe,
  type WeDate,
} from "./effort-gantt";
import {
  assignmentPlanToEffortDemo,
  effortDemoToAssignmentPlan,
} from "./plan-effort-bridge";
import { effectiveDueIdx, schedKey, storeWindow } from "./scheduling";

function weekOrigin(
  weeks: { y?: number; m1?: number; d?: number }[],
): WeDate | undefined {
  const w = weeks[0];
  if (!w?.y || !w.m1 || !w.d) return undefined;
  return { y: w.y, m: w.m1, d: w.d };
}

export function loadOccurrenceEffortDemo(
  store: ScheduleStore,
  damId: string,
  laneCode: string,
  procDueIdx: number,
): EffortDemo {
  const dam = store.dams.find((d) => d.id === damId);
  const lane = store.lanes.find((l) => l.code === laneCode);
  if (!dam || !lane) return ensureEffortDemo(null);
  const key = schedKey(damId, laneCode, procDueIdx);
  const sd = store.scheduledDetails[key] || {};
  const weeks = occurrenceWeekWindow(store, damId, laneCode, procDueIdx);
  const dueIdx = effectiveDueIdx(store, dam, lane, procDueIdx);
  const winStart = storeWindow(store).start;
  const dueDay = sd.dueDayOverride ?? defaultDueDayForIdx(dueIdx, winStart);
  const dt = idxDayToDate(dueIdx, dueDay, winStart);
  const origin = weekOrigin(weeks as { y?: number; m1?: number; d?: number }[]);
  return assignmentPlanToEffortDemo(
    sd.plan || seedPlanFromDefaults(store, laneCode, weeks.length, damId),
    {
      due: { y: dt.y, m: dt.m1, d: dt.d },
      tailWeeks: Math.max(1, sd.tailWeeks ?? weeks.length),
      windowStart: sd.windowStart || origin,
      hoursOrigin: sd.windowStart || origin,
      stick: sd.stick || "tail-start",
      people: store.people,
    },
  );
}

/** Defaults-seeded demo as if this occurrence had no saved plan or due overrides. */
export function loadBaselineOccurrenceDemo(
  store: ScheduleStore,
  damId: string,
  laneCode: string,
  procDueIdx: number,
): EffortDemo {
  const clone = JSON.parse(JSON.stringify(store)) as ScheduleStore;
  delete clone.scheduledDetails[schedKey(damId, laneCode, procDueIdx)];
  return loadOccurrenceEffortDemo(clone, damId, laneCode, procDueIdx);
}

/** Persist plan hours and due/tail. hoursOrigin stays on windowStart. */
export function writeOccurrenceEffortDemo(
  store: ScheduleStore,
  damId: string,
  laneCode: string,
  procDueIdx: number,
  demo: EffortDemo,
): ScheduleStore {
  const synced = ensureEffortDemo(demo);
  syncHoursOriginToWindow(synced);
  const plan = effortDemoToAssignmentPlan(synced, { assignMode: "people" });
  const next: ScheduleStore = JSON.parse(JSON.stringify(store));
  const key = schedKey(damId, laneCode, procDueIdx);
  const existing = next.scheduledDetails[key] || {};
  const prevTasks = JSON.stringify(existing.plan?.tasks || []);
  const planDiffer = JSON.stringify(plan.tasks) !== prevTasks;
  const dam = next.dams.find((d) => d.id === damId);
  const lane = next.lanes.find((l) => l.code === laneCode);
  const winStart = storeWindow(next).start;
  const saved: ScheduleStore["scheduledDetails"][string] = {
    ...existing,
    plan,
    stick: synced.stick,
    windowStart: synced.windowStart,
    hoursOrigin: synced.windowStart,
  };
  if (dam && lane) {
    const cycleStore = JSON.parse(JSON.stringify(next)) as ScheduleStore;
    delete cycleStore.scheduledDetails[key];
    const dueIdx = monthIndex(synced.milestone.due.y, synced.milestone.due.m, winStart);
    const cycleDue = effectiveDueIdx(cycleStore, dam, lane, procDueIdx);
    const cycleDay = defaultDueDayForIdx(cycleDue, winStart);
    const weeks = occurrenceWeekWindow(cycleStore, damId, laneCode, procDueIdx);
    const datesDiffer =
      dueIdx !== cycleDue ||
      synced.milestone.due.d !== cycleDay ||
      synced.milestone.tailWeeks !== weeks.length;
    if (datesDiffer) {
      saved.dueIdxOverride = dueIdx;
      saved.dueDayOverride = synced.milestone.due.d;
      saved.tailWeeks = Math.max(1, Math.round(synced.milestone.tailWeeks) || 1);
      saved.leadInOverrideMonths = leadMonthsFromTailWeeks(
        synced.milestone.due.y,
        synced.milestone.due.m,
        synced.milestone.due.d,
        synced.milestone.tailWeeks,
      );
    } else {
      delete saved.dueIdxOverride;
      delete saved.dueDayOverride;
      delete saved.leadInOverrideMonths;
      delete saved.tailWeeks;
    }
    if (datesDiffer || planDiffer) saved.actualised = true;
    else delete saved.actualised;
  } else if (planDiffer) {
    saved.actualised = true;
  }
  next.scheduledDetails[key] = saved;
  return next;
}

export function occurrenceStackHeading(
  store: ScheduleStore,
  item: {
    damId: string;
    laneCode: string;
    procDueIdx: number;
    damName?: string;
    laneLabel?: string;
  },
) {
  const dam = store.dams.find((d) => d.id === item.damId);
  const lane = store.lanes.find((l) => l.code === item.laneCode);
  const damName = item.damName || dam?.name || item.damId;
  const obl =
    item.laneLabel ||
    (lane ? `${lane.code} ${lane.label}` : item.laneCode);
  if (!dam || !lane) return `${damName} · ${obl}`;
  const dueIdx = effectiveDueIdx(store, dam, lane, item.procDueIdx);
  const sd = store.scheduledDetails[schedKey(dam.id, lane.code, item.procDueIdx)] || {};
  const winStart = storeWindow(store).start;
  const dueDay = sd.dueDayOverride ?? defaultDueDayForIdx(dueIdx, winStart);
  return `${damName} · ${obl} · ${fullDateLabel(dueIdx, dueDay, winStart)}`;
}

/** Union of occurrence plan weeks (plus each demo's live window) onto one shared axis. */
export function alignDemosToSharedWindow(
  store: ScheduleStore,
  items: { damId: string; laneCode: string; procDueIdx: number }[],
  demos: EffortDemo[],
): EffortDemo[] {
  let start: WeDate | null = null;
  let end: WeDate | null = null;

  function cover(s: WeDate, e: WeDate) {
    start = start ? weMin(start, s) : s;
    end = end ? weMax(end, e) : e;
  }

  for (const item of items) {
    const weeks = occurrencePlanWeeks(
      store,
      item.damId,
      item.laneCode,
      item.procDueIdx,
    );
    if (!weeks.length) continue;
    const w0 = weeks[0] as { y?: number; m1?: number; d?: number };
    const wN = weeks[weeks.length - 1] as { y?: number; m1?: number; d?: number };
    if (w0?.y && w0.m1 && w0.d && wN?.y && wN.m1 && wN.d) {
      cover(
        { y: w0.y, m: w0.m1, d: w0.d },
        { y: wN.y, m: wN.m1, d: wN.d },
      );
    }
  }
  for (const d of demos) {
    const w = calendarWindow(d);
    cover(w.start, addWeeksWe(w.start, w.n - 1));
  }
  if (!start || !end) return demos;
  const n = Math.max(1, weeksBetweenWe(start, end) + 1);
  const already = demos.every((d) => {
    const w = calendarWindow(d);
    return (
      w.start.y === start!.y &&
      w.start.m === start!.m &&
      w.start.d === start!.d &&
      w.n === n
    );
  });
  if (already) return demos;
  return demos.map((d) => {
    const next = ensureEffortDemo(d);
    next.windowStart = start!;
    next.weekCount = n;
    syncHoursOriginToWindow(next);
    return next;
  });
}
