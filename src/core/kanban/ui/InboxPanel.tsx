"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShellModal } from "@/core/shell/ShellModal";
import { markIdeaCopiedAction, saveInboxNoteAction } from "../actions";
import { deltaVsBaseline, fingerprintIdea, livePresenceForId } from "../fingerprint";
import type { DevHostKind } from "../host";
import { buildSessionPrompt } from "../prompt";
import { COLUMN_ACCENT, type KanbanBoard, type KanbanInboxNote } from "../schema";
import { RaiseIdeaButton } from "./RaiseIdeaButton";
import { clipText, copyText, HatInbox, PresenceChip, sortItems, type SortKey } from "./bits";

export function InboxPanel({
  board,
  nodeId,
  leafTitle,
  leafHref,
  revalidateHref,
  inboxHref,
  hostKind,
}: {
  board: KanbanBoard;
  nodeId: string;
  leafTitle: string;
  leafHref: string;
  revalidateHref: string;
  inboxHref: string;
  hostKind: DevHostKind;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sortBy, setSortBy] = useState<SortKey>("date-desc");
  const [showArchived, setShowArchived] = useState(false);
  const [openIdea, setOpenIdea] = useState<KanbanInboxNote | null>(null);
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaBody, setIdeaBody] = useState("");
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptText, setPromptText] = useState("");
  const [copied, setCopied] = useState(false);
  const [flash, setFlash] = useState("");

  const delta = deltaVsBaseline(board);
  const showPresence = hostKind === "localhost";
  const openIdeas = sortItems(
    board.ideas.filter((i) => i.status === "open"),
    sortBy,
  );
  const archivedIdeas = sortItems(
    board.ideas.filter((i) => i.status === "archived"),
    sortBy,
  );
  const items = showArchived ? archivedIdeas : openIdeas;
  const ideaDirty =
    openIdea != null && (ideaTitle !== openIdea.title || ideaBody !== openIdea.body);

  useEffect(() => {
    if (!openIdea) return;
    setIdeaTitle(openIdea.title);
    setIdeaBody(openIdea.body);
  }, [openIdea]);

  function openPromptFor(idea: KanbanInboxNote) {
    const text = buildSessionPrompt({
      leafTitle,
      leafHref,
      nodeId,
      idea,
      board,
      delta,
    });
    setPromptText(text);
    startTransition(async () => {
      await markIdeaCopiedAction(nodeId, revalidateHref, idea.id);
      const ok = await copyText(text);
      setCopied(ok);
      setPromptOpen(true);
      router.refresh();
    });
  }

  async function copyAllInbox() {
    if (openIdeas.length === 0) {
      setFlash("No open inbox notes.");
      return;
    }
    const texts = openIdeas.map((idea) =>
      buildSessionPrompt({ leafTitle, leafHref, nodeId, idea, board, delta }),
    );
    const joined = texts.join("\n\n---\n\n");
    setPromptText(joined);
    const ok = await copyText(joined);
    setCopied(ok);
    setPromptOpen(true);
    startTransition(async () => {
      for (const idea of openIdeas) {
        await markIdeaCopiedAction(nodeId, revalidateHref, idea.id);
      }
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <p className="shrink-0 text-sm text-[var(--muted)]">
        Raw observations. Not tickets. Click a note to edit or copy a session prompt. A session
        splits notes into KanBan tickets and archives the raw id.
      </p>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <RaiseIdeaButton
          nodeId={nodeId}
          revalidateHref={revalidateHref}
          inboxHref={inboxHref}
        />
        <button type="button" className="sg-btn-secondary" onClick={copyAllInbox}>
          Copy process all
        </button>
        <label className="text-xs text-[var(--muted)]">
          Sort{" "}
          <select
            className="sg-input py-1 text-xs"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
          >
            <option value="date-desc">Date · newest</option>
            <option value="date-asc">Date · oldest</option>
            <option value="title-asc">A–Z</option>
            <option value="title-desc">Z–A</option>
          </select>
        </label>
        {archivedIdeas.length > 0 ? (
          <button
            type="button"
            className={showArchived ? "sg-btn-primary" : "sg-btn-ghost"}
            onClick={() => setShowArchived((v) => !v)}
          >
            {showArchived ? "Show open" : `Show archived (${archivedIdeas.length})`}
          </button>
        ) : null}
      </div>
      {flash ? <p className="text-sm text-[var(--muted)]">{flash}</p> : null}

      <section
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[10px] p-3"
        style={{
          borderLeft: `4px solid ${COLUMN_ACCENT.inbox}`,
          background: `color-mix(in srgb, ${COLUMN_ACCENT.inbox} 10%, var(--page))`,
        }}
      >
        <h2 className="mb-3 shrink-0 text-sm font-semibold">
          {showArchived ? "Archived" : "Open"}{" "}
          <span className="font-medium text-[var(--muted)]">{items.length}</span>
        </h2>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">none</p>
          ) : (
            items.map((idea) => {
              const presence = livePresenceForId(
                board,
                idea.id,
                "idea",
                fingerprintIdea(idea),
              );
              return (
                <article
                  key={idea.id}
                  role="button"
                  tabIndex={0}
                  className="mb-2 cursor-pointer rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-2.5 text-sm"
                  onClick={() => setOpenIdea(idea)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setOpenIdea(idea);
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-snug">{idea.title}</h3>
                    <HatInbox />
                  </div>
                  {idea.body ? (
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      {clipText(idea.body, 180)}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    {idea.id}
                    {idea.createdAt ? ` · ${new Date(idea.createdAt).toLocaleDateString()}` : ""}
                  </p>
                  <PresenceChip presence={presence} show={showPresence} />
                </article>
              );
            })
          )}
        </div>
      </section>

      <ShellModal
        open={Boolean(openIdea)}
        titleId="inbox-note"
        onClose={() => setOpenIdea(null)}
        panelClassName="max-w-2xl"
      >
        {openIdea ? (
          <>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h2 id="inbox-note" className="font-medium">
                Inbox note
              </h2>
              <code className="text-xs text-[var(--muted)]">id {openIdea.id}</code>
              <HatInbox />
            </div>
            {openIdea.status === "open" ? (
              <>
                <input
                  className="sg-input mb-2"
                  value={ideaTitle}
                  onChange={(e) => setIdeaTitle(e.target.value)}
                  aria-label={`Title ${openIdea.id}`}
                />
                <textarea
                  className="sg-input min-h-48"
                  value={ideaBody}
                  onChange={(e) => setIdeaBody(e.target.value)}
                  aria-label={`Body ${openIdea.id}`}
                />
              </>
            ) : (
              <>
                <h3 className="font-medium">{openIdea.title}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm">{openIdea.body}</p>
              </>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {openIdea.status === "open" ? (
                <button
                  type="button"
                  className="sg-btn-primary disabled:opacity-50"
                  disabled={pending || !ideaDirty}
                  onClick={() => {
                    startTransition(async () => {
                      await saveInboxNoteAction(nodeId, revalidateHref, {
                        id: openIdea.id,
                        title: ideaTitle,
                        body: ideaBody,
                      });
                      router.refresh();
                    });
                  }}
                >
                  Save
                </button>
              ) : null}
              {openIdea.status === "open" ? (
                <button
                  type="button"
                  className="sg-btn-secondary"
                  disabled={pending}
                  onClick={() =>
                    openPromptFor({ ...openIdea, title: ideaTitle, body: ideaBody })
                  }
                >
                  Copy session prompt
                </button>
              ) : null}
              <button type="button" className="sg-btn-ghost" onClick={() => setOpenIdea(null)}>
                Close
              </button>
            </div>
          </>
        ) : null}
      </ShellModal>

      <ShellModal
        open={promptOpen}
        titleId="session-prompt"
        onClose={() => setPromptOpen(false)}
        panelClassName="max-w-2xl"
      >
        <h2 id="session-prompt" className="mb-2 font-medium">
          Session prompt
        </h2>
        <p className="mb-2 text-sm text-[var(--muted)]">
          {copied
            ? "Copied to clipboard. Paste into a Cursor session."
            : "Clipboard blocked — select and copy the text below."}
        </p>
        <textarea className="sg-input min-h-64 font-mono text-xs" readOnly value={promptText} />
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="sg-btn-primary"
            onClick={async () => setCopied(await copyText(promptText))}
          >
            Copy again
          </button>
          <button type="button" className="sg-btn-ghost" onClick={() => setPromptOpen(false)}>
            Close
          </button>
        </div>
      </ShellModal>
    </div>
  );
}
