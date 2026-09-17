"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { ScheduleStore } from "../schema";
import {
  clampHorizonYears,
  currentFyEndYear,
  daysInMonth,
  defaultDueDayForIdx,
  fyStartIdx,
  idxDayToContinuous,
  idxDayToShortDateLabel,
  idxToYm,
  monthIndex,
  MONTH_NAMES,
  planningWindow,
  rollupToEndOfWeek,
  storeBaseline,
  todayIdx,
  todayYm,
  totalMonths,
} from "../logic/dates";
import {
  buildGanttLayout,
  headingKeys,
  visiblePairs,
  type GroupMode,
  type GanttLayoutItem,
  type GanttSort,
  type GanttSortKey,
} from "../logic/gantt-layout";
import {
  ganttMarkers,
  isCompleted,
  isScheduled,
  isUserNotRequired,
  occurrenceStatus,
  recalculateRow,
  staleRecalcRows,
  type GanttMarker,
  type NextDueChip,
} from "../logic/scheduling";
import { nextDueChipClass, planStatusKind } from "../logic/status";
import {
  chartXToContinuous,
  continuousToChartX,
  makeGanttXScale,
  monthStartX,
  todayChartX,
} from "../logic/gantt-x-scale";
import {
  indexMarkersByRow,
  markerOverlapsWindow,
} from "../logic/gantt-stage";
import {
  clearGanttOverlay,
  devicePx,
  hitTestGanttMarker,
  markerDueX,
  markerHoverTitle,
  markerPaintKey,
  paintGanttMarkerOverlay,
  quantisePx,
  readGanttPaintTheme,
  worldFromClient,
  type GanttCamera,
  type GanttDragShift,
  type GanttPaintRect,
  type GanttPaintTheme,
} from "../logic/gantt-paint";
import {
  aggregateResourceLoad,
  type LoadContribution,
  type LoadGrain,
  type PersonMonthLoad,
} from "../logic/resource-load";
import {
  loadOccurrenceEffortDemo,
  writeOccurrenceEffortDemo,
} from "../logic/occurrence-effort";
import { setMilestoneDue } from "../logic/effort-gantt";
import { OccurrenceModal } from "./OccurrenceModal";
import { BaselineModal } from "./BaselineModal";
import { FilterChecklist } from "./FilterChecklist";
import { ResourceLoadPane } from "./ResourceLoadPane";
import { StackedEffortModal } from "./StackedEffortModal";
import { ganttTimescaleHeight } from "./GanttTimescale";
import {
  GanttTimelineCanvas,
  GanttTimescaleCanvas,
  type GanttCanvasHandle,
} from "./GanttTimelineCanvas";
import { PageIntro } from "./SubTabs";
import { MrtInlineLoading } from "./MrtLoadingPane";

const ZOOM_X = [8, 11, 14, 18, 24, 32, 48, 72, 110, 170, 260, 400, 620];
const MIN_MONTH_PX = 6;
/** Enough that a single month can fill a wide pane. */
const MAX_MONTH_PX = 2400;
/**
 * How long the pointer rests on a due before it can be dragged. The cursor
 * changes to the sideways arrows when the wait is up. Move before that and the
 * gesture pans instead.
 */
const MARKER_HOLD_MS = 180;
/** Cursor that says "this due can now be slid along the timeline". */
const MARKER_ARMED_CURSOR = "ew-resize";
const ZOOM_Y = [0.7, 0.85, 1, 1.2, 1.45, 1.8];
const BASE_MONTH_PX = 14;
const BASE_LANE_H = 20;
const BASE_HEADING_H = 24;
const GROUP_GAP = 6;
const DUE_COL_W = 108;
const ALLOC_H_KEY = "mrt-alloc-h";
const ALLOC_H_DEFAULT = 200;
const ALLOC_H_MIN = 100;
const ALLOC_H_MAX = 480;
// How far the view must travel before the hours pane recomputes its slice.
const LABEL_BAND_STEP = 300;

function loadAllocH() {
  if (typeof window === "undefined") return ALLOC_H_DEFAULT;
  const n = Number(window.localStorage.getItem(ALLOC_H_KEY));
  if (!Number.isFinite(n)) return ALLOC_H_DEFAULT;
  return Math.min(ALLOC_H_MAX, Math.max(ALLOC_H_MIN, n));
}

type PendingScroll =
  | { type: "idx-start"; idx: number }
  | { type: "idx-center"; idx: number }
  | { type: "frac"; frac: number }
  | { type: "pct"; pct: number }
  | { type: "xy"; x: number; y: number }
  | { type: "exact"; x: number; y: number };

export type GanttOccurrenceFocus = {
  damId: string;
  laneCode: string;
  procDueIdx: number;
};

/**
 * Filters, grouping and camera kept by the workspace, so leaving the Gantt tab
 * and coming back does not throw the user's view away. Reset still clears it.
 */
export type GanttViewState = {
  damFilter?: string[];
  laneFilter?: string[];
  dueBeforeIdx?: number | null;
  onlyOngoing?: boolean;
  scheduleFilter?: null | "scheduled" | "predicted";
  hideEmptyOnScreen?: boolean;
  monthPx?: number;
  zoomY?: number;
  grain?: LoadGrain;
  groupMode?: Exclude<GroupMode, "flat">;
  flatMode?: boolean;
  collapsed?: Record<string, boolean>;
  allCollapsed?: boolean;
  showSummarised?: boolean;
  rowSort?: GanttSort | null;
  showGantt?: boolean;
  showAlloc?: boolean;
  landed?: boolean;
  camX?: number;
  camY?: number;
};

function DueChip({ chip }: { chip: NextDueChip | null }) {
  if (!chip) {
    return <span className="text-[10px] text-[var(--muted)]">—</span>;
  }
  return (
    <span
      title={chip.fullLabel}
      className={`inline-block shrink-0 rounded-full px-1.5 py-px text-[10px] font-medium ${nextDueChipClass(chip.rag)}`}
    >
      {chip.label}
    </span>
  );
}

/** This row is waiting on a saved date. */
function RowSaving() {
  return (
    <span
      className="mrt-row-saving"
      role="status"
      aria-label="Saving this row"
      title="Saving the new date…"
    />
  );
}

function todayShort() {
  const now = new Date();
  return `${String(now.getDate()).padStart(2, "0")}-${MONTH_NAMES[now.getMonth()]}-${String(now.getFullYear()).slice(2)}`;
}

