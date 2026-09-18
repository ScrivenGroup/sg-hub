"use client";

import type { ReactNode } from "react";
import {
  RUN_STEP_LABELS,
  RUN_STEPS,
  runStepEnabled,
  type RunStep,
  type RunStepFlags,
} from "../logic/run-steps";

function StepChevron() {
  return (
    <span
      className="hidden items-center justify-center self-center text-[var(--muted)] md:flex"
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
        <path
          d="M9 5.5 15.5 12 9 18.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function RunStepBar({
  step,
  flags,
  summaries,
  onStep,
  children,
}: {
  step: RunStep;
  flags: RunStepFlags;
  summaries: Record<RunStep, ReactNode>;
  onStep: (next: RunStep) => void;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <nav
        aria-label="Run steps"
        className="grid grid-cols-2 items-end gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-x-1 md:gap-y-0"
      >
        {RUN_STEPS.map((id, index) => {
          const enabled = runStepEnabled(id, flags);
          const active = step === id;
          return (
            <span key={id} className="contents">
              {index > 0 ? <StepChevron /> : null}
              <button
                type="button"
                className={`sg-card min-w-0 p-3 text-left ${
                  enabled ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                } ${
                  active
                    ? "relative z-10 border-[var(--ink)] md:-mb-px md:!rounded-b-none md:border-b-[var(--surface)] md:hover:border-b-[var(--surface)]"
                    : "md:mb-2"
                }`}
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
            </span>
          );
        })}
      </nav>
      <div className="sg-card relative mt-2 p-4 hover:border-[var(--border)] md:mt-0">
        {children}
      </div>
    </div>
  );
}
