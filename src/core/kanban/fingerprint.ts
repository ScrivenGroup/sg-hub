import type {
  KanbanBoard,
  KanbanFingerprint,
  KanbanInboxNote,
  KanbanLiveBaseline,
  KanbanTicket,
} from "./schema";

/** 0 green, 1–9 amber, 10+ red. */
export const DELTA_AMBER_MAX = 9;
export const DELTA_RED_MIN = 10;

export type LivePresence = "on-live" | "on-live-diff" | "local-only" | "unknown";

export type KanbanDelta = {
  hasBaseline: boolean;
  baselineRevision: number | null;
  capturedAt: string | null;
  ticketsAdded: number;
  ticketsRemoved: number;
  ticketsMoved: number;
  ticketsEdited: number;
  ideasAdded: number;
  ideasArchived: number;
  ideasEdited: number;
  total: number;
  rag: "green" | "amber" | "red";
};

function fnv1a(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function contentHash(title: string, body: string): string {
  return fnv1a(`${title}\n${body}`);
}

export function fingerprintIdea(idea: KanbanInboxNote): KanbanFingerprint {
  return {
    kind: "idea",
    status: idea.status,
    hash: contentHash(idea.title, idea.body),
  };
}

export function fingerprintTicket(ticket: KanbanTicket): KanbanFingerprint {
  return {
    kind: "ticket",
    column: ticket.column,
    lane: ticket.lane,
    hash: contentHash(ticket.title, ticket.body),
  };
}

export function baselineFromBoard(board: {
  revision: number;
  ideas: KanbanInboxNote[];
  tickets: KanbanTicket[];
}): KanbanLiveBaseline {
  const items: Record<string, KanbanFingerprint> = {};
  for (const idea of board.ideas) items[idea.id] = fingerprintIdea(idea);
  for (const ticket of board.tickets) items[ticket.id] = fingerprintTicket(ticket);
  return {
    capturedAt: new Date().toISOString(),
    revision: board.revision,
    items,
  };
}

export function ragForTotal(total: number): KanbanDelta["rag"] {
  if (total <= 0) return "green";
  if (total <= DELTA_AMBER_MAX) return "amber";
  return "red";
}

export function deltaVsBaseline(board: KanbanBoard): KanbanDelta {
  const baseline = board.liveBaseline;
  if (!baseline) {
    return {
      hasBaseline: false,
      baselineRevision: null,
      capturedAt: null,
      ticketsAdded: 0,
      ticketsRemoved: 0,
      ticketsMoved: 0,
      ticketsEdited: 0,
      ideasAdded: 0,
      ideasArchived: 0,
      ideasEdited: 0,
      total: 0,
      rag: "green",
    };
  }

  const baseTickets = Object.entries(baseline.items).filter(([, fp]) => fp.kind === "ticket");
  const baseIdeas = Object.entries(baseline.items).filter(([, fp]) => fp.kind === "idea");
  const localTicketIds = new Set(board.tickets.map((t) => t.id));
  const localIdeaIds = new Set(board.ideas.map((i) => i.id));

  let ticketsAdded = 0;
  let ticketsRemoved = 0;
  let ticketsMoved = 0;
  let ticketsEdited = 0;
  let ideasAdded = 0;
  let ideasArchived = 0;
  let ideasEdited = 0;

  for (const ticket of board.tickets) {
    const prev = baseline.items[ticket.id];
    if (!prev || prev.kind !== "ticket") {
      ticketsAdded += 1;
      continue;
    }
    if (prev.column !== ticket.column || prev.lane !== ticket.lane) ticketsMoved += 1;
    if (prev.hash !== contentHash(ticket.title, ticket.body)) ticketsEdited += 1;
  }
  for (const [id] of baseTickets) {
    if (!localTicketIds.has(id)) ticketsRemoved += 1;
  }

  for (const idea of board.ideas) {
    const prev = baseline.items[idea.id];
    if (!prev || prev.kind !== "idea") {
      ideasAdded += 1;
      continue;
    }
    if (prev.status !== "archived" && idea.status === "archived") ideasArchived += 1;
    if (prev.hash !== contentHash(idea.title, idea.body)) ideasEdited += 1;
  }
  for (const [id, prev] of baseIdeas) {
    if (!localIdeaIds.has(id) && prev.status !== "archived") ideasArchived += 1;
  }

  const total =
    ticketsAdded +
    ticketsRemoved +
    ticketsMoved +
    ticketsEdited +
    ideasAdded +
    ideasArchived +
    ideasEdited;

  return {
    hasBaseline: true,
    baselineRevision: baseline.revision,
    capturedAt: baseline.capturedAt,
    ticketsAdded,
    ticketsRemoved,
    ticketsMoved,
    ticketsEdited,
    ideasAdded,
    ideasArchived,
    ideasEdited,
    total,
    rag: ragForTotal(total),
  };
}

export function livePresenceForId(
  board: KanbanBoard,
  id: string,
  kind: "ticket" | "idea",
  current: KanbanFingerprint,
): LivePresence {
  if (!board.liveBaseline) return "unknown";
  const prev = board.liveBaseline.items[id];
  if (!prev || prev.kind !== kind) return "local-only";
  const samePlace =
    kind === "ticket"
      ? prev.column === current.column && prev.lane === current.lane
      : prev.status === current.status;
  const sameHash = prev.hash === current.hash;
  if (samePlace && sameHash) return "on-live";
  return "on-live-diff";
}

export function formatDeltaSummary(delta: KanbanDelta): string {
  if (!delta.hasBaseline) return "No live baseline yet — delta unknown.";
  const bits: string[] = [];
  if (delta.ticketsAdded) bits.push(`+${delta.ticketsAdded} tickets`);
  if (delta.ticketsRemoved) bits.push(`−${delta.ticketsRemoved} tickets`);
  if (delta.ticketsMoved) bits.push(`${delta.ticketsMoved} moved`);
  if (delta.ticketsEdited) bits.push(`${delta.ticketsEdited} edited`);
  if (delta.ideasAdded) bits.push(`+${delta.ideasAdded} inbox`);
  if (delta.ideasArchived) bits.push(`${delta.ideasArchived} inbox archived`);
  if (delta.ideasEdited) bits.push(`${delta.ideasEdited} inbox edited`);
  const detail = bits.length ? bits.join(", ") : "in sync";
  return `${delta.total} change${delta.total === 1 ? "" : "s"} since live snapshot (rev ${delta.baselineRevision}) — ${detail}`;
}
