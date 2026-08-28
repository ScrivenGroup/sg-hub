"use server";

import { auth, isMrtGuest, signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  getMrtGuestActivity,
  logMrtGuestActivity,
  resetGuestMrtSandbox,
  saveSunwaterMrtStore,
  type MrtGuestActivity,
} from "@/core/store/json-store";
import {
  createMrtShare,
  disableMrtShare,
  getMrtShareById,
  guestShareStillValid,
  listMrtSharesPublic,
  setMrtSharePassword,
  type MrtAudienceSharePublic,
} from "@/core/store/mrt-share";
import { revalidatePath } from "next/cache";
import { scheduleStoreSchema } from "./schema";

function staffSession() {
  return auth().then((session) => {
    if (!session?.user || isMrtGuest(session)) return null;
    return session;
  });
}

export async function saveSunwaterMrtStoreAction(payload: unknown) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not signed in");
  }

  if (isMrtGuest(session)) {
    return { ok: false as const, error: "Read only" };
  }

  const parsed = scheduleStoreSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid store" };
  }

  const next = {
    ...parsed.data,
    updatedAt: new Date().toISOString(),
  };

  await saveSunwaterMrtStore(next);
  revalidatePath("/w/sunwater-mrt");
  return { ok: true as const };
}

export async function resetMrtSandboxAction() {
  const session = await auth();
  if (!session?.user || !isMrtGuest(session)) {
    return { ok: false as const, error: "Not a guest session" };
  }
  const guestId = session.user.id;
  if (!guestId) return { ok: false as const, error: "Missing guest id" };
  const store = await resetGuestMrtSandbox(guestId);
  revalidatePath("/w/sunwater-mrt");
  return { ok: true as const, store };
}

export async function listMrtSharesAction(): Promise<MrtAudienceSharePublic[]> {
  if (!(await staffSession())) return [];
  return listMrtSharesPublic();
}

export async function listMrtGuestActivityAction(): Promise<MrtGuestActivity[]> {
  if (!(await staffSession())) return [];
  return getMrtGuestActivity();
}

export async function createMrtShareAction(input: {
  audience: string;
  password: string;
  durationHours: number;
}) {
  if (!(await staffSession())) {
    return { ok: false as const, error: "Staff only" };
  }
  const result = await createMrtShare(input);
  if (result.ok) revalidatePath("/w/sunwater-mrt");
  return result;
}

export async function disableMrtShareAction(id: string) {
  if (!(await staffSession())) {
    return { ok: false as const, error: "Staff only" };
  }
  const result = await disableMrtShare(id);
  if (result.ok) revalidatePath("/w/sunwater-mrt");
  return result;
}

export async function setMrtSharePasswordAction(input: {
  id: string;
  password: string;
  durationHours?: number;
}) {
  if (!(await staffSession())) {
    return { ok: false as const, error: "Staff only" };
  }
  const result = await setMrtSharePassword(input);
  if (result.ok) revalidatePath("/w/sunwater-mrt");
  return result;
}

export async function guestMrtSignInAction(formData: FormData) {
  const shareId = String(formData.get("s") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const password = String(formData.get("password") || "");
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";
  const row = shareId ? await getMrtShareById(shareId) : null;
  await logMrtGuestActivity({
    name: name || "unknown",
    ip,
    userAgent: h.get("user-agent") || "",
    action: row ? `share-login:${row.audience}` : "share-login",
    audience: row?.audience,
  });
  const fail = `/w/sunwater-mrt/guest${shareId ? `?s=${encodeURIComponent(shareId)}&error=1` : "?error=1"}`;
  try {
    await signIn("mrt-share", {
      name,
      password,
      shareId,
      ip,
      redirectTo: "/w/sunwater-mrt",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(fail);
    }
    throw error;
  }
}

export async function assertGuestShareOrSignOut() {
  const session = await auth();
  if (!isMrtGuest(session)) return;
  const ok = await guestShareStillValid(
    session?.user?.shareId,
    session?.user?.shareV,
  );
  if (ok) return;
  const s = session?.user?.shareId;
  await signOut({
    redirectTo: s
      ? `/w/sunwater-mrt/guest?s=${encodeURIComponent(s)}`
      : "/w/sunwater-mrt/guest",
  });
}
