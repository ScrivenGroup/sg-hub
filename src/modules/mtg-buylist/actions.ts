"use server";

import { randomBytes } from "crypto";
import { cache } from "react";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth, isMrtGuest } from "@/auth";
import {
  getMtgBuylistWorkspace,
  getPreconCatalog,
  getPreconHarvestBook,
  refreshMockPreconHarvest,
  savePreconDeck,
  saveMateHarvestToken,
  saveMtgBuylistStore,
  saveMtgBuylistNotes,
  clearMtgBuylistStore,
  idleMtgBuylistRun,
  savePlaymantisHarvestDiff,
  listPlaymantisHarvestDiff,
  listBuylistArchives,
  clearPlaymantisHarvestDiff,
  markPlaymantisHarvestDiffLookedAt,
  type BuylistWorkspacePack,
} from "@/core/store/json-store";
import type { BuylistArchive, BuylistRunMeta, PreconCatalog, PreconDeck, PreconHarvestBook, PreconSource } from "./schema";
import { listMateVariants, manaBoxRowKey, withAllocateResults } from "./logic/allocate";
import { buildMateBookmarklet, buildMateHarvestScript } from "./logic/bookmarklet";
import { parseManaBoxCsv, uniqueScryfallIds, uniqueSetCodes } from "./logic/parse-csv";
import { parseManaBoxTxt } from "./logic/parse-txt";
import { parseMateJson, filterMateOffersForCsv } from "./logic/parse-mate";
import { harvestPlaymantis, scryfallIdsNeedingPlaymantisFetch } from "./logic/playmantis";
import { harvestDiffRows, type ImportCompareRow } from "./logic/compare-import-review";
import { buildMateImageLinks } from "./logic/mate-image-join";
import { enrichRowsFromScryfall, lookupScryfallCardIds, lookupScryfallSetCodes, type CardHint, type CardLookup } from "./logic/scryfall";
import { runParserSelfCheck } from "./logic/self-check";
import {
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
  runs?: BuylistRunMeta[];
  activeRunId?: string;
  archives?: BuylistArchive[];
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

export const getBuylistSession = cache(async () => auth());

export const requireBuylistStaff = cache(async (): Promise<StaffIdentity | null> => {
  const session = await getBuylistSession();
  if (!session?.user || isMrtGuest(session)) return null;
  const email = session.user.email?.trim().toLowerCase() || "";
  const id = session.user.id || "";
  const userKey = (email || id).replace(/[^a-zA-Z0-9._@-]/g, "_").slice(0, 80);
  if (!userKey) return null;
  return { userKey, label: session.user.email || session.user.name || userKey };
});

async function loadStore(
  runId?: string | null,
): Promise<{ staff: StaffIdentity; pack: BuylistWorkspacePack; store: MtgBuylistStore } | null> {
  const staff = await requireBuylistStaff();
  if (!staff) return null;
  const pack = await getMtgBuylistWorkspace(staff.userKey, runId);
  return { staff, pack, store: pack.store };
}

function withPack(store: MtgBuylistStore, pack?: BuylistWorkspacePack) {
  return {
    store,
    runs: pack?.runs,
    activeRunId: pack?.activeRunId,
    archives: pack?.archives,
  };
}

async function persist(userKey: string, store: MtgBuylistStore, runId: string) {
  const next = withAllocateResults(store);
  const id = await saveMtgBuylistStore(userKey, next, runId);
  const pack = await getMtgBuylistWorkspace(userKey, id);
  revalidatePath(MTG_BUYLIST_HREF);
  revalidatePath(`${MTG_BUYLIST_HREF}/development`);
  return { ...pack, activeRunId: id };
}

/** Harvest mid-slices: write offers only. Allocate + revalidate on the last slice. */
async function persistPlaymantisOffers(userKey: string, store: MtgBuylistStore, runId: string) {
  const id = await saveMtgBuylistStore(userKey, store, runId);
  return getMtgBuylistWorkspace(userKey, id);
}

/**
 * Re-fetch Scryfall frame_effects for the CSV already in this run.
 * Keeps Mate/Playmantis harvests. Drops Mate confirmations that treatment can
 * now auto-resolve (unlike a full CSV re-upload, which clears Playmantis).
 */
export async function enrichCsvTreatmentsAction(runId?: string) {
  const loaded = await loadStore(runId);
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
    const pack = await persist(
      loaded.staff.userKey,
      {
        ...loaded.store,
        csv: { ...loaded.store.csv, rows },
        mateConfirmations: nextConfirm,
      },
      loaded.pack.activeRunId,
    );
    return {
      ok: true as const,
      ...withPack(pack.store, pack),
      summary: summaryOf(pack.store),
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
  runId?: string,
) {
  const loaded = await loadStore(runId);
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
    const pack = await persist(
      loaded.staff.userKey,
      {
        ...loaded.store,
        csv: {
          filename,
          uploadedAt: new Date().toISOString(),
          rows,
          priceSource: sourceParsed.data,
          priceCurrency: currency,
        },
        mateConfirmations: {},
        resultPm: null,
        resultMate: null,
        resultCompare: null,
      },
      (runId || "").trim() || loaded.pack.activeRunId,
    );
    return { ok: true as const, ...withPack(pack.store, pack), summary: summaryOf(pack.store) };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "CSV parse failed" };
  }
}

