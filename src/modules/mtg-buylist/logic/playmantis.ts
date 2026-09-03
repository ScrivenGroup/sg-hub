import type { PlaymantisOffer } from "../schema";
import { decodeHtmlEntities, normalizeCardName } from "./names";

const SEARCH_BASE = "https://playmantis.com.au/search";
const IMPORT_BATCH_SIZE = 8;
const IMPORT_BATCH_DELAY_MS = 200;
const MAX_RETRIES = 2;
const NAME_FALLBACK_PAGES = 3;

export function playmantisSearchUrl(scryfallId: string): string {
  const params = new URLSearchParams();
  params.append("q", `tag:buylist tag:${scryfallId}`);
  params.append("type", "product");
  return `${SEARCH_BASE}?${params.toString()}&view=buylist-custom`;
}

export function playmantisNameSearchUrl(name: string, page?: number): string {
  const term = name.replace(/['’.,\\/#-]/g, " ").replace(/\s+/g, " ").trim();
  const params = new URLSearchParams();
  params.append("q", `tag:buylist ${term}`);
  params.append("type", "product");
  const base = `${SEARCH_BASE}?${params.toString()}&view=buylist-custom`;
  return page && page > 1 ? `${base}&page=${page}` : base;
}

const SCRYFALL_UUID =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Search `view=buylist-custom` omits data-scryfall-id and data-buylist-limit. Collection pages have both. */
export function parsePlaymantisHtml(
  html: string,
  fetchedAt: string,
  fallbackScryfallId = "",
): PlaymantisOffer[] {
  const offers: PlaymantisOffer[] = [];
  const cardStarts = [...html.matchAll(/<div class="buylist-card"([^>]*)>/g)];
  for (let i = 0; i < cardStarts.length; i++) {
    const attrs = cardStarts[i][1] || "";
    const start = cardStarts[i].index ?? 0;
    const end = i + 1 < cardStarts.length ? (cardStarts[i + 1].index ?? html.length) : html.length;
    const chunk = html.slice(start, end);
    const scryfallId =
      attr(attrs, "data-scryfall-id") ||
      scryfallFromChunk(chunk) ||
      fallbackScryfallId.trim();
    const title = decodeHtmlEntities(attr(attrs, "data-title"));
    const imageUrl = imageFromChunk(chunk);
    const options = [...chunk.matchAll(/<option([^>]*)>/gi)];
    if (!scryfallId) continue;
    if (options.length === 0) {
      offers.push({
        scryfallId,
        title,
        finish: "nonfoil",
        creditCents: 0,
        limit: 0,
        missing: true,
        fetchedAt,
        imageUrl,
      });
      continue;
    }
    for (const option of options) {
      const optAttrs = option[1] || "";
      const finish = attr(optAttrs, "data-variant-title") || "Nonfoil";
      const creditRaw = attr(optAttrs, "data-credit-price");
      const dollars = Number(creditRaw);
      const creditCents = Number.isFinite(dollars) ? Math.round(dollars * 100) : 0;
      offers.push({
        scryfallId,
        title,
        finish,
        creditCents,
        limit: parseWantLimit(attr(optAttrs, "data-buylist-limit"), creditCents),
        missing: false,
        fetchedAt,
        imageUrl,
      });
    }
  }
  return offers;
}

function imageFromChunk(chunk: string): string {
  const match =
    /(?:src|data-full-img)="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i.exec(chunk) ||
    /(?:src|data-full-img)="([^"]+)"/i.exec(chunk);
  if (!match) return "";
  const raw = match[1];
  if (raw.startsWith("//")) return `https:${raw}`;
  return raw;
}

function scryfallFromChunk(chunk: string): string {
  const fromFile = /\/(?:files\/)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(?:jpg|jpeg|png|webp)/i.exec(
    chunk,
  );
  if (fromFile) return fromFile[1];
  const any = SCRYFALL_UUID.exec(chunk);
  return any ? any[0] : "";
}

/**
 * Collection pages expose data-buylist-limit. Search `view=buylist-custom` often omits it —
 * when credit > 0, default want cap 4 so matched cards are not treated as missing.
 * Do not use data-inventory as want cap (store stock on hand, not buy limit).
 */
