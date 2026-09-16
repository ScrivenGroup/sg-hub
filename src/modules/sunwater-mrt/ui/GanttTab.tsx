"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { ScheduleStore } from "../schema";
import {
  clampHorizonYears,
  daysInMonth,
  defaultDueDayForIdx,
  fyStartIdx,
  fullDateLabel,
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
  rowNeedsRecalc,
  type GanttMarker,
  type NextDueChip,
} from "../logic/scheduling";
import { nextDueChipClass, planStatusKind, planStatusLabel } from "../logic/status";
import {
  chartXToContinuous,
  continuousToChartX,
  makeGanttXScale,
  monthStartX,
  todayChartX,
} from "../logic/gantt-x-scale";
import {
  computeHourBar,
  hourBarKey,
  HOUR_BAR_IDLE_CHUNK,
  markerOverlapsWindow,
  prioritizeHourBarQueue,
  scheduleIdle,
  type HourBarSpan,
} from "../logic/gantt-stage";
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
import { GanttTimescale, ganttTimescaleHeight, monthGridEdge, weekGridLine } from "./GanttTimescale";
import { PageIntro } from "./SubTabs";

const ZOOM_X = [8, 11, 14, 18, 24, 32, 48, 72];
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
  | { type: "xy"; x: number; y: number };

