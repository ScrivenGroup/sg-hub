import type { EffortDemo, EffortResource, EffortStick, EffortTask } from "../schema";
import { emptyEffortDemo } from "../schema";
import { MONTH_NAMES, weekEndingSunday } from "./dates";
import { round2 } from "./numbers";

export const MIN_EFFORT_WEEKS = 8;
export const VIEW_PAD_WEEKS = 1;
export const VIEW_EXTEND_WEEKS = 4;
export const UNASSIGNED_LABEL = "--unassigned task/resource--";
export const SYNTHETIC_PREFIX = "syn-";

export function syntheticResourceId(taskId: string) {
  return `${SYNTHETIC_PREFIX}${taskId}`;
}

export function isSyntheticResourceId(id: string) {
  return id.startsWith(SYNTHETIC_PREFIX);
}

export function isUnassignedName(name: string) {
  return name.trim().toLowerCase() === UNASSIGNED_LABEL.toLowerCase();
}

export function hoursTotal(hours: number[] | undefined) {
  return (hours || []).reduce((s, h) => s + (Number(h) || 0), 0);
}
export const TASK_COLORS = [
  "#4E8C6B",
  "#1f4e78",
  "#e07b1e",
  "#6b5b95",
  "#c0392b",
  "#2f8f4e",
];

export function taskColor(ti: number) {
  return TASK_COLORS[ti % TASK_COLORS.length];
}

export type EffortWeek = {
  idx: number;
  label: string;
  y?: number;
  m1?: number;
  d?: number;
};

export type HourSpan = {
  start: number | null;
  finish: number | null;
  dur: number;
  total: number;
};

export function effortId(prefix: string) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

export type WeDate = { y: number; m: number; d: number };

export function weToDate(we: WeDate) {
  return new Date(we.y, we.m - 1, we.d);
}

export function dateToWe(dt: Date): WeDate {
  return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() };
}

export function addWeeksWe(we: WeDate, delta: number): WeDate {
  const dt = weToDate(we);
  dt.setDate(dt.getDate() + 7 * delta);
  return dateToWe(dt);
}

export function weeksBetweenWe(a: WeDate, b: WeDate) {
  const ms = weToDate(b).getTime() - weToDate(a).getTime();
  return Math.round(ms / (7 * 24 * 60 * 60 * 1000));
}

export function weMin(a: WeDate, b: WeDate) {
  return weeksBetweenWe(a, b) >= 0 ? a : b;
}

export function weMax(a: WeDate, b: WeDate) {
  return weeksBetweenWe(a, b) >= 0 ? b : a;
}

export function dueWeek(demo: EffortDemo): WeDate {
  const due = demo.milestone.due;
  const we = weekEndingSunday(due.y, due.m, due.d);
  return { y: we.y, m: we.m1, d: we.d };
}

export function seedWindowStart(demo: EffortDemo): WeDate {
  const tail = Math.max(1, Math.round(demo.milestone.tailWeeks) || 1);
  return addWeeksWe(dueWeek(demo), -(tail - 1));
}

export function calendarWindow(demo: EffortDemo) {
  const start = demo.windowStart || seedWindowStart(demo);
  const origin = demo.hoursOrigin || start;
  const n = Math.max(
    demo.stick === "unstick" ? MIN_EFFORT_WEEKS : 1,
    Math.round(demo.weekCount || MIN_EFFORT_WEEKS),
  );
  return { start, origin, n };
}

export function dueColumnIndex(demo: EffortDemo) {
  const { start } = calendarWindow(demo);
  return weeksBetweenWe(start, dueWeek(demo));
}

export function tailStartColumnIndex(demo: EffortDemo) {
  const tail = Math.max(1, Math.round(demo.milestone.tailWeeks) || 1);
  return dueColumnIndex(demo) - tail + 1;
}

/** Map stored hours onto the visible calendar window. */
export function windowHours(demo: EffortDemo, hours: number[] | undefined) {
  const { start, origin, n } = calendarWindow(demo);
  const src = nums(hours);
  const offset = weeksBetweenWe(origin, start);
  return Array.from({ length: n }, (_, i) => {
    const j = offset + i;
    return j < 0 || j >= src.length ? 0 : src[j] || 0;
  });
}

/** Map another demo's hours onto this chart's live week columns. */
export function hoursOnLiveWindow(
  live: EffortDemo,
  source: EffortDemo,
  hours: number[] | undefined,
) {
  const liveWin = calendarWindow(live);
  const srcOrigin = calendarWindow(source).origin;
  const src = nums(hours);
  return Array.from({ length: liveWin.n }, (_, i) => {
    const we = addWeeksWe(liveWin.start, i);
    const j = weeksBetweenWe(srcOrigin, we);
    return j < 0 || j >= src.length ? 0 : src[j] || 0;
  });
}

export function dueColumnOnLive(live: EffortDemo, source: EffortDemo) {
  return weeksBetweenWe(calendarWindow(live).start, dueWeek(source));
}

function forEachResource(
  demo: EffortDemo,
  fn: (res: EffortResource, task: EffortTask) => void,
) {
  for (const task of demo.tasks) {
    for (const res of task.resources) fn(res, task);
  }
}

function storedIndex(demo: EffortDemo, weekIdx: number) {
  const { start, origin } = calendarWindow(demo);
  return weeksBetweenWe(origin, start) + weekIdx;
}

export function tailStartWeek(demo: EffortDemo): WeDate {
  const tail = Math.max(1, Math.round(demo.milestone.tailWeeks) || 1);
  return addWeeksWe(dueWeek(demo), -(tail - 1));
}

/** Extend the view to include due and tail start, plus a 1-week buffer. Never shrinks. */
export function growToIncludeDueAndTail(demo: EffortDemo) {
  const due = dueWeek(demo);
  const tailStart = tailStartWeek(demo);
  padWindowToCover(demo, weMin(tailStart, due), weMax(tailStart, due));
}

