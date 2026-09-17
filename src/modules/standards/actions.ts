"use server";

import { auth } from "@/auth";
import { addStandardsDrop } from "@/core/store/json-store";
import {
  STANDARDS_DROP_KINDS,
  STANDARDS_HREF,
  type StandardsDropKind,
} from "@/modules/standards/schema";
import { revalidatePath } from "next/cache";

export async function addStandardsDropAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not signed in");
  }
  if (session.user.role === "mrt-guest") {
    return { ok: false as const, error: "View sessions cannot drop on Standards" };
  }

  const body = String(formData.get("body") || "").trim();
  const source = String(formData.get("source") || "").trim();
  const kindRaw = String(formData.get("kind") || "note");
  const kind: StandardsDropKind = STANDARDS_DROP_KINDS.includes(
    kindRaw as StandardsDropKind,
  )
    ? (kindRaw as StandardsDropKind)
    : "note";

  if (!body) {
    return { ok: false as const, error: "Write what you found or decided." };
  }

  await addStandardsDrop({
    kind,
    body,
    source: source || undefined,
    submittedBy: session.user.email || session.user.name || "staff",
  });

  revalidatePath(STANDARDS_HREF);
  return { ok: true as const };
}
