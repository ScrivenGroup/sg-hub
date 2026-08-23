import {
  calendarToday,
  daysInMonth,
  idxDayToContinuous,
  idxToYm,
  monthIndex,
  weekEndingSunday,
  weekSpanStartFromEndingSunday,
} from "./dates";
import { buildLoadSlots, type LoadGrain } from "./resource-load";

export type GanttXScale = {
  grain: LoadGrain;
  monthPx: number;
  weekPx: number;
  months: number;
  weekCount: number;
  width: number;
  winStart: { y: number; m: number };
  slots: ReturnType<typeof buildLoadSlots>;
};

export function makeGanttXScale(
  winStart: { y: number; m: number },
  months: number,
  monthPx: number,
  grain: LoadGrain,
): GanttXScale {
  const slots = buildLoadSlots(winStart, months, grain);
  if (grain === "month") {
    return {
      grain,
      monthPx,
      weekPx: monthPx,
      months,
      weekCount: months,
      width: months * monthPx,
      winStart,
      slots,
    };
  }
  const weekCount = Math.max(1, slots.length);
  const weekPx = (months * monthPx) / weekCount;
  return {
    grain,
    monthPx,
    weekPx,
    months,
    weekCount,
    width: weekCount * weekPx,
    winStart,
    slots,
  };
}

function slotSunday(scale: GanttXScale, slotIndex: number) {
  const slot = scale.slots[slotIndex];
  if (!slot?.sundayDay) return null;
  const { y, m0 } = idxToYm(slot.monthIdx, scale.winStart);
  return { y, m1: m0 + 1, d: slot.sundayDay };
}

export function dateToChartX(
  scale: GanttXScale,
  y: number,
  m1: number,
  d: number,
): number {
  if (scale.grain === "month") {
    const idx = monthIndex(y, m1, scale.winStart);
    return idxDayToContinuous(idx, d, scale.winStart) * scale.monthPx;
  }
  const we = weekEndingSunday(y, m1, d);
  const mi = monthIndex(we.y, we.m1, scale.winStart);
  const key = `w:${mi}:${we.d}`;
  const idx = scale.slots.findIndex((s) => s.key === key);
  if (idx < 0) {
    const t = new Date(y, m1 - 1, d).getTime();
    const first = slotSunday(scale, 0);
    const last = slotSunday(scale, scale.slots.length - 1);
    if (!first || !last) return 0;
    const firstStart = weekSpanStartFromEndingSunday(first.y, first.m1, first.d);
    if (t <= new Date(firstStart.y, firstStart.m1 - 1, firstStart.d).getTime()) {
      return 0;
    }
    return scale.width;
  }
  const start = weekSpanStartFromEndingSunday(we.y, we.m1, we.d);
  const startT = new Date(start.y, start.m1 - 1, start.d).getTime();
  const t = new Date(y, m1 - 1, d).getTime();
  const days = (t - startT) / 86400000;
  const frac = Math.min(1, Math.max(0, days / 7));
  return (idx + frac) * scale.weekPx;
}

export function continuousToChartX(scale: GanttXScale, c: number): number {
  if (scale.grain === "month") return c * scale.monthPx;
  const idx = Math.floor(c);
  const { y, m0 } = idxToYm(idx, scale.winStart);
  const dim = daysInMonth(y, m0 + 1);
  const day = Math.min(dim, Math.max(1, Math.round((c - idx) * dim) + 1));
  return dateToChartX(scale, y, m0 + 1, day);
}

export function chartXToContinuous(scale: GanttXScale, x: number): number {
  if (scale.grain === "month") return x / scale.monthPx;
  const n = scale.slots.length;
  if (n === 0) return 0;
  const raw = x / scale.weekPx;
  const i = Math.min(n - 1, Math.max(0, Math.floor(raw)));
  const frac = Math.min(1, Math.max(0, raw - i));
  const sun = slotSunday(scale, i);
  if (!sun) return 0;
  const start = weekSpanStartFromEndingSunday(sun.y, sun.m1, sun.d);
  const dt = new Date(start.y, start.m1 - 1, start.d);
  dt.setDate(dt.getDate() + frac * 7);
  return idxDayToContinuous(
    monthIndex(dt.getFullYear(), dt.getMonth() + 1, scale.winStart),
    dt.getDate(),
    scale.winStart,
  );
}

export function monthStartX(scale: GanttXScale, monthIdx: number): number {
  if (scale.grain === "month") return monthIdx * scale.monthPx;
  const { y, m0 } = idxToYm(monthIdx, scale.winStart);
  return dateToChartX(scale, y, m0 + 1, 1);
}

export function todayChartX(scale: GanttXScale, now = new Date()): number {
  const t = calendarToday(now);
  if (scale.grain === "month") {
    const tIdx = monthIndex(t.y, t.m1, scale.winStart) + 0.9;
    return tIdx * scale.monthPx;
  }
  return dateToChartX(scale, t.y, t.m1, t.d);
}

export function weekYearBands(scale: GanttXScale) {
  const out: { y: number; startX: number; width: number }[] = [];
  scale.slots.forEach((slot, i) => {
    const { y } = idxToYm(slot.monthIdx, scale.winStart);
    const last = out[out.length - 1];
    const w = scale.weekPx;
    if (!last || last.y !== y) out.push({ y, startX: i * w, width: w });
    else last.width += w;
  });
  return out;
}

export function weekMonthBands(scale: GanttXScale) {
  const out: { y: number; m0: number; startX: number; width: number }[] = [];
  scale.slots.forEach((slot, i) => {
    const { y, m0 } = idxToYm(slot.monthIdx, scale.winStart);
    const last = out[out.length - 1];
    const w = scale.weekPx;
    if (!last || last.y !== y || last.m0 !== m0) {
      out.push({ y, m0, startX: i * w, width: w });
    } else last.width += w;
  });
  return out;
}
