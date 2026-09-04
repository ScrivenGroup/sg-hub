"use server";

import { revalidatePath } from "next/cache";
import { auth, isMrtGuest } from "@/auth";
import {
  getKanbanBoard,
  saveKanbanBoard,
  upsertChangelogEntries,
} from "@/core/store/json-store";
import {
  applySessionPack,
  fragmentsToChangelog,
  parseBoardOrBaselineText,
  parseSessionPackText,
} from "./pack";
import { baselineFromBoard } from "./fingerprint";
import {
  nextInboxId,
  prependEvent,
  type KanbanBoard,
  type KanbanInboxNote,
} from "./schema";

async function requireStaff(): Promise<{ label: string } | null> {
  const session = await auth();
  if (!session?.user || isMrtGuest(session)) return null;
  return {
    label: session.user.email || session.user.name || "staff",
  };
}

async function persist(board: KanbanBoard, revalidateHref: string) {
  await saveKanbanBoard(board);
  revalidatePath(revalidateHref);
  return board;
}

export async function addInboxNoteAction(
  nodeId: string,
  revalidateHref: string,
  input: { title: string; body: string },
) {
  const staff = await requireStaff();
  if (!staff) return { ok: false as const, error: "Staff sign-in required" };
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title && !body) return { ok: false as const, error: "Title or body required" };
  const now = new Date().toISOString();
  const board = await getKanbanBoard(nodeId);
  const note: KanbanInboxNote = {
    id: nextInboxId(board.ideas),
    title: title || "Untitled idea",
    body,
    status: "open",
    createdAt: now,
    updatedAt: now,
    copiedAt: null,
  };
  const next: KanbanBoard = {
    ...board,
    ideas: [note, ...board.ideas],
    revision: board.revision + 1,
    updatedAt: now,
    events: prependEvent(board.events, {
      at: now,
      kind: "inbox",
      summary: `Added raw ${note.id}`,
    }),
  };
  await persist(next, revalidateHref);
  return { ok: true as const, board: next, ideaId: note.id };
}

export async function saveInboxNoteAction(
  nodeId: string,
  revalidateHref: string,
  input: { id: string; title: string; body: string },
) {
  const staff = await requireStaff();
  if (!staff) return { ok: false as const, error: "Staff sign-in required" };
  const board = await getKanbanBoard(nodeId);
  const idx = board.ideas.findIndex((i) => i.id === input.id);
  if (idx < 0) return { ok: false as const, error: "Raw note not found" };
  const now = new Date().toISOString();
  const ideas = board.ideas.slice();
  ideas[idx] = {
    ...ideas[idx],
    title: input.title.trim() || ideas[idx].title,
    body: input.body,
    updatedAt: now,
  };
  const next: KanbanBoard = {
    ...board,
    ideas,
    revision: board.revision + 1,
    updatedAt: now,
    events: prependEvent(board.events, {
      at: now,
      kind: "inbox",
      summary: `Edited raw ${input.id}`,
    }),
  };
  await persist(next, revalidateHref);
  return { ok: true as const, board: next };
}

export async function markIdeaCopiedAction(
  nodeId: string,
  revalidateHref: string,
  ideaId: string,
) {
  const staff = await requireStaff();
  if (!staff) return { ok: false as const, error: "Staff sign-in required" };
  const board = await getKanbanBoard(nodeId);
  const idx = board.ideas.findIndex((i) => i.id === ideaId);
  if (idx < 0) return { ok: false as const, error: "Raw note not found" };
  const now = new Date().toISOString();
  const ideas = board.ideas.slice();
  ideas[idx] = { ...ideas[idx], copiedAt: now, updatedAt: now };
  const next: KanbanBoard = {
    ...board,
    ideas,
    updatedAt: now,
    events: prependEvent(board.events, {
      at: now,
      kind: "inbox",
      summary: `Copied session prompt for ${ideaId}`,
    }),
  };
  await persist(next, revalidateHref);
  return { ok: true as const, board: next };
}

export async function publishSnapshotPackAction(
  nodeId: string,
  revalidateHref: string,
  packText: string,
) {
  const staff = await requireStaff();
  if (!staff) return { ok: false as const, error: "Staff sign-in required" };
  let pack;
  try {
    pack = parseSessionPackText(packText);
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Invalid session pack JSON",
    };
  }
  if (pack.boardId !== nodeId) {
    return {
      ok: false as const,
      error: `Pack boardId ${pack.boardId} does not match this board (${nodeId})`,
    };
  }
  const board = await getKanbanBoard(nodeId);
  const applied = applySessionPack(board, pack);
  await persist(applied.board, revalidateHref);
  const fragments = fragmentsToChangelog(nodeId, pack.changelogFragments);
  if (fragments.length) {
    await upsertChangelogEntries(fragments);
    revalidatePath(revalidateHref);
  }
  return {
    ok: true as const,
    board: applied.board,
    warning: applied.warning,
    changelogCount: fragments.length,
  };
}

export async function setLiveBaselineAction(
  nodeId: string,
  revalidateHref: string,
  sourceText: string,
) {
  const staff = await requireStaff();
  if (!staff) return { ok: false as const, error: "Staff sign-in required" };
  let source;
  try {
    source = parseBoardOrBaselineText(sourceText);
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Invalid live baseline JSON",
    };
  }
  if (source.nodeId && source.nodeId !== nodeId) {
    return {
      ok: false as const,
      error: `Baseline nodeId ${source.nodeId} does not match this board (${nodeId})`,
    };
  }
  const board = await getKanbanBoard(nodeId);
  const now = new Date().toISOString();
  const next: KanbanBoard = {
    ...board,
    liveBaseline: baselineFromBoard(source),
    updatedAt: now,
    events: prependEvent(board.events, {
      at: now,
      kind: "baseline",
      summary: `Set live baseline from revision ${source.revision}`,
    }),
  };
  await persist(next, revalidateHref);
  return { ok: true as const, board: next };
}

export async function setLiveBaselineFromThisBoardAction(
  nodeId: string,
  revalidateHref: string,
) {
  const staff = await requireStaff();
  if (!staff) return { ok: false as const, error: "Staff sign-in required" };
  const board = await getKanbanBoard(nodeId);
  const now = new Date().toISOString();
  const next: KanbanBoard = {
    ...board,
    liveBaseline: baselineFromBoard(board),
    updatedAt: now,
    events: prependEvent(board.events, {
      at: now,
      kind: "baseline",
      summary: `Set live baseline from this board (rev ${board.revision})`,
    }),
  };
  await persist(next, revalidateHref);
  return { ok: true as const, board: next };
}
