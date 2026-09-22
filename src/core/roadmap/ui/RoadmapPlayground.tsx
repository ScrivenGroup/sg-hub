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
  DEFAULT_STREAM_COLS,
  MAX_STREAM_COLS,
  MIN_CHUNK_H,
  MIN_CHUNK_W,
  MIN_STREAM_COLS,
  STREAM_GAP_PX,
  applyBandChunks,
  bandOf,
  bandRows,
  canvasWidthPx,
  clampChunk,
  inBand,
  placementForBand,
  resizeChunk,
  resolveDown,
  streamCols,
  streamLeftPx,
  type BandId,
  type ResizeEdge,
  type RoadmapOrient,
} from "../layout";
import { IconGrip, IconPencil, IconPlus } from "../icons";

const ORIENT_KEY = "sg-roadmap-orient";

type Gesture =
  | {
      kind: "move-chunk";
      streamId: string;
      chunkId: string;
      startX: number;
      startY: number;
      origCol: number;
      origRow: number;
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
      origIndex: number;
    }
  | {
      kind: "resize-stream";
      streamId: string;
      startX: number;
      origCols: number;
    };

type BandOpen = Record<BandId, boolean>;

function cloneStreams(streams: RoadmapStream[]): RoadmapStream[] {
  return streams.map((s) => ({
    ...s,
    cols: streamCols(s),
    chunks: s.chunks.map((c) => ({ ...c })),
  }));
}

function defaultBands(): BandOpen {
  return { wip: true, seq: true, future: true };
}

function patchStream(
  streams: RoadmapStream[],
  streamId: string,
  fn: (s: RoadmapStream) => RoadmapStream,
): RoadmapStream[] {
  return streams.map((s) => (s.id === streamId ? fn(s) : s));
}

function iconBtn(className = "") {
  return `inline-flex h-6 w-6 items-center justify-center rounded text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] hover:text-[var(--ink)] ${className}`;
}

function readOrient(): RoadmapOrient {
  if (typeof window === "undefined") return "h";
  return window.localStorage.getItem(ORIENT_KEY) === "v" ? "v" : "h";
}

