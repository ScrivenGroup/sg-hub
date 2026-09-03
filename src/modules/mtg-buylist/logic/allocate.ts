import type {
  AllocateLine,
  AllocateResult,
  ManaBoxRow,
  MateOffer,
  MtgBuylistStore,
  PlaymantisOffer,
} from "../schema";
import {
  csvFinishToMate,
  csvJoinKeys,
  csvTreatmentKey,
  mateJoinKey,
  mateTreatmentKey,
  normalizeCardName,
  normalizeFinish,
  normalizeSetCode,
} from "./names";

function playmantisKey(scryfallId: string, finish: string): string {
  return `${scryfallId.trim().toLowerCase()}|${normalizeFinish(finish)}`;
}

function csvPlaymantisKeys(row: ManaBoxRow): string[] {
  const id = row.scryfallId.trim().toLowerCase();
  if (!id) return [];
  return [playmantisKey(id, row.foil)];
}

/**
 * Mate /data often has multiple printings with the same set + name + finish, only
 * distinguished by `image` (MTGJSON-style UUID). Never pick the first of those —
 * that caused false positives (e.g. The Lord of the Eagles $6.25 vs $0.25).
 * Name-only join is allowed only when that printing is unique.
 */
export function indexMateOffers(offers: MateOffer[]): Map<string, MateOffer> {
  const map = new Map<string, MateOffer>();
  const byBase = new Map<string, MateOffer[]>();

  for (const offer of offers) {
    const base = mateJoinKey(offer.setCode, offer.name, offer.finish, "");
    const list = byBase.get(base) || [];
    list.push(offer);
    byBase.set(base, list);
  }

  for (const [base, list] of byBase) {
    for (const offer of list) {
      if (!offer.collectorNumber) continue;
      const withCollector = mateJoinKey(
        offer.setCode,
        offer.name,
        offer.finish,
        offer.collectorNumber,
      );
      if (withCollector !== base && !map.has(withCollector)) {
        map.set(withCollector, offer);
      }
    }

    const printKeys = new Set(
      list.map((o) => (o.imageUrl || o.mateUuid || "").trim().toLowerCase() || o.mateUuid),
    );
    if (printKeys.size === 1) {
      map.set(base, list[0]);
    }
  }
  return map;
}

export function indexPlaymantisOffers(
  offers: PlaymantisOffer[],
): Map<string, PlaymantisOffer> {
  const map = new Map<string, PlaymantisOffer>();
  for (const offer of offers) {
    if (offer.missing) {
      map.set(`${offer.scryfallId.trim().toLowerCase()}|missing`, offer);
      continue;
    }
    map.set(playmantisKey(offer.scryfallId, offer.finish), offer);
  }
  return map;
}

export function findMate(
  row: ManaBoxRow,
  mates: Map<string, MateOffer>,
): MateOffer | undefined {
  for (const key of csvJoinKeys(row)) {
    const hit = mates.get(key);
    if (hit) return hit;
  }
  return undefined;
}

function printKey(offer: MateOffer): string {
  return (offer.imageUrl || offer.mateUuid || "").trim().toLowerCase() || offer.mateUuid;
}

function dedupeMatePrints(offers: MateOffer[]): MateOffer[] {
  const byPrint = new Map<string, MateOffer>();
  for (const offer of offers) {
    const key = printKey(offer);
    if (!byPrint.has(key)) byPrint.set(key, offer);
  }
  return [...byPrint.values()].sort(
    (a, b) => b.creditPriceCents - a.creditPriceCents || b.quantity - a.quantity,
  );
}

/**
 * All Mate printings for this CSV stack (set + name + finish). Deduped by image/uuid.
 * Prefers treatment-aligned rows when Scryfall frame_effects is known (e.g. Extended Art),
 * so base vs "(Extended Art)" stops colliding as ambiguous.
 */
