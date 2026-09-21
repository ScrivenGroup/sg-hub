import { readFileSync } from "fs";
import path from "path";
import type { PreconDeck } from "../../schema";
import { parseCsv } from "../../logic/parse-csv";
import { skuForGroup } from "../../logic/precon-sku";

const CSV_PATH = path.join(
  process.cwd(),
  "src/modules/mtg-buylist/fixtures/precons/commander_decks_backbone.csv",
);

const MONTH: Record<string, string> = {
  Jan: "01",
  Feb: "02",
  Mar: "03",
  Apr: "04",
  May: "05",
  Jun: "06",
  Jul: "07",
  Aug: "08",
  Sep: "09",
  Oct: "10",
  Nov: "11",
  Dec: "12",
};

export function slugPreconId(year: string, group: string, name: string) {
  const slug = [year, group, name]
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "deck";
}

export function parseReleaseDate(raw: string, year: string): string {
  const text = raw.trim();
  const match = text.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/);
  if (!match) return "";
  const day = match[1].padStart(2, "0");
  const month = MONTH[match[2]] || "";
  if (!month) return "";
  const century = year.slice(0, 2) || "20";
  return `${century}${match[3]}-${month}-${day}`;
}

export function loadBackbonePlaceholders(): PreconDeck[] {
  const text = readFileSync(CSV_PATH, "utf8");
  const table = parseCsv(text);
  if (table.length < 2) return [];
  const header = table[0].map((cell) => cell.trim().toLowerCase());
  const yearI = header.indexOf("year");
  const groupI = header.indexOf("group");
  const dateI = header.indexOf("release date");
  const nameI = header.indexOf("deck name");
  const urlI = header.indexOf("official decklist link");
  const out: PreconDeck[] = [];
  const seen = new Set<string>();
  for (const cells of table.slice(1)) {
    const name = (cells[nameI] || "").trim();
    if (!name) continue;
    const year = (cells[yearI] || "").trim();
    const group = (cells[groupI] || "").trim();
    let id = slugPreconId(year, group, name);
    if (seen.has(id)) id = `${id}-${out.length}`;
    seen.add(id);
    out.push({
      id,
      name,
      productName: group,
      year,
      setCode: skuForGroup(group),
      releasedAt: parseReleaseDate(cells[dateI] || "", year),
      faceCommander: "",
      source: "placeholder",
      sourceUrl: (cells[urlI] || "").trim(),
      createdAt: "2026-09-21T00:00:00.000Z",
      lastHarvestedAt: "",
      rows: [],
    });
  }
  return out;
}
