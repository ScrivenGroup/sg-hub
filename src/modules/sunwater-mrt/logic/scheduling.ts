import type { Dam, Lane, ScheduleStore, ScheduledDetail } from "../schema";
import { laneApplies } from "./applicability";
import { nextDueRag, planStatusKind } from "./status";
import {
  addMonths,
  calendarToday,
  clampHorizonYears,
  daysInMonth,
  defaultDueDayForIdx,
  frequencyToMonths,
  fullDateLabel,
  fyEndYearFromIdx,
  idxDayOnOrAfterDate,
  idxDayToDate,
  idxToShortLabel,
  idxToYm,
  monthIndex,
  planningWindow,
  storeBaseline,
  todayIdx,
  todayYm,
  weekEndingSunday,
  ymdTime,
  ymOnOrAfter,
} from "./dates";

export function schedKey(damId: string, laneCode: string, dueIdx: number) {
  return `${damId}|${laneCode}|${Math.round(dueIdx)}`;
}

export function parseSchedKey(key: string) {
  const parts = key.split("|");
  if (parts.length < 3) return null;
  const dueIdx = Number(parts[parts.length - 1]);
  if (Number.isNaN(dueIdx)) return null;
  return {
    damId: parts[0],
    laneCode: parts.slice(1, -1).join("|"),
    dueIdx,
  };
}

export function detailIsActualised(sd: ScheduledDetail | undefined) {
  if (!sd) return false;
  return !!(
    sd.actualised ||
    sd.dueIdxOverride !== undefined ||
    sd.dueDayOverride !== undefined ||
    sd.leadInOverrideMonths !== undefined ||
    sd.completed ||
    sd.notRequired
  );
}

export function isActualised(
  store: ScheduleStore,
  dam: Dam,
  lane: Lane,
  dueIdx: number,
) {
  return detailIsActualised(store.scheduledDetails[schedKey(dam.id, lane.code, dueIdx)]);
}

export function pairHasActualised(
  store: ScheduleStore,
  damId: string,
  laneCode: string,
) {
  const prefix = `${damId}|${laneCode}|`;
  return Object.entries(store.scheduledDetails).some(
    ([key, sd]) => key.startsWith(prefix) && detailIsActualised(sd),
  );
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
  return !!(
    sd &&
    (sd.actualised ||
      sd.dueIdxOverride !== undefined ||
      sd.dueDayOverride !== undefined ||
      sd.leadInOverrideMonths !== undefined)
  );
}

/** Day-of-month from cycle anchor for a display month, else EOM default. */
export function cycleAnchorDueDay(
  store: ScheduleStore,
  dam: Dam,
  lane: Lane,
  displayIdx: number,
  windowStart = storeWindow(store).start,
) {
  const anchor = store.laneCycleAnchors?.[dam.id]?.[lane.code];
  const { y, m0 } = idxToYm(displayIdx, windowStart);
  const dim = daysInMonth(y, m0 + 1);
  if (anchor?.d != null && Number.isFinite(anchor.d)) {
    return Math.min(dim, Math.max(1, Math.round(anchor.d)));
  }
  return defaultDueDayForIdx(displayIdx, windowStart);
}

