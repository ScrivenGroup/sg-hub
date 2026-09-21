import type { ManaBoxRow, PreconDeck } from "../schema";
import { manaBoxRowKey } from "./allocate";
import { manaBoxRowsToCsv } from "./parse-csv";
import type { PreconDestLine } from "./precon-assess";

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function money(cents: number) {
  return (cents / 100).toFixed(2);
}

/** Visible table as CSV — export as shown. */
export function destTableCsv(rows: PreconDestLine[]): string {
  const headers = [
    "uid",
    "Card",
    "Set",
    "#",
    "Rarity",
    "Finish",
    "Have",
    "Mate cash",
    "Mate cash want",
    "Mate credit",
    "PM credit",
    "PM want",
    "CK",
    "Win",
  ];
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(
      [
        String(row.uid),
        csvEscape(row.name),
        csvEscape(row.setCode),
        csvEscape(row.collectorNumber),
        csvEscape(row.rarityCode || row.rarity),
        csvEscape(row.foil),
        String(row.qty),
        money(row.mateCashCents),
        String(row.mateWanted),
        money(row.mateCreditCents),
        money(row.playmantisCreditCents),
        String(row.playmantisWanted),
        money(row.ckListedUsdCents),
        row.dest,
      ].join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

/** Visible table as plain text — export as shown. */
export function destTableTxt(rows: PreconDestLine[]): string {
  return rows
    .map((row) => {
      const mate = row.mateCashCents > 0 ? `cash $${money(row.mateCashCents)} w${row.mateWanted}` : "—";
      const mateCr = row.mateCreditCents > 0 ? `cr $${money(row.mateCreditCents)}` : "—";
      const pm = row.playmantisCreditCents > 0 ? `$${money(row.playmantisCreditCents)} w${row.playmantisWanted}` : "—";
      const ck = row.ckListedUsdCents > 0 ? `$${money(row.ckListedUsdCents)}` : "—";
      return [
        row.uid,
        row.name,
        row.setCode,
        row.collectorNumber || "—",
        row.rarityCode || row.rarity || "—",
        row.foil || "normal",
        row.qty,
        mate,
        mateCr,
        pm,
        ck,
        row.dest,
      ].join("\t");
    })
    .join("\n");
}

export function canExportManaBox(source: string): boolean {
  return source === "manabox-csv" || source === "manabox-txt";
}

/** Visible rows back into a ManaBox-shaped CSV. */
export function destManaBoxCsv(deck: PreconDeck, rows: PreconDestLine[]): string {
  const byKey = new Map(deck.rows.map((row) => [manaBoxRowKey(row), row]));
  const picked: ManaBoxRow[] = [];
  for (const line of rows) {
    const row = byKey.get(line.rowKey);
    if (row) picked.push(row);
  }
  return manaBoxRowsToCsv(picked);
}
