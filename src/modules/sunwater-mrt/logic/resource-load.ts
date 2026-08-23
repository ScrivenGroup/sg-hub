import type { AssignmentPlan, EffortDemo, ScheduleStore } from "../schema";
import {
  assignedResourceIds,
  occurrencePlanWeeks,
  resourceHoursByWeek,
  seedPlanFromDefaults,
} from "./assignment";
import { daysInMonth, idxDayToContinuous, idxToYm, monthIndex } from "./dates";
import {
  addWeeksWe,
  calendarWindow,
  spanOf,
  weeksBetweenWe,
  type WeDate,
} from "./effort-gantt";
import { ganttMarkers, schedKey, type GanttMarker } from "./scheduling";
import { ragStatus } from "./status";
import { round2 } from "./numbers";

export type LoadContribution = {
  damId: string;
  damName: string;
  laneCode: string;
  laneLabel: string;
  procDueIdx: number;
  hours: number;
};

export type PersonMonthCell = {
  hours: number;
  cap: number;
  rag: ReturnType<typeof ragStatus>;
  contributions: LoadContribution[];
  startC: number;
  endC: number;
};

export type PersonMonthLoad = {
  personId: string;
  personName: string;
  role: string;
  weeklyCapacityHours: number;
  cells: PersonMonthCell[];
  chunkStart: number;
  chunkEnd: number;
};

export type LoadGrain = "month" | "week";

export function buildLoadSlots(
  windowStart: { y: number; m: number },
  monthCount: number,
  grain: LoadGrain,
): { key: string; startC: number; endC: number; monthIdx: number; sundayDay?: number }[] {
  const n = Math.max(0, monthCount);
  const slots: {
    key: string;
    startC: number;
    endC: number;
    monthIdx: number;
    sundayDay?: number;
  }[] = [];
  if (grain === "month") {
    for (let i = 0; i < n; i++) {
      slots.push({ key: `m:${i}`, startC: i, endC: i + 1, monthIdx: i });
    }
    return slots;
  }
  for (let i = 0; i < n; i++) {
    const { y, m0 } = idxToYm(i, windowStart);
    const dim = daysInMonth(y, m0 + 1);
    const sundays: number[] = [];
    for (let d = 1; d <= dim; d++) {
      if (new Date(y, m0, d).getDay() === 0) sundays.push(d);
    }
    for (let s = 0; s < sundays.length; s++) {
      const d = sundays[s];
      const startDay = s === 0 ? 1 : sundays[s - 1] + 1;
      slots.push({
        key: `w:${i}:${d}`,
        startC: i + (startDay - 1) / dim,
        endC: i + d / dim,
        monthIdx: i,
        sundayDay: d,
      });
    }
  }
  return slots;
}

/** Sundays (week-ending dates) that fall in this calendar month. */
export function weeksEndingInMonth(y: number, m1: number) {
  const days = daysInMonth(y, m1);
  let n = 0;
  for (let d = 1; d <= days; d++) {
    if (new Date(y, m1 - 1, d).getDay() === 0) n += 1;
  }
  return n;
}

export function monthCapacityHours(
  weeklyCapacityHours: number,
  y: number,
  m1: number,
) {
  return (weeklyCapacityHours || 0) * weeksEndingInMonth(y, m1);
}

function planTotalHoursByWeek(plan: AssignmentPlan, weekCount: number) {
  const hours = new Array(weekCount).fill(0);
  for (const id of assignedResourceIds(plan)) {
    resourceHoursByWeek(plan, id, weekCount).forEach((h, i) => {
      hours[i] += h;
    });
  }
  return hours;
}

/** Continuous Gantt x (month units) for the Effort Gantt All-row span. */
export function occurrenceAllSpanContinuous(
  store: ScheduleStore,
  damId: string,
  laneCode: string,
  procDueIdx: number,
  windowStart: { y: number; m: number },
): { startC: number; endC: number } | null {
  const weeks = occurrencePlanWeeks(store, damId, laneCode, procDueIdx);
  const weekCount = Math.max(1, weeks.length);
  const key = schedKey(damId, laneCode, procDueIdx);
  const plan =
    store.scheduledDetails[key]?.plan ||
    seedPlanFromDefaults(store, laneCode, weekCount, damId);
  const span = spanOf(planTotalHoursByWeek(plan, Math.max(weekCount, plan.weekCount || 0)));
  if (span.start === null || span.finish === null) return null;
  const w0 = weeks[span.start] as { y?: number; m1?: number; d?: number } | undefined;
  const w1 = weeks[span.finish] as { y?: number; m1?: number; d?: number } | undefined;
  if (!w0?.y || !w0.m1 || !w0.d || !w1?.y || !w1.m1 || !w1.d) return null;
  const startDt = new Date(w0.y, w0.m1 - 1, w0.d);
  startDt.setDate(startDt.getDate() - 6);
  const startC = idxDayToContinuous(
    monthIndex(startDt.getFullYear(), startDt.getMonth() + 1, windowStart),
    startDt.getDate(),
    windowStart,
  );
  const endC = idxDayToContinuous(
    monthIndex(w1.y, w1.m1, windowStart),
    w1.d,
    windowStart,
  );
  if (!(endC > startC)) return null;
  return { startC, endC };
}

