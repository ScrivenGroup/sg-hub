"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangelogEntry } from "@/core/contracts/types";
import type { DevHostKind } from "../host";
import { leafOptionsWithRows, type KanbanLeafOption } from "../leaves";
import {
  CATEGORY_LABELS,
  COLUMN_FILTERS,
  INBOX_KIND_LABELS,
  INBOX_KINDS,
  KANBAN_CATEGORIES,
  KANBAN_GLOBAL_NODE_ID,
  type InboxKind,
  type KanbanBoard as KanbanBoardData,
  type KanbanCategory,
  type KanbanColumn,
} from "../schema";
import { KANBAN_CHROME } from "../chrome";
import { type SortKey } from "./bits";
import { InboxPanel } from "./InboxPanel";
import { KanbanBoard, type LayoutMode } from "./KanbanBoard";
import { KanbanChangelogPanel } from "./KanbanChangelogPanel";
import { KanbanColumnFilter, defaultVisibleColumns } from "./KanbanColumnFilter";
import { KanbanDesignSpec } from "./KanbanDesignSpec";
import { KanbanNotesPanel } from "./KanbanNotesPanel";
import { RaiseIdeaButton } from "./RaiseIdeaButton";
import { RequirementsPanel } from "./RequirementsPanel";

export type KanbanOnlineScope = "all" | "leaf";
export type KanbanOnlinePanel = "inbox" | "kanban";
export type ChromeTab = "requirements" | "inbox" | "kanban" | "changelog" | "notes" | "spec";
export type KanbanOnlineStart = ChromeTab | (typeof COLUMN_FILTERS)[number]["id"];

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
  showDesignSpec = false,
): ChromeTab {
  const start = panel ?? initialTab ?? "requirements";
  if (start === "requirements") return "requirements";
  if (start === "changelog") return "changelog";
  if (start === "notes") return "notes";
  if (start === "spec") return showDesignSpec ? "spec" : "changelog";
  if (start === "inbox") return "inbox";
  if (start === "kanban" || COLUMN_FILTERS.some((f) => f.id === start)) return "kanban";
  return "inbox";
}

