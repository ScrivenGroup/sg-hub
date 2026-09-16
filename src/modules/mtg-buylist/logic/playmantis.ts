import type { PlaymantisOffer } from "../schema";
import { decodeHtmlEntities, normalizeFinish, playmantisCardName } from "./names";

const SEARCH_BASE = "https://playmantis.com.au/search";
/** Same cadence as Playmantis’s own ManaBox CSV import, plus a pause after every batch so chained server actions don’t fire back-to-back. */
const IMPORT_BATCH_SIZE = 8;
const IMPORT_BATCH_DELAY_MS = 400;
const IMPORT_MAX_PAGES_PER_NAME = 3;
const MAX_RETRIES = 2;
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
  let words = term.split(" ").filter((w) => w.length > 1);
  if (words.length === 0) words = term.split(" ").filter(Boolean);
  const titleClauses = words.map((w) => `title:*${w}*`).join(" AND ");
  const params = new URLSearchParams();
  params.append("q", `tag:buylist AND (${titleClauses})`);
  params.append("type", "product");
  const base = `${SEARCH_BASE}?${params.toString()}&view=buylist-custom`;
  return page && page > 1 ? `${base}&page=${page}` : base;
}

const SCRYFALL_UUID =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

type ParsedOffer = PlaymantisOffer & { taggedId: string; imageId: string };

