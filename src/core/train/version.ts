/** Last live website zip. Bump on make-it-live. Train clock is vX.Y, never X.Y.Z. */
export const TRAIN_VERSION = "1.14";

/** Hotfix still takes the next X.Y; this mark is the chip, not a PATCH segment. */
export const TRAIN_KIND: "train" | "hotfix" = "train";

export const TRAIN_CHANGELOG_HREF = "/d/train-changelog";

export function formatTrainVersion(version = TRAIN_VERSION): string {
  const raw = version.trim().replace(/^v/i, "");
  return raw ? `v${raw}` : "—";
}

export function trainKindLabel(kind = TRAIN_KIND): "Train" | "Hotfix" {
  return kind === "hotfix" ? "Hotfix" : "Train";
}