function parseWantLimit(raw: string, creditCents: number): number {
  if (raw.trim() !== "") {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return creditCents > 0 ? 4 : 0;
}

function attr(source: string, name: string): string {
  const match = new RegExp(`${name}="([^"]*)"`, "i").exec(source);
  return match ? match[1] : "";
}

function bindToCsvId(offers: PlaymantisOffer[], sid: string): PlaymantisOffer[] {
  return offers.map((o) => ({
    ...o,
    scryfallId: sid,
    missing: false,
    imageUrl: o.imageUrl || "",
  }));
}

function titlesMatch(a: string, b: string): boolean {
  return normalizeCardName(a).name === normalizeCardName(b).name;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string): Promise<string> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent":
          "ScrivenGroup-MTGBuylist/1.0 (staff tool; polite harvest; +https://scriven.group)",
      },
      cache: "no-store",
    });
    if (res.status === 429 && attempt < MAX_RETRIES) {
      await sleep(500 * (attempt + 1));
      continue;
    }
    if (!res.ok && attempt < MAX_RETRIES && res.status >= 500) {
      await sleep(500 * (attempt + 1));
      continue;
    }
    if (!res.ok) {
      throw new Error(`Playmantis HTTP ${res.status}`);
    }
    return res.text();
  }
  return "";
}

/**
 * Resolve offers for one CSV Scryfall ID. Image UUIDs on Playmantis sometimes differ from
 * ManaBox Scryfall IDs — bind successful product rows back to the requested id so join works
 * and "not found" stubs are cleared.
 */
export function resolveOffersForScryfallId(
  parsed: PlaymantisOffer[],
  sid: string,
  csvName?: string,
): PlaymantisOffer[] {
  const exact = parsed.filter((o) => o.scryfallId.toLowerCase() === sid && !o.missing);
  if (exact.length) return exact;

  const good = parsed.filter((o) => !o.missing && o.creditCents > 0);
  const productIds = new Set(good.map((o) => o.scryfallId.toLowerCase()));
  // Tag-UUID search should return one product; bind finishes to CSV id even if image UUID differs.
  if (productIds.size === 1) {
    return bindToCsvId(good, sid);
  }

  if (csvName) {
    const byTitle = good.filter((o) => titlesMatch(o.title || "", csvName));
    if (byTitle.length) return bindToCsvId(byTitle, sid);
  }

  return [];
}

export async function harvestPlaymantis(input: {
  scryfallIds: string[];
  namesById?: Record<string, string>;
  existing?: PlaymantisOffer[];
  onBatch?: (done: number, total: number) => void;
}): Promise<PlaymantisOffer[]> {
  const fetchedAt = new Date().toISOString();
  const byId = new Map<string, PlaymantisOffer[]>();
  for (const offer of input.existing || []) {
    const key = offer.scryfallId.trim().toLowerCase();
    const list = byId.get(key) || [];
    list.push(offer);
    byId.set(key, list);
  }

  const uniqueIds = [
    ...new Set(input.scryfallIds.map((id) => id.trim().toLowerCase()).filter(Boolean)),
  ];
  // Retry ids that only have missing stubs (or are absent).
  const missing = uniqueIds.filter((id) => {
    const list = byId.get(id) || [];
    return !list.some((o) => !o.missing);
  });
  let done = uniqueIds.length - missing.length;

  for (let i = 0; i < missing.length; i += IMPORT_BATCH_SIZE) {
    const batch = missing.slice(i, i + IMPORT_BATCH_SIZE);
    await Promise.all(
      batch.map(async (sid) => {
        try {
          const name = input.namesById?.[sid];
          const html = await fetchWithRetry(playmantisSearchUrl(sid));
          let offers = resolveOffersForScryfallId(
            parsePlaymantisHtml(html, fetchedAt, sid),
            sid,
            name,
          );
          if (!offers.length && name) {
            offers = await nameFallback(sid, name, fetchedAt);
          }
          if (!offers.length) {
            offers = [
              {
                scryfallId: sid,
                title: name || "",
                finish: "nonfoil",
                creditCents: 0,
                limit: 0,
                missing: true,
                fetchedAt,
                imageUrl: "",
              },
            ];
          }
          byId.set(sid, offers);
        } catch {
          byId.set(sid, [
            {
              scryfallId: sid,
              title: input.namesById?.[sid] || "",
              finish: "nonfoil",
              creditCents: 0,
              limit: 0,
              missing: true,
              fetchedAt,
              imageUrl: "",
            },
          ]);
        }
        done += 1;
        input.onBatch?.(done, uniqueIds.length);
      }),
    );
    if (i + IMPORT_BATCH_SIZE < missing.length) {
      await sleep(IMPORT_BATCH_DELAY_MS);
    }
  }

  return uniqueIds.flatMap((id) => byId.get(id) || []);
}

async function nameFallback(
  scryfallId: string,
  name: string,
  fetchedAt: string,
): Promise<PlaymantisOffer[]> {
  for (let page = 1; page <= NAME_FALLBACK_PAGES; page++) {
    const html = await fetchWithRetry(playmantisNameSearchUrl(name, page));
    const parsed = parsePlaymantisHtml(html, fetchedAt, scryfallId);
    const resolved = resolveOffersForScryfallId(parsed, scryfallId, name);
    if (resolved.length) return resolved;
    if (!parsed.length) break;
  }
  return [];
}
