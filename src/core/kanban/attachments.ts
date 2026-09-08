export const ATTACHMENT_MAX_BYTES = 8 * 1024 * 1024;
export const ATTACHMENT_MAX_PER_NOTE = 5;
export const PROMPT_TEXT_MAX_EACH = 80 * 1024;
export const PROMPT_TEXT_MAX_TOTAL = 200 * 1024;

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".html": "text/html",
  ".htm": "text/html",
  ".json": "application/json",
  ".csv": "text/csv",
};

const ALLOWED_MIME = new Set(Object.values(MIME_BY_EXT));

export function newAttachmentId(): string {
  return `ka-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function extOf(filename: string): string {
  const base = filename.replace(/^.*[/\\]/, "");
  const dot = base.lastIndexOf(".");
  if (dot < 0) return "";
  return base.slice(dot).toLowerCase();
}

export function safeFilename(filename: string): string {
  const base = filename.replace(/[/\\]/g, "").replace(/\0/g, "").trim() || "file";
  return base.slice(0, 180);
}

export function resolveAttachmentMime(filename: string, reportedType: string): string | null {
  const reported = (reportedType || "").split(";")[0].trim().toLowerCase();
  if (ALLOWED_MIME.has(reported)) return reported;
  const fromExt = MIME_BY_EXT[extOf(filename)];
  return fromExt ?? null;
}

export function isPromptInlineText(mimeType: string): boolean {
  return mimeType.startsWith("text/") || mimeType === "application/json";
}

export function isImageOrPdf(mimeType: string): boolean {
  return mimeType.startsWith("image/") || mimeType === "application/pdf";
}

export type AttachmentPromptFile = {
  filename: string;
  mimeType: string;
  byteSize: number;
  text?: string;
};

export function formatAttachmentPromptBlock(files: AttachmentPromptFile[]): string {
  if (files.length === 0) return "";
  const lines = ["## Attachments (inbox note — tickets inherit via sourceIdeaId)", ""];
  for (const file of files) {
    const kb = Math.max(1, Math.round(file.byteSize / 1024));
    if (file.text != null && file.text.length > 0) {
      lines.push(`### ${file.filename} (${file.mimeType}, ${kb} KB) — inlined`);
      lines.push("```");
      lines.push(file.text);
      lines.push("```");
      lines.push("");
    } else if (isImageOrPdf(file.mimeType)) {
      lines.push(
        `- **${file.filename}** (${file.mimeType}, ${kb} KB) — not inlined. Download from Inbox and drop into Cursor.`,
      );
    } else {
      lines.push(`- **${file.filename}** (${file.mimeType}, ${kb} KB) — listed only.`);
    }
  }
  lines.push("");
  return lines.join("\n");
}
