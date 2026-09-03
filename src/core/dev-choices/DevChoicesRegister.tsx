"use client";

import { useState, useTransition } from "react";
import type { DevChoiceRecord } from "@/core/contracts/types";
import { addDevChoiceAction } from "@/core/dev-choices/actions";

const LAYER_OPTIONS = [
  "sessions",
  "auth",
  "/w-studio",
  "packaging",
  "agents",
  "reuse",
  "janitor",
  "html",
  "leaf",
  "design",
  "data",
  "publish",
  "merge",
];

export function DevChoicesRegister({ items }: { items: DevChoiceRecord[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-8">
      <section className="sg-card space-y-4">
        <h2 className="text-lg font-semibold">Add a choice</h2>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = new FormData(form);
            setError(null);
            startTransition(async () => {
              const result = await addDevChoiceAction(data);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              form.reset();
            });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Layer
              <input
                name="layer"
                required
                list="dev-choice-layers"
                className="sg-input mt-1"
                placeholder="sessions"
              />
              <datalist id="dev-choice-layers">
                {LAYER_OPTIONS.map((layer) => (
                  <option key={layer} value={layer} />
                ))}
              </datalist>
            </label>
            <label className="block text-sm font-medium">
              Status
              <select name="status" className="sg-input mt-1" defaultValue="open">
                <option value="open">open</option>
                <option value="locked">locked</option>
              </select>
            </label>
          </div>
          <label className="block text-sm font-medium">
            Decision
            <textarea
              name="decision"
              required
              rows={3}
              className="sg-input mt-1 min-h-[80px] py-3"
              placeholder="One or two sentences."
            />
          </label>
          <label className="block text-sm font-medium">
            Why <span className="font-normal text-[var(--muted)]">(optional)</span>
            <textarea
              name="why"
              rows={2}
              className="sg-input mt-1 min-h-[64px] py-3"
              placeholder="Short reason."
            />
          </label>
          {error ? (
            <p className="text-sm text-[var(--rag-red)]">{error}</p>
          ) : null}
          <button type="submit" className="sg-btn-primary" disabled={pending}>
            {pending ? "Adding…" : "Add"}
          </button>
        </form>
      </section>

      {items.length === 0 ? (
        <div className="sg-card">
          <p className="font-medium">No development choices yet</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="sg-card">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                <code className="text-[var(--ink)]">{item.id}</code>
                <span className="rounded-full border border-[var(--border)] px-2 py-0.5 font-medium uppercase text-[var(--ink)]">
                  {item.layer}
                </span>
                <span
                  className="rounded-full border border-[var(--border)] px-2 py-0.5 font-medium uppercase"
                  title={item.status}
                >
                  {item.status}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-[var(--ink)]">{item.decision}</p>
              {item.why ? (
                <p className="mt-2 text-sm text-[var(--muted)]">{item.why}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