export function RoadmapPlayground({ initial }: { initial: RoadmapStream[] }) {
  const [streams, setStreams] = useState(() => cloneStreams(initial));
  const [openId, setOpenId] = useState<string | null>(null);
  const [editStreamId, setEditStreamId] = useState<string | null>(null);
  const [bands, setBands] = useState<Record<string, BandOpen>>({});
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [streamShift, setStreamShift] = useState({ x: 0, y: 0 });
  const [orient, setOrient] = useState<RoadmapOrient>("h");
  const streamsRef = useRef(streams);
  const orientRef = useRef(orient);
  streamsRef.current = streams;
  orientRef.current = orient;

  useEffect(() => {
    setOrient(readOrient());
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
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!gesture) return;

    function onMove(e: globalThis.PointerEvent) {
      const g = gesture;
      if (!g) return;
      const dx = e.clientX - g.startX;
      const dy = e.clientY - ("startY" in g ? g.startY : e.clientY);

      if (g.kind === "move-stream") {
        setStreamShift({ x: dx, y: dy });
        return;
      }

      if (g.kind === "resize-stream") {
        const cols = Math.max(
          MIN_STREAM_COLS,
          Math.min(MAX_STREAM_COLS, g.origCols + Math.round(dx / CELL)),
        );
        setStreams((prev) =>
          patchStream(prev, g.streamId, (s) => ({ ...s, cols })),
        );
        return;
      }

      const dCol = Math.round(dx / CELL);
      const dRow = Math.round(dy / CELL);

      if (g.kind === "move-chunk") {
        setStreams((prev) =>
          patchStream(prev, g.streamId, (s) => {
            const cols = streamCols(s);
            return {
              ...s,
              chunks: s.chunks.map((c) =>
                c.id !== g.chunkId
                  ? c
                  : clampChunk(
                      { ...c, col: g.origCol + dCol, row: Math.max(0, g.origRow + dRow) },
                      cols,
                    ),
              ),
            };
          }),
        );
        return;
      }

      setStreams((prev) =>
        patchStream(prev, g.streamId, (s) => {
          const cols = streamCols(s);
          return {
            ...s,
            chunks: s.chunks.map((c) =>
              c.id !== g.chunkId ? c : resizeChunk(g.orig, g.edge, dCol, dRow, cols),
            ),
          };
        }),
      );
    }

    function onUp(e: globalThis.PointerEvent) {
      const g = gesture;
      setGesture(null);
      setStreamShift({ x: 0, y: 0 });
      if (!g) return;

      if (g.kind === "move-stream") {
        const list = streamsRef.current;
        const from = list.findIndex((s) => s.id === g.streamId);
        if (from < 0) return;
        const axis = orientRef.current === "v" ? "y" : "x";
        const pos = axis === "x" ? e.clientX : e.clientY;
        let target = list.length - 1;
        for (let i = 0; i < list.length; i++) {
          const el = document.getElementById(`rm-stream-${list[i].id}`);
          if (!el) continue;
          const r = el.getBoundingClientRect();
          const mid = axis === "x" ? r.left + r.width / 2 : r.top + r.height / 2;
          if (pos < mid) {
            target = i;
            break;
          }
        }
        if (target !== from) {
          setStreams((prev) => {
            const next = [...prev];
            const [item] = next.splice(from, 1);
            next.splice(target, 0, item);
            return next;
          });
        }
        return;
      }

      if (g.kind === "move-chunk" || g.kind === "resize-chunk") {
        const bandEl = document
          .elementsFromPoint(e.clientX, e.clientY)
          .find((el) => el instanceof HTMLElement && el.dataset.rmBand);
        const band = (bandEl instanceof HTMLElement
          ? bandEl.dataset.rmBand
          : null) as BandId | null;
        settleChunk(g.streamId, g.chunkId, band);
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

  function settleChunk(streamId: string, chunkId: string, band: BandId | null) {
    setStreams((prev) =>
      patchStream(prev, streamId, (s) => {
        const cols = streamCols(s);
        const raw = s.chunks.find((c) => c.id === chunkId);
        if (!raw) return s;
        const dest = band ?? bandOf(raw.placement);
        const moved: RoadmapChunk = {
          ...clampChunk(raw, cols),
          placement: placementForBand(dest, raw.row),
          streamId,
        };
        const siblings = s.chunks
          .filter((c) => c.id !== chunkId && inBand(c, dest))
          .map((c) => ({ ...c }));
        const resolved = resolveDown([moved, ...siblings], chunkId, cols);
        return applyBandChunks(s, dest, resolved);
      }),
    );
  }

  function bandOpen(streamId: string, id: BandId) {
    return (bands[streamId] ?? defaultBands())[id];
  }

  function toggleBand(streamId: string, id: BandId) {
    setBands((prev) => {
      const cur = prev[streamId] ?? defaultBands();
      return { ...prev, [streamId]: { ...cur, [id]: !cur[id] } };
    });
  }

  function addStream() {
    const n = streams.length + 1;
    setStreams((prev) => [
      ...prev,
      {
        id: `stream-${Date.now()}`,
        title: `Stream ${n}`,
        shapeKind: "tools",
        cols: DEFAULT_STREAM_COLS,
        regions: [],
        chunks: [],
      },
    ]);
  }

  function addChunk(streamId: string, band: BandId) {
    const id = `chunk-${Date.now()}`;
    setStreams((prev) =>
      patchStream(prev, streamId, (s) => {
        const next: RoadmapChunk = {
          id,
          streamId,
          title: "New chunk",
          intent: "Dummy — edit later.",
          scope: "stream",
          placement: placementForBand(band, 0),
          col: 0,
          row: 0,
          w: MIN_CHUNK_W,
          h: MIN_CHUNK_H,
        };
        const inDest = s.chunks.filter((c) => inBand(c, band));
        return applyBandChunks(
          s,
          band,
          resolveDown([next, ...inDest], id, streamCols(s)),
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

  function moveStream(from: number, to: number) {
    if (from === to || to < 0 || to >= streams.length) return;
    setStreams((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
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

  function setOrientation(next: RoadmapOrient) {
    setOrient(next);
    window.localStorage.setItem(ORIENT_KEY, next);
  }

  const canvasW =
    orient === "h"
      ? canvasWidthPx(streams)
      : Math.max(...streams.map((s) => streamCols(s) * CELL), DEFAULT_STREAM_COLS * CELL) +
        STREAM_GAP_PX * 2;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <PriorityStrip
        streams={streams}
        orient={orient}
        onOrient={setOrientation}
        onReorder={moveStream}
        onAddStream={addStream}
        onFocus={(id) => {
          document.getElementById(`rm-stream-${id}`)?.scrollIntoView({
            inline: "center",
            block: "nearest",
            behavior: "smooth",
          });
        }}
      />

      <div
        className="min-h-0 flex-1 overflow-auto"
        style={{
          backgroundColor: "color-mix(in srgb, var(--page) 88%, var(--ink) 5%)",
          backgroundImage:
            "radial-gradient(color-mix(in srgb, var(--ink) 12%, transparent) 0.8px, transparent 0.8px)",
          backgroundSize: `${CELL}px ${CELL}px`,
        }}
      >
        <div
          className={orient === "h" ? "relative min-h-full py-3" : "flex flex-col py-3"}
          style={{
            width: canvasW,
            minHeight: "100%",
            gap: orient === "v" ? STREAM_GAP_PX : undefined,
            paddingLeft: orient === "v" ? STREAM_GAP_PX : undefined,
          }}
        >
          {streams.map((stream, index) => (
            <StreamColumn
              key={stream.id}
              stream={stream}
              orient={orient}
              left={orient === "h" ? streamLeftPx(streams, index) : 0}
              shift={
                gesture?.kind === "move-stream" && gesture.streamId === stream.id
                  ? streamShift
                  : { x: 0, y: 0 }
              }
              wipOpen={bandOpen(stream.id, "wip")}
              seqOpen={bandOpen(stream.id, "seq")}
              futureOpen={bandOpen(stream.id, "future")}
              onToggle={toggleBand}
              onAddChunk={addChunk}
              onEdit={() => setEditStreamId(stream.id)}
              onGrabStream={(e) =>
                start(e, {
                  kind: "move-stream",
                  streamId: stream.id,
                  startX: e.clientX,
                  startY: e.clientY,
                  origIndex: index,
                })
              }
              onResizeStream={(e) =>
                start(e, {
                  kind: "resize-stream",
                  streamId: stream.id,
                  startX: e.clientX,
                  origCols: streamCols(stream),
                })
              }
              onGrabChunk={(e, chunk) =>
                start(e, {
                  kind: "move-chunk",
                  streamId: stream.id,
                  chunkId: chunk.id,
                  startX: e.clientX,
                  startY: e.clientY,
                  origCol: chunk.col,
                  origRow: chunk.row,
                })
              }
              onResizeChunk={(e, chunk, edge) =>
                start(e, {
                  kind: "resize-chunk",
                  streamId: stream.id,
                  chunkId: chunk.id,
                  edge,
                  startX: e.clientX,
                  startY: e.clientY,
                  orig: { ...chunk },
                })
              }
              onEditChunk={setOpenId}
            />
          ))}
        </div>
      </div>

      {open ? (
        <ChunkDrawer
          stream={open.stream}
          chunk={open.chunk}
          onClose={() => setOpenId(null)}
          onDelete={() => deleteChunk(open.stream.id, open.chunk.id)}
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
    </div>
  );
}

function PriorityStrip({
  streams,
  orient,
  onOrient,
  onReorder,
  onAddStream,
  onFocus,
}: {
  streams: RoadmapStream[];
  orient: RoadmapOrient;
  onOrient: (next: RoadmapOrient) => void;
  onReorder: (from: number, to: number) => void;
  onAddStream: () => void;
  onFocus: (id: string) => void;
}) {
  const dragFrom = useRef<number | null>(null);

  return (
    <div className="shrink-0 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-[var(--muted)]">
          Stream priority — {orient === "h" ? "left first" : "top first"}
        </p>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-[var(--border)] p-0.5">
            <button
              type="button"
              className={`rounded px-2 py-0.5 text-[11px] ${
                orient === "h"
                  ? "bg-[var(--page)] font-medium text-[var(--ink)]"
                  : "text-[var(--muted)]"
              }`}
              onClick={() => onOrient("h")}
            >
              Horizontal
            </button>
            <button
              type="button"
              className={`rounded px-2 py-0.5 text-[11px] ${
                orient === "v"
                  ? "bg-[var(--page)] font-medium text-[var(--ink)]"
                  : "text-[var(--muted)]"
              }`}
              onClick={() => onOrient("v")}
            >
              Vertical
            </button>
          </div>
          <button type="button" className="sg-btn-secondary" onClick={onAddStream}>
            New stream
          </button>
        </div>
      </div>
      <ol className="flex min-h-8 flex-wrap items-center gap-2">
        {streams.map((stream, i) => (
          <li key={stream.id}>
            <button
              type="button"
              draggable
              onDragStart={() => {
                dragFrom.current = i;
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragFrom.current == null) return;
                onReorder(dragFrom.current, i);
                dragFrom.current = null;
              }}
              onClick={() => onFocus(stream.id)}
              className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--page)] px-3 py-1 text-xs font-medium"
            >
              <span className="text-[10px] text-[var(--muted)]">{i + 1}</span>
              {stream.title}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function StreamColumn({
  stream,
  orient,
  left,
  shift,
  wipOpen,
  seqOpen,
  futureOpen,
  onToggle,
  onAddChunk,
  onEdit,
  onGrabStream,
  onResizeStream,
  onGrabChunk,
  onResizeChunk,
  onEditChunk,
}: {
  stream: RoadmapStream;
  orient: RoadmapOrient;
  left: number;
  shift: { x: number; y: number };
  wipOpen: boolean;
  seqOpen: boolean;
  futureOpen: boolean;
  onToggle: (streamId: string, id: BandId) => void;
  onAddChunk: (streamId: string, band: BandId) => void;
  onEdit: () => void;
  onGrabStream: (e: PointerEvent) => void;
  onResizeStream: (e: PointerEvent) => void;
  onGrabChunk: (e: PointerEvent, chunk: RoadmapChunk) => void;
  onResizeChunk: (e: PointerEvent, chunk: RoadmapChunk, edge: ResizeEdge) => void;
  onEditChunk: (id: string) => void;
}) {
  const cols = streamCols(stream);
  const width = cols * CELL;
  const wip = stream.chunks.filter((c) => inBand(c, "wip"));
  const sequenced = stream.chunks.filter((c) => inBand(c, "seq"));
  const future = stream.chunks.filter((c) => inBand(c, "future"));

  return (
    <section
      id={`rm-stream-${stream.id}`}
      className={
        orient === "h"
          ? "absolute top-3 bottom-3 flex flex-col overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)]"
          : "relative flex flex-col overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)]"
      }
      style={{
        left: orient === "h" ? left + shift.x : shift.x,
        width,
        transform: orient === "v" && shift.y ? `translateY(${shift.y}px)` : undefined,
      }}
    >
      <header className="flex shrink-0 items-center gap-1 border-b border-[var(--border)] px-2 py-1">
        <button
          type="button"
          aria-label="Move stream"
          className={`${iconBtn()} cursor-grab`}
          onPointerDown={onGrabStream}
        >
          <IconGrip className="h-3.5 w-3.5" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">{stream.title}</h2>
          <p className="truncate text-[11px] text-[var(--muted)]">
            {stream.shapeKind}
            {stream.regions.length
              ? ` · ${stream.regions.map((r) => r.title).join(" · ")}`
              : ""}
          </p>
        </div>
        <button type="button" aria-label="Edit stream" className={iconBtn()} onClick={onEdit}>
          <IconPencil className="h-3.5 w-3.5" />
        </button>
      </header>

      <Band
        streamId={stream.id}
        band="wip"
        label="WIP"
        open={wipOpen}
        chunks={wip}
        onToggle={() => onToggle(stream.id, "wip")}
        onAdd={() => onAddChunk(stream.id, "wip")}
        onGrabChunk={onGrabChunk}
        onResizeChunk={onResizeChunk}
        onEditChunk={onEditChunk}
      />
      <Band
        streamId={stream.id}
        band="seq"
        label="Sequential"
        open={seqOpen}
        chunks={sequenced}
        onToggle={() => onToggle(stream.id, "seq")}
        onAdd={() => onAddChunk(stream.id, "seq")}
        onGrabChunk={onGrabChunk}
        onResizeChunk={onResizeChunk}
        onEditChunk={onEditChunk}
      />
      <Band
        streamId={stream.id}
        band="future"
        label="Future"
        open={futureOpen}
        chunks={future}
        onToggle={() => onToggle(stream.id, "future")}
        onAdd={() => onAddChunk(stream.id, "future")}
        onGrabChunk={onGrabChunk}
        onResizeChunk={onResizeChunk}
        onEditChunk={onEditChunk}
      />

      <div
        role="separator"
        aria-label="Resize stream"
        className="absolute top-6 right-0 bottom-2 w-1.5 cursor-ew-resize"
        onPointerDown={onResizeStream}
      />
    </section>
  );
}

function Band({
  streamId,
  band,
  label,
  open,
  chunks,
  onToggle,
  onAdd,
  onGrabChunk,
  onResizeChunk,
  onEditChunk,
}: {
  streamId: string;
  band: BandId;
  label: string;
  open: boolean;
  chunks: RoadmapChunk[];
  onToggle: () => void;
  onAdd: () => void;
  onGrabChunk: (e: PointerEvent, chunk: RoadmapChunk) => void;
  onResizeChunk: (e: PointerEvent, chunk: RoadmapChunk, edge: ResizeEdge) => void;
  onEditChunk: (id: string) => void;
}) {
  const rows = bandRows(chunks);
  const height = rows * CELL + BAND_PAD * 2;

  return (
    <div className="shrink-0">
      <div className="flex shrink-0 items-center pr-1">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center justify-between px-3 py-1 text-left text-[11px] text-[var(--muted)]"
        >
          <span>
            <span className="mr-1">{open ? "▾" : "▸"}</span>
            {label}
          </span>
          <span>{chunks.length}</span>
        </button>
        <button
          type="button"
          aria-label={`Add chunk to ${label}`}
          className={iconBtn()}
          onClick={onAdd}
        >
          <IconPlus className="h-3.5 w-3.5" />
        </button>
      </div>
      {open ? (
        <div
          data-rm-stream={streamId}
          data-rm-band={band}
          className="relative mx-2 mb-2 rounded"
          style={{
            height,
            backgroundColor: "color-mix(in srgb, var(--page) 70%, white)",
          }}
        >
          {chunks.map((chunk) => (
            <GridBox
              key={chunk.id}
              chunk={chunk}
              onGrab={(e) => onGrabChunk(e, chunk)}
              onResize={(e, edge) => onResizeChunk(e, chunk, edge)}
              onEdit={() => onEditChunk(chunk.id)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function GridBox({
  chunk,
  onGrab,
  onResize,
  onEdit,
}: {
  chunk: RoadmapChunk;
  onGrab: (e: PointerEvent) => void;
  onResize: (e: PointerEvent, edge: ResizeEdge) => void;
  onEdit: () => void;
}) {
  return (
    <div
      className="absolute box-border rounded border border-[var(--border)] bg-[var(--surface)] select-none"
      style={{
        left: chunk.col * CELL + 2,
        top: chunk.row * CELL + 2,
        width: Math.max(MIN_CHUNK_W, chunk.w) * CELL - 4,
        height: Math.max(MIN_CHUNK_H, chunk.h) * CELL - 4,
      }}
    >
      <div className="flex h-full items-start gap-0.5 px-1 py-0.5">
        <button
          type="button"
          aria-label="Move chunk"
          className={`${iconBtn("h-5 w-5 shrink-0 cursor-grab")} mt-0`}
          onPointerDown={onGrab}
        >
          <IconGrip className="h-3 w-3" />
        </button>
        <span className="min-w-0 flex-1 truncate pt-0.5 text-[12px] font-medium leading-tight">
          {chunk.title}
        </span>
        <button
          type="button"
          aria-label="Edit chunk"
          className={iconBtn("h-5 w-5 shrink-0")}
          onClick={onEdit}
        >
          <IconPencil className="h-3 w-3" />
        </button>
      </div>
      {(["n", "s", "e", "w", "ne", "nw", "se", "sw"] as ResizeEdge[]).map((edge) => (
        <Handle key={edge} edge={edge} onPointerDown={(e) => onResize(e, edge)} />
      ))}
    </div>
  );
}

function Handle({
  edge,
  onPointerDown,
}: {
  edge: ResizeEdge;
  onPointerDown: (e: PointerEvent) => void;
}) {
  const pos: Record<ResizeEdge, string> = {
    n: "left-2 right-2 top-0 h-1 cursor-ns-resize",
    s: "left-2 right-2 bottom-0 h-1 cursor-ns-resize",
    e: "top-2 bottom-2 right-0 w-1 cursor-ew-resize",
    w: "top-2 bottom-2 left-0 w-1 cursor-ew-resize",
    ne: "top-0 right-0 h-1.5 w-1.5 cursor-nesw-resize",
    nw: "top-0 left-0 h-1.5 w-1.5 cursor-nwse-resize",
    se: "bottom-0 right-0 h-1.5 w-1.5 cursor-nwse-resize",
    sw: "bottom-0 left-0 h-1.5 w-1.5 cursor-nesw-resize",
  };
  return (
    <span
      className={`absolute rounded-sm ${pos[edge]}`}
      style={{ background: "color-mix(in srgb, var(--ink) 16%, transparent)" }}
      onPointerDown={onPointerDown}
    />
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
  onClose,
  onDelete,
}: {
  stream: RoadmapStream;
  chunk: RoadmapChunk;
  onClose: () => void;
  onDelete: () => void;
}) {
  const scopeLabel =
    chunk.scope === "stream"
      ? "Whole stream"
      : stream.regions.find((r) => r.id === chunk.scope)?.title ?? chunk.scope;

  return overlayCard(
    <>
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[var(--border)] pb-2">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{chunk.title}</h2>
          <p className="text-sm text-[var(--muted)]">
            {stream.title} · {scopeLabel} · {chunk.placement.replace("_", " ")}
          </p>
        </div>
        <button type="button" className="sg-btn-ghost" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-3">
        <p className="text-sm">{chunk.intent}</p>
      </div>
      <div className="flex shrink-0 justify-end gap-2 border-t border-[var(--border)] pt-2">
        <button type="button" className="sg-btn-secondary" onClick={onDelete}>
          Delete
        </button>
        <button type="button" className="sg-btn-primary" onClick={onClose}>
          Close
        </button>
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
        <button type="button" className="sg-btn-ghost" onClick={onClose}>
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
        <button type="button" className="sg-btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="sg-btn-primary"
          onClick={() => onSave(title.trim() || stream.title)}
        >
          Save
        </button>
      </div>
    </>,
  );
}
