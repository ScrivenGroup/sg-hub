import type { GanttLayoutItem } from "./gantt-layout";
import {
  continuousToChartX,
  monthStartX,
  weekMonthBands,
  weekYearBands,
  type GanttXScale,
} from "./gantt-x-scale";
import { markerOverlapsWindow, rowMarkerKey } from "./gantt-stage";
import {
  fullDateLabel,
  idxDayToContinuous,
  idxToYm,
  MONTH_NAMES,
  sundayWeekOfYear,
} from "./dates";
import type { LoadGrain } from "./resource-load";
import type { GanttMarker } from "./scheduling";
import { planStatusLabel } from "./status";

export const GANTT_DOT_R = 4;

export type GanttPaintTheme = {
  surface: string;
  surfaceMuted: string;
  border: string;
  muted: string;
  ink: string;
  ragRed: string;
  ragGreen: string;
  ragAmber: string;
};

export type GanttCamera = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type GanttDragShift = { key: string; px: number };

function cssVar(style: CSSStyleDeclaration | null, name: string, fallback: string) {
  return style?.getPropertyValue(name).trim() || fallback;
}

export function readGanttPaintTheme(el: Element | null): GanttPaintTheme {
  const style = el && typeof getComputedStyle === "function" ? getComputedStyle(el) : null;
  return {
    surface: cssVar(style, "--surface", "#ffffff"),
    surfaceMuted: cssVar(style, "--surface-muted", "#f4f4f5"),
    border: cssVar(style, "--border", "#d4d4d8"),
    muted: cssVar(style, "--muted", "#71717a"),
    ink: cssVar(style, "--ink", "#18181b"),
    ragRed: cssVar(style, "--rag-red", "#b42318"),
    ragGreen: cssVar(style, "--rag-green", "#027a48"),
    ragAmber: cssVar(style, "--rag-amber", "#dc6803"),
  };
}

export function cssToRgba(color: string, alpha: number): string {
  const raw = color.trim();
  if (raw.startsWith("#")) {
    const n = raw.slice(1);
    const hex =
      n.length === 3
        ? n
            .split("")
            .map((c) => c + c)
            .join("")
        : n.slice(0, 6);
    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);
    if ([r, g, b].some((v) => Number.isNaN(v))) return raw;
    return `rgba(${r},${g},${b},${alpha})`;
  }
  const m = raw.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*[\d.]+)?\s*\)/i,
  );
  if (m) return `rgba(${m[1]},${m[2]},${m[3]},${alpha})`;
  return raw;
}

function monthEdgeAlpha(m0: number, grain: LoadGrain) {
  if (grain === "week") {
    if (m0 === 0) return 1;
    if (m0 === 3 || m0 === 6 || m0 === 9) return 0.7;
    return 0.55;
  }
  if (m0 === 0) return 1;
  if (m0 === 3 || m0 === 6 || m0 === 9) return 0.5;
  return 0.22;
}

export function markerPaintKey(m: Pick<GanttMarker, "damId" | "laneCode" | "procDueIdx">) {
  return `${m.damId}-${m.laneCode}-${m.procDueIdx}`;
}

export function markerHoverTitle(
  m: GanttMarker,
  winStart: { y: number; m: number },
) {
  const full = fullDateLabel(m.displayDueIdx, m.dueDay, winStart);
  return `${m.damName} ${m.laneCode} · ${planStatusLabel(m.kind)} · ${full}${
    m.inputOff ? " · input off — not deleted" : ""
  }`;
}

export function markerDueX(
  m: GanttMarker,
  scale: GanttXScale,
  winStart: { y: number; m: number },
) {
  return continuousToChartX(
    scale,
    idxDayToContinuous(m.displayDueIdx, m.dueDay, winStart),
  );
}

export function markerLeadX(m: GanttMarker, scale: GanttXScale) {
  return Math.max(0, continuousToChartX(scale, m.leadStart));
}

function markerVisible(m: GanttMarker, dueBeforeIdx: number | null) {
  if (dueBeforeIdx !== null) {
    if (m.kind === "completed" || m.displayDueIdx > dueBeforeIdx) return false;
  }
  return true;
}

