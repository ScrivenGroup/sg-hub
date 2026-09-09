"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  clearBuylistRunAction,
  confirmMateVariantAction,
  createMateHarvestAction,
  enrichCsvTreatmentsAction,
  harvestPlaymantisAction,
  refreshMateImageLinksAction,
  rejectMateVariantAction,
  uploadCsvAction,
} from "../actions";
import { uniqueSetCodes, parseManaBoxCsv, majorityPurchaseCurrency, manaBoxRowsToCsv } from "../logic/parse-csv";
import {
  parseSubmissionCsv,
  subtractSoldFromManaBox,
  type ReprepareResult,
} from "../logic/reprepare";
import {
  buildCompareRows,
  buildMateStreamRows,
  buildPmStreamRows,
  compareRowsCsv,
  formatRecovered,
  manaBoxFilteredCsv,
  manaBoxQtyForCompareFilter,
  RECOVERY_BAND_CHIPS,
  recoveryBand,
  recoveryBandClass,
  recoveredPercent,
  streamRowsCsv,
  type CompareRow,
  type RecoveryBand,
  type StreamRow,
  type StreamTone,
} from "../logic/tables";
import {
  PRICE_SOURCE_LABELS,
  PRICE_SOURCES,
  type ManaBoxRow,
  type MtgBuylistStore,
  type PriceSource,
} from "../schema";
import { CardNameCell } from "./CardNameCell";
import { InfoTip } from "@/core/ui/InfoTip";

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function readFileText(file: File): Promise<string> {
  return file.text();
}

function CollapsibleSection({
  id,
  title,
  hint,
  defaultOpen,
  children,
}: {
  id: string;
  title: string;
  hint?: string;
  defaultOpen: boolean;
  children: ReactNode;
}) {
  const storageKey = `mtg-buylist-section-${id}`;
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return defaultOpen;
    const saved = sessionStorage.getItem(storageKey);
    if (saved === "1") return true;
    if (saved === "0") return false;
    return defaultOpen;
  });
  function toggle() {
    const next = !open;
    setOpen(next);
    sessionStorage.setItem(storageKey, next ? "1" : "0");
  }

  return (
    <section className="sg-card min-w-0 overflow-visible p-0">
      <button
        type="button"
        className="sticky top-14 z-20 flex w-full cursor-pointer items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-left font-medium shadow-sm"
        aria-expanded={open}
        onClick={toggle}
      >
        <span className="text-[var(--muted)]" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
        {title}
        {hint ? (
          <span
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <InfoTip label={hint} />
          </span>
        ) : null}
      </button>
      {open ? <div className="space-y-3 px-4 py-3">{children}</div> : null}
    </section>
  );
}

