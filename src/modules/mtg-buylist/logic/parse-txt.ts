import type { ManaBoxRow } from "../schema";

/** ManaBox deck share: `[SET NAME]` then `1 Name (SET) CN` with optional `*F*`. */
const LINE =
  /^(\d+)\s+(.+?)\s+\(([A-Za-z0-9]+)\)\s+(\S+?)(?:\s+\*F\*)?\s*$/;

export function parseManaBoxTxt(text: string): ManaBoxRow[] {
  const input = text.replace(/^\uFEFF/, "").replace(/\r/g, "");
  const out: ManaBoxRow[] = [];
  for (const raw of input.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("[")) continue;
    const match = line.match(LINE);
    if (!match) continue;
    const quantity = Number(match[1]);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    const foil = /\*F\*\s*$/.test(line) ? "foil" : "normal";
    out.push({
      name: match[2].trim(),
      setCode: match[3].trim(),
      setName: "",
      collectorNumber: match[4].trim(),
      foil,
      quantity,
      scryfallId: "",
      rarity: "",
      purchasePriceCents: 0,
      purchaseCurrency: "",
      frameEffects: [],
    });
  }
  return out;
}

export function manaBoxCopyCount(rows: ManaBoxRow[]): number {
  return rows.reduce((sum, row) => sum + (row.quantity || 0), 0);
}
