"use client";

import { useState, useTransition } from "react";
import { addStandardsDropAction } from "../actions";
import { STANDARDS_DROP_KINDS, DROP_KIND_LABELS, type StandardsDropRecord } from "../schema";
import { DropList } from "./DropList";

export function DropTab({ items }: { items: StandardsDropRecord[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-8">
      <p className="max-w-2xl text-[var(--muted)]">
        Capture pile for this leaf. Other sittings throw a decision, a conflict,
        or a leftover here instead of inventing a new class on their desk.
        Promote into the Design Library when you are ready. Chrome Feedback
        remains the bug door.
      </p>

      <section className="sg-card space-y-4">
        <h2 className="text-lg font-semibold">Throw on the pile</h2>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = new FormData(form);
            setError(null);
            startTransition(async () => {
              const result = await addStandardsDropAction(data);
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
              Kind
              <select name="kind" className="sg-input mt-1" defaultValue="note">
                {STANDARDS_DROP_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {DROP_KIND_LABELS[kind]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Source{" "}
              <span className="font-normal text-[var(--muted)]">(optional)</span>
              <input
                name="source"
                className="sg-input mt-1"
                placeholder="/w/sunwater-mrt or Buylist Run"
              />
            </label>
          </div>
          <label className="block text-sm font-medium">
            What to remember
            <textarea
              name="body"
              required
              rows={4}
              className="sg-input mt-1 min-h-[96px] py-3"
              placeholder="Always borders on buttons. Found mrt-btn-primary already has a border."
            />
          </label>
          {error ? <p className="text-sm text-[var(--rag-red)]">{error}</p> : null}
          <button type="submit" className="sg-btn-primary" disabled={pending}>
            {pending ? "Dropping…" : "Drop"}
          </button>
        </form>
      </section>

      <section aria-labelledby="pile-heading">
        <h2 id="pile-heading" className="mb-3 text-lg font-semibold">
          Pile
        </h2>
        <DropList items={items} />
      </section>
    </div>
  );
}
