"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShellModal } from "@/core/shell/ShellModal";
import { addInboxNoteAction } from "../actions";

export function RaiseIdeaButton({
  nodeId,
  revalidateHref,
  inboxHref,
}: {
  nodeId: string;
  revalidateHref: string;
  inboxHref: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [flash, setFlash] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);

  function close() {
    setOpen(false);
  }

  return (
    <>
      <button type="button" className="sg-btn-primary" onClick={() => setOpen(true)}>
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
      <ShellModal open={open} titleId="raise-idea-chrome" onClose={close}>
        <h2 id="raise-idea-chrome" className="mb-2 font-medium">
          Raise an idea
        </h2>
        <p className="mb-3 text-sm text-[var(--muted)]">
          Raw observation. Not a ticket. Lands in Inbox until a session splits it into tickets.
        </p>
        <input
          className="sg-input mb-2"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="sg-input min-h-32"
          placeholder="Details — as messy as you need"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="sg-btn-primary disabled:opacity-50"
            disabled={pending || (!title.trim() && !body.trim())}
            onClick={() => {
              startTransition(async () => {
                const result = await addInboxNoteAction(nodeId, revalidateHref, {
                  title,
                  body,
                });
                if (!result.ok) {
                  setFlash(result.error);
                  setSavedId(null);
                  return;
                }
                setTitle("");
                setBody("");
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
      </ShellModal>
    </>
  );
}