function padWindowToCover(demo: EffortDemo, dataStart: WeDate, dataEnd: WeDate) {
  const { start, n } = calendarWindow(demo);
  const oldEnd = addWeeksWe(start, n - 1);
  const needStart = addWeeksWe(dataStart, -VIEW_PAD_WEEKS);
  const needEnd = addWeeksWe(dataEnd, VIEW_PAD_WEEKS);
  const winStart = weMin(start, needStart);
  const winEnd = weMax(oldEnd, needEnd);
  demo.windowStart = winStart;
  const min = demo.stick === "unstick" ? MIN_EFFORT_WEEKS : 1;
  demo.weekCount = Math.max(min, n, weeksBetweenWe(winStart, winEnd) + 1);
  syncHoursOriginToWindow(demo);
}

export function growWindowToFit(demo: EffortDemo) {
  const { origin } = calendarWindow(demo);
  const due = dueWeek(demo);
  const tailStart = tailStartWeek(demo);
  let dataStart = weMin(tailStart, due);
  let dataEnd = weMax(tailStart, due);
  forEachResource(demo, (res) => {
    nums(res.hours).forEach((h, i) => {
      if (h <= 0) return;
      const we = addWeeksWe(origin, i);
      dataStart = weMin(dataStart, we);
      dataEnd = weMax(dataEnd, we);
    });
  });
  demo.hoursOrigin = origin;
  padWindowToCover(demo, dataStart, dataEnd);
}

function shiftMatching(
  demo: EffortDemo,
  match: (task: EffortTask, res: EffortResource) => boolean,
  delta: number,
) {
  if (!delta) return;
  const origin = calendarWindow(demo).origin;
  if (delta > 0) {
    forEachResource(demo, (res, task) => {
      if (match(task, res)) {
        res.hours = [...new Array(delta).fill(0), ...nums(res.hours)];
      }
    });
  } else {
    const pad = -delta;
    demo.hoursOrigin = addWeeksWe(origin, delta);
    forEachResource(demo, (res, task) => {
      if (!match(task, res)) {
        res.hours = [...new Array(pad).fill(0), ...nums(res.hours)];
      }
    });
  }
  growWindowToFit(demo);
}

export function ensureEffortDemo(demo?: EffortDemo | null): EffortDemo {
  const base = demo ? JSON.parse(JSON.stringify(demo)) as EffortDemo : emptyEffortDemo();
  if (!base.windowStart) {
    base.windowStart = seedWindowStart(base);
    base.hoursOrigin = base.hoursOrigin || base.windowStart;
    if (base.stick !== "unstick") {
      base.weekCount = Math.max(
        Math.round(base.weekCount || 0),
        Math.max(1, Math.round(base.milestone.tailWeeks || MIN_EFFORT_WEEKS)),
      );
    }
  }
  if (!base.hoursOrigin) base.hoursOrigin = base.windowStart;
  for (const task of base.tasks) {
    for (const res of task.resources) {
      if (!res.role) res.role = res.name || "";
    }
  }
  base.weekCount = calendarWindow(base).n;
  return base;
}

export function nums(hours: number[] | undefined) {
  return [...(hours || [])].map((h) => Number(h) || 0);
}

export function hourRuns(hours: number[]): { start: number; end: number }[] {
  const runs: { start: number; end: number }[] = [];
  let start = -1;
  for (let i = 0; i <= hours.length; i++) {
    const on = i < hours.length && (Number(hours[i]) || 0) > 0;
    if (on && start < 0) start = i;
    if (!on && start >= 0) {
      runs.push({ start, end: i - 1 });
      start = -1;
    }
  }
  return runs;
}

function writeWindowHour(
  demo: EffortDemo,
  res: EffortResource,
  weekIdx: number,
  hours: number,
) {
  let idx = storedIndex(demo, weekIdx);
  if (idx < 0) {
    const pad = -idx;
    const origin = calendarWindow(demo).origin;
    demo.hoursOrigin = addWeeksWe(origin, idx);
    forEachResource(demo, (r) => {
      r.hours = [...new Array(pad).fill(0), ...nums(r.hours)];
    });
    idx = 0;
  }
  const src = nums(res.hours);
  while (src.length <= idx) src.push(0);
  src[idx] = Math.max(0, round2(hours));
  res.hours = src;
}

/** Grow the calendar viewport at either edge without moving stored hours. */
export function extendViewport(
  demo: EffortDemo,
  side: "start" | "end",
  weeks = VIEW_EXTEND_WEEKS,
): EffortDemo {
  const next = JSON.parse(JSON.stringify(demo)) as EffortDemo;
  const { start, n } = calendarWindow(next);
  const extra = Math.max(1, Math.round(weeks));
  if (side === "start") {
    next.windowStart = addWeeksWe(start, -extra);
    next.weekCount = n + extra;
    syncHoursOriginToWindow(next);
  } else {
    next.weekCount = n + extra;
  }
  return next;
}

/** Pad start and end so the week grid is at least `neededWeeks` wide. */
export function padViewportToFill(demo: EffortDemo, neededWeeks: number): EffortDemo {
  const next = JSON.parse(JSON.stringify(demo)) as EffortDemo;
  const { start, n } = calendarWindow(next);
  const extra = Math.max(0, Math.ceil(neededWeeks) - n);
  if (extra <= 0) return next;
  const padStart = Math.floor(extra / 2);
  next.windowStart = addWeeksWe(start, -padStart);
  next.weekCount = n + extra;
  syncHoursOriginToWindow(next);
  return next;
}

/** Rewrite stored hours so hoursOrigin matches windowStart (viewport-relative). */
export function syncHoursOriginToWindow(demo: EffortDemo) {
  const { start, origin } = calendarWindow(demo);
  const delta = weeksBetweenWe(origin, start);
  if (delta < 0) {
    const pad = -delta;
    forEachResource(demo, (res) => {
      res.hours = [...new Array(pad).fill(0), ...nums(res.hours)];
    });
  } else if (delta > 0) {
    forEachResource(demo, (res) => {
      res.hours = windowHours(demo, res.hours);
    });
  }
  demo.hoursOrigin = start;
}

