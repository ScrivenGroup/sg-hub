import { MTG_BUYLIST_HREF } from "../schema";

export const RUN_STEPS = ["upload", "harvest", "picking", "reupload"] as const;
export type RunStep = (typeof RUN_STEPS)[number];

export const RUN_STEP_LABELS: Record<RunStep, string> = {
  upload: "1. Upload",
  harvest: "2. Harvest",
  picking: "3. Picking",
  reupload: "4. Reupload",
};

export type RunStepFlags = {
  hasRun: boolean;
  hasCsv: boolean;
  hasHarvest: boolean;
  hasSubmission: boolean;
};

export function parseRunStep(raw: string | undefined | null): RunStep | null {
  const value = (raw || "").trim().toLowerCase();
  return (RUN_STEPS as readonly string[]).includes(value) ? (value as RunStep) : null;
}

export function runStepEnabled(step: RunStep, flags: RunStepFlags): boolean {
  switch (step) {
    case "upload":
      return true;
    case "harvest":
      return flags.hasCsv;
    case "picking":
      return flags.hasHarvest;
    case "reupload":
      return flags.hasCsv;
  }
}

/** Furthest card that already has data (not merely unlocked). */
export function furthestRunStep(flags: RunStepFlags): RunStep {
  if (flags.hasSubmission) return "reupload";
  if (flags.hasHarvest) return "picking";
  return "upload";
}

export function resolveRunStep(requested: RunStep | null, flags: RunStepFlags): RunStep {
  if (requested && runStepEnabled(requested, flags)) return requested;
  return furthestRunStep(flags);
}

export function runHref(runId: string, step: RunStep): string {
  const params = new URLSearchParams();
  if (runId) params.set("run", runId);
  params.set("step", step);
  const qs = params.toString();
  return qs ? `${MTG_BUYLIST_HREF}?${qs}` : MTG_BUYLIST_HREF;
}
