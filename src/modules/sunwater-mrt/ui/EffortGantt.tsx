"use client";

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { DEFAULT_WEEKLY_CAPACITY_HOURS } from "../catalog/roster";
import type { EffortDemo, EffortStick, ScheduleStore } from "../schema";
import { joinPersonName, personIdFromName, samePersonName } from "../schema";
import {
  addResource,
  addTask,
  addTaskInGroup,
  assignResourceToGroup,
  buildEffortLayout,
  demoWeeks,
  dueColumnIndex,
  ensureEffortDemo,
  extendViewport,
  groupHasHours,
  hourRuns,
  isSyntheticResourceId,
  moveResource,
  parseResourceGroupKey,
  removeResource,
  removeResourceGroup,
  removeTask,
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
  setStick,
  setTailWeeks,
  shiftAll,
  shiftResource,
  shiftResourceGroup,
  shiftTask,
  tailStartColumnIndex,
  taskHasHours,
  todayColumnIndex,
  trimAroundGantt,
  UNASSIGNED_LABEL,
  VIEW_EXTEND_WEEKS,
  windowHours,
  type EffortGroupMode,
  type EffortLayoutRow,
  type HourSpan,
} from "../logic/effort-gantt";

const WEEK_PX = 56;
const FN_W = 54;
const L0_H = 29;
const L1_H = 29;
const L2_H = 26;
const MS_H = 38;
const HEAD_H = 22;
const FLAT_COL_W = 118;
const META_W = 72;
const HOURS_W = 76;
const CREATE_ROLE = "__create_role__";
const ADD_OTHER = "__add_other__";

type ChartPlace = "defaults" | "milestone";
type BarKind = "l0" | "l1-task" | "l1-group" | "l2";
type SortKey = "task" | "resource" | "person" | "start" | "finish" | "dur" | "hours";
type DropSlot = { key: string; edge: "before" | "after" };

