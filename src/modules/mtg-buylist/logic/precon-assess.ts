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

export type RarityCode = "M" | "R" | "U" | "C";

export type PreconDestLine = {
  uid: number;
  rowKey: string;
  dest: PreconDest;
  qty: number;
  name: string;
  setCode: string;
  collectorNumber: string;
  foil: string;
  rarity: string;
  rarityCode: RarityCode | "";
  scryfallId: string;
  mateCashCents: number;
  mateCreditCents: number;
  mateWanted: number;
  playmantisCreditCents: number;
  playmantisWanted: number;
  ckListedUsdCents: number;
};

export function rarityCode(rarity: string): RarityCode | "" {
  const key = rarity.trim().toLowerCase();
  if (key === "mythic") return "M";
  if (key === "rare") return "R";
  if (key === "uncommon") return "U";
  if (key === "common") return "C";
  return "";
}

export function rarityBucket(rarity: string): "rare" | "uncommon" | "common" | "other" {
  const code = rarityCode(rarity);
  if (code === "M" || code === "R") return "rare";
  if (code === "U") return "uncommon";
  if (code === "C") return "common";
  return "other";
}

export function matchesRarityFilter(rarity: string, selected: Set<RarityCode>): boolean {
  if (selected.size === 0) return true;
  const code = rarityCode(rarity);
  return Boolean(code && selected.has(code));
}

export type RaritySlice = { qty: number; cents: number };

export function emptyRaritySlices(): Record<RarityCode, RaritySlice> {
  return {
    M: { qty: 0, cents: 0 },
    R: { qty: 0, cents: 0 },
    U: { qty: 0, cents: 0 },
    C: { qty: 0, cents: 0 },
  };
}

export function addRaritySlice(
  bag: Record<RarityCode, RaritySlice>,
  code: RarityCode | "",
  qty: number,
  cents: number,
) {
  if (!code || qty <= 0) return;
  bag[code].qty += qty;
  bag[code].cents += cents;
}

export type PreconAssess = {
  shopAskAudCents: number;
  mateCashCents: number;
  mateCreditWantedCents: number;
  mateCopies: number;
  mateUnwantedCashCents: number;
  mateUnwantedCreditCents: number;
  playmantisCreditCents: number;
  playmantisCopies: number;
  playmantisUnwantedCreditCents: number;
  leftoverCopies: number;
  leftoverCkUsdCents: number;
  leftoverByRarity: Record<RarityCode, RaritySlice>;
  deckCkUsdCents: number;
  ckByRarity: Record<RarityCode, RaritySlice>;
  cashOutlayCents: number;
  creditStore: string;
  keepValueCents: number;
  keepCopies: number;
  leftoverRarity: { rare: number; uncommon: number; common: number; other: number };
  /** All wanted Mate cash — ask at or below this can be cash-neutral. */
  mateCashBreakEvenCents: number;
  /** Credit / cash-outlay. Null when cash outlay is 0. */
  creditRatio: number | null;
  harvestedAt: string;
  harvestSource: "mock" | "live" | "";
  verdict: PreconVerdict;
  lines: PreconDestLine[];
};

type OfferDraft = {
  index: number;
  row: ManaBoxRow;
  listed: number;
  code: RarityCode | "";
  mateWanted: number;
  mateCash: number;
  mateCredit: number;
  pmWanted: number;
  pmCredit: number;
};

/** Conservative consider-now bar: credit must be at least this × the cash you still spend. */
export const CONSIDER_CREDIT_MIN_RATIO = 2;

function ckCents(row: ManaBoxRow): number {
  const cur = (row.purchaseCurrency || "").toUpperCase();
  if (cur && cur !== "USD") return 0;
  return row.purchasePriceCents > 0 ? row.purchasePriceCents * row.quantity : 0;
}

