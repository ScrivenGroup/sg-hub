export const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const HORIZON_YEARS = 25;

export function todayYm(now = new Date()) {
  return { y: now.getFullYear(), m: now.getMonth() + 1 };
}

export function planningWindow(now = new Date()) {
  const today = todayYm(now);
  return {
    start: { y: today.y, m: today.m },
    end: { y: today.y + HORIZON_YEARS, m: today.m },
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