/** Shift all hours so the All-span starts on the tail-start week. */
export function snapHoursToTailStart(
  demo: EffortDemo,
  opts?: { keepWindow?: { start: WeDate; n: number } },
): EffortDemo {
  const next = ensureEffortDemo(demo);
  if (opts?.keepWindow) {
    next.windowStart = opts.keepWindow.start;
    next.weekCount = opts.keepWindow.n;
  }
  next.stick = "tail-start";
  const span = allSpan(next);
  const tailCol = tailStartColumnIndex(next);
  if (span.start !== null) {
    const delta = tailCol - span.start;
    if (delta) shiftMatching(next, () => true, delta);
  }
  if (opts?.keepWindow) {
    next.windowStart = opts.keepWindow.start;
    next.weekCount = opts.keepWindow.n;
  }
  syncHoursOriginToWindow(next);
  return next;
}

/** Copy baseline tasks/hours onto the live week axis without moving the view or snapping to the tail. */
export function restoreHoursFromBaseline(live: EffortDemo, baseline: EffortDemo): EffortDemo {
  const next = ensureEffortDemo(JSON.parse(JSON.stringify(live)));
  const start = next.windowStart;
  const n = calendarWindow(next).n;
  const stick = next.stick;
  const milestone = next.milestone;
  const base = ensureEffortDemo(JSON.parse(JSON.stringify(baseline)));
  next.tasks = base.tasks.map((t) => ({
    ...t,
    resources: t.resources.map((r) => ({
      ...r,
      hours: hoursOnLiveWindow(next, base, r.hours),
    })),
  }));
  next.windowStart = start;
  next.weekCount = n;
  next.hoursOrigin = start;
  next.stick = stick;
  next.milestone = milestone;
  return next;
}

export function restoreMilestoneFromBaseline(live: EffortDemo, baseline: EffortDemo): EffortDemo {
  const next = ensureEffortDemo(JSON.parse(JSON.stringify(live)));
  next.milestone = {
    ...next.milestone,
    due: { ...baseline.milestone.due },
    tailWeeks: baseline.milestone.tailWeeks,
  };
  return next;
}

function hoursFingerprint(demo: EffortDemo) {
  const d = ensureEffortDemo(demo);
  return d.tasks.map((t) => ({
    name: t.name,
    status: t.status || "",
    resources: t.resources.map((r) => ({
      personId: r.personId || "",
      role: r.role || "",
      hours: windowHours(d, r.hours).map((h) => round2(Number(h) || 0)),
      actualHours: round2(Number(r.actualHours) || 0),
      actualCost: round2(Number(r.actualCost) || 0),
    })),
  }));
}

export function effortHoursDirty(live: EffortDemo, baseline: EffortDemo) {
  const restored = restoreHoursFromBaseline(live, baseline);
  return JSON.stringify(hoursFingerprint(live)) !== JSON.stringify(hoursFingerprint(restored));
}

export function milestoneDirty(live: EffortDemo, baseline: EffortDemo) {
  const a = live.milestone;
  const b = baseline.milestone;
  return (
    a.due.y !== b.due.y ||
    a.due.m !== b.due.m ||
    a.due.d !== b.due.d ||
    a.tailWeeks !== b.tailWeeks
  );
}

/**
 * Grow or shrink one contiguous hour run.
 * Extend left copies hours[run.start]; extend right copies hours[run.end];
 * shorten zeros weeks that leave the run.
 */
export function resizeHourRun(
  demo: EffortDemo,
  taskId: string,
  resourceId: string,
  runStart: number,
  runEnd: number,
  edge: "start" | "end",
  newIndex: number,
): EffortDemo {
  const next = JSON.parse(JSON.stringify(demo)) as EffortDemo;
  const task = next.tasks.find((t) => t.id === taskId);
  if (!task) return next;
  const res = task.resources.find((r) => r.id === resourceId);
  if (!res) return next;
  const vis = windowHours(next, res.hours);
  const leftH = Number(vis[runStart]) || 0;
  const rightH = Number(vis[runEnd]) || 0;
  let rs = Math.round(runStart);
  let re = Math.round(runEnd);
  let ni = Math.round(newIndex);
  ({ rs, re, ni } = padWindowToIndex(next, rs, re, ni));
  if (edge === "start") {
    const ns = Math.min(ni, re);
    if (ns < rs) {
      for (let i = ns; i < rs; i++) writeWindowHour(next, res, i, leftH);
    } else if (ns > rs) {
      for (let i = rs; i < ns; i++) writeWindowHour(next, res, i, 0);
    }
  } else {
    const ne = Math.max(ni, rs);
    if (ne > re) {
      for (let i = re + 1; i <= ne; i++) writeWindowHour(next, res, i, rightH);
    } else if (ne < re) {
      for (let i = ne + 1; i <= re; i++) writeWindowHour(next, res, i, 0);
    }
  }
  growWindowToFit(next);
  return next;
}

export type ResizeSpanScope =
  | { kind: "all" }
  | { kind: "task"; taskId: string }
  | { kind: "group"; groupKey: string };

function resourceMatchesScope(
  task: EffortTask,
  res: EffortResource,
  scope: ResizeSpanScope,
) {
  if (scope.kind === "all") return true;
  if (scope.kind === "task") return task.id === scope.taskId;
  return resMatchesGroup(res, scope.groupKey);
}

function padWindowToIndex(
  demo: EffortDemo,
  rs: number,
  re: number,
  ni: number,
): { rs: number; re: number; ni: number } {
  const { start, n } = calendarWindow(demo);
  if (ni < 0) {
    const extra = -ni;
    demo.windowStart = addWeeksWe(start, ni);
    demo.weekCount = n + extra;
    return { rs: rs + extra, re: re + extra, ni: 0 };
  }
  if (ni >= calendarWindow(demo).n) {
    demo.weekCount = ni + 1;
  }
  return { rs, re, ni };
}

