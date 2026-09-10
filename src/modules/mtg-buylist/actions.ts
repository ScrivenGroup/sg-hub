"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth, isMrtGuest } from "@/auth";
import {
  getMtgBuylistStore,
  saveMateHarvestToken,
  saveMtgBuylistStore,
} from "@/core/store/json-store";
import { listMateVariants, manaBoxRowKey, withAllocateResults } from "./logic/allocate";
import { buildMateBookmarklet, buildMateHarvestScript } from "./logic/bookmarklet";
import { parseManaBoxCsv, uniqueScryfallIds, uniqueSetCodes } from "./logic/parse-csv";
import { parseMateJson, filterMateOffersForCsv } from "./logic/parse-mate";
import { harvestPlaymantis, scryfallIdsNeedingPlaymantisFetch } from "./logic/playmantis";
import { buildMateImageLinks } from "./logic/mate-image-join";
import { enrichRowsFromScryfall, lookupScryfallCardIds, lookupScryfallSetCodes, type CardHint, type CardLookup } from "./logic/scryfall";
import { runParserSelfCheck } from "./logic/self-check";
import {
  emptyMtgBuylistStore,
  MTG_BUYLIST_HREF,
  priceSourceSchema,
  type MtgBuylistStore,
  type PriceSource,
} from "./schema";

/** After Mate harvest: exact image-hash joins for bare-name ambiguities. */
export async function attachMateImageLinks(store: MtgBuylistStore): Promise<MtgBuylistStore> {
  if (!store.csv?.rows.length || !store.mate?.offers.length) {
    return withAllocateResults(store);
  }
  try {
    const links = await buildMateImageLinks(store.csv.rows, store.mate.offers);
    return withAllocateResults({ ...store, mateImageLinks: links });
  } catch {
    return withAllocateResults(store);
  }
}

const PLAYMANTIS_BATCH_IDS = 8;
const PLAYMANTIS_RETRY_BATCH_IDS = 4;

export type StaffIdentity = { userKey: string; label: string };

export type BuylistActionSummary = {
  ok: true;
  store: MtgBuylistStore;
  summary: {
    csvRows: number;
    pmOffers: number;
    mateOffers: number;
    hasPm: boolean;
    hasMate: boolean;
    hasCompare: boolean;
  };
};

function summaryOf(store: MtgBuylistStore) {
  return {
    csvRows: store.csv?.rows.length ?? 0,
    pmOffers: store.playmantis?.offers.length ?? 0,
    mateOffers: store.mate?.offers.length ?? 0,
    hasPm: Boolean(store.resultPm),
    hasMate: Boolean(store.resultMate),
    hasCompare: Boolean(store.resultCompare),
  };
}

export async function requireBuylistStaff(): Promise<StaffIdentity | null> {
  const session = await auth();
  if (!session?.user || isMrtGuest(session)) return null;
  const email = session.user.email?.trim().toLowerCase() || "";
  const id = session.user.id || "";
  const userKey = (email || id).replace(/[^a-zA-Z0-9._@-]/g, "_").slice(0, 80);
  if (!userKey) return null;
  return { userKey, label: session.user.email || session.user.name || userKey };
}

async function loadStore(): Promise<{ staff: StaffIdentity; store: MtgBuylistStore } | null> {
  const staff = await requireBuylistStaff();
  if (!staff) return null;
  return { staff, store: await getMtgBuylistStore(staff.userKey) };
}

async function persist(userKey: string, store: MtgBuylistStore) {
  const next = withAllocateResults(store);
  await saveMtgBuylistStore(userKey, next);
  revalidatePath(MTG_BUYLIST_HREF);
  revalidatePath(`${MTG_BUYLIST_HREF}/development`);
  return next;
}

/** Harvest mid-slices: write offers only. Allocate + revalidate on the last slice. */
async function persistPlaymantisOffers(userKey: string, store: MtgBuylistStore) {
  await saveMtgBuylistStore(userKey, store);
  return store;
}

/**
 * Re-fetch Scryfall frame_effects for the CSV already in this run.
 * Keeps Mate/Playmantis harvests. Drops Mate confirmations that treatment can
 * now auto-resolve (unlike a full CSV re-upload, which clears Playmantis).
 */
