"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ShellModal } from "@/core/shell/ShellModal";
import { formatStamp } from "@/core/ui/format-stamp";
import {
  addPreconDeckAction,
  harvestPreconBookAction,
} from "../actions";
import { scryfallImageUrl } from "../logic/images";
import {
  assessPrecon,
  buyingResultLine,
  matchesRarityFilter,
  type PreconAssess,
  type PreconDestLine,
  type RarityCode,
  type RaritySlice,
} from "../logic/precon-assess";
import {
  canExportManaBox,
  destManaBoxCsv,
  destTableCsv,
  destTableTxt,
} from "../logic/precon-export";
import { manaBoxCopyCount } from "../logic/parse-txt";
import { MTG_BUYLIST_HREF } from "../schema";
import type { PreconCatalog, PreconDest, PreconHarvestBook, PreconVerdict } from "../schema";
import { CardNameCell } from "./CardNameCell";

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function verdictClass(verdict: PreconVerdict) {
  if (verdict === "buy-now") return "text-[var(--rag-green)]";
  if (verdict === "pass" || verdict === "hard-pass") return "text-[var(--rag-red)]";
  return "text-[var(--rag-amber)]";
}

function destLabel(dest: PreconDest) {
  if (dest === "mate-cash") return "Mate $";
  if (dest === "mate-credit") return "Mate cr";
  if (dest === "playmantis") return "PM";
  return "—";
}

const LEGEND_CHIP =
  "inline-flex h-4 min-h-4 min-w-4 items-center justify-center rounded px-1 text-[9px] font-bold leading-none";
const WIN_TONE = "bg-[color-mix(in_srgb,var(--rag-green)_22%,transparent)]";
const LOSE_TONE = "bg-[color-mix(in_srgb,var(--muted)_18%,transparent)] text-[var(--muted)]";
const WIN_CELL = `rounded px-1.5 py-0.5 font-semibold ${WIN_TONE}`;
const LOSE_CELL = `rounded px-1.5 py-0.5 ${LOSE_TONE}`;

const RARITY_BADGE: Record<RarityCode, string> = {
  C: "border border-[var(--ink)] bg-[var(--surface)] text-[var(--ink)]",
  U: "border border-[#9CA3AF] bg-[#C0C0C0] text-[#1F2937]",
  R: "border border-[#B45309] bg-[#D4AF37] text-[#1C1917]",
  M: "border border-[#C2410C] bg-[#E87722] text-[#1C1917]",
};

const RARITY_BAR: Record<RarityCode, string> = {
  C: "bg-[var(--ink)]",
  U: "bg-[#C0C0C0]",
  R: "bg-[#D4AF37]",
  M: "bg-[#E87722]",
};

type FinishKind = "surge" | "foil" | "normal";

type SortKey =
  | "uid"
  | "name"
  | "set"
  | "cn"
  | "rarity"
  | "foil"
  | "qty"
  | "mate"
  | "mateCr"
  | "pm"
  | "ck"
  | "dest";

function storeOfferLabel(cents: number, wanted: number): string {
  if (cents <= 0) return "—";
  return `${money(cents)} · w${wanted}`;
}

function storeOfferTitle(store: string, cents: number, wanted: number, extra?: string): string {
  if (cents <= 0) return `${store} not on the harvest`;
  if (wanted <= 0) return `${store} would offer ${money(cents)} but do not want any right now`;
  return extra ? `${store} want ${wanted} · ${extra}` : `${store} want ${wanted}`;
}

function finishKind(foil: string): FinishKind {
  const key = foil.trim().toLowerCase();
  if (key.includes("surge")) return "surge";
  if (key.includes("foil") || key.includes("etched")) return "foil";
  return "normal";
}

