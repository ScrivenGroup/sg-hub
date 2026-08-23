"use server";

import { auth } from "@/auth";
import { addFeedback } from "@/core/store/json-store";
import type { FeedbackKind } from "@/core/contracts/types";
import { revalidatePath } from "next/cache";

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

  revalidatePath("/i/feedback");
  return { ok: true as const };
}
