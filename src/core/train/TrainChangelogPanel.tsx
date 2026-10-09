"use client";

import { Fragment, useMemo, useState } from "react";
import type { ChangelogEntry } from "@/core/contracts/types";
import { formatStamp } from "@/core/ui/format-stamp";
import { formatTrainVersion, isTrainHotfix } from "@/core/train/version";

function newestFirst(a: ChangelogEntry, b: ChangelogEntry) {
  const t = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  if (t !== 0) return t;
  return (b.version ?? "").localeCompare(a.version ?? "", undefined, { numeric: true });
}

/** Website zip history. One row per named Train. Hotfix chip only on hotfix zips. */
export function TrainChangelogPanel({ changelogs }: { changelogs: ChangelogEntry[] }) {
  const rows = useMemo(
    () =>
      [...changelogs]
        .filter((row) => row.kind === "release" || row.kind === "plan")
        .sort(newestFirst),
    [changelogs],
  );
  const newestRowId = rows[0]?.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(newestRowId);

  return (
    <section className="min-h-0 flex-1 overflow-y-auto">
      <div className="overflow-x-auto rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-3">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          {"\"Main\" Changelog"}
        </h2>
        <p className="mb-2 text-xs text-[var(--muted)]">
          Website zips. Clock is vX.Y. Hotfix chip only when that zip was a
          hotfix. Not SG Hub. Not a product leaf.
        </p>
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No Train zips named yet.</p>
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
              {rows.map((entry) => {
                const active = entry.id === selectedId;
                const hotfix = isTrainHotfix(entry.version);
                return (
                  <Fragment key={entry.id}>
                    <tr
                      className={`cursor-pointer border-t border-[var(--border)] ${
                        active
                          ? "bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]"
                          : "hover:bg-[color-mix(in_srgb,var(--ink)_4%,transparent)]"
                      }`}
                      onClick={() =>
                        setSelectedId((id) => (id === entry.id ? null : entry.id))
                      }
                    >
                      <td className="py-1.5 font-semibold">
                        {entry.version ? formatTrainVersion(entry.version) : "—"}
                        {hotfix ? (
                          <span className="ml-1 text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
                            hotfix
                          </span>
                        ) : null}
                        {entry.kind === "plan" ? (
                          <span className="ml-1 text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
                            plan
                          </span>
                        ) : null}
                      </td>
                      <td className="py-1.5 text-[var(--muted)]">
                        {formatStamp(entry.createdAt)}
                      </td>
                      <td className="py-1.5">{entry.title}</td>
                    </tr>
                    {active ? (
                      <tr className="border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--ink)_4%,transparent)]">
                        <td colSpan={3} className="px-2 py-3">
                          <div className="sg-prose text-sm text-[var(--ink)]">
                            {entry.body}
                          </div>
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
