import type { ChangelogEntry } from "@/core/contracts/types";
import {
  emptyKanbanBoard,
  kanbanBoardSchema,
  liveBaselineSourceSchema,
  migrateTicketColumn,
  prependEvent,
  sessionPackSchema,
  type KanbanBoard,
  type LiveBaselineSource,
  type SessionPack,
} from "./schema";
import { baselineFromBoard } from "./fingerprint";

export function parseSessionPack(raw: unknown): SessionPack {
  return sessionPackSchema.parse(raw);
}

export function parseSessionPackText(text: string): SessionPack {
  return parseSessionPack(JSON.parse(text) as unknown);
}

export function parseBoardOrBaselineText(text: string): LiveBaselineSource {
  const raw = JSON.parse(text) as unknown;
  if (raw && typeof raw === "object" && "nodeId" in raw && typeof (raw as { nodeId: unknown }).nodeId === "string") {
    const board = boardFromUnknown((raw as { nodeId: string }).nodeId, raw);
    return {
      nodeId: board.nodeId,
      revision: board.revision,
      ideas: board.ideas,
      tickets: board.tickets,
    };
  }
  return liveBaselineSourceSchema.parse(raw);
}

export function applySessionPack(
  board: KanbanBoard,
  pack: SessionPack,
): { board: KanbanBoard; warning?: string } {
  const now = new Date().toISOString();
  let warning: string | undefined;
  if (pack.revisionExpected != null && pack.revisionExpected !== board.revision) {
    warning = `Pack expected revision ${pack.revisionExpected}; this board is ${board.revision}. Merged by id — tickets not in the pack were kept.`;
  }

  const byId = new Map(board.tickets.map((t) => [t.id, t]));
  for (const incoming of pack.tickets) {
    const prev = byId.get(incoming.id);
    byId.set(incoming.id, {
      ...incoming,
      createdAt: prev?.createdAt || incoming.createdAt || now,
      updatedAt: now,
    });
  }

  const archive = new Set(pack.archiveIdeaIds);
  const ideas = board.ideas.map((idea) =>
    archive.has(idea.id)
      ? { ...idea, status: "archived" as const, updatedAt: now }
      : idea,
  );

  const next: KanbanBoard = {
    ...board,
    tickets: Array.from(byId.values()),
    ideas,
    revision: board.revision + 1,
    updatedAt: now,
    publishedAt: now,
    events: prependEvent(board.events, {
      at: now,
      kind: "pack",
      summary: `Published ${pack.tickets.length} ticket(s); archived ${pack.archiveIdeaIds.length} raw note(s).`,
    }),
  };

  return { board: next, warning };
}

export function fragmentsToChangelog(
  nodeId: string,
  fragments: SessionPack["changelogFragments"],
): ChangelogEntry[] {
  const now = new Date().toISOString();
  return (fragments || []).map((frag, i) => ({
    id: frag.id || `cl-pack-${Date.now().toString(36)}-${i}`,
    nodeId,
    title: frag.title,
    body: frag.body,
    kind: frag.kind,
    version: frag.version,
    createdAt: frag.createdAt || now,
  }));
}

export function exportBoardJson(board: KanbanBoard): string {
  return JSON.stringify(board, null, 2);
}

export function boardFromUnknown(nodeId: string, raw: unknown): KanbanBoard {
  const fallback = emptyKanbanBoard(nodeId);
  if (!raw || typeof raw !== "object") return fallback;
  const obj = { ...fallback, ...(raw as object), nodeId } as Record<string, unknown>;
  if (Array.isArray(obj.tickets)) {
    obj.tickets = obj.tickets.map((row) => {
      if (!row || typeof row !== "object") return row;
      const t = { ...(row as Record<string, unknown>) };
      t.column = migrateTicketColumn(t.column);
      if (typeof t.lane !== "string") t.lane = "behaviour";
      return t;
    });
  }
  const parsed = kanbanBoardSchema.safeParse(obj);
  return parsed.success ? parsed.data : fallback;
}

export { baselineFromBoard };
