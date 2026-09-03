import { NextResponse } from "next/server";
import {
  getMtgBuylistStore,
  saveMtgBuylistStore,
} from "@/core/store/json-store";
import { attachMateImageLinks, requireBuylistStaff } from "@/modules/mtg-buylist/actions";
import { parseMateJson } from "@/modules/mtg-buylist/logic/parse-mate";
import { MTG_BUYLIST_HREF } from "@/modules/mtg-buylist/schema";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Large Mate harvest JSON — avoids Server Action 1MB body limit. */
export async function POST(request: Request) {
  const staff = await requireBuylistStaff();
  if (!staff) {
    return NextResponse.json({ ok: false, error: "Staff sign-in required" }, { status: 401 });
  }

  let jsonText = "";
  const contentType = request.headers.get("content-type") || "";
  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (file instanceof File) {
        jsonText = await file.text();
      } else if (typeof file === "string") {
        jsonText = file;
      }
    } else {
      jsonText = await request.text();
    }
  } catch {
    return NextResponse.json({ ok: false, error: "Could not read upload body" }, { status: 400 });
  }

  if (!jsonText.trim()) {
    return NextResponse.json({ ok: false, error: "Empty Mate JSON body" }, { status: 400 });
  }

  try {
    const parsed = parseMateJson(jsonText);
    const store = await getMtgBuylistStore(staff.userKey);
    const next = await attachMateImageLinks({
      ...store,
      mate: {
        harvestedAt: new Date().toISOString(),
        source: "upload",
        sets: parsed.sets,
        offers: parsed.offers,
      },
    });
    await saveMtgBuylistStore(staff.userKey, next);
    revalidatePath(MTG_BUYLIST_HREF);
    revalidatePath(`${MTG_BUYLIST_HREF}/development`);
    return NextResponse.json({
      ok: true,
      summary: {
        sets: parsed.sets.length,
        offers: parsed.offers.length,
        hasMate: Boolean(next.resultMate),
        hasCompare: Boolean(next.resultCompare),
        mateCreditCents: next.resultMate?.totals.mateCreditCents ?? 0,
        mateCashCents: next.resultMate?.totals.mateCashCents ?? 0,
      },
      store: next,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Mate JSON parse failed",
      },
      { status: 400 },
    );
  }
}
