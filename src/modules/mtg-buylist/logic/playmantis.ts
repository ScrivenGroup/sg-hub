import type { PlaymantisOffer } from "../schema";
import { decodeHtmlEntities } from "./names";

const SEARCH_BASE = "https://playmantis.com.au/search";
/** Same cadence as Playmantis’s own ManaBox CSV import. */
const IMPORT_BATCH_SIZE = 8;
const IMPORT_BATCH_DELAY_MS = 200;
const MAX_RETRIES = 2;
const NAME_FALLBACK_PAGES = 3;
const DEFAULT_MAX_BUY_QTY = 4;
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

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

type ParsedOffer = PlaymantisOffer & { taggedId: string };

/** Search `view=buylist-custom` omits data-scryfall-id and data-buylist-limit. Collection pages have both. */
export function parsePlaymantisHtml(
  html: string,
  fetchedAt: string,
  fallbackScryfallId = "",
  _csvName = "",
): PlaymantisOffer[] {
  return parsePlaymantisCards(html, fetchedAt, fallbackScryfallId);
}

function parsePlaymantisCards(
  html: string,
  fetchedAt: string,
  fallbackScryfallId = "",
): ParsedOffer[] {
  const offers: ParsedOffer[] = [];
  const cardStarts = [...html.matchAll(/<div class="buylist-card"([^>]*)>/g)];
  for (let i = 0; i < cardStarts.length; i++) {
    const attrs = cardStarts[i][1] || "";
    const start = cardStarts[i].index ?? 0;
    const end = i + 1 < cardStarts.length ? (cardStarts[i + 1].index ?? html.length) : html.length;
    const chunk = html.slice(start, end);
    const title = decodeHtmlEntities(attr(attrs, "data-title"));
    const taggedId = attr(attrs, "data-scryfall-id").trim();
    const scryfallId = taggedId || scryfallFromChunk(chunk) || fallbackScryfallId.trim();
    const imageUrl = imageFromChunk(chunk);
    const setName = setFromChunk(chunk);
    const maxBuyRaw = Number(attr(attrs, "data-max-buy-qty"));
    const maxAllowed = Number.isFinite(maxBuyRaw) && maxBuyRaw > 0 ? maxBuyRaw : DEFAULT_MAX_BUY_QTY;
    const options = [...chunk.matchAll(/<option([^>]*)>/gi)];
    if (!scryfallId) continue;
    if (options.length === 0) {
      offers.push({
        scryfallId,
        taggedId,
        title,
        finish: "nonfoil",
        creditCents: 0,
        limit: 0,
        missing: true,
        fetchedAt,
        imageUrl,
        setName,
      });
      continue;
    }
    for (const option of options) {
      const optAttrs = option[1] || "";
      const finish = attr(optAttrs, "data-variant-title") || "Nonfoil";
      const creditRaw = attr(optAttrs, "data-credit-price");
      const dollars = Number(creditRaw);
      const creditCents = Number.isFinite(dollars) ? Math.round(dollars * 100) : 0;
      const invRaw = Number(attr(optAttrs, "data-inventory"));
      const stock = Number.isFinite(invRaw) && invRaw >= 0 ? invRaw : 0;
      offers.push({
        scryfallId,
        taggedId,
        title,
        finish,
        creditCents,
        limit: remainingWant(attr(optAttrs, "data-buylist-limit"), maxAllowed, stock),
        missing: false,
        fetchedAt,
        imageUrl,
        setName,
      });
    }
  }
  return offers;
}

