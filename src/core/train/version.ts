/** Last live website zip. Bump on make-it-live. Train clock is vX.Y, never X.Y.Z. */
export const TRAIN_VERSION = "1.17";

/** Hotfix still takes the next X.Y; this mark is the chip, not a PATCH segment. */
export const TRAIN_KIND: "train" | "hotfix" = "train";

export const TRAIN_CHANGELOG_HREF = "/d/train-changelog";
export const TRAIN_CHANGELOG_NODE_ID = "d-train-changelog";

/** Named hotfix zips. Historic hub-1.8.1 was a PATCH tag; new hotfixes are the next X.Y. */
const TRAIN_HOTFIX_VERSIONS = new Set(["1.8.1"]);

export function formatTrainVersion(version = TRAIN_VERSION): string {
  const raw = version.trim().replace(/^v/i, "");
  return raw ? `v${raw}` : "—";
}

export function isTrainHotfix(version?: string): boolean {
  const raw = (version || "").trim().replace(/^v/i, "");
  if (!raw) return false;
  if (TRAIN_HOTFIX_VERSIONS.has(raw)) return true;
  return raw === TRAIN_VERSION && TRAIN_KIND === "hotfix";
}
