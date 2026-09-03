import type { ManaBoxRow } from "../schema";

/** RFC-ish CSV with quotes; ManaBox exports quoted names when needed. */
export function parseCsv(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    const next = input[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\r") {
      continue;
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim()));
}

function headerIndex(headers: string[], ...aliases: string[]): number {
  const wanted = aliases.map((a) => a.toLowerCase());
  return headers.findIndex((h) => wanted.includes(h.toLowerCase().trim()));
}

export function parseManaBoxCsv(text: string): ManaBoxRow[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());
  const nameI = headerIndex(headers, "Name");
  const setI = headerIndex(headers, "Set code", "Set Code");
  const setNameI = headerIndex(headers, "Set name", "Set Name");
  const collectorI = headerIndex(headers, "Collector number", "Collector Number");
  const foilI = headerIndex(headers, "Foil");
  const qtyI = headerIndex(headers, "Quantity");
  const scryI = headerIndex(headers, "Scryfall ID", "Scryfall Id");
  const rarityI = headerIndex(headers, "Rarity");
  const priceI = headerIndex(headers, "Purchase price", "Purchase Price");
  const currencyI = headerIndex(headers, "Purchase price currency", "Purchase Price Currency");
  if (nameI < 0 || setI < 0 || qtyI < 0) {
    throw new Error("Not a ManaBox CSV — need Name, Set code, and Quantity columns.");
  }

  const out: ManaBoxRow[] = [];
  for (const cells of rows.slice(1)) {
    const name = (cells[nameI] || "").trim();
    if (!name) continue;
    const quantity = Number(cells[qtyI] || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    const priceRaw = priceI >= 0 ? Number((cells[priceI] || "").trim()) : NaN;
    const purchasePriceCents =
      Number.isFinite(priceRaw) && priceRaw > 0 ? Math.round(priceRaw * 100) : 0;
    out.push({
      name,
      setCode: (cells[setI] || "").trim(),
      setName: setNameI >= 0 ? (cells[setNameI] || "").trim() : "",
      collectorNumber: collectorI >= 0 ? (cells[collectorI] || "").trim() : "",
      foil: foilI >= 0 ? (cells[foilI] || "normal").trim() : "normal",
      quantity,
      scryfallId: scryI >= 0 ? (cells[scryI] || "").trim() : "",
      rarity: rarityI >= 0 ? (cells[rarityI] || "").trim() : "",
      purchasePriceCents,
      purchaseCurrency:
        currencyI >= 0 ? (cells[currencyI] || "").trim().toUpperCase() : "",
    });
  }
  return out;
}

/** Majority “Purchase price currency”. Empty if the file has none. */
export function majorityPurchaseCurrency(rows: ManaBoxRow[]): {
  currency: string;
  mixed: boolean;
  missing: boolean;
} {
  const counts = new Map<string, number>();
  let blank = 0;
  for (const row of rows) {
    const c = (row.purchaseCurrency || "").trim().toUpperCase();
    if (!c) {
      blank += 1;
      continue;
    }
    counts.set(c, (counts.get(c) || 0) + 1);
  }
  let currency = "";
  let top = 0;
  for (const [code, n] of counts) {
    if (n > top) {
      currency = code;
      top = n;
    }
  }
  return {
    currency,
    mixed: counts.size > 1,
    missing: !currency || blank === rows.length,
  };
}

export function uniqueSetCodes(rows: ManaBoxRow[]): string[] {
  const sets = new Set<string>();
  for (const row of rows) {
    const code = row.setCode.trim().toLowerCase();
    if (code) sets.add(code);
  }
  return [...sets].sort();
}

export function uniqueScryfallIds(rows: ManaBoxRow[]): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    const id = row.scryfallId.trim().toLowerCase();
    if (id) ids.add(id);
  }
  return [...ids];
}
