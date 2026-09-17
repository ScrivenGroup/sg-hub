"use client";

import { useState, useTransition } from "react";
import { addStandardsHoldAction, fileStandardsHoldAction } from "../actions";
import {
  HOLD_KIND_LABELS,
  STANDARDS_HOLD_KINDS,
  type StandardsHoldRecord,
} from "../schema";

export function HoldPile({ items }: { items: StandardsHoldRecord[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div id="hold" className="space-y-8">
      <section className="space-y-4 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-semibold">Add new item</h2>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = new FormData(form);
            setError(null);
            start(async () => {
              const result = await addStandardsHoldAction(data);
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
                {STANDARDS_HOLD_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {HOLD_KIND_LABELS[kind]}
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
                placeholder="/p/mtg-buylist or Buylist Run"
              />
            </label>
          </div>
          <label className="block text-sm font-medium">
            What to file later
            <textarea
              name="body"
              required
              rows={4}
              className="sg-input mt-1 min-h-[96px] py-3"
              placeholder="Primary on this leaf has no border. Kit is fill-only. Needs a default border — file and decide, don’t rewrite the library from this desk."
            />
          </label>
          {error ? <p className="text-sm text-[var(--rag-red)]">{error}</p> : null}
          <button type="submit" className="sg-btn-primary" disabled={pending}>
            {pending ? "Adding…" : "Add"}
          </button>
        </form>
      </section>

      <section aria-labelledby="unsorted-heading">
        <h2 id="unsorted-heading" className="mb-3 text-lg font-semibold">
          Unsorted items
        </h2>
        <HoldList items={items} />
      </section>
    </div>
  );
}

function HoldList({ items }: { items: StandardsHoldRecord[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (items.length === 0) {
    return (
      <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-5">
        <p className="font-medium">No unsorted items</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Other desks dump here. Not chrome Feedback. Not a rewrite of the kit.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-5"
        >
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
            <span className="rounded-full border border-[var(--border)] px-2 py-0.5 font-medium uppercase text-[var(--ink)]">
              {HOLD_KIND_LABELS[item.kind]}
            </span>
            <span>{formatWhen(item.createdAt)}</span>
            {item.source ? <span>from {item.source}</span> : null}
            <span>{item.submittedBy}</span>
          </div>
          <p className="whitespace-pre-wrap text-[var(--ink)]">{item.body}</p>
          <button
            type="button"
            className="sg-btn-secondary mt-3"
            disabled={pending && pendingId === item.id}
            onClick={() => {
              const data = new FormData();
              data.set("id", item.id);
              setPendingId(item.id);
              start(async () => {
                await fileStandardsHoldAction(data);
                setPendingId(null);
              });
            }}
          >
            Filed
          </button>
        </li>
      ))}
    </ul>
  );
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}