function lineSortValue(line: PreconDestLine, key: SortKey): string | number {
  if (key === "uid") return line.uid;
  if (key === "name") return line.name.toLowerCase();
  if (key === "set") return line.setCode.toLowerCase();
  if (key === "cn") return line.collectorNumber.padStart(8, "0");
  if (key === "rarity") return line.rarityCode || "z";
  if (key === "foil") return finishKind(line.foil);
  if (key === "qty") return line.qty;
  if (key === "mate") return line.mateCashCents;
  if (key === "mateCr") return line.mateCreditCents;
  if (key === "pm") return line.playmantisCreditCents;
  if (key === "ck") return line.ckListedUsdCents;
  return line.dest;
}

function hasWin(line: PreconDestLine) {
  return line.dest === "mate-cash" || line.dest === "mate-credit" || line.dest === "playmantis";
}

function hasW0(line: PreconDestLine) {
  return (
    (line.mateCashCents > 0 && line.mateWanted <= 0) ||
    (line.playmantisCreditCents > 0 && line.playmantisWanted <= 0)
  );
}

function RarityBadge({
  code,
  pressed,
  onClick,
}: {
  code: RarityCode;
  pressed?: boolean;
  onClick?: () => void;
}) {
  const cls = `${LEGEND_CHIP} ${RARITY_BADGE[code]}`;
  if (!onClick) return <span className={cls}>{code}</span>;
  return (
    <button
      type="button"
      className={`${cls} ${pressed === false ? "opacity-35" : ""}`}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {code}
    </button>
  );
}

function FinishBadge({
  foil,
  pressed,
  onClick,
}: {
  foil: string;
  pressed?: boolean;
  onClick?: () => void;
}) {
  const kind = finishKind(foil);
  const dim = pressed === false ? "opacity-35" : "";
  const label = kind === "surge" ? "S" : kind === "foil" ? "F" : "N";
  const title = kind === "surge" ? "Surge foil" : kind === "foil" ? "Foil" : "Nonfoil";
  const cls =
    kind === "normal"
      ? `${LEGEND_CHIP} border border-[var(--border)] bg-[#E7E5E4] text-[#57534E] ${dim}`
      : `${LEGEND_CHIP} text-[#1C1917] ${dim}`;
  const style =
    kind === "surge"
      ? {
          background:
            "linear-gradient(135deg,#fde68a 0%,#f472b6 35%,#38bdf8 65%,#fde68a 100%)",
        }
      : kind === "foil"
        ? {
            background:
              "linear-gradient(135deg,#f8fafc 0%,#c4b5fd 28%,#fbbf24 55%,#67e8f9 78%,#f8fafc 100%)",
          }
        : undefined;
  if (!onClick) {
    return (
      <span className={cls} style={style} title={title}>
        {label}
      </span>
    );
  }
  return (
    <button type="button" className={cls} style={style} title={title} aria-pressed={pressed} onClick={onClick}>
      {label}
    </button>
  );
}

function rarityTip(slices: Record<RarityCode, RaritySlice>): string {
  return (["M", "R", "U", "C"] as const)
    .map((code) => {
      const slice = slices[code];
      return `${code} ${slice.qty} · ${money(slice.cents)}`;
    })
    .join(" · ");
}

