"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

export function Stage({
  label,
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      {label ? (
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
          {label}
        </p>
      ) : null}
      <div className="rounded-[10px] border border-[var(--border)] bg-[var(--page)] p-4">
        {children}
      </div>
    </div>
  );
}

export function ColorPlay({
  cssVar,
  hex,
  role,
}: {
  cssVar: string;
  hex: string;
  role: string;
}) {
  const [trial, setTrial] = useState(hex);
  const preview = { [cssVar]: trial } as CSSProperties;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-stretch gap-3">
        <div
          className="h-28 w-28 shrink-0 border border-[var(--border)]"
          style={{ backgroundColor: trial, borderRadius: "var(--radius)" }}
          title={trial}
        />
        <div className="min-w-[12rem] flex-1 space-y-2">
          <p className="font-mono text-sm">
            {cssVar} · {trial}
          </p>
          <p className="text-sm text-[var(--muted)]">{role}</p>
          <label className="flex flex-wrap items-center gap-2 text-sm font-medium">
            Pick
            <input
              type="color"
              value={normalizeHex(trial)}
              onChange={(e) => setTrial(e.target.value)}
              className="h-8 w-10 cursor-pointer rounded border border-[var(--border)] bg-[var(--surface)] p-0"
            />
            <input
              className="sg-input max-w-[8rem] font-mono uppercase"
              value={trial}
              onChange={(e) => setTrial(e.target.value)}
              spellCheck={false}
            />
          </label>
          {trial.toLowerCase() !== hex.toLowerCase() ? (
            <button type="button" className="sg-btn-ghost" onClick={() => setTrial(hex)}>
              Reset to kit {hex}
            </button>
          ) : null}
        </div>
      </div>
      <div
        className="space-y-3 rounded-[10px] border border-[var(--border)] p-4"
        style={{ backgroundColor: "var(--page)", color: "var(--ink)", ...preview }}
      >
        <p className="text-sm font-medium">Live preview (this box only)</p>
        <p>Body text and a primary action using the token.</p>
        <p className="text-sm text-[var(--muted)]">Muted still uses --muted unless you are editing it.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="sg-btn-primary">
            Save
          </button>
          <button type="button" className="sg-btn-secondary">
            Cancel
          </button>
          <span className="sg-card !p-2 text-sm">Card</span>
        </div>
      </div>
    </div>
  );
}

export function RadiusPlay({ kitPx = 10 }: { kitPx?: number }) {
  const [trial, setTrial] = useState(kitPx);
  const steps = [0, 4, 8, 10, 12, 16, 24];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {steps.map((px) => (
          <button
            key={px}
            type="button"
            onClick={() => setTrial(px)}
            className="flex flex-col items-center gap-1 bg-transparent p-0"
          >
            <span
              className="h-14 w-14 border border-[var(--ink)] bg-[var(--surface)]"
              style={{ borderRadius: px === 0 ? 0 : px }}
            />
            <span
              className={`text-xs ${px === trial ? "font-semibold text-[var(--ink)]" : "text-[var(--muted)]"}`}
            >
              {px}px{px === 8 ? " MRT" : ""}
              {px === 10 ? " kit" : ""}
            </span>
          </button>
        ))}
      </div>
      <label className="block max-w-sm text-sm font-medium">
        Radius {trial}px
        <input
          type="range"
          min={0}
          max={24}
          value={trial}
          onChange={(e) => setTrial(Number(e.target.value))}
          className="mt-1 w-full"
        />
      </label>
      <div
        className="flex flex-wrap items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-4"
        style={{ ["--radius" as string]: `${trial}px` }}
      >
        <button type="button" className="sg-btn-primary">
          Primary
        </button>
        <button type="button" className="sg-btn-secondary">
          Secondary
        </button>
        <input className="sg-input max-w-[10rem]" defaultValue="Input" readOnly />
        <span className="sg-card !p-3 text-sm">Card at {trial}px</span>
      </div>
    </div>
  );
}

export function HeightPlay({ kitPx = 32 }: { kitPx?: number }) {
  const [trial, setTrial] = useState(kitPx);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-4">
        {[32, 44].map((px) => (
          <button
            key={px}
            type="button"
            className="flex flex-col items-center gap-1 bg-transparent p-0"
            onClick={() => setTrial(px)}
          >
            <span
              className="inline-flex items-center justify-center border border-[var(--ink)] bg-[var(--ink)] px-3 text-xs font-semibold text-[var(--surface)]"
              style={{ minHeight: px, borderRadius: 10 }}
            >
              Action
            </span>
            <span className="text-xs text-[var(--muted)]">
              {px}px{px === 32 ? " kit" : " MRT remove / atlas"}
            </span>
          </button>
        ))}
      </div>
      <label className="block max-w-sm text-sm font-medium">
        Height {trial}px
        <input
          type="range"
          min={24}
          max={48}
          value={trial}
          onChange={(e) => setTrial(Number(e.target.value))}
          className="mt-1 w-full"
        />
      </label>
      <div
        className="flex flex-wrap items-center gap-2"
        style={{ ["--sg-btn-height" as string]: `${trial}px` }}
      >
        <button type="button" className="sg-btn-primary">
          Primary
        </button>
        <button type="button" className="sg-btn-secondary">
          Secondary
        </button>
        <input className="sg-input max-w-[10rem]" defaultValue="Input" readOnly />
      </div>
    </div>
  );
}

function normalizeHex(value: string) {
  const v = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  return "#3c3c3b";
}