export function listMateVariants(row: ManaBoxRow, offers: MateOffer[]): MateOffer[] {
  const set = normalizeSetCode(row.setCode);
  const name = normalizeCardName(row.name).name;
  const finish = normalizeFinish(csvFinishToMate(row.foil));
  const collector = (row.collectorNumber || "").trim();
  const wantedTreatment = csvTreatmentKey(row.frameEffects);

  const matches = offers.filter(
    (o) =>
      normalizeSetCode(o.setCode) === set &&
      normalizeCardName(o.name).name === name &&
      normalizeFinish(o.finish) === finish,
  );

  const scoped = collector
    ? matches.filter((o) => o.collectorNumber === collector)
    : matches;
  const pool = scoped.length ? scoped : matches;

  const preferred = pool.filter((o) => mateTreatmentKey(o.name) === wantedTreatment);
  return dedupeMatePrints(preferred.length ? preferred : pool);
}

/** Every Mate print for UI (before treatment preference) — used when confirming. */
export function listAllMateVariants(row: ManaBoxRow, offers: MateOffer[]): MateOffer[] {
  const set = normalizeSetCode(row.setCode);
  const name = normalizeCardName(row.name).name;
  const finish = normalizeFinish(csvFinishToMate(row.foil));
  const matches = offers.filter(
    (o) =>
      normalizeSetCode(o.setCode) === set &&
      normalizeCardName(o.name).name === name &&
      normalizeFinish(o.finish) === finish,
  );
  return dedupeMatePrints(matches);
}

export function isMateAmbiguous(variants: MateOffer[]): boolean {
  return variants.length > 1;
}

export function mateVariantSellable(offer: MateOffer): boolean {
  return offer.quantity > 0 && offer.creditPriceCents > 0;
}

/** Stable key for a ManaBox stack — used for Mate printing confirmations. */
export function manaBoxRowKey(row: ManaBoxRow): string {
  return [
    row.scryfallId.trim().toLowerCase(),
    normalizeSetCode(row.setCode),
    normalizeFinish(csvFinishToMate(row.foil)),
    (row.collectorNumber || "").trim(),
    normalizeCardName(row.name).name,
  ].join("|");
}

export type MateResolveOptions = {
  confirmations?: Record<string, string>;
  /** mateUuid → scryfallId from exact image hash join. */
  imageLinks?: Record<string, string>;
  /** rowKey → true when user flagged wrong printing. */
  reconfirm?: Record<string, boolean>;
};

function normalizeResolveOptions(
  confirmationsOrOpts: Record<string, string> | MateResolveOptions,
): MateResolveOptions {
  if (!confirmationsOrOpts || typeof confirmationsOrOpts !== "object") return {};
  if (
    "confirmations" in confirmationsOrOpts ||
    "imageLinks" in confirmationsOrOpts ||
    "reconfirm" in confirmationsOrOpts
  ) {
    return confirmationsOrOpts as MateResolveOptions;
  }
  return { confirmations: confirmationsOrOpts as Record<string, string> };
}

/**
 * Resolve Mate offer for a CSV row.
 * Ambiguous printings stay unresolved until the user confirms a mateUuid —
 * unless none of the variants are wanted (confirm would be pointless),
 * or an exact Mate↔Scryfall image link uniquely matches the owned id.
 */
