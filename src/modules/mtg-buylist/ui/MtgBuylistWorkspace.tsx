"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  clearBuylistRunAction,
  confirmMateVariantAction,
  createBuylistRunAction,
  createMateHarvestAction,
  enrichCsvTreatmentsAction,
  harvestPlaymantisAction,
  loadBuylistRunAction,
  lookupCardIdsAction,
  lookupSetCodesAction,
  refreshMateImageLinksAction,
  rejectMateVariantAction,
  saveCsvRowsAction,
  savePlaymantisHarvestDiffAction,
  uploadCsvAction,
} from "../actions";
import { uniqueSetCodes, parseManaBoxCsv, majorityPurchaseCurrency, manaBoxRowsToCsv } from "../logic/parse-csv";
import { countMateHarvestCards } from "../logic/parse-mate";
import { buildPlaymantisImportReviewBookmarklet } from "../logic/bookmarklet";
import {
  compareImportReview,
  harvestDiffRows,
  offersFromImportReview,
} from "../logic/compare-import-review";
import { parsePlaymantisImportReview, type ImportReviewRow } from "../logic/parse-import-review";
import { normalizeSetCode } from "../logic/names";
import {
  buildOuterJoin,
  filterJoinRows,
  normalizeSetName,
  outerJoinCsv,
  parseSubmissionCsv,
  rowsNeedingScryfallImages,
  setCodeMapFromCsv,
  type JoinView,
  type OuterJoinResult,
  type OuterJoinRow,
} from "../logic/reprepare";
import { cardLookupKey, type CardHint } from "../logic/scryfall";
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
  MTG_BUYLIST_HREF,
  PRICE_SOURCE_LABELS,
  PRICE_SOURCES,
  type ManaBoxRow,
  type MtgBuylistStore,
  type PriceSource,
} from "../schema";
import { CardNameCell } from "./CardNameCell";
import { MtgBuylistPendingOverlay } from "./MtgBuylistPending";
import { InfoTip } from "@/core/ui/InfoTip";
import { ShellModal } from "@/core/shell/ShellModal";
import { useUiLoadingGate } from "@/core/shell/UiLoading";
import { runHasStoredData } from "../logic/runs";
import type { BuylistArchive, BuylistRunMeta } from "../schema";

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function readFileText(file: File): Promise<string> {
  return file.text();
}

const HARVEST_DIFF_CELL =
  "bg-[color-mix(in_srgb,var(--rag-amber)_38%,transparent)]";

