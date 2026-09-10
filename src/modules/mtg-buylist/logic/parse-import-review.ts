import { decodeHtmlEntities } from "./names";

export const IMPORT_REVIEW_STATUSES = [
  "matched",
  "capped",
  "not_buying",
  "no_variant",
  "max_reached",
  "not_found",
  "skipped",
] as const;

export type ImportReviewStatus = (typeof IMPORT_REVIEW_STATUSES)[number];

export type ImportReviewRow = {
  name: string;
  setName: string;
  finish: string;
  quantity: number;
  acceptedQty: number;
  creditCents: number;
  status: ImportReviewStatus;
};

export type ImportReviewParse =
  | { ok: true; rows: ImportReviewRow[] }
  | { ok: false; error: string };

function stripTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function dollarsToCents(raw: string): number {
  const n = Number(raw.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function reviewBody(html: string): string {
  const idAt = html.search(/id=["']import-review-body["']/i);
  if (idAt < 0) return html;
  const fromDiv = html.lastIndexOf("<div", idAt);
  const start = fromDiv >= 0 ? fromDiv : idAt;
  let depth = 0;
  const open = /<\/?div\b/gi;
  open.lastIndex = start;
  let match: RegExpExecArray | null;
  while ((match = open.exec(html))) {
    if (match[0].toLowerCase() === "<div") depth += 1;
    else {
      depth -= 1;
      if (depth === 0) return html.slice(start, match.index + match[0].length);
    }
  }
  return html.slice(start);
}

function emptyPlaceholder(body: string): boolean {
  return /upload a csv to get started/i.test(body) || /reading file/i.test(body);
}

function parseMatchedTable(body: string): ImportReviewRow[] {
  const out: ImportReviewRow[] = [];
  const table = /<table class="import-table"[\s\S]*?<\/table>/i.exec(body);
  if (!table) return out;
  const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;
  let headerSeen = false;
  while ((rowMatch = rowRe.exec(table[0]))) {
    const cells = [...rowMatch[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) =>
      stripTags(m[1]),
    );
    if (!headerSeen) {
      headerSeen = true;
      continue;
    }
    if (cells.length < 8) continue;
    const acceptedRaw = cells[5];
    const capped = /\bcapped from\b/i.test(acceptedRaw);
    const acceptedQty = Number.parseInt(acceptedRaw, 10) || 0;
    out.push({
      name: cells[1],
      setName: cells[2],
      finish: cells[3],
      quantity: Number.parseInt(cells[4], 10) || 0,
      acceptedQty,
      creditCents: dollarsToCents(cells[6]),
      status: capped ? "capped" : "matched",
    });
  }
  return out;
}

function sectionAfterLabel(body: string, label: string): string {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `<div class="import-section-label">${escaped}<\\/div>\\s*<ul class="import-issue-list">([\\s\\S]*?)<\\/ul>`,
    "i",
  );
  const match = re.exec(body);
  return match ? match[1] : "";
}

function parseIssueName(line: string): { name: string; setName: string; rest: string } {
  const trimmed = stripTags(line);
  const withReason = trimmed.match(/^(.*)\s+\(([^)]+)\)\s+-\s+(.+)$/);
  if (withReason) {
    return { name: withReason[1].trim(), setName: withReason[2].trim(), rest: withReason[3].trim() };
  }
  const named = trimmed.match(/^(.*)\s+\(([^)]+)\)$/);
  if (named) {
    return { name: named[1].trim(), setName: named[2].trim(), rest: "" };
  }
  return { name: trimmed, setName: "", rest: "" };
}

function reasonStatus(reason: string): ImportReviewStatus {
  const key = reason.toLowerCase();
  if (key.includes("not currently buying")) return "not_buying";
  if (key.includes("finish not available")) return "no_variant";
  if (key.includes("max buy")) return "max_reached";
  return "not_buying";
}

function parseIssueList(body: string, label: string, status: ImportReviewStatus | "from-reason"): ImportReviewRow[] {
  const chunk = sectionAfterLabel(body, label);
  if (!chunk) return [];
  const items = [...chunk.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)];
  return items
    .map((item) => {
      const parsed = parseIssueName(item[1]);
      if (!parsed.name) return null;
      return {
        name: parsed.name,
        setName: parsed.setName,
        finish: "",
        quantity: 0,
        acceptedQty: 0,
        creditCents: 0,
        status: status === "from-reason" ? reasonStatus(parsed.rest) : status,
      } satisfies ImportReviewRow;
    })
    .filter((row): row is ImportReviewRow => Boolean(row));
}

/** Playmantis Import Review popup (or a full page save while that popup is open). */
export function parsePlaymantisImportReview(html: string): ImportReviewParse {
  const trimmed = (html || "").trim();
  if (!trimmed) return { ok: false, error: "That file is empty" };

  const body = reviewBody(trimmed);
  if (emptyPlaceholder(body) && !/import-summary|import-table|import-section-label/i.test(body)) {
    return {
      ok: false,
      error:
        "This is the shop page, not the Import Review table. Keep the popup open and run the dump (or Save As) so the matched / not-found lists are in the file.",
    };
  }

  const rows = [
    ...parseMatchedTable(body),
    ...parseIssueList(body, "Can't be added right now", "from-reason"),
    ...parseIssueList(body, "Not found in buylist", "not_found"),
    ...parseIssueList(body, "Skipped (misprint/altered)", "skipped"),
  ];

  if (!rows.length) {
    return {
      ok: false,
      error: "No Import Review rows in that file. Dump the popup after matching finishes.",
    };
  }
  return { ok: true, rows };
}