/** Grow or shrink the merged hour span of matching resources (L0 / L1 bars). */
export function resizeMatchingSpan(
  demo: EffortDemo,
  scope: ResizeSpanScope,
  edge: "start" | "end",
  newIndex: number,
): EffortDemo {
  const next = JSON.parse(JSON.stringify(demo)) as EffortDemo;
  const matched: EffortResource[] = [];
  forEachResource(next, (res, task) => {
    if (resourceMatchesScope(task, res, scope)) matched.push(res);
  });
  if (matched.length === 0) return next;
  const visList = matched.map((res) => windowHours(next, res.hours));
  const group = mergeSpans(visList.map((hours) => spanOf(hours)));
  if (group.start === null || group.finish === null) return next;
  const fills = visList.map((vis) => ({
    left: Number(vis[group.start as number]) || 0,
    right: Number(vis[group.finish as number]) || 0,
  }));
  let rs = group.start;
  let re = group.finish;
  let ni = Math.round(newIndex);
  ({ rs, re, ni } = padWindowToIndex(next, rs, re, ni));
  if (edge === "start") {
    const ns = Math.min(ni, re);
    matched.forEach((res, i) => {
      if (ns < rs) {
        for (let w = ns; w < rs; w++) writeWindowHour(next, res, w, fills[i].left);
      } else if (ns > rs) {
        for (let w = rs; w < ns; w++) writeWindowHour(next, res, w, 0);
      }
    });
  } else {
    const ne = Math.max(ni, rs);
    matched.forEach((res, i) => {
      if (ne > re) {
        for (let w = re + 1; w <= ne; w++) writeWindowHour(next, res, w, fills[i].right);
      } else if (ne < re) {
        for (let w = ne + 1; w <= re; w++) writeWindowHour(next, res, w, 0);
      }
    });
  }
  growWindowToFit(next);
  return next;
}

export function spanOf(hours: number[]): HourSpan {
  let start: number | null = null;
  let finish: number | null = null;
  let total = 0;
  for (let i = 0; i < hours.length; i++) {
    const h = Number(hours[i]) || 0;
    total += h;
    if (h > 0) {
      if (start === null) start = i;
      finish = i;
    }
  }
  if (start === null || finish === null) {
    return { start: null, finish: null, dur: 0, total };
  }
  return { start, finish, dur: finish - start + 1, total };
}

export function mergeSpans(spans: HourSpan[]): HourSpan {
  const used = spans.filter((s) => s.start !== null && s.finish !== null);
  if (used.length === 0) {
    return { start: null, finish: null, dur: 0, total: 0 };
  }
  const start = Math.min(...used.map((s) => s.start as number));
  const finish = Math.max(...used.map((s) => s.finish as number));
  return {
    start,
    finish,
    dur: finish - start + 1,
    total: spans.reduce((s, x) => s + x.total, 0),
  };
}

export function demoWeeks(demo: EffortDemo, relative = false): EffortWeek[] {
  const { start, n } = calendarWindow(demo);
  return Array.from({ length: n }, (_, i) => {
    if (relative) {
      return { idx: i, label: `W${i + 1}` };
    }
    const dt = weToDate(addWeeksWe(start, i));
    return {
      idx: i,
      y: dt.getFullYear(),
      m1: dt.getMonth() + 1,
      d: dt.getDate(),
      label: `${dt.getDate()} ${MONTH_NAMES[dt.getMonth()]}`,
    };
  });
}

export function resourceRole(res: EffortResource) {
  return (res.role || res.name || "").trim();
}

export function resourceGroupKey(res: Pick<EffortResource, "role" | "name" | "personId">) {
  const role = resourceRole(res as EffortResource) || UNASSIGNED_LABEL;
  return `${role}::${res.personId || ""}`;
}

export function parseResourceGroupKey(key: string) {
  const i = key.indexOf("::");
  if (i < 0) return { role: key, personId: "" };
  return { role: key.slice(0, i), personId: key.slice(i + 2) };
}

