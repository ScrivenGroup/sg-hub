"use client";

import {
  useCallback,
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
  schedKey,
  type GanttMarker,
  type NextDueChip,
} from "../logic/scheduling";
import { nextDueChipClass, planStatusKind, planStatusLabel } from "../logic/status";
import { OccurrenceModal } from "./OccurrenceModal";
import { BaselineModal } from "./BaselineModal";

const ZOOM_X = [8, 11, 14, 18, 24, 32, 48, 72];
const ZOOM_Y = [0.7, 0.85, 1, 1.2, 1.45, 1.8];
const BASE_MONTH_PX = 14;
const BASE_LANE_H = 20;
const BASE_HEADING_H = 24;
const GROUP_GAP = 6;
const HEADER_H = 52;
const CORNER_H = 52;
const DUE_COL_W = 108;

type PendingScroll =
  | { type: "idx-start"; idx: number }
  | { type: "idx-center"; idx: number }
  | { type: "frac"; frac: number }
  | { type: "pct"; pct: number };

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

function monthScaleEdge(m0: number) {
  if (m0 === 0) return "var(--border)";
  if (m0 === 3 || m0 === 6 || m0 === 9) {
    return "color-mix(in srgb, var(--border) 50%, transparent)";
  }
  return "color-mix(in srgb, var(--border) 22%, transparent)";
}

