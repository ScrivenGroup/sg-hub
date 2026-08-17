export const WINDOW_START = { y: 2020, m: 1 };
export const WINDOW_END = { y: 2046, m: 12 };
export const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function todayYm(now = new Date()) {
  return { y: now.getFullYear(), m: now.getMonth() + 1 };
}

export function monthIndex(
  y: number,
  m: number,
  windowStart = WINDOW_START,
) {
  return (y - windowStart.y) * 12 + (m - 1);
}

export function todayIdx(today = todayYm(), windowStart = WINDOW_START) {
  return monthIndex(today.y, today.m, windowStart) + 0.9;
}

export function idxToYm(idx: number, windowStart = WINDOW_START) {
  const mi = Math.round(idx);
  const y = windowStart.y + Math.floor((windowStart.m - 1 + mi) / 12);
  const m0 = (((windowStart.m - 1 + mi) % 12) + 12) % 12;
  return { y, m0 };
}

export function idxToLabel(idx: number, windowStart = WINDOW_START) {
  const { y, m0 } = idxToYm(idx, windowStart);
  return `${MONTH_NAMES[m0]} ${y}`;
}

export function idxToShortLabel(idx: number, windowStart = WINDOW_START) {
  const { y, m0 } = idxToYm(idx, windowStart);
  return `${MONTH_NAMES[m0]} '${String(y).slice(2)}`;
}

export function daysInMonth(y: number, m1: number) {
  return new Date(y, m1, 0).getDate();
}

export function defaultDueDayForIdx(idx: number, windowStart = WINDOW_START) {
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

export function idxDayToDate(idx: number, day: number, windowStart = WINDOW_START) {
  const { y, m0 } = idxToYm(idx, windowStart);
  const dim = daysInMonth(y, m0 + 1);
  return { y, m1: m0 + 1, d: Math.min(Math.max(1, day), dim) };
}

export function totalMonths(windowStart = WINDOW_START, windowEnd = WINDOW_END) {
  return monthIndex(windowEnd.y, windowEnd.m, windowStart) + 1;
}