export async function harvestPlaymantisAction(
  skipIds: string[] = [],
  opts?: { missingOnly?: boolean; runId?: string },
) {
  const loaded = await loadStore(opts?.runId);
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
    const pack =
      remaining === 0
        ? await persist(loaded.staff.userKey, nextStore, loaded.pack.activeRunId)
        : await persistPlaymantisOffers(loaded.staff.userKey, nextStore, loaded.pack.activeRunId);
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
      ...withPack(pack.store, pack),
      summary: summaryOf(pack.store),
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

export async function createMateHarvestAction(clientOrigin?: string, runId?: string) {
  const loaded = await loadStore(runId);
  if (!loaded) return { ok: false as const, error: "Staff sign-in required" };
  if (!loaded.store.csv) return { ok: false as const, error: "Upload a ManaBox CSV first" };

  const setCodes = uniqueSetCodes(loaded.store.csv.rows);
  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  await saveMateHarvestToken(token, {
    userKey: loaded.staff.userKey,
    runId: loaded.pack.activeRunId,
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
export async function uploadMateJsonAction(jsonText: string, runId?: string) {
  const loaded = await loadStore(runId);
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
    const pack = await persist(
      loaded.staff.userKey,
      withAllocateResults({
        ...loaded.store,
        mate: {
          harvestedAt: new Date().toISOString(),
          source: "upload",
          sets: keptSets.length ? keptSets : parsed.sets,
          offers,
        },
        mateImageLinks: {},
      }),
      loaded.pack.activeRunId,
    );
    return { ok: true as const, ...withPack(pack.store, pack), summary: summaryOf(pack.store) };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Mate JSON parse failed",
    };
  }
}

/** Re-run Mate↔Scryfall image joins on the current harvest (keeps confirmations). */
export async function refreshMateImageLinksAction(runId?: string) {
  const loaded = await loadStore(runId);
  if (!loaded) return { ok: false as const, error: "Staff sign-in required" };
  if (!loaded.store.mate || !loaded.store.csv) {
    return { ok: false as const, error: "Need CSV and Mate harvest first" };
  }
  const linked = await attachMateImageLinks(loaded.store);
  const pack = await persist(loaded.staff.userKey, linked, loaded.pack.activeRunId);
  const linkedCount = Object.keys(pack.store.mateImageLinks || {}).length;
  return {
    ok: true as const,
    ...withPack(pack.store, pack),
    summary: summaryOf(pack.store),
    linkedCount,
  };
}

export async function saveBuylistNotesAction(notes: string) {
  const staff = await requireBuylistStaff();
  if (!staff) return { ok: false as const, error: "Staff sign-in required" };
  await saveMtgBuylistNotes(staff.userKey, notes);
  revalidatePath(`${MTG_BUYLIST_HREF}/development`);
  const pack = await getMtgBuylistWorkspace(staff.userKey);
  return { ok: true as const, ...withPack(pack.store, pack), summary: summaryOf(pack.store) };
}

export async function clearBuylistRunAction(runId?: string) {
  const staff = await requireBuylistStaff();
  if (!staff) return { ok: false as const, error: "Staff sign-in required" };
  const pack = await clearMtgBuylistStore(staff.userKey, runId);
  revalidatePath(MTG_BUYLIST_HREF);
  revalidatePath(`${MTG_BUYLIST_HREF}/development`);
  return { ok: true as const, ...withPack(pack.store, pack), summary: summaryOf(pack.store) };
}

export async function createBuylistRunAction() {
  const staff = await requireBuylistStaff();
  if (!staff) return { ok: false as const, error: "Staff sign-in required" };
  const pack = await idleMtgBuylistRun(staff.userKey);
  return { ok: true as const, ...withPack(pack.store, pack), summary: summaryOf(pack.store) };
}

export async function loadBuylistRunAction(runId?: string) {
  const staff = await requireBuylistStaff();
  if (!staff) return { ok: false as const, error: "Staff sign-in required" };
  const pack = await getMtgBuylistWorkspace(staff.userKey, runId || "");
  return { ok: true as const, ...withPack(pack.store, pack), summary: summaryOf(pack.store) };
}

export async function listBuylistArchivesAction() {
  const staff = await requireBuylistStaff();
  if (!staff) return { ok: false as const, error: "Staff sign-in required", archives: [] as BuylistArchive[] };
  const archives = await listBuylistArchives(staff.userKey);
  return { ok: true as const, archives };
}

/** Confirm (or clear) which Mate printing matches an ambiguous CSV stack. */
export async function confirmMateVariantAction(
  rowKey: string,
  mateUuid: string | null,
  runId?: string,
) {
  const loaded = await loadStore(runId);
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
  const pack = await persist(
    loaded.staff.userKey,
    {
      ...loaded.store,
      mateConfirmations: next,
      mateReconfirm: reconfirm,
    },
    loaded.pack.activeRunId,
  );
  return { ok: true as const, ...withPack(pack.store, pack), summary: summaryOf(pack.store) };
}

/** Reject current Mate printing — reopen all variants for Confirm override. */
export async function rejectMateVariantAction(rowKey: string, runId?: string) {
  const loaded = await loadStore(runId);
  if (!loaded) return { ok: false as const, error: "Staff sign-in required" };
  const key = rowKey.trim();
  if (!key) return { ok: false as const, error: "Missing card key" };
  const nextConfirm = { ...(loaded.store.mateConfirmations || {}) };
  delete nextConfirm[key];
  const pack = await persist(
    loaded.staff.userKey,
    {
      ...loaded.store,
      mateConfirmations: nextConfirm,
      mateReconfirm: { ...(loaded.store.mateReconfirm || {}), [key]: true },
    },
    loaded.pack.activeRunId,
  );
  return { ok: true as const, ...withPack(pack.store, pack), summary: summaryOf(pack.store) };
}

export async function parserSelfCheckAction() {
  const staff = await requireBuylistStaff();
  if (!staff) return { ok: false as const, error: "Staff sign-in required" };
  return runParserSelfCheck();
}

export async function savePlaymantisHarvestDiffAction(input: {
  csvFilename: string;
  reviewFilename: string;
  harvestedAt: string;
  rows: ImportCompareRow[];
}) {
  const staff = await requireBuylistStaff();
  if (!staff) return { ok: false as const, error: "Staff sign-in required" };
  const deltas = harvestDiffRows({
    rows: input.rows,
    agree: 0,
    disagree: input.rows.length,
  });
  if (!deltas.length) return { ok: true as const, saved: 0 };
  const createdAt = new Date().toISOString();
  const batchId = `phd-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
  const records = deltas.map((row, i) => ({
    id: `${batchId}-${i}`,
    batchId,
    createdAt,
    userKey: staff.userKey,
    csvFilename: input.csvFilename,
    reviewFilename: input.reviewFilename,
    harvestedAt: input.harvestedAt,
    name: row.name,
    setName: row.setName,
    finish: row.finish,
    scryfallId: row.scryfallId,
    csvQty: row.csvQty,
    reviewStatus: row.reviewStatus,
    harvestStatus: row.harvestStatus,
    reviewCreditCents: row.reviewCreditCents,
    harvestCreditCents: row.harvestCreditCents,
    harvestLimit: row.harvestLimit,
    verdict: row.verdict,
    note: row.note,
    lookedAt: "",
  }));
  const saved = await savePlaymantisHarvestDiff(records);
  return { ok: true as const, saved };
}

export async function listPlaymantisHarvestDiffAction() {
  const staff = await requireBuylistStaff();
  if (!staff) return { ok: false as const, error: "Staff sign-in required", rows: [] };
  const rows = await listPlaymantisHarvestDiff(staff.userKey);
  return { ok: true as const, rows };
}

export async function clearPlaymantisHarvestDiffAction() {
  const staff = await requireBuylistStaff();
  if (!staff) return { ok: false as const, error: "Staff sign-in required", cleared: 0 };
  const cleared = await clearPlaymantisHarvestDiff(staff.userKey);
  return { ok: true as const, cleared };
}

export async function markPlaymantisHarvestDiffLookedAtAction(ids: string[]) {
  const staff = await requireBuylistStaff();
  if (!staff) return { ok: false as const, error: "Staff sign-in required", marked: 0 };
  const marked = await markPlaymantisHarvestDiffLookedAt(ids);
  return { ok: true as const, marked };
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

function slugDeckId(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "deck";
}

function uniqueDeckId(name: string, existing: PreconDeck[]) {
  const base = slugDeckId(name);
  if (!existing.some((deck) => deck.id === base)) return base;
  return `${base}-${Date.now().toString(36)}`;
}

export async function loadPreconWorkspaceAction(): Promise<
  | { ok: true; catalog: PreconCatalog; harvest: PreconHarvestBook }
  | { ok: false; error: string }
> {
  const staff = await requireBuylistStaff();
  if (!staff) return { ok: false, error: "Staff sign-in required" };
  const [catalog, harvest] = await Promise.all([getPreconCatalog(), getPreconHarvestBook()]);
  return { ok: true, catalog, harvest };
}

export async function addPreconDeckAction(input: {
  name: string;
  sourceUrl?: string;
  filename: string;
  text: string;
}): Promise<
  | { ok: true; catalog: PreconCatalog; harvest: PreconHarvestBook; deckId: string }
  | { ok: false; error: string }
> {
  const staff = await requireBuylistStaff();
  if (!staff) return { ok: false, error: "Staff sign-in required" };
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name the deck" };
  const filename = (input.filename || "").toLowerCase();
  let rows;
  let source: PreconSource;
  try {
    if (filename.endsWith(".txt") || input.text.trimStart().startsWith("[")) {
      rows = parseManaBoxTxt(input.text);
      source = "manabox-txt";
    } else {
      rows = parseManaBoxCsv(input.text);
      source = "manabox-csv";
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not parse the list" };
  }
  if (!rows.length) return { ok: false, error: "No cards in that file" };
  const catalog = await getPreconCatalog();
  const foilFace = rows.find((row) => row.foil === "foil");
  const deck: PreconDeck = {
    id: uniqueDeckId(name, catalog.decks),
    name,
    productName: name,
    setCode: uniqueSetCodes(rows).join("/").toUpperCase(),
    releasedAt: "",
    faceCommander: foilFace?.name || rows[0]?.name || "",
    source,
    sourceUrl: (input.sourceUrl || "").trim(),
    createdAt: new Date().toISOString(),
    rows,
  };
  const next = await savePreconDeck(deck);
  const harvest = await refreshMockPreconHarvest();
  return { ok: true, catalog: next, harvest, deckId: deck.id };
}

export async function harvestPreconBookAction(): Promise<
  | { ok: true; catalog: PreconCatalog; harvest: PreconHarvestBook }
  | { ok: false; error: string }
> {
  const staff = await requireBuylistStaff();
  if (!staff) return { ok: false, error: "Staff sign-in required" };
  const harvest = await refreshMockPreconHarvest();
  const catalog = await getPreconCatalog();
  return { ok: true, catalog, harvest };
}
