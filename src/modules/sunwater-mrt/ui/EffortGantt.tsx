"use client";

import {
  Fragment,
  createContext,
  memo,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { DEFAULT_WEEKLY_CAPACITY_HOURS, defaultExternalRate, defaultInternalRateForRole } from "../catalog/roster";
import type { EffortDemo, EffortStick, ScheduleStore, TaskStatus } from "../schema";
import { joinPersonName, personIdFromName, samePersonName } from "../schema";
import { ragStatus } from "../logic/status";
import {
  addResource,
  addTask,
  addTaskInGroup,
  allSpan,
  personWeekLoad,
  assignResourceToGroup,
  buildEffortLayout,
  calendarWindow,
  demoWeeks,
  dueColumnIndex,
  dueColumnOnLive,
  ensureEffortDemo,
  padViewportToFill,
  groupHasHours,
  hourRuns,
  hoursOnLiveWindow,
  hoursTotal,
  hoursSpanIndexes,
  mergePersonWeekLoads,
  personWeekContributorCounts,
  personAssignedRoles,
  remainingHoursFromToday,
  windowHours,
  isSyntheticResourceId,
  moveResource,
  parseResourceGroupKey,
  resourceGroupKey,
  sameGroupKey,
  removeResource,
  removeResourceGroup,
  removeTask,
  restoreHoursFromBaseline,
  restoreMilestoneFromBaseline,
  effortHoursDirty,
  milestoneDirty,
  renameRoleGroup,
  renameSyntheticResource,
  reorderResourceGroup,
  reorderTask,
  resizeHourRun,
  resizeMatchingSpan,
  resourceHasHours,
  setGroupPerson,
  setGroupRole,
  setHour,
  setMilestoneDue,
  setResourcePerson,
  setResourceRole,
  setResourceActualHours,
  setResourceActualCost,
  setTaskStatus,
  setStick,
  setTailWeeks,
  shiftAll,
  shiftResource,
  shiftResourceGroup,
  shiftTask,
  tailStartColumnIndex,
  taskHasHours,
  todayColumnIndex,
  UNASSIGNED_LABEL,
  type EffortGroupMode,
  type EffortLayoutRow,
  type HourSpan,
  type ResizeSpanScope,
} from "../logic/effort-gantt";
import {
  personWeekContributorCountEverywhere,
  personWeekLoadEverywhere,
} from "../logic/resource-load";
import { formatHours, parseDecimal, round2 } from "../logic/numbers";
import { createPortal } from "react-dom";
import { PersonOverHover } from "./PersonOverHover";
import { useEffortFreeze, useEffortScrollRoot } from "./effort-scroll-context";
import { BusySpin, usePaintedBusy } from "./paint-busy";

function maybePortal(node: ReactNode, host: HTMLElement | null | undefined, waitHost?: boolean) {
  if (!node) return null;
  if (waitHost && !host) return null;
  if (host) return createPortal(node, host);
  return node;
}

type LiveSnap = { el: HTMLElement; left: number; width: number };
type BarKind = "l0" | "l1-task" | "l1-group" | "l2";

function chartRowFromTarget(root: HTMLElement | null, target: EventTarget | null): HTMLElement | null {
  if (!root || !(target instanceof Element)) return null;
  const row = target.closest("[data-effort-row]");
  if (!(row instanceof HTMLElement) || !root.contains(row)) return null;
  return row;
}

function liveLayerInRow(root: HTMLElement | null, target: EventTarget | null): HTMLElement | null {
  const row = chartRowFromTarget(root, target);
  if (!row) return null;
  const layer = row.querySelector("[data-effort-live-layer]");
  return layer instanceof HTMLElement ? layer : null;
}

function snapshotLiveEl(el: HTMLElement | null | undefined): LiveSnap | undefined {
  return el ? { el, left: el.offsetLeft, width: el.offsetWidth } : undefined;
}

function applyShiftTransforms(layers: HTMLElement[], deltaPx: number) {
  const t = deltaPx ? `translate3d(${deltaPx}px,0,0)` : "";
  for (const layer of layers) layer.style.transform = t;
}

function collectShiftLayers(
  root: HTMLElement | null,
  kind: BarKind,
  meta: { taskId?: string; resourceId?: string; groupKey?: string },
): HTMLElement[] {
  if (!root) return [];
  const wantGroup = (meta.groupKey || "").toLowerCase();
  const out: HTMLElement[] = [];
  const seen = new Set<HTMLElement>();
  for (const row of root.querySelectorAll<HTMLElement>("[data-effort-row]")) {
    const id = row.dataset.effortRow;
    if (!id || id === "milestone") continue;
    let ok = false;
    if (kind === "l0") ok = true;
    else if (kind === "l1-task") ok = row.dataset.effortTask === meta.taskId;
    else if (kind === "l1-group") ok = (row.dataset.effortGroup || "").toLowerCase() === wantGroup;
    else if (kind === "l2") {
      ok =
        row.dataset.effortTask === meta.taskId &&
        row.dataset.effortResource === meta.resourceId;
    }
    if (!ok) continue;
    const layer = row.querySelector<HTMLElement>("[data-effort-live-layer]");
    if (layer && !seen.has(layer)) {
      seen.add(layer);
      out.push(layer);
    }
  }
  return out;
}

function rowMatchesResizeScope(row: HTMLElement, scope: ResizeSpanScope) {
  const id = row.dataset.effortRow;
  if (!id || id === "milestone") return false;
  if (scope.kind === "all") return true;
  if (scope.kind === "task") return row.dataset.effortTask === scope.taskId;
  return (row.dataset.effortGroup || "").toLowerCase() === scope.groupKey.toLowerCase();
}

function handleMatchesEdge(
  pair: { bar?: HTMLElement; handle: HTMLElement },
  edge: "start" | "end",
) {
  if (!pair.bar) return true;
  const left = pair.bar.offsetLeft;
  const right = left + pair.bar.offsetWidth;
  const mid = pair.handle.offsetLeft + pair.handle.offsetWidth / 2;
  return edge === "start"
    ? Math.abs(mid - left) <= Math.abs(mid - right)
    : Math.abs(mid - right) <= Math.abs(mid - left);
}

type ResizeSnap = { bar?: LiveSnap; handle?: LiveSnap };

function collectResizePreview(
  root: HTMLElement | null,
  scope: ResizeSpanScope,
  edge: "start" | "end",
): ResizeSnap[] {
  if (!root) return [];
  const out: ResizeSnap[] = [];
  const seenBar = new Set<HTMLElement>();
  const seenHandle = new Set<HTMLElement>();
  for (const row of root.querySelectorAll<HTMLElement>("[data-effort-row]")) {
    if (!rowMatchesResizeScope(row, scope)) continue;
    for (const handle of row.querySelectorAll<HTMLElement>('[data-effort-live="handle"]')) {
      const pair = resizePair(handle);
      if (!handleMatchesEdge(pair, edge) || seenHandle.has(handle)) continue;
      seenHandle.add(handle);
      if (pair.bar) seenBar.add(pair.bar);
      out.push({
        bar: snapshotLiveEl(pair.bar),
        handle: snapshotLiveEl(handle),
      });
    }
    for (const bar of row.querySelectorAll<HTMLElement>(
      '[data-effort-live="bar"], [data-effort-live="run"]',
    )) {
      if (seenBar.has(bar)) continue;
      seenBar.add(bar);
      out.push({ bar: snapshotLiveEl(bar) });
    }
  }
  return out;
}

/**
 * Effort Gantt pan — locked (all-obligations Rebalance / Occurrence popup).
 *
 * Rebalance stacks many hour-cell grids into one freeze.chartHost. Pan must stay
 * a camera over that strip, not a restyle of every cell.
 *
 * DO
 * - One translate3d on freeze.chartHost per frame. Nested stacks ride it.
 * - Native pointerdown on .mrt-effort-timescale (portaled weeks are not React
 *   children of chartHost, so React onPointerDown there never fires).
 * - Also startPan on the portaled week header / chart stack.
 * - Cache cam layers, contentW, viewW, maxTop on pointerdown. rAF only writes
 *   transform + integer scrollTop when the value changed.
 * - Store cam x on the clip expando. Set --effort-cam-x only on .effort-gantt
 *   (Defaults label counter-shift). Never on .mrt-effort-timescale.
 *
 * DO NOT (these made all-obligations pan dead or stall)
 * - querySelectorAll("[data-effort-cam]") every frame (walks every hour cell).
 * - Inherit --effort-cam-x from the freeze clip (style recalc of the whole stack).
 * - .mrt-effort-popup.is-panning * / overlay inset:0 (grab restyle; half-second
 *   start or release hitch).
 * - scrollHeight / getBoundingClientRect / getComputedStyle during move.
 * - commit() or setState on pointermove. Native overflow-x on the timescale
 *   (overflow-x:hidden + max pan 0 = pan deleted).
 * - content-visibility on the first stack (kills week-header hit testing).
 */
/** Direct cam hosts only. Nested [data-effort-cam] ride the parent transform. */
function topCamLayers(clip: HTMLElement): HTMLElement[] {
  if (clip.hasAttribute("data-effort-cam")) return [clip];
  const out: HTMLElement[] = [];
  for (const el of clip.querySelectorAll<HTMLElement>("[data-effort-cam]")) {
    const parentCam = el.parentElement?.closest("[data-effort-cam]");
    if (parentCam && clip.contains(parentCam)) continue;
    out.push(el);
  }
  return out;
}

const CAM_X = "--effort-cam-x";

function clampCamX(x: number, contentW: number, viewW: number): number {
  const view = Math.max(80, viewW);
  const max = Math.max(0, contentW - view);
  return Math.max(0, Math.min(max, Math.round(x)));
}

type CamClip = HTMLElement & { _effortCamX?: number };

export function readEffortCamX(clip: HTMLElement | null): number {
  if (!clip) return 0;
  const fast = (clip as CamClip)._effortCamX;
  if (typeof fast === "number") return fast;
  const n = Number.parseFloat(clip.style.getPropertyValue(CAM_X));
  return Number.isFinite(n) ? n : 0;
}

function paintCamX(clip: HTMLElement, x: number, layers: HTMLElement[]) {
  (clip as CamClip)._effortCamX = x;
  // Inherited --effort-cam-x on the freeze clip restyles every hour cell each
  // frame. Only the Defaults scroller needs it (sticky label counter-shift).
  if (clip.classList.contains("effort-gantt")) {
    clip.style.setProperty(CAM_X, `${x}px`);
  }
  const t = `translate3d(${-x}px,0,0)`;
  for (const layer of layers) layer.style.transform = t;
}

export function writeEffortCamX(
  clip: HTMLElement | null,
  x: number,
  contentW: number,
  viewW?: number,
): number {
  if (!clip) return 0;
  const next = clampCamX(x, contentW, viewW ?? clip.clientWidth);
  paintCamX(clip, next, topCamLayers(clip));
  return next;
}

function applyResizePreview(
  bar: LiveSnap | undefined,
  handle: LiveSnap | undefined,
  edge: "start" | "end",
  deltaPx: number,
) {
  if (handle) handle.el.style.transform = deltaPx ? `translate3d(${deltaPx}px,0,0)` : "";
  if (!bar) return;
  if (edge === "start") {
    bar.el.style.transform = deltaPx ? `translate3d(${deltaPx}px,0,0)` : "";
    bar.el.style.width = `${Math.max(8, bar.width - deltaPx)}px`;
  } else {
    bar.el.style.width = `${Math.max(8, bar.width + deltaPx)}px`;
  }
}

function applyResizePreviews(snaps: ResizeSnap[], edge: "start" | "end", deltaPx: number) {
  for (const snap of snaps) applyResizePreview(snap.bar, snap.handle, edge, deltaPx);
}

function applyTailPreview(bar: LiveSnap | undefined, handle: LiveSnap | undefined, deltaPx: number) {
  if (handle) handle.el.style.transform = deltaPx ? `translate3d(${deltaPx}px,0,0)` : "";
  if (bar) {
    bar.el.style.transform = deltaPx ? `translate3d(${deltaPx}px,0,0)` : "";
    bar.el.style.width = `${Math.max(8, bar.width - deltaPx)}px`;
  }
}

function resizePair(handle: HTMLElement): { bar?: HTMLElement; handle: HTMLElement } {
  const parent = handle.parentElement;
  const bar =
    parent?.querySelector<HTMLElement>(
      '[data-effort-live="bar"], [data-effort-live="run"]',
    ) ?? undefined;
  return { bar, handle };
}

function weekLeft(col: number, extraPx = 0) {
  return extraPx
    ? `calc(${col} * var(--effort-week) + ${extraPx}px)`
    : `calc(${col} * var(--effort-week))`;
}

function weekSpan(cols: number, extraPx = 0) {
  const extra = extraPx ? ` + ${extraPx}px` : "";
  return `max(8px, calc(${cols} * var(--effort-week)${extra}))`;
}

function weekMid(col: number) {
  return `calc((${col} + 0.5) * var(--effort-week))`;
}

function weeksWidth(count: number) {
  return `calc(${count} * var(--effort-week))`;
}

function effortUiRoot(from: HTMLElement | null): HTMLElement | null {
  if (!from) return null;
  return (
    (from.closest(".mrt-effort-popup") as HTMLElement | null) ||
    (from.closest("[data-effort-ui]") as HTMLElement | null) ||
    from
  );
}

export function writeEffortWeekPx(from: HTMLElement | null, px: number) {
  const root = effortUiRoot(from);
  if (!root) return;
  root.style.setProperty("--effort-week", `${px}px`);
  root.classList.toggle("is-week-narrow", px < WEEK_WRAP_BELOW);
}

export function toggleEffortUiClass(from: HTMLElement | null, className: string, on?: boolean) {
  const root = effortUiRoot(from);
  if (!root) return false;
  const next = on ?? !root.classList.contains(className);
  root.classList.toggle(className, next);
  return next;
}

export function readEffortWeekPx(from: HTMLElement | null, fallback = WEEK_PX_DEFAULT) {
  const root = effortUiRoot(from);
  if (!root) return fallback;
  const n = Number.parseFloat(getComputedStyle(root).getPropertyValue("--effort-week"));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function scrollEffortChartToSpan(
  box: HTMLElement,
  demo: EffortDemo,
  weekPx: number,
  align: "mid" | "start" = "mid",
  frozenPx = 0,
) {
  const n = Math.max(1, demo.weekCount || 1);
  const dueCol = dueColumnIndex(demo);
  const tailStartCol = tailStartColumnIndex(demo);
  const span = allSpan(demo);
  let start = span.start ?? tailStartCol;
  let end = span.finish ?? dueCol;
  start = Math.min(start, tailStartCol, dueCol);
  end = Math.max(end, dueCol);
  start = Math.max(0, start - 1);
  end = Math.min(n - 1, Math.max(start, end + 1));
  const view = Math.max(80, box.clientWidth - frozenPx);
  const target =
    align === "start" ? start * weekPx : ((start + end + 1) / 2) * weekPx - view / 2;
  writeEffortCamX(box, target, n * weekPx, view);
}

export const WEEK_PX_DEFAULT = 56;
const WEEK_PX_STEPS = [32, 40, 48, 56, 72, 88, 112];
const WeekPxContext = createContext(WEEK_PX_DEFAULT);
function useWeekPx() {
  return useContext(WeekPxContext);
}
const FN_W = 54;
const L0_H = 29;
const L1_H = 29;
const L2_H = 26;
const MS_H = 38;
const HEAD_H = 22;
const SUM_HEAD_H = 52;
const WEEK_WRAP_BELOW = 48;
const FLAT_COL_W = 118;
const META_W = 72;
const HOURS_W = 76;
const COST_W = 88;
const ACTUAL_HOURS_W = 76;
const ACTUAL_COST_W = 88;
const FAC_HOURS_W = 72;
const FAC_COST_W = 80;
const VAC_HOURS_W = 64;
const VAC_COST_W = 72;
const CREATE_ROLE = "__create_role__";
const ADD_OTHER = "__add_other__";

type ChartPlace = "defaults" | "milestone";
type EffortPane = "frozen" | "chart" | "both";
type SortKey = "task" | "resource" | "person" | "start" | "finish" | "dur" | "hours" | "cost";
type DropSlot = { key: string; edge: "before" | "after" };
export type MetaCols = {
  start: boolean;
  finish: boolean;
  duration: boolean;
  hours: boolean;
  availability: boolean;
  totalCost: boolean;
};

export const ALL_META: MetaCols = {
  start: true,
  finish: true,
  duration: true,
  hours: true,
  availability: false,
  totalCost: false,
};

function hoursColOn(meta: MetaCols, pmOn: boolean) {
  return meta.hours || pmOn;
}

function costColOn(meta: MetaCols, pmOn: boolean) {
  return meta.totalCost || pmOn;
}

export function nextWeekPx(current: number, dir: number) {
  const nearest = WEEK_PX_STEPS.reduce(
    (best, cur, i) =>
      Math.abs(cur - current) < Math.abs(WEEK_PX_STEPS[best] - current) ? i : best,
    0,
  );
  return WEEK_PX_STEPS[
    Math.min(WEEK_PX_STEPS.length - 1, Math.max(0, nearest + dir))
  ];
}

export function WeekZoomChip({
  weekPx,
  onWeekPx,
}: {
  weekPx: number;
  onWeekPx: (next: number) => void;
}) {
  const { busyId, run } = usePaintedBusy();
  const rootRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(weekPx);
  function apply(dir: number) {
    const next = nextWeekPx(shown, dir);
    writeEffortWeekPx(rootRef.current, next);
    setShown(next);
    onWeekPx(next);
  }
  return (
    <div ref={rootRef} className="mrt-zoom-chip is-inline" title="Week column width">
      <span className="mrt-zoom-chip-label">Weeks</span>
      <div className="mrt-zoom-chip-row">
        <button
          type="button"
          aria-label="Narrow week columns"
          aria-busy={busyId === "out"}
          disabled={shown <= WEEK_PX_STEPS[0] || !!busyId}
          onClick={() => run("out", () => apply(-1))}
        >
          {busyId === "out" ? <BusySpin on /> : "−"}
        </button>
        <span className="mrt-zoom-chip-val">
          {Math.round((shown / WEEK_PX_DEFAULT) * 100)}%
        </span>
        <button
          type="button"
          aria-label="Widen week columns"
          aria-busy={busyId === "in"}
          disabled={shown >= WEEK_PX_STEPS[WEEK_PX_STEPS.length - 1] || !!busyId}
          onClick={() => run("in", () => apply(1))}
        >
          {busyId === "in" ? <BusySpin on /> : "+"}
        </button>
      </div>
    </div>
  );
}

function EffortQuickTools({
  mode,
  onCentre,
  onCollapse,
  onAvailability,
}: {
  mode: EffortGroupMode;
  onCentre: () => void;
  onCollapse: () => void;
  onAvailability: () => void;
}) {
  const { busyId, run } = usePaintedBusy();
  return (
    <div className="mrt-gantt-tools rounded-md border border-[var(--border)]">
      <button
        type="button"
        className="mrt-gantt-tool"
        title="Scroll so hours, tail, and due sit in the middle of the visible chart"
        aria-busy={busyId === "centre"}
        disabled={!!busyId}
        onClick={() => run("centre", onCentre)}
      >
        <BusySpin on={busyId === "centre"} />
        Centre around Gantt
      </button>
      <button
        type="button"
        className="mrt-gantt-tool"
        disabled={mode === "flat" || !!busyId}
        title="Collapse or expand all groups"
        aria-busy={busyId === "collapse"}
        onClick={() => run("collapse", onCollapse)}
      >
        <BusySpin on={busyId === "collapse"} />
        <span className="effort-collapse-label-off">Collapse</span>
        <span className="effort-collapse-label-on">Expand</span>
      </button>
      <button
        type="button"
        className="mrt-gantt-tool"
        data-effort-avail
        title="Show availability overlay on named rows"
        aria-busy={busyId === "availability"}
        disabled={!!busyId}
        onClick={() => run("availability", onAvailability)}
      >
        <BusySpin on={busyId === "availability"} />
        Availability
      </button>
    </div>
  );
}

const HIDEABLE_META: Record<string, keyof MetaCols> = {
  start: "start",
  finish: "finish",
  dur: "duration",
  hours: "hours",
  cost: "totalCost",
};

function MetaColHead({
  label,
  width,
  hoursClass,
  sortMark: mark,
  onSort,
  onHide,
}: {
  colKey?: string;
  label: string;
  width: number;
  hoursClass?: boolean;
  sortMark?: string;
  onSort?: () => void;
  onHide?: () => void;
}) {
  const cls = `effort-gantt-meta pl-1${hoursClass ? " effort-gantt-hours" : ""}${
    onHide ? " has-hide" : ""
  }`;
  const hideBtn = onHide ? (
    <button
      type="button"
      className="effort-gantt-col-hide"
      title={`Hide ${label}`}
      aria-label={`Hide ${label}`}
      onClick={(e) => {
        e.stopPropagation();
        onHide();
      }}
    >
      ×
    </button>
  ) : null;
  if (onSort) {
    return (
      <button
        type="button"
        className={`effort-gantt-sort ${cls}`}
        style={{ width }}
        onClick={onSort}
      >
        <span className="min-w-0 truncate">
          {label}
          {mark}
        </span>
        {hideBtn}
      </button>
    );
  }
  return (
    <span className={cls} style={{ width }}>
      <span className="min-w-0 truncate">{label}</span>
      {hideBtn}
    </span>
  );
}

export function EffortWeekPxProvider({
  weekPx,
  children,
}: {
  weekPx: number;
  children: ReactNode;
}) {
  return <WeekPxContext.Provider value={weekPx}>{children}</WeekPxContext.Provider>;
}

function weekHeadHeight(weekPx: number) {
  return weekPx < WEEK_WRAP_BELOW ? 32 : HEAD_H;
}

function sumHeadHeight(weekPx: number) {
  return weekPx < WEEK_WRAP_BELOW ? 56 : SUM_HEAD_H;
}

function WeekHeadCell({
  label,
}: {
  label: string;
}) {
  const parts = label.split(" ");
  return (
    <div className="effort-gantt-weekcell border-r border-[var(--border)]/50 text-[10px]">
      <span className="effort-week-full">{label}</span>
      {parts.length > 1 ? (
        <>
          <span className="effort-week-a">{parts[0]}</span>
          <span className="effort-week-b">{parts.slice(1).join(" ")}</span>
        </>
      ) : null}
    </div>
  );
}

export function effortChromeWidths(
  mode: EffortGroupMode,
  metaCols: MetaCols,
  pmOn: boolean,
  personCol: boolean,
) {
  const nameCols = mode === "flat" ? (personCol ? 3 : 2) : personCol ? 2 : 1;
  const nameW = nameCols * FLAT_COL_W + 24;
  const metaW =
    (metaCols.start ? META_W : 0) +
    (metaCols.finish ? META_W : 0) +
    (metaCols.duration ? META_W : 0) +
    (hoursColOn(metaCols, pmOn) ? HOURS_W + (pmOn ? ACTUAL_HOURS_W + FAC_HOURS_W + VAC_HOURS_W : 0) : 0) +
    (costColOn(metaCols, pmOn) ? COST_W + (pmOn ? ACTUAL_COST_W + FAC_COST_W + VAC_COST_W : 0) : 0);
  return { nameW, metaW, labelW: nameW + metaW };
}

function isoDue(due: { y: number; m: number; d: number }) {
  return `${due.y}-${String(due.m).padStart(2, "0")}-${String(due.d).padStart(2, "0")}`;
}

function formatMoney(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n) || n === 0) return "—";
  return `$${Math.round(n).toLocaleString("en-AU")}`;
}

