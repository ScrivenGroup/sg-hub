import type { MateOffer } from "../schema";
import { mateCollectorFromName, normalizeCardName, normalizeSetCode } from "./names";

type MateCard = {
  uuid?: string;
  name?: string;
  buy_price?: number;
  credit_price?: number;
  set_code?: string;
  quantity?: number;
  finish?: string;
  rarity?: string;
  image?: string;
};

type MateSetDump = {
  title?: string;
  uuid_data?: Record<string, MateCard>;
};

export type MateHarvestPayload = {
  harvestedAt?: string;
  sets?: Record<
    string,
    | MateSetDump
    | { ok?: boolean; status?: number; data?: unknown; error?: string }
  >;
};

function sniffJson(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    throw new Error("Not JSON — Mate dumps start with { (Chrome may save as .customization).");
  }
  return JSON.parse(trimmed) as unknown;
}

function isSetDump(value: unknown): value is MateSetDump {
  return Boolean(
    value &&
      typeof value === "object" &&
      "uuid_data" in value &&
      (value as MateSetDump).uuid_data &&
      typeof (value as MateSetDump).uuid_data === "object",
  );
}

function cents(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

function offersFromDump(dump: MateSetDump, fallbackSet?: string): MateOffer[] {
  const out: MateOffer[] = [];
  for (const [uuid, card] of Object.entries(dump.uuid_data || {})) {
    const name = (card.name || "").trim();
    if (!name) continue;
    const setCode = normalizeSetCode(card.set_code || fallbackSet || "");
    const buyPriceCents = cents(card.buy_price);
    const creditPriceCents =
      card.credit_price != null ? cents(card.credit_price) : Math.round(buyPriceCents * 1.25);
    const normalised = normalizeCardName(name);
    const image = (card.image || "").trim();
    const collector =
      normalised.collectorNumber || mateCollectorFromName(name) || "";
    out.push({
      mateUuid: card.uuid || uuid,
      name,
      setCode,
      finish: (card.finish || "Nonfoil").trim(),
      buyPriceCents,
      creditPriceCents,
      quantity: Number.isFinite(Number(card.quantity)) ? Number(card.quantity) : 0,
      normalisedName: normalised.name,
      collectorNumber: collector,
      imageUrl: image,
      rarity: (card.rarity || "").trim(),
    });
  }
  return out;
}

function dumpFromWrapped(entry: unknown, setCode: string): MateSetDump | null {
  if (isSetDump(entry)) return entry;
  if (entry && typeof entry === "object" && "data" in entry) {
    const data = (entry as { data: unknown }).data;
    if (isSetDump(data)) return data;
  }
  if (typeof entry === "string") {
    try {
      const parsed = JSON.parse(entry) as unknown;
      if (isSetDump(parsed)) return parsed;
    } catch {
      return null;
    }
  }
  void setCode;
  return null;
}

export function parseMateJson(text: string): {
  offers: MateOffer[];
  sets: string[];
} {
  const raw = sniffJson(text);
  return parseMatePayload(raw);
}

export function parseMatePayload(raw: unknown): {
  offers: MateOffer[];
  sets: string[];
} {
  const offers: MateOffer[] = [];
  const sets = new Set<string>();

  if (isSetDump(raw)) {
    const parsed = offersFromDump(raw);
    for (const offer of parsed) {
      offers.push(offer);
      if (offer.setCode) sets.add(offer.setCode);
    }
    return { offers, sets: [...sets].sort() };
  }

  const harvest = raw as MateHarvestPayload;
  if (harvest && typeof harvest === "object" && harvest.sets) {
    for (const [code, entry] of Object.entries(harvest.sets)) {
      const dump = dumpFromWrapped(entry, code);
      if (!dump) continue;
      const parsed = offersFromDump(dump, code);
      for (const offer of parsed) {
        offers.push(offer);
        if (offer.setCode) sets.add(offer.setCode);
      }
    }
    return { offers, sets: [...sets].sort() };
  }

  throw new Error("Mate JSON needs uuid_data (a set /data dump or a combined harvest).");
}

/** Keep harvest rows whose set is on the ManaBox CSV — a full Mate dump is tens of thousands of cards. */
export function filterMateOffersForCsv(offers: MateOffer[], csvSetCodes: string[]): MateOffer[] {
  const want = new Set(csvSetCodes.map((code) => code.trim().toLowerCase()).filter(Boolean));
  if (!want.size) return offers;
  return offers.filter((o) => want.has((o.setCode || "").trim().toLowerCase()));
}
