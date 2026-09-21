"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { idxToYm } from "../logic/dates";
import {
  type LoadContribution,
  type LoadGrain,
  type PersonMonthLoad,
} from "../logic/resource-load";
import {
  makeGanttXScale,
  monthStartX,
  type GanttXScale,
} from "../logic/gantt-x-scale";
import { GanttTimescale, ganttTimescaleHeight, monthGridEdge, weekGridLine } from "./GanttTimescale";
import { MrtInlineLoading } from "./MrtLoadingPane";
import { BusySpin, runPaintedBusy } from "./paint-busy";

const DEFAULT_ROW_H = 28;
const TITLE_H = 28;

function fmtHours(n: number, showZero = false) {
  if (!n) return showZero ? "0" : "";
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

export function ResourceLoadPane({
  rows,
  months,
  monthPx,
  winStart,
  labelW,
  todayX,
  height,
  grain,
  scrollRef,
  onScrollLeft,
  onOpenContribution,
  onRebalanceAll,
  onClosePane,
  showClose,
  timescale = "compact",
  years,
  scale: scaleProp,
  rowH = DEFAULT_ROW_H,
  onPanPointerDown,
  panning = false,
  onGoToPerson,
  loading = false,
}: {
  rows: PersonMonthLoad[];
  months: number;
  monthPx: number;
  winStart: { y: number; m: number };
  labelW: number;
  todayX: number;
  height: number | string;
  grain: LoadGrain;
  rowH?: number;
  scrollRef: RefObject<HTMLDivElement | null>;
  onScrollLeft: (left: number) => void;
  onOpenContribution: (c: LoadContribution) => void;
  onRebalanceAll?: (contributions: LoadContribution[], personId: string) => void;
  onClosePane?: () => void;
  showClose?: boolean;
  timescale?: "full" | "compact";
  years: { y: number; start: number; span: number }[];
  scale?: GanttXScale;
  onPanPointerDown?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  panning?: boolean;
  onGoToPerson?: (personId: string) => void;
  loading?: boolean;
}) {
  const nameRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [pop, setPop] = useState<{
    x: number;
    y: number;
    contributions: LoadContribution[];
    label: string;
    personId: string;
  } | null>(null);
  const [rebalanceBusy, setRebalanceBusy] = useState(false);

  const syncNames = useCallback(() => {
    const chart = scrollRef.current;
    const names = nameRef.current;
    if (chart && names) names.scrollTop = chart.scrollTop;
    if (chart && headerRef.current) headerRef.current.scrollLeft = chart.scrollLeft;
  }, [scrollRef]);

  useEffect(() => {
    if (!pop) return;
    function onDoc(e: PointerEvent) {
      if (rebalanceBusy) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("[data-mrt-alloc-pop]")) return;
      setPop(null);
    }
    document.addEventListener("pointerdown", onDoc, true);
    return () => document.removeEventListener("pointerdown", onDoc, true);
  }, [pop, rebalanceBusy]);

  const scale = scaleProp || makeGanttXScale(winStart, months, monthPx, grain);
  const width = scale.width;
  const bodyH = Math.max(rows.length * rowH, 1);
  const scaleH = ganttTimescaleHeight(grain, timescale);

  return (
    <div
      className="mrt-alloc-pane relative"
      style={{
        height,
        display: "grid",
        gridTemplateColumns: `${labelW}px 1fr`,
        gridTemplateRows: `${TITLE_H}px ${scaleH}px 1fr`,
      }}
    >
      <div className="mrt-alloc-title" style={{ gridColumn: "1 / -1" }}>
        <span>Resource hours</span>
        {showClose && onClosePane ? (
          <button
            type="button"
            className="mrt-pane-x"
            title="Hide hours"
            onClick={onClosePane}
          >
            ×
          </button>
        ) : null}
      </div>
      <div className="border-r border-b border-[var(--border)] bg-[var(--surface-muted)]" />
      <div
        ref={headerRef}
        className="overflow-hidden border-b border-[var(--border)] bg-[var(--surface)]"
        style={{ cursor: panning ? "grabbing" : "grab" }}
        onPointerDown={onPanPointerDown}
      >
        <GanttTimescale
          months={months}
          monthPx={monthPx}
          winStart={winStart}
          todayX={todayX}
          grain={grain}
          density={timescale}
          years={years}
          scale={scale}
        />
      </div>
      <div
        ref={nameRef}
        className="overflow-hidden border-r border-[var(--border)] bg-[var(--surface)]"
      >
        <div style={{ height: bodyH }}>
          {rows.map((row) => (
            <div key={row.personId} className="mrt-alloc-name" style={{ height: rowH }}>
              {onGoToPerson ? (
                <button
                  type="button"
                  data-mrt-alloc-name-link
                  className="mrt-alloc-name-link min-w-0 flex-1 truncate font-medium"
                  title="Open Resource Names"
                  onClick={(e) => {
                    e.stopPropagation();
                    onGoToPerson(row.personId);
                  }}
                >
                  {row.personName}
                </button>
              ) : (
                <span className="min-w-0 flex-1 truncate font-medium">
                  {row.personName}
                </span>
              )}
              <span className="max-w-[40%] shrink-0 truncate text-[9px] text-[var(--muted)]">
                {row.role}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div
        ref={scrollRef}
        className="overflow-auto bg-[var(--surface)]"
        style={{ cursor: panning ? "grabbing" : "grab" }}
        onPointerDown={onPanPointerDown}
        onScroll={() => {
          syncNames();
          onScrollLeft(scrollRef.current?.scrollLeft ?? 0);
        }}
      >
        <div className="relative" style={{ width, height: bodyH }}>
          {grain === "week"
            ? Array.from({ length: months }, (_, i) => {
                const { m0 } = idxToYm(i, winStart);
                return (
                  <div
                    key={`m-${i}`}
                    className="absolute top-0 bottom-0"
                    style={{
                      left: monthStartX(scale, i),
                      width: 1,
                      background: monthGridEdge(m0, grain),
                    }}
                  />
                );
              })
            : Array.from({ length: months }, (_, i) => {
            const { m0 } = idxToYm(i, winStart);
            return (
              <div
                key={`m-${i}`}
                className="absolute top-0 bottom-0"
                style={{
                  left: i * monthPx,
                  width: 1,
                  background: monthGridEdge(m0, grain),
                }}
              />
            );
          })}
          {grain === "week"
            ? scale.slots.map((slot, i) => (
                  <div
                    key={`w-${i}`}
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
          {rows.map((row, ri) => (
            <div
              key={row.personId}
              className="absolute right-0 left-0 border-b border-[var(--border)]/60"
              style={{ top: ri * rowH, height: rowH }}
            >
              {row.cells.map((cell, mi) => {
                const inChunk =
                  row.chunkStart >= 0 && mi >= row.chunkStart && mi <= row.chunkEnd;
                const over = cell.rag === "yellow" || cell.rag === "red";
                const multi = over && cell.contributions.length >= 2;
                const clickable = cell.hours > 0 || cell.contributions.length > 0;
                if (!clickable) return null;
                const label = inChunk && cell.hours > 0 ? fmtHours(cell.hours) : "";
                return (
                  <button
                    key={mi}
                    type="button"
                    data-mrt-alloc-over={clickable ? "true" : undefined}
                    className={`mrt-alloc-cell${over ? ` is-over ${cell.rag}` : ""}${
                      clickable ? " is-over" : ""
                    }${multi ? " is-multi" : ""}`}
                    style={{
                      left:
                        grain === "week"
                          ? mi * scale.weekPx
                          : cell.startC * monthPx,
                      width:
                        grain === "week"
                          ? scale.weekPx
                          : Math.max(2, (cell.endC - cell.startC) * monthPx),
                    }}
                    disabled={!clickable}
                    title={
                      inChunk
                        ? `${fmtHours(cell.hours, true)} h / ${fmtHours(cell.cap, true)} h capacity${
                            multi
                              ? ` · ${cell.contributions.length} obligations (overlap)`
                              : over
                                ? " · single obligation over-assign"
                                : ""
                          }`
                        : undefined
                    }
                    onClick={(e) => {
                      if (!clickable) return;
                      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setPop({
                        x: Math.min(r.left, window.innerWidth - 280),
                        y: Math.min(r.bottom + 4, window.innerHeight - 220),
                        contributions: cell.contributions,
                        label: `${row.personName} · ${fmtHours(cell.hours, true)} h`,
                        personId: row.personId,
                      });
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {loading ? (
        <div
          className="mrt-alloc-loading"
          style={{ gridColumn: "1 / -1", gridRow: "2 / -1" }}
        >
          <MrtInlineLoading label="hours" />
        </div>
      ) : null}
      {pop ? (
        <div
          data-mrt-alloc-pop
          className="mrt-alloc-pop"
          style={{ left: pop.x, top: pop.y }}
        >
          <div className="mb-1 flex items-start justify-between gap-2">
            <p className="text-[10px] font-semibold">{pop.label}</p>
            <button
              type="button"
              className="mrt-pane-x"
              title="Close"
              aria-label="Close"
              onClick={() => setPop(null)}
            >
              ×
            </button>
          </div>
          <p className="mb-1.5 text-[10px] text-[var(--muted)]">
            Contributing obligations
          </p>
          {pop.contributions.length === 0 ? (
            <p className="text-[11px] text-[var(--muted)]">No named people on this cell.</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
              {pop.contributions.map((c) => (
                <li key={`${c.damId}|${c.laneCode}|${c.procDueIdx}`}>
                  <button
                    type="button"
                    className="mrt-alloc-pop-item"
                    onClick={() => {
                      onOpenContribution(c);
                      setPop(null);
                    }}
                  >
                    <span className="truncate">
                      {c.damName} · {c.laneLabel}
                    </span>
                    <span className="shrink-0 tabular-nums">{fmtHours(c.hours)} h</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {onRebalanceAll && pop.contributions.length > 0 ? (
            <button
              type="button"
              className="mrt-alloc-pop-rebalance"
              aria-busy={rebalanceBusy}
              disabled={rebalanceBusy}
              onClick={() => {
                void runPaintedBusy(setRebalanceBusy, () => {
                  onRebalanceAll(pop.contributions, pop.personId);
                  setPop(null);
                });
              }}
            >
              <BusySpin on={rebalanceBusy} />
              Rebalance all
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
