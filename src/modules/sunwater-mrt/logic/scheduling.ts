import type { Dam, Lane, ScheduleStore } from "../schema";
import { laneApplies } from "./applicability";
import { planStatusKind } from "./status";
import {
  addMonths,
  frequencyToMonths,
  monthIndex,
  planningWindow,
  todayIdx,
  todayYm,
  ymOnOrAfter,
} from "./dates";

export function schedKey(damId: string, laneCode: string, dueIdx: number) {
  return `${damId}|${laneCode}|${Math.round(dueIdx)}`;
}

export function getLead(store: ScheduleStore, code: string, damId: string) {
  const ov = store.leadOverrides[code]?.[damId];
  if (ov === undefined || ov === null || Number.isNaN(Number(ov))) {
    return store.leadGeneral[code] ?? 0;
  }
  return Number(ov);
}

export function isScheduled(store: ScheduleStore, dam: Dam, lane: Lane, dueIdx: number) {
  const sd = store.scheduledDetails[schedKey(dam.id, lane.code, dueIdx)];
  return !!(sd && (sd.dueIdxOverride !== undefined || sd.leadInOverrideMonths !== undefined));
}

export function isCompleted(store: ScheduleStore, dam: Dam, lane: Lane, dueIdx: number) {
  const sd = store.scheduledDetails[schedKey(dam.id, lane.code, dueIdx)];
  return !!(sd && sd.completed);
}

export function effectiveDueIdx(
  store: ScheduleStore,
  dam: Dam,
  lane: Lane,
  procDueIdx: number,
) {
  const sd = store.scheduledDetails[schedKey(dam.id, lane.code, procDueIdx)];
  return sd?.dueIdxOverride !== undefined ? sd.dueIdxOverride : procDueIdx;
}

export function effectiveLead(
  store: ScheduleStore,
  dam: Dam,
  lane: Lane,
  dueIdx: number,
) {
  const sd = store.scheduledDetails[schedKey(dam.id, lane.code, dueIdx)];
  if (sd?.leadInOverrideMonths !== undefined) return sd.leadInOverrideMonths;
  return getLead(store, lane.code, dam.id);
}

export function occurrences(lane: Lane, today = todayYm()): [number, number][] {
  const step = frequencyToMonths(lane.frequencyCount, lane.frequencyUnit);
  const dueMonth =
    lane.frequencyUnit === "year" ? Math.min(12, Math.max(1, lane.dueMonth || 6)) : today.m;
  let first = { y: today.y, m: dueMonth };
  if (lane.frequencyUnit !== "year") {
    first = { y: today.y, m: today.m };
  }
  if (!ymOnOrAfter(first.y, first.m, today)) {
    first = addMonths(first.y, first.m, step);
  }
  const horizon = addMonths(today.y, today.m, 25 * 12);
  const out: [number, number][] = [];
  let cur = first;
  let i = 0;
  while (
    cur.y < horizon.y ||
    (cur.y === horizon.y && cur.m <= horizon.m)
  ) {
    out.push([cur.y, cur.m]);
    cur = addMonths(cur.y, cur.m, step);
    i += 1;
    if (i > 400) break;
  }
  return out;
}

export function nextDueInfo(store: ScheduleStore, dam: Dam, lane: Lane) {
  const start = planningWindow().start;
  const occs = occurrences(lane)
    .map(([y, m]) => monthIndex(y, m, start))
    .sort((a, b) => a - b);
  if (occs.length === 0) return null;
  const tIdx = todayIdx();
  for (const d of occs) {
    const dr = Math.round(d);
    if (d >= tIdx && !isCompleted(store, dam, lane, dr)) {
      return { dueIdx: d, overdue: false };
    }
  }
  for (let i = occs.length - 1; i >= 0; i--) {
    const dr = Math.round(occs[i]);
    if (!isCompleted(store, dam, lane, dr)) {
      return { dueIdx: occs[i], overdue: true };
    }
  }
  return { dueIdx: occs[occs.length - 1], overdue: false };
}

export function occurrenceStatus(
  store: ScheduleStore,
  dam: Dam,
  lane: Lane,
  dueIdxRounded: number,
): {
  status: "overdue" | "ongoing" | "upcoming";
  dueIdx: number;
  leadStart: number;
  displayDueIdx: number;
  displayLeadStart: number;
} {
  const lead = effectiveLead(store, dam, lane, dueIdxRounded);
  const displayDueIdx = effectiveDueIdx(store, dam, lane, dueIdxRounded);
  const displayLeadStart = displayDueIdx - lead;
  const tIdx = todayIdx();
  const leadStart = dueIdxRounded - lead;
  const status =
    displayDueIdx < tIdx
      ? "overdue"
      : displayLeadStart <= tIdx
        ? "ongoing"
        : "upcoming";
  return { status, dueIdx: dueIdxRounded, leadStart, displayDueIdx, displayLeadStart };
}

export function appliedLanes(store: ScheduleStore, dam: Dam) {
  return store.lanes.filter((lane) =>
    laneApplies(store.laneApplicability, dam, lane),
  );
}

export type GanttMarker = {
  damId: string;
  damName: string;
  laneCode: string;
  laneLabel: string;
  color: string;
  procDueIdx: number;
  displayDueIdx: number;
  leadStart: number;
  kind: ReturnType<typeof planStatusKind>;
  bucket: "overdue" | "ongoing" | "upcoming";
};

export function ganttMarkers(store: ScheduleStore): GanttMarker[] {
  const start = planningWindow().start;
  const out: GanttMarker[] = [];
  for (const dam of store.dams) {
    for (const lane of appliedLanes(store, dam)) {
      for (const [y, m] of occurrences(lane)) {
        const procDueIdx = monthIndex(y, m, start);
        if (procDueIdx < 0) continue;
        const st = occurrenceStatus(store, dam, lane, Math.round(procDueIdx));
        out.push({
          damId: dam.id,
          damName: dam.name,
          laneCode: lane.code,
          laneLabel: lane.label,
          color: lane.color,
          procDueIdx: Math.round(procDueIdx),
          displayDueIdx: st.displayDueIdx,
          leadStart: st.displayLeadStart,
          kind: planStatusKind(
            isScheduled(store, dam, lane, Math.round(procDueIdx)),
            isCompleted(store, dam, lane, Math.round(procDueIdx)),
          ),
          bucket: st.status,
        });
      }
    }
  }
  return out;
}