export async function enrichCsvTreatmentsAction() {
  const loaded = await loadStore();
  if (!loaded) return { ok: false as const, error: "Staff sign-in required" };
  if (!loaded.store.csv) return { ok: false as const, error: "Upload a ManaBox CSV first" };
  try {
    const before = loaded.store.csv.rows.filter((r) => (r.frameEffects || []).length > 0).length;
    const rows = await enrichRowsFromScryfall(loaded.store.csv.rows);
    const withEffects = rows.filter((r) => (r.frameEffects || []).length > 0).length;
    if (withEffects === 0 && before === 0) {
      return {
        ok: false as const,
        error:
          "Scryfall returned no treatments (check network / User-Agent). Mate Confirm still works.",
      };
    }
    const mateOffers = loaded.store.mate?.offers || [];
    const nextConfirm = { ...(loaded.store.mateConfirmations || {}) };
    let prunedConfirms = 0;
    for (const row of rows) {
      const key = manaBoxRowKey(row);
      if (!nextConfirm[key]) continue;
      // Unique after treatment preference → no Confirm UI needed.
      if (listMateVariants(row, mateOffers).length === 1) {
        delete nextConfirm[key];
        prunedConfirms += 1;
      }
    }
    const store = await persist(loaded.staff.userKey, {
      ...loaded.store,
      csv: { ...loaded.store.csv, rows },
      mateConfirmations: nextConfirm,
    });
    return {
      ok: true as const,
      store,
      summary: summaryOf(store),
      withEffects,
      total: rows.length,
      prunedConfirms,
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Scryfall enrich failed",
    };
  }
}

export async function uploadCsvAction(
  csvText: string,
  filename: string,
  priceSource: PriceSource,
  priceCurrency: string,
) {
  const loaded = await loadStore();
  if (!loaded) return { ok: false as const, error: "Staff sign-in required" };
  const sourceParsed = priceSourceSchema.safeParse(priceSource);
  if (!sourceParsed.success) {
    return { ok: false as const, error: "Choose a ManaBox price source (CK / TCGPlayer / Scryfall / Other)" };
  }
  const currency = priceCurrency.trim().toUpperCase();
  if (!currency) {
    return { ok: false as const, error: "Set the listed-price currency for this CSV" };
  }
  try {
    const parsed = parseManaBoxCsv(csvText);
    if (!parsed.length) return { ok: false as const, error: "No card rows in that CSV" };
    let rows = parsed;
    try {
      rows = await enrichRowsFromScryfall(parsed);
    } catch {
      // Offline / Scryfall down — still accept the CSV; Mate confirm stays available.
      rows = parsed;
    }
    const store = await persist(loaded.staff.userKey, {
      ...loaded.store,
      csv: {
        filename,
        uploadedAt: new Date().toISOString(),
        rows,
        priceSource: sourceParsed.data,
        priceCurrency: currency,
      },
      playmantis: null,
      mateConfirmations: {},
    });
    return { ok: true as const, store, summary: summaryOf(store) };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "CSV parse failed" };
  }
}

