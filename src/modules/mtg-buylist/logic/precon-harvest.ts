import type { ManaBoxRow, MateOffer, PlaymantisOffer, PreconDeck, PreconHarvestBook } from "../schema";
import { csvFinishToMate, normalizeCardName } from "./names";

/** Scripted Mate cash — sums to $60.00 so a $60 shop ask is buy-now. */
export const MOCK_MATE_CASH: Record<string, number> = {
  "City of Brass": 1500,
  "Spire Garden": 800,
  "Undergrowth Stadium": 800,
  "Irma, Part-Time Mutant": 700,
  "Endless Foot Assault": 400,
  "Ninja Pizza": 400,
  "Hidden Hideout": 400,
  Vigor: 350,
  "Sol Ring": 300,
  "Coin of Mastery": 250,
  "Continue?": 100,
};

/** Scripted Playmantis credit — sums to $40.00. */
export const MOCK_PM_CREDIT: Record<string, number> = {
  "Assassin's Trophy": 500,
  "Blasphemous Act": 450,
  "Chromatic Lantern": 450,
  "Fabled Passage": 400,
  "Wave Goodbye": 400,
  "Shredder, Shadow Master": 350,
  "Level Up": 300,
  "Big Mother Mouser": 250,
  "April O'Neil, Live on the Scene": 200,
  "Leonardo, the Balance": 200,
  "Donatello, the Brains": 150,
  "Raphael, the Muscle": 150,
  "Michelangelo, the Heart": 100,
  "Splinter, the Mentor": 100,
};

function byName(rows: ManaBoxRow[]): Map<string, ManaBoxRow> {
  const map = new Map<string, ManaBoxRow>();
  for (const row of rows) {
    if (!map.has(row.name)) map.set(row.name, row);
  }
  return map;
}

/** Listed at the store but want 0 — “would offer $x, not buying right now”. */
export const MOCK_MATE_CLOSED: Record<string, number> = {
  "Voracious Hydra": 800,
  "Biogenic Ooze": 500,
  "Steelbane Hydra": 400,
};

export const MOCK_PM_CLOSED: Record<string, number> = {
  Cultivate: 200,
  Harmonize: 150,
  "Acidic Slime": 100,
};

function mateOffer(row: ManaBoxRow, cashCents: number, quantity: number): MateOffer {
  return {
    mateUuid: `precon-mate-${row.scryfallId || row.name}`,
    name: row.name,
    setCode: row.setCode,
    finish: csvFinishToMate(row.foil),
    buyPriceCents: cashCents,
    creditPriceCents: Math.round(cashCents * 1.5),
    quantity,
    normalisedName: normalizeCardName(row.name).name,
    collectorNumber: row.collectorNumber || "",
    imageUrl: "",
    rarity: row.rarity || "",
  };
}

function pmOffer(
  row: ManaBoxRow,
  creditCents: number,
  fetchedAt: string,
  limit: number,
): PlaymantisOffer {
  return {
    scryfallId: row.scryfallId,
    title: row.name,
    finish: row.foil,
    creditCents,
    limit,
    missing: false,
    fetchedAt,
    imageUrl: "",
    setName: row.setName || "",
  };
}

/** Durable mock book from catalog rows. Later sitting replaces this writer with a live harvest. */
export function buildMockPreconHarvest(decks: PreconDeck[], harvestedAt: string): PreconHarvestBook {
  const rows = decks.flatMap((deck) => deck.rows);
  const named = byName(rows);
  const mate: MateOffer[] = [];
  const playmantis: PlaymantisOffer[] = [];
  const sets = new Set<string>();

  for (const [name, cash] of Object.entries(MOCK_MATE_CASH)) {
    const row = named.get(name);
    if (!row) continue;
    mate.push(mateOffer(row, cash, 99));
    if (row.setCode) sets.add(row.setCode.toLowerCase());
  }
  for (const [name, cash] of Object.entries(MOCK_MATE_CLOSED)) {
    const row = named.get(name);
    if (!row) continue;
    mate.push(mateOffer(row, cash, 0));
    if (row.setCode) sets.add(row.setCode.toLowerCase());
  }
  for (const [name, credit] of Object.entries(MOCK_PM_CREDIT)) {
    const row = named.get(name);
    if (!row?.scryfallId) continue;
    playmantis.push(pmOffer(row, credit, harvestedAt, 99));
  }
  for (const [name, credit] of Object.entries(MOCK_PM_CLOSED)) {
    const row = named.get(name);
    if (!row?.scryfallId) continue;
    playmantis.push(pmOffer(row, credit, harvestedAt, 0));
  }

  return {
    harvestedAt,
    source: "mock",
    mate: {
      harvestedAt,
      source: "upload",
      sets: [...sets].sort(),
      offers: mate,
    },
    playmantis: {
      fetchedAt: harvestedAt,
      offers: playmantis,
    },
  };
}
