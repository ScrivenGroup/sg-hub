"use client";

import { Fragment, useMemo, useState } from "react";
import type { ChangelogEntry } from "@/core/contracts/types";

function newestFirst(a: ChangelogEntry, b: ChangelogEntry) {
  const t = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  if (t !== 0) return t;
  return (b.version ?? "").localeCompare(a.version ?? "", undefined, { numeric: true });
}

/** Live milestone X.Y owns X.Y and X.Y.Z — 1.5 + 1.5.1 together; 1.4.x stays under 1.4. */
export function changelogMilestone(version: string | undefined): string {
  const raw = (version || "").trim();
  if (!raw) return "—";
  const parts = raw.split(".");
  if (parts.length >= 2 && parts[0] && parts[1]) return `${parts[0]}.${parts[1]}`;
  return raw;
}

type MilestoneGroup = {
  key: string;
  rows: ChangelogEntry[];
};

function groupByMilestone(rows: ChangelogEntry[]): MilestoneGroup[] {
  const map = new Map<string, ChangelogEntry[]>();
  const order: string[] = [];
  for (const row of rows) {
    const key = changelogMilestone(row.version);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, [row]);
      order.push(key);
    } else {
      existing.push(row);
    }
  }
  return order.map((key) => ({ key, rows: map.get(key) ?? [] }));
}

/** Later hub Changelog register reads the same `changelogs` store by nodeId / all nodes. */
export function KanbanChangelogPanel({ changelogs }: { changelogs: ChangelogEntry[] }) {
  const rows = useMemo(
    () =>
      [...changelogs]
        .filter((row) => row.kind === "release" || row.kind === "plan")
        .sort(newestFirst),
    [changelogs],
  );
  const groups = useMemo(() => groupByMilestone(rows), [rows]);
  const newestGroupKey = groups[0]?.key ?? null;
  const newestRowId = rows[0]?.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(newestRowId);
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(newestGroupKey ? [newestGroupKey] : []),
  );

  function toggleGroup(key: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <section className="min-h-0 flex-1 overflow-y-auto">
      <div className="overflow-x-auto rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-3">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Versions
        </h2>
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No version rows yet.</p>
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
              {groups.map((group) => {
                const open = openGroups.has(group.key);
                return (
                  <Fragment key={group.key}>
                    <tr className="border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]">
                      <td className="p-0 font-semibold" colSpan={3}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-0 py-1.5 text-left hover:bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]"
                          aria-expanded={open}
                          onClick={() => toggleGroup(group.key)}
                        >
                          <span>{group.key}</span>
                          <span className="text-xs font-medium text-[var(--muted)]">
                            · {group.rows.length}
                          </span>
                        </button>
                      </td>
                    </tr>
                    {open
                      ? group.rows.map((entry) => {
                          const active = entry.id === selectedId;
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
                                <td className="py-1.5 pl-4 font-semibold">
                                  {entry.version || "—"}
                                  {entry.kind === "plan" ? (
                                    <span className="ml-1 text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
                                      plan
                                    </span>
                                  ) : null}
                                </td>
                                <td className="py-1.5 text-[var(--muted)]">
                                  {new Date(entry.createdAt).toLocaleString()}
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
                        })
                      : null}
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
