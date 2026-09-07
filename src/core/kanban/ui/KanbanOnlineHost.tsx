"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChangelogEntry } from "@/core/contracts/types";
import type { DevHostKind } from "../host";
import { leafOptionsWithRows, type KanbanLeafOption } from "../leaves";
import {
  CATEGORY_LABELS,
  COLUMN_FILTERS,
  KANBAN_CATEGORIES,
  KANBAN_GLOBAL_NODE_ID,
  type ColumnFilterId,
  type KanbanBoard as KanbanBoardData,
  type KanbanCategory,
} from "../schema";
import { type SortKey } from "./bits";
import { InboxPanel } from "./InboxPanel";
import { KanbanBoard, type LayoutMode } from "./KanbanBoard";
import { KanbanChangelogPanel } from "./KanbanChangelogPanel";
import { RaiseIdeaButton } from "./RaiseIdeaButton";

export type KanbanOnlineScope = "all" | "leaf";
export type KanbanOnlinePanel = "inbox" | "kanban";
export type KanbanOnlineStart = "inbox" | "kanban" | "changelog";
export type ChromeTab = "inbox" | "changelog" | ColumnFilterId;

const chromeSelect =
  "min-h-8 h-8 w-auto rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs font-medium normal-case tracking-normal text-[var(--ink)]";

function chromeBtn(kind: "primary" | "secondary" | "archived-on") {
  const base =
    "inline-flex min-h-8 items-center justify-center rounded-[10px] px-2.5 py-1 text-xs font-medium";
  if (kind === "primary") {
    return `${base} bg-[var(--ink)] text-[var(--surface)]`;
  }
  if (kind === "archived-on") {
    return `${base} border border-[var(--ink)] bg-[var(--surface-muted)] text-[var(--ink)]`;
  }
  return `${base} border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)]`;
}

function layoutToggleClass(on: boolean) {
  return `min-h-8 px-2.5 py-1 text-xs font-medium ${
    on
      ? "bg-[var(--surface)] text-[var(--ink)]"
      : "text-[var(--muted)] hover:text-[var(--ink)]"
  }`;
}

function initialChromeTab(
  panel?: KanbanOnlinePanel,
  initialTab?: KanbanOnlineStart,
): ChromeTab {
  const start = panel ?? initialTab ?? "inbox";
  if (start === "kanban") return "all";
  if (start === "changelog") return "changelog";
  return "inbox";
}

function urlTabFor(next: ChromeTab): string {
  if (next === "inbox") return "inbox";
  if (next === "changelog") return "changelog";
  return "kanban";
}