export function markersOnLayoutItem(
  it: GanttLayoutItem,
  markersByRow: Map<string, GanttMarker[]>,
  showSummarised: boolean,
  dueBeforeIdx: number | null,
): GanttMarker[] {
  if (it.type === "gap") return [];
  if (it.type === "heading") {
    if (!it.collapsed || !showSummarised) return [];
    const out: GanttMarker[] = [];
    for (const c of it.children) {
      const list = markersByRow.get(rowMarkerKey(c.damId, c.laneCode));
      if (!list) continue;
      for (const m of list) {
        if (markerVisible(m, dueBeforeIdx)) out.push(m);
      }
    }
    return out;
  }
  const list = markersByRow.get(rowMarkerKey(it.damId, it.laneCode)) || [];
  return list.filter((m) => markerVisible(m, dueBeforeIdx));
}

function fitCanvas(
  canvas: HTMLCanvasElement,
  cssW: number,
  cssH: number,
  dpr: number,
) {
  const w = Math.max(1, Math.round(cssW * dpr));
  const h = Math.max(1, Math.round(cssH * dpr));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  canvas.style.width = `${Math.max(1, cssW)}px`;
  canvas.style.height = `${Math.max(1, cssH)}px`;
}

function strokeDashToday(ctx: CanvasRenderingContext2D, theme: GanttPaintTheme, x: number, top: number, h: number) {
  ctx.save();
  ctx.strokeStyle = theme.ragRed;
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x + 0.5, top);
  ctx.lineTo(x + 0.5, top + h);
  ctx.stroke();
  ctx.restore();
}

function drawDot(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  color: string,
  fill: string,
  dashed: boolean,
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, GANTT_DOT_R, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  if (dashed) ctx.setLineDash([2, 2]);
  ctx.stroke();
  ctx.restore();
}

function drawMarker(
  ctx: CanvasRenderingContext2D,
  m: GanttMarker,
  scale: GanttXScale,
  winStart: { y: number; m: number },
  cy: number,
  theme: GanttPaintTheme,
  drag: GanttDragShift | null,
  pulseKey: string | null,
  pulseT: number,
) {
  const done = m.kind === "completed";
  const notReq = m.kind === "notRequired";
  const predicted = m.kind === "predicted" || notReq;
  const color = done ? theme.ragGreen : notReq ? theme.muted : m.color;
  const key = markerPaintKey(m);
  const shift = drag?.key === key ? drag.px : 0;
  const dueX = markerDueX(m, scale, winStart) + shift;
  const leadX = markerLeadX(m, scale) + shift;
  const tailW = Math.max(4, dueX - leadX);
  ctx.save();
  ctx.globalAlpha = m.inputOff || notReq ? 0.45 : 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.globalAlpha *= 0.7;
  if (predicted) ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(dueX - tailW, cy);
  ctx.lineTo(dueX, cy);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = m.inputOff || notReq ? 0.45 : 1;
  if (pulseKey === key) {
    const wave = 0.5 + 0.5 * Math.sin(pulseT * Math.PI * 2);
    ctx.beginPath();
    ctx.arc(dueX, cy, 14 + wave * 8, 0, Math.PI * 2);
    ctx.strokeStyle = cssToRgba(theme.ragAmber, 0.35 + wave * 0.5);
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  const fill = done ? theme.ragGreen : predicted ? theme.surface : color;
  drawDot(ctx, dueX, cy, done ? theme.ragGreen : color, fill, predicted);
  ctx.restore();
}

export function paintGanttTimeline(
  canvas: HTMLCanvasElement,
  opts: {
    camera: GanttCamera;
    scale: GanttXScale;
    months: number;
    winStart: { y: number; m: number };
    todayX: number;
    grain: LoadGrain;
    items: GanttLayoutItem[];
    markersByRow: Map<string, GanttMarker[]>;
    dueBeforeIdx: number | null;
    showSummarised: boolean;
    theme: GanttPaintTheme;
    drag: GanttDragShift | null;
    pulseKey: string | null;
    pulseT: number;
  },
) {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const { camera, scale, theme } = opts;
  fitCanvas(canvas, camera.w, camera.h, dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, camera.w, camera.h);
  ctx.fillStyle = theme.surface;
  ctx.fillRect(0, 0, camera.w, camera.h);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, camera.w, camera.h);
  ctx.clip();
  ctx.translate(-camera.x, -camera.y);

  const viewLeft = camera.x;
  const viewRight = camera.x + camera.w;
  const viewTop = camera.y;
  const viewBottom = camera.y + camera.h;
  const padX = 2;
  const padY = 2;

  for (const it of opts.items) {
    if (it.top + it.h < viewTop - padY || it.top > viewBottom + padY) continue;
    if (it.type === "gap") continue;
    if (it.type === "heading") {
      ctx.fillStyle = theme.surfaceMuted;
      ctx.fillRect(viewLeft, it.top, camera.w, it.h);
      ctx.fillStyle = theme.border;
      ctx.fillRect(viewLeft, it.top + it.h - 1, camera.w, 1);
    } else {
      ctx.fillStyle = cssToRgba(theme.border, 0.6);
      ctx.fillRect(viewLeft, it.top + it.h - 1, camera.w, 1);
    }
  }

  for (let i = 0; i < opts.months; i++) {
    const x = monthStartX(scale, i);
    if (x < viewLeft - 1 || x > viewRight + 1) continue;
    const { m0 } = idxToYm(i, opts.winStart);
    ctx.fillStyle = cssToRgba(theme.border, monthEdgeAlpha(m0, opts.grain));
    ctx.fillRect(x, viewTop, 1, camera.h);
  }
  if (opts.grain === "week") {
    const weekAlpha = 0.22;
    for (const slot of scale.slots) {
      const x = continuousToChartX(scale, slot.startC);
      if (x < viewLeft - 1 || x > viewRight + 1) continue;
      ctx.fillStyle = cssToRgba(theme.border, weekAlpha);
      ctx.fillRect(x, viewTop, 1, camera.h);
    }
  }

  strokeDashToday(ctx, theme, opts.todayX, viewTop, camera.h);

  const markA = (viewLeft - padX) / Math.max(1, scale.monthPx);
  const markB = (viewRight + padX) / Math.max(1, scale.monthPx);
  const a = opts.grain === "month" ? markA : undefined;
  const b = opts.grain === "month" ? markB : undefined;

  for (const it of opts.items) {
    if (it.type === "gap") continue;
    if (it.top + it.h < viewTop - padY || it.top > viewBottom + padY) continue;
    const marks = markersOnLayoutItem(
      it,
      opts.markersByRow,
      opts.showSummarised,
      opts.dueBeforeIdx,
    );
    const cy = it.top + it.h / 2;
    for (const m of marks) {
      if (a !== undefined && b !== undefined) {
        if (!markerOverlapsWindow(m, a, b, opts.winStart)) continue;
      } else {
        const dueX = markerDueX(m, scale, opts.winStart);
        const leadX = markerLeadX(m, scale);
        if (dueX < viewLeft - 24 && leadX < viewLeft - 24) continue;
        if (leadX > viewRight + 24 && dueX > viewRight + 24) continue;
      }
      drawMarker(
        ctx,
        m,
        scale,
        opts.winStart,
        cy,
        theme,
        opts.drag,
        opts.pulseKey,
        opts.pulseT,
      );
    }
  }

  ctx.restore();
}

