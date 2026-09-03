import type { ManaBoxRow, MateOffer, PlaymantisOffer } from "../schema";
import {
  findPlaymantis,
  indexMateOffers,
  indexPlaymantisOffers,
  listMateVariants,
  manaBoxRowKey,
  resolveMateOffer,
} from "./allocate";
import { mateImageUrl, scryfallImageUrl } from "./images";
import { csvFinishToMate, normalizeCardName, normalizeFinish, normalizeSetCode } from "./names";

/** Either store lists at least this credit → “money card” for put-aside. */
export const MONEY_CREDIT_CENTS = 200;

export type StreamTone = "sell" | "capped" | "skip" | "ambiguous";

export type MateVariantView = {
  mateUuid: string;
  imageUrl: string;
  creditCents: number;
  cashCents: number;
  wanted: number;
  sell: number;
  /** Short label to tell printings apart (image id fragment). */
  label: string;
};

export type StreamRow = {
  name: string;
  setCode: string;
  collectorNumber: string;
  finish: string;
  scryfallId: string;
  have: number;
  wanted: number;
  sell: number;
  creditCents: number;
  cashCents: number;
  tone: StreamTone;
  ownedImageUrl: string;
  storeImageUrl: string;
  ambiguous: boolean;
  variants: MateVariantView[];
  listedCents: number;
  rowKey: string;
  confirmedMateUuid: string;
  /** Multiple Mate printings — show confirm checkboxes even after one is chosen. */
  showVariants: boolean;
  /** Resolved from a multi-print pool — offer Wrong printing failsafe. */
  canReject: boolean;
  resolveSource: "confirm" | "image" | "treatment" | "unique" | "none";
};

export type CompareWinner = "mate" | "playmantis" | "split" | "none";

export type CompareRow = {
  name: string;
  setCode: string;
  collectorNumber: string;
  finish: string;
  scryfallId: string;
  have: number;
  mateCreditCents: number;
  mateCashCents: number;
  mateWanted: number;
  mateSell: number;
  mateImageUrl: string;
  mateAmbiguous: boolean;
  mateVariants: MateVariantView[];
  playmantisCreditCents: number;
  playmantisWanted: number;
  playmantisSell: number;
  playmantisImageUrl: string;
  winner: CompareWinner;
  ownedImageUrl: string;
  sellable: boolean;
  /** Not found at either store (no join / missing). */
  notFound: boolean;
  /** Matched somewhere but nothing to sell (want full). */
  wantFull: boolean;
  putAside: boolean;
  listedMateCreditCents: number;
  listedCents: number;
  rowKey: string;
  confirmedMateUuid: string;
  showVariants: boolean;
  canReject: boolean;
};

export {
  findPlaymantis,
  indexMateOffers,
  indexPlaymantisOffers,
  listMateVariants,
  manaBoxRowKey,
  resolveMateOffer,
};

/** Store offer as a percent of ManaBox listed. Null when listed is 0. */
export function recoveredPercent(offerCents: number, listedCents: number): number | null {
  if (!(listedCents > 0)) return null;
  return Math.round((offerCents / listedCents) * 100);
}

export function formatRecovered(pct: number | null): string {
  return pct == null ? "—" : `${pct}%`;
}

/**
 * Soft RAG for “is this worth selling?”
 * Assumptions (shown in UI legend):
 * - >100% = store credit beats listed → strong sell
 * - ≥80% = typical good store rate
 * - ≥70% = weak-store floor
 * - Listed under $2: offer ≥50¢ counts as “ok” even if % is lower ($1→50¢)
 */
export type RecoveryBand = "excellent" | "good" | "ok" | "weak" | "none";

export function recoveryBand(offerCents: number, listedCents: number): RecoveryBand {
  const pct = recoveredPercent(offerCents, listedCents);
  if (pct == null || offerCents <= 0) return "none";
  if (pct > 100) return "excellent";
  if (pct >= 80) return "good";
  if (listedCents < 200 && offerCents >= 50) return "ok";
  if (pct >= 70) return "ok";
  return "weak";
}