function decideVerdict(input: {
  shopAskAudCents: number;
  cashOutlayCents: number;
  mateCashCents: number;
  creditCents: number;
  deckCkUsdCents: number;
}): PreconVerdict {
  const { shopAskAudCents, cashOutlayCents, mateCashCents, creditCents, deckCkUsdCents } = input;
  if (cashOutlayCents <= 0) return "buy-now";
  const ratio = creditCents / cashOutlayCents;
  if (
    creditCents > 0 &&
    mateCashCents + creditCents >= shopAskAudCents &&
    ratio >= CONSIDER_CREDIT_MIN_RATIO
  ) {
    return "consider-credit";
  }
  if (creditCents > 0 && ratio < CONSIDER_CREDIT_MIN_RATIO) return "pass";
  if (deckCkUsdCents >= shopAskAudCents) return "consider-value";
  return "hard-pass";
}

function pickCreditDest(draft: OfferDraft): PreconDest {
  const mateCr = draft.mateWanted > 0 && draft.mateCredit > 0 ? draft.mateCredit * draft.row.quantity : 0;
  const pmCr = draft.pmWanted > 0 && draft.pmCredit > 0 ? draft.pmCredit * draft.row.quantity : 0;
  if (mateCr <= 0 && pmCr <= 0) return "leftover";
  return mateCr >= pmCr ? "mate-credit" : "playmantis";
}

