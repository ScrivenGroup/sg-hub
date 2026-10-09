"use server";

import { auth } from "@/auth";
import { addDevChoice } from "@/core/store/json-store";
import type { DevChoiceStatus } from "@/core/contracts/types";
import { revalidatePath } from "next/cache";

export async function addDevChoiceAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not signed in");
  }
  if (session.user.role === "mrt-guest") {
    return { ok: false as const, error: "View sessions cannot add development choices" };
  }

  const layer = String(formData.get("layer") || "").trim();
  const decision = String(formData.get("decision") || "").trim();
  const whyRaw = String(formData.get("why") || "").trim();
  const statusRaw = String(formData.get("status") || "open");
  const status: DevChoiceStatus = statusRaw === "locked" ? "locked" : "open";

  if (!layer) {
    return { ok: false as const, error: "Layer required" };
  }
  if (!decision) {
    return { ok: false as const, error: "Decision required" };
  }

  await addDevChoice({
    layer,
    status,
    decision,
    why: whyRaw || undefined,
  });

  revalidatePath("/s/dev-choices");
  return { ok: true as const };
}
