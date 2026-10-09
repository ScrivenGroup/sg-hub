"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
import type { RoadmapChunk, RoadmapStream } from "../types";
import {
  BAND_PAD,
  CELL,
  COLLAPSED_STRIP,
  DEFAULT_STREAM_COLS,
  MAX_STREAM_COLS,
  MAX_ZOOM,
  MIN_STREAM_COLS,
  MIN_ZOOM,
  ZOOM_STEP,
  STREAM_BLUE,
  applyBandChunks,
  bandBodyCols,
  bandBodyRows,
  bandOf,
  bandRows,
  canvasDotGridStyle,
  clampChunk,
  collapseStream,
  defaultBands,
  findPackSlot,
  fitStreamToChunks,
  inBand,
  overlaps,
  packBand,
  packStreams,
  placementForBand,
  playgroundBounds,
  resizeChunk,
  resizeStreamBox,
  resolveDown,
  sectionAxis,
  sectionDotGridStyle,
  sequenceSku,
  streamBoxCells,
  streamCanvasCol,
  streamCanvasRow,
  streamCols,
  streamContentOverflows,
  streamOuterHeightPx,
  streamOuterWidthPx,
  streamPeeking,
  streamSequenceSku,
  titleMinCols,
  type BandId,
  type BandOpen,
  type ResizeEdge,
  type RoadmapOrient,
} from "../layout";
import {
  IconArrowsIn,
  IconArrowsOut,
  IconAutofit,
  IconCheck,
  IconDetails,
  IconFullscreen,
  IconGrip,
  IconLock,
  IconPencil,
  IconPlus,
  IconTrash,
  IconUser,
} from "../icons";

const ORIENT_KEY = "sg-roadmap-orient";
const ZOOM_KEY = "sg-roadmap-zoom";

type Gesture =
  | {
      kind: "move-chunk";
      streamId: string;
      chunkId: string;
      ids: string[];
      origs: Record<string, { col: number; row: number }>;
      startX: number;
      startY: number;
    }
  | {
      kind: "marquee";
      streamId: string;
      band: BandId;
      startX: number;
      startY: number;
    }
  | {
      kind: "resize-chunk";
      streamId: string;
      chunkId: string;
      edge: ResizeEdge;
      startX: number;
      startY: number;
      orig: RoadmapChunk;
    }
  | {
      kind: "move-stream";
      streamId: string;
      startX: number;
      startY: number;
      origCol: number;
      origRow: number;
    }
  | {
      kind: "resize-stream";
      streamId: string;
      edge: ResizeEdge;
      startX: number;
      startY: number;
      orig: { col: number; row: number; w: number; h: number };
    }
  | {
      kind: "resize-band";
      streamId: string;
      band: BandId;
      axis: "row" | "col";
      startX: number;
      startY: number;
      orig: number;
    };

function cloneStreams(streams: RoadmapStream[]): RoadmapStream[] {
  let cursor = 1;
  return streams.map((s) => {
    const titleNeed = s.chunks.reduce(
      (m, c) => Math.max(m, titleMinCols(c.title)),
      MIN_STREAM_COLS,
    );
    const cols = Math.min(MAX_STREAM_COLS, Math.max(streamCols(s), titleNeed));
    const canvasCol = s.canvasCol ?? cursor;
    const canvasRow = s.canvasRow ?? 1;
    cursor = canvasCol + cols + 2;
    const chunks = s.chunks.map((c) => ({ ...c }));
    const grown = chunks.map((c, i) => {
      const need = titleMinCols(c.title);
      if (c.w >= need) return clampChunk(c, cols, Math.min(need, c.w));
      const probe = clampChunk({ ...c, w: need }, cols);
      const others = chunks.filter((_, j) => j !== i && inBand(chunks[j], bandOf(c.placement)));
      if (others.some((o) => overlaps(probe, o))) {
        return clampChunk(c, cols, Math.min(need, c.w));
      }
      return probe;
    });
    return {
      ...s,
      cols,
      canvasCol,
      canvasRow,
      chunks: grown,
    };
  });
}

function patchStream(
  streams: RoadmapStream[],
  streamId: string,
  fn: (s: RoadmapStream) => RoadmapStream,
): RoadmapStream[] {
  return streams.map((s) => (s.id === streamId ? fn(s) : s));
}

function iconBtn(className = "") {
  return `inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] hover:text-[var(--ink)] ${className}`;
}

function stripBtn(className = "") {
  return `inline-flex h-7 cursor-pointer items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[11px] font-medium text-[var(--ink)] hover:bg-[var(--surface-muted)] ${className}`;
}

function bandTint(band: BandId): { bg: string; border: string } {
  if (band === "done") {
    return {
      bg: "color-mix(in srgb, var(--rag-green) 14%, var(--surface))",
      border: "color-mix(in srgb, var(--rag-green) 40%, var(--border))",
    };
  }
  if (band === "future") {
    return {
      bg: `color-mix(in srgb, ${STREAM_BLUE} 12%, var(--surface))`,
      border: `color-mix(in srgb, ${STREAM_BLUE} 38%, var(--border))`,
    };
  }
  if (band === "seq") {
    return {
      bg: "color-mix(in srgb, var(--ink) 18%, var(--surface))",
      border: "color-mix(in srgb, var(--ink) 32%, var(--border))",
    };
  }
  return {
    bg: "color-mix(in srgb, var(--ink) 3%, var(--page))",
    border: "color-mix(in srgb, var(--ink) 10%, var(--border))",
  };
}

function chunkChrome(chunk: RoadmapChunk): { border: string; bg: string } {
  if (chunk.locked) {
    return {
      border: "color-mix(in srgb, #b45309 70%, var(--border))",
      bg: "color-mix(in srgb, #b45309 8%, var(--surface))",
    };
  }
  const band = bandOf(chunk.placement);
  if (band === "done") {
    return {
      border: "color-mix(in srgb, var(--rag-green) 70%, var(--border))",
      bg: "color-mix(in srgb, var(--rag-green) 10%, var(--surface))",
    };
  }
  if (band === "future") {
    return {
      border: `color-mix(in srgb, ${STREAM_BLUE} 55%, var(--border))`,
      bg: `color-mix(in srgb, ${STREAM_BLUE} 8%, var(--surface))`,
    };
  }
  if (band === "seq") {
    return {
      border: "color-mix(in srgb, var(--ink) 42%, var(--border))",
      bg: "color-mix(in srgb, var(--ink) 12%, var(--surface))",
    };
  }
  return {
    border: "color-mix(in srgb, var(--ink) 12%, var(--border))",
    bg: "color-mix(in srgb, var(--page) 82%, white)",
  };
}

function readOrient(): RoadmapOrient {
  if (typeof window === "undefined") return "h";
  return window.localStorage.getItem(ORIENT_KEY) === "v" ? "v" : "h";
}

function hugStream(stream: RoadmapStream, orient: RoadmapOrient): RoadmapStream {
  const grow = sectionAxis(orient) === "v" ? "row" : "col";
  let next = stream;
  (["wip", "seq", "future", "done"] as BandId[]).forEach((band) => {
    const packed = packBand(next.chunks.filter((c) => inBand(c, band)), streamCols(next), grow);
    if (packed.cols !== streamCols(next) && grow === "col") {
      next = { ...next, cols: packed.cols };
    }
    next = applyBandChunks(next, band, packed.chunks);
  });
  return fitStreamToChunks(next, orient, defaultBands());
}

