"use server";

import { revalidatePath } from "next/cache";
import { auth, isMrtGuest } from "@/auth";
import {
  getKanbanBoard,
  getKanbanIdeaById,
  listKanbanIdeas,
  saveKanbanBoard,
  saveKanbanLeafNotes,
  upsertChangelogEntries,
  upsertKanbanIdea,
} from "@/core/store/json-store";
import { isKanbanLeafId } from "./leaves";
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

function revalidateKanban(revalidateHref: string) {
  revalidatePath(revalidateHref);
  revalidatePath("/i/kanban");
}

function safeTagNodeId(raw: string | undefined, fallback: string): string {
  const tag = (raw || fallback).trim() || fallback;
  return isKanbanLeafId(tag) ? tag : fallback;
}

async function persist(board: KanbanBoard, revalidateHref: string) {
  await saveKanbanBoard(board);
  revalidateKanban(revalidateHref);
  return board;
}

export async function addInboxNoteAction(
  nodeId: string,
  revalidateHref: string,
  input: { title: string; body: string; tagNodeId?: string },
) {
  const staff = await requireStaff();
  if (!staff) return { ok: false as const, error: "Staff sign-in required" };
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title && !body) return { ok: false as const, error: "Title or body required" };
  const tagNodeId = safeTagNodeId(input.tagNodeId, nodeId);
  const now = new Date().toISOString();
  const allIdeas = await listKanbanIdeas();
  const note: KanbanInboxNote = {
    id: nextInboxId(allIdeas),
    nodeId: tagNodeId,
    title: title || "Untitled idea",
    body,
    status: "open",
    createdAt: now,
    updatedAt: now,
    copiedAt: null,
  };
  await upsertKanbanIdea(note);
  revalidateKanban(revalidateHref);
  const board = await getKanbanBoard(tagNodeId);
  return { ok: true as const, board, ideaId: note.id, nodeId: tagNodeId };
}

export async function saveInboxNoteAction(
  nodeId: string,
  revalidateHref: string,
  input: { id: string; title: string; body: string; tagNodeId?: string },
) {
  const staff = await requireStaff();
  if (!staff) return { ok: false as const, error: "Staff sign-in required" };
  const existing = await getKanbanIdeaById(input.id);
  if (!existing) return { ok: false as const, error: "Raw note not found" };
  const now = new Date().toISOString();
  const tagNodeId = safeTagNodeId(input.tagNodeId ?? existing.nodeId, existing.nodeId);
  const next: KanbanInboxNote = {
    ...existing,
    title: input.title.trim() || existing.title,
    body: input.body,
    nodeId: tagNodeId,
    updatedAt: now,
  };
  await upsertKanbanIdea(next);
  revalidateKanban(revalidateHref);
  const board = await getKanbanBoard(nodeId);
  return { ok: true as const, board };
}

export async function markIdeaCopiedAction(
  nodeId: string,
  revalidateHref: string,
  ideaId: string,
) {
  const staff = await requireStaff();
  if (!staff) return { ok: false as const, error: "Staff sign-in required" };
  const existing = await getKanbanIdeaById(ideaId);
  if (!existing) return { ok: false as const, error: "Raw note not found" };
  const now = new Date().toISOString();
  await upsertKanbanIdea({ ...existing, copiedAt: now, updatedAt: now });
  revalidateKanban(revalidateHref);
  const board = await getKanbanBoard(nodeId);
  return { ok: true as const, board };
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
    revalidateKanban(revalidateHref);
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

export async function saveKanbanLeafNotesAction(
  nodeId: string,
  revalidateHref: string,
  body: string,
) {
  const staff = await requireStaff();
  if (!staff) return { ok: false as const, error: "Staff sign-in required" };
  await saveKanbanLeafNotes(nodeId, body);
  revalidateKanban(revalidateHref);
  return { ok: true as const };
}