export function recoveryBandClass(band: RecoveryBand): string {
  if (band === "excellent") {
    return "font-semibold text-[var(--rag-green)] bg-[color-mix(in_srgb,var(--rag-green)_22%,transparent)] rounded px-1";
  }
  if (band === "good") {
    return "font-medium text-[var(--rag-green)]";
  }
  if (band === "ok") {
    return "text-[var(--rag-amber)]";
  }
  if (band === "weak") {
    return "text-[var(--muted)]";
  }
  return "text-[var(--muted)]";
}

export const RECOVERY_LEGEND =
  "Gain colours: >100% strong green (sell) · ≥80% green (good) · ≥70% amber (floor) · under $2 listed, ≥50¢ offer also amber-ok · below that grey.";

function variantLabel(offer: MateOffer, index: number): string {
  const treatment = offer.name.match(/\(([^)]+)\)\s*$/);
  if (treatment) return treatment[1].trim();
  const fromImage = (offer.imageUrl || "").split("/").pop()?.replace(/\.[^.]+$/, "") || "";
  if (fromImage.length >= 8) return `print ${fromImage.slice(0, 8)}`;
  if (offer.rarity) return `${offer.rarity} #${index + 1}`;
  return `variant ${index + 1}`;
}

function toVariantViews(variants: MateOffer[], have: number): MateVariantView[] {
  return variants.map((offer, i) => {
    const wanted = Math.max(0, offer.quantity);
    const creditCents = offer.creditPriceCents;
    const sell = creditCents > 0 && wanted > 0 ? Math.min(have, wanted) : 0;
    return {
      mateUuid: offer.mateUuid,
      imageUrl: mateImageUrl(offer.imageUrl || ""),
      creditCents,
      cashCents: offer.buyPriceCents,
      wanted,
      sell,
      label: variantLabel(offer, i),
    };
  });
}

export function buildPmStreamRows(
  rows: ManaBoxRow[],
  offers: PlaymantisOffer[],
): StreamRow[] {
  const pm = indexPlaymantisOffers(offers);
  return rows.map((row) => {
    const offer = findPlaymantis(row, pm);
    const have = row.quantity;
    const wanted = offer && !offer.missing ? Math.max(0, offer.limit) : 0;
    const creditCents = offer && !offer.missing ? offer.creditCents : 0;
    const sell = creditCents > 0 && wanted > 0 ? Math.min(have, wanted) : 0;
    let tone: StreamTone = "skip";
    if (sell > 0) tone = "sell";
    else if (offer && !offer.missing) tone = "capped";
    return {
      name: row.name,
      setCode: row.setCode,
      collectorNumber: row.collectorNumber || "",
      finish: row.foil,
      scryfallId: row.scryfallId || "",
      have,
      wanted,
      sell,
      creditCents,
      cashCents: 0,
      tone,
      ownedImageUrl: scryfallImageUrl(row.scryfallId),
      storeImageUrl: offer?.imageUrl || scryfallImageUrl(offer?.scryfallId || row.scryfallId),
      ambiguous: false,
      variants: [],
      listedCents: row.purchasePriceCents || 0,
      rowKey: manaBoxRowKey(row),
      confirmedMateUuid: "",
      showVariants: false,
      canReject: false,
      resolveSource: "none",
    };
  });
}

export type MateRowResolveInput = {
  confirmations?: Record<string, string>;
  imageLinks?: Record<string, string>;
  reconfirm?: Record<string, boolean>;
};

