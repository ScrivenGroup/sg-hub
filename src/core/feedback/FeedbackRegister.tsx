"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { FeedbackRecord } from "@/core/contracts/types";

const GREEN_WEEKS = 4;
const AMBER_WEEKS = 10;

type AgeBucket = "green" | "amber" | "red";

function ageDays(createdAt: string, now = Date.now()) {
  return Math.max(0, (now - new Date(createdAt).getTime()) / (24 * 60 * 60 * 1000));
}

function ageBucket(createdAt: string, now = Date.now()): AgeBucket {
  const weeks = ageDays(createdAt, now) / 7;
  if (weeks < GREEN_WEEKS) return "green";
  if (weeks <= AMBER_WEEKS) return "amber";
  return "red";
}

function ageLabel(createdAt: string, now = Date.now()) {
  const days = Math.floor(ageDays(createdAt, now));
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
}

function csvEscape(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const bucketColor: Record<AgeBucket, string> = {
  green: "var(--rag-green)",
  amber: "var(--rag-amber)",
  red: "var(--rag-red)",
};

export function FeedbackRegister({ items }: { items: FeedbackRecord[] }) {
  const [view, setView] = useState<"cards" | "table">("cards");
  const [pageFilter, setPageFilter] = useState("all");
  const now = Date.now();

  const pages = useMemo(() => {
    return Array.from(new Set(items.map((i) => i.pageHref))).sort();
  }, [items]);

  const filtered = useMemo(() => {
    if (pageFilter === "all") return items;
    return items.filter((i) => i.pageHref === pageFilter);
  }, [items, pageFilter]);

  const openAgeCounts = useMemo(() => {
    const counts = { green: 0, amber: 0, red: 0 };
    for (const item of items) {
      if (item.status !== "open") continue;
      counts[ageBucket(item.createdAt, now)] += 1;
    }
    return counts;
  }, [items, now]);

  function exportCsv() {
    const headers = [
      "id",
      "kind",
      "status",
      "createdAt",
      "age",
      "pageHref",
      "pageTitle",
      "submittedBy",
      "message",
    ];
    const rows = filtered.map((item) =>
      [
        item.id,
        item.kind,
        item.status,
        item.createdAt,
        ageLabel(item.createdAt, now),
        item.pageHref,
        item.pageTitle,
        item.submittedBy,
        item.message,
      ]
        .map((cell) => csvEscape(String(cell ?? "")))
        .join(","),
    );
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `feedback-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
          Still open
        </p>
        {(
          [
            ["green", `< ${GREEN_WEEKS} weeks`],
            ["amber", `${GREEN_WEEKS}–${AMBER_WEEKS} weeks`],
            ["red", `> ${AMBER_WEEKS} weeks`],
          ] as const
        ).map(([bucket, label]) => (
          <span
            key={bucket}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs text-[var(--ink)]"
            title={label}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: bucketColor[bucket] }}
              aria-hidden
            />
            <span className="font-semibold tabular-nums">
              {openAgeCounts[bucket]}
            </span>
            <span className="text-[var(--muted)]">{label}</span>
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-medium">
          Page
          <select
            className="sg-input mt-1 min-w-[12rem]"
            value={pageFilter}
            onChange={(e) => setPageFilter(e.target.value)}
          >
            <option value="all">All pages</option>
            {pages.map((page) => (
              <option key={page} value={page}>
                {page}
              </option>
            ))}
          </select>
        </label>

        <div
          className="inline-flex rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-0.5"
          role="group"
          aria-label="View mode"
        >
          <button
            type="button"
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              view === "cards"
                ? "bg-[var(--ink)] text-[var(--surface)]"
                : "text-[var(--ink)]"
            }`}
            onClick={() => setView("cards")}
          >
            Cards
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              view === "table"
                ? "bg-[var(--ink)] text-[var(--surface)]"
                : "text-[var(--ink)]"
            }`}
            onClick={() => setView("table")}
          >
            Table
          </button>
        </div>

        <button
          type="button"
          className="sg-btn-secondary"
          onClick={exportCsv}
          disabled={filtered.length === 0}
        >
          Export CSV
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="sg-card">
          <p className="font-medium">No feedback yet</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {items.length === 0
              ? "Open Feedback from the chrome and send a test note."
              : "No items match this page filter."}
          </p>
        </div>
      ) : view === "cards" ? (
        <ul className="space-y-3">
          {filtered.map((item) => {
            const bucket = ageBucket(item.createdAt, now);
            return (
              <li key={item.id} className="sg-card">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                  <span className="rounded-full border border-[var(--border)] px-2 py-0.5 font-medium uppercase text-[var(--ink)]">
                    {item.kind}
                  </span>
                  <span>{item.status}</span>
                  <span className="inline-flex items-center gap-1">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: bucketColor[bucket] }}
                      aria-hidden
                    />
                    {ageLabel(item.createdAt, now)}
                  </span>
                  <time dateTime={item.createdAt}>
                    {new Date(item.createdAt).toLocaleString()}
                  </time>
                  <span>{item.submittedBy}</span>
                </div>
                <p className="whitespace-pre-wrap text-[var(--ink)]">
                  {item.message}
                </p>
                <p className="mt-3 text-xs text-[var(--muted)]">
                  Page:{" "}
                  <Link href={item.pageHref} className="underline">
                    {item.pageHref}
                  </Link>
                  {item.pageTitle ? ` — ${item.pageTitle}` : null}
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="overflow-x-auto rounded-[10px] border border-[var(--border)] bg-[var(--surface)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] text-xs uppercase text-[var(--muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">Kind</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Age</th>
                <th className="px-3 py-2 font-medium">Page</th>
                <th className="px-3 py-2 font-medium">Message</th>
                <th className="px-3 py-2 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const bucket = ageBucket(item.createdAt, now);
                const snippet =
                  item.message.length > 100
                    ? `${item.message.slice(0, 100)}…`
                    : item.message;
                return (
                  <tr
                    key={item.id}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="px-3 py-2 align-top uppercase">{item.kind}</td>
                    <td className="px-3 py-2 align-top">{item.status}</td>
                    <td className="px-3 py-2 align-top">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: bucketColor[bucket] }}
                          aria-hidden
                        />
                        {ageLabel(item.createdAt, now)}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <Link href={item.pageHref} className="underline">
                        {item.pageHref}
                      </Link>
                    </td>
                    <td className="max-w-md px-3 py-2 align-top whitespace-pre-wrap">
                      {snippet}
                    </td>
                    <td className="px-3 py-2 align-top whitespace-nowrap text-[var(--muted)]">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

