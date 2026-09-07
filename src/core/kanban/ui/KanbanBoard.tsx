"use client";

import { useEffect, useMemo, useState, useTransition, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ShellModal } from "@/core/shell/ShellModal";
import {
  publishSnapshotPackAction,
  setLiveBaselineAction,
  setLiveBaselineFromThisBoardAction,
} from "../actions";
import {
  deltaVsBaseline,
  fingerprintTicket,
  formatDeltaSummary,
  livePresenceForId,
} from "../fingerprint";
import type { DevHostKind } from "../host";
import { exportBoardJson } from "../pack";
import type { KanbanLeafOption } from "../leaves";
import {
  CATEGORY_BADGE,
  CATEGORY_LABELS,
  COLUMN_ACCENT,
  COLUMN_FILTERS,
  COLUMN_LABELS,
  KANBAN_CATEGORIES,
  type ColumnFilterId,
  type KanbanBoard,
  type KanbanCategory,
  type KanbanColumn,
  type KanbanTicket,
} from "../schema";
import { clipText, copyText, PresenceChip, sortItems, type SortKey } from "./bits";
import { LeafTagBadge } from "./LeafTagSelect";
import { InboxAttachmentList } from "./InboxAttachments";

export type LayoutMode = "columns" | "swimlanes";

function ragColor(rag: "green" | "amber" | "red") {
  if (rag === "green") return "var(--rag-green)";
  if (rag === "red") return "var(--rag-red)";
  return "var(--rag-amber)";
}

function CategoryBadge({ category }: { category: KanbanCategory }) {
  const spec = CATEGORY_BADGE[category];
  return (
    <span
      className="inline-block shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{ color: spec.color, background: spec.fill, borderColor: spec.color }}
    >
      {CATEGORY_LABELS[category]}
    </span>
  );
}

