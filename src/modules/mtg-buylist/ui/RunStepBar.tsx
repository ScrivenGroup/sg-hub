"use client";

import {
  RUN_STEP_LABELS,
  RUN_STEPS,
  runStepEnabled,
  type RunStep,
  type RunStepFlags,
} from "../logic/run-steps";

export function RunStepBar({
  step,
  flags,
  summaries,
  onStep,
}: {
  step: RunStep;
  flags: RunStepFlags;
  summaries: Record<RunStep, string>;
  onStep: (next: RunStep) => void;
}) {
  return (
    <nav aria-label="Run steps" className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {RUN_STEPS.map((id) => {
        const enabled = runStepEnabled(id, flags);
        const active = step === id;
        return (
          <button
            key={id}
            type="button"
            className={`sg-card min-w-0 p-3 text-left ${
              active ? "border-[var(--ink)]" : ""
            } ${enabled ? "" : "cursor-not-allowed opacity-50"}`}
            aria-current={active ? "step" : undefined}
            aria-disabled={!enabled}
            disabled={!enabled}
            onClick={() => {
              if (!enabled) return;
              onStep(id);
            }}
          >
            <span className="block text-sm font-medium">{RUN_STEP_LABELS[id]}</span>
            <span className="mt-1 block text-xs font-normal text-[var(--muted)]">
              {summaries[id]}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
