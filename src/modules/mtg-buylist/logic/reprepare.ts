import type { ManaBoxRow } from "../schema";
import { normalizeCardName, normalizeFinish, normalizeSetCode } from "./names";
import { manaBoxRowsToCsv, parseManaBoxCsv } from "./parse-csv";

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

/** Same columns as this app’s ManaBox template / Playmantis importer. */
export function parseSubmissionCsv(text: string): ManaBoxRow[] {
  return parseManaBoxCsv(text);
}

function sameIdFinish(row: ManaBoxRow, sold: ManaBoxRow): boolean {
  const id = sold.scryfallId.trim().toLowerCase();
  if (!id) return false;
  return row.scryfallId.trim().toLowerCase() === id && normalizeFinish(row.foil) === normalizeFinish(sold.foil);
}

function sameNameSetFinish(
  row: ManaBoxRow,
  sold: ManaBoxRow,
  requireCollector: boolean,
): boolean {
  if (normalizeCardName(row.name).name !== normalizeCardName(sold.name).name) return false;
  if (normalizeSetCode(row.setCode) !== normalizeSetCode(sold.setCode)) return false;
  if (normalizeFinish(row.foil) !== normalizeFinish(sold.foil)) return false;
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
    removedCopies += taken;
    if (taken < line.quantity) {
      unmatched.push({
        name: line.name,
        setCode: line.setCode,
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
