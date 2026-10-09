import type { RoadmapChunk, RoadmapPlacement, RoadmapStream } from "./types";

export const CELL = 20;
export const MIN_STREAM_COLS = 8;
export const MAX_STREAM_COLS = 28;
export const DEFAULT_STREAM_COLS = 12;
export const MIN_CHUNK_W = 7;
export const MIN_CHUNK_H = 3;
export const MIN_BAND_ROWS = 2;
export const STREAM_GAP_PX = 20;
export const BAND_PAD = 10;
export const COLLAPSED_STRIP = 28;
export const STREAM_HEADER_H = 36;
export const BAND_HEADER_H = 28;
export const COLLAPSED_STREAM_COLS = 12;
export const COLLAPSED_STREAM_ROWS = 5;
export const STREAM_BLUE = "#3B78C4";
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 2;
export const ZOOM_STEP = 0.1;

export type BandId = "wip" | "seq" | "future" | "done";
export type RoadmapOrient = "h" | "v";
export type ResizeEdge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
export type BandOpen = Record<BandId, boolean>;

export const BAND_ORDER: BandId[] = ["wip", "seq", "future", "done"];

export function defaultBands(): BandOpen {
  return { wip: true, seq: true, future: true, done: false };
}

export function bandOf(placement: RoadmapPlacement): BandId {
  if (placement === "sequenced") return "seq";
  if (placement === "future") return "future";
  if (placement === "completed") return "done";
  return "wip";
}

export function placementForBand(band: BandId, row: number): RoadmapPlacement {
  if (band === "seq") return "sequenced";
  if (band === "future") return "future";
  if (band === "done") return "completed";
  return row > 0 ? "waiting_sequence" : "undeveloped";
}

export function inBand(chunk: RoadmapChunk, band: BandId): boolean {
  return bandOf(chunk.placement) === band;
}

export function streamCols(stream: RoadmapStream): number {
  return Math.max(MIN_STREAM_COLS, stream.cols ?? DEFAULT_STREAM_COLS);
}

export function streamCanvasCol(stream: RoadmapStream): number {
  return Math.max(0, stream.canvasCol ?? 1);
}

export function streamCanvasRow(stream: RoadmapStream): number {
  return Math.max(0, stream.canvasRow ?? 1);
}

export function titleMinCols(title: string): number {
  const chromeCells = 4;
  const textCells = Math.ceil((title.trim().length * 8) / CELL);
  return Math.max(MIN_CHUNK_W, textCells + chromeCells);
}

export function canvasDotGridStyle(): {
  backgroundColor: string;
  backgroundImage: string;
  backgroundSize: string;
} {
  return {
    backgroundColor: "color-mix(in srgb, var(--page) 97%, white)",
    backgroundImage:
      "radial-gradient(color-mix(in srgb, var(--ink) 12%, transparent) 0.8px, transparent 0.8px)",
    backgroundSize: `${CELL}px ${CELL}px`,
  };
}

export function sectionDotGridStyle(): {
  backgroundColor: string;
  backgroundImage: string;
  backgroundSize: string;
} {
  return {
    backgroundColor: "color-mix(in srgb, var(--page) 88%, var(--ink) 5%)",
    backgroundImage:
      "radial-gradient(color-mix(in srgb, var(--ink) 12%, transparent) 0.8px, transparent 0.8px)",
    backgroundSize: `${CELL}px ${CELL}px`,
  };
}

/** @deprecated use canvasDotGridStyle / sectionDotGridStyle */
export function dotGridStyle() {
  return sectionDotGridStyle();
}

/** Section axis is the opposite of the stream-stack label. */
export function sectionAxis(orient: RoadmapOrient): RoadmapOrient {
  return orient === "h" ? "v" : "h";
}

export function collapsedCols(stream: RoadmapStream): number {
  return Math.max(COLLAPSED_STREAM_COLS, stream.collapsedCols ?? COLLAPSED_STREAM_COLS);
}

export function collapsedRows(stream: RoadmapStream): number {
  return Math.max(COLLAPSED_STREAM_ROWS, stream.collapsedRows ?? COLLAPSED_STREAM_ROWS);
}