/**
 * People × month hours from occurrence plans (saved or Defaults seed).
 * Unassigned `role:…` hours are omitted. Markers should already be
 * filter-matched to the visible Gantt set.
 */
export function aggregateResourceLoad(
  store: ScheduleStore,
  markers: GanttMarker[],
  windowStart: { y: number; m: number },
  monthCount: number,
  grain: LoadGrain = "month",
): PersonMonthLoad[] {
  const slots = buildLoadSlots(windowStart, monthCount, grain);
  const slotIndex = new Map(slots.map((s, i) => [s.key, i]));
  const n = slots.length;
  const hoursByPerson = new Map<string, number[]>();
  const contribs = new Map<string, LoadContribution>();
  const personIdsInStore = new Set(store.people.map((p) => p.id));

  function hoursArr(personId: string) {
    let arr = hoursByPerson.get(personId);
    if (!arr) {
      arr = new Array(n).fill(0);
      hoursByPerson.set(personId, arr);
    }
    return arr;
  }

  function slotKeyForWeek(y: number, m1: number, d: number) {
    const mi = monthIndex(y, m1, windowStart);
    if (mi < 0 || mi >= monthCount) return null;
    if (grain === "month") return `m:${mi}`;
    return `w:${mi}:${d}`;
  }

  for (const m of markers) {
    if (m.kind === "completed" || m.kind === "notRequired") continue;
    const key = schedKey(m.damId, m.laneCode, m.procDueIdx);
    const weeks = occurrencePlanWeeks(
      store,
      m.damId,
      m.laneCode,
      m.procDueIdx,
    );
    const weekCount = Math.max(1, weeks.length);
    const plan =
      store.scheduledDetails[key]?.plan ||
      seedPlanFromDefaults(store, m.laneCode, weekCount, m.damId);
    const personIds = assignedResourceIds(plan).filter(
      (id) => !id.startsWith("role:") && personIdsInStore.has(id),
    );
    if (personIds.length === 0) continue;

    for (const personId of personIds) {
      const byWeek = resourceHoursByWeek(
        plan,
        personId,
        Math.max(weekCount, plan.weekCount || 0),
      );
      const arr = hoursArr(personId);
      for (let i = 0; i < byWeek.length; i++) {
        const h = byWeek[i];
        if (!h) continue;
        const w = weeks[i] as { y?: number; m1?: number; d?: number } | undefined;
        if (!w?.y || !w.m1 || !w.d) continue;
        const sk = slotKeyForWeek(w.y, w.m1, w.d);
        if (!sk) continue;
        const si = slotIndex.get(sk);
        if (si === undefined) continue;
        arr[si] += h;
        const ck = `${personId}\0${si}\0${m.damId}\0${m.laneCode}\0${m.procDueIdx}`;
        const prev = contribs.get(ck);
        if (prev) prev.hours += h;
        else {
          contribs.set(ck, {
            damId: m.damId,
            damName: m.damName,
            laneCode: m.laneCode,
            laneLabel: m.laneLabel,
            procDueIdx: m.procDueIdx,
            hours: h,
          });
        }
      }
    }
  }

  const cellContribs = new Map<string, LoadContribution[]>();
  for (const [ck, c] of contribs) {
    const cut = ck.indexOf("\0", ck.indexOf("\0") + 1);
    const cellKey = ck.slice(0, cut);
    const list = cellContribs.get(cellKey);
    if (list) list.push(c);
    else cellContribs.set(cellKey, [c]);
  }
  for (const list of cellContribs.values()) {
    list.sort((a, b) => b.hours - a.hours);
  }

  const people = [...store.people].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );

  return people.map((p) => {
    const arr = hoursByPerson.get(p.id) || new Array(n).fill(0);
    const cells: PersonMonthCell[] = arr.map((hours, si) => {
      const slot = slots[si];
      const cap =
        grain === "week"
          ? p.weeklyCapacityHours || 0
          : monthCapacityHours(
              p.weeklyCapacityHours,
              idxToYm(slot.monthIdx, windowStart).y,
              idxToYm(slot.monthIdx, windowStart).m0 + 1,
            );
      return {
        hours,
        cap,
        rag: ragStatus(hours, cap, store.overrunPercent),
        contributions: cellContribs.get(`${p.id}\0${si}`) || [],
        startC: slot.startC,
        endC: slot.endC,
      };
    });
    let chunkStart = -1;
    let chunkEnd = -1;
    cells.forEach((c, i) => {
      if (c.hours > 0) {
        if (chunkStart < 0) chunkStart = i;
        chunkEnd = i;
      }
    });
    return {
      personId: p.id,
      personName: p.name,
      role: p.role,
      weeklyCapacityHours: p.weeklyCapacityHours,
      cells,
      chunkStart,
      chunkEnd,
    };
  });
}

