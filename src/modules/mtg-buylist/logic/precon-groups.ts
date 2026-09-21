import type { ManaBoxRow, PreconDeck, PreconHarvestBook } from "../schema";
import { skuForGroup } from "./precon-sku";

export type PreconGroup = {
  name: string;
  sku: string;
  releasedAt: string;
  decks: PreconDeck[];
};

export type PreconYearGroup = {
  year: string;
  groups: PreconGroup[];
};

export type HarvestRag = "none" | "red" | "amber" | "green";

export function hasDeckList(deck: PreconDeck): boolean {
  return deck.rows.length > 0;
}

export function deckYear(deck: PreconDeck): string {
  if (deck.year.trim()) return deck.year.trim();
  if (/^\d{4}/.test(deck.releasedAt)) return deck.releasedAt.slice(0, 4);
  return "";
}

export function deckGroupName(deck: PreconDeck): string {
  return deck.productName.trim() || productSetCode(deck) || "Ungrouped";
}

/** Product wave — first set code, not the union of every card in the list. */
export function productSetCode(deck: PreconDeck): string {
  const raw = (deck.setCode || "").trim().toUpperCase();
  if (raw) return raw.split("/")[0]?.trim() || raw;
  return skuForGroup(deck.productName) || primarySetCode(deck.rows);
}

export function deckSkus(deck: PreconDeck): string[] {
  const codes = new Set<string>();
  const product = productSetCode(deck);
  if (product) codes.add(product);
  const mapped = skuForGroup(deck.productName);
  if (mapped) codes.add(mapped);
  for (const row of deck.rows) {
    const code = row.setCode.trim().toUpperCase();
    if (code) codes.add(code);
  }
  return [...codes];
}

export function deckSearchBlob(deck: PreconDeck): string {
  return [deck.name, deck.productName, deck.faceCommander, deck.year, ...deckSkus(deck)]
    .join(" ")
    .toLowerCase();
}

export function primarySetCode(rows: ManaBoxRow[]): string {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const code = row.setCode.trim().toUpperCase();
    if (!code) continue;
    counts.set(code, (counts.get(code) || 0) + (row.quantity || 1));
  }
  let best = "";
  let n = 0;
  for (const [code, qty] of counts) {
    if (qty > n) {
      best = code;
      n = qty;
    }
  }
  return best;
}

export function deckHarvestRag(deck: PreconDeck, book: PreconHarvestBook): HarvestRag {
  if (!hasDeckList(deck)) return "none";
  if (!deck.lastHarvestedAt) return "red";
  return book.source === "live" ? "green" : "amber";
}

function sortDecks(decks: PreconDeck[]) {
  return [...decks].sort((a, b) => a.name.localeCompare(b.name));
}

export function groupDecksByYear(decks: PreconDeck[]): PreconYearGroup[] {
  const years = new Map<string, Map<string, PreconDeck[]>>();
  for (const deck of decks) {
    const year = deckYear(deck) || "—";
    const group = deckGroupName(deck);
    const yearMap = years.get(year) || new Map<string, PreconDeck[]>();
    const list = yearMap.get(group) || [];
    list.push(deck);
    yearMap.set(group, list);
    years.set(year, yearMap);
  }
  const out: PreconYearGroup[] = [...years.entries()].map(([year, groups]) => ({
    year,
    groups: [...groups.entries()]
      .map(([name, members]) => ({
        name,
        sku: skuForGroup(name) || [...new Set(members.flatMap(deckSkus))].join("/"),
        releasedAt:
          members
            .map((deck) => deck.releasedAt)
            .filter(Boolean)
            .sort()
            .at(-1) || "",
        decks: sortDecks(members),
      }))
      .sort((a, b) => {
        if (a.releasedAt && b.releasedAt && a.releasedAt !== b.releasedAt) {
          return b.releasedAt.localeCompare(a.releasedAt);
        }
        if (a.releasedAt && !b.releasedAt) return -1;
        if (!a.releasedAt && b.releasedAt) return 1;
        return a.name.localeCompare(b.name);
      }),
  }));
  out.sort((a, b) => {
    if (a.year === "—") return 1;
    if (b.year === "—") return -1;
    return b.year.localeCompare(a.year);
  });
  return out;
}

/** @deprecated use groupDecksByYear — kept for tests that still want a flat set view */
export function groupDecksBySet(decks: PreconDeck[]): { setCode: string; releasedAt: string; decks: PreconDeck[] }[] {
  return groupDecksByYear(decks).flatMap((year) =>
    year.groups.map((group) => ({
      setCode: group.name,
      releasedAt: group.releasedAt,
      decks: group.decks,
    })),
  );
}