export function bandBodyRows(stream: RoadmapStream, band: BandId): number {
  const content = bandRows(stream.chunks.filter((c) => inBand(c, band)));
  return Math.max(MIN_BAND_ROWS, stream.bandRows?.[band] ?? content);
}

export function bandBodyCols(stream: RoadmapStream, band: BandId): number {
  return Math.max(MIN_STREAM_COLS, stream.bandCols?.[band] ?? streamCols(stream));
}

export function contentHeightPx(
  stream: RoadmapStream,
  orient: RoadmapOrient,
  open: BandOpen,
): number {
  const across = sectionAxis(orient) === "h";
  const heights = BAND_ORDER.map((id) => {
    if (!open[id]) return across ? 0 : BAND_HEADER_H;
    return BAND_HEADER_H + bandBodyRows(stream, id) * CELL + BAND_PAD * 2;
  });
  const body = across ? Math.max(...heights, BAND_HEADER_H) : heights.reduce((a, b) => a + b, 0);
  return STREAM_HEADER_H + body;
}

export function streamOuterWidthPx(
  stream: RoadmapStream,
  orient: RoadmapOrient,
  open: BandOpen,
): number {
  if (stream.collapsed) return collapsedCols(stream) * CELL;
  if (sectionAxis(orient) === "v") return streamCols(stream) * CELL;
  return BAND_ORDER.reduce(
    (sum, id) => sum + (open[id] ? bandBodyCols(stream, id) * CELL : COLLAPSED_STRIP),
    0,
  );
}

export function streamOuterHeightPx(
  stream: RoadmapStream,
  orient: RoadmapOrient,
  open: BandOpen,
): number {
  if (stream.collapsed) return collapsedRows(stream) * CELL;
  const content = contentHeightPx(stream, orient, open);
  if (stream.frameRows != null) return Math.max(content, stream.frameRows * CELL);
  return content;
}

export function streamBoxCells(
  stream: RoadmapStream,
  orient: RoadmapOrient,
  open: BandOpen,
): { col: number; row: number; w: number; h: number } {
  if (stream.collapsed) {
    return {
      col: streamCanvasCol(stream),
      row: streamCanvasRow(stream),
      w: collapsedCols(stream),
      h: collapsedRows(stream),
    };
  }
  return {
    col: streamCanvasCol(stream),
    row: streamCanvasRow(stream),
    w: Math.max(1, Math.round(streamOuterWidthPx(stream, orient, open) / CELL)),
    h: Math.max(1, Math.round(streamOuterHeightPx(stream, orient, open) / CELL)),
  };
}

export function overlaps(a: { col: number; row: number; w: number; h: number }, b: {
  col: number;
  row: number;
  w: number;
  h: number;
}): boolean {
  return (
    a.col < b.col + b.w &&
    b.col < a.col + a.w &&
    a.row < b.row + b.h &&
    b.row < a.row + a.h
  );
}

export function clampChunk(
  chunk: RoadmapChunk,
  cols: number,
  minW = titleMinCols(chunk.title),
): RoadmapChunk {
  const floor = Math.min(cols, Math.max(MIN_CHUNK_W, minW));
  const w = Math.max(floor, Math.min(cols, chunk.w));
  const col = Math.max(0, Math.min(Math.max(0, cols - w), chunk.col));
  const h = Math.max(MIN_CHUNK_H, chunk.h);
  const row = Math.max(0, chunk.row);
  return { ...chunk, col, row, w, h };
}

