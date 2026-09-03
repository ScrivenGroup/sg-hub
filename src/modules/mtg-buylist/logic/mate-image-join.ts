import { createHash } from "crypto";
import type { ManaBoxRow, MateOffer } from "../schema";
import { mateImageUrl, scryfallImageUrl } from "./images";
import {
  csvFinishToMate,
  normalizeCardName,
  normalizeFinish,
  normalizeSetCode,
} from "./names";

function ambiguousMateGroups(
  rows: ManaBoxRow[],
  offers: MateOffer[],
): Map<string, { set: string; name: string; variants: MateOffer[] }> {
  const groups = new Map<string, { set: string; name: string; variants: MateOffer[] }>();
  for (const row of rows) {
    const set = normalizeSetCode(row.setCode);
    const name = normalizeCardName(row.name).name;
    const finish = normalizeFinish(csvFinishToMate(row.foil));
    const key = `${set}|${name}|${finish}`;
    if (groups.has(key)) continue;
    const variants = offers.filter(
      (o) =>
        normalizeSetCode(o.setCode) === set &&
        normalizeCardName(o.name).name === name &&
        normalizeFinish(o.finish) === finish,
    );
    // Dedupe by image/uuid roughly (keep first)
    const seen = new Set<string>();
    const deduped: MateOffer[] = [];
    for (const v of variants) {
      const pk = (v.imageUrl || v.mateUuid).trim().toLowerCase();
      if (seen.has(pk)) continue;
      seen.add(pk);
      deduped.push(v);
    }
    if (deduped.length > 1) {
      groups.set(key, { set, name: row.name, variants: deduped });
    }
  }
  return groups;
}

const SCRYFALL_UA = "ScrivenGroupMtgBuylist/1.0 (hub; https://scriven.group)";

type ScryfallPrint = {
  id: string;
  collector_number?: string;
  image_uris?: { normal?: string; small?: string };
  card_faces?: Array<{ image_uris?: { normal?: string; small?: string } }>;
};

async function sha256Url(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": SCRYFALL_UA, Accept: "image/*,*/*" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) return null;
    return createHash("sha256").update(buf).digest("hex");
  } catch {
    return null;
  }
}

function scryfallFaceUrl(card: ScryfallPrint): string {
  return (
    card.image_uris?.normal ||
    card.card_faces?.[0]?.image_uris?.normal ||
    scryfallImageUrl(card.id)
  );
}

async function fetchSetNamePrints(setCode: string, name: string): Promise<ScryfallPrint[]> {
  const q = `!"${name}" set:${setCode}`;
  const url =
    `https://api.scryfall.com/cards/search?q=${encodeURIComponent(q)}&unique=prints`;
  const out: ScryfallPrint[] = [];
  let next: string | null = url;
  while (next) {
    const res = await fetch(next, {
      headers: { "User-Agent": SCRYFALL_UA, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) break;
    const body = (await res.json()) as {
      data?: ScryfallPrint[];
      has_more?: boolean;
      next_page?: string;
    };
    out.push(...(body.data || []));
    next = body.has_more && body.next_page ? body.next_page : null;
    if (next) await new Promise((r) => setTimeout(r, 80));
  }
  return out;
}

/**
 * Ambiguous-only: hash Mate CDN images against Scryfall print images for the
 * same set+name. Returns mateUuid → scryfallId only for exact byte matches.
 * Proven for HOB Eagles (#46 vs #240 poster) where Mate uses bare names.
 */
export async function buildMateImageLinks(
  rows: ManaBoxRow[],
  offers: MateOffer[],
): Promise<Record<string, string>> {
  const ambiguousKeys = ambiguousMateGroups(rows, offers);
  if (!ambiguousKeys.size) return {};

  const links: Record<string, string> = {};
  const hashCache = new Map<string, string | null>();

  async function cachedHash(url: string): Promise<string | null> {
    if (hashCache.has(url)) return hashCache.get(url) ?? null;
    const h = await sha256Url(url);
    hashCache.set(url, h);
    return h;
  }

  for (const { set, name, variants } of ambiguousKeys.values()) {
    const prints = await fetchSetNamePrints(set, name);
    if (!prints.length) continue;

    const byHash = new Map<string, string>();
    for (const print of prints) {
      const img = scryfallFaceUrl(print);
      const h = await cachedHash(img);
      if (h) byHash.set(h, print.id.trim().toLowerCase());
    }

    for (const offer of variants) {
      const h = await cachedHash(mateImageUrl(offer.imageUrl || ""));
      if (!h) continue;
      const scryfallId = byHash.get(h);
      if (scryfallId) links[offer.mateUuid] = scryfallId;
    }
    await new Promise((r) => setTimeout(r, 80));
  }

  return links;
}

/** Prefer image-linked Mate offer matching the CSV Scryfall id (exact, unique). */
export function mateOfferFromImageLink(
  row: ManaBoxRow,
  variants: MateOffer[],
  imageLinks: Record<string, string>,
): MateOffer | undefined {
  const owned = row.scryfallId.trim().toLowerCase();
  if (!owned || !variants.length) return undefined;
  const hits = variants.filter(
    (v) => (imageLinks[v.mateUuid] || "").toLowerCase() === owned,
  );
  return hits.length === 1 ? hits[0] : undefined;
}
