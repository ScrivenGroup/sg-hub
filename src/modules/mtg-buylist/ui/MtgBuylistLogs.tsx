"use client";

import { useMemo, useState } from "react";
import {
  clearPlaymantisHarvestDiffAction,
  markPlaymantisHarvestDiffLookedAtAction,
} from "../actions";
import { formatStamp } from "@/core/ui/format-stamp";
import { MtgBuylistPendingOverlay } from "./MtgBuylistPending";
import type { BuylistArchive, PlaymantisHarvestDiffRow } from "../schema";

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const tableClass = "w-max min-w-full text-left text-[13px] leading-5";
const nameHead = "whitespace-nowrap py-1 pr-2 font-medium";
const nameCell = "whitespace-nowrap py-1 pr-2";
const metaHead =
  "whitespace-nowrap border-l border-[color-mix(in_srgb,var(--border)_55%,transparent)] px-1.5 py-1 text-center font-medium";
const metaCell =
  "whitespace-nowrap border-l border-[color-mix(in_srgb,var(--border)_55%,transparent)] py-1 pl-2.5 pr-1.5 tabular-nums";

function buildReviewPrompt(rows: PlaymantisHarvestDiffRow[]): string {
  const ids = rows.map((row) => row.id);
  const lines = rows.map((row) =>
    [
      row.id,
      row.name,
      row.setName,
      row.finish,
      row.verdict,
      money(row.reviewCreditCents),
      money(row.harvestCreditCents),
      String(row.harvestLimit),
      row.note.replace(/\|/g, "/"),
    ].join(" | "),
  );
  return [
    "Review Playmantis harvest vs Import Review diffs for the ScrivenGroup hub (`/p/mtg-buylist`).",
    "",
    "Goal: propose harvest join / parse / status fixes so harvest matches Import Review.",
    "",
    "Rules:",
    "- Do not invent store prices.",
    "- Join order: Scryfall ID + finish, then set + collector number + finish, then stripped name + set name + finish.",
    "- Name is a label only.",
    "",
    "Open diffs (not looked-at):",
    "id | name | set | finish | verdict | review$ | harvest$ | want | note",
    ...lines,
    "",
    "After analysis (code change or not): mark these row IDs as looked-at.",
    "Call `markPlaymantisHarvestDiffLookedAtAction` with this exact id list.",
    "Do not delete the log.",
    "",
    `IDs: ${JSON.stringify(ids)}`,
  ].join("\n");
}

