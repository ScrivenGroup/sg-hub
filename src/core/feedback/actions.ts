"use server";

import { auth } from "@/auth";
import { addFeedback, listKanbanIdeas, upsertKanbanIdea } from "@/core/store/json-store";
import type { FeedbackKind } from "@/core/contracts/types";
import { revalidatePath } from "next/cache";
import {
  defaultKanbanNodeIdFromHref,
  isKanbanLeafId,
} from "@/core/kanban/leaves";
import { nextInboxId, type KanbanInboxNote } from "@/core/kanban/schema";

export async function submitFeedbackAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not signed in");
  }
  if (session.user.role === "mrt-guest") {
    return { ok: false as const, error: "View sessions cannot send feedback" };
  }

  const message = String(formData.get("message") || "").trim();
  const kind = String(formData.get("kind") || "other") as FeedbackKind;
  const pageHref = String(formData.get("pageHref") || "/");
  const pageTitle = String(formData.get("pageTitle") || "");

  if (!message) {
    return { ok: false as const, error: "Message required" };
  }

  const allowed: FeedbackKind[] = ["bug", "idea", "housekeeping", "other"];
  const safeKind = allowed.includes(kind) ? kind : "other";

  await addFeedback({
    kind: safeKind,
    pageHref,
    pageTitle,
    message,
    submittedBy:
      session.user.name || session.user.email || "unknown",
  });

  if (safeKind === "idea") {
    const fallback = defaultKanbanNodeIdFromHref(pageHref);
    const rawTag = String(formData.get("tagNodeId") || fallback).trim();
    const tagNodeId = isKanbanLeafId(rawTag) ? rawTag : fallback;
    const now = new Date().toISOString();
    const allIdeas = await listKanbanIdeas();
    const firstLine = message.split(/\r?\n/)[0]?.trim() || pageTitle || "Feedback idea";
    const note: KanbanInboxNote = {
      id: nextInboxId(allIdeas),
      nodeId: tagNodeId,
      title: firstLine.slice(0, 120),
      body: message,
      status: "open",
      createdAt: now,
      updatedAt: now,
      copiedAt: null,
    };
    await upsertKanbanIdea(note);
    revalidatePath("/i/kanban");
  }

  revalidatePath("/i/feedback");
  return { ok: true as const };
}