export type GanttOccurrenceFocus = {
  damId: string;
  laneCode: string;
  procDueIdx: number;
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

function todayShort() {
  const now = new Date();
  return `${String(now.getDate()).padStart(2, "0")}-${MONTH_NAMES[now.getMonth()]}-${String(now.getFullYear()).slice(2)}`;
}

function monthScaleEdge(m0: number, grain: LoadGrain = "month") {
  return monthGridEdge(m0, grain);
}

export function GanttTab({
  store,
  onChange,
  readOnly = false,
  onGoToDefaults,
  onGoToPerson,
  focusOccurrence,
  onFocusConsumed,
}: {
  store: ScheduleStore;
  onChange: (store: ScheduleStore) => void;
  readOnly?: boolean;
  onGoToDefaults?: (laneCode: string) => void;
  onGoToPerson?: (personId: string) => void;
  focusOccurrence?: GanttOccurrenceFocus | null;
  onFocusConsumed?: () => void;
}) {
  const [open, setOpen] = useState<GanttMarker | null>(null);
  const [damFilter, setDamFilter] = useState<string[]>(() =>
    store.dams.map((d) => d.id),
  );
  const [laneFilter, setLaneFilter] = useState<string[]>(() =>
    store.lanes.map((l) => l.code),
  );
  const [dueBeforeIdx, setDueBeforeIdx] = useState<number | null>(null);
  const [onlyOngoing, setOnlyOngoing] = useState(false);
  const [scheduleFilter, setScheduleFilter] = useState<
    null | "scheduled" | "predicted"
  >(null);
  const [panel, setPanel] = useState<null | "dam" | "type" | "due" | "legend">(null);
  const [monthPx, setMonthPx] = useState(BASE_MONTH_PX);
  const [zoomY, setZoomY] = useState(1);
  const [groupMode, setGroupMode] = useState<Exclude<GroupMode, "flat">>(
    "dam-obl",
  );
  const [flatMode, setFlatMode] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [showSummarised, setShowSummarised] = useState(true);
  const [baselineOpen, setBaselineOpen] = useState(false);
  const [rowSort, setRowSort] = useState<GanttSort | null>(null);
  const [pulseKey, setPulseKey] = useState<string | null>(null);
  const [pulseToast, setPulseToast] = useState<string | null>(null);
  const [hideEmptyOnScreen, setHideEmptyOnScreen] = useState(false);
  const [rebalance, setRebalance] = useState<{
    contributions: LoadContribution[];
    personId: string;
  } | null>(null);
  const [minimap, setMinimap] = useState({ leftPct: 0, widthPct: 12 });
  const [todayLabelLeft, setTodayLabelLeft] = useState<number | null>(null);

  const bodyRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const minimapWrapRef = useRef<HTMLDivElement>(null);
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
  monthPxRef.current = monthPx;
  const storeRef = useRef(store);
  storeRef.current = store;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    return () => {
      if (pulseTimer.current) clearTimeout(pulseTimer.current);
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
    dragging: boolean;
    canDrag: boolean;
    baseIdx: number;
    baseDay: number;
    candidateIdx: number | null;
    candidateDay: number | null;
  } | null>(null);
  const [dragPreview, setDragPreview] = useState<{
    key: string;
    pxShift: number;
    x: number;
    y: number;
    text: string;
  } | null>(null);
  const [panning, setPanning] = useState(false);
  const [showGantt, setShowGantt] = useState(true);
  const [showAlloc, setShowAlloc] = useState(false);
  const [grain, setGrain] = useState<LoadGrain>("month");
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
    [win.start, months, monthPx, grain],
  );
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const todayX = todayChartX(scale);
  const width = scale.width;
  const laneH = BASE_LANE_H * zoomY;
  const headingH = BASE_HEADING_H * Math.max(0.85, Math.min(1.4, zoomY));
  const mode: GroupMode = flatMode ? "flat" : groupMode;
  const labelW = 420;
  const markers = useMemo(() => ganttMarkers(store), [store]);

  const basePairs = useMemo(
    () =>
      visiblePairs(store, damFilter, laneFilter, onlyOngoing, scheduleFilter),
    [store, damFilter, laneFilter, onlyOngoing, scheduleFilter],
  );

  const [hourBars, setHourBars] = useState<Map<string, HourBarSpan>>(
    () => new Map(),
  );
  const hourBarsRef = useRef(hourBars);
  hourBarsRef.current = hourBars;
  const hourDoneRef = useRef(new Set<string>());
  const viewStartC = (minimap.leftPct / 100) * months;
  const viewEndC = ((minimap.leftPct + minimap.widthPct) / 100) * months;
  const viewStartCRef = useRef(viewStartC);
  const viewEndCRef = useRef(viewEndC);
  viewStartCRef.current = viewStartC;
  viewEndCRef.current = viewEndC;

  useEffect(() => {
    hourDoneRef.current = new Set();
    hourBarsRef.current = new Map();
    setHourBars(new Map());
    let cancelled = false;
    let stopIdle = () => {};

    function flush() {
      if (cancelled) return;
      setHourBars(new Map(hourBarsRef.current));
    }

    function step() {
      if (cancelled) return;
      const a = viewStartCRef.current - 0.5;
      const b = viewEndCRef.current + 0.5;
      const queue = prioritizeHourBarQueue(
        markers,
        hourDoneRef.current,
        viewStartCRef.current,
        viewEndCRef.current,
        win.start,
      );
      if (queue.length === 0) {
        flush();
        return;
      }
      const fillingView = markerOverlapsWindow(queue[0], a, b, win.start);
      const slice = fillingView
        ? queue
            .filter((m) => markerOverlapsWindow(m, a, b, win.start))
            .slice(0, 400)
        : queue.slice(0, HOUR_BAR_IDLE_CHUNK);
      const next = new Map(hourBarsRef.current);
      for (const m of slice) {
        const key = hourBarKey(m);
        hourDoneRef.current.add(key);
        const span = computeHourBar(store, m, win.start);
        if (span) next.set(key, span);
      }
      hourBarsRef.current = next;
      if (fillingView) flush();
      if (queue.length > slice.length) stopIdle = scheduleIdle(step);
      else flush();
    }

    stopIdle = scheduleIdle(step);
    return () => {
      cancelled = true;
      stopIdle();
    };
  }, [store, markers, win.start.y, win.start.m]);

  useEffect(() => {
    const a = viewStartC - 0.5;
    const b = viewEndC + 0.5;
    for (const m of markers) {
      if (!markerOverlapsWindow(m, a, b, win.start)) continue;
      const key = hourBarKey(m);
      if (hourBarsRef.current.has(key) && !hourBars.has(key)) {
        setHourBars(new Map(hourBarsRef.current));
        return;
      }
    }
  }, [viewStartC, viewEndC, markers, win.start.y, win.start.m, hourBars]);

  const pairs = useMemo(() => {
    if (!hideEmptyOnScreen) return basePairs;
    const pad = 0.05;
    const a = viewStartC - pad;
    const b = viewEndC + pad;
    return basePairs.filter((p) =>
      markers.some((m) => {
        if (m.damId !== p.dam.id || m.laneCode !== p.lane.code) return false;
        if (m.kind === "completed" || m.kind === "notRequired") return false;
        return markerOverlapsWindow(
          m,
          a,
          b,
          win.start,
          hourBars.get(hourBarKey(m)),
        );
      }),
    );
  }, [
    hideEmptyOnScreen,
    basePairs,
    markers,
    hourBars,
    viewStartC,
    viewEndC,
    win.start,
  ]);

  const headerH = ganttTimescaleHeight(grain, "full");
  const weekSlots = grain === "week" ? scale.slots : [];

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
        return markerOverlapsWindow(
          m,
          a,
          b,
          win.start,
          hourBarsRef.current.get(hourBarKey(m)),
        );
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
    const bv = bodyRef.current;
    const alloc = allocScrollRef.current;
    const scroller = bv || alloc;
    if (!scroller) return;
    if (bv) {
      if (headerRef.current) headerRef.current.scrollLeft = bv.scrollLeft;
      if (labelRef.current) labelRef.current.scrollTop = bv.scrollTop;
      if (alloc && Math.abs(alloc.scrollLeft - bv.scrollLeft) > 0.5) {
        syncingH.current = true;
        alloc.scrollLeft = bv.scrollLeft;
        syncingH.current = false;
      }
    }
    const bodyW = scaleRef.current.width || 1;
    const leftPct = Math.max(0, Math.min(100, (scroller.scrollLeft / bodyW) * 100));
    const widthPct = Math.max(
      1.5,
      Math.min(100, (scroller.clientWidth / bodyW) * 100),
    );
    setMinimap({ leftPct, widthPct });
    const onScreenX = todayChartX(scaleRef.current) - scroller.scrollLeft;
    const viewportW = scroller.clientWidth || 0;
    if (onScreenX < -60 || onScreenX > viewportW + 60) {
      setTodayLabelLeft(null);
    } else {
      const labelWEst = 72;
      let left = onScreenX - labelWEst / 2;
      if (left + labelWEst + 4 > viewportW) left = viewportW - labelWEst - 4;
      if (left < 4) left = 4;
      setTodayLabelLeft(left);
    }
  }, [months, tIdx]);

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
    const span = hourBars.get(
      hourBarKey({
        damId: focusOccurrence.damId,
        laneCode: focusOccurrence.laneCode,
        procDueIdx: focusOccurrence.procDueIdx,
      }),
    );
    let cx = 0;
    if (span) {
      cx =
        (continuousToChartX(scale, span.startC) +
          continuousToChartX(scale, span.endC)) /
        2;
    } else if (marker) {
      cx = continuousToChartX(
        scale,
        idxDayToContinuous(marker.displayDueIdx, marker.dueDay, win.start),
      );
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

  useLayoutEffect(() => {
    function onMove(e: PointerEvent) {
      const drag = dragRef.current;
      const wrap = minimapWrapRef.current;
      const scroller = bodyRef.current || allocScrollRef.current;
      if (!drag || !wrap || !scroller) return;
      const rect = wrap.getBoundingClientRect();
      const deltaPct = ((e.clientX - drag.startX) / rect.width) * 100;
      const bodyW = scaleRef.current.width || 1;
      if (drag.mode === "move") {
        const newLeft = Math.max(
          0,
          Math.min(100 - drag.startWidthPct, drag.startLeftPct + deltaPct),
        );
        scroller.scrollLeft = (newLeft / 100) * bodyW;
        syncChrome();
        return;
      }
      let newLeft = drag.startLeftPct;
      let newWidth = drag.startWidthPct;
      if (drag.mode === "right") {
        newWidth = Math.max(
          1.5,
          Math.min(100 - drag.startLeftPct, drag.startWidthPct + deltaPct),
        );
      } else {
        newLeft = Math.max(
          0,
          Math.min(
            drag.startLeftPct + drag.startWidthPct - 1.5,
            drag.startLeftPct + deltaPct,
          ),
        );
        newWidth = drag.startWidthPct + (drag.startLeftPct - newLeft);
      }
      const visibleMonths = (newWidth / 100) * months;
      const nextPx = scroller.clientWidth / Math.max(1, visibleMonths);
      pendingScroll.current = { type: "pct", pct: newLeft };
      setMonthPx(Math.max(6, Math.min(96, nextPx)));
    }
    function onUp() {
      dragRef.current = null;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [months, syncChrome]);

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

  useLayoutEffect(() => {
    function onMove(e: PointerEvent) {
      const md = markerDragRef.current;
      if (md) {
        if (!md.canDrag) return;
        const deltaX = e.clientX - md.startX;
        if (!md.dragging) {
          if (Math.abs(deltaX) < 4) return;
          md.dragging = true;
          document.body.style.cursor = "grabbing";
        }
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
        const snappedC = idxDayToContinuous(
          snapped.idx,
          snapped.day,
          windowStart,
        );
        setDragPreview({
          key: `${md.marker.damId}-${md.marker.laneCode}-${md.marker.procDueIdx}`,
          pxShift: continuousToChartX(sc, snappedC) - baseX,
          x: e.clientX,
          y: e.clientY,
          text: `Due: Week ending ${idxDayToShortDateLabel(snapped.idx, snapped.day, windowStart)}`,
        });
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
        document.body.style.cursor = "";
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
        setDragPreview(null);
      }
      if (panRef.current) {
        panRef.current = null;
        setPanning(false);
      }
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [months, syncChrome]);

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
    const span = hourBars.get(
      hourBarKey({
        damId: first.damId,
        laneCode: first.laneCode,
        procDueIdx: first.procDueIdx,
      }),
    );
    let cx = 0;
    if (span) {
      cx =
        (continuousToChartX(sc, span.startC) +
          continuousToChartX(sc, span.endC)) /
        2;
    } else {
      cx = continuousToChartX(
        sc,
        idxDayToContinuous(
          first.displayDueIdx,
          first.dueDay ?? 15,
          win.start,
        ),
      );
    }
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
    const nextPx = Math.max(6, Math.min(96, viewportW / 12));
    pendingScroll.current = { type: "idx-start", idx: startIdx };
    setMonthPx(nextPx);
    if (bv) {
      bv.scrollLeft = startIdx * nextPx;
      syncChrome();
    }
  }

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
    setMonthPx(Math.max(6, Math.min(96, viewportW / 24)));
  }

  function toggleFlat() {
    setFlatMode((v) => !v);
    setCollapsed({});
    setAllCollapsed(false);
  }

  function toggleGroupAxis() {
    if (flatMode) return;
    setGroupMode((m) => (m === "dam-obl" ? "obl-dam" : "dam-obl"));
    setCollapsed({});
    setAllCollapsed(false);
  }

  function toggleCollapseAll() {
    if (flatMode) return;
    if (allCollapsed) {
      setCollapsed({});
      setAllCollapsed(false);
    } else {
      const keys = headingKeys(pairs, groupMode);
      setCollapsed(Object.fromEntries(keys.map((k) => [k, true])));
      setAllCollapsed(true);
    }
  }

  function toggleHeading(key: string) {
    setCollapsed((cur) => ({ ...cur, [key]: !cur[key] }));
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

  function markerVisible(m: GanttMarker) {
    if (dueBeforeIdx !== null) {
      if (m.kind === "completed" || m.displayDueIdx > dueBeforeIdx) return false;
    }
    return true;
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
  }: {
    damId: string;
    laneCode: string;
    damName: string;
    laneLabel: string;
  }) {
    const stale = rowNeedsRecalc(store, damId, laneCode);
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

  function renderGanttMarker(m: GanttMarker) {
    const dueC = idxDayToContinuous(m.displayDueIdx, m.dueDay, win.start);
    const dueX = continuousToChartX(scale, dueC);
    const left = Math.max(0, continuousToChartX(scale, m.leadStart));
    const tailW = Math.max(4, dueX - left);
    const done = m.kind === "completed";
    const notReq = m.kind === "notRequired";
    const predicted = m.kind === "predicted" || notReq;
    const color = done
      ? "var(--rag-green)"
      : notReq
        ? "var(--muted)"
        : m.color;
    const key = hourBarKey(m);
    const preview = dragPreview?.key === key ? dragPreview.pxShift : 0;
    const full = fullDateLabel(m.displayDueIdx, m.dueDay, win.start);
    const allBar = hourBars.get(key);
    const allLeft = allBar ? continuousToChartX(scale, allBar.startC) : 0;
    const allW = allBar
      ? continuousToChartX(scale, allBar.endC) - allLeft
      : 0;
    const pulsing = pulseKey === key;
    return (
      <button
        key={key}
        type="button"
        data-gantt-marker
        data-locked={done ? "true" : undefined}
        className={`absolute top-1/2${pulsing ? " is-gantt-pulse" : ""}`}
        style={{
          left: dueX - 4,
          opacity: m.inputOff || notReq ? 0.45 : 1,
          transform: `translate(${preview}px, -50%)`,
          cursor: "pointer",
        }}
        title={`${m.damName} ${m.laneCode} · ${planStatusLabel(m.kind)} · ${full}${
          m.inputOff ? " · input off — not deleted" : ""
        }`}
        onPointerDown={(e) => startMarkerPointer(e, m)}
        onDoubleClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(m);
        }}
        onClick={(e) => {
          if (markerDragRef.current?.dragging) {
            e.preventDefault();
          }
        }}
      >
        <span
          className="absolute right-full top-1/2 -translate-y-1/2"
          style={{
            width: tailW,
            height: 0,
            marginRight: 0,
            borderTop: predicted
              ? `2.5px dashed ${color}`
              : `2.5px solid ${color}`,
            opacity: 0.7,
          }}
        />
        {allBar && allW > 1 ? (
          <span
            className="pointer-events-none absolute"
            style={{
              left: allLeft - (dueX - 4),
              top: "calc(50% + 1.25px)",
              width: allW,
              height: 2,
              background: "#6a6a6a",
              opacity: 0.95,
            }}
          />
        ) : null}
        {pulsing ? <span className="mrt-gantt-pulse-ring" /> : null}
        <span
          className="mrt-gantt-dot block h-2 w-2 rounded-full"
          style={{
            background: done
              ? "var(--rag-green)"
              : predicted
                ? "var(--surface)"
                : color,
            border: predicted
              ? `1px dashed ${color}`
              : `1px solid ${done ? "var(--rag-green)" : color}`,
          }}
        />
      </button>
    );
  }

  function startMarkerPointer(
    e: ReactPointerEvent,
    m: GanttMarker,
  ) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const day = m.dueDay ?? defaultDueDayForIdx(m.displayDueIdx, win.start);
    markerDragRef.current = {
      marker: m,
      startX: e.clientX,
      dragging: false,
      canDrag: m.kind !== "completed" && !readOnly,
      baseIdx: m.displayDueIdx,
      baseDay: day,
      candidateIdx: null,
      candidateDay: null,
    };
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
    setPanning(true);
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
      startLeftPct: minimap.leftPct,
      startWidthPct: minimap.widthPct,
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
    const w = minimap.widthPct;
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
    setMinimap({
      leftPct: Math.max(0, Math.min(100, (left / bodyW) * 100)),
      widthPct: Math.max(1.5, Math.min(100, (el.clientWidth / bodyW) * 100)),
    });
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
    <div className="relative flex min-h-0 flex-1 flex-col">
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
                  onChange={setDamFilter}
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
                  onChange={setLaneFilter}
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
              data-minimap-window
              className="absolute top-0 bottom-0 cursor-grab border-[1.5px] border-[#1f4e78] bg-[rgba(31,78,120,0.18)] active:cursor-grabbing"
              style={{
                left: `${minimap.leftPct}%`,
                width: `${minimap.widthPct}%`,
              }}
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
          className="relative flex-1 overflow-hidden"
          style={{
            display: "grid",
            gridTemplateColumns: `${labelW}px 1fr`,
            gridTemplateRows: `${headerH}px 1fr`,
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
          {todayLabelLeft !== null ? (
            <span
              className="pointer-events-none absolute top-0.5 z-20 text-center text-[9px] font-bold leading-tight text-[var(--rag-red)]"
              style={{ left: todayLabelLeft }}
            >
              Today
              <br />({todayShort()})
            </span>
          ) : null}
          <div
            ref={headerRef}
            className="h-full overflow-hidden"
            style={{ cursor: panning ? "grabbing" : "grab" }}
            onPointerDown={(e) => startPan(e, "x")}
          >
          <div style={{ width }} className="relative">
            <GanttTimescale
              months={months}
              monthPx={monthPx}
              winStart={win.start}
              todayX={todayX}
              grain={grain}
              density="full"
              years={years}
              scale={scale}
            />
          </div>
          </div>
        </div>
        <div
          ref={labelRef}
          className="overflow-hidden border-r border-[var(--border)] bg-[var(--surface)]"
          style={{ cursor: panning ? "grabbing" : "grab" }}
          onPointerDown={(e) => startPan(e, "y")}
        >
          <div style={{ height: Math.max(totalHeight, 1), width: labelW }}>
            {items.map((it) => {
              if (it.type === "gap") {
                return <div key={it.key} style={{ height: it.h }} />;
              }
              if (it.type === "heading") {
                return (
                  <div
                    key={it.key}
                    className="flex w-full items-center border-b border-[var(--border)] bg-[var(--surface-muted)] text-[11px] font-semibold"
                    style={{ height: it.h }}
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
                    className="flex cursor-pointer items-center border-b border-[var(--border)]/70 bg-[var(--surface)] px-2 text-[10.5px]"
                    style={{ height: it.h }}
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
                      <RecalcBtn
                        damId={it.damId}
                        laneCode={it.laneCode}
                        damName={it.damName}
                        laneLabel={it.laneLabel}
                      />
                      <DueChip chip={it.chip} />
                    </span>
                  </div>
                );
              }
              return (
                <div
                  key={it.key}
                  className="flex cursor-pointer items-center border-b border-[var(--border)]/70 bg-[var(--surface)] text-[10.5px]"
                  style={{ height: it.h }}
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
                    <RecalcBtn
                      damId={it.damId}
                      laneCode={it.laneCode}
                      damName={it.damName}
                      laneLabel={it.laneLabel}
                    />
                    <DueChip chip={it.chip} />
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <div
          ref={bodyRef}
          className="overflow-auto bg-[var(--surface)]"
          style={{ cursor: panning ? "grabbing" : "grab" }}
          onScroll={syncChrome}
          onPointerDown={(e) => startPan(e, "both")}
        >
          <div className="relative" style={{ width, height: Math.max(totalHeight, 1) }}>
            {grain === "week"
              ? Array.from({ length: months }, (_, i) => {
                  const { m0 } = idxToYm(i, win.start);
                  return (
                    <div
                      key={`m-${i}`}
                      className="absolute top-0 bottom-0"
                      style={{
                        left: monthStartX(scale, i),
                        width: 1,
                        background: monthScaleEdge(m0, grain),
                      }}
                    />
                  );
                })
              : Array.from({ length: months }, (_, i) => {
              const { m0 } = idxToYm(i, win.start);
              return (
                <div
                  key={i}
                  className="absolute top-0 bottom-0"
                  style={{
                    left: i * monthPx,
                    width: 1,
                    background: monthScaleEdge(m0, grain),
                  }}
                />
              );
            })}
            {grain === "week"
              ? weekSlots.map((slot, i) => (
                    <div
                      key={slot.key}
                      className="absolute top-0 bottom-0"
                      style={{
                        left: i * scale.weekPx,
                        width: 1,
                        background: weekGridLine(),
                      }}
                    />
                  ))
              : null}
            <div
              className="pointer-events-none absolute top-0 z-10 h-full w-0.5 border-l-2 border-dashed border-[var(--rag-red)]"
              style={{ left: todayX }}
            />
            {items.map((it, idx) => {
              const top = items.slice(0, idx).reduce((s, x) => s + x.h, 0);
              if (it.type === "gap") {
                return (
                  <div
                    key={`${it.key}-tl`}
                    className="absolute right-0 left-0"
                    style={{ top, height: it.h }}
                  />
                );
              }
              if (it.type === "heading") {
                const rollup =
                  it.collapsed && showSummarised
                    ? markers.filter(
                        (m) =>
                          it.children.some(
                            (c) =>
                              c.damId === m.damId && c.laneCode === m.laneCode,
                          ) && markerVisible(m),
                      )
                    : [];
                return (
                  <div
                    key={`${it.key}-tl`}
                    className="absolute right-0 left-0 border-b border-[var(--border)] bg-[var(--surface-muted)]"
                    style={{ top, height: it.h }}
                  >
                    {rollup.map((m) => renderGanttMarker(m))}
                  </div>
                );
              }
              const rowMarkers = markers.filter(
                (m) =>
                  m.damId === it.damId &&
                  m.laneCode === it.laneCode &&
                  markerVisible(m),
              );
              return (
                <div
                  key={`${it.key}-tl`}
                  className="absolute right-0 left-0 border-b border-[var(--border)]/60"
                  style={{ top, height: it.h }}
                >
                  {rowMarkers.map((m) => renderGanttMarker(m))}
                </div>
              );
            })}
          </div>
        </div>
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
              panning={panning}
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
      {dragPreview ? (
        <div
          className="pointer-events-none fixed z-50 rounded bg-[var(--ink)] px-2 py-1 text-[11px] text-[var(--surface)]"
          style={{ left: dragPreview.x + 14, top: dragPreview.y - 10 }}
        >
          {dragPreview.text}
        </div>
      ) : null}

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
