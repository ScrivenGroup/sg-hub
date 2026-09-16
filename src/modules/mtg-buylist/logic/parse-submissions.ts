import type { ManaBoxRow } from "../schema";
import { decodeHtmlEntities, normalizeFinish } from "./names";
import { parseManaBoxCsv } from "./parse-csv";

function emptyRow(partial: Partial<ManaBoxRow> & Pick<ManaBoxRow, "name" | "quantity">): ManaBoxRow {
  return {
    name: partial.name,
    setCode: partial.setCode || "",
    setName: partial.setName || "",
    collectorNumber: partial.collectorNumber || "",
    foil: partial.foil || "normal",
    quantity: partial.quantity,
    scryfallId: partial.scryfallId || "",
    rarity: partial.rarity || "",
    purchasePriceCents: partial.purchasePriceCents || 0,
    purchaseCurrency: partial.purchaseCurrency || "",
    frameEffects: partial.frameEffects || [],
  };
}

export function decodeQuotedPrintable(raw: string): string {
  return raw
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    );
}

function stripTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function extractEmlHtml(raw: string): string {
  const htmlPart = raw.match(
    /Content-Type:\s*text\/html[\s\S]*?\r?\n\r?\n([\s\S]*?)(?=\r?\n----|\r?\n--[_A-Za-z0-9]|$)/i,
  );
  if (htmlPart) return decodeQuotedPrintable(htmlPart[1]);
  if (/=\r?\n/.test(raw) || /=[0-9A-Fa-f]{2}/.test(raw)) return decodeQuotedPrintable(raw);
  return raw;
}

function finishFromLabel(raw: string): string {
  const key = normalizeFinish(raw);
  if (key === "foil") return "foil";
  if (key === "etched") return "etched";
  return "normal";
}

/** Playmantis sort-order email (.eml) or the HTML body saved from it. */
export function parsePlaymantisSubmission(text: string): ManaBoxRow[] {
  const html = extractEmlHtml(text);
  const fromHtml = parsePlaymantisHtml(html);
  if (fromHtml.length) return fromHtml;
  return parsePlaymantisPlain(html);
}

function parsePlaymantisHtml(html: string): ManaBoxRow[] {
  const out: ManaBoxRow[] = [];
  const blocks = html.split(/<h4\b/i);
  for (const block of blocks.slice(1)) {
    const heading = block.match(/^[^>]*>([\s\S]*?)<\/h4>/i);
    const setName = heading ? stripTags(heading[1]) : "";
    const itemRe =
      /<strong>\s*(\d+)\s*x\s*<\/strong>\s*([\s\S]*?)\s[-–—]\s*(Nonfoil|Foil|Etched)/gi;
    let m: RegExpExecArray | null;
    while ((m = itemRe.exec(block))) {
      const quantity = Number(m[1]);
      const name = stripTags(m[2]);
      if (!name || !(quantity > 0)) continue;
      out.push(
        emptyRow({
          name,
          setName,
          foil: finishFromLabel(m[3]),
          quantity,
        }),
      );
    }
  }
  return out;
}

function parsePlaymantisPlain(text: string): ManaBoxRow[] {
  const out: ManaBoxRow[] = [];
  let setName = "";
  const lineRe = /^\s*\*?\s*(\d+)\s*x\s+(.+?)\s+[-–—]\s+(Nonfoil|Foil|Etched)\b/i;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+/g, " ").trim();
    if (!line) continue;
    const item = line.match(lineRe);
    if (item) {
      out.push(
        emptyRow({
          name: item[2].replace(/\s+\$[\d.]+$/, "").trim(),
          setName,
          foil: finishFromLabel(item[3]),
          quantity: Number(item[1]),
        }),
      );
      continue;
    }
    if (
      /^[A-Z0-9][A-Z0-9 :/'&.,-]+$/.test(line) &&
      line.length < 80 &&
      !line.includes("PLAYMANTIS") &&
      !line.includes("SUBMISSION") &&
      !line.includes("IMPORTANT")
    ) {
      setName = line.replace(/\s+/g, " ").trim();
    }
  }
  return out;
}

/** Saved Mate buylist order page (File → Save). One row = one accepted copy. */
export function parseMateOrderHtml(html: string): ManaBoxRow[] {
  const out: ManaBoxRow[] = [];
  const rowRe = /<tr[^>]*class="[^"]*buylist-card[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRe.exec(html))) {
    const row = rowMatch[1];
    if (!/title="Accepted"/i.test(row)) continue;
    const finish = row.match(/class="finish"[^>]*>([^<]+)/i)?.[1] || "Nonfoil";
    const href = row.match(/href="(\/cards\/[^"]+)"/i)?.[1] || "";
    const hrefParts = href.match(/\/cards\/[^/]+\/([A-Za-z0-9]+)\/(\d+)/);
    const setFromIcon = row.match(/class="[^"]*set-code[^"]*"[^>]*value="([^"]+)"/i)?.[1];
    const title = row.match(/data-title="([^"]+)"/i)?.[1];
    const linkText = row.match(/<a[^>]*>([\s\S]*?)<\/a>/i)?.[1];
    const name = decodeHtmlEntities(title || stripTags(linkText || ""));
    if (!name) continue;
    out.push(
      emptyRow({
        name,
        setCode: (hrefParts?.[1] || setFromIcon || "").toLowerCase(),
        collectorNumber: hrefParts?.[2] || "",
        foil: finishFromLabel(finish),
        quantity: 1,
      }),
    );
  }
  return out;
}

export function parseSubmissionText(text: string): ManaBoxRow[] {
  const trimmed = text.replace(/^\uFEFF/, "");
  if (/buylist-card/i.test(trimmed) && /magic-card-name|buylist-card-table/i.test(trimmed)) {
    const mate = parseMateOrderHtml(trimmed);
    if (mate.length) return mate;
  }
  if (
    /playmantis/i.test(trimmed) ||
    /Your Submission Order/i.test(trimmed) ||
    /YOUR SUBMISSION ORDER/i.test(trimmed) ||
    /Content-Type:\s*multipart/i.test(trimmed)
  ) {
    const pm = parsePlaymantisSubmission(trimmed);
    if (pm.length) return pm;
  }
  try {
    const csv = parseManaBoxCsv(trimmed);
    if (csv.length) return csv;
  } catch {
    /* not a ManaBox CSV */
  }
  const mate = parseMateOrderHtml(trimmed);
  if (mate.length) return mate;
  const pm = parsePlaymantisSubmission(trimmed);
  if (pm.length) return pm;
  throw new Error(
    "Need a Playmantis .eml, a saved Mate order HTML (mtgmate.com.au/buylist/orders/…), or a ManaBox-shaped CSV",
  );
}