function setFromChunk(chunk: string): string {
  const match = /<p class="card-set">([^<]*)<\/p>/i.exec(chunk);
  return match ? decodeHtmlEntities(match[1].trim()) : "";
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
 * Playmantis import: remaining = maxBuyQty (default 4) minus variant inventory.
 * Collection HTML may also expose data-buylist-limit as remaining already.
 */
function remainingWant(buylistLimitRaw: string, maxAllowed: number, stock: number): number {
  if (buylistLimitRaw.trim() !== "") {
    const n = Number(buylistLimitRaw);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return Math.max(0, maxAllowed - stock);
}

function attr(source: string, name: string): string {
  const match = new RegExp(`${name}="([^"]*)"`, "i").exec(source);
  return match ? match[1] : "";
}

function bindToCsvId(offers: ParsedOffer[], sid: string): PlaymantisOffer[] {
  return offers.map((o) => ({
    scryfallId: sid,
    title: o.title,
    finish: o.finish,
    creditCents: o.creditCents,
    limit: o.limit,
    missing: false,
    fetchedAt: o.fetchedAt,
    imageUrl: o.imageUrl || "",
    setName: o.setName || "",
  }));
}

function firstProduct(parsed: ParsedOffer[]): ParsedOffer[] {
  const first = parsed.find((o) => !o.missing);
  if (!first) return [];
  return parsed.filter(
    (o) => !o.missing && o.title === first.title && o.imageUrl === first.imageUrl,
  );
}

function goodOffers(list: PlaymantisOffer[] | undefined): PlaymantisOffer[] {
  return (list || []).filter((o) => !o.missing);
}

function missingStub(
  sid: string,
  name: string,
  fetchedAt: string,
): PlaymantisOffer[] {
  return [
    {
      scryfallId: sid,
      title: name,
      finish: "nonfoil",
      creditCents: 0,
      limit: 0,
      missing: true,
      fetchedAt,
      imageUrl: "",
      setName: "",
    },
  ];
}

/**
 * IDs to fetch this harvest click. Every CSV id is refetched so remaining want
 * (4 − inventory) stays current — Playmantis stock changes without a title change.
 * Missing stubs retry once per click (`skipIds` from the client prevents a loop).
 */
export function scryfallIdsNeedingPlaymantisFetch(input: {
  ids: string[];
  namesById: Record<string, string>;
  existing: PlaymantisOffer[];
  skipIds?: string[];
}): string[] {
  const skip = new Set((input.skipIds || []).map((id) => id.trim().toLowerCase()));
  return input.ids.filter((id) => !skip.has(id));
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, bag: { value: string }): Promise<string> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const headers: Record<string, string> = {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": BROWSER_UA,
      Referer: "https://playmantis.com.au/collections/buylist",
      Origin: "https://playmantis.com.au",
    };
    if (bag.value) headers.Cookie = bag.value;
    const res = await fetch(url, { headers, cache: "no-store" });
    const setCookies =
      typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
    if (setCookies.length) {
      bag.value = setCookies.map((c) => c.split(";")[0] || "").filter(Boolean).join("; ");
    }
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

async function fetchBuylistHtml(url: string, bag: { value: string }): Promise<string> {
  let last = "";
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    last = await fetchWithRetry(url, bag);
    if (/buylist-card/i.test(last) || attempt === MAX_RETRIES) return last;
    await sleep(400 * (attempt + 1));
  }
  return last;
}

/**
 * Same rules as Playmantis import:
 * UUID-tag page → product with data-scryfall-id === csv id, else the first product.
 * Name page → only data-scryfall-id === csv id (no image-UUID or set guesses).
 */
export function resolveOffersForScryfallId(
  parsed: PlaymantisOffer[],
  sid: string,
  _csvName?: string,
  opts?: { uuidTag?: boolean },
): PlaymantisOffer[] {
  const want = sid.trim().toLowerCase();
  const cards = parsed as ParsedOffer[];
  const tagged = cards.filter(
    (o) => (o.taggedId || "").toLowerCase() === want && !o.missing,
  );
  if (tagged.length) return bindToCsvId(tagged, sid);

  if (!opts?.uuidTag) return [];

  const first = firstProduct(cards);
  return first.length ? bindToCsvId(first, sid) : [];
}

export async function harvestPlaymantis(input: {
  scryfallIds: string[];
  namesById?: Record<string, string>;
  setNamesById?: Record<string, string>;
  setCodesById?: Record<string, string>;
  existing?: PlaymantisOffer[];
  onBatch?: (done: number, total: number) => void;
}): Promise<PlaymantisOffer[]> {
  const fetchedAt = new Date().toISOString();
  const cookies = { value: "" };
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
  let done = 0;

  for (let i = 0; i < uniqueIds.length; i += IMPORT_BATCH_SIZE) {
    const batch = uniqueIds.slice(i, i + IMPORT_BATCH_SIZE);
    await Promise.all(
      batch.map(async (sid) => {
        const name = input.namesById?.[sid] || "";
        const previous = goodOffers(byId.get(sid));
        try {
          const html = await fetchBuylistHtml(playmantisSearchUrl(sid), cookies);
          let offers = resolveOffersForScryfallId(
            parsePlaymantisCards(html, fetchedAt, sid),
            sid,
            name,
            { uuidTag: true },
          );
          if (!offers.length && name) {
            offers = await nameFallback(sid, name, fetchedAt, cookies);
          }
          byId.set(
            sid,
            offers.length ? offers : previous.length ? previous : missingStub(sid, name, fetchedAt),
          );
        } catch {
          byId.set(sid, previous.length ? previous : missingStub(sid, name, fetchedAt));
        }
        done += 1;
        input.onBatch?.(done, uniqueIds.length);
      }),
    );
    if (i + IMPORT_BATCH_SIZE < uniqueIds.length) {
      await sleep(IMPORT_BATCH_DELAY_MS);
    }
  }

  return uniqueIds.flatMap((id) => byId.get(id) || []);
}

async function nameFallback(
  scryfallId: string,
  name: string,
  fetchedAt: string,
  bag: { value: string },
): Promise<PlaymantisOffer[]> {
  for (let page = 1; page <= NAME_FALLBACK_PAGES; page++) {
    const html = await fetchBuylistHtml(playmantisNameSearchUrl(name, page), bag);
    const parsed = parsePlaymantisCards(html, fetchedAt);
    const resolved = resolveOffersForScryfallId(parsed, scryfallId, name);
    if (resolved.length) return resolved;
    if (!parsed.length) break;
  }
  return [];
}