export function resizeChunk(
  orig: RoadmapChunk,
  edge: ResizeEdge,
  dCol: number,
  dRow: number,
  cols: number,
  maxRows?: number,
): RoadmapChunk {
  const minW = titleMinCols(orig.title);
  const east = edge.includes("e");
  const west = edge.includes("w");
  const south = edge.includes("s");
  const north = edge.includes("n");
  const xOnly = (east || west) && !north && !south;
  const yOnly = (north || south) && !east && !west;

  let w = orig.w;
  let h = orig.h;
  let col = orig.col;
  let row = orig.row;

  if (east) w = orig.w + dCol;
  if (west) {
    w = orig.w - dCol;
    col = orig.col + dCol;
  }
  if (south) h = orig.h + dRow;
  if (north) {
    h = orig.h - dRow;
    row = orig.row + dRow;
  }

  w = Math.max(minW, w);
  h = Math.max(MIN_CHUNK_H, h);
  if (west) col = orig.col + orig.w - w;
  if (north) row = orig.row + orig.h - h;

  let spillX = 0;
  let spillY = 0;
  if (col < 0) {
    spillX += -col;
    w = Math.max(minW, w + col);
    col = 0;
  }
  if (col + w > cols) {
    spillX += col + w - cols;
    w = Math.max(minW, cols - col);
  }
  if (row < 0) {
    spillY += -row;
    h = Math.max(MIN_CHUNK_H, h + row);
    row = 0;
  }
  if (maxRows != null && row + h > maxRows) {
    spillY += row + h - maxRows;
    h = Math.max(MIN_CHUNK_H, maxRows - row);
  }

  if (xOnly && spillX > 0) {
    h += spillX;
    if (maxRows != null && row + h > maxRows) h = Math.max(MIN_CHUNK_H, maxRows - row);
  }
  if (yOnly && spillY > 0) {
    w += spillY;
    if (col + w > cols) w = Math.max(minW, cols - col);
  }

  return clampChunk({ ...orig, col, row, w, h }, cols, minW);
}

/** First free slot: top-left, then right, then down. */
export function findPackSlot(
  occupied: RoadmapChunk[],
  w: number,
  h: number,
  maxCols: number,
  grow: "row" | "col",
  maxRows?: number,
): { col: number; row: number; cols: number } {
  let cols = Math.max(maxCols, w);
  const limitRows = grow === "col" ? Math.max(maxRows ?? MIN_BAND_ROWS, h) : 80;

  function fits(col: number, row: number, useCols: number) {
    if (col < 0 || row < 0 || col + w > useCols) return false;
    if (grow === "col" && row + h > limitRows) return false;
    const probe = { col, row, w, h };
    return !occupied.some((c) => overlaps(probe, c));
  }

  for (let row = 0; row < limitRows; row++) {
    for (let col = 0; col + w <= cols; col++) {
      if (fits(col, row, cols)) return { col, row, cols };
    }
  }

  if (grow === "col") {
    cols = Math.min(MAX_STREAM_COLS, Math.max(cols, w) + Math.max(1, w));
    for (let row = 0; row < limitRows; row++) {
      for (let col = 0; col + w <= cols; col++) {
        if (fits(col, row, cols)) return { col, row, cols };
      }
    }
    return { col: Math.max(0, cols - w), row: 0, cols };
  }

  const bottom = occupied.length
    ? Math.max(...occupied.map((c) => c.row + c.h))
    : 0;
  return { col: 0, row: bottom, cols };
}

/** Push overlapping unlocked siblings. Locked boxes never move. */
export function resolveDown(
  chunks: RoadmapChunk[],
  keptId: string,
  cols: number,
): RoadmapChunk[] {
  const next = chunks.map((c) =>
    clampChunk({ ...c }, cols, Math.min(titleMinCols(c.title), c.w)),
  );
  let guard = 0;
  let changed = true;
  while (changed && guard++ < 80) {
    changed = false;
    for (let i = 0; i < next.length; i++) {
      for (let j = 0; j < next.length; j++) {
        if (i === j) continue;
        const a = next[i];
        const b = next[j];
        if (!overlaps(a, b)) continue;
        let push = a.id === keptId ? b : b.id === keptId ? a : a.row >= b.row ? a : b;
        const other = push.id === a.id ? b : a;
        if (push.locked) {
          if (other.locked || other.id === keptId) continue;
          push = other;
        }
        const blocker = push.id === a.id ? b : a;
        const destRow = blocker.row + blocker.h;
        if (push.row < destRow) {
          push.row = destRow;
          changed = true;
        }
      }
    }
  }
  return next;
}

export function sequenceSku(chunks: RoadmapChunk[]): Map<string, number> {
  const seq = chunks.filter((c) => bandOf(c.placement) === "seq");
  const sorted = [...seq].sort(
    (a, b) => a.row - b.row || a.col - b.col || a.id.localeCompare(b.id),
  );
  return new Map(sorted.map((c, i) => [c.id, i + 1]));
}

export function streamSequenceSku(streams: RoadmapStream[]): Map<string, number> {
  const sorted = [...streams].sort(
    (a, b) =>
      streamCanvasRow(a) - streamCanvasRow(b) ||
      streamCanvasCol(a) - streamCanvasCol(b) ||
      a.id.localeCompare(b.id),
  );
  return new Map(sorted.map((s, i) => [s.id, i + 1]));
}

