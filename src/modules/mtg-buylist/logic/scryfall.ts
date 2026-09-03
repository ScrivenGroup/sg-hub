import type { ManaBoxRow } from "../schema";

type ScryfallCard = {
  id?: string;
  collector_number?: string;
  frame_effects?: string[];
  finish?: string;
};

type CollectionResponse = {
  data?: ScryfallCard[];
  not_found?: unknown[];
};

const COLLECTION_URL = "https://api.scryfall.com/cards/collection";
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
