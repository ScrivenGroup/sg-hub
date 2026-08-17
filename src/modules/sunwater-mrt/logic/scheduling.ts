import type { Dam, Lane, ScheduleStore } from "../schema";
import { laneApplies } from "./applicability";
import { planStatusKind } from "./status";
import {
  WINDOW_END,
  WINDOW_START,
  defaultDueDayForIdx,
  idxToYm,
  monthIndex,
  todayIdx,
  todayYm,
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

export function occurrences(
  dam: Dam,
  lane: Lane,
  windowStart = WINDOW_START,
  windowEnd = WINDOW_END,
): [number, number][] {
  const out: [number, number][] = [];
  if (lane.kind === "cyclic-sr") {
    for (const y of dam.srYears || []) out.push([y, 6]);
  } else if (lane.kind === "cyclic-ci") {
    for (const y of dam.ciYears) out.push([y, 6]);
  } else if (lane.kind === "annual-ai") {
    if (dam.ai) {
      for (let y = windowStart.y; y <= windowEnd.y; y++) out.push([y, 6]);
    }
  } else if (lane.kind === "annual-fixed") {
    const month = lane.month ?? 6;
    for (let y = windowStart.y; y <= windowEnd.y; y++) out.push([y, month]);
  } else if (lane.kind === "once" && lane.once) {
    out.push([lane.once.y, lane.once.m]);
  } else if (lane.kind === "paradise") {
    if (dam.name === "Paradise Dam") out.push([2020, 12]);
  }
  return out;
}

export function nextDueInfo(store: ScheduleStore, dam: Dam, lane: Lane) {
  const occs = occurrences(dam, lane)
    .map(([y, m]) => monthIndex(y, m))
    .sort((a, b) => a - b);
  if (occs.length === 0) return null;
  if (lane.kind === "paradise") return { dueIdx: occs[0], overdue: true };
  const tIdx = todayIdx(todayYm());
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
  const tIdx = todayIdx(todayYm());
  const leadStart = dueIdxRounded - lead;
  const status =
    displayDueIdx < tIdx
      ? "overdue"
      : displayLeadStart <= tIdx
        ? "ongoing"
        : "upcoming";
  return { status, dueIdx: dueIdxRounded, leadStart, displayDueIdx, displayLeadStart };
}

export function effectiveDueDate(
  store: ScheduleStore,
  dam: Dam,
  lane: Lane,
  procDueIdx: number,
) {
  const dueIdx = effectiveDueIdx(store, dam, lane, procDueIdx);
  const sd = store.scheduledDetails[schedKey(dam.id, lane.code, procDueIdx)];
  const day = sd?.dueDayOverride ?? defaultDueDayForIdx(dueIdx);
  const { y, m0 } = idxToYm(dueIdx);
  return { y, m1: m0 + 1, d: day, dueIdx };
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
  const out: GanttMarker[] = [];
  for (const dam of store.dams) {
    for (const lane of appliedLanes(store, dam)) {
      for (const [y, m] of occurrences(dam, lane)) {
        const procDueIdx = monthIndex(y, m);
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