function isoDue(due: { y: number; m: number; d: number }) {
  return `${due.y}-${String(due.m).padStart(2, "0")}-${String(due.d).padStart(2, "0")}`;
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

function diamondX(dueCol: number) {
  return dueCol * WEEK_PX + WEEK_PX / 2;
}

function baselineHoursForRow(
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
  return windowHours(baseline, res.hours);
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
}) {
  const demo = ensureEffortDemo(demoProp);
  const demoRef = useRef(demo);
  demoRef.current = demo;
  const [placeState, setPlace] = useState<ChartPlace>(lockedPlace || "milestone");
  const place = lockedPlace || placeState;
  const [mode, setMode] = useState<EffortGroupMode>("task-res");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);
  const [dropSlot, setDropSlot] = useState<DropSlot | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [showMeta, setShowMeta] = useState(true);
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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);
  const pendingScrollAdj = useRef(0);
  const extendingRef = useRef(false);
  const lastScrollLeft = useRef(0);
  const [panning, setPanning] = useState(false);

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
      return r.span.total;
    };
    leaves.sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      if (typeof va === "string") return va.localeCompare(String(vb)) * sort.dir;
      return (Number(va) - Number(vb)) * sort.dir;
    });
    return [...head, ...leaves];
  }, [rows, mode, sort, store]);
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
  const nameCols = mode === "flat" ? (personCol ? 3 : 2) : personCol ? 2 : 1;
  const nameW = nameCols * FLAT_COL_W + 24;
  const metaW = showMeta ? META_W * 3 + HOURS_W : 0;
  const labelW = nameW + metaW;
  const chartW = n * WEEK_PX;
  const dueCol = dueColumnIndex(demo);
  const tailStartCol = tailStartColumnIndex(demo);
  const todayCol = todayColumnIndex(demo);
  const showToday = place === "milestone" && todayCol >= 0 && todayCol < n;

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
      applyDemoToStore?.(next, chartDemo);
      onDemoChange(chartDemo);
    }
    onChange(next);
  }

  function commit(nextDemo: EffortDemo) {
    if (readOnly) return;
    const d = ensureEffortDemo(nextDemo);
    demoRef.current = d;
    onDemoChange(d);
  }

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (el && pendingScrollAdj.current) {
      el.scrollLeft += pendingScrollAdj.current;
      pendingScrollAdj.current = 0;
      lastScrollLeft.current = el.scrollLeft;
    }
    extendingRef.current = false;
  }, [n, demo.windowStart]);

  function extendNearEdges(opts?: {
    pan?: NonNullable<typeof panRef.current>;
    wantLeft?: number;
  }) {
    if (place === "defaults") return;
    const el = scrollerRef.current;
    if (!el || extendingRef.current) return;
    const extra = VIEW_EXTEND_WEEKS;
    const edge = WEEK_PX;
    if (opts?.wantLeft != null) {
      if (opts.wantLeft < 0) {
        extendingRef.current = true;
        pendingScrollAdj.current += extra * WEEK_PX;
        if (opts.pan) opts.pan.startLeft += extra * WEEK_PX;
        commit(extendViewport(demoRef.current, "start", extra));
        return;
      }
      if (opts.wantLeft + el.clientWidth > el.scrollWidth) {
        extendingRef.current = true;
        commit(extendViewport(demoRef.current, "end", extra));
      }
      return;
    }
    if (el.scrollWidth <= el.clientWidth + 1) return;
    if (el.scrollLeft <= edge) {
      extendingRef.current = true;
      pendingScrollAdj.current += extra * WEEK_PX;
      commit(extendViewport(demoRef.current, "start", extra));
      return;
    }
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - edge) {
      extendingRef.current = true;
      commit(extendViewport(demoRef.current, "end", extra));
    }
  }

  function startPan(e: ReactPointerEvent) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (
      target.closest("input") ||
      target.closest("select") ||
      target.closest("button") ||
      target.closest("[data-effort-grab]") ||
      target.closest("[data-effort-resize]") ||
      target.closest("[data-effort-diamond]") ||
      target.closest("[data-effort-tail]")
    ) {
      return;
    }
    const el = scrollerRef.current;
    if (!el) return;
    e.preventDefault();
    const pan = {
      startX: e.clientX,
      startY: e.clientY,
      startLeft: el.scrollLeft,
      startTop: el.scrollTop,
    };
    panRef.current = pan;
    setPanning(true);
    const onMove = (ev: PointerEvent) => {
      const p = panRef.current;
      const box = scrollerRef.current;
      if (!p || !box) return;
      const wantLeft = p.startLeft - (ev.clientX - p.startX);
      box.scrollLeft = wantLeft;
      box.scrollTop = p.startTop - (ev.clientY - p.startY);
      lastScrollLeft.current = box.scrollLeft;
      extendNearEdges({ pan: p, wantLeft });
    };
    const onUp = () => {
      panRef.current = null;
      setPanning(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function startDueDrag(e: ReactPointerEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const snapshot = JSON.parse(JSON.stringify(demoRef.current)) as EffortDemo;
    const base = snapshot.milestone.due;
    let lastDelta = 0;
    const onMove = (ev: PointerEvent) => {
      const delta = Math.round((ev.clientX - startX) / WEEK_PX);
      if (delta === lastDelta) return;
      lastDelta = delta;
      const dt = new Date(base.y, base.m - 1, base.d);
      dt.setDate(dt.getDate() + 7 * delta);
      commit(
        setMilestoneDue(snapshot, {
          y: dt.getFullYear(),
          m: dt.getMonth() + 1,
          d: dt.getDate(),
        }),
      );
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function startTailDrag(e: ReactPointerEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const snapshot = JSON.parse(JSON.stringify(demoRef.current)) as EffortDemo;
    const baseTail = Math.max(1, snapshot.milestone.tailWeeks);
    let lastDelta = 0;
    const onMove = (ev: PointerEvent) => {
      const delta = Math.round((ev.clientX - startX) / WEEK_PX);
      if (delta === lastDelta) return;
      lastDelta = delta;
      commit(setTailWeeks(snapshot, Math.max(1, baseTail - delta)));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
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
    const startX = e.clientX;
    const snapshot = JSON.parse(JSON.stringify(demoRef.current)) as EffortDemo;
    const base = edge === "start" ? runStart : runEnd;
    let lastIndex = base;
    const onMove = (ev: PointerEvent) => {
      const delta = Math.round((ev.clientX - startX) / WEEK_PX);
      const newIndex = base + delta;
      if (newIndex === lastIndex) return;
      lastIndex = newIndex;
      commit(resizeHourRun(snapshot, taskId, resourceId, runStart, runEnd, edge, newIndex));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function startSummaryResize(
    e: ReactPointerEvent,
    scope: { kind: "all" } | { kind: "task"; taskId: string } | { kind: "group"; groupKey: string },
    spanStart: number,
    spanEnd: number,
    edge: "start" | "end",
  ) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const snapshot = JSON.parse(JSON.stringify(demoRef.current)) as EffortDemo;
    const base = edge === "start" ? spanStart : spanEnd;
    let lastIndex = base;
    const onMove = (ev: PointerEvent) => {
      const delta = Math.round((ev.clientX - startX) / WEEK_PX);
      const newIndex = base + delta;
      if (newIndex === lastIndex) return;
      lastIndex = newIndex;
      commit(resizeMatchingSpan(snapshot, scope, edge, newIndex));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function startBarDrag(
    startX: number,
    kind: BarKind,
    meta: { taskId?: string; resourceId?: string; groupKey?: string },
  ) {
    if (readOnly) return;
    barDrag.current = {
      kind,
      ...meta,
      startX,
      snapshot: JSON.parse(JSON.stringify(demoRef.current)) as EffortDemo,
      lastDelta: 0,
    };
    const onMove = (ev: PointerEvent) => {
      const d = barDrag.current;
      if (!d) return;
      const delta = Math.round((ev.clientX - d.startX) / WEEK_PX);
      if (delta === d.lastDelta) return;
      d.lastDelta = delta;
      if (d.kind === "l0") commit(shiftAll(d.snapshot, delta));
      else if (d.kind === "l1-task" && d.taskId) {
        commit(shiftTask(d.snapshot, d.taskId, delta));
      } else if (d.kind === "l1-group" && d.groupKey) {
        commit(shiftResourceGroup(d.snapshot, d.groupKey, delta));
      } else if (d.kind === "l2" && d.taskId && d.resourceId) {
        commit(shiftResource(d.snapshot, d.taskId, d.resourceId, delta));
      }
    };
    const onUp = () => {
      barDrag.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function onBarDown(
    e: ReactPointerEvent,
    kind: BarKind,
    meta: { taskId?: string; resourceId?: string; groupKey?: string },
  ) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    startBarDrag(e.clientX, kind, meta);
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
      s.people.push({
        id,
        name,
        role: "",
        weeklyCapacityHours: DEFAULT_WEEKLY_CAPACITY_HOURS,
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

  const metaHeaders = [
    ["start", "Start"],
    ["finish", "Finish"],
    ["dur", "Duration"],
    ["hours", "Hours"],
  ] as const;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-end gap-2">
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
              onClick={() => {
                setMode(id);
                setCollapsed({});
                setAllCollapsed(false);
              }}
            >
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
                title={
                  id === "unstick"
                    ? "Milestone and tail move independently of Task/Res hours"
                    : id === "tail-start"
                      ? "Keep the gap from earliest work to tail start"
                      : "Keep the gap from latest work to due"
                }
                onClick={() => commit(setStick(demo, id as EffortStick))}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
        <div className="mrt-gantt-tools rounded-md border border-[var(--border)]">
          <button
            type="button"
            className="mrt-gantt-tool"
            title="Crop blank weeks, keeping one empty week on each side of the data"
            onClick={() => commit(trimAroundGantt(demo, place === "milestone"))}
          >
            Trim around Gantt
          </button>
          <button
            type="button"
            className="mrt-gantt-tool"
            disabled={mode === "flat"}
            title="Collapse or expand all groups"
            onClick={() => {
              if (mode === "flat") return;
              if (allCollapsed) {
                setCollapsed({});
                setAllCollapsed(false);
              } else {
                const keys = rows.filter((r) => r.type === "l1").map((r) => r.key);
                setCollapsed(Object.fromEntries(keys.map((k) => [k, true])));
                setAllCollapsed(true);
              }
            }}
          >
            {allCollapsed ? "Expand" : "Collapse"}
          </button>
          <button
            type="button"
            className="mrt-gantt-tool"
            title="Show or hide Start, Finish, Duration, and Hours"
            onClick={() => setShowMeta((v) => !v)}
          >
            {showMeta ? "Hide columns" : "Show columns"}
          </button>
        </div>
        {toolbarNote === null || toolbarNote === "" ? null : (
        <span className="text-xs text-[var(--muted)]">
          {toolbarNote ?? `${n} weeks`}
        </span>
        )}
      </div>

      <div
        ref={scrollerRef}
        className={`effort-gantt overflow-auto rounded-[10px] border border-[var(--border)] bg-[var(--surface)] pb-6${panning ? " is-panning" : ""}`}
        onPointerDown={startPan}
        onScroll={() => {
          const el = scrollerRef.current;
          if (!el) return;
          const dx = el.scrollLeft - lastScrollLeft.current;
          lastScrollLeft.current = el.scrollLeft;
          if (!dx) return;
          const ae = document.activeElement;
          if (
            ae &&
            el.contains(ae) &&
            (ae.tagName === "INPUT" ||
              ae.tagName === "SELECT" ||
              ae.tagName === "TEXTAREA")
          ) {
            return;
          }
          extendNearEdges();
        }}
      >
        <div
          className="effort-gantt-grid grid"
          style={{
            gridTemplateColumns: `${FN_W}px ${labelW}px ${chartW}px`,
          }}
        >
          <div
            className="effort-gantt-fn effort-gantt-head"
            style={{ height: HEAD_H, position: "sticky", left: 0, zIndex: 30 }}
          />
          <div
            className="effort-gantt-head effort-gantt-labels is-summary flex border-b border-[var(--border)] text-[10px]"
            style={{ height: HEAD_H, position: "sticky", left: FN_W, zIndex: 20 }}
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
            {showMeta
              ? metaHeaders.map(([key, label]) =>
                  mode === "flat" ? (
                    <button
                      key={key}
                      type="button"
                      className={`effort-gantt-sort effort-gantt-meta px-1${key === "hours" ? " effort-gantt-hours" : ""}`}
                      style={{ width: key === "hours" ? HOURS_W : META_W }}
                      onClick={() => toggleSort(key)}
                    >
                      {label}{sortMark(key)}
                    </button>
                  ) : (
                    <span
                      key={key}
                      className={`effort-gantt-meta px-1${key === "hours" ? " effort-gantt-hours" : ""}`}
                      style={{ width: key === "hours" ? HOURS_W : META_W }}
                    >
                      {label}
                    </span>
                  ),
                )
              : null}
          </div>
          <div
            className="effort-gantt-head effort-gantt-weekhead relative flex border-b border-[var(--border)] text-[10px]"
            style={{ height: HEAD_H, zIndex: 1 }}
          >
            {weeks.map((w) => (
              <div
                key={w.idx}
                className="flex shrink-0 items-center justify-center border-r border-[var(--border)]/50"
                style={{ width: WEEK_PX }}
              >
                {w.label}
              </div>
            ))}
            {showToday ? (
              <div className="effort-gantt-today" style={{ left: todayCol * WEEK_PX + WEEK_PX / 2 }} title="Today" />
            ) : null}
          </div>

          {place === "milestone" ? (
            <>
              <div className="effort-gantt-fn" style={{ height: MS_H, position: "sticky", left: 0, zIndex: 30 }}>
                <span className="text-[10px] text-[var(--muted)]" title="Milestone due">◆</span>
              </div>
              <div className="effort-gantt-labels is-summary" style={{ position: "sticky", left: FN_W, zIndex: 20 }}>
                <MilestoneLabel
                  demo={demo}
                  weeks={weeks}
                  nameW={nameW}
                  showMeta={showMeta}
                  onDue={(due) => commit(setMilestoneDue(demo, due))}
                  onTail={(weeksCount) => commit(setTailWeeks(demo, weeksCount))}
                />
              </div>
              <MilestoneLane
                demo={demo}
                baseline={baselineDemo}
                stick={demo.stick}
                todayCol={showToday ? todayCol : null}
                onDueDrag={startDueDrag}
                onTailDrag={startTailDrag}
              />
            </>
          ) : null}

          {visibleRows.map((row) => {
            const meta = barMeta(row);
            return (
              <RowTriple
                key={row.key}
                row={row}
                weeks={weeks}
                mode={mode}
                place={place}
                nameW={nameW}
                showMeta={showMeta}
                baselineHours={baselineHoursForRow(baselineDemo, row)}
                n={n}
                stick={demo.stick}
                dueCol={dueCol}
                tailStartCol={tailStartCol}
                todayCol={showToday ? todayCol : null}
                dropSlot={dropSlot}
                store={store}
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
                  if (row.personId) {
                    if (!window.confirm("Changing role will reset the name.")) return;
                    persist((s) => {
                      let next = ensureEffortDemo(demo);
                      next = setResourcePerson(next, row.taskId, row.resourceId, undefined);
                      s.effortDemo = setResourceRole(next, row.taskId, row.resourceId, value);
                    });
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
        </div>
      </div>

      <div className="effort-gantt-legend">
        <span><b>Pan</b> drag empty chart or week header; edges extend the calendar</span>
        <span><b>⋮⋮</b> drag a row; green line shows insert position</span>
        <span><b className="text-[var(--rag-green)]">+</b> add row</span>
        <span><b className="text-[var(--rag-red)]">×</b> remove row</span>
        <span><b>Trim</b> drop empty weeks, keep one blank week each side</span>
        {place === "milestone" ? (
          <>
            <span><b>◆</b> drag due by weeks; drag the tail’s left end to change length</span>
            <span>Drag chunk <b>edges</b> to grow or shrink hours</span>
            <span><b>Stick</b> tail end keeps the gap to due; tail start keeps the gap to tail start</span>
            <span><b className="text-[var(--rag-red)]">|</b> today</span>
            <span><b>*</b> name assigned outside the Resource × Role ticks</span>
          </>
        ) : (
          <>
            <span>Drag chunk <b>edges</b> to grow or shrink hours</span>
            <span>Defaults maps <b>tasks</b> to <b>resource roles</b> only</span>
            <span>Defaults uses <b>W1…n</b> labels until live occurrence wiring</span>
          </>
        )}
      </div>
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
  );
}

function personLabel(store: ScheduleStore, personId?: string) {
  if (!personId) return "";
  return store.people.find((p) => p.id === personId)?.name || personId;
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
  showMeta,
  baselineHours,
  n,
  stick,
  dueCol,
  tailStartCol,
  todayCol,
  dropSlot,
  store,
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
  onBarDown,
  onRunResize,
}: {
  row: EffortLayoutRow;
  weeks: { label: string }[];
  mode: EffortGroupMode;
  place: ChartPlace;
  nameW: number;
  showMeta: boolean;
  baselineHours?: number[];
  n: number;
  stick: EffortStick;
  dueCol: number;
  tailStartCol: number;
  todayCol: number | null;
  dropSlot: DropSlot | null;
  store: ScheduleStore;
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
  onBarDown: (e: ReactPointerEvent) => void;
  onRunResize: (
    e: ReactPointerEvent,
    runStart: number,
    runEnd: number,
    edge: "start" | "end",
  ) => void;
}) {
  const h = rowHeight(row.type);
  const canDrag = row.type === "l1" || (row.type === "l2" && (!row.synthetic || mode === "res-task"));
  return (
    <>
      <div
        className="effort-gantt-fn relative"
        data-effort-row={row.key}
        style={{ height: h, position: "sticky", left: 0, zIndex: 30 }}
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
      <div
        className={`relative min-w-0 effort-gantt-labels${row.type === "l2" ? "" : " is-summary"}`}
        data-effort-row={row.key}
        style={{ position: "sticky", left: FN_W, zIndex: 20 }}
      >
        <DropMark slot={dropSlot} rowKey={row.key} />
        <RowLabel
          row={row}
          weeks={weeks}
          mode={mode}
          place={place}
          nameW={nameW}
          showMeta={showMeta}
          store={store}
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
          onRenameTask={onRenameTask}
          onRenameRole={onRenameRole}
          onSelectRole={onSelectRole}
          onSelectPerson={onSelectPerson}
        />
      </div>
      <div className="relative" data-effort-row={row.key} style={{ zIndex: 1 }}>
        <DropMark slot={dropSlot} rowKey={row.key} />
        <TimelineRow
          row={row}
          n={n}
          stick={place === "milestone" ? stick : "unstick"}
          dueCol={dueCol}
          tailStartCol={tailStartCol}
          todayCol={todayCol}
          baselineHours={baselineHours}
          onHour={onHour}
          onBarDown={onBarDown}
          onRunResize={onRunResize}
        />
      </div>
    </>
  );
}

function MilestoneLabel({
  demo,
  weeks,
  nameW,
  showMeta,
  onDue,
  onTail,
}: {
  demo: EffortDemo;
  weeks: { label: string }[];
  nameW: number;
  showMeta: boolean;
  onDue: (due: { y: number; m: number; d: number }) => void;
  onTail: (weeks: number) => void;
}) {
  const dueCol = dueColumnIndex(demo);
  const tail = Math.max(1, demo.milestone.tailWeeks);
  const startIdx = dueCol - tail + 1;
  return (
    <div
      className="flex items-center border-b border-[var(--border)] bg-[var(--surface-muted)] text-[11px] font-semibold"
      style={{ height: MS_H }}
    >
      <span className="truncate px-2" style={{ width: nameW }}>
        {demo.milestone.label}
      </span>
      {showMeta ? (
        <>
          <span className="effort-gantt-meta" style={{ width: META_W }}>
            {weeks[startIdx]?.label ?? "—"}
          </span>
          <span className="flex items-center justify-end px-1" style={{ width: META_W }}>
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
          <span className="flex items-center justify-end px-0.5" style={{ width: META_W }}>
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
          <span className="effort-gantt-meta effort-gantt-hours" style={{ width: HOURS_W }}>
            —
          </span>
        </>
      ) : null}
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
      className="effort-gantt-select"
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
      className="effort-gantt-select"
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
  weeks,
  mode,
  place,
  nameW,
  showMeta,
  store,
  collapsed,
  onToggleCollapse,
  onRenameTask,
  onRenameRole,
  onSelectRole,
  onSelectPerson,
}: {
  row: EffortLayoutRow;
  weeks: { label: string }[];
  mode: EffortGroupMode;
  place: ChartPlace;
  nameW: number;
  showMeta: boolean;
  store: ScheduleStore;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onRenameTask: (name: string) => void;
  onRenameRole: (name: string) => void;
  onSelectRole: (value: string) => void;
  onSelectPerson: (value: string) => void;
}) {
  const h = rowHeight(row.type);
  const indent = row.type === "l2" && mode !== "flat" ? 8 : 0;
  const personCol = place === "milestone";
  const roleValue =
    row.type === "l2" && row.resourceName && !row.resourceName.startsWith("--")
      ? row.resourceName
      : "";
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
          <span className="truncate text-[11px] font-semibold">{row.label}</span>
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
              className="effort-gantt-input"
              value={row.label}
              onChange={(e) =>
                row.taskId ? onRenameTask(e.target.value) : onRenameRole(e.target.value)
              }
            />
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
          <span className="effort-gantt-flat-col min-w-0" style={{ width: FLAT_COL_W }}>
            <input
              tabIndex={-1}
              className="effort-gantt-input"
              style={{ width: "100%" }}
              value={row.taskName || row.label}
              onChange={(e) => onRenameTask(e.target.value)}
            />
          </span>
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
      {showMeta ? (
        <>
          <span className="effort-gantt-meta" style={{ width: META_W }}>
            {spanLabel(row.span, weeks, "start")}
          </span>
          <span className="effort-gantt-meta" style={{ width: META_W }}>
            {spanLabel(row.span, weeks, "finish")}
          </span>
          <span className="effort-gantt-meta" style={{ width: META_W }}>
            {row.span.dur || "—"}
          </span>
          <span className="effort-gantt-meta effort-gantt-hours font-medium text-[var(--ink)]" style={{ width: HOURS_W }}>
            {row.span.total || "—"}
          </span>
        </>
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
  const left = startCol * WEEK_PX;
  const dueX = diamondX(dueCol);
  const tailCapX = stick === "tail-start" ? left : dueX;
  const baseDueCol = baseline ? dueColumnIndex(ensureEffortDemo(baseline)) : null;
  const baseTail = baseline
    ? Math.max(1, ensureEffortDemo(baseline).milestone.tailWeeks)
    : 0;
  const baseStartCol =
    baseDueCol !== null ? baseDueCol - baseTail + 1 : 0;
  const baseLeft = baseStartCol * WEEK_PX;
  const baseDueX = baseDueCol !== null ? diamondX(baseDueCol) : 0;
  return (
    <div className="relative border-b border-[var(--border)]" style={{ height: MS_H, zIndex: 1 }}>
      {baseline && baseDueCol !== null ? (
        <>
          <div
            className="effort-gantt-baseline-bar absolute top-1/2 h-2 -translate-y-1/2 rounded-sm"
            style={{
              left: baseLeft + 4,
              width: Math.max(8, baseDueX - baseLeft - 4),
            }}
            title="Default milestone and tail"
          />
          <div
            className="effort-gantt-baseline-diamond absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45"
            style={{ left: baseDueX }}
            title="Default due"
          />
        </>
      ) : null}
      <div
        className="absolute top-1/2 h-2 -translate-y-1/2 rounded-sm"
        style={{
          left: left + 4,
          width: Math.max(8, dueX - left - 4),
          background: "color-mix(in srgb, var(--ink) 28%, transparent)",
        }}
        title={`${demo.milestone.tailWeeks} week tail`}
      />
      <div
        data-effort-tail
        className="effort-gantt-resize is-bar"
        style={{ left: left + 4 - 3, top: 15, height: 8 }}
        title="Drag to change tail length"
        onPointerDown={onTailDrag}
      />
      {stick !== "unstick" ? (
        <div className="effort-gantt-stuck-cap is-tail-top" style={{ left: tailCapX - 1 }} />
      ) : null}
      <div
        data-effort-diamond
        className="effort-gantt-diamond absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-[var(--ink)] bg-[var(--rag-green)]"
        style={{ left: dueX }}
        title="Drag due date"
        onPointerDown={onDueDrag}
      />
      {todayCol !== null ? (
        <div className="effort-gantt-today" style={{ left: todayCol * WEEK_PX + WEEK_PX / 2 }} />
      ) : null}
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
  const barLeft =
    span.start !== null ? span.start * WEEK_PX + 2 : 0;
  const barWidth =
    span.start !== null && span.finish !== null
      ? Math.max(8, (span.finish - span.start + 1) * WEEK_PX - 4)
      : 0;
  const dueX = diamondX(dueCol);
  const tailStartX = tailStartCol * WEEK_PX;
  const barRight = barLeft + barWidth;
  const allX = stick === "tail-start" ? barLeft : barRight;
  const tailX = stick === "tail-start" ? tailStartX : dueX;
  const joinLeft = Math.min(allX, tailX);
  const joinWidth = Math.abs(tailX - allX);
  return (
    <div
      className="relative border-b border-[var(--border)]/60"
      style={{
        height: h,
        background: isSummary ? "var(--surface-muted)" : undefined,
      }}
    >
      {Array.from({ length: n }, (_, i) => (
        <div
          key={i}
          className="pointer-events-none absolute top-0 bottom-0 border-r border-[var(--border)]/40"
          style={{ left: i * WEEK_PX }}
        />
      ))}
      {todayCol !== null ? (
        <div className="effort-gantt-today" style={{ left: todayCol * WEEK_PX + WEEK_PX / 2 }} />
      ) : null}
      {row.type === "l2" && baselineHours
        ? hourRuns(baselineHours).map((run) => {
            const left = run.start * WEEK_PX + 2;
            const width = Math.max(8, (run.end - run.start + 1) * WEEK_PX - 4);
            return (
              <div
                key={`base-${run.start}-${run.end}`}
                className="effort-gantt-baseline-bar absolute rounded-sm"
                style={{
                  left,
                  top: 9,
                  width,
                  height: 14,
                }}
                title="Default hours"
              />
            );
          })
        : null}
      {isSummary && span.start !== null && span.finish !== null ? (
        <>
          <button
            type="button"
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
            className="effort-gantt-resize is-bar"
            style={{
              left: barLeft - 3,
              top: row.type === "l0" ? 10 : 9,
              height: row.type === "l0" ? 12 : 10,
            }}
            title="Resize hours"
            onPointerDown={(e) => onRunResize(e, span.start as number, span.finish as number, "start")}
          />
          <div
            data-effort-resize
            className="effort-gantt-resize is-bar"
            style={{
              left: barLeft + barWidth - 5,
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
              left: joinLeft,
              width: joinWidth,
            }}
          />
          <div
            className="effort-gantt-stuck-cap is-tail-bottom"
            style={{ left: tailX - 1 }}
            title={stick === "tail-start" ? "Stuck to tail start" : "Stuck to tail end"}
          />
          <div
            className="effort-gantt-stuck-cap is-all"
            style={{ left: allX - 1 }}
            title={stick === "tail-start" ? "Stuck to tail start" : "Stuck to tail end"}
          />
        </>
      ) : null}
      {row.type === "l2" && span.start !== null && span.finish !== null ? (
        <button
          type="button"
          data-effort-grab
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
        ? hourRuns(row.hours).map((run) => {
            const left = run.start * WEEK_PX + 2;
            const width = Math.max(8, (run.end - run.start + 1) * WEEK_PX - 4);
            return (
              <div key={`${run.start}-${run.end}`}>
                <div
                  className="pointer-events-none absolute rounded-sm"
                  style={{
                    left,
                    top: 9,
                    width,
                    height: 14,
                    background: row.color,
                    opacity: 0.85,
                  }}
                />
                <div
                  data-effort-resize
                  className="effort-gantt-resize"
                  style={{ left: left - 3 }}
                  title="Resize hours"
                  onPointerDown={(e) => onRunResize(e, run.start, run.end, "start")}
                />
                <div
                  data-effort-resize
                  className="effort-gantt-resize"
                  style={{ left: left + width - 5 }}
                  title="Resize hours"
                  onPointerDown={(e) => onRunResize(e, run.start, run.end, "end")}
                />
              </div>
            );
          })
        : null}
      {row.type === "l2"
        ? Array.from({ length: n }, (_, i) => (
            <HourCell
              key={i}
              hours={row.hours[i] || 0}
              left={i * WEEK_PX}
              onCommit={(hours) => onHour(i, hours)}
            />
          ))
        : null}
    </div>
  );
}

function HourCell({
  hours,
  left,
  onCommit,
}: {
  hours: number;
  left: number;
  onCommit: (hours: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft ?? (hours ? String(hours) : "");
  return (
    <div
      className="absolute z-[2] flex items-center justify-center"
      style={{ left, width: WEEK_PX, top: 8, bottom: 0 }}
    >
      <input
        type="text"
        inputMode="decimal"
        className="effort-gantt-input effort-gantt-hour"
        style={{
          width: WEEK_PX - 6,
          color: hours > 0 && draft === null ? "#fff" : "var(--ink)",
        }}
        value={display}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={() => {
          if (draft !== null) onCommit(Number(draft) || 0);
          setDraft(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
    </div>
  );
}