export function GanttTab({
  store,
  onChange,
  readOnly = false,
  onGoToDefaults,
  onGoToPerson,
  focusOccurrence,
  onFocusConsumed,
  viewRef,
}: {
  store: ScheduleStore;
  onChange: (store: ScheduleStore) => void;
  readOnly?: boolean;
  onGoToDefaults?: (laneCode: string) => void;
  onGoToPerson?: (personId: string) => void;
  focusOccurrence?: GanttOccurrenceFocus | null;
  onFocusConsumed?: () => void;
  viewRef?: React.MutableRefObject<GanttViewState>;
}) {
  const kept = viewRef?.current ?? {};
  const [open, setOpen] = useState<GanttMarker | null>(null);
  const [damFilter, setDamFilter] = useState<string[]>(
    () => kept.damFilter ?? (store.dams[0] ? [store.dams[0].id] : []),
  );
  const [laneFilter, setLaneFilter] = useState<string[]>(
    () => kept.laneFilter ?? store.lanes.map((l) => l.code),
  );
  const [dueBeforeIdx, setDueBeforeIdx] = useState<number | null>(
    kept.dueBeforeIdx ?? null,
  );
  const [onlyOngoing, setOnlyOngoing] = useState(kept.onlyOngoing ?? false);
  const [scheduleFilter, setScheduleFilter] = useState<
    null | "scheduled" | "predicted"
  >(kept.scheduleFilter ?? null);
  const [panel, setPanel] = useState<null | "dam" | "type" | "due" | "legend">(null);
  const [monthPx, setMonthPx] = useState(kept.monthPx ?? BASE_MONTH_PX);
  const [zoomY, setZoomY] = useState(kept.zoomY ?? 1);
  const [groupMode, setGroupMode] = useState<Exclude<GroupMode, "flat">>(
    kept.groupMode ?? "dam-obl",
  );
  const [flatMode, setFlatMode] = useState(kept.flatMode ?? false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(
    () => kept.collapsed ?? {},
  );
  const [allCollapsed, setAllCollapsed] = useState(kept.allCollapsed ?? false);
  const [showSummarised, setShowSummarised] = useState(
    kept.showSummarised ?? true,
  );
  const [baselineOpen, setBaselineOpen] = useState(false);
  const [rowSort, setRowSort] = useState<GanttSort | null>(
    kept.rowSort ?? null,
  );
  const [pulseKey, setPulseKey] = useState<string | null>(null);
  const [pulseToast, setPulseToast] = useState<string | null>(null);
  const [hideEmptyOnScreen, setHideEmptyOnScreen] = useState(
    kept.hideEmptyOnScreen ?? false,
  );
  const [rebalance, setRebalance] = useState<{
    contributions: LoadContribution[];
    personId: string;
  } | null>(null);
  const [viewBand, setViewBand] = useState({
    startC: 0,
    endC: 12,
    top: 0,
    bottom: 720,
  });
  const [chartReady, setChartReady] = useState(false);
  // "The chart is thinking" — heavy list rebuilds run as a transition so the
  // old picture stays live behind the overlay.
  const [reshaping, startReshape] = useTransition();
  const [markersBusy, setMarkersBusy] = useState(true);
  const [savingRowKey, setSavingRowKey] = useState<string | null>(null);

  const bodyRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const labelLayerRef = useRef<HTMLDivElement>(null);
  const dragOverlayRef = useRef<HTMLCanvasElement>(null);
  const dragTipRef = useRef<HTMLDivElement>(null);
  const hideKeyRef = useRef<string | null>(null);
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minimapWrapRef = useRef<HTMLDivElement>(null);
  const minimapThumbRef = useRef<HTMLDivElement>(null);
  const todayLabelRef = useRef<HTMLSpanElement>(null);
  const panRootRef = useRef<HTMLDivElement>(null);
  const timelineCanvasRef = useRef<GanttCanvasHandle>(null);
  const timescaleCanvasRef = useRef<GanttCanvasHandle>(null);
  const cameraRef = useRef<GanttCamera>({ x: 0, y: 0, w: 800, h: 480 });
  const minimapRef = useRef({ leftPct: 0, widthPct: 12 });
  const viewBandRef = useRef(viewBand);
  // The band React last committed — compared against so a slow pan still
  // rebuilds the name rows before they run out.
  const committedBandRef = useRef(viewBand);
  const viewRaf = useRef(0);
  const paintRaf = useRef(0);
  const fyLanded = useRef(false);
  const viewRestored = useRef(false);
  const hideEmptyRef = useRef(false);
  const showAllocRef = useRef(false);
  const allocScrollRef = useRef<HTMLDivElement>(null);
  const syncingH = useRef(false);
  const splitDragRef = useRef<{ startY: number; startH: number } | null>(null);
  const pendingScroll = useRef<PendingScroll | null>(null);
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef<{
    mode: "move" | "left" | "right";
    startX: number;
    startLeftPct: number;
    startWidthPct: number;
  } | null>(null);
  const monthPxRef = useRef(monthPx);
  // Pointer gestures write here and do their work once per frame, so a
  // high-rate mouse cannot queue more work than the screen can show.
  const dragPtRef = useRef<{ x: number; y: number } | null>(null);
  const dragRaf = useRef(0);
  const zoomPtRef = useRef<{ clientX: number } | null>(null);
  const zoomRaf = useRef(0);
  const liveMonthPxRef = useRef<number | null>(null);
  if (liveMonthPxRef.current === null) monthPxRef.current = monthPx;
  const storeRef = useRef(store);
  storeRef.current = store;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    return () => {
      if (pulseTimer.current) clearTimeout(pulseTimer.current);
      if (armTimer.current) clearTimeout(armTimer.current);
    };
  }, []);
  useEffect(() => {
    if (!panel) return;
    function onDown(e: PointerEvent) {
      const t = e.target as HTMLElement;
      if (t.closest("[data-mrt-overlay]")) return;
      setPanel(null);
    }
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [panel]);
  const panRef = useRef<{
    mode: "x" | "y" | "both";
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);
  const markerDragRef = useRef<{
    marker: GanttMarker;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
    downT: number;
    armed: boolean;
    dragging: boolean;
    canDrag: boolean;
    baseIdx: number;
    baseDay: number;
    candidateIdx: number | null;
    candidateDay: number | null;
    cy: number | null;
    overlayRect: GanttPaintRect | null;
    theme: GanttPaintTheme | null;
  } | null>(null);
  const [showGantt, setShowGantt] = useState(kept.showGantt ?? true);
  const [showAlloc, setShowAlloc] = useState(kept.showAlloc ?? false);
  hideEmptyRef.current = hideEmptyOnScreen;
  showAllocRef.current = showAlloc;
  const [grain, setGrain] = useState<LoadGrain>(kept.grain ?? "month");
  const grainRef = useRef(grain);
  grainRef.current = grain;
  const [allocH, setAllocH] = useState(loadAllocH);
  const allocHRef = useRef(allocH);
  allocHRef.current = allocH;
  const allocPaneRef = useRef<HTMLDivElement>(null);

  const win = planningWindow(new Date(), clampHorizonYears(store.horizonYears));
  const winStartRef = useRef(win.start);
  winStartRef.current = win.start;
  const months = totalMonths(win.start, win.end);
  const tIdx = todayIdx(todayYm(), win.start);
  const scale = useMemo(
    () => makeGanttXScale(win.start, months, monthPx, grain),
    [win.start.y, win.start.m, months, monthPx, grain],
  );
  const scaleRef = useRef(scale);
  // While a zoom gesture owns the scale, React's copy is behind; do not let a
  // stray re-render pull the picture back to it.
  if (liveMonthPxRef.current === null) scaleRef.current = scale;
  const todayX = todayChartX(scale);
  const width = scale.width;
  const laneH = BASE_LANE_H * zoomY;
  const headingH = BASE_HEADING_H * Math.max(0.85, Math.min(1.4, zoomY));
  const mode: GroupMode = flatMode ? "flat" : groupMode;
  const labelW = 420;
  const [markerList, setMarkerList] = useState<GanttMarker[] | null>(null);
  const markers = markerList ?? [];
  const markersLoading = markerList === null;
  const markerListRef = useRef(markerList);
  markerListRef.current = markerList;
  const damFilterRef = useRef(damFilter);

  useEffect(() => {
    let cancelled = false;
    // Only dim the chart when the asset filter changed, or on first build. A
    // saved date also rebuilds markers, but that row shows its own spinner.
    if (damFilterRef.current !== damFilter || markerListRef.current === null) {
      setMarkersBusy(true);
    }
    damFilterRef.current = damFilter;
    const id = window.requestAnimationFrame(() => {
      if (cancelled) return;
      const list = ganttMarkers(store, damFilter);
      startTransition(() => {
        if (cancelled) return;
        setMarkerList(list);
        setMarkersBusy(false);
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(id);
    };
  }, [store, damFilter]);

  const basePairs = useMemo(
    () =>
      visiblePairs(store, damFilter, laneFilter, onlyOngoing, scheduleFilter),
    [store, damFilter, laneFilter, onlyOngoing, scheduleFilter],
  );

  const markersByRow = useMemo(() => indexMarkersByRow(markers), [markers]);
  const viewStartC = viewBand.startC;
  const viewEndC = viewBand.endC;

  useEffect(() => {
    setChartReady(true);
  }, []);

  // Hand the current view back to the workspace so a tab switch keeps it.
  useEffect(() => {
    const v = viewRef?.current;
    if (!v) return;
    v.damFilter = damFilter;
    v.laneFilter = laneFilter;
    v.dueBeforeIdx = dueBeforeIdx;
    v.onlyOngoing = onlyOngoing;
    v.scheduleFilter = scheduleFilter;
    v.hideEmptyOnScreen = hideEmptyOnScreen;
    v.monthPx = monthPx;
    v.zoomY = zoomY;
    v.grain = grain;
    v.groupMode = groupMode;
    v.flatMode = flatMode;
    v.collapsed = collapsed;
    v.allCollapsed = allCollapsed;
    v.showSummarised = showSummarised;
    v.rowSort = rowSort;
    v.showGantt = showGantt;
    v.showAlloc = showAlloc;
    v.landed = fyLanded.current;
  });

  const pairs = useMemo(() => {
    if (!hideEmptyOnScreen) return basePairs;
    const pad = 0.05;
    const a = viewStartC - pad;
    const b = viewEndC + pad;
    return basePairs.filter((p) =>
      markers.some((m) => {
        if (m.damId !== p.dam.id || m.laneCode !== p.lane.code) return false;
        if (m.kind === "completed" || m.kind === "notRequired") return false;
        return markerOverlapsWindow(m, a, b, win.start);
      }),
    );
  }, [
    hideEmptyOnScreen,
    basePairs,
    markers,
    viewStartC,
    viewEndC,
    win.start.y,
    win.start.m,
  ]);

  const headerH = ganttTimescaleHeight(grain, "full");

  const [loadRows, setLoadRows] = useState<PersonMonthLoad[]>([]);
  const [allocLoading, setAllocLoading] = useState(false);
  const allocSliceRef = useRef("");

  useEffect(() => {
    allocSliceRef.current = "";
  }, [store]);

  useEffect(() => {
    if (!showAlloc) {
      setAllocLoading(false);
      return;
    }
    const sliceKey = [
      Math.floor(viewStartC * 2),
      Math.floor(viewEndC * 2),
      grain,
      dueBeforeIdx ?? "",
      hideEmptyOnScreen ? "1" : "0",
      pairs.length,
      months,
    ].join("|");
    if (allocSliceRef.current === sliceKey) return;

    setAllocLoading(true);
    const t = window.setTimeout(() => {
      const pad = 0.2;
      const a = viewStartC - pad;
      const b = viewEndC + pad;
      const pairSet = new Set(pairs.map((p) => `${p.dam.id}|${p.lane.code}`));
      const inView = markers.filter((m) => {
        if (m.kind === "completed" || m.kind === "notRequired") return false;
        if (!pairSet.has(`${m.damId}|${m.laneCode}`)) return false;
        if (dueBeforeIdx !== null && m.displayDueIdx > dueBeforeIdx) {
          return false;
        }
        return markerOverlapsWindow(m, a, b, win.start);
      });
      let rows = aggregateResourceLoad(
        store,
        inView,
        win.start,
        months,
        grain,
      );
      if (hideEmptyOnScreen) {
        rows = rows.filter((row) =>
          row.cells.some(
            (cell) => cell.hours > 0 && cell.endC > a && cell.startC < b,
          ),
        );
      }
      allocSliceRef.current = sliceKey;
      setLoadRows(rows);
      setAllocLoading(false);
    }, 70);
    return () => window.clearTimeout(t);
  }, [
    showAlloc,
    store,
    markers,
    pairs,
    dueBeforeIdx,
    months,
    win.start.y,
    win.start.m,
    grain,
    hideEmptyOnScreen,
    viewStartC,
    viewEndC,
  ]);

  const { items, totalHeight } = useMemo(
    () =>
      buildGanttLayout(pairs, mode, collapsed, headingH, laneH, GROUP_GAP, rowSort),
    [pairs, mode, collapsed, headingH, laneH, rowSort],
  );

  // Every name row is in the DOM, so vertical pan is a transform and never a
  // React render. Building the list is the up-front cost when filters change.
  const staleRows = useMemo(
    () => staleRecalcRows(store, markers),
    [store, markers],
  );

  // Any React render of the name rows re-asserts the camera, so names can
  // never end up a few pixels off the dots.
  useLayoutEffect(() => {
    const layer = labelLayerRef.current;
    if (layer) {
      layer.style.transform = `translate3d(0,${-cameraRef.current.y}px,0)`;
    }
  });

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const markersByRowRef = useRef(markersByRow);
  markersByRowRef.current = markersByRow;
  const dueBeforeIdxRef = useRef(dueBeforeIdx);
  dueBeforeIdxRef.current = dueBeforeIdx;
  const showSummarisedRef = useRef(showSummarised);
  showSummarisedRef.current = showSummarised;
  const dragShiftRef = useRef<GanttDragShift | null>(null);
  const pendingDropRef = useRef<{
    markersSeen: Map<string, GanttMarker[]>;
    rowKey: string;
  } | null>(null);
  const dropTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropSettled = useRef(false);

  const settleDrop = useCallback(() => {
    if (!pendingDropRef.current) return;
    pendingDropRef.current = null;
    dropSettled.current = false;
    if (dropTimer.current) {
      clearTimeout(dropTimer.current);
      dropTimer.current = null;
    }
    hideKeyRef.current = null;
    dragShiftRef.current = null;
    setSavingRowKey(null);
    timelineCanvasRef.current?.paint();
  }, []);

  // The markers now carry the saved date, so stop shifting this marker before
  // anything paints again — otherwise it would be drawn shifted twice.
  if (
    pendingDropRef.current &&
    pendingDropRef.current.markersSeen !== markersByRow
  ) {
    dragShiftRef.current = null;
    dropSettled.current = true;
  }

  useLayoutEffect(() => {
    if (dropSettled.current) settleDrop();
  });

  useEffect(() => {
    return () => {
      if (dropTimer.current) clearTimeout(dropTimer.current);
    };
  }, []);

  const years = useMemo(() => {
    const out: { y: number; start: number; span: number }[] = [];
    for (let i = 0; i < months; i++) {
      const { y } = idxToYm(i, win.start);
      const last = out[out.length - 1];
      if (!last || last.y !== y) out.push({ y, start: i, span: 1 });
      else last.span += 1;
    }
    return out;
  }, [months, win.start]);

  const fys = useMemo(() => {
    const out: {
      endYear: number;
      startIdx: number;
      centerPct: number;
    }[] = [];
    for (let endYear = win.start.y; endYear <= win.end.y + 1; endYear++) {
      const rawStart = fyStartIdx(endYear, win.start);
      const nextStart = fyStartIdx(endYear + 1, win.start);
      if (nextStart <= 0 || rawStart >= months) continue;
      const visStart = Math.max(0, rawStart);
      const visEnd = Math.min(months, nextStart);
      if (visEnd <= visStart) continue;
      out.push({
        endYear,
        startIdx: visStart,
        centerPct: ((visStart + visEnd) / 2 / months) * 100,
      });
    }
    return out;
  }, [months, win.start, win.end.y]);

  const yearTicks = useMemo(() => {
    const ticks: { y: number; pct: number }[] = [];
    for (let y = win.start.y; y <= win.end.y; y += 2) {
      const idx = monthIndex(y, 1, win.start);
      if (idx < 0 || idx > months) continue;
      ticks.push({ y, pct: (idx / months) * 100 });
    }
    return ticks;
  }, [months, win.start, win.end.y]);

  const syncChrome = useCallback(() => {
    if (paintRaf.current) return;
    paintRaf.current = window.requestAnimationFrame(() => {
      paintRaf.current = 0;
      const bv = bodyRef.current;
      const alloc = allocScrollRef.current;
      const scroller = bv || alloc;
      if (!scroller) return;
      if (bv) {
        const dpr = devicePx();
        const prev = cameraRef.current;
        const cam = {
          x: quantisePx(bv.scrollLeft, dpr),
          y: quantisePx(bv.scrollTop, dpr),
          w: bv.clientWidth || prev.w,
          h: bv.clientHeight || prev.h,
        };
        const resized = cam.w !== prev.w || cam.h !== prev.h;
        cameraRef.current = cam;
        if (viewRef?.current) {
          viewRef.current.camX = cam.x;
          viewRef.current.camY = cam.y;
        }
        // Names ride the same camera as the dots, in this same frame.
        const layer = labelLayerRef.current;
        if (layer) layer.style.transform = `translate3d(0,${-cam.y}px,0)`;
        if (resized) {
          timelineCanvasRef.current?.paint();
          timescaleCanvasRef.current?.paint();
        } else {
          timelineCanvasRef.current?.pan();
          timescaleCanvasRef.current?.pan();
        }
        if (alloc && Math.abs(alloc.scrollLeft - bv.scrollLeft) > 0.5) {
          syncingH.current = true;
          alloc.scrollLeft = bv.scrollLeft;
          syncingH.current = false;
        }
      }
      const bodyW = scaleRef.current.width || 1;
      const leftPct = Math.max(
        0,
        Math.min(100, (scroller.scrollLeft / bodyW) * 100),
      );
      const widthPct = Math.min(100, (scroller.clientWidth / bodyW) * 100);
      minimapRef.current = { leftPct, widthPct };
      const thumb = minimapThumbRef.current;
      if (thumb) {
        thumb.style.left = `${leftPct}%`;
        // Keep it grabbable when the window is down to a month or two.
        thumb.style.width = `${Math.max(0.6, widthPct)}%`;
      }
      const onScreenX = todayChartX(scaleRef.current) - scroller.scrollLeft;
      const viewportW = scroller.clientWidth || 0;
      const todayEl = todayLabelRef.current;
      if (onScreenX < -60 || onScreenX > viewportW + 60) {
        if (todayEl) todayEl.style.display = "none";
      } else {
        const labelWEst = 72;
        let left = onScreenX - labelWEst / 2;
        if (left + labelWEst + 4 > viewportW) left = viewportW - labelWEst - 4;
        if (left < 4) left = 4;
        if (todayEl) {
          todayEl.style.display = "";
          todayEl.style.left = `${left}px`;
        }
      }
      const startC = (leftPct / 100) * months;
      const endC = ((leftPct + widthPct) / 100) * months;
      const top = bv?.scrollTop ?? 0;
      const bottom = top + (bv?.clientHeight || scroller.clientHeight || 720);
      const nextBand = { startC, endC, top, bottom };
      viewBandRef.current = nextBand;
      const committed = committedBandRef.current;
      // Only the hours pane and "On screen" care about the band. Plain panning
      // must not reach React at all.
      const followView = hideEmptyRef.current || showAllocRef.current;
      const changed =
        followView &&
        (Math.abs(committed.startC - startC) >= 0.35 ||
          Math.abs(committed.endC - endC) >= 0.35 ||
          Math.abs(committed.top - top) >= LABEL_BAND_STEP);
      if (!changed) return;
      if (viewRaf.current) return;
      viewRaf.current = window.requestAnimationFrame(() => {
        viewRaf.current = 0;
        committedBandRef.current = viewBandRef.current;
        setViewBand(viewBandRef.current);
      });
    });
  }, [months, viewRef]);

  useLayoutEffect(() => {
    if (!chartReady) return;
    syncChrome();
  }, [chartReady, syncChrome, width, totalHeight, showGantt]);

  // Plain panning no longer publishes the view band, so hand the current one
  // over the moment something starts caring about it.
  useEffect(() => {
    if (!hideEmptyOnScreen && !showAlloc) return;
    committedBandRef.current = viewBandRef.current;
    setViewBand(viewBandRef.current);
  }, [hideEmptyOnScreen, showAlloc]);

  useLayoutEffect(() => {
    if (!focusOccurrence) return;
    if (!showGantt) {
      setShowGantt(true);
      return;
    }
    const headingKey =
      mode === "flat"
        ? null
        : mode === "dam-obl"
          ? `dam:${focusOccurrence.damId}`
          : `lane:${focusOccurrence.laneCode}`;
    if (headingKey && collapsed[headingKey]) {
      setCollapsed((cur) => ({ ...cur, [headingKey]: false }));
      setAllCollapsed(false);
      return;
    }
    const pairVisible = basePairs.some(
      (p) =>
        p.dam.id === focusOccurrence.damId &&
        p.lane.code === focusOccurrence.laneCode,
    );
    const filtersClear =
      damFilter.length === store.dams.length &&
      laneFilter.length === store.lanes.length &&
      !onlyOngoing &&
      scheduleFilter === null &&
      dueBeforeIdx === null;
    if (!pairVisible) {
      if (!filtersClear) {
        setDamFilter(store.dams.map((d) => d.id));
        setLaneFilter(store.lanes.map((l) => l.code));
        setOnlyOngoing(false);
        setScheduleFilter(null);
        setDueBeforeIdx(null);
        return;
      }
      onFocusConsumed?.();
      return;
    }
    let top = 0;
    let found = false;
    for (const it of items) {
      if (
        it.type === "row" &&
        it.damId === focusOccurrence.damId &&
        it.laneCode === focusOccurrence.laneCode
      ) {
        found = true;
        break;
      }
      top += it.h;
    }
    if (!found) {
      onFocusConsumed?.();
      return;
    }
    const marker = markers.find(
      (m) =>
        m.damId === focusOccurrence.damId &&
        m.laneCode === focusOccurrence.laneCode &&
        m.procDueIdx === focusOccurrence.procDueIdx,
    );
    let cx = 0;
    if (marker) {
      cx = markerDueX(marker, scale, win.start);
    }
    if (hideEmptyOnScreen) setHideEmptyOnScreen(false);
    pendingScroll.current = { type: "xy", x: cx, y: top + laneH / 2 };
    const bv = bodyRef.current;
    if (bv) {
      bv.scrollLeft = Math.max(0, cx - bv.clientWidth / 2);
      bv.scrollTop = Math.max(0, top - bv.clientHeight / 2 + laneH / 2);
    }
    syncChrome();
    const pulse = `${focusOccurrence.damId}-${focusOccurrence.laneCode}-${focusOccurrence.procDueIdx}`;
    setPulseKey(pulse);
    const damName =
      store.dams.find((d) => d.id === focusOccurrence.damId)?.name ||
      focusOccurrence.damId;
    const laneLabel =
      store.lanes.find((l) => l.code === focusOccurrence.laneCode)?.label ||
      focusOccurrence.laneCode;
    setPulseToast(`Centred on ${damName} · ${laneLabel}`);
    if (pulseTimer.current) clearTimeout(pulseTimer.current);
    pulseTimer.current = setTimeout(() => {
      setPulseKey(null);
      setPulseToast(null);
    }, 4000);
    onFocusConsumed?.();
  }, [
    focusOccurrence,
    showGantt,
    mode,
    collapsed,
    basePairs,
    items,
    markers,
    store,
    win.start,
    scale,
    laneH,
    damFilter.length,
    laneFilter.length,
    onlyOngoing,
    scheduleFilter,
    dueBeforeIdx,
    syncChrome,
    onFocusConsumed,
  ]);

  useLayoutEffect(() => {
    const bv = bodyRef.current || allocScrollRef.current;
    const pending = pendingScroll.current;
    if (bv && pending) {
      pendingScroll.current = null;
      const bodyW = scale.width;
      if (pending.type === "idx-start") bv.scrollLeft = monthStartX(scale, pending.idx);
      else if (pending.type === "idx-center") {
        bv.scrollLeft = todayChartX(scale) - bv.clientWidth / 2;
      } else if (pending.type === "frac") {
        bv.scrollLeft = pending.frac * bodyW - bv.clientWidth / 2;
      } else if (pending.type === "xy") {
        bv.scrollLeft = Math.max(0, pending.x - bv.clientWidth / 2);
        bv.scrollTop = Math.max(0, pending.y - bv.clientHeight / 2);
      } else if (pending.type === "exact") {
        bv.scrollLeft = Math.max(0, pending.x);
        bv.scrollTop = Math.max(0, pending.y);
      } else {
        bv.scrollLeft = (pending.pct / 100) * bodyW;
      }
    }
    syncChrome();
  }, [monthPx, months, items.length, totalHeight, showGantt, showAlloc, allocH, syncChrome]);

  useLayoutEffect(() => {
    function onResize() {
      syncChrome();
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [syncChrome]);

  /** One frame of a minimap resize: rescale on refs, no React re-render. */
  const applyZoomFrame = useCallback(() => {
    const drag = dragRef.current;
    const wrap = minimapWrapRef.current;
    const scroller = bodyRef.current || allocScrollRef.current;
    const pt = zoomPtRef.current;
    if (!drag || !wrap || !scroller || !pt || drag.mode === "move") return;
    const rect = wrap.getBoundingClientRect();
    const deltaPct = ((pt.clientX - drag.startX) / rect.width) * 100;
    // Narrowest window is one month, so the timescale can be squeezed right in.
    const minPct = (1 / Math.max(1, months)) * 100;
    let newLeft = drag.startLeftPct;
    let newWidth = drag.startWidthPct;
    if (drag.mode === "right") {
      newWidth = Math.max(
        minPct,
        Math.min(100 - drag.startLeftPct, drag.startWidthPct + deltaPct),
      );
    } else {
      newLeft = Math.max(
        0,
        Math.min(
          drag.startLeftPct + drag.startWidthPct - minPct,
          drag.startLeftPct + deltaPct,
        ),
      );
      newWidth = drag.startWidthPct + (drag.startLeftPct - newLeft);
    }
    const visibleMonths = (newWidth / 100) * months;
    const nextPx = Math.max(
      MIN_MONTH_PX,
      Math.min(
        MAX_MONTH_PX,
        scroller.clientWidth / Math.max(1 / 31, visibleMonths),
      ),
    );
    pendingScroll.current = { type: "pct", pct: newLeft };
    // With the hours pane open the scale is shared, so let React own it.
    if (showAllocRef.current) {
      setMonthPx(nextPx);
      return;
    }
    liveMonthPxRef.current = nextPx;
    scaleRef.current = makeGanttXScale(
      winStartRef.current,
      months,
      nextPx,
      grainRef.current,
    );
    monthPxRef.current = nextPx;
    if (spacerRef.current) {
      spacerRef.current.style.width = `${scaleRef.current.width}px`;
    }
    scroller.scrollLeft = (newLeft / 100) * (scaleRef.current.width || 1);
    timelineCanvasRef.current?.paint();
    timescaleCanvasRef.current?.paint();
    syncChrome();
  }, [months, syncChrome]);

  useLayoutEffect(() => {
    function onMove(e: PointerEvent) {
      const drag = dragRef.current;
      const wrap = minimapWrapRef.current;
      const scroller = bodyRef.current || allocScrollRef.current;
      if (!drag || !wrap || !scroller) return;
      if (drag.mode === "move") {
        const rect = wrap.getBoundingClientRect();
        const deltaPct = ((e.clientX - drag.startX) / rect.width) * 100;
        const bodyW = scaleRef.current.width || 1;
        const newLeft = Math.max(
          0,
          Math.min(100 - drag.startWidthPct, drag.startLeftPct + deltaPct),
        );
        scroller.scrollLeft = (newLeft / 100) * bodyW;
        syncChrome();
        return;
      }
      zoomPtRef.current = { clientX: e.clientX };
      if (!zoomRaf.current) {
        zoomRaf.current = window.requestAnimationFrame(() => {
          zoomRaf.current = 0;
          applyZoomFrame();
        });
      }
    }
    function onUp() {
      if (zoomRaf.current) {
        window.cancelAnimationFrame(zoomRaf.current);
        zoomRaf.current = 0;
      }
      zoomPtRef.current = null;
      dragRef.current = null;
      // Hand the live scale back to React once, on release.
      const live = liveMonthPxRef.current;
      liveMonthPxRef.current = null;
      if (live !== null) setMonthPx(live);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [syncChrome, applyZoomFrame]);

  useLayoutEffect(() => {
    function onMove(e: PointerEvent) {
      const drag = splitDragRef.current;
      if (!drag) return;
      const next = Math.min(
        ALLOC_H_MAX,
        Math.max(ALLOC_H_MIN, drag.startH + (drag.startY - e.clientY)),
      );
      allocHRef.current = next;
      const el = allocPaneRef.current;
      if (el) {
        el.style.height = `${next}px`;
        el.style.flex = "0 0 auto";
      }
    }
    function onUp() {
      if (!splitDragRef.current) return;
      splitDragRef.current = null;
      setAllocH(allocHRef.current);
      try {
        window.localStorage.setItem(ALLOC_H_KEY, String(allocHRef.current));
      } catch {
        /* ignore quota */
      }
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  /** One frame of a due-date drag: snap the date, move the tip and the dot. */
  const applyMarkerDragFrame = useCallback(() => {
    const md = markerDragRef.current;
    const pt = dragPtRef.current;
    if (!md || !pt || !md.dragging) return;
    const deltaX = pt.x - md.startX;
    const windowStart = winStartRef.current;
    const maxIdx = months - 1;
    const sc = scaleRef.current;
    const baseC = idxDayToContinuous(md.baseIdx, md.baseDay, windowStart);
    const baseX = continuousToChartX(sc, baseC);
    let raw = chartXToContinuous(sc, baseX + deltaX);
    raw = Math.max(0, Math.min(maxIdx, raw));
    const rawIdx = Math.min(maxIdx, Math.floor(raw));
    const { y, m0 } = idxToYm(rawIdx, windowStart);
    const dim = daysInMonth(y, m0 + 1);
    const rawDay = Math.min(
      dim,
      Math.max(1, Math.round((raw - rawIdx) * dim) + 1),
    );
    const snapped = rollupToEndOfWeek(rawIdx, rawDay, windowStart);
    md.candidateIdx = snapped.idx;
    md.candidateDay = snapped.day;
    const snappedC = idxDayToContinuous(snapped.idx, snapped.day, windowStart);
    const shiftPx = continuousToChartX(sc, snappedC) - baseX;
    dragShiftRef.current = { key: markerPaintKey(md.marker), px: shiftPx };
    const tip = dragTipRef.current;
    if (tip) {
      tip.textContent = `Due: Week ending ${idxDayToShortDateLabel(snapped.idx, snapped.day, windowStart)}`;
      tip.style.left = `${pt.x + 14}px`;
      tip.style.top = `${pt.y - 10}px`;
      tip.style.display = "block";
    }
    const overlay = dragOverlayRef.current;
    if (overlay && md.cy !== null && md.theme) {
      md.overlayRect = paintGanttMarkerOverlay(overlay, {
        camera: cameraRef.current,
        scale: sc,
        winStart: windowStart,
        marker: md.marker,
        cy: md.cy,
        shiftPx,
        theme: md.theme,
        clear: md.overlayRect,
      });
    }
  }, [months]);

  useLayoutEffect(() => {
    function onMove(e: PointerEvent) {
      const md = markerDragRef.current;
      if (md) {
        if (!md.canDrag) return;
        if (!md.dragging) {
          if (Math.abs(e.clientX - md.startX) < 4) return;
          if (!md.armed) {
            // Moved off the mark before the drag armed: this is a pan, not a
            // date change. Hand the gesture over so the flick stays continuous.
            markerDragRef.current = null;
            disarmMarker();
            panRef.current = {
              mode: "both",
              startX: md.startX,
              startY: md.startY,
              startLeft: md.startLeft,
              startTop: md.startTop,
            };
            panRootRef.current?.classList.add("is-panning");
            return;
          }
          md.dragging = true;
          document.body.style.cursor = MARKER_ARMED_CURSOR;
          // Take this one marker out of the scene and paint it on the overlay
          // instead, so moving it never touches the rest of the picture.
          if (md.cy !== null) {
            md.theme = readGanttPaintTheme(dragOverlayRef.current);
            hideKeyRef.current = markerPaintKey(md.marker);
            timelineCanvasRef.current?.paint();
          }
        }
        dragPtRef.current = { x: e.clientX, y: e.clientY };
        if (!dragRaf.current) {
          dragRaf.current = window.requestAnimationFrame(() => {
            dragRaf.current = 0;
            applyMarkerDragFrame();
          });
        }
        return;
      }
      const pan = panRef.current;
      if (!pan) return;
      const bv = bodyRef.current || allocScrollRef.current;
      if (!bv) return;
      if (pan.mode !== "y") {
        const nextLeft = pan.startLeft - (e.clientX - pan.startX);
        bv.scrollLeft = nextLeft;
        if (bodyRef.current && allocScrollRef.current && bv === bodyRef.current) {
          syncingH.current = true;
          allocScrollRef.current.scrollLeft = nextLeft;
          syncingH.current = false;
        } else if (
          bodyRef.current &&
          allocScrollRef.current &&
          bv === allocScrollRef.current
        ) {
          syncingH.current = true;
          bodyRef.current.scrollLeft = nextLeft;
          syncingH.current = false;
        }
      }
      if (pan.mode !== "x" && bodyRef.current) {
        bodyRef.current.scrollTop =
          pan.startTop - (e.clientY - pan.startY);
      }
      syncChrome();
    }
    function onUp() {
      const md = markerDragRef.current;
      if (md) {
        // Settle on the last pointer position before reading the date.
        if (dragRaf.current) {
          window.cancelAnimationFrame(dragRaf.current);
          dragRaf.current = 0;
          applyMarkerDragFrame();
        }
        dragPtRef.current = null;
        document.body.style.cursor = "";
        disarmMarker();
        const tip = dragTipRef.current;
        if (tip) tip.style.display = "none";
        const saving =
          md.canDrag &&
          md.dragging &&
          md.candidateIdx !== null &&
          md.candidateDay !== null;
        clearGanttOverlay(dragOverlayRef.current, md.overlayRect);
        hideKeyRef.current = null;
        if (saving) {
          // Keep drawing this marker at the dropped spot until the saved date
          // arrives. Every repaint in between shows the same picture, so there
          // is nothing to snap back to.
          pendingDropRef.current = {
            markersSeen: markersByRowRef.current,
            rowKey: `${md.marker.damId}-${md.marker.laneCode}`,
          };
          setSavingRowKey(`${md.marker.damId}-${md.marker.laneCode}`);
          if (dropTimer.current) clearTimeout(dropTimer.current);
          dropTimer.current = setTimeout(settleDrop, 4000);
        } else {
          dragShiftRef.current = null;
        }
        if (
          md.canDrag &&
          md.dragging &&
          md.candidateIdx !== null &&
          md.candidateDay !== null
        ) {
          const current = storeRef.current;
          const windowStart = winStartRef.current;
          const { y, m0 } = idxToYm(md.candidateIdx, windowStart);
          const demo = loadOccurrenceEffortDemo(
            current,
            md.marker.damId,
            md.marker.laneCode,
            md.marker.procDueIdx,
          );
          const shifted = setMilestoneDue(
            demo,
            { y, m: m0 + 1, d: md.candidateDay },
            { alwaysShift: true },
          );
          onChangeRef.current(
            writeOccurrenceEffortDemo(
              current,
              md.marker.damId,
              md.marker.laneCode,
              md.marker.procDueIdx,
              shifted,
            ),
          );
        } else if (!md.dragging) {
          setOpen(md.marker);
        }
        markerDragRef.current = null;
        timelineCanvasRef.current?.paint();
      }
      if (panRef.current) {
        panRef.current = null;
        panRootRef.current?.classList.remove("is-panning");
      }
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [months, syncChrome, applyMarkerDragFrame, settleDrop]);

  function jumpToday() {
    pendingScroll.current = { type: "idx-center", idx: tIdx };
    syncChrome();
    const bv = bodyRef.current;
    if (bv) {
      bv.scrollLeft = todayChartX(scaleRef.current) - bv.clientWidth / 2;
      syncChrome();
    }
  }

  function jumpToFirstDue() {
    if (!showGantt) {
      setShowGantt(true);
      return;
    }
    const pairSet = new Set(pairs.map((p) => `${p.dam.id}|${p.lane.code}`));
    const candidates = markers
      .filter((m) => {
        if (m.kind === "completed" || m.kind === "notRequired") return false;
        if (!pairSet.has(`${m.damId}|${m.laneCode}`)) return false;
        if (dueBeforeIdx !== null && m.displayDueIdx > dueBeforeIdx) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.displayDueIdx !== b.displayDueIdx) {
          return a.displayDueIdx - b.displayDueIdx;
        }
        return (a.dueDay ?? 0) - (b.dueDay ?? 0);
      });
    const first = candidates[0];
    if (!first) return;

    const headingKey =
      mode === "flat"
        ? null
        : mode === "dam-obl"
          ? `dam:${first.damId}`
          : `lane:${first.laneCode}`;
    if (headingKey && collapsed[headingKey]) {
      setCollapsed((cur) => ({ ...cur, [headingKey]: false }));
      setAllCollapsed(false);
    }

    let top = 0;
    let found = false;
    for (const it of items) {
      if (
        it.type === "row" &&
        it.damId === first.damId &&
        it.laneCode === first.laneCode
      ) {
        found = true;
        break;
      }
      top += it.h;
    }
    const sc = scaleRef.current;
    const cx = markerDueX(first, sc, win.start);
    pendingScroll.current = {
      type: "xy",
      x: cx,
      y: found ? top + laneH / 2 : 0,
    };
    const bv = bodyRef.current;
    if (bv) {
      bv.scrollLeft = Math.max(0, cx - bv.clientWidth / 2);
      if (found) {
        bv.scrollTop = Math.max(0, top - bv.clientHeight / 2 + laneH / 2);
      }
      syncChrome();
    }
    const pulse = `${first.damId}-${first.laneCode}-${first.procDueIdx}`;
    setPulseKey(pulse);
    const damName =
      store.dams.find((d) => d.id === first.damId)?.name || first.damId;
    const laneLabel =
      store.lanes.find((l) => l.code === first.laneCode)?.label || first.laneCode;
    setPulseToast(`First due · ${damName} · ${laneLabel}`);
    if (pulseTimer.current) clearTimeout(pulseTimer.current);
    pulseTimer.current = setTimeout(() => {
      setPulseKey(null);
      setPulseToast(null);
    }, 4000);
  }

  function jumpToFY(endYear: number) {
    const bv = bodyRef.current;
    const startIdx = Math.max(0, fyStartIdx(endYear, win.start));
    const viewportW = bv?.clientWidth || 900;
    const nextPx = Math.max(MIN_MONTH_PX, Math.min(MAX_MONTH_PX, viewportW / 12));
    // Already at "12 months fill the pane" — this is only a camera move. The
    // tolerance absorbs a scrollbar appearing, which nudges clientWidth.
    if (bv && Math.abs(monthPxRef.current * 12 - viewportW) <= 24) {
      bv.scrollLeft = monthStartX(scaleRef.current, startIdx);
      syncChrome();
      return;
    }
    pendingScroll.current = { type: "idx-start", idx: startIdx };
    setMonthPx(nextPx);
    if (bv) {
      bv.scrollLeft = monthStartX(scaleRef.current, startIdx);
      syncChrome();
    }
  }

  // Coming back to the tab: put the camera back where it was and do not
  // re-land on this FY.
  useLayoutEffect(() => {
    const v = viewRef?.current;
    if (!v?.landed || viewRestored.current) return;
    viewRestored.current = true;
    fyLanded.current = true;
    const x = v.camX ?? 0;
    const y = v.camY ?? 0;
    pendingScroll.current = { type: "exact", x, y };
    let id = 0;
    let tries = 0;
    const apply = () => {
      const bv = bodyRef.current;
      if (bv && bv.clientWidth >= 40) {
        pendingScroll.current = null;
        bv.scrollLeft = x;
        bv.scrollTop = y;
        syncChrome();
        return;
      }
      if (tries++ > 60) return;
      id = window.requestAnimationFrame(apply);
    };
    apply();
    return () => window.cancelAnimationFrame(id);
  }, [viewRef, syncChrome]);

  // Land on the current FY at FY zoom, retrying until the pane has a width, so
  // the first FY label pressed is already just a camera move.
  useLayoutEffect(() => {
    if (!chartReady || !showGantt || fyLanded.current) return;
    let id = 0;
    let tries = 0;
    const tryLand = () => {
      if (fyLanded.current) return;
      const bv = bodyRef.current;
      if (bv && bv.clientWidth >= 40) {
        fyLanded.current = true;
        jumpToFY(currentFyEndYear());
        return;
      }
      if (tries++ > 60) return;
      id = window.requestAnimationFrame(tryLand);
    };
    tryLand();
    return () => window.cancelAnimationFrame(id);
  }, [chartReady, showGantt]);

  function zoomXBy(dir: number) {
    const bv = bodyRef.current;
    const oldW = scaleRef.current.width || 1;
    const frac = bv
      ? (bv.scrollLeft + bv.clientWidth / 2) / oldW
      : 0;
    const nearest = ZOOM_X.reduce(
      (best, cur, i) =>
        Math.abs(cur - monthPx) < Math.abs(ZOOM_X[best] - monthPx) ? i : best,
      0,
    );
    const next = Math.min(ZOOM_X.length - 1, Math.max(0, nearest + dir));
    pendingScroll.current = { type: "frac", frac };
    setMonthPx(ZOOM_X[next]);
  }

  function zoomYBy(dir: number) {
    const nearest = ZOOM_Y.reduce(
      (best, cur, i) =>
        Math.abs(cur - zoomY) < Math.abs(ZOOM_Y[best] - zoomY) ? i : best,
      0,
    );
    setZoomY(ZOOM_Y[Math.min(ZOOM_Y.length - 1, Math.max(0, nearest + dir))]);
  }

  function resetView() {
    setDamFilter(store.dams.map((d) => d.id));
    setLaneFilter(store.lanes.map((l) => l.code));
    setDueBeforeIdx(null);
    setOnlyOngoing(false);
    setScheduleFilter(null);
    setPanel(null);
    setGroupMode("dam-obl");
    setFlatMode(false);
    setCollapsed({});
    setAllCollapsed(false);
    setZoomY(1);
    const bv = bodyRef.current;
    const viewportW = bv?.clientWidth || 900;
    pendingScroll.current = { type: "idx-center", idx: tIdx };
    setMonthPx(Math.max(MIN_MONTH_PX, Math.min(MAX_MONTH_PX, viewportW / 24)));
  }

  function toggleFlat() {
    startReshape(() => {
      setFlatMode((v) => !v);
      setCollapsed({});
      setAllCollapsed(false);
    });
  }

  function toggleGroupAxis() {
    if (flatMode) return;
    startReshape(() => {
      setGroupMode((m) => (m === "dam-obl" ? "obl-dam" : "dam-obl"));
      setCollapsed({});
      setAllCollapsed(false);
    });
  }

  function toggleCollapseAll() {
    if (flatMode) return;
    startReshape(() => {
      if (allCollapsed) {
        setCollapsed({});
        setAllCollapsed(false);
      } else {
        const keys = headingKeys(pairs, groupMode);
        setCollapsed(Object.fromEntries(keys.map((k) => [k, true])));
        setAllCollapsed(true);
      }
    });
  }

  function toggleHeading(key: string) {
    startReshape(() => {
      setCollapsed((cur) => ({ ...cur, [key]: !cur[key] }));
    });
  }

  function openLeaf(item: Extract<GanttLayoutItem, { type: "row" }>) {
    const dam = store.dams.find((d) => d.id === item.damId);
    const lane = store.lanes.find((l) => l.code === item.laneCode);
    if (!dam || !lane || !item.chip) return;
    const st = occurrenceStatus(store, dam, lane, item.chip.procDueIdx);
    setOpen({
      damId: dam.id,
      damName: dam.name,
      laneCode: lane.code,
      laneLabel: lane.label,
      color: lane.color,
      procDueIdx: item.chip.procDueIdx,
      displayDueIdx: st.displayDueIdx,
      dueDay: item.chip.dueDay,
      leadStart: st.displayLeadStart,
      kind: planStatusKind(
        isScheduled(store, dam, lane, item.chip.procDueIdx),
        isCompleted(store, dam, lane, item.chip.procDueIdx),
        isUserNotRequired(store, dam, lane, item.chip.procDueIdx),
      ),
      bucket: st.status,
    });
  }

  function confirmRecalcRow(damId: string, laneCode: string, damName: string, laneLabel: string) {
    if (
      !confirm(
        `Recalculate future inspections for ${damName} · ${laneLabel}?\n\nUses this row’s next known due as the cycle origin (not-required is skipped). Scheduled and completed stay. Not-required slots move with the cycle and may become required. Hidden predicted occurrences return. Predicted futures are replaced.`,
      )
    ) {
      return;
    }
    onChange(recalculateRow(store, damId, laneCode));
  }

  function RecalcBtn({
    damId,
    laneCode,
    damName,
    laneLabel,
    stale,
  }: {
    damId: string;
    laneCode: string;
    damName: string;
    laneLabel: string;
    stale: boolean;
  }) {
    return (
      <button
        type="button"
        className={`mrt-gantt-recalc${stale ? " is-stale" : ""}`}
        title={
          stale
            ? "Saved due is off the cycle origin — recalculate to rebase later dates"
            : "Recalculate this row from the next known due date"
        }
        onClick={(e) => {
          e.stopPropagation();
          confirmRecalcRow(damId, laneCode, damName, laneLabel);
        }}
      >
        ↺
      </button>
    );
  }

  function captureCamera() {
    const bv = bodyRef.current;
    if (!bv) return;
    const dpr = devicePx();
    cameraRef.current = {
      x: quantisePx(bv.scrollLeft, dpr),
      y: quantisePx(bv.scrollTop, dpr),
      w: bv.clientWidth || cameraRef.current.w,
      h: bv.clientHeight || cameraRef.current.h,
    };
  }

  function markerAtPointer(clientX: number, clientY: number) {
    const bv = bodyRef.current;
    if (!bv) return null;
    captureCamera();
    const { worldX, worldY } = worldFromClient(
      clientX,
      clientY,
      bv.getBoundingClientRect(),
      cameraRef.current,
    );
    return hitTestGanttMarker({
      worldX,
      worldY,
      items: itemsRef.current,
      markersByRow: markersByRowRef.current,
      scale: scaleRef.current,
      winStart: winStartRef.current,
      dueBeforeIdx: dueBeforeIdxRef.current,
      showSummarised: showSummarisedRef.current,
      drag: dragShiftRef.current,
    });
  }

  function applyHoverCursor(clientX: number, clientY: number) {
    const bv = bodyRef.current;
    if (!bv || panRef.current || markerDragRef.current) return;
    const m = markerAtPointer(clientX, clientY);
    bv.title = m ? markerHoverTitle(m, winStartRef.current) : "";
    if (!m) {
      bv.style.cursor = "grab";
      return;
    }
    bv.style.cursor =
      m.kind === "completed" || readOnly ? "default" : "pointer";
  }

  function startMarkerPointer(
    e: ReactPointerEvent,
    m: GanttMarker,
  ) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const day = m.dueDay ?? defaultDueDayForIdx(m.displayDueIdx, win.start);
    const bv = bodyRef.current;
    markerDragRef.current = {
      marker: m,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: bv?.scrollLeft ?? 0,
      startTop: bv?.scrollTop ?? 0,
      downT: performance.now(),
      armed: false,
      dragging: false,
      canDrag: m.kind !== "completed" && !readOnly,
      baseIdx: m.displayDueIdx,
      baseDay: day,
      candidateIdx: null,
      candidateDay: null,
      cy: rowCenterForMarker(m),
      overlayRect: null,
      theme: null,
    };
    // Arm the drag after the wait and say so with the cursor.
    if (armTimer.current) clearTimeout(armTimer.current);
    if (m.kind !== "completed" && !readOnly) {
      armTimer.current = setTimeout(() => {
        armTimer.current = null;
        const md = markerDragRef.current;
        if (!md || md.dragging) return;
        md.armed = true;
        if (bodyRef.current) {
          bodyRef.current.style.cursor = MARKER_ARMED_CURSOR;
        }
      }, MARKER_HOLD_MS);
    }
  }

  function disarmMarker() {
    if (armTimer.current) {
      clearTimeout(armTimer.current);
      armTimer.current = null;
    }
    if (bodyRef.current) bodyRef.current.style.cursor = "grab";
  }

  /** World y of the row (or collapsed heading) a marker is painted on. */
  function rowCenterForMarker(m: GanttMarker) {
    for (const it of itemsRef.current) {
      if (
        it.type === "row" &&
        it.damId === m.damId &&
        it.laneCode === m.laneCode
      ) {
        return it.top + it.h / 2;
      }
      if (
        it.type === "heading" &&
        it.collapsed &&
        showSummarisedRef.current &&
        it.children.some(
          (c) => c.damId === m.damId && c.laneCode === m.laneCode,
        )
      ) {
        return it.top + it.h / 2;
      }
    }
    return null;
  }

  function startPan(
    e: ReactPointerEvent,
    mode: "x" | "y" | "both",
  ) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (
      target.closest("[data-gantt-marker]") ||
      target.closest("[data-minimap-window]") ||
      target.closest("[data-mrt-alloc-over]") ||
      target.closest("[data-mrt-alloc-pop]") ||
      target.closest("[data-mrt-alloc-name-link]") ||
      target.closest("input") ||
      target.closest("select") ||
      target.closest("label")
    ) {
      return;
    }
    // Empty Resource Hours cells are disabled buttons — still allow pan there.
    if (
      target.closest("button") &&
      !target.closest(".mrt-alloc-cell")
    ) {
      return;
    }
    const bv = bodyRef.current || allocScrollRef.current;
    if (!bv) return;
    e.preventDefault();
    panRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: bv.scrollLeft,
      startTop: bv.scrollTop,
    };
    panRootRef.current?.classList.add("is-panning");
  }

  function startMinimapDrag(
    mode: "move" | "left" | "right",
    e: ReactPointerEvent,
  ) {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      mode,
      startX: e.clientX,
      startLeftPct: minimapRef.current.leftPct,
      startWidthPct: minimapRef.current.widthPct,
    };
  }

  function clickMinimap(e: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-minimap-window]")) return;
    const wrap = minimapWrapRef.current;
    const scroller = bodyRef.current || allocScrollRef.current;
    if (!wrap || !scroller) return;
    const rect = wrap.getBoundingClientRect();
    const clickPct = ((e.clientX - rect.left) / rect.width) * 100;
    const w = minimapRef.current.widthPct;
    const newLeft = Math.max(0, Math.min(100 - w, clickPct - w / 2));
    scroller.scrollLeft = (newLeft / 100) * width;
    syncChrome();
  }

  function onAllocScrollLeft(left: number) {
    if (syncingH.current) return;
    const bv = bodyRef.current;
    if (bv) {
      if (Math.abs(bv.scrollLeft - left) > 0.5) {
        syncingH.current = true;
        bv.scrollLeft = left;
        syncingH.current = false;
      }
      return;
    }
    const el = allocScrollRef.current;
    if (!el) return;
    const bodyW = scaleRef.current.width || 1;
    const leftPct = Math.max(0, Math.min(100, (left / bodyW) * 100));
    const widthPct = Math.max(
      1.5,
      Math.min(100, (el.clientWidth / bodyW) * 100),
    );
    minimapRef.current = { leftPct, widthPct };
    const thumb = minimapThumbRef.current;
    if (thumb) {
      thumb.style.left = `${leftPct}%`;
      thumb.style.width = `${widthPct}%`;
    }
  }

  function toggleSplitscreen() {
    if (showGantt && showAlloc) {
      setShowAlloc(false);
      return;
    }
    if (showGantt && !showAlloc) {
      setAllocLoading(true);
      allocSliceRef.current = "";
      setShowAlloc(true);
      return;
    }
    setShowGantt(true);
  }

  function openContribution(c: LoadContribution) {
    const marker = markers.find(
      (m) =>
        m.damId === c.damId &&
        m.laneCode === c.laneCode &&
        m.procDueIdx === c.procDueIdx,
    );
    if (marker) setOpen(marker);
  }

  function openRebalance(contributions: LoadContribution[], personId: string) {
    setRebalance({ contributions, personId });
  }

  function startSplitDrag(e: ReactPointerEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    splitDragRef.current = { startY: e.clientY, startH: allocHRef.current };
  }

  const grouped = !flatMode;

  function toggleRowSort(key: GanttSortKey) {
    setRowSort((cur) => {
      if (cur?.key === key) return { key, dir: cur.dir === 1 ? -1 : 1 };
      return { key, dir: 1 };
    });
  }

  function sortMark(key: GanttSortKey) {
    if (rowSort?.key !== key) return "";
    return rowSort.dir === 1 ? " ▲" : " ▼";
  }

  const bothPanes = showGantt && showAlloc;

  return (
    <div ref={panRootRef} className="mrt-gantt-pan relative flex min-h-0 flex-1 flex-col">
      {pulseToast ? (
        <div className="mrt-gantt-focus-toast" role="status">
          {pulseToast}
        </div>
      ) : null}
      <PageIntro>
        Regulator cycles on a timeline — drag a due, then Recalc so later dates
        keep that week-ending.
      </PageIntro>
      <div className="mrt-chrome-row mb-1 text-sm" data-mrt-overlay>
        <div className="mrt-chrome-group">
          <button
            type="button"
            className={`mrt-chrome-btn ${bothPanes ? "on" : ""}`}
            onClick={toggleSplitscreen}
            title={
              bothPanes
                ? "Hide hours heatmap"
                : showAlloc
                  ? "Show Gantt again"
                  : "Show hours heatmap under the Gantt"
            }
          >
            <span className="mrt-chrome-ico" aria-hidden>⧉</span>
            Split
          </button>
          <button
            type="button"
            className="mrt-chrome-btn"
            onClick={jumpToday}
            title="Jump to today"
          >
            <span className="mrt-chrome-ico" aria-hidden>●</span>
            Today
          </button>
          <button
            type="button"
            className="mrt-chrome-btn"
            onClick={resetView}
            title="Reset view"
          >
            <span className="mrt-chrome-ico" aria-hidden>↺</span>
            Reset
          </button>
        </div>
        <div className="mrt-chrome-group">
          <button
            type="button"
            className={`mrt-chrome-btn ${grain === "week" ? "on" : ""}`}
            onClick={() => setGrain("week")}
            title="Week cells"
          >
            Weeks
          </button>
          <button
            type="button"
            className={`mrt-chrome-btn ${grain === "month" ? "on" : ""}`}
            onClick={() => setGrain("month")}
            title="Month cells"
          >
            Months
          </button>
        </div>
        <div className="mrt-chrome-group">
          <div className="mrt-overlay-anchor">
            <button
              type="button"
              className={`mrt-chrome-btn ${panel === "dam" || damFilter.length !== store.dams.length ? "open" : ""}`}
              onClick={() => setPanel(panel === "dam" ? null : "dam")}
              title="Filter assets"
            >
              <span className="mrt-chrome-ico" aria-hidden>⌂</span>
              Asset{damFilter.length !== store.dams.length ? ` (${damFilter.length})` : ""}
            </button>
            {panel === "dam" ? (
              <div className="mrt-overlay-pop">
                <FilterChecklist
                  items={store.dams.map((d) => ({ id: d.id, label: d.name }))}
                  selected={damFilter}
                  onChange={(next) => startReshape(() => setDamFilter(next))}
                />
              </div>
            ) : null}
          </div>
          <div className="mrt-overlay-anchor">
            <button
              type="button"
              className={`mrt-chrome-btn ${panel === "type" || laneFilter.length !== store.lanes.length ? "open" : ""}`}
              onClick={() => setPanel(panel === "type" ? null : "type")}
              title="Filter obligation types"
            >
              <span className="mrt-chrome-ico" aria-hidden>#</span>
              Type{laneFilter.length !== store.lanes.length ? ` (${laneFilter.length})` : ""}
            </button>
            {panel === "type" ? (
              <div className="mrt-overlay-pop">
                <FilterChecklist
                  items={store.lanes.map((l) => ({
                    id: l.code,
                    label: `${l.code} ${l.label}`,
                  }))}
                  selected={laneFilter}
                  onChange={(next) => startReshape(() => setLaneFilter(next))}
                />
              </div>
            ) : null}
          </div>
          <div className="mrt-overlay-anchor">
            <button
              type="button"
              className={`mrt-chrome-btn ${panel === "due" || dueBeforeIdx !== null ? "open" : ""}`}
              onClick={() => setPanel(panel === "due" ? null : "due")}
              title="Show incomplete occurrences due on or before a month"
            >
              <span className="mrt-chrome-ico" aria-hidden>▾</span>
              Due{dueBeforeIdx !== null ? " · set" : ""}
            </button>
            {panel === "due" ? (
              <div className="mrt-overlay-pop">
                <DueBeforePanel
                  months={months}
                  winStart={win.start}
                  dueBeforeIdx={dueBeforeIdx}
                  onChange={setDueBeforeIdx}
                />
              </div>
            ) : null}
          </div>
        </div>
        <div className="mrt-chrome-group">
          <button
            type="button"
            className={`mrt-chrome-btn ${onlyOngoing ? "on" : ""}`}
            onClick={() => setOnlyOngoing((v) => !v)}
            title="Show only ongoing"
          >
            Ongoing
          </button>
          <button
            type="button"
            className={`mrt-chrome-btn ${scheduleFilter === "scheduled" ? "on" : ""}`}
            onClick={() =>
              setScheduleFilter((v) => (v === "scheduled" ? null : "scheduled"))
            }
            title="Scheduled only"
          >
            Sched
          </button>
          <button
            type="button"
            className={`mrt-chrome-btn ${scheduleFilter === "predicted" ? "on" : ""}`}
            onClick={() =>
              setScheduleFilter((v) => (v === "predicted" ? null : "predicted"))
            }
            title="Predicted only"
          >
            Pred
          </button>
          <button
            type="button"
            className={`mrt-chrome-btn ${hideEmptyOnScreen ? "on" : ""}`}
            onClick={() => setHideEmptyOnScreen((v) => !v)}
            title="Hide rows with no work in the current timescale view"
          >
            On screen
          </button>
          <button
            type="button"
            className="mrt-chrome-btn"
            onClick={() => jumpToFirstDue()}
            title="Jump to earliest filtered obligation"
          >
            First due
          </button>
        </div>
        <div className="mrt-chrome-group">
          <div className="mrt-overlay-anchor">
            <button
              type="button"
              className={`mrt-chrome-btn ${panel === "legend" ? "open" : ""}`}
              onClick={() => setPanel(panel === "legend" ? null : "legend")}
              title="Obligation types and marker styles"
            >
              <span className="mrt-chrome-ico" aria-hidden>■</span>
              Legend
            </button>
            {panel === "legend" ? (
              <div className="mrt-overlay-pop is-legend">
                <div className="mb-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
                  {store.lanes.map((l) => (
                    <span key={l.code} className="inline-flex items-center gap-1.5">
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: l.color }}
                      />
                      <span className="truncate" title={l.label}>
                        {l.code} · {l.label}
                      </span>
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3 border-t border-[var(--border)] pt-2 text-[11px] text-[var(--muted)]">
                  <span className="inline-flex items-center gap-1">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--surface)]"
                      style={{ border: "1px dashed var(--ink)" }}
                    />
                    Predicted
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block h-2.5 w-2.5 rounded-full border border-[var(--ink)] bg-[var(--ink)]" />
                    Scheduled
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block h-2.5 w-2.5 rounded-full border border-[var(--muted)] bg-[var(--muted)]" />
                    Completed
                  </span>
                </div>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="mrt-chrome-btn"
            disabled
            title="Parked — Baseline and Actuals capturing will be investigated together later"
          >
            Base {String(storeBaseline(store).d).padStart(2, "0")}-
            {MONTH_NAMES[storeBaseline(store).m - 1]}-
            {String(storeBaseline(store).y).slice(2)}
          </button>
        </div>
      </div>

      <div className="mrt-gantt-top mb-1">
        <div className="mrt-gantt-tools rounded-md border border-[var(--border)]">
          <button
            type="button"
            className="mrt-gantt-tool"
            disabled={!grouped}
            onClick={toggleGroupAxis}
            title="Switch between grouping by Dam or by Obligation"
          >
            ⇄ {groupMode === "obl-dam" ? "Obl/Dam" : "Dam/Obl"}
          </button>
          <button
            type="button"
            className={`mrt-gantt-tool ${flatMode ? "on" : ""}`}
            onClick={toggleFlat}
            title="Flatten to an ungrouped list"
          >
            Flatten
          </button>
          <button
            type="button"
            className="mrt-gantt-tool"
            disabled={!grouped}
            onClick={toggleCollapseAll}
            title="Collapse or expand all groups"
          >
            {allCollapsed ? "Expand" : "Collapse"}
          </button>
          <button
            type="button"
            className={`mrt-gantt-tool ${showSummarised ? "on" : ""}`}
            disabled={!grouped}
            onClick={() => setShowSummarised((v) => !v)}
            title="When a group is collapsed, plot child markers on the heading row"
          >
            Summarised
          </button>
        </div>
        <div className="mrt-zoom-chip" title="Horizontal zoom">
          <div className="mrt-zoom-chip-title">Timescale</div>
          <div className="mrt-zoom-chip-row">
            <button type="button" aria-label="Zoom out timescale" onClick={() => zoomXBy(-1)}>
              −
            </button>
            <span className="mrt-zoom-chip-val">
              {Math.round((monthPx / BASE_MONTH_PX) * 100)}%
            </span>
            <button type="button" aria-label="Zoom in timescale" onClick={() => zoomXBy(1)}>
              +
            </button>
          </div>
        </div>
        <div className="mrt-zoom-chip" title="Row height">
          <div className="mrt-zoom-chip-title">Rows</div>
          <div className="mrt-zoom-chip-row">
            <button type="button" aria-label="Decrease row height" onClick={() => zoomYBy(-1)}>
              −
            </button>
            <span className="mrt-zoom-chip-val">
              {Math.round(zoomY * 100)}%
            </span>
            <button type="button" aria-label="Increase row height" onClick={() => zoomYBy(1)}>
              +
            </button>
          </div>
        </div>
        <div className="relative min-h-9 min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-3">
            {fys.map((fy) => (
              <button
                key={fy.endYear}
                type="button"
                className="pointer-events-auto absolute top-0 -translate-x-1/2 border-0 bg-transparent p-0 text-[9px] text-[var(--muted)] hover:underline"
                style={{ left: `${fy.centerPct}%` }}
                title={`Zoom to FY${fy.endYear} (1 Jul ${fy.endYear - 1} – 30 Jun ${fy.endYear})`}
                onClick={() => jumpToFY(fy.endYear)}
              >
                FY{String(fy.endYear).slice(2)}
              </button>
            ))}
          </div>
          <div
            ref={minimapWrapRef}
            className="relative mt-3 h-7 overflow-hidden rounded-[6px] border border-[var(--border)] bg-[var(--surface-muted)]"
            onPointerDown={clickMinimap}
          >
            {yearTicks.map((tick) => (
              <div key={tick.y}>
                <div
                  className="absolute top-0 bottom-0 w-px bg-[var(--border)]"
                  style={{ left: `${tick.pct}%` }}
                />
                <div
                  className="absolute top-0.5 text-[9px] whitespace-nowrap text-[var(--muted)]"
                  style={{ left: `calc(${tick.pct}% + 3px)` }}
                >
                  {tick.y}
                </div>
              </div>
            ))}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-[var(--rag-red)]"
              style={{ left: `${(tIdx / months) * 100}%` }}
            />
            <div
              ref={minimapThumbRef}
              data-minimap-window
              className="absolute top-0 bottom-0 cursor-grab border-[1.5px] border-[#1f4e78] bg-[rgba(31,78,120,0.18)] active:cursor-grabbing"
              style={{ left: "0%", width: "12%" }}
              onPointerDown={(e) => startMinimapDrag("move", e)}
            >
              <div
                className="absolute top-0 bottom-0 -left-0.5 w-2 cursor-ew-resize bg-[#1f4e78] opacity-75"
                onPointerDown={(e) => startMinimapDrag("left", e)}
              />
              <div
                className="absolute top-0 bottom-0 -right-0.5 w-2 cursor-ew-resize bg-[#1f4e78] opacity-75"
                onPointerDown={(e) => startMinimapDrag("right", e)}
              />
            </div>
          </div>
        </div>
      </div>

      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--surface)]"
        style={{ minHeight: 280 }}
      >
        {showGantt ? (
        <div
          className="relative min-h-0 flex-1 overflow-hidden"
          style={{
            display: "grid",
            gridTemplateColumns: `${labelW}px minmax(0, 1fr)`,
            gridTemplateRows: `${headerH}px minmax(0, 1fr)`,
            minHeight: 200,
          }}
        >
        <div className="flex border-r border-b border-[var(--border)] bg-[var(--surface-muted)] text-[11px] font-semibold">
          {flatMode ? (
            <>
              <button
                type="button"
                className="flex flex-1 cursor-pointer items-center px-2 text-left"
                onClick={() => toggleRowSort("dam")}
              >
                Dam{sortMark("dam")}
              </button>
              <button
                type="button"
                className="flex flex-1 cursor-pointer items-center px-2 text-left"
                onClick={() => toggleRowSort("obligation")}
              >
                Obligation{sortMark("obligation")}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="flex min-w-0 flex-1 cursor-pointer items-center px-2 text-left"
              onClick={() =>
                toggleRowSort(groupMode === "dam-obl" ? "dam" : "obligation")
              }
            >
              {groupMode === "dam-obl" ? "Dam > Obligation" : "Obligation > Dam"}
              {sortMark(groupMode === "dam-obl" ? "dam" : "obligation")}
            </button>
          )}
          <button
            type="button"
            className="flex cursor-pointer items-center justify-end px-2 text-right"
            style={{ width: DUE_COL_W }}
            onClick={() => toggleRowSort("due")}
          >
            Next due{sortMark("due")}
          </button>
        </div>
        <div className="relative overflow-hidden border-b border-[var(--border)] bg-[var(--surface)]">
          {bothPanes ? (
            <button
              type="button"
              className="mrt-pane-x"
              title="Hide Gantt"
              onClick={() => setShowGantt(false)}
            >
              ×
            </button>
          ) : null}
          <span
            ref={todayLabelRef}
            className="pointer-events-none absolute top-0.5 z-20 text-center text-[9px] font-bold leading-tight text-[var(--rag-red)]"
            style={{ display: "none", left: 0 }}
          >
            Today
            <br />({todayShort()})
          </span>
          <div
            className="relative h-full overflow-hidden"
            style={{ cursor: "grab" }}
            onPointerDown={(e) => startPan(e, "x")}
          >
            <GanttTimescaleCanvas
              ref={timescaleCanvasRef}
              cameraRef={cameraRef}
              scaleRef={scaleRef}
              scale={scale}
              months={months}
              winStart={win.start}
              grain={grain}
              years={years}
              viewH={headerH}
            />
          </div>
        </div>
        <div
          className="relative min-h-0 overflow-hidden border-r border-[var(--border)] bg-[var(--surface)]"
          style={{ cursor: "grab" }}
          onPointerDown={(e) => startPan(e, "y")}
        >
          <div
            ref={labelLayerRef}
            className="absolute top-0 left-0"
            style={{ width: labelW }}
          >
            {chartReady
              ? items.map((it) => {
              if (it.type === "gap") {
                return null;
              }
              if (it.type === "heading") {
                return (
                  <div
                    key={it.key}
                    className="absolute right-0 left-0 flex w-full items-center border-b border-[var(--border)] bg-[var(--surface-muted)] text-[11px] font-semibold"
                    style={{ top: it.top, height: it.h }}
                  >
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 cursor-pointer items-center truncate px-2 text-left"
                      onClick={() => toggleHeading(it.key)}
                    >
                      {it.collapsed ? "▸" : "▾"} {it.text}
                    </button>
                    <span
                      className="flex justify-end px-2"
                      style={{ width: DUE_COL_W }}
                    >
                      <DueChip chip={it.chip} />
                    </span>
                  </div>
                );
              }
              if (mode === "flat") {
                return (
                  <div
                    key={it.key}
                    className={`absolute right-0 left-0 flex cursor-pointer items-center border-b border-[var(--border)]/70 bg-[var(--surface)] px-2 text-[10.5px]${
                      savingRowKey === it.key ? " mrt-row-is-saving" : ""
                    }`}
                    style={{ top: it.top, height: it.h }}
                    onDoubleClick={() => openLeaf(it)}
                  >
                    <span className="flex-1 truncate">{it.damName}</span>
                    <span className="flex flex-1 items-center gap-1 truncate">
                      <span
                        className="inline-block h-2 w-2 shrink-0 rounded-full"
                        style={{ background: it.color }}
                      />
                      {it.laneLabel}
                    </span>
                    <span
                      className="flex items-center justify-end gap-1"
                      style={{ width: DUE_COL_W }}
                    >
                      {savingRowKey === it.key ? (
                        <RowSaving />
                      ) : (
                        <RecalcBtn
                          damId={it.damId}
                          laneCode={it.laneCode}
                          damName={it.damName}
                          laneLabel={it.laneLabel}
                          stale={staleRows.has(it.key)}
                        />
                      )}
                      <DueChip chip={it.chip} />
                    </span>
                  </div>
                );
              }
              return (
                <div
                  key={it.key}
                  className={`absolute right-0 left-0 flex cursor-pointer items-center border-b border-[var(--border)]/70 bg-[var(--surface)] text-[10.5px]${
                    savingRowKey === it.key ? " mrt-row-is-saving" : ""
                  }`}
                  style={{ top: it.top, height: it.h }}
                  onDoubleClick={() => openLeaf(it)}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate px-2 pl-6">
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ background: it.color }}
                    />
                    {groupMode === "dam-obl" ? it.laneLabel : it.damName}
                  </span>
                  <span
                    className="flex items-center justify-end gap-1 px-2"
                    style={{ width: DUE_COL_W }}
                  >
                    {savingRowKey === it.key ? (
                      <RowSaving />
                    ) : (
                      <RecalcBtn
                        damId={it.damId}
                        laneCode={it.laneCode}
                        damName={it.damName}
                        laneLabel={it.laneLabel}
                        stale={staleRows.has(it.key)}
                      />
                    )}
                    <DueChip chip={it.chip} />
                  </span>
                </div>
              );
            })
              : null}
          </div>
        </div>
        <div className="relative min-h-0 overflow-hidden bg-[var(--surface)]">
          <GanttTimelineCanvas
            ref={timelineCanvasRef}
            className="absolute inset-0 h-full w-full"
            cameraRef={cameraRef}
            scaleRef={scaleRef}
            scale={scale}
            months={months}
            winStart={win.start}
            grain={grain}
            items={items}
            markersByRow={markersByRow}
            dueBeforeIdx={dueBeforeIdx}
            showSummarised={showSummarised}
            hideKeyRef={hideKeyRef}
            dragShiftRef={dragShiftRef}
            pulseKey={pulseKey}
          />
          <canvas
            ref={dragOverlayRef}
            className="pointer-events-none absolute inset-0 block h-full w-full"
            aria-hidden
          />
          <div
            ref={bodyRef}
            className="absolute inset-0 overflow-auto bg-transparent"
            style={{ cursor: "grab" }}
            onScroll={syncChrome}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              const hit = markerAtPointer(e.clientX, e.clientY);
              if (hit) {
                startMarkerPointer(e, hit);
                return;
              }
              startPan(e, "both");
            }}
            onPointerMove={(e) => applyHoverCursor(e.clientX, e.clientY)}
            onDoubleClick={(e) => {
              const hit = markerAtPointer(e.clientX, e.clientY);
              if (!hit) return;
              e.preventDefault();
              setOpen(hit);
            }}
          >
            <div
              ref={spacerRef}
              style={{ width, height: Math.max(totalHeight, 1) }}
            />
          </div>
        </div>
        {markersLoading || markersBusy || reshaping ? (
          <div className="mrt-gantt-busy pointer-events-none">
            <MrtInlineLoading label="chart" />
          </div>
        ) : null}
        </div>
        ) : null}
        {bothPanes ? (
            <div
              className="mrt-alloc-split"
              role="separator"
              aria-orientation="horizontal"
              aria-label="Resize resource heatmap"
              onPointerDown={startSplitDrag}
            />
        ) : null}
        {showAlloc ? (
          <div
            ref={allocPaneRef}
            className="min-h-0"
            style={{
              flex: showGantt ? "0 0 auto" : "1 1 auto",
              height: showGantt ? allocH : undefined,
              minHeight: showGantt ? undefined : 0,
            }}
          >
            <ResourceLoadPane
              rows={loadRows.filter((r) => r.chunkStart >= 0)}
              months={months}
              monthPx={monthPx}
              winStart={win.start}
              labelW={labelW}
              todayX={todayX}
              height={showGantt ? "100%" : "100%"}
              rowH={laneH}
              grain={grain}
              timescale={showGantt ? "compact" : "full"}
              years={years}
              scale={scale}
              scrollRef={allocScrollRef}
              onScrollLeft={onAllocScrollLeft}
              onOpenContribution={openContribution}
              onRebalanceAll={openRebalance}
              showClose={bothPanes}
              onClosePane={() => setShowAlloc(false)}
              onPanPointerDown={(e) => startPan(e, "x")}
              panning={false}
              onGoToPerson={onGoToPerson}
              loading={allocLoading}
            />
          </div>
        ) : null}
      </div>
      <p className="mt-1 text-[10px] text-[var(--muted)]">
        {win.start.y}–{win.end.y} · click an FY label to fill
        the chart with that year
      </p>
      <div
        ref={dragTipRef}
        className="pointer-events-none fixed z-50 rounded bg-[var(--ink)] px-2 py-1 text-[11px] text-[var(--surface)]"
        style={{ display: "none", left: 0, top: 0 }}
      />

      {open ? (
        <OccurrenceModal
          store={store}
          marker={open}
          onClose={() => setOpen(null)}
          onChange={onChange}
          readOnly={readOnly}
          onGoToDefaults={onGoToDefaults}
        />
      ) : null}
      {rebalance ? (
        <StackedEffortModal
          store={store}
          contributions={rebalance.contributions}
          personId={rebalance.personId}
          onClose={() => setRebalance(null)}
          onChange={onChange}
          readOnly={readOnly}
        />
      ) : null}
      {baselineOpen ? (
        <BaselineModal
          store={store}
          onChange={onChange}
          onClose={() => setBaselineOpen(false)}
        />
      ) : null}
    </div>
  );
}

function DueBeforePanel({
  months,
  winStart,
  dueBeforeIdx,
  onChange,
}: {
  months: number;
  winStart: { y: number; m: number };
  dueBeforeIdx: number | null;
  onChange: (idx: number | null) => void;
}) {
  const fallback = months - 1;
  const idx = dueBeforeIdx ?? fallback;
  const cur = idxToYm(idx, winStart);
  const years: number[] = [];
  const endYm = idxToYm(Math.max(0, months - 1), winStart);
  for (let y = winStart.y; y <= endYm.y; y++) years.push(y);

  return (
    <div className="max-w-xs py-0.5">
      <p className="mb-2 text-[11px] text-[var(--muted)]">
        Shows only incomplete occurrences due on or before this month.
      </p>
      <div className="mb-2 flex items-center justify-between gap-2">
        <select
          className="sg-input min-h-8 py-1 text-sm"
          value={cur.y}
          onChange={(e) =>
            onChange(monthIndex(Number(e.target.value), cur.m0 + 1, winStart))
          }
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="sg-btn-ghost min-h-8 px-2 text-xs"
          onClick={() => onChange(null)}
        >
          Clear
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {MONTH_NAMES.map((name, i) => (
          <button
            key={name}
            type="button"
            className={`min-h-8 rounded px-1 text-[11px] ${
              i === cur.m0 && dueBeforeIdx !== null
                ? "bg-[var(--surface-muted)] font-semibold"
                : "hover:bg-[var(--surface-muted)]"
            }`}
            onClick={() => onChange(monthIndex(cur.y, i + 1, winStart))}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}