export function buildMateStreamRows(
  rows: ManaBoxRow[],
  offers: MateOffer[],
  confirmationsOrOpts: Record<string, string> | MateRowResolveInput = {},
): StreamRow[] {
  const opts: MateRowResolveInput =
    confirmationsOrOpts &&
    typeof confirmationsOrOpts === "object" &&
    ("confirmations" in confirmationsOrOpts ||
      "imageLinks" in confirmationsOrOpts ||
      "reconfirm" in confirmationsOrOpts)
      ? (confirmationsOrOpts as MateRowResolveInput)
      : { confirmations: confirmationsOrOpts as Record<string, string> };
  const resolveOpts = {
    confirmations: opts.confirmations || {},
    imageLinks: opts.imageLinks || {},
    reconfirm: opts.reconfirm || {},
  };
  const mates = indexMateOffers(offers);
  return rows.map((row) => {
    const resolved = resolveMateOffer(row, mates, offers, resolveOpts);
    const have = row.quantity;
    const ownedImageUrl = scryfallImageUrl(row.scryfallId);
    const rowKey = manaBoxRowKey(row);
    // Expand while Confirm needed, or user already confirmed (can change mind).
    // Image/treatment auto-join stays collapsed — use Wrong printing to reopen.
    const showVariants =
      resolved.needsConfirm ||
      (Boolean(resolved.confirmedUuid) && resolved.variants.length > 1);
    const views = showVariants ? toVariantViews(resolved.variants, have) : [];

    if (resolved.ambiguous && resolved.needsConfirm) {
      const best = views[0];
      return {
        name: row.name,
        setCode: row.setCode,
        collectorNumber: row.collectorNumber || "",
        finish: row.foil,
        scryfallId: row.scryfallId || "",
        have,
        wanted: views.reduce((n, v) => n + v.wanted, 0),
        sell: 0,
        creditCents: best?.creditCents ?? 0,
        cashCents: best?.cashCents ?? 0,
        tone: "ambiguous" as const,
        ownedImageUrl,
        storeImageUrl: best?.imageUrl || "",
        ambiguous: true,
        variants: views,
        listedCents: row.purchasePriceCents || 0,
        rowKey,
        confirmedMateUuid: "",
        showVariants: true,
        canReject: false,
        resolveSource: resolved.resolveSource,
      };
    }

    const offer = resolved.offer;
    const wanted = offer ? Math.max(0, offer.quantity) : 0;
    const creditCents = offer?.creditPriceCents ?? 0;
    const cashCents = offer?.buyPriceCents ?? 0;
    const sell = creditCents > 0 && wanted > 0 ? Math.min(have, wanted) : 0;
    let tone: StreamTone = "skip";
    if (sell > 0) tone = "sell";
    else if (offer) tone = "capped";
    return {
      name: row.name,
      setCode: row.setCode,
      collectorNumber: row.collectorNumber || "",
      finish: row.foil,
      scryfallId: row.scryfallId || "",
      have,
      wanted,
      sell,
      creditCents,
      cashCents,
      tone,
      ownedImageUrl,
      storeImageUrl: mateImageUrl(offer?.imageUrl || ""),
      ambiguous: false,
      variants: views,
      listedCents: row.purchasePriceCents || 0,
      rowKey,
      confirmedMateUuid: resolved.confirmedUuid,
      showVariants,
      canReject: resolved.canReject,
      resolveSource: resolved.resolveSource,
    };
  });
}

function maxMateListedCredit(row: ManaBoxRow, offers: MateOffer[]): number {
  const set = normalizeSetCode(row.setCode);
  const name = normalizeCardName(row.name).name;
  const finish = normalizeFinish(csvFinishToMate(row.foil));
  let max = 0;
  for (const offer of offers) {
    if (normalizeSetCode(offer.setCode) !== set) continue;
    if (normalizeCardName(offer.name).name !== name) continue;
    if (normalizeFinish(offer.finish) !== finish) continue;
    if (offer.creditPriceCents > max) max = offer.creditPriceCents;
  }
  return max;
}

