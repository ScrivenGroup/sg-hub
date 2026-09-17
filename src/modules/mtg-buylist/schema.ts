import { z } from "zod";

export const MTG_BUYLIST_HREF = "/p/mtg-buylist";
export const MTG_BUYLIST_NODE_ID = "p-mtg-buylist";

export const PRICE_SOURCES = ["card-kingdom", "tcgplayer", "scryfall", "other"] as const;
export const priceSourceSchema = z.enum(PRICE_SOURCES);
export type PriceSource = z.infer<typeof priceSourceSchema>;

export const PRICE_SOURCE_LABELS: Record<PriceSource, string> = {
  "card-kingdom": "Card Kingdom",
  tcgplayer: "TCGPlayer",
  scryfall: "Scryfall",
  other: "Other",
};

export const manaBoxRowSchema = z.object({
  name: z.string(),
  setCode: z.string(),
  setName: z.string().optional().default(""),
  collectorNumber: z.string().optional().default(""),
  foil: z.string(),
  quantity: z.number(),
  scryfallId: z.string().optional().default(""),
  rarity: z.string().optional().default(""),
  /** ManaBox “Purchase price” as integer cents. */
  purchasePriceCents: z.number().optional().default(0),
  /** Per-row currency from “Purchase price currency”, e.g. AUD. */
  purchaseCurrency: z.string().optional().default(""),
  /** From Scryfall enrich — e.g. extendedart. Empty until upload enrich runs. */
  frameEffects: z.array(z.string()).optional().default([]),
});

export const mateOfferSchema = z.object({
  mateUuid: z.string(),
  name: z.string(),
  setCode: z.string(),
  finish: z.string(),
  buyPriceCents: z.number(),
  creditPriceCents: z.number(),
  quantity: z.number(),
  normalisedName: z.string(),
  collectorNumber: z.string().optional().default(""),
  /** Mate /data image URL (MTGJSON-style id in path — distinguishes same-name printings). */
  imageUrl: z.string().optional().default(""),
  rarity: z.string().optional().default(""),
});

export const playmantisOfferSchema = z.object({
  scryfallId: z.string(),
  title: z.string().optional().default(""),
  finish: z.string(),
  creditCents: z.number(),
  limit: z.number(),
  missing: z.boolean().optional().default(false),
  fetchedAt: z.string(),
  imageUrl: z.string().optional().default(""),
  /** From Playmantis search `<p class="card-set">`. Empty on collection HTML. */
  setName: z.string().optional().default(""),
});

export const allocateLineSchema = z.object({
  name: z.string(),
  setCode: z.string(),
  collectorNumber: z.string().optional().default(""),
  finish: z.string(),
  quantity: z.number(),
  scryfallId: z.string().optional().default(""),
  mateCreditCents: z.number().optional().default(0),
  mateCashCents: z.number().optional().default(0),
  playmantisCreditCents: z.number().optional().default(0),
  reason: z.string().optional().default(""),
});

export const allocateResultSchema = z.object({
  ranAt: z.string(),
  totals: z.object({
    mateCreditCents: z.number(),
    mateCashCents: z.number(),
    playmantisCreditCents: z.number(),
    copiesMate: z.number(),
    copiesPlaymantis: z.number(),
    copiesNeither: z.number(),
    copiesUnmatched: z.number(),
  }),
  buckets: z.object({
    mate: z.array(allocateLineSchema),
    playmantis: z.array(allocateLineSchema),
    neither: z.array(allocateLineSchema),
    unmatched: z.array(allocateLineSchema),
  }),
  mateJoinMisses: z.array(
    z.object({
      name: z.string(),
      setCode: z.string(),
      finish: z.string(),
      collectorNumber: z.string().optional().default(""),
    }),
  ),
});

export const mtgBuylistStoreSchema = z.object({
  updatedAt: z.string(),
  notes: z.string().optional().default(""),
  csv: z
    .object({
      filename: z.string(),
      uploadedAt: z.string(),
      rows: z.array(manaBoxRowSchema),
      /** ManaBox app price source — not in the CSV; asked on upload. */
      priceSource: priceSourceSchema.optional().default("other"),
      /** Run-level listed currency (from CSV majority, confirmed on upload). */
      priceCurrency: z.string().optional().default(""),
    })
    .nullable(),
  mate: z
    .object({
      harvestedAt: z.string(),
      source: z.enum(["bookmarklet", "upload"]),
      sets: z.array(z.string()),
      offers: z.array(mateOfferSchema),
    })
    .nullable(),
  playmantis: z
    .object({
      fetchedAt: z.string(),
      offers: z.array(playmantisOfferSchema),
      error: z.string().optional(),
    })
    .nullable(),
  resultPm: allocateResultSchema.nullable(),
  resultMate: allocateResultSchema.nullable(),
  resultCompare: allocateResultSchema.nullable(),
  /**
   * User-confirmed Mate printing when name/finish is ambiguous.
   * Key = manaBoxRowKey(row); value = mateUuid.
   */
  mateConfirmations: z.record(z.string(), z.string()).optional().default({}),
  /**
   * Row keys where the user rejected the resolved printing — force Confirm UI
   * and skip image auto-join until they Confirm again.
   */
  mateReconfirm: z.record(z.string(), z.boolean()).optional().default({}),
  /**
   * Definitive Mate image → Scryfall id links (sha256 of CDN bytes).
   * Key = mateUuid; value = scryfallId.
   */
  mateImageLinks: z.record(z.string(), z.string()).optional().default({}),
});