export function KanbanOnlineHost({
  board,
  scope,
  nodeId,
  leafTitle,
  leafHref,
  revalidateHref,
  inboxHref,
  hostKind,
  leafOptions,
  defaultTagNodeId,
  panel,
  initialTab = "inbox",
  changelogs,
  showTabs = true,
  hideRaise = false,
  forcedTab,
}: {
  board: KanbanBoardData;
  scope: KanbanOnlineScope;
  nodeId: string;
  leafTitle: string;
  leafHref: string;
  revalidateHref: string;
  inboxHref: string;
  hostKind: DevHostKind;
  leafOptions: KanbanLeafOption[];
  defaultTagNodeId: string;
  panel?: KanbanOnlinePanel;
  showTabs?: boolean;
  hideRaise?: boolean;
  forcedTab?: ChromeTab;
  initialTab?: KanbanOnlineStart;
  changelogs?: ChangelogEntry[];
}) {
  const router = useRouter();
  const [chromeTabState, setChromeTab] = useState<ChromeTab>(() =>
    initialChromeTab(panel, initialTab),
  );
  const chromeTab = forcedTab ?? chromeTabState;
  const [leafFilter, setLeafFilter] = useState(scope === "all" ? "all" : nodeId);
  const [layout, setLayout] = useState<LayoutMode>("columns");
  const [categoryFilter, setCategoryFilter] = useState<KanbanCategory | "all">("all");
  const [boardMoreOpen, setBoardMoreOpen] = useState(false);
  const [inboxSort, setInboxSort] = useState<SortKey>("date-desc");
  const [showArchived, setShowArchived] = useState(false);
  const [inboxMoreOpen, setInboxMoreOpen] = useState(false);
  const showChangelogTab = Array.isArray(changelogs);
  const inboxOn = chromeTab === "inbox";
  const changelogOn = chromeTab === "changelog";
  const boardOn = !inboxOn && !changelogOn;
  const columnFilter: ColumnFilterId = boardOn ? chromeTab : "all";
  const filtered = useMemo(
    () => (scope === "all" ? filterBoard(board, leafFilter) : board),
    [board, leafFilter, scope],
  );
  const taggedLeaves = useMemo(
    () =>
      leafOptionsWithRows(
        leafOptions,
        board,
        leafFilter !== "all" ? leafFilter : undefined,
      ),
    [board, leafFilter, leafOptions],
  );
  const categories = filtered.lanes.length ? filtered.lanes : [...KANBAN_CATEGORIES];
  const actionNodeId =
    scope === "leaf"
      ? nodeId
      : leafFilter === "all"
        ? KANBAN_GLOBAL_NODE_ID
        : leafFilter;
  const showLeafTag = scope === "all" && leafFilter === "all";
  const openInbox = filtered.ideas.filter((i) => i.status === "open").length;
  const archivedCount = filtered.ideas.filter((i) => i.status === "archived").length;

  useEffect(() => {
    if (forcedTab) return;
    if (panel === "inbox") {
      setChromeTab("inbox");
      return;
    }
    if (panel === "kanban") {
      setChromeTab((prev) => (prev === "inbox" || prev === "changelog" ? "all" : prev));
    }
  }, [panel, forcedTab]);

  function selectChrome(next: ChromeTab) {
    setChromeTab(next);
    if (!showTabs) return;
    const path = revalidateHref.split("?")[0];
    router.replace(`${path}?tab=${urlTabFor(next)}`, { scroll: false });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {showTabs ? (
        <div className="flex shrink-0 items-center gap-2">
          <div
            role="tablist"
            aria-label="Kanban Online"
            className="flex min-w-0 flex-1 flex-wrap gap-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={inboxOn}
              className="sg-tab"
              onClick={() => selectChrome("inbox")}
            >
              Inbox{openInbox > 0 ? ` (${openInbox})` : ""}
            </button>
            {COLUMN_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={boardOn && chromeTab === f.id}
                className="sg-tab"
                onClick={() => selectChrome(f.id)}
              >
                {f.label}
              </button>
            ))}
            {showChangelogTab ? (
              <button
                type="button"
                role="tab"
                aria-selected={changelogOn}
                className="sg-tab"
                onClick={() => selectChrome("changelog")}
              >
                Changelog
              </button>
            ) : null}
          </div>
          {hideRaise ? null : (
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <RaiseIdeaButton
                nodeId={actionNodeId}
                revalidateHref={revalidateHref}
                inboxHref={inboxHref}
                leafOptions={leafOptions}
                defaultTagNodeId={defaultTagNodeId}
                triggerClassName={chromeBtn("primary")}
              />
            </div>
          )}
        </div>
      ) : hideRaise ? null : (
        <div className="flex shrink-0 items-center gap-2">
          <RaiseIdeaButton
            nodeId={actionNodeId}
            revalidateHref={revalidateHref}
            inboxHref={inboxHref}
            leafOptions={leafOptions}
            defaultTagNodeId={defaultTagNodeId}
            triggerClassName={chromeBtn("primary")}
          />
        </div>
      )}

      {(scope === "all" && !changelogOn) || inboxOn || boardOn ? (
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {scope === "all" && !changelogOn ? (
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Leafs
            <select
              className={chromeSelect}
              value={leafFilter}
              onChange={(e) => setLeafFilter(e.target.value)}
              aria-label="Filter by leaf"
            >
              <option value="all">All</option>
              {taggedLeaves.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {inboxOn ? (
          <>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Sort
              <select
                className={chromeSelect}
                value={inboxSort}
                aria-label="Inbox sort"
                onChange={(e) => setInboxSort(e.target.value as SortKey)}
              >
                <option value="date-desc">Date · newest</option>
                <option value="date-asc">Date · oldest</option>
                <option value="title-asc">A–Z</option>
                <option value="title-desc">Z–A</option>
              </select>
            </label>
            {archivedCount > 0 ? (
              <button
                type="button"
                aria-pressed={showArchived}
                className={chromeBtn(showArchived ? "archived-on" : "secondary")}
                onClick={() => setShowArchived((v) => !v)}
              >
                {showArchived ? "Show open" : `Show archived (${archivedCount})`}
              </button>
            ) : null}
            <button
              type="button"
              className={chromeBtn("secondary")}
              onClick={() => setInboxMoreOpen(true)}
            >
              More options
            </button>
          </>
        ) : null}

        {boardOn ? (
          <>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Layout
              </span>
              <div
                role="group"
                aria-label="Board layout"
                className="inline-flex divide-x divide-[var(--border)] overflow-hidden rounded-[10px] border border-[var(--border)]"
              >
                <button
                  type="button"
                  aria-pressed={layout === "columns"}
                  className={layoutToggleClass(layout === "columns")}
                  onClick={() => setLayout("columns")}
                >
                  Columns
                </button>
                <button
                  type="button"
                  aria-pressed={layout === "swimlanes"}
                  className={layoutToggleClass(layout === "swimlanes")}
                  onClick={() => setLayout("swimlanes")}
                >
                  Swimlanes
                </button>
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Category
              <select
                className={chromeSelect}
                value={categoryFilter}
                aria-label="Category"
                onChange={(e) =>
                  setCategoryFilter(e.target.value as KanbanCategory | "all")
                }
              >
                <option value="all">All</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className={chromeBtn("secondary")}
              onClick={() => setBoardMoreOpen(true)}
            >
              More options
            </button>
          </>
        ) : null}
      </div>
      ) : null}

      {inboxOn ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <InboxPanel
            board={filtered}
            nodeId={actionNodeId}
            leafTitle={leafTitle}
            leafHref={leafHref}
            revalidateHref={revalidateHref}
            inboxHref={inboxHref}
            hostKind={hostKind}
            leafOptions={leafOptions}
            defaultTagNodeId={defaultTagNodeId}
            showLeafTag={showLeafTag}
            sortBy={inboxSort}
            showArchived={showArchived}
            moreOpen={inboxMoreOpen}
            onMoreOpenChange={setInboxMoreOpen}
          />
        </div>
      ) : changelogOn ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <KanbanChangelogPanel changelogs={changelogs ?? []} />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <KanbanBoard
            board={filtered}
            nodeId={actionNodeId}
            leafTitle={leafTitle}
            leafHref={leafHref}
            revalidateHref={revalidateHref}
            hostKind={hostKind}
            leafOptions={leafOptions}
            showLeafTag={showLeafTag}
            columnFilter={columnFilter}
            layout={layout}
            categoryFilter={categoryFilter}
            moreOpen={boardMoreOpen}
            onMoreOpenChange={setBoardMoreOpen}
          />
        </div>
      )}
    </div>
  );
}

function filterBoard(board: KanbanBoardData, leafFilter: string): KanbanBoardData {
  if (leafFilter === "all") return board;
  return {
    ...board,
    ideas: board.ideas.filter((row) => row.nodeId === leafFilter),
    tickets: board.tickets.filter((row) => row.nodeId === leafFilter),
  };
}