export function paintGanttTimescale(
  canvas: HTMLCanvasElement,
  opts: {
    cameraX: number;
    viewW: number;
    viewH: number;
    scale: GanttXScale;
    months: number;
    winStart: { y: number; m: number };
    todayX: number;
    grain: LoadGrain;
    years: { y: number; start: number; span: number }[];
    theme: GanttPaintTheme;
  },
) {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const { scale, theme, grain } = opts;
  fitCanvas(canvas, opts.viewW, opts.viewH, dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, opts.viewW, opts.viewH);
  ctx.fillStyle = theme.surface;
  ctx.fillRect(0, 0, opts.viewW, opts.viewH);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, opts.viewW, opts.viewH);
  ctx.clip();
  ctx.translate(-opts.cameraX, 0);

  const font = "ui-sans-serif, system-ui, sans-serif";
  const left = opts.cameraX;
  const right = opts.cameraX + opts.viewW;
  const week = grain === "week";
  const yearH = 16;
  const qH = 12;
  const monH = 16;
  const weekH = 14;
  let y = 0;

  ctx.fillStyle = theme.ink;
  ctx.font = `500 10px ${font}`;
  ctx.textBaseline = "top";
  if (week) {
    for (const yr of weekYearBands(scale)) {
      if (yr.startX + yr.width < left || yr.startX > right) continue;
      ctx.fillStyle = theme.border;
      ctx.fillRect(yr.startX + yr.width - 1, y, 1, yearH);
      ctx.fillStyle = theme.ink;
      ctx.fillText(String(yr.y), yr.startX + 4, y + 2);
    }
  } else {
    for (const yr of opts.years) {
      const x = yr.start * scale.monthPx;
      const w = yr.span * scale.monthPx;
      if (x + w < left || x > right) continue;
      ctx.fillStyle = theme.border;
      ctx.fillRect(x + w - 1, y, 1, yearH);
      ctx.fillStyle = theme.ink;
      ctx.fillText(String(yr.y), x + 4, y + 2);
    }
  }
  y += yearH;

  ctx.font = `400 8px ${font}`;
  ctx.fillStyle = theme.muted;
  if (!week) {
    for (let i = 0; i < opts.months; i++) {
      const x = i * scale.monthPx;
      if (x + scale.monthPx < left || x > right) continue;
      const { m0 } = idxToYm(i, opts.winStart);
      ctx.fillStyle = cssToRgba(theme.border, monthEdgeAlpha(m0, grain));
      ctx.fillRect(x, y, 1, qH + monH);
      const q =
        m0 === 0 ? "Q1" : m0 === 3 ? "Q2" : m0 === 6 ? "Q3" : m0 === 9 ? "Q4" : "";
      ctx.fillStyle = theme.muted;
      if (q && scale.monthPx >= 10) ctx.fillText(q, x + 2, y + 1);
    }
    y += qH;
    for (let i = 0; i < opts.months; i++) {
      const x = i * scale.monthPx;
      if (x + scale.monthPx < left || x > right) continue;
      const { m0 } = idxToYm(i, opts.winStart);
      ctx.fillStyle = theme.muted;
      ctx.fillText(MONTH_NAMES[m0][0], x + 2, y + 2);
    }
  } else {
    const bands = weekMonthBands(scale);
    for (const band of bands) {
      if (band.startX + band.width < left || band.startX > right) continue;
      ctx.fillStyle = cssToRgba(theme.border, monthEdgeAlpha(band.m0, grain));
      ctx.fillRect(band.startX, y, 1, qH + monH + weekH);
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
      ctx.fillStyle = theme.muted;
      if (q && band.width >= 14) ctx.fillText(q, band.startX + 2, y + 1);
    }
    y += qH;
    for (const band of bands) {
      if (band.startX + band.width < left || band.startX > right) continue;
      ctx.fillStyle = theme.muted;
      ctx.fillText(MONTH_NAMES[band.m0][0], band.startX + 2, y + 2);
    }
    y += monH;
    ctx.font = `400 8px ${font}`;
    for (const slot of scale.slots) {
      const x = continuousToChartX(scale, slot.startC);
      const w = scale.weekPx;
      if (x + w < left || x > right) continue;
      ctx.fillStyle = cssToRgba(theme.border, 0.22);
      ctx.fillRect(x, y, 1, weekH);
      const { y: yy, m0 } = idxToYm(slot.monthIdx, opts.winStart);
      const wn = slot.sundayDay
        ? sundayWeekOfYear(yy, m0 + 1, slot.sundayDay)
        : 0;
      ctx.fillStyle = theme.muted;
      const label = w >= 14 ? `W${wn}` : w >= 8 ? String(wn) : "";
      if (label) ctx.fillText(label, x + 1, y + 1);
    }
  }

  strokeDashToday(ctx, theme, opts.todayX, 0, opts.viewH);
  ctx.restore();
}