export function MtgBuylistLogs({
  initialRows,
  archives = [],
}: {
  initialRows: PlaymantisHarvestDiffRow[];
  archives?: BuylistArchive[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [error, setError] = useState("");
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hideLookedAt, setHideLookedAt] = useState(true);

  const openRows = useMemo(() => rows.filter((row) => !row.lookedAt), [rows]);
  const visible = hideLookedAt ? openRows : rows;

  function clearLog() {
    if (!armed) {
      setArmed(true);
      return;
    }
    setBusy(true);
    void clearPlaymantisHarvestDiffAction().then((result) => {
      setBusy(false);
      setArmed(false);
      if (!result.ok) {
        setError(result.error || "Could not clear log");
        return;
      }
      setError("");
      setRows([]);
    });
  }

  function copyPrompt() {
    if (!openRows.length) return;
    void navigator.clipboard.writeText(buildReviewPrompt(openRows)).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      },
      () => setError("Clipboard blocked — copy failed."),
    );
  }

  function markVisibleLookedAt() {
    const ids = openRows.map((row) => row.id);
    if (!ids.length) return;
    setBusy(true);
    void markPlaymantisHarvestDiffLookedAtAction(ids).then((result) => {
      setBusy(false);
      if (!result.ok) {
        setError(result.error || "Could not mark looked-at");
        return;
      }
      const now = new Date().toISOString();
      setRows((prev) =>
        prev.map((row) => (ids.includes(row.id) ? { ...row, lookedAt: now } : row)),
      );
    });
  }

  return (
    <div className="min-w-0 space-y-3">
      <MtgBuylistPendingOverlay open={busy} status="Updating logs…" detail="Stay on this page." />

      {archives.length ? (
        <section className="sg-card min-w-0 space-y-2">
          <h2 className="font-medium">Archived runs</h2>
          <ul className="list-disc pl-4 text-sm text-[var(--muted)]">
            {archives.map((row) => (
              <li key={`${row.id}-${row.archivedAt}`}>
                {row.name}
                {row.csvFilename ? ` · ${row.csvFilename}` : ""} ·{" "}
                {formatStamp(row.archivedAt)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="sg-card min-w-0 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <h2 className="font-medium">Harvest vs Import Review</h2>
            <ul className="list-disc pl-4 text-sm text-[var(--muted)]">
              <li>
                Your login only — not other people, not a shared app log.
              </li>
              <li>
                {openRows.length} open
                {rows.length !== openRows.length ? ` · ${rows.length - openRows.length} looked-at` : ""}
                {rows.length === 200 ? " · latest 200" : ""}.
              </li>
            </ul>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="sg-btn-secondary"
              disabled={busy || openRows.length === 0}
              onClick={copyPrompt}
            >
              {copied ? "Copied" : "Copy review prompt"}
            </button>
            <button
              type="button"
              className="sg-btn-secondary"
              disabled={busy || openRows.length === 0}
              onClick={markVisibleLookedAt}
            >
              Mark open as looked-at
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-[10px] border border-[var(--rag-red)] bg-[color-mix(in_srgb,var(--rag-red)_12%,var(--surface))] px-3 text-xs font-semibold text-[var(--rag-red)] hover:bg-[color-mix(in_srgb,var(--rag-red)_22%,var(--surface))] disabled:opacity-50"
              style={{ minHeight: "var(--sg-btn-height)" }}
              disabled={busy || rows.length === 0}
              onClick={clearLog}
            >
              {armed ? "Click again to clear all" : "Clear log"}
            </button>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-3.5 w-3.5"
            checked={hideLookedAt}
            onChange={(e) => setHideLookedAt(e.target.checked)}
          />
          Hide looked-at
        </label>
        {error ? (
          <p className="text-sm text-[var(--rag-red)]" role="alert">
            {error}
          </p>
        ) : null}
        {visible.length ? (
          <div className="min-w-0 overflow-x-auto">
            <table className={tableClass}>
              <thead className="bg-[var(--surface)]">
                <tr className="text-[var(--muted)]">
                  <th className={nameHead}>When</th>
                  <th className={metaHead}>CSV</th>
                  <th className={metaHead}>Review</th>
                  <th className={nameHead}>Card</th>
                  <th className={metaHead}>Set</th>
                  <th className={metaHead}>Fin</th>
                  <th className={metaHead}>Verdict</th>
                  <th className={metaHead}>Review $</th>
                  <th className={metaHead}>Harvest $</th>
                  <th className={metaHead}>Want</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr
                    key={row.id}
                    className={`border-t border-[var(--border)]${
                      row.lookedAt ? " text-[var(--muted)]" : ""
                    }`}
                  >
                    <td className={nameCell}>{formatStamp(row.createdAt)}</td>
                    <td className={metaCell}>{row.csvFilename}</td>
                    <td className={metaCell}>{row.reviewFilename}</td>
                    <td className={nameCell}>{row.name}</td>
                    <td className={metaCell}>{row.setName || "—"}</td>
                    <td className={metaCell}>{row.finish || "—"}</td>
                    <td className={metaCell}>{row.verdict.replace(/_/g, " ")}</td>
                    <td className={metaCell}>{money(row.reviewCreditCents)}</td>
                    <td className={metaCell}>{money(row.harvestCreditCents)}</td>
                    <td className={metaCell}>{row.harvestLimit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            {rows.length
              ? "All open diffs are looked-at."
              : "Save PM deltas from a Run that has harvest + Import Review."}
          </p>
        )}
      </section>
    </div>
  );
}
