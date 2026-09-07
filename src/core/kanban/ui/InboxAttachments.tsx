"use client";

import { useState } from "react";
import {
  ATTACHMENT_MAX_PER_NOTE,
  PROMPT_TEXT_MAX_EACH,
  PROMPT_TEXT_MAX_TOTAL,
  isPromptInlineText,
  type AttachmentPromptFile,
} from "../attachments";
import type { KanbanAttachmentMeta } from "../schema";

export const ATTACHMENT_ACCEPT =
  ".png,.jpg,.jpeg,.webp,.gif,.pdf,.txt,.md,.html,.json,.csv,image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,text/markdown,text/html,application/json,text/csv";

export const ATTACHMENT_HINT =
  "Click this box — png/jpeg/webp/gif, pdf, txt/md/html/json/csv. 8 MB, 5 per note.";

export function FilesDropZone({
  accept,
  disabled,
  label,
  hint,
  multiple,
  onFiles,
}: {
  accept: string;
  disabled?: boolean;
  label: string;
  hint: string;
  multiple?: boolean;
  onFiles: (files: FileList | File[]) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  return (
    <label
      className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-3 text-center transition-colors ${
        disabled
          ? "cursor-not-allowed opacity-50"
          : "hover:border-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]"
      } ${
        dragOver
          ? "border-[var(--ink)] bg-[color-mix(in_srgb,var(--ink)_10%,transparent)]"
          : "border-[var(--border)]"
      }`}
      onDragEnter={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (disabled) return;
        const files = e.dataTransfer.files;
        if (files?.length) onFiles(files);
      }}
    >
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-xs text-[var(--muted)]">{hint}</span>
      <input
        className="sr-only"
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </label>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PaperclipCount({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full border border-[var(--border)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--muted)]"
      title={`${count} file${count === 1 ? "" : "s"}`}
    >
      <span aria-hidden>📎</span>
      {count}
    </span>
  );
}

export function InboxAttachmentList({
  attachments,
  ideaId,
  editable = false,
  readOnly = false,
  onChanged,
}: {
  attachments: KanbanAttachmentMeta[];
  ideaId?: string;
  editable?: boolean;
  readOnly?: boolean;
  onChanged?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const canUpload = editable && !readOnly && Boolean(ideaId);
  const remaining = ATTACHMENT_MAX_PER_NOTE - attachments.length;

  async function upload(files: FileList | File[]) {
    if (!ideaId) return;
    setBusy(true);
    setError("");
    try {
      for (const file of Array.from(files).slice(0, Math.max(0, remaining))) {
        const form = new FormData();
        form.append("ideaId", ideaId);
        form.append("file", file);
        const res = await fetch("/api/kanban/attachments", { method: "POST", body: form });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          setError(data.error || `Upload failed (${res.status})`);
          break;
        }
      }
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/kanban/attachments/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || "Delete failed");
        return;
      }
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shrink-0 text-sm">
      <p className="font-medium">
        {readOnly ? "Files from source inbox note" : "Attachments"}
      </p>
      {canUpload && remaining > 0 ? (
        <div className="mt-2">
          <FilesDropZone
            accept={ATTACHMENT_ACCEPT}
            disabled={busy}
            multiple
            label="Choose files or drop them here"
            hint={ATTACHMENT_HINT}
            onFiles={(files) => void upload(files)}
          />
        </div>
      ) : null}
      {attachments.length === 0 && !canUpload ? (
        <p className="mt-1 text-xs text-[var(--muted)]">
          {readOnly ? "None." : "None yet."}
        </p>
      ) : attachments.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {attachments.map((file) => (
            <li key={file.id} className="flex items-center gap-2 text-xs">
              <a
                href={`/api/kanban/attachments/${file.id}`}
                className="min-w-0 truncate underline"
                title={file.filename}
              >
                {file.filename}
              </a>
              <span className="shrink-0 text-[var(--muted)]">{formatSize(file.byteSize)}</span>
              {editable && !readOnly ? (
                <button
                  type="button"
                  className="sg-btn-ghost shrink-0 px-1.5 py-0.5 text-xs"
                  disabled={busy}
                  onClick={() => void remove(file.id)}
                >
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="mt-1 text-xs text-[var(--rag-red)]">{error}</p> : null}
    </div>
  );
}

export async function loadAttachmentPromptFiles(
  attachments: KanbanAttachmentMeta[],
): Promise<AttachmentPromptFile[]> {
  let budget = PROMPT_TEXT_MAX_TOTAL;
  const out: AttachmentPromptFile[] = [];
  for (const file of attachments) {
    const row: AttachmentPromptFile = {
      filename: file.filename,
      mimeType: file.mimeType,
      byteSize: file.byteSize,
    };
    if (
      isPromptInlineText(file.mimeType) &&
      file.byteSize <= PROMPT_TEXT_MAX_EACH &&
      file.byteSize <= budget
    ) {
      try {
        const res = await fetch(`/api/kanban/attachments/${file.id}`);
        if (res.ok) {
          row.text = await res.text();
          budget -= file.byteSize;
        }
      } catch {
        // listed only
      }
    }
    out.push(row);
  }
  return out;
}