export function GanttTab({
  store,
  onChange,
  readOnly = false,
}: {
  store: ScheduleStore;
  onChange: (store: ScheduleStore) => void;
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState<GanttMarker | null>(null);
  const [damFilter, setDamFilter] = useState<string[]>([]);
  const [laneFilter, setLaneFilter] = useState<string[]>([]);
  const [dueBeforeIdx, setDueBeforeIdx] = useState<number | null>(null);
  const [onlyOngoing, setOnlyOngoing] = useState(false);
  const [scheduleFilter, setScheduleFilter] = useState<
    null | "scheduled" | "predicted"
  >(null);
  const [panel, setPanel] = useState<null | "dam" | "type" | "due">(null);
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
  const [fullscreen, setFullscreen] = useState(false);
  const [fsTop, setFsTop] = useState(120);
  const [minimap, setMinimap] = useState({ leftPct: 0, widthPct: 12 });
  const [todayLabelLeft, setTodayLabelLeft] = useState<number | null>(null);

  const bodyRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const minimapWrapRef = useRef<HTMLDivElement>(null);
  const pendingScroll = useRef<PendingScroll | null>(null);
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

  const win = planningWindow(new Date(), clampHorizonYears(store.horizonYears));
  const winStartRef = useRef(win.start);
  winStartRef.current = win.start;
  const months = totalMonths(win.start, win.end);
  const tIdx = todayIdx(todayYm(), win.start);
  const todayX = tIdx * monthPx;
  const width = months * monthPx;
  const laneH = BASE_LANE_H * zoomY;
  const headingH = BASE_HEADING_H * Math.max(0.85, Math.min(1.4, zoomY));
  const mode: GroupMode = flatMode ? "flat" : groupMode;
  const labelW = 420;
  const markers = useMemo(() => ganttMarkers(store), [store]);

  const pairs = useMemo(
    () =>
      visiblePairs(store, damFilter, laneFilter, onlyOngoing, scheduleFilter),
    [store, damFilter, laneFilter, onlyOngoing, scheduleFilter],
  );

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
    if (!bv) return;
    if (headerRef.current) headerRef.current.scrollLeft = bv.scrollLeft;
    if (labelRef.current) labelRef.current.scrollTop = bv.scrollTop;
    const bodyW = months * monthPxRef.current || 1;
    const leftPct = Math.max(0, Math.min(100, (bv.scrollLeft / bodyW) * 100));
    const widthPct = Math.max(
      1.5,
      Math.min(100, (bv.clientWidth / bodyW) * 100),
    );
    setMinimap({ leftPct, widthPct });
    const onScreenX = tIdx * monthPxRef.current - bv.scrollLeft;
    const viewportW = bv.clientWidth || 0;
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
    const bv = bodyRef.current;
    const pending = pendingScroll.current;
    if (bv && pending) {
      pendingScroll.current = null;
      const bodyW = months * monthPx;
      if (pending.type === "idx-start") bv.scrollLeft = pending.idx * monthPx;
      else if (pending.type === "idx-center") {
        bv.scrollLeft = pending.idx * monthPx - bv.clientWidth / 2;
      } else if (pending.type === "frac") {
        bv.scrollLeft = pending.frac * bodyW - bv.clientWidth / 2;
      } else {
        bv.scrollLeft = (pending.pct / 100) * bodyW;
      }
    }
    syncChrome();
  }, [monthPx, months, items.length, totalHeight, fullscreen, syncChrome]);

  useLayoutEffect(() => {
    function onMove(e: PointerEvent) {
      const drag = dragRef.current;
      const wrap = minimapWrapRef.current;
      const bv = bodyRef.current;
      if (!drag || !wrap || !bv) return;
      const rect = wrap.getBoundingClientRect();
      const deltaPct = ((e.clientX - drag.startX) / rect.width) * 100;
      const bodyW = months * monthPxRef.current || 1;
      if (drag.mode === "move") {
        const newLeft = Math.max(
          0,
          Math.min(100 - drag.startWidthPct, drag.startLeftPct + deltaPct),
        );
        bv.scrollLeft = (newLeft / 100) * bodyW;
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
      const nextPx = bv.clientWidth / Math.max(1, visibleMonths);
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
        const baseC = idxDayToContinuous(md.baseIdx, md.baseDay, windowStart);
        let raw = baseC + deltaX / monthPxRef.current;
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
          pxShift: (snappedC - baseC) * monthPxRef.current,
          x: e.clientX,
          y: e.clientY,
          text: `Due: Week ending ${idxDayToShortDateLabel(snapped.idx, snapped.day, windowStart)}`,
        });
        return;
      }
      const pan = panRef.current;
      if (!pan) return;
      const bv = bodyRef.current;
      if (!bv) return;
      if (pan.mode !== "y") {
        bv.scrollLeft = pan.startLeft - (e.clientX - pan.startX);
      }
      if (pan.mode !== "x") {
        bv.scrollTop = pan.startTop - (e.clientY - pan.startY);
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
          const next = JSON.parse(JSON.stringify(current)) as ScheduleStore;
          const key = schedKey(
            md.marker.damId,
            md.marker.laneCode,
            md.marker.procDueIdx,
          );
          const existing = next.scheduledDetails[key] || {};
          next.scheduledDetails[key] = {
            ...existing,
            dueIdxOverride: md.candidateIdx,
            dueDayOverride: md.candidateDay,
            actualised: true,
          };
          onChangeRef.current(next);
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

  function enterFullscreen() {
    const bar = document.querySelector(
      '[aria-label="Milestone Resourcing Tracker"]',
    );
    const top = bar
      ? Math.round(bar.getBoundingClientRect().bottom + 8)
      : 120;
    setFsTop(top);
    setFullscreen(true);
  }

  function jumpToday() {
    pendingScroll.current = { type: "idx-center", idx: tIdx };
    syncChrome();
    const bv = bodyRef.current;
    if (bv) {
      bv.scrollLeft = tIdx * monthPx - bv.clientWidth / 2;
      syncChrome();
    }
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
    const oldW = months * monthPx || 1;
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
    setDamFilter([]);
    setLaneFilter([]);
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
    const dueX =
      idxDayToContinuous(m.displayDueIdx, m.dueDay, win.start) * monthPx;
    const left = Math.max(0, m.leadStart) * monthPx;
    const tailW = Math.max(4, dueX - left);
    const done = m.kind === "completed";
    const notReq = m.kind === "notRequired";
    const predicted = m.kind === "predicted" || notReq;
    const color = done
      ? "var(--rag-green)"
      : notReq
        ? "var(--muted)"
        : m.color;
    const key = `${m.damId}-${m.laneCode}-${m.procDueIdx}`;
    const preview = dragPreview?.key === key ? dragPreview.pxShift : 0;
    const full = fullDateLabel(m.displayDueIdx, m.dueDay, win.start);
    return (
      <button
        key={key}
        type="button"
        data-gantt-marker
        data-locked={done ? "true" : undefined}
        className="absolute top-1/2"
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
            marginRight: 2,
            borderTop: predicted
              ? `1.5px dashed ${color}`
              : `1.5px solid ${color}`,
            opacity: 0.7,
          }}
        />
        <span
          className="block h-2 w-2 rounded-full"
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
      target.closest("button") ||
      target.closest("input") ||
      target.closest("select") ||
      target.closest("label")
    ) {
      return;
    }
    const bv = bodyRef.current;
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
    const bv = bodyRef.current;
    if (!wrap || !bv) return;
    const rect = wrap.getBoundingClientRect();
    const clickPct = ((e.clientX - rect.left) / rect.width) * 100;
    const w = minimap.widthPct;
    const newLeft = Math.max(0, Math.min(100 - w, clickPct - w / 2));
    bv.scrollLeft = (newLeft / 100) * width;
    syncChrome();
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

  const chartHeight = fullscreen
    ? `calc(100dvh - ${fsTop}px - 168px)`
    : "calc(100dvh - 320px)";

  return (
    <div
      className={
        fullscreen
          ? "fixed right-0 bottom-0 left-0 z-30 bg-[var(--page)] px-4 pt-2"
          : ""
      }
      style={fullscreen ? { top: fsTop } : undefined}
    >
      <div className="mb-2 flex flex-wrap items-center gap-1 text-sm">
        <button
          type="button"
          className="sg-btn-secondary min-h-9 px-3 text-sm"
          onClick={() =>
            fullscreen ? setFullscreen(false) : enterFullscreen()
          }
        >
          {fullscreen ? "Exit full screen" : "Full screen"}
        </button>
        <button
          type="button"
          className="sg-btn-secondary min-h-9 px-3 text-sm"
          onClick={resetView}
        >
          Reset view
        </button>
        <button
          type="button"
          className="sg-btn-secondary min-h-9 px-3 text-sm"
          onClick={jumpToday}
        >
          Jump to today
        </button>
        <button
          type="button"
          className={`mrt-filter-panel ${panel === "dam" ? "open" : ""}`}
          onClick={() => setPanel(panel === "dam" ? null : "dam")}
        >
          Asset filter {damFilter.length ? `(${damFilter.length})` : "(all)"} ▾
        </button>
        <button
          type="button"
          className={`mrt-filter-panel ${panel === "type" ? "open" : ""}`}
          onClick={() => setPanel(panel === "type" ? null : "type")}
        >
          Type filter {laneFilter.length ? `(${laneFilter.length})` : "(all)"} ▾
        </button>
        <button
          type="button"
          className={`mrt-filter-panel ${panel === "due" || dueBeforeIdx !== null ? "open" : ""}`}
          onClick={() => setPanel(panel === "due" ? null : "due")}
        >
          Due before{dueBeforeIdx !== null ? " (set)" : ""} ▾
        </button>
        <button
          type="button"
          className={`mrt-filter-toggle ${onlyOngoing ? "on" : ""}`}
          onClick={() => setOnlyOngoing((v) => !v)}
        >
          Show only ongoing
        </button>
        <button
          type="button"
          className={`mrt-filter-toggle ${scheduleFilter === "scheduled" ? "on" : ""}`}
          onClick={() =>
            setScheduleFilter((v) => (v === "scheduled" ? null : "scheduled"))
          }
        >
          Scheduled only
        </button>
        <button
          type="button"
          className={`mrt-filter-toggle ${scheduleFilter === "predicted" ? "on" : ""}`}
          onClick={() =>
            setScheduleFilter((v) => (v === "predicted" ? null : "predicted"))
          }
        >
          Predicted only
        </button>
        <button
          type="button"
          className="mrt-filter-panel"
          onClick={() => setBaselineOpen(true)}
          title="Ignore predicted cycles before this date"
        >
          Baseline {String(storeBaseline(store).d).padStart(2, "0")}-
          {MONTH_NAMES[storeBaseline(store).m - 1]}-
          {String(storeBaseline(store).y).slice(2)}
        </button>
      </div>

      {panel === "dam" ? (
        <div className="sg-card mb-2 flex max-w-md flex-wrap gap-2 py-2">
          {store.dams.map((d) => (
            <label key={d.id} className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={damFilter.includes(d.id)}
                onChange={(e) =>
                  setDamFilter((cur) =>
                    e.target.checked
                      ? [...cur, d.id]
                      : cur.filter((id) => id !== d.id),
                  )
                }
              />
              {d.name}
            </label>
          ))}
        </div>
      ) : null}
      {panel === "type" ? (
        <div className="sg-card mb-2 flex max-w-md flex-wrap gap-2 py-2">
          {store.lanes.map((l) => (
            <label key={l.code} className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={laneFilter.includes(l.code)}
                onChange={(e) =>
                  setLaneFilter((cur) =>
                    e.target.checked
                      ? [...cur, l.code]
                      : cur.filter((c) => c !== l.code),
                  )
                }
              />
              {l.code} {l.label}
            </label>
          ))}
        </div>
      ) : null}
      {panel === "due" ? (
        <DueBeforePanel
          months={months}
          winStart={win.start}
          dueBeforeIdx={dueBeforeIdx}
          onChange={setDueBeforeIdx}
        />
      ) : null}

      <div className="mb-2 flex flex-wrap items-center gap-3 text-[11px] text-[var(--muted)]">
        {store.lanes.map((l) => (
          <span key={l.code} className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: l.color }}
            />
            {l.code}
          </span>
        ))}
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

      <div
        className="mb-2 grid items-center gap-x-2.5 gap-y-1"
        style={{ gridTemplateColumns: "auto 1fr" }}
      >
        <div />
        <div className="relative h-[15px]">
          {fys.map((fy) => (
            <button
              key={fy.endYear}
              type="button"
              className="absolute top-px -translate-x-1/2 border-0 bg-transparent p-0 text-[9px] text-[var(--muted)] hover:underline"
              style={{ left: `${fy.centerPct}%` }}
              title={`Zoom to FY${fy.endYear} (1 Jul ${fy.endYear - 1} – 30 Jun ${fy.endYear})`}
              onClick={() => jumpToFY(fy.endYear)}
            >
              FY{String(fy.endYear).slice(2)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
          <span>Timescale</span>
          <button
            type="button"
            className="sg-btn-ghost min-h-7 px-2 text-xs"
            onClick={() => zoomXBy(-1)}
          >
            −
          </button>
          <span className="min-w-8 text-center">
            {Math.round((monthPx / BASE_MONTH_PX) * 100)}%
          </span>
          <button
            type="button"
            className="sg-btn-ghost min-h-7 px-2 text-xs"
            onClick={() => zoomXBy(1)}
          >
            +
          </button>
          <span className="ml-1">Row height</span>
          <button
            type="button"
            className="sg-btn-ghost min-h-7 px-2 text-xs"
            onClick={() => zoomYBy(-1)}
          >
            −
          </button>
          <span className="min-w-8 text-center">
            {Math.round(zoomY * 100)}%
          </span>
          <button
            type="button"
            className="sg-btn-ghost min-h-7 px-2 text-xs"
            onClick={() => zoomYBy(1)}
          >
            +
          </button>
        </div>
        <div
          ref={minimapWrapRef}
          className="relative h-10 overflow-hidden rounded-[6px] border border-[var(--border)] bg-[var(--surface-muted)]"
          onPointerDown={clickMinimap}
        >
          {yearTicks.map((tick) => (
            <div key={tick.y}>
              <div
                className="absolute top-0 bottom-0 w-px bg-[var(--border)]"
                style={{ left: `${tick.pct}%` }}
              />
              <div
                className="absolute top-1 text-[10px] whitespace-nowrap text-[var(--muted)]"
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

      <div
        className="overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--surface)]"
        style={{
          display: "grid",
          gridTemplateColumns: `${labelW}px 1fr`,
          gridTemplateRows: `${CORNER_H}px ${HEADER_H}px 1fr`,
          height: chartHeight,
          minHeight: 320,
        }}
      >
        <div className="mrt-gantt-tools border-r border-b border-[var(--border)] bg-[var(--surface-muted)]">
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
        <div className="border-b border-[var(--border)] bg-[var(--surface)]" />
        <div className="flex border-r border-b border-[var(--border)] bg-[var(--surface-muted)] text-[11px] font-semibold">
          <button
            type="button"
            className="flex flex-1 items-center px-2 text-left"
            onClick={() => toggleRowSort("dam")}
          >
            Dam{sortMark("dam")}
          </button>
          <button
            type="button"
            className="flex flex-1 items-center px-2 text-left"
            onClick={() => toggleRowSort("obligation")}
          >
            Obligation{sortMark("obligation")}
          </button>
          <button
            type="button"
            className="flex items-center justify-end px-2 text-right"
            style={{ width: DUE_COL_W }}
            onClick={() => toggleRowSort("due")}
          >
            Next due{sortMark("due")}
          </button>
        </div>
        <div className="relative overflow-hidden border-b border-[var(--border)] bg-[var(--surface)]">
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
            <div className="flex text-[10px] font-medium">
              {years.map((yr) => (
                <div
                  key={yr.y}
                  className="border-r border-[var(--border)] px-1 pt-0.5"
                  style={{ width: yr.span * monthPx }}
                >
                  {yr.y}
                </div>
              ))}
            </div>
            <div className="flex text-[8px] text-[var(--muted)]">
              {Array.from({ length: months }, (_, i) => {
                const { m0 } = idxToYm(i, win.start);
                const q =
                  m0 === 0
                    ? "Q1"
                    : m0 === 3
                      ? "Q2"
                      : m0 === 6
                        ? "Q3"
                        : m0 === 9
                          ? "Q4"
                          : "";
                return (
                  <div
                    key={i}
                    className="shrink-0 pl-0.5"
                    style={{
                      width: monthPx,
                      borderLeft: `1px solid ${monthScaleEdge(m0)}`,
                    }}
                  >
                    {monthPx >= 10 ? q : ""}
                  </div>
                );
              })}
            </div>
            <div className="flex text-[8px] leading-4 text-[var(--muted)]">
              {Array.from({ length: months }, (_, i) => {
                const { m0 } = idxToYm(i, win.start);
                return (
                  <div
                    key={i}
                    className="shrink-0 pl-0.5"
                    style={{
                      width: monthPx,
                      borderLeft: `1px solid ${monthScaleEdge(m0)}`,
                    }}
                  >
                    {MONTH_NAMES[m0][0]}
                  </div>
                );
              })}
            </div>
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-10 w-0.5 border-l-2 border-dashed border-[var(--rag-red)]"
              style={{ left: todayX }}
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
                const damText = groupMode === "dam-obl" ? it.text : "";
                const oblText = groupMode === "obl-dam" ? it.text : "";
                return (
                  <div
                    key={it.key}
                    className="flex w-full items-center border-b border-[var(--border)] bg-[var(--surface-muted)] text-[11px] font-semibold"
                    style={{ height: it.h }}
                  >
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center truncate px-2 text-left"
                      onClick={() => toggleHeading(it.key)}
                    >
                      {groupMode === "dam-obl" ? (
                        <>
                          {it.collapsed ? "▸" : "▾"} {damText}
                        </>
                      ) : (
                        <span className="truncate text-[var(--muted)]">—</span>
                      )}
                    </button>
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center truncate px-2 text-left"
                      onClick={() => toggleHeading(it.key)}
                    >
                      {groupMode === "obl-dam" ? (
                        <>
                          {it.collapsed ? "▸" : "▾"} {oblText}
                        </>
                      ) : (
                        <span className="truncate text-[var(--muted)]">—</span>
                      )}
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
                  <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate px-2 pl-5">
                    {groupMode === "obl-dam" ? (
                      <>
                        <span
                          className="inline-block h-2 w-2 shrink-0 rounded-full"
                          style={{ background: it.color }}
                        />
                        {it.damName}
                      </>
                    ) : (
                      <span className="truncate text-[var(--muted)]">—</span>
                    )}
                  </span>
                  <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate px-2">
                    {groupMode === "dam-obl" ? (
                      <>
                        <span
                          className="inline-block h-2 w-2 shrink-0 rounded-full"
                          style={{ background: it.color }}
                        />
                        {it.laneLabel}
                      </>
                    ) : (
                      <span className="truncate text-[var(--muted)]">—</span>
                    )}
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
            {Array.from({ length: months }, (_, i) => {
              const { m0 } = idxToYm(i, win.start);
              return (
                <div
                  key={i}
                  className="absolute top-0 bottom-0"
                  style={{
                    left: i * monthPx,
                    width: 1,
                    background: monthScaleEdge(m0),
                  }}
                />
              );
            })}
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
    <div className="sg-card mb-2 max-w-xs py-2">
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