/** Search HTML: a hit has cards; a genuine miss still has the buylist grid; anything else is a flake / challenge. */
export function classifyBuylistSearchHtml(html: string): "hit" | "empty" | "blocked" {
  if (!html.trim()) return "blocked";
  if (/<div class="buylist-card"/i.test(html)) return "hit";
  if (/id=["']buylist-grid-container["']/i.test(html)) return "empty";
  return "blocked";
}

function gridHtml(html: string): string {
  const idAt = html.search(/id=["']buylist-grid-container["']/i);
  if (idAt < 0) return "";
  const fromDiv = html.lastIndexOf("<div", idAt);
  const pagAt = html.search(/id=["']buylist-pagination["']/i);
  return html.slice(fromDiv >= 0 ? fromDiv : idAt, pagAt >= 0 ? pagAt : html.length);
}

function maxPageFromHtml(html: string): number {
  let maxPage = 1;
  const re = /[?&]page=(\d+)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const p = Number(match[1]);
    if (Number.isFinite(p) && p > maxPage) maxPage = p;
  }
  return maxPage;
}

/** Search `view=buylist-custom` omits data-scryfall-id; collection pages have it. Image filename is the same UUID. */
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
  const scope = gridHtml(html) || html;
  const cardStarts = [...scope.matchAll(/<div class="buylist-card"([^>]*)>/g)];
  for (let i = 0; i < cardStarts.length; i++) {
    const attrs = cardStarts[i][1] || "";
    const start = cardStarts[i].index ?? 0;
    const end = i + 1 < cardStarts.length ? (cardStarts[i + 1].index ?? scope.length) : scope.length;
    const chunk = scope.slice(start, end);
    const title = decodeHtmlEntities(attr(attrs, "data-title"));
    const taggedId = attr(attrs, "data-scryfall-id").trim();
    const imageId = scryfallFromChunk(chunk);
    const scryfallId = taggedId || imageId || fallbackScryfallId.trim();
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
        imageId,
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
        imageId,
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
 * Playmantis import remaining = maxBuyQty (default 4) minus variant inventory.
 * Search HTML has no data-buylist-limit; collection pages may expose remaining already.
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

function playmantisTitleKey(raw: string): string {
  return playmantisCardName(raw);
}

function titlesMatch(a: string, b: string): boolean {
  const left = playmantisTitleKey(a);
  const right = playmantisTitleKey(b);
  return Boolean(left && right && left === right);
}

function setsMatch(a: string, b: string): boolean {
  const left = (a || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const right = (b || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return Boolean(left && right && left === right);
}

function pickByName(parsed: ParsedOffer[], csvName: string, setName = ""): ParsedOffer[] {
  const named = parsed.filter((o) => !o.missing && titlesMatch(o.title, csvName));
  if (!named.length) return [];
  const setHits = setName ? named.filter((o) => setsMatch(o.setName, setName)) : [];
  const pool = setHits.length ? setHits : named;
  const plain = pool.filter((o) => !/\([^)]*\)/.test(o.title));
  return firstProduct(plain.length ? plain : pool);
}

function productScryfallId(offer: ParsedOffer): string {
  return (offer.taggedId || offer.imageId || "").trim().toLowerCase();
}

function goodOffers(list: PlaymantisOffer[] | undefined): PlaymantisOffer[] {
  return (list || []).filter((o) => !o.missing);
}

function missingStub(sid: string, name: string, fetchedAt: string): PlaymantisOffer[] {
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
 * Playmantis import: CSV foil/etched matches any foil-ish variant that is not
 * Nonfoil; otherwise Nonfoil. One-option products match regardless of finish.
 */
export function foilMatchesVariant(csvFoil: string, variantTitle: string): boolean {
  const vt = (variantTitle || "").toLowerCase().trim();
  const isNonfoilVariant = vt === "normal" || /(^|[^a-z])non-?foil([^a-z]|$)/.test(vt);
  const wantsFoil = (() => {
    const finish = normalizeFinish(csvFoil);
    return finish === "foil" || finish === "etched";
  })();
  if (wantsFoil) return !isNonfoilVariant && vt.includes("foil");
  return isNonfoilVariant;
}

/**
 * IDs to fetch this harvest click. Full harvest refetches every CSV id so remaining
 * want (4 − inventory) stays current. `missingOnly` is the throttle retry: skip IDs
 * that already have a live offer. `skipIds` stops a loop inside one click.
 */
export function scryfallIdsNeedingPlaymantisFetch(input: {
  ids: string[];
  namesById: Record<string, string>;
  existing: PlaymantisOffer[];
  skipIds?: string[];
  missingOnly?: boolean;
}): string[] {
  const skip = new Set((input.skipIds || []).map((id) => id.trim().toLowerCase()));
  const live = new Set(
    (input.existing || [])
      .filter((o) => !o.missing)
      .map((o) => o.scryfallId.trim().toLowerCase()),
  );
  return input.ids.filter((id) => {
    const key = id.trim().toLowerCase();
    if (!key || skip.has(key)) return false;
    if (input.missingOnly && live.has(key)) return false;
    return true;
  });
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function runInBatches<T>(
  items: T[],
  handler: (item: T) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < items.length; i += IMPORT_BATCH_SIZE) {
    const batch = items.slice(i, i + IMPORT_BATCH_SIZE);
    await Promise.all(batch.map(handler));
    if (IMPORT_BATCH_DELAY_MS > 0) {
      await sleep(IMPORT_BATCH_DELAY_MS);
    }
  }
}

/** Playmantis import: return body even on HTTP errors; retry 429, network, blocked HTML, and one empty grid. */
async function fetchWithRetry(url: string): Promise<string> {
  let last = "";
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const headers: Record<string, string> = {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": BROWSER_UA,
        Referer: "https://playmantis.com.au/collections/buylist",
      };
      const res = await fetch(url, {
        headers,
        cache: "no-store",
        redirect: "follow",
        signal: AbortSignal.timeout(20000),
      });
      if (res.status === 429 && attempt < MAX_RETRIES) {
        await sleep(500 * (attempt + 1));
        continue;
      }
      last = await res.text();
      const kind = classifyBuylistSearchHtml(last);
      if (kind === "hit") return last;
      if (kind === "empty" && attempt >= 1) return last;
      if (attempt < MAX_RETRIES) {
        await sleep(kind === "empty" ? 400 : 500 * (attempt + 1));
        continue;
      }
      return last;
    } catch {
      if (attempt === MAX_RETRIES) return last;
      await sleep(500 * (attempt + 1));
    }
  }
  return last;
}

/**
 * UUID-tag page → product whose data-scryfall-id / image UUID equals the CSV id,
 * else the first product (Playmantis import: exactMatch || cards[0]).
 * Name page (search HTML has no data-scryfall-id) → same title as the CSV,
 * preferring the CSV set, then a title with no extra parenthetical.
 */
export function resolveOffersForScryfallId(
  parsed: PlaymantisOffer[],
  sid: string,
  csvName?: string,
  opts?: { uuidTag?: boolean; setName?: string },
): PlaymantisOffer[] {
  const want = sid.trim().toLowerCase();
  const cards = parsed as ParsedOffer[];
  const live = cards.filter((o) => !o.missing);
  const tagged = live.filter((o) => productScryfallId(o) === want);
  if (tagged.length) return bindToCsvId(tagged, sid);
  if (opts?.uuidTag) {
    const first = firstProduct(live);
    if (first.length) return bindToCsvId(first, sid);
  }
  if (csvName) {
    const named = pickByName(cards, csvName, opts?.setName);
    if (named.length) return bindToCsvId(named, sid);
  }
  return [];
}

function offersFromIdPage(html: string, sid: string, fetchedAt: string): PlaymantisOffer[] {
  return resolveOffersForScryfallId(
    parsePlaymantisCards(html, fetchedAt, sid),
    sid,
    "",
    { uuidTag: true },
  );
}

function indexNamePageOffers(html: string, fetchedAt: string, into: ParsedOffer[]): void {
  into.push(...parsePlaymantisCards(html, fetchedAt).filter((o) => !o.missing));
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
  const report = () => {
    done += 1;
    input.onBatch?.(done, uniqueIds.length);
  };

  const skipNameSearch = new Set<string>();
  await runInBatches(uniqueIds, async (sid) => {
    const previous = goodOffers(byId.get(sid));
    try {
      const html = await fetchWithRetry(playmantisSearchUrl(sid));
      const kind = classifyBuylistSearchHtml(html);
      const next = kind === "hit" ? offersFromIdPage(html, sid, fetchedAt) : [];
      if (goodOffers(next).length) {
        byId.set(sid, next);
      } else if (previous.length) {
        byId.set(sid, previous);
      } else if (kind === "blocked") {
        skipNameSearch.add(sid);
      }
    } catch {
      if (previous.length) byId.set(sid, previous);
      else skipNameSearch.add(sid);
    }
    report();
  });

  const unmatched = uniqueIds.filter(
    (sid) => !goodOffers(byId.get(sid)).length && !skipNameSearch.has(sid),
  );
  const uniqueNames = [
    ...new Set(
      unmatched
        .map((sid) => (input.namesById?.[sid] || "").trim())
        .filter(Boolean),
    ),
  ];

  if (unmatched.length && uniqueNames.length) {
    const offersByName = new Map<string, ParsedOffer[]>();
    await runInBatches(uniqueNames, async (name) => {
      const collected: ParsedOffer[] = [];
      try {
        const firstUrl = playmantisNameSearchUrl(name);
        const firstHtml = await fetchWithRetry(firstUrl);
        indexNamePageOffers(firstHtml, fetchedAt, collected);
        const capped = Math.min(maxPageFromHtml(firstHtml), IMPORT_MAX_PAGES_PER_NAME);
        if (capped > 1) {
          const rest = await Promise.all(
            Array.from({ length: capped - 1 }, (_, i) =>
              fetchWithRetry(playmantisNameSearchUrl(name, i + 2)),
            ),
          );
          for (const html of rest) indexNamePageOffers(html, fetchedAt, collected);
        }
      } catch {
        /* row stays unmatched */
      }
      offersByName.set(name, collected);
    });

    for (const sid of unmatched) {
      const name = input.namesById?.[sid] || "";
      const setName = input.setNamesById?.[sid] || "";
      const parsed = offersByName.get(name) || [];
      const offers = resolveOffersForScryfallId(parsed, sid, name, { setName });
      if (offers.length) byId.set(sid, offers);
    }
  }

  return uniqueIds.flatMap((id) => {
    const previous = goodOffers(byId.get(id));
    if (previous.length) return previous;
    return missingStub(id, input.namesById?.[id] || "", fetchedAt);
  });
}
