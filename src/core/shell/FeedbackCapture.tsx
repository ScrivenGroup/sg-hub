"use client";

import { useCallback, useEffect, useId, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ShellModal } from "@/core/shell/ShellModal";
import { addInboxNoteAction } from "@/core/kanban/actions";
import { ATTACHMENT_MAX_PER_NOTE } from "@/core/kanban/attachments";
import { KANBAN_CHROME } from "@/core/kanban/chrome";
import {
  defaultKanbanNodeIdFromHref,
  kanbanLeafOptions,
} from "@/core/kanban/leaves";
import {
  INBOX_KIND_LABELS,
  INBOX_KINDS,
  KANBAN_GLOBAL_NODE_ID,
  type InboxKind,
} from "@/core/kanban/schema";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_HINT,
  FilesDropZone,
} from "@/core/kanban/ui/InboxAttachments";
import { LeafTagSelect } from "@/core/kanban/ui/LeafTagSelect";
import { DEVELOPMENT_INBOX_HREF } from "@/core/kanban/development-hub";

export function FeedbackCapture() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<InboxKind>("bug");
  const [tagNodeId, setTagNodeId] = useState(KANBAN_GLOBAL_NODE_ID);
  const [pageTitle, setPageTitle] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState("");
  const [flash, setFlash] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const titleId = useId();
  const leafOptions = kanbanLeafOptions();
  const inboxHref = DEVELOPMENT_INBOX_HREF;

  useEffect(() => {
    setPageTitle(document.title);
  }, [pathname]);

  const onClose = useCallback(() => setOpen(false), []);

  function openCapture() {
    setFlash("");
    setSavedId(null);
    setUploadError("");
    setKind("bug");
    setTagNodeId(defaultKanbanNodeIdFromHref(pathname));
    setOpen(true);
  }

  async function uploadPending(ideaId: string, files: File[]) {
    for (const file of files.slice(0, ATTACHMENT_MAX_PER_NOTE)) {
      const form = new FormData();
      form.append("ideaId", ideaId);
      form.append("file", file);
      const res = await fetch("/api/kanban/attachments", { method: "POST", body: form });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Upload failed (${res.status})`);
      }
    }
  }

  return (
    <>
      <button
        type="button"
        className="sg-btn-ghost hidden sm:inline-flex"
        onClick={openCapture}
      >
        Feedback
      </button>

      <button
        type="button"
        className="fixed right-5 z-40 flex h-14 items-center justify-center rounded-full bg-[var(--ink)] px-5 text-sm font-semibold text-[var(--surface)] shadow-lg sm:hidden"
        style={{ bottom: "max(1.25rem, calc(1.25rem + env(safe-area-inset-bottom)))" }}
        onClick={openCapture}
        aria-label="Send feedback"
      >
        Feedback
      </button>

      {flash ? (
        <span className="sr-only">
          {flash}
          {savedId ? ` Open Inbox ${inboxHref}` : ""}
        </span>
      ) : null}

      <ShellModal
        open={open}
        titleId={titleId}
        onClose={onClose}
        panelClassName="max-w-lg h-[min(90dvh,calc(100dvh-1.5rem))]"
        bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden"
        footer={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="sg-btn-primary disabled:opacity-50"
              disabled={pending || (!title.trim() && !body.trim())}
              onClick={() => {
                startTransition(async () => {
                  const result = await addInboxNoteAction(
                    defaultKanbanNodeIdFromHref(pathname),
                    "/d",
                    {
                      title,
                      body,
                      tagNodeId,
                      kind,
                      source: "feedback",
                      pageHref: pathname,
                      pageTitle,
                    },
                  );
                  if (!result.ok) {
                    setFlash(result.error);
                    setSavedId(null);
                    return;
                  }
                  try {
                    await uploadPending(result.ideaId, pendingFiles);
                    setUploadError("");
                  } catch (err) {
                    setUploadError(
                      err instanceof Error ? err.message : "Note saved; a file failed to upload.",
                    );
                  }
                  setTitle("");
                  setBody("");
                  setPendingFiles([]);
                  setSavedId(result.ideaId);
                  setFlash(`Saved ${result.ideaId}.`);
                  setOpen(false);
                  router.refresh();
                });
              }}
            >
              Save to Inbox
            </button>
            <button type="button" className="sg-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="sg-btn-action ml-auto"
              onClick={() => {
                const hasData = Boolean(title.trim() || body.trim() || pendingFiles.length);
                if (hasData && !window.confirm("Discard changes?")) return;
                setOpen(false);
                router.push(inboxHref);
              }}
            >
              Open Inbox
            </button>
          </div>
        }
      >
        <h2 id={titleId} className="mb-2 shrink-0 font-medium">
          Feedback
        </h2>
        <p className="mb-3 shrink-0 text-sm text-[var(--muted)]">
          Lands in Development Inbox. Tag is which hub, leaf, or Global owns the note — not a
          swimlane.
        </p>
        <label className="mb-2 block shrink-0 text-sm font-medium">
          {KANBAN_CHROME.labels.type}
          <select
            className="sg-input mt-1"
            value={kind}
            onChange={(e) => setKind(e.target.value as InboxKind)}
          >
            {INBOX_KINDS.map((id) => (
              <option key={id} value={id}>
                {INBOX_KIND_LABELS[id]}
              </option>
            ))}
          </select>
        </label>
        <input
          className="sg-input mb-2 shrink-0"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="sg-input mb-2 min-h-32 flex-1 resize-none"
          placeholder="Details — as messy as you need"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <LeafTagSelect
          value={tagNodeId}
          onChange={setTagNodeId}
          options={leafOptions}
        />
        <p className="mt-2 shrink-0 text-xs text-[var(--muted)]">Page: {pathname}</p>
        <div className="mt-2 shrink-0 text-sm">
          <p className="font-medium">Attachments</p>
          {pendingFiles.length < ATTACHMENT_MAX_PER_NOTE ? (
            <div className="mt-2">
              <FilesDropZone
                accept={ATTACHMENT_ACCEPT}
                disabled={pending}
                multiple
                label="Choose files or drop them here"
                hint={ATTACHMENT_HINT}
                onFiles={(files) => {
                  const remaining = ATTACHMENT_MAX_PER_NOTE - pendingFiles.length;
                  setPendingFiles((prev) => [
                    ...prev,
                    ...Array.from(files).slice(0, remaining),
                  ]);
                }}
              />
            </div>
          ) : null}
          {pendingFiles.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs">
              {pendingFiles.map((file, index) => (
                <li key={`${file.name}-${file.size}-${index}`} className="flex items-center gap-2">
                  <span className="min-w-0 truncate underline" title={file.name}>
                    {file.name}
                  </span>
                  <button
                    type="button"
                    className="sg-btn-ghost shrink-0 px-1.5 py-0.5 text-xs"
                    disabled={pending}
                    onClick={() =>
                      setPendingFiles((prev) => prev.filter((_, i) => i !== index))
                    }
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {uploadError ? (
            <p className="mt-1 text-xs text-[var(--rag-red)]">{uploadError}</p>
          ) : null}
        </div>
      </ShellModal>
    </>
  );
}