function FileDropZone({
  accept,
  disabled,
  label,
  hint,
  onFile,
}: {
  accept: string;
  disabled?: boolean;
  label: string;
  hint: string;
  onFile: (file: File) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  return (
    <label
      className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-3 text-center transition-colors ${
        disabled
          ? "cursor-not-allowed opacity-50"
          : "hover:border-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]"
      } ${
        dragOver
          ? "border-[var(--ink)] bg-[color-mix(in_srgb,var(--ink)_10%,transparent)]"
          : "border-[var(--border)]"
      }`}
      onDragEnter={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (disabled) return;
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
    >
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-xs text-[var(--muted)]">{hint}</span>
      <input
        className="sr-only"
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onFile(file);
        }}
      />
    </label>
  );
}

function LoadingBanner({ status, pending }: { status: string; pending: boolean }) {
  if (!pending && !status) return null;
  return (
    <div
      className="sticky top-14 z-30 flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm shadow-md"
      role="status"
      aria-live="polite"
    >
      {pending ? (
        <span
          className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[var(--muted)] border-t-[var(--ink)]"
          aria-hidden
        />
      ) : null}
      <span>{status || "Working…"}</span>
    </div>
  );
}

function BusyOverlay({ status }: { status: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[2147483000] flex items-center justify-center bg-[color-mix(in_srgb,var(--ink)_40%,transparent)] p-4"
      role="alertdialog"
      aria-busy="true"
      aria-live="assertive"
      aria-label={status || "Working"}
    >
      <div className="sg-card max-w-md space-y-3 shadow-2xl">
        <div className="flex items-center gap-3">
          <span
            className="inline-block h-6 w-6 shrink-0 animate-spin rounded-full border-2 border-[var(--muted)] border-t-[var(--ink)]"
            aria-hidden
          />
          <p className="font-medium">{status || "Working…"}</p>
        </div>
        <p className="text-sm text-[var(--muted)]">
          Leave this page alone until this finishes. Counts update here as each batch lands.
        </p>
      </div>
    </div>,
    document.body,
  );
}

function CsvFilenameLink({
  filename,
  csvText,
}: {
  filename: string;
  csvText: string;
}) {
  return (
    <a
      href="#download-csv"
      className="font-medium text-[var(--ink)] underline decoration-[var(--ink)] underline-offset-2 hover:opacity-80"
      onClick={(e) => {
        e.preventDefault();
        downloadText(filename.endsWith(".csv") ? filename : `${filename}.csv`, csvText);
      }}
    >
      {filename}
    </a>
  );
}

function RecoveryLegend({
  selected,
  onToggle,
}: {
  selected?: Set<RecoveryBand>;
  onToggle?: (band: RecoveryBand) => void;
}) {
  const colorVar: Record<(typeof RECOVERY_BAND_CHIPS)[number]["color"], string> = {
    green: "var(--rag-green)",
    amber: "var(--rag-amber)",
    red: "var(--rag-red)",
  };
  return (
    <ul className="mb-2 flex flex-wrap items-center gap-2 text-xs">
      {RECOVERY_BAND_CHIPS.map((chip) => {
        const active = selected?.has(chip.band) ?? false;
        const filtering = Boolean(onToggle);
        const className = `inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 ${
          active
            ? "border-[var(--ink)] bg-[color-mix(in_srgb,var(--ink)_8%,var(--surface))]"
            : "border-[var(--border)] bg-[var(--surface)]"
        } ${filtering ? "cursor-pointer hover:border-[var(--ink)]" : ""}`;
        const title = filtering
          ? `${chip.hint} Click to show only this band. Click again to clear.`
          : chip.hint;
        return (
          <li key={chip.band}>
            {onToggle ? (
              <button
                type="button"
                className={className}
                title={title}
                aria-pressed={active}
                onClick={() => onToggle(chip.band)}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: colorVar[chip.color] }}
                  aria-hidden
                />
                <span className="tabular-nums font-medium">{chip.label}</span>
              </button>
            ) : (
              <span className={className} title={title}>
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: colorVar[chip.color] }}
                  aria-hidden
                />
                <span className="tabular-nums font-medium">{chip.label}</span>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toneClass(tone: StreamTone): string {
  if (tone === "sell") return "bg-[color-mix(in_srgb,var(--rag-green)_14%,transparent)]";
  if (tone === "capped") return "bg-[color-mix(in_srgb,var(--muted)_8%,transparent)]";
  if (tone === "ambiguous") {
    return "bg-[color-mix(in_srgb,var(--rag-amber)_18%,transparent)]";
  }
  return "bg-[color-mix(in_srgb,var(--rag-amber)_10%,transparent)]";
}

type StreamFilter = "all" | "sell" | "capped" | "skip";
type CompareFilter =
  | "all"
  | "sellable"
  | "capped"
  | "notfound"
  | "mate"
  | "playmantis"
  | "unsold";

const COMPARE_FILTERS: { id: CompareFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "sellable", label: "Sellable" },
  { id: "capped", label: "Want full" },
  { id: "notfound", label: "Not found" },
  { id: "mate", label: "Mate picklist" },
  { id: "playmantis", label: "Playmantis picklist" },
  { id: "unsold", label: "Not sold" },
];

function toggleBandInSet(prev: Set<RecoveryBand>, band: RecoveryBand): Set<RecoveryBand> {
  const next = new Set(prev);
  if (next.has(band)) next.delete(band);
  else next.add(band);
  return next;
}

function streamRowMatchesBand(row: StreamRow, bands: Set<RecoveryBand>): boolean {
  if (bands.size === 0) return true;
  if (row.showVariants && row.variants.length) {
    return row.variants.some((v) => bands.has(recoveryBand(v.creditCents, row.listedCents)));
  }
  return bands.has(recoveryBand(row.creditCents, row.listedCents));
}

function compareRowCredit(row: CompareRow, filter: CompareFilter): number {
  if (filter === "mate") return row.mateCreditCents;
  if (filter === "playmantis") return row.playmantisCreditCents;
  if (row.winner === "mate") return row.mateCreditCents;
  if (row.winner === "playmantis") return row.playmantisCreditCents;
  if (row.winner === "split") return Math.max(row.mateCreditCents, row.playmantisCreditCents);
  return 0;
}

function compareRowMatchesBand(
  row: CompareRow,
  filter: CompareFilter,
  bands: Set<RecoveryBand>,
): boolean {
  if (bands.size === 0) return true;
  return bands.has(recoveryBand(compareRowCredit(row, filter), row.listedCents));
}

function filterStreamRows(rows: StreamRow[], filter: StreamFilter): StreamRow[] {
  if (filter === "sell") {
    return rows.filter(
      (r) => r.tone === "sell" || (r.ambiguous && r.variants.some((v) => v.sell > 0)),
    );
  }
  if (filter === "capped") {
    return rows.filter(
      (r) => r.tone === "capped" || (r.ambiguous && r.variants.every((v) => v.sell === 0)),
    );
  }
  if (filter === "skip") return rows.filter((r) => r.tone === "skip");
  return rows;
}

function filterCompareRows(rows: CompareRow[], filter: CompareFilter): CompareRow[] {
  if (filter === "mate") return rows.filter((r) => r.mateSell > 0);
  if (filter === "playmantis") return rows.filter((r) => r.playmantisSell > 0);
  if (filter === "unsold") {
    return rows.filter((r) => r.have - r.mateSell - r.playmantisSell > 0);
  }
  if (filter === "sellable") return rows.filter((r) => r.sellable);
  if (filter === "capped") return rows.filter((r) => r.wantFull);
  if (filter === "notfound") return rows.filter((r) => r.notFound);
  return rows;
}

export function MtgBuylistWorkspace({ initialStore }: { initialStore: MtgBuylistStore }) {
  const router = useRouter();
  const [store, setStore] = useState(initialStore);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [bookmarklet, setBookmarklet] = useState("");
  const [harvestScript, setHarvestScript] = useState("");
  const [setCodes, setSetCodes] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState("");
  const [copied, setCopied] = useState("");
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [pmFilter, setPmFilter] = useState<StreamFilter>("all");
  const [mateFilter, setMateFilter] = useState<StreamFilter>("all");
  const [compareFilter, setCompareFilter] = useState<CompareFilter>("all");
  const [pendingCsv, setPendingCsv] = useState<{
    text: string;
    filename: string;
    mixedCurrency: boolean;
    currencyFromFile: string;
    missingCurrency: boolean;
  } | null>(null);
  const [priceSource, setPriceSource] = useState<PriceSource>("tcgplayer");
  const [priceCurrency, setPriceCurrency] = useState("AUD");
  const [pmSubmission, setPmSubmission] = useState<{
    filename: string;
    rows: ManaBoxRow[];
  } | null>(null);
  const [mateSubmission, setMateSubmission] = useState<{
    filename: string;
    rows: ManaBoxRow[];
  } | null>(null);

  useEffect(() => {
    setStore(initialStore);
  }, [initialStore.updatedAt]);

  const csvSets = useMemo(
    () => (store.csv ? uniqueSetCodes(store.csv.rows) : []),
    [store.csv],
  );
  const leftover: ReprepareResult | null = useMemo(() => {
    if (!store.csv) return null;
    const lists = [pmSubmission?.rows, mateSubmission?.rows].filter(
      (rows): rows is ManaBoxRow[] => Boolean(rows?.length),
    );
    if (!lists.length) return null;
    return subtractSoldFromManaBox(store.csv.rows, lists);
  }, [store.csv, pmSubmission, mateSubmission]);

  useEffect(() => {
    setPmSubmission(null);
    setMateSubmission(null);
  }, [store.csv?.uploadedAt, store.csv?.filename]);
  const pmTotal = store.csv
    ? new Set(store.csv.rows.map((r) => r.scryfallId.trim().toLowerCase()).filter(Boolean)).size
    : 0;
  const pmDone = store.playmantis
    ? new Set(
        store.playmantis.offers
          .filter((o) => !o.missing)
          .map((o) => o.scryfallId.trim().toLowerCase()),
      ).size
    : 0;
  const pmWanted = store.playmantis
    ? store.playmantis.offers.filter((o) => !o.missing && o.creditCents > 0).length
    : 0;
  const pmMissing = store.playmantis
    ? new Set(
        store.playmantis.offers
          .filter((o) => o.missing)
          .map((o) => o.scryfallId.trim().toLowerCase()),
      ).size
    : 0;

  const pmRows = useMemo(
    () =>
      store.csv && store.playmantis
        ? buildPmStreamRows(store.csv.rows, store.playmantis.offers)
        : [],
    [store.csv, store.playmantis],
  );
  const mateResolveOpts = useMemo(
    () => ({
      confirmations: store.mateConfirmations || {},
      imageLinks: store.mateImageLinks || {},
      reconfirm: store.mateReconfirm || {},
    }),
    [store.mateConfirmations, store.mateImageLinks, store.mateReconfirm],
  );
  const mateRows = useMemo(
    () =>
      store.csv && store.mate
        ? buildMateStreamRows(store.csv.rows, store.mate.offers, mateResolveOpts)
        : [],
    [store.csv, store.mate, mateResolveOpts],
  );
  const compareRows = useMemo(
    () =>
      store.csv && (store.playmantis || store.mate)
        ? buildCompareRows(
            store.csv.rows,
            store.mate?.offers || [],
            store.playmantis?.offers || [],
            mateResolveOpts,
          )
        : [],
    [store.csv, store.mate, store.playmantis, mateResolveOpts],
  );

  function confirmMateVariant(rowKey: string, mateUuid: string, currentlyConfirmed: boolean) {
    // Optimistic: flip confirmations only — stream/compare rows recompute via useMemo.
    setStore((prev) => {
      const nextConfirm = { ...(prev.mateConfirmations || {}) };
      const nextReconfirm = { ...(prev.mateReconfirm || {}) };
      if (currentlyConfirmed) delete nextConfirm[rowKey];
      else {
        nextConfirm[rowKey] = mateUuid;
        delete nextReconfirm[rowKey];
      }
      return { ...prev, mateConfirmations: nextConfirm, mateReconfirm: nextReconfirm };
    });
    setError("");
    startTransition(async () => {
      const result = await confirmMateVariantAction(
        rowKey,
        currentlyConfirmed ? null : mateUuid,
      );
      if (!result.ok) {
        setError(result.error || "Could not save Mate confirmation");
        return;
      }
      if (result.store) setStore(result.store);
    });
  }

  function rejectMateVariant(rowKey: string) {
    setStore((prev) => {
      const nextConfirm = { ...(prev.mateConfirmations || {}) };
      delete nextConfirm[rowKey];
      return {
        ...prev,
        mateConfirmations: nextConfirm,
        mateReconfirm: { ...(prev.mateReconfirm || {}), [rowKey]: true },
      };
    });
    setError("");
    startTransition(async () => {
      const result = await rejectMateVariantAction(rowKey);
      if (!result.ok) {
        setError(result.error || "Could not reopen Mate printings");
        return;
      }
      if (result.store) setStore(result.store);
    });
  }

  function copyText(label: string, text: string) {
    void navigator.clipboard.writeText(text).then(
      () => {
        setCopied(label);
        setTimeout(() => setCopied(""), 2000);
      },
      () => setError("Clipboard blocked — select the text and copy manually."),
    );
  }

  function run<T extends { ok: boolean; error?: string; store?: MtgBuylistStore }>(
    fn: () => Promise<T>,
    working: string,
  ) {
    setError("");
    setStatus(working);
    setBusy(true);
    void (async () => {
      try {
        const result = await fn();
        if (!result.ok) {
          setError(result.error || "That step failed");
          setStatus("");
          return;
        }
        if (result.store) setStore(result.store);
        setStatus("");
        router.refresh();
      } finally {
        setBusy(false);
      }
    })();
  }

  function missingIdCount(next: MtgBuylistStore): number {
    return new Set(
      (next.playmantis?.offers || [])
        .filter((o) => o.missing)
        .map((o) => o.scryfallId.trim().toLowerCase()),
    ).size;
  }

  async function harvestPlaymantisLoop(opts: {
    missingOnly: boolean;
    label: string;
    gapMs: number;
  }): Promise<MtgBuylistStore | null> {
    const skipIds: string[] = [];
    let last: MtgBuylistStore | null = null;
    while (true) {
      const result = await harvestPlaymantisAction(skipIds, {
        missingOnly: opts.missingOnly,
      });
      if (!result.ok) {
        setError(result.error);
        setStatus("");
        return null;
      }
      skipIds.push(...result.fetchedIds);
      last = result.store;
      setStore(result.store);
      setStatus(
        opts.missingOnly
          ? `${opts.label} · ${result.remaining} left — leave this page alone`
          : `${opts.label} ${result.done} / ${result.total} — leave this page alone`,
      );
      if (result.remaining <= 0) break;
      await new Promise((resolve) => setTimeout(resolve, opts.gapMs));
    }
    return last;
  }

  function acceptSubmission(
    file: File,
    storeName: "playmantis" | "mate",
  ) {
    void readFileText(file).then((text) => {
      try {
        const rows = parseSubmissionCsv(text);
        if (!rows.length) {
          setError("No card rows in that submission CSV");
          return;
        }
        setError("");
        const next = { filename: file.name, rows };
        if (storeName === "playmantis") setPmSubmission(next);
        else setMateSubmission(next);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Need a ManaBox-shaped CSV (Name, Set code, Quantity)",
        );
      }
    });
  }

  function confirmCsvUpload() {
    if (!pendingCsv) return;
    const currency = priceCurrency.trim().toUpperCase();
    if (!currency) {
      setError("Set the listed-price currency for this CSV");
      return;
    }
    const file = pendingCsv;
    setPendingCsv(null);
    run(
      () => uploadCsvAction(file.text, file.filename, priceSource, currency),
      "Reading CSV…",
    );
  }

  function uploadMateFile(file: File) {
    const megabytes = file.size / (1024 * 1024);
    if (file.size > 32 * 1024 * 1024) {
      setError(
        `Mate JSON is ${megabytes.toFixed(1)} MB — over the 32 MB upload limit.`,
      );
      return;
    }
    setError("");
    setStatus(
      megabytes >= 4
        ? `Uploading ${megabytes.toFixed(1)} MB Mate JSON… leave this page alone`
        : "Uploading Mate JSON… leave this page alone",
    );
    setBusy(true);
    void (async () => {
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/mtg-buylist/mate-upload", {
          method: "POST",
          body: form,
        });
        const raw = await res.text();
        let data: {
          ok: boolean;
          error?: string;
          store?: MtgBuylistStore;
          summary?: {
            offers: number;
            sets: number;
            harvestedOffers?: number;
            harvestedSets?: number;
          };
        };
        try {
          data = JSON.parse(raw) as typeof data;
        } catch {
          setError(
            res.status === 413
              ? `Mate JSON is too large (${megabytes.toFixed(1)} MB) for this server.`
              : `Mate upload failed (${res.status}).`,
          );
          setStatus("");
          return;
        }
        if (!data.ok) {
          setError(data.error || `Mate upload failed (${res.status})`);
          setStatus("");
          return;
        }
        if (data.store) setStore(data.store);
        setStatus(
          data.summary
            ? data.summary.harvestedOffers &&
              data.summary.harvestedOffers > data.summary.offers
              ? `Mate snapshot: ${data.summary.offers} offers across ${data.summary.sets} CSV sets (kept from ${data.summary.harvestedOffers} in the harvest).`
              : `Mate snapshot: ${data.summary.offers} offers across ${data.summary.sets} sets (image joins applied).`
            : "Mate JSON uploaded.",
        );
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Mate upload failed");
        setStatus("");
      } finally {
        setBusy(false);
      }
    })();
  }

  function acceptCsvFile(file: File) {
    void readFileText(file).then((text) => {
      try {
        const rows = parseManaBoxCsv(text);
        if (!rows.length) {
          setError("No card rows in that CSV");
          return;
        }
        const detected = majorityPurchaseCurrency(rows);
        setError("");
        setPriceCurrency(detected.currency || "AUD");
        setPendingCsv({
          text,
          filename: file.name,
          mixedCurrency: detected.mixed,
          currencyFromFile: detected.currency,
          missingCurrency: detected.missing,
        });
      } catch (err) {
        setPendingCsv(null);
        setError(err instanceof Error ? err.message : "CSV parse failed");
      }
    });
  }

  return (
    <div className="min-w-0 space-y-4" aria-busy={busy}>
      <div className="flex flex-wrap items-center gap-1.5">
        <div role="tablist" aria-label="Runs" className="flex flex-wrap">
          <button type="button" role="tab" aria-selected className="sg-tab">
            This run
          </button>
        </div>
        <InfoTip label="This run is the only slot today. Parallel runs (several independent CSV/harvest sessions) are a future idea — logged in this leaf’s Inbox." />
      </div>
      {busy ? <BusyOverlay status={status} /> : null}
      {error ? (
        <p className="sg-card border-[var(--rag-red)] text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {!busy ? <LoadingBanner status={status} pending={pending} /> : null}

      <CollapsibleSection
        id="csv"
        title="1. ManaBox CSV"
        hint="Shared input for every store. Purchase price comes from the CSV; ManaBox source (CK / TCGPlayer / Scryfall) is asked once per upload."
        defaultOpen
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-[10px] border border-[var(--rag-red)] bg-[color-mix(in_srgb,var(--rag-red)_12%,var(--surface))] px-3 text-xs font-semibold text-[var(--rag-red)] hover:bg-[color-mix(in_srgb,var(--rag-red)_22%,var(--surface))] disabled:opacity-50"
            style={{ minHeight: "var(--sg-btn-height)" }}
            disabled={pending || busy}
            onClick={() => run(() => clearBuylistRunAction(), "Clearing run…")}
          >
            Clear this run
          </button>
        </div>
        <FileDropZone
          accept=".csv,text/csv"
          disabled={pending || busy}
          label="Choose ManaBox CSV or drop it here"
          hint="Click this box — .csv up to ~1000 cards"
          onFile={acceptCsvFile}
        />
        {pendingCsv ? (
          <div className="mt-3 space-y-3 rounded border border-[var(--border)] p-3">
            <p className="text-sm">
              <CsvFilenameLink filename={pendingCsv.filename} csvText={pendingCsv.text} /> ready.
              Where does ManaBox draw these listed prices from?
            </p>
            <label className="block text-sm">
              Price source
              <select
                className="sg-input mt-1"
                value={priceSource}
                onChange={(e) => setPriceSource(e.target.value as PriceSource)}
              >
                {PRICE_SOURCES.map((src) => (
                  <option key={src} value={src}>
                    {PRICE_SOURCE_LABELS[src]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Listed currency
              <input
                className="sg-input mt-1"
                value={priceCurrency}
                onChange={(e) => setPriceCurrency(e.target.value.toUpperCase())}
                placeholder="AUD"
              />
            </label>
            <p className="text-xs text-[var(--muted)]">
              {pendingCsv.missingCurrency
                ? "The CSV had no Purchase price currency column — set it here."
                : pendingCsv.mixedCurrency
                  ? `File has mixed currencies; majority is ${pendingCsv.currencyFromFile}. Confirm the basis for this run.`
                  : `File lists ${pendingCsv.currencyFromFile || "a currency"}. Confirm if that is what ManaBox was set to.`}
            </p>
            <button
              type="button"
              className="sg-btn-primary disabled:opacity-50"
              disabled={pending || busy}
              onClick={() => confirmCsvUpload()}
            >
              Use this CSV
            </button>
          </div>
        ) : null}
        {store.csv ? (
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <p className="flex flex-wrap items-center gap-1.5 text-sm text-[var(--muted)]">
              <CsvFilenameLink
                filename={store.csv.filename}
                csvText={manaBoxRowsToCsv(store.csv.rows)}
              />
              · {store.csv.rows.length} printings · {csvSets.length} sets
              <InfoTip
                label={`${new Date(store.csv.uploadedAt).toLocaleString()}. Price basis: ${PRICE_SOURCE_LABELS[store.csv.priceSource]} · ${store.csv.priceCurrency || "currency unknown"}. ${
                  store.csv.rows.some((r) => (r.frameEffects || []).length > 0)
                    ? `Scryfall treatments on ${store.csv.rows.filter((r) => (r.frameEffects || []).length > 0).length}/${store.csv.rows.length} (used for Mate auto-match).`
                    : "No Scryfall treatments yet — Refresh Scryfall treatments so Extended Art can auto-match (keeps Mate/PM harvests; a full CSV re-upload would clear Playmantis)."
                }`}
              />
            </p>
            <button
              type="button"
              className="sg-btn-secondary shrink-0 text-sm"
              disabled={pending || busy}
              onClick={() =>
                run(() => enrichCsvTreatmentsAction(), "Asking Scryfall for treatments…")
              }
            >
              Refresh Scryfall treatments
            </button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--muted)]">No CSV in this run yet.</p>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        id="pm"
        title="2. Playmantis stream"
        hint="Scryfall ID tag first. Empty tag page uses their on-site title search (`title:*word*`) and binds the same name (prefers your set). Want = 4 minus listed stock. Harvest then retries not-found IDs slower (keeps cards already found). Leave the page alone while it runs."
        defaultOpen={Boolean(store.csv)}
      >
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="sg-btn-primary disabled:opacity-50"
            disabled={pending || busy || !store.csv}
            onClick={() => {
              void (async () => {
                setError("");
                setBusy(true);
                setStatus("Harvesting Playmantis… leave this page alone");
                try {
                  const after = await harvestPlaymantisLoop({
                    missingOnly: false,
                    label: "Harvesting Playmantis",
                    gapMs: 400,
                  });
                  if (!after) return;
                  const stillMissing = missingIdCount(after);
                  if (stillMissing > 0) {
                    setStatus(
                      `Retrying ${stillMissing} unfound — slower pass, leave this page alone`,
                    );
                    await new Promise((resolve) => setTimeout(resolve, 1500));
                    const retried = await harvestPlaymantisLoop({
                      missingOnly: true,
                      label: "Retrying unfound",
                      gapMs: 1200,
                    });
                    if (!retried) return;
                  }
                  setStatus("Playmantis harvest finished.");
                  router.refresh();
                } finally {
                  setBusy(false);
                }
              })();
            }}
          >
            Harvest Playmantis
          </button>
          <button
            type="button"
            className="sg-btn-secondary disabled:opacity-50"
            disabled={pending || busy || !store.csv || pmMissing === 0}
            onClick={() => {
              void (async () => {
                setError("");
                setBusy(true);
                setStatus(
                  `Retrying ${pmMissing} unfound — leave this page alone`,
                );
                try {
                  const retried = await harvestPlaymantisLoop({
                    missingOnly: true,
                    label: "Retrying unfound",
                    gapMs: 1200,
                  });
                  if (!retried) return;
                  setStatus("Unfound retry finished.");
                  router.refresh();
                } finally {
                  setBusy(false);
                }
              })();
            }}
          >
            Retry not found
          </button>
        </div>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Looked up {pmDone} / {pmTotal} Scryfall IDs
          {store.playmantis
            ? ` · ${pmWanted} finish-offers with credit · ${pmMissing} not found`
            : ""}
          {store.playmantis?.fetchedAt
            ? ` · ${new Date(store.playmantis.fetchedAt).toLocaleString()}`
            : ""}
          .
        </p>
        {pmRows.length ? (
          <StreamTable
            mode="pm"
            rows={pmRows}
            filter={pmFilter}
            onFilter={setPmFilter}
            creditTotal={store.resultPm?.totals.playmantisCreditCents ?? 0}
            priceSource={store.csv?.priceSource}
            priceCurrency={store.csv?.priceCurrency}
            onDownload={() =>
              downloadText(
                "mtg-buylist-playmantis.csv",
                streamRowsCsv(filterStreamRows(pmRows, pmFilter), "pm"),
              )
            }
          />
        ) : (
          <p className="mt-4 text-sm text-[var(--muted)]">
            Run PM harvest to see what Playmantis will buy.
          </p>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        id="mate"
        title="3. MTGMate stream"
        hint="Harvest Mate alone (console script + JSON upload). Large files use the upload API. Ambiguous printings are joined by exact image match to Scryfall when possible."
        defaultOpen={Boolean(store.csv)}
      >
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="sg-btn-primary disabled:opacity-50"
            disabled={pending || busy || !store.csv}
            onClick={() => {
              setError("");
              setStatus("Creating harvest token…");
              setBusy(true);
              void (async () => {
                try {
                  const result = await createMateHarvestAction(window.location.origin);
                  if (!result.ok) {
                    setError(result.error);
                    setStatus("");
                    return;
                  }
                  setHarvestScript(result.script);
                  setBookmarklet(result.bookmarklet);
                  setSetCodes(result.setCodes);
                  setExpiresAt(result.expiresAt);
                  setStatus(`Token ready until ${new Date(result.expiresAt).toLocaleTimeString()}.`);
                } finally {
                  setBusy(false);
                }
              })();
            }}
          >
            Prepare Mate harvest
          </button>
        </div>
        {harvestScript ? (
          <div className="mt-4 space-y-3">
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              <li>Copy the harvest script.</li>
              <li>
                Open{" "}
                <a
                  className="underline"
                  href="https://www.mtgmate.com.au/"
                  target="_blank"
                  rel="noreferrer"
                >
                  mtgmate.com.au
                </a>{" "}
                and sign in.
              </li>
              <li>F12 → Console → paste → Enter (download + optional POST).</li>
              <li>Upload the JSON below if needed.</li>
            </ol>
            <p className="text-sm">
              Sets: {setCodes.join(", ") || "none"}. Token expires{" "}
              {expiresAt ? new Date(expiresAt).toLocaleString() : ""}.
            </p>
            <button
              type="button"
              className="sg-btn-secondary"
              onClick={() => copyText("script", harvestScript)}
            >
              {copied === "script" ? "Copied" : "Copy harvest script"}
            </button>
            <label className="block text-sm">
              Harvest script
              <textarea
                className="sg-input mt-1 min-h-24 font-mono text-xs"
                readOnly
                value={harvestScript}
              />
            </label>
            <button
              type="button"
              className="sg-btn-ghost text-sm"
              onClick={() => copyText("bookmark", bookmarklet)}
            >
              {copied === "bookmark" ? "Copied" : "Copy javascript: bookmark URL"}
            </button>
          </div>
        ) : null}
        <FileDropZone
          accept=".json,.customization,application/json"
          disabled={pending || busy || !store.csv}
          label="Choose Mate harvest JSON or drop it here"
          hint="Click this box — full Mate harvest JSON is OK (tens of MB; leave the tab open)"
          onFile={uploadMateFile}
        />
        {store.mate ? (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="flex flex-wrap items-center gap-1.5 text-sm text-[var(--muted)]">
              Mate snapshot · {store.mate.offers.length} rows
              <InfoTip
                label={`Sets ${store.mate.sets.join(", ") || "—"} (${store.mate.source}). ${new Date(store.mate.harvestedAt).toLocaleString()}. Image joins: ${Object.keys(store.mateImageLinks || {}).length} Mate printings linked to Scryfall.`}
              />
            </p>
            <button
              type="button"
              className="sg-btn-secondary shrink-0 text-sm"
              disabled={pending || busy}
              onClick={() =>
                run(() => refreshMateImageLinksAction(), "Matching Mate images to Scryfall…")
              }
            >
              Refresh Mate image joins
            </button>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">No Mate snapshot in this run yet.</p>
        )}
        {mateRows.length ? (
          <StreamTable
            mode="mate"
            rows={mateRows}
            filter={mateFilter}
            onFilter={setMateFilter}
            creditTotal={store.resultMate?.totals.mateCreditCents ?? 0}
            cashTotal={store.resultMate?.totals.mateCashCents ?? 0}
            priceSource={store.csv?.priceSource}
            priceCurrency={store.csv?.priceCurrency}
            onConfirmMate={confirmMateVariant}
            onRejectMate={rejectMateVariant}
            onDownload={() =>
              downloadText(
                "mtg-buylist-mtgmate.csv",
                streamRowsCsv(filterStreamRows(mateRows, mateFilter), "mate"),
              )
            }
          />
        ) : (
          <p className="mt-4 text-sm text-[var(--muted)]">
            Upload a Mate harvest to see what Mate will buy.
          </p>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        id="compare"
        title="4. Compare stores"
        hint="Works with one store or both. Who wins, how many to pull (Sell), and winner Gain %. Confirm Mate printings in the Mate stream first. Filter tabs each export as compare CSV or a ManaBox template of that filter."
        defaultOpen={Boolean(store.playmantis || store.mate)}
      >
        {compareRows.length ? (
          <CompareTable
            rows={compareRows}
            filter={compareFilter}
            onFilter={setCompareFilter}
            mateCredit={store.resultCompare?.totals.mateCreditCents ?? 0}
            mateCash={store.resultCompare?.totals.mateCashCents ?? 0}
            pmCredit={store.resultCompare?.totals.playmantisCreditCents ?? 0}
            priceSource={store.csv?.priceSource}
            priceCurrency={store.csv?.priceCurrency}
            csvFilename={store.csv?.filename || "manabox.csv"}
            onExportCsv={() => {
              downloadText(
                `mtg-buylist-compare-${compareFilter}.csv`,
                compareRowsCsv(filterCompareRows(compareRows, compareFilter)),
              );
            }}
            onExportManaBox={() => {
              const stem = (store.csv?.filename || "manabox").replace(/\.csv$/i, "");
              const subset = filterCompareRows(compareRows, compareFilter);
              downloadText(
                `${stem}-${compareFilter}-manabox.csv`,
                manaBoxFilteredCsv(
                  store.csv?.rows || [],
                  subset,
                  manaBoxQtyForCompareFilter(compareFilter),
                ),
              );
            }}
          />
        ) : (
          <p className="text-sm text-[var(--muted)]">
            Harvest Playmantis or upload Mate to use filters and exports here.
          </p>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        id="reprepare"
        title="5. Re-prepare ManaBox after pick"
        hint="After the shop floor, 1–2 cards may not have been picked. Upload the Playmantis and/or Mate submission CSVs (ManaBox-shaped — the templates this app exported, or the files you actually sent). Leftover = this run’s original CSV minus those copies. Overwrite ManaBox with the download — not the Compare Not-sold export."
        defaultOpen={Boolean(store.csv)}
      >
        {!store.csv ? (
          <p className="text-sm text-[var(--muted)]">
            Upload a ManaBox CSV in step 1 first. This step uses that file, not Compare Sell qty.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <FileDropZone
                  accept=".csv,text/csv"
                  disabled={pending || busy}
                  label="Playmantis submission"
                  hint="ManaBox-shaped CSV of what you sent / they took"
                  onFile={(file) => acceptSubmission(file, "playmantis")}
                />
                {pmSubmission ? (
                  <p className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
                    {pmSubmission.filename} · {pmSubmission.rows.length} printings
                    <button
                      type="button"
                      className="sg-btn-ghost"
                      onClick={() => setPmSubmission(null)}
                    >
                      Clear
                    </button>
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <FileDropZone
                  accept=".csv,text/csv"
                  disabled={pending || busy}
                  label="MTGMate submission"
                  hint="ManaBox-shaped CSV of what you sent / they took"
                  onFile={(file) => acceptSubmission(file, "mate")}
                />
                {mateSubmission ? (
                  <p className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
                    {mateSubmission.filename} · {mateSubmission.rows.length} printings
                    <button
                      type="button"
                      className="sg-btn-ghost"
                      onClick={() => setMateSubmission(null)}
                    >
                      Clear
                    </button>
                  </p>
                ) : null}
              </div>
            </div>
            {leftover ? (
              <div className="space-y-2">
                <p className="text-sm">
                  Removed {leftover.removedCopies} copies · leftover {leftover.leftoverCopies} copies
                  ({leftover.leftover.length} printings)
                </p>
                <button
                  type="button"
                  className="sg-btn-primary"
                  onClick={() => {
                    const stem = (store.csv?.filename || "manabox").replace(/\.csv$/i, "");
                    downloadText(`${stem}-leftover-manabox.csv`, leftover.leftoverCsv);
                  }}
                >
                  Download leftover ManaBox CSV
                </button>
                {leftover.unmatched.length ? (
                  <div className="sg-card border-[var(--rag-amber)] text-sm">
                    <p className="font-medium">
                      {leftover.unmatched.length} submission line
                      {leftover.unmatched.length === 1 ? "" : "s"} did not match the original CSV
                    </p>
                    <ul className="mt-1 list-disc pl-5">
                      {leftover.unmatched.slice(0, 8).map((line, i) => (
                        <li key={`${line.name}-${line.setCode}-${i}`}>
                          {line.name} ({line.setCode || "no set"}) · {line.remaining} left unmatched
                          — {line.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">
                Drop at least one submission to build the leftover file.
              </p>
            )}
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className="sg-tab"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function PriceBasisNote({
  source,
  currency,
}: {
  source?: PriceSource;
  currency?: string;
}) {
  const src = PRICE_SOURCE_LABELS[source || "other"];
  const cur = (currency || "").trim().toUpperCase() || "unknown";
  const fx = cur !== "AUD" && cur !== "unknown";
  return (
    <p className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-[var(--muted)]">
      {src} · {cur}
      <InfoTip
        label={`Price basis: ${src} · ${cur}. Recovered % = store credit ÷ ManaBox listed${
          fx ? `. Listed is ${cur}; store credit is AUD — recovered % is not FX-adjusted.` : "."
        }`}
      />
    </p>
  );
}

function StreamTable({
  mode,
  rows,
  filter,
  onFilter,
  creditTotal,
  cashTotal,
  priceSource,
  priceCurrency,
  onConfirmMate,
  onRejectMate,
  onDownload,
}: {
  mode: "pm" | "mate";
  rows: StreamRow[];
  filter: StreamFilter;
  onFilter: (f: StreamFilter) => void;
  creditTotal: number;
  cashTotal?: number;
  priceSource?: PriceSource;
  priceCurrency?: string;
  onConfirmMate?: (rowKey: string, mateUuid: string, currentlyConfirmed: boolean) => void;
  onRejectMate?: (rowKey: string) => void;
  onDownload: () => void;
}) {
  const [bandFilter, setBandFilter] = useState<Set<RecoveryBand>>(new Set());
  const visible = filterStreamRows(rows, filter).filter((row) =>
    streamRowMatchesBand(row, bandFilter),
  );
  const sellCopies = rows.reduce((n, r) => n + r.sell, 0);
  const colCount = mode === "mate" ? 11 : 10;
  const filterLabel =
    filter === "all"
      ? "All"
      : filter === "sell"
        ? "Sellable"
        : filter === "capped"
          ? "Want full"
          : "Not found";
  return (
    <div className="mt-4 min-w-0 border-t border-[var(--border)] pt-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[var(--muted)]">
                {mode === "pm" ? "Playmantis credit" : "Mate credit"}
              </dt>
              <dd className="text-lg font-semibold">{money(creditTotal)}</dd>
              {mode === "mate" ? (
                <p className="text-xs text-[var(--muted)]">
                  cash {money(cashTotal || 0)} (informational, not compared)
                </p>
              ) : null}
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Sell copies</dt>
              <dd className="text-lg font-semibold">{sellCopies}</dd>
            </div>
          </dl>
        </div>
        <button type="button" className="sg-btn-secondary" onClick={onDownload}>
          Download CSV
        </button>
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-2" role="tablist" aria-label="Row filter">
        <FilterChip active={filter === "all"} label="All" onClick={() => onFilter("all")} />
        <FilterChip active={filter === "sell"} label="Sellable" onClick={() => onFilter("sell")} />
        <FilterChip
          active={filter === "capped"}
          label="Want full"
          onClick={() => onFilter("capped")}
        />
        <FilterChip
          active={filter === "skip"}
          label="Not found"
          onClick={() => onFilter("skip")}
        />
      </div>
      <p className="sticky top-12 z-10 mb-2 flex flex-wrap items-center gap-1.5 rounded bg-[var(--surface)] py-1 text-xs font-medium text-[var(--muted)]">
        Showing {filterLabel}
        {bandFilter.size > 0 ? " · recovered % filter" : ""} · {visible.length} of {rows.length}
        <InfoTip
          label={`Green = sellable · grey = want full · amber = not found${
            mode === "mate"
              ? " · amber+ = ambiguous Mate — Confirm the printing you own · Wrong printing reopens variants"
              : ""
          }. Hover O = owned, S = store match.`}
        />
      </p>
      <PriceBasisNote source={priceSource} currency={priceCurrency} />
      <RecoveryLegend
        selected={bandFilter}
        onToggle={(band) => setBandFilter((prev) => toggleBandInSet(prev, band))}
      />
      <div className="min-w-0 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--surface)]">
            <tr className="text-[var(--muted)]">
              <th className="min-w-0 py-1 font-medium">Name</th>
              <th className="whitespace-nowrap py-1 font-medium">Set</th>
              <th className="whitespace-nowrap py-1 font-medium">#</th>
              <th className="whitespace-nowrap py-1 font-medium">Finish</th>
              <th className="whitespace-nowrap py-1 font-medium tabular-nums">Have</th>
              <th className="whitespace-nowrap py-1 font-medium tabular-nums">Wanted</th>
              <th className="whitespace-nowrap py-1 font-medium tabular-nums">Sell</th>
              <th className="whitespace-nowrap py-1 font-medium tabular-nums">Listed</th>
              <th className="whitespace-nowrap py-1 font-medium tabular-nums">Credit</th>
              <th className="whitespace-nowrap py-1 font-medium tabular-nums">Gain</th>
              {mode === "mate" ? (
                <th className="whitespace-nowrap py-1 font-medium tabular-nums">Cash</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, i) => (
              <StreamRowBlock
                key={`${row.scryfallId}-${row.name}-${i}`}
                mode={mode}
                row={row}
                colCount={colCount}
                onConfirmMate={onConfirmMate}
                onRejectMate={onRejectMate}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StreamRowBlock({
  mode,
  row,
  colCount,
  onConfirmMate,
  onRejectMate,
}: {
  mode: "pm" | "mate";
  row: StreamRow;
  colCount: number;
  onConfirmMate?: (rowKey: string, mateUuid: string, currentlyConfirmed: boolean) => void;
  onRejectMate?: (rowKey: string) => void;
}) {
  if (mode === "mate" && row.showVariants && row.variants.length) {
    const headerTone = row.ambiguous ? "ambiguous" : row.tone;
    return (
      <>
        <tr className={`border-t border-[var(--border)] ${toneClass(headerTone)}`}>
          <td className="min-w-0 py-1.5" colSpan={colCount}>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <CardNameCell
                name={row.name}
                ownedImageUrl={row.ownedImageUrl}
                showOwned
                showStore={false}
              />
              <span className="rounded bg-[color-mix(in_srgb,var(--rag-amber)_35%,transparent)] px-1.5 py-0.5 text-xs font-semibold">
                {row.confirmedMateUuid
                  ? `Confirmed — ${row.variants.length} Mate printings`
                  : `Ambiguous — ${row.variants.length} Mate printings`}
              </span>
              <span className="text-xs text-[var(--muted)]">
                {row.setCode}
                {row.collectorNumber ? ` #${row.collectorNumber}` : ""} · {row.finish} · have{" "}
                {row.have} · listed {money(row.listedCents)}
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Same name/finish, different art/print. Tick <strong>Confirm</strong> on the
              printing you own (one only). Untick to clear. Recovered % is per variant vs the
              same listed price.
            </p>
          </td>
        </tr>
        {row.variants.map((v) => {
          const confirmed = row.confirmedMateUuid === v.mateUuid;
          const variantTone: StreamTone =
            confirmed && row.tone !== "ambiguous"
              ? row.tone
              : v.sell > 0
                ? "sell"
                : v.wanted > 0 || v.creditCents > 0
                  ? "capped"
                  : "skip";
          return (
            <tr
              key={v.mateUuid}
              className={`border-t border-[var(--border)] ${toneClass(variantTone)}`}
            >
              <td className="min-w-0 py-1.5 pl-6">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 text-xs font-medium">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5"
                      checked={confirmed}
                      disabled={!onConfirmMate}
                      onChange={() => onConfirmMate?.(row.rowKey, v.mateUuid, confirmed)}
                    />
                    Confirm
                  </label>
                  <CardNameCell
                    name={`${row.name} · ${v.label}`}
                    storeImageUrl={v.imageUrl}
                    showOwned={false}
                    showStore
                  />
                </div>
              </td>
              <td className="whitespace-nowrap py-1.5">{row.setCode}</td>
              <td className="whitespace-nowrap py-1.5">{row.collectorNumber}</td>
              <td className="whitespace-nowrap py-1.5">{row.finish}</td>
              <td className="whitespace-nowrap py-1.5 tabular-nums">{row.have}</td>
              <td className="whitespace-nowrap py-1.5 tabular-nums">{v.wanted}</td>
              <td className="whitespace-nowrap py-1.5 tabular-nums font-semibold">{v.sell}</td>
              <td className="whitespace-nowrap py-1.5 tabular-nums">{money(row.listedCents)}</td>
              <td className="whitespace-nowrap py-1.5 tabular-nums">{money(v.creditCents)}</td>
              <td
                className={`whitespace-nowrap py-1.5 tabular-nums ${recoveryBandClass(recoveryBand(v.creditCents, row.listedCents))}`}
              >
                {formatRecovered(recoveredPercent(v.creditCents, row.listedCents))}
              </td>
              <td
                className="whitespace-nowrap py-1.5 tabular-nums"
                title={`Cash recovered ${formatRecovered(recoveredPercent(v.cashCents, row.listedCents))} of listed`}
              >
                {money(v.cashCents)}
              </td>
            </tr>
          );
        })}
      </>
    );
  }

  return (
    <tr className={`border-t border-[var(--border)] ${toneClass(row.tone)}`}>
      <td className="min-w-0 py-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <CardNameCell
            name={row.name}
            ownedImageUrl={row.ownedImageUrl}
            storeImageUrl={row.storeImageUrl}
          />
          {mode === "mate" && row.canReject && onRejectMate ? (
            <button
              type="button"
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"
              title="Wrong printing — show all variants again"
              aria-label="Wrong printing"
              onClick={() => onRejectMate(row.rowKey)}
            >
              <span className="text-sm leading-none" aria-hidden>
                ↻
              </span>
            </button>
          ) : null}
          {mode === "mate" && row.resolveSource === "image" ? (
            <span className="text-[10px] text-[var(--muted)]">image match</span>
          ) : null}
        </div>
      </td>
      <td className="whitespace-nowrap py-1.5">{row.setCode}</td>
      <td className="whitespace-nowrap py-1.5">{row.collectorNumber}</td>
      <td className="whitespace-nowrap py-1.5">{row.finish}</td>
      <td className="whitespace-nowrap py-1.5 tabular-nums">{row.have}</td>
      <td className="whitespace-nowrap py-1.5 tabular-nums">{row.wanted}</td>
      <td className="whitespace-nowrap py-1.5 tabular-nums font-semibold">{row.sell}</td>
      <td className="whitespace-nowrap py-1.5 tabular-nums">{money(row.listedCents)}</td>
      <td className="whitespace-nowrap py-1.5 tabular-nums">{money(row.creditCents)}</td>
      <td
        className={`whitespace-nowrap py-1.5 tabular-nums ${recoveryBandClass(recoveryBand(row.creditCents, row.listedCents))}`}
      >
        {formatRecovered(recoveredPercent(row.creditCents, row.listedCents))}
      </td>
      {mode === "mate" ? (
        <td
          className="whitespace-nowrap py-1.5 tabular-nums"
          title={`Cash recovered ${formatRecovered(recoveredPercent(row.cashCents, row.listedCents))} of listed`}
        >
          {money(row.cashCents)}
        </td>
      ) : null}
    </tr>
  );
}

