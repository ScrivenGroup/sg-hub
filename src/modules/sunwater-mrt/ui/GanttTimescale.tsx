import { idxToYm, MONTH_NAMES, sundayWeekOfYear } from "../logic/dates";
import type { LoadGrain } from "../logic/resource-load";
import {
  makeGanttXScale,
  weekMonthBands,
  weekYearBands,
  type GanttXScale,
} from "../logic/gantt-x-scale";

export function ganttTimescaleHeight(grain: LoadGrain, density: "full" | "compact") {
  if (density === "compact") return grain === "week" ? 36 : 24;
  return grain === "week" ? 64 : 52;
}

function monthScaleEdge(m0: number, grain: LoadGrain) {
  if (grain === "week") {
    const year = 100;
    const quarter = 70;
    const month = 55;
    if (m0 === 0) {
      return `color-mix(in srgb, var(--border) ${year}%, transparent)`;
    }
    if (m0 === 3 || m0 === 6 || m0 === 9) {
      return `color-mix(in srgb, var(--border) ${quarter}%, transparent)`;
    }
    return `color-mix(in srgb, var(--border) ${month}%, transparent)`;
  }
  const strong = 100;
  const mid = 50;
  const faint = 22;
  if (m0 === 0) {
    return `color-mix(in srgb, var(--border) ${strong}%, transparent)`;
  }
  if (m0 === 3 || m0 === 6 || m0 === 9) {
    return `color-mix(in srgb, var(--border) ${mid}%, transparent)`;
  }
  return `color-mix(in srgb, var(--border) ${faint}%, transparent)`;
}

export function weekGridLine() {
  return "color-mix(in srgb, var(--border) 22%, transparent)";
}

export function GanttTimescale({
  months,
  monthPx,
  winStart,
  todayX,
  grain,
  density,
  years,
  showToday = true,
  scale: scaleProp,
}: {
  months: number;
  monthPx: number;
  winStart: { y: number; m: number };
  todayX: number;
  grain: LoadGrain;
  density: "full" | "compact";
  years: { y: number; start: number; span: number }[];
  showToday?: boolean;
  scale?: GanttXScale;
}) {
  const scale =
    scaleProp || makeGanttXScale(winStart, months, monthPx, grain);
  const width = scale.width;
  const compact = density === "compact";
  const weekYears = grain === "week" ? weekYearBands(scale) : [];
  const weekMonths = grain === "week" ? weekMonthBands(scale) : [];

  return (
    <div style={{ width }} className="relative">
      {density === "full" ? (
        <div className={`flex font-medium ${compact ? "text-[8px]" : "text-[10px]"}`}>
          {grain === "week"
            ? weekYears.map((yr) => (
                <div
                  key={yr.y}
                  className="border-r border-[var(--border)] px-1 pt-0.5"
                  style={{ width: yr.width }}
                >
                  {yr.y}
                </div>
              ))
            : years.map((yr) => (
                <div
                  key={yr.y}
                  className="border-r border-[var(--border)] px-1 pt-0.5"
                  style={{ width: yr.span * monthPx }}
                >
                  {yr.y}
                </div>
              ))}
        </div>
      ) : null}
      {density === "full" && grain !== "week" ? (
        <div className="flex text-[8px] text-[var(--muted)]">
          {Array.from({ length: months }, (_, i) => {
            const { m0 } = idxToYm(i, winStart);
            const q =
              m0 === 0 ? "Q1" : m0 === 3 ? "Q2" : m0 === 6 ? "Q3" : m0 === 9 ? "Q4" : "";
            return (
              <div
                key={i}
                className="shrink-0 pl-0.5"
                style={{
                  width: monthPx,
                  borderLeft: `1px solid ${monthScaleEdge(m0, grain)}`,
                }}
              >
                {monthPx >= 10 ? q : ""}
              </div>
            );
          })}
        </div>
      ) : null}
      {grain === "week" && density === "full" ? (
        <div className="flex text-[8px] text-[var(--muted)]">
          {weekMonths.map((band, i) => {
            const q =
              band.m0 === 0
                ? "Q1"
                : band.m0 === 3
                  ? "Q2"
                  : band.m0 === 6
                    ? "Q3"
                    : band.m0 === 9
                      ? "Q4"
                      : "";
            return (
              <div
                key={`${band.y}-${band.m0}-${i}`}
                className="shrink-0 overflow-hidden pl-0.5"
                style={{
                  width: band.width,
                  borderLeft: `1px solid ${monthScaleEdge(band.m0, grain)}`,
                }}
              >
                {band.width >= 14 ? q : ""}
              </div>
            );
          })}
        </div>
      ) : null}
      {grain === "week" ? (
        <div
          className={`flex leading-4 text-[var(--muted)] ${compact ? "text-[7px]" : "text-[8px]"}`}
        >
          {weekMonths.map((band, i) => (
            <div
              key={`m-${band.y}-${band.m0}-${i}`}
              className="shrink-0 overflow-hidden pl-0.5"
              style={{
                width: band.width,
                borderLeft: `1px solid ${monthScaleEdge(band.m0, grain)}`,
              }}
            >
              {MONTH_NAMES[band.m0][0]}
            </div>
          ))}
        </div>
      ) : (
        <div
          className={`flex leading-4 text-[var(--muted)] ${compact ? "text-[7px]" : "text-[8px]"}`}
        >
          {Array.from({ length: months }, (_, i) => {
            const { m0 } = idxToYm(i, winStart);
            return (
              <div
                key={i}
                className="shrink-0 pl-0.5"
                style={{
                  width: monthPx,
                  borderLeft: `1px solid ${monthScaleEdge(m0, grain)}`,
                }}
              >
                {MONTH_NAMES[m0][0]}
              </div>
            );
          })}
        </div>
      )}
      {grain === "week" ? (
        <div
          className={`flex text-[var(--muted)] ${compact ? "text-[7px] leading-3" : "text-[8px] leading-3"}`}
        >
          {scale.slots.map((slot, i) => {
            const { y } = idxToYm(slot.monthIdx, winStart);
            const w = slot.sundayDay
              ? sundayWeekOfYear(y, idxToYm(slot.monthIdx, winStart).m0 + 1, slot.sundayDay)
              : 0;
            const wpx = scale.weekPx;
            return (
              <div
                key={slot.key}
                className="shrink-0 overflow-hidden pl-px"
                style={{
                  width: wpx,
                  borderLeft: `1px solid ${weekGridLine()}`,
                }}
                title={`W${w} week ending Sunday`}
              >
                {wpx >= 14 ? `W${w}` : wpx >= 8 ? w : ""}
              </div>
            );
          })}
        </div>
      ) : null}
      {showToday ? (
        <div
          className="pointer-events-none absolute top-0 bottom-0 z-10 w-0.5 border-l-2 border-dashed border-[var(--rag-red)]"
          style={{ left: todayX }}
        />
      ) : null}
    </div>
  );
}

export function monthGridEdge(m0: number, grain: LoadGrain) {
  return monthScaleEdge(m0, grain);
}