export function assessPrecon(
  deck: PreconDeck,
  harvest: PreconHarvestBook,
  shopAskAudCents: number,
): PreconAssess {
  const mates = indexMateOffers(harvest.mate?.offers || []);
  const pm = indexPlaymantisOffers(harvest.playmantis?.offers || []);
  const ask = Math.max(0, Math.round(shopAskAudCents));
  const leftoverRarity = { rare: 0, uncommon: 0, common: 0, other: 0 };
  const leftoverByRarity = emptyRaritySlices();
  const ckByRarity = emptyRaritySlices();
  const drafts: OfferDraft[] = deck.rows.map((row, index) => {
    const listed = ckCents(row);
    const code = rarityCode(row.rarity || "");
    addRaritySlice(ckByRarity, code, row.quantity, listed);
    const mate = findMate(row, mates);
    const play = findPlaymantis(row, pm);
    return {
      index,
      row,
      listed,
      code,
      mateWanted: mate?.quantity ?? 0,
      mateCash: mate?.buyPriceCents ?? 0,
      mateCredit: mate?.creditPriceCents ?? 0,
      pmWanted: play?.limit ?? 0,
      pmCredit: play?.creditCents ?? 0,
    };
  });

  let availableMateCash = 0;
  const cashOrder = drafts
    .filter((draft) => draft.mateWanted > 0 && draft.mateCash > 0)
    .sort((a, b) => b.mateCash - a.mateCash || a.index - b.index);
  for (const draft of cashOrder) {
    availableMateCash += draft.mateCash * draft.row.quantity;
  }
  const cashIds = new Set<number>();
  let need = ask;
  for (const draft of cashOrder) {
    if (need <= 0) break;
    cashIds.add(draft.index);
    need -= draft.mateCash * draft.row.quantity;
  }

  const lines: PreconDestLine[] = [];
  let mateCashCents = 0;
  let mateCreditWantedCents = 0;
  let mateCopies = 0;
  let mateUnwantedCashCents = 0;
  let mateUnwantedCreditCents = 0;
  let playmantisCreditCents = 0;
  let playmantisCopies = 0;
  let playmantisUnwantedCreditCents = 0;
  let leftoverCopies = 0;
  let leftoverCkUsdCents = 0;
  let deckCkUsdCents = 0;

  for (const draft of drafts) {
    const { row, listed, code, mateWanted, mateCash, mateCredit, pmWanted, pmCredit } = draft;
    deckCkUsdCents += listed;
    const dest: PreconDest = cashIds.has(draft.index) ? "mate-cash" : pickCreditDest(draft);
    if (dest === "mate-cash") {
      mateCashCents += mateCash * row.quantity;
      mateCopies += row.quantity;
    } else if (dest === "mate-credit") {
      mateCreditWantedCents += mateCredit * row.quantity;
      mateCopies += row.quantity;
    } else if (dest === "playmantis") {
      playmantisCreditCents += pmCredit * row.quantity;
      playmantisCopies += row.quantity;
    } else {
      leftoverCopies += row.quantity;
      leftoverCkUsdCents += listed;
      leftoverRarity[rarityBucket(row.rarity)] += row.quantity;
      addRaritySlice(leftoverByRarity, code, row.quantity, listed);
      if (mateCash > 0) {
        mateUnwantedCashCents += mateCash * row.quantity;
        mateUnwantedCreditCents += mateCredit * row.quantity;
      }
      if (pmCredit > 0) {
        playmantisUnwantedCreditCents += pmCredit * row.quantity;
      }
    }
    lines.push({
      uid: draft.index + 1,
      rowKey: manaBoxRowKey(row),
      dest,
      qty: row.quantity,
      name: row.name,
      setCode: row.setCode,
      collectorNumber: row.collectorNumber || "",
      foil: row.foil,
      rarity: row.rarity || "",
      rarityCode: code,
      scryfallId: row.scryfallId || "",
      mateCashCents: mateCash,
      mateCreditCents: mateCredit,
      mateWanted,
      playmantisCreditCents: pmCredit,
      playmantisWanted: pmWanted,
      ckListedUsdCents: row.purchaseCurrency.toUpperCase() === "USD" ? row.purchasePriceCents : 0,
    });
  }

  const cashOutlayCents = Math.max(0, ask - mateCashCents);
  const creditCents = mateCreditWantedCents + playmantisCreditCents;
  const creditStore =
    mateCreditWantedCents >= playmantisCreditCents && mateCreditWantedCents > 0
      ? "MTGMate"
      : playmantisCreditCents > 0
        ? "Playmantis"
        : "";

  return {
    shopAskAudCents: ask,
    mateCashCents,
    mateCreditWantedCents,
    mateCopies,
    mateUnwantedCashCents,
    mateUnwantedCreditCents,
    playmantisCreditCents,
    playmantisCopies,
    playmantisUnwantedCreditCents,
    leftoverCopies,
    leftoverCkUsdCents,
    leftoverByRarity,
    deckCkUsdCents,
    ckByRarity,
    cashOutlayCents,
    creditStore,
    keepValueCents: leftoverCkUsdCents,
    keepCopies: leftoverCopies,
    leftoverRarity,
    mateCashBreakEvenCents: availableMateCash,
    creditRatio: cashOutlayCents > 0 ? creditCents / cashOutlayCents : null,
    harvestedAt: harvest.harvestedAt || harvest.mate?.harvestedAt || harvest.playmantis?.fetchedAt || "",
    harvestSource: harvest.harvestedAt ? harvest.source : "",
    verdict: decideVerdict({
      shopAskAudCents: ask,
      cashOutlayCents,
      mateCashCents,
      creditCents,
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
  if (verdict === "pass") return "Pass";
  return "Hard pass";
}

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function creditBits(assess: PreconAssess): string {
  const mate = assess.mateCreditWantedCents;
  const pm = assess.playmantisCreditCents;
  if (mate <= 0 && pm <= 0) return "$0.00 credit";
  if (mate >= pm) {
    return `${money(mate)} credit (Mate)${pm > 0 ? ` · ${money(pm)} credit (Playmantis)` : ""}`;
  }
  return `${money(pm)} credit (Playmantis)${mate > 0 ? ` · ${money(mate)} credit (Mate)` : ""}`;
}

/** One line: verdict plus cash spent, credit at store(s), and credit/cash ratio. */
export function buyingResultLine(assess: PreconAssess): string {
  const credits = creditBits(assess);
  if (assess.verdict === "buy-now") {
    return `${verdictLabel(assess.verdict)} · Cash neutral · ${credits}`;
  }
  const spend = `Spend ${money(assess.cashOutlayCents)} cash`;
  const ratio =
    assess.creditRatio == null ? "" : ` · ${assess.creditRatio.toFixed(1)}×`;
  const why =
    assess.verdict === "pass" && assess.creditRatio != null
      ? ` (below ${CONSIDER_CREDIT_MIN_RATIO.toFixed(1)}×)`
      : "";
  return `${verdictLabel(assess.verdict)} · ${spend} · ${credits}${ratio}${why}`;
}
