import type { ManaBoxRow } from "../schema";
import { normalizeCardName, normalizeSetCode } from "./names";

type ScryfallCard = {
  id?: string;
  name?: string;
  set?: string;
  collector_number?: string;
  frame_effects?: string[];
  finish?: string;
};

export type CardLookup = {
  name: string;
  setCode: string;
  collectorNumber?: string;
};

export type CardHint = {
  scryfallId: string;
  collectorNumber: string;
};

export function cardLookupKey(input: CardLookup): string {
  const set = normalizeSetCode(input.setCode);
  const name = normalizeCardName(input.name).name;
  const col = (input.collectorNumber || "").trim();
  return col ? `${name}|${set}|#${col}` : `${name}|${set}`;
}

type CollectionResponse = {
  data?: ScryfallCard[];
  not_found?: unknown[];
};

const COLLECTION_URL = "https://api.scryfall.com/cards/collection";
const SETS_URL = "https://api.scryfall.com/sets";
const BATCH = 75;
/** Scryfall rejects default HTTP-library User-Agents (400 generic_user_agent). */
const SCRYFALL_UA = "ScrivenGroupMtgBuylist/1.0 (hub; https://scriven.group)";

/**
 * Fill frameEffects (and Scryfall collector when CSV blank) from Scryfall.
 * Used to prefer Mate "(Extended Art)" vs base printings — ManaBox names omit that suffix.
 */
export async function enrichRowsFromScryfall(rows: ManaBoxRow[]): Promise<ManaBoxRow[]> {
  const ids = [
    ...new Set(rows.map((r) => r.scryfallId.trim().toLowerCase()).filter((id) => /^[0-9a-f-]{36}$/.test(id))),
  ];
  if (!ids.length) return rows;

  const byId = new Map<string, ScryfallCard>();
  for (let i = 0; i < ids.length; i += BATCH) {
    const slice = ids.slice(i, i + BATCH);
    const res = await fetch(COLLECTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": SCRYFALL_UA,
      },
      body: JSON.stringify({ identifiers: slice.map((id) => ({ id })) }),
      cache: "no-store",
    });
    if (!res.ok) {
      // Soft-fail: keep CSV as-is; Mate confirm UI still works.
      continue;
    }
    const body = (await res.json()) as CollectionResponse;
    for (const card of body.data || []) {
      const id = (card.id || "").trim().toLowerCase();
      if (id) byId.set(id, card);
    }
    if (i + BATCH < ids.length) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  if (!byId.size) return rows;

  return rows.map((row) => {
    const hit = byId.get(row.scryfallId.trim().toLowerCase());
    if (!hit) return row;
    const frameEffects = (hit.frame_effects || []).map((f) => f.toLowerCase());
    const scryCollector = (hit.collector_number || "").trim();
    return {
      ...row,
      frameEffects,
      collectorNumber: row.collectorNumber || scryCollector,
    };
  });
}

type ScryfallSet = { code?: string; name?: string };
type SetsResponse = { data?: ScryfallSet[] };

function normalizeSetNameKey(raw: string): string {
  return (raw || "")
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Official Scryfall set names are usually unique. Skip a name if more than one
 * code normalises to it — that is the ambiguous case.
 */
export async function lookupScryfallSetCodes(names: string[]): Promise<Record<string, string>> {
  const want = [...new Set(names.map(normalizeSetNameKey).filter(Boolean))];
  if (!want.length) return {};
  const res = await fetch(SETS_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": SCRYFALL_UA,
    },
    cache: "force-cache",
  });
  if (!res.ok) return {};
  const body = (await res.json()) as SetsResponse;
  const codes = new Map<string, Set<string>>();
  for (const set of body.data || []) {
    const key = normalizeSetNameKey(set.name || "");
    const code = (set.code || "").trim().toLowerCase();
    if (!key || !code) continue;
    const bucket = codes.get(key) || new Set<string>();
    bucket.add(code);
    codes.set(key, bucket);
  }
  const out: Record<string, string> = {};
  for (const name of want) {
    const hits = codes.get(name);
    if (hits && hits.size === 1) out[name] = [...hits][0];
  }
  return out;
}

function scryfallRequestName(raw: string): string {
  let name = (raw || "").trim();
  if (name.includes("//")) name = name.split("//")[0].trim();
  name = name.replace(/\s*\([^)]*showcase[^)]*\)\s*$/i, "").trim();
  return name;
}

/**
 * Name + set (and collector # when we have it) → Scryfall id for hover previews.
 * One printing per identifier — same-set alts may get the default face.
 */
export async function lookupScryfallCardIds(lookups: CardLookup[]): Promise<Record<string, CardHint>> {
  const unique = new Map<string, CardLookup>();
  for (const raw of lookups) {
    const setCode = normalizeSetCode(raw.setCode);
    if (!/^[a-z0-9]{2,6}$/.test(setCode) || !raw.name.trim()) continue;
    const lookup = {
      name: raw.name.trim(),
      setCode,
      collectorNumber: (raw.collectorNumber || "").trim(),
    };
    unique.set(cardLookupKey(lookup), lookup);
  }
  if (!unique.size) return {};

  const list = [...unique.values()];
  const out: Record<string, CardHint> = {};
  for (let i = 0; i < list.length; i += BATCH) {
    const slice = list.slice(i, i + BATCH);
    const identifiers = slice.map((lookup) => {
      const col = lookup.collectorNumber || "";
      if (col) return { set: lookup.setCode, collector_number: col };
      return { name: scryfallRequestName(lookup.name), set: lookup.setCode };
    });
    const res = await fetch(COLLECTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": SCRYFALL_UA,
      },
      body: JSON.stringify({ identifiers }),
      cache: "no-store",
    });
    if (res.ok) {
      const body = (await res.json()) as CollectionResponse;
      for (const card of body.data || []) {
        const id = (card.id || "").trim().toLowerCase();
        if (!id) continue;
        const set = normalizeSetCode(card.set || "");
        const col = (card.collector_number || "").trim();
        const name = card.name || "";
        for (const lookup of slice) {
          const sameSet = normalizeSetCode(lookup.setCode) === set;
          if (!sameSet) continue;
          if (lookup.collectorNumber && lookup.collectorNumber === col) {
            out[cardLookupKey(lookup)] = { scryfallId: id, collectorNumber: col };
            continue;
          }
          if (
            !lookup.collectorNumber &&
            normalizeCardName(lookup.name).name === normalizeCardName(name).name
          ) {
            out[cardLookupKey(lookup)] = { scryfallId: id, collectorNumber: col };
          }
        }
      }
    }
    if (i + BATCH < list.length) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  return out;
}