function personOutOfRole(
  store: ScheduleStore,
  role: string,
  personId?: string,
) {
  if (!personId) return false;
  return !store.roleEligibility[role]?.[personId];
}

function confirmKeepAsteriskName(role: string) {
  return window.confirm(
    `This name is not ticked for ${role} on Resource × Role and will show *. Keep the name?`,
  );
}

function groupPersonIds(demo: EffortDemo, groupKey: string) {
  const ids: string[] = [];
  for (const task of demo.tasks) {
    for (const res of task.resources) {
      if (res.personId && sameGroupKey(resourceGroupKey(res), groupKey)) {
        ids.push(res.personId);
      }
    }
  }
  return ids;
}

const TASK_STATUSES: { id: TaskStatus; label: string }[] = [
  { id: "not-started", label: "Not started" },
  { id: "in-progress", label: "In progress" },
  { id: "complete", label: "Complete" },
];

function taskStatusOf(demo: EffortDemo, taskId?: string): TaskStatus {
  if (!taskId) return "not-started";
  return demo.tasks.find((t) => t.id === taskId)?.status || "not-started";
}

function resourceActualHours(demo: EffortDemo, taskId: string, resourceId: string) {
  const res = demo.tasks.find((t) => t.id === taskId)?.resources.find((r) => r.id === resourceId);
  return Number(res?.actualHours) || 0;
}

function resourceActualCost(demo: EffortDemo, taskId: string, resourceId: string) {
  const res = demo.tasks.find((t) => t.id === taskId)?.resources.find((r) => r.id === resourceId);
  return Number(res?.actualCost) || 0;
}

function rowActualHours(row: EffortLayoutRow, demo: EffortDemo) {
  if (row.type === "l2") return resourceActualHours(demo, row.taskId, row.resourceId);
  let sum = 0;
  for (const task of demo.tasks) {
    if (row.type === "l1" && row.taskId && task.id !== row.taskId) continue;
    for (const res of task.resources) {
      if (row.type === "l1" && row.groupKey && !sameGroupKey(resourceGroupKey(res), row.groupKey)) {
        continue;
      }
      sum += Number(res.actualHours) || 0;
    }
  }
  return sum;
}

function rowActualCost(row: EffortLayoutRow, demo: EffortDemo) {
  if (row.type === "l2") return resourceActualCost(demo, row.taskId, row.resourceId);
  let sum = 0;
  for (const task of demo.tasks) {
    if (row.type === "l1" && row.taskId && task.id !== row.taskId) continue;
    for (const res of task.resources) {
      if (row.type === "l1" && row.groupKey && !sameGroupKey(resourceGroupKey(res), row.groupKey)) {
        continue;
      }
      sum += Number(res.actualCost) || 0;
    }
  }
  return sum;
}

function personActuals(demo: EffortDemo, personId: string) {
  let hours = 0;
  let cost = 0;
  for (const task of demo.tasks) {
    for (const res of task.resources) {
      if (res.personId !== personId) continue;
      hours += Number(res.actualHours) || 0;
      cost += Number(res.actualCost) || 0;
    }
  }
  return { hours, cost };
}

function rowRemainingHours(row: EffortLayoutRow, demo: EffortDemo) {
  if (row.type === "l2") return remainingHoursFromToday(demo, row.hours);
  let sum = 0;
  for (const task of demo.tasks) {
    if (row.type === "l1" && row.taskId && task.id !== row.taskId) continue;
    for (const res of task.resources) {
      if (row.type === "l1" && row.groupKey && !sameGroupKey(resourceGroupKey(res), row.groupKey)) {
        continue;
      }
      sum += remainingHoursFromToday(demo, windowHours(demo, res.hours));
    }
  }
  return round2(sum);
}

function rowFacHours(row: EffortLayoutRow, demo: EffortDemo) {
  return round2(rowActualHours(row, demo) + rowRemainingHours(row, demo));
}

function rowVacHours(row: EffortLayoutRow, demo: EffortDemo) {
  return round2(rowFacHours(row, demo) - (row.span.total || 0));
}

function rowFacCost(row: EffortLayoutRow, demo: EffortDemo, store: ScheduleStore) {
  const actual = rowActualCost(row, demo);
  if (row.type === "l2") {
    const rate = personExternalRate(store, row.personId);
    return round2(actual + remainingHoursFromToday(demo, row.hours) * rate);
  }
  let rem = 0;
  for (const task of demo.tasks) {
    if (row.type === "l1" && row.taskId && task.id !== row.taskId) continue;
    for (const res of task.resources) {
      if (row.type === "l1" && row.groupKey && !sameGroupKey(resourceGroupKey(res), row.groupKey)) {
        continue;
      }
      const rate = personExternalRate(store, res.personId);
      rem += remainingHoursFromToday(demo, windowHours(demo, res.hours)) * rate;
    }
  }
  return round2(actual + rem);
}

function rowVacCost(row: EffortLayoutRow, demo: EffortDemo, store: ScheduleStore) {
  return round2(rowFacCost(row, demo, store) - (rowTotalCost(row, demo, store) || 0));
}

function VacValue({
  width,
  label,
  value,
  money,
}: {
  width: number;
  label: string;
  value: number;
  money?: boolean;
}) {
  const over = value > 0.005;
  const under = value < -0.005;
  return (
    <span
      className={`effort-gantt-meta effort-gantt-hours tabular-nums${
        over ? " text-[var(--rag-red)]" : under ? " text-[var(--rag-green)]" : " text-[var(--muted)]"
      }`}
      style={{ width }}
      title={label}
    >
      {money
        ? value
          ? `${over ? "+" : ""}${formatMoney(value)}`
          : "—"
        : value
          ? `${over ? "+" : ""}${formatHours(value, true)}`
          : "—"}
    </span>
  );
}

function ActualValue({
  width,
  label,
  value,
  money,
  editable,
  onChange,
}: {
  width: number;
  label: string;
  value: number;
  money?: boolean;
  editable?: boolean;
  onChange?: (n: number) => void;
}) {
  if (!editable) {
    return (
      <span
        className="effort-gantt-meta effort-gantt-hours text-[var(--muted)]"
        style={{ width }}
        title={label}
      >
        {money ? formatMoney(value || null) : value ? formatHours(value) : "—"}
      </span>
    );
  }
  return (
    <span className="effort-gantt-meta effort-gantt-hours" style={{ width }} title={label}>
      <input
        type="number"
        min={0}
        step={1}
        tabIndex={-1}
        className="effort-gantt-input effort-gantt-cell text-right"
        style={{ width: "100%" }}
        value={value || ""}
        placeholder="—"
        onChange={(e) => onChange?.(parseDecimal(e.target.value))}
      />
    </span>
  );
}

function ActualPlaceholder({
  width,
  label,
}: {
  width: number;
  label: string;
}) {
  return (
    <span
      className="effort-gantt-meta effort-gantt-hours text-[var(--muted)]"
      style={{ width }}
      title={label}
    >
      —
    </span>
  );
}

function personExternalRate(store: ScheduleStore, personId?: string) {
  if (!personId) return 0;
  return store.people.find((p) => p.id === personId)?.externalRate || 0;
}

function namedPeopleCost(
  demo: EffortDemo,
  store: ScheduleStore,
  match?: (taskId: string, personId: string, role: string) => boolean,
) {
  let sum = 0;
  let any = false;
  for (const t of demo.tasks) {
    for (const r of t.resources) {
      if (!r.personId) continue;
      if (match && !match(t.id, r.personId, r.role || "")) continue;
      const rate = personExternalRate(store, r.personId);
      if (!rate) continue;
      any = true;
      sum += hoursTotal(windowHours(demo, r.hours)) * rate;
    }
  }
  return any ? sum : null;
}

function rowTotalCost(
  row: EffortLayoutRow,
  demo: EffortDemo,
  store: ScheduleStore,
): number | null {
  if (row.type === "l2") {
    if (!row.personId) return null;
    const rate = personExternalRate(store, row.personId);
    if (!rate) return null;
    const total = hoursTotal(row.hours);
    return total ? total * rate : null;
  }
  if (row.type === "l0") return namedPeopleCost(demo, store);
  if (row.taskId) {
    return namedPeopleCost(demo, store, (taskId) => taskId === row.taskId);
  }
  if (row.groupKey) {
    const g = parseResourceGroupKey(row.groupKey);
    return namedPeopleCost(demo, store, (_t, personId, role) => {
      if (g.personId) return personId === g.personId;
      return (role || "").toLowerCase() === g.role.toLowerCase();
    });
  }
  return namedPeopleCost(demo, store);
}

function spanLabel(span: HourSpan, weeks: { label: string }[], kind: "start" | "finish") {
  const idx = kind === "start" ? span.start : span.finish;
  if (idx === null) return "—";
  return weeks[idx]?.label ?? `W${idx + 1}`;
}

function rowHeight(type: EffortLayoutRow["type"]) {
  if (type === "l0") return L0_H;
  if (type === "l1") return L1_H;
  return L2_H;
}

function confirmLoss(message: string, hasHours: boolean) {
  if (!hasHours) return true;
  return window.confirm(message);
}

function diamondX(dueCol: number, weekPx: number) {
  return dueCol * weekPx + weekPx / 2;
}

function baselineHoursForRow(
  live: EffortDemo,
  baseline: EffortDemo | undefined,
  row: EffortLayoutRow,
) {
  if (!baseline || row.type !== "l2") return undefined;
  const task =
    baseline.tasks.find((t) => t.id === row.taskId) ||
    baseline.tasks.find((t) => t.name === row.taskName);
  if (!task) return undefined;
  const role =
    row.resourceName && !row.resourceName.startsWith("--")
      ? row.resourceName
      : "";
  const res =
    task.resources.find((r) => (r.role || "") === role) ||
    (row.personId
      ? task.resources.find((r) => r.personId === row.personId)
      : undefined);
  if (!res) return undefined;
  return hoursOnLiveWindow(live, baseline, res.hours);
}

