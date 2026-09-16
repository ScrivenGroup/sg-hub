import type { ScheduleStore } from "../schema";
import { idxDayToContinuous } from "./dates";
import { occurrenceAllSpanContinuous } from "./resource-load";
import type { GanttMarker } from "./scheduling";

export type HourBarSpan = { startC: number; endC: number };

export const HOUR_BAR_IDLE_CHUNK = 48;

export function hourBarKey(
  m: Pick<GanttMarker, "damId" | "laneCode" | "procDueIdx">,
) {
  return `${m.damId}-${m.laneCode}-${m.procDueIdx}`;
}

/** Lead/due geometry only — no assignment plans. */
export function markerOverlapsWindow(
  m: GanttMarker,
  a: number,
  b: number,
  windowStart: { y: number; m: number },
  hourBar?: HourBarSpan | null,
) {
  if (hourBar) return hourBar.endC > a && hourBar.startC < b;
  const dueC = idxDayToContinuous(
    m.displayDueIdx,
    m.dueDay ?? 15,
    windowStart,
  );
  const startC = Math.min(m.leadStart, dueC);
  return dueC > a && startC < b;
}

export function computeHourBar(
  store: ScheduleStore,
  m: GanttMarker,
  windowStart: { y: number; m: number },
): HourBarSpan | null {
  return occurrenceAllSpanContinuous(
    store,
    m.damId,
    m.laneCode,
    m.procDueIdx,
    windowStart,
  );
}

export function prioritizeHourBarQueue(
  markers: GanttMarker[],
  done: Set<string>,
  viewStartC: number,
  viewEndC: number,
  windowStart: { y: number; m: number },
): GanttMarker[] {
  const pad = 0.5;
  const a = viewStartC - pad;
  const b = viewEndC + pad;
  const inView: GanttMarker[] = [];
  const rest: GanttMarker[] = [];
  for (const m of markers) {
    if (done.has(hourBarKey(m))) continue;
    if (markerOverlapsWindow(m, a, b, windowStart)) inView.push(m);
    else rest.push(m);
  }
  return inView.concat(rest);
}

export function scheduleIdle(cb: () => void): () => void {
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(() => cb(), { timeout: 180 });
    return () => cancelIdleCallback(id);
  }
  const t = window.setTimeout(cb, 24);
  return () => window.clearTimeout(t);
}
