"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShellModal } from "@/core/shell/ShellModal";
import { formatStamp } from "@/core/ui/format-stamp";
import {
  addPreconDeckAction,
  harvestPreconBookAction,
} from "../actions";
import { assessPrecon, verdictLabel, type PreconAssess } from "../logic/precon-assess";
import { manaBoxCopyCount } from "../logic/parse-txt";
import { MTG_BUYLIST_HREF } from "../schema";
import type { PreconCatalog, PreconDest, PreconHarvestBook, PreconVerdict } from "../schema";

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function verdictClass(verdict: PreconVerdict) {
  if (verdict === "buy-now") return "text-[var(--rag-green)]";
  if (verdict === "hard-pass") return "text-[var(--rag-red)]";
  return "text-[var(--rag-amber)]";
}

function destLabel(dest: PreconDest) {
  if (dest === "mate-cash") return "Mate cash";
  if (dest === "playmantis") return "Playmantis";
  return "Leftover";
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
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addUrl, setAddUrl] = useState("");
  const [addFile, setAddFile] = useState<{ name: string; text: string } | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

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
  const shown = assess
    ? destTab === "all"
      ? assess.lines
      : assess.lines.filter((line) => line.dest === destTab)
    : [];

  function selectDeck(id: string) {
    setSelectedId(id);
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
    <div className="grid gap-3 lg:grid-cols-[minmax(16rem,20rem)_1fr]">
      <aside className="sg-card flex flex-col gap-3">
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
        />
        <button
          type="button"
          className="sg-btn-primary"
          onClick={harvestNow}
          disabled={pending}
        >
          {pending ? "Harvesting…" : "Harvest Mate & Playmantis"}
        </button>
        <p className="text-xs text-[var(--muted)]">
          {harvest.harvestedAt
            ? `${harvest.source === "mock" ? "Mock" : "Live"} harvest ${formatStamp(harvest.harvestedAt)}. This book is shared, not a Run session.`
            : "No harvest yet."}
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
                      current
                        ? "border-[var(--ink)] bg-[var(--page)]"
                        : "border-[var(--border)]"
                    }`}
                    onClick={() => selectDeck(row.id)}
                  >
                    <span className="block text-sm font-medium">{row.name}</span>
                    <span className="block text-xs text-[var(--muted)]">
                      {row.setCode || "—"} · {manaBoxCopyCount(row.rows)} cards
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </aside>

      <section className="sg-card flex flex-col gap-3">
        {!deck || !assess ? (
          <p className="text-sm text-[var(--muted)]">Add a deck to analyse a shop ask.</p>
        ) : (
          <>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{deck.name}</h2>
              <p className="text-sm text-[var(--muted)]">
                {deck.faceCommander ? `Face: ${deck.faceCommander}. ` : ""}
                {manaBoxCopyCount(deck.rows)} cards · {deck.setCode || "sets unset"}
                {deck.sourceUrl ? (
                  <>
                    {" "}
                    ·{" "}
                    <a className="underline" href={deck.sourceUrl} target="_blank" rel="noreferrer">
                      Citation
                    </a>
                  </>
                ) : null}
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <button type="button" className="sg-btn-ghost" onClick={() => setShopAsk("90")}>
                $90 walk-in
              </button>
              <button type="button" className="sg-btn-ghost" onClick={() => setShopAsk("60")}>
                $60 sale
              </button>
              <label className="text-sm">
                Shop ask AUD
                <input
                  className="sg-input mt-1 w-28"
                  type="number"
                  min="0"
                  step="1"
                  value={shopAsk}
                  onChange={(e) => setShopAsk(e.target.value)}
                />
              </label>
            </div>

            <p className={`text-sm font-semibold ${verdictClass(assess.verdict)}`}>
              {verdictLabel(assess.verdict)}
              {assess.verdict === "consider-credit"
                ? ` — spend ${money(assess.cashOutlayCents)} to gain ${money(assess.playmantisCreditCents)} credit at ${assess.creditStore} and keep a potential ${money(assess.keepValueCents)} over ${assess.keepCopies} leftover cards?`
                : assess.verdict === "buy-now"
                  ? ` — Mate cash ${money(assess.mateCashCents)} covers ${money(assess.shopAskAudCents)}.`
                  : assess.verdict === "consider-value"
                    ? ` — deck CK 1.0 ${money(assess.deckCkUsdCents)} USD is at least the ask (paper value, not a sale).`
                    : ` — deck CK 1.0 ${money(assess.deckCkUsdCents)} USD is below the ask.`}
            </p>
            {assess.harvestedAt ? (
              <p className="text-xs text-[var(--muted)]">
                Analysis vs {assess.harvestSource} harvest {formatStamp(assess.harvestedAt)}. Mate/PM are AUD. CK is USD paper value.
              </p>
            ) : null}

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[10px] border border-[var(--border)] p-3">
                <p className="text-xs text-[var(--muted)]">Mate cash</p>
                <p className="text-lg font-semibold">{money(assess.mateCashCents)}</p>
                <p className="text-xs text-[var(--muted)]">{assess.mateCopies} cards</p>
              </div>
              <div className="rounded-[10px] border border-[var(--border)] p-3">
                <p className="text-xs text-[var(--muted)]">Playmantis credit</p>
                <p className="text-lg font-semibold">{money(assess.playmantisCreditCents)}</p>
                <p className="text-xs text-[var(--muted)]">{assess.playmantisCopies} cards</p>
              </div>
              <div className="rounded-[10px] border border-[var(--border)] p-3">
                <p className="text-xs text-[var(--muted)]">Leftover</p>
                <p className="text-lg font-semibold">{assess.leftoverCopies} cards</p>
                <p className="text-xs text-[var(--muted)]">
                  {assess.leftoverRarity.rare}R / {assess.leftoverRarity.uncommon}U / {assess.leftoverRarity.common}C
                </p>
              </div>
              <div className="rounded-[10px] border border-[var(--border)] p-3">
                <p className="text-xs text-[var(--muted)]">Deck CK 1.0</p>
                <p className="text-lg font-semibold">{money(assess.deckCkUsdCents)}</p>
                <p className="text-xs text-[var(--muted)]">USD paper · leftover {money(assess.leftoverCkUsdCents)}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1" role="tablist" aria-label="Destination">
              {(["all", "mate-cash", "playmantis", "leftover"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  className="sg-tab"
                  aria-selected={destTab === tab}
                  onClick={() => setDestTab(tab)}
                >
                  {tab === "all" ? "All" : destLabel(tab)}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead>
                  <tr className="text-[var(--muted)]">
                    <th className="py-1 font-medium">Name</th>
                    <th className="py-1 font-medium">Set</th>
                    <th className="py-1 font-medium">CN</th>
                    <th className="py-1 font-medium">Finish</th>
                    <th className="py-1 font-medium">Qty</th>
                    <th className="py-1 font-medium">Dest</th>
                    <th className="py-1 font-medium">$</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((line) => (
                    <tr key={line.rowKey} className="border-t border-[var(--border)]">
                      <td className="py-1">{line.name}</td>
                      <td className="py-1">{line.setCode}</td>
                      <td className="py-1">{line.collectorNumber}</td>
                      <td className="py-1">{line.foil}</td>
                      <td className="py-1">{line.qty}</td>
                      <td className="py-1">{destLabel(line.dest)}</td>
                      <td className="py-1 tabular-nums">
                        {line.dest === "mate-cash"
                          ? money(line.mateCashCents)
                          : line.dest === "playmantis"
                            ? money(line.playmantisCreditCents)
                            : money(line.ckListedUsdCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {error ? <p className="text-sm text-[var(--rag-red)]">{error}</p> : null}
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
        <p className="mb-3 text-sm text-[var(--muted)]">
          ManaBox CSV (set, CN, finish, Scryfall id) or deck-share TXT. Lists do not change after save.
        </p>
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