export function EffortGantt({
  store,
  onChange,
  demo: demoProp,
  onDemoChange,
  applyDemoToStore,
  lockedPlace,
  readOnly = false,
  toolbarNote,
  baselineDemo,
  initialFocusPerson,
  hideToolbar = false,
  hideSummary = false,
  hideWeekHeader = false,
  stackedCompact = false,
  milestoneCaption,
  scrollLeft,
  onScrollLeft,
  centreAlign = "mid",
  centreNonce,
  mode: modeProp,
  onMode,
  collapsed: collapsedProp,
  onCollapsed,
  allCollapsed: allCollapsedProp,
  onAllCollapsed,
  foldNonce,
  metaCols: metaColsProp,
  onMetaCols,
  colsOpen: colsOpenProp,
  onColsOpen,
  onStick,
  redHover = false,
  weekPx: weekPxProp,
  onWeekPx,
}: {
  store: ScheduleStore;
  onChange: (store: ScheduleStore) => void;
  demo: EffortDemo;
  onDemoChange: (demo: EffortDemo) => void;
  applyDemoToStore?: (store: ScheduleStore, demo: EffortDemo) => void;
  lockedPlace?: ChartPlace;
  readOnly?: boolean;
  toolbarNote?: string | null;
  baselineDemo?: EffortDemo;
  initialFocusPerson?: string;
  hideToolbar?: boolean;
  hideSummary?: boolean;
  hideWeekHeader?: boolean;
  stackedCompact?: boolean;
  milestoneCaption?: string;
  scrollLeft?: number;
  onScrollLeft?: (left: number) => void;
  centreAlign?: "mid" | "start";
  centreNonce?: number;
  mode?: EffortGroupMode;
  onMode?: (mode: EffortGroupMode) => void;
  collapsed?: Record<string, boolean>;
  onCollapsed?: (next: Record<string, boolean>) => void;
  allCollapsed?: boolean;
  onAllCollapsed?: (next: boolean) => void;
  foldNonce?: { n: number; all: boolean };
  metaCols?: MetaCols;
  onMetaCols?: (next: MetaCols) => void;
  colsOpen?: boolean;
  onColsOpen?: (next: boolean) => void;
  onStick?: (stick: EffortStick) => void;
  redHover?: boolean;
  weekPx?: number;
  onWeekPx?: (next: number) => void;
}) {
  const [liveDemo, setLiveDemo] = useState(() => ensureEffortDemo(demoProp));
  const skipDemoSync = useRef(false);
  useEffect(() => {
    if (skipDemoSync.current) {
      skipDemoSync.current = false;
      return;
    }
    setLiveDemo(ensureEffortDemo(demoProp));
  }, [demoProp]);
  const demo = liveDemo;
  const demoRef = useRef(demo);
  demoRef.current = demo;
  const [placeState, setPlace] = useState<ChartPlace>(lockedPlace || "milestone");
  const place = lockedPlace || placeState;
  const [modeState, setModeState] = useState<EffortGroupMode>("task-res");
  const mode = modeProp ?? modeState;
  const setMode = onMode ?? setModeState;
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);
  const [dropSlot, setDropSlot] = useState<DropSlot | null>(null);
  const [collapsedState, setCollapsedState] = useState<Record<string, boolean>>({});
  const collapsed = collapsedProp ?? collapsedState;
  const setCollapsed = (
    next: Record<string, boolean> | ((cur: Record<string, boolean>) => Record<string, boolean>),
  ) => {
    const val = typeof next === "function" ? next(collapsed) : next;
    (onCollapsed ?? setCollapsedState)(val);
  };
  const [allCollapsedState, setAllCollapsedState] = useState(false);
  const allCollapsed = allCollapsedProp ?? allCollapsedState;
  const setAllCollapsed = onAllCollapsed ?? setAllCollapsedState;
  const [metaColsState, setMetaColsState] = useState<MetaCols>(ALL_META);
  const metaCols = metaColsProp ?? metaColsState;
  const setMetaCols = (next: MetaCols | ((cur: MetaCols) => MetaCols)) => {
    const val = typeof next === "function" ? next(metaCols) : next;
    (onMetaCols ?? setMetaColsState)(val);
  };
  const [weekPxState] = useState(WEEK_PX_DEFAULT);
  const weekPx = weekPxProp ?? weekPxState;
  const weekPxRef = useRef(weekPx);
  const pendingWeekZoomFrac = useRef<number | null>(null);
  const headH = "var(--effort-head)";
  const uiRootRef = useRef<HTMLDivElement>(null);
  function currentWeekPx() {
    return readEffortWeekPx(uiRootRef.current, weekPxRef.current);
  }
  const [colsOpenState, setColsOpenState] = useState(false);
  const colsOpen = colsOpenProp ?? colsOpenState;
  const setColsOpen = (next: boolean | ((cur: boolean) => boolean)) => {
    const val = typeof next === "function" ? next(colsOpen) : next;
    (onColsOpen ?? setColsOpenState)(val);
  };
  const [focusPerson, setFocusPerson] = useState<string | null>(
    initialFocusPerson || null,
  );
  const [namePick, setNamePick] = useState<{
    taskId: string;
    resourceId: string;
    role: string;
    currentId?: string;
    groupKey?: string;
    step: "other" | "new";
  } | null>(null);
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [nameError, setNameError] = useState("");
  const barDrag = useRef<{
    kind: BarKind;
    taskId?: string;
    resourceId?: string;
    groupKey?: string;
    startX: number;
    snapshot: EffortDemo;
    lastDelta: number;
  } | null>(null);
  const rowDrag = useRef<{
    taskId?: string;
    resourceId?: string;
    groupKey?: string;
  } | null>(null);
  const dropSlotRef = useRef<DropSlot | null>(null);
  const freeze = useEffortFreeze();
  const embedScroller = useEffortScrollRoot();
  const localScroller = useRef<HTMLDivElement>(null);
  const scrollerRef = embedScroller ?? localScroller;
  const chartRootRef = useRef<HTMLDivElement>(null);
  const timescaleOnly = !!embedScroller;
  const { busyId: toolBusy, run: runTool } = usePaintedBusy();
  const panRef = useRef<{
    startX: number;
    startY: number;
    startCam: number;
    startTop: number;
    clip: HTMLElement;
    layers: HTMLElement[];
    contentW: number;
    viewW: number;
    yTarget: HTMLElement | null;
    maxTop: number;
    lastCam: number;
    lastTop: number;
  } | null>(null);
  const panPtRef = useRef({ x: 0, y: 0 });
  const panRaf = useRef(0);
  const startPanRef = useRef<(e: ReactPointerEvent | PointerEvent) => void>(() => {});
  const centredOnce = useRef(false);
  const deferGridRef = useRef(false);
  const holdLiveRef = useRef(false);
  const gridHoursRef = useRef<Map<string, number[]>>(new Map());
  const gridLoadRef = useRef<Map<string, number[]> | undefined>(undefined);
  const gridNRef = useRef(0);
  const [gridEpoch, setGridEpoch] = useState(0);
  const nRef = useRef(0);
  const labelWRef = useRef(0);

  const weeks = useMemo(() => demoWeeks(demo, place === "defaults"), [demo, place]);
  const n = weeks.length;
  const rows = useMemo(() => buildEffortLayout(demo, mode), [demo, mode]);
  const displayRows = useMemo(() => {
    if (mode !== "flat" || !sort) return rows;
    const head = rows.filter((r) => r.type === "l0");
    const leaves = rows.filter((r): r is Extract<EffortLayoutRow, { type: "l2" }> => r.type === "l2");
    const val = (r: Extract<EffortLayoutRow, { type: "l2" }>) => {
      if (sort.key === "task") return r.taskName || "";
      if (sort.key === "resource") return r.resourceName || "";
      if (sort.key === "person") return personLabel(store, r.personId);
      if (sort.key === "start") return r.span.start ?? 9999;
      if (sort.key === "finish") return r.span.finish ?? 9999;
      if (sort.key === "dur") return r.span.dur;
      if (sort.key === "cost") return rowTotalCost(r, demo, store) ?? 0;
      return r.span.total;
    };
    leaves.sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      if (typeof va === "string") return va.localeCompare(String(vb)) * sort.dir;
      return (Number(va) - Number(vb)) * sort.dir;
    });
    return [...head, ...leaves];
  }, [rows, mode, sort, store, demo]);
  const visibleRows = useMemo(() => {
    if (mode === "flat") return displayRows;
    return displayRows.filter((row) => {
      if (row.type !== "l2") return true;
      const parent =
        mode === "task-res" ? `t-${row.taskId}` : `rg-${(row.groupKey || "").toLowerCase()}`;
      return !collapsed[parent];
    });
  }, [displayRows, mode, collapsed]);
  const personCol = place === "milestone";
  const pmOn = place === "milestone" && !!store.projectManagement;
  const nameCols = mode === "flat" ? (personCol ? 3 : 2) : personCol ? 2 : 1;
  const nameW = nameCols * FLAT_COL_W + 24;
  const metaW =
    (metaCols.start ? META_W : 0) +
    (metaCols.finish ? META_W : 0) +
    (metaCols.duration ? META_W : 0) +
    (hoursColOn(metaCols, pmOn) ? HOURS_W + (pmOn ? ACTUAL_HOURS_W + FAC_HOURS_W + VAC_HOURS_W : 0) : 0) +
    (costColOn(metaCols, pmOn) ? COST_W + (pmOn ? ACTUAL_COST_W + FAC_COST_W + VAC_COST_W : 0) : 0);
  const labelW = nameW + metaW;
  const chartW = n * weekPx;
  nRef.current = n;
  labelWRef.current = labelW;
  const dueCol = dueColumnIndex(demo);
  const tailStartCol = tailStartColumnIndex(demo);
  const todayCol = todayColumnIndex(demo);
  const showToday = place === "milestone" && todayCol >= 0 && todayCol < n;
  const weekLoad = useMemo(() => personWeekLoad(demo), [demo]);
  void gridEpoch;
  if (!deferGridRef.current) {
    gridNRef.current = n;
    gridLoadRef.current = weekLoad;
    const nextHours = new Map<string, number[]>();
    for (const row of visibleRows) {
      if (row.type === "l2") nextHours.set(row.key, row.hours);
    }
    gridHoursRef.current = nextHours;
  }

  function clipEl() {
    return scrollerRef.current;
  }

  function camView(clip: HTMLElement) {
    if (timescaleOnly) {
      const split = clip.closest(".mrt-effort-split") as HTMLElement | null;
      const frozenW = freeze?.frozenHost?.getBoundingClientRect().width ?? 0;
      const fromSplit = split ? split.clientWidth - frozenW : 0;
      return Math.max(80, fromSplit > 80 ? fromSplit : clip.clientWidth);
    }
    return Math.max(80, clip.clientWidth - FN_W - labelWRef.current);
  }

  function camContent(clip: HTMLElement) {
    const weeksW = nRef.current * currentWeekPx();
    const hostW = freeze?.chartHost?.scrollWidth ?? 0;
    const stackW = chartRootRef.current?.scrollWidth ?? 0;
    return Math.max(weeksW, hostW, stackW, clip.scrollWidth || 0);
  }

  function applyCamera(clip: HTMLElement | null, x: number) {
    if (!clip) return 0;
    return writeEffortCamX(clip, x, camContent(clip), camView(clip));
  }

  useEffect(() => {
    if (!foldNonce || foldNonce.n === 0) return;
    toggleEffortUiClass(uiRootRef.current, "is-all-collapsed", foldNonce.all);
    // Only react to the shared toolbar signal, not every row rebuild.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foldNonce]);

  function persist(mut: (next: ScheduleStore) => void) {
    if (readOnly) return;
    const next = JSON.parse(JSON.stringify(store)) as ScheduleStore;
    const beforeDemo = next.effortDemo;
    mut(next);
    const chartTouched = next.effortDemo !== beforeDemo;
    const chartDemo = ensureEffortDemo(chartTouched ? next.effortDemo : demo);
    next.effortDemo = beforeDemo;
    demoRef.current = chartDemo;
    if (chartTouched) {
      skipDemoSync.current = true;
      setLiveDemo(chartDemo);
      applyDemoToStore?.(next, chartDemo);
      onDemoChange(chartDemo);
    }
    onChange(next);
  }

  function commit(nextDemo: EffortDemo, opts?: { keepLive?: boolean }) {
    if (readOnly) return;
    const d = ensureEffortDemo(nextDemo);
    demoRef.current = d;
    skipDemoSync.current = true;
    if (opts?.keepLive) {
      deferGridRef.current = true;
      holdLiveRef.current = true;
    }
    setLiveDemo(d);
    onDemoChange(d);
  }

  useLayoutEffect(() => {
    const el = clipEl();
    if (!el || n < 1) return;
    if (place === "milestone") {
      const unconstrained =
        el.clientWidth > (typeof window !== "undefined" ? window.innerWidth - 24 : 1e9);
      const alreadyOverflows = n * currentWeekPx() > el.clientWidth + 8;
      if (!unconstrained && !alreadyOverflows) {
        const view = camView(el);
        const needed = Math.min(104, Math.ceil(view / currentWeekPx()));
        if (n < needed) {
          const padded = padViewportToFill(demoRef.current, needed);
          if ((padded.weekCount || 0) > n) commit(padded);
          return;
        }
      }
    }
    if (centredOnce.current) {
      applyCamera(el, readEffortCamX(el));
      return;
    }
    centreChart(el);
    centredOnce.current = true;
  }, [n, labelW, place]);

  useLayoutEffect(() => {
    const root = chartRootRef.current;
    if (root) {
      root.querySelectorAll<HTMLElement>("[data-effort-live-layer]").forEach((el) => {
        el.style.transform = "";
      });
      root.querySelectorAll<HTMLElement>("[data-effort-live]").forEach((el) => {
        el.style.transform = "";
      });
    }
    holdLiveRef.current = false;
    if (!deferGridRef.current) return;
    let inner = 0;
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => {
        deferGridRef.current = false;
        setGridEpoch((x) => x + 1);
      });
    });
    return () => {
      window.cancelAnimationFrame(outer);
      window.cancelAnimationFrame(inner);
    };
  }, [demo]);

  function centreChart(el?: HTMLDivElement | null, align: "mid" | "start" = centreAlign) {
    const box = el || clipEl();
    if (!box) return;
    const px = currentWeekPx();
    const span = allSpan(demo);
    let start = span.start ?? tailStartCol;
    let end = span.finish ?? dueCol;
    if (place === "milestone") {
      start = Math.min(start, tailStartCol, dueCol);
      end = Math.max(end, dueCol);
    }
    start = Math.max(0, start - 1);
    end = Math.min(n - 1, Math.max(start, end + 1));
    const view = camView(box);
    const target = align === "start" ? start * px : ((start + end + 1) / 2) * px - view / 2;
    applyCamera(box, target);
  }

  useLayoutEffect(() => {
    if (centreNonce == null) return;
    centreChart(clipEl(), centreAlign);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centreNonce]);

  useLayoutEffect(() => {
    const frac = pendingWeekZoomFrac.current;
    if (frac == null) return;
    pendingWeekZoomFrac.current = null;
    const box = clipEl();
    if (!box) return;
    applyCamera(box, frac * chartW - camView(box) / 2);
  }, [weekPx, chartW]);

  useLayoutEffect(() => {
    if (embedScroller) return;
    if (scrollLeft == null) return;
    const box = clipEl();
    if (!box) return;
    applyCamera(box, scrollLeft);
  }, [scrollLeft]);

  useEffect(() => {
    if (!colsOpen) return;
    function onDown(e: PointerEvent) {
      const t = e.target as HTMLElement;
      if (t.closest("[data-mrt-cols-pop]") || t.closest("[data-mrt-cols-btn]")) return;
      setColsOpen(false);
    }
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [colsOpen, setColsOpen]);

  function startWeekPreview(
    startX: number,
    applyDelta: (delta: number) => void,
    commitDelta: (delta: number) => void,
    onDone?: () => void,
  ) {
    let lastDelta = 0;
    let latestX = startX;
    let raf = 0;
    const weekPx = currentWeekPx();
    const applyFrame = () => {
      raf = 0;
      const delta = Math.round((latestX - startX) / weekPx);
      lastDelta = delta;
      applyDelta(delta);
    };
    const onMove = (ev: PointerEvent) => {
      latestX = ev.clientX;
      if (!raf) raf = window.requestAnimationFrame(applyFrame);
    };
    const onUp = () => {
      if (raf) {
        window.cancelAnimationFrame(raf);
        applyFrame();
      }
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (lastDelta !== 0) commitDelta(lastDelta);
      onDone?.();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function applyPanFrame() {
    panRaf.current = 0;
    const p = panRef.current;
    if (!p) return;
    const { x, y } = panPtRef.current;
    const next = clampCamX(p.startCam - (x - p.startX), p.contentW, p.viewW);
    if (next !== p.lastCam) {
      p.lastCam = next;
      paintCamX(p.clip, next, p.layers);
    }
    if (!p.yTarget) return;
    const top = Math.max(0, Math.min(p.maxTop, Math.round(p.startTop - (y - p.startY))));
    if (top !== p.lastTop) {
      p.yTarget.scrollTop = top;
      p.lastTop = top;
    }
  }

  function startPan(e: ReactPointerEvent | PointerEvent) {
    if (e.button !== 0) return;
    if (panRef.current) return;
    const target = e.target instanceof Element ? e.target : null;
    if (!target) return;
    if (
      target.closest("input") ||
      target.closest("select") ||
      target.closest("button")
    ) {
      return;
    }
    // In read-only (guest) mode, bars still cover the chart — allow pan on them.
    // When editable, leave grab/resize/diamond/tail to their own handlers.
    if (
      !readOnly &&
      (target.closest("[data-effort-grab]") ||
        target.closest("[data-effort-resize]") ||
        target.closest("[data-effort-diamond]") ||
        target.closest("[data-effort-tail]"))
    ) {
      return;
    }
    const el = clipEl();
    if (!el || panRef.current) return;
    e.preventDefault();
    const yBox = timescaleOnly
      ? (el.closest("[data-mrt-effort-body]") as HTMLElement | null)
      : el;
    const startCam = readEffortCamX(el);
    const startTop = yBox?.scrollTop ?? 0;
    const host = freeze?.chartHost;
    const maxTop = yBox ? Math.max(0, yBox.scrollHeight - yBox.clientHeight) : 0;
    panRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startCam,
      startTop,
      clip: el,
      layers: timescaleOnly && host ? [host] : topCamLayers(el),
      contentW: nRef.current * currentWeekPx(),
      viewW: timescaleOnly ? Math.max(80, el.clientWidth) : camView(el),
      yTarget: yBox,
      maxTop,
      lastCam: startCam,
      lastTop: startTop,
    };
    panPtRef.current = { x: e.clientX, y: e.clientY };
    const grabEl = target instanceof HTMLElement ? target : el;
    const prevCursor = grabEl.style.cursor;
    grabEl.style.cursor = "grabbing";
    const onMove = (ev: PointerEvent) => {
      panPtRef.current = { x: ev.clientX, y: ev.clientY };
      if (!panRaf.current) panRaf.current = window.requestAnimationFrame(applyPanFrame);
    };
    const onUp = () => {
      if (panRaf.current) {
        window.cancelAnimationFrame(panRaf.current);
        panRaf.current = 0;
        applyPanFrame();
      }
      panRef.current = null;
      grabEl.style.cursor = prevCursor;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  startPanRef.current = startPan;
  useLayoutEffect(() => {
    if (!timescaleOnly || hideWeekHeader || !freeze?.panDownRef) return;
    const fn = (ev: PointerEvent) => startPanRef.current(ev);
    freeze.panDownRef.current = fn;
    return () => {
      if (freeze.panDownRef.current === fn) freeze.panDownRef.current = null;
    };
  }, [timescaleOnly, hideWeekHeader, freeze]);

  function startDueDrag(e: ReactPointerEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const snapshot = JSON.parse(JSON.stringify(demoRef.current)) as EffortDemo;
    const base = snapshot.milestone.due;
    const layer = liveLayerInRow(chartRootRef.current, e.currentTarget);
    const layers: HTMLElement[] = [];
    if (layer) layers.push(layer);
    if (snapshot.stick === "tail-start" || snapshot.stick === "tail-end") {
      for (const live of collectShiftLayers(chartRootRef.current, "l0", {})) {
        if (live !== layer) layers.push(live);
      }
    }
    const px = currentWeekPx();
    startWeekPreview(
      e.clientX,
      (delta) => applyShiftTransforms(layers, delta * px),
      (delta) => {
        const dt = new Date(base.y, base.m - 1, base.d);
        dt.setDate(dt.getDate() + 7 * delta);
        commit(
          setMilestoneDue(snapshot, {
            y: dt.getFullYear(),
            m: dt.getMonth() + 1,
            d: dt.getDate(),
          }),
          { keepLive: true },
        );
      },
    );
  }

  function startTailDrag(e: ReactPointerEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const snapshot = JSON.parse(JSON.stringify(demoRef.current)) as EffortDemo;
    const baseTail = Math.max(1, snapshot.milestone.tailWeeks);
    const handleEl = e.currentTarget instanceof HTMLElement ? e.currentTarget : null;
    const row = chartRowFromTarget(chartRootRef.current, handleEl);
    const bar = snapshotLiveEl(
      row?.querySelector<HTMLElement>('[data-effort-live="tail-bar"]') ?? undefined,
    );
    const handle = snapshotLiveEl(
      row?.querySelector<HTMLElement>('[data-effort-live="tail"]') ?? handleEl ?? undefined,
    );
    const px = currentWeekPx();
    startWeekPreview(
      e.clientX,
      (delta) => applyTailPreview(bar, handle, delta * px),
      (delta) => commit(setTailWeeks(snapshot, Math.max(1, baseTail - delta)), { keepLive: true }),
    );
  }

  function startRunResize(
    e: ReactPointerEvent,
    taskId: string,
    resourceId: string,
    runStart: number,
    runEnd: number,
    edge: "start" | "end",
  ) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const snapshot = JSON.parse(JSON.stringify(demoRef.current)) as EffortDemo;
    const base = edge === "start" ? runStart : runEnd;
    const handleEl = e.currentTarget as HTMLElement;
    const row = chartRowFromTarget(chartRootRef.current, handleEl);
    if (row && !row.contains(handleEl)) return;
    const pair = resizePair(handleEl);
    const barSnap = snapshotLiveEl(pair.bar);
    const handleSnap = snapshotLiveEl(pair.handle);
    if (!handleSnap) return;
    const px = currentWeekPx();
    startWeekPreview(
      e.clientX,
      (delta) => applyResizePreview(barSnap, handleSnap, edge, delta * px),
      (delta) =>
        commit(
          resizeHourRun(snapshot, taskId, resourceId, runStart, runEnd, edge, base + delta),
          { keepLive: true },
        ),
    );
  }

  function startSummaryResize(
    e: ReactPointerEvent,
    scope: ResizeSpanScope,
    spanStart: number,
    spanEnd: number,
    edge: "start" | "end",
  ) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const snapshot = JSON.parse(JSON.stringify(demoRef.current)) as EffortDemo;
    const base = edge === "start" ? spanStart : spanEnd;
    const handleEl = e.currentTarget as HTMLElement;
    const row = chartRowFromTarget(chartRootRef.current, handleEl);
    if (row && !row.contains(handleEl)) return;
    const pair = resizePair(handleEl);
    const snaps = collectResizePreview(chartRootRef.current, scope, edge);
    if (snaps.length === 0) {
      const barSnap = snapshotLiveEl(pair.bar);
      const handleSnap = snapshotLiveEl(pair.handle);
      if (!handleSnap) return;
      snaps.push({ bar: barSnap, handle: handleSnap });
    }
    const px = currentWeekPx();
    startWeekPreview(
      e.clientX,
      (delta) => applyResizePreviews(snaps, edge, delta * px),
      (delta) => commit(resizeMatchingSpan(snapshot, scope, edge, base + delta), { keepLive: true }),
    );
  }

  function startBarDrag(
    e: ReactPointerEvent,
    kind: BarKind,
    meta: { taskId?: string; resourceId?: string; groupKey?: string },
  ) {
    if (readOnly) return;
    const snapshot = JSON.parse(JSON.stringify(demoRef.current)) as EffortDemo;
    const layers = collectShiftLayers(chartRootRef.current, kind, meta);
    if (layers.length === 0) {
      const fallback = liveLayerInRow(chartRootRef.current, e.currentTarget);
      if (fallback) layers.push(fallback);
    }
    barDrag.current = {
      kind,
      ...meta,
      startX: e.clientX,
      snapshot,
      lastDelta: 0,
    };
    const px = currentWeekPx();
    startWeekPreview(
      e.clientX,
      (delta) => applyShiftTransforms(layers, delta * px),
      (delta) => {
        if (kind === "l0") commit(shiftAll(snapshot, delta), { keepLive: true });
        else if (kind === "l1-task" && meta.taskId) {
          commit(shiftTask(snapshot, meta.taskId, delta), { keepLive: true });
        } else if (kind === "l1-group" && meta.groupKey) {
          commit(shiftResourceGroup(snapshot, meta.groupKey, delta), { keepLive: true });
        } else if (kind === "l2" && meta.taskId && meta.resourceId) {
          commit(shiftResource(snapshot, meta.taskId, meta.resourceId, delta), { keepLive: true });
        }
      },
      () => {
        barDrag.current = null;
      },
    );
  }

  function onBarDown(
    e: ReactPointerEvent,
    kind: BarKind,
    meta: { taskId?: string; resourceId?: string; groupKey?: string },
  ) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    startBarDrag(e, kind, meta);
  }

  function applyRowDrop(src: NonNullable<typeof rowDrag.current>, slot: DropSlot) {
    const target = displayRows.find((r) => r.key === slot.key);
    if (!target || target.type === "l0") return;
    if (mode === "res-task") {
      if (src.groupKey && !src.resourceId) {
        const toKey =
          target.type === "l1"
            ? target.groupKey
            : target.type === "l2"
              ? target.groupKey
              : undefined;
        if (toKey) commit(reorderResourceGroup(demoRef.current, src.groupKey, toKey, slot.edge));
        return;
      }
      if (src.taskId) {
        if (target.type === "l1" && target.groupKey) {
          if (src.resourceId && !isSyntheticResourceId(src.resourceId)) {
            commit(assignResourceToGroup(demoRef.current, src.taskId, src.resourceId, target.groupKey));
            return;
          }
          const { role, personId } = parseResourceGroupKey(target.groupKey);
          const next = addResource(demoRef.current, src.taskId, role || UNASSIGNED_LABEL, "start");
          const task = next.tasks.find((t) => t.id === src.taskId);
          const res = task?.resources[0];
          if (res && personId) res.personId = personId;
          commit(next);
          return;
        }
        const toTaskId = target.taskId;
        if (toTaskId && src.taskId !== toTaskId) {
          commit(reorderTask(demoRef.current, src.taskId, toTaskId, slot.edge));
        }
      }
      return;
    }
    if (src.resourceId && isSyntheticResourceId(src.resourceId)) return;
    if (src.resourceId && src.taskId) {
      if (target.type === "l1" && target.groupKey) {
        commit(setResourceRole(demoRef.current, src.taskId, src.resourceId, target.groupKey));
        return;
      }
      const toTask =
        target.type === "l2" || target.type === "l1" ? target.taskId : undefined;
      if (!toTask) return;
      const anchor = target.type === "l2" && !target.synthetic ? target.resourceId : undefined;
      commit(
        moveResource(
          demoRef.current,
          src.taskId,
          src.resourceId,
          toTask,
          anchor,
          slot.edge,
        ),
      );
      return;
    }
    const toTaskId = target.taskId;
    if (src.taskId && toTaskId && src.taskId !== toTaskId) {
      commit(reorderTask(demoRef.current, src.taskId, toTaskId, slot.edge));
    }
  }

  function startRowDrag(e: ReactPointerEvent, row: EffortLayoutRow) {
    if (e.button !== 0) return;
    if (row.type === "l0") return;
    if (row.type === "l2" && row.synthetic && mode !== "res-task") return;
    e.preventDefault();
    e.stopPropagation();
    if (mode === "flat" && sort) setSort(null);
    rowDrag.current =
      row.type === "l2"
        ? { taskId: row.taskId, resourceId: row.resourceId }
        : { taskId: row.taskId, groupKey: row.groupKey };
    const onMove = (ev: PointerEvent) => {
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const hit = el?.closest("[data-effort-row]") as HTMLElement | null;
      if (!hit?.dataset.effortRow) return;
      const rect = hit.getBoundingClientRect();
      const edge = ev.clientY < rect.top + rect.height / 2 ? "before" : "after";
      const list = visibleRows;
      const i = list.findIndex((r) => r.key === hit.dataset.effortRow);
      const next: DropSlot =
        edge === "after" && i >= 0 && i < list.length - 1
          ? { key: list[i + 1].key, edge: "before" }
          : { key: hit.dataset.effortRow, edge };
      dropSlotRef.current = next;
      setDropSlot(next);
    };
    const onUp = () => {
      const src = rowDrag.current;
      const slot = dropSlotRef.current;
      rowDrag.current = null;
      dropSlotRef.current = null;
      setDropSlot(null);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (src && slot) applyRowDrop(src, slot);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function onAdd(row: EffortLayoutRow) {
    if (row.type === "l0") {
      commit(addTask(demo, "start"));
      return;
    }
    if (row.type === "l1" && row.taskId) {
      commit(addResource(demo, row.taskId, undefined, "start"));
      return;
    }
    if (row.type === "l1" && row.groupKey) {
      commit(addTaskInGroup(demo, row.groupKey, "start"));
      return;
    }
    if (row.type === "l2") {
      if (mode === "res-task" && row.groupKey) {
        commit(addTaskInGroup(demo, row.groupKey, row.taskId));
        return;
      }
      commit(
        addResource(
          demo,
          row.taskId,
          undefined,
          row.synthetic ? "start" : row.resourceId,
        ),
      );
    }
  }

  function onRemove(row: EffortLayoutRow) {
    if (row.type === "l0") return;
    if (row.type === "l1" && row.taskId) {
      const task = demo.tasks.find((t) => t.id === row.taskId);
      if (!confirmLoss("This task has hours. Remove it?", Boolean(task && taskHasHours(task)))) {
        return;
      }
      commit(removeTask(demo, row.taskId));
      return;
    }
    if (row.type === "l1" && row.groupKey) {
      if (!confirmLoss("This group has hours. Remove it?", groupHasHours(demo, row.groupKey))) {
        return;
      }
      commit(removeResourceGroup(demo, row.groupKey));
      return;
    }
    if (row.type === "l2") {
      if (row.synthetic) {
        commit(removeTask(demo, row.taskId));
        return;
      }
      const task = demo.tasks.find((t) => t.id === row.taskId);
      const res = task?.resources.find((r) => r.id === row.resourceId);
      if (!confirmLoss("This row has hours. Remove it?", Boolean(res && resourceHasHours(res)))) {
        return;
      }
      commit(removeResource(demo, row.taskId, row.resourceId));
    }
  }

  function toggleSort(key: SortKey) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 1 };
      if (prev.dir === 1) return { key, dir: -1 };
      return null;
    });
  }

  function barMeta(row: EffortLayoutRow) {
    if (row.type === "l0") return { kind: "l0" as const, meta: {} };
    if (row.type === "l1" && row.taskId) {
      return { kind: "l1-task" as const, meta: { taskId: row.taskId } };
    }
    if (row.type === "l1" && row.groupKey) {
      return { kind: "l1-group" as const, meta: { groupKey: row.groupKey } };
    }
    if (row.type === "l2") {
      return {
        kind: "l2" as const,
        meta: { taskId: row.taskId, resourceId: row.resourceId },
      };
    }
    return null;
  }

  function createRole(current?: { taskId: string; resourceId: string }) {
    if (readOnly) return;
    const assigned = current
      ? demo.tasks.find((t) => t.id === current.taskId)?.resources.find((r) => r.id === current.resourceId)
      : undefined;
    if (assigned?.personId && !window.confirm("Changing role will reset the name.")) return;
    const name = window.prompt("New resource role");
    const role = name?.trim();
    if (!role) return;
    persist((s) => {
      if (!s.resourceRoles.includes(role)) {
        s.resourceRoles.push(role);
        if (!s.roleEligibility[role]) s.roleEligibility[role] = {};
      }
      if (current) {
        let next = ensureEffortDemo(demo);
        if (assigned?.personId) {
          next = setResourcePerson(next, current.taskId, current.resourceId, undefined);
        }
        s.effortDemo = setResourceRole(next, current.taskId, current.resourceId, role);
      }
    });
  }

  function applyPerson(taskId: string, resourceId: string, personId: string | undefined) {
    if (namePick?.groupKey) {
      commit(setGroupPerson(demo, namePick.groupKey, personId));
    } else {
      commit(setResourcePerson(demo, taskId, resourceId, personId));
    }
    setNamePick(null);
    setNameError("");
  }

  function applyBrandNewName() {
    if (readOnly || !namePick) return;
    const first = newFirst.trim();
    const last = newLast.trim();
    if (!first || !last) {
      setNameError("First and last name are required.");
      return;
    }
    const name = joinPersonName(first, last);
    if (store.people.some((p) => samePersonName(p.name, name))) {
      setNameError("That name already exists.");
      return;
    }
    persist((s) => {
      let i = s.people.length;
      let id = personIdFromName(name, i);
      while (s.people.some((p) => p.id === id)) {
        i += 1;
        id = personIdFromName(name, i);
      }
      const internal = defaultInternalRateForRole("");
      s.people.push({
        id,
        name,
        role: "",
        email: "",
        weeklyCapacityHours: DEFAULT_WEEKLY_CAPACITY_HOURS,
        internalRate: internal,
        externalRate: defaultExternalRate(internal, store.externalRatePercent || 150),
      });
      s.effortDemo = namePick.groupKey
        ? setGroupPerson(ensureEffortDemo(demo), namePick.groupKey, id)
        : setResourcePerson(
            ensureEffortDemo(demo),
            namePick.taskId,
            namePick.resourceId,
            id,
          );
    });
    setNamePick(null);
    setNewFirst("");
    setNewLast("");
    setNameError("");
  }

  const sortMark = (key: SortKey) =>
    sort?.key === key ? (sort.dir === 1 ? " ▲" : " ▼") : "";

  const headerCols = (
    [
      metaCols.start ? { key: "start", label: "Start", sortKey: "start" as const, width: META_W } : null,
      metaCols.finish ? { key: "finish", label: "Finish", sortKey: "finish" as const, width: META_W } : null,
      metaCols.duration ? { key: "dur", label: "Duration", sortKey: "dur" as const, width: META_W } : null,
      hoursColOn(metaCols, pmOn) ? { key: "hours", label: "Hours", sortKey: "hours" as const, width: HOURS_W } : null,
      pmOn ? { key: "actualHours", label: "Actual hours", width: ACTUAL_HOURS_W } : null,
      pmOn ? { key: "facHours", label: "FAC h", width: FAC_HOURS_W } : null,
      pmOn ? { key: "vacHours", label: "VAC h", width: VAC_HOURS_W } : null,
      costColOn(metaCols, pmOn) ? { key: "cost", label: "Total Cost", sortKey: "cost" as const, width: COST_W } : null,
      pmOn ? { key: "actualCost", label: "Actual $", width: ACTUAL_COST_W } : null,
      pmOn ? { key: "facCost", label: "FAC $", width: FAC_COST_W } : null,
      pmOn ? { key: "vacCost", label: "VAC $", width: VAC_COST_W } : null,
    ] as const
  ).filter((c): c is NonNullable<typeof c> => Boolean(c));

  const freezeReady = !!(freeze?.frozenHost && freeze?.chartHost);
  const tableBands = (pane: EffortPane) => (
    <>
          {hideWeekHeader ? null : (
          <>
          {pane !== "chart" ? (
          <>
          <div
            className="effort-gantt-fn effort-gantt-head"
            style={{ height: headH, position: pane === "both" ? "sticky" : undefined, top: pane === "both" ? 0 : undefined, left: pane === "both" ? 0 : undefined, zIndex: pane === "both" ? 30 : undefined }}
          />
          <div
            className="effort-gantt-head effort-gantt-labels is-summary flex border-b border-[var(--border)] text-[10px]"
            style={{ height: headH, position: pane === "both" ? "sticky" : undefined, top: pane === "both" ? 0 : undefined, left: pane === "both" ? FN_W : undefined, zIndex: pane === "both" ? 20 : undefined }}
          >
            {mode === "flat" ? (
              <>
                <button type="button" className="effort-gantt-sort px-1 text-left" style={{ width: FLAT_COL_W }} onClick={() => toggleSort("task")}>
                  Task{sortMark("task")}
                </button>
                <button type="button" className="effort-gantt-sort px-1 text-left" style={{ width: FLAT_COL_W }} onClick={() => toggleSort("resource")}>
                  Resource role{sortMark("resource")}
                </button>
                {personCol ? (
                  <button type="button" className="effort-gantt-sort px-1 text-left" style={{ width: FLAT_COL_W }} onClick={() => toggleSort("person")}>
                    Resource name{sortMark("person")}
                  </button>
                ) : null}
              </>
            ) : (
              <span className="flex items-center px-2" style={{ width: nameW }}>
                {mode === "res-task"
                  ? personCol
                    ? "Role / Name"
                    : "Resource role"
                  : personCol
                    ? "Task / Role / Name"
                    : "Task / Resource role"}
              </span>
            )}
            {headerCols.map((col) => {
                  const hideKey = HIDEABLE_META[col.key];
                  const hoursClass =
                    col.key === "hours" ||
                    col.key === "cost" ||
                    col.key.startsWith("actual") ||
                    col.key.startsWith("fac") ||
                    col.key.startsWith("vac");
                  const onHide = hideKey
                    ? () => setMetaCols((cur) => ({ ...cur, [hideKey]: false }))
                    : undefined;
                  return mode === "flat" && "sortKey" in col && col.sortKey ? (
                    <MetaColHead
                      key={col.key}
                      colKey={col.key}
                      label={col.label}
                      width={col.width}
                      hoursClass={hoursClass}
                      sortMark={sortMark(col.sortKey)}
                      onSort={() => toggleSort(col.sortKey)}
                      onHide={onHide}
                    />
                  ) : (
                    <MetaColHead
                      key={col.key}
                      colKey={col.key}
                      label={col.label}
                      width={col.width}
                      hoursClass={hoursClass}
                      onHide={onHide}
                    />
                  );
                })}
          </div>
          </>
          ) : null}
          {pane !== "frozen" ? (
          <div
            className="effort-gantt-head effort-gantt-weekhead relative flex border-b border-[var(--border)] text-[10px]"
            data-effort-pan
            onPointerDown={startPan}
            style={{ height: headH, position: pane === "both" ? "sticky" : undefined, top: pane === "both" ? 0 : undefined, zIndex: pane === "both" ? 12 : undefined }}
          >
            {weeks.map((w) => (
              <WeekHeadCell key={w.idx} label={w.label} />
            ))}
            {showToday ? (
              <div className="effort-gantt-today" style={{ left: weekMid(todayCol) }} title="Today" />
            ) : null}
          </div>
          ) : null}
          </>
          )}

          {place === "milestone" ? (
            <>
              {pane !== "chart" ? (
              <>
              <div className="effort-gantt-fn" style={{ height: MS_H, position: pane === "both" ? "sticky" : undefined, left: pane === "both" ? 0 : undefined, zIndex: pane === "both" ? 30 : undefined }}>
                <span className="text-[10px] text-[var(--muted)]" title="Milestone due">◆</span>
              </div>
              <div className="effort-gantt-labels is-summary" style={{ position: pane === "both" ? "sticky" : undefined, left: pane === "both" ? FN_W : undefined, zIndex: pane === "both" ? 20 : undefined }}>
                <MilestoneLabel
                  demo={demo}
                  weeks={weeks}
                  nameW={nameW}
                  metaCols={metaCols}
                  pmOn={pmOn}
                  caption={milestoneCaption}
                  canReset={!!baselineDemo && milestoneDirty(demo, baselineDemo)}
                  onReset={
                    baselineDemo && !readOnly
                      ? () => commit(restoreMilestoneFromBaseline(demo, baselineDemo))
                      : undefined
                  }
                  onDue={(due) => commit(setMilestoneDue(demo, due))}
                  onTail={(weeksCount) => commit(setTailWeeks(demo, weeksCount))}
                />
              </div>
              </>
              ) : null}
              {pane !== "frozen" ? (
              <MilestoneLane
                demo={demo}
                baseline={baselineDemo}
                stick={demo.stick}
                todayCol={showToday ? todayCol : null}
                onDueDrag={startDueDrag}
                onTailDrag={startTailDrag}
              />
              ) : null}
            </>
          ) : null}

          {visibleRows.map((row) => {
            const meta = barMeta(row);
            const deferGrid = deferGridRef.current;
            return (
              <RowTriple
                key={row.key}
                pane={pane}
                row={row}
                demo={demo}
                weeks={weeks}
                mode={mode}
                place={place}
                nameW={nameW}
                metaCols={metaCols}
                baselineHours={baselineHoursForRow(demo, baselineDemo, row)}
                n={n}
                hourPaintN={row.type === "l2" && deferGrid ? gridNRef.current : undefined}
                hourPaintHours={
                  row.type === "l2" && deferGrid
                    ? gridHoursRef.current.get(row.key)
                    : undefined
                }
                hourPaintLoad={deferGrid ? gridLoadRef.current : undefined}
                stick={demo.stick}
                dueCol={dueCol}
                tailStartCol={tailStartCol}
                todayCol={showToday ? todayCol : null}
                dropSlot={dropSlot}
                weekLoad={place === "milestone" ? weekLoad : undefined}
                overrunPercent={store.overrunPercent}
                highlight={
                  place === "milestone" &&
                  focusPerson != null &&
                  row.type === "l2" &&
                  row.personId === focusPerson
                }
                store={store}
                canResetEffort={
                  row.type === "l0" && !!baselineDemo && effortHoursDirty(demo, baselineDemo)
                }
                onResetEffort={
                  row.type === "l0" && baselineDemo && !readOnly
                    ? () => commit(restoreHoursFromBaseline(demo, baselineDemo))
                    : undefined
                }
                collapsed={row.type === "l1" ? !!collapsed[row.key] : false}
                onToggleCollapse={
                  row.type === "l1"
                    ? () => {
                        setAllCollapsed(false);
                        setCollapsed((cur) => ({ ...cur, [row.key]: !cur[row.key] }));
                      }
                    : undefined
                }
                onRenameTask={(name) => {
                  const next = JSON.parse(JSON.stringify(demo)) as EffortDemo;
                  if (row.type === "l1" && row.taskId) {
                    const t = next.tasks.find((x) => x.id === row.taskId);
                    if (t) t.name = name;
                  } else if (row.type === "l2") {
                    const t = next.tasks.find((x) => x.id === row.taskId);
                    if (t) t.name = name;
                  }
                  commit(next);
                }}
                onRenameRole={(name) => {
                  if (row.type === "l1" && row.groupKey) {
                    commit(renameRoleGroup(demo, row.groupKey, name));
                    return;
                  }
                  if (row.type !== "l2") return;
                  if (row.synthetic) {
                    commit(renameSyntheticResource(demo, row.taskId, name));
                    return;
                  }
                  commit(setResourceRole(demo, row.taskId, row.resourceId, name));
                }}
                onSelectRole={(value) => {
                  if (row.type === "l1" && row.groupKey) {
                    if (value === CREATE_ROLE) {
                      createRole();
                      return;
                    }
                    const ids = groupPersonIds(demo, row.groupKey);
                    if (
                      ids.some((id) => personOutOfRole(store, value, id)) &&
                      !confirmKeepAsteriskName(value)
                    ) {
                      return;
                    }
                    commit(setGroupRole(demo, row.groupKey, value));
                    return;
                  }
                  if (row.type !== "l2" || row.synthetic) {
                    if (value === CREATE_ROLE) createRole();
                    return;
                  }
                  if (value === CREATE_ROLE) {
                    createRole({ taskId: row.taskId, resourceId: row.resourceId });
                    return;
                  }
                  if (
                    row.personId &&
                    personOutOfRole(store, value, row.personId) &&
                    !confirmKeepAsteriskName(value)
                  ) {
                    return;
                  }
                  commit(setResourceRole(demo, row.taskId, row.resourceId, value));
                }}
                onSelectPerson={(value) => {
                  if (row.type === "l1" && row.groupKey) {
                    const role =
                      row.resourceName && !row.resourceName.startsWith("--")
                        ? row.resourceName
                        : row.label;
                    if (value === ADD_OTHER) {
                      setNamePick({
                        taskId: "",
                        resourceId: "",
                        role,
                        currentId: row.personId,
                        groupKey: row.groupKey,
                        step: "other",
                      });
                      setNewFirst("");
                      setNewLast("");
                      setNameError("");
                      return;
                    }
                    commit(setGroupPerson(demo, row.groupKey, value || undefined));
                    return;
                  }
                  if (row.type !== "l2" || row.synthetic) return;
                  const role =
                    row.resourceName && !row.resourceName.startsWith("--") ? row.resourceName : "";
                  if (value === ADD_OTHER) {
                    setNamePick({
                      taskId: row.taskId,
                      resourceId: row.resourceId,
                      role,
                      currentId: row.personId,
                      step: "other",
                    });
                    setNewFirst("");
                    setNewLast("");
                    setNameError("");
                    return;
                  }
                  commit(setResourcePerson(demo, row.taskId, row.resourceId, value || undefined));
                }}
                onAdd={() => onAdd(row)}
                onRemove={row.type === "l0" ? undefined : () => onRemove(row)}
                onRowDragStart={(e) => startRowDrag(e, row)}
                onHour={(week, hours) => {
                  if (row.type !== "l2") return;
                  commit(setHour(demo, row.taskId, row.resourceId, week, hours));
                }}
                onTaskStatus={(status) => {
                  if (row.type === "l0" || !row.taskId) return;
                  commit(setTaskStatus(demo, row.taskId, status));
                }}
                onActualHours={(hours) => {
                  if (row.type !== "l2") return;
                  commit(setResourceActualHours(demo, row.taskId, row.resourceId, hours));
                }}
                onActualCost={(cost) => {
                  if (row.type !== "l2") return;
                  commit(setResourceActualCost(demo, row.taskId, row.resourceId, cost));
                }}
                onBarDown={(e) => {
                  if (!meta) return;
                  onBarDown(e, meta.kind, meta.meta);
                }}
                onRunResize={(e, runStart, runEnd, edge) => {
                  if (row.type === "l2") {
                    startRunResize(e, row.taskId, row.resourceId, runStart, runEnd, edge);
                    return;
                  }
                  const scope =
                    row.type === "l0"
                      ? { kind: "all" as const }
                      : row.type === "l1" && row.taskId
                        ? { kind: "task" as const, taskId: row.taskId }
                        : row.type === "l1" && row.groupKey
                          ? { kind: "group" as const, groupKey: row.groupKey }
                          : null;
                  if (!scope) return;
                  startSummaryResize(e, scope, runStart, runEnd, edge);
                }}
              />
            );
          })}
    </>
  );

  return (
    <WeekPxContext.Provider value={weekPx}>
    <div ref={uiRootRef} data-effort-ui>
      {maybePortal(
        hideToolbar ? null : (
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {lockedPlace ? null : (
        <div className="mrt-gantt-tools rounded-md border border-[var(--border)]">
          {(
            [
              ["defaults", "Defaults"],
              ["milestone", "Milestone instance"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`mrt-gantt-tool ${place === id ? "on" : ""}`}
              title={
                id === "defaults"
                  ? "Generic task × role map (no milestone row)"
                  : "Occurrence-style chart with due date, names, and today"
              }
              onClick={() => setPlace(id)}
            >
              {label}
            </button>
          ))}
        </div>
        )}
        <div className="mrt-gantt-tools rounded-md border border-[var(--border)]">
          {(
            [
              ["task-res", "Task > Role"],
              ["res-task", "Role > Task"],
              ["flat", "Flat"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`mrt-gantt-tool ${mode === id ? "on" : ""}`}
              aria-busy={toolBusy === id}
              disabled={!!toolBusy}
              onClick={() => {
                runTool(id, () => {
                  setMode(id);
                  setCollapsed({});
                  setAllCollapsed(false);
                });
              }}
            >
              <BusySpin on={toolBusy === id} />
              {label}
            </button>
          ))}
        </div>
        {place === "milestone" ? (
          <div className="mrt-gantt-tools rounded-md border border-[var(--border)]">
            {(
              [
                ["unstick", "Unstick"],
                ["tail-start", "Tail start"],
                ["tail-end", "Tail end"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`mrt-gantt-tool ${demo.stick === id ? "on" : ""}`}
                aria-busy={toolBusy === id}
                disabled={!!toolBusy}
                title={
                  id === "unstick"
                    ? "Milestone and tail move independently of Task/Res hours"
                    : id === "tail-start"
                      ? "Keep the gap from earliest work to tail start"
                      : "Keep the gap from latest work to due"
                }
                onClick={() => {
                  runTool(id, () => {
                    onStick?.(id as EffortStick);
                    commit(setStick(demo, id as EffortStick));
                  });
                }}
              >
                <BusySpin on={toolBusy === id} />
                {label}
              </button>
            ))}
          </div>
        ) : null}
        <div className="mrt-gantt-tools rounded-md border border-[var(--border)]">
          <div className="relative inline-flex items-center" data-mrt-cols-pop>
            <button
              type="button"
              data-mrt-cols-btn
              className={`mrt-gantt-tool${colsOpen ? " on" : ""}`}
              title="Choose Start, Finish, Duration, Hours, and Total Cost columns"
              onClick={() => setColsOpen((v) => !v)}
            >
              Columns
            </button>
            {colsOpen ? (
              <div className="mrt-cols-pop">
                {(
                  [
                    ["start", "Start"],
                    ["finish", "Finish"],
                    ["duration", "Duration"],
                    ["hours", "Hours"],
                    ["totalCost", "Total Cost"],
                  ] as const
                ).map(([id, label]) => (
                  <label key={id} className="flex items-center gap-2 text-[11px]">
                    <input
                      type="checkbox"
                      checked={metaCols[id]}
                      onChange={() =>
                        setMetaCols((cur) => ({ ...cur, [id]: !cur[id] }))
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <EffortQuickTools
          mode={mode}
          onCentre={() => centreChart()}
          onCollapse={() => {
            if (mode === "flat") return;
            toggleEffortUiClass(uiRootRef.current, "is-all-collapsed");
          }}
          onAvailability={() => {
            toggleEffortUiClass(uiRootRef.current, "is-avail");
          }}
        />
        <WeekZoomChip
          weekPx={weekPx}
          onWeekPx={(next) => {
            const box = clipEl();
            const prev = weekPxRef.current;
            if (box && n > 0) {
              const view = camView(box);
              const frac =
                (readEffortCamX(box) + view / 2) / Math.max(1, n * prev);
              weekPxRef.current = next;
              writeEffortWeekPx(uiRootRef.current, next);
              applyCamera(box, frac * n * next - view / 2);
            } else {
              weekPxRef.current = next;
              writeEffortWeekPx(uiRootRef.current, next);
            }
            onWeekPx?.(next);
          }}
        />
        {place === "milestone" ? (
          <div className="mrt-gantt-tools rounded-md border border-[var(--border)]">
            <label
              className="mrt-gantt-tool inline-flex cursor-pointer items-center gap-1.5"
              title="Show status, actuals, forecast at completion, and variation"
            >
              <input
                type="checkbox"
                checked={pmOn}
                onChange={() =>
                  persist((s) => {
                    s.projectManagement = !s.projectManagement;
                  })
                }
              />
              Enable Project Management
            </label>
          </div>
        ) : null}
        {toolbarNote === null || toolbarNote === "" ? null : (
        <span className="text-xs text-[var(--muted)]">
          {toolbarNote ?? `${n} weeks`}
        </span>
        )}
      </div>
        ),
        freeze?.chromeTop,
        !!freeze,
      )}

      {freezeReady ? (
        <>
          {createPortal(
            <div
              className="effort-freeze-stack grid"
              style={{ gridTemplateColumns: `${FN_W}px ${labelW}px`, width: FN_W + labelW }}
            >
              {tableBands("frozen")}
            </div>,
            freeze!.frozenHost!,
          )}
          {createPortal(
            <div
              ref={chartRootRef}
              className="effort-chart-stack"
              data-effort-chart
              onPointerDown={startPan}
              style={{ width: weeksWidth(n) }}
            >
              {tableBands("chart")}
            </div>,
            freeze!.chartHost!,
          )}
          {place === "milestone" && !hideSummary ? (
            <EffortLoadSummary
              store={store}
              demo={demo}
              weeks={weeks}
              weekLoad={weekLoad}
              roleDemos={[demo]}
              focusPerson={focusPerson}
              onFocus={setFocusPerson}
              metaCols={metaCols}
              onMetaCols={setMetaCols}
              nameW={nameW}
              labelW={labelW}
              n={n}
              pmOn={pmOn}
              redHover={redHover}
            />
          ) : null}
        </>
      ) : freeze ? null : (
      <div
        ref={(el) => {
          localScroller.current = el;
          chartRootRef.current = el;
        }}
        className={`effort-gantt bg-[var(--surface)]${
          stackedCompact
            ? " w-full max-w-full overflow-x-hidden overflow-y-hidden is-embed"
            : " overflow-x-hidden overflow-y-auto rounded-[10px] border border-[var(--border)] pb-6"
        }`}
        data-effort-chart
        onPointerDown={startPan}
      >
        <div
          className="effort-gantt-grid grid"
          data-effort-cam
          style={{
            gridTemplateColumns: `${FN_W}px ${labelW}px ${weeksWidth(n)}`,
          }}
        >
          {tableBands("both")}
        </div>
        {place === "milestone" && !hideSummary ? (
          <EffortLoadSummary
            store={store}
            demo={demo}
            weeks={weeks}
            weekLoad={weekLoad}
            roleDemos={[demo]}
            focusPerson={focusPerson}
            onFocus={setFocusPerson}
            metaCols={metaCols}
            onMetaCols={setMetaCols}
            nameW={nameW}
            labelW={labelW}
            n={n}
            pmOn={pmOn}
            redHover={redHover}
          />
        ) : null}
      </div>
      )}

      {maybePortal(
        hideToolbar ? null : (
      <div className="effort-gantt-legend">
        <span><b>Pan</b></span>
        <span><b>⋮⋮</b> move</span>
        <span><b className="text-[var(--rag-green)]">+</b> / <b className="text-[var(--rag-red)]">×</b> row</span>
        <span><b>Centre</b></span>
        {place === "milestone" ? (
          <>
            <span><b>◆</b> due</span>
            <span><b>edges</b> hours</span>
            <span><b>Stick</b></span>
            <span><b className="text-[var(--rag-red)]">|</b> today</span>
            <span><b>*</b> off-role</span>
          </>
        ) : (
          <>
            <span><b>edges</b> hours</span>
            <span>roles only</span>
          </>
        )}
      </div>
        ),
        freeze?.chromeBottom,
        !!freeze,
      )}
      {namePick ? (
        <NamePickerModal
          store={store}
          role={namePick.role}
          currentId={namePick.currentId}
          step={namePick.step}
          first={newFirst}
          last={newLast}
          error={nameError}
          onPick={(id) => applyPerson(namePick.taskId, namePick.resourceId, id)}
          onNew={applyBrandNewName}
          onStep={(step) => {
            setNamePick({ ...namePick, step });
            setNameError("");
          }}
          onFirst={setNewFirst}
          onLast={setNewLast}
          onClose={() => {
            setNamePick(null);
            setNameError("");
          }}
        />
      ) : null}
    </div>
    </WeekPxContext.Provider>
  );
}

function personLabel(store: ScheduleStore, personId?: string) {
  if (!personId) return "";
  return store.people.find((p) => p.id === personId)?.name || personId;
}

export function EffortLoadSummary({
  store,
  demo,
  weeks,
  weekLoad,
  roleDemos,
  focusPerson,
  onFocus,
  metaCols,
  onMetaCols,
  nameW,
  labelW,
  n,
  pmOn = false,
  redHover = false,
  scrollLeft,
  onScrollLeft,
}: {
  store: ScheduleStore;
  demo: EffortDemo;
  weeks: { label: string }[];
  weekLoad: Map<string, number[]>;
  roleDemos?: EffortDemo[];
  focusPerson: string | null;
  onFocus: (id: string | null) => void;
  metaCols: MetaCols;
  onMetaCols?: (next: MetaCols) => void;
  nameW: number;
  labelW: number;
  n: number;
  pmOn?: boolean;
  redHover?: boolean;
  scrollLeft?: number;
  onScrollLeft?: (left: number) => void;
}) {
  const headH = "var(--effort-head)";
  const sumHeadH = "var(--effort-sum-head)";
  const [everywhere, setEverywhere] = useState(false);
  const [availOver, setAvailOver] = useState(false);
  const freeze = useEffortFreeze();
  const embedScroller = useEffortScrollRoot();
  const freezeReady = !!(freeze?.frozenHost && freeze?.chartHost);
  const demos = roleDemos?.length ? roleDemos : [demo];
  const thisLoad = useMemo(() => {
    if (demos.length === 1) return personWeekLoad(demos[0]);
    return mergePersonWeekLoads(
      demos.map((d) => personWeekLoad(d)),
      n,
    );
    // weekLoad signals live drag commits from the parent chart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, roleDemos, n, weekLoad]);
  const allLoad = useMemo(
    () => (everywhere ? personWeekLoadEverywhere(store, demo) : thisLoad),
    [everywhere, store, demo, thisLoad],
  );
  const contribCounts = useMemo(
    () => personWeekContributorCounts(demos, n),
    [roleDemos, demo, n],
  );
  const everywhereCounts = useMemo(
    () => (everywhere ? personWeekContributorCountEverywhere(store, demo) : contribCounts),
    [everywhere, store, demo, contribCounts],
  );
  const liveStart = calendarWindow(demo).start;
  const sumScrollRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (embedScroller) return;
    if (scrollLeft == null || !sumScrollRef.current) return;
    const clip = sumScrollRef.current.closest(".effort-gantt") as HTMLElement | null;
    if (!clip) return;
    writeEffortCamX(clip, scrollLeft, n * readEffortWeekPx(clip), clip.clientWidth);
  }, [scrollLeft, embedScroller, n]);

  const rows = [...new Set([...thisLoad.keys(), ...allLoad.keys()])]
    .map((id) => {
      const p = store.people.find((x) => x.id === id);
      const hours = (everywhere ? allLoad.get(id) : thisLoad.get(id)) || [];
      const thisHours = thisLoad.get(id) || [];
      const totalHours = hours.reduce((s, h) => s + (Number(h) || 0), 0);
      const rate = p?.externalRate || 0;
      let actualHours = 0;
      let actualCost = 0;
      const roleMap = new Map<string, boolean>();
      for (const d of demos) {
        const a = personActuals(d, id);
        actualHours += a.hours;
        actualCost += a.cost;
        for (const r of personAssignedRoles(d, id, store.roleEligibility)) {
          if (!roleMap.has(r.role)) roleMap.set(r.role, r.star);
          else if (r.star) roleMap.set(r.role, true);
        }
      }
      const remaining = remainingHoursFromToday(demo, hours);
      const facHours = round2(actualHours + remaining);
      const vacHours = round2(facHours - totalHours);
      const facCost = round2(actualCost + remaining * rate);
      const vacCost = round2(facCost - (rate && totalHours ? totalHours * rate : 0));
      const span = hoursSpanIndexes(hours);
      const roles = [...roleMap.entries()]
        .sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: "base" }))
        .map(([role, star]) => `${role}${star ? "*" : ""}`);
      return {
        id,
        name: p?.name || id,
        roles,
        roleLabel: roles.join(", ") || p?.role || "",
        cap: p?.weeklyCapacityHours || 0,
        hours,
        thisHours,
        totalHours,
        cost: rate && totalHours ? totalHours * rate : 0,
        actualHours,
        actualCost,
        facHours,
        vacHours,
        facCost,
        vacCost,
        startLabel: span.start != null ? weeks[span.start]?.label ?? "—" : "—",
        finishLabel: span.finish != null ? weeks[span.finish]?.label ?? "—" : "—",
      };
    })
    .filter((r) => r.hours.some((h) => h > 0) || r.thisHours.some((h) => h > 0))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  const weekTotals = Array.from({ length: n }, (_, i) =>
    rows.reduce((s, r) => s + (Number(r.hours[i]) || 0), 0),
  );
  const hoursSum = rows.reduce((s, r) => s + r.totalHours, 0);
  const costSum = rows.reduce((s, r) => s + r.cost, 0);
  const actualHoursSum = rows.reduce((s, r) => s + r.actualHours, 0);
  const actualCostSum = rows.reduce((s, r) => s + r.actualCost, 0);
  const facHoursSum = rows.reduce((s, r) => s + r.facHours, 0);
  const vacHoursSum = rows.reduce((s, r) => s + r.vacHours, 0);
  const facCostSum = rows.reduce((s, r) => s + r.facCost, 0);
  const vacCostSum = rows.reduce((s, r) => s + r.vacCost, 0);

  function weekCell(
    h: number,
    cap: number,
    thisH: number,
    personId: string,
    weekIdx: number,
    key: string | number,
  ) {
    const rag = ragStatus(h, cap, store.overrunPercent);
    const shown = availOver ? cap - h : h;
    const tint = everywhere && thisH > 0 && rag !== "yellow" && rag !== "red";
    const over = rag === "yellow" || rag === "red";
    const contrib =
      (everywhere ? everywhereCounts : contribCounts).get(personId)?.[weekIdx] || 0;
    const multi = over && contrib >= 2;
    return (
      <div
        key={key}
        className={`mrt-sum-week relative flex shrink-0 items-center justify-center text-[10px] tabular-nums${
          over ? ` ${rag}` : ""
        }${multi ? " is-multi" : ""}${tint ? " is-this-ms" : ""}`}
        title={
          everywhere
            ? `This milestone ${formatHours(thisH, true)} h · All ${formatHours(h, true)} h${
                multi ? ` · ${contrib} obligations` : ""
              }`
            : multi
              ? `${formatHours(h, true)} h · ${contrib} overlapping sources`
              : undefined
        }
      >
        {shown ? formatHours(shown) : ""}
        {redHover && rag === "red" ? (
          <PersonOverHover
            store={store}
            personId={personId}
            liveStart={liveStart}
            weekIdx={weekIdx}
          />
        ) : null}
      </div>
    );
  }

  const sumBands = (pane: EffortPane) => (
    <>
      {pane !== "chart" ? (
      <>
      <div
        className="effort-gantt-fn effort-gantt-head"
        style={{ height: sumHeadH, position: "sticky", left: 0, zIndex: 30 }}
      />
      <div
        className="effort-gantt-head effort-gantt-labels is-summary mrt-sum-chrome"
        style={{ height: sumHeadH, position: "sticky", left: FN_W, zIndex: 20 }}
      >
        <span className="mrt-sum-chrome-title">Resource summary</span>
        <div className="mrt-sum-chrome-toggles">
        <div className="mrt-seg" title="Hours on this stacked set vs all incomplete occurrences">
          <button
            type="button"
            className={`mrt-seg-btn${!everywhere ? " on" : ""}`}
            onClick={() => setEverywhere(false)}
          >
            This milestone
          </button>
          <button
            type="button"
            className={`mrt-seg-btn${everywhere ? " on" : ""}`}
            onClick={() => setEverywhere(true)}
          >
            Everywhere
          </button>
        </div>
        <div className="mrt-seg" title="Planned hours vs remaining capacity (negative when over)">
          <button
            type="button"
            className={`mrt-seg-btn${!availOver ? " on" : ""}`}
            onClick={() => setAvailOver(false)}
          >
            Total
          </button>
          <button
            type="button"
            className={`mrt-seg-btn${availOver ? " on" : ""}`}
            onClick={() => setAvailOver(true)}
          >
            Available/over
          </button>
        </div>
        </div>
      </div>
      </>
      ) : null}
      {pane !== "frozen" ? (
      <div
        className="effort-gantt-head relative flex items-end border-b border-[var(--border)] text-[10px]"
        style={{ height: sumHeadH }}
      >
        {weeks.map((w, i) => (
          <WeekHeadCell key={i} label={w.label} />
        ))}
      </div>
      ) : null}

      {pane !== "chart" ? (
      <>
      <div
        className="effort-gantt-fn"
        style={{ height: headH, position: "sticky", left: 0, zIndex: 30 }}
      />
      <div
        className="effort-gantt-head effort-gantt-labels is-summary flex border-b border-[var(--border)] text-[10px]"
        style={{ height: headH, position: "sticky", left: FN_W, zIndex: 20 }}
      >
        <span className="flex shrink-0 items-center" style={{ width: nameW }}>
          <span className="flex items-center px-1" style={{ width: "55%" }}>
            Name
          </span>
          <span className="min-w-0 flex-1 items-center px-1">Role</span>
        </span>
        {metaCols.start ? (
          <MetaColHead
            colKey="start"
            label="Start"
            width={META_W}
            onHide={onMetaCols ? () => onMetaCols({ ...metaCols, start: false }) : undefined}
          />
        ) : null}
        {metaCols.finish ? (
          <MetaColHead
            colKey="finish"
            label="Finish"
            width={META_W}
            onHide={onMetaCols ? () => onMetaCols({ ...metaCols, finish: false }) : undefined}
          />
        ) : null}
        {metaCols.duration ? (
          <MetaColHead
            colKey="dur"
            label="Over"
            width={META_W}
            onHide={onMetaCols ? () => onMetaCols({ ...metaCols, duration: false }) : undefined}
          />
        ) : null}
        {hoursColOn(metaCols, pmOn) ? (
          <MetaColHead
            colKey="hours"
            label="Total hours"
            hoursClass
            width={HOURS_W}
            onHide={onMetaCols ? () => onMetaCols({ ...metaCols, hours: false }) : undefined}
          />
        ) : null}
        {pmOn ? (
          <span className="effort-gantt-meta effort-gantt-hours" style={{ width: ACTUAL_HOURS_W }}>
            Actual hours
          </span>
        ) : null}
        {pmOn ? (
          <span className="effort-gantt-meta effort-gantt-hours" style={{ width: FAC_HOURS_W }}>
            FAC h
          </span>
        ) : null}
        {pmOn ? (
          <span className="effort-gantt-meta effort-gantt-hours" style={{ width: VAC_HOURS_W }}>
            VAC h
          </span>
        ) : null}
        {costColOn(metaCols, pmOn) ? (
          <MetaColHead
            colKey="cost"
            label="Total Cost"
            hoursClass
            width={COST_W}
            onHide={onMetaCols ? () => onMetaCols({ ...metaCols, totalCost: false }) : undefined}
          />
        ) : null}
        {pmOn ? (
          <span className="effort-gantt-meta effort-gantt-hours" style={{ width: ACTUAL_COST_W }}>
            Actual $
          </span>
        ) : null}
        {pmOn ? (
          <span className="effort-gantt-meta effort-gantt-hours" style={{ width: FAC_COST_W }}>
            FAC $
          </span>
        ) : null}
        {pmOn ? (
          <span className="effort-gantt-meta effort-gantt-hours" style={{ width: VAC_COST_W }}>
            VAC $
          </span>
        ) : null}
      </div>
      </>
      ) : null}
      {pane !== "frozen" ? (
      <div className="effort-gantt-head border-b border-[var(--border)]" style={{ height: headH }} />
      ) : null}

      {rows.length === 0 ? (
        <>
          {pane !== "chart" ? (
          <>
          <div
            className="effort-gantt-fn"
            style={{ height: L2_H, position: "sticky", left: 0, zIndex: 30 }}
          />
          <div
            className="effort-gantt-labels flex items-center px-2 text-[10px] text-[var(--muted)]"
            style={{ height: L2_H, position: "sticky", left: FN_W, zIndex: 20 }}
          >
            No named people on this Gantt
          </div>
          </>
          ) : null}
          {pane !== "frozen" ? (
          <div style={{ height: L2_H }} />
          ) : null}
        </>
      ) : (
        rows.map((r) => {
          const over = r.hours.filter((h) => {
            const rag = ragStatus(h, r.cap, store.overrunPercent);
            return rag === "yellow" || rag === "red";
          }).length;
          return (
            <Fragment key={r.id}>
              {pane !== "chart" ? (
              <>
              <div
                className="effort-gantt-fn"
                style={{ height: L2_H, position: "sticky", left: 0, zIndex: 30 }}
              />
              <div
                className="effort-gantt-labels flex items-center border-b border-[var(--border)]/70 text-[10px]"
                style={{ height: L2_H, position: "sticky", left: FN_W, zIndex: 20 }}
              >
                <span className="flex shrink-0 items-center" style={{ width: nameW }}>
                <button
                  type="button"
                  className={`mrt-gantt-tool min-w-0 truncate px-1 text-left${
                    focusPerson === r.id ? " on" : ""
                  }`}
                  style={{ width: "55%" }}
                  onClick={() => onFocus(focusPerson === r.id ? null : r.id)}
                >
                  {r.name}
                </button>
                <span
                  className="min-w-0 flex-1 truncate px-1 text-[var(--muted)]"
                  title={r.roleLabel}
                >
                  {r.roleLabel || "—"}
                </span>
                </span>
                {metaCols.start ? (
                  <span className="effort-gantt-meta tabular-nums" style={{ width: META_W }}>
                    {r.startLabel}
                  </span>
                ) : null}
                {metaCols.finish ? (
                  <span className="effort-gantt-meta tabular-nums" style={{ width: META_W }}>
                    {r.finishLabel}
                  </span>
                ) : null}
                {metaCols.duration ? (
                  <span className="effort-gantt-meta tabular-nums" style={{ width: META_W }}>
                    {over || "—"}
                  </span>
                ) : null}
                {hoursColOn(metaCols, pmOn) ? (
                  <span className="effort-gantt-meta effort-gantt-hours tabular-nums" style={{ width: HOURS_W }}>
                    {r.totalHours ? formatHours(r.totalHours) : "—"}
                  </span>
                ) : null}
                {pmOn ? (
                  <ActualValue width={ACTUAL_HOURS_W} label="Actual hours" value={r.actualHours} />
                ) : null}
                {pmOn ? (
                  <span className="effort-gantt-meta effort-gantt-hours tabular-nums" style={{ width: FAC_HOURS_W }}>
                    {r.facHours ? formatHours(r.facHours) : "—"}
                  </span>
                ) : null}
                {pmOn ? (
                  <VacValue width={VAC_HOURS_W} label="VAC h" value={r.vacHours} />
                ) : null}
                {costColOn(metaCols, pmOn) ? (
                  <span className="effort-gantt-meta effort-gantt-hours tabular-nums" style={{ width: COST_W }}>
                    {formatMoney(r.cost || null)}
                  </span>
                ) : null}
                {pmOn ? (
                  <ActualValue width={ACTUAL_COST_W} label="Actual $" value={r.actualCost} money />
                ) : null}
                {pmOn ? (
                  <span className="effort-gantt-meta effort-gantt-hours tabular-nums" style={{ width: FAC_COST_W }}>
                    {formatMoney(r.facCost || null)}
                  </span>
                ) : null}
                {pmOn ? (
                  <VacValue width={VAC_COST_W} label="VAC $" value={r.vacCost} money />
                ) : null}
              </div>
              </>
              ) : null}
              {pane !== "frozen" ? (
              <div className="relative flex border-b border-[var(--border)]/60" style={{ height: L2_H }}>
                {r.hours.map((h, i) =>
                  weekCell(h, r.cap, r.thisHours[i] || 0, r.id, i, i),
                )}
              </div>
              ) : null}
            </Fragment>
          );
        })
      )}

      {rows.length > 0 ? (
        <>
          {pane !== "chart" ? (
          <>
          <div
            className="effort-gantt-fn"
            style={{ height: L2_H, position: "sticky", left: 0, zIndex: 30 }}
          />
          <div
            className="effort-gantt-labels is-summary flex items-center border-t border-[var(--border)] text-[10px] font-semibold"
            style={{ height: L2_H, position: "sticky", left: FN_W, zIndex: 20 }}
          >
            <span className="flex shrink-0 items-center" style={{ width: nameW }}>
              <span className="px-1" style={{ width: "55%" }}>
                Total
              </span>
              <span className="min-w-0 flex-1" />
            </span>
            {metaCols.start ? <span className="effort-gantt-meta" style={{ width: META_W }} /> : null}
            {metaCols.finish ? <span className="effort-gantt-meta" style={{ width: META_W }} /> : null}
            {metaCols.duration ? <span className="effort-gantt-meta" style={{ width: META_W }} /> : null}
            {hoursColOn(metaCols, pmOn) ? (
              <span className="effort-gantt-meta effort-gantt-hours tabular-nums" style={{ width: HOURS_W }}>
                {hoursSum ? formatHours(hoursSum) : "—"}
              </span>
            ) : null}
            {pmOn ? (
              <ActualValue width={ACTUAL_HOURS_W} label="Actual hours" value={actualHoursSum} />
            ) : null}
            {pmOn ? (
              <span className="effort-gantt-meta effort-gantt-hours tabular-nums" style={{ width: FAC_HOURS_W }}>
                {facHoursSum ? formatHours(facHoursSum) : "—"}
              </span>
            ) : null}
            {pmOn ? (
              <VacValue width={VAC_HOURS_W} label="VAC h" value={vacHoursSum} />
            ) : null}
            {costColOn(metaCols, pmOn) ? (
              <span className="effort-gantt-meta effort-gantt-hours tabular-nums" style={{ width: COST_W }}>
                {formatMoney(costSum || null)}
              </span>
            ) : null}
            {pmOn ? (
              <ActualValue width={ACTUAL_COST_W} label="Actual $" value={actualCostSum} money />
            ) : null}
            {pmOn ? (
              <span className="effort-gantt-meta effort-gantt-hours tabular-nums" style={{ width: FAC_COST_W }}>
                {formatMoney(facCostSum || null)}
              </span>
            ) : null}
            {pmOn ? (
              <VacValue width={VAC_COST_W} label="VAC $" value={vacCostSum} money />
            ) : null}
          </div>
          </>
          ) : null}
          {pane !== "frozen" ? (
          <div
            className="relative flex border-t border-[var(--border)] font-semibold"
            style={{ height: L2_H }}
          >
            {weekTotals.map((h, i) => (
              <div
                key={i}
                className="mrt-sum-week flex shrink-0 items-center justify-center text-[10px] tabular-nums"
              >
                {h ? formatHours(availOver ? 0 : h) : ""}
              </div>
            ))}
          </div>
          ) : null}
        </>
      ) : null}
    </>
  );

  if (freeze && !freezeReady) return null;

  if (freezeReady) {
    return (
      <>
        {createPortal(
          <div
            className="effort-freeze-stack grid border-t border-[var(--border)]"
            style={{ gridTemplateColumns: `${FN_W}px ${labelW}px`, width: FN_W + labelW }}
          >
            {sumBands("frozen")}
          </div>,
          freeze!.frozenHost!,
        )}
        {createPortal(
          <div className="effort-chart-stack border-t border-[var(--border)]" style={{ width: weeksWidth(n) }}>
            {sumBands("chart")}
          </div>,
          freeze!.chartHost!,
        )}
      </>
    );
  }

  return (
    <div
      ref={sumScrollRef}
      className="overflow-x-hidden overflow-y-visible"
    >
    <div
      className="effort-gantt-grid grid border-t border-[var(--border)]"
      data-effort-cam
      style={{ gridTemplateColumns: `${FN_W}px ${labelW}px ${weeksWidth(n)}` }}
    >
      {sumBands("both")}
    </div>
    </div>
  );
}

function peopleForRole(store: ScheduleStore, role: string, currentId?: string) {
  const eligible = store.people.filter((p) => store.roleEligibility[role]?.[p.id]);
  const extra = currentId ? store.people.find((p) => p.id === currentId) : undefined;
  if (extra && !eligible.some((p) => p.id === extra.id)) return [extra, ...eligible];
  return eligible;
}

function remainingPeople(store: ScheduleStore, role: string, currentId?: string) {
  const shown = new Set(peopleForRole(store, role, currentId).map((p) => p.id));
  return store.people.filter((p) => !shown.has(p.id));
}

function NamePickerModal({
  store,
  role,
  currentId,
  step,
  first,
  last,
  error,
  onPick,
  onNew,
  onStep,
  onFirst,
  onLast,
  onClose,
}: {
  store: ScheduleStore;
  role: string;
  currentId?: string;
  step: "other" | "new";
  first: string;
  last: string;
  error: string;
  onPick: (id: string) => void;
  onNew: () => void;
  onStep: (step: "other" | "new") => void;
  onFirst: (value: string) => void;
  onLast: (value: string) => void;
  onClose: () => void;
}) {
  const remaining = remainingPeople(store, role, currentId);
  return (
    <div className="effort-gantt-modal-backdrop" onClick={onClose}>
      <div className="sg-card effort-gantt-modal" onClick={(e) => e.stopPropagation()}>
        {step === "other" ? (
          <>
            <h3 className="font-medium">Add other name</h3>
            {remaining.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--muted)]">No other names on the roster.</p>
            ) : (
              <ul className="mt-2 max-h-48 overflow-auto text-sm">
                {remaining.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="mrt-btn-secondary mb-1 w-full justify-start"
                      onClick={() => onPick(p.id)}
                    >
                      {p.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className="mrt-btn-secondary mt-3"
              onClick={() => onStep("new")}
            >
              Add a brand new name…
            </button>
            <button type="button" className="mrt-btn-secondary mt-2 ml-2" onClick={onClose}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <h3 className="font-medium">New name</h3>
            <label className="mt-3 block text-sm">
              First name
              <input
                className="mrt-input mt-1 w-full"
                value={first}
                autoFocus
                onChange={(e) => onFirst(e.target.value)}
              />
            </label>
            <label className="mt-2 block text-sm">
              Last name
              <input
                className="mrt-input mt-1 w-full"
                value={last}
                onChange={(e) => onLast(e.target.value)}
              />
            </label>
            {error ? <p className="mt-2 text-sm text-[var(--rag-red)]">{error}</p> : null}
            <div className="mt-3">
              <button type="button" className="mrt-btn-secondary" onClick={onNew}>
                Add
              </button>
              <button type="button" className="mrt-btn-secondary ml-2" onClick={() => onStep("other")}>
                Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DropMark({ slot, rowKey }: { slot: DropSlot | null; rowKey: string }) {
  if (!slot || slot.key !== rowKey) return null;
  return (
    <div
      className="effort-gantt-drop-line"
      style={{ top: slot.edge === "before" ? 0 : undefined, bottom: slot.edge === "after" ? 0 : undefined }}
    />
  );
}

function RowTriple({
  row,
  weeks,
  mode,
  place,
  nameW,
  metaCols,
  demo,
  baselineHours,
  n,
  stick,
  dueCol,
  tailStartCol,
  todayCol,
  dropSlot,
  weekLoad,
  hourPaintN,
  hourPaintHours,
  hourPaintLoad,
  overrunPercent,
  highlight,
  store,
  canResetEffort,
  onResetEffort,
  collapsed,
  onToggleCollapse,
  onRenameTask,
  onRenameRole,
  onSelectRole,
  onSelectPerson,
  onAdd,
  onRemove,
  onRowDragStart,
  onHour,
  onTaskStatus,
  onActualHours,
  onActualCost,
  onBarDown,
  onRunResize,
  pane = "both",
}: {
  row: EffortLayoutRow;
  weeks: { label: string }[];
  mode: EffortGroupMode;
  place: ChartPlace;
  nameW: number;
  metaCols: MetaCols;
  demo: EffortDemo;
  baselineHours?: number[];
  n: number;
  hourPaintN?: number;
  hourPaintHours?: number[];
  hourPaintLoad?: Map<string, number[]>;
  stick: EffortStick;
  dueCol: number;
  tailStartCol: number;
  todayCol: number | null;
  dropSlot: DropSlot | null;
  weekLoad?: Map<string, number[]>;
  overrunPercent?: number;
  highlight?: boolean;
  store: ScheduleStore;
  canResetEffort?: boolean;
  onResetEffort?: () => void;
  collapsed: boolean;
  onToggleCollapse?: () => void;
  onRenameTask: (name: string) => void;
  onRenameRole: (name: string) => void;
  onSelectRole: (value: string) => void;
  onSelectPerson: (value: string) => void;
  onAdd: () => void;
  onRemove?: () => void;
  onRowDragStart: (e: ReactPointerEvent) => void;
  onHour: (week: number, hours: number) => void;
  onTaskStatus: (status: TaskStatus) => void;
  onActualHours: (hours: number) => void;
  onActualCost: (cost: number) => void;
  onBarDown: (e: ReactPointerEvent) => void;
  onRunResize: (
    e: ReactPointerEvent,
    runStart: number,
    runEnd: number,
    edge: "start" | "end",
  ) => void;
  pane?: EffortPane;
}) {
  const h = rowHeight(row.type);
  const canDrag = row.type === "l1" || (row.type === "l2" && (!row.synthetic || mode === "res-task"));
  const frozen = pane !== "chart";
  const chart = pane !== "frozen";
  const stickCols = pane === "both";
  return (
    <>
      {frozen ? (
      <div
        className="effort-gantt-fn relative"
        data-effort-row={row.key}
        {...(row.type === "l2" ? { "data-effort-l2": "" } : {})}
        style={{ height: h, position: stickCols ? "sticky" : undefined, left: stickCols ? 0 : undefined, zIndex: stickCols ? 30 : undefined }}
      >
        <DropMark slot={dropSlot} rowKey={row.key} />
        {canDrag ? (
          <button
            type="button"
            className="mrt-gantt-recalc"
            title="Drag to reorder"
            onPointerDown={onRowDragStart}
          >
            ⋮⋮
          </button>
        ) : null}
        <button type="button" className="effort-gantt-btn effort-gantt-btn-add" title="Add row after this one" onClick={onAdd}>
          +
        </button>
        {onRemove ? (
          <button type="button" className="effort-gantt-btn effort-gantt-btn-del" title="Remove row" onClick={onRemove}>
            ×
          </button>
        ) : null}
      </div>
      ) : null}
      {frozen ? (
      <div
        className={`relative min-w-0 effort-gantt-labels${row.type === "l2" ? "" : " is-summary"}`}
        data-effort-row={row.key}
        {...(row.type === "l2" ? { "data-effort-l2": "" } : {})}
        style={{ position: stickCols ? "sticky" : undefined, left: stickCols ? FN_W : undefined, zIndex: stickCols ? 20 : undefined }}
      >
        <DropMark slot={dropSlot} rowKey={row.key} />
        <RowLabel
          row={row}
          demo={demo}
          weeks={weeks}
          mode={mode}
          place={place}
          nameW={nameW}
          metaCols={metaCols}
          store={store}
          collapsed={collapsed}
          canResetEffort={canResetEffort}
          onResetEffort={onResetEffort}
          onToggleCollapse={onToggleCollapse}
          onRenameTask={onRenameTask}
          onRenameRole={onRenameRole}
          onSelectRole={onSelectRole}
          onSelectPerson={onSelectPerson}
          onTaskStatus={onTaskStatus}
          onActualHours={onActualHours}
          onActualCost={onActualCost}
        />
      </div>
      ) : null}
      {chart ? (
      <div
        className="relative"
        data-effort-row={row.key}
        data-effort-task={"taskId" in row ? row.taskId : undefined}
        data-effort-resource={row.type === "l2" ? row.resourceId : undefined}
        data-effort-group={"groupKey" in row ? row.groupKey : undefined}
        {...(row.type === "l2" ? { "data-effort-l2": "" } : {})}
        style={{ zIndex: 1 }}
      >
        <DropMark slot={dropSlot} rowKey={row.key} />
        <TimelineRow
          row={row}
          n={hourPaintN ?? n}
          stick={place === "milestone" ? stick : "unstick"}
          dueCol={dueCol}
          tailStartCol={tailStartCol}
          todayCol={todayCol}
          baselineHours={baselineHours}
          weekLoad={hourPaintLoad ?? weekLoad}
          hoursPaint={hourPaintHours}
          overrunPercent={overrunPercent}
          highlight={highlight}
          cap={
            row.type === "l2" && row.personId
              ? store.people.find((p) => p.id === row.personId)?.weeklyCapacityHours || 0
              : 0
          }
          showAvailability={metaCols.availability}
          redHover={place === "milestone"}
          store={store}
          liveStart={calendarWindow(demo).start}
          onHour={onHour}
          onBarDown={onBarDown}
          onRunResize={onRunResize}
        />
      </div>
      ) : null}
    </>
  );
}

function ResetIcon({
  disabled,
  title,
  onClick,
}: {
  disabled?: boolean;
  title: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className="mrt-reset-icon"
      disabled={disabled || !onClick}
      title={title}
      aria-label={title}
      onClick={(e) => {
        e.stopPropagation();
        if (disabled || !onClick) return;
        onClick();
      }}
    >
      ↺
    </button>
  );
}

function MilestoneLabel({
  demo,
  weeks,
  nameW,
  metaCols,
  pmOn = false,
  caption,
  canReset,
  onReset,
  onDue,
  onTail,
}: {
  demo: EffortDemo;
  weeks: { label: string }[];
  nameW: number;
  metaCols: MetaCols;
  pmOn?: boolean;
  caption?: string;
  canReset?: boolean;
  onReset?: () => void;
  onDue: (due: { y: number; m: number; d: number }) => void;
  onTail: (weeks: number) => void;
}) {
  const dueCol = dueColumnIndex(demo);
  const tail = Math.max(1, demo.milestone.tailWeeks);
  const startIdx = dueCol - tail + 1;
  return (
    <div
      className="flex items-center border-b border-[var(--border)] bg-[var(--surface-muted)] text-[13px] font-semibold"
      style={{ height: MS_H }}
    >
      <span className="flex min-w-0 items-center gap-1 px-1" style={{ width: nameW }}>
        <ResetIcon
          disabled={!canReset}
          title="Reset due date and tail to Defaults"
          onClick={onReset}
        />
        <span className="truncate" title={caption || demo.milestone.label}>
          {caption || demo.milestone.label}
        </span>
      </span>
      {metaCols.start ? (
        <span className="effort-gantt-meta" style={{ width: META_W }}>
          {weeks[startIdx]?.label ?? "—"}
        </span>
      ) : null}
      {metaCols.finish ? (
        <span className="effort-gantt-meta flex items-center justify-end" style={{ width: META_W }}>
          <input
            type="date"
            tabIndex={-1}
            className="effort-gantt-input effort-gantt-cell text-right"
            style={{ width: "100%", fontSize: 9 }}
            value={isoDue(demo.milestone.due)}
            onChange={(e) => {
              const [y, m, d] = e.target.value.split("-").map(Number);
              if (!y || !m || !d) return;
              onDue({ y, m, d });
            }}
          />
        </span>
      ) : null}
      {metaCols.duration ? (
        <span className="effort-gantt-meta flex items-center justify-end" style={{ width: META_W }}>
          <input
            type="number"
            min={1}
            tabIndex={-1}
            className="effort-gantt-input effort-gantt-cell text-right"
            style={{ width: 40 }}
            value={demo.milestone.tailWeeks}
            onChange={(e) => onTail(Number(e.target.value) || 1)}
          />
        </span>
      ) : null}
      {hoursColOn(metaCols, pmOn) ? (
        <span className="effort-gantt-meta effort-gantt-hours" style={{ width: HOURS_W }}>
          —
        </span>
      ) : null}
      {pmOn ? <ActualPlaceholder width={ACTUAL_HOURS_W} label="Actual hours" /> : null}
      {pmOn ? <ActualPlaceholder width={FAC_HOURS_W} label="FAC h" /> : null}
      {pmOn ? <ActualPlaceholder width={VAC_HOURS_W} label="VAC h" /> : null}
      {costColOn(metaCols, pmOn) ? (
        <span className="effort-gantt-meta effort-gantt-hours" style={{ width: COST_W }}>
          —
        </span>
      ) : null}
      {pmOn ? <ActualPlaceholder width={ACTUAL_COST_W} label="Actual $" /> : null}
      {pmOn ? <ActualPlaceholder width={FAC_COST_W} label="FAC $" /> : null}
      {pmOn ? <ActualPlaceholder width={VAC_COST_W} label="VAC $" /> : null}
    </div>
  );
}

function RoleSelect({
  store,
  value,
  onChange,
}: {
  store: ScheduleStore;
  value: string;
  onChange: (value: string) => void;
}) {
  const roles = store.resourceRoles.includes(value) || !value
    ? store.resourceRoles
    : [value, ...store.resourceRoles];
  return (
    <select
      className={`effort-gantt-select${!value ? " is-unassigned" : ""}`}
      style={{ width: FLAT_COL_W }}
      value={value}
      title="Resource role"
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{UNASSIGNED_LABEL}</option>
      {roles.map((role) => (
        <option key={role} value={role}>{role}</option>
      ))}
      <option value={CREATE_ROLE}>Create role…</option>
    </select>
  );
}

function PersonSelect({
  store,
  role,
  value,
  onChange,
}: {
  store: ScheduleStore;
  role: string;
  value?: string;
  onChange: (value: string) => void;
}) {
  const people = peopleForRole(store, role, value);
  const extra = value && !store.roleEligibility[role]?.[value];
  return (
    <select
      className={`effort-gantt-select${!value ? " is-unassigned" : ""}`}
      style={{ width: FLAT_COL_W }}
      value={value || ""}
      title="Resource name. * = outside role ticks"
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">—</option>
      {people.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}{p.id === value && extra ? " *" : ""}
        </option>
      ))}
      <option value={ADD_OTHER}>Add other name…</option>
    </select>
  );
}

function RowLabel({
  row,
  demo,
  weeks,
  mode,
  place,
  nameW,
  metaCols,
  store,
  collapsed,
  canResetEffort,
  onResetEffort,
  onToggleCollapse,
  onRenameTask,
  onRenameRole,
  onSelectRole,
  onSelectPerson,
  onTaskStatus,
  onActualHours,
  onActualCost,
}: {
  row: EffortLayoutRow;
  demo: EffortDemo;
  weeks: { label: string }[];
  mode: EffortGroupMode;
  place: ChartPlace;
  nameW: number;
  metaCols: MetaCols;
  store: ScheduleStore;
  collapsed?: boolean;
  canResetEffort?: boolean;
  onResetEffort?: () => void;
  onToggleCollapse?: () => void;
  onRenameTask: (name: string) => void;
  onRenameRole: (name: string) => void;
  onSelectRole: (value: string) => void;
  onSelectPerson: (value: string) => void;
  onTaskStatus: (status: TaskStatus) => void;
  onActualHours: (hours: number) => void;
  onActualCost: (cost: number) => void;
}) {
  const h = rowHeight(row.type);
  const indent = row.type === "l2" && mode !== "flat" ? 8 : 0;
  const personCol = place === "milestone";
  const roleValue =
    row.type === "l2" && row.resourceName && !row.resourceName.startsWith("--")
      ? row.resourceName
      : "";
  const pmOn = place === "milestone" && !!store.projectManagement;
  const taskId = row.type === "l0" ? undefined : row.taskId;
  const showStatus =
    pmOn &&
    !!taskId &&
    ((row.type === "l1" && !row.groupKey) || (row.type === "l2" && mode !== "task-res"));
  const statusSelect = showStatus ? (
    <select
      className="effort-gantt-select"
      style={{ width: 92, fontSize: 10 }}
      value={taskStatusOf(demo, taskId)}
      title="Task status"
      onChange={(e) => onTaskStatus(e.target.value as TaskStatus)}
    >
      {TASK_STATUSES.map((s) => (
        <option key={s.id} value={s.id}>
          {s.label}
        </option>
      ))}
    </select>
  ) : null;
  return (
    <div
      className="flex items-center border-b border-[var(--border)]/70"
      style={{
        height: h,
        paddingLeft: indent,
        background: row.type === "l2" ? "var(--surface)" : "var(--surface-muted)",
      }}
    >
      <div className="effort-gantt-namepane flex min-w-0 items-center gap-0.5 px-0.5" style={{ width: nameW - indent }}>
        {row.type === "l0" ? (
          <span className="flex min-w-0 items-center gap-1 px-1">
            <ResetIcon
              disabled={!canResetEffort}
              title="Reset tasks and hours to Defaults"
              onClick={onResetEffort}
            />
            <span className="truncate text-[13px] font-semibold">{row.label}</span>
          </span>
        ) : row.type === "l1" && mode === "res-task" ? (
          <>
            {onToggleCollapse ? (
              <button
                type="button"
                className="effort-gantt-collapse"
                title={collapsed ? "Expand group" : "Collapse group"}
                onClick={onToggleCollapse}
              >
                {collapsed ? "▸" : "▾"}
              </button>
            ) : null}
            <span className="effort-gantt-flat-col shrink-0" style={{ width: FLAT_COL_W }}>
              <RoleSelect
                store={store}
                value={row.resourceName && !row.resourceName.startsWith("--") ? row.resourceName : ""}
                onChange={onSelectRole}
              />
            </span>
            {personCol ? (
              <span className="effort-gantt-flat-col shrink-0" style={{ width: FLAT_COL_W }}>
                <PersonSelect
                  store={store}
                  role={row.resourceName && !row.resourceName.startsWith("--") ? row.resourceName : ""}
                  value={row.personId}
                  onChange={onSelectPerson}
                />
              </span>
            ) : null}
          </>
        ) : row.type === "l1" ? (
          <>
            {mode !== "flat" && onToggleCollapse ? (
              <button
                type="button"
                className="effort-gantt-collapse"
                title={collapsed ? "Expand group" : "Collapse group"}
                onClick={onToggleCollapse}
              >
                {collapsed ? "▸" : "▾"}
              </button>
            ) : null}
            <input
              tabIndex={-1}
              className={`effort-gantt-input${
                !row.label || row.label === UNASSIGNED_LABEL ? " is-unassigned" : ""
              }`}
              value={row.label}
              onChange={(e) =>
                row.taskId ? onRenameTask(e.target.value) : onRenameRole(e.target.value)
              }
            />
            {statusSelect}
          </>
        ) : mode === "flat" ? (
          <>
            <input
              tabIndex={-1}
              className="effort-gantt-input"
              style={{ width: FLAT_COL_W }}
              value={row.taskName || ""}
              onChange={(e) => onRenameTask(e.target.value)}
            />
            {statusSelect}
            <span className="effort-gantt-flat-col" style={{ width: FLAT_COL_W }}>
              <RoleSelect store={store} value={roleValue} onChange={onSelectRole} />
            </span>
            {personCol ? (
              <span className="effort-gantt-flat-col" style={{ width: FLAT_COL_W }}>
                <PersonSelect
                  store={store}
                  role={roleValue}
                  value={row.personId}
                  onChange={onSelectPerson}
                />
              </span>
            ) : null}
          </>
        ) : mode === "res-task" ? (
          <>
            <span className="effort-gantt-flat-col min-w-0" style={{ width: FLAT_COL_W }}>
              <input
                tabIndex={-1}
                className="effort-gantt-input"
                style={{ width: "100%" }}
                value={row.taskName || row.label}
                onChange={(e) => onRenameTask(e.target.value)}
              />
            </span>
            {statusSelect}
          </>
        ) : (
          <>
            <span className="effort-gantt-flat-col shrink-0" style={{ width: FLAT_COL_W }}>
              <RoleSelect store={store} value={roleValue} onChange={onSelectRole} />
            </span>
            {personCol ? (
              <span className="effort-gantt-flat-col shrink-0" style={{ width: FLAT_COL_W }}>
                <PersonSelect
                  store={store}
                  role={roleValue}
                  value={row.personId}
                  onChange={onSelectPerson}
                />
              </span>
            ) : null}
          </>
        )}
      </div>
      {metaCols.start ? (
        <span className="effort-gantt-meta" style={{ width: META_W }}>
          {spanLabel(row.span, weeks, "start")}
        </span>
      ) : null}
      {metaCols.finish ? (
        <span className="effort-gantt-meta" style={{ width: META_W }}>
          {spanLabel(row.span, weeks, "finish")}
        </span>
      ) : null}
      {metaCols.duration ? (
        <span className="effort-gantt-meta" style={{ width: META_W }}>
          {row.span.dur || "—"}
        </span>
      ) : null}
      {hoursColOn(metaCols, pmOn) ? (
        <span className="effort-gantt-meta effort-gantt-hours font-medium text-[var(--ink)]" style={{ width: HOURS_W }}>
          {row.span.total ? formatHours(row.span.total) : "—"}
        </span>
      ) : null}
      {pmOn ? (
        <ActualValue
          width={ACTUAL_HOURS_W}
          label="Actual hours"
          value={rowActualHours(row, demo)}
          editable={row.type === "l2"}
          onChange={onActualHours}
        />
      ) : null}
      {pmOn ? (
        <span className="effort-gantt-meta effort-gantt-hours tabular-nums" style={{ width: FAC_HOURS_W }} title="Forecast at completion">
          {rowFacHours(row, demo) ? formatHours(rowFacHours(row, demo)) : "—"}
        </span>
      ) : null}
      {pmOn ? (
        <VacValue width={VAC_HOURS_W} label="VAC h" value={rowVacHours(row, demo)} />
      ) : null}
      {costColOn(metaCols, pmOn) ? (
        <span className="effort-gantt-meta effort-gantt-hours font-medium text-[var(--ink)]" style={{ width: COST_W }}>
          {formatMoney(rowTotalCost(row, demo, store))}
        </span>
      ) : null}
      {pmOn ? (
        <ActualValue
          width={ACTUAL_COST_W}
          label="Actual $"
          value={rowActualCost(row, demo)}
          money
          editable={row.type === "l2"}
          onChange={onActualCost}
        />
      ) : null}
      {pmOn ? (
        <span className="effort-gantt-meta effort-gantt-hours tabular-nums" style={{ width: FAC_COST_W }} title="Forecast at completion $">
          {formatMoney(rowFacCost(row, demo, store) || null)}
        </span>
      ) : null}
      {pmOn ? (
        <VacValue width={VAC_COST_W} label="VAC $" value={rowVacCost(row, demo, store)} money />
      ) : null}
    </div>
  );
}

function MilestoneLane({
  demo,
  baseline,
  stick,
  todayCol,
  onDueDrag,
  onTailDrag,
}: {
  demo: EffortDemo;
  baseline?: EffortDemo;
  stick: EffortStick;
  todayCol: number | null;
  onDueDrag: (e: ReactPointerEvent) => void;
  onTailDrag: (e: ReactPointerEvent) => void;
}) {
  const dueCol = dueColumnIndex(demo);
  const tail = Math.max(1, demo.milestone.tailWeeks);
  const startCol = dueCol - tail + 1;
  const tailCapLeft =
    stick === "tail-start" ? weekLeft(startCol, -1) : `calc(${weekMid(dueCol)} - 1px)`;
  const base = baseline ? ensureEffortDemo(baseline) : null;
  const baseDueCol = base ? dueColumnOnLive(demo, base) : null;
  const baseTail = base ? Math.max(1, base.milestone.tailWeeks) : 0;
  const baseStartCol =
    baseDueCol !== null ? baseDueCol - baseTail + 1 : 0;
  return (
    <div
      className="relative border-b border-[var(--border)]"
      data-effort-row="milestone"
      style={{ height: MS_H, zIndex: 1 }}
    >
      {baseline && baseDueCol !== null ? (
        <>
          <div
            className="effort-gantt-baseline-bar absolute top-1/2 h-2 -translate-y-1/2 rounded-sm"
            style={{
              left: weekLeft(baseStartCol, 4),
              width: weekSpan(baseTail, -8),
            }}
            title="Default milestone and tail"
          />
          <div
            className="effort-gantt-baseline-diamond absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45"
            style={{ left: weekMid(baseDueCol) }}
            title="Default due"
          />
        </>
      ) : null}
      {todayCol !== null ? (
        <div className="effort-gantt-today" style={{ left: weekMid(todayCol) }} />
      ) : null}
      <div data-effort-live-layer>
      <div
        data-effort-live="tail-bar"
        className="absolute top-1/2 h-2 -translate-y-1/2 rounded-sm"
        style={{
          left: weekLeft(startCol, 4),
          width: weekSpan(tail, -8),
          background: "color-mix(in srgb, var(--ink) 72%, transparent)",
        }}
        title={`${demo.milestone.tailWeeks} week tail`}
      />
      <div
        data-effort-tail
        data-effort-live="tail"
        className="effort-gantt-resize is-bar"
        style={{ left: weekLeft(startCol, 1), top: 15, height: 8 }}
        title="Drag to change tail length"
        onPointerDown={onTailDrag}
      />
      {stick !== "unstick" ? (
        <div className="effort-gantt-stuck-cap is-tail-top" style={{ left: tailCapLeft }} />
      ) : null}
      <div
        data-effort-diamond
        data-effort-live="diamond"
        className="effort-gantt-diamond absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-[var(--ink)] bg-[var(--rag-green)]"
        style={{ left: weekMid(dueCol) }}
        title="Drag due date"
        onPointerDown={onDueDrag}
      />
      </div>
    </div>
  );
}

function TimelineRow({
  row,
  n,
  stick,
  dueCol,
  tailStartCol,
  todayCol,
  baselineHours,
  weekLoad,
  hoursPaint,
  overrunPercent = 125,
  highlight,
  cap,
  showAvailability: _showAvailability,
  redHover,
  store,
  liveStart,
  onHour,
  onBarDown,
  onRunResize,
}: {
  row: EffortLayoutRow;
  n: number;
  stick: EffortStick;
  dueCol: number;
  tailStartCol: number;
  todayCol: number | null;
  baselineHours?: number[];
  weekLoad?: Map<string, number[]>;
  hoursPaint?: number[];
  overrunPercent?: number;
  highlight?: boolean;
  cap?: number;
  showAvailability?: boolean;
  redHover?: boolean;
  store?: ScheduleStore;
  liveStart?: { y: number; m: number; d: number };
  onHour: (week: number, hours: number) => void;
  onBarDown: (e: ReactPointerEvent) => void;
  onRunResize: (
    e: ReactPointerEvent,
    runStart: number,
    runEnd: number,
    edge: "start" | "end",
  ) => void;
}) {
  const h = rowHeight(row.type);
  const span = row.span;
  const isSummary = row.type === "l0" || row.type === "l1";
  const barLeft = span.start !== null ? weekLeft(span.start, 2) : "0px";
  const barCols =
    span.start !== null && span.finish !== null ? span.finish - span.start + 1 : 0;
  const barWidth = barCols ? weekSpan(barCols, -4) : "0px";
  const handleStartLeft = span.start !== null ? weekLeft(span.start, -1) : "0px";
  const handleEndLeft =
    span.finish !== null ? weekLeft(span.finish + 1, -7) : "0px";
  const allCapLeft =
    stick === "tail-start"
      ? weekLeft(span.start ?? 0, 1)
      : weekLeft((span.finish ?? 0) + 1, -3);
  const tailCapLeft =
    stick === "tail-start" ? weekLeft(tailStartCol, -1) : `calc(${weekMid(dueCol)} - 1px)`;
  const joinStartCol = stick === "tail-start"
    ? Math.min(span.start ?? tailStartCol, tailStartCol)
    : Math.min(span.finish ?? dueCol, dueCol);
  const joinEndCol = stick === "tail-start"
    ? Math.max(span.start ?? tailStartCol, tailStartCol)
    : Math.max(span.finish ?? dueCol, dueCol);
  return (
    <div
      className="relative border-b border-[var(--border)]/60"
      style={{
        height: h,
        background: highlight
          ? "color-mix(in srgb, var(--rag-amber) 14%, var(--surface))"
          : isSummary
            ? "var(--surface-muted)"
            : undefined,
      }}
    >
      {Array.from({ length: n }, (_, i) => (
        <div
          key={i}
          className="pointer-events-none absolute top-0 bottom-0 border-r border-[var(--border)]/40"
          style={{ left: weekLeft(i) }}
        />
      ))}
      {row.type === "l2" && row.personId && weekLoad
        ? (weekLoad.get(row.personId) || []).map((loadH, i) => {
            const rag = ragStatus(loadH, cap || 0, overrunPercent);
            if (rag !== "yellow" && rag !== "red") return null;
            return (
              <div
                key={`ov-${i}`}
                className="pointer-events-none absolute"
                title={`${loadH} h / ${cap || 0} h capacity`}
                style={{
                  left: weekLeft(i, 1),
                  top: 1,
                  width: "calc(var(--effort-week) - 2px)",
                  bottom: 1,
                  border: `1.5px solid ${rag === "red" ? "var(--rag-red)" : "var(--rag-amber)"}`,
                  background:
                    rag === "red"
                      ? "color-mix(in srgb, var(--rag-red) 18%, transparent)"
                      : "color-mix(in srgb, var(--rag-amber) 16%, transparent)",
                }}
              />
            );
          })
        : null}
      {todayCol !== null ? (
        <div className="effort-gantt-today" style={{ left: weekMid(todayCol) }} />
      ) : null}
      {row.type === "l2" && baselineHours
        ? hourRuns(baselineHours).map((run) => (
            <div
              key={`base-${run.start}-${run.end}`}
              className="effort-gantt-baseline-bar absolute rounded-sm"
              style={{
                left: weekLeft(run.start, 2),
                top: 9,
                width: weekSpan(run.end - run.start + 1, -4),
                height: 14,
              }}
              title="Default hours"
            />
          ))
        : null}
      <div data-effort-live-layer>
      {isSummary && span.start !== null && span.finish !== null ? (
        <>
          <button
            type="button"
            data-effort-live="bar"
            className="absolute cursor-grab rounded-sm"
            style={{
              left: barLeft,
              top: row.type === "l0" ? 10 : 9,
              width: barWidth,
              height: row.type === "l0" ? 12 : 10,
              background:
                row.color === "var(--ink)"
                  ? "color-mix(in srgb, var(--ink) 55%, transparent)"
                  : row.color,
              opacity: 0.9,
            }}
            onPointerDown={onBarDown}
          />
          <div
            data-effort-resize
            data-effort-live="handle"
            className="effort-gantt-resize is-bar"
            style={{
              left: handleStartLeft,
              top: row.type === "l0" ? 10 : 9,
              height: row.type === "l0" ? 12 : 10,
            }}
            title="Resize hours"
            onPointerDown={(e) => onRunResize(e, span.start as number, span.finish as number, "start")}
          />
          <div
            data-effort-resize
            data-effort-live="handle"
            className="effort-gantt-resize is-bar"
            style={{
              left: handleEndLeft,
              top: row.type === "l0" ? 10 : 9,
              height: row.type === "l0" ? 12 : 10,
            }}
            title="Resize hours"
            onPointerDown={(e) => onRunResize(e, span.start as number, span.finish as number, "end")}
          />
        </>
      ) : null}
      {row.type === "l0" && stick !== "unstick" && span.start !== null ? (
        <>
          <div
            className="effort-gantt-stuck-join"
            style={{
              left: weekLeft(joinStartCol),
              width: weekSpan(Math.max(1, joinEndCol - joinStartCol + 1)),
            }}
          />
          <div
            className="effort-gantt-stuck-cap is-tail-bottom"
            style={{ left: tailCapLeft }}
            title={stick === "tail-start" ? "Stuck to tail start" : "Stuck to tail end"}
          />
          <div
            className="effort-gantt-stuck-cap is-all"
            style={{ left: allCapLeft }}
            title={stick === "tail-start" ? "Stuck to tail start" : "Stuck to tail end"}
          />
        </>
      ) : null}
      {row.type === "l2" && span.start !== null && span.finish !== null ? (
        <button
          type="button"
          data-effort-grab
          data-effort-live="bar"
          className="effort-gantt-grab"
          style={{
            left: barLeft,
            top: 1,
            width: barWidth,
            background: row.color,
          }}
          title="Drag hours"
          onPointerDown={onBarDown}
        />
      ) : null}
      {row.type === "l2"
        ? hourRuns(row.hours).map((run) => (
            <div key={`${run.start}-${run.end}`}>
              <div
                data-effort-live="run"
                className="pointer-events-none absolute rounded-sm"
                style={{
                  left: weekLeft(run.start, 2),
                  top: 9,
                  width: weekSpan(run.end - run.start + 1, -4),
                  height: 14,
                  background: row.color,
                  opacity: 0.85,
                }}
              />
              <div
                data-effort-resize
                data-effort-live="handle"
                className="effort-gantt-resize"
                style={{ left: weekLeft(run.start, -1) }}
                title="Resize hours"
                onPointerDown={(e) => onRunResize(e, run.start, run.end, "start")}
              />
              <div
                data-effort-resize
                data-effort-live="handle"
                className="effort-gantt-resize"
                style={{ left: weekLeft(run.end + 1, -7) }}
                title="Resize hours"
                onPointerDown={(e) => onRunResize(e, run.start, run.end, "end")}
              />
            </div>
          ))
        : null}
      </div>
      {row.type === "l2" ? (
        <HourGrid
          n={n}
          hours={hoursPaint ?? row.hours}
          personId={row.personId}
          weekLoad={weekLoad}
          cap={cap}
          overrunPercent={overrunPercent}
          redHover={redHover}
          store={store}
          liveStart={liveStart}
          onHour={onHour}
        />
      ) : null}
    </div>
  );
}

const HourGrid = memo(function HourGrid({
  n,
  hours,
  personId,
  weekLoad,
  cap,
  overrunPercent,
  redHover,
  store,
  liveStart,
  onHour,
}: {
  n: number;
  hours: number[];
  personId?: string;
  weekLoad?: Map<string, number[]>;
  cap?: number;
  overrunPercent: number;
  redHover?: boolean;
  store?: ScheduleStore;
  liveStart?: { y: number; m: number; d: number };
  onHour: (week: number, hours: number) => void;
}) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const load = personId && weekLoad ? weekLoad.get(personId)?.[i] || 0 : 0;
        const remaining = personId && cap ? cap - load : null;
        return (
          <HourCell
            key={i}
            hours={hours[i] || 0}
            col={i}
            remaining={remaining}
            onCommit={(value) => onHour(i, value)}
            overHover={
              redHover &&
              store &&
              liveStart &&
              personId &&
              ragStatus(load, cap || 0, overrunPercent) === "red"
                ? { store, personId, liveStart, weekIdx: i }
                : null
            }
          />
        );
      })}
    </>
  );
}, (prev, next) =>
  prev.n === next.n &&
  prev.hours === next.hours &&
  prev.weekLoad === next.weekLoad &&
  prev.personId === next.personId &&
  prev.cap === next.cap &&
  prev.overrunPercent === next.overrunPercent &&
  prev.redHover === next.redHover &&
  prev.store === next.store &&
  prev.liveStart?.y === next.liveStart?.y &&
  prev.liveStart?.m === next.liveStart?.m &&
  prev.liveStart?.d === next.liveStart?.d,
);

