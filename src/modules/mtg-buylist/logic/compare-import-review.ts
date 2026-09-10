import type { ManaBoxRow, PlaymantisOffer } from "../schema";
import { findPlaymantis, indexPlaymantisOffers } from "./allocate";
import { normalizeFinish, playmantisCardName } from "./names";
import { normalizeSetName } from "./reprepare";
import type { ImportReviewRow, ImportReviewStatus } from "./parse-import-review";

export type HarvestReviewStatus = "matched" | "capped" | "not_buying" | "max_reached" | "not_found";

export type ImportCompareVerdict =
  | "agree"
  | "harvest_miss"
  | "harvest_extra"
  | "status_mismatch"
  | "price_mismatch"
  | "review_only"
  | "ours_only";

export type ImportCompareRow = {
  name: string;
  setName: string;
  finish: string;
  csvQty: number;
  scryfallId: string;
  reviewStatus: ImportReviewStatus | "";
  reviewAccepted: number;
  reviewCreditCents: number;
  harvestStatus: HarvestReviewStatus | "";
  harvestLimit: number;
  harvestCreditCents: number;
  verdict: ImportCompareVerdict;
  note: string;
};

export type ImportCompareLog = {
  rows: ImportCompareRow[];
  agree: number;
  disagree: number;
};

type ReviewBucket = "buyable" | "blocked" | "missing" | "skipped";

function nameKey(name: string): string {
  return playmantisCardName(name);
}

function reviewBucket(status: ImportReviewStatus): ReviewBucket {
  if (status === "matched" || status === "capped") return "buyable";
  if (status === "not_found") return "missing";
  if (status === "skipped") return "skipped";
  return "blocked";
}

function harvestBucket(status: HarvestReviewStatus): ReviewBucket {
  if (status === "matched" || status === "capped") return "buyable";
  if (status === "not_found") return "missing";
  return "blocked";
}

function harvestStatusFor(
  row: ManaBoxRow,
  offer: PlaymantisOffer | undefined,
): { status: HarvestReviewStatus; limit: number; creditCents: number } {
  if (!offer || offer.missing) {
    return { status: "not_found", limit: 0, creditCents: 0 };
  }
  if (offer.creditCents <= 0) {
    return { status: "not_buying", limit: offer.limit, creditCents: 0 };
  }
  if (offer.limit <= 0) {
    return { status: "max_reached", limit: 0, creditCents: offer.creditCents };
  }
  if (offer.limit < row.quantity) {
    return { status: "capped", limit: offer.limit, creditCents: offer.creditCents };
  }
  return { status: "matched", limit: offer.limit, creditCents: offer.creditCents };
}

function sameIdentity(csv: ManaBoxRow, review: ImportReviewRow, needFinish: boolean): boolean {
  if (nameKey(csv.name) !== nameKey(review.name)) return false;
  const csvSet = normalizeSetName(csv.setName || csv.setCode);
  const reviewSet = normalizeSetName(review.setName);
  if (csvSet && reviewSet && csvSet !== reviewSet) return false;
  if (needFinish && review.finish) {
    return normalizeFinish(csv.foil) === normalizeFinish(review.finish);
  }
  return true;
}

function pickReview(
  csv: ManaBoxRow,
  leftover: ImportReviewRow[],
): ImportReviewRow | undefined {
  const withFinish = leftover.filter((row) => sameIdentity(csv, row, true) && row.finish);
  if (withFinish.length === 1) return withFinish[0];
  if (withFinish.length > 1) {
    return (
      withFinish.find((row) => normalizeFinish(row.finish) === normalizeFinish(csv.foil)) ||
      withFinish[0]
    );
  }
  const loose = leftover.filter((row) => sameIdentity(csv, row, false));
  return loose[0];
}

