"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
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
import { uniqueSetCodes, parseManaBoxCsv, majorityPurchaseCurrency } from "../logic/parse-csv";
import {
  buildCompareRows,
  buildMateStreamRows,
  buildPmStreamRows,
  compareRowsCsv,
  formatRecovered,
  RECOVERY_LEGEND,
  recoveryBand,
  recoveryBandClass,
  recoveredPercent,
  streamRowsCsv,
  type CompareRow,
  type StreamRow,
  type StreamTone,
} from "../logic/tables";
import {
  PRICE_SOURCE_LABELS,
  PRICE_SOURCES,
  type MtgBuylistStore,
  type PriceSource,
} from "../schema";
import { CardNameCell } from "./CardNameCell";

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function readFileText(file: File): Promise<string> {
  return file.text();
}

function CollapsibleSection({
  id,
  title,
  defaultOpen,
  children,
}: {
  id: string;
  title: string;
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
  return (
    <details
      className="sg-card group overflow-hidden p-0"
      open={open}
      onToggle={(e) => {
        const next = e.currentTarget.open;
        setOpen(next);
        sessionStorage.setItem(storageKey, next ? "1" : "0");
      }}
    >
      <summary className="sticky top-0 z-20 cursor-pointer list-none border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 font-medium shadow-sm [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <span className="text-[var(--muted)]" aria-hidden>
            {open ? "▾" : "▸"}
          </span>
          {title}
        </span>
      </summary>
      <div className="space-y-3 px-4 py-4">{children}</div>
    </details>
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
      className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
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
      className="sticky top-0 z-30 flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm shadow-md"
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
type CompareFilter = "all" | "sellable" | "capped" | "notfound" | "mate" | "playmantis";

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

  const csvSets = useMemo(
    () => (store.csv ? uniqueSetCodes(store.csv.rows) : []),
    [store.csv],
  );
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
      store.csv && store.resultCompare
        ? buildCompareRows(
            store.csv.rows,
            store.mate?.offers || [],
            store.playmantis?.offers || [],
            mateResolveOpts,
          )
        : [],
    [store.csv, store.mate, store.playmantis, store.resultCompare, mateResolveOpts],
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
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error || "That step failed");
        setStatus("");
        return;
      }
      if (result.store) setStore(result.store);
      setStatus("");
      router.refresh();
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
    setError("");
    setStatus("Uploading Mate JSON…");
    startTransition(async () => {
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/mtg-buylist/mate-upload", {
          method: "POST",
          body: form,
        });
        const data = (await res.json()) as {
          ok: boolean;
          error?: string;
          store?: MtgBuylistStore;
          summary?: { offers: number; sets: number };
        };
        if (!data.ok) {
          setError(data.error || `Mate upload failed (${res.status})`);
          setStatus("");
          return;
        }
        if (data.store) setStore(data.store);
        setStatus(
          data.summary
            ? `Mate snapshot: ${data.summary.offers} offers across ${data.summary.sets} sets (image joins applied).`
            : "Mate JSON uploaded.",
        );
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Mate upload failed");
        setStatus("");
      }
    });
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
    <div className="space-y-4">
      {error ? (
        <p className="sg-card border-[var(--rag-red)] text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <LoadingBanner status={status} pending={pending} />

      <CollapsibleSection id="csv" title="1. ManaBox CSV" defaultOpen>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            className="sg-btn-ghost text-sm"
            disabled={pending}
            onClick={() => run(() => clearBuylistRunAction(), "Clearing run…")}
          >
            Clear this run
          </button>
        </div>
        <p className="text-sm text-[var(--muted)]">
          Shared input for every store stream. Stored as this run only — not a second card database.
          Purchase price comes from the CSV; the ManaBox price source (CK / TCGPlayer / Scryfall)
          is not in the file, so we ask once per upload.
        </p>
        <FileDropZone
          accept=".csv,text/csv"
          disabled={pending}
          label="Choose ManaBox CSV or drop it here"
          hint="Click this box — .csv up to ~1000 cards"
          onFile={acceptCsvFile}
        />
        {pendingCsv ? (
          <div className="mt-3 space-y-3 rounded border border-[var(--border)] p-3">
            <p className="text-sm">
              {pendingCsv.filename} ready. Where does ManaBox draw these listed prices from?
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
              disabled={pending}
              onClick={() => confirmCsvUpload()}
            >
              Use this CSV
            </button>
          </div>
        ) : null}
        {store.csv ? (
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <p className="text-sm text-[var(--muted)]">
              {store.csv.filename}: {store.csv.rows.length} printings, {csvSets.length} sets.
              Uploaded {new Date(store.csv.uploadedAt).toLocaleString()}. Price basis:{" "}
              {PRICE_SOURCE_LABELS[store.csv.priceSource]} ·{" "}
              {store.csv.priceCurrency || "currency unknown"}.{" "}
              {store.csv.rows.some((r) => (r.frameEffects || []).length > 0) ? (
                <>
                  Scryfall treatments on{" "}
                  {store.csv.rows.filter((r) => (r.frameEffects || []).length > 0).length}/
                  {store.csv.rows.length} (Extended Art / borderless / showcase used for Mate
                  auto-match).
                </>
              ) : (
                <>
                  No Scryfall treatments yet — use{" "}
                  <strong>Refresh Scryfall treatments</strong> so Extended Art can auto-match
                  (keeps Mate/PM harvests; a full CSV re-upload would clear Playmantis).
                </>
              )}
            </p>
            <button
              type="button"
              className="sg-btn-secondary shrink-0 text-sm"
              disabled={pending}
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

      <CollapsibleSection id="pm" title="2. Playmantis stream" defaultOpen={Boolean(store.csv)}>
        <p className="text-sm text-[var(--muted)]">
          Harvest Playmantis alone. Join on Scryfall ID + finish. Re-click harvest to retry empties
          (image UUID mismatches are rebound to your CSV id). Batches ~32 IDs per server call;
          this button loops until done.
        </p>
        <button
          type="button"
          className="sg-btn-primary disabled:opacity-50"
          disabled={pending || !store.csv}
          onClick={() => {
            const loop = async () => {
              setError("");
              setStatus("Harvesting Playmantis…");
              let remaining = 1;
              let last = store;
              while (remaining > 0) {
                const result = await harvestPlaymantisAction();
                if (!result.ok) {
                  setError(result.error);
                  setStatus("");
                  return;
                }
                last = result.store;
                setStore(result.store);
                remaining = result.remaining;
                setStatus(`Playmantis ${result.done} / ${result.total} Scryfall IDs`);
              }
              setStore(last);
              setStatus("Playmantis harvest finished.");
              router.refresh();
            };
            startTransition(() => {
              void loop();
            });
          }}
        >
          Harvest Playmantis
        </button>
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

      <CollapsibleSection id="mate" title="3. MTGMate stream" defaultOpen={Boolean(store.csv)}>
        <p className="text-sm text-[var(--muted)]">
          Harvest Mate alone (console script + JSON upload). Large files use the upload API.
          Ambiguous bare-name printings are joined by exact image match to Scryfall when possible.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="sg-btn-primary disabled:opacity-50"
            disabled={pending || !store.csv}
            onClick={() => {
              setError("");
              setStatus("Creating harvest token…");
              startTransition(async () => {
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
              });
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
          disabled={pending || !store.csv}
          label="Choose Mate harvest JSON or drop it here"
          hint="Click this box — .json / .customization (runs image joins after upload)"
          onFile={uploadMateFile}
        />
        {store.mate ? (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="text-sm text-[var(--muted)]">
              Mate snapshot: {store.mate.offers.length} rows, sets{" "}
              {store.mate.sets.join(", ") || "—"} ({store.mate.source}) ·{" "}
              {new Date(store.mate.harvestedAt).toLocaleString()}. Image joins:{" "}
              {Object.keys(store.mateImageLinks || {}).length} Mate printings linked to Scryfall.
            </p>
            <button
              type="button"
              className="sg-btn-secondary shrink-0 text-sm"
              disabled={pending}
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
        defaultOpen={Boolean(store.resultCompare)}
      >
        <p className="text-sm text-[var(--muted)]">
          Every CSV card: who wins, how many to pull (Sell), and winner Gain %. Confirm Mate
          printings in the Mate stream first — Compare then collapses to one row. Hover O = owned.
        </p>
        {store.resultCompare && compareRows.length ? (
          <CompareTable
            rows={compareRows}
            filter={compareFilter}
            onFilter={setCompareFilter}
            mateCredit={store.resultCompare.totals.mateCreditCents}
            mateCash={store.resultCompare.totals.mateCashCents}
            pmCredit={store.resultCompare.totals.playmantisCreditCents}
            priceSource={store.csv?.priceSource}
            priceCurrency={store.csv?.priceCurrency}
            onDownload={() => {
              downloadText(
                "mtg-buylist-compare.csv",
                compareRowsCsv(filterCompareRows(compareRows, compareFilter)),
              );
            }}
          />
        ) : (
          <p className="text-sm text-[var(--muted)]">
            Compare activates when two or more stores are harvested.
          </p>
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
      className={active ? "sg-btn-primary text-sm" : "sg-btn-ghost text-sm"}
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
    <p className="mb-2 text-xs text-[var(--muted)]">
      Price basis: {src} · {cur}. Recovered % = store credit ÷ ManaBox listed
      {fx
        ? `. Listed is ${cur}; store credit is AUD — recovered % is not FX-adjusted.`
        : "."}
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
  const visible = filterStreamRows(rows, filter);
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
    <div className="mt-4 border-t border-[var(--border)] pt-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <dl className="grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-[var(--muted)]">
              {mode === "pm" ? "Playmantis credit" : "Mate credit"}
            </dt>
            <dd className="text-lg font-semibold">{money(creditTotal)}</dd>
          </div>
          {mode === "mate" ? (
            <div>
              <dt className="text-xs text-[var(--muted)]">Mate cash</dt>
              <dd className="text-lg font-semibold">{money(cashTotal || 0)}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs text-[var(--muted)]">Sell copies</dt>
            <dd className="text-lg font-semibold">{sellCopies}</dd>
          </div>
        </dl>
        <button type="button" className="sg-btn-secondary" onClick={onDownload}>
          Download CSV
        </button>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
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
      <p className="sticky top-12 z-10 mb-2 rounded bg-[var(--surface)] py-1 text-xs font-medium text-[var(--muted)]">
        Showing {filterLabel} · {visible.length} of {rows.length} rows
      </p>
      <p className="mb-2 text-xs text-[var(--muted)]">
        Green = sellable · grey = matched but the want qty is full · amber = not found
        {mode === "mate"
          ? " · amber+ = ambiguous Mate — Confirm the printing you own · Wrong printing reopens variants"
          : ""}
        . Hover O = owned, S = store match.
      </p>
      <PriceBasisNote source={priceSource} currency={priceCurrency} />
      <p className="mb-2 text-xs text-[var(--muted)]">{RECOVERY_LEGEND}</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="bg-[var(--surface)]">
            <tr className="text-[var(--muted)]">
              <th className="py-1 font-medium">Name</th>
              <th className="py-1 font-medium">Set</th>
              <th className="py-1 font-medium">#</th>
              <th className="py-1 font-medium">Finish</th>
              <th className="py-1 font-medium tabular-nums">Have</th>
              <th className="py-1 font-medium tabular-nums">Wanted</th>
              <th className="py-1 font-medium tabular-nums">Sell</th>
              <th className="py-1 font-medium tabular-nums">Listed</th>
              <th className="py-1 font-medium tabular-nums">Credit</th>
              <th className="py-1 font-medium tabular-nums">Gain</th>
              {mode === "mate" ? (
                <th className="py-1 font-medium tabular-nums">Cash</th>
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
          <td className="py-1.5" colSpan={colCount}>
            <div className="flex flex-wrap items-center gap-2">
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
              <td className="py-1.5 pl-6">
                <div className="flex flex-wrap items-center gap-2">
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
              <td className="py-1.5">{row.setCode}</td>
              <td className="py-1.5">{row.collectorNumber}</td>
              <td className="py-1.5">{row.finish}</td>
              <td className="py-1.5 tabular-nums">{row.have}</td>
              <td className="py-1.5 tabular-nums">{v.wanted}</td>
              <td className="py-1.5 tabular-nums font-semibold">{v.sell}</td>
              <td className="py-1.5 tabular-nums">{money(row.listedCents)}</td>
              <td className="py-1.5 tabular-nums">{money(v.creditCents)}</td>
              <td
                className={`py-1.5 tabular-nums ${recoveryBandClass(recoveryBand(v.creditCents, row.listedCents))}`}
              >
                {formatRecovered(recoveredPercent(v.creditCents, row.listedCents))}
              </td>
              <td
                className="py-1.5 tabular-nums"
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
      <td className="py-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <CardNameCell
            name={row.name}
            ownedImageUrl={row.ownedImageUrl}
            storeImageUrl={row.storeImageUrl}
          />
          {mode === "mate" && row.canReject && onRejectMate ? (
            <button
              type="button"
              className="sg-btn-ghost text-xs"
              title="This Mate printing is wrong — show all variants again"
              onClick={() => onRejectMate(row.rowKey)}
            >
              Wrong printing
            </button>
          ) : null}
          {mode === "mate" && row.resolveSource === "image" ? (
            <span className="text-[10px] text-[var(--muted)]">image match</span>
          ) : null}
        </div>
      </td>
      <td className="py-1.5">{row.setCode}</td>
      <td className="py-1.5">{row.collectorNumber}</td>
      <td className="py-1.5">{row.finish}</td>
      <td className="py-1.5 tabular-nums">{row.have}</td>
      <td className="py-1.5 tabular-nums">{row.wanted}</td>
      <td className="py-1.5 tabular-nums font-semibold">{row.sell}</td>
      <td className="py-1.5 tabular-nums">{money(row.listedCents)}</td>
      <td className="py-1.5 tabular-nums">{money(row.creditCents)}</td>
      <td
        className={`py-1.5 tabular-nums ${recoveryBandClass(recoveryBand(row.creditCents, row.listedCents))}`}
      >
        {formatRecovered(recoveredPercent(row.creditCents, row.listedCents))}
      </td>
      {mode === "mate" ? (
        <td
          className="py-1.5 tabular-nums"
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
  onDownload,
}: {
  rows: CompareRow[];
  filter: CompareFilter;
  onFilter: (f: CompareFilter) => void;
  mateCredit: number;
  mateCash: number;
  pmCredit: number;
  priceSource?: PriceSource;
  priceCurrency?: string;
  onDownload: () => void;
}) {
  const visible = filterCompareRows(rows, filter);
  const putAside = rows.filter((r) => r.putAside);

  const winCell =
    "rounded px-1.5 py-0.5 font-semibold bg-[color-mix(in_srgb,var(--rag-green)_22%,transparent)]";

  return (
    <div>
      <dl className="mb-3 grid gap-3 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-[var(--muted)]">Mate credit</dt>
          <dd className="text-lg font-semibold">{money(mateCredit)}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--muted)]">Mate cash</dt>
          <dd className="text-lg font-semibold">{money(mateCash)}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--muted)]">Playmantis credit</dt>
          <dd className="text-lg font-semibold">{money(pmCredit)}</dd>
        </div>
      </dl>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <FilterChip active={filter === "all"} label="All" onClick={() => onFilter("all")} />
          <FilterChip
            active={filter === "sellable"}
            label="Sellable"
            onClick={() => onFilter("sellable")}
          />
          <FilterChip
            active={filter === "capped"}
            label="Want full"
            onClick={() => onFilter("capped")}
          />
          <FilterChip
            active={filter === "notfound"}
            label="Not found"
            onClick={() => onFilter("notfound")}
          />
          <FilterChip
            active={filter === "mate"}
            label="Mate picklist"
            onClick={() => onFilter("mate")}
          />
          <FilterChip
            active={filter === "playmantis"}
            label="Playmantis picklist"
            onClick={() => onFilter("playmantis")}
          />
        </div>
        <button type="button" className="sg-btn-secondary" onClick={onDownload}>
          Download CSV
        </button>
      </div>
      <p className="mb-2 text-xs text-[var(--muted)]">
        Who wins, how many to pull from the pile (Sell), and whether Sell &lt; Have. Confirm Mate
        printings in the Mate stream — Compare then shows one row. Hover O = owned only.
      </p>
      <PriceBasisNote source={priceSource} currency={priceCurrency} />
      <p className="mb-2 text-xs text-[var(--muted)]">{RECOVERY_LEGEND}</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[42rem] text-left text-sm">
          <thead className="bg-[var(--surface)]">
            <tr className="text-[var(--muted)]">
              <th className="py-1 font-medium">Card</th>
              <th className="py-1 font-medium tabular-nums">Have</th>
              <th className="py-1 font-medium tabular-nums">Listed</th>
              <th className="py-1 font-medium">Mate</th>
              <th className="py-1 font-medium">Playmantis</th>
              <th className="py-1 font-medium">Winner</th>
              <th className="py-1 font-medium tabular-nums">Sell</th>
              <th className="py-1 font-medium tabular-nums">Gain</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row, i) => (
              <CompareRowBlock
                key={`${row.scryfallId}-${row.name}-${i}`}
                row={row}
                filter={filter}
                winCell={winCell}
              />
            ))}
          </tbody>
        </table>
      </div>

      {putAside.length ? (
        <div className="mt-6 border-t border-[var(--border)] pt-4">
          <h3 className="mb-1 text-sm font-medium">Put aside for future value</h3>
          <p className="mb-3 text-xs text-[var(--muted)]">
            Money cards (either store credit ≥ $2) that are not sellable right now — want full,
            not found, or Mate printing still needs confirm in the Mate stream.
          </p>
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
}: {
  row: CompareRow;
  filter: CompareFilter;
  winCell: string;
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

  return (
    <tr className={`border-t border-[var(--border)] ${rowTone}`}>
      <td className="py-1.5">
        <div className="flex flex-wrap items-center gap-2">
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
      <td className="py-1.5 tabular-nums">{row.have}</td>
      <td className="py-1.5 tabular-nums">{money(row.listedCents)}</td>
      <td className="py-1.5 tabular-nums">
        <span
          className={row.winner === "mate" || row.winner === "split" ? winCell : undefined}
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
      <td className="py-1.5 tabular-nums">
        <span
          className={
            row.winner === "playmantis" || row.winner === "split" ? winCell : undefined
          }
          title={row.playmantisWanted ? `Want ${row.playmantisWanted}` : "Not buying"}
        >
          {row.playmantisCreditCents > 0
            ? `${money(row.playmantisCreditCents)} · w${row.playmantisWanted}`
            : "—"}
        </span>
      </td>
      <td className="py-1.5">{winnerLabel}</td>
      <td
        className={`py-1.5 tabular-nums font-semibold ${
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
      <td className={`py-1.5 tabular-nums ${recoveryBandClass(gainBand)}`}>
        {row.sellable ? formatRecovered(recoveredPercent(winnerCredit, row.listedCents)) : "—"}
      </td>
    </tr>
  );
}