function urlTabFor(next: ChromeTab): string {
  return next;
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
  initialTab = "requirements",
  changelogs,
  showTabs = true,
  tabSet,
  hideRaise = true,
  forcedTab,
  notes = "",
  showDesignSpec = false,
  changelogClock = "leaf",
  requirements,
  onSaveNotes,
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
  /** suite = leaf Layout 2 tabs. none = a single hub room. board is treated as none. */
  tabSet?: "suite" | "board" | "none";
  hideRaise?: boolean;
  forcedTab?: ChromeTab;
  initialTab?: KanbanOnlineStart;
  changelogs?: ChangelogEntry[];
  notes?: string;
  showDesignSpec?: boolean;
  changelogClock?: "leaf" | "sg-hub";
  /** High-level requirements for this leaf. Empty shows the template prompt. */
  requirements?: string;
  onSaveNotes?: (body: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const resolvedTabSet =
    tabSet === "board" ? "none" : (tabSet ?? (showTabs ? "suite" : "none"));
  const [chromeTabState, setChromeTab] = useState<ChromeTab>(() =>
    initialChromeTab(panel, initialTab, showDesignSpec),
  );
  const chromeTab = forcedTab ?? chromeTabState;
  const [leafFilter, setLeafFilter] = useState(scope === "all" ? "all" : nodeId);
  const [layout, setLayout] = useState<LayoutMode>("columns");
  const [categoryFilter, setCategoryFilter] = useState<KanbanCategory | "all">("all");
  const [visibleColumns, setVisibleColumns] = useState<KanbanColumn[]>(defaultVisibleColumns);
  const [boardMoreOpen, setBoardMoreOpen] = useState(false);
  const [inboxSort, setInboxSort] = useState<SortKey>("date-desc");
  const [inboxKind, setInboxKind] = useState<"all" | InboxKind>(() =>
    scope === "leaf" ? "idea" : "all",
  );
  const [showArchived, setShowArchived] = useState(false);
  const [inboxMoreOpen, setInboxMoreOpen] = useState(false);
  const showChangelogTab = Array.isArray(changelogs);
  const requirementsOn = chromeTab === "requirements";
  const inboxOn = chromeTab === "inbox";
  const changelogOn = chromeTab === "changelog";
  const notesOn = chromeTab === "notes";
  const specOn = chromeTab === "spec";
  const boardOn = chromeTab === "kanban";
  const filtered = useMemo(
    () => (scope === "all" ? filterBoard(board, leafFilter) : board),
    [board, leafFilter, scope],
  );
  const inboxBoard = useMemo(() => {
    if (inboxKind === "all") return filtered;
    return {
      ...filtered,
      ideas: filtered.ideas.filter((row) => (row.kind ?? "idea") === inboxKind),
    };
  }, [filtered, inboxKind]);
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
  const openInbox = inboxBoard.ideas.filter((i) => i.status === "open").length;
  const archivedCount = inboxBoard.ideas.filter((i) => i.status === "archived").length;

  useEffect(() => {
    if (forcedTab) return;
    if (panel === "inbox") {
      setChromeTab("inbox");
      return;
    }
    if (panel === "kanban") {
      setChromeTab("kanban");
    }
  }, [panel, forcedTab]);

  function selectChrome(next: ChromeTab) {
    if (next === chromeTab) return;
    setChromeTab(next);
    if (resolvedTabSet === "none") return;
    const path = revalidateHref.split("?")[0];
    const url = `${path}?tab=${urlTabFor(next)}`;
    window.history.replaceState(window.history.state, "", url);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {resolvedTabSet !== "none" ? (
        <div className="flex shrink-0 items-center gap-2">
          <div
            role="tablist"
            aria-label="Kanban Online"
            className="flex min-w-0 flex-1 flex-wrap gap-1"
          >
            {resolvedTabSet === "suite" ? (
              <button
                type="button"
                role="tab"
                aria-selected={requirementsOn}
                className="sg-tab"
                onClick={() => selectChrome("requirements")}
              >
                {KANBAN_CHROME.labels.requirements}
              </button>
            ) : null}
            {resolvedTabSet === "suite" ? (
              <button
                type="button"
                role="tab"
                aria-selected={inboxOn}
                className="sg-tab"
                onClick={() => selectChrome("inbox")}
              >
                {KANBAN_CHROME.labels.inbox}
                {openInbox > 0 ? ` (${openInbox})` : ""}
              </button>
            ) : null}
            {resolvedTabSet === "suite" ? (
              <button
                type="button"
                role="tab"
                aria-selected={boardOn}
                className="sg-tab"
                onClick={() => selectChrome("kanban")}
              >
                {KANBAN_CHROME.labels.kanban}
              </button>
            ) : null}
            {resolvedTabSet === "suite" && showChangelogTab ? (
              <button
                type="button"
                role="tab"
                aria-selected={changelogOn}
                className="sg-tab"
                onClick={() => selectChrome("changelog")}
              >
                {KANBAN_CHROME.labels.changelog}
              </button>
            ) : null}
            {resolvedTabSet === "suite" ? (
              <button
                type="button"
                role="tab"
                aria-selected={notesOn}
                className="sg-tab"
                onClick={() => selectChrome("notes")}
              >
                {KANBAN_CHROME.labels.notes}
              </button>
            ) : null}
            {resolvedTabSet === "suite" && showDesignSpec ? (
              <button
                type="button"
                role="tab"
                aria-selected={specOn}
                className="sg-tab"
                onClick={() => selectChrome("spec")}
              >
                {KANBAN_CHROME.labels.designSpec}
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

      {(inboxOn || boardOn) ? (
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {scope === "all" && (inboxOn || boardOn) ? (
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            {KANBAN_CHROME.labels.leafs}
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
              {KANBAN_CHROME.labels.type}
              <select
                className={chromeSelect}
                value={inboxKind}
                aria-label="Inbox type"
                onChange={(e) => setInboxKind(e.target.value as "all" | InboxKind)}
              >
                <option value="all">All</option>
                {INBOX_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {INBOX_KIND_LABELS[kind]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              {KANBAN_CHROME.labels.sort}
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
              {KANBAN_CHROME.labels.more}
            </button>
          </>
        ) : null}

        {boardOn ? (
          <>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                {KANBAN_CHROME.labels.layout}
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
                  {KANBAN_CHROME.labels.columns}
                </button>
                <button
                  type="button"
                  aria-pressed={layout === "swimlanes"}
                  className={layoutToggleClass(layout === "swimlanes")}
                  onClick={() => setLayout("swimlanes")}
                >
                  {KANBAN_CHROME.labels.swimlanes}
                </button>
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              {KANBAN_CHROME.labels.category}
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
              {KANBAN_CHROME.labels.more}
            </button>
          </>
        ) : null}
      </div>
      ) : null}

      {requirementsOn ? (
        <RequirementsPanel leafTitle={leafTitle} body={requirements} />
      ) : inboxOn ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <InboxPanel
            board={inboxBoard}
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
          <KanbanChangelogPanel
            changelogs={changelogs ?? []}
            leafOnly={scope === "leaf"}
            clock={changelogClock}
          />
        </div>
      ) : notesOn ? (
        <KanbanNotesPanel
          nodeId={actionNodeId}
          revalidateHref={revalidateHref}
          notes={notes}
          onSave={onSaveNotes}
        />
      ) : specOn ? (
        <KanbanDesignSpec />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <KanbanColumnFilter visible={visibleColumns} onChange={setVisibleColumns} />
          <KanbanBoard
            board={filtered}
            nodeId={actionNodeId}
            leafTitle={leafTitle}
            leafHref={leafHref}
            revalidateHref={revalidateHref}
            hostKind={hostKind}
            leafOptions={leafOptions}
            showLeafTag={showLeafTag}
            visibleColumns={visibleColumns}
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