export function effectiveDueDay(
  store: ScheduleStore,
  dam: Dam,
  lane: Lane,
  procDueIdx: number,
  windowStart = storeWindow(store).start,
) {
  const sd = store.scheduledDetails[schedKey(dam.id, lane.code, procDueIdx)];
  const displayIdx = effectiveDueIdx(store, dam, lane, procDueIdx);
  if (sd?.dueDayOverride != null) return sd.dueDayOverride;
  return cycleAnchorDueDay(store, dam, lane, displayIdx, windowStart);
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

export function storeWindow(store: ScheduleStore, now = new Date()) {
  return planningWindow(now, clampHorizonYears(store.horizonYears));
}

export function isUserNotRequired(
  store: ScheduleStore,
  dam: Dam,
  lane: Lane,
  dueIdx: number,
) {
  const sd = store.scheduledDetails[schedKey(dam.id, lane.code, dueIdx)];
  return !!(sd && sd.notRequired && !sd.completed);
}

export function isSkippedPredicted(
  store: ScheduleStore,
  dam: Dam,
  lane: Lane,
  dueIdx: number,
) {
  const sd = store.scheduledDetails[schedKey(dam.id, lane.code, dueIdx)];
  return !!(sd && sd.skippedPredicted && !detailIsActualised(sd));
}

export function occurrences(
  store: ScheduleStore,
  dam: Dam,
  lane: Lane,
  today = todayYm(),
): [number, number][] {
  const step = frequencyToMonths(lane.frequencyCount, lane.frequencyUnit);
  const horizonYears = clampHorizonYears(store.horizonYears);
  const horizon = addMonths(today.y, today.m, horizonYears * 12);
  const baseline = storeBaseline(store);
  const from = { y: baseline.y, m: baseline.m };
  const anchor = store.laneCycleAnchors?.[dam.id]?.[lane.code];
  let first: { y: number; m: number };
  if (anchor?.y && anchor?.m) {
    first = {
      y: anchor.y,
      m: Math.min(12, Math.max(1, anchor.m)),
    };
  } else {
    const dueMonth =
      lane.frequencyUnit === "year"
        ? Math.min(12, Math.max(1, lane.dueMonth || 6))
        : from.m;
    first = { y: from.y, m: dueMonth };
    if (lane.frequencyUnit !== "year") {
      first = { y: from.y, m: from.m };
    }
  }
  let skip = 0;
  while (skip < 400 && !ymOnOrAfter(first.y, first.m, from)) {
    first = addMonths(first.y, first.m, step);
    skip += 1;
  }
  const out: [number, number][] = [];
  let cur = first;
  let i = 0;
  while (
    cur.y < horizon.y ||
    (cur.y === horizon.y && cur.m <= horizon.m)
  ) {
    if (ymOnOrAfter(cur.y, cur.m, from)) out.push([cur.y, cur.m]);
    cur = addMonths(cur.y, cur.m, step);
    i += 1;
    if (i > 400) break;
  }
  return out;
}

export function nextDueInfo(store: ScheduleStore, dam: Dam, lane: Lane) {
  const start = storeWindow(store).start;
  const occs = occurrences(store, dam, lane)
    .map(([y, m]) => monthIndex(y, m, start))
    .sort((a, b) => a - b);
  if (occs.length === 0) return null;
  const tIdx = todayIdx();
  for (const d of occs) {
    const dr = Math.round(d);
    if (d >= tIdx && !skipsNextDue(store, dam, lane, dr)) {
      return { dueIdx: d, overdue: false };
    }
  }
  for (let i = occs.length - 1; i >= 0; i--) {
    const dr = Math.round(occs[i]);
    if (!skipsNextDue(store, dam, lane, dr)) {
      return { dueIdx: occs[i], overdue: true };
    }
  }
  return null;
}

function skipsNextDue(
  store: ScheduleStore,
  dam: Dam,
  lane: Lane,
  procDueIdx: number,
) {
  if (isCompleted(store, dam, lane, procDueIdx)) return true;
  if (isUserNotRequired(store, dam, lane, procDueIdx)) return true;
  if (isSkippedPredicted(store, dam, lane, procDueIdx)) return true;
  if (isScheduled(store, dam, lane, procDueIdx)) return false;
  const display = effectiveDueIdx(store, dam, lane, procDueIdx);
  return derivedNotRequired(store, dam, lane, display);
}

function damHasLaneInFy(
  store: ScheduleStore,
  dam: Dam,
  code: string,
  fy: number,
) {
  const lane = store.lanes.find((l) => l.code === code);
  if (!lane) return false;
  if (!laneApplies(store.laneApplicability, dam, lane)) return false;
  const start = storeWindow(store).start;
  for (const [y, m] of occurrences(store, dam, lane)) {
    const proc = monthIndex(y, m, start);
    const display = effectiveDueIdx(store, dam, lane, proc);
    if (fyEndYearFromIdx(display, start) === fy) return true;
  }
  const prefix = `${dam.id}|${code}|`;
  for (const [key, sd] of Object.entries(store.scheduledDetails)) {
    if (!key.startsWith(prefix) || !detailIsActualised(sd)) continue;
    const parsed = parseSchedKey(key);
    if (!parsed) continue;
    const display = effectiveDueIdx(store, dam, lane, parsed.dueIdx);
    if (fyEndYearFromIdx(display, start) === fy) return true;
  }
  return false;
}

export function derivedNotRequired(
  store: ScheduleStore,
  dam: Dam,
  lane: Lane,
  displayIdx: number,
) {
  if (lane.code !== "AI" && lane.code !== "CI") return false;
  const fy = fyEndYearFromIdx(displayIdx, storeWindow(store).start);
  const ds = damHasLaneInFy(store, dam, "SR", fy);
  if (lane.code === "AI") {
    return ds || damHasLaneInFy(store, dam, "CI", fy);
  }
  return ds;
}

export type NextDueChip = {
  dueIdx: number;
  procDueIdx: number;
  dueDay: number;
  overdue: boolean;
  label: string;
  fullLabel: string;
  rag: ReturnType<typeof nextDueRag>;
};

export function nextDueChip(
  store: ScheduleStore,
  dam: Dam,
  lane: Lane,
): NextDueChip | null {
  const info = nextDueInfo(store, dam, lane);
  if (!info) return null;
  const procDueIdx = Math.round(info.dueIdx);
  const displayIdx = effectiveDueIdx(store, dam, lane, procDueIdx);
  const dueDay = effectiveDueDay(store, dam, lane, procDueIdx);
  const st = occurrenceStatus(store, dam, lane, procDueIdx);
  const overdue = st.status === "overdue";
  const rag = nextDueRag(st.status);
  const short = idxToShortLabel(displayIdx);
  const full = fullDateLabel(displayIdx, dueDay);
  return {
    dueIdx: displayIdx,
    procDueIdx,
    dueDay,
    overdue,
    label: overdue ? `OVERDUE ${short}` : short,
    fullLabel: overdue ? `OVERDUE ${full}` : full,
    rag,
  };
}

export function earliestNextDue(chips: NextDueChip[]): NextDueChip | null {
  if (chips.length === 0) return null;
  return chips.reduce((best, chip) =>
    chip.dueIdx < best.dueIdx ? chip : best,
  );
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
  const winStart = storeWindow(store).start;
  const displayDueIdx = effectiveDueIdx(store, dam, lane, dueIdxRounded);
  const dueDay = effectiveDueDay(store, dam, lane, dueIdxRounded, winStart);
  const due = idxDayToDate(displayDueIdx, dueDay, winStart);
  const sd = store.scheduledDetails[schedKey(dam.id, lane.code, dueIdxRounded)];
  const today = calendarToday();
  const todayT = ymdTime(today.y, today.m1, today.d);
  const dueT = ymdTime(due.y, due.m1, due.d);
  let leadStartY: number;
  let leadStartM1: number;
  let leadStartD: number;
  let displayLeadStart: number;
  if (sd?.tailWeeks) {
    const dueWE = weekEndingSunday(due.y, due.m1, due.d);
    const start = new Date(dueWE.y, dueWE.m1 - 1, dueWE.d);
    start.setDate(start.getDate() - (Math.max(1, Math.round(sd.tailWeeks)) - 1) * 7 - 6);
    leadStartY = start.getFullYear();
    leadStartM1 = start.getMonth() + 1;
    leadStartD = start.getDate();
    displayLeadStart = monthIndex(leadStartY, leadStartM1, winStart);
  } else {
    const lead = effectiveLead(store, dam, lane, dueIdxRounded);
    displayLeadStart = displayDueIdx - lead;
    const leadYm = idxToYm(displayLeadStart, winStart);
    leadStartY = leadYm.y;
    leadStartM1 = leadYm.m0 + 1;
    leadStartD = 1;
  }
  const leadT = ymdTime(leadStartY, leadStartM1, leadStartD);
  const closed =
    isCompleted(store, dam, lane, dueIdxRounded) ||
    isUserNotRequired(store, dam, lane, dueIdxRounded);
  const leadStart = displayLeadStart;
  let status: "overdue" | "ongoing" | "upcoming" = "upcoming";
  if (!closed && dueT < todayT) status = "overdue";
  else if (!closed && leadT <= todayT && todayT < dueT) status = "ongoing";
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
  dueDay: number;
  leadStart: number;
  kind: ReturnType<typeof planStatusKind>;
  bucket: "overdue" | "ongoing" | "upcoming";
  inputOff?: boolean;
};

function toMarker(
  store: ScheduleStore,
  dam: Dam,
  lane: Lane,
  procDueIdx: number,
  inputOff: boolean,
): GanttMarker {
  const start = storeWindow(store).start;
  const st = occurrenceStatus(store, dam, lane, Math.round(procDueIdx));
  const completed = isCompleted(store, dam, lane, Math.round(procDueIdx));
  const scheduled = isScheduled(store, dam, lane, Math.round(procDueIdx));
  const userNr = isUserNotRequired(store, dam, lane, Math.round(procDueIdx));
  const derived =
    !completed && !scheduled && !userNr
      ? derivedNotRequired(store, dam, lane, st.displayDueIdx)
      : false;
  return {
    damId: dam.id,
    damName: dam.name,
    laneCode: lane.code,
    laneLabel: lane.label,
    color: lane.color,
    procDueIdx: Math.round(procDueIdx),
    displayDueIdx: st.displayDueIdx,
    dueDay: effectiveDueDay(store, dam, lane, Math.round(procDueIdx), start),
    leadStart: st.displayLeadStart,
    kind: planStatusKind(scheduled, completed, userNr || derived),
    bucket: st.status,
    inputOff,
  };
}

export function ganttMarkers(
  store: ScheduleStore,
  damIds?: string[],
): GanttMarker[] {
  const start = storeWindow(store).start;
  const out: GanttMarker[] = [];
  const seen = new Set<string>();
  const damSet = damIds ? new Set(damIds) : null;

  for (const dam of store.dams) {
    if (damSet && !damSet.has(dam.id)) continue;
    for (const lane of store.lanes) {
      const applies = laneApplies(store.laneApplicability, dam, lane);
      if (!applies) continue;
      for (const [y, m] of occurrences(store, dam, lane)) {
        const procDueIdx = monthIndex(y, m, start);
        if (procDueIdx < 0) continue;
        if (isSkippedPredicted(store, dam, lane, procDueIdx)) continue;
        const key = schedKey(dam.id, lane.code, procDueIdx);
        seen.add(key);
        out.push(toMarker(store, dam, lane, procDueIdx, false));
      }
    }
  }

  for (const [key, sd] of Object.entries(store.scheduledDetails)) {
    if (!detailIsActualised(sd) || seen.has(key)) continue;
    const parsed = parseSchedKey(key);
    if (!parsed) continue;
    const dam = store.dams.find((d) => d.id === parsed.damId);
    const lane = store.lanes.find((l) => l.code === parsed.laneCode);
    if (!dam || !lane) continue;
    if (damSet && !damSet.has(dam.id)) continue;
    const applies = laneApplies(store.laneApplicability, dam, lane);
    seen.add(key);
    out.push(toMarker(store, dam, lane, parsed.dueIdx, !applies));
  }

  return out;
}

export function predictedBeforeDate(
  store: ScheduleStore,
  date: { y: number; m: number; d: number },
) {
  const start = storeWindow(store).start;
  return ganttMarkers(store).filter(
    (m) =>
      m.kind === "predicted" &&
      !idxDayOnOrAfterDate(m.displayDueIdx, m.dueDay, date, start),
  );
}

/**
 * Rebase this dam × obligation cycle on the most recent known due
 * (soonest incomplete that is not not-required, else latest completed)
 * and regenerate later predicted dates from frequency. Completed stay.
 * Not-required slots move onto the new cycle and may become required.
 */
export function recalculateRow(
  store: ScheduleStore,
  damId: string,
  laneCode: string,
): ScheduleStore {
  const dam = store.dams.find((d) => d.id === damId);
  const lane = store.lanes.find((l) => l.code === laneCode);
  if (!dam || !lane) return store;

  const next = JSON.parse(JSON.stringify(store)) as ScheduleStore;
  const start = storeWindow(next).start;
  const markers = ganttMarkers(next).filter(
    (m) => m.damId === damId && m.laneCode === laneCode,
  );
  const incomplete = markers
    .filter((m) => m.kind !== "completed" && m.kind !== "notRequired")
    .sort((a, b) => a.displayDueIdx - b.displayDueIdx);
  const notRequired = markers
    .filter((m) => m.kind === "notRequired")
    .sort((a, b) => a.displayDueIdx - b.displayDueIdx);
  const completed = markers
    .filter((m) => m.kind === "completed")
    .sort((a, b) => b.displayDueIdx - a.displayDueIdx);
  const known = incomplete[0] ?? completed[0] ?? notRequired[0];
  if (!known) return store;

  const oldSlots = occurrences(next, dam, lane).map(([y, m]) =>
    monthIndex(y, m, start),
  );

  const { y, m0 } = idxToYm(known.displayDueIdx, start);
  const originM = m0 + 1;
  const originDay =
    known.dueDay ??
    effectiveDueDay(next, dam, lane, known.procDueIdx, start);
  if (!next.laneCycleAnchors) next.laneCycleAnchors = {};
  if (!next.laneCycleAnchors[damId]) next.laneCycleAnchors[damId] = {};
  next.laneCycleAnchors[damId][laneCode] = {
    y,
    m: originM,
    d: Math.min(daysInMonth(y, originM), Math.max(1, Math.round(originDay))),
  };

  const prefix = `${damId}|${laneCode}|`;
  const oldKey = schedKey(damId, laneCode, known.procDueIdx);
  const newProc = monthIndex(y, originM, start);
  const newKey = schedKey(damId, laneCode, newProc);
  const keep = next.scheduledDetails[oldKey] || {};

  for (const key of Object.keys(next.scheduledDetails)) {
    if (!key.startsWith(prefix)) continue;
    if (detailIsActualised(next.scheduledDetails[key])) continue;
    delete next.scheduledDetails[key];
  }

  if (
    known.kind !== "predicted" &&
    known.kind !== "notRequired" &&
    oldKey !== newKey &&
    detailIsActualised(keep)
  ) {
    const existing = next.scheduledDetails[newKey];
    if (!existing || !detailIsActualised(existing)) {
      const moved = { ...keep };
      if (
        moved.dueIdxOverride === newProc ||
        moved.dueIdxOverride === known.displayDueIdx
      ) {
        delete moved.dueIdxOverride;
      }
      moved.history = [
        ...(moved.history || []),
        {
          at: new Date().toISOString(),
          note: "Recalculate this row: rekeyed to cycle origin",
        },
      ];
      next.scheduledDetails[newKey] = moved;
      delete next.scheduledDetails[oldKey];
    }
  }

  const newSlots = occurrences(next, dam, lane).map(([oy, om]) =>
    monthIndex(oy, om, start),
  );
  const nrKeys = Object.keys(next.scheduledDetails).filter((key) => {
    if (!key.startsWith(prefix)) return false;
    const sd = next.scheduledDetails[key];
    return !!(sd?.notRequired && !sd.completed);
  });
  for (const key of nrKeys) {
    const parsed = parseSchedKey(key);
    if (!parsed) continue;
    const sd = next.scheduledDetails[key];
    if (!sd) continue;
    const i = oldSlots.findIndex((s) => s === parsed.dueIdx);
    const target =
      i >= 0 && newSlots[i] !== undefined
        ? newSlots[i]
        : nearestSlot(parsed.dueIdx + (newProc - known.procDueIdx), newSlots);
    if (target === null) continue;
    const dest = schedKey(damId, laneCode, target);
    const moved = { ...sd };
    if (moved.dueIdxOverride === target || moved.dueIdxOverride === parsed.dueIdx) {
      delete moved.dueIdxOverride;
    }
    const stillNr = derivedNotRequired(next, dam, lane, target);
    if (!stillNr) {
      delete moved.notRequired;
      delete moved.notRequiredReason;
    }
    moved.history = [
      ...(moved.history || []),
      {
        at: new Date().toISOString(),
        note: stillNr
          ? "Recalculate this row: not-required moved with cycle"
          : "Recalculate this row: not-required became required",
      },
    ];
    if (dest === key) {
      next.scheduledDetails[key] = moved;
      if (!stillNr && !detailIsActualised({ ...moved, notRequired: undefined })) {
        delete next.scheduledDetails[key];
      }
      continue;
    }
    const occupant = next.scheduledDetails[dest];
    if (occupant && detailIsActualised(occupant) && dest !== key) {
      delete next.scheduledDetails[key];
      continue;
    }
    next.scheduledDetails[dest] = moved;
    if (dest !== key) delete next.scheduledDetails[key];
    if (!stillNr && !detailIsActualised({ ...moved, notRequired: undefined })) {
      delete next.scheduledDetails[dest];
    }
  }

  return next;
}

function nearestSlot(proc: number, slots: number[]) {
  if (slots.length === 0) return null;
  let best = slots[0];
  let bestD = Math.abs(slots[0] - proc);
  for (const s of slots) {
    const d = Math.abs(s - proc);
    if (d < bestD) {
      best = s;
      bestD = d;
    }
  }
  return best;
}

export function rowNeedsRecalc(
  store: ScheduleStore,
  damId: string,
  laneCode: string,
) {
  const dam = store.dams.find((d) => d.id === damId);
  const lane = store.lanes.find((l) => l.code === laneCode);
  if (!dam || !lane) return false;
  const start = storeWindow(store).start;
  const markers = ganttMarkers(store)
    .filter(
      (m) =>
        m.damId === damId &&
        m.laneCode === laneCode &&
        m.kind !== "completed" &&
        m.kind !== "notRequired",
    )
    .sort((a, b) => a.displayDueIdx - b.displayDueIdx);
  const first = markers[0];
  if (!first) return false;
  const actualised = isScheduled(store, dam, lane, first.procDueIdx);
  if (!actualised) return false;
  const anchor = store.laneCycleAnchors?.[damId]?.[laneCode];
  const liveDay = effectiveDueDay(store, dam, lane, first.procDueIdx, start);
  if (!anchor?.y || !anchor?.m) {
    if (first.displayDueIdx !== first.procDueIdx) return true;
    const defaultDay = defaultDueDayForIdx(first.displayDueIdx, start);
    return liveDay !== defaultDay;
  }
  const originIdx = monthIndex(anchor.y, anchor.m, start);
  if (Math.round(first.displayDueIdx) !== originIdx) return true;
  const expectedDay = cycleAnchorDueDay(
    store,
    dam,
    lane,
    first.displayDueIdx,
    start,
  );
  return liveDay !== expectedDay;
}