export function KanbanBoard({
  board,
  nodeId,
  revalidateHref,
  hostKind,
  leafOptions,
  showLeafTag = false,
  columnFilter,
  layout,
  categoryFilter,
  moreOpen,
  onMoreOpenChange,
}: {
  board: KanbanBoard;
  nodeId: string;
  leafTitle: string;
  leafHref: string;
  revalidateHref: string;
  hostKind: DevHostKind;
  leafOptions: KanbanLeafOption[];
  showLeafTag?: boolean;
  columnFilter: ColumnFilterId;
  layout: LayoutMode;
  categoryFilter: KanbanCategory | "all";
  moreOpen: boolean;
  onMoreOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [focusCol, setFocusCol] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<Record<string, SortKey>>({});
  const [packOpen, setPackOpen] = useState(false);
  const [baselineOpen, setBaselineOpen] = useState(false);
  const [packText, setPackText] = useState("");
  const [baselineText, setBaselineText] = useState("");
  const [flash, setFlash] = useState("");
  const [openTicket, setOpenTicket] = useState<KanbanTicket | null>(null);

  const delta = useMemo(() => deltaVsBaseline(board), [board]);
  const showPresence = hostKind === "localhost";
  const categories = board.lanes.length ? board.lanes : [...KANBAN_CATEGORIES];

  const filterSpec =
    COLUMN_FILTERS.find((f) => f.id === columnFilter) || COLUMN_FILTERS[0];
  const visibleCols: KanbanColumn[] = focusCol
    ? [focusCol as KanbanColumn]
    : [...filterSpec.columns];

  useEffect(() => {
    setFocusCol(null);
  }, [columnFilter]);

  const ticketsForCategory = useMemo(() => {
    return board.tickets.filter((t) =>
      categoryFilter === "all" ? true : t.lane === categoryFilter,
    );
  }, [board.tickets, categoryFilter]);

  function sortKeyFor(col: string): SortKey {
    return sortBy[col] || "date-desc";
  }

  function ticketsIn(column: KanbanColumn) {
    return sortItems(
      ticketsForCategory.filter((t) => t.column === column),
      sortKeyFor(column),
    );
  }

  const colCountClass =
    visibleCols.length <= 1
      ? "grid-cols-1"
      : "[grid-template-columns:1fr] md:[grid-template-columns:repeat(var(--kanban-cols),minmax(0,1fr))]";

  function ColumnShell({
    col,
    count,
    extra,
    children,
  }: {
    col: string;
    count: number;
    extra?: ReactNode;
    children: React.ReactNode;
  }) {
    const accent = COLUMN_ACCENT[col as KanbanColumn] || COLUMN_ACCENT.archived;
    const label = COLUMN_LABELS[col as KanbanColumn] || col;
    const focused = focusCol === col;
    return (
      <section
        className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[10px] p-3 max-md:min-h-[52dvh]"
        style={{
          borderLeft: `4px solid ${accent}`,
          background: `color-mix(in srgb, ${accent} 10%, var(--page))`,
        }}
      >
        <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">
            {label}{" "}
            <span className="font-medium text-[var(--muted)]">{count}</span>
          </h2>
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              className="sg-btn-ghost px-2 py-1 text-xs"
              onClick={() => setFocusCol(focused ? null : col)}
            >
              {focused ? "Show columns" : "Focus"}
            </button>
            {extra}
            <label className="text-xs text-[var(--muted)]">
              Sort{" "}
              <select
                className="sg-input py-1 text-xs"
                value={sortKeyFor(col)}
                onChange={(e) =>
                  setSortBy((prev) => ({ ...prev, [col]: e.target.value as SortKey }))
                }
              >
                <option value="date-desc">Date · newest</option>
                <option value="date-asc">Date · oldest</option>
                <option value="title-asc">A–Z</option>
                <option value="title-desc">Z–A</option>
              </select>
            </label>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </section>
    );
  }

  function TicketCard({ ticket }: { ticket: KanbanTicket }) {
    const presence = livePresenceForId(
      board,
      ticket.id,
      "ticket",
      fingerprintTicket(ticket),
    );
    return (
      <article
        role="button"
        tabIndex={0}
        className="mb-2 cursor-pointer rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-2.5 text-sm"
        onClick={() => setOpenTicket(ticket)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpenTicket(ticket);
          }
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug">{ticket.title}</h3>
          <span className="flex shrink-0 flex-wrap items-center justify-end gap-1">
            {showLeafTag ? (
              <LeafTagBadge nodeId={ticket.nodeId} options={leafOptions} />
            ) : null}
            <CategoryBadge category={ticket.lane} />
          </span>
        </div>
        {ticket.body ? (
          <p className="mt-2 text-xs text-[var(--muted)]">{clipText(ticket.body, 180)}</p>
        ) : null}
        <p className="mt-2 text-xs text-[var(--muted)]">
          {ticket.id}
          {ticket.sourceIdeaId ? ` · raw ${ticket.sourceIdeaId}` : " · ad-hoc"}
        </p>
        <PresenceChip presence={presence} show={showPresence} />
      </article>
    );
  }

  function renderTicketColumn(col: KanbanColumn) {
    const items = ticketsIn(col);
    return (
      <ColumnShell col={col} count={items.length}>
        {items.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">none</p>
        ) : (
          items.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)
        )}
      </ColumnShell>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {flash ? <p className="shrink-0 text-sm text-[var(--muted)]">{flash}</p> : null}

      {layout === "columns" || focusCol ? (
        <div
          className={`grid min-h-0 flex-1 items-stretch gap-3 ${colCountClass}`}
          style={{ "--kanban-cols": String(visibleCols.length) } as CSSProperties}
        >
          {visibleCols.map((col) => (
            <div key={col} className="flex h-full min-h-0 flex-col">
              {renderTicketColumn(col)}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
          <table className="w-full table-fixed border-collapse text-left">
            <thead>
              <tr>
                <th className="w-32 py-2 pr-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Category
                </th>
                {visibleCols.map((col) => (
                    <th
                      key={col}
                      className="py-2 pr-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
                    >
                      {COLUMN_LABELS[col]}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {(categoryFilter === "all" ? categories : [categoryFilter]).map((cat) => (
                <tr key={cat} className="align-top border-t border-[var(--border)]">
                  <th className="py-2 pr-2">
                    <CategoryBadge category={cat} />
                  </th>
                  {visibleCols.map((col) => {
                      const items = ticketsIn(col).filter((t) => t.lane === cat);
                      return (
                        <td key={col} className="py-2 pr-2">
                          {items.length === 0 ? (
                            <span className="text-xs text-[var(--muted)]">—</span>
                          ) : (
                            items.map((ticket) => (
                              <TicketCard key={ticket.id} ticket={ticket} />
                            ))
                          )}
                        </td>
                      );
                    })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ShellModal
        open={moreOpen}
        titleId="kanban-more-options"
        onClose={() => onMoreOpenChange(false)}
        panelClassName="max-w-lg"
      >
        <h2 id="kanban-more-options" className="mb-2 font-medium">
          More options
        </h2>
        <div
          className="mb-3 rounded-[10px] border px-3 py-2"
          style={{
            borderColor: delta.hasBaseline ? ragColor(delta.rag) : "var(--border)",
            background: delta.hasBaseline
              ? `color-mix(in srgb, ${ragColor(delta.rag)} 12%, transparent)`
              : "var(--surface)",
          }}
        >
          <p className="text-sm font-semibold">
            {delta.hasBaseline
              ? `${delta.total} change${delta.total === 1 ? "" : "s"} since live snapshot (rev ${delta.baselineRevision})`
              : "No live baseline yet"}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">{formatDeltaSummary(delta)}</p>
          {board.publishedAt ? (
            <p className="mt-1 text-xs text-[var(--muted)]">
              Last snapshot on this disk: {new Date(board.publishedAt).toLocaleString()} · board
              revision {board.revision}
            </p>
          ) : (
            <p className="mt-1 text-xs text-[var(--muted)]">
              Board revision {board.revision}. No snapshot published on this disk yet.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="sg-btn-secondary"
            onClick={() => {
              onMoreOpenChange(false);
              setPackOpen(true);
            }}
          >
            Publish snapshot
          </button>
          <button
            type="button"
            className="sg-btn-secondary"
            onClick={async () => {
              const json = exportBoardJson(board);
              const ok = await copyText(json);
              setFlash(ok ? "Board JSON copied." : "Copy failed — use Publish snapshot to paste.");
            }}
          >
            Export board JSON
          </button>
          <button
            type="button"
            className="sg-btn-secondary"
            onClick={() => {
              onMoreOpenChange(false);
              setBaselineOpen(true);
            }}
          >
            Set live baseline
          </button>
          {hostKind === "live" ? (
            <button
              type="button"
              className="sg-btn-ghost disabled:opacity-50"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  await setLiveBaselineFromThisBoardAction(nodeId, revalidateHref);
                  setFlash("Live baseline set from this board.");
                  onMoreOpenChange(false);
                  router.refresh();
                });
              }}
            >
              Baseline = this live board
            </button>
          ) : null}
        </div>
        <button type="button" className="sg-btn-ghost mt-3" onClick={() => onMoreOpenChange(false)}>
          Close
        </button>
      </ShellModal>

      <ShellModal
        open={Boolean(openTicket)}
        titleId="ticket-note"
        onClose={() => setOpenTicket(null)}
        panelClassName="max-w-2xl"
      >
        {openTicket ? (
          <>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h2 id="ticket-note" className="font-medium">
                {openTicket.title}
              </h2>
              <CategoryBadge category={openTicket.lane} />
            </div>
            <p className="text-xs text-[var(--muted)]">
              id {openTicket.id} · {COLUMN_LABELS[openTicket.column]}
              {openTicket.sourceIdeaId
                ? ` · raw ${openTicket.sourceIdeaId}`
                : " · ad-hoc (no inbox)"}
            </p>
            <p className="mt-3 min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap text-sm">
              {openTicket.body}
            </p>
            <div className="mt-3">
              {openTicket.sourceIdeaId ? (
                <InboxAttachmentList
                  readOnly
                  attachments={
                    board.ideas.find((idea) => idea.id === openTicket.sourceIdeaId)?.attachments ??
                    []
                  }
                />
              ) : (
                <p className="text-xs text-[var(--muted)]">Ad-hoc ticket — no inbox files.</p>
              )}
            </div>
            <button type="button" className="sg-btn-ghost mt-3" onClick={() => setOpenTicket(null)}>
              Close
            </button>
          </>
        ) : null}
      </ShellModal>

      <ShellModal
        open={packOpen}
        titleId="publish-pack"
        onClose={() => setPackOpen(false)}
        panelClassName="max-w-2xl"
      >
        <h2 id="publish-pack" className="mb-2 font-medium">
          Publish snapshot
        </h2>
        <p className="mb-3 text-sm text-[var(--muted)]">
          Paste a session pack. Tickets upsert by id. Listed raw ids are archived (body kept).
        </p>
        <textarea
          className="sg-input min-h-48 font-mono text-xs"
          value={packText}
          onChange={(e) => setPackText(e.target.value)}
          placeholder='{"boardId":"...","tickets":[],"archiveIdeaIds":[]}'
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="sg-btn-primary disabled:opacity-50"
            disabled={pending || !packText.trim()}
            onClick={() => {
              startTransition(async () => {
                const result = await publishSnapshotPackAction(
                  nodeId,
                  revalidateHref,
                  packText,
                );
                if (!result.ok) {
                  setFlash(result.error);
                  return;
                }
                setFlash(
                  result.warning
                    ? result.warning
                    : `Snapshot published.${result.changelogCount ? ` Changelog +${result.changelogCount}.` : ""}`,
                );
                setPackText("");
                setPackOpen(false);
                router.refresh();
              });
            }}
          >
            Apply pack
          </button>
          <button type="button" className="sg-btn-ghost" onClick={() => setPackOpen(false)}>
            Cancel
          </button>
        </div>
      </ShellModal>

      <ShellModal
        open={baselineOpen}
        titleId="set-baseline"
        onClose={() => setBaselineOpen(false)}
        panelClassName="max-w-2xl"
      >
        <h2 id="set-baseline" className="mb-2 font-medium">
          Set live baseline
        </h2>
        <p className="mb-3 text-sm text-[var(--muted)]">
          Paste an export from live. Localhost uses this for On live chips and the change-since-live
          meter.
        </p>
        <textarea
          className="sg-input min-h-48 font-mono text-xs"
          value={baselineText}
          onChange={(e) => setBaselineText(e.target.value)}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="sg-btn-primary disabled:opacity-50"
            disabled={pending || !baselineText.trim()}
            onClick={() => {
              startTransition(async () => {
                const result = await setLiveBaselineAction(
                  nodeId,
                  revalidateHref,
                  baselineText,
                );
                if (!result.ok) {
                  setFlash(result.error);
                  return;
                }
                setFlash("Live baseline updated.");
                setBaselineText("");
                setBaselineOpen(false);
                router.refresh();
              });
            }}
          >
            Set baseline
          </button>
          <button type="button" className="sg-btn-ghost" onClick={() => setBaselineOpen(false)}>
            Cancel
          </button>
        </div>
      </ShellModal>
    </div>
  );
}