export const DEFAULT_BUYLIST_RUN_ID = "this";
export const MAX_LIVE_BUYLIST_RUNS = 8;

export const buylistHarvestSchema = z.object({
  mate: mtgBuylistStoreSchema.shape.mate,
  playmantis: mtgBuylistStoreSchema.shape.playmantis,
  mateImageLinks: z.record(z.string(), z.string()).optional().default({}),
});

export const buylistRunFileSchema = z.object({
  id: z.string(),
  updatedAt: z.string(),
  csv: mtgBuylistStoreSchema.shape.csv,
  mate: mtgBuylistStoreSchema.shape.mate.optional().default(null),
  playmantis: mtgBuylistStoreSchema.shape.playmantis.optional().default(null),
  resultPm: allocateResultSchema.nullable(),
  resultMate: allocateResultSchema.nullable(),
  resultCompare: allocateResultSchema.nullable(),
  mateConfirmations: z.record(z.string(), z.string()).optional().default({}),
  mateReconfirm: z.record(z.string(), z.boolean()).optional().default({}),
  mateImageLinks: z.record(z.string(), z.string()).optional().default({}),
});

export const buylistRunMetaSchema = z.object({
  id: z.string(),
  name: z.string(),
  csvFilename: z.string().optional().default(""),
  updatedAt: z.string(),
  hasData: z.boolean(),
});

export const buylistArchiveSchema = z.object({
  id: z.string(),
  name: z.string(),
  csvFilename: z.string().optional().default(""),
  archivedAt: z.string(),
});

export const buylistOwnerIndexSchema = z.object({
  notes: z.string().optional().default(""),
  activeRunId: z.string(),
  runs: z.array(buylistRunMetaSchema),
  archives: z.array(buylistArchiveSchema).optional().default([]),
  harvestFolded: z.boolean().optional().default(false),
});

export const playmantisHarvestDiffRowSchema = z.object({
  id: z.string(),
  batchId: z.string(),
  createdAt: z.string(),
  userKey: z.string(),
  csvFilename: z.string(),
  reviewFilename: z.string(),
  harvestedAt: z.string(),
  name: z.string(),
  setName: z.string(),
  finish: z.string(),
  scryfallId: z.string(),
  csvQty: z.number(),
  reviewStatus: z.string(),
  harvestStatus: z.string(),
  reviewCreditCents: z.number(),
  harvestCreditCents: z.number(),
  harvestLimit: z.number(),
  verdict: z.string(),
  note: z.string(),
  lookedAt: z.string().optional().default(""),
});

export type ManaBoxRow = z.infer<typeof manaBoxRowSchema>;
export type MateOffer = z.infer<typeof mateOfferSchema>;
export type PlaymantisOffer = z.infer<typeof playmantisOfferSchema>;
export type AllocateLine = z.infer<typeof allocateLineSchema>;
export type AllocateResult = z.infer<typeof allocateResultSchema>;
export type MtgBuylistStore = z.infer<typeof mtgBuylistStoreSchema>;
export type BuylistHarvest = z.infer<typeof buylistHarvestSchema>;
export type BuylistRunFile = z.infer<typeof buylistRunFileSchema>;
export type BuylistRunMeta = z.infer<typeof buylistRunMetaSchema>;
export type BuylistArchive = z.infer<typeof buylistArchiveSchema>;
export type BuylistOwnerIndex = z.infer<typeof buylistOwnerIndexSchema>;
export type PlaymantisHarvestDiffRow = z.infer<typeof playmantisHarvestDiffRowSchema>;

export function emptyMtgBuylistStore(): MtgBuylistStore {
  return {
    updatedAt: new Date().toISOString(),
    notes: "",
    csv: null,
    mate: null,
    playmantis: null,
    resultPm: null,
    resultMate: null,
    resultCompare: null,
    mateConfirmations: {},
    mateReconfirm: {},
    mateImageLinks: {},
  };
}
