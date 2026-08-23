"use server";

import { auth, isMrtGuest } from "@/auth";
import {
  saveGuestMrtSandbox,
  saveSunwaterMrtStore,
} from "@/core/store/json-store";
import { revalidatePath } from "next/cache";
import { scheduleStoreSchema } from "./schema";

export async function saveSunwaterMrtStoreAction(payload: unknown) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not signed in");
  }

  const parsed = scheduleStoreSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid store" };
  }

  const next = {
    ...parsed.data,
    updatedAt: new Date().toISOString(),
  };

  if (isMrtGuest(session)) {
    const guestId = session.user.id;
    if (!guestId) return { ok: false as const, error: "Missing guest id" };
    await saveGuestMrtSandbox(guestId, next);
    return { ok: true as const };
  }

  await saveSunwaterMrtStore(next);
  revalidatePath("/w/sunwater-mrt");
  return { ok: true as const };
}