export async function harvestPlaymantisAction(
  skipIds: string[] = [],
  opts?: { missingOnly?: boolean },
) {
  const loaded = await loadStore();
  if (!loaded) return { ok: false as const, error: "Staff sign-in required" };
  if (!loaded.store.csv) return { ok: false as const, error: "Upload a ManaBox CSV first" };

  const missingOnly = Boolean(opts?.missingOnly);
  const ids = uniqueScryfallIds(loaded.store.csv.rows);
  const namesById: Record<string, string> = {};
  const setNamesById: Record<string, string> = {};
  const setCodesById: Record<string, string> = {};
  for (const row of loaded.store.csv.rows) {
    const id = row.scryfallId.trim().toLowerCase();
    if (id && !namesById[id]) {
      namesById[id] = row.name;
      setNamesById[id] = row.setName || "";
      setCodesById[id] = row.setCode || "";
    }
  }
  const existing = loaded.store.playmantis?.offers || [];
  const work = scryfallIdsNeedingPlaymantisFetch({
    ids,
    namesById,
    existing,
    skipIds,
    missingOnly,
  });
  const slice = work.slice(0, missingOnly ? PLAYMANTIS_RETRY_BATCH_IDS : PLAYMANTIS_BATCH_IDS);
  if (!slice.length) {
    const store = withAllocateResults(loaded.store);
    return {
      ok: true as const,
      store,
      summary: summaryOf(store),
      done: ids.length,
      total: ids.length,
      remaining: 0,
      fetchedIds: [] as string[],
    };
  }

  try {
    const sliceSet = new Set(slice.map((id) => id.trim().toLowerCase()));
    const fresh = await harvestPlaymantis({
      scryfallIds: slice,
      namesById,
      setNamesById,
      setCodesById,
      existing: existing.filter((o) => sliceSet.has(o.scryfallId.trim().toLowerCase())),
    });
    const offers = [
      ...existing.filter((o) => !sliceSet.has(o.scryfallId.trim().toLowerCase())),
      ...fresh,
    ];
    const nextStore = {
      ...loaded.store,
      playmantis: {
        fetchedAt: new Date().toISOString(),
        offers,
      },
    };
    const remaining = Math.max(0, work.length - slice.length);
    const store =
      remaining === 0
        ? await persist(loaded.staff.userKey, nextStore)
        : await persistPlaymantisOffers(loaded.staff.userKey, nextStore);
    const attempted = new Set([
      ...skipIds.map((id) => id.trim().toLowerCase()),
      ...slice,
    ]);
    const still = scryfallIdsNeedingPlaymantisFetch({
      ids,
      namesById,
      existing: offers,
      skipIds: [...attempted],
      missingOnly,
    }).length;
    return {
      ok: true as const,
      store,
      summary: summaryOf(store),
      done: ids.length - still,
      total: ids.length,
      remaining: still,
      fetchedIds: slice,
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Playmantis harvest failed",
    };
  }
}

export async function createMateHarvestAction(clientOrigin?: string) {
  const loaded = await loadStore();
  if (!loaded) return { ok: false as const, error: "Staff sign-in required" };
  if (!loaded.store.csv) return { ok: false as const, error: "Upload a ManaBox CSV first" };

  const setCodes = uniqueSetCodes(loaded.store.csv.rows);
  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  await saveMateHarvestToken(token, {
    userKey: loaded.staff.userKey,
    setCodes,
    expiresAt,
  });

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") || headerList.get("host") || "";
  const proto = headerList.get("x-forwarded-proto") || "http";
  const fromRequest = host ? `${proto}://${host}` : "";
  const hubOrigin = pickHubOrigin(clientOrigin, fromRequest, process.env.AUTH_URL);
  if (!hubOrigin) {
    return { ok: false as const, error: "Cannot resolve hub origin for the harvest script" };
  }

  const script = buildMateHarvestScript({ hubOrigin, token, setCodes });
  return {
    ok: true as const,
    token,
    expiresAt,
    setCodes,
    hubOrigin,
    ingestUrl: `${hubOrigin}/api/mtg-buylist/mate-ingest`,
    script,
    bookmarklet: buildMateBookmarklet({ hubOrigin, token, setCodes }),
  };
}

function pickHubOrigin(
  clientOrigin: string | undefined,
  fromRequest: string,
  authUrl: string | undefined,
): string {
  const client = (clientOrigin || "").replace(/\/$/, "");
  const req = (fromRequest || "").replace(/\/$/, "");
  const auth = (authUrl || "").replace(/\/$/, "");
  if (client && (client.includes("localhost") || client.includes("127.0.0.1") || client === req)) {
    return client;
  }
  return req || client || auth;
}

/** Prefer /api/mtg-buylist/mate-upload for large files. Kept for small fixtures. */
export async function uploadMateJsonAction(jsonText: string) {
  const loaded = await loadStore();
  if (!loaded) return { ok: false as const, error: "Staff sign-in required" };
  try {
    const parsed = parseMateJson(jsonText);
    const csvSets = loaded.store.csv ? uniqueSetCodes(loaded.store.csv.rows) : [];
    const offers = filterMateOffersForCsv(parsed.offers, csvSets);
    if (loaded.store.csv && csvSets.length && !offers.length) {
      return {
        ok: false as const,
        error: `Mate harvest had ${parsed.offers.length} cards but none in your CSV sets.`,
      };
    }
    const keptSets = [...new Set(offers.map((o) => o.setCode).filter(Boolean))].sort();
    const linked = await attachMateImageLinks({
      ...loaded.store,
      mate: {
        harvestedAt: new Date().toISOString(),
        source: "upload",
        sets: keptSets.length ? keptSets : parsed.sets,
        offers,
      },
    });
    const store = await persist(loaded.staff.userKey, linked);
    return { ok: true as const, store, summary: summaryOf(store) };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Mate JSON parse failed",
    };
  }
}