function RarityMix({ slices }: { slices: Record<RarityCode, RaritySlice> }) {
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  const total = (["M", "R", "U", "C"] as const).reduce((n, code) => n + slices[code].cents, 0);
  return (
    <div
      className="relative"
      onMouseEnter={(e) => {
        const box = e.currentTarget.getBoundingClientRect();
        setTip({ x: box.left, y: box.bottom + 6 });
      }}
      onMouseLeave={() => setTip(null)}
    >
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        {(["M", "R", "U", "C"] as const).map((code) => {
          const slice = slices[code];
          if (!slice.qty) return null;
          return (
            <span key={code} className="inline-flex items-center gap-0.5 text-[10px]">
              <RarityBadge code={code} />
              <span>
                {slice.qty} · {money(slice.cents)}
              </span>
            </span>
          );
        })}
      </div>
      {tip && total > 0 ? (
        <div
          className="pointer-events-none fixed z-50 w-44 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-2 text-[10px] shadow-md"
          style={{ left: tip.x, top: tip.y }}
          role="tooltip"
        >
          <p className="mb-1 text-[var(--muted)]">{rarityTip(slices)}</p>
          <div className="flex h-2 overflow-hidden rounded">
            {(["M", "R", "U", "C"] as const).map((code) => {
              const slice = slices[code];
              if (!slice.cents) return null;
              return (
                <span
                  key={code}
                  className={RARITY_BAR[code]}
                  style={{ width: `${Math.max(4, (slice.cents / total) * 100)}%` }}
                />
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function legendCounts(lines: PreconDestLine[]) {
  const rarity: Record<RarityCode, number> = { M: 0, R: 0, U: 0, C: 0 };
  const finish: Record<FinishKind, number> = { surge: 0, foil: 0, normal: 0 };
  let win = 0;
  let w0 = 0;
  for (const line of lines) {
    if (hasWin(line)) win += line.qty;
    if (hasW0(line)) w0 += line.qty;
    if (line.rarityCode) rarity[line.rarityCode] += line.qty;
    finish[finishKind(line.foil)] += line.qty;
  }
  return { win, w0, rarity, finish };
}

function LegendSlot({ count, children }: { count: number; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      {children}
      <span className="text-[9px] tabular-nums leading-none text-[var(--muted)]">{count}</span>
    </div>
  );
}

const STAT_CHIP = "rounded-md border border-[var(--border)] bg-[var(--page)] px-2 py-1 text-xs";

function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ResetFiltersButton({ enabled, onClick }: { enabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-[var(--muted)] ${
        enabled ? "hover:text-[var(--ink)]" : "invisible"
      }`}
      aria-label="Reset filters"
      title="Reset filters"
      disabled={!enabled}
      onClick={onClick}
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
        <path
          d="M3.2 8a4.8 4.8 0 0 1 8.2-3.4M12.8 2.8v3.2h-3.2M12.8 8a4.8 4.8 0 0 1-8.2 3.4M3.2 13.2V10h3.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function tableTotals(rows: PreconDestLine[]) {
  let mateWanted = 0;
  let mateUnwanted = 0;
  let mateCreditWanted = 0;
  let mateCreditUnwanted = 0;
  let pmWanted = 0;
  let pmUnwanted = 0;
  let ck = 0;
  let qty = 0;
  for (const line of rows) {
    qty += line.qty;
    ck += line.ckListedUsdCents * line.qty;
    if (line.dest === "mate-cash") mateWanted += line.mateCashCents * line.qty;
    else if (line.mateCashCents > 0) mateUnwanted += line.mateCashCents * line.qty;
    if (line.dest === "mate-credit") mateCreditWanted += line.mateCreditCents * line.qty;
    else if (line.mateCreditCents > 0 && line.mateWanted > 0) mateCreditUnwanted += line.mateCreditCents * line.qty;
    if (line.playmantisWanted > 0 && line.dest === "playmantis") pmWanted += line.playmantisCreditCents * line.qty;
    else if (line.playmantisCreditCents > 0) pmUnwanted += line.playmantisCreditCents * line.qty;
  }
  return { mateWanted, mateUnwanted, mateCreditWanted, mateCreditUnwanted, pmWanted, pmUnwanted, ck, qty };
}

export function MtgBuylistDecks({
  initialCatalog,
  initialHarvest,
  initialDeckId,
}: {
  initialCatalog: PreconCatalog;
  initialHarvest: PreconHarvestBook;
  initialDeckId?: string;
}) {
  const router = useRouter();
  const [catalog, setCatalog] = useState(initialCatalog);
  const [harvest, setHarvest] = useState(initialHarvest);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(
    initialDeckId && catalog.decks.some((d) => d.id === initialDeckId)
      ? initialDeckId
      : catalog.decks[0]?.id || "",
  );
  const [shopAsk, setShopAsk] = useState("90");
  const [destTab, setDestTab] = useState<PreconDest | "all">("all");
  const [winOn, setWinOn] = useState(false);
  const [w0On, setW0On] = useState(false);
  const [rarityOn, setRarityOn] = useState<Set<RarityCode>>(new Set());
  const [finishOn, setFinishOn] = useState<Set<FinishKind>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("uid");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addUrl, setAddUrl] = useState("");
  const [addFile, setAddFile] = useState<{ name: string; text: string } | null>(null);
  const [error, setError] = useState("");
  const [paneOpen, setPaneOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const exportWrapRef = useRef<HTMLDivElement>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!paneOpen && !exportOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setPaneOpen(false);
        setExportOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exportOpen, paneOpen]);

  useEffect(() => {
    if (!exportOpen) return;
    function onDown(e: MouseEvent) {
      if (!exportWrapRef.current?.contains(e.target as Node)) setExportOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [exportOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog.decks;
    return catalog.decks.filter((deck) =>
      [deck.name, deck.productName, deck.setCode, deck.faceCommander]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [catalog.decks, query]);

  const deck = catalog.decks.find((row) => row.id === selectedId) || filtered[0] || catalog.decks[0];
  const askCents = Math.round((Number(shopAsk) || 0) * 100);
  const assess: PreconAssess | null = deck ? assessPrecon(deck, harvest, askCents) : null;
  const shown = useMemo(() => {
    if (!assess) return [];
    const rows = assess.lines.filter((line) => {
      if (winOn) {
        if (!hasWin(line)) return false;
      } else if (destTab !== "all" && line.dest !== destTab) {
        return false;
      }
      if (w0On && !hasW0(line)) return false;
      if (!matchesRarityFilter(line.rarity, rarityOn)) return false;
      if (finishOn.size && !finishOn.has(finishKind(line.foil))) return false;
      return true;
    });
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = lineSortValue(a, sortKey);
      const bv = lineSortValue(b, sortKey);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [assess, destTab, finishOn, rarityOn, sortDir, sortKey, w0On, winOn]);
  const totals = tableTotals(shown);
  const counts = useMemo(() => (assess ? legendCounts(assess.lines) : null), [assess]);
  const filtersOn =
    destTab !== "all" || winOn || w0On || rarityOn.size > 0 || finishOn.size > 0;

  function resetFilters() {
    setDestTab("all");
    setWinOn(false);
    setW0On(false);
    setRarityOn(new Set());
    setFinishOn(new Set());
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "name" || key === "set" || key === "rarity" || key === "uid" ? "asc" : "desc");
  }

  function toggleRarity(code: RarityCode) {
    setRarityOn((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function toggleFinish(kind: FinishKind) {
    setFinishOn((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  function selectDeck(id: string) {
    setSelectedId(id);
    setPaneOpen(false);
    router.replace(`${MTG_BUYLIST_HREF}/decks?deck=${encodeURIComponent(id)}`, { scroll: false });
  }

  function harvestNow() {
    setError("");
    start(async () => {
      const result = await harvestPreconBookAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCatalog(result.catalog);
      setHarvest(result.harvest);
    });
  }

  function exportStem() {
    return (deck?.name || "deck").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "") || "deck";
  }

  function exportTable(kind: "csv" | "txt" | "manabox") {
    const stem = exportStem();
    if (kind === "csv") {
      downloadText(`${stem}-table.csv`, destTableCsv(shown), "text/csv;charset=utf-8");
    } else if (kind === "txt") {
      downloadText(`${stem}-table.txt`, destTableTxt(shown), "text/plain;charset=utf-8");
    } else if (deck) {
      downloadText(`${stem}-manabox.csv`, destManaBoxCsv(deck, shown), "text/csv;charset=utf-8");
    }
    setExportOpen(false);
  }

  function submitAdd() {
    setError("");
    if (!addFile) {
      setError("Choose a ManaBox CSV or TXT.");
      return;
    }
    start(async () => {
      const result = await addPreconDeckAction({
        name: addName,
        sourceUrl: addUrl,
        filename: addFile.name,
        text: addFile.text,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCatalog(result.catalog);
      setHarvest(result.harvest);
      setAddOpen(false);
      setAddName("");
      setAddUrl("");
      setAddFile(null);
      selectDeck(result.deckId);
    });
  }

  return (
    <div className="relative h-full min-h-0 flex-1 overflow-hidden">
      {paneOpen ? (
        <button
          type="button"
          className="absolute inset-0 z-20 bg-[color-mix(in_srgb,var(--ink)_18%,transparent)]"
          aria-label="Close decks pane"
          onClick={() => setPaneOpen(false)}
        />
      ) : null}
      {paneOpen ? (
        <aside
          id="deck-pane"
          className="absolute bottom-2 left-0 top-0 z-30 flex w-80 max-w-[90vw] flex-col gap-3 overflow-y-auto rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-lg"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold">Decks</h2>
            <button type="button" className="sg-btn-secondary ml-auto" onClick={() => setAddOpen(true)}>
              Add deck
            </button>
          </div>
          <input
            className="sg-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search decks"
            aria-label="Search decks"
            autoFocus
          />
          <button type="button" className="sg-btn-primary" onClick={harvestNow} disabled={pending}>
            {pending ? "Harvesting…" : "Harvest Mate & Playmantis"}
          </button>
          <p className="text-xs text-[var(--muted)]">
            {harvest.harvestedAt
              ? `${harvest.source === "mock" ? "Mock" : "Live"} ${formatStamp(harvest.harvestedAt)}`
              : "No harvest"}
          </p>
          <ul className="flex flex-col gap-1">
            {filtered.length === 0 ? (
              <li className="text-sm text-[var(--muted)]">No decks match.</li>
            ) : (
              filtered.map((row) => {
                const current = row.id === deck?.id;
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      className={`w-full rounded-[10px] border px-3 py-2 text-left ${
                        current ? "border-[var(--ink)] bg-[var(--page)]" : "border-[var(--border)]"
                      }`}
                      onClick={() => selectDeck(row.id)}
                    >
                      <span className="block text-sm font-medium">{row.name}</span>
                      <span className="block text-xs text-[var(--muted)]">
                        {row.setCode || "—"} · {manaBoxCopyCount(row.rows)}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </aside>
      ) : null}

      <section className="sg-card !flex h-full min-h-0 flex-col overflow-hidden p-0">
        {!deck || !assess ? (
          <div className="p-4">
            <button type="button" className="sg-btn-primary" onClick={() => setPaneOpen(true)}>
              Add a deck
            </button>
          </div>
        ) : (
          <>
            <div className="shrink-0 space-y-2 border-b border-[var(--border)] px-3 py-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <button
                  type="button"
                  className="sg-btn-secondary"
                  aria-expanded={paneOpen}
                  aria-controls="deck-pane"
                  onClick={() => setPaneOpen((open) => !open)}
                >
                  Decks
                </button>
                <h2 className="text-sm font-semibold tracking-tight">{deck.name}</h2>
                <label className="flex items-center gap-1.5 text-xs font-semibold">
                  Asking
                  <input
                    className="sg-input h-8 w-20 text-sm font-semibold"
                    type="number"
                    min="0"
                    step="1"
                    value={shopAsk}
                    onChange={(e) => setShopAsk(e.target.value)}
                    aria-label="Asking price"
                  />
                </label>
                <p className="text-xs text-[var(--muted)]">
                  Break-even {money(assess.mateCashBreakEvenCents)}
                </p>
                <p className={`min-w-0 flex-1 text-sm font-semibold ${verdictClass(assess.verdict)}`}>
                  {buyingResultLine(assess)}
                </p>
              </div>

              <div className="flex flex-wrap items-stretch gap-1.5">
                <div className={STAT_CHIP}>
                  <p className="text-[10px] text-[var(--muted)]">Mate</p>
                  <p className="font-semibold">{money(assess.mateCashCents)} cash</p>
                  <p className="text-[10px] text-[var(--muted)]">
                    {money(assess.mateCreditWantedCents)} credit
                  </p>
                </div>
                <div className={STAT_CHIP}>
                  <p className="text-[10px] text-[var(--muted)]">PM</p>
                  <p className="font-semibold">{money(assess.playmantisCreditCents)} credit</p>
                  <p className="text-[10px] text-[var(--muted)]">{assess.playmantisCopies}</p>
                </div>
                <div className={STAT_CHIP}>
                  <p className="text-[10px] text-[var(--muted)]">
                    Leftover · {money(assess.leftoverCkUsdCents)} · {assess.leftoverCopies}
                  </p>
                  <RarityMix slices={assess.leftoverByRarity} />
                </div>
                <div className={STAT_CHIP}>
                  <p className="text-[10px] text-[var(--muted)]">CK 1.0 · {money(assess.deckCkUsdCents)}</p>
                  <RarityMix slices={assess.ckByRarity} />
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <div className="flex flex-wrap gap-1" role="tablist" aria-label="Destination">
                  {(["all", "mate-cash", "mate-credit", "playmantis", "leftover"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      className="sg-tab"
                      aria-selected={destTab === tab}
                      onClick={() => setDestTab(tab)}
                    >
                      {tab === "all" ? "All" : destLabel(tab) === "—" ? "Left" : destLabel(tab)}
                    </button>
                  ))}
                </div>
                <div className="ml-auto flex flex-wrap items-end gap-1.5" aria-label="Legend filters">
                  <ResetFiltersButton enabled={filtersOn} onClick={resetFilters} />
                  <div className="flex items-end gap-1">
                    <LegendSlot count={counts?.win ?? 0}>
                      <button
                        type="button"
                        className={`${LEGEND_CHIP} ${WIN_TONE} ${winOn ? "" : "opacity-40"}`}
                        aria-pressed={winOn}
                        onClick={() => setWinOn((v) => !v)}
                      >
                        Win
                      </button>
                    </LegendSlot>
                    <LegendSlot count={counts?.w0 ?? 0}>
                      <button
                        type="button"
                        className={`${LEGEND_CHIP} ${LOSE_TONE} ${w0On ? "" : "opacity-40"}`}
                        aria-pressed={w0On}
                        onClick={() => setW0On((v) => !v)}
                      >
                        $ · w0
                      </button>
                    </LegendSlot>
                  </div>
                  <span className="mb-3 h-3 w-px shrink-0 bg-[var(--border)]" aria-hidden />
                  <div className="flex items-end gap-1">
                    {(["M", "R", "U", "C"] as const).map((code) => (
                      <LegendSlot key={code} count={counts?.rarity[code] ?? 0}>
                        <RarityBadge
                          code={code}
                          pressed={rarityOn.size === 0 || rarityOn.has(code)}
                          onClick={() => toggleRarity(code)}
                        />
                      </LegendSlot>
                    ))}
                  </div>
                  <span className="mb-3 h-3 w-px shrink-0 bg-[var(--border)]" aria-hidden />
                  <div className="flex items-end gap-1">
                    <LegendSlot count={counts?.finish.surge ?? 0}>
                      <FinishBadge
                        foil="surge foil"
                        pressed={finishOn.size === 0 || finishOn.has("surge")}
                        onClick={() => toggleFinish("surge")}
                      />
                    </LegendSlot>
                    <LegendSlot count={counts?.finish.foil ?? 0}>
                      <FinishBadge
                        foil="foil"
                        pressed={finishOn.size === 0 || finishOn.has("foil")}
                        onClick={() => toggleFinish("foil")}
                      />
                    </LegendSlot>
                    <LegendSlot count={counts?.finish.normal ?? 0}>
                      <FinishBadge
                        foil="normal"
                        pressed={finishOn.size === 0 || finishOn.has("normal")}
                        onClick={() => toggleFinish("normal")}
                      />
                    </LegendSlot>
                  </div>
                  <div className="relative" ref={exportWrapRef}>
                    <button
                      type="button"
                      className="sg-btn-secondary h-10 w-10 shrink-0 p-0"
                      aria-expanded={exportOpen}
                      aria-haspopup="menu"
                      title="Export options"
                      onClick={() => setExportOpen((open) => !open)}
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                        <path
                          d="M12 3v11M8 7l4-4 4 4M5 14v5h14v-5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className="sr-only">Export options</span>
                    </button>
                    {exportOpen ? (
                      <div
                        className="absolute right-0 top-full z-30 mt-1 min-w-48 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] py-1 text-sm shadow-md"
                        role="menu"
                      >
                        <button
                          type="button"
                          className="block w-full px-3 py-1.5 text-left hover:bg-[var(--page)]"
                          role="menuitem"
                          onClick={() => exportTable("csv")}
                        >
                          Export table CSV
                        </button>
                        <button
                          type="button"
                          className="block w-full px-3 py-1.5 text-left hover:bg-[var(--page)]"
                          role="menuitem"
                          onClick={() => exportTable("txt")}
                        >
                          Export table TXT
                        </button>
                        {canExportManaBox(deck.source) ? (
                          <button
                            type="button"
                            className="block w-full px-3 py-1.5 text-left hover:bg-[var(--page)]"
                            role="menuitem"
                            onClick={() => exportTable("manabox")}
                          >
                            Export to ManaBox
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 basis-0 overflow-auto px-3">
              <table className="w-full min-w-[48rem] text-left text-sm">
                <thead className="sticky top-0 z-10 bg-[var(--surface)]">
                  <tr>
                    {(
                      [
                        ["uid", "uid"],
                        ["name", "Card"],
                        ["set", "Set"],
                        ["cn", "#"],
                        ["rarity", "Rarity"],
                        ["foil", "Finish"],
                        ["qty", "Have"],
                        ["mate", "MM cash"],
                        ["mateCr", "MM credit"],
                        ["pm", "PM"],
                        ["ck", "CK"],
                        ["dest", "Win"],
                      ] as const
                    ).map(([key, label]) => (
                      <th key={key} className="py-1.5 font-bold">
                        <button type="button" className="text-xs font-bold" onClick={() => toggleSort(key)}>
                          {label}
                          {sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shown.map((line) => (
                    <tr key={line.rowKey} className="border-t border-[var(--border)]">
                      <td className="py-1 tabular-nums text-[var(--muted)]">{line.uid}</td>
                      <td className="py-1">
                        <CardNameCell
                          name={line.name}
                          setCode={line.setCode}
                          collectorNumber={line.collectorNumber}
                          finish={line.foil}
                          ownedImageUrl={scryfallImageUrl(line.scryfallId)}
                          showOwned
                          showStore={false}
                          showMate={false}
                          showPlaymantis={false}
                        />
                      </td>
                      <td className="py-1">{line.setCode}</td>
                      <td className="py-1">{line.collectorNumber || "—"}</td>
                      <td className="py-1">
                        {line.rarityCode ? <RarityBadge code={line.rarityCode} /> : "—"}
                      </td>
                      <td className="py-1">
                        <FinishBadge foil={line.foil} />
                      </td>
                      <td className="py-1">{line.qty}</td>
                      <td className="py-1 tabular-nums">
                        <span
                          className={
                            line.dest === "mate-cash"
                              ? WIN_CELL
                              : line.mateCashCents > 0
                                ? LOSE_CELL
                                : undefined
                          }
                          title={storeOfferTitle("MTGMate cash", line.mateCashCents, line.mateWanted)}
                        >
                          {storeOfferLabel(line.mateCashCents, line.mateWanted)}
                        </span>
                      </td>
                      <td className="py-1 tabular-nums">
                        <span
                          className={
                            line.dest === "mate-credit"
                              ? WIN_CELL
                              : line.mateCreditCents > 0
                                ? LOSE_CELL
                                : undefined
                          }
                          title={storeOfferTitle("MTGMate credit", line.mateCreditCents, line.mateWanted)}
                        >
                          {storeOfferLabel(line.mateCreditCents, line.mateWanted)}
                        </span>
                      </td>
                      <td className="py-1 tabular-nums">
                        <span
                          className={
                            line.dest === "playmantis"
                              ? WIN_CELL
                              : line.playmantisCreditCents > 0
                                ? LOSE_CELL
                                : undefined
                          }
                          title={storeOfferTitle(
                            "Playmantis",
                            line.playmantisCreditCents,
                            line.playmantisWanted,
                          )}
                        >
                          {storeOfferLabel(line.playmantisCreditCents, line.playmantisWanted)}
                        </span>
                      </td>
                      <td className="py-1 tabular-nums">
                        {line.ckListedUsdCents > 0 ? money(line.ckListedUsdCents) : "—"}
                      </td>
                      <td className="py-1">{destLabel(line.dest)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="sticky bottom-0 z-10">
                  <tr className="border-t-2 border-[var(--ink)] text-xs font-semibold">
                    <td className="bg-[var(--surface)] py-2">{shown.length}</td>
                    <td className="bg-[var(--surface)] py-2" colSpan={5} />
                    <td className="bg-[var(--surface)] py-2 tabular-nums">{totals.qty}</td>
                    <td className="bg-[var(--surface)] py-2 tabular-nums">
                      <span className={WIN_CELL}>{money(totals.mateWanted)}</span>
                      {totals.mateUnwanted > 0 ? (
                        <span className={`${LOSE_CELL} ml-1`} title="Not wanted">
                          {money(totals.mateUnwanted)}
                        </span>
                      ) : null}
                    </td>
                    <td className="bg-[var(--surface)] py-2 tabular-nums">
                      <span className={WIN_CELL}>{money(totals.mateCreditWanted)}</span>
                      {totals.mateCreditUnwanted > 0 ? (
                        <span className={`${LOSE_CELL} ml-1`} title="Not allocated">
                          {money(totals.mateCreditUnwanted)}
                        </span>
                      ) : null}
                    </td>
                    <td className="bg-[var(--surface)] py-2 tabular-nums">
                      <span className={WIN_CELL}>{money(totals.pmWanted)}</span>
                      {totals.pmUnwanted > 0 ? (
                        <span className={`${LOSE_CELL} ml-1`} title="Not wanted">
                          {money(totals.pmUnwanted)}
                        </span>
                      ) : null}
                    </td>
                    <td className="bg-[var(--surface)] py-2 tabular-nums">{money(totals.ck)}</td>
                    <td className="bg-[var(--surface)] py-2" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
        {error ? <p className="px-3 pb-2 text-sm text-[var(--rag-red)]">{error}</p> : null}
      </section>

      <ShellModal
        open={addOpen}
        titleId="add-precon-title"
        onClose={() => setAddOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="sg-btn-ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </button>
            <button type="button" className="sg-btn-primary" onClick={submitAdd} disabled={pending}>
              Save deck
            </button>
          </div>
        }
      >
        <h2 id="add-precon-title" className="text-lg font-semibold">
          Add deck
        </h2>
        <label className="mb-2 block text-sm">
          Name
          <input
            className="sg-input mt-1"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            placeholder="Turtle Power!"
          />
        </label>
        <label className="mb-2 block text-sm">
          Citation URL
          <input
            className="sg-input mt-1"
            value={addUrl}
            onChange={(e) => setAddUrl(e.target.value)}
            placeholder="https://magic.wizards.com/…"
          />
        </label>
        <label className="block text-sm">
          ManaBox file
          <input
            className="sg-input mt-1"
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) {
                setAddFile(null);
                return;
              }
              void file.text().then((text) => {
                setAddFile({ name: file.name, text });
                if (!addName.trim()) {
                  setAddName(file.name.replace(/\.(csv|txt)$/i, "").replace(/[_-]+/g, " "));
                }
              });
            }}
          />
        </label>
      </ShellModal>
    </div>
  );
}
