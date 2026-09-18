"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  RUN_STEP_LABELS,
  RUN_STEPS,
  runStepEnabled,
  type RunStep,
  type RunStepFlags,
} from "../logic/run-steps";

const TAB_RADIUS = 10;
const SHOULDER = 10;
const STROKE = 2.5;
const SELECTED_FILL = "var(--surface)";

function StepChevron() {
  return (
    <span
      className="flex w-0 items-center justify-center self-center overflow-hidden text-[var(--muted)] sm:w-4"
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="hidden h-3.5 w-3.5 sm:block" fill="none" aria-hidden>
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

function relBox(shell: DOMRect, el: DOMRect) {
  return {
    left: el.left - shell.left,
    top: el.top - shell.top,
    width: el.width,
    height: el.height,
  };
}

/** Clockwise path: selected tab bump + full-width body, concave shoulders into neighbors. */
export function buildFolderSilhouettePath(opts: {
  width: number;
  height: number;
  tab: { left: number; top: number; width: number; height: number };
  body: { left: number; top: number; width: number; height: number };
}): string {
  const inset = STROKE / 2;
  const r = TAB_RADIUS;
  const sh = SHOULDER;
  const tL = opts.tab.left;
  const tT = opts.tab.top;
  const tR = opts.tab.left + opts.tab.width;
  const bL = opts.body.left + inset;
  const bT = opts.body.top;
  const bR = opts.body.left + opts.body.width - inset;
  const bB = opts.body.top + opts.body.height - inset;
  const width = opts.width;
  const height = opts.height;
  if (width < 8 || height < 8 || tR - tL < 8 || bB - bT < 8) return "";

  const flushLeft = tL <= bL + sh + 1;
  const flushRight = tR >= bR - sh - 1;
  const leftJoin = flushLeft ? bL : tL;
  const rightJoin = flushRight ? bR : tR;
  const leftShoulder = Math.max(bL + r, leftJoin - sh);
  const rightShoulder = Math.min(bR - r, rightJoin + sh);

  const parts: string[] = [];
  if (flushLeft) {
    parts.push(`M ${n(bL + r)} ${n(tT)}`);
  } else {
    parts.push(`M ${n(bL + r)} ${n(bT)}`);
    parts.push(`L ${n(leftShoulder)} ${n(bT)}`);
    parts.push(`A ${sh} ${sh} 0 0 0 ${n(leftJoin)} ${n(bT - sh)}`);
    parts.push(`L ${n(leftJoin)} ${n(tT + r)}`);
    parts.push(`A ${r} ${r} 0 0 1 ${n(leftJoin + r)} ${n(tT)}`);
  }
  parts.push(`L ${n((flushRight ? bR : rightJoin) - r)} ${n(tT)}`);
  if (flushRight) {
    parts.push(`A ${r} ${r} 0 0 1 ${n(bR)} ${n(tT + r)}`);
    parts.push(`L ${n(bR)} ${n(bB - r)}`);
  } else {
    parts.push(`A ${r} ${r} 0 0 1 ${n(rightJoin)} ${n(tT + r)}`);
    parts.push(`L ${n(rightJoin)} ${n(bT - sh)}`);
    parts.push(`A ${sh} ${sh} 0 0 0 ${n(rightShoulder)} ${n(bT)}`);
    parts.push(`L ${n(bR - r)} ${n(bT)}`);
    parts.push(`A ${r} ${r} 0 0 1 ${n(bR)} ${n(bT + r)}`);
    parts.push(`L ${n(bR)} ${n(bB - r)}`);
  }
  parts.push(`A ${r} ${r} 0 0 1 ${n(bR - r)} ${n(bB)}`);
  parts.push(`L ${n(bL + r)} ${n(bB)}`);
  parts.push(`A ${r} ${r} 0 0 1 ${n(bL)} ${n(bB - r)}`);
  if (flushLeft) {
    parts.push(`L ${n(bL)} ${n(tT + r)}`);
    parts.push(`A ${r} ${r} 0 0 1 ${n(bL + r)} ${n(tT)}`);
  } else {
    parts.push(`L ${n(bL)} ${n(bT + r)}`);
    parts.push(`A ${r} ${r} 0 0 1 ${n(bL + r)} ${n(bT)}`);
  }
  parts.push("Z");
  return parts.join(" ");
}

function n(value: number): string {
  return value.toFixed(2);
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
  const shellRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Partial<Record<RunStep, HTMLButtonElement | null>>>({});
  const [path, setPath] = useState("");
  const [box, setBox] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    function measure() {
      const node = shellRef.current;
      const body = bodyRef.current;
      const tab = tabRefs.current[step];
      if (!node || !body || !tab) return;
      const shellBox = node.getBoundingClientRect();
      const tabBox = relBox(shellBox, tab.getBoundingClientRect());
      const bodyBox = relBox(shellBox, body.getBoundingClientRect());
      const nextPath = buildFolderSilhouettePath({
        width: shellBox.width,
        height: shellBox.height,
        tab: tabBox,
        body: bodyBox,
      });
      setBox({ w: shellBox.width, h: shellBox.height });
      setPath(nextPath);
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(shell);
    if (bodyRef.current) observer.observe(bodyRef.current);
    for (const id of RUN_STEPS) {
      const el = tabRefs.current[id];
      if (el) observer.observe(el);
    }
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [step]);

  return (
    <div ref={shellRef} className="relative min-w-0">
      {path && box.w > 0 ? (
        <svg
          className="pointer-events-none absolute inset-0 z-0 overflow-visible"
          width={box.w}
          height={box.h}
          viewBox={`0 0 ${box.w} ${box.h}`}
          fill="none"
          aria-hidden
        >
          <path
            d={path}
            fill={SELECTED_FILL}
            stroke="var(--ink)"
            strokeWidth={STROKE}
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
      <nav
        aria-label="Run steps"
        className="relative z-10 grid grid-cols-[minmax(0,1fr)_0px_minmax(0,1fr)_0px_minmax(0,1fr)_0px_minmax(0,1fr)] items-stretch gap-x-0 gap-y-0 sm:grid-cols-[minmax(0,1fr)_1rem_minmax(0,1fr)_1rem_minmax(0,1fr)_1rem_minmax(0,1fr)]"
      >
        {RUN_STEPS.map((id, index) => {
          const enabled = runStepEnabled(id, flags);
          const active = step === id;
          return (
            <span key={id} className="contents">
              {index > 0 ? <StepChevron /> : null}
              <button
                type="button"
                ref={(el) => {
                  tabRefs.current[id] = el;
                }}
                className={`flex min-h-[4.75rem] min-w-0 flex-col justify-start p-3 text-left ${
                  enabled ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                } ${
                  active
                    ? `rounded-[10px] ${
                        path
                          ? "bg-transparent"
                          : "border-[2.5px] border-[var(--ink)] bg-[var(--surface)]"
                      }`
                    : "rounded-[10px] border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--ink)]"
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
                <span className="mt-1 line-clamp-2 overflow-hidden text-xs font-normal leading-4 text-[var(--muted)]">
                  {summaries[id]}
                </span>
              </button>
            </span>
          );
        })}
      </nav>
      <div
        ref={bodyRef}
        className="relative z-10 mt-2 min-w-0 px-4 py-4"
        data-run-step-body=""
      >
        {children}
      </div>
    </div>
  );
}
