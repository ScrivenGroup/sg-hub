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
import {
  deckHarvestRag,
  deckSearchBlob,
  groupDecksByYear,
  hasDeckList,
  type HarvestRag,
} from "../logic/precon-groups";
import { PRECON_HARVEST_STEPS } from "../logic/precon-harvest";
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

function HarvestDot({ rag, className }: { rag: HarvestRag; className?: string }) {
  if (rag === "none") return null;
  const color =
    rag === "green" ? "var(--rag-green)" : rag === "amber" ? "var(--rag-amber)" : "var(--rag-red)";
  const title =
    rag === "green" ? "Live harvest" : rag === "amber" ? "Mock harvest" : "Not harvested";
  return (
    <span
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${className ?? ""}`}
      style={{ backgroundColor: color }}
      title={title}
      aria-label={title}
    />
  );
}

function destLabel(dest: PreconDest) {
  if (dest === "mate-cash") return "Mate $";
  if (dest === "mate-credit") return "Mate cr";
  if (dest === "playmantis") return "PM";
  return "—";
}

const LEGEND_CHIP =
  "inline-flex h-4 min-h-4 min-w-4 cursor-pointer items-center justify-center rounded px-1 text-[9px] font-bold leading-none";
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

function hasNone(line: PreconDestLine) {
  return !hasWin(line) && !hasW0(line);
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
  let none = 0;
  for (const line of lines) {
    if (hasWin(line)) win += line.qty;
    else if (hasW0(line)) w0 += line.qty;
    else none += line.qty;
    if (line.rarityCode) rarity[line.rarityCode] += line.qty;
    finish[finishKind(line.foil)] += line.qty;
  }
  return { win, w0, none, rarity, finish };
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
      className={`inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded text-[var(--muted)] ${
        enabled ? "hover:text-[var(--ink)]" : "invisible"
      }`}
      aria-label="Reset filters and sort"
      title="Reset filters and sort"
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

function listedTotalLabel(listed: number, total: number) {
  return `${listed}/${total}`;
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
  const [noneOn, setNoneOn] = useState(false);
  const [rarityOn, setRarityOn] = useState<Set<RarityCode>>(new Set());
  const [finishOn, setFinishOn] = useState<Set<FinishKind>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("uid");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addUrl, setAddUrl] = useState("");
  const [addFile, setAddFile] = useState<{ name: string; text: string } | null>(null);
  const [attachDeckId, setAttachDeckId] = useState("");
  const [prepped, setPrepped] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [paneOpen, setPaneOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [compactRows, setCompactRows] = useState(false);
  const [listsOnly, setListsOnly] = useState(false);
  const [collapsedYears, setCollapsedYears] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [harvestIds, setHarvestIds] = useState<string[]>([]);
  const exportWrapRef = useRef<HTMLDivElement>(null);
  const optionsWrapRef = useRef<HTMLDivElement>(null);
  const overlayStackRef = useRef<string[]>([]);
  const pendingRef = useRef(false);
  const [pending, start] = useTransition();
  pendingRef.current = pending;

  function syncOverlay(id: string, open: boolean) {
    const stack = overlayStackRef.current.filter((item) => item !== id);
    overlayStackRef.current = open ? [...stack, id] : stack;
  }

  useEffect(() => {
    syncOverlay("add", addOpen);
  }, [addOpen]);
  useEffect(() => {
    syncOverlay("harvest", harvestIds.length > 0);
  }, [harvestIds]);
  useEffect(() => {
    syncOverlay("options", optionsOpen);
  }, [optionsOpen]);
  useEffect(() => {
    syncOverlay("export", exportOpen);
  }, [exportOpen]);
  useEffect(() => {
    syncOverlay("pane", paneOpen);
  }, [paneOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      const top = overlayStackRef.current.at(-1);
      if (!top) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (top === "add") setAddOpen(false);
      else if (top === "harvest") {
        if (!pendingRef.current) setHarvestIds([]);
      } else if (top === "options") setOptionsOpen(false);
      else if (top === "export") setExportOpen(false);
      else if (top === "pane") setPaneOpen(false);
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  useEffect(() => {
    if (!exportOpen && !optionsOpen) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (exportOpen && !exportWrapRef.current?.contains(t)) setExportOpen(false);
      if (optionsOpen && !optionsWrapRef.current?.contains(t)) setOptionsOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [exportOpen, optionsOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.decks.filter((deck) => {
      if (listsOnly && !hasDeckList(deck)) return false;
      if (q && !deckSearchBlob(deck).includes(q)) return false;
      return true;
    });
  }, [catalog.decks, listsOnly, query]);
  const years = useMemo(() => groupDecksByYear(filtered), [filtered]);
  const preppedReady = useMemo(
    () => catalog.decks.filter((deck) => prepped.has(deck.id) && hasDeckList(deck)),
    [catalog.decks, prepped],
  );
  const harvestTargets = useMemo(
    () =>
      harvestIds
        .map((id) => catalog.decks.find((row) => row.id === id))
        .filter((row): row is (typeof catalog.decks)[number] => Boolean(row)),
    [catalog.decks, harvestIds],
  );

  const deck = catalog.decks.find((row) => row.id === selectedId) || filtered[0] || catalog.decks[0];
  const askCents = Math.round((Number(shopAsk) || 0) * 100);
  const assess: PreconAssess | null = deck ? assessPrecon(deck, harvest, askCents) : null;
  const shown = useMemo(() => {
    if (!assess) return [];
    const rows = assess.lines.filter((line) => {
      if (winOn || w0On || noneOn) {
        const hit =
          (winOn && hasWin(line)) || (w0On && hasW0(line)) || (noneOn && hasNone(line));
        if (!hit) return false;
      } else if (destTab !== "all" && line.dest !== destTab) {
        return false;
      }
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
  }, [assess, destTab, finishOn, noneOn, rarityOn, sortDir, sortKey, w0On, winOn]);
  const totals = tableTotals(shown);
  const counts = useMemo(() => (assess ? legendCounts(assess.lines) : null), [assess]);
  const sortDirty = sortKey !== "uid" || sortDir !== "asc";
  const filtersOn =
    destTab !== "all" ||
    winOn ||
    w0On ||
    noneOn ||
    rarityOn.size > 0 ||
    finishOn.size > 0 ||
    sortDirty;

  function resetFilters() {
    setDestTab("all");
    setWinOn(false);
    setW0On(false);
    setNoneOn(false);
    setRarityOn(new Set());
    setFinishOn(new Set());
    setSortKey("uid");
    setSortDir("asc");
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
    const target = catalog.decks.find((row) => row.id === id);
    if (!target || !hasDeckList(target)) return;
    setSelectedId(id);
    router.replace(`${MTG_BUYLIST_HREF}/decks?deck=${encodeURIComponent(id)}`, { scroll: false });
  }

  function togglePrep(id: string, on?: boolean) {
    const target = catalog.decks.find((row) => row.id === id);
    if (!target || !hasDeckList(target)) return;
    setPrepped((prev) => {
      const next = new Set(prev);
      const should = on ?? !next.has(id);
      if (should) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleGroup(ids: string[], on: boolean) {
    setPrepped((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        const target = catalog.decks.find((row) => row.id === id);
        if (!target || !hasDeckList(target)) continue;
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  function toggleCollapsed(kind: "year" | "group", key: string) {
    const set = kind === "year" ? setCollapsedYears : setCollapsedGroups;
    set((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function openHarvest(ids: string[]) {
    const ready = ids.filter((id) => {
      const target = catalog.decks.find((deck) => deck.id === id);
      return target && hasDeckList(target);
    });
    if (!ready.length) {
      setError("Prep a deck that has a list");
      return;
    }
    setError("");
    setHarvestIds(ready);
  }

  function harvestNow() {
    openHarvest(preppedReady.map((deck) => deck.id));
  }

  function confirmHarvest() {
    const deckIds = harvestIds;
    if (!deckIds.length) return;
    setError("");
    start(async () => {
      const result = await harvestPreconBookAction({ deckIds });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCatalog(result.catalog);
      setHarvest(result.harvest);
      setHarvestIds([]);
    });
  }

  function openAdd(deckId?: string) {
    const target = deckId ? catalog.decks.find((row) => row.id === deckId) : undefined;
    setAttachDeckId(target && !hasDeckList(target) ? target.id : "");
    setAddName(target && !hasDeckList(target) ? target.name : "");
    setAddUrl(target?.sourceUrl || "");
    setAddFile(null);
    setAddOpen(true);
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
        deckId: attachDeckId || undefined,
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
      setAttachDeckId("");
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
          className="absolute bottom-2 left-0 top-0 z-30 flex w-96 max-w-[90vw] flex-col overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--surface)] shadow-lg"
        >
          <div className="shrink-0 space-y-2 border-b border-[var(--border)] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold">Decks</h2>
              <div className="ml-auto flex items-center gap-2">
                <button type="button" className="sg-btn-secondary" onClick={() => openAdd()}>
                  Add deck
                </button>
                <div className="relative" ref={optionsWrapRef}>
                  <button
                    type="button"
                    className="sg-btn-secondary h-8 w-8 shrink-0 p-0"
                    aria-expanded={optionsOpen}
                    aria-haspopup="menu"
                    title="Deck options"
                    onClick={() => setOptionsOpen((open) => !open)}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                      <path
                        d="M4 7h16M4 12h16M4 17h16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="sr-only">Deck options</span>
                  </button>
                  {optionsOpen ? (
                    <div
                      className="absolute right-0 top-full z-40 mt-1 min-w-52 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] py-1 text-sm shadow-md"
                      role="menu"
                    >
                      <button
                        type="button"
                        className="block w-full cursor-pointer px-3 py-1.5 text-left hover:bg-[var(--page)]"
                        role="menuitem"
                        aria-pressed={compactRows}
                        onClick={() => setCompactRows((v) => !v)}
                      >
                        {compactRows ? "Regular card rows" : "Small card rows"}
                      </button>
                      <button
                        type="button"
                        className="block w-full cursor-pointer px-3 py-1.5 text-left hover:bg-[var(--page)]"
                        role="menuitem"
                        aria-pressed={listsOnly}
                        onClick={() => setListsOnly((v) => !v)}
                      >
                        {listsOnly ? "Show all decks" : "Only decks with lists"}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            <input
              className="sg-input"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or SKU"
              aria-label="Search decks"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="sg-btn-primary min-w-0 flex-1"
                onClick={harvestNow}
                disabled={pending || !preppedReady.length}
              >
                {pending
                  ? "Harvesting…"
                  : preppedReady.length
                    ? `Harvest ${preppedReady.length} deck${preppedReady.length === 1 ? "" : "s"}`
                    : "Harvest prepped decks"}
              </button>
              <button
                type="button"
                className="sg-btn-secondary shrink-0"
                onClick={() => setPrepped(new Set())}
                disabled={!prepped.size}
              >
                Clear checkboxes
              </button>
            </div>
            <p className="text-xs text-[var(--muted)]">
              {preppedReady.length ? `${preppedReady.length} prepped` : "Selection stays as you search"}
              {harvest.harvestedAt
                ? ` · ${harvest.source === "mock" ? "Mock" : "Live"} ${formatStamp(harvest.harvestedAt)}`
                : " · No harvest in the book yet"}
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {years.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No decks match.</p>
            ) : (
              <div className="flex flex-col gap-4">
              {years.map((year) => {
                const yearTotal = year.groups.reduce((n, group) => n + group.decks.length, 0);
                const yearListed = year.groups.flatMap((group) => group.decks.filter(hasDeckList));
                const yearIds = yearListed.map((row) => row.id);
                const yearPrep = yearIds.filter((id) => prepped.has(id)).length;
                const yearOn = yearIds.length > 0 && yearPrep === yearIds.length;
                const yearMixed = yearPrep > 0 && !yearOn;
                const yearOpen = !collapsedYears.has(year.year);
                return (
                  <section key={year.year}>
                    <div className="mb-2 flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="cursor-pointer"
                        checked={yearOn}
                        ref={(el) => {
                          if (el) el.indeterminate = yearMixed;
                        }}
                        disabled={!yearIds.length}
                        onChange={(e) => toggleGroup(yearIds, e.target.checked)}
                        aria-label={`Prep ${year.year}`}
                      />
                      <button
                        type="button"
                        className="flex min-w-0 cursor-pointer items-center gap-1 text-sm font-semibold"
                        aria-expanded={yearOpen}
                        onClick={() => toggleCollapsed("year", year.year)}
                      >
                        <span className="text-[10px] text-[var(--muted)]">{yearOpen ? "▾" : "▸"}</span>
                        {year.year}
                      </button>
                      <span
                        className="text-[10px] text-[var(--muted)]"
                        title={`${yearListed.length} with a list · ${yearTotal} decks`}
                      >
                        {listedTotalLabel(yearListed.length, yearTotal)}
                      </span>
                    </div>
                    {yearOpen ? (
                    <div className="flex flex-col gap-3 pl-2">
                      {year.groups.map((group) => {
                        const listed = group.decks.filter(hasDeckList);
                        const listedIds = listed.map((row) => row.id);
                        const preppedCount = listedIds.filter((id) => prepped.has(id)).length;
                        const groupOn = listedIds.length > 0 && preppedCount === listedIds.length;
                        const mixed = preppedCount > 0 && !groupOn;
                        const groupKey = `${year.year}::${group.name}`;
                        const groupOpen = !collapsedGroups.has(groupKey);
                        return (
                          <section key={groupKey}>
                            <div className="mb-1 flex items-center gap-2 border-b border-[var(--border)] pb-1">
                              <input
                                type="checkbox"
                                className="cursor-pointer"
                                checked={groupOn}
                                ref={(el) => {
                                  if (el) el.indeterminate = mixed;
                                }}
                                disabled={!listedIds.length}
                                onChange={(e) => toggleGroup(listedIds, e.target.checked)}
                                aria-label={`Prep ${group.name}`}
                              />
                              <button
                                type="button"
                                className="flex min-w-0 cursor-pointer items-center gap-1 text-xs font-semibold"
                                aria-expanded={groupOpen}
                                onClick={() => toggleCollapsed("group", groupKey)}
                              >
                                <span className="text-[10px] text-[var(--muted)]">
                                  {groupOpen ? "▾" : "▸"}
                                </span>
                                <span className="truncate">{group.name}</span>
                              </button>
                              {group.sku ? (
                                <span className="shrink-0 font-mono text-[10px] font-semibold text-[var(--ink)]">
                                  {group.sku}
                                </span>
                              ) : null}
                              <span
                                className="shrink-0 text-[10px] text-[var(--muted)]"
                                title={`${listed.length} with a list · ${group.decks.length} decks`}
                              >
                                {group.releasedAt || "no date"} ·{" "}
                                {listedTotalLabel(listed.length, group.decks.length)}
                              </span>
                            </div>
                            {groupOpen ? (
                            <ul className="flex flex-col gap-1">
                              {group.decks.map((row) => {
                                const listedRow = hasDeckList(row);
                                const current = row.id === deck?.id;
                                const rag = deckHarvestRag(row, harvest);
                                return (
                                  <li key={row.id}>
                                    <div
                                      className={`flex gap-2 rounded-[10px] border px-2 ${
                                        compactRows ? "items-center py-0.5" : "items-start py-1.5"
                                      } ${
                                        current
                                          ? "border-[var(--ink)] bg-[var(--page)]"
                                          : "border-[var(--border)]"
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        className={`${compactRows ? "" : "mt-1"} cursor-pointer`}
                                        checked={prepped.has(row.id)}
                                        disabled={!listedRow}
                                        onChange={(e) => togglePrep(row.id, e.target.checked)}
                                        aria-label={`Prep ${row.name}`}
                                      />
                                      <button
                                        type="button"
                                        className={`min-w-0 flex-1 text-left ${
                                          listedRow
                                            ? "cursor-pointer"
                                            : "cursor-not-allowed text-[var(--muted)]"
                                        }`}
                                        disabled={!listedRow}
                                        onClick={() => selectDeck(row.id)}
                                      >
                                        <span
                                          className={`block font-medium ${
                                            compactRows ? "truncate text-xs" : "text-sm"
                                          } ${listedRow ? "" : "italic"}`}
                                        >
                                          {row.name}
                                        </span>
                                        {compactRows ? null : (
                                          <span className="block text-[10px] text-[var(--muted)]">
                                            {listedRow
                                              ? `${manaBoxCopyCount(row.rows)} cards`
                                              : "No decklist"}
                                          </span>
                                        )}
                                      </button>
                                      {listedRow ? (
                                        <HarvestDot rag={rag} className={compactRows ? undefined : "mt-1"} />
                                      ) : null}
                                      {!listedRow ? (
                                        <button
                                          type="button"
                                          className={`sg-btn-ghost shrink-0 text-[10px] ${
                                            compactRows ? "h-6 min-h-6 px-1.5 py-0" : "px-2 py-1"
                                          }`}
                                          onClick={() => openAdd(row.id)}
                                        >
                                          Add list
                                        </button>
                                      ) : null}
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                            ) : null}
                          </section>
                        );
                      })}
                    </div>
                    ) : null}
                  </section>
                );
              })}
              </div>
            )}
          </div>
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
                <button
                  type="button"
                  className="sg-btn-primary shrink-0"
                  onClick={() => openHarvest([deck.id])}
                  disabled={pending || !hasDeckList(deck)}
                >
                  Harvest
                </button>
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
                    <LegendSlot count={counts?.none ?? 0}>
                      <button
                        type="button"
                        className={`${LEGEND_CHIP} ${LOSE_TONE} ${noneOn ? "" : "opacity-40"}`}
                        aria-pressed={noneOn}
                        onClick={() => setNoneOn((v) => !v)}
                      >
                        Null
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
                          className="block w-full cursor-pointer px-3 py-1.5 text-left hover:bg-[var(--page)]"
                          role="menuitem"
                          onClick={() => exportTable("csv")}
                        >
                          Export table CSV
                        </button>
                        <button
                          type="button"
                          className="block w-full cursor-pointer px-3 py-1.5 text-left hover:bg-[var(--page)]"
                          role="menuitem"
                          onClick={() => exportTable("txt")}
                        >
                          Export table TXT
                        </button>
                        {canExportManaBox(deck.source) ? (
                          <button
                            type="button"
                            className="block w-full cursor-pointer px-3 py-1.5 text-left hover:bg-[var(--page)]"
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
                        <button type="button" className="cursor-pointer text-xs font-bold" onClick={() => toggleSort(key)}>
                          {label}
                          {sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shown.map((line) => (
                    <tr key={line.rowKey} className={`border-t border-[var(--border)] ${compactRows ? "text-xs leading-tight" : ""}`}>
                      <td className={`${compactRows ? "py-0" : "py-1"} tabular-nums text-[var(--muted)]`}>
                        {line.uid}
                      </td>
                      <td className={compactRows ? "py-0" : "py-1"}>
                        <CardNameCell
                          name={line.name}
                          setCode={line.setCode}
                          collectorNumber={line.collectorNumber}
                          finish={line.foil}
                          ownedImageUrl={scryfallImageUrl(line.scryfallId)}
                          showOwned={!compactRows}
                          showStore={false}
                          showMate={false}
                          showPlaymantis={false}
                        />
                      </td>
                      <td className={compactRows ? "py-0" : "py-1"}>{line.setCode}</td>
                      <td className={compactRows ? "py-0" : "py-1"}>{line.collectorNumber || "—"}</td>
                      <td className={compactRows ? "py-0" : "py-1"}>
                        {line.rarityCode ? <RarityBadge code={line.rarityCode} /> : "—"}
                      </td>
                      <td className={compactRows ? "py-0" : "py-1"}>
                        <FinishBadge foil={line.foil} />
                      </td>
                      <td className={compactRows ? "py-0" : "py-1"}>{line.qty}</td>
                      <td className={`${compactRows ? "py-0" : "py-1"} tabular-nums`}>
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
                      <td className={`${compactRows ? "py-0" : "py-1"} tabular-nums`}>
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
                      <td className={`${compactRows ? "py-0" : "py-1"} tabular-nums`}>
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
                      <td className={`${compactRows ? "py-0" : "py-1"} tabular-nums`}>
                        {line.ckListedUsdCents > 0 ? money(line.ckListedUsdCents) : "—"}
                      </td>
                      <td className={compactRows ? "py-0" : "py-1"}>{destLabel(line.dest)}</td>
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
        closeOnEscape={false}
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
          {attachDeckId ? "Add list" : "Add deck"}
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
      <ShellModal
        open={harvestTargets.length > 0}
        titleId="harvest-precon-title"
        closeOnEscape={false}
        onClose={() => {
          if (!pending) setHarvestIds([]);
        }}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="sg-btn-ghost"
              onClick={() => setHarvestIds([])}
              disabled={pending}
            >
              Cancel
            </button>
            <button type="button" className="sg-btn-primary" onClick={confirmHarvest} disabled={pending}>
              {pending ? "Harvesting…" : "Harvest now"}
            </button>
          </div>
        }
      >
        <h2 id="harvest-precon-title" className="text-lg font-semibold">
          Harvest {harvestTargets.length} deck{harvestTargets.length === 1 ? "" : "s"}
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Same steps for one deck or many. This sitting still writes the mock book; live Mate and
          Playmantis will use this popup.
        </p>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
          {PRECON_HARVEST_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-sm">
          {harvestTargets.map((row) => (
            <li key={row.id}>{row.name}</li>
          ))}
        </ul>
        {error ? <p className="mt-2 text-sm text-[var(--rag-red)]">{error}</p> : null}
      </ShellModal>
    </div>
  );
}
