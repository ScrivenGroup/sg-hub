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

export type BandId = "wip" | "seq" | "future";
export type RoadmapOrient = "h" | "v";
export type ResizeEdge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export function bandOf(placement: RoadmapPlacement): BandId {
  if (placement === "sequenced") return "seq";
  if (placement === "future") return "future";
  return "wip";
}

export function placementForBand(band: BandId, row: number): RoadmapPlacement {
  if (band === "seq") return "sequenced";
  if (band === "future") return "future";
  return row > 0 ? "waiting_sequence" : "undeveloped";
}

export function inBand(chunk: RoadmapChunk, band: BandId): boolean {
  return bandOf(chunk.placement) === band;
}

export function streamCols(stream: RoadmapStream): number {
  return Math.max(MIN_STREAM_COLS, stream.cols ?? DEFAULT_STREAM_COLS);
}

export function streamLeftPx(streams: RoadmapStream[], index: number): number {
  let x = STREAM_GAP_PX;
  for (let i = 0; i < index; i++) {
    x += streamCols(streams[i]) * CELL + STREAM_GAP_PX;
  }
  return x;
}

export function canvasWidthPx(streams: RoadmapStream[]): number {
  return streamLeftPx(streams, streams.length) + STREAM_GAP_PX;
}

export function overlaps(a: RoadmapChunk, b: RoadmapChunk): boolean {
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
): RoadmapChunk {
  const maxW = Math.max(MIN_CHUNK_W, cols);
  const w = Math.max(MIN_CHUNK_W, Math.min(maxW, chunk.w));
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
): RoadmapChunk {
  const east = edge.includes("e");
  const west = edge.includes("w");
  const south = edge.includes("s");
  const north = edge.includes("n");

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

  w = Math.max(MIN_CHUNK_W, w);
  h = Math.max(MIN_CHUNK_H, h);
  if (west) col = orig.col + orig.w - w;
  if (north) row = orig.row + orig.h - h;

  return clampChunk({ ...orig, col, row, w, h }, cols);
}

/** Push overlapping siblings down. The kept id stays put. */
export function resolveDown(
  chunks: RoadmapChunk[],
  keptId: string,
  cols: number,
): RoadmapChunk[] {
  const next = chunks.map((c) => clampChunk({ ...c }, cols));
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
        const push = a.id === keptId ? b : b.id === keptId ? a : a.row >= b.row ? a : b;
        const other = push.id === a.id ? b : a;
        const dest = other.row + other.h;
        if (push.row < dest) {
          push.row = dest;
          changed = true;
        }
      }
    }
  }
  return next;
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