/** Re-run Mate↔Scryfall image joins on the current harvest (keeps confirmations). */
export async function refreshMateImageLinksAction() {
  const loaded = await loadStore();
  if (!loaded) return { ok: false as const, error: "Staff sign-in required" };
  if (!loaded.store.mate || !loaded.store.csv) {
    return { ok: false as const, error: "Need CSV and Mate harvest first" };
  }
  const linked = await attachMateImageLinks(loaded.store);
  const store = await persist(loaded.staff.userKey, linked);
  const linkedCount = Object.keys(store.mateImageLinks || {}).length;
  return {
    ok: true as const,
    store,
    summary: summaryOf(store),
    linkedCount,
  };
}

export async function saveBuylistNotesAction(notes: string) {
  const loaded = await loadStore();
  if (!loaded) return { ok: false as const, error: "Staff sign-in required" };
  const store = await persist(loaded.staff.userKey, { ...loaded.store, notes });
  return { ok: true as const, store, summary: summaryOf(store) };
}

export async function clearBuylistRunAction() {
  const loaded = await loadStore();
  if (!loaded) return { ok: false as const, error: "Staff sign-in required" };
  const store = await persist(loaded.staff.userKey, {
    ...emptyMtgBuylistStore(),
    notes: loaded.store.notes,
  });
  return { ok: true as const, store, summary: summaryOf(store) };
}

/** Confirm (or clear) which Mate printing matches an ambiguous CSV stack. */
export async function confirmMateVariantAction(rowKey: string, mateUuid: string | null) {
  const loaded = await loadStore();
  if (!loaded) return { ok: false as const, error: "Staff sign-in required" };
  const key = rowKey.trim();
  if (!key) return { ok: false as const, error: "Missing card key" };
  const next = { ...(loaded.store.mateConfirmations || {}) };
  const reconfirm = { ...(loaded.store.mateReconfirm || {}) };
  const uuid = (mateUuid || "").trim();
  if (uuid) {
    next[key] = uuid;
    delete reconfirm[key];
  } else {
    delete next[key];
  }
  const store = await persist(loaded.staff.userKey, {
    ...loaded.store,
    mateConfirmations: next,
    mateReconfirm: reconfirm,
  });
  return { ok: true as const, store, summary: summaryOf(store) };
}

/** Reject current Mate printing — reopen all variants for Confirm override. */
export async function rejectMateVariantAction(rowKey: string) {
  const loaded = await loadStore();
  if (!loaded) return { ok: false as const, error: "Staff sign-in required" };
  const key = rowKey.trim();
  if (!key) return { ok: false as const, error: "Missing card key" };
  const nextConfirm = { ...(loaded.store.mateConfirmations || {}) };
  delete nextConfirm[key];
  const store = await persist(loaded.staff.userKey, {
    ...loaded.store,
    mateConfirmations: nextConfirm,
    mateReconfirm: { ...(loaded.store.mateReconfirm || {}), [key]: true },
  });
  return { ok: true as const, store, summary: summaryOf(store) };
}

export async function parserSelfCheckAction() {
  const staff = await requireBuylistStaff();
  if (!staff) return { ok: false as const, error: "Staff sign-in required" };
  return runParserSelfCheck();
}

/** Set name → code for PM receipts that have no set code. Unique names only. */
export async function lookupSetCodesAction(names: string[]) {
  const staff = await requireBuylistStaff();
  if (!staff) return { ok: false as const, error: "Staff sign-in required", codes: {} as Record<string, string> };
  try {
    const codes = await lookupScryfallSetCodes(names);
    return { ok: true as const, codes };
  } catch {
    return { ok: true as const, codes: {} as Record<string, string> };
  }
}

/** Name + set → Scryfall id for Step 5 hover previews when the CSV has no id. */
export async function lookupCardIdsAction(lookups: CardLookup[]) {
  const staff = await requireBuylistStaff();
  if (!staff) return { ok: false as const, error: "Staff sign-in required", ids: {} as Record<string, CardHint> };
  try {
    const ids = await lookupScryfallCardIds(lookups);
    return { ok: true as const, ids };
  } catch {
    return { ok: true as const, ids: {} as Record<string, CardHint> };
  }
}