export function resolveMateOffer(
  row: ManaBoxRow,
  mates: Map<string, MateOffer>,
  offers: MateOffer[],
  confirmationsOrOpts: Record<string, string> | MateResolveOptions = {},
): {
  offer?: MateOffer;
  ambiguous: boolean;
  variants: MateOffer[];
  confirmedUuid: string;
  /** Show confirm UI (ambiguous + at least one sellable variant). */
  needsConfirm: boolean;
  /** Resolved from multi-print pool — show Wrong printing failsafe. */
  canReject: boolean;
  /** How the offer was chosen. */
  resolveSource: "confirm" | "image" | "treatment" | "unique" | "none";
} {
  const opts = normalizeResolveOptions(confirmationsOrOpts);
  const confirmations = opts.confirmations || {};
  const imageLinks = opts.imageLinks || {};
  const reconfirm = opts.reconfirm || {};
  const rowKey = manaBoxRowKey(row);
  const variants = listMateVariants(row, offers);
  const allVariants = listAllMateVariants(row, offers);
  const multi = allVariants.length > 1;
  const forceReconfirm = Boolean(reconfirm[rowKey]);

  const confirmedUuid = (confirmations[rowKey] || "").trim();
  if (confirmedUuid && !forceReconfirm) {
    const confirmed =
      variants.find((v) => v.mateUuid === confirmedUuid) ||
      allVariants.find((v) => v.mateUuid === confirmedUuid);
    if (confirmed) {
      return {
        offer: confirmed,
        ambiguous: false,
        variants: multi ? allVariants : variants,
        confirmedUuid,
        needsConfirm: false,
        canReject: multi,
        resolveSource: "confirm",
      };
    }
  }

  if (forceReconfirm && multi) {
    const sellable = allVariants.filter(mateVariantSellable);
    if (!sellable.length) {
      return {
        offer: allVariants[0],
        ambiguous: false,
        variants: allVariants,
        confirmedUuid: "",
        needsConfirm: false,
        canReject: false,
        resolveSource: "none",
      };
    }
    return {
      offer: undefined,
      ambiguous: true,
      variants: allVariants,
      confirmedUuid: "",
      needsConfirm: true,
      canReject: false,
      resolveSource: "none",
    };
  }

  // Exact image hash → owned Scryfall id (definitive; not a price guess).
  if (multi && Object.keys(imageLinks).length) {
    const owned = row.scryfallId.trim().toLowerCase();
    const hits = allVariants.filter(
      (v) => (imageLinks[v.mateUuid] || "").toLowerCase() === owned,
    );
    if (hits.length === 1) {
      return {
        offer: hits[0],
        ambiguous: false,
        variants: allVariants,
        confirmedUuid: "",
        needsConfirm: false,
        canReject: true,
        resolveSource: "image",
      };
    }
  }

  const sellable = variants.filter(mateVariantSellable);
  if (isMateAmbiguous(variants)) {
    if (!sellable.length) {
      return {
        offer: variants[0],
        ambiguous: false,
        variants: multi ? allVariants : variants,
        confirmedUuid: "",
        needsConfirm: false,
        canReject: false,
        resolveSource: "none",
      };
    }
    return {
      offer: undefined,
      ambiguous: true,
      variants: multi ? allVariants : variants,
      confirmedUuid: "",
      needsConfirm: true,
      canReject: false,
      resolveSource: "none",
    };
  }

  const unique = findMate(row, mates) || variants[0];
  const fromTreatment =
    Boolean(csvTreatmentKey(row.frameEffects)) &&
    multi &&
    variants.length === 1;
  return {
    offer: unique,
    ambiguous: false,
    variants: multi ? allVariants : variants,
    confirmedUuid: "",
    needsConfirm: false,
    canReject: multi && Boolean(unique),
    resolveSource: fromTreatment ? "treatment" : unique ? "unique" : "none",
  };
}

export function findPlaymantis(
  row: ManaBoxRow,
  offers: Map<string, PlaymantisOffer>,
): PlaymantisOffer | undefined {
  for (const key of csvPlaymantisKeys(row)) {
    const hit = offers.get(key);
    if (hit && !hit.missing) return hit;
  }
  return undefined;
}

function playmantisMissReason(
  row: ManaBoxRow,
  offers: Map<string, PlaymantisOffer>,
): string {
  const id = row.scryfallId.trim().toLowerCase();
  if (!id) return "CSV missing Scryfall ID";
  if (offers.has(`${id}|missing`)) return "Playmantis harvest: not found";
  const finish = normalizeFinish(row.foil);
  for (const [key, offer] of offers) {
    if (offer.missing) continue;
    if (key.startsWith(`${id}|`) && normalizeFinish(offer.finish) !== finish) {
      return `Playmantis finish miss (CSV ${row.foil}, store has other finishes)`;
    }
  }
  return "No Playmantis Scryfall match";
}