function HourCell({
  hours,
  col,
  remaining,
  onCommit,
  overHover,
}: {
  hours: number;
  col: number;
  remaining?: number | null;
  onCommit: (hours: number) => void;
  overHover?: {
    store: ScheduleStore;
    personId: string;
    liveStart: { y: number; m: number; d: number };
    weekIdx: number;
  } | null;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft ?? (hours ? formatHours(hours) : "");
  const rem =
    remaining == null
      ? ""
      : formatHours(remaining, true);
  return (
    <div
      className="mrt-hour-cell absolute z-[2] flex items-center justify-center"
      style={{ left: weekLeft(col), top: 8, bottom: 0 }}
    >
      {remaining != null ? (
        <span
          className="effort-avail-rem pointer-events-none absolute top-[-7px] text-[8px] tabular-nums text-[var(--muted)]"
          title={`Remaining ${rem} h this week`}
        >
          {rem}
        </span>
      ) : null}
      <input
        type="text"
        inputMode="decimal"
        className="effort-gantt-input effort-gantt-hour"
        style={{
          color: hours > 0 && draft === null ? "#fff" : "var(--ink)",
        }}
        value={display}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={() => {
          if (draft !== null) onCommit(parseDecimal(draft));
          setDraft(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
      {overHover ? (
        <PersonOverHover
          store={overHover.store}
          personId={overHover.personId}
          liveStart={overHover.liveStart}
          weekIdx={overHover.weekIdx}
        />
      ) : null}
    </div>
  );
}
