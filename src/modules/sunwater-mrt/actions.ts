"use server";

import { auth } from "@/auth";
import { saveSunwaterMrtStore } from "@/core/store/json-store";
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

  await saveSunwaterMrtStore({
    ...parsed.data,
    updatedAt: new Date().toISOString(),
  });
  revalidatePath("/w/sunwater-mrt");
  return { ok: true as const };
}