export function bandRows(chunks: RoadmapChunk[]): number {
  if (chunks.length === 0) return MIN_BAND_ROWS;
  const bottom = Math.max(...chunks.map((c) => c.row + c.h));
  return Math.max(MIN_BAND_ROWS, bottom + 1);
}

export function applyBandChunks(
  stream: RoadmapStream,
  band: BandId,
  bandChunks: RoadmapChunk[],
): RoadmapStream {
  const incoming = new Set(bandChunks.map((c) => c.id));
  const others = stream.chunks.filter(
    (c) => !inBand(c, band) && !incoming.has(c.id),
  );
  const seen = new Set<string>();
  const unique: RoadmapChunk[] = [];
  for (const chunk of bandChunks) {
    if (seen.has(chunk.id)) continue;
    seen.add(chunk.id);
    unique.push(chunk);
  }
  return { ...stream, chunks: [...others, ...unique] };
}

export function packBand(
  chunks: RoadmapChunk[],
  cols: number,
  grow: "row" | "col",
): { chunks: RoadmapChunk[]; cols: number } {
  const ordered = [...chunks].sort(
    (a, b) => a.row - b.row || a.col - b.col || a.id.localeCompare(b.id),
  );
  const placed: RoadmapChunk[] = [];
  let useCols = cols;
  for (const chunk of ordered) {
    const w = Math.min(chunk.w, useCols);
    const slot = findPackSlot(placed, w, chunk.h, useCols, grow);
    useCols = slot.cols;
    placed.push({ ...chunk, col: slot.col, row: slot.row, w });
  }
  return { chunks: placed, cols: useCols };
}

export function fitStreamToChunks(
  stream: RoadmapStream,
  orient: RoadmapOrient,
  open: BandOpen,
): RoadmapStream {
  const need = stream.chunks.reduce((m, c) => Math.max(m, c.col + c.w), MIN_STREAM_COLS);
  const cols = Math.min(MAX_STREAM_COLS, Math.max(MIN_STREAM_COLS, need));
  return {
    ...stream,
    collapsed: false,
    cols,
    frameRows: Math.ceil(contentHeightPx({ ...stream, cols, collapsed: false }, orient, open) / CELL),
  };
}

export function collapseStream(stream: RoadmapStream): RoadmapStream {
  return {
    ...stream,
    collapsed: true,
    collapsedCols: COLLAPSED_STREAM_COLS,
    collapsedRows: COLLAPSED_STREAM_ROWS,
  };
}

export function streamPeeking(stream: RoadmapStream): boolean {
  if (!stream.collapsed) return false;
  return (
    collapsedCols(stream) > COLLAPSED_STREAM_COLS ||
    collapsedRows(stream) > COLLAPSED_STREAM_ROWS
  );
}

export function streamContentOverflows(
  stream: RoadmapStream,
  orient: RoadmapOrient,
  open: BandOpen,
): boolean {
  if (stream.collapsed) return false;
  const frame = streamBoxCells(stream, orient, open);
  const needH = Math.ceil(contentHeightPx(stream, orient, open) / CELL);
  if (needH > frame.h) return true;
  const cols = streamCols(stream);
  for (const chunk of stream.chunks) {
    if (chunk.col + chunk.w > cols) return true;
    const band = bandOf(chunk.placement);
    if (!open[band]) continue;
    if (chunk.row + chunk.h > bandBodyRows(stream, band)) return true;
  }
  return false;
}