export function buildCompareRows(
  rows: ManaBoxRow[],
  mateOffers: MateOffer[],
  playmantisOffers: PlaymantisOffer[],
  confirmationsOrOpts: Record<string, string> | MateRowResolveInput = {},
): CompareRow[] {
  const opts: MateRowResolveInput =
    confirmationsOrOpts &&
    typeof confirmationsOrOpts === "object" &&
    ("confirmations" in confirmationsOrOpts ||
      "imageLinks" in confirmationsOrOpts ||
      "reconfirm" in confirmationsOrOpts)
      ? (confirmationsOrOpts as MateRowResolveInput)
      : { confirmations: confirmationsOrOpts as Record<string, string> };
  const resolveOpts = {
    confirmations: opts.confirmations || {},
    imageLinks: opts.imageLinks || {},
    reconfirm: opts.reconfirm || {},
  };
  const mates = indexMateOffers(mateOffers);
  const pm = indexPlaymantisOffers(playmantisOffers);
  return rows.map((row) => {
    const resolved = resolveMateOffer(row, mates, mateOffers, resolveOpts);
    const mateAmbiguous = resolved.ambiguous;
    const mate = resolved.offer;
    const play = findPlaymantis(row, pm);
    const mateCreditCents = mate?.creditPriceCents ?? 0;
    const mateCashCents = mate?.buyPriceCents ?? 0;
    const playmantisCreditCents = play?.creditCents ?? 0;
    const mateWanted = mate && mate.quantity > 0 ? mate.quantity : 0;
    const playmantisWanted = play && play.limit > 0 ? play.limit : 0;
    // Compare: only expand while still needs a confirm; confirmed → single summary row.
    const showVariants = resolved.needsConfirm;
    const variantViews = showVariants ? toVariantViews(resolved.variants, row.quantity) : [];
    const rowKey = manaBoxRowKey(row);

    let rem = row.quantity;
    let toMate = 0;
    let toPm = 0;
    // Ambiguous Mate (unconfirmed): do not auto-allocate to Mate; PM can still win.
    const mateCap = mateAmbiguous ? 0 : mateWanted;
    while (rem > 0) {
      const mateOpen = toMate < mateCap;
      const pmOpen = toPm < playmantisWanted;
      if (!mateOpen && !pmOpen) break;
      if (mateOpen && pmOpen) {
        if (mateCreditCents > playmantisCreditCents) toMate += 1;
        else if (playmantisCreditCents > mateCreditCents) toPm += 1;
        else toMate += 1;
      } else if (mateOpen) {
        toMate += 1;
      } else {
        toPm += 1;
      }
      rem -= 1;
    }

    let winner: CompareWinner = "none";
    if (toMate > 0 && toPm === 0) winner = "mate";
    else if (toPm > 0 && toMate === 0) winner = "playmantis";
    else if (toMate > 0 && toPm > 0) winner = "split";

    const sellable = toMate + toPm > 0;
    const listedMateCreditCents = Math.max(
      mateCreditCents,
      maxMateListedCredit(row, mateOffers),
    );
    const listedMoney =
      listedMateCreditCents >= MONEY_CREDIT_CENTS ||
      playmantisCreditCents >= MONEY_CREDIT_CENTS;
    const putAside = !sellable && listedMoney;
    const mateMatched = Boolean(mate) || mateAmbiguous;
    const pmMatched = Boolean(play);
    const notFound = !mateMatched && !pmMatched;
    const wantFull = !sellable && !notFound && !mateAmbiguous;

    return {
      name: row.name,
      setCode: row.setCode,
      collectorNumber: row.collectorNumber || "",
      finish: row.foil,
      scryfallId: row.scryfallId || "",
      have: row.quantity,
      mateCreditCents,
      mateCashCents,
      mateWanted: mateAmbiguous
        ? variantViews.reduce((n, v) => n + v.wanted, 0)
        : mateWanted,
      mateSell: toMate,
      mateImageUrl: mateImageUrl(mate?.imageUrl || variantViews[0]?.imageUrl || ""),
      mateAmbiguous,
      mateVariants: variantViews,
      playmantisCreditCents,
      playmantisWanted,
      playmantisSell: toPm,
      playmantisImageUrl:
        play?.imageUrl || scryfallImageUrl(play?.scryfallId || row.scryfallId),
      winner,
      ownedImageUrl: scryfallImageUrl(row.scryfallId),
      sellable,
      notFound,
      wantFull,
      putAside,
      listedMateCreditCents,
      listedCents: row.purchasePriceCents || 0,
      rowKey,
      confirmedMateUuid: resolved.confirmedUuid,
      showVariants,
      canReject: resolved.canReject,
    };
  });
}

