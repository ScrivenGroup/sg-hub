"use client";

import { useState } from "react";
import type { ChangelogEntry } from "@/core/contracts/types";
import { SubTabs } from "./SubTabs";

const SUBS = ["Changelog", "Future Planning"] as const;

export function DevelopmentTab({ changelogs }: { changelogs: ChangelogEntry[] }) {
  const [sub, setSub] = useState<(typeof SUBS)[number]>("Changelog");

  return (
    <div>
      <SubTabs tabs={SUBS} value={sub} onChange={setSub} />
      {sub === "Changelog" ? (
        <section className="max-w-3xl space-y-4">
          {changelogs.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No changelog entries.</p>
          ) : (
            changelogs.map((entry) => (
              <article key={entry.id} className="sg-card">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-medium">{entry.title}</h3>
                  <time className="text-xs text-[var(--muted)]">
                    {new Date(entry.createdAt).toLocaleString()}
                  </time>
                </div>
                <div className="sg-prose text-[var(--ink)]">{entry.body}</div>
              </article>
            ))
          )}
        </section>
      ) : (
        <div className="sg-card max-w-xl border-dashed">
          <h2 className="font-medium">Future planning</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Parking lot for notes while this product is building. Hidden when
            the hub status is Live. Task+Resource Effort on Defaults is a
            follow-on plan.
          </p>
        </div>
      )}
    </div>
  );
}
