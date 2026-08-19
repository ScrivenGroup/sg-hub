export const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const HORIZON_YEARS = 25;

export function todayYm(now = new Date()) {
  return { y: now.getFullYear(), m: now.getMonth() + 1 };
}

export function clampHorizonYears(n: number | undefined) {
  const v = Math.round(Number(n) || HORIZON_YEARS);
  return Math.min(40, Math.max(5, v));
}

/** 1 Jul of the Australian FY that contains `now`. */
export function fyStartYm(now = new Date()) {
  const today = todayYm(now);
  if (today.m >= 7) return { y: today.y, m: 7 };
  return { y: today.y - 1, m: 7 };
}

/** 30 Jun of the Australian FY that contains y/m. */
export function fyEndYmContaining(y: number, m: number) {
  if (m >= 7) return { y: y + 1, m: 6 };
  return { y, m: 6 };
}

export function planningWindow(now = new Date(), horizonYears = HORIZON_YEARS) {
  const today = todayYm(now);
  const years = clampHorizonYears(horizonYears);
  const horizon = addMonths(today.y, today.m, years * 12);
  return {
    start: fyStartYm(now),
    end: fyEndYmContaining(horizon.y, horizon.m),
  };
}

export function monthIndex(
  y: number,
  m: number,
  windowStart = planningWindow().start,
) {
  return (y - windowStart.y) * 12 + (m - windowStart.m);
}

export function todayIdx(
  today = todayYm(),
  windowStart = planningWindow().start,
) {
  return monthIndex(today.y, today.m, windowStart) + 0.9;
}

export function idxToYm(idx: number, windowStart = planningWindow().start) {
  const mi = Math.round(idx);
  const y = windowStart.y + Math.floor((windowStart.m - 1 + mi) / 12);
  const m0 = (((windowStart.m - 1 + mi) % 12) + 12) % 12;
  return { y, m0 };
}

export function idxToLabel(idx: number, windowStart = planningWindow().start) {
  const { y, m0 } = idxToYm(idx, windowStart);
  return `${MONTH_NAMES[m0]} ${y}`;
}

export function idxToShortLabel(
  idx: number,
  windowStart = planningWindow().start,
) {
  const { y, m0 } = idxToYm(idx, windowStart);
  return `${MONTH_NAMES[m0]} '${String(y).slice(2)}`;
}

export function daysInMonth(y: number, m1: number) {
  return new Date(y, m1, 0).getDate();
}

export function defaultDueDayForIdx(
  idx: number,
  windowStart = planningWindow().start,
) {
  const { y, m0 } = idxToYm(idx, windowStart);
  return daysInMonth(y, m0 + 1);
}

export function weekEndingSunday(y: number, m1: number, d: number) {
  const dt = new Date(y, m1 - 1, d);
  const day = dt.getDay();
  const add = day === 0 ? 0 : 7 - day;
  dt.setDate(dt.getDate() + add);
  return { y: dt.getFullYear(), m1: dt.getMonth() + 1, d: dt.getDate() };
}

export function idxDayToDate(
  idx: number,
  day: number,
  windowStart = planningWindow().start,
) {
  const { y, m0 } = idxToYm(idx, windowStart);
  const dim = daysInMonth(y, m0 + 1);
  return { y, m1: m0 + 1, d: Math.min(Math.max(1, day), dim) };
}

export function totalMonths(
  windowStart = planningWindow().start,
  windowEnd = planningWindow().end,
) {
  return monthIndex(windowEnd.y, windowEnd.m, windowStart) + 1;
}

export function addMonths(y: number, m: number, delta: number) {
  const zero = y * 12 + (m - 1) + delta;
  return { y: Math.floor(zero / 12), m: (zero % 12) + 1 };
}

export function frequencyToMonths(
  count: number,
  unit: "year" | "month" | "week",
) {
  const n = Math.max(1, count || 1);
  if (unit === "year") return n * 12;
  if (unit === "month") return n;
  return Math.max(1, Math.round((n * 12) / 52));
}

export function ymOnOrAfter(
  y: number,
  m: number,
  today: { y: number; m: number },
) {
  return y > today.y || (y === today.y && m >= today.m);
}

export function fyEndYearFromIdx(
  idx: number,
  windowStart = planningWindow().start,
) {
  const { y, m0 } = idxToYm(idx, windowStart);
  return m0 >= 6 ? y + 1 : y;
}

/** Australian FY n = 1 Jul (n-1) – 30 Jun n. */
export function fyStartIdx(
  endYear: number,
  windowStart = planningWindow().start,
) {
  return monthIndex(endYear - 1, 7, windowStart);
}

export const DEFAULT_BASELINE = { y: 2026, m: 7, d: 1 } as const;

export function storeBaseline(store: { baselineDate?: { y: number; m: number; d: number } }) {
  const b = store.baselineDate;
  if (b?.y && b?.m) {
    return {
      y: b.y,
      m: Math.min(12, Math.max(1, b.m)),
      d: Math.min(31, Math.max(1, b.d || 1)),
    };
  }
  return { y: DEFAULT_BASELINE.y, m: DEFAULT_BASELINE.m, d: DEFAULT_BASELINE.d };
}

export function ymOnOrAfterDate(
  y: number,
  m: number,
  d: number,
  other: { y: number; m: number; d?: number },
) {
  const od = other.d ?? 1;
  if (y !== other.y) return y > other.y;
  if (m !== other.m) return m > other.m;
  return d >= od;
}

export function idxDayOnOrAfterDate(
  idx: number,
  day: number,
  date: { y: number; m: number; d: number },
  windowStart = planningWindow().start,
) {
  const d0 = idxDayToDate(idx, day, windowStart);
  return ymOnOrAfterDate(d0.y, d0.m1, d0.d, date);
}

export function idxDayToContinuous(
  idx: number,
  day: number,
  windowStart = planningWindow().start,
) {
  const { y, m0 } = idxToYm(idx, windowStart);
  const dim = daysInMonth(y, m0 + 1);
  return idx + (Math.min(Math.max(1, day), dim) - 1) / dim;
}

export function rollupToEndOfWeek(
  idx: number,
  day: number,
  windowStart = planningWindow().start,
) {
  const d0 = idxDayToDate(idx, day, windowStart);
  const we = weekEndingSunday(d0.y, d0.m1, d0.d);
  return {
    idx: monthIndex(we.y, we.m1, windowStart),
    day: we.d,
  };
}

export function idxDayToShortDateLabel(
  idx: number,
  day: number,
  windowStart = planningWindow().start,
) {
  const d0 = idxDayToDate(idx, day, windowStart);
  return `${String(d0.d).padStart(2, "0")}-${MONTH_NAMES[d0.m1 - 1]}-${String(d0.y).slice(2)}`;
}

/** Stored/tooltip/table value: always a full day-month-year (e.g. 30-Jun-27). */
export function fullDateLabel(
  idx: number,
  day: number,
  windowStart = planningWindow().start,
) {
  return idxDayToShortDateLabel(idx, day, windowStart);
}