export function hitTestGanttMarker(opts: {
  worldX: number;
  worldY: number;
  items: GanttLayoutItem[];
  markersByRow: Map<string, GanttMarker[]>;
  scale: GanttXScale;
  winStart: { y: number; m: number };
  dueBeforeIdx: number | null;
  showSummarised: boolean;
  drag: GanttDragShift | null;
}): GanttMarker | null {
  const it = opts.items.find(
    (row) =>
      row.type !== "gap" &&
      opts.worldY >= row.top &&
      opts.worldY < row.top + row.h,
  );
  if (!it) return null;
  const marks = markersOnLayoutItem(
    it,
    opts.markersByRow,
    opts.showSummarised,
    opts.dueBeforeIdx,
  );
  let best: GanttMarker | null = null;
  let bestDist = Infinity;
  for (const m of marks) {
    const key = markerPaintKey(m);
    const shift = opts.drag?.key === key ? opts.drag.px : 0;
    const dueX = markerDueX(m, opts.scale, opts.winStart) + shift;
    const leadX = markerLeadX(m, opts.scale) + shift;
    const left = Math.min(leadX, dueX) - 2;
    const right = dueX + GANTT_DOT_R + 2;
    if (opts.worldX < left || opts.worldX > right) continue;
    const dist = Math.abs(opts.worldX - dueX);
    if (dist < bestDist) {
      bestDist = dist;
      best = m;
    }
  }
  return best;
}

export function worldFromClient(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  camera: GanttCamera,
) {
  return {
    worldX: camera.x + (clientX - rect.left),
    worldY: camera.y + (clientY - rect.top),
  };
}
