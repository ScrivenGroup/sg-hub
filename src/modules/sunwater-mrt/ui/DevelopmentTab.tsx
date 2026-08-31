"use client";

import { useState } from "react";
import type { ChangelogEntry } from "@/core/contracts/types";
import type { ScheduleStore } from "../schema";
import { SubTabs } from "./SubTabs";

const SUBS = ["Changelog", "Notes"] as const;

const INTRO: Record<(typeof SUBS)[number], string> = {
  Changelog: "What shipped, and what is still WIP.",
  Notes: "Staff scratchpad. Saved with the live plan; not shown on a guest share.",
};

function releaseSort(a: ChangelogEntry, b: ChangelogEntry) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function ChangelogCard({ entry }: { entry: ChangelogEntry }) {
  return (
    <article className="sg-card">
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
  );
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
  const [sub, setSub] = useState<(typeof SUBS)[number]>("Changelog");
  const wip = changelogs
    .filter((c) => c.kind === "plan" && c.version)
    .sort(releaseSort);
  const releases = changelogs
    .filter((c) => c.kind === "release")
    .sort(releaseSort);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SubTabs tabs={SUBS} value={sub} onChange={setSub} intro={INTRO[sub]} />
      {sub === "Changelog" ? (
        <section className="min-h-0 max-w-3xl flex-1 space-y-6 overflow-auto">
          {wip.length > 0 ? (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                WIP
              </h2>
              {wip.map((entry) => (
                <ChangelogCard key={entry.id} entry={entry} />
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
                <ChangelogCard key={entry.id} entry={entry} />
              ))
            )}
          </div>
        </section>
      ) : null}
      {sub === "Notes" ? (
        <textarea
          className="mrt-notes-bulk"
          value={store.openNotes || ""}
          placeholder="Notes for this plan. Staff only. Saved with the live store."
          onChange={(e) => {
            const next = JSON.parse(JSON.stringify(store)) as ScheduleStore;
            next.openNotes = e.target.value;
            onChange(next);
          }}
        />
      ) : null}
    </div>
  );
}
