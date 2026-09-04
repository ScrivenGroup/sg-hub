"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ChangelogEntry } from "@/core/contracts/types";
import { DevHostStrip } from "@/core/kanban/ui/DevHostStrip";
import { InboxPanel } from "@/core/kanban/ui/InboxPanel";
import { KanbanBoard } from "@/core/kanban/ui/KanbanBoard";
import type { DevHostKind, DevTab } from "@/core/kanban/host";
import type { KanbanBoard as KanbanBoardData } from "@/core/kanban/schema";
import { parserSelfCheckAction, saveBuylistNotesAction } from "../actions";
import { MTG_BUYLIST_HREF, MTG_BUYLIST_NODE_ID } from "../schema";

function releaseSort(a: ChangelogEntry, b: ChangelogEntry) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function ChangelogCard({ entry }: { entry: ChangelogEntry }) {
  return (
    <article className="sg-card">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-medium">
          {entry.version ? <span className="mr-2 font-semibold">{entry.version}</span> : null}
          {entry.title}
        </h3>
        <time className="text-xs text-[var(--muted)]">
          {new Date(entry.createdAt).toLocaleString()}
        </time>
      </div>
      <div className="sg-prose text-[var(--ink)]">{entry.body}</div>
    </article>
  );
}

export function MtgBuylistDevelopment({
  changelogs,
  notes,
  board,
  hostKind,
  host,
  initialTab,
}: {
  changelogs: ChangelogEntry[];
  notes: string;
  board: KanbanBoardData;
  hostKind: DevHostKind;
  host: string;
  initialTab: DevTab;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<DevTab>(initialTab);
  const [draft, setDraft] = useState(notes);
  const [check, setCheck] = useState("");
  const [pending, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { wip, releases } = useMemo(() => {
    const sorted = [...changelogs].sort(releaseSort);
    return {
      wip: sorted.filter((c) => c.kind === "plan"),
      releases: sorted.filter((c) => c.kind === "release"),
    };
  }, [changelogs]);

  const expanded = releases.find((r) => r.id === expandedId) || releases[0] || null;
  const openInboxCount = board.ideas.filter((i) => i.status === "open").length;
  const devHref = `${MTG_BUYLIST_HREF}/development`;

  function go(next: DevTab) {
    setTab(next);
    router.replace(`${devHref}?tab=${next}`, { scroll: false });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="shrink-0">
        <DevHostStrip kind={hostKind} host={host} />
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <button
          type="button"
          className={tab === "changelog" ? "sg-btn-primary" : "sg-btn-secondary"}
          onClick={() => go("changelog")}
        >
          Changelog
        </button>
        <button
          type="button"
          className={tab === "notes" ? "sg-btn-primary" : "sg-btn-secondary"}
          onClick={() => go("notes")}
        >
          Notes
        </button>
        <button
          type="button"
          className={tab === "kanban" ? "sg-btn-primary" : "sg-btn-secondary"}
          onClick={() => go("kanban")}
        >
          KanBan
        </button>
        <button
          type="button"
          className={tab === "inbox" ? "sg-btn-primary" : "sg-btn-secondary"}
          onClick={() => go("inbox")}
        >
          Inbox
          {openInboxCount > 0 ? ` (${openInboxCount})` : ""}
        </button>
      </div>

      {tab === "changelog" ? (
        <section className="min-h-0 flex-1 space-y-6 overflow-y-auto">
          <div className="sg-card overflow-x-auto">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
              Releases
            </h2>
            <p className="mb-3 text-xs text-[var(--muted)]">
              One row per version. Select a row for the full release notes below.
            </p>
            {releases.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No release rows yet.</p>
            ) : (
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead>
                  <tr className="text-[var(--muted)]">
                    <th className="py-1.5 font-medium">Version</th>
                    <th className="py-1.5 font-medium">Date</th>
                    <th className="py-1.5 font-medium">Title</th>
                  </tr>
                </thead>
                <tbody>
                  {releases.map((entry) => {
                    const active = (expandedId || releases[0]?.id) === entry.id;
                    return (
                      <tr
                        key={entry.id}
                        className={`cursor-pointer border-t border-[var(--border)] ${
                          active
                            ? "bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]"
                            : "hover:bg-[color-mix(in_srgb,var(--ink)_4%,transparent)]"
                        }`}
                        onClick={() => setExpandedId(entry.id)}
                      >
                        <td className="py-1.5 font-semibold">{entry.version || "—"}</td>
                        <td className="py-1.5 text-[var(--muted)]">
                          {new Date(entry.createdAt).toLocaleString()}
                        </td>
                        <td className="py-1.5">{entry.title}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {expanded ? (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                Release notes
              </h2>
              <ChangelogCard entry={expanded} />
            </div>
          ) : null}

          {wip.length > 0 ? (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                WIP / plan
              </h2>
              {wip.map((entry) => (
                <ChangelogCard key={entry.id} entry={entry} />
              ))}
            </div>
          ) : null}

          <div className="sg-card">
            <h3 className="mb-2 font-medium">Parser fixture check</h3>
            <p className="mb-3 text-sm text-[var(--muted)]">
              Tiny DDH-shaped fixtures (not the live dumps). Confirms cents, name stripper, and
              allocate buckets.
            </p>
            <button
              type="button"
              className="sg-btn-secondary disabled:opacity-50"
              disabled={pending}
              onClick={() => {
                setCheck("");
                startTransition(async () => {
                  const result = await parserSelfCheckAction();
                  if ("error" in result && result.error && !("messages" in result)) {
                    setCheck(result.error);
                    return;
                  }
                  const messages = "messages" in result ? result.messages : [];
                  setCheck(
                    result.ok
                      ? "Parser check passed."
                      : `Parser check failed:\n${messages.join("\n")}`,
                  );
                });
              }}
            >
              Run parser check
            </button>
            {check ? <pre className="sg-prose mt-3 text-sm">{check}</pre> : null}
          </div>
        </section>
      ) : null}

      {tab === "notes" ? (
        <section className="flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto">
          <p className="text-sm text-[var(--muted)]">
            Staff scratchpad for this leaf. Saved with your last-run JSON store (per login). Neon /
            shared notes come later — until then these notes can reset on a restage that clears{" "}
            <code className="text-xs">data/</code>. Structured ideas belong in Inbox.
          </p>
          <textarea
            className="sg-input min-h-64 flex-1"
            value={draft}
            placeholder="Loose notes for MTG Buylist."
            onChange={(e) => setDraft(e.target.value)}
          />
          <button
            type="button"
            className="sg-btn-primary disabled:opacity-50"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                await saveBuylistNotesAction(draft);
              });
            }}
          >
            Save notes
          </button>
        </section>
      ) : null}

      {tab === "kanban" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <KanbanBoard
            board={board}
            nodeId={MTG_BUYLIST_NODE_ID}
            leafTitle="MTG Buylist"
            leafHref={MTG_BUYLIST_HREF}
            revalidateHref={devHref}
            hostKind={hostKind}
          />
        </div>
      ) : null}

      {tab === "inbox" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <InboxPanel
            board={board}
            nodeId={MTG_BUYLIST_NODE_ID}
            leafTitle="MTG Buylist"
            leafHref={MTG_BUYLIST_HREF}
            revalidateHref={devHref}
            inboxHref={`${devHref}?tab=inbox`}
            hostKind={hostKind}
          />
        </div>
      ) : null}
    </div>
  );
}