export function resizeStreamBox(
  stream: RoadmapStream,
  edge: ResizeEdge,
  dCol: number,
  dRow: number,
  orient: RoadmapOrient,
  open: BandOpen,
  origBox?: { col: number; row: number; w: number; h: number },
): RoadmapStream {
  const box = origBox ?? streamBoxCells(stream, orient, open);
  const east = edge.includes("e");
  const west = edge.includes("w");
  const south = edge.includes("s");
  const north = edge.includes("n");

  let w = box.w;
  let h = box.h;
  let col = box.col;
  let row = box.row;
  if (east) w = box.w + dCol;
  if (west) {
    w = box.w - dCol;
    col = box.col + dCol;
  }
  if (south) h = box.h + dRow;
  if (north) {
    h = box.h - dRow;
    row = box.row + dRow;
  }

  if (stream.collapsed) {
    w = Math.max(COLLAPSED_STREAM_COLS, w);
    h = Math.max(COLLAPSED_STREAM_ROWS, h);
    if (west) col = box.col + box.w - w;
    if (north) row = box.row + box.h - h;
    return {
      ...stream,
      canvasCol: Math.max(0, col),
      canvasRow: Math.max(0, row),
      collapsedCols: w,
      collapsedRows: h,
    };
  }

  const minW = MIN_STREAM_COLS;
  w = Math.max(minW, Math.min(MAX_STREAM_COLS, w));
  h = Math.max(Math.ceil((STREAM_HEADER_H + BAND_HEADER_H) / CELL), h);
  if (west) col = box.col + box.w - w;
  if (north) row = box.row + box.h - h;

  let cols = streamCols(stream);
  if (sectionAxis(orient) === "v") {
    cols = w;
  } else {
    const openCount = BAND_ORDER.filter((id) => open[id]).length || 1;
    const collapsed = BAND_ORDER.filter((id) => !open[id]).length;
    cols = Math.max(
      MIN_STREAM_COLS,
      Math.round((w * CELL - collapsed * COLLAPSED_STRIP) / CELL / openCount),
    );
  }
  cols = Math.max(MIN_STREAM_COLS, Math.min(MAX_STREAM_COLS, cols));

  return {
    ...stream,
    canvasCol: Math.max(0, col),
    canvasRow: Math.max(0, row),
    cols,
    frameRows: h,
  };
}

export function packStreams(
  streams: RoadmapStream[],
  orient: RoadmapOrient,
  opens: Record<string, BandOpen>,
): RoadmapStream[] {
  const gap = 2;
  const boxes = streams
    .map((s) => {
      const open = opens[s.id] ?? defaultBands();
      const fitted = s.collapsed
        ? s
        : { ...s, frameRows: Math.ceil(contentHeightPx(s, orient, open) / CELL) };
      return { s: fitted, box: streamBoxCells(fitted, orient, open) };
    })
    .sort(
      (a, b) =>
        a.box.row - b.box.row || a.box.col - b.box.col || a.s.id.localeCompare(b.s.id),
    );

  if (orient === "h") {
    const widest = Math.max(1, ...boxes.map((b) => b.box.w));
    const maxLine = Math.max(64, widest * 2 + gap);
    let col = 1;
    let row = 1;
    let rowH = 0;
    return boxes.map(({ s, box }) => {
      if (col > 1 && col + box.w > maxLine + 1) {
        col = 1;
        row += rowH + gap;
        rowH = 0;
      }
      const next = { ...s, canvasCol: col, canvasRow: row };
      col += box.w + gap;
      rowH = Math.max(rowH, box.h);
      return next;
    });
  }

  const tallest = Math.max(1, ...boxes.map((b) => b.box.h));
  const maxStack = Math.max(80, tallest * 2 + gap);
  let col = 1;
  let row = 1;
  let colW = 0;
  return boxes.map(({ s, box }) => {
    if (row > 1 && row + box.h > maxStack + 1) {
      row = 1;
      col += colW + gap;
      colW = 0;
    }
    const next = { ...s, canvasCol: col, canvasRow: row };
    row += box.h + gap;
    colW = Math.max(colW, box.w);
    return next;
  });
}

export function playgroundBounds(
  streams: RoadmapStream[],
  orient: RoadmapOrient,
  opens: Record<string, BandOpen>,
): { width: number; height: number } {
  let right = 40;
  let bottom = 40;
  for (const s of streams) {
    const x = streamCanvasCol(s) * CELL;
    const y = streamCanvasRow(s) * CELL;
    right = Math.max(right, x + streamOuterWidthPx(s, orient, opens[s.id] ?? defaultBands()));
    bottom = Math.max(bottom, y + streamOuterHeightPx(s, orient, opens[s.id] ?? defaultBands()));
  }
  return {
    width: right + STREAM_GAP_PX * 2 + CELL * 24,
    height: bottom + STREAM_GAP_PX * 2 + CELL * 24,
  };
}
