"use server";

import { auth } from "@/auth";
import {
  addStandardsHold,
  removeStandardsHold,
  setStandardsChoice,
} from "@/core/store/json-store";
import { questionFor } from "@/modules/standards/catalog";
import {
  STANDARDS_HOLD_KINDS,
  STANDARDS_HREF,
  type StandardsHoldKind,
} from "@/modules/standards/schema";
import { revalidatePath } from "next/cache";

export async function setStandardsChoiceAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not signed in");
  }
  if (session.user.role === "mrt-guest") {
    return { ok: false as const, error: "View sessions cannot change Standards" };
  }

  const entryId = String(formData.get("entryId") || "").trim();
  const optionId = String(formData.get("optionId") || "").trim();
  const question = questionFor(entryId);
  const option = question?.options.find((o) => o.id === optionId);
  if (!question || !option) {
    return { ok: false as const, error: "Unknown choice." };
  }

  await setStandardsChoice(entryId, optionId);
  revalidatePath(STANDARDS_HREF);
  return { ok: true as const };
}

export async function addStandardsHoldAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not signed in");
  }
  if (session.user.role === "mrt-guest") {
    return { ok: false as const, error: "View sessions cannot hold notes on Standards" };
  }

  const body = String(formData.get("body") || "").trim();
  const source = String(formData.get("source") || "").trim();
  const kindRaw = String(formData.get("kind") || "note");
  const kind: StandardsHoldKind = STANDARDS_HOLD_KINDS.includes(
    kindRaw as StandardsHoldKind,
  )
    ? (kindRaw as StandardsHoldKind)
    : "note";

  if (!body) {
    return { ok: false as const, error: "Write what to file later." };
  }

  await addStandardsHold({
    kind,
    body,
    source: source || undefined,
    submittedBy: session.user.email || session.user.name || "staff",
  });
  revalidatePath(STANDARDS_HREF);
  return { ok: true as const };
}

export async function fileStandardsHoldAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not signed in");
  }
  if (session.user.role === "mrt-guest") {
    return { ok: false as const, error: "View sessions cannot file Standards holds" };
  }

  const id = String(formData.get("id") || "").trim();
  if (!id) return { ok: false as const, error: "Missing hold." };

  await removeStandardsHold(id);
  revalidatePath(STANDARDS_HREF);
  return { ok: true as const };
}
