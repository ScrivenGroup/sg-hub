"use client";

import { useState } from "react";
import type { ChangelogEntry } from "@/core/contracts/types";
import type { ScheduleStore } from "../schema";
import { emptyEffortDemo } from "../schema";
import { ensureEffortDemo } from "../logic/effort-gantt";
import { EffortGantt } from "./EffortGantt";
import { SubTabs } from "./SubTabs";

const SUBS = ["Changelog", "Effort Gantt", "Future Planning"] as const;

function releaseSort(a: ChangelogEntry, b: ChangelogEntry) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export function DevelopmentTab({
  changelogs,
  store,
  onChange,
}: {
  changelogs: ChangelogEntry[];
  store: ScheduleStore;
  onChange: (store: ScheduleStore) => void;
}) {
  const [sub, setSub] = useState<(typeof SUBS)[number]>("Effort Gantt");
  const plans = changelogs.filter((c) => c.kind === "plan");
  const releases = changelogs.filter((c) => c.kind === "release").sort(releaseSort);
  const demo = ensureEffortDemo(store.effortDemo || emptyEffortDemo());

  return (
    <div>
      <SubTabs tabs={SUBS} value={sub} onChange={setSub} />
      {sub === "Changelog" ? (
        <section className="max-w-3xl space-y-6">
          {plans.length > 0 ? (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                Product plan
              </h2>
              {plans.map((entry) => (
                <article key={entry.id} className="sg-card">
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-medium">{entry.title}</h3>
                  </div>
                  <div className="sg-prose text-[var(--ink)]">{entry.body}</div>
                </article>
              ))}
            </div>
          ) : null}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
              Changelog
            </h2>
            {releases.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No release notes yet.</p>
            ) : (
              releases.map((entry) => (
                <article key={entry.id} className="sg-card">
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-medium">
                      {entry.version ? (
                        <span className="mr-2 font-semibold">{entry.version}</span>
                      ) : null}
                      {entry.title}
                    </h3>
                    <time className="text-xs text-[var(--muted)]">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </time>
                  </div>
                  <div className="sg-prose text-[var(--ink)]">{entry.body}</div>
                </article>
              ))
            )}
          </div>
        </section>
      ) : null}
      {sub === "Effort Gantt" ? (
        <div>
          <EffortGantt
            store={store}
            onChange={onChange}
            demo={demo}
            onDemoChange={(nextDemo) => {
              const next = JSON.parse(JSON.stringify(store)) as ScheduleStore;
              next.effortDemo = nextDemo;
              onChange(next);
            }}
            applyDemoToStore={(next, nextDemo) => {
              next.effortDemo = nextDemo;
            }}
            toolbarNote={`${demo.weekCount} weeks · Development sandbox (not an occurrence).`}
          />
          <label className="mt-4 block">
            <span className="text-sm font-medium">Open notes</span>
            <textarea
              className="mrt-input mt-1 min-h-32 w-full"
              value={store.openNotes || ""}
              placeholder="Jot ideas for later review. Staff-only; not shown on a public share."
              onChange={(e) => {
                const next = JSON.parse(JSON.stringify(store)) as ScheduleStore;
                next.openNotes = e.target.value;
                onChange(next);
              }}
            />
          </label>
        </div>
      ) : null}
      {sub === "Future Planning" ? (
        <div className="sg-card max-w-xl border-dashed">
          <h2 className="font-medium">Future planning</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Parking lot while this product is building. Hidden when the hub
            status is Live. Use Open notes under Effort Gantt for working
            scratch.
          </p>
        </div>
      ) : null}
    </div>
  );
}