export function RoadmapPlayground({ initial }: { initial: RoadmapStream[] }) {
  const [streams, setStreams] = useState(() => cloneStreams(initial).map((s) => hugStream(s, "h")));
  const [openId, setOpenId] = useState<string | null>(null);
  const [editStreamId, setEditStreamId] = useState<string | null>(null);
  const [bands, setBands] = useState<Record<string, BandOpen>>({});
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [orient, setOrient] = useState<RoadmapOrient>("h");
  const [zoom, setZoom] = useState(1);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(
    null,
  );
  const streamsRef = useRef(streams);
  const zoomRef = useRef(zoom);
  const orientRef = useRef(orient);
  const bandsRef = useRef(bands);
  const focusOriginRef = useRef({ col: 1, row: 1 });
  streamsRef.current = streams;
  zoomRef.current = zoom;
  orientRef.current = orient;
  bandsRef.current = bands;

  useEffect(() => {
    setOrient(readOrient());
    const raw = window.localStorage.getItem(ZOOM_KEY);
    const z = raw ? Number(raw) : 1;
    if (Number.isFinite(z)) {
      setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z)));
    }
  }, []);

  const open = useMemo(() => {
    if (!openId) return null;
    for (const s of streams) {
      const chunk = s.chunks.find((c) => c.id === openId);
      if (chunk) return { stream: s, chunk };
    }
    return null;
  }, [openId, streams]);

  const editing = streams.find((s) => s.id === editStreamId) ?? null;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpenId(null);
        setEditStreamId(null);
        setFocusId(null);
        setLegendOpen(false);
        setSelected([]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!focusId) return;
    const s = streamsRef.current.find((x) => x.id === focusId);
    if (s) {
      focusOriginRef.current = {
        col: streamCanvasCol(s),
        row: streamCanvasRow(s),
      };
    }
    document.getElementById(`rm-stream-${focusId}`)?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }, [focusId]);

  useEffect(() => {
    if (!gesture) return;

    function onMove(e: globalThis.PointerEvent) {
      const g = gesture;
      if (!g) return;
      const cell = CELL * zoomRef.current;
      const dx = e.clientX - g.startX;
      const dy = e.clientY - ("startY" in g ? g.startY : e.clientY);

      if (g.kind === "move-stream") {
        const col = Math.max(0, g.origCol + Math.round(dx / cell));
        const row = Math.max(0, g.origRow + Math.round(dy / cell));
        setStreams((prev) =>
          patchStream(prev, g.streamId, (s) => ({
            ...s,
            canvasCol: col,
            canvasRow: row,
          })),
        );
        return;
      }

      if (g.kind === "resize-stream") {
        setStreams((prev) =>
          patchStream(prev, g.streamId, (s) =>
            resizeStreamBox(
              s,
              g.edge,
              Math.round(dx / cell),
              Math.round(dy / cell),
              orientRef.current,
              bandsRef.current[g.streamId] ?? defaultBands(),
              g.orig,
            ),
          ),
        );
        return;
      }

      if (g.kind === "resize-band") {
        const delta = g.axis === "col" ? Math.round(dx / cell) : Math.round(dy / cell);
        const next = Math.max(2, g.orig + delta);
        setStreams((prev) =>
          patchStream(prev, g.streamId, (s) =>
            g.axis === "col"
              ? { ...s, bandCols: { ...s.bandCols, [g.band]: next } }
              : { ...s, bandRows: { ...s.bandRows, [g.band]: next } },
          ),
        );
        return;
      }

      if (g.kind === "marquee") {
        setMarquee({
          x: Math.min(g.startX, e.clientX),
          y: Math.min(g.startY, e.clientY),
          w: Math.abs(e.clientX - g.startX),
          h: Math.abs(e.clientY - g.startY),
        });
        return;
      }

      const dCol = Math.round(dx / cell);
      const dRow = Math.round(dy / cell);

      if (g.kind === "move-chunk") {
        setStreams((prev) =>
          patchStream(prev, g.streamId, (s) => {
            const cols = streamCols(s);
            const moving = new Set(g.ids);
            return {
              ...s,
              chunks: s.chunks.map((c) => {
                if (!moving.has(c.id) || c.locked) return c;
                const orig = g.origs[c.id];
                if (!orig) return c;
                return clampChunk(
                  { ...c, col: orig.col + dCol, row: Math.max(0, orig.row + dRow) },
                  cols,
                  Math.min(titleMinCols(c.title), c.w),
                );
              }),
            };
          }),
        );
        return;
      }

      setStreams((prev) =>
        patchStream(prev, g.streamId, (s) => {
          const cols = streamCols(s);
          const band = bandOf(g.orig.placement);
          const maxRows =
            sectionAxis(orientRef.current) === "h"
              ? bandRows(s.chunks.filter((c) => inBand(c, band)))
              : undefined;
          return {
            ...s,
            chunks: s.chunks.map((c) =>
              c.id !== g.chunkId
                ? c
                : resizeChunk(g.orig, g.edge, dCol, dRow, cols, maxRows),
            ),
          };
        }),
      );
    }

    function onUp(e: globalThis.PointerEvent) {
      const g = gesture;
      setGesture(null);
      setMarquee(null);
      if (!g) return;

      if (g.kind === "resize-stream") {
        const s = streamsRef.current.find((x) => x.id === g.streamId);
        if (
          s &&
          !s.collapsed &&
          streamContentOverflows(
            s,
            orientRef.current,
            bandsRef.current[g.streamId] ?? defaultBands(),
          )
        ) {
          autofitStream(g.streamId);
        }
        return;
      }

      if (g.kind === "move-stream" || g.kind === "resize-band") {
        return;
      }

      if (g.kind === "marquee") {
        const box = {
          left: Math.min(g.startX, e.clientX),
          top: Math.min(g.startY, e.clientY),
          right: Math.max(g.startX, e.clientX),
          bottom: Math.max(g.startY, e.clientY),
        };
        const hits: string[] = [];
        document.querySelectorAll<HTMLElement>(`[data-rm-chunk][data-rm-stream="${g.streamId}"]`).forEach((el) => {
          if (el.dataset.rmBand !== g.band) return;
          const r = el.getBoundingClientRect();
          if (r.right < box.left || r.left > box.right || r.bottom < box.top || r.top > box.bottom) {
            return;
          }
          if (el.dataset.rmChunk) hits.push(el.dataset.rmChunk);
        });
        setSelected(hits);
        return;
      }

      if (g.kind === "move-chunk" || g.kind === "resize-chunk") {
        const bandEl = document
          .elementsFromPoint(e.clientX, e.clientY)
          .find((el) => el instanceof HTMLElement && el.dataset.rmBand);
        const band = (bandEl instanceof HTMLElement
          ? bandEl.dataset.rmBand
          : null) as BandId | null;
        if (g.kind === "move-chunk") {
          settleChunks(g.streamId, g.ids, band);
        } else {
          settleChunks(g.streamId, [g.chunkId], band);
        }
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("pointerup", onUp);
    };
  }, [gesture]);

  function settleChunks(streamId: string, chunkIds: string[], band: BandId | null) {
    setStreams((prev) =>
      patchStream(prev, streamId, (s) => {
        const cols = streamCols(s);
        let next = s;
        for (const chunkId of chunkIds) {
          const raw = next.chunks.find((c) => c.id === chunkId);
          if (!raw || raw.locked) continue;
          const dest = band ?? bandOf(raw.placement);
          const moved: RoadmapChunk = {
            ...clampChunk(raw, cols, Math.min(titleMinCols(raw.title), raw.w)),
            placement: placementForBand(dest, raw.row),
            streamId,
            completedAt: dest === "done" ? raw.completedAt ?? new Date().toISOString() : undefined,
          };
          const siblings = next.chunks
            .filter((c) => c.id !== chunkId && inBand(c, dest))
            .map((c) => ({ ...c }));
          next = applyBandChunks(
            next,
            dest,
            resolveDown([moved, ...siblings], chunkId, cols),
          );
        }
        return next;
      }),
    );
  }

  function bandOpen(streamId: string, id: BandId) {
    const cur = bands[streamId] ?? defaultBands();
    return cur[id] ?? defaultBands()[id];
  }

  function opensMap(): Record<string, BandOpen> {
    const out: Record<string, BandOpen> = {};
    for (const s of streams) out[s.id] = bands[s.id] ?? defaultBands();
    return out;
  }

  function toggleBand(streamId: string, id: BandId) {
    setBands((prev) => {
      const cur = prev[streamId] ?? defaultBands();
      return { ...prev, [streamId]: { ...cur, [id]: !cur[id] } };
    });
  }

  function addStream() {
    const n = streams.length + 1;
    const right = streams.reduce(
      (m, s) => Math.max(m, streamCanvasCol(s) + streamCols(s)),
      1,
    );
    setStreams((prev) => [
      ...prev,
      {
        id: `stream-${Date.now()}`,
        title: `Stream ${n}`,
        shapeKind: "tools",
        cols: DEFAULT_STREAM_COLS,
        canvasCol: right + 2,
        canvasRow: 1,
        regions: [],
        chunks: [],
      },
    ]);
  }

  function addChunk(streamId: string, band: BandId) {
    const id = `chunk-${Date.now()}`;
    setStreams((prev) =>
      patchStream(prev, streamId, (s) => {
        const title = "New chunk";
        const w = titleMinCols(title);
        const h = 3;
        const occupied = s.chunks.filter((c) => inBand(c, band));
        const grow = sectionAxis(orient) === "v" ? "row" : "col";
        const slot = findPackSlot(
          occupied,
          w,
          h,
          streamCols(s),
          grow,
          grow === "col" ? bandRows(occupied) : undefined,
        );
        const next: RoadmapChunk = {
          id,
          streamId,
          title,
          intent: "Dummy — edit later.",
          scope: "stream",
          placement: placementForBand(band, slot.row),
          col: slot.col,
          row: slot.row,
          w,
          h,
        };
        const stream = slot.cols !== streamCols(s) ? { ...s, cols: slot.cols } : s;
        return applyBandChunks(
          stream,
          band,
          resolveDown([next, ...occupied], id, streamCols(stream)),
        );
      }),
    );
  }

  function deleteChunk(streamId: string, chunkId: string) {
    setStreams((prev) =>
      patchStream(prev, streamId, (s) => ({
        ...s,
        chunks: s.chunks.filter((c) => c.id !== chunkId),
      })),
    );
    setOpenId(null);
  }

  function toggleLock(streamId: string, chunkId: string) {
    setStreams((prev) =>
      patchStream(prev, streamId, (s) => ({
        ...s,
        chunks: s.chunks.map((c) =>
          c.id === chunkId ? { ...c, locked: !c.locked } : c,
        ),
      })),
    );
  }

  function completeChunk(streamId: string, chunkId: string) {
    setStreams((prev) =>
      patchStream(prev, streamId, (s) => {
        const raw = s.chunks.find((c) => c.id === chunkId);
        if (!raw) return s;
        const moved: RoadmapChunk = {
          ...clampChunk({ ...raw, col: 0, row: 0 }, streamCols(s)),
          placement: "completed",
          completedAt: new Date().toISOString(),
          locked: false,
        };
        const siblings = s.chunks
          .filter((c) => c.id !== chunkId && inBand(c, "done"))
          .map((c) => ({ ...c }));
        return applyBandChunks(
          s,
          "done",
          resolveDown([moved, ...siblings], chunkId, streamCols(s)),
        );
      }),
    );
    setOpenId(null);
  }

  function reopenChunk(streamId: string, chunkId: string) {
    setStreams((prev) =>
      patchStream(prev, streamId, (s) => {
        const raw = s.chunks.find((c) => c.id === chunkId);
        if (!raw) return s;
        const moved: RoadmapChunk = {
          ...clampChunk({ ...raw, col: 0, row: 0 }, streamCols(s)),
          placement: "sequenced",
          completedAt: undefined,
        };
        const siblings = s.chunks
          .filter((c) => c.id !== chunkId && inBand(c, "seq"))
          .map((c) => ({ ...c }));
        return applyBandChunks(
          s,
          "seq",
          resolveDown([moved, ...siblings], chunkId, streamCols(s)),
        );
      }),
    );
    setOpenId(null);
  }

  function applyZoom(next: number) {
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(next * 10) / 10));
    setZoom(z);
    window.localStorage.setItem(ZOOM_KEY, String(z));
  }

  function toggleCollapsed(streamId: string) {
    setStreams((prev) =>
      patchStream(prev, streamId, (s) =>
        s.collapsed
          ? fitStreamToChunks(s, orient, bands[streamId] ?? defaultBands())
          : collapseStream(s),
      ),
    );
  }

  function collapseAll() {
    setStreams((prev) => prev.map(collapseStream));
  }

  function expandAll() {
    setStreams((prev) =>
      prev.map((s) => fitStreamToChunks(s, orient, bands[s.id] ?? defaultBands())),
    );
  }

  function autofitBand(streamId: string, band: BandId) {
    setStreams((prev) =>
      patchStream(prev, streamId, (s) => {
        const grow = sectionAxis(orient) === "v" ? "row" : "col";
        const packed = packBand(s.chunks.filter((c) => inBand(c, band)), streamCols(s), grow);
        const stream = packed.cols !== streamCols(s) && grow === "col" ? { ...s, cols: packed.cols } : s;
        return applyBandChunks(stream, band, packed.chunks);
      }),
    );
  }

  function autofitStream(streamId: string) {
    setStreams((prev) =>
      patchStream(prev, streamId, (s) => {
        const grow = sectionAxis(orient) === "v" ? "row" : "col";
        let next = s;
        (["wip", "seq", "future", "done"] as BandId[]).forEach((band) => {
          const packed = packBand(next.chunks.filter((c) => inBand(c, band)), streamCols(next), grow);
          if (packed.cols !== streamCols(next) && grow === "col") {
            next = { ...next, cols: packed.cols };
          }
          next = applyBandChunks(next, band, packed.chunks);
        });
        return fitStreamToChunks(next, orient, bands[streamId] ?? defaultBands());
      }),
    );
  }

  function autofitPage() {
    setStreams((prev) =>
      prev.map((s) => {
        const grow = sectionAxis(orient) === "v" ? "row" : "col";
        let next = s;
        (["wip", "seq", "future", "done"] as BandId[]).forEach((band) => {
          const packed = packBand(next.chunks.filter((c) => inBand(c, band)), streamCols(next), grow);
          if (packed.cols !== streamCols(next) && grow === "col") {
            next = { ...next, cols: packed.cols };
          }
          next = applyBandChunks(next, band, packed.chunks);
        });
        return fitStreamToChunks(next, orient, bands[s.id] ?? defaultBands());
      }),
    );
  }

  function patchChunk(
    streamId: string,
    chunkId: string,
    patch: Partial<RoadmapChunk>,
  ) {
    setStreams((prev) =>
      patchStream(prev, streamId, (s) => ({
        ...s,
        chunks: s.chunks.map((c) => (c.id === chunkId ? { ...c, ...patch } : c)),
      })),
    );
  }

  function start(e: PointerEvent, next: Gesture) {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic or already-released pointer */
    }
    setGesture(next);
  }

  function opensFor(list: RoadmapStream[]): Record<string, BandOpen> {
    const out: Record<string, BandOpen> = {};
    for (const s of list) out[s.id] = bands[s.id] ?? defaultBands();
    return out;
  }

  function reorganizeStreams() {
    setStreams((prev) => packStreams(prev, orient, opensFor(prev)));
  }

  function toggleOrientation() {
    const next: RoadmapOrient = orient === "h" ? "v" : "h";
    setOrient(next);
    window.localStorage.setItem(ORIENT_KEY, next);
    setStreams((prev) => packStreams(prev, next, opensFor(prev)));
  }

  function enterFullscreen(id: string) {
    setActiveStreamId(id);
    setStreams((prev) =>
      patchStream(prev, id, (s) =>
        s.collapsed ? fitStreamToChunks(s, orient, bands[id] ?? defaultBands()) : s,
      ),
    );
    setFocusId((cur) => (cur === id ? null : id));
  }

  const opens = opensMap();
  const visible = focusId ? streams.filter((s) => s.id === focusId) : streams;
  const origin = focusId ? focusOriginRef.current : { col: 0, row: 0 };
  const display = visible.map((s) =>
    focusId
      ? {
          ...s,
          canvasCol: streamCanvasCol(s) - origin.col + 1,
          canvasRow: streamCanvasRow(s) - origin.row + 1,
        }
      : s,
  );
  const bounds = playgroundBounds(display, orient, opens);
  const skuByStream = Object.fromEntries(
    streams.map((s) => [s.id, sequenceSku(s.chunks)]),
  ) as Record<string, Map<string, number>>;
  const streamSku = streamSequenceSku(streams);
  const liftingId =
    gesture?.kind === "move-stream" || gesture?.kind === "resize-stream"
      ? gesture.streamId
      : null;

  function columnFor(stream: RoadmapStream, fill: boolean) {
    const lifting = liftingId === stream.id;
    const z = lifting || activeStreamId === stream.id
      ? 80
      : Math.max(1, 40 - (streamSku.get(stream.id) ?? 20));
    return (
      <StreamColumn
        key={stream.id}
        stream={stream}
        orient={orient}
        left={fill ? 0 : Math.max(0, streamCanvasCol(stream)) * CELL}
        top={fill ? 0 : Math.max(0, streamCanvasRow(stream)) * CELL}
        streamSku={streamSku.get(stream.id)}
        wipOpen={bandOpen(stream.id, "wip")}
        seqOpen={bandOpen(stream.id, "seq")}
        futureOpen={bandOpen(stream.id, "future")}
        doneOpen={bandOpen(stream.id, "done")}
        sku={skuByStream[stream.id]}
        selected={selected}
        lifting={lifting}
        zIndex={z}
        focused={focusId === stream.id}
        active={activeStreamId === stream.id}
        fill={fill}
        onSelectStream={() => setActiveStreamId(stream.id)}
        onToggle={toggleBand}
        onAddChunk={addChunk}
        onEdit={() => setEditStreamId(stream.id)}
        onCollapse={() => toggleCollapsed(stream.id)}
        onAutofit={() => autofitStream(stream.id)}
        onAutofitBand={(band) => autofitBand(stream.id, band)}
        onFullscreen={() => enterFullscreen(stream.id)}
        onGrabStream={(e) => {
          if (fill) return;
          const real = streams.find((s) => s.id === stream.id) ?? stream;
          setActiveStreamId(stream.id);
          start(e, {
            kind: "move-stream",
            streamId: stream.id,
            startX: e.clientX,
            startY: e.clientY,
            origCol: streamCanvasCol(real),
            origRow: streamCanvasRow(real),
          });
        }}
        onResizeStream={(e, edge) => {
          if (fill) return;
          const real = streams.find((s) => s.id === stream.id) ?? stream;
          setActiveStreamId(stream.id);
          start(e, {
            kind: "resize-stream",
            streamId: stream.id,
            edge,
            startX: e.clientX,
            startY: e.clientY,
            orig: streamBoxCells(real, orient, bands[stream.id] ?? defaultBands()),
          });
        }}
        onGrabChunk={(e, chunk) => {
          if (chunk.locked) return;
          setActiveStreamId(stream.id);
          const group = selected.includes(chunk.id) ? selected : [chunk.id];
          const inStream = streams.find((s) => s.id === stream.id);
          const origs: Record<string, { col: number; row: number }> = {};
          for (const id of group) {
            const c = inStream?.chunks.find((x) => x.id === id);
            if (c) origs[id] = { col: c.col, row: c.row };
          }
          start(e, {
            kind: "move-chunk",
            streamId: stream.id,
            chunkId: chunk.id,
            ids: group,
            origs,
            startX: e.clientX,
            startY: e.clientY,
          });
        }}
        onResizeChunk={(e, chunk, edge) => {
          if (chunk.locked) return;
          start(e, {
            kind: "resize-chunk",
            streamId: stream.id,
            chunkId: chunk.id,
            edge,
            startX: e.clientX,
            startY: e.clientY,
            orig: { ...chunk },
          });
        }}
        onEditChunk={setOpenId}
        onSelectChunk={(chunk, shift) => {
          setActiveStreamId(stream.id);
          setSelected((prev) => {
            if (shift) {
              return prev.includes(chunk.id)
                ? prev.filter((id) => id !== chunk.id)
                : [...prev, chunk.id];
            }
            return [chunk.id];
          });
        }}
        onLockChunk={(chunkId) => toggleLock(stream.id, chunkId)}
        onMarquee={(e, band) =>
          start(e, {
            kind: "marquee",
            streamId: stream.id,
            band,
            startX: e.clientX,
            startY: e.clientY,
          })
        }
        onResizeBand={(e, band, axis, orig) =>
          start(e, {
            kind: "resize-band",
            streamId: stream.id,
            band,
            axis,
            startX: e.clientX,
            startY: e.clientY,
            orig,
          })
        }
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <PriorityStrip
        streams={streams}
        streamSku={streamSku}
        orient={orient}
        zoom={zoom}
        focusId={focusId}
        onToggleOrient={toggleOrientation}
        onReorganize={reorganizeStreams}
        onZoom={applyZoom}
        onAddStream={addStream}
        onCollapseAll={collapseAll}
        onExpandAll={expandAll}
        onAutofit={autofitPage}
        onLegend={() => setLegendOpen(true)}
        onFullscreenStream={enterFullscreen}
        onExitFocus={() => setFocusId(null)}
        onFocus={(id) => {
          setActiveStreamId(id);
          document.getElementById(`rm-stream-${id}`)?.scrollIntoView({
            inline: "center",
            block: "nearest",
            behavior: "smooth",
          });
        }}
      />

      {focusId ? (
        <div className="min-h-0 flex-1 overflow-hidden p-1" style={canvasDotGridStyle()}>
          {display.map((stream) => columnFor(stream, true))}
        </div>
      ) : (
      <div className="min-h-0 flex-1 overflow-auto" style={canvasDotGridStyle()}>
        <div
          className="relative"
          style={{
            width: Math.max(bounds.width * zoom, 1),
            height: Math.max(bounds.height * zoom, 1),
            minWidth: "100%",
            minHeight: "100%",
          }}
        >
          <div
            className="absolute top-0 left-0 origin-top-left"
            style={{
              width: bounds.width,
              height: bounds.height,
              transform: `scale(${zoom})`,
              transformOrigin: "0 0",
            }}
          >
            {display.map((stream) => columnFor(stream, false))}
          </div>
        </div>
        {marquee ? (
          <div
            className="pointer-events-none fixed z-40 border border-[color-mix(in_srgb,#3B78C4_70%,transparent)] bg-[color-mix(in_srgb,#3B78C4_12%,transparent)]"
            style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }}
          />
        ) : null}
      </div>
      )}

      {open ? (
        <ChunkDrawer
          stream={open.stream}
          chunk={open.chunk}
          sku={skuByStream[open.stream.id]?.get(open.chunk.id)}
          onClose={() => setOpenId(null)}
          onLock={() => toggleLock(open.stream.id, open.chunk.id)}
          onComplete={() => completeChunk(open.stream.id, open.chunk.id)}
          onReopen={() => reopenChunk(open.stream.id, open.chunk.id)}
          onDelete={() => deleteChunk(open.stream.id, open.chunk.id)}
          onNotes={(notes) => patchChunk(open.stream.id, open.chunk.id, { notes })}
          onAssignee={(assignee) =>
            patchChunk(open.stream.id, open.chunk.id, { assignee })
          }
        />
      ) : null}
      {editing ? (
        <StreamEditor
          stream={editing}
          onClose={() => setEditStreamId(null)}
          onSave={(title) => {
            setStreams((prev) =>
              patchStream(prev, editing.id, (s) => ({ ...s, title })),
            );
            setEditStreamId(null);
          }}
        />
      ) : null}
      {legendOpen ? <LegendDialog onClose={() => setLegendOpen(false)} /> : null}
    </div>
  );
}