function UniquenessKey({ label }: { label: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative ml-auto shrink-0"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        aria-label="How this section identifies a printing"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border-2 border-[var(--ink)] bg-[color-mix(in_srgb,var(--ink)_10%,var(--surface))] text-[var(--ink)]"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
        </svg>
      </button>
      {open ? (
        <span
          role="tooltip"
          className="absolute right-0 top-full z-40 mt-1 w-72 rounded-md border border-[#1a1a19] bg-[var(--surface)] p-2 text-left text-xs font-normal leading-5 shadow-lg"
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}

function CollapsibleSection({
  id,
  title,
  hint,
  uniqueness,
  defaultOpen,
  children,
}: {
  id: string;
  title: string;
  hint?: string;
  uniqueness?: ReactNode;
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
        <span className="min-w-0">{title}</span>
        {hint ? (
          <span
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <InfoTip label={hint} />
          </span>
        ) : null}
        {uniqueness ? <UniquenessKey label={uniqueness} /> : null}
      </button>
      {open ? <div className="space-y-3 px-4 py-3">{children}</div> : null}
    </section>
  );
}

/** Nested table disclosure. Remembers open/closed in this tab. */
function CollapsibleTableSection({
  id,
  title,
  count,
  hint,
  defaultOpen,
  children,
}: {
  id: string;
  title: string;
  count?: string;
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
  return (
    <div className="rounded-lg border border-[var(--border)]">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
        aria-expanded={open}
        onClick={() => {
          const next = !open;
          setOpen(next);
          sessionStorage.setItem(storageKey, next ? "1" : "0");
        }}
      >
        <span className="text-[var(--muted)]" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
        <span className="font-medium">{title}</span>
        {count ? <span className="text-[var(--muted)]">({count})</span> : null}
        {hint ? <span className="text-xs font-normal text-[var(--muted)]">{hint}</span> : null}
      </button>
      {open ? (
        <div className="space-y-2 border-t border-[var(--border)] px-3 py-2">{children}</div>
      ) : null}
    </div>
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
      className="sticky top-[6.5rem] z-10 flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm shadow-md"
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
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setSecs((n) => n + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <MtgBuylistPendingOverlay
      open
      status={status || "Working…"}
      detail={`Leave this page open. ${secs}s elapsed.`}
    />
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
              <RecoveryLegendButton
                className={className}
                title={title}
                active={active}
                color={colorVar[chip.color]}
                label={chip.label}
                onToggle={() => onToggle(chip.band)}
              />
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

function RecoveryLegendButton({
  className,
  title,
  active,
  color,
  label,
  onToggle,
}: {
  className: string;
  title: string;
  active: boolean;
  color: string;
  label: string;
  onToggle: () => void;
}) {
  const runUi = useUiLoadingGate();
  return (
    <button
      type="button"
      className={className}
      title={title}
      aria-pressed={active}
      onClick={() => runUi(onToggle)}
    >
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span className="tabular-nums font-medium">{label}</span>
    </button>
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
    return "bg-[color-mix(in_srgb,#c45b8c_18%,transparent)]";
  }
  return "bg-[color-mix(in_srgb,var(--rag-amber)_10%,transparent)]";
}

function RowToneLegend({ includeConfirm }: { includeConfirm?: boolean }) {
  const items: { tone: StreamTone; label: string }[] = [
    { tone: "sell", label: "Sellable" },
    { tone: "capped", label: "At limit" },
    { tone: "skip", label: "Not found" },
  ];
  if (includeConfirm) {
    items.push({ tone: "ambiguous", label: "Confirm printing" });
  }
  return (
    <ul className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" aria-label="Row colours">
      {items.map((item) => (
        <li key={item.tone} className="inline-flex items-center gap-1.5">
          <span
            className={`inline-block h-3.5 w-5 rounded border border-[var(--border)] ${toneClass(item.tone)}`}
            aria-hidden
          />
          <span className="text-[var(--muted)]">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

type StreamFilter = "all" | "sell" | "capped" | "skip" | "harvest_diff";
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
  { id: "capped", label: "At limit" },
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
  if (filter === "harvest_diff") return rows.filter((r) => Boolean(r.harvestDiff));
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

export function MtgBuylistWorkspace({
  initialStore,
  initialRuns,
  initialRunId,
}: {
  initialStore: MtgBuylistStore;
  initialRuns: BuylistRunMeta[];
  initialRunId: string;
  initialArchives?: BuylistArchive[];
}) {
  const router = useRouter();
  const [store, setStore] = useState(initialStore);
  const [runs, setRuns] = useState(initialRuns);
  const [activeRunId, setActiveRunId] = useState(initialRunId);
  const [closeTarget, setCloseTarget] = useState<BuylistRunMeta | null>(null);
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
  const [joinView, setJoinView] = useState<JoinView>("master");
  const [pendingCsv, setPendingCsv] = useState<{
    text: string;
    filename: string;
    rows: ManaBoxRow[];
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
  const [submissionError, setSubmissionError] = useState("");
  const [setCodeHints, setSetCodeHints] = useState<Record<string, string>>({});
  const [cardIdHints, setCardIdHints] = useState<Record<string, string | CardHint>>({});
  const [importReview, setImportReview] = useState<{
    filename: string;
    review: ImportReviewRow[];
  } | null>(null);
  const savedHarvestDiffKey = useRef("");
  const [deltaSave, setDeltaSave] = useState<{ saved: number } | null>(null);
  const [savingDeltas, setSavingDeltas] = useState(false);
  const importReviewBookmarklet = useMemo(() => buildPlaymantisImportReviewBookmarklet(), []);

  const busyRef = useRef(false);
  busyRef.current = busy;
  useEffect(() => {
    if (busyRef.current) return;
    setStore(initialStore);
    setRuns(initialRuns);
    setActiveRunId(initialRunId);
  }, [initialStore.updatedAt, initialRunId, initialRuns]);

  const csvSets = useMemo(
    () => (store.csv ? uniqueSetCodes(store.csv.rows) : []),
    [store.csv],
  );
  const join: OuterJoinResult | null = useMemo(() => {
    if (!store.csv) return null;
    return buildOuterJoin(
      store.csv.rows,
      pmSubmission?.rows || [],
      mateSubmission?.rows || [],
      setCodeHints,
      cardIdHints,
    );
  }, [store.csv, pmSubmission, mateSubmission, setCodeHints, cardIdHints]);
  const showJoin = Boolean(pmSubmission?.rows.length || mateSubmission?.rows.length);

  useEffect(() => {
    setPmSubmission(null);
    setMateSubmission(null);
    setSubmissionError("");
    setJoinView("master");
    setSetCodeHints({});
    setCardIdHints({});
    setImportReview(null);
    setDeltaSave(null);
    savedHarvestDiffKey.current = "";
  }, [store.csv?.uploadedAt, store.csv?.filename, activeRunId]);

  useEffect(() => {
    if (joinView === "mate" && !mateSubmission) setJoinView("master");
    if (joinView === "pm" && !pmSubmission) setJoinView("master");
  }, [joinView, mateSubmission, pmSubmission]);

  const dumpOffers = useMemo(() => {
    if (!importReview || !store.csv) return [];
    return offersFromImportReview(
      store.csv.rows,
      importReview.review,
      store.playmantis?.fetchedAt || importReview.filename,
    );
  }, [importReview, store.csv, store.playmantis?.fetchedAt]);

  const pmOffers = dumpOffers.length > 0 ? dumpOffers : store.playmantis?.offers ?? [];

  const importReviewLog = useMemo(() => {
    if (!importReview || !store.csv) return null;
    return compareImportReview({
      csv: store.csv.rows,
      harvest: store.playmantis?.offers || [],
      review: importReview.review,
    });
  }, [importReview, store.csv, store.playmantis?.fetchedAt, store.playmantis?.offers]);

  const harvestDeltas = useMemo(
    () => (importReviewLog ? harvestDiffRows(importReviewLog) : []),
    [importReviewLog],
  );

  useEffect(() => {
    if (busy || pending || !status) return;
    const timer = window.setTimeout(() => setStatus(""), 4000);
    return () => window.clearTimeout(timer);
  }, [status, busy, pending]);

  useEffect(() => {
    if (!join) return;
    const need = rowsNeedingScryfallImages(join).filter((lookup) => {
      const keys = [
        cardLookupKey(lookup),
        cardLookupKey({ name: lookup.name, setCode: lookup.setCode }),
      ];
      return keys.every((key) => !(key in cardIdHints));
    });
    if (!need.length) return;
    let cancelled = false;
    void lookupCardIdsAction(need).then((result) => {
      if (cancelled || !result.ok) return;
      setCardIdHints((prev) => {
        const next = { ...prev };
        for (const lookup of need) {
          const key = cardLookupKey(lookup);
          if (!(key in next)) next[key] = "";
        }
        return { ...next, ...result.ids };
      });
    });
    return () => {
      cancelled = true;
    };
  }, [join, cardIdHints]);
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

  const pmRows = useMemo(() => {
    if (!store.csv || !pmOffers.length) return [];
    const built = buildPmStreamRows(store.csv.rows, pmOffers);
    if (!importReviewLog || !store.playmantis) return built;
    return built.map((row, i) => {
      const log = importReviewLog.rows[i];
      if (!log || log.verdict === "agree") return row;
      return {
        ...row,
        harvestDiff: {
          verdict: log.verdict,
          note: log.note,
          reviewStatus: log.reviewStatus,
          harvestStatus: log.harvestStatus,
          reviewCreditCents: log.reviewCreditCents,
          harvestCreditCents: log.harvestCreditCents,
          harvestLimit: log.harvestLimit,
        },
      };
    });
  }, [store.csv, pmOffers, importReviewLog, store.playmantis]);

  useEffect(() => {
    if (pmFilter === "harvest_diff" && !pmRows.some((row) => row.harvestDiff)) {
      setPmFilter("all");
    }
  }, [pmFilter, pmRows]);

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
      store.csv && (store.playmantis || store.mate || dumpOffers.length)
        ? buildCompareRows(
            store.csv.rows,
            store.mate?.offers || [],
            pmOffers,
            mateResolveOpts,
          )
        : [],
    [store.csv, store.mate, store.playmantis, dumpOffers.length, pmOffers, mateResolveOpts],
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
        activeRunId,
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
      const result = await rejectMateVariantAction(rowKey, activeRunId);
      if (!result.ok) {
        setError(result.error || "Could not reopen Mate printings");
        return;
      }
      if (result.store) setStore(result.store);
    });
  }

  function savePmDeltas() {
    if (!importReview || !importReviewLog || !store.csv || !store.playmantis) return;
    const key = `${store.playmantis.fetchedAt}|${importReview.filename}|${harvestDeltas.length}`;
    if (savedHarvestDiffKey.current === key) return;
    if (!harvestDeltas.length) {
      setDeltaSave({ saved: 0 });
      return;
    }
    setSavingDeltas(true);
    setError("");
    void savePlaymantisHarvestDiffAction({
      csvFilename: store.csv.filename,
      reviewFilename: importReview.filename,
      harvestedAt: store.playmantis.fetchedAt,
      rows: importReviewLog.rows,
    }).then((result) => {
      setSavingDeltas(false);
      if (!result.ok) {
        setError(result.error || "Could not save Playmantis deltas");
        return;
      }
      savedHarvestDiffKey.current = key;
      setDeltaSave({ saved: result.saved });
    });
  }

  function applyPack(result: {
    store?: MtgBuylistStore;
    runs?: BuylistRunMeta[];
    activeRunId?: string;
  }) {
    if (result.store) setStore(result.store);
    if (result.runs) setRuns(result.runs);
    if (typeof result.activeRunId === "string") setActiveRunId(result.activeRunId);
  }

  function runHasClientData() {
    return (
      runHasStoredData(store) ||
      Boolean(pmSubmission || mateSubmission || importReview || pendingCsv)
    );
  }

  function openRunTab(runId: string) {
    if (runId === activeRunId) return;
    setError("");
    setActiveRunId(runId);
    setPmSubmission(null);
    setMateSubmission(null);
    setImportReview(null);
    setSubmissionError("");
    setStore((prev) => ({
      ...prev,
      csv: null,
      mate: null,
      playmantis: null,
      resultPm: null,
      resultMate: null,
      resultCompare: null,
      mateConfirmations: {},
      mateReconfirm: {},
      mateImageLinks: {},
    }));
    setBusy(true);
    setStatus(runId ? "Opening run…" : "New Run…");
    void loadBuylistRunAction(runId).then((result) => {
      setBusy(false);
      setStatus("");
      if (!result.ok) {
        setError(result.error || "Could not open run");
        return;
      }
      applyPack(result);
      const href = runId
        ? `${MTG_BUYLIST_HREF}?run=${encodeURIComponent(runId)}`
        : MTG_BUYLIST_HREF;
      window.history.replaceState(window.history.state, "", href);
    });
  }

  function goToRun(runId: string) {
    setActiveRunId(runId);
    if (runId) {
      setPmSubmission(null);
      setMateSubmission(null);
      setImportReview(null);
      setSubmissionError("");
    }
    router.replace(
      runId ? `${MTG_BUYLIST_HREF}?run=${encodeURIComponent(runId)}` : MTG_BUYLIST_HREF,
      { scroll: false },
    );
  }

  function finishClose(pack: {
    store?: MtgBuylistStore;
    runs?: BuylistRunMeta[];
    activeRunId?: string;
  }) {
    applyPack(pack);
    setPmSubmission(null);
    setMateSubmission(null);
    setImportReview(null);
    setPendingCsv(null);
    setSubmissionError("");
    setCloseTarget(null);
    goToRun(pack.activeRunId || "");
  }

  function requestCloseRun(meta: BuylistRunMeta | "current") {
    const target =
      meta === "current"
        ? runs.find((run) => run.id === activeRunId) || {
            id: activeRunId,
            name: store.csv?.filename || "This run",
            csvFilename: store.csv?.filename || "",
            updatedAt: store.updatedAt,
            hasData: runHasStoredData(store),
          }
        : meta;
    const isCurrent = target.id === activeRunId;
    const hasData = isCurrent
      ? runHasClientData()
      : target.hasData;
    if (!hasData) {
      run(() => clearBuylistRunAction(target.id), "Clearing run…");
      return;
    }
    setCloseTarget(target);
  }

  function confirmCloseRun() {
    if (!closeTarget) return;
    const id = closeTarget.id;
    setCloseTarget(null);
    setBusy(true);
    setStatus("Clearing run…");
    void clearBuylistRunAction(id).then((result) => {
      setBusy(false);
      setStatus("");
      if (!result.ok) {
        setError(result.error || "Could not clear run");
        return;
      }
      finishClose(result);
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
        applyPack(result);
        if ("activeRunId" in result && typeof result.activeRunId === "string") {
          goToRun(result.activeRunId);
        } else {
          router.refresh();
        }
        setStatus("");
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
        runId: activeRunId,
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
          ? `${opts.label} · ${result.remaining} left`
          : `${opts.label} ${result.done} / ${result.total}`,
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
          const msg = "No card rows in that submission";
          setError(msg);
          setSubmissionError(msg);
          return;
        }
        setError("");
        setSubmissionError("");
        const next = { filename: file.name, rows };
        if (storeName === "playmantis") {
          setPmSubmission(next);
          const catalog = store.csv ? setCodeMapFromCsv(store.csv.rows) : {};
          const need = [
            ...new Set(
              rows
                .filter((row) => !normalizeSetCode(row.setCode) && row.setName)
                .map((row) => row.setName || "")
                .filter((name) => name && !catalog[normalizeSetName(name)]),
            ),
          ];
          if (need.length) {
            void lookupSetCodesAction(need).then((result) => {
              if (result.ok && Object.keys(result.codes).length) {
                setSetCodeHints((prev) => ({ ...prev, ...result.codes }));
              }
            });
          }
        } else {
          setMateSubmission(next);
        }
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Need a Playmantis .eml, a saved Mate order HTML, or a ManaBox-shaped CSV";
        setError(msg);
        setSubmissionError(msg);
      }
    });
  }

  function acceptImportReview(file: File) {
    void readFileText(file).then((text) => {
      const parsed = parsePlaymantisImportReview(text);
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
      if (!store.csv) {
        setError("Upload the ManaBox CSV first so the review can be compared to this run");
        return;
      }
      setError("");
      setImportReview({ filename: file.name, review: parsed.rows });
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
      () =>
        uploadCsvAction(
          manaBoxRowsToCsv(file.rows),
          file.filename,
          priceSource,
          currency,
          activeRunId,
        ),
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
    setStatus(`Uploading 0 / ${megabytes.toFixed(1)} MB`);
    setBusy(true);
    void (async () => {
      try {
        let harvestedCards = 0;
        void file.text().then((text) => {
          harvestedCards = countMateHarvestCards(text);
          if (harvestedCards) {
            setStatus((prev) =>
              prev.startsWith("Uploading")
                ? `${prev} · ${harvestedCards} cards`
                : prev,
            );
          }
        });
        const { status: httpStatus, text: raw } = await new Promise<{
          status: number;
          text: string;
        }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open(
            "POST",
            `/api/mtg-buylist/mate-upload?run=${encodeURIComponent(activeRunId)}`,
          );
          xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable) return;
            const loaded = (event.loaded / (1024 * 1024)).toFixed(1);
            const total = (event.total / (1024 * 1024)).toFixed(1);
            setStatus(
              `Uploading ${loaded} / ${total} MB${
                harvestedCards ? ` · ${harvestedCards} cards` : ""
              }`,
            );
          };
          xhr.upload.onload = () => {
            setStatus(
              harvestedCards
                ? `Parsing ${harvestedCards} cards…`
                : "Parsing harvest…",
            );
          };
          xhr.onload = () => resolve({ status: xhr.status, text: xhr.responseText });
          xhr.onerror = () => reject(new Error("Mate upload failed"));
          const form = new FormData();
          form.append("file", file);
          xhr.send(form);
        });
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
            httpStatus === 413
              ? `Mate JSON is too large (${megabytes.toFixed(1)} MB) for this server.`
              : `Mate upload failed (${httpStatus}).`,
          );
          setStatus("");
          return;
        }
        if (!data.ok) {
          setError(data.error || `Mate upload failed (${httpStatus})`);
          setStatus("");
          return;
        }
        if (data.store) setStore(data.store);
        const kept = data.summary?.offers ?? 0;
        const source = data.summary?.harvestedOffers || harvestedCards || kept;
        setStatus(
          `Parsed ${kept} / ${source} cards · joining images…`,
        );
        const joined = await refreshMateImageLinksAction(activeRunId);
        if (!joined.ok) {
          setError(joined.error || "Harvest saved; image joins failed");
          setStatus(`Mate ${kept} / ${source} cards · image joins failed`);
          router.refresh();
          return;
        }
        if (joined.store) setStore(joined.store);
        setStatus(
          `Mate ${kept} / ${source} cards · ${joined.linkedCount} image joins`,
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
    setError("");
    setStatus("Reading CSV…");
    void readFileText(file).then((text) => {
      try {
        const rows = parseManaBoxCsv(text);
        if (!rows.length) {
          setPendingCsv(null);
          setError("No card rows in that CSV");
          return;
        }
        const detected = majorityPurchaseCurrency(rows);
        setPriceCurrency(detected.currency || "AUD");
        setPendingCsv({
          text,
          filename: file.name,
          rows,
          mixedCurrency: detected.mixed,
          currencyFromFile: detected.currency,
          missingCurrency: detected.missing,
        });
      } catch (err) {
        setPendingCsv(null);
        setError(err instanceof Error ? err.message : "CSV parse failed");
      } finally {
        setStatus("");
      }
    });
  }

  return (
    <div className="min-w-0 space-y-4" aria-busy={busy}>
      <div className="flex flex-wrap items-center gap-1.5">
        <div role="tablist" aria-label="Runs" className="flex flex-wrap items-center">
          <Link
            href={MTG_BUYLIST_HREF}
            role="tab"
            className="sg-tab rounded-md transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]"
            aria-selected={!activeRunId}
            aria-current={!activeRunId ? "page" : undefined}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
                return;
              }
              event.preventDefault();
              openRunTab("");
            }}
          >
            New Run
          </Link>
          {runs.map((runTab) => {
            const selected = runTab.id === activeRunId;
            return (
              <div
                key={runTab.id}
                role="tab"
                aria-selected={selected}
                className="sg-tab group gap-0.5 pr-1.5"
              >
                <Link
                  href={`${MTG_BUYLIST_HREF}?run=${encodeURIComponent(runTab.id)}`}
                  className="min-w-0 max-w-[14rem] truncate"
                  aria-current={selected ? "page" : undefined}
                  onClick={(event) => {
                    if (
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey ||
                      event.button !== 0
                    ) {
                      return;
                    }
                    event.preventDefault();
                    openRunTab(runTab.id);
                  }}
                >
                  {runTab.name}
                </Link>
                <button
                  type="button"
                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[13px] leading-none text-[var(--muted)] opacity-0 transition-[opacity,background-color,color] duration-150 group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-[color-mix(in_srgb,var(--rag-red)_18%,transparent)] hover:text-[var(--rag-red)] focus-visible:opacity-100"
                  aria-label={`Close ${runTab.name}`}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    requestCloseRun(runTab);
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}
          <button
            type="button"
            className="sg-tab min-w-8 rounded-md transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_10%,transparent)] hover:text-[var(--ink)]"
            aria-label="New Run"
            disabled={pending || busy}
            onClick={() => {
              run(async () => {
                const result = await createBuylistRunAction();
                return result;
              }, "New Run…");
            }}
          >
            +
          </button>
        </div>
        <InfoTip label="Each tab is one run folder with its own CSV, Mate, and Playmantis. Hover a name to show × and close it. + or New Run leaves none selected — drop a CSV to open a folder." />
      </div>
      {busy ? <BusyOverlay status={status} /> : null}
      {error ? (
        <p className="sg-card border-[var(--rag-red)] text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {!busy ? <LoadingBanner status={status} pending={pending} /> : null}

      {!activeRunId ? (
        <div className="sg-card space-y-3">
          <h2 className="font-medium">New Run</h2>
          <p className="text-sm text-[var(--muted)]">
            No run folder is open. Drop a ManaBox CSV to start one. Existing tabs stay as they are.
          </p>
          <FileDropZone
            accept=".csv,text/csv"
            disabled={pending || busy}
            label="ManaBox CSV"
            hint="Drop or click · up to ~1000 cards"
            onFile={acceptCsvFile}
          />
          {pendingCsv ? (
            <div className="space-y-3 rounded border border-[var(--border)] p-3">
              <p className="text-sm">
                <CsvFilenameLink
                  filename={pendingCsv.filename}
                  csvText={manaBoxRowsToCsv(pendingCsv.rows)}
                /> ready.
                Price source?
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
              <CsvRowsPanel
                rows={pendingCsv.rows}
                editable
                onChange={(rows) => setPendingCsv((prev) => (prev ? { ...prev, rows } : prev))}
              />
              <button
                type="button"
                className="sg-btn-primary border border-[var(--ink)] disabled:opacity-50"
                disabled={pending || busy}
                onClick={() => confirmCsvUpload()}
              >
                Open this run
              </button>
            </div>
          ) : null}
        </div>
      ) : (
      <>
      <CollapsibleSection
        id="csv"
        title="1. ManaBox CSV"
        hint="Shared input. Price source is asked once per upload."
        uniqueness={
          <ul className="list-disc space-y-0.5 pl-4">
            <li>
              <strong>Scryfall ID</strong> first
            </li>
            <li>
              Else <strong>set + # + finish</strong>
            </li>
            <li>
              <strong>Name</strong> is a label only
            </li>
          </ul>
        }
        defaultOpen
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-[10px] border border-[var(--rag-red)] bg-[color-mix(in_srgb,var(--rag-red)_12%,var(--surface))] px-3 text-xs font-semibold text-[var(--rag-red)] hover:bg-[color-mix(in_srgb,var(--rag-red)_22%,var(--surface))] disabled:opacity-50"
            style={{ minHeight: "var(--sg-btn-height)" }}
            disabled={pending}
            onClick={() => requestCloseRun("current")}
          >
            Clear this run
          </button>
        </div>
        <FileDropZone
          accept=".csv,text/csv"
          disabled={pending || busy}
          label="ManaBox CSV"
          hint="Drop or click · up to ~1000 cards"
          onFile={acceptCsvFile}
        />
        {pendingCsv ? (
          <div className="mt-3 space-y-3 rounded border border-[var(--border)] p-3">
            <p className="text-sm">
              <CsvFilenameLink
                filename={pendingCsv.filename}
                csvText={manaBoxRowsToCsv(pendingCsv.rows)}
              />{" "}
              ready.
              Price source?
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
            <CsvRowsPanel
              rows={pendingCsv.rows}
              editable
              onChange={(rows) => setPendingCsv((prev) => (prev ? { ...prev, rows } : prev))}
            />
            <button
              type="button"
              className="sg-btn-primary border border-[var(--ink)] disabled:opacity-50"
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
                run(() => enrichCsvTreatmentsAction(activeRunId), "Asking Scryfall for treatments…")
              }
            >
              Refresh Scryfall treatments
            </button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--muted)]">No CSV in this run yet.</p>
        )}
        {pendingCsv ? null : store.csv ? (
          <div className="mt-3">
            <CsvRowsPanel
              rows={store.csv.rows}
              editable={!store.mate && !store.playmantis}
              onChange={(rows) =>
                setStore((prev) => (prev.csv ? { ...prev, csv: { ...prev.csv, rows } } : prev))
              }
              onSave={
                store.mate || store.playmantis
                  ? undefined
                  : () =>
                      run(
                        () => saveCsvRowsAction(store.csv?.rows || [], activeRunId),
                        "Saving CSV…",
                      )
              }
              saveDisabled={pending || busy}
            />
          </div>
        ) : null}
      </CollapsibleSection>

      <CollapsibleSection
        id="pm"
        title="2. Playmantis stream"
        hint="Either path fills the table. Dump wins when both exist."
        uniqueness={
          <ul className="list-disc space-y-0.5 pl-4">
            <li>
              Harvest: <strong>Scryfall ID + finish</strong>
            </li>
            <li>
              Dump: stripped <strong>name + set name + finish</strong> onto this CSV printing
            </li>
            <li>
              Both present: <strong>Import Review</strong> is the table
            </li>
          </ul>
        }
        defaultOpen={Boolean(store.csv)}
      >
        <div className="grid items-stretch gap-3 md:grid-cols-[minmax(13rem,0.85fr)_auto_minmax(18rem,1.2fr)]">
          <div className="flex flex-col gap-3 rounded-lg border border-[var(--border)] p-3">
            <h3 className="text-sm font-medium">Path 1 · Harvest</h3>
            <ul className="list-disc pl-4 text-sm text-[var(--muted)]">
              <li>
                Look up this <strong>CSV</strong>
              </li>
              <li>Leave the page open</li>
            </ul>
            <div className="flex flex-1 flex-col justify-center gap-2">
              <button
                type="button"
                className="sg-btn-primary border border-[var(--ink)] disabled:opacity-50"
                disabled={pending || busy || !store.csv}
                onClick={() => {
                  void (async () => {
                    setError("");
                    setBusy(true);
                    setStatus("Harvesting Playmantis…");
                    try {
                      const after = await harvestPlaymantisLoop({
                        missingOnly: false,
                        label: "Harvesting Playmantis",
                        gapMs: 400,
                      });
                      if (!after) return;
                      const stillMissing = missingIdCount(after);
                      if (stillMissing > 0) {
                        setStatus(`Retrying ${stillMissing} unfound…`);
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
                    setStatus(`Retrying ${pmMissing} unfound…`);
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
          </div>
          <p className="hidden self-center text-center text-xs font-medium uppercase tracking-wide text-[var(--muted)] md:block">
            or
          </p>
          <div className="space-y-2 rounded-lg border border-[var(--border)] p-3">
            <h3 className="text-sm font-medium">Path 2 · Site dump</h3>
            <ul className="list-disc space-y-0.5 pl-4 text-sm text-[var(--muted)]">
              <li>
                Import CSV on{" "}
                <a
                  className="underline"
                  href="https://playmantis.com.au/collections/buylist"
                  target="_blank"
                  rel="noreferrer"
                >
                  Playmantis
                </a>
              </li>
              <li>
                Click the <strong>bookmark</strong>
              </li>
              <li>
                <strong>Drop</strong> the HTML
              </li>
            </ul>
            <div className="flex flex-wrap items-center gap-2">
              <a
                className="sg-btn-secondary"
                href={importReviewBookmarklet}
                draggable
                onClick={(e) => e.preventDefault()}
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/uri-list", importReviewBookmarklet);
                  e.dataTransfer.setData("text/plain", importReviewBookmarklet);
                }}
              >
                Drag to bookmarks bar
              </a>
              <button
                type="button"
                className="sg-btn-secondary text-sm"
                onClick={() => copyText("pm-review-bm", importReviewBookmarklet)}
              >
                {copied === "pm-review-bm" ? "Copied" : "Copy bookmark URL"}
              </button>
            </div>
            <textarea
              className="sg-input min-h-12 font-mono text-[10px] leading-4"
              readOnly
              aria-label="Playmantis Import Review bookmark URL"
              value={importReviewBookmarklet}
            />
            <FileDropZone
              accept=".html,.htm,text/html"
              disabled={pending || busy || !store.csv}
              label="Import Review HTML"
              hint="File the bookmark downloads"
              onFile={acceptImportReview}
            />
            {importReview ? (
              <p className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
                {importReview.filename} · {importReview.review.length} rows
                <button
                  type="button"
                  className="sg-btn-secondary"
                  onClick={() => {
                    setImportReview(null);
                    setDeltaSave(null);
                    savedHarvestDiffKey.current = "";
                  }}
                >
                  Clear
                </button>
              </p>
            ) : null}
          </div>
        </div>
        {importReview && store.playmantis && importReviewLog ? (
          <div className="space-y-2 rounded-lg border border-[var(--border)] p-3">
            <h3 className="text-sm font-medium">Harvest vs Import Review</h3>
            <ul className="list-disc space-y-0.5 pl-4 text-sm text-[var(--muted)]">
              <li>
                Table truth: <strong>Import Review</strong>
              </li>
              <li>
                Harvest is <strong>compared</strong> only
              </li>
              <li>
                Save <strong>differs</strong> → Logs
              </li>
            </ul>
            <p className="text-sm">
              {importReviewLog.agree} agree · {importReviewLog.disagree} differ ·{" "}
              {harvestDeltas.length} to save
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="sg-btn-primary border border-[var(--ink)] disabled:opacity-50"
                disabled={
                  pending ||
                  busy ||
                  savingDeltas ||
                  harvestDeltas.length === 0 ||
                  Boolean(deltaSave)
                }
                onClick={savePmDeltas}
              >
                {savingDeltas ? "Saving…" : "Save PM deltas"}
              </button>
              {deltaSave ? (
                <p className="text-sm text-[var(--muted)]">
                  {deltaSave.saved ? (
                    <>
                      Saved {deltaSave.saved} deltas. See{" "}
                      <Link className="underline" href={`${MTG_BUYLIST_HREF}/logs`}>
                        Logs → diffs
                      </Link>
                      .
                    </>
                  ) : (
                    "Nothing to save."
                  )}
                </p>
              ) : (
                <p className="text-sm text-[var(--muted)]">
                  Unsaved. Log:{" "}
                  <Link className="underline" href={`${MTG_BUYLIST_HREF}/logs`}>
                    Logs → diffs
                  </Link>
                  .
                </p>
              )}
            </div>
          </div>
        ) : null}
        <p className="text-sm text-[var(--muted)]" suppressHydrationWarning>
          {importReview
            ? `Table from Import Review · ${importReview.review.length} rows${
                store.playmantis
                  ? ` · harvest compared (${pmDone} / ${pmTotal} looked up)`
                  : ""
              }.`
            : store.playmantis
              ? `Looked up ${pmDone} / ${pmTotal} Scryfall IDs · ${pmWanted} finish-offers with credit · ${pmMissing} not found${
                  store.playmantis.fetchedAt
                    ? ` · ${store.playmantis.fetchedAt.slice(0, 16).replace("T", " ")} UTC`
                    : ""
                }.`
              : "Choose a path above."}
        </p>
        {pmRows.length ? (
          <StreamTable
            mode="pm"
            rows={pmRows}
            filter={pmFilter}
            onFilter={setPmFilter}
            creditTotal={
              dumpOffers.length
                ? pmRows.reduce((n, r) => n + r.sell * r.creditCents, 0)
                : (store.resultPm?.totals.playmantisCreditCents ?? 0)
            }
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
            Harvest or drop a dump to fill this table.
          </p>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        id="mate"
        title="3. MTGMate stream"
        hint="Console script + JSON. Confirm ambiguous printings."
        uniqueness={
          <ul className="list-disc space-y-0.5 pl-4">
            <li>
              <strong>Set + name + finish</strong>
            </li>
            <li>
              <strong>#</strong> when the Mate title has one
            </li>
            <li>
              Same name/finish, different art: <strong>Confirm</strong>
            </li>
          </ul>
        }
        defaultOpen={Boolean(store.csv)}
      >
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="sg-btn-primary border border-[var(--ink)] disabled:opacity-50"
            disabled={pending || busy || !store.csv}
            onClick={() => {
              setError("");
              setStatus("Creating harvest token…");
              setBusy(true);
              void (async () => {
                try {
                  const result = await createMateHarvestAction(window.location.origin, activeRunId);
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
            <ol className="list-decimal space-y-1 pl-5 text-sm text-[var(--muted)]">
              <li>
                Copy the <strong>harvest script</strong>
              </li>
              <li>
                Sign in on{" "}
                <a
                  className="underline"
                  href="https://www.mtgmate.com.au/"
                  target="_blank"
                  rel="noreferrer"
                >
                  mtgmate.com.au
                </a>
              </li>
              <li>
                F12 → Console → <strong>paste</strong> → Enter
              </li>
              <li>
                <strong>Drop</strong> the JSON if the POST misses
              </li>
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
              className="sg-btn-secondary text-sm"
              onClick={() => copyText("bookmark", bookmarklet)}
            >
              {copied === "bookmark" ? "Copied" : "Copy bookmark URL"}
            </button>
          </div>
        ) : null}
        <FileDropZone
          accept=".json,.customization,application/json"
          disabled={pending || busy || !store.csv}
          label="Mate harvest JSON"
          hint="Drop or click · large files OK"
          onFile={uploadMateFile}
        />
        {store.mate ? (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="flex flex-wrap items-center gap-1.5 text-sm text-[var(--muted)]">
              Mate snapshot · {store.mate.offers.length} rows ·{" "}
              {Object.keys(store.mateImageLinks || {}).length} image joins
              <InfoTip
                label={`Sets ${store.mate.sets.join(", ") || "—"} (${store.mate.source}). ${new Date(store.mate.harvestedAt).toLocaleString()}.`}
              />
            </p>
            <button
              type="button"
              className="sg-btn-secondary shrink-0 text-sm"
              disabled={pending || busy}
              onClick={() => {
                setError("");
                setStatus("Joining images to Scryfall…");
                setBusy(true);
                void refreshMateImageLinksAction(activeRunId).then((result) => {
                  setBusy(false);
                  if (!result.ok) {
                    setError(result.error || "Could not join images");
                    setStatus("");
                    return;
                  }
                  if (result.store) setStore(result.store);
                  setStatus(`Linked ${result.linkedCount} printings`);
                  router.refresh();
                });
              }}
            >
              Refresh Mate image joins
            </button>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">No Mate snapshot yet.</p>
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
            Drop a Mate harvest to fill this table.
          </p>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        id="compare"
        title="4. Compare stores · Mate vs Playmantis"
        hint="Who wins. Harvest vs Import Review is on Playmantis."
        uniqueness={
          <ul className="list-disc space-y-0.5 pl-4">
            <li>
              One <strong>CSV printing</strong> per row
            </li>
            <li>
              Prices already resolved on each <strong>stream</strong>
            </li>
          </ul>
        }
        defaultOpen={Boolean(store.playmantis || store.mate || dumpOffers.length)}
      >
        <ul className="list-disc pl-4 text-sm text-[var(--muted)]">
          <li>
            Store picklists. Import Review diffs:{" "}
            <a className="underline" href="#pm">
              2. Playmantis
            </a>
          </li>
        </ul>
        {compareRows.length ? (
          <CompareTable
            rows={compareRows}
            filter={compareFilter}
            onFilter={setCompareFilter}
            mateCredit={store.resultCompare?.totals.mateCreditCents ?? 0}
            mateCash={store.resultCompare?.totals.mateCashCents ?? 0}
            pmCredit={
              store.resultCompare?.totals.playmantisCreditCents ??
              compareRows.reduce((n, r) => n + r.playmantisSell * r.playmantisCreditCents, 0)
            }
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
            Harvest Playmantis or Mate first.
          </p>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        id="reprepare"
        title="5. Re-prepare ManaBox after pick"
        hint="Drop what the stores took. One CSV + Mate + Playmantis table; filters are views. Re-import CSV is always available."
        uniqueness={
          <ul className="list-disc space-y-0.5 pl-4">
            <li>
              <strong>Scryfall ID + finish</strong> first
            </li>
            <li>
              Then <strong>set + # + finish</strong>
            </li>
            <li>
              Then <strong>name + set + finish</strong>
            </li>
          </ul>
        }
        defaultOpen={Boolean(store.csv)}
      >
        {!store.csv || !join ? (
          <p className="text-sm text-[var(--muted)]">
            Upload a ManaBox CSV in step 1 first.
          </p>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <FileDropZone
                  accept=".eml,.html,.htm,.csv,message/rfc822,text/html,text/csv"
                  disabled={pending || busy}
                  label="Playmantis submission"
                  hint="Sort-order .eml from Playmantis"
                  onFile={(file) => acceptSubmission(file, "playmantis")}
                />
                {pmSubmission ? (
                  <p className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
                    {pmSubmission.filename} · {join.pm.length} printings
                    <button
                      type="button"
                      className="sg-btn-secondary"
                      onClick={() => {
                        setPmSubmission(null);
                        setSubmissionError("");
                      }}
                    >
                      Clear
                    </button>
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <FileDropZone
                  accept=".html,.htm,.csv,text/html,text/csv"
                  disabled={pending || busy}
                  label="MTGMate submission"
                  hint="Saved order page · Incoming or Accepted"
                  onFile={(file) => acceptSubmission(file, "mate")}
                />
                {mateSubmission ? (
                  <p className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
                    {mateSubmission.filename} · {join.mm.length} printings
                    <button
                      type="button"
                      className="sg-btn-secondary"
                      onClick={() => {
                        setMateSubmission(null);
                        setSubmissionError("");
                      }}
                    >
                      Clear
                    </button>
                  </p>
                ) : null}
              </div>
            </div>

            {submissionError ? (
              <p className="rounded-lg border border-[var(--rag-red)] bg-[color-mix(in_srgb,var(--rag-red)_10%,var(--surface))] px-3 py-2 text-sm" role="alert">
                {submissionError}
              </p>
            ) : null}

            {showJoin ? (
              <JoinBoard
                join={join}
                view={joinView}
                onView={setJoinView}
                csvStem={(store.csv?.filename || "manabox").replace(/\.csv$/i, "")}
                hasMate={Boolean(mateSubmission)}
                hasPm={Boolean(pmSubmission)}
              />
            ) : (
              <p className="text-sm text-[var(--muted)]">
                Drop a submission to build the re-import CSV.
              </p>
            )}
          </div>
        )}
      </CollapsibleSection>
      </>
      )}
      <ShellModal
        open={Boolean(closeTarget)}
        titleId="clear-buylist-run"
        onClose={() => setCloseTarget(null)}
        panelClassName="max-w-md"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className="sg-btn-secondary" onClick={() => setCloseTarget(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-[10px] border border-[var(--rag-red)] bg-[color-mix(in_srgb,var(--rag-red)_12%,var(--surface))] px-3 text-xs font-semibold text-[var(--rag-red)] hover:bg-[color-mix(in_srgb,var(--rag-red)_22%,var(--surface))]"
              style={{ minHeight: "var(--sg-btn-height)" }}
              onClick={confirmCloseRun}
            >
              Clear run
            </button>
          </div>
        }
      >
        <h2 id="clear-buylist-run" className="text-base font-medium">
          Clear this run?
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {closeTarget?.csvFilename || closeTarget?.name || "This run"} will be removed, including
          its Mate and Playmantis harvests. Other tabs keep theirs.
        </p>
      </ShellModal>
    </div>
  );
}

function AmbiguousPreviewMark() {
  return (
    <span
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[var(--rag-amber)] text-[10px] font-semibold leading-none text-[var(--rag-amber)]"
      title="Preview is a Scryfall name+set lookup — may be the wrong printing"
      aria-label="Preview may be the wrong printing"
      role="img"
    >
      !
    </span>
  );
}

const runTableClass = "w-max min-w-full text-left text-[13px] leading-5";
const nameHeadClass = "whitespace-nowrap py-1 pr-2 font-medium";
const nameCellClass = "whitespace-nowrap py-1 pr-2";
const metaHeadClass =
  "whitespace-nowrap border-l border-[color-mix(in_srgb,var(--border)_55%,transparent)] px-1.5 py-1 text-center font-medium";
const metaCellClass =
  "whitespace-nowrap border-l border-[color-mix(in_srgb,var(--border)_55%,transparent)] py-1 pl-2.5 pr-1.5 tabular-nums";

function metaCell(extra?: string) {
  return extra ? `${metaCellClass} ${extra}` : metaCellClass;
}

function MetaHead({
  children,
  title,
}: {
  children: string;
  title?: string;
}) {
  return (
    <th className={metaHeadClass} title={title ?? children}>
      {children}
    </th>
  );
}

const csvEditInput =
  "h-6 w-full min-h-0 rounded border border-[var(--border)] bg-[var(--surface)] px-1 py-0 text-[13px] leading-5 text-[var(--ink)]";

function CsvRowsPanel({
  rows,
  editable,
  onChange,
  onSave,
  saveDisabled,
}: {
  rows: ManaBoxRow[];
  editable: boolean;
  onChange?: (rows: ManaBoxRow[]) => void;
  onSave?: () => void;
  saveDisabled?: boolean;
}) {
  return (
    <CollapsibleTableSection
      id="csv-rows"
      title="CSV rows"
      count={String(rows.length)}
      hint={editable ? "edit before harvest" : "locked after harvest"}
      defaultOpen={false}
    >
      <p className="text-xs text-[var(--muted)]">
        {editable
          ? "Revise qty, finish, #, and Scryfall ID before adding buylist items."
          : "Re-upload the CSV to change these rows."}
      </p>
      <CsvRowsEditor rows={rows} editable={editable} onChange={onChange} />
      {editable && onSave ? (
        <button
          type="button"
          className="sg-btn-secondary disabled:opacity-50"
          disabled={saveDisabled}
          onClick={onSave}
        >
          Save CSV edits
        </button>
      ) : null}
    </CollapsibleTableSection>
  );
}

function CsvRowsEditor({
  rows,
  editable,
  onChange,
}: {
  rows: ManaBoxRow[];
  editable: boolean;
  onChange?: (rows: ManaBoxRow[]) => void;
}) {
  function patch(index: number, next: Partial<ManaBoxRow>) {
    if (!onChange) return;
    onChange(rows.map((row, i) => (i === index ? { ...row, ...next } : row)));
  }
  function remove(index: number) {
    if (!onChange) return;
    onChange(rows.filter((_, i) => i !== index));
  }
  return (
    <div className="min-w-0 overflow-x-auto">
      <table className={runTableClass}>
        <thead className="bg-[var(--surface)]">
          <tr className="text-[var(--muted)]">
            <th className={nameHeadClass}>Name</th>
            <MetaHead>Set</MetaHead>
            <MetaHead>#</MetaHead>
            <MetaHead title="Finish">Fin</MetaHead>
            <MetaHead>Qty</MetaHead>
            <MetaHead title="Listed">List</MetaHead>
            <th className={`${metaHeadClass} min-w-[10rem]`}>Scryfall ID</th>
            {editable ? <th className={metaHeadClass}> </th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.scryfallId}-${row.name}-${i}`} className="border-t border-[var(--border)]">
              <td className={nameCellClass}>
                {editable ? (
                  <input
                    className={csvEditInput}
                    value={row.name}
                    aria-label="Name"
                    onChange={(e) => patch(i, { name: e.target.value })}
                  />
                ) : (
                  row.name
                )}
              </td>
              <td className={metaCellClass}>
                {editable ? (
                  <input
                    className={`${csvEditInput} w-16`}
                    value={row.setCode}
                    aria-label="Set code"
                    onChange={(e) => patch(i, { setCode: e.target.value })}
                  />
                ) : (
                  row.setCode || "—"
                )}
              </td>
              <td className={metaCellClass}>
                {editable ? (
                  <input
                    className={`${csvEditInput} w-14`}
                    value={row.collectorNumber}
                    aria-label="Collector number"
                    onChange={(e) => patch(i, { collectorNumber: e.target.value })}
                  />
                ) : (
                  row.collectorNumber || "—"
                )}
              </td>
              <td className={metaCellClass}>
                {editable ? (
                  <input
                    className={`${csvEditInput} w-16`}
                    value={row.foil}
                    aria-label="Finish"
                    onChange={(e) => patch(i, { foil: e.target.value })}
                  />
                ) : (
                  compactFinish(row.foil).short
                )}
              </td>
              <td className={metaCellClass}>
                {editable ? (
                  <input
                    className={`${csvEditInput} w-12`}
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={row.quantity}
                    aria-label="Quantity"
                    onChange={(e) => patch(i, { quantity: Number(e.target.value) || 0 })}
                  />
                ) : (
                  row.quantity
                )}
              </td>
              <td className={metaCellClass}>
                {editable ? (
                  <input
                    className={`${csvEditInput} w-16`}
                    inputMode="decimal"
                    value={
                      row.purchasePriceCents > 0 ? (row.purchasePriceCents / 100).toFixed(2) : ""
                    }
                    aria-label="Listed price"
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      patch(i, {
                        purchasePriceCents:
                          Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0,
                      });
                    }}
                  />
                ) : row.purchasePriceCents > 0 ? (
                  money(row.purchasePriceCents)
                ) : (
                  "—"
                )}
              </td>
              <td className={metaCellClass}>
                {editable ? (
                  <input
                    className={`${csvEditInput} min-w-[9rem]`}
                    value={row.scryfallId}
                    aria-label="Scryfall ID"
                    onChange={(e) => patch(i, { scryfallId: e.target.value.trim() })}
                  />
                ) : (
                  row.scryfallId || "—"
                )}
              </td>
              {editable ? (
                <td className={metaCellClass}>
                  <button
                    type="button"
                    className="sg-btn-ghost px-1 text-xs text-[var(--muted)]"
                    aria-label={`Remove ${row.name}`}
                    onClick={() => remove(i)}
                  >
                    ×
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function compactFinish(finish: string): { short: string; title: string } {
  const title = finish.trim() || "—";
  const key = title.toLowerCase();
  if (key === "nonfoil" || key === "non-foil" || key === "normal") {
    return { short: "NF", title };
  }
  if (key === "foil") return { short: "F", title };
  if (key === "etched") return { short: "Et", title };
  return { short: title, title };
}

function FinishCell({ finish }: { finish: string }) {
  const { short, title } = compactFinish(finish);
  return (
    <td className={metaCellClass} title={title}>
      {short}
    </td>
  );
}

function JoinBoard({
  join,
  view,
  onView,
  csvStem,
  hasMate,
  hasPm,
}: {
  join: OuterJoinResult;
  view: JoinView;
  onView: (view: JoinView) => void;
  csvStem: string;
  hasMate: boolean;
  hasPm: boolean;
}) {
  const visible = filterJoinRows(join.join, view);
  const oversold = join.join.filter((row) => row.remaining < 0).length;
  const unsold = join.join.filter((row) => row.csvQty > 0 && row.mmQty === 0 && row.pmQty === 0)
    .length;
  const sold = join.join.filter((row) => row.csvQty > 0 && row.remaining === 0).length;
  const nonCsv = join.join.filter((row) => row.csvQty <= 0).length;
  const viewLabel: Record<JoinView, string> = {
    master: "Master",
    reimport: "Reimport",
    csv: "CSV",
    mate: "Mate",
    pm: "Playmantis",
    noncsv: "Non-CSV",
    sold: "Sold",
    oversold: "Oversold",
    unsold: "Unsold",
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm text-[var(--muted)]">
            {join.leftoverCopies} leftover copies · {join.reimport.length} printings · removed{" "}
            {join.removedCopies}
          </p>
        </div>
        <button
          type="button"
          className="sg-btn-primary border border-[var(--ink)] disabled:opacity-50"
          disabled={!join.reimport.length}
          onClick={() => downloadText(`${csvStem}-reimport-manabox.csv`, join.leftoverCsv)}
        >
          Download re-import CSV
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Step 5 view">
        <FilterChip
          active={view === "master"}
          label={`Master (${join.join.length})`}
          onClick={() => onView("master")}
        />
        <FilterChip
          active={view === "reimport"}
          label={`Reimport (${join.reimport.length})`}
          onClick={() => onView("reimport")}
        />
        <FilterChip
          active={view === "csv"}
          label={`CSV (${join.csv.length})`}
          onClick={() => onView("csv")}
        />
        {hasMate ? (
          <FilterChip
            active={view === "mate"}
            label={`Mate (${join.mm.length})`}
            onClick={() => onView("mate")}
          />
        ) : null}
        {hasPm ? (
          <FilterChip
            active={view === "pm"}
            label={`Playmantis (${join.pm.length})`}
            onClick={() => onView("pm")}
          />
        ) : null}
        {nonCsv > 0 ? (
          <FilterChip
            active={view === "noncsv"}
            label={`Non-CSV (${nonCsv})`}
            onClick={() => onView("noncsv")}
          />
        ) : null}
        {sold > 0 ? (
          <FilterChip
            active={view === "sold"}
            label={`Sold (${sold})`}
            onClick={() => onView("sold")}
          />
        ) : null}
        {unsold > 0 ? (
          <FilterChip
            active={view === "unsold"}
            label={`Unsold (${unsold})`}
            onClick={() => onView("unsold")}
          />
        ) : null}
        {oversold > 0 ? (
          <FilterChip
            active={view === "oversold"}
            label={`Oversold (${oversold})`}
            tone="amber"
            onClick={() => onView("oversold")}
          />
        ) : null}
      </div>
      <p className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-[var(--muted)]">
        <span>
          Showing {viewLabel[view]} · {visible.length} of {join.join.length}
        </span>
        <button
          type="button"
          className="sg-btn-secondary"
          onClick={() =>
            downloadText(
              `${csvStem}-${view}.csv`,
              outerJoinCsv(view === "master" ? join.join : visible),
            )
          }
        >
          Download this view
        </button>
      </p>
      {visible.length ? (
        <>
          <JoinToneLegend />
          <JoinTable rows={visible} />
        </>
      ) : (
        <p className="text-sm text-[var(--muted)]">No printings in this view.</p>
      )}
    </div>
  );
}

function joinRowTone(row: OuterJoinRow): string {
  if (row.remaining < 0) return "bg-[color-mix(in_srgb,var(--rag-amber)_16%,transparent)]";
  if (row.remaining > 0) return "bg-[color-mix(in_srgb,var(--ink)_7%,transparent)]";
  return "";
}

function JoinToneLegend() {
  return (
    <ul className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" aria-label="Row colours">
      <li className="inline-flex items-center gap-1.5">
        <span
          className="inline-block h-3.5 w-5 rounded border border-[var(--border)] bg-[color-mix(in_srgb,var(--ink)_7%,transparent)]"
          aria-hidden
        />
        <span className="text-[var(--muted)]">Leftover</span>
      </li>
      <li className="inline-flex items-center gap-1.5">
        <span
          className="inline-block h-3.5 w-5 rounded border border-[var(--border)] bg-[color-mix(in_srgb,var(--rag-amber)_16%,transparent)]"
          aria-hidden
        />
        <span className="text-[var(--muted)]">Oversold</span>
      </li>
      <li className="inline-flex items-center gap-1.5">
        <span
          className="inline-block h-3.5 w-5 rounded border border-[var(--border)] bg-[var(--surface)]"
          aria-hidden
        />
        <span className="text-[var(--muted)]">Even</span>
      </li>
    </ul>
  );
}

function soldVendorCell(qty: number, allToThis: boolean, store: "mm" | "pm"): string {
  if (qty <= 0) return metaCellClass;
  const tint =
    store === "mm"
      ? "bg-[color-mix(in_srgb,#3d6d8c_18%,transparent)]"
      : "bg-[color-mix(in_srgb,#8c5a3d_18%,transparent)]";
  return metaCell(`${tint}${allToThis ? " font-semibold" : ""}`);
}

function JoinTable({ rows }: { rows: OuterJoinRow[] }) {
  return (
    <div className="min-w-0 space-y-2">
      <div className="min-w-0 overflow-x-auto">
        <table className={runTableClass}>
          <thead className="bg-[var(--surface)]">
            <tr className="text-[var(--muted)]">
              <th className={nameHeadClass}>Name</th>
              <MetaHead>Set</MetaHead>
              <MetaHead>#</MetaHead>
              <MetaHead title="Finish">Fin</MetaHead>
              <MetaHead title="CSV Qty">CSV</MetaHead>
              <MetaHead title="Mate Qty">MM</MetaHead>
              <MetaHead title="Playmantis Qty">PM</MetaHead>
              <MetaHead title="Remaining">Left</MetaHead>
              <th className="whitespace-nowrap py-1 pl-2 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={`join-${row.name}-${row.setCode}-${row.collectorNumber}-${row.finishLabel}-${i}`}
                className={`border-t border-[var(--border)] ${joinRowTone(row)}`}
              >
                <td className={nameCellClass}>
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <CardNameCell
                      name={row.name}
                      setCode={row.setCode}
                      collectorNumber={row.collectorNumber}
                      finish={row.finishLabel}
                      ownedImageUrl={row.ownedImageUrl}
                      mateImageUrl={row.mmQty > 0 ? row.ownedImageUrl : undefined}
                      playmantisImageUrl={row.pmQty > 0 ? row.ownedImageUrl : undefined}
                      showOwned={row.csvQty > 0}
                      showMate={row.mmQty > 0}
                      showPlaymantis={row.pmQty > 0}
                    />
                    {row.imageAmbiguous ? <AmbiguousPreviewMark /> : null}
                  </span>
                </td>
                <td className={metaCellClass}>{row.setCode || "—"}</td>
                <td className={metaCellClass}>{row.collectorNumber || "—"}</td>
                <FinishCell finish={row.finishLabel} />
                <td className={metaCellClass}>{row.csvQty}</td>
                <td
                  className={soldVendorCell(
                    row.mmQty,
                    row.csvQty > 0 && row.mmQty === row.csvQty && row.pmQty === 0,
                    "mm",
                  )}
                  title={row.mmQty > 0 ? "Mate qty sold" : undefined}
                >
                  {row.mmQty}
                  {row.mmQty > 0 && row.remaining === 0 ? (
                    <span className="ml-1 text-[10px] font-semibold">sold</span>
                  ) : row.mmQty > 0 ? (
                    <span className="ml-1 text-[10px]">sold</span>
                  ) : null}
                </td>
                <td
                  className={soldVendorCell(
                    row.pmQty,
                    row.csvQty > 0 && row.pmQty === row.csvQty && row.mmQty === 0,
                    "pm",
                  )}
                  title={row.pmQty > 0 ? "Playmantis qty sold" : undefined}
                >
                  {row.pmQty}
                  {row.pmQty > 0 && row.remaining === 0 ? (
                    <span className="ml-1 text-[10px] font-semibold">sold</span>
                  ) : row.pmQty > 0 ? (
                    <span className="ml-1 text-[10px]">sold</span>
                  ) : null}
                </td>
                <td className={metaCellClass}>{row.remaining}</td>
                <td className="whitespace-nowrap py-1 pl-2 text-[var(--muted)]">{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
  tone,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  tone?: "default" | "amber";
}) {
  const runUi = useUiLoadingGate();
  function handleClick() {
    if (active) return;
    runUi(onClick);
  }
  if (tone === "amber") {
    return (
      <button
        type="button"
        role="tab"
        aria-selected={active}
        className={`sg-tab${active ? " !border-[var(--rag-amber)]" : ""}`}
        onClick={handleClick}
      >
        {label}
      </button>
    );
  }
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className="sg-tab"
      onClick={handleClick}
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
  const runUi = useUiLoadingGate();
  const [bandFilter, setBandFilter] = useState<Set<RecoveryBand>>(new Set());
  const [showHarvestDiffs, setShowHarvestDiffs] = useState(false);
  const harvestDiffCount = rows.filter((row) => row.harvestDiff).length;
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
          ? "At limit"
          : filter === "harvest_diff"
            ? "Harvest differs"
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
                <p className="text-xs text-[var(--muted)]">Cash {money(cashTotal || 0)}</p>
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
          label="At limit"
          onClick={() => onFilter("capped")}
        />
        <FilterChip
          active={filter === "skip"}
          label="Not found"
          onClick={() => onFilter("skip")}
        />
        {mode === "pm" && harvestDiffCount > 0 ? (
          <FilterChip
            active={filter === "harvest_diff"}
            label={`Harvest differs (${harvestDiffCount})`}
            tone="amber"
            onClick={() => onFilter("harvest_diff")}
          />
        ) : null}
        {mode === "pm" && harvestDiffCount > 0 ? (
          <div
            className="inline-flex h-6 items-center rounded-md border border-[var(--border)] bg-[var(--surface-muted)] p-px"
            role="group"
            aria-label="Show harvest diffs"
          >
            <button
              type="button"
              className={`h-full rounded px-2 text-xs font-medium leading-none ${
                !showHarvestDiffs
                  ? "bg-[var(--surface)] text-[var(--ink)] shadow-sm"
                  : "text-[var(--muted)]"
              }`}
              aria-pressed={!showHarvestDiffs}
              onClick={() => {
                if (!showHarvestDiffs) return;
                runUi(() => setShowHarvestDiffs(false));
              }}
            >
              Table
            </button>
            <button
              type="button"
              className={`h-full rounded px-2 text-xs font-medium leading-none ${
                showHarvestDiffs
                  ? "bg-[var(--surface)] text-[var(--ink)] shadow-sm"
                  : "text-[var(--muted)]"
              }`}
              aria-pressed={showHarvestDiffs}
              onClick={() => {
                if (showHarvestDiffs) return;
                runUi(() => setShowHarvestDiffs(true));
              }}
            >
              Show diffs
            </button>
          </div>
        ) : null}
      </div>
      <p className="sticky top-12 z-10 mb-2 flex flex-wrap items-center gap-1.5 rounded bg-[var(--surface)] py-1 text-xs font-medium text-[var(--muted)]">
        Showing {filterLabel}
        {bandFilter.size > 0 ? " · recovered % filter" : ""} · {visible.length} of {rows.length}
        <InfoTip
          label={`${
            mode === "mate" ? "↻ reopens variants. " : ""
          }O = owned, S = store.`}
        />
      </p>
      <PriceBasisNote source={priceSource} currency={priceCurrency} />
      <RowToneLegend includeConfirm={mode === "mate"} />
      <RecoveryLegend
        selected={bandFilter}
        onToggle={(band) => setBandFilter((prev) => toggleBandInSet(prev, band))}
      />
      <div className="min-w-0 overflow-x-auto">
        <table className={runTableClass}>
          <thead className="bg-[var(--surface)]">
            <tr className="text-[var(--muted)]">
              <th className={nameHeadClass}>Name</th>
              <MetaHead>Set</MetaHead>
              <MetaHead>#</MetaHead>
              <MetaHead title="Finish">Fin</MetaHead>
              <MetaHead>Have</MetaHead>
              <MetaHead title="Wanted">Want</MetaHead>
              <MetaHead>Sell</MetaHead>
              <MetaHead title="Listed">List</MetaHead>
              <MetaHead title="Credit">Cr</MetaHead>
              <MetaHead>Gain</MetaHead>
              {mode === "mate" ? <MetaHead>Cash</MetaHead> : null}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, i) => (
              <StreamRowBlock
                key={`${row.scryfallId}-${row.name}-${i}`}
                mode={mode}
                row={row}
                colCount={colCount}
                showHarvestDiff={showHarvestDiffs}
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
  showHarvestDiff,
  onConfirmMate,
  onRejectMate,
}: {
  mode: "pm" | "mate";
  row: StreamRow;
  colCount: number;
  showHarvestDiff?: boolean;
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
                setCode={row.setCode}
                collectorNumber={row.collectorNumber}
                finish={row.finish}
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
                    setCode={row.setCode}
                    collectorNumber={row.collectorNumber}
                    finish={row.finish}
                    storeImageUrl={v.imageUrl}
                    showOwned={false}
                    showStore
                  />
                </div>
              </td>
              <td className={metaCellClass}>{row.setCode}</td>
              <td className={metaCellClass}>{row.collectorNumber}</td>
              <FinishCell finish={row.finish} />
              <td className={metaCellClass}>{row.have}</td>
              <td className={metaCellClass}>{v.wanted}</td>
              <td className={metaCell("font-semibold")}>{v.sell}</td>
              <td className={metaCellClass}>{money(row.listedCents)}</td>
              <td className={metaCellClass}>{money(v.creditCents)}</td>
              <td
                className={metaCell(
                  recoveryBandClass(recoveryBand(v.creditCents, row.listedCents)),
                )}
              >
                {formatRecovered(recoveredPercent(v.creditCents, row.listedCents))}
              </td>
              <td
                className={metaCellClass}
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

  const diff = row.harvestDiff;
  const harvestSell =
    diff && diff.harvestCreditCents > 0 && diff.harvestLimit > 0
      ? Math.min(row.have, diff.harvestLimit)
      : 0;
  const harvestPct = diff
    ? recoveredPercent(diff.harvestCreditCents, row.listedCents)
    : null;
  const tablePct = recoveredPercent(row.creditCents, row.listedCents);
  return (
    <>
    <tr
      className={`border-t border-[var(--border)] ${toneClass(row.tone)}${
        diff ? " shadow-[inset_3px_0_0_var(--rag-amber)]" : ""
      }`}
    >
      <td className={nameCellClass}>
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <CardNameCell
            name={row.name}
            setCode={row.setCode}
            collectorNumber={row.collectorNumber}
            finish={row.finish}
            ownedImageUrl={row.ownedImageUrl}
            storeImageUrl={row.storeImageUrl}
          />
          {diff ? (
            <span className="rounded bg-[color-mix(in_srgb,var(--rag-amber)_28%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold">
              harvest differs
            </span>
          ) : null}
          {mode === "mate" && row.canReject && onRejectMate ? (
            <button
              type="button"
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[var(--border)] text-[var(--muted)] hover:border-[var(--ink)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"
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
      <td className={metaCellClass}>{row.setCode}</td>
      <td className={metaCellClass}>{row.collectorNumber}</td>
      <FinishCell finish={row.finish} />
      <td className={metaCellClass}>{row.have}</td>
      <td className={metaCellClass}>{row.wanted}</td>
      <td className={metaCell("font-semibold")}>{row.sell}</td>
      <td className={metaCellClass}>{money(row.listedCents)}</td>
      <td className={metaCellClass}>{money(row.creditCents)}</td>
      <td
        className={metaCell(recoveryBandClass(recoveryBand(row.creditCents, row.listedCents)))}
      >
        {formatRecovered(recoveredPercent(row.creditCents, row.listedCents))}
      </td>
      {mode === "mate" ? (
        <td
          className={metaCellClass}
          title={`Cash recovered ${formatRecovered(recoveredPercent(row.cashCents, row.listedCents))} of listed`}
        >
          {money(row.cashCents)}
        </td>
      ) : null}
    </tr>
    {showHarvestDiff && diff ? (
      harvestIsBlank(diff) ? (
        <tr className="bg-[color-mix(in_srgb,var(--rag-amber)_10%,transparent)]">
          <td className={`${nameCellClass} text-xs text-[var(--muted)]`} colSpan={colCount}>
            harvest is blank
          </td>
        </tr>
      ) : (
        <tr className="bg-[color-mix(in_srgb,var(--rag-amber)_10%,transparent)]">
          <td className={`${nameCellClass} text-xs text-[var(--muted)]`}>Harvest</td>
          <td className={metaCellClass}>{row.setCode}</td>
          <td className={metaCellClass}>{row.collectorNumber}</td>
          <FinishCell finish={row.finish} />
          <td className={metaCellClass}>{row.have}</td>
          <td
            className={metaCell(
              diff.harvestLimit !== row.wanted ? HARVEST_DIFF_CELL : undefined,
            )}
          >
            {diff.harvestLimit}
          </td>
          <td
            className={metaCell(
              harvestSell !== row.sell
                ? `${HARVEST_DIFF_CELL} font-semibold`
                : "font-semibold",
            )}
          >
            {harvestSell}
          </td>
          <td className={metaCellClass}>{money(row.listedCents)}</td>
          <td
            className={metaCell(
              diff.harvestCreditCents !== row.creditCents ? HARVEST_DIFF_CELL : undefined,
            )}
          >
            {money(diff.harvestCreditCents)}
          </td>
          <td
            className={metaCell(
              harvestPct !== tablePct
                ? HARVEST_DIFF_CELL
                : recoveryBandClass(recoveryBand(diff.harvestCreditCents, row.listedCents)),
            )}
          >
            {formatRecovered(harvestPct)}
          </td>
        </tr>
      )
    ) : null}
    </>
  );
}

function harvestIsBlank(diff: NonNullable<StreamRow["harvestDiff"]>): boolean {
  return (
    !diff.harvestStatus ||
    (diff.harvestStatus === "not_found" &&
      diff.harvestCreditCents === 0 &&
      diff.harvestLimit === 0)
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
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-[var(--muted)]">Mate credit</dt>
            <dd className="text-lg font-semibold">{money(mateCredit)}</dd>
            <p className="text-xs text-[var(--muted)]">Cash {money(mateCash)}</p>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Playmantis credit</dt>
            <dd className="text-lg font-semibold">{money(pmCredit)}</dd>
          </div>
        </dl>
        <button type="button" className="sg-btn-secondary" onClick={onExportCsv}>
          Download CSV
        </button>
      </div>
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
          <button type="button" className="sg-btn-secondary" onClick={onExportManaBox}>
            ManaBox template
          </button>
          <InfoTip label="Downloads use the selected filter. CSV = this table. ManaBox keeps original columns; qty is Sell (or leftover Have for Not sold)." />
        </div>
      </div>
      <p className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-[var(--muted)]">
        {csvFilename}
        <InfoTip label="Who wins and Sell qty. Set and # identify lands and reprints. Confirm Mate printings on the Mate stream. O = owned." />
      </p>
      <PriceBasisNote source={priceSource} currency={priceCurrency} />
      <RowToneLegend includeConfirm />
      <RecoveryLegend
        selected={bandFilter}
        onToggle={(band) => setBandFilter((prev) => toggleBandInSet(prev, band))}
      />
      <div className="min-w-0 overflow-x-auto">
        <table className={runTableClass}>
          <thead className="bg-[var(--surface)]">
            <tr className="text-[var(--muted)]">
              <th className={nameHeadClass}>Card</th>
              <MetaHead>Set</MetaHead>
              <MetaHead>#</MetaHead>
              <MetaHead>Have</MetaHead>
              <MetaHead title="Listed">List</MetaHead>
              <MetaHead>Mate</MetaHead>
              <MetaHead title="Playmantis">PM</MetaHead>
              <MetaHead title="Winner">Win</MetaHead>
              <MetaHead>Sell</MetaHead>
              <MetaHead>Gain</MetaHead>
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
            <InfoTip label="Credit ≥ $2 but not sellable now — at limit, not found, or Mate needs Confirm." />
          </h3>
          <ul className="space-y-1 text-sm">
            {putAside.map((row, i) => (
              <li
                key={`aside-${row.scryfallId}-${i}`}
                className="flex flex-wrap items-center gap-2 rounded px-2 py-1 bg-[color-mix(in_srgb,var(--rag-amber)_12%,transparent)]"
              >
                <CardNameCell
                  name={row.name}
                  setCode={row.setCode}
                  collectorNumber={row.collectorNumber}
                  finish={row.finish}
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
  const rowTone: StreamTone | null = row.sellable
    ? "sell"
    : row.mateAmbiguous
      ? "ambiguous"
      : row.notFound
        ? "skip"
        : row.wantFull
          ? "capped"
          : null;

  function storeCellClass(isWinner: boolean, wanted: number): string | undefined {
    if (isWinner) return winCell;
    if (row.winner === "mate" || row.winner === "playmantis") {
      if (!(wanted > 0)) return loseCell;
    }
    return undefined;
  }

  return (
    <tr className={`border-t border-[var(--border)] ${rowTone ? toneClass(rowTone) : ""}`}>
      <td
        className={nameCellClass}
        title={`${row.setCode}${row.collectorNumber ? ` #${row.collectorNumber}` : ""}${
          row.finish ? ` · ${row.finish}` : ""
        }`}
      >
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <CardNameCell
            name={row.name}
            setCode={row.setCode}
            collectorNumber={row.collectorNumber}
            finish={row.finish}
            ownedImageUrl={row.ownedImageUrl}
            showOwned
            showStore={false}
            showMate={false}
            showPlaymantis={false}
          />
          {row.showVariants ? (
            <span className="rounded bg-[color-mix(in_srgb,var(--rag-amber)_35%,transparent)] px-1.5 py-0.5 text-xs font-semibold">
              Confirm in Mate stream
            </span>
          ) : null}
        </div>
      </td>
      <td className={metaCellClass}>{row.setCode || "—"}</td>
      <td className={metaCellClass}>{row.collectorNumber || "—"}</td>
      <td className={metaCellClass}>{row.have}</td>
      <td className={metaCellClass}>{money(row.listedCents)}</td>
      <td className={metaCellClass}>
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
      <td className={metaCellClass}>
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
      <td className={metaCellClass}>{winnerLabel}</td>
      <td
        className={metaCell(`font-semibold${shortSell ? " text-[var(--rag-amber)]" : ""}`)}
        title={shortSell ? `Sell ${sell} of ${row.have} owned` : undefined}
      >
        {sell}
        {shortSell ? (
          <span className="ml-1 text-xs font-normal text-[var(--rag-amber)]">
            /{row.have}
          </span>
        ) : null}
      </td>
      <td className={metaCell(recoveryBandClass(gainBand))}>
        {row.sellable ? formatRecovered(recoveredPercent(winnerCredit, row.listedCents)) : "—"}
      </td>
    </tr>
  );
}
