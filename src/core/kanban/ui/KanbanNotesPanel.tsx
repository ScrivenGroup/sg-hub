"use client";

import { useState, useTransition } from "react";
import { KANBAN_CHROME } from "../chrome";
import { saveKanbanLeafNotesAction } from "../actions";

export function KanbanNotesPanel({
  nodeId,
  revalidateHref,
  notes,
  onSave,
}: {
  nodeId: string;
  revalidateHref: string;
  notes: string;
  onSave?: (body: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [draft, setDraft] = useState(notes);
  const [pending, startTransition] = useTransition();
  const [flash, setFlash] = useState("");

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <p className="text-sm text-[var(--muted)]">
        Staff scratchpad for this leaf. Ideas belong in {KANBAN_CHROME.labels.inbox}.
      </p>
      <textarea
        className="sg-input min-h-64 flex-1"
        value={draft}
        placeholder={`${KANBAN_CHROME.labels.notes} for this leaf.`}
        onChange={(e) => setDraft(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="sg-btn-primary disabled:opacity-50"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const result = onSave
                ? await onSave(draft)
                : await saveKanbanLeafNotesAction(nodeId, revalidateHref, draft);
              setFlash(result.ok ? "Saved." : result.error || "Save failed");
            });
          }}
        >
          Save {KANBAN_CHROME.labels.notes.toLowerCase()}
        </button>
        {flash ? <span className="text-xs text-[var(--muted)]">{flash}</span> : null}
      </div>
    </section>
  );
}