export function streamRowsCsv(rows: StreamRow[], mode: "pm" | "mate"): string {
  const header =
    mode === "mate"
      ? [
          "Name",
          "Set",
          "#",
          "Finish",
          "Have",
          "Wanted",
          "Sell",
          "Listed",
          "Credit",
          "Recovered %",
          "Cash",
          "Cash recovered %",
          "Ambiguous",
          "Variant",
        ]
      : ["Name", "Set", "#", "Finish", "Have", "Wanted", "Sell", "Listed", "Credit", "Recovered %"];
  const lines = [header.join(",")];
  const money = (c: number) => (c / 100).toFixed(2);
  const pct = (offer: number, listed: number) => {
    const n = recoveredPercent(offer, listed);
    return n == null ? "" : String(n);
  };
  for (const row of rows) {
    if (mode === "mate" && row.showVariants && row.variants.length) {
      for (const v of row.variants) {
        lines.push(
          [
            row.name,
            row.setCode,
            row.collectorNumber,
            row.finish,
            String(row.have),
            String(v.wanted),
            String(v.sell),
            money(row.listedCents),
            money(v.creditCents),
            pct(v.creditCents, row.listedCents),
            money(v.cashCents),
            pct(v.cashCents, row.listedCents),
            row.confirmedMateUuid === v.mateUuid
              ? "confirmed"
              : row.ambiguous
                ? "yes"
                : "variant",
            v.label,
          ]
            .map(csvCell)
            .join(","),
        );
      }
      continue;
    }
    const cells = [
      row.name,
      row.setCode,
      row.collectorNumber,
      row.finish,
      String(row.have),
      String(row.wanted),
      String(row.sell),
      money(row.listedCents),
      money(row.creditCents),
      pct(row.creditCents, row.listedCents),
    ];
    if (mode === "mate") {
      cells.push(
        money(row.cashCents),
        pct(row.cashCents, row.listedCents),
        row.ambiguous ? "yes" : "",
        "",
      );
    }
    lines.push(cells.map(csvCell).join(","));
  }
  return `${lines.join("\n")}\n`;
}

export function compareRowsCsv(rows: CompareRow[]): string {
  const header = [
    "Name",
    "Set",
    "#",
    "Finish",
    "Have",
    "Listed",
    "Mate credit",
    "Mate wanted",
    "Mate sell",
    "Mate needs confirm",
    "PM credit",
    "PM wanted",
    "PM sell",
    "Winner",
    "Winner gain %",
    "Put aside",
  ];
  const lines = [header.join(",")];
  const money = (c: number) => (c / 100).toFixed(2);
  const winnerLabel = (w: CompareWinner) =>
    w === "mate" ? "Mate" : w === "playmantis" ? "Playmantis" : w === "split" ? "Split" : "—";
  for (const row of rows) {
    const winnerCredit =
      row.winner === "mate"
        ? row.mateCreditCents
        : row.winner === "playmantis"
          ? row.playmantisCreditCents
          : row.winner === "split"
            ? Math.max(row.mateCreditCents, row.playmantisCreditCents)
            : 0;
    const gain = recoveredPercent(winnerCredit, row.listedCents);
    lines.push(
      [
        row.name,
        row.setCode,
        row.collectorNumber,
        row.finish,
        String(row.have),
        money(row.listedCents),
        row.mateAmbiguous ? "ambiguous" : money(row.mateCreditCents),
        String(row.mateWanted),
        String(row.mateSell),
        row.showVariants ? "yes" : "",
        money(row.playmantisCreditCents),
        String(row.playmantisWanted),
        String(row.playmantisSell),
        winnerLabel(row.winner),
        row.sellable && gain != null ? String(gain) : "",
        row.putAside ? "yes" : "",
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