function PriorityStrip({
  streams,
  streamSku,
  orient,
  zoom,
  focusId,
  onToggleOrient,
  onReorganize,
  onZoom,
  onAddStream,
  onCollapseAll,
  onExpandAll,
  onAutofit,
  onLegend,
  onFullscreenStream,
  onExitFocus,
  onFocus,
}: {
  streams: RoadmapStream[];
  streamSku: Map<string, number>;
  orient: RoadmapOrient;
  zoom: number;
  focusId: string | null;
  onToggleOrient: () => void;
  onReorganize: () => void;
  onZoom: (next: number) => void;
  onAddStream: () => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  onAutofit: () => void;
  onLegend: () => void;
  onFullscreenStream: (id: string) => void;
  onExitFocus: () => void;
  onFocus: (id: string) => void;
}) {
  const focused = streams.find((s) => s.id === focusId) ?? null;
  const pct = Math.round(zoom * 100);

  return (
    <div className="shrink-0 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-[var(--muted)]">
          {focused
            ? `Fullscreen · ${focused.title}`
            : "Free canvas — sequence is top-left, then right, then down."}{" "}
          Sections {orient === "h" ? "stack" : "run across"}.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex h-7 items-center rounded-md border border-[var(--border)]">
            <button
              type="button"
              title="Zoom out"
              aria-label="Zoom out"
              className="h-full cursor-pointer px-2 text-[11px] text-[var(--muted)] hover:text-[var(--ink)]"
              onClick={() => onZoom(zoom - ZOOM_STEP)}
            >
              −
            </button>
            <span className="min-w-10 px-1 text-center font-mono text-[11px]" title="Canvas zoom">
              {pct}%
            </span>
            <button
              type="button"
              title="Zoom in"
              aria-label="Zoom in"
              className="h-full cursor-pointer px-2 text-[11px] text-[var(--muted)] hover:text-[var(--ink)]"
              onClick={() => onZoom(zoom + ZOOM_STEP)}
            >
              +
            </button>
          </div>
          <div className="inline-flex h-7 items-center gap-1">
            <button
              type="button"
              title="Expand all streams"
              className={stripBtn()}
              onClick={onExpandAll}
            >
              Expand All
            </button>
            <button
              type="button"
              title="Collapse all streams"
              className={stripBtn()}
              onClick={onCollapseAll}
            >
              Collapse All
            </button>
            <button
              type="button"
              title="Autofit chunks on the page"
              aria-label="Autofit chunks on the page"
              className={iconBtn("h-7 w-7")}
              onClick={onAutofit}
            >
              <IconAutofit className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Reorganize streams on the canvas"
              className={stripBtn()}
              onClick={onReorganize}
            >
              Reorganize streams
            </button>
            <button
              type="button"
              title="Open the legend"
              aria-label="Open the legend"
              className={iconBtn("h-7 w-7")}
              onClick={onLegend}
            >
              <IconDetails className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            type="button"
            title="Toggle horizontal / vertical"
            aria-label="Toggle horizontal / vertical"
            className="inline-flex h-7 cursor-pointer items-center rounded-md border border-[var(--border)] p-0.5"
            onClick={onToggleOrient}
          >
            <span
              className={`rounded px-2 py-0.5 text-[11px] ${
                orient === "h"
                  ? "bg-[var(--page)] font-medium text-[var(--ink)]"
                  : "text-[var(--muted)]"
              }`}
            >
              H
            </span>
            <span
              className={`rounded px-2 py-0.5 text-[11px] ${
                orient === "v"
                  ? "bg-[var(--page)] font-medium text-[var(--ink)]"
                  : "text-[var(--muted)]"
              }`}
            >
              V
            </span>
          </button>
          {focused ? (
            <button
              type="button"
              title="Exit fullscreen"
              className={stripBtn()}
              onClick={onExitFocus}
            >
              Exit fullscreen
            </button>
          ) : (
            <button
              type="button"
              title="Add a new stream"
              className={stripBtn()}
              onClick={onAddStream}
            >
              New stream
            </button>
          )}
        </div>
      </div>
      {focused ? null : (
        <ol className="flex min-h-8 flex-wrap items-center gap-2">
          {streams.map((stream) => (
            <li key={stream.id}>
              <div
                className="inline-flex items-stretch overflow-hidden rounded-md border"
                style={{
                  borderColor: `color-mix(in srgb, ${STREAM_BLUE} 45%, var(--border))`,
                  background: `color-mix(in srgb, ${STREAM_BLUE} 10%, var(--page))`,
                }}
              >
                <button
                  type="button"
                  title={`Scroll to ${stream.title}`}
                  onClick={() => onFocus(stream.id)}
                  className="flex cursor-pointer items-center gap-2 px-2 py-1 text-xs font-medium"
                >
                  <span className="font-mono text-[10px] text-[var(--muted)]">
                    T{streamSku.get(stream.id) ?? "—"}
                  </span>
                  {stream.title}
                </button>
                <button
                  type="button"
                  title={`Fullscreen ${stream.title}`}
                  aria-label={`Fullscreen ${stream.title}`}
                  className="inline-flex w-7 cursor-pointer items-center justify-center border-l text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] hover:text-[var(--ink)]"
                  style={{
                    borderColor: `color-mix(in srgb, ${STREAM_BLUE} 35%, var(--border))`,
                  }}
                  onClick={() => onFullscreenStream(stream.id)}
                >
                  <IconFullscreen className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function StreamColumn({
  stream,
  orient,
  left,
  top,
  streamSku,
  wipOpen,
  seqOpen,
  futureOpen,
  doneOpen,
  sku,
  selected,
  lifting,
  focused,
  active,
  fill,
  zIndex,
  onSelectStream,
  onToggle,
  onAddChunk,
  onEdit,
  onCollapse,
  onAutofit,
  onAutofitBand,
  onFullscreen,
  onGrabStream,
  onResizeStream,
  onGrabChunk,
  onResizeChunk,
  onEditChunk,
  onSelectChunk,
  onLockChunk,
  onMarquee,
  onResizeBand,
}: {
  stream: RoadmapStream;
  orient: RoadmapOrient;
  left: number;
  top: number;
  streamSku?: number;
  wipOpen: boolean;
  seqOpen: boolean;
  futureOpen: boolean;
  doneOpen: boolean;
  sku: Map<string, number>;
  selected: string[];
  lifting: boolean;
  focused: boolean;
  active: boolean;
  fill: boolean;
  zIndex: number;
  onSelectStream: () => void;
  onToggle: (streamId: string, id: BandId) => void;
  onAddChunk: (streamId: string, band: BandId) => void;
  onEdit: () => void;
  onCollapse: () => void;
  onAutofit: () => void;
  onAutofitBand: (band: BandId) => void;
  onFullscreen: () => void;
  onGrabStream: (e: PointerEvent) => void;
  onResizeStream: (e: PointerEvent, edge: ResizeEdge) => void;
  onGrabChunk: (e: PointerEvent, chunk: RoadmapChunk) => void;
  onResizeChunk: (e: PointerEvent, chunk: RoadmapChunk, edge: ResizeEdge) => void;
  onEditChunk: (id: string) => void;
  onSelectChunk: (chunk: RoadmapChunk, shift: boolean) => void;
  onLockChunk: (chunkId: string) => void;
  onMarquee: (e: PointerEvent, band: BandId) => void;
  onResizeBand: (e: PointerEvent, band: BandId, axis: "row" | "col", orig: number) => void;
}) {
  const cols = streamCols(stream);
  const open: BandOpen = {
    wip: wipOpen,
    seq: seqOpen,
    future: futureOpen,
    done: doneOpen,
  };
  const width = streamOuterWidthPx(stream, orient, open);
  const height = streamOuterHeightPx(stream, orient, open);
  const wip = stream.chunks.filter((c) => inBand(c, "wip"));
  const sequenced = stream.chunks.filter((c) => inBand(c, "seq"));
  const future = stream.chunks.filter((c) => inBand(c, "future"));
  const done = stream.chunks.filter((c) => inBand(c, "done"));
  const peeking = streamPeeking(stream);
  const showBody = fill || !stream.collapsed || peeking;

  return (
    <section
      id={`rm-stream-${stream.id}`}
      className={
        fill
          ? "group/stream relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-md border"
          : "group/stream absolute flex flex-col overflow-hidden rounded-md border"
      }
      style={{
        ...(fill
          ? { zIndex: 1 }
          : {
              left,
              top,
              width,
              height,
              zIndex,
            }),
        borderColor: focused || active
          ? STREAM_BLUE
          : `color-mix(in srgb, ${STREAM_BLUE} 55%, var(--border))`,
        boxShadow: active && !fill
          ? `0 0 0 1px color-mix(in srgb, ${STREAM_BLUE} 35%, transparent)`
          : undefined,
        ...(stream.collapsed && !peeking
          ? {
              background: `color-mix(in srgb, ${STREAM_BLUE} 14%, var(--surface))`,
            }
          : sectionDotGridStyle()),
      }}
      onPointerDown={onSelectStream}
    >
      <header
        className="relative z-30 flex shrink-0 cursor-grab items-center gap-1 border-b px-2 py-1"
        style={{
          background: `color-mix(in srgb, ${STREAM_BLUE} 16%, var(--surface))`,
          borderColor: `color-mix(in srgb, ${STREAM_BLUE} 28%, var(--border))`,
        }}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          onGrabStream(e);
        }}
      >
        <span className={`${iconBtn()} pointer-events-none`}>
          <IconGrip className="h-3.5 w-3.5" />
        </span>
        {streamSku != null ? (
          <span className="shrink-0 font-mono text-[10px] text-[var(--muted)]">T{streamSku}</span>
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">{stream.title}</h2>
          {stream.collapsed && !peeking ? null : (
            <p className="truncate text-[11px] text-[var(--muted)]">
              {stream.shapeKind}
              {stream.regions.length
                ? ` · ${stream.regions.map((r) => r.title).join(" · ")}`
                : ""}
            </p>
          )}
        </div>
        <button
          type="button"
          title="Autofit this stream"
          aria-label="Autofit this stream"
          className={iconBtn()}
          onClick={onAutofit}
        >
          <IconAutofit className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title={stream.collapsed ? "Expand stream" : "Collapse stream"}
          aria-label={stream.collapsed ? "Expand stream" : "Collapse stream"}
          className={iconBtn()}
          onClick={onCollapse}
        >
          {stream.collapsed ? (
            <IconArrowsOut className="h-3.5 w-3.5" />
          ) : (
            <IconArrowsIn className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          type="button"
          title={focused ? "Exit fullscreen" : "Fullscreen stream"}
          aria-label={focused ? "Exit fullscreen" : "Fullscreen stream"}
          className={iconBtn()}
          onClick={onFullscreen}
        >
          <IconFullscreen className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Edit stream name"
          aria-label="Edit stream name"
          className={iconBtn()}
          onClick={onEdit}
        >
          <IconPencil className="h-3.5 w-3.5" />
        </button>
      </header>

      {showBody ? (
      <div
        className={
          sectionAxis(orient) === "h"
            ? `flex min-h-0 flex-1 flex-row overflow-hidden ${fill ? "h-full" : ""}`
            : `flex min-h-0 flex-1 flex-col overflow-hidden ${fill ? "h-full" : ""}`
        }
      >
        <Band
          streamId={stream.id}
          band="wip"
          label="WIP"
          open={wipOpen}
          axis={sectionAxis(orient)}
          cols={cols}
          bodyRows={bandBodyRows(stream, "wip")}
          bodyCols={bandBodyCols(stream, "wip")}
          chunks={wip}
          sku={sku}
          allowAdd
          onToggle={() => onToggle(stream.id, "wip")}
          onAdd={() => onAddChunk(stream.id, "wip")}
          onGrabChunk={onGrabChunk}
          onResizeChunk={onResizeChunk}
          onEditChunk={onEditChunk}
          selected={selected}
          onSelectChunk={onSelectChunk}
          onLockChunk={onLockChunk}
          onMarquee={onMarquee}
          onAutofit={() => onAutofitBand("wip")}
          onResizeBand={onResizeBand}
          fill={fill}
        />
        <Band
          streamId={stream.id}
          band="seq"
          label="Sequential"
          open={seqOpen}
          axis={sectionAxis(orient)}
          cols={cols}
          bodyRows={bandBodyRows(stream, "seq")}
          bodyCols={bandBodyCols(stream, "seq")}
          chunks={sequenced}
          sku={sku}
          allowAdd
          onToggle={() => onToggle(stream.id, "seq")}
          onAdd={() => onAddChunk(stream.id, "seq")}
          onGrabChunk={onGrabChunk}
          onResizeChunk={onResizeChunk}
          onEditChunk={onEditChunk}
          selected={selected}
          onSelectChunk={onSelectChunk}
          onLockChunk={onLockChunk}
          onMarquee={onMarquee}
          onAutofit={() => onAutofitBand("seq")}
          onResizeBand={onResizeBand}
          fill={fill}
        />
        <Band
          streamId={stream.id}
          band="future"
          label="Future"
          open={futureOpen}
          axis={sectionAxis(orient)}
          cols={cols}
          bodyRows={bandBodyRows(stream, "future")}
          bodyCols={bandBodyCols(stream, "future")}
          chunks={future}
          sku={sku}
          allowAdd
          onToggle={() => onToggle(stream.id, "future")}
          onAdd={() => onAddChunk(stream.id, "future")}
          onGrabChunk={onGrabChunk}
          onResizeChunk={onResizeChunk}
          onEditChunk={onEditChunk}
          selected={selected}
          onSelectChunk={onSelectChunk}
          onLockChunk={onLockChunk}
          onMarquee={onMarquee}
          onAutofit={() => onAutofitBand("future")}
          onResizeBand={onResizeBand}
          fill={fill}
        />
        <Band
          streamId={stream.id}
          band="done"
          label="Completed"
          open={doneOpen}
          axis={sectionAxis(orient)}
          cols={cols}
          bodyRows={bandBodyRows(stream, "done")}
          bodyCols={bandBodyCols(stream, "done")}
          chunks={done}
          sku={sku}
          allowAdd={false}
          onToggle={() => onToggle(stream.id, "done")}
          onAdd={() => undefined}
          onGrabChunk={onGrabChunk}
          onResizeChunk={onResizeChunk}
          onEditChunk={onEditChunk}
          selected={selected}
          onSelectChunk={onSelectChunk}
          onLockChunk={onLockChunk}
          onMarquee={onMarquee}
          onAutofit={() => onAutofitBand("done")}
          onResizeBand={onResizeBand}
          fill={fill}
        />
      </div>
      ) : null}

      {fill
        ? null
        : (["n", "s", "e", "w", "ne", "nw", "se", "sw"] as ResizeEdge[]).map((edge) => (
            <Handle
              key={edge}
              edge={edge}
              group="stream"
              onPointerDown={(e) => onResizeStream(e, edge)}
            />
          ))}
    </section>
  );
}

function Band({
  streamId,
  band,
  label,
  open,
  axis,
  cols,
  bodyRows,
  bodyCols,
  chunks,
  sku,
  allowAdd,
  onToggle,
  onAdd,
  onGrabChunk,
  onResizeChunk,
  onEditChunk,
  selected,
  onSelectChunk,
  onLockChunk,
  onMarquee,
  onAutofit,
  onResizeBand,
  fill,
}: {
  streamId: string;
  band: BandId;
  label: string;
  open: boolean;
  axis: RoadmapOrient;
  cols: number;
  bodyRows: number;
  bodyCols: number;
  chunks: RoadmapChunk[];
  sku: Map<string, number>;
  allowAdd: boolean;
  onToggle: () => void;
  onAdd: () => void;
  onGrabChunk: (e: PointerEvent, chunk: RoadmapChunk) => void;
  onResizeChunk: (e: PointerEvent, chunk: RoadmapChunk, edge: ResizeEdge) => void;
  onEditChunk: (id: string) => void;
  selected: string[];
  onSelectChunk: (chunk: RoadmapChunk, shift: boolean) => void;
  onLockChunk: (chunkId: string) => void;
  onMarquee: (e: PointerEvent, band: BandId) => void;
  onAutofit: () => void;
  onResizeBand: (e: PointerEvent, band: BandId, axis: "row" | "col", orig: number) => void;
  fill?: boolean;
}) {
  const across = axis === "h";
  const tint = bandTint(band);
  const height = bodyRows * CELL + BAND_PAD * 2;
  const gridW = bodyCols * CELL;

  return (
    <div
      className={
        across
          ? `relative flex min-h-0 flex-col overflow-hidden ${open ? "border-r" : ""} ${fill ? "min-w-0 flex-1" : "shrink-0"}`
          : `relative flex flex-col overflow-hidden ${fill && open ? "min-h-0 flex-1" : "shrink-0"}`
      }
      style={{
        borderColor: tint.border,
        ...(across && !open
          ? { width: COLLAPSED_STRIP }
          : across && !fill
            ? { width: gridW }
            : undefined),
      }}
    >
      <div
        className={`flex shrink-0 items-center border-b ${
          across && !open ? "h-full flex-col border-b-0 px-0 py-2" : "pr-1"
        }`}
        style={{
          background: tint.bg,
          borderColor: tint.border,
        }}
      >
        <button
          type="button"
          title={`${open ? "Collapse" : "Expand"} ${label}`}
          onClick={onToggle}
          className={
            across && !open
              ? "flex flex-1 cursor-pointer flex-col items-center gap-1 px-0.5 text-[10px] text-[var(--muted)]"
              : "flex min-w-0 flex-1 cursor-pointer items-center justify-between px-3 py-1 text-left text-[11px] text-[var(--muted)]"
          }
        >
          <span className={across && !open ? "writing-mode-vertical" : undefined}>
            <span className="mr-1">{open ? "▾" : across ? "▸" : "▸"}</span>
            {across && !open ? (
              <span
                className="inline-block"
                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
              >
                {label}
              </span>
            ) : (
              label
            )}
          </span>
          <span>{chunks.length}</span>
        </button>
        {open ? (
          <button
            type="button"
            title={`Autofit ${label}`}
            aria-label={`Autofit ${label}`}
            className={iconBtn()}
            onClick={onAutofit}
          >
            <IconAutofit className="h-3.5 w-3.5" />
          </button>
        ) : null}
        {allowAdd && open ? (
          <button
            type="button"
            title={`Add chunk to ${label}`}
            aria-label={`Add chunk to ${label}`}
            className={iconBtn()}
            onClick={onAdd}
          >
            <IconPlus className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      {open ? (
        <div
          data-rm-stream={streamId}
          data-rm-band={band}
          className={`relative mx-2 mb-2 overflow-hidden rounded ${fill ? "min-h-0 flex-1" : ""}`}
          style={{
            height: fill ? undefined : height,
            minHeight: fill ? height : undefined,
            width: fill && across ? undefined : gridW - 16,
            ...sectionDotGridStyle(),
          }}
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest("[data-rm-chunk]")) return;
            onMarquee(e, band);
          }}
        >
          {chunks.map((chunk) => (
            <GridBox
              key={chunk.id}
              chunk={chunk}
              sku={sku.get(chunk.id)}
              selected={selected.includes(chunk.id)}
              band={band}
              onGrab={(e) => onGrabChunk(e, chunk)}
              onResize={(e, edge) => onResizeChunk(e, chunk, edge)}
              onEdit={() => onEditChunk(chunk.id)}
              onSelect={(shift) => onSelectChunk(chunk, shift)}
              onToggleLock={() => onLockChunk(chunk.id)}
            />
          ))}
        </div>
      ) : null}
      {open ? (
        <div
          role="separator"
          title={`Resize ${label}`}
          aria-label={`Resize ${label}`}
          className={
            across
              ? "absolute top-8 right-0 bottom-2 w-1.5 cursor-ew-resize"
              : "absolute right-2 bottom-0 left-2 h-1.5 cursor-ns-resize"
          }
          onPointerDown={(e) =>
            onResizeBand(e, band, across ? "col" : "row", across ? bodyCols : bodyRows)
          }
        />
      ) : null}
    </div>
  );
}

function GridBox({
  chunk,
  sku,
  selected,
  band,
  onGrab,
  onResize,
  onEdit,
  onSelect,
  onToggleLock,
}: {
  chunk: RoadmapChunk;
  sku?: number;
  selected: boolean;
  band: BandId;
  onGrab: (e: PointerEvent) => void;
  onResize: (e: PointerEvent, edge: ResizeEdge) => void;
  onEdit: () => void;
  onSelect: (shift: boolean) => void;
  onToggleLock: () => void;
}) {
  const chrome = chunkChrome(chunk);
  return (
    <div
      data-rm-chunk={chunk.id}
      data-rm-stream={chunk.streamId}
      data-rm-band={band}
      className="group/chunk absolute z-10 box-border rounded border select-none"
      style={{
        left: chunk.col * CELL + 2,
        top: chunk.row * CELL + 2,
        width: chunk.w * CELL - 4,
        height: Math.max(3, chunk.h) * CELL - 4,
        borderColor: selected
          ? `color-mix(in srgb, ${STREAM_BLUE} 70%, var(--border))`
          : chrome.border,
        background: chrome.bg,
        boxShadow: selected
          ? "0 0 0 1px color-mix(in srgb, #3B78C4 35%, transparent)"
          : undefined,
      }}
      onClick={(e) => onSelect(e.shiftKey)}
    >
      <div className="flex h-full items-start gap-0.5 px-1 py-0.5">
        <button
          type="button"
          title={chunk.locked ? "Double-click to unlock" : "Drag to move · double-click to lock"}
          aria-label={chunk.locked ? "Locked" : "Move chunk"}
          className={`${iconBtn("h-5 w-5 shrink-0")} mt-0 ${
            chunk.locked
              ? "rounded bg-[color-mix(in_srgb,#b45309_22%,var(--surface))] text-[#9a3412]"
              : "cursor-grab"
          }`}
          onPointerDown={chunk.locked ? undefined : onGrab}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onToggleLock();
          }}
        >
          {chunk.locked ? (
            <IconLock className="h-3 w-3" />
          ) : (
            <IconGrip className="h-3 w-3" />
          )}
        </button>
        {sku != null ? (
          <span className="shrink-0 pt-0.5 font-mono text-[10px] text-[var(--muted)]">
            S{sku}
          </span>
        ) : chunk.placement === "completed" ? (
          <IconCheck className="mt-0.5 h-3 w-3 shrink-0 text-[var(--muted)]" />
        ) : null}
        <span className="min-w-0 flex-1 truncate pt-0.5 text-[12px] font-medium leading-tight">
          {chunk.title}
        </span>
        {chunk.assignee ? (
          <span
            title={chunk.assignee}
            className="mt-0.5 inline-flex h-5 w-5 items-center justify-center text-[var(--muted)]"
          >
            <IconUser className="h-3 w-3" />
          </span>
        ) : null}
        <button
          type="button"
          title="Edit chunk"
          aria-label="Edit chunk"
          className={iconBtn("h-5 w-5 shrink-0")}
          onClick={onEdit}
        >
          <IconPencil className="h-3 w-3" />
        </button>
      </div>
      {chunk.locked
        ? null
        : (["n", "s", "e", "w", "ne", "nw", "se", "sw"] as ResizeEdge[]).map((edge) => (
            <Handle key={edge} edge={edge} group="chunk" onPointerDown={(e) => onResize(e, edge)} />
          ))}
    </div>
  );
}

function Handle({
  edge,
  onPointerDown,
  group = "chunk",
}: {
  edge: ResizeEdge;
  onPointerDown: (e: PointerEvent) => void;
  group?: "chunk" | "stream";
}) {
  const pos: Record<ResizeEdge, string> = {
    n: "left-3 right-3 -top-px h-1.5 cursor-ns-resize",
    s: "left-3 right-3 -bottom-px h-1.5 cursor-ns-resize",
    e: "top-3 bottom-3 -right-px w-1.5 cursor-ew-resize",
    w: "top-3 bottom-3 -left-px w-1.5 cursor-ew-resize",
    ne: "-top-px -right-px h-2 w-2 cursor-nesw-resize",
    nw: "-top-px -left-px h-2 w-2 cursor-nwse-resize",
    se: "-bottom-px -right-px h-2 w-2 cursor-nwse-resize",
    sw: "-bottom-px -left-px h-2 w-2 cursor-nesw-resize",
  };
  const hover =
    group === "stream" ? "group-hover/stream:opacity-100" : "group-hover/chunk:opacity-100";
  return (
    <span
      className={`absolute z-20 opacity-0 transition-opacity ${hover} ${pos[edge]}`}
      onPointerDown={onPointerDown}
    >
      <span
        className="block h-full w-full rounded-sm"
        style={{ background: "color-mix(in srgb, var(--ink) 28%, transparent)" }}
      />
    </span>
  );
}

function overlayCard(children: ReactNode) {
  return (
    <div className="fixed inset-0 z-50 grid grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] overflow-hidden bg-black/35 p-3">
      <div
        role="dialog"
        aria-modal="true"
        className="sg-card flex max-h-full min-h-0 w-full max-w-lg flex-col justify-self-center self-center overflow-hidden rounded-lg"
        style={{ display: "flex" }}
      >
        {children}
      </div>
    </div>
  );
}

function ChunkDrawer({
  stream,
  chunk,
  sku,
  onClose,
  onLock,
  onComplete,
  onReopen,
  onDelete,
  onNotes,
  onAssignee,
}: {
  stream: RoadmapStream;
  chunk: RoadmapChunk;
  sku?: number;
  onClose: () => void;
  onLock: () => void;
  onComplete: () => void;
  onReopen: () => void;
  onDelete: () => void;
  onNotes: (notes: string) => void;
  onAssignee: (assignee: string) => void;
}) {
  const scopeLabel =
    chunk.scope === "stream"
      ? "Whole stream"
      : stream.regions.find((r) => r.id === chunk.scope)?.title ?? chunk.scope;
  const done = chunk.placement === "completed";
  const [notes, setNotes] = useState(chunk.notes ?? "");
  const [assignee, setAssignee] = useState(chunk.assignee ?? "");

  return overlayCard(
    <>
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[var(--border)] pb-2">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">
            {sku != null ? (
              <span className="mr-2 font-mono text-sm text-[var(--muted)]">S{sku}</span>
            ) : null}
            {chunk.title}
          </h2>
          <p className="text-sm text-[var(--muted)]">
            {stream.title} · {scopeLabel} · {chunk.placement.replace("_", " ")}
            {chunk.locked ? " · locked" : ""}
          </p>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-3">
        <p className="text-sm">{chunk.intent}</p>
        <label className="mt-3 block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Assigned to</span>
          <input
            className="sg-input w-full"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            placeholder="User id"
          />
        </label>
        <label className="mt-3 block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Notes (dummy)</span>
          <textarea
            className="sg-input min-h-28 w-full"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Bulk text for testing…"
          />
        </label>
        {done ? (
          <p className="mt-3 text-xs text-[var(--muted)]">
            Completed is dummy-manual for now. Later this row lines up with the
            leaf / hub / global changelog.
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-[var(--border)] pt-2">
        <button
          type="button"
          title={chunk.locked ? "Unlock this chunk" : "Lock this chunk"}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm"
          style={{
            borderColor: "color-mix(in srgb, #b45309 55%, var(--border))",
            background: "color-mix(in srgb, #b45309 16%, var(--surface))",
            color: "#9a3412",
          }}
          onClick={onLock}
        >
          <IconLock className="h-3.5 w-3.5" />
          {chunk.locked ? "Unlock" : "Lock"}
        </button>
        {done ? (
          <button
            type="button"
            title="Reopen this chunk"
            className="sg-btn-action"
            onClick={onReopen}
          >
            Reopen
          </button>
        ) : (
          <button
            type="button"
            title="Mark complete"
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm text-[var(--surface)]"
            style={{
              borderColor: "color-mix(in srgb, var(--rag-green) 55%, var(--border))",
              background: "var(--rag-green)",
            }}
            onClick={onComplete}
          >
            <IconCheck className="h-3.5 w-3.5" />
            Complete
          </button>
        )}
        <button
          type="button"
          title="Delete this chunk"
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm text-[var(--surface)]"
          style={{
            borderColor: "color-mix(in srgb, var(--rag-red) 55%, var(--border))",
            background: "var(--rag-red)",
          }}
          onClick={onDelete}
        >
          <IconTrash className="h-3.5 w-3.5" />
          Delete
        </button>
        <span className="ml-auto flex gap-2">
          <button
            type="button"
            title="Discard changes"
            className="sg-btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            title="Save notes and assignee"
            className="sg-btn-primary"
            onClick={() => {
              onNotes(notes);
              onAssignee(assignee);
              onClose();
            }}
          >
            Save
          </button>
        </span>
      </div>
    </>,
  );
}

function StreamEditor({
  stream,
  onClose,
  onSave,
}: {
  stream: RoadmapStream;
  onClose: () => void;
  onSave: (title: string) => void;
}) {
  const [title, setTitle] = useState(stream.title);
  return overlayCard(
    <>
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[var(--border)] pb-2">
        <h2 className="text-lg font-semibold">Edit stream</h2>
        <button type="button" title="Close" className="sg-btn-ghost" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-3">
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Name</span>
          <input
            className="sg-input w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <p className="mt-3 text-xs text-[var(--muted)]">
          Kind, regions, and ties come later.
        </p>
      </div>
      <div className="flex shrink-0 justify-end gap-2 border-t border-[var(--border)] pt-2">
        <button type="button" title="Discard name change" className="sg-btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          title="Save stream name"
          className="sg-btn-primary"
          onClick={() => onSave(title.trim() || stream.title)}
        >
          Save
        </button>
      </div>
    </>,
  );
}

const LEGEND_ROWS: {
  visual: ReactNode;
  name: string;
  blurb: string;
}[] = [
  {
    visual: (
      <span
        className="inline-block h-5 w-8 rounded-sm border"
        style={{
          borderColor: `color-mix(in srgb, ${STREAM_BLUE} 55%, var(--border))`,
          background: `color-mix(in srgb, ${STREAM_BLUE} 16%, var(--surface))`,
        }}
      />
    ),
    name: "Stream",
    blurb: "One webapp. Free on the overall canvas. Click it to work in it.",
  },
  {
    visual: (
      <span className="inline-block h-5 w-8 rounded-sm border border-[var(--border)] bg-[var(--surface)]" />
    ),
    name: "Chunk",
    blurb: "A feature box inside a section. Drag the grip; pencil opens details.",
  },
  {
    visual: <span className="font-mono text-[11px] text-[var(--muted)]">T1</span>,
    name: "Stream sequence",
    blurb: "T1, T2… from top-left, then right, then down. T1 paints above T2.",
  },
  {
    visual: <span className="font-mono text-[11px] text-[var(--muted)]">S1</span>,
    name: "Chunk sequence",
    blurb: "S1, S2… in that stream’s Sequential section only.",
  },
  {
    visual: (
      <span
        className="inline-block h-5 w-8 rounded-sm border"
        style={{
          border: "1px solid color-mix(in srgb, var(--ink) 12%, var(--border))",
          background: "color-mix(in srgb, var(--page) 82%, white)",
        }}
      />
    ),
    name: "WIP",
    blurb: "Work in progress. Light grey.",
  },
  {
    visual: (
      <span
        className="inline-block h-5 w-8 rounded-sm border"
        style={{
          border: "1px solid color-mix(in srgb, var(--ink) 42%, var(--border))",
          background: "color-mix(in srgb, var(--ink) 12%, var(--surface))",
        }}
      />
    ),
    name: "Sequential",
    blurb: "Ordered work. Darker official grey.",
  },
  {
    visual: (
      <span
        className="inline-block h-5 w-8 rounded-sm border"
        style={{
          border: `1px solid color-mix(in srgb, ${STREAM_BLUE} 55%, var(--border))`,
          background: `color-mix(in srgb, ${STREAM_BLUE} 8%, var(--surface))`,
        }}
      />
    ),
    name: "Future",
    blurb: "Not started yet. Blue-ish.",
  },
  {
    visual: (
      <span
        className="inline-block h-5 w-8 rounded-sm border"
        style={{
          border: "1px solid color-mix(in srgb, var(--rag-green) 70%, var(--border))",
          background: "color-mix(in srgb, var(--rag-green) 10%, var(--surface))",
        }}
      />
    ),
    name: "Completed",
    blurb: "Done (manual for now). Green, like lock is amber.",
  },
  {
    visual: (
      <span
        className="inline-flex h-5 w-8 items-center justify-center rounded-sm border"
        style={{
          borderColor: "color-mix(in srgb, #b45309 70%, var(--border))",
          background: "color-mix(in srgb, #b45309 8%, var(--surface))",
          color: "#9a3412",
        }}
      >
        <IconLock className="h-3 w-3" />
      </span>
    ),
    name: "Locked",
    blurb: "Amber. Cannot resize or shove. Double-click the lock to unlock.",
  },
  {
    visual: <IconGrip className="h-4 w-4" />,
    name: "Grip",
    blurb: "Drag a chunk. Double-click to lock.",
  },
  {
    visual: <IconArrowsIn className="h-4 w-4" />,
    name: "Collapse",
    blurb: "Snap the stream to 12×5 (header only). Resize larger to peek.",
  },
  {
    visual: <IconArrowsOut className="h-4 w-4" />,
    name: "Expand",
    blurb: "Open the stream and grow the frame to show its chunks.",
  },
  {
    visual: <IconFullscreen className="h-4 w-4" />,
    name: "Fullscreen",
    blurb: "This stream fills the page. Canvas place only matters with siblings.",
  },
  {
    visual: <IconAutofit className="h-4 w-4" />,
    name: "Autofit",
    blurb: "Pack chunks top-left, then right, then down. Also runs if you shrink a stream past its contents.",
  },
  {
    visual: <span className="font-mono text-[11px]">H V</span>,
    name: "Orientation",
    blurb: "Click anywhere to toggle. Streams pack one way; sections the other.",
  },
  {
    visual: <span className="text-[11px]">⇄</span>,
    name: "Reorganize",
    blurb: "Line streams up on the canvas. Does not shove them when you drag.",
  },
  {
    visual: <IconPencil className="h-4 w-4" />,
    name: "Edit",
    blurb: "Stream name, or chunk drawer (notes, assignee, lock, complete).",
  },
  {
    visual: <IconPlus className="h-4 w-4" />,
    name: "Add chunk",
    blurb: "WIP, Sequential, and Future only.",
  },
  {
    visual: <span className="text-[11px]">− 100% +</span>,
    name: "Zoom",
    blurb: "Scale the overall canvas. Fullscreen uses the page instead.",
  },
];

function LegendDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] overflow-hidden bg-black/35 p-3">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rm-legend-title"
        className="sg-card flex max-h-full min-h-0 w-full max-w-3xl flex-col justify-self-center self-center overflow-hidden rounded-lg"
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[var(--border)] pb-2">
          <div>
            <h2 id="rm-legend-title" className="text-lg font-semibold">
              Roadmap legend
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Icons, language, and what each control does.
            </p>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto py-2">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] text-[var(--muted)]">
                <th className="w-16 py-1 pr-2 font-medium">Example</th>
                <th className="py-1 pr-2 font-medium">Name</th>
                <th className="py-1 font-medium">What it does</th>
              </tr>
            </thead>
            <tbody>
              {LEGEND_ROWS.map((row) => (
                <tr key={row.name} className="border-t border-[var(--border)]">
                  <td className="py-2 pr-2 align-middle text-[var(--ink)]">{row.visual}</td>
                  <td className="py-2 pr-2 align-middle font-medium">{row.name}</td>
                  <td className="py-2 align-middle text-[var(--muted)]">{row.blurb}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex shrink-0 justify-end border-t border-[var(--border)] pt-2">
          <button type="button" title="Close legend" className="sg-btn-primary" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