function verdictFor(
  review: ImportReviewRow | undefined,
  harvest: HarvestReviewStatus | "",
  reviewCredit: number,
  harvestCredit: number,
): { verdict: ImportCompareVerdict; note: string } {
  if (!review && !harvest) {
    return { verdict: "ours_only", note: "Not in the Import Review dump" };
  }
  if (!review) {
    return { verdict: "ours_only", note: "Not in the Import Review dump" };
  }
  if (!harvest) {
    return { verdict: "review_only", note: "Not in this CSV / harvest" };
  }

  const left = reviewBucket(review.status);
  const right = harvestBucket(harvest);
  if (left === "buyable" && right === "missing") {
    return { verdict: "harvest_miss", note: "Playmantis accepted this; harvest marked not found" };
  }
  if (left === "missing" && right === "buyable") {
    return { verdict: "harvest_extra", note: "Playmantis said not found; harvest has a buy price" };
  }
  if (left !== right) {
    return {
      verdict: "status_mismatch",
      note: `Review ${review.status.replace(/_/g, " ")} · harvest ${harvest.replace(/_/g, " ")}`,
    };
  }
  if (left === "buyable" && reviewCredit > 0 && harvestCredit > 0 && reviewCredit !== harvestCredit) {
    return {
      verdict: "price_mismatch",
      note: `Review $${(reviewCredit / 100).toFixed(2)} · harvest $${(harvestCredit / 100).toFixed(2)}`,
    };
  }
  return { verdict: "agree", note: "" };
}

export function compareImportReview(input: {
  csv: ManaBoxRow[];
  harvest: PlaymantisOffer[];
  review: ImportReviewRow[];
}): ImportCompareLog {
  const offers = indexPlaymantisOffers(input.harvest);
  const leftover = [...input.review];
  const rows: ImportCompareRow[] = [];

  for (const csv of input.csv) {
    const review = pickReview(csv, leftover);
    if (review) leftover.splice(leftover.indexOf(review), 1);
    const harvest = harvestStatusFor(csv, findPlaymantis(csv, offers));
    const decided = verdictFor(
      review,
      harvest.status,
      review?.creditCents ?? 0,
      harvest.creditCents,
    );
    rows.push({
      name: csv.name,
      setName: csv.setName || csv.setCode,
      finish: csv.foil,
      csvQty: csv.quantity,
      scryfallId: csv.scryfallId || "",
      reviewStatus: review?.status || "",
      reviewAccepted: review?.acceptedQty || 0,
      reviewCreditCents: review?.creditCents || 0,
      harvestStatus: harvest.status,
      harvestLimit: harvest.limit,
      harvestCreditCents: harvest.creditCents,
      verdict: decided.verdict,
      note: decided.note,
    });
  }

  for (const review of leftover) {
    const decided = verdictFor(review, "", review.creditCents, 0);
    rows.push({
      name: review.name,
      setName: review.setName,
      finish: review.finish,
      csvQty: review.quantity,
      scryfallId: "",
      reviewStatus: review.status,
      reviewAccepted: review.acceptedQty,
      reviewCreditCents: review.creditCents,
      harvestStatus: "",
      harvestLimit: 0,
      harvestCreditCents: 0,
      verdict: decided.verdict,
      note: decided.note,
    });
  }

  return {
    rows,
    agree: rows.filter((row) => row.verdict === "agree").length,
    disagree: rows.filter((row) => row.verdict !== "agree").length,
  };
}

export function harvestDiffRows(log: ImportCompareLog): ImportCompareRow[] {
  return log.rows.filter((row) => row.verdict !== "agree");
}

/** Site dump as Playmantis offers when harvest has not run. Does not persist. */
export function offersFromImportReview(
  csv: ManaBoxRow[],
  review: ImportReviewRow[],
  fetchedAt: string,
): PlaymantisOffer[] {
  const leftover = [...review];
  const offers: PlaymantisOffer[] = [];
  const seen = new Set<string>();
  for (const row of csv) {
    const scryfallId = row.scryfallId.trim().toLowerCase();
    if (!scryfallId) continue;
    const hit = pickReview(row, leftover);
    if (hit) leftover.splice(leftover.indexOf(hit), 1);
    const finish = hit?.finish || row.foil;
    const key = `${scryfallId}|${normalizeFinish(finish)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const buyable = Boolean(hit && (hit.status === "matched" || hit.status === "capped"));
    offers.push({
      scryfallId,
      title: row.name,
      finish,
      creditCents: buyable && hit ? hit.creditCents : 0,
      limit: buyable && hit ? hit.acceptedQty : 0,
      missing: !hit || hit.status === "not_found",
      fetchedAt,
      imageUrl: "",
      setName: hit?.setName || row.setName || "",
    });
  }
  return offers;
}