function mateMissReason(row: ManaBoxRow): string {
  return "No Mate name-join";
}

function pushLine(
  bucket: AllocateLine[],
  row: ManaBoxRow,
  quantity: number,
  extra: Partial<AllocateLine>,
) {
  if (quantity <= 0) return;
  bucket.push({
    name: row.name,
    setCode: row.setCode,
    collectorNumber: row.collectorNumber || "",
    finish: row.foil,
    quantity,
    scryfallId: row.scryfallId || "",
    mateCreditCents: extra.mateCreditCents ?? 0,
    mateCashCents: extra.mateCashCents ?? 0,
    playmantisCreditCents: extra.playmantisCreditCents ?? 0,
    reason: extra.reason ?? "",
  });
}

export function allocate(input: {
  rows: ManaBoxRow[];
  mateOffers: MateOffer[];
  playmantisOffers: PlaymantisOffer[];
  mateConfirmations?: Record<string, string>;
  mateImageLinks?: Record<string, string>;
  mateReconfirm?: Record<string, boolean>;
}): AllocateResult {
  const mates = indexMateOffers(input.mateOffers);
  const pm = indexPlaymantisOffers(input.playmantisOffers);
  const resolveOpts: MateResolveOptions = {
    confirmations: input.mateConfirmations || {},
    imageLinks: input.mateImageLinks || {},
    reconfirm: input.mateReconfirm || {},
  };
  const hasMateOffers = input.mateOffers.length > 0;
  const hasPmOffers = input.playmantisOffers.length > 0;
  const buckets = {
    mate: [] as AllocateLine[],
    playmantis: [] as AllocateLine[],
    neither: [] as AllocateLine[],
    unmatched: [] as AllocateLine[],
  };
  const mateJoinMisses: AllocateResult["mateJoinMisses"] = [];
  let mateCreditCents = 0;
  let mateCashCents = 0;
  let playmantisCreditCents = 0;
  let copiesMate = 0;
  let copiesPlaymantis = 0;
  let copiesNeither = 0;
  let copiesUnmatched = 0;

  for (const row of input.rows) {
    const mate = resolveMateOffer(row, mates, input.mateOffers, resolveOpts).offer;
    const play = findPlaymantis(row, pm);
    const prices = {
      mateCreditCents: mate?.creditPriceCents ?? 0,
      mateCashCents: mate?.buyPriceCents ?? 0,
      playmantisCreditCents: play?.creditCents ?? 0,
    };

    if (!mate && !play) {
      const bits: string[] = [];
      if (hasPmOffers || !hasMateOffers) bits.push(playmantisMissReason(row, pm));
      if (hasMateOffers || !hasPmOffers) bits.push(mateMissReason(row));
      pushLine(buckets.unmatched, row, row.quantity, {
        ...prices,
        reason: bits.join("; "),
      });
      copiesUnmatched += row.quantity;
      continue;
    }

    if (!mate && hasMateOffers) {
      mateJoinMisses.push({
        name: row.name,
        setCode: row.setCode,
        finish: row.foil,
        collectorNumber: row.collectorNumber || "",
      });
    }

    const mateCap = mate && mate.quantity > 0 ? mate.quantity : 0;
    const pmCap = play && play.limit > 0 ? play.limit : 0;
    let rem = row.quantity;
    let toMate = 0;
    let toPm = 0;

    while (rem > 0) {
      const mateOpen = toMate < mateCap;
      const pmOpen = toPm < pmCap;
      if (!mateOpen && !pmOpen) break;
      if (mateOpen && pmOpen) {
        if (prices.mateCreditCents > prices.playmantisCreditCents) toMate += 1;
        else if (prices.playmantisCreditCents > prices.mateCreditCents) toPm += 1;
        else toMate += 1;
      } else if (mateOpen) {
        toMate += 1;
      } else {
        toPm += 1;
      }
      rem -= 1;
    }

    pushLine(buckets.mate, row, toMate, {
      ...prices,
      reason: "Higher or tied credit at Mate",
    });
    pushLine(buckets.playmantis, row, toPm, {
      ...prices,
      reason: "Higher credit at Playmantis",
    });

    let neitherReason = "Want cap filled or store not buying";
    if (rem > 0) {
      if (play && play.creditCents > 0 && pmCap === 0 && !mate) {
        neitherReason = "Want cap 0 / max stock at Playmantis";
      } else if (mate && mateCap === 0 && !play) {
        neitherReason = "Want cap 0 at Mate";
      } else if (mate || play) {
        neitherReason = "Want cap filled or store not buying";
      } else {
        neitherReason = "Neither store matched";
      }
    }
    pushLine(buckets.neither, row, rem, {
      ...prices,
      reason: neitherReason,
    });

    copiesMate += toMate;
    copiesPlaymantis += toPm;
    copiesNeither += rem;
    mateCreditCents += toMate * prices.mateCreditCents;
    mateCashCents += toMate * prices.mateCashCents;
    playmantisCreditCents += toPm * prices.playmantisCreditCents;
  }

  return {
    ranAt: new Date().toISOString(),
    totals: {
      mateCreditCents,
      mateCashCents,
      playmantisCreditCents,
      copiesMate,
      copiesPlaymantis,
      copiesNeither,
      copiesUnmatched,
    },
    buckets,
    mateJoinMisses,
  };
}

