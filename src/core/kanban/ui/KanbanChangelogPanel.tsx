"use client";

import { Fragment, useMemo, useState } from "react";
import type { ChangelogEntry } from "@/core/contracts/types";

function newestFirst(a: ChangelogEntry, b: ChangelogEntry) {
  const t = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  if (t !== 0) return t;
  return (b.version ?? "").localeCompare(a.version ?? "", undefined, { numeric: true });
}

/** Later hub Changelog register reads the same `changelogs` store by nodeId / all nodes. */
export function KanbanChangelogPanel({ changelogs }: { changelogs: ChangelogEntry[] }) {
  const releases = useMemo(
    () => [...changelogs].filter((row) => row.kind === "release").sort(newestFirst),
    [changelogs],
  );
  const latestId = releases[0]?.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(latestId);
  const activeId = selectedId ?? latestId;

  return (
    <section className="min-h-0 flex-1 overflow-y-auto">
      <div className="overflow-x-auto rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-3">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Releases
        </h2>
        {releases.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No release rows yet.</p>
        ) : (
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead>
              <tr className="text-xs text-[var(--muted)]">
                <th className="py-1 font-medium">Version</th>
                <th className="py-1 font-medium">Datetime</th>
                <th className="py-1 font-medium">Title</th>
              </tr>
            </thead>
            <tbody>
              {releases.map((entry) => {
                const active = entry.id === activeId;
                return (
                  <Fragment key={entry.id}>
                    <tr
                      className={`cursor-pointer border-t border-[var(--border)] ${
                        active
                          ? "bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]"
                          : "hover:bg-[color-mix(in_srgb,var(--ink)_4%,transparent)]"
                      }`}
                      onClick={() => setSelectedId(entry.id)}
                    >
                      <td className="py-1.5 font-semibold">{entry.version || "—"}</td>
                      <td className="py-1.5 text-[var(--muted)]">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                      <td className="py-1.5">{entry.title}</td>
                    </tr>
                    {active ? (
                      <tr className="border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--ink)_4%,transparent)]">
                        <td colSpan={3} className="px-2 py-3">
                          <div className="sg-prose text-sm text-[var(--ink)]">{entry.body}</div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