export function sameGroupKey(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function resMatchesGroup(res: EffortResource, groupKey: string) {
  return sameGroupKey(resourceGroupKey(res), groupKey);
}

export function todayWeek(): WeDate {
  const n = new Date();
  const we = weekEndingSunday(n.getFullYear(), n.getMonth() + 1, n.getDate());
  return { y: we.y, m: we.m1, d: we.d };
}

export function todayColumnIndex(demo: EffortDemo) {
  const { start } = calendarWindow(demo);
  return weeksBetweenWe(start, todayWeek());
}

export function outOfRoleKeys(
  demo: EffortDemo,
  eligibility: Record<string, Record<string, boolean>> | undefined,
) {
  const keys = new Set<string>();
  forEachResource(demo, (res) => {
    const role = resourceRole(res);
    const pid = res.personId;
    if (!role || !pid) return;
    if (!eligibility?.[role]?.[pid]) keys.add(`${role}::${pid}`);
  });
  return keys;
}

export function setStick(demo: EffortDemo, stick: EffortStick): EffortDemo {
  const next = JSON.parse(JSON.stringify(demo)) as EffortDemo;
  next.stick = stick;
  if (stick === "unstick") {
    next.weekCount = Math.max(MIN_EFFORT_WEEKS, Math.round(next.weekCount || MIN_EFFORT_WEEKS));
  }
  return next;
}

export function trimAroundGantt(demo: EffortDemo, includeDue: boolean): EffortDemo {
  const next = JSON.parse(JSON.stringify(demo)) as EffortDemo;
  const { origin } = calendarWindow(next);
  let first: WeDate | null = null;
  let last: WeDate | null = null;
  forEachResource(next, (res) => {
    nums(res.hours).forEach((h, i) => {
      if (h <= 0) return;
      const we = addWeeksWe(origin, i);
      first = first ? weMin(first, we) : we;
      last = last ? weMax(last, we) : we;
    });
  });
  if (includeDue) {
    const due = dueWeek(next);
    const tailStart = tailStartWeek(next);
    first = first ? weMin(weMin(first, due), tailStart) : weMin(due, tailStart);
    last = last ? weMax(last, due) : due;
  }
  const spanFirst = first;
  const spanLast = last;
  if (!spanFirst || !spanLast) return next;
  next.windowStart = addWeeksWe(spanFirst, -1);
  const end = addWeeksWe(spanLast, 1);
  let n = weeksBetweenWe(next.windowStart, end) + 1;
  if (next.stick === "unstick") n = Math.max(MIN_EFFORT_WEEKS, n);
  next.weekCount = Math.max(1, n);
  return next;
}

export function setTailWeeks(demo: EffortDemo, tailWeeks: number): EffortDemo {
  const next = JSON.parse(JSON.stringify(demo)) as EffortDemo;
  const oldTailStart = tailStartWeek(next);
  next.milestone.tailWeeks = Math.max(1, Math.round(tailWeeks) || 1);
  if (next.stick === "tail-start") {
    shiftMatching(next, () => true, weeksBetweenWe(oldTailStart, tailStartWeek(next)));
  }
  growToIncludeDueAndTail(next);
  return next;
}

export function setMilestoneDue(
  demo: EffortDemo,
  due: { y: number; m: number; d: number },
  opts?: { alwaysShift?: boolean },
): EffortDemo {
  const next = JSON.parse(JSON.stringify(demo)) as EffortDemo;
  const oldDue = dueWeek(next);
  const oldTailStart = tailStartWeek(next);
  next.milestone.due = due;
  const stick = opts?.alwaysShift ? "tail-end" : next.stick;
  if (stick === "tail-end") {
    shiftMatching(next, () => true, weeksBetweenWe(oldDue, dueWeek(next)));
  } else if (stick === "tail-start") {
    shiftMatching(next, () => true, weeksBetweenWe(oldTailStart, tailStartWeek(next)));
  }
  growToIncludeDueAndTail(next);
  return next;
}

export function taskHasHours(task: EffortTask) {
  return task.resources.some((r) => hoursTotal(r.hours) > 0);
}

export function resourceHasHours(res: EffortResource) {
  return hoursTotal(res.hours) > 0;
}

export function groupHasHours(demo: EffortDemo, groupName: string) {
  for (const task of demo.tasks) {
    for (const res of task.resources) {
      if (resMatchesGroup(res, groupName) && hoursTotal(res.hours) > 0) return true;
    }
    if (
      task.resources.length === 0 &&
      sameGroupKey(groupName, `${UNASSIGNED_LABEL}::`) &&
      taskHasHours(task)
    ) {
      return true;
    }
  }
  return false;
}

function dropEmptyPlaceholder(task: EffortTask) {
  task.resources = task.resources.filter(
    (r) => !(isUnassignedName(resourceRole(r)) && hoursTotal(r.hours) === 0),
  );
}

export function addTask(demo: EffortDemo, afterTaskId?: string | "start"): EffortDemo {
  const next = JSON.parse(JSON.stringify(demo)) as EffortDemo;
  const task: EffortTask = {
    id: effortId("t-"),
    name: "New task",
    resources: [],
  };
  if (afterTaskId === "start") {
    next.tasks.unshift(task);
  } else if (afterTaskId) {
    const i = next.tasks.findIndex((t) => t.id === afterTaskId);
    next.tasks.splice(i < 0 ? next.tasks.length : i + 1, 0, task);
  } else {
    next.tasks.push(task);
  }
  return next;
}

export function addResource(
  demo: EffortDemo,
  taskId: string,
  name?: string,
  afterResourceId?: string | "start",
): EffortDemo {
  const next = JSON.parse(JSON.stringify(demo)) as EffortDemo;
  const task = next.tasks.find((t) => t.id === taskId);
  if (!task) return next;
  dropEmptyPlaceholder(task);
  const res: EffortResource = {
    id: effortId("r-"),
    role: name?.trim() || "Resource",
    hours: [],
  };
  if (afterResourceId === "start") {
    task.resources.unshift(res);
  } else if (afterResourceId) {
    const i = task.resources.findIndex((r) => r.id === afterResourceId);
    task.resources.splice(i < 0 ? task.resources.length : i + 1, 0, res);
  } else {
    task.resources.push(res);
  }
  return next;
}

export function addResourceInGroup(
  demo: EffortDemo,
  groupName: string,
  after?: "start",
): EffortDemo {
  const { role, personId } = parseResourceGroupKey(groupName);
  const host =
    demo.tasks.find((t) => t.resources.some((r) => resMatchesGroup(r, groupName))) ||
    demo.tasks.find(
      (t) => t.resources.length === 0 && sameGroupKey(groupName, `${UNASSIGNED_LABEL}::`),
    );
  if (!host) return addTaskInGroup(demo, groupName, "start");
  const next = addResource(demo, host.id, role, after || "start");
  const task = next.tasks.find((t) => t.id === host.id);
  const res = task?.resources[0];
  if (res && personId) res.personId = personId;
  return next;
}

export function addTaskInGroup(
  demo: EffortDemo,
  groupName: string,
  afterTaskId?: string | "start",
): EffortDemo {
  const { role, personId } = parseResourceGroupKey(groupName);
  const next = JSON.parse(JSON.stringify(demo)) as EffortDemo;
  const displayRole = role || UNASSIGNED_LABEL;
  const task: EffortTask = {
    id: effortId("t-"),
    name: "New task",
    resources: [
      {
        id: effortId("r-"),
        role: displayRole,
        personId: personId || undefined,
        hours: [],
      },
    ],
  };
  if (afterTaskId === "start") {
    next.tasks.unshift(task);
  } else if (afterTaskId) {
    const i = next.tasks.findIndex((t) => t.id === afterTaskId);
    next.tasks.splice(i < 0 ? next.tasks.length : i + 1, 0, task);
  } else {
    next.tasks.push(task);
  }
  return next;
}

export function removeTask(demo: EffortDemo, taskId: string): EffortDemo {
  const next = JSON.parse(JSON.stringify(demo)) as EffortDemo;
  next.tasks = next.tasks.filter((t) => t.id !== taskId);
  return next;
}

export function removeResource(
  demo: EffortDemo,
  taskId: string,
  resourceId: string,
): EffortDemo {
  const next = JSON.parse(JSON.stringify(demo)) as EffortDemo;
  const task = next.tasks.find((t) => t.id === taskId);
  if (!task) return next;
  task.resources = task.resources.filter((r) => r.id !== resourceId);
  return next;
}

export function setHour(
  demo: EffortDemo,
  taskId: string,
  resourceId: string,
  weekIdx: number,
  hours: number,
): EffortDemo {
  const next = JSON.parse(JSON.stringify(demo)) as EffortDemo;
  const task = next.tasks.find((t) => t.id === taskId);
  if (!task) return next;
  let res = task.resources.find((r) => r.id === resourceId);
  if (!res && isSyntheticResourceId(resourceId)) {
    res = {
      id: effortId("r-"),
      name: UNASSIGNED_LABEL,
      role: UNASSIGNED_LABEL,
      hours: [],
    };
    task.resources.push(res);
  }
  if (!res) return next;
  writeWindowHour(next, res, weekIdx, hours);
  growWindowToFit(next);
  return next;
}

export function renameSyntheticResource(
  demo: EffortDemo,
  taskId: string,
  name: string,
): EffortDemo {
  const next = JSON.parse(JSON.stringify(demo)) as EffortDemo;
  const task = next.tasks.find((t) => t.id === taskId);
  if (!task) return next;
  const trimmed = name.trim() || UNASSIGNED_LABEL;
  if (task.resources.length === 0) {
    if (trimmed === UNASSIGNED_LABEL) return next;
    task.resources.push({
      id: effortId("r-"),
      role: trimmed,
      hours: [],
    });
  }
  return next;
}

export function shiftResource(
  demo: EffortDemo,
  taskId: string,
  resourceId: string,
  delta: number,
): EffortDemo {
  const next = JSON.parse(JSON.stringify(demo)) as EffortDemo;
  shiftMatching(next, (t, r) => t.id === taskId && r.id === resourceId, delta);
  return next;
}

export function shiftTask(demo: EffortDemo, taskId: string, delta: number): EffortDemo {
  const next = JSON.parse(JSON.stringify(demo)) as EffortDemo;
  shiftMatching(next, (t) => t.id === taskId, delta);
  return next;
}

export function shiftAll(demo: EffortDemo, delta: number): EffortDemo {
  const next = JSON.parse(JSON.stringify(demo)) as EffortDemo;
  shiftMatching(next, () => true, delta);
  return next;
}

export function shiftResourceGroup(
  demo: EffortDemo,
  groupName: string,
  delta: number,
): EffortDemo {
  const next = JSON.parse(JSON.stringify(demo)) as EffortDemo;
  shiftMatching(next, (_t, res) => resMatchesGroup(res, groupName), delta);
  return next;
}

export function removeResourceGroup(demo: EffortDemo, groupName: string): EffortDemo {
  const next = JSON.parse(JSON.stringify(demo)) as EffortDemo;
  for (const task of next.tasks) {
    task.resources = task.resources.filter((r) => !resMatchesGroup(r, groupName));
  }
  return next;
}

export function allSpan(demo: EffortDemo): HourSpan {
  return mergeSpans(
    demo.tasks.flatMap((t) =>
      t.resources.map((r) => spanOf(windowHours(demo, r.hours))),
    ),
  );
}

/** Named-person hours per visible week (this Gantt only). */
export function personWeekLoad(demo: EffortDemo) {
  const { n } = calendarWindow(demo);
  const byPerson = new Map<string, number[]>();
  for (const t of demo.tasks) {
    for (const r of t.resources) {
      if (!r.personId) continue;
      const hours = windowHours(demo, r.hours);
      let arr = byPerson.get(r.personId);
      if (!arr) {
        arr = new Array(n).fill(0);
        byPerson.set(r.personId, arr);
      }
      hours.forEach((h, i) => {
        arr![i] += Number(h) || 0;
      });
    }
  }
  return byPerson;
}

export function remainingHoursFromToday(demo: EffortDemo, hours: number[] | undefined) {
  const vis = hours || [];
  const todayCol = todayColumnIndex(demo);
  let sum = 0;
  vis.forEach((h, i) => {
    if (i >= todayCol) sum += Number(h) || 0;
  });
  return round2(sum);
}

export function personAssignedRoles(
  demo: EffortDemo,
  personId: string,
  eligibility?: Record<string, Record<string, boolean>>,
) {
  const seen = new Set<string>();
  const roles: { role: string; star: boolean }[] = [];
  for (const t of demo.tasks) {
    for (const r of t.resources) {
      if (r.personId !== personId) continue;
      const role = (r.role || "").trim();
      if (!role || seen.has(role.toLowerCase())) continue;
      seen.add(role.toLowerCase());
      roles.push({
        role,
        star: !eligibility?.[role]?.[personId],
      });
    }
  }
  return roles.sort((a, b) => a.role.localeCompare(b.role, undefined, { sensitivity: "base" }));
}

export function mergePersonWeekLoads(
  loads: Map<string, number[]>[],
  n: number,
) {
  const out = new Map<string, number[]>();
  for (const load of loads) {
    for (const [id, hours] of load) {
      let arr = out.get(id);
      if (!arr) {
        arr = new Array(n).fill(0);
        out.set(id, arr);
      }
      hours.forEach((h, i) => {
        if (i < n) arr![i] += Number(h) || 0;
      });
    }
  }
  return out;
}

/** How many obligations (stacked) or tasks (single demo) feed each person×week cell. */
export function personWeekContributorCounts(demos: EffortDemo[], n: number) {
  const out = new Map<string, number[]>();
  const bump = (id: string, i: number) => {
    let arr = out.get(id);
    if (!arr) {
      arr = new Array(n).fill(0);
      out.set(id, arr);
    }
    if (i >= 0 && i < n) arr[i] += 1;
  };
  if (demos.length > 1) {
    for (const d of demos) {
      for (const [id, hours] of personWeekLoad(d)) {
        hours.forEach((h, i) => {
          if ((Number(h) || 0) > 0) bump(id, i);
        });
      }
    }
    return out;
  }
  const d = demos[0];
  if (!d) return out;
  for (const t of d.tasks) {
    const seen = new Set<string>();
    for (const r of t.resources) {
      if (!r.personId || seen.has(r.personId)) continue;
      const hours = windowHours(d, r.hours);
      let any = false;
      hours.forEach((h, i) => {
        if ((Number(h) || 0) > 0) {
          bump(r.personId!, i);
          any = true;
        }
      });
      if (any) seen.add(r.personId);
    }
  }
  return out;
}

export function hoursSpanIndexes(hours: number[]) {
  let start: number | null = null;
  let finish: number | null = null;
  hours.forEach((h, i) => {
    if ((Number(h) || 0) <= 0) return;
    if (start === null) start = i;
    finish = i;
  });
  return { start, finish };
}

export function taskSpan(task: EffortTask, demo: EffortDemo): HourSpan {
  return mergeSpans(
    task.resources.map((r) => spanOf(windowHours(demo, r.hours))),
  );
}

export type EffortGroupMode = "task-res" | "res-task" | "flat";

export type EffortLayoutRow =
  | {
      type: "l0";
      key: string;
      label: string;
      color: string;
      span: HourSpan;
      drag: "all";
    }
  | {
      type: "l1";
      key: string;
      label: string;
      color: string;
      span: HourSpan;
      taskId?: string;
      groupKey?: string;
      personId?: string;
      resourceName?: string;
      drag: "group";
    }
  | {
      type: "l2";
      key: string;
      label: string;
      color: string;
      span: HourSpan;
      hours: number[];
      taskId: string;
      resourceId: string;
      drag: "row";
      synthetic?: boolean;
      taskName?: string;
      resourceName?: string;
      personId?: string;
      groupKey?: string;
    };

function syntheticL2(
  task: EffortTask,
  color: string,
  demo: EffortDemo,
  label: string,
  groupKey?: string,
): EffortLayoutRow {
  const hours = windowHours(demo, []);
  return {
    type: "l2",
    key: `${task.id}-syn`,
    label,
    color,
    span: spanOf(hours),
    hours,
    taskId: task.id,
    resourceId: syntheticResourceId(task.id),
    drag: "row",
    synthetic: true,
    taskName: task.name,
    resourceName: UNASSIGNED_LABEL,
    groupKey,
  };
}

export function buildEffortLayout(
  demo: EffortDemo,
  mode: EffortGroupMode,
): EffortLayoutRow[] {
  const vis = (hours: number[] | undefined) => windowHours(demo, hours);
  const rows: EffortLayoutRow[] = [
    {
      type: "l0",
      key: "l0-all",
      label: "All",
      color: "var(--ink)",
      span: allSpan(demo),
      drag: "all",
    },
  ];
  if (mode === "task-res") {
    demo.tasks.forEach((task, ti) => {
      const color = taskColor(ti);
      rows.push({
        type: "l1",
        key: `t-${task.id}`,
        label: task.name,
        color,
        span: taskSpan(task, demo),
        taskId: task.id,
        drag: "group",
      });
      for (const res of task.resources) {
        const hours = vis(res.hours);
        rows.push({
          type: "l2",
          key: `${task.id}-${res.id}`,
          label: resourceRole(res) || UNASSIGNED_LABEL,
          color,
          span: spanOf(hours),
          hours,
          taskId: task.id,
          resourceId: res.id,
          drag: "row",
          taskName: task.name,
          resourceName: resourceRole(res) || UNASSIGNED_LABEL,
          personId: res.personId,
        });
      }
    });
    return rows;
  }
  if (mode === "flat") {
    demo.tasks.forEach((task, ti) => {
      const color = taskColor(ti);
      if (task.resources.length === 0) {
        rows.push(
          syntheticL2(task, color, demo, `${task.name} | ${UNASSIGNED_LABEL}`),
        );
        return;
      }
      for (const res of task.resources) {
        const hours = vis(res.hours);
        rows.push({
          type: "l2",
          key: `${task.id}-${res.id}`,
          label: `${task.name} | ${resourceRole(res) || UNASSIGNED_LABEL}`,
          color,
          span: spanOf(hours),
          hours,
          taskId: task.id,
          resourceId: res.id,
          drag: "row",
          taskName: task.name,
          resourceName: resourceRole(res) || UNASSIGNED_LABEL,
          personId: res.personId,
        });
      }
    });
    return rows;
  }
  const byRes = new Map<
    string,
    {
      key: string;
      name: string;
      personId?: string;
      items: { task: EffortTask; res: EffortResource | null; ti: number }[];
    }
  >();
  demo.tasks.forEach((task, ti) => {
    if (task.resources.length === 0) {
      const k = `${UNASSIGNED_LABEL}::`;
      const g = byRes.get(k.toLowerCase()) ?? {
        key: k,
        name: UNASSIGNED_LABEL,
        items: [],
      };
      g.items.push({ task, res: null, ti });
      byRes.set(k.toLowerCase(), g);
      return;
    }
    for (const res of task.resources) {
      const k = resourceGroupKey(res);
      const g = byRes.get(k.toLowerCase()) ?? {
        key: k,
        name: resourceRole(res) || UNASSIGNED_LABEL,
        personId: res.personId,
        items: [],
      };
      g.items.push({ task, res, ti });
      byRes.set(k.toLowerCase(), g);
    }
  });
  for (const [, group] of byRes) {
    rows.push({
      type: "l1",
      key: `rg-${group.key.toLowerCase()}`,
      label: group.name,
      color: "var(--ink)",
      span: mergeSpans(group.items.map((it) => spanOf(vis(it.res?.hours || [])))),
      groupKey: group.key,
      personId: group.personId,
      resourceName: group.name,
      drag: "group",
    });
    for (const it of group.items) {
      const color = taskColor(it.ti);
      if (!it.res) {
        rows.push(syntheticL2(it.task, color, demo, it.task.name, group.key));
        continue;
      }
      const hours = vis(it.res.hours);
      rows.push({
        type: "l2",
        key: `${it.task.id}-${it.res.id}`,
        label: it.task.name,
        color,
        span: spanOf(hours),
        hours,
        taskId: it.task.id,
        resourceId: it.res.id,
        drag: "row",
        taskName: it.task.name,
        resourceName: resourceRole(it.res) || UNASSIGNED_LABEL,
        personId: it.res.personId,
        groupKey: group.key,
      });
    }
  }
  return rows;
}

export function reorderTask(
  demo: EffortDemo,
  fromId: string,
  toId: string,
  edge: "before" | "after" = "before",
): EffortDemo {
  const next = JSON.parse(JSON.stringify(demo)) as EffortDemo;
  const from = next.tasks.findIndex((t) => t.id === fromId);
  const to = next.tasks.findIndex((t) => t.id === toId);
  if (from < 0 || to < 0 || from === to) return next;
  const [item] = next.tasks.splice(from, 1);
  let at = next.tasks.findIndex((t) => t.id === toId);
  if (at < 0) at = next.tasks.length;
  if (edge === "after") at += 1;
  next.tasks.splice(at, 0, item);
  return next;
}

export function moveResource(
  demo: EffortDemo,
  fromTaskId: string,
  resourceId: string,
  toTaskId: string,
  anchorId?: string,
  edge: "before" | "after" = "before",
): EffortDemo {
  const next = JSON.parse(JSON.stringify(demo)) as EffortDemo;
  const from = next.tasks.find((t) => t.id === fromTaskId);
  const to = next.tasks.find((t) => t.id === toTaskId);
  if (!from || !to) return next;
  const idx = from.resources.findIndex((r) => r.id === resourceId);
  if (idx < 0) return next;
  const [res] = from.resources.splice(idx, 1);
  if (anchorId) {
    let at = to.resources.findIndex((r) => r.id === anchorId);
    if (at < 0) at = to.resources.length;
    if (edge === "after") at += 1;
    to.resources.splice(at, 0, res);
  } else if (edge === "before") {
    to.resources.unshift(res);
  } else {
    to.resources.push(res);
  }
  return next;
}

export function setResourceRole(
  demo: EffortDemo,
  taskId: string,
  resourceId: string,
  role: string,
): EffortDemo {
  const next = JSON.parse(JSON.stringify(demo)) as EffortDemo;
  const task = next.tasks.find((t) => t.id === taskId);
  const res = task?.resources.find((r) => r.id === resourceId);
  if (res) res.role = role;
  return next;
}

export function setResourcePerson(
  demo: EffortDemo,
  taskId: string,
  resourceId: string,
  personId: string | undefined,
): EffortDemo {
  const next = JSON.parse(JSON.stringify(demo)) as EffortDemo;
  const task = next.tasks.find((t) => t.id === taskId);
  const res = task?.resources.find((r) => r.id === resourceId);
  if (res) res.personId = personId;
  return next;
}

export function setTaskStatus(
  demo: EffortDemo,
  taskId: string,
  status: EffortTask["status"],
): EffortDemo {
  const next = JSON.parse(JSON.stringify(demo)) as EffortDemo;
  const task = next.tasks.find((t) => t.id === taskId);
  if (task) task.status = status || "not-started";
  return next;
}

export function setResourceActualHours(
  demo: EffortDemo,
  taskId: string,
  resourceId: string,
  hours: number,
): EffortDemo {
  const next = JSON.parse(JSON.stringify(demo)) as EffortDemo;
  const task = next.tasks.find((t) => t.id === taskId);
  const res = task?.resources.find((r) => r.id === resourceId);
  if (res) res.actualHours = Math.max(0, round2(hours));
  return next;
}

export function setResourceActualCost(
  demo: EffortDemo,
  taskId: string,
  resourceId: string,
  cost: number,
): EffortDemo {
  const next = JSON.parse(JSON.stringify(demo)) as EffortDemo;
  const task = next.tasks.find((t) => t.id === taskId);
  const res = task?.resources.find((r) => r.id === resourceId);
  if (res) res.actualCost = Math.max(0, round2(cost));
  return next;
}

export function reorderResourceGroup(
  demo: EffortDemo,
  fromGroupKey: string,
  toGroupKey: string,
  edge: "before" | "after" = "before",
): EffortDemo {
  if (sameGroupKey(fromGroupKey, toGroupKey)) return demo;
  const next = JSON.parse(JSON.stringify(demo)) as EffortDemo;
  const idsIn = (key: string) => {
    const ids: string[] = [];
    for (const task of next.tasks) {
      const hit =
        task.resources.some((r) => resMatchesGroup(r, key)) ||
        (task.resources.length === 0 && sameGroupKey(key, `${UNASSIGNED_LABEL}::`));
      if (hit) ids.push(task.id);
    }
    return ids;
  };
  const fromIds = idsIn(fromGroupKey);
  const toIds = idsIn(toGroupKey);
  if (!fromIds.length || !toIds.length) return next;
  const block = next.tasks.filter((t) => fromIds.includes(t.id));
  next.tasks = next.tasks.filter((t) => !fromIds.includes(t.id));
  let at = -1;
  if (edge === "after") {
    const last = [...toIds].reverse().find((id) => next.tasks.some((t) => t.id === id));
    at = last ? next.tasks.findIndex((t) => t.id === last) + 1 : next.tasks.length;
  } else {
    const first = toIds.find((id) => next.tasks.some((t) => t.id === id));
    at = first ? next.tasks.findIndex((t) => t.id === first) : 0;
  }
  if (at < 0) at = next.tasks.length;
  next.tasks.splice(at, 0, ...block);
  return next;
}

export function setGroupRole(demo: EffortDemo, groupKey: string, role: string): EffortDemo {
  const next = JSON.parse(JSON.stringify(demo)) as EffortDemo;
  forEachResource(next, (res) => {
    if (resMatchesGroup(res, groupKey)) res.role = role;
  });
  return next;
}

export function setGroupPerson(
  demo: EffortDemo,
  groupKey: string,
  personId: string | undefined,
): EffortDemo {
  const next = JSON.parse(JSON.stringify(demo)) as EffortDemo;
  forEachResource(next, (res) => {
    if (resMatchesGroup(res, groupKey)) res.personId = personId;
  });
  return next;
}

export function assignResourceToGroup(
  demo: EffortDemo,
  taskId: string,
  resourceId: string,
  groupKey: string,
): EffortDemo {
  const { role, personId } = parseResourceGroupKey(groupKey);
  let next = setResourceRole(demo, taskId, resourceId, role || UNASSIGNED_LABEL);
  next = setResourcePerson(next, taskId, resourceId, personId || undefined);
  return next;
}

export function renameRoleGroup(demo: EffortDemo, fromName: string, toName: string): EffortDemo {
  return setGroupRole(demo, fromName, toName);
}
