import type {
  ManaBoxRow,
  PreconDeck,
  PreconDest,
  PreconHarvestBook,
  PreconVerdict,
} from "../schema";
import {
  findMate,
  findPlaymantis,
  indexMateOffers,
  indexPlaymantisOffers,
} from "./allocate";
import { manaBoxRowKey } from "./allocate";

export type PreconDestLine = {
  rowKey: string;
  dest: PreconDest;
  qty: number;
  name: string;
  setCode: string;
  collectorNumber: string;
  foil: string;
  rarity: string;
  mateCashCents: number;
  playmantisCreditCents: number;
  ckListedUsdCents: number;
};

export type PreconAssess = {
  shopAskAudCents: number;
  mateCashCents: number;
  mateCopies: number;
  playmantisCreditCents: number;
  playmantisCopies: number;
  leftoverCopies: number;
  leftoverCkUsdCents: number;
  deckCkUsdCents: number;
  cashOutlayCents: number;
  creditStore: string;
  keepValueCents: number;
  keepCopies: number;
  leftoverRarity: { rare: number; uncommon: number; common: number; other: number };
  harvestedAt: string;
  harvestSource: "mock" | "live" | "";
  verdict: PreconVerdict;
  lines: PreconDestLine[];
};

function rarityBucket(rarity: string): keyof PreconAssess["leftoverRarity"] {
  const key = rarity.trim().toLowerCase();
  if (key === "mythic" || key === "rare") return "rare";
  if (key === "uncommon") return "uncommon";
  if (key === "common") return "common";
  return "other";
}

function ckCents(row: ManaBoxRow): number {
  const cur = (row.purchaseCurrency || "").toUpperCase();
  if (cur && cur !== "USD") return 0;
  return row.purchasePriceCents > 0 ? row.purchasePriceCents * row.quantity : 0;
}

function decideVerdict(input: {
  shopAskAudCents: number;
  mateCashCents: number;
  playmantisCreditCents: number;
  deckCkUsdCents: number;
}): PreconVerdict {
  const { shopAskAudCents, mateCashCents, playmantisCreditCents, deckCkUsdCents } = input;
  if (shopAskAudCents <= 0) return "hard-pass";
  if (mateCashCents >= shopAskAudCents) return "buy-now";
  if (mateCashCents + playmantisCreditCents >= shopAskAudCents) return "consider-credit";
  if (deckCkUsdCents >= shopAskAudCents) return "consider-value";
  return "hard-pass";
}

export function assessPrecon(
  deck: PreconDeck,
  harvest: PreconHarvestBook,
  shopAskAudCents: number,
): PreconAssess {
  const mates = indexMateOffers(harvest.mate?.offers || []);
  const pm = indexPlaymantisOffers(harvest.playmantis?.offers || []);
  const lines: PreconDestLine[] = [];
  let mateCashCents = 0;
  let mateCopies = 0;
  let playmantisCreditCents = 0;
  let playmantisCopies = 0;
  let leftoverCopies = 0;
  let leftoverCkUsdCents = 0;
  let deckCkUsdCents = 0;
  const leftoverRarity = { rare: 0, uncommon: 0, common: 0, other: 0 };

  for (const row of deck.rows) {
    const listed = ckCents(row);
    deckCkUsdCents += listed;
    const mate = findMate(row, mates);
    const play = findPlaymantis(row, pm);
    const mateCash = mate && mate.quantity > 0 ? mate.buyPriceCents : 0;
    const pmCredit = play && play.limit > 0 ? play.creditCents : 0;
    let dest: PreconDest = "leftover";
    let destCash = 0;
    let destCredit = 0;
    if (mateCash > 0) {
      dest = "mate-cash";
      destCash = mateCash;
      mateCashCents += mateCash * row.quantity;
      mateCopies += row.quantity;
    } else if (pmCredit > 0) {
      dest = "playmantis";
      destCredit = pmCredit;
      playmantisCreditCents += pmCredit * row.quantity;
      playmantisCopies += row.quantity;
    } else {
      leftoverCopies += row.quantity;
      leftoverCkUsdCents += listed;
      leftoverRarity[rarityBucket(row.rarity)] += row.quantity;
    }
    lines.push({
      rowKey: manaBoxRowKey(row),
      dest,
      qty: row.quantity,
      name: row.name,
      setCode: row.setCode,
      collectorNumber: row.collectorNumber || "",
      foil: row.foil,
      rarity: row.rarity || "",
      mateCashCents: destCash,
      playmantisCreditCents: destCredit,
      ckListedUsdCents: row.purchaseCurrency.toUpperCase() === "USD" ? row.purchasePriceCents : 0,
    });
  }

  const ask = Math.max(0, Math.round(shopAskAudCents));
  const cashOutlayCents = Math.max(0, ask - mateCashCents);

  return {
    shopAskAudCents: ask,
    mateCashCents,
    mateCopies,
    playmantisCreditCents,
    playmantisCopies,
    leftoverCopies,
    leftoverCkUsdCents,
    deckCkUsdCents,
    cashOutlayCents,
    creditStore: "Playmantis",
    keepValueCents: leftoverCkUsdCents,
    keepCopies: leftoverCopies,
    leftoverRarity,
    harvestedAt: harvest.harvestedAt || harvest.mate?.harvestedAt || harvest.playmantis?.fetchedAt || "",
    harvestSource: harvest.harvestedAt ? harvest.source : "",
    verdict: decideVerdict({
      shopAskAudCents: ask,
      mateCashCents,
      playmantisCreditCents,
      deckCkUsdCents,
    }),
    lines,
  };
}

export function verdictLabel(verdict: PreconVerdict): string {
  if (verdict === "buy-now") return "Buy now";
  if (verdict === "consider-credit") return "Consider now";
  if (verdict === "consider-value") return "Consider now";
  if (verdict === "highly-consider-ck07") return "Highly consider now";
  return "Hard pass";
}
