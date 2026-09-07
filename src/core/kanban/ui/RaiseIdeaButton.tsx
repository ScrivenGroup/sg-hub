"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShellModal } from "@/core/shell/ShellModal";
import { addInboxNoteAction } from "../actions";
import { ATTACHMENT_MAX_PER_NOTE } from "../attachments";
import type { KanbanLeafOption } from "../leaves";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_HINT,
  FilesDropZone,
} from "./InboxAttachments";
import { LeafTagSelect } from "./LeafTagSelect";

export function RaiseIdeaButton({
  nodeId,
  revalidateHref,
  inboxHref,
  leafOptions,
  defaultTagNodeId,
  triggerClassName = "sg-btn-primary",
}: {
  nodeId: string;
  revalidateHref: string;
  inboxHref: string;
  leafOptions: KanbanLeafOption[];
  defaultTagNodeId: string;
  triggerClassName?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagNodeId, setTagNodeId] = useState(defaultTagNodeId);
  const [flash, setFlash] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState("");

  function close() {
    setOpen(false);
  }

  function openModal() {
    setTagNodeId(defaultTagNodeId);
    setUploadError("");
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
      <button type="button" className={triggerClassName} onClick={openModal}>
        Raise an idea
      </button>
      {flash ? (
        <span className="text-xs text-[var(--muted)]">
          {flash}
          {savedId ? (
            <>
              {" "}
              <Link href={inboxHref} className="underline">
                Open Inbox
              </Link>
            </>
          ) : null}
        </span>
      ) : null}
      <ShellModal
        open={open}
        titleId="raise-idea-chrome"
        onClose={close}
        panelClassName="max-w-lg h-[min(90dvh,calc(100dvh-1.5rem))]"
        bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden"
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              className="sg-btn-primary disabled:opacity-50"
              disabled={pending || (!title.trim() && !body.trim() && pendingFiles.length === 0)}
              onClick={() => {
                startTransition(async () => {
                  const result = await addInboxNoteAction(nodeId, revalidateHref, {
                    title,
                    body,
                    tagNodeId,
                  });
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
            <button type="button" className="sg-btn-ghost" onClick={close}>
              Cancel
            </button>
          </div>
        }
      >
        <h2 id="raise-idea-chrome" className="mb-2 shrink-0 font-medium">
          Raise an idea
        </h2>
        <p className="mb-3 shrink-0 text-sm text-[var(--muted)]">
          Raw observation. Not a ticket. Lands in Inbox until a session splits it into tickets.
          Tag is which leaf (or Global) owns the note — not a swimlane.
        </p>
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