/** Recompute PM-only, Mate-only, and Compare (active when >1 store allocates exist). */
export function withAllocateResults(store: MtgBuylistStore): MtgBuylistStore {
  if (!store.csv) {
    return {
      ...store,
      resultPm: null,
      resultMate: null,
      resultCompare: null,
    };
  }

  const rows = store.csv.rows;
  const mateOffers = store.mate?.offers || [];
  const playmantisOffers = store.playmantis?.offers || [];
  const mateConfirmations = store.mateConfirmations || {};
  const mateImageLinks = store.mateImageLinks || {};
  const mateReconfirm = store.mateReconfirm || {};
  const resolveShared = { mateConfirmations, mateImageLinks, mateReconfirm };

  const resultPm = store.playmantis
    ? allocate({ rows, mateOffers: [], playmantisOffers, ...resolveShared })
    : null;
  const resultMate = store.mate
    ? allocate({ rows, mateOffers, playmantisOffers: [], ...resolveShared })
    : null;

  const completed = [resultPm, resultMate].filter(Boolean);
  const resultCompare =
    completed.length > 1
      ? allocate({ rows, mateOffers, playmantisOffers, ...resolveShared })
      : null;

  return {
    ...store,
    resultPm,
    resultMate,
    resultCompare,
  };
}

export function packingCsv(result: AllocateResult): string {
  const header = [
    "Bucket",
    "Name",
    "Set",
    "Collector",
    "Finish",
    "Qty",
    "Mate credit",
    "Mate cash",
    "Playmantis credit",
    "Scryfall ID",
    "Reason",
  ];
  const lines = [header.join(",")];
  const money = (cents: number) => (cents / 100).toFixed(2);
  const buckets: Array<[string, AllocateLine[]]> = [
    ["Sell Mate", result.buckets.mate],
    ["Sell Playmantis", result.buckets.playmantis],
    ["Neither", result.buckets.neither],
    ["Unmatched", result.buckets.unmatched],
  ];
  for (const [bucket, rows] of buckets) {
    for (const row of rows) {
      const cells = [
        bucket,
        row.name,
        row.setCode,
        row.collectorNumber || "",
        row.finish,
        String(row.quantity),
        money(row.mateCreditCents || 0),
        money(row.mateCashCents || 0),
        money(row.playmantisCreditCents || 0),
        row.scryfallId || "",
        row.reason || "",
      ];
      lines.push(cells.map(csvCell).join(","));
    }
  }
  return `${lines.join("\n")}\n`;
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