/** Planned hours per named person on an Effort Gantt week axis, across incomplete occurrences. */
export function personWeekLoadEverywhere(store: ScheduleStore, live: EffortDemo) {
  const { start, n } = calendarWindow(live);
  const byPerson = new Map<string, number[]>();
  const personIdsInStore = new Set(store.people.map((p) => p.id));
  const markers = ganttMarkers(store).filter(
    (m) => m.kind !== "completed" && m.kind !== "notRequired",
  );

  function arrOf(id: string) {
    let arr = byPerson.get(id);
    if (!arr) {
      arr = new Array(n).fill(0);
      byPerson.set(id, arr);
    }
    return arr;
  }

  for (const m of markers) {
    const key = schedKey(m.damId, m.laneCode, m.procDueIdx);
    const weeks = occurrencePlanWeeks(store, m.damId, m.laneCode, m.procDueIdx);
    const weekCount = Math.max(1, weeks.length);
    const plan =
      store.scheduledDetails[key]?.plan ||
      seedPlanFromDefaults(store, m.laneCode, weekCount, m.damId);
    const personIds = assignedResourceIds(plan).filter(
      (id) => !id.startsWith("role:") && personIdsInStore.has(id),
    );
    for (const personId of personIds) {
      const byWeek = resourceHoursByWeek(
        plan,
        personId,
        Math.max(weekCount, plan.weekCount || 0),
      );
      const arr = arrOf(personId);
      for (let i = 0; i < byWeek.length; i++) {
        const h = byWeek[i];
        if (!h) continue;
        const w = weeks[i] as { y?: number; m1?: number; d?: number } | undefined;
        if (!w?.y || !w.m1 || !w.d) continue;
        const col = weeksBetweenWe(start, { y: w.y, m: w.m1, d: w.d });
        if (col < 0 || col >= n) continue;
        arr[col] = round2(arr[col] + h);
      }
    }
  }
  return byPerson;
}

export function contributionsAroundWeek(
  store: ScheduleStore,
  personId: string,
  liveStart: WeDate,
  weekIdx: number,
  pad = 2,
): {
  weeks: WeDate[];
  availability: number;
  rows: { label: string; hours: number[] }[];
} {
  const centre = addWeeksWe(liveStart, weekIdx);
  const weeks: WeDate[] = [];
  for (let d = -pad; d <= pad; d++) weeks.push(addWeeksWe(centre, d));
  const person = store.people.find((p) => p.id === personId);
  const availability = person?.weeklyCapacityHours || 0;
  const personIdsInStore = new Set(store.people.map((p) => p.id));
  const markers = ganttMarkers(store).filter(
    (m) => m.kind !== "completed" && m.kind !== "notRequired",
  );
  const rows: { label: string; hours: number[] }[] = [];

  for (const m of markers) {
    const key = schedKey(m.damId, m.laneCode, m.procDueIdx);
    const planWeeks = occurrencePlanWeeks(store, m.damId, m.laneCode, m.procDueIdx);
    const weekCount = Math.max(1, planWeeks.length);
    const plan =
      store.scheduledDetails[key]?.plan ||
      seedPlanFromDefaults(store, m.laneCode, weekCount, m.damId);
    if (!assignedResourceIds(plan).includes(personId)) continue;
    if (!personIdsInStore.has(personId)) continue;
    const byWeek = resourceHoursByWeek(
      plan,
      personId,
      Math.max(weekCount, plan.weekCount || 0),
    );
    const hours = weeks.map((we) => {
      let sum = 0;
      for (let i = 0; i < byWeek.length; i++) {
        const w = planWeeks[i] as { y?: number; m1?: number; d?: number } | undefined;
        if (!w?.y || !w.m1 || !w.d) continue;
        if (weeksBetweenWe(we, { y: w.y, m: w.m1, d: w.d }) === 0) {
          sum += byWeek[i] || 0;
        }
      }
      return round2(sum);
    });
    if (!hours.some((h) => h > 0)) continue;
    rows.push({
      label: `${m.damName} · ${m.laneLabel}`,
      hours,
    });
  }
  rows.sort((a, b) => (b.hours[pad] || 0) - (a.hours[pad] || 0));
  return { weeks, availability, rows };
}
