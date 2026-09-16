import type { ManaBoxRow } from "../schema";
import { scryfallImageUrl } from "./images";
import { csvFinishToMate, normalizeCardName, normalizeFinish, normalizeSetCode } from "./names";
import { manaBoxRowsToCsv } from "./parse-csv";
import { parseSubmissionText } from "./parse-submissions";
import { cardLookupKey, type CardHint, type CardLookup } from "./scryfall";

export type CardIdHints = Record<string, string | CardHint>;

export type UnmatchedSold = {
  name: string;
  setCode: string;
  foil: string;
  quantity: number;
  remaining: number;
  reason: string;
};

export type ReprepareResult = {
  leftover: ManaBoxRow[];
  leftoverCsv: string;
  removedCopies: number;
  leftoverCopies: number;
  unmatched: UnmatchedSold[];
};

/** Playmantis .eml, saved Mate order HTML, or ManaBox-shaped CSV. */
export function parseSubmissionCsv(text: string): ManaBoxRow[] {
  return parseSubmissionText(text);
}

export function normalizeSetName(raw: string): string {
  return (raw || "")
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sameIdFinish(row: ManaBoxRow, sold: ManaBoxRow): boolean {
  const id = sold.scryfallId.trim().toLowerCase();
  if (!id) return false;
  return row.scryfallId.trim().toLowerCase() === id && normalizeFinish(row.foil) === normalizeFinish(sold.foil);
}

function sameNameFinish(row: ManaBoxRow, sold: ManaBoxRow): boolean {
  return (
    normalizeCardName(row.name).name === normalizeCardName(sold.name).name &&
    normalizeFinish(row.foil) === normalizeFinish(sold.foil)
  );
}

function sameNameSetFinish(
  row: ManaBoxRow,
  sold: ManaBoxRow,
  requireCollector: boolean,
): boolean {
  if (!sameNameFinish(row, sold)) return false;
  const soldCode = normalizeSetCode(sold.setCode);
  const soldSetName = normalizeSetName(sold.setName || "");
  const rowCode = normalizeSetCode(row.setCode);
  const rowSetName = normalizeSetName(row.setName || "");
  const setOk =
    (soldCode && soldCode === rowCode) ||
    (soldSetName && (soldSetName === rowSetName || soldSetName === rowCode)) ||
    (soldCode && soldCode === rowSetName);
  if (!setOk) return false;
  if (!requireCollector) return true;
  const soldCol = (sold.collectorNumber || "").trim();
  if (!soldCol) return false;
  return (row.collectorNumber || "").trim() === soldCol;
}

function consume(remaining: ManaBoxRow[], sold: ManaBoxRow, pred: (row: ManaBoxRow) => boolean): number {
  let need = sold.quantity;
  let taken = 0;
  for (const row of remaining) {
    if (need <= 0) break;
    if (row.quantity <= 0) continue;
    if (!pred(row)) continue;
    const take = Math.min(row.quantity, need);
    row.quantity -= take;
    need -= take;
    taken += take;
  }
  return taken;
}

/**
 * Leftover ManaBox collection = original run CSV minus copies listed on store
 * submission files (what actually went to Playmantis / Mate after pick).
 */
export function subtractSoldFromManaBox(
  original: ManaBoxRow[],
  soldLists: ManaBoxRow[][],
): ReprepareResult {
  const remaining = original.map((row) => ({ ...row }));
  const unmatched: UnmatchedSold[] = [];
  let removedCopies = 0;

  for (const line of soldLists.flat()) {
    if (!(line.quantity > 0)) continue;
    let taken = 0;
    if (line.scryfallId.trim()) {
      taken += consume(remaining, { ...line, quantity: line.quantity - taken }, (row) =>
        sameIdFinish(row, line),
      );
    }
    if (taken < line.quantity && (line.collectorNumber || "").trim()) {
      taken += consume(remaining, { ...line, quantity: line.quantity - taken }, (row) =>
        sameNameSetFinish(row, line, true),
      );
    }
    if (taken < line.quantity) {
      taken += consume(remaining, { ...line, quantity: line.quantity - taken }, (row) =>
        sameNameSetFinish(row, line, false),
      );
    }
    if (taken < line.quantity) {
      const hits = remaining.filter((row) => row.quantity > 0 && sameNameFinish(row, line));
      if (hits.length === 1) {
        taken += consume(remaining, { ...line, quantity: line.quantity - taken }, (row) =>
          sameNameFinish(row, line),
        );
      }
    }
    removedCopies += taken;
    if (taken < line.quantity) {
      unmatched.push({
        name: line.name,
        setCode: line.setCode || line.setName || "",
        foil: line.foil,
        quantity: line.quantity,
        remaining: line.quantity - taken,
        reason: line.scryfallId.trim()
          ? "No matching printing left in the original CSV"
          : "Could not match name/set/finish to the original CSV",
      });
    }
  }

  const leftover = remaining.filter((row) => row.quantity > 0);
  return {
    leftover,
    leftoverCsv: manaBoxRowsToCsv(leftover),
    removedCopies,
    leftoverCopies: leftover.reduce((sum, row) => sum + row.quantity, 0),
    unmatched,
  };
}

export type SourceListRow = {
  name: string;
  setCode: string;
  collectorNumber: string;
  finishLabel: string;
  quantity: number;
  imageUrl: string;
  imageAmbiguous: boolean;
};

export type OuterJoinRow = {
  name: string;
  setCode: string;
  collectorNumber: string;
  finishLabel: string;
  csvQty: number;
  mmQty: number;
  pmQty: number;
  remaining: number;
  note: string;
  scryfallId: string;
  ownedImageUrl: string;
  imageAmbiguous: boolean;
  leftoverRow: ManaBoxRow | null;
};

type ResolvedPrinting = ManaBoxRow & { imagePrecise: boolean };

export type JoinView =
  | "master"
  | "reimport"
  | "csv"
  | "mate"
  | "pm"
  | "noncsv"
  | "sold"
  | "oversold"
  | "unsold";

export function filterJoinRows(rows: OuterJoinRow[], view: JoinView): OuterJoinRow[] {
  switch (view) {
    case "reimport":
      return rows.filter((row) => row.remaining > 0);
    case "csv":
      return rows.filter((row) => row.csvQty > 0);
    case "mate":
      return rows.filter((row) => row.mmQty > 0);
    case "pm":
      return rows.filter((row) => row.pmQty > 0);
    case "noncsv":
      return rows.filter((row) => row.csvQty <= 0);
    case "sold":
      return rows.filter((row) => row.csvQty > 0 && row.remaining === 0);
    case "oversold":
      return rows.filter((row) => row.remaining < 0);
    case "unsold":
      return rows.filter((row) => row.csvQty > 0 && row.mmQty === 0 && row.pmQty === 0);
    default:
      return rows;
  }
}

export type OuterJoinResult = {
  csv: SourceListRow[];
  pm: SourceListRow[];
  mm: SourceListRow[];
  join: OuterJoinRow[];
  reimport: SourceListRow[];
  leftoverCsv: string;
  leftoverCopies: number;
  removedCopies: number;
};

/** Set name → code from this run’s CSV. Unique official names only. */
export function setCodeMapFromCsv(csv: ManaBoxRow[]): Record<string, string> {
  const counts = new Map<string, Set<string>>();
  for (const row of csv) {
    const name = normalizeSetName(row.setName || "");
    const code = normalizeSetCode(row.setCode);
    if (!name || !code) continue;
    const set = counts.get(name) || new Set<string>();
    set.add(code);
    counts.set(name, set);
  }
  const out: Record<string, string> = {};
  for (const [name, codes] of counts) {
    if (codes.size === 1) out[name] = [...codes][0];
  }
  return out;
}

function displaySetCode(row: ManaBoxRow): string {
  const code = normalizeSetCode(row.setCode);
  return code ? code.toUpperCase() : (row.setName || "").trim();
}

function hintOf(value: string | CardHint | undefined): CardHint | null {
  if (!value) return null;
  if (typeof value === "string") {
    return value.trim() ? { scryfallId: value.trim(), collectorNumber: "" } : null;
  }
  return value.scryfallId.trim() ? value : null;
}

function lookedUpHint(row: ManaBoxRow, cardIds: CardIdHints): CardHint | null {
  const setCode = normalizeSetCode(row.setCode);
  if (!setCode) return null;
  const col = (row.collectorNumber || "").trim();
  return (
    (col && hintOf(cardIds[cardLookupKey({ name: row.name, setCode, collectorNumber: col })])) ||
    hintOf(cardIds[cardLookupKey({ name: row.name, setCode })])
  );
}

function resolvePrinting(
  row: ManaBoxRow,
  csv: ManaBoxRow[],
  extraSetCodes: Record<string, string>,
  cardIds: CardIdHints = {},
): ResolvedPrinting {
  const catalog = setCodeMapFromCsv(csv);
  let setCode = normalizeSetCode(row.setCode);
  const setName = normalizeSetName(row.setName || "");
  if (!setCode && setName) {
    setCode = catalog[setName] || extraSetCodes[setName] || "";
  }
  let scryfallId = row.scryfallId.trim();
  let collectorNumber = (row.collectorNumber || "").trim();
  let imagePrecise = Boolean(scryfallId);
  const hit = findCsvMatch(csv, { ...row, setCode: setCode || row.setCode });
  if (hit) {
    if (!setCode) setCode = normalizeSetCode(hit.setCode);
    if (!scryfallId && hit.scryfallId.trim()) {
      scryfallId = hit.scryfallId.trim();
      imagePrecise = true;
    }
    if (!collectorNumber) collectorNumber = (hit.collectorNumber || "").trim();
  }
  if (scryfallId) {
    return { ...row, setCode, scryfallId, collectorNumber, imagePrecise };
  }
  const lookedUp = lookedUpHint({ ...row, setCode, collectorNumber }, cardIds);
  if (lookedUp) {
    return {
      ...row,
      setCode,
      scryfallId: lookedUp.scryfallId,
      collectorNumber: collectorNumber || lookedUp.collectorNumber || "",
      imagePrecise: false,
    };
  }
  return { ...row, setCode, scryfallId: "", collectorNumber, imagePrecise: false };
}

function findCsvMatch(csv: ManaBoxRow[], sold: ManaBoxRow): ManaBoxRow | undefined {
  if (sold.scryfallId.trim()) {
    const idHit = csv.find((row) => sameIdFinish(row, sold));
    if (idHit) return idHit;
  }
  if ((sold.collectorNumber || "").trim()) {
    const colHit = csv.find((row) => sameNameSetFinish(row, sold, true));
    if (colHit) return colHit;
  }
  const setHit = csv.find((row) => sameNameSetFinish(row, sold, false));
  if (setHit) return setHit;
  const nameHits = csv.filter((row) => sameNameFinish(row, sold));
  return nameHits.length === 1 ? nameHits[0] : undefined;
}

function sourceKey(
  row: Pick<SourceListRow, "name" | "setCode" | "collectorNumber" | "finishLabel">,
): string {
  return `${normalizeCardName(row.name).name}|${normalizeSetCode(row.setCode) || normalizeSetName(row.setCode)}|${(row.collectorNumber || "").trim()}|${normalizeFinish(row.finishLabel)}`;
}

function toSourceRow(row: ResolvedPrinting): SourceListRow {
  const imageUrl = scryfallImageUrl(row.scryfallId);
  return {
    name: row.name,
    setCode: displaySetCode(row),
    collectorNumber: (row.collectorNumber || "").trim(),
    finishLabel: csvFinishToMate(row.foil),
    quantity: row.quantity,
    imageUrl,
    imageAmbiguous: Boolean(imageUrl && !row.imagePrecise),
  };
}

export function buildSourceList(
  rows: ManaBoxRow[],
  csv: ManaBoxRow[],
  extraSetCodes: Record<string, string> = {},
  cardIds: CardIdHints = {},
): SourceListRow[] {
  const merged = new Map<string, SourceListRow>();
  for (const raw of rows) {
    if (!(raw.quantity > 0)) continue;
    const row = toSourceRow(resolvePrinting(raw, csv, extraSetCodes, cardIds));
    const key = sourceKey(row);
    const prev = merged.get(key);
    if (prev) {
      prev.quantity += row.quantity;
      if (!prev.imageUrl || (prev.imageAmbiguous && !row.imageAmbiguous && row.imageUrl)) {
        prev.imageUrl = row.imageUrl;
        prev.imageAmbiguous = row.imageAmbiguous;
      }
    } else {
      merged.set(key, { ...row });
    }
  }
  return [...merged.values()];
}

function joinNote(csvQty: number, mmQty: number, pmQty: number, remaining: number): string {
  if (csvQty <= 0) return "Store-only — not in this CSV";
  if (remaining < 0) return "Oversold — sold more than this run listed";
  if (remaining === 0 && (mmQty > 0 || pmQty > 0)) return "Sold — gone";
  if (remaining > 0 && mmQty === 0 && pmQty === 0) return "Not on either buylist — keep";
  if (remaining > 0) return `Partial pick — keep ${remaining}`;
  return "";
}

type JoinSlot = {
  row: ResolvedPrinting;
  csvQty: number;
  mmQty: number;
  pmQty: number;
};

function asManaBoxRow(row: ResolvedPrinting): ManaBoxRow {
  const { imagePrecise: _precise, ...mana } = row;
  void _precise;
  return mana;
}

function firstMatchIndex(slots: JoinSlot[], pred: (row: ManaBoxRow) => boolean): number {
  return slots.findIndex((slot) => pred(slot.row));
}

function allocateStoreLine(slots: JoinSlot[], line: ManaBoxRow, store: "mm" | "pm"): number {
  const add = (index: number, qty: number) => {
    if (index < 0 || qty <= 0) return;
    slots[index][store === "mm" ? "mmQty" : "pmQty"] += qty;
  };

  let need = line.quantity;
  const tryConsume = (pred: (row: ManaBoxRow) => boolean) => {
    for (let i = 0; i < slots.length && need > 0; i += 1) {
      if (!pred(slots[i].row)) continue;
      const room = Math.max(0, slots[i].csvQty - slots[i].mmQty - slots[i].pmQty);
      if (room <= 0) continue;
      const take = Math.min(room, need);
      add(i, take);
      need -= take;
    }
    if (need > 0) {
      const overflow = firstMatchIndex(slots, pred);
      if (overflow >= 0) {
        add(overflow, need);
        need = 0;
      }
    }
  };

  if (line.scryfallId.trim()) tryConsume((row) => sameIdFinish(row, line));
  if (need > 0 && (line.collectorNumber || "").trim()) {
    tryConsume((row) => sameNameSetFinish(row, line, true));
  }
  if (need > 0) tryConsume((row) => sameNameSetFinish(row, line, false));
  if (need > 0) {
    const hits = slots.filter((slot) => sameNameFinish(slot.row, line));
    if (hits.length === 1) tryConsume((row) => sameNameFinish(row, line));
  }
  return line.quantity - need;
}

function storeOnlyRow(resolved: ResolvedPrinting, mmQty: number, pmQty: number): OuterJoinRow {
  const remaining = -mmQty - pmQty;
  const ownedImageUrl = scryfallImageUrl(resolved.scryfallId);
  return {
    name: resolved.name,
    setCode: displaySetCode(resolved),
    collectorNumber: (resolved.collectorNumber || "").trim(),
    finishLabel: csvFinishToMate(resolved.foil),
    csvQty: 0,
    mmQty,
    pmQty,
    remaining,
    note: joinNote(0, mmQty, pmQty, remaining),
    scryfallId: resolved.scryfallId || "",
    ownedImageUrl,
    imageAmbiguous: Boolean(ownedImageUrl && !resolved.imagePrecise),
    leftoverRow: null,
  };
}

/**
 * Outer join of this run’s CSV, Playmantis receipt, and Mate accepted order.
 * Remaining = CSV − MM − PM. Re-import is Remaining > 0.
 */
export function buildOuterJoin(
  csv: ManaBoxRow[],
  pmRows: ManaBoxRow[],
  mmRows: ManaBoxRow[],
  extraSetCodes: Record<string, string> = {},
  cardIds: CardIdHints = {},
): OuterJoinResult {
  const resolvedCsv = csv.map((row) => resolvePrinting(row, csv, extraSetCodes, cardIds));
  const resolvedPm = pmRows.map((row) => resolvePrinting(row, csv, extraSetCodes, cardIds));
  const resolvedMm = mmRows.map((row) => resolvePrinting(row, csv, extraSetCodes, cardIds));
  const slots: JoinSlot[] = resolvedCsv.map((row) => ({
    row,
    csvQty: row.quantity,
    mmQty: 0,
    pmQty: 0,
  }));

  const storeOnly: OuterJoinRow[] = [];
  const leftoverPm = new Map<string, OuterJoinRow>();
  const leftoverMm = new Map<string, OuterJoinRow>();

  for (const line of resolvedPm) {
    if (!(line.quantity > 0)) continue;
    const taken = allocateStoreLine(slots, line, "pm");
    if (taken < line.quantity) {
      const extra = storeOnlyRow(line, 0, line.quantity - taken);
      const key = sourceKey(extra);
      const prev = leftoverPm.get(key);
      if (prev) prev.pmQty += extra.pmQty;
      else leftoverPm.set(key, extra);
    }
  }
  for (const line of resolvedMm) {
    if (!(line.quantity > 0)) continue;
    const taken = allocateStoreLine(slots, line, "mm");
    if (taken < line.quantity) {
      const extra = storeOnlyRow(line, line.quantity - taken, 0);
      const key = sourceKey(extra);
      const prev = leftoverMm.get(key);
      if (prev) prev.mmQty += extra.mmQty;
      else leftoverMm.set(key, extra);
    }
  }

  for (const row of leftoverPm.values()) {
    row.remaining = -row.mmQty - row.pmQty;
    row.note = joinNote(0, row.mmQty, row.pmQty, row.remaining);
    storeOnly.push(row);
  }
  for (const row of leftoverMm.values()) {
    const key = sourceKey(row);
    const existing = storeOnly.find((item) => sourceKey(item) === key);
    if (existing) {
      existing.mmQty += row.mmQty;
      existing.remaining = -existing.mmQty - existing.pmQty;
      existing.note = joinNote(0, existing.mmQty, existing.pmQty, existing.remaining);
    } else {
      row.remaining = -row.mmQty - row.pmQty;
      row.note = joinNote(0, row.mmQty, row.pmQty, row.remaining);
      storeOnly.push(row);
    }
  }

  const join: OuterJoinRow[] = slots.map((slot) => {
    const remaining = slot.csvQty - slot.mmQty - slot.pmQty;
    const ownedImageUrl = scryfallImageUrl(slot.row.scryfallId);
    return {
      name: slot.row.name,
      setCode: displaySetCode(slot.row),
      collectorNumber: (slot.row.collectorNumber || "").trim(),
      finishLabel: csvFinishToMate(slot.row.foil),
      csvQty: slot.csvQty,
      mmQty: slot.mmQty,
      pmQty: slot.pmQty,
      remaining,
      note: joinNote(slot.csvQty, slot.mmQty, slot.pmQty, remaining),
      scryfallId: slot.row.scryfallId || "",
      ownedImageUrl,
      imageAmbiguous: Boolean(ownedImageUrl && !slot.row.imagePrecise),
      leftoverRow:
        remaining > 0
          ? { ...asManaBoxRow(slot.row), quantity: remaining }
          : null,
    };
  });
  join.push(...storeOnly);

  const leftover = join
    .map((row) => row.leftoverRow)
    .filter((row): row is ManaBoxRow => Boolean(row && row.quantity > 0));
  const leftoverCopies = leftover.reduce((sum, row) => sum + row.quantity, 0);
  const removedCopies = join.reduce((sum, row) => {
    if (row.csvQty <= 0) return sum;
    return sum + Math.min(row.csvQty, row.mmQty + row.pmQty);
  }, 0);

  return {
    csv: buildSourceList(resolvedCsv, csv, extraSetCodes, cardIds),
    pm: buildSourceList(resolvedPm, csv, extraSetCodes, cardIds),
    mm: buildSourceList(resolvedMm, csv, extraSetCodes, cardIds),
    join,
    reimport: join
      .filter((row) => row.leftoverRow && row.leftoverRow.quantity > 0)
      .map((row) => ({
        name: row.name,
        setCode: row.setCode,
        collectorNumber: row.collectorNumber,
        finishLabel: row.finishLabel,
        quantity: row.leftoverRow?.quantity || 0,
        imageUrl: row.ownedImageUrl,
        imageAmbiguous: row.imageAmbiguous,
      })),
    leftoverCsv: manaBoxRowsToCsv(leftover),
    leftoverCopies,
    removedCopies,
  };
}

function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Master change list: CSV vs Mate vs Playmantis vs leftover. */
export function outerJoinCsv(rows: OuterJoinRow[]): string {
  const header = ["Name", "Set", "#", "Finish", "CSV", "Mate", "Playmantis", "Left", "Note"];
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [
        csvCell(row.name),
        csvCell(row.setCode),
        csvCell(row.collectorNumber),
        csvCell(row.finishLabel),
        String(row.csvQty),
        String(row.mmQty),
        String(row.pmQty),
        String(row.remaining),
        csvCell(row.note),
      ].join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

function isSetCode(raw: string): boolean {
  return /^[a-z0-9]{2,6}$/.test(normalizeSetCode(raw));
}

/** Rows that still have no Scryfall image after CSV / store matching. */
export function rowsNeedingScryfallImages(join: OuterJoinResult): CardLookup[] {
  const seen = new Set<string>();
  const out: CardLookup[] = [];
  const consider = (name: string, setCode: string, collectorNumber = "") => {
    if (!name.trim() || !isSetCode(setCode)) return;
    const lookup = {
      name,
      setCode: normalizeSetCode(setCode),
      collectorNumber: collectorNumber.trim() || undefined,
    };
    const key = cardLookupKey(lookup);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(lookup);
  };
  for (const row of [...join.csv, ...join.pm, ...join.mm]) {
    if (row.imageUrl) continue;
    consider(row.name, row.setCode, row.collectorNumber);
  }
  for (const row of join.join) {
    if (row.ownedImageUrl) continue;
    consider(row.name, row.setCode, row.collectorNumber);
  }
  return out;
}
