import { NextResponse } from "next/server";
import {
  consumeMateHarvestToken,
  getMtgBuylistStore,
  saveMtgBuylistStore,
} from "@/core/store/json-store";
import { attachMateImageLinks } from "@/modules/mtg-buylist/actions";
import { mateCorsHeaders } from "@/modules/mtg-buylist/logic/bookmarklet";
import { parseMatePayload } from "@/modules/mtg-buylist/logic/parse-mate";
import { MTG_BUYLIST_HREF } from "@/modules/mtg-buylist/schema";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const maxDuration = 120;

function cors(origin: string | null, status = 200, body?: unknown) {
  return NextResponse.json(body ?? { ok: true }, {
    status,
    headers: mateCorsHeaders(origin),
  });
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: mateCorsHeaders(request.headers.get("origin")),
  });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const token =
    request.headers.get("x-harvest-token") ||
    new URL(request.url).searchParams.get("token") ||
    "";
  if (!token) return cors(origin, 401, { ok: false, error: "Missing harvest token" });

  const record = await consumeMateHarvestToken(token);
  if (!record) return cors(origin, 401, { ok: false, error: "Unknown or expired harvest token" });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return cors(origin, 400, { ok: false, error: "Body must be JSON" });
  }

  try {
    const parsed = parseMatePayload(raw);
    const store = await getMtgBuylistStore(record.userKey, record.runId);
    const next = await attachMateImageLinks({
      ...store,
      mate: {
        harvestedAt: new Date().toISOString(),
        source: "bookmarklet" as const,
        sets: parsed.sets,
        offers: parsed.offers,
      },
    });
    await saveMtgBuylistStore(record.userKey, next, record.runId);
    revalidatePath(MTG_BUYLIST_HREF);
    revalidatePath(`${MTG_BUYLIST_HREF}/development`);
    return cors(origin, 200, {
      ok: true,
      sets: parsed.sets.length,
      offers: parsed.offers.length,
      hasCompare: Boolean(next.resultCompare),
    });
  } catch (error) {
    return cors(origin, 400, {
      ok: false,
      error: error instanceof Error ? error.message : "Mate ingest failed",
    });
  }
}