function CompareTable({
  rows,
  filter,
  onFilter,
  mateCredit,
  mateCash,
  pmCredit,
  priceSource,
  priceCurrency,
  csvFilename,
  onExportCsv,
  onExportManaBox,
}: {
  rows: CompareRow[];
  filter: CompareFilter;
  onFilter: (f: CompareFilter) => void;
  mateCredit: number;
  mateCash: number;
  pmCredit: number;
  priceSource?: PriceSource;
  priceCurrency?: string;
  csvFilename: string;
  onExportCsv: () => void;
  onExportManaBox: () => void;
}) {
  const [bandFilter, setBandFilter] = useState<Set<RecoveryBand>>(new Set());
  const visible = filterCompareRows(rows, filter).filter((row) =>
    compareRowMatchesBand(row, filter, bandFilter),
  );
  const putAside = rows.filter((r) => r.putAside);

  const winCell =
    "rounded px-1.5 py-0.5 font-semibold bg-[color-mix(in_srgb,var(--rag-green)_22%,transparent)]";
  const loseCell =
    "rounded px-1.5 py-0.5 bg-[color-mix(in_srgb,var(--muted)_18%,transparent)] text-[var(--muted)]";

  return (
    <div className="min-w-0">
      <dl className="mb-3 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-[var(--muted)]">Mate credit</dt>
          <dd className="text-lg font-semibold">{money(mateCredit)}</dd>
          <p className="text-xs text-[var(--muted)]">
            cash {money(mateCash)} (informational, not compared)
          </p>
        </div>
        <div>
          <dt className="text-xs text-[var(--muted)]">Playmantis credit</dt>
          <dd className="text-lg font-semibold">{money(pmCredit)}</dd>
        </div>
      </dl>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap" role="tablist" aria-label="Compare filter">
          {COMPARE_FILTERS.map((f) => (
            <FilterChip
              key={f.id}
              active={filter === f.id}
              label={f.label}
              onClick={() => onFilter(f.id)}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="sg-btn-secondary" onClick={onExportCsv}>
            Export CSV
          </button>
          <button type="button" className="sg-btn-secondary" onClick={onExportManaBox}>
            ManaBox template
          </button>
          <InfoTip label="Exports use the selected filter. CSV is this compare table. ManaBox keeps the original columns: Have for All / Want full / Not found; Sell qty for Sellable; Mate or Playmantis Sell for those picklists; leftover Have for Not sold." />
        </div>
      </div>
      <p className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-[var(--muted)]">
        {csvFilename}
        <InfoTip label="Who wins, how many to pull (Sell), and whether Sell < Have. Confirm Mate printings in the Mate stream. Hover O = owned. ManaBox exports keep original columns; quantity is this table’s Sell (or leftover Have for not sold — re-import into ManaBox)." />
      </p>
      <PriceBasisNote source={priceSource} currency={priceCurrency} />
      <RecoveryLegend
        selected={bandFilter}
        onToggle={(band) => setBandFilter((prev) => toggleBandInSet(prev, band))}
      />
      <div className="min-w-0 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--surface)]">
            <tr className="text-[var(--muted)]">
              <th className="min-w-0 py-1 font-medium">Card</th>
              <th className="whitespace-nowrap py-1 font-medium tabular-nums">Have</th>
              <th className="whitespace-nowrap py-1 font-medium tabular-nums">Listed</th>
              <th className="whitespace-nowrap py-1 font-medium">Mate</th>
              <th className="whitespace-nowrap py-1 font-medium">Playmantis</th>
              <th className="whitespace-nowrap py-1 font-medium">Winner</th>
              <th className="whitespace-nowrap py-1 font-medium tabular-nums">Sell</th>
              <th className="whitespace-nowrap py-1 font-medium tabular-nums">Gain</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row, i) => (
              <CompareRowBlock
                key={`${row.scryfallId}-${row.name}-${i}`}
                row={row}
                filter={filter}
                winCell={winCell}
                loseCell={loseCell}
              />
            ))}
          </tbody>
        </table>
      </div>

      {putAside.length ? (
        <div className="mt-6 border-t border-[var(--border)] pt-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium">
            Put aside
            <InfoTip label="Money cards (either store credit ≥ $2) that are not sellable right now — want full, not found, or Mate printing still needs confirm in the Mate stream." />
          </h3>
          <ul className="space-y-1 text-sm">
            {putAside.map((row, i) => (
              <li
                key={`aside-${row.scryfallId}-${i}`}
                className="flex flex-wrap items-center gap-2 rounded px-2 py-1 bg-[color-mix(in_srgb,var(--rag-amber)_12%,transparent)]"
              >
                <CardNameCell
                  name={row.name}
                  ownedImageUrl={row.ownedImageUrl}
                  showOwned
                  showStore={false}
                  showMate={false}
                  showPlaymantis={false}
                />
                <span className="text-[var(--muted)]">
                  {row.setCode}
                  {row.collectorNumber ? ` #${row.collectorNumber}` : ""} · {row.finish}
                </span>
                <span className="tabular-nums text-[var(--muted)]">
                  Mate listed{" "}
                  {row.listedMateCreditCents > 0 ? money(row.listedMateCreditCents) : "—"} · PM{" "}
                  {row.playmantisCreditCents > 0 ? money(row.playmantisCreditCents) : "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function CompareRowBlock({
  row,
  filter,
  winCell,
  loseCell,
}: {
  row: CompareRow;
  filter: CompareFilter;
  winCell: string;
  loseCell: string;
}) {
  const sell =
    filter === "mate"
      ? row.mateSell
      : filter === "playmantis"
        ? row.playmantisSell
        : row.mateSell + row.playmantisSell;
  const winnerLabel =
    row.winner === "mate"
      ? "Mate"
      : row.winner === "playmantis"
        ? "Playmantis"
        : row.winner === "split"
          ? "Split"
          : "—";
  const winnerCredit =
    row.winner === "mate"
      ? row.mateCreditCents
      : row.winner === "playmantis"
        ? row.playmantisCreditCents
        : row.winner === "split"
          ? Math.max(row.mateCreditCents, row.playmantisCreditCents)
          : 0;
  const gainBand = recoveryBand(winnerCredit, row.listedCents);
  const shortSell = sell > 0 && sell < row.have;
  const rowTone = row.sellable
    ? "bg-[color-mix(in_srgb,var(--rag-green)_10%,transparent)]"
    : row.mateAmbiguous
      ? "bg-[color-mix(in_srgb,var(--rag-amber)_14%,transparent)]"
      : row.notFound
        ? "bg-[color-mix(in_srgb,var(--rag-amber)_8%,transparent)]"
        : row.wantFull
          ? "bg-[color-mix(in_srgb,var(--muted)_8%,transparent)]"
          : "";

  function storeCellClass(isWinner: boolean, wanted: number): string | undefined {
    if (isWinner) return winCell;
    if (row.winner === "mate" || row.winner === "playmantis") {
      if (!(wanted > 0)) return loseCell;
    }
    return undefined;
  }

  return (
    <tr className={`border-t border-[var(--border)] ${rowTone}`}>
      <td className="min-w-0 py-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <CardNameCell
            name={row.name}
            ownedImageUrl={row.ownedImageUrl}
            showOwned
            showStore={false}
            showMate={false}
            showPlaymantis={false}
          />
          <span className="text-xs text-[var(--muted)]">
            {row.setCode}
            {row.collectorNumber ? ` #${row.collectorNumber}` : ""} · {row.finish}
          </span>
          {row.showVariants ? (
            <span className="rounded bg-[color-mix(in_srgb,var(--rag-amber)_35%,transparent)] px-1.5 py-0.5 text-xs font-semibold">
              Confirm in Mate stream
            </span>
          ) : null}
        </div>
      </td>
      <td className="whitespace-nowrap py-1.5 tabular-nums">{row.have}</td>
      <td className="whitespace-nowrap py-1.5 tabular-nums">{money(row.listedCents)}</td>
      <td className="whitespace-nowrap py-1.5 tabular-nums">
        <span
          className={storeCellClass(
            row.winner === "mate" || row.winner === "split",
            row.mateWanted,
          )}
          title={
            row.mateAmbiguous
              ? "Ambiguous — confirm a printing in the Mate stream"
              : row.mateWanted
                ? `Want ${row.mateWanted} · cash ${money(row.mateCashCents)}`
                : "Not buying"
          }
        >
          {row.mateAmbiguous
            ? "Ambiguous"
            : row.mateCreditCents > 0
              ? `${money(row.mateCreditCents)} · w${row.mateWanted}`
              : "—"}
        </span>
      </td>
      <td className="whitespace-nowrap py-1.5 tabular-nums">
        <span
          className={storeCellClass(
            row.winner === "playmantis" || row.winner === "split",
            row.playmantisWanted,
          )}
          title={row.playmantisWanted ? `Want ${row.playmantisWanted}` : "Not buying"}
        >
          {row.playmantisCreditCents > 0
            ? `${money(row.playmantisCreditCents)} · w${row.playmantisWanted}`
            : "—"}
        </span>
      </td>
      <td className="whitespace-nowrap py-1.5">{winnerLabel}</td>
      <td
        className={`whitespace-nowrap py-1.5 tabular-nums font-semibold ${
          shortSell ? "text-[var(--rag-amber)]" : ""
        }`}
        title={shortSell ? `Sell ${sell} of ${row.have} owned` : undefined}
      >
        {sell}
        {shortSell ? (
          <span className="ml-1 text-xs font-normal text-[var(--rag-amber)]">
            /{row.have}
          </span>
        ) : null}
      </td>
      <td className={`whitespace-nowrap py-1.5 tabular-nums ${recoveryBandClass(gainBand)}`}>
        {row.sellable ? formatRecovered(recoveredPercent(winnerCredit, row.listedCents)) : "—"}
      </td>
    </tr>
  );
}
