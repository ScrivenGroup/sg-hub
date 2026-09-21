import { readFileSync } from "fs";
import path from "path";
import type { PreconDeck } from "../../schema";
import { parseManaBoxCsv } from "../../logic/parse-csv";
import { manaBoxCopyCount } from "../../logic/parse-txt";

export const TURTLE_POWER_ID = "tmt-turtle-power";
export const TURTLE_POWER_SOURCE_URL =
  "https://magic.wizards.com/en/news/announcements/teenage-mutant-ninja-turtles-commander-decklist";

const CSV_PATH = path.join(process.cwd(), "src/modules/mtg-buylist/fixtures/precons/TMT_.csv");

export function loadTurtlePowerDeck(): PreconDeck {
  const text = readFileSync(CSV_PATH, "utf8");
  const rows = parseManaBoxCsv(text);
  if (manaBoxCopyCount(rows) < 90) {
    throw new Error("Turtle Power fixture CSV did not parse to a 100-card deck.");
  }
  return {
    id: TURTLE_POWER_ID,
    name: "Turtle Power!",
    productName: "Teenage Mutant Ninja Turtles Commander",
    year: "2026",
    setCode: "TMC",
    releasedAt: "2026-03-06",
    faceCommander: "Leonardo, the Balance",
    source: "fixture",
    sourceUrl: TURTLE_POWER_SOURCE_URL,
    createdAt: "2026-09-21T00:41:49.138Z",
    lastHarvestedAt: "",
    rows,
  };
}
